/**
 * Correspondance dossier (colonnes PACK-01, voir src/lib/qualification.ts) → profil
 * du moteur (PACK-02). Module pur, partagé par l'API et les tests.
 */
import fr from "../../i18n/messages/fr.json";
import en from "../../i18n/messages/en.json";
import { DOMAINE_VERS_FAMILLES } from "./recommander";
import type { MarsCycle, MarsProfile } from "./recommanderMars";
import type { EnglishProfile, MatchingProfile, ResearchCycle as Cycle } from "./types";

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
  /** Libellé du diplôme le plus élevé (FR ou EN, éventuellement « Autre : … »). PACK-12. */
  highestDegree?: string | null;
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

// ── PACK-12 : Langue / Licence (moteur de mars 2027) ──────────────────────────

const MARS_CYCLES: Record<string, MarsCycle> = { language: "langue", licence: "licence" };

/** Cycle du moteur de mars, ou null (Master / Doctorat : moteur PACK-02). */
export function marsCycleFor(targetLevel: string): MarsCycle | null {
  return MARS_CYCLES[targetLevel] ?? null;
}

/**
 * Bac ou plus : Bac / GCE A Level, BTS / HND / DUT, Licence, Master, Doctorat
 * (index 1 à 5 des options du formulaire). Probatoire et « Autre » : non.
 */
export function aLeBac(highestDegree?: string | null): boolean {
  if (!highestDegree) return false;
  const idx = [fr, en]
    .map((m) => (m.intake.fields.degree.options as string[]).indexOf(highestDegree.trim()))
    .find((i) => i >= 0);
  return idx !== undefined && idx >= 1 && idx <= 5;
}

/** Domaines du formulaire → familles du catalogue (sans doublon, dans l'ordre). */
export function famillesDepuisDomaines(domaines: string[]): string[] {
  return [...new Set(domaines.flatMap((d) => DOMAINE_VERS_FAMILLES[d] ?? []))];
}

export function profilMarsDepuisCandidature(c: CandidateForMatching): MarsProfile | null {
  const cycle = marsCycleFor(c.targetLevel);
  if (!cycle) return null;
  return {
    cycle_vise: cycle,
    age: c.age ?? 0,
    familles: famillesDepuisDomaines(c.studyFields ?? []),
    hsk: c.hskLevel ?? null,
    a_le_bac: aLeBac(c.highestDegree),
    funding: (c.fundingPlan && FUNDING[c.fundingPlan]) || null,
  };
}
