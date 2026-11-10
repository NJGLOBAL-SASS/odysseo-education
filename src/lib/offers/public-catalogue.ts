/**
 * Catalogue public des offres (PACK-03), CÔTÉ SERVEUR uniquement.
 *
 * Ne sort du serveur que la projection PublicOffer : offres « publiables » seulement,
 * jamais score, potentiel_or, critères ni statut. Le fichier _internes n'est jamais lu.
 */
import "server-only";

import catalogueJson from "../../../data/offres/offres_2027.json";
import englishJson from "../../../data/offres/offres_2027_en.json";
import { translateOfferText } from "../matching/public-offer";
import type { Cycle, Offer, OfferCatalogue } from "../matching/types";
import { FAMILY_LABELS_EN } from "./families";

const catalogue = catalogueJson as unknown as OfferCatalogue;
const EN_TEXTS = (englishJson as { textes: Record<string, string> }).textes;

export type OfferLanguage = "anglais" | "chinois";

/** Champs d'une offre affichés sur le site (pages /offres). */
export interface PublicOffer {
  ref: string;
  /** Segment d'URL en minuscules : « ma-24 ». */
  slug: string;
  cycle: Cycle;
  ville: string;
  lieu_affiche: string;
  rentree: string;
  date_limite: string | null;
  langue: string;
  duree: string | null;
  bourse_texte: string | null;
  allocation_texte: string | null;
  logement_texte: string | null;
  conditions_texte: string | null;
  arguments: string[];
  /** Allocation mensuelle maximale (RMB) : sert uniquement au tri. */
  allocation_max: number;
  familles: string[];
  filieres: { nom: string; langue: OfferLanguage }[];
}

export interface OfferFamily {
  slug: string;
  label: string;
}

export const offerSlug = (ref: string) => ref.toLowerCase();

function translator(locale: string) {
  if (locale !== "en") return (s: string) => s;
  return (s: string) => EN_TEXTS[s] ?? translateOfferText(s);
}

function toPublicOffer(o: Offer, locale: string): PublicOffer {
  const tr = translator(locale);
  const opt = (s: string | null) => (s ? tr(s) : null);
  return {
    ref: o.ref,
    slug: offerSlug(o.ref),
    cycle: o.cycle,
    ville: o.ville,
    lieu_affiche: o.lieu_affiche,
    rentree: o.rentree,
    date_limite: o.date_limite,
    langue: tr(o.langue),
    duree: opt(o.duree),
    bourse_texte: opt(o.bourse_texte),
    allocation_texte: opt(o.allocation_texte),
    logement_texte: opt(o.logement_texte),
    conditions_texte: opt(o.conditions_texte),
    arguments: o.arguments.map(tr),
    allocation_max: o.allocation_max_rmb_mois ?? 0,
    familles: o.familles,
    filieres: o.filieres.map((f) => ({ nom: f.nom, langue: f.langue === "chinois" ? "chinois" : "anglais" })),
  };
}

/** Tri : date limite la plus proche d'abord (sans date à la fin), puis allocation maximale décroissante. */
export function compareOffers(a: Pick<PublicOffer, "date_limite" | "allocation_max" | "ref">, b: typeof a) {
  if (a.date_limite !== b.date_limite) {
    if (!a.date_limite) return 1;
    if (!b.date_limite) return -1;
    return a.date_limite < b.date_limite ? -1 : 1;
  }
  return b.allocation_max - a.allocation_max || a.ref.localeCompare(b.ref);
}

const PUBLISHABLE = catalogue.offres.filter((o) => o.publiable === true);

export function getPublicOffers(locale: string): PublicOffer[] {
  return PUBLISHABLE.map((o) => toPublicOffer(o, locale)).sort(compareOffers);
}

/** Offre publiable par référence ou segment d'URL (insensible à la casse), sinon undefined. */
export function getPublicOffer(refOrSlug: string, locale: string): PublicOffer | undefined {
  const o = PUBLISHABLE.find((x) => x.ref.toLowerCase() === refOrSlug.toLowerCase());
  return o && toPublicOffer(o, locale);
}

export function publicOfferSlugs() {
  return PUBLISHABLE.map((o) => offerSlug(o.ref));
}

/** Les offres dont la date limite est la plus proche (à partir de `today`, AAAA-MM-JJ). */
export function offersClosingSoon(locale: string, count: number, today = new Date().toISOString().slice(0, 10)) {
  return getPublicOffers(locale)
    .filter((o) => o.date_limite && o.date_limite >= today)
    .slice(0, count);
}

/** Domaines présents dans au moins une offre publiable, dans l'ordre du catalogue. */
export function offerFamilies(locale: string): OfferFamily[] {
  const used = new Set(PUBLISHABLE.flatMap((o) => o.familles));
  return catalogue.familles
    .filter((f) => used.has(f.slug))
    .map((f) => ({ slug: f.slug, label: locale === "en" ? FAMILY_LABELS_EN[f.slug] ?? f.libelle_fr : f.libelle_fr }));
}

export const CATALOGUE_NOTE = catalogue.meta.note ?? "";

/** Champs d'une carte (liste et accueil) : sans les filières détaillées ni les textes longs. */
export function toOfferCard(o: PublicOffer) {
  return {
    ref: o.ref,
    slug: o.slug,
    cycle: o.cycle,
    ville: o.ville,
    lieu_affiche: o.lieu_affiche,
    date_limite: o.date_limite,
    arguments: o.arguments.slice(0, 2),
    majorsCount: o.filieres.length,
    familles: o.familles,
  };
}
