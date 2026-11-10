/** Formats des dates du catalogue (« 2027-01-31 », rentrée « 2027-09 »), en UTC pour éviter tout décalage d'un jour. */
const tag = (locale: string) => (locale === "en" ? "en-GB" : "fr-FR");

export function formatDeadline(date: string, locale: string) {
  return new Intl.DateTimeFormat(tag(locale), { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

export function formatIntake(rentree: string, locale: string) {
  return new Intl.DateTimeFormat(tag(locale), { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${rentree}-01T00:00:00Z`));
}
