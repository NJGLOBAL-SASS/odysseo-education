/**
 * Preuves et confiance (PACK-06) : témoignages, documents d'exemple, conseillers.
 *
 * Pilotés par content/temoignages.json, content/preuves.json et content/conseillers.json
 * (mode d'emploi : content/README.md). Règle : rien de faux ne s'affiche jamais.
 * - une entrée n'apparaît que si "publie": true (témoignages, documents) ;
 * - une liste vide (ou sans entrée publiée) = section non rendue ;
 * - l'université n'est jamais nommée (seulement le cursus et la ville).
 */
import temoignagesJson from "../../../content/temoignages.json";
import preuvesJson from "../../../content/preuves.json";
import conseillersJson from "../../../content/conseillers.json";

import type { Locale, ProgramSlug } from "@/lib/programs";

export const QUOTE_MAX_LENGTH = 300;

export type Testimonial = {
  id: string;
  prenom: string;
  initiale_nom: string;
  pays: string;
  drapeau?: string;
  cursus: ProgramSlug;
  ville_chine: string;
  annee_depart?: number;
  citation_fr: string;
  citation_en?: string | null;
  photo: string;
  video_url?: string | null;
  accord_signe_le: string;
  publie: boolean;
};

export type ProofDocument = {
  id: string;
  type: "admission_notice" | "jw202" | "visa_x1" | string;
  image: string;
  legende_fr: string;
  legende_en?: string | null;
  accord_signe_le: string;
  publie: boolean;
};

export type Advisor = {
  prenom: string;
  role_fr: string;
  role_en?: string | null;
  photo?: string | null;
  langues?: string[];
  /** Format international sans « + » (ex. 2376XXXXXXXX). */
  whatsapp?: string | null;
};

const RAW_TESTIMONIALS = (temoignagesJson as { temoignages: Testimonial[] }).temoignages;
const RAW_PROOFS = (preuvesJson as { preuves: ProofDocument[] }).preuves;
const RAW_ADVISORS = (conseillersJson as { conseillers: Advisor[] }).conseillers;

/** Une date d'accord AAAA-MM-JJ réelle (pas le « AAAA-MM-JJ » du modèle). */
const hasConsent = (date?: string) => Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date));

/** Vidéo : seulement des liens YouTube / TikTok (ouverts dans un nouvel onglet). */
export function isAllowedVideoUrl(url?: string | null): url is string {
  return Boolean(url && /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|tiktok\.com|vm\.tiktok\.com)\//.test(url));
}

export function getTestimonials(cursus?: ProgramSlug): Testimonial[] {
  return RAW_TESTIMONIALS.filter(
    (t) =>
      t.publie === true &&
      hasConsent(t.accord_signe_le) &&
      Boolean(t.prenom && t.photo && t.citation_fr) &&
      (!cursus || t.cursus === cursus),
  );
}

/** Citation dans la langue de la page (FR par défaut), limitée à 300 caractères. */
export function testimonialQuote(t: Testimonial, locale: Locale) {
  const text = (locale === "en" && t.citation_en) || t.citation_fr;
  return text.length > QUOTE_MAX_LENGTH ? `${text.slice(0, QUOTE_MAX_LENGTH - 1).trimEnd()}…` : text;
}

export function getProofDocuments(): ProofDocument[] {
  return RAW_PROOFS.filter((p) => p.publie === true && hasConsent(p.accord_signe_le) && Boolean(p.image)).slice(0, 3);
}

export function proofCaption(p: ProofDocument, locale: Locale) {
  return (locale === "en" && p.legende_en) || p.legende_fr;
}

export function getAdvisors(): Advisor[] {
  return RAW_ADVISORS.filter((a) => Boolean(a.prenom && a.role_fr));
}

export function advisorRole(a: Advisor, locale: Locale) {
  return (locale === "en" && a.role_en) || a.role_fr;
}

/** Numéro du bouton WhatsApp flottant : premier conseiller, sinon NEXT_PUBLIC_WHATSAPP_NUMBER. */
export function floatingWhatsappNumber() {
  const fromAdvisor = getAdvisors().find((a) => a.whatsapp)?.whatsapp;
  return (fromAdvisor || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");
}

/** Toutes les images référencées par des entrées publiées (vérifiées par le test). */
export function publishedImagePaths() {
  return [
    ...getTestimonials().map((t) => t.photo),
    ...getProofDocuments().map((p) => p.image),
    ...getAdvisors().flatMap((a) => (a.photo ? [a.photo] : [])),
  ];
}
