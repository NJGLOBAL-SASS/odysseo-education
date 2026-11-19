/**
 * Suivi de dossier en ligne (PACK-08) : étapes visibles par l'étudiant et son parent.
 * Libellés et « prochaine action » dans les messages i18n (clé "suivi.stages").
 */

/**
 * Frise, dans l'ordre. PACK-12 : nouveau (= recu) → rapport_pret → rapport_valide →
 * rapport_envoye → accord → ouvert (1er versement) → suite. « analyse » reste pour les
 * dossiers antérieurs et la saisie manuelle.
 */
export const STAGES = [
  "recu",
  "analyse",
  "rapport_pret",
  "rapport_valide",
  "rapport_envoye",
  "accord",
  "ouvert",
  "documents",
  "depose",
  "admis",
  "visa",
  "depart",
  "arrive",
] as const;
/** Statuts parallèles, affichés à la place de la frise (PACK-12 : perdu, rapport expiré). */
export const PARALLEL_STAGES = ["en_attente_etudiant", "clos", "perdu", "rapport_expire"] as const;
/**
 * Étapes retirées, encore acceptées pour les dossiers existants (PACK-10 : « Je valide mon
 * dossier » avant le paiement, supprimé par le PACK-12). Affichées comme « accord ».
 */
export const LEGACY_STAGES = ["valide_attente_paiement"] as const;
export const ALL_STAGES = [...STAGES, ...PARALLEL_STAGES, ...LEGACY_STAGES] as const;

/** Position dans la frise (-1 : statut parallèle). Une étape retirée prend la place de son équivalent. */
export function stagePosition(stage: string) {
  const s = stage === "valide_attente_paiement" ? "accord" : stage;
  return (STAGES as readonly string[]).indexOf(s);
}

export type Stage = (typeof ALL_STAGES)[number];
export type StageHistoryEntry = { stage: Stage; date: string };

export const PUBLIC_NOTE_MAX = 200;

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (ALL_STAGES as readonly string[]).includes(value);
}

export function isParallelStage(stage: string) {
  return (PARALLEL_STAGES as readonly string[]).includes(stage);
}

/** Historique lu en base, nettoyé ; « Dossier reçu » daté de la création s'il manque (dossiers antérieurs). */
export function normalizeHistory(raw: unknown, createdAt: Date): StageHistoryEntry[] {
  const list = (Array.isArray(raw) ? raw : [])
    .filter((e): e is StageHistoryEntry => !!e && isStage((e as StageHistoryEntry).stage) && typeof (e as StageHistoryEntry).date === "string")
    .map((e) => ({ stage: e.stage, date: e.date }));
  if (!list.some((e) => e.stage === "recu")) list.unshift({ stage: "recu", date: createdAt.toISOString() });
  return list;
}

/** Ajoute un changement d'étape à l'historique (rien si l'étape ne change pas). */
export function appendStage(history: StageHistoryEntry[], current: string, next: Stage, now = new Date()): StageHistoryEntry[] {
  if (current === next) return history;
  return [...history, { stage: next, date: now.toISOString() }];
}

/**
 * Prénom seul, jamais le nom de famille. Le formulaire demande « NOM Prénom » (ex. KAMGA Paul) :
 * on prend le premier mot qui n'est pas entièrement en majuscules, sinon le dernier mot.
 */
export function firstNameOf(fullName: string) {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const notUpper = words.find((w) => /\p{Ll}/u.test(w));
  const pick = words.length === 1 ? words[0] : notUpper && words.some((w) => !/\p{Ll}/u.test(w)) ? notUpper : words[words.length - 1];
  return pick.charAt(0).toUpperCase() + pick.slice(1);
}
