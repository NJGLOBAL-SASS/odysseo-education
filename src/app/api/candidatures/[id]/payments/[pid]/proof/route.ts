import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Preuve de paiement (photo ou PDF) pour la vérification par l'équipe. */
export async function GET(_req: NextRequest, { params }: { params: { id: string; pid: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const payment = await prisma.payment.findFirst({ where: { id: params.pid, candidateId: params.id } });
  if (!payment?.proofBlobUrl) return NextResponse.json({ error: "notFound" }, { status: 404 });
  const blob = await get(payment.proofBlobUrl, { access: "private" }).catch(() => null);
  if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: "storageUnavailable" }, { status: 502 });
  const name = (payment.proofName ?? "preuve").replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  const headers: Record<string, string> = {
    "Content-Type": payment.proofType ?? "application/octet-stream",
    "Content-Disposition": `inline; filename="${name}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (payment.proofType !== "application/pdf") headers["Content-Security-Policy"] = "sandbox; default-src 'none'";
  return new Response(blob.stream, { headers });
}
