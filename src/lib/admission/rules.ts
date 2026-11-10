/** Règles pures de la checklist (PACK-10), utilisables côté navigateur (sans le catalogue JSON). */

/** Un document compte comme « validé » dans la progression. */
export function progressOf(items: { status: string; kind: string; required: boolean }[]) {
  const counted = items.filter((i) => i.kind !== "prepare");
  return { done: counted.filter((i) => i.status === "valide").length, total: counted.length };
}

/** Passeport : doit être valide au moins 6 mois après la rentrée (« 2027-09 » → 01/03/2028). */
export function passportTooShort(expiry: Date, rentree = "2027-09") {
  const [y, m] = rentree.split("-").map(Number);
  const limit = new Date(Date.UTC(y, m - 1 + 6, 1));
  return expiry.getTime() < limit.getTime();
}
