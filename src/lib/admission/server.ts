/**
 * Rapport d'admissibilité et checklist de documents (PACK-10), CÔTÉ SERVEUR uniquement.
 *
 * Confidentialité :
 * - le nom réel d'une université n'est renvoyé à l'espace étudiant que pour une offre que
 *   l'équipe a « révélée » (entretien, pré-admission ou admission) ;
 * - le parent ne reçoit que l'état des documents : ni fichier, ni aide, ni commentaire.
 */
import "server-only";

import type { AdmissionReport, ChecklistItem, DocumentFile, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getOffer } from "@/lib/matching/catalogue";
import { getInternalOffer } from "@/lib/matching/internes";
import { toPublicRecommendation } from "@/lib/matching/public-offer";
import { getProgram } from "@/lib/programs";
import { generateChecklist, progressOf, REPORT_PROGRAMS } from "./checklist";

export const REVEAL_REASONS = ["entretien", "pre_admission", "admission"] as const;

export const reportOfferSchema = z.object({
  ref: z.string().trim().toUpperCase().regex(/^[A-Z]{1,3}-\d{2}$/),
  role: z.enum(["ambitieuse", "cible", "securite"]),
  revealedAt: z.string().datetime().nullish(),
  revealReason: z.enum(REVEAL_REASONS).nullish(),
});
export type ReportOffer = z.infer<typeof reportOfferSchema>;

export const reportDraftSchema = z.object({
  program: z.enum(REPORT_PROGRAMS as [string, ...string[]]),
  offers: z.array(reportOfferSchema).min(2).max(4),
  comment: z.string().trim().max(500).optional().default(""),
});

export function reportOffers(report: Pick<AdmissionReport, "offers"> | null): ReportOffer[] {
  const raw = Array.isArray(report?.offers) ? report!.offers : [];
  return raw.flatMap((o) => {
    const parsed = reportOfferSchema.safeParse(o);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Rapport tel qu'affiché dans l'espace étudiant (null tant qu'il n'est pas publié). */
export function toPortalReport(report: AdmissionReport | null, locale: string) {
  if (!report?.publishedAt) return null;
  const program = getProgram(report.program);
  const L = locale === "en" ? "en" : "fr";
  const offers = reportOffers(report).flatMap((o) => {
    const offer = getOffer(o.ref);
    if (!offer) return [];
    const pub = toPublicRecommendation(offer, { ref: o.ref, role: o.role, ville: offer.ville, total: 0, filieres_correspondantes: [] }, locale);
    return [{ ...pub, university: o.revealedAt ? getInternalOffer(o.ref)?.universite ?? null : null }];
  });
  return {
    version: report.version,
    publishedAt: report.publishedAt.toISOString(),
    comment: report.comment,
    offers,
    program: program
      ? {
          slug: program.slug,
          name: program.name[L],
          price: program.price,
          payments: program.payments.map((p) => ({ label: p.label[L], when: p.when[L], amount: p.amount })),
        }
      : null,
    validatedAt: report.validatedAt?.toISOString() ?? null,
    validatedCurrent: Boolean(report.validatedAt && report.validatedVersion === report.version),
    paymentReceived: Boolean(report.paymentReceivedAt),
    documentsConsent: Boolean(report.documentsConsentAt),
  };
}
export type PortalReport = NonNullable<ReturnType<typeof toPortalReport>>;

/** Crée les documents attendus (sans toucher à ceux qui existent déjà). Renvoie le nombre ajouté. */
export async function ensureChecklist(candidateId: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  const report = await db.admissionReport.findUnique({ where: { candidateId } });
  if (!report) return 0;
  const specs = generateChecklist(report.program, reportOffers(report).map((o) => o.ref));
  const result = await db.checklistItem.createMany({
    data: specs.map((s) => ({ ...s, candidateId, status: s.kind === "prepare" ? "en_preparation" : "a_fournir" })),
    skipDuplicates: true,
  });
  return result.count;
}

type ItemWithFiles = ChecklistItem & { folder: { files: DocumentFile[] } | null };

export const checklistInclude = {
  folder: { include: { files: { orderBy: { createdAt: "asc" } } } },
} satisfies Prisma.ChecklistItemInclude;

export function activeItemsWhere(candidateId: string): Prisma.ChecklistItemWhereInput {
  return { candidateId, removedAt: null };
}

/** Vue étudiant : tout, avec ses fichiers (jamais l'URL du stockage). */
export function toStudentItem(i: ItemWithFiles, locale: string, myAccountId: string) {
  const en = locale === "en";
  return {
    id: i.id,
    key: i.key,
    kind: i.kind,
    label: en ? i.labelEn : i.labelFr,
    help: en ? i.helpEn : i.helpFr,
    note: en ? i.noteEn : i.noteFr,
    phase: i.phase,
    required: i.required,
    formats: i.formats,
    maxMb: i.maxMb,
    status: i.status,
    teamComment: i.status === "a_refaire" || i.status === "modification_demandee" ? i.teamComment : null,
    studentComment: i.studentComment,
    documentLanguage: i.documentLanguage,
    passportExpiry: i.passportExpiry?.toISOString().slice(0, 10) ?? null,
    formData: i.formData,
    files: (i.folder?.files ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      contentType: f.contentType,
      createdAt: f.createdAt.toISOString(),
      mine: f.uploadedByPortalId === myAccountId,
      fromTeam: f.uploadedByPortalId === null,
    })),
  };
}
export type StudentChecklistItem = ReturnType<typeof toStudentItem>;

/** Vue parent : libellé, groupe et état seulement. */
export function toParentItem(i: ChecklistItem, locale: string) {
  return { id: i.id, kind: i.kind, label: locale === "en" ? i.labelEn : i.labelFr, phase: i.phase, required: i.required, status: i.status };
}
export type ParentChecklistItem = ReturnType<typeof toParentItem>;

export { progressOf };
