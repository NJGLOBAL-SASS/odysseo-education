import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { receiptPdf } from "@/lib/payments/server";

/** Reçu PDF (équipe) : à télécharger ou à transmettre sur WhatsApp. */
export async function GET(_req: NextRequest, { params }: { params: { id: string; pid: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const payment = await prisma.payment.findFirst({ where: { id: params.pid, candidateId: params.id, status: "confirme" } });
  if (!payment?.receiptNumber) return NextResponse.json({ error: "notFound" }, { status: 404 });
  const pdf = await receiptPdf(payment);
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="Recu-${payment.receiptNumber}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
