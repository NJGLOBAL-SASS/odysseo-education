/**
 * Moyens de paiement affichés sur la page Parents (PACK-07), lus dans content/paiement.json.
 * Seuls les moyens marqués "actif": true (confirmés par le fondateur) sont affichés.
 */
import raw from "../../../content/paiement.json";

import type { Locale } from "@/lib/programs";

type RawMethod = { id: string; type?: string; libelle_fr: string; libelle_en: string; pays?: string[]; actif?: boolean };
type RawPayment = { moyens?: RawMethod[]; regles_affichees_fr?: string[]; regles_affichees_en?: string[] };

export type PaymentMethod = { id: string; type: "mobile" | "banque" | "autre"; label: string; countries: string[] };

export function getPaymentMethods(locale: Locale, data: RawPayment = raw as RawPayment): PaymentMethod[] {
  return (data.moyens ?? [])
    .filter((m) => m.actif === true && m.libelle_fr?.trim())
    .map((m) => ({
      id: m.id,
      type: m.type === "mobile" || m.type === "banque" ? m.type : "autre",
      label: (locale === "en" ? m.libelle_en : m.libelle_fr) || m.libelle_fr,
      countries: m.pays ?? [],
    }));
}

export function getPaymentRules(locale: Locale, data: RawPayment = raw as RawPayment): string[] {
  return (locale === "en" ? data.regles_affichees_en : data.regles_affichees_fr) ?? data.regles_affichees_fr ?? [];
}
