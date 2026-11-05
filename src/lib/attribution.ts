/**
 * Attribution « premier contact » (PACK-04) : d'où vient le visiteur
 * (publicité, campagne, référence d'offre, partenaire).
 *
 * Lue dans l'URL à la première visite et gardée dans localStorage
 * (odysseo_attribution) 30 jours — sauf si l'URL apporte une nouvelle
 * campagne (utm_campaign). Jointe à l'envoi du formulaire. Aucune donnée personnelle.
 *
 * Utilisable côté client et serveur (aucune dépendance navigateur hors des fonctions *Client*).
 */
import { z } from "zod";

export const ATTRIBUTION_STORAGE_KEY = "odysseo_attribution";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const str = z.string().trim().max(200).optional();

export const attributionSchema = z.object({
  utm_source: str,
  utm_medium: str,
  utm_campaign: str,
  utm_content: str,
  fbclid: z.string().trim().max(500).optional(),
  /** Valeur brute de ?ref= : code d'offre (P-04) ou code partenaire (AUDY-012). */
  ref: str,
  /** Code partenaire (?partenaire= / ?src=). */
  partner: str,
  landingPage: z.string().max(500).optional(),
  firstVisitAt: z.string().max(40).optional(),
});

export type Attribution = z.infer<typeof attributionSchema>;

const URL_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid", "ref"] as const;

function readStored(): Attribution | null {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = attributionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** À appeler à chaque chargement de page : enregistre l'origine si l'URL en contient une. */
export function captureAttributionClient() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const fromUrl: Attribution = {};
  for (const key of URL_KEYS) {
    const v = params.get(key)?.trim();
    if (v) fromUrl[key] = v.slice(0, key === "fbclid" ? 500 : 200);
  }
  const partner = (params.get("partenaire") || params.get("src") || "").trim();
  if (partner) fromUrl.partner = partner.slice(0, 200);
  if (Object.keys(fromUrl).length === 0) return;

  const existing = readStored();
  const age = existing?.firstVisitAt ? Date.now() - new Date(existing.firstVisitAt).getTime() : Infinity;
  const newCampaign = Boolean(fromUrl.utm_campaign) && fromUrl.utm_campaign !== existing?.utm_campaign;
  if (existing && age < MAX_AGE_MS && !newCampaign) return;

  const value: Attribution = {
    ...fromUrl,
    landingPage: window.location.pathname.slice(0, 500),
    firstVisitAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Navigation privée / stockage bloqué : l'attribution est simplement perdue.
  }
}

/** Attribution à joindre à l'envoi du formulaire (null si aucune ou expirée). */
export function getAttributionClient(): Attribution | null {
  if (typeof window === "undefined") return null;
  const stored = readStored();
  if (!stored) return null;
  const age = stored.firstVisitAt ? Date.now() - new Date(stored.firstVisitAt).getTime() : 0;
  return age < MAX_AGE_MS ? stored : null;
}

/**
 * Codes d'offre des publicités : « P-04 », « MA-07 » (1 à 3 lettres, tiret, 2 chiffres).
 * Les codes partenaires (« AUDY-012 ») ont toujours 3 chiffres : pas de confusion possible.
 */
export function looksLikeOfferRef(value?: string | null): value is string {
  return Boolean(value && /^[A-Z]{1,3}-\d{2}$/i.test(value.trim()));
}
