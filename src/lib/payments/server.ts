import "server-only";

import { Prisma, type Payment } from "@prisma/client";
import { get } from "@vercel/blob";

import { prisma } from "@/lib/prisma";
import { getProgram } from "@/lib/programs";
import { APP_TIME_ZONE } from "@/lib/utils";
import { appendStage, normalizeHistory, STAGES } from "@/lib/tracking-stages";
import { ensureChecklist } from "@/lib/admission/server";
import { onFirstPayment } from "@/lib/report/server";
import { notifyPaymentConfirmed, notifyPortalAccounts } from "@/lib/notifications";
import { METHOD_LABELS, confirmedTotal, nextSequence, receiptNumber, type PaymentMethod } from "./rules";
import { renderReceiptPdf } from "./receipt-pdf";
import { deleteBlobs, verifyUploadedFiles } from "@/lib/documents-server";
import { sniffFileType } from "@/lib/admission/file-type";
import { PROOF_MAX_MB } from "./rules";

const PROOF_SNIFFED = new Set(["pdf", "jpg", "png", "heic", "webp"]);
const SNIFFED_MIME: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png", heic: "image/heic", webp: "image/webp" };

/** Premiers octets d'un fichier du stockage privé (contrôle de la signature). */
async function firstBytes(url: string) {
  const blob = await get(url, { access: "private" }).catch(() => null);
  if (!blob || blob.statusCode !== 200) return null;
  const reader = blob.stream.getReader();
  const { value } = await reader.read();
  reader.cancel().catch(() => undefined);
  return value ?? null;
}

/**
 * Preuve de paiement envoyée dans le stockage privé : chemin attendu, taille (10 Mo) et type réel
 * (photo ou PDF, d'après la signature du fichier). Un fichier refusé est supprimé.
 */
export async function verifyProof(proof: { url: string; name: string }, prefix: string) {
  if (!new URL(proof.url).pathname.slice(1).startsWith(prefix)) return { error: "invalid" as const };
  const [file] = (await verifyUploadedFiles([proof])) ?? [];
  if (!file) return { error: "fileMissing" as const };
  const type = file.size <= PROOF_MAX_MB * 1024 * 1024 ? sniffFileType((await firstBytes(file.blobUrl)) ?? new Uint8Array()) : null;
  if (!type || !PROOF_SNIFFED.has(type)) {
    await deleteBlobs([file.blobUrl]);
    return { error: file.size > PROOF_MAX_MB * 1024 * 1024 ? ("tooBig" as const) : ("badType" as const) };
  }
  return { proofBlobUrl: file.blobUrl, proofName: file.name, proofType: SNIFFED_MIME[type], proofSize: file.size };
}

/** Dossier des preuves dans le stockage : documents/espace/paiements/{code}/ (espace) ou documents/equipe/paiements/{code}/. */
export const proofPrefix = (code: string, by: "espace" | "equipe") => `documents/${by}/paiements/${code}/`;

const frDate = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: APP_TIME_ZONE }).format(d);

/** Échéancier du cursus facturé (rapport publié), en français, pour les reçus et la fiche équipe. */
export function programSteps(programSlug: string | null | undefined) {
  const program = programSlug ? getProgram(programSlug) : undefined;
  if (!program) return null;
  return {
    name: program.name.fr,
    total: program.payments.reduce((s, p) => s + p.amount, 0),
    steps: program.payments.map((p) => ({ label: p.label.fr, when: p.when.fr, amount: p.amount })),
  };
}

/** Champs renvoyés au navigateur : jamais l'URL de stockage de la preuve. */
export function publicPayment(p: Payment) {
  const { proofBlobUrl, ...rest } = p;
  return { ...rest, hasProof: Boolean(proofBlobUrl) };
}

/**
 * Confirme un paiement : numéro de reçu (séquence annuelle, réessai si deux confirmations
 * simultanées prennent le même numéro). Le tout premier paiement confirmé d'un dossier fait
 * aussi ce que faisait « Premier paiement reçu » : il ouvre la checklist et avance l'étape.
 */
export async function confirmPayment(paymentId: string, confirmedByName: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const payment = await tx.payment.findUnique({ where: { id: paymentId } });
          if (!payment) throw new Error("notFound");
          if (payment.status === "confirme") return { payment, firstPayment: false };
          const now = new Date();
          const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: APP_TIME_ZONE }).format(now));
          const existing = await tx.payment.findMany({ where: { receiptNumber: { startsWith: `REC-${year}-` } }, select: { receiptNumber: true } });
          const number = receiptNumber(year, nextSequence(existing.map((e) => e.receiptNumber), year));
          const updated = await tx.payment.update({
            where: { id: paymentId },
            data: { status: "confirme", confirmedAt: now, confirmedByName, receiptNumber: number, rejectReason: null },
          });

          // Premier paiement : ouverture du dossier (comme l'ancien bouton de la fiche).
          const report = await tx.admissionReport.findUnique({ where: { candidateId: payment.candidateId } });
          let firstPayment = false;
          // ODY-15 : le rapport est envoyé sur WhatsApp, sans « publication » dans l'espace : tout
          // dossier qui a un rapport et n'a pas encore payé s'ouvre au premier paiement confirmé.
          if (report && !report.paymentReceivedAt) {
            firstPayment = true;
            await tx.admissionReport.update({
              where: { id: report.id },
              data: { paymentReceivedAt: payment.paidOn, paymentAmount: payment.amount, paymentRecordedByName: confirmedByName },
            });
            const candidate = await tx.candidate.findUniqueOrThrow({ where: { id: payment.candidateId } });
            const cur = (STAGES as readonly string[]).indexOf(candidate.stage);
            if (cur !== -1 && cur < (STAGES as readonly string[]).indexOf("ouvert")) {
              await tx.candidate.update({
                where: { id: candidate.id },
                data: { stage: "ouvert", stageUpdatedAt: now, stageHistory: appendStage(normalizeHistory(candidate.stageHistory, candidate.createdAt), candidate.stage, "ouvert", now) },
              });
            }
            await ensureChecklist(payment.candidateId, tx);
            await onFirstPayment(tx, payment.candidateId, confirmedByName);
          }
          return { payment: updated, firstPayment };
        },
        { timeout: 20_000 },
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && attempt < 3) continue;
      throw err;
    }
  }
  throw new Error("receiptNumber");
}

/** PDF du reçu d'un paiement confirmé. */
export async function receiptPdf(payment: Payment) {
  if (payment.status !== "confirme" || !payment.receiptNumber) throw new Error("notConfirmed");
  const [candidate, report, all] = await Promise.all([
    prisma.candidate.findUniqueOrThrow({ where: { id: payment.candidateId }, select: { fullName: true, code: true } }),
    prisma.admissionReport.findUnique({ where: { candidateId: payment.candidateId }, select: { program: true, paymentAmount: true } }),
    prisma.payment.findMany({ where: { candidateId: payment.candidateId }, select: { status: true, amount: true } }),
  ]);
  const program = programSteps(report?.program);
  return renderReceiptPdf({
    number: payment.receiptNumber,
    issuedOn: frDate(payment.confirmedAt ?? new Date()),
    studentName: candidate.fullName,
    fileCode: candidate.code,
    programName: program?.name ?? null,
    stepLabel: payment.stepLabel,
    amount: payment.amount,
    methodLabel: METHOD_LABELS[payment.method as PaymentMethod]?.fr ?? payment.method,
    methodNote: payment.methodNote,
    paidOn: frDate(payment.paidOn),
    confirmedBy: payment.confirmedByName,
    totalPaid: program ? confirmedTotal(all, report?.paymentAmount) : null,
    totalDue: program?.total ?? null,
  });
}

/** Après confirmation : reçu par e-mail (étudiant + parent) et notification ; trace l'envoi. */
export async function sendReceipt(payment: Payment, firstPayment: boolean) {
  const pdf = await receiptPdf(payment);
  const sent = await notifyPaymentConfirmed({ candidateId: payment.candidateId, receiptNumber: payment.receiptNumber!, amount: payment.amount, pdf });
  if (sent > 0) await prisma.payment.update({ where: { id: payment.id }, data: { receiptEmailedAt: new Date() } });
  if (firstPayment) {
    await notifyPortalAccounts(
      payment.candidateId,
      "report",
      {
        fr: "Paiement reçu, merci ! Vous pouvez maintenant envoyer vos documents depuis l'onglet Documents de votre espace.",
        en: "Payment received, thank you! You can now send your documents from the Documents tab of your space.",
      },
      "/espace/documents",
    );
  }
  return sent;
}

/** Message WhatsApp prêt à envoyer à l'étudiant après confirmation. */
export function receiptWhatsappText(p: { receiptNumber: string; amount: number; firstName: string }, spaceUrl: string) {
  const amount = new Intl.NumberFormat("fr-FR").format(p.amount);
  return `Bonjour ${p.firstName}, nous avons bien reçu et vérifié votre paiement de ${amount} FCFA. Votre reçu Odysseo ${p.receiptNumber} vous a été envoyé par e-mail et reste disponible dans votre espace : ${spaceUrl}`;
}
