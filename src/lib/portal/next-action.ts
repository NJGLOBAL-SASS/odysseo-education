/**
 * Espace candidat : « Votre prochaine action » (une seule chose à faire à la fois),
 * progression des documents et échéancier des paiements.
 *
 * Tout est déduit de données réelles (rapport, checklist, messages, premier paiement
 * enregistré par l'équipe). Rien n'est supposé : un paiement non enregistré n'est
 * jamais affiché comme réglé.
 */

export type NextActionKey =
  | "validateReport"
  | "firstPayment"
  | "readMessages"
  | "documentsConsent"
  | "sendDocuments"
  | "reviewPrepared"
  | "wait";

export type NextAction = { key: NextActionKey; count?: number; href: string; studentOnly?: boolean };

type ChecklistLite = { status: string; phase: string; required: boolean; kind: string };

export type NextActionInput = {
  report: { published: boolean; validatedCurrent: boolean; paymentReceived: boolean; documentsConsent: boolean } | null;
  checklist: ChecklistLite[];
  unreadMessages: number;
};

const TO_SEND = new Set(["a_fournir", "a_refaire"]);

/** Ordre : rapport à valider → premier paiement → messages → accord documents → documents → relecture → attente. */
export function nextAction({ report, checklist, unreadMessages }: NextActionInput): NextAction {
  if (report?.published && !report.validatedCurrent) return { key: "validateReport", href: "/espace/rapport", studentOnly: true };
  if (report?.validatedCurrent && !report.paymentReceived) return { key: "firstPayment", href: "/espace/messages" };
  if (unreadMessages > 0) return { key: "readMessages", count: unreadMessages, href: "/espace/messages" };
  if (report?.paymentReceived && !report.documentsConsent) return { key: "documentsConsent", href: "/espace/documents", studentOnly: true };

  const toSend = checklist.filter((i) => i.kind !== "prepare" && i.phase === "maintenant" && i.required && TO_SEND.has(i.status)).length;
  if (toSend > 0) return { key: "sendDocuments", count: toSend, href: "/espace/documents", studentOnly: true };

  const toReview = checklist.filter((i) => i.kind === "prepare" && i.status === "a_valider").length;
  if (toReview > 0) return { key: "reviewPrepared", count: toReview, href: "/espace/documents", studentOnly: true };

  return { key: "wait", href: "/espace/messages" };
}

/** Documents attendus maintenant (obligatoires) : combien sont reçus ou validés. */
export function documentProgress(checklist: ChecklistLite[]) {
  const expected = checklist.filter((i) => i.phase === "maintenant" && i.required && i.kind !== "prepare");
  const received = expected.filter((i) => i.status === "recu" || i.status === "valide").length;
  const validated = expected.filter((i) => i.status === "valide").length;
  return { total: expected.length, received, validated };
}

export type ScheduleStep = { label: string; when: string; amount: number };
export type ScheduleLine = ScheduleStep & { status: "paid" | "upcoming" };

/**
 * Échéancier : une étape est « réglée » seulement si le montant enregistré par l'équipe
 * la couvre entièrement (étapes prises dans l'ordre). Les autres sont « à venir ».
 */
export function paymentSchedule(steps: ScheduleStep[], paidAmount: number | null | undefined) {
  let remaining = Math.max(0, paidAmount ?? 0);
  const lines: ScheduleLine[] = steps.map((s) => {
    if (remaining >= s.amount) {
      remaining -= s.amount;
      return { ...s, status: "paid" };
    }
    remaining = 0;
    return { ...s, status: "upcoming" };
  });
  const total = steps.reduce((sum, s) => sum + s.amount, 0);
  const paid = Math.min(total, Math.max(0, paidAmount ?? 0));
  return { lines, total, paid, rest: total - paid };
}
