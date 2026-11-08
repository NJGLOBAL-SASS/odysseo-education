/**
 * Numéros WhatsApp : saisie au format de l'indicatif choisi (libphonenumber-js) et
 * contrôle de longueur. La valeur enregistrée reste au format international
 * (« +237699123456 »), comme avant : l'API et les dossiers ne changent pas.
 */
import { AsYouType, getExampleNumber, isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";

import { DEFAULT_PHONE_COUNTRY, countryByCode } from "./countries";

const digitsOnly = (v: string) => v.replace(/\D/g, "");

/** Formate les chiffres saisis selon le pays (ex. CM : « 6 99 12 34 56 »). */
export function formatNational(code: string, digits: string) {
  if (!digits) return "";
  return new AsYouType(code as CountryCode).input(digits);
}

/** Valeur internationale à enregistrer, à partir du pays et des chiffres saisis. */
export function toInternational(code: string, digits: string) {
  if (!digits) return "";
  const typer = new AsYouType(code as CountryCode);
  typer.input(digits);
  const number = typer.getNumber()?.number;
  if (number) return number;
  const dial = countryByCode(code)?.dial ?? "";
  return `+${dial}${digits.replace(/^0+/, "")}`;
}

/**
 * Pays et chiffres nationaux d'une valeur enregistrée (« +237699123456 », ou un ancien
 * brouillon « +237 6XX… »). Le pays mémorisé l'emporte s'il a le même indicatif (+1 : USA / Canada).
 */
export function splitPhone(value: string, preferred?: string): { code: string; digits: string } {
  const fallback = preferred || DEFAULT_PHONE_COUNTRY;
  const v = value.trim().replace(/^00/, "+");
  if (!v) return { code: fallback, digits: "" };
  if (!v.startsWith("+")) return { code: fallback, digits: digitsOnly(v) };
  const typer = new AsYouType();
  typer.input(v);
  const callingCode = typer.getCallingCode();
  const detected = typer.getCountry();
  const prefCountry = countryByCode(preferred);
  const code = prefCountry && prefCountry.dial === callingCode ? prefCountry.code : detected || fallback;
  const dial = countryByCode(code)?.dial ?? callingCode ?? "";
  const all = digitsOnly(v);
  return { code, digits: all.startsWith(dial) ? all.slice(dial.length) : typer.getNationalNumber() };
}

/** Exemple de numéro mobile au format national (ex. « 6 71 23 45 67 »). */
export function phoneExample(code: string) {
  try {
    return getExampleNumber(code as CountryCode, examples)?.formatNational() ?? "";
  } catch {
    return "";
  }
}

/** Nombre maximal de chiffres nationaux (E.164 : 15 chiffres au total). */
export function maxNationalDigits(code: string) {
  return 15 - (countryByCode(code)?.dial.length ?? 1);
}

/**
 * Numéro accepté : valide pour son pays, ou de la même longueur que l'exemple du pays
 * (une nouvelle tranche de numéros pas encore connue de la bibliothèque n'est pas bloquée).
 */
export function isAcceptablePhone(value: string) {
  const v = value.replace(/[\s.\-()/]/g, "").replace(/^00/, "+");
  if (!/^\+\d{8,15}$/.test(v)) return false;
  if (isValidPhoneNumber(v)) return true;
  const parsed = parsePhoneNumberFromString(v);
  if (!parsed?.country) return false;
  const example = getExampleNumber(parsed.country, examples);
  return Boolean(example) && example!.nationalNumber.length === parsed.nationalNumber.length && parsed.isPossible();
}
