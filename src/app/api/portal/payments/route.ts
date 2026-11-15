import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { json, requirePortalSession } from "@/lib/portal/guard";
import { declareSchema, METHOD_LABELS } from "@/lib/payments/rules";
import { programSteps, proofPrefix, publicPayment, verifyProof } from "@/lib/payments/server";
import { notifyPaymentDeclared } from "@/lib/notifications";

/** Paiements du dossier (étudiant et parent) : déclarations, statut, reçus. */
export async function GET(req: NextRequest) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const payments = await prisma.payment.findMany({ where: { candidateId: auth.session.candidateId }, orderBy: { createdAt: "desc" } });
  return json({ payments: payments.map(publicPayment) });
}

/**
 * « J'ai payé » : l'étudiant ou le parent déclare un paiement avec sa preuve.
 * Statut « en vérification » : seule l'équipe Odysseo peut le confirmer.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const s = auth.session;
  const body = declareSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "invalid", fields: body.error.issues.map((i) => i.path.join(".")) }, 400);
  const d = body.data;

  const report = await prisma.admissionReport.findUnique({ where: { candidateId: s.candidateId }, select: { program: true, publishedAt: true } });
  if (!report?.publishedAt) return json({ error: "noReport" }, 409);
  const program = programSteps(report.program);
  const step = d.stepIndex != null ? program?.steps[d.stepIndex] : undefined;
  if (d.stepIndex != null && !step) return json({ error: "invalid" }, 400);

  const proof = await verifyProof(d.proof, proofPrefix(s.candidate.code, "espace"));
  if ("error" in proof) return json({ error: proof.error }, 400);

  const payment = await prisma.payment.create({
    data: {
      candidateId: s.candidateId,
      stepIndex: d.stepIndex,
      stepLabel: step?.label ?? null,
      amount: d.amount,
      method: d.method,
      methodNote: d.methodNote || null,
      paidOn: new Date(`${d.paidOn}T12:00:00Z`),
      ...proof,
      source: "espace",
      declaredByPortalId: s.id,
      declaredByName: s.name,
    },
  });
  notifyPaymentDeclared({
    candidateId: s.candidateId,
    code: s.candidate.code,
    fullName: s.candidate.fullName,
    amount: d.amount,
    method: METHOD_LABELS[d.method].fr,
    declaredBy: `${s.name} (${s.role === "PARENT" ? "parent" : "étudiant"})`,
  }).catch((err) => console.error("[paiements] alerte équipe :", err));
  return json({ payment: publicPayment(payment) }, 201);
}
