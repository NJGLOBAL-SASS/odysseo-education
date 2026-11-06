/**
 * Correspondance dossier (colonnes PACK-01, voir src/lib/qualification.ts) → profil
 * du moteur (PACK-02). Module pur, partagé par l'API et les tests.
 */
import type { Cycle, EnglishProfile, MatchingProfile } from "./types";

/** Valeurs du dossier utiles au moteur (noms des colonnes Prisma de Candidate). */
export interface CandidateForMatching {
  targetLevel: string; // "language" | "licence" | "master" | "doctorat"
  studyFields: string[];
  degreeField?: string | null;
  age?: number | null;
  averagePct?: number | null;
  englishCertificate?: string | null;
  englishScore?: number | null;
  hskLevel?: number | null;
  bankStatementUsdMax?: number | null;
  originalDiplomas?: boolean | null;
  country?: string | null;
  fundingPlan?: string | null;
}

const CYCLES: Record<string, Cycle> = { master: "master", doctorat: "phd" };
const FUNDING: Record<string, MatchingProfile["financement"]> = {
  scholarshipOnly: "bourse_uniquement",
  familyPart: "partiel",
  fullFunding: "total",
};

/** Cycle recommandé, ou null pour Langue / Licence (offres envoyées par un conseiller). */
export function cycleFor(targetLevel: string): Cycle | null {
  return CYCLES[targetLevel] ?? null;
}

function englishFor(cert?: string | null, score?: number | null): EnglishProfile {
  if ((cert === "ielts" || cert === "toefl" || cert === "duolingo") && score != null) return { type: cert, score };
  if (cert === "studiedInEnglish") return { type: "etudes_en_anglais" };
  return { type: "aucun" };
}

export function profilDepuisCandidature(c: CandidateForMatching): MatchingProfile | null {
  const cycle = cycleFor(c.targetLevel);
  if (!cycle) return null;
  return {
    cycle,
    domaines: c.studyFields ?? [],
    filiere_libre: c.degreeField?.trim() || "",
    age: c.age ?? null,
    moyenne_pct: c.averagePct ?? null,
    anglais: englishFor(c.englishCertificate, c.englishScore),
    hsk: c.hskLevel ?? 0,
    releve_bancaire_usd_max: c.bankStatementUsdMax ?? null,
    diplomes_originaux: c.originalDiplomas ?? null,
    // Le formulaire stocke le nom du pays en français (« Cameroun »), comme le catalogue.
    nationalite: c.country ?? null,
    financement: (c.fundingPlan && FUNDING[c.fundingPlan]) || null,
    // L'offre OMM est proposée par un conseiller, jamais automatiquement.
    eligible_omm: false,
  };
}
