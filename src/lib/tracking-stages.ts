/**
 * Suivi de dossier en ligne (PACK-08) : étapes visibles par l'étudiant et son parent.
 * Libellés et « prochaine action » dans les messages i18n (clé "suivi.stages").
 */

/** Frise, dans l'ordre. */
export const STAGES = ["recu", "analyse", "ouvert", "documents", "depose", "admis", "visa", "depart", "arrive"] as const;
/** Statuts parallèles, affichés à la place de la frise. */
export const PARALLEL_STAGES = ["en_attente_etudiant", "clos"] as const;
export const ALL_STAGES = [...STAGES, ...PARALLEL_STAGES] as const;

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

/** 4 derniers chiffres d'un numéro. */
export function lastFourDigits(phone: string) {
  return phone.replace(/\D/g, "").slice(-4);
}

/** Les 4 chiffres saisis correspondent au WhatsApp de l'étudiant, ou à celui du parent / tuteur s'il existe. */
export function matchesPhoneDigits(c: { whatsapp: string; guardianWhatsapp?: string | null }, digits: string) {
  if (!/^\d{4}$/.test(digits)) return false;
  return [c.whatsapp, c.guardianWhatsapp].some((n) => !!n && n.replace(/\D/g, "").length >= 4 && lastFourDigits(n) === digits);
}

/** Code dossier saisi : majuscules, sans espaces ; « ODY » ajouté s'il manque (« 2bq9x1 » → « ODY-2BQ9X1 »). */
export function normalizeCode(input: string) {
  const v = input.trim().toUpperCase().replace(/\s+/g, "");
  if (/^ODY-?[A-Z0-9]{6}$/.test(v)) return `ODY-${v.replace(/^ODY-?/, "")}`;
  if (/^[A-Z0-9]{6}$/.test(v)) return `ODY-${v}`;
  return v;
}
