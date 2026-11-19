/**
 * PACK-13 §3.1 : pré-filtre par le code, avant l'analyse IA. Seules les offres qui passent
 * TOUS les filtres sont transmises (champs publics uniquement, voir publicOfferForAI). Module pur.
 */
import type { Cycle, Offer } from "@/lib/matching/types";

export const EXCLUDED_STATUSES = ["expiree", "quota_atteint", "non_eligible_afrique"];
/** Domaines « sciences / ingénierie » proposés en réorientation d'un projet MBBS. */
const SCIENCE_FAMILIES = ["ingenierie", "informatique", "sciences", "sante", "chimie", "biologie", "physique"];

export interface PrefilterProfile {
  /** Cycle visé : langue | bachelor | mbbs | master | phd. */
  cycle: Cycle;
  /** Âge à la rentrée (années). */
  age: number | null;
  /** Familles de domaines souhaitées (codes du formulaire). Vide : pas de filtre de filière. */
  familles: string[];
  /** Mots-clés libres de la filière souhaitée (secours si les familles ne matchent pas). */
  motsCles: string[];
}

const dayOf = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function deadlineOk(o: Offer, today: Date) {
  if (!o.date_limite || !/^\d{4}-\d{2}-\d{2}/.test(o.date_limite)) return true; // « à confirmer » incluse
  return dayOf(o.date_limite) >= Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
}

function ageOk(o: Offer, age: number | null) {
  if (age == null) return true;
  const { age_min, age_max } = o.criteres ?? {};
  if (typeof age_max === "number" && age > age_max) return false;
  if (typeof age_min === "number" && age < age_min) return false; // borne basse inconnue : non renseignée
  return true;
}

function fieldOk(o: Offer, p: PrefilterProfile) {
  if (o.cycle === "langue" || o.cycle === "mbbs") return true;
  if (p.familles.length === 0 && p.motsCles.length === 0) return true;
  if (o.familles?.some((f) => p.familles.includes(f))) return true;
  const text = norm([o.nom_public, ...(o.filieres ?? []).map((f) => f.nom), ...(o.arguments ?? [])].join(" "));
  return p.motsCles.some((k) => k.length >= 4 && text.includes(norm(k)));
}

/** Offres candidates. `mbbs` : MB-xx + L-xx (plan mars → septembre) + B-xx sciences / ingénierie. */
export function prefilterOffers(offers: Offer[], p: PrefilterProfile, today = new Date()) {
  const base = offers.filter((o) => !EXCLUDED_STATUSES.includes(o.statut) && deadlineOk(o, today) && ageOk(o, p.age));
  if (p.cycle === "mbbs") {
    return base.filter(
      (o) => o.cycle === "mbbs" || o.cycle === "langue" || (o.cycle === "bachelor" && o.familles?.some((f) => SCIENCE_FAMILIES.includes(f))),
    );
  }
  return base.filter((o) => o.cycle === p.cycle && fieldOk(o, p));
}

/** Moins de 3 offres : on envoie quand même, avec l'alerte interne « peu d'offres compatibles ». */
export const fewOffers = (list: unknown[]) => list.length < 3;

/** Champs publics envoyés à l'IA : jamais le nom réel, le partenaire, le score ni les notes internes. */
export function publicOfferForAI(o: Offer) {
  return {
    ref: o.ref,
    cycle: o.cycle,
    universite: `Université *** · ${o.lieu_affiche}`,
    rentree: o.rentree,
    date_limite: o.date_limite,
    langue: o.langue,
    duree: o.duree,
    bourse: o.bourse_texte,
    allocation: o.allocation_texte,
    logement: o.logement_texte,
    conditions: o.conditions_texte,
    arguments: o.arguments,
    filieres: (o.filieres ?? []).map((f) => f.nom),
    cout_annuel_rmb: o.cout_annuel_rmb ?? null,
    frais_langue_rmb: o.frais_langue_rmb ?? null,
    // Niveau interne (OR / ARGENT / BRONZE) : sert aux règles de choix, jamais montré à l'étudiant.
    score: o.score.toUpperCase(),
  };
}
