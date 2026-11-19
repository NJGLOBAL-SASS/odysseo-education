/**
 * PACK-13 §3.6 : profil incomplet → pas d'analyse (ni IA ni règles), statut « infos_manquantes »
 * et message de question prêt. Module pur.
 * Informations indispensables : moyenne, diplôme (série pour le bac), âge, filière souhaitée.
 */
export interface ProfileForCheck {
  highestDegree: string | null;
  degreeField: string | null;
  averagePct: number | null;
  degreeAverage?: string | null;
  age: number | null;
  fieldOfStudy: string | null;
  studyFields: string[];
}

const isBac = (degree: string | null) => /bac|a level/i.test(degree ?? "");

/** Liste des informations manquantes, formulées pour le message à l'étudiant (vide = profil complet). */
export function missingInfo(p: ProfileForCheck): string[] {
  const out: string[] = [];
  if (p.averagePct == null && !(p.degreeAverage ?? "").trim()) out.push("votre moyenne (dernier relevé de notes ou bulletin)");
  if (!(p.highestDegree ?? "").trim() || p.highestDegree === "Autre") out.push("votre dernier diplôme obtenu");
  else if (isBac(p.highestDegree) && !(p.degreeField ?? "").trim()) out.push("la série de votre bac");
  if (p.age == null) out.push("votre âge");
  if (!(p.fieldOfStudy ?? "").trim() && p.studyFields.length === 0) out.push("la filière que vous souhaitez étudier");
  return out;
}

/** « a, b et c ». */
export function joinFr(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}
