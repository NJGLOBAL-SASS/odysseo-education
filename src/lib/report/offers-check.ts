/**
 * « Revérifier les offres » (PACK-13 §5, ODY-15 §5.1) : compare les offres d'un rapport au
 * catalogue actuel. Module pur : le catalogue est passé en paramètre.
 */
export const SOON_DAYS = 21; // [À VALIDER — fondateur] seuil « date proche »
export const CLOSED_STATUSES = ["expiree", "quota_atteint", "non_eligible_afrique"];

export type OfferState = "ok" | "soon" | "closed" | "unknown";

export interface SnapshotOffer {
  ref: string;
  date_limite?: string | null;
  statut?: string | null;
}

export interface CatalogueOffer {
  ref: string;
  date_limite: string | null;
  statut: string;
}

export interface CheckedOffer {
  ref: string;
  state: OfferState;
  date_limite: string | null;
  /** Statut du catalogue s'il a changé depuis l'émission. */
  statut: string | null;
}

const dayOf = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

export function checkOffer(ref: string, lookup: (ref: string) => CatalogueOffer | undefined, today: Date, soonDays = SOON_DAYS): CheckedOffer {
  const o = lookup(ref);
  if (!o) return { ref, state: "unknown", date_limite: null, statut: null };
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const base = { ref, date_limite: o.date_limite, statut: o.statut };
  if (CLOSED_STATUSES.includes(o.statut)) return { ...base, state: "closed" };
  if (o.date_limite && /^\d{4}-\d{2}-\d{2}/.test(o.date_limite)) {
    const d = dayOf(o.date_limite);
    if (d < todayDay) return { ...base, state: "closed" };
    if (d - todayDay < soonDays * 86_400_000) return { ...base, state: "soon" };
  }
  return { ...base, state: "ok" };
}

export function checkOffers(snapshot: SnapshotOffer[] | null | undefined, lookup: (ref: string) => CatalogueOffer | undefined, today = new Date()) {
  return (snapshot ?? []).map((s) => checkOffer(s.ref, lookup, today));
}

/** Badge « ⚠️ Offres à revérifier » : une offre fermée ou qui ferme bientôt. */
export const needsRecheck = (checked: CheckedOffer[]) => checked.some((c) => c.state === "closed" || c.state === "soon");

/** Références saisies à la main (« B-03, L-07 ») → liste propre et unique. */
export function parseRefs(text: string) {
  return [...new Set(text.toUpperCase().split(/[\s,;]+/).map((r) => r.trim()).filter((r) => /^[A-Z]{1,3}-\d{1,3}$/.test(r)))];
}

/** Date limite la plus proche, à venir, parmi les offres du rapport. */
export function nearestDeadline(checked: Pick<CheckedOffer, "date_limite">[], today = new Date()) {
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const days = checked.map((c) => c.date_limite).filter((d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}/.test(d))).map(dayOf).filter((d) => d >= todayDay);
  return days.length ? new Date(Math.min(...days)) : null;
}
