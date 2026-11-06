/**
 * Projection publique d'une offre recommandée (PACK-02) et traduction anglaise des
 * textes du catalogue (rédigé en français). Module pur.
 *
 * Seuls ces champs quittent le serveur : ref, role, cycle, lieu_affiche, arguments,
 * langue, duree, date_limite, filieres_correspondantes. Jamais score, criteres, statut.
 */
import type { Offer, PublicRecommendation, Recommendation } from "./types";

export function toPublicRecommendation(o: Offer, r: Recommendation, locale = "fr"): PublicRecommendation {
  const tr = locale === "en" ? translateOfferText : (s: string) => s;
  return {
    ref: o.ref,
    role: r.role,
    cycle: o.cycle,
    lieu_affiche: o.lieu_affiche,
    arguments: o.arguments.map(tr),
    langue: tr(o.langue),
    duree: o.duree ? tr(o.duree) : null,
    date_limite: o.date_limite,
    filieres_correspondantes: r.filieres_correspondantes,
  };
}

/**
 * Remplacements appliqués dans l'ordre (expressions les plus longues d'abord).
 * Un texte nouveau non couvert reste partiellement en français : à compléter ici
 * quand le catalogue change.
 */
const EN_REPLACEMENTS: [RegExp, string][] = [
  // Avant le remplacement de « : ».
  [/Anglais \(Mathématiques : aussi en chinois\)/g, "English (Mathematics: also in Chinese)"],
  [/Frais de scolarité offerts/g, "Tuition fees covered"],
  [/Scolarité offerte en 1re année/g, "Tuition covered in year 1"],
  [/Scolarité offerte/g, "Tuition covered"],
  [/ou réduite/g, "or reduced"],
  [/Logement et assurance offerts/g, "Accommodation and insurance covered"],
  [/Assurance et inscription offertes/g, "Insurance and registration covered"],
  [/Logement offert/g, "Accommodation covered"],
  [/assurance offerte/g, "insurance covered"],
  [/Assurance offerte/g, "Insurance covered"],
  [/Type A : logement, assurance/g, "Type A: accommodation, insurance"],
  [/Bourse partielle : 50 % de la scolarité, 30 % du logement/g, "Partial scholarship: 50% of tuition, 30% of accommodation"],
  [/Allocation au mérite/g, "Merit allowance"],
  [/Meilleurs étudiants/g, "Top students"],
  [/Réductions de (.+?) ensuite/g, "Reductions of $1 afterwards"],
  [/Bourse de la ville : (.+?) \(sur examen\)/g, "City scholarship: $1 (by exam)"],
  [/Allocation/g, "Allowance"],
  [/jusqu'à/g, "up to"],
  [/en 1re année/g, "in year 1"],
  [/\(selon le type\)/g, "(depending on type)"],
  [/\(10 mois\/an\)/g, "(10 months/year)"],
  [/\((types? [A-C](?: et [A-C])?)\)/g, "($1)"],
  [/types A et B/g, "types A and B"],
  [/ou à (\d+) % \(type C\)/g, "or $1% (type C)"],
  [/ou à (\d+) %/g, "or $1%"],
  [/(\d) à (\d)/g, "$1 to $2"],
  [/\/mois/g, "/month"],
  [/\/an\b/g, "/year"],
  [/ : /g, ": "],
  // Langue d'enseignement et durée.
  [/Chinois \(HSK (\d) exigé\)/g, "Chinese (HSK $1 required)"],
  [/Anglais \(chinois pour Chinese Language and Literature\)/g, "English (Chinese for Chinese Language and Literature)"],
  [/Anglais \((\d+) filières en chinois\)/g, "English ($1 programmes in Chinese)"],
  [/^Anglais$/g, "English"],
  [/^Non précisée$/g, "Not specified"],
  [/(\d) ans \(indiqué « 2nd to 4th year »\)/g, "$1 years (stated as “2nd to 4th year”)"],
  [/(\d) ans/g, "$1 years"],
];

export function translateOfferText(text: string): string {
  return EN_REPLACEMENTS.reduce((s, [re, by]) => s.replace(re, by), text);
}
