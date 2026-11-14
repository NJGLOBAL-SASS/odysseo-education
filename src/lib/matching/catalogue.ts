/**
 * Catalogue d'offres et calcul des recommandations, CÔTÉ SERVEUR uniquement (PACK-02).
 * Le JSON contient les scores et les critères internes : il ne doit jamais être
 * importé par un composant client. Seul toPublicRecommendation() sort du serveur.
 */
import "server-only";

import catalogueJson from "../../../data/offres/offres_2027.json";
import { profilDepuisCandidature, profilMarsDepuisCandidature, type CandidateForMatching } from "./profil";
import { toPublicRecommendation } from "./public-offer";
import { recommander } from "./recommander";
import { recommanderMars } from "./recommanderMars";
import type { Offer, OfferCatalogue, PublicRecommendation, StoredRecommendation } from "./types";

const catalogue = catalogueJson as unknown as OfferCatalogue;

/** Version du catalogue enregistrée avec le dossier (meta.version). */
export const MOTEUR_VERSION = catalogue.meta.version;
export const CATALOGUE_VERSION = catalogue.meta.version;

const byRef = new Map<string, Offer>(catalogue.offres.map((o) => [o.ref, o]));

export function getOffer(ref: string) {
  return byRef.get(ref);
}

/** Toutes les offres du catalogue (équipe : choix des offres du rapport, PACK-10). */
export function listOffers() {
  return catalogue.offres;
}

export interface MatchingResult {
  /** Moteur utilisé : PACK-02 (master / phd), PACK-12 (langue / licence) ; null si aucun. */
  cycle: "master" | "phd" | "langue" | "licence" | null;
  stored: StoredRecommendation[];
  offers: PublicRecommendation[];
  /** PACK-12 : Bachelor proposé en plus à un profil Langue qui a le bac. */
  proposerBachelor?: string | null;
  /** PACK-12 : Licence impossible, offres de langue proposées à la place. */
  repliLangue?: boolean;
}

/** Version du moteur enregistrée avec le brouillon de rapport. */
export function moteurVersionFor(cycle: MatchingResult["cycle"]) {
  return cycle === "langue" || cycle === "licence" ? "mars-2027.1" : "pack02-1";
}

/**
 * Recommandations d'un dossier. Ne lève jamais (en cas d'erreur : aucune offre).
 * `today` : date du jour (paramètre pour les tests et le recalcul d'un rapport).
 */
export function recommendForCandidate(c: CandidateForMatching, locale = "fr", today: Date = new Date()): MatchingResult {
  const mars = profilMarsDepuisCandidature(c);
  if (mars) {
    try {
      const r = recommanderMars(mars, catalogue.offres, today);
      return {
        cycle: mars.cycle_vise,
        stored: r.recommandations,
        offers: r.recommandations.map((x) =>
          toPublicRecommendation(byRef.get(x.ref)!, { ref: x.ref, role: x.role, ville: byRef.get(x.ref)!.ville, total: 0, filieres_correspondantes: [] }, locale),
        ),
        proposerBachelor: r.proposer_bachelor,
        repliLangue: r.repli_langue,
      };
    } catch (err) {
      console.error("[matching] échec (mars) :", err);
      return { cycle: mars.cycle_vise, stored: [], offers: [] };
    }
  }
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
