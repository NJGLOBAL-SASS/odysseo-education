/**
 * PACK-13 §2.1 : choix des 2 exemples validés envoyés à l'IA (connaissances/exemples/).
 * Ensuite, les rapports validés sur la plateforme du même cas et niveau prennent le relais (§3.5).
 */
export const EXAMPLES = {
  "01": "01_mbbs_moyenne_faible.md",
  "02": "02_mbbs_bon_profil_hsk.md",
  "03": "03_licence_ingenierie_septembre.md",
  "04": "04_licence_moyenne_faible.md",
  "05": "05_doctorat_vers_master.md",
  "06": "06_langue_vers_master_linguistique.md",
  "07": "07_mbbs_reorientation_ingenierie_ANCIEN.md",
  "08": "08_master_bon_profil_informatique.md",
  "09": "09_licence_commerce_moyenne_faible_yaounde.md",
  "10": "10_licence_excellent_profil_septembre.md",
  "11": "11_licence_filiere_a_choisir_age_septembre.md",
} as const;
export type ExampleId = keyof typeof EXAMPLES;

export interface ExampleProfile {
  /** Niveau du formulaire : language | licence | master | doctorat. */
  targetLevel: string;
  /** Filière souhaitée en médecine. */
  medecine: boolean;
  /** Moyenne ramenée sur 100 (null si inconnue). */
  averagePct: number | null;
  /** Rentrée visée pas encore ouverte (septembre). */
  rentreeNonOuverte: boolean;
  /** Diplôme le plus élevé (« Licence », « Master »…). */
  highestDegree: string | null;
  /** Profil lettres / langues. */
  lettres: boolean;
  /** Langue demandée « uniquement avec une bourse ». */
  langueAvecBourseSeulement: boolean;
}

export function pickExamples(p: ExampleProfile): ExampleId[] {
  if (p.medecine) return ["01", "02"];
  if (p.targetLevel === "language") return p.langueAvecBourseSeulement ? ["06", "03"] : ["03", "06"];
  if (p.targetLevel === "doctorat") return /master/i.test(p.highestDegree ?? "") ? ["08", "05"] : ["05", "08"];
  if (p.targetLevel === "master") return p.lettres ? ["06", "08"] : ["08", "05"];
  // Licence
  if (p.averagePct != null && p.averagePct < 60) return ["04", "09"];
  if (p.rentreeNonOuverte) return [p.averagePct != null && p.averagePct >= 70 ? "10" : "11", "03"];
  return ["03", "10"];
}
