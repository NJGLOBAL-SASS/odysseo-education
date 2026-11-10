/**
 * Catalogue d'offres et calcul des recommandations, CÔTÉ SERVEUR uniquement (PACK-02).
 * Le JSON contient les scores et les critères internes : il ne doit jamais être
 * importé par un composant client. Seul toPublicRecommendation() sort du serveur.
 */
import "server-only";

import catalogueJson from "../../../data/offres/offres_2027.json";
import { profilDepuisCandidature, type CandidateForMatching } from "./profil";
import { toPublicRecommendation } from "./public-offer";
import { recommander } from "./recommander";
import type { Offer, OfferCatalogue, PublicRecommendation, StoredRecommendation } from "./types";

const catalogue = catalogueJson as unknown as OfferCatalogue;

/** Version du moteur enregistrée avec le dossier : celle du catalogue (meta.version). */
export const MOTEUR_VERSION = catalogue.meta.version;

const byRef = new Map<string, Offer>(catalogue.offres.map((o) => [o.ref, o]));

export function getOffer(ref: string) {
  return byRef.get(ref);
}

/** Toutes les offres du catalogue (équipe : choix des offres du rapport, PACK-10). */
export function listOffers() {
  return catalogue.offres;
}

export interface MatchingResult {
  /** null : niveau Langue / Licence, pas de recommandation automatique. */
  cycle: "master" | "phd" | null;
  stored: StoredRecommendation[];
  offers: PublicRecommendation[];
}

/** Recommandations d'un dossier. Ne lève jamais (en cas d'erreur : aucune offre). */
export function recommendForCandidate(c: CandidateForMatching, locale = "fr"): MatchingResult {
  const profil = profilDepuisCandidature(c);
  if (!profil) return { cycle: null, stored: [], offers: [] };
  try {
    const recos = recommander(catalogue.offres, profil);
    return {
      cycle: profil.cycle,
      stored: recos.map(({ ref, role }) => ({ ref, role })),
      offers: recos.map((r) => toPublicRecommendation(byRef.get(r.ref)!, r, locale)),
    };
  } catch (err) {
    console.error("[matching] échec :", err);
    return { cycle: profil.cycle, stored: [], offers: [] };
  }
}
