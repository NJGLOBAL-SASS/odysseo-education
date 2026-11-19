/**
 * Tarifs Odysseo (PACK-12) : SEULE source des prix du rapport d'admissibilité (écran
 * admin, PDF, message WhatsApp, espace étudiant). Données : data/tarifs.json.
 *
 * Module pur, sans secret : utilisable côté serveur comme côté navigateur.
 * Un cursus « sur devis » (sur_devis, prix null) n'affiche aucun prix : texte_rapport à la place.
 * Depuis le 19/11/2026, aucun cursus n'est sur devis (MBBS = tarif Bachelor).
 *
 * Les pages /cursus et les brochures gardent pour l'instant src/lib/programs.ts
 * (mêmes totaux ; échéanciers Langue et Bachelor différents, voir CHANGELOG 0.15.0).
 */
import raw from "../../../data/tarifs.json";

export type CursusKey = "langue" | "bachelor" | "mbbs" | "master" | "phd";

export interface CursusTarif {
  libelle: string;
  prix: number | null;
  versements: number[] | null;
  sur_devis?: boolean;
  texte_rapport?: string;
}

export interface Tarifs {
  meta: { version: string; devise: string; source: string };
  cursus: Record<CursusKey, CursusTarif>;
  etapes_versements: { n: number; libelle: string; regle: string }[];
  inclus: string[];
  non_inclus: string[];
  moyens_paiement: string;
  /** Services en option, en plus du tarif (ex. assistance au test d'anglais). */
  options?: string[];
  validite_rapport_jours: number;
}

export const TARIFS = raw as unknown as Tarifs;

export const CURSUS_KEYS: CursusKey[] = ["langue", "bachelor", "mbbs", "master", "phd"];

/**
 * Cursus facturé enregistré avec le rapport (AdmissionReport.program, slugs historiques
 * du PACK-10 + « mbbs ») → clé de tarifs.json.
 */
export const PROGRAM_TO_CURSUS: Record<string, CursusKey> = {
  "langue-chinoise": "langue",
  bachelor: "bachelor",
  mbbs: "mbbs",
  master: "master",
  doctorat: "phd",
};

/** Niveau du formulaire (Candidate.targetLevel) → cursus facturé pré-rempli. */
export const PROGRAM_BY_LEVEL: Record<string, string> = {
  language: "langue-chinoise",
  licence: "bachelor",
  master: "master",
  doctorat: "doctorat",
};

export function cursusOf(program: string | null | undefined): CursusKey | null {
  return (program && PROGRAM_TO_CURSUS[program]) || null;
}

export function tarifOf(program: string | null | undefined): (CursusTarif & { key: CursusKey }) | null {
  const key = cursusOf(program);
  return key ? { ...TARIFS.cursus[key], key } : null;
}

/** true si le cursus est sur devis (MBBS) : ne jamais afficher de montant. */
export function isSurDevis(program: string | null | undefined) {
  const t = tarifOf(program);
  return Boolean(t && (t.sur_devis || t.prix == null || !t.versements));
}

/** Montant du 1er versement (ouverture du dossier), null si sur devis. */
export function firstInstallment(program: string | null | undefined): number | null {
  const t = tarifOf(program);
  return t && !isSurDevis(program) ? t.versements![0] : null;
}

/** 2 900 000 → « 2 900 000 » (espaces insécables), comme les brochures. */
export function formatFcfa(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
