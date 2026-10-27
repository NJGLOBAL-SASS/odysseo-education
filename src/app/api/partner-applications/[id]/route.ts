import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugifyReferralCode } from "@/lib/utils";
import { sendPartnerApplicationDecision } from "@/lib/notifications";

const schema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(3000).default(""),
});

/**
 * Réponse de l'équipe à une demande : l'acceptation crée le partenaire (code +
 * lien), puis le demandeur reçoit la décision et le message par email.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const app = await prisma.partnerApplication.findUnique({ where: { id: params.id } });
  if (!app) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (app.status !== "PENDING") return NextResponse.json({ error: "alreadyReviewed" }, { status: 409 });

  let partner = null;
  if (body.data.decision === "APPROVED") {
    const exists = await prisma.partner.findFirst({
      where: { email: { equals: app.email, mode: "insensitive" } },
    });
    if (exists) return NextResponse.json({ error: "alreadyPartner" }, { status: 409 });

    let referralCode = slugifyReferralCode(app.fullName);
    while (await prisma.partner.findUnique({ where: { referralCode } })) {
      referralCode = slugifyReferralCode(app.fullName);
    }
    partner = await prisma.partner.create({
      data: { fullName: app.fullName, email: app.email, phone: app.whatsapp, referralCode },
    });
  }

  const updated = await prisma.partnerApplication.update({
    where: { id: app.id },
    data: {
      status: body.data.decision,
      responseNote: body.data.note || null,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
      partnerId: partner?.id,
    },
  });

  const emailSent = await sendPartnerApplicationDecision(updated, body.data.decision, body.data.note, partner).catch(
    () => false
  );
  return NextResponse.json({ ok: true, emailSent, partner });
}
