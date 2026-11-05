/**
 * Qualification du profil (PACK-01) : codes stockés et conversions, partagés par
 * le formulaire (client), l'API /api/candidatures (serveur) et le moteur du PACK-02.
 *
 * Correspondance avec les noms du PACK-01 / PACK-02 :
 *   formulaire / pack          → colonne Prisma (Candidate)
 *   filiereDiplome             → degreeField
 *   moyenneValeur, moyenneBareme → averageValue, averageScale
 *   moyenne_pct                → averagePct
 *   diplomesOriginaux          → originalDiplomas (true = Oui, false = Pas encore)
 *   anglaisCertificat, anglaisScore → englishCertificate, englishScore
 *   anglaisNiveau              → englishLevel (colonne existante)
 *   hsk                        → hskLevel (0 à 6)
 *   releveBancaire, releve_bancaire_usd_max → bankStatement, bankStatementUsdMax
 *   domaines[]                 → studyFields[]
 *   age                        → age (colonne existante, calculée à l'envoi)
 */

/** Domaines d'études souhaités (2 maximum). Codes utilisés par le PACK-02. */
export const DOMAIN_CODES = [
  "medecine",
  "ingenierie",
  "informatique",
  "commerce",
  "relations-droit",
  "langue-chinoise",
  "sciences",
  "agriculture-environnement",
  "architecture-design",
  "education-sport",
  "ne-sait-pas",
  "autre",
] as const;
export type DomainCode = (typeof DOMAIN_CODES)[number];
export const MAX_DOMAINS = 2;

export const AVERAGE_SCALES = ["20", "100", "4", "5", "unknown"] as const;
export type AverageScale = (typeof AVERAGE_SCALES)[number];
const SCALE_MAX: Record<Exclude<AverageScale, "unknown">, number> = { "20": 20, "100": 100, "4": 4, "5": 5 };
const SCALE_TO_PCT: Record<Exclude<AverageScale, "unknown">, number> = { "20": 5, "100": 1, "4": 25, "5": 20 };

export const ENGLISH_CERTIFICATES = ["ielts", "toefl", "duolingo", "studiedInEnglish", "none"] as const;
export type EnglishCertificate = (typeof ENGLISH_CERTIFICATES)[number];
export const SCORED_CERTIFICATES = ["ielts", "toefl", "duolingo"] as const;
type ScoredCertificate = (typeof SCORED_CERTIFICATES)[number];

/** Bornes des scores : IELTS 0-9 au pas de 0,5 ; TOEFL 0-120 ; Duolingo 10-160. */
export const ENGLISH_SCORE_RULES: Record<ScoredCertificate, { min: number; max: number; step: number }> = {
  ielts: { min: 0, max: 9, step: 0.5 },
  toefl: { min: 0, max: 120, step: 1 },
  duolingo: { min: 10, max: 160, step: 1 },
};

/** HSK : « HSK 1-2 » est stocké 2. */
export const HSK_LEVELS = ["0", "2", "3", "4", "5", "6"] as const;

export const BANK_STATEMENT_BANDS = ["lt2500", "2500-5000", "5000-10000", "gt10000", "unknown"] as const;
export type BankStatementBand = (typeof BANK_STATEMENT_BANDS)[number];
const BANK_USD_MAX: Record<BankStatementBand, number | null> = {
  lt2500: 0,
  "2500-5000": 2500,
  "5000-10000": 5000,
  gt10000: 10000,
  unknown: null,
};

/** « 13,5 » ou « 13.5 » → 13.5 ; vide ou invalide → null. */
export function parseDecimal(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const v = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(v)) return null;
  return Number(v);
}

export function averageScaleMax(scale: string) {
  return scale in SCALE_MAX ? SCALE_MAX[scale as keyof typeof SCALE_MAX] : null;
}

/** Moyenne valide pour son barème (0 ≤ valeur ≤ max). */
export function isValidAverage(value: number | null, scale: string) {
  const max = averageScaleMax(scale);
  return value !== null && max !== null && value >= 0 && value <= max;
}

/** moyenne_pct : /20 → ×5 ; /4 → ×25 ; /5 → ×20 ; % → tel quel ; « Je ne sais pas » → null. Arrondi à 0,1. */
export function averageToPct(value: number | null, scale: string): number | null {
  if (!isValidAverage(value, scale)) return null;
  const factor = SCALE_TO_PCT[scale as keyof typeof SCALE_TO_PCT];
  return Math.round(value! * factor * 10) / 10;
}

/** Texte lisible pour l'équipe et les exports (« 13,5/20 », « 3,2/4 (GPA) »). */
export function averageDisplay(value: number | null, scale: string, locale = "fr") {
  if (scale === "unknown") return locale === "en" ? "Doesn't know" : "Ne sait pas";
  if (value === null) return "";
  const v = new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 2 }).format(value);
  return scale === "100" ? `${v} %` : scale === "4" ? `${v}/4 (GPA)` : `${v}/${scale}`;
}

export function isScoredCertificate(cert: string): cert is ScoredCertificate {
  return (SCORED_CERTIFICATES as readonly string[]).includes(cert);
}

/** Score dans les bornes et au bon pas (ex. IELTS 6,5 accepté, 10 ou 6,3 refusés). */
export function isValidEnglishScore(cert: string, score: number | null) {
  if (!isScoredCertificate(cert) || score === null) return false;
  const { min, max, step } = ENGLISH_SCORE_RULES[cert];
  if (score < min || score > max) return false;
  const steps = (score - min) / step;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

export function hskToInt(value: string): number | null {
  return (HSK_LEVELS as readonly string[]).includes(value) ? Number(value) : null;
}

export function bankStatementUsdMax(band: string): number | null {
  return band in BANK_USD_MAX ? BANK_USD_MAX[band as BankStatementBand] : null;
}

/**
 * Filière du diplôme obligatoire pour une Licence ou un Master (index 3 et 4 de la
 * liste des diplômes, identique en FR et en EN) ; jamais pour Bac / Probatoire.
 */
export const DEGREE_FIELD_REQUIRED_INDEXES = [3, 4];
/** Filière proposée (facultative) aussi pour BTS, Doctorat et Autre. */
export const DEGREE_FIELD_SHOWN_INDEXES = [2, 3, 4, 5, 6];
