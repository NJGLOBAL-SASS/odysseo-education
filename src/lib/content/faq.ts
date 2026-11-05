/**
 * FAQ et checklist « Avant le départ » (PACK-09).
 *
 * Source : content/faq/faq_{fr,en}.json et content/guides/checklist_depart_{fr,en}.json.
 * Seul le fondateur valide les textes : on les affiche tels quels, sans les modifier.
 *
 * Règle de publication : tout texte contenant « [À » (ex. « [À VALIDER] ») ou un
 * nombre entre crochets à confirmer (ex. « [7] ») est masqué. Dès que le texte est
 * corrigé dans le JSON, la question ou l'élément s'affiche automatiquement.
 */
import faqFr from "../../../content/faq/faq_fr.json";
import faqEn from "../../../content/faq/faq_en.json";
import checklistFr from "../../../content/guides/checklist_depart_fr.json";
import checklistEn from "../../../content/guides/checklist_depart_en.json";

import type { FaqCategory } from "./faq-search";

export type ContentLocale = "fr" | "en";

export type { FaqCategory, FaqQuestion } from "./faq-search";
export type ChecklistItem = { id: string; text: string };
export type ChecklistSection = { titre: string; items: ChecklistItem[] };

type RawFaq = { categories: { id: string; titre: string; questions: { q: string; r: string }[] }[] };
type RawChecklist = { meta: { titre: string; version: string }; sections: { titre: string; items: string[] }[] };

const RAW_FAQ: Record<ContentLocale, RawFaq> = { fr: faqFr, en: faqEn };
const RAW_CHECKLIST: Record<ContentLocale, RawChecklist> = { fr: checklistFr, en: checklistEn };

/** Texte publiable : ni « [À ... » ni nombre entre crochets en attente de validation. */
export function isPublishable(text: string) {
  return !text.includes("[À") && !/\[\s*\d+(?:[.,]\d+)?\s*\]/.test(text);
}

/** Identifiant stable à partir du texte (ancres, état des cases à cocher). */
function slugId(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Catégories et questions affichables (catégories vides retirées). */
export function getFaq(locale: ContentLocale): FaqCategory[] {
  return RAW_FAQ[locale].categories
    .map((c) => ({
      id: c.id,
      titre: c.titre,
      questions: c.questions
        .filter((x) => isPublishable(x.q) && isPublishable(x.r))
        .map((x) => ({ id: `q-${slugId(x.q)}`, q: x.q, r: x.r })),
    }))
    .filter((c) => isPublishable(c.titre) && c.questions.length > 0);
}

export function getChecklist(locale: ContentLocale): { titre: string; version: string; sections: ChecklistSection[] } {
  const raw = RAW_CHECKLIST[locale];
  return {
    titre: raw.meta.titre,
    version: raw.meta.version,
    sections: raw.sections
      .map((s) => ({
        titre: s.titre,
        items: s.items.filter(isPublishable).map((text) => ({ id: slugId(text), text })),
      }))
      .filter((s) => isPublishable(s.titre) && s.items.length > 0),
  };
}

export { filterFaq, matchesQuery, normalizeSearch } from "./faq-search";
