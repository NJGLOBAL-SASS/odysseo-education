/**
 * Recherche dans la FAQ (PACK-09). Module séparé de faq.ts pour que le composant
 * client n'embarque pas les fichiers JSON (les questions lui sont passées en props).
 */
export type FaqQuestion = { id: string; q: string; r: string };
export type FaqCategory = { id: string; titre: string; questions: FaqQuestion[] };

/** Minuscules sans accents, pour une recherche tolérante (« releve » trouve « relevé »). */
export function normalizeSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const words = (text: string) => normalizeSearch(text).split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Filtre instantané sur les questions et les réponses. Chaque mot tapé doit se
 * retrouver soit au début d'un mot de la question (on peut taper « rel… »),
 * soit comme mot entier dans la réponse — sinon « relevé » remonterait aussi
 * toutes les réponses qui parlent de « relevés de notes ».
 */
export function matchesQuery(question: { q: string; r: string }, query: string) {
  const terms = words(query);
  if (terms.length === 0) return true;
  const qWords = words(question.q);
  const rWords = new Set(words(question.r));
  return terms.every((t) => qWords.some((w) => w.startsWith(t)) || rWords.has(t));
}

export function filterFaq(categories: FaqCategory[], query: string): FaqCategory[] {
  return categories
    .map((c) => ({ ...c, questions: c.questions.filter((x) => matchesQuery(x, query)) }))
    .filter((c) => c.questions.length > 0);
}
