import { COUNTRY_DATA } from "./countries-data";

export interface Country {
  /** Code ISO 3166-1 alpha-2, ex. « CM ». */
  code: string;
  /** Nom français : valeur enregistrée dans les dossiers (ex. « Cameroun »). */
  fr: string;
  en: string;
  /** Indicatif sans « + », ex. « 237 ». */
  dial: string;
}

export const ALL_COUNTRIES: Country[] = COUNTRY_DATA.map(([code, fr, en, dial]) => ({ code, fr, en, dial }));

/** Pays les plus fréquents, affichés en tête de liste (l'ancienne liste courte du formulaire). */
export const PRIORITY_COUNTRY_CODES = ["CM", "GA", "TD", "CI", "SN", "ML", "GN", "CG", "CD", "BJ", "TG", "BF", "CF"];

/** Valeur « Autre » (pays non listé), conservée pour les dossiers existants. */
export const OTHER_COUNTRY = "Autre";

export const DEFAULT_PHONE_COUNTRY = "CM";

const byCode = new Map(ALL_COUNTRIES.map((c) => [c.code, c]));
const byName = new Map(ALL_COUNTRIES.flatMap((c) => [[c.fr.toLowerCase(), c] as const, [c.en.toLowerCase(), c] as const]));

/** Pays à partir de la valeur stockée (nom FR), d'un nom EN ou d'un code ISO. */
export function countryByValue(value: string | null | undefined): Country | undefined {
  if (!value) return undefined;
  return byCode.get(value.toUpperCase()) ?? byName.get(value.trim().toLowerCase());
}

export function countryByCode(code: string | null | undefined): Country | undefined {
  return code ? byCode.get(code.toUpperCase()) : undefined;
}

/** Nom affiché dans la langue de la page (la valeur stockée reste le nom FR). */
export function countryLabel(value: string, locale: string) {
  if (value === OTHER_COUNTRY) return locale === "en" ? "Other" : "Autre";
  const c = countryByValue(value);
  return c ? (locale === "en" ? c.en : c.fr) : value;
}

/** Indicatif avec « + » (ex. « +237 »), ou "" si inconnu. */
export function dialCodeFor(value: string) {
  const c = countryByValue(value);
  return c ? `+${c.dial}` : "";
}

/** Drapeau emoji à partir du code ISO (lettres affichées si l'appareil n'a pas les drapeaux). */
export function flagEmoji(code: string) {
  return String.fromCodePoint(...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
