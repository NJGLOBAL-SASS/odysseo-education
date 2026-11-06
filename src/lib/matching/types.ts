/**
 * Types du catalogue d'offres (data/offres/offres_2027.json) et du profil de
 * correspondance (PACK-02). Les noms suivent le JSON et matching_reference.py.
 */

export type Cycle = "master" | "phd";
export type OfferScore = "or" | "argent" | "bronze";
export type Role = "ambitieuse" | "cible" | "securite";

export interface OfferCriteria {
  age_min?: number;
  age_max?: number;
  moyenne_min_pct?: number;
  nationalites_exclues?: string[];
  diplomes_originaux?: boolean;
  eligibilite_omm_requise?: boolean;
  hsk_min?: number;
  anglais_ou_hsk_min?: number;
  releve_bancaire_usd?: number;
  ielts_min?: number;
  toefl_min?: number;
  duolingo_min?: number;
  certificat_anglais_obligatoire?: boolean;
}

export interface OfferMajor {
  nom: string;
  famille: string;
  langue: string;
}

export interface Offer {
  ref: string;
  cycle: Cycle;
  ville: string;
  province: string;
  nom_public: string;
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
  allocation_min_rmb_mois: number;
  allocation_max_rmb_mois: number;
  logement_resume: string | null;
  scolarite_offerte_garantie: boolean;
  /** Interne : jamais renvoyé au client. */
  score: OfferScore;
  potentiel_or: boolean;
  familles: string[];
  filieres: OfferMajor[];
  /** Interne : jamais renvoyé au client. */
  criteres: OfferCriteria;
  /** Interne : jamais renvoyé au client. */
  statut: string;
  publiable: boolean;
}

export interface OfferCatalogue {
  meta: { version: string; mise_a_jour?: string; source?: string; devise?: string; note?: string };
  familles: { slug: string; libelle_fr: string }[];
  offres: Offer[];
}

export type EnglishProfile =
  | { type: "ielts" | "toefl" | "duolingo"; score: number }
  | { type: "etudes_en_anglais" }
  | { type: "aucun" };

export interface MatchingProfile {
  cycle: Cycle;
  domaines: string[];
  filiere_libre?: string | null;
  age?: number | null;
  moyenne_pct?: number | null;
  anglais?: EnglishProfile;
  hsk?: number | null;
  releve_bancaire_usd_max?: number | null;
  diplomes_originaux?: boolean | null;
  nationalite?: string | null;
  financement?: "bourse_uniquement" | "partiel" | "total" | null;
  eligible_omm?: boolean;
}

export interface Recommendation {
  ref: string;
  role: Role;
  ville: string;
  total: number;
  filieres_correspondantes: string[];
}

/** Champs d'une offre recommandée renvoyés au navigateur (aucun score, critère ni statut). */
export interface PublicRecommendation {
  ref: string;
  role: Role;
  cycle: Cycle;
  lieu_affiche: string;
  arguments: string[];
  langue: string;
  duree: string | null;
  date_limite: string | null;
  filieres_correspondantes: string[];
}

/** Ce qui est enregistré avec le dossier. */
export interface StoredRecommendation {
  ref: string;
  role: Role;
}
