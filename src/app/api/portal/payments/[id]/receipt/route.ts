import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { json, requirePortalSession } from "@/lib/portal/guard";
import { receiptPdf } from "@/lib/payments/server";

/** Reçu PDF d'un paiement confirmé du dossier (étudiant ou parent). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const payment = await prisma.payment.findFirst({ where: { id: params.id, candidateId: auth.session.candidateId, status: "confirme" } });
  if (!payment?.receiptNumber) return json({ error: "notFound" }, 404);
  const pdf = await receiptPdf(payment);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Recu-${payment.receiptNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
