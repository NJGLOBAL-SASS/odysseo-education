import fr from "@/i18n/messages/fr.json";
import en from "@/i18n/messages/en.json";

/**
 * Le formulaire enregistre des valeurs techniques ("self", "guardian", "master"...).
 * Ce module les retraduit avec exactement les libellés vus par le candidat,
 * pour que le dashboard, les exports, Google Sheets et les emails affichent
 * "Un tuteur ou autre" et non "guardian".
 */

type Messages = typeof fr;
type Fields = Messages["intake"]["fields"];

const OPTION_GROUPS = {
  managedBy: (f: Fields) => f.managedBy.options,
  guardianLink: (f: Fields) => f.guardianBlock.linkOptions,
  currentSituation: (f: Fields) => f.situation.options,
  targetLevel: (f: Fields) => f.level.options,
  passportStatus: (f: Fields) => f.passport.options,
  englishLevel: (f: Fields) => f.english.options,
  fundingPlan: (f: Fields) => f.funding.options,
  targetIntake: (f: Fields) => f.intake.options,
  discoverySource: (f: Fields) => f.discovery.options,
} satisfies Record<string, (f: Fields) => Record<string, string>>;

export type LabelledField = keyof typeof OPTION_GROUPS;

function fieldsFor(locale: string): Fields {
  return ((locale === "en" ? en : fr) as Messages).intake.fields;
}

/** Libellé lisible d'une valeur du formulaire ; renvoie la valeur brute si inconnue. */
export function optionLabel(field: LabelledField, value: string | null | undefined, locale = "fr") {
  if (!value) return "";
  const options = OPTION_GROUPS[field](fieldsFor(locale)) as Record<string, string>;
  return options[value] ?? value;
}

/** Toutes les options d'un champ, dans l'ordre du formulaire (pour les filtres). */
export function optionEntries(field: LabelledField, locale = "fr") {
  return Object.entries(OPTION_GROUPS[field](fieldsFor(locale)) as Record<string, string>);
}
