import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordSchema } from "@/lib/payments/rules";
import { confirmPayment, programSteps, proofPrefix, publicPayment, sendReceipt, verifyProof } from "@/lib/payments/server";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Bloc « Paiements » de la fiche dossier : échéancier, paiements déclarés ou enregistrés. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return bad("Non authentifié.", 401);
  const [payments, report] = await Promise.all([
    prisma.payment.findMany({ where: { candidateId: params.id }, orderBy: { createdAt: "desc" } }),
    prisma.admissionReport.findUnique({ where: { candidateId: params.id }, select: { program: true, publishedAt: true, paymentReceivedAt: true, paymentAmount: true } }),
  ]);
  return NextResponse.json({
    payments: payments.map(publicPayment),
    program: report?.publishedAt ? programSteps(report.program) : null,
    legacy: report?.paymentReceivedAt ? { date: report.paymentReceivedAt, amount: report.paymentAmount } : null,
  });
}

/**
 * Paiement reçu au bureau ou dont la preuve est arrivée sur WhatsApp : l'équipe l'enregistre,
 * il est confirmé tout de suite et le reçu part par e-mail.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return bad("Non authentifié.", 401);
  const who = session.user.name || session.user.email || "Équipe Odysseo";
  const body = recordSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return bad("invalid");
  const d = body.data;
  const candidate = await prisma.candidate.findUnique({ where: { id: params.id }, select: { id: true, code: true } });
  if (!candidate) return bad("notFound", 404);
  const report = await prisma.admissionReport.findUnique({ where: { candidateId: candidate.id }, select: { program: true } });
  const step = d.stepIndex != null ? programSteps(report?.program)?.steps[d.stepIndex] : undefined;
  if (d.stepIndex != null && !step) return bad("invalid");

  const proof = d.proof ? await verifyProof(d.proof, proofPrefix(candidate.code, "equipe")) : null;
  if (proof && "error" in proof) return bad(proof.error ?? "invalid");

  const created = await prisma.payment.create({
    data: {
      candidateId: candidate.id,
      stepIndex: d.stepIndex,
      stepLabel: step?.label ?? null,
      amount: d.amount,
      method: d.method,
      methodNote: d.methodNote || null,
      paidOn: new Date(`${d.paidOn}T12:00:00Z`),
      ...(proof ?? {}),
      source: "equipe",
      recordedByName: who,
    },
  });
  const { payment, firstPayment } = await confirmPayment(created.id, who);
  const emailed = await sendReceipt(payment, firstPayment).catch((err) => {
    console.error("[paiements] envoi du reçu :", err);
    return 0;
  });
  return NextResponse.json({ payment: publicPayment(payment), emailed }, { status: 201 });
}
