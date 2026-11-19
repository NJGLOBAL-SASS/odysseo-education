/**
 * Brouillon de rapport d'admissibilité (PACK-12), CÔTÉ SERVEUR uniquement.
 *
 * Calculé dès l'enregistrement d'une candidature (moteur Master/PhD ou Mars selon le
 * niveau), et lors du rattrapage ou du renouvellement d'un rapport expiré. Rien n'est
 * montré à l'étudiant : l'équipe relit, valide, puis envoie le PDF à la main.
 */
import "server-only";

import type { Candidate } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { CATALOGUE_VERSION, moteurVersionFor, recommendForCandidate } from "@/lib/matching/catalogue";
import { PROGRAM_BY_LEVEL } from "@/lib/pricing/tarifs";
import { appendStage, normalizeHistory } from "@/lib/tracking-stages";
import { reportStatus } from "./status";
import { newProfileAlert } from "./messages";
import { optionLabel } from "@/lib/intake-labels";
import { firstNameOf } from "@/lib/tracking-stages";
import { teamUrl } from "@/lib/notifications";

type CandidateFields = Pick<
  Candidate,
  | "id"
  | "targetLevel"
  | "studyFields"
  | "degreeField"
  | "age"
  | "averagePct"
  | "englishCertificate"
  | "englishScore"
  | "hskLevel"
  | "bankStatementUsdMax"
  | "originalDiplomas"
  | "country"
  | "fundingPlan"
  | "highestDegree"
  | "locale"
  | "stage"
  | "stageHistory"
  | "createdAt"
>;

export function matchingFor(c: CandidateFields, today = new Date()) {
  return recommendForCandidate(
    {
      targetLevel: c.targetLevel,
      studyFields: c.studyFields,
      degreeField: c.degreeField,
      age: c.age,
      averagePct: c.averagePct,
      englishCertificate: c.englishCertificate,
      englishScore: c.englishScore,
      hskLevel: c.hskLevel,
      bankStatementUsdMax: c.bankStatementUsdMax,
      originalDiplomas: c.originalDiplomas,
      country: c.country,
      fundingPlan: c.fundingPlan,
      highestDegree: c.highestDegree,
    },
    c.locale,
    today,
  );
}

/** Étapes depuis lesquelles un nouveau brouillon remet le dossier à « rapport_pret ». */
const RESET_FROM = new Set(["recu", "analyse", "rapport_pret", "rapport_valide", "rapport_envoye", "rapport_expire"]);

export interface DraftResult {
  created: boolean;
  offers: { ref: string; role: string }[];
  repliLangue: boolean;
}

/**
 * Crée (ou recalcule, avec `renew`) le brouillon d'un dossier. Sans `renew`, ne touche jamais
 * un rapport existant. Ne modifie pas un dossier déjà ouvert (1er versement reçu).
 */
export async function prepareDraftReport(candidateId: string, opts: { today?: Date; renew?: boolean } = {}): Promise<DraftResult> {
  const today = opts.today ?? new Date();
  const c = await prisma.candidate.findUniqueOrThrow({ where: { id: candidateId } });
  const existing = await prisma.admissionReport.findUnique({ where: { candidateId } });
  if (existing && !opts.renew) {
    return { created: false, offers: [], repliLangue: existing.repliLangue };
  }
  // Rapport déjà déposé ou envoyé : un nouveau brouillon ne remplace jamais le suivi en cours.
  if (existing && !["brouillon", "infos_manquantes", "analyse_en_cours", "a_revoir"].includes(reportStatus(existing) ?? "brouillon")) {
    return { created: false, offers: [], repliLangue: existing.repliLangue };
  }

  const m = matchingFor(c, today);
  const offers = m.stored.map(({ ref, role }) => ({ ref, role, revealedAt: null, revealReason: null }));
  const data = {
    program: PROGRAM_BY_LEVEL[c.targetLevel] ?? "master",
    offers,
    status: "brouillon",
    engineVersion: moteurVersionFor(m.cycle),
    catalogueVersion: CATALOGUE_VERSION,
    proposerBachelor: m.proposerBachelor ?? null,
    repliLangue: m.repliLangue ?? false,
    publishedAt: null,
    publishedByName: null,
  };

  await prisma.$transaction([
    prisma.admissionReport.upsert({
      where: { candidateId },
      // Renouvellement : le commentaire du conseiller est conservé.
      update: data,
      create: { ...data, candidateId },
    }),
    ...(RESET_FROM.has(c.stage) && c.stage !== "rapport_pret"
      ? [
          prisma.candidate.update({
            where: { id: candidateId },
            data: {
              stage: "rapport_pret",
              stageUpdatedAt: today,
              stageHistory: appendStage(normalizeHistory(c.stageHistory, c.createdAt), c.stage, "rapport_pret", today),
            },
          }),
        ]
      : []),
  ]);
  return { created: true, offers: m.stored, repliLangue: m.repliLangue ?? false };
}

/** Rattrapage : un brouillon pour chaque dossier sans rapport. Renvoie le nombre préparé. */
export async function backfillDraftReports(today = new Date()) {
  const ids = await prisma.candidate.findMany({ where: { admissionReport: null }, select: { id: true }, orderBy: { createdAt: "asc" } });
  let prepared = 0;
  const failed: string[] = [];
  for (const { id } of ids) {
    try {
      if ((await prepareDraftReport(id, { today })).created) prepared++;
    } catch (err) {
      console.error("[rattrapage] échec", id, err);
      failed.push(id);
    }
  }
  return { candidates: ids.length, prepared, failed };
}

/** Texte de l'alerte Telegram « nouveau profil » (PACK-12, modèle de messages.md). */
export function newCandidateTelegram(c: Candidate, draft: DraftResult | null) {
  const label = (field: Parameters<typeof optionLabel>[0], v: string | null | undefined) => (v ? optionLabel(field, v) || v : "?");
  return newProfileAlert(
    {
      code: c.code,
      prenom: firstNameOf(c.fullName),
      age: c.age,
      pays: c.country,
      niveau: label("targetLevel", c.targetLevel),
      domaines: c.fieldOfStudy || "?",
      diplome: [c.highestDegree, c.degreeField].filter(Boolean).join(" · ") || "?",
      moyenne: c.degreeAverage || (c.averageValue != null ? `${c.averageValue}/${c.averageScale ?? "?"}` : "?"),
      hsk: c.hskLevel != null ? String(c.hskLevel) : "—",
      anglais: label("englishLevel", c.englishLevel),
      funding: label("fundingPlan", c.fundingPlan),
    },
    draft?.offers ?? [],
    draft?.repliLangue ?? false,
    teamUrl(`/fr/dashboard/candidatures/${c.id}`),
  );
}
