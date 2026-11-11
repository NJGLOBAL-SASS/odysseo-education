import { STAGES, firstNameOf, isParallelStage } from "@/lib/tracking-stages";

/**
 * Étapes qui déclenchent une prime selon le contrat partenaire : ouverture du dossier (1er versement),
 * rendez-vous visa, visa obtenu (prêt pour le départ). Affichage seulement : aucun montant.
 */
export const PAID_STAGES = new Set<string>(["ouvert", "visa", "depart"]);

/** « Aïcha N. » : prénom + initiale du nom (confidentialité vis-à-vis du partenaire). */
export function shortName(fullName: string) {
  const first = firstNameOf(fullName);
  const other = fullName
    .trim()
    .split(/\s+/)
    .find((w) => w && w !== first);
  return other ? `${first} ${other.charAt(0).toUpperCase()}.` : first;
}

/** Index de l'étape dans la frise (−1 pour les états parallèles : en attente, clôturé). */
export function stageIndex(stage: string) {
  return isParallelStage(stage) ? -1 : (STAGES as readonly string[]).indexOf(stage);
}
