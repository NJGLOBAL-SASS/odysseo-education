/**
 * Statut unique du rapport d'admissibilité (PACK-12 + ODY-15 + PACK-13), champ
 * AdmissionReport.status. Module pur (utilisable côté client).
 *
 *   infos_manquantes · analyse_en_cours · a_revoir   (PACK-13, avant le rapport)
 *   brouillon        offres calculées par les règles, aucun PDF        → « Nouveau »
 *   a_valider        PDF déposé (ou généré), pas encore envoyé         → « Rapport prêt »
 *   envoye · lu      rapport parti / lien privé ouvert par l'étudiant
 *   oui_recu · premier_versement_recu · sans_suite
 *
 * Les relances (R1-R3) ne sont pas des statuts : table ReportReminder.
 */
export const REPORT_STATUSES = [
  "infos_manquantes",
  "analyse_en_cours",
  "a_revoir",
  "brouillon",
  "a_valider",
  "envoye",
  "lu",
  "oui_recu",
  "premier_versement_recu",
  "sans_suite",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Avant tout envoi : la candidature est « à envoyer ». */
export const PRE_SEND: readonly ReportStatus[] = ["infos_manquantes", "analyse_en_cours", "a_revoir", "brouillon", "a_valider"];
/** Suivi terminé : plus de relance. */
export const CLOSED: readonly ReportStatus[] = ["oui_recu", "premier_versement_recu", "sans_suite"];

/** Valeurs du PACK-12 (jamais déployées en production, mais possibles en local). */
const LEGACY: Record<string, ReportStatus> = {
  valide: "a_valider",
  accord: "oui_recu",
  ouvert: "premier_versement_recu",
  perdu: "sans_suite",
  expire: "envoye",
};

/** Motifs d'arrêt des relances proposés à l'équipe (oui_recu et versement sont automatiques). */
export const STOP_REASONS = ["pas_interesse", "autre_rentree", "injoignable", "autre"] as const;
export type StopReason = (typeof STOP_REASONS)[number] | "oui_recu" | "versement";

export const CASES = ["standard", "moyenne_faible", "mbbs", "parcours_complet", "septembre_non_ouvert", "master_phd", "langue", "peu_offres"] as const;
export type ReportCase = (typeof CASES)[number];

export const SEND_MODES = ["whatsapp_lien", "partage_pdf", "hors_plateforme"] as const;
export type SendMode = (typeof SEND_MODES)[number];

interface ReportLike {
  status?: string | null;
  publishedAt?: Date | string | null;
  paymentReceivedAt?: Date | string | null;
}

/** Statut effectif (rapports antérieurs : déduit de la publication et du paiement). Sans rapport : null. */
export function reportStatus(r: ReportLike | null | undefined): ReportStatus | null {
  if (!r) return null;
  if (r.status && (REPORT_STATUSES as readonly string[]).includes(r.status)) return r.status as ReportStatus;
  if (r.status && LEGACY[r.status]) return LEGACY[r.status];
  if (r.paymentReceivedAt) return "premier_versement_recu";
  if (r.publishedAt) return "envoye";
  return "brouillon";
}

export const isPreSend = (s: ReportStatus | null) => s === null || PRE_SEND.includes(s);
export const isClosed = (s: ReportStatus | null) => s !== null && CLOSED.includes(s);

// ── Badge de la liste (ODY-15 §5.1) ──

export type BadgeKey = "nouveau" | "pret" | "envoye" | "lu" | "relance" | "oui" | "versement" | "sans_suite" | "infos" | "analyse" | "a_revoir";

export interface BadgeInput {
  status: ReportStatus | null;
  /** Dernière version non archivée. */
  latest?: { version: number; sentAt?: Date | string | null } | null;
  /** Dernière version envoyée. */
  sent?: { sentAt: Date | string; sentByName?: string | null; readAt?: Date | string | null } | null;
  /** Numéro de la dernière relance envoyée (0 si aucune). */
  lastReminder?: number;
  stopReason?: string | null;
}

export interface Badge {
  key: BadgeKey;
  /** Date courte (JJ/MM) et prénom du membre pour « Envoyé ». */
  date?: string;
  by?: string;
  n?: number;
  /** v2, v3… quand une nouvelle version attend d'être envoyée. */
  version?: number;
  reason?: string | null;
  read?: boolean;
}

const shortDate = (d: Date | string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Africa/Douala" }).format(new Date(d));

export function firstWord(name: string | null | undefined) {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

export function reportBadge(i: BadgeInput): Badge {
  const s = i.status;
  if (s === "premier_versement_recu") return { key: "versement" };
  if (s === "oui_recu") return { key: "oui" };
  if (s === "sans_suite") return { key: "sans_suite", reason: i.stopReason ?? null };
  if (s === "infos_manquantes") return { key: "infos" };
  if (s === "analyse_en_cours") return { key: "analyse" };
  if (s === "a_revoir") return { key: "a_revoir" };
  // Nouvelle version déposée après un envoi : « Rapport prêt (v2) ».
  if (i.latest && !i.latest.sentAt && (s === "a_valider" || s === "envoye" || s === "lu")) {
    return { key: "pret", version: i.latest.version > 1 ? i.latest.version : undefined };
  }
  if ((s === "envoye" || s === "lu") && i.sent) {
    const read = Boolean(i.sent.readAt) || s === "lu";
    if (i.lastReminder) return { key: "relance", n: i.lastReminder, read };
    if (read) return { key: "lu", read };
    return { key: "envoye", date: shortDate(i.sent.sentAt), by: firstWord(i.sent.sentByName) };
  }
  if (s === "a_valider") return { key: "pret" };
  return { key: "nouveau" };
}
