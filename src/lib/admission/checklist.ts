/**
 * Génération de la checklist de documents d'un dossier (PACK-10), module pur.
 * Source : data/documents/documents_requis.json (base par cycle + ajouts selon les offres
 * retenues + documents préparés par Odysseo).
 */
import raw from "../../../data/documents/documents_requis.json";

type DocDef = {
  libelle_fr: string;
  libelle_en: string;
  phase: "maintenant" | "plus_tard";
  obligatoire: boolean;
  aide_fr?: string;
  aide_en?: string;
  type?: "formulaire";
  formats?: string[];
  taille_max_mo?: number;
  champ_date?: string;
};
type OfferRule = { ajouter?: string[]; rendre_obligatoire?: string[]; note_fr?: string; note_en?: string };
type Catalogue = {
  meta: { formats_acceptes: string[]; taille_max_mo: number };
  documents: Record<string, DocDef>;
  base_par_cycle: Record<Cycle, string[]>;
  ajouts_par_offre: Record<string, OfferRule>;
  prepares_par_odysseo: Record<Cycle, string[]> & { _libelles_fr: Record<string, string>; _libelles_en: Record<string, string> };
};

const DATA = raw as unknown as Catalogue;

export type Cycle = "langue" | "bachelor" | "master" | "phd";

/** Cursus facturé (slug des pages /cursus) → cycle du catalogue de documents. */
export const PROGRAM_CYCLE: Record<string, Cycle> = {
  "langue-chinoise": "langue",
  bachelor: "bachelor",
  master: "master",
  doctorat: "phd",
};
export const REPORT_PROGRAMS = Object.keys(PROGRAM_CYCLE);

export interface ChecklistSpec {
  key: string;
  kind: "fichier" | "formulaire" | "prepare";
  labelFr: string;
  labelEn: string;
  helpFr: string | null;
  helpEn: string | null;
  noteFr: string | null;
  noteEn: string | null;
  phase: "maintenant" | "plus_tard";
  required: boolean;
  formats: string[];
  maxMb: number;
  sortOrder: number;
}

export const PREPARED_PREFIX = "prep-";
export const PASSPORT_KEY = "passeport";

/** Checklist pour un cursus et les offres du rapport validé (doublons fusionnés, « maintenant » d'abord). */
export function generateChecklist(program: string, offerRefs: string[]): ChecklistSpec[] {
  const cycle = PROGRAM_CYCLE[program];
  if (!cycle) throw new Error(`Cursus inconnu : ${program}`);

  const keys = [...DATA.base_par_cycle[cycle]];
  const required = new Set<string>();
  const notes = new Map<string, { fr: string[]; en: string[] }>();
  for (const ref of offerRefs) {
    const rule = DATA.ajouts_par_offre[ref.toUpperCase()];
    if (!rule) continue;
    for (const k of rule.ajouter ?? []) if (!keys.includes(k)) keys.push(k);
    for (const k of rule.rendre_obligatoire ?? []) {
      required.add(k);
      if (!keys.includes(k)) keys.push(k);
    }
    // La note s'affiche sur les documents concernés, sinon sur le premier document du dossier (diplômes).
    if (rule.note_fr) {
      const targets = [...(rule.ajouter ?? []), ...(rule.rendre_obligatoire ?? [])];
      for (const k of targets.length ? targets : [keys.find((x) => x.startsWith("diplome_")) ?? keys[0]]) {
        const n = notes.get(k) ?? { fr: [], en: [] };
        n.fr.push(`${ref.toUpperCase()} : ${rule.note_fr}`);
        n.en.push(`${ref.toUpperCase()}: ${rule.note_en ?? rule.note_fr}`);
        notes.set(k, n);
      }
    }
  }

  const docs: ChecklistSpec[] = keys
    .filter((k) => DATA.documents[k])
    .map((k) => {
      const d = DATA.documents[k];
      const n = notes.get(k);
      return {
        key: k,
        kind: d.type === "formulaire" ? "formulaire" : "fichier",
        labelFr: d.libelle_fr,
        labelEn: d.libelle_en,
        helpFr: d.aide_fr ?? null,
        helpEn: d.aide_en ?? null,
        noteFr: n ? [...new Set(n.fr)].join("\n") : null,
        noteEn: n ? [...new Set(n.en)].join("\n") : null,
        phase: d.phase,
        required: d.obligatoire || required.has(k),
        formats: d.formats ?? DATA.meta.formats_acceptes,
        maxMb: d.taille_max_mo ?? DATA.meta.taille_max_mo,
        sortOrder: 0,
      };
    });

  // « À fournir maintenant » puis « Plus tard », en gardant l'ordre du catalogue dans chaque groupe.
  const ordered = [...docs.filter((d) => d.phase === "maintenant"), ...docs.filter((d) => d.phase === "plus_tard")];

  const prepared: ChecklistSpec[] = DATA.prepares_par_odysseo[cycle].map((k) => ({
    key: `${PREPARED_PREFIX}${k}`,
    kind: "prepare",
    labelFr: DATA.prepares_par_odysseo._libelles_fr[k] ?? k,
    labelEn: DATA.prepares_par_odysseo._libelles_en[k] ?? k,
    helpFr: null,
    helpEn: null,
    noteFr: null,
    noteEn: null,
    phase: "maintenant",
    required: true,
    formats: ["pdf", "doc", "docx"],
    maxMb: DATA.meta.taille_max_mo,
    sortOrder: 0,
  }));

  return [...ordered, ...prepared].map((d, i) => ({ ...d, sortOrder: (i + 1) * 10 }));
}

/** Statuts. */
export const FILE_STATUSES = ["a_fournir", "recu", "valide", "a_refaire"] as const;
export const PREPARED_STATUSES = ["en_preparation", "a_valider", "valide", "modification_demandee"] as const;

export { passportTooShort, progressOf } from "./rules";
