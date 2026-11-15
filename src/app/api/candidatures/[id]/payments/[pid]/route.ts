import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyPortalAccounts } from "@/lib/notifications";
import { confirmPayment, publicPayment, sendReceipt } from "@/lib/payments/server";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("refuse"), reason: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal("resend") }),
]);

/** Vérification par l'équipe : confirmer (reçu généré et envoyé), refuser (motif), renvoyer le reçu. */
export async function POST(req: NextRequest, { params }: { params: { id: string; pid: string } }) {
  const session = await auth();
  if (!session?.user) return bad("Non authentifié.", 401);
  const who = session.user.name || session.user.email || "Équipe Odysseo";
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return bad("invalid");
  const existing = await prisma.payment.findFirst({ where: { id: params.pid, candidateId: params.id } });
  if (!existing) return bad("notFound", 404);

  if (body.data.action === "confirm") {
    if (existing.status === "refuse") return bad("refused", 409);
    const { payment, firstPayment } = await confirmPayment(existing.id, who);
    const emailed = await sendReceipt(payment, firstPayment).catch((err) => {
      console.error("[paiements] envoi du reçu :", err);
      return 0;
    });
    return NextResponse.json({ payment: publicPayment(payment), emailed });
  }

  if (body.data.action === "resend") {
    if (existing.status !== "confirme") return bad("notConfirmed", 409);
    const emailed = await sendReceipt(existing, false);
    return NextResponse.json({ payment: publicPayment(existing), emailed });
  }

  if (existing.status !== "en_verification") return bad("notPending", 409);
  const reason = body.data.reason;
  const payment = await prisma.payment.update({ where: { id: existing.id }, data: { status: "refuse", rejectReason: reason, confirmedByName: who } });
  const amount = new Intl.NumberFormat("fr-FR").format(existing.amount);
  notifyPortalAccounts(
    existing.candidateId,
    "report",
    {
      fr: `Votre paiement de ${amount} FCFA n'a pas pu être confirmé : ${reason}. Votre conseiller reste disponible dans la messagerie.`,
      en: `Your payment of ${amount} FCFA could not be confirmed: ${reason}. Your advisor is available in the messages.`,
    },
    "/espace",
  ).catch((err) => console.error("[paiements] alerte refus :", err));
  return NextResponse.json({ payment: publicPayment(payment) });
}
