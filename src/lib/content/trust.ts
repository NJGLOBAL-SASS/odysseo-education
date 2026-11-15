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
import chiffresJson from "../../../content/chiffres.json";
import universitesJson from "../../../content/universites.json";
import photosSiteJson from "../../../content/photos-site.json";
import videosJson from "../../../content/videos.json";

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
  /** Vidéo hébergée par Odysseo (MP4) : chemin dans public/videos/ ou URL Vercel Blob. Lue directement sur la page. */
  video_fichier?: string | null;
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

export type Stat = {
  id: string;
  valeur: number | null;
  suffixe?: string;
  libelle_fr: string;
  libelle_en?: string | null;
  detail_fr?: string | null;
  detail_en?: string | null;
};
const RAW_STATS = (chiffresJson as { chiffres: Stat[] }).chiffres;

export type UniversityLogo = {
  id: string;
  nom_en: string;
  nom_zh?: string | null;
  logo: string;
  publie: boolean;
  /** Photo de campus sous licence libre (Wikimedia Commons), créditée sur /credits-photos. */
  photo?: string | null;
  photo_auteur?: string | null;
  photo_licence?: string | null;
  photo_licence_url?: string | null;
  photo_source?: string | null;
  /** Faits vérifiables (Wikidata), pour la page /universites/[id]. */
  qid?: string | null;
  ville_fr?: string | null;
  ville_en?: string | null;
  province_fr?: string | null;
  province_en?: string | null;
  creation?: number | null;
  prive?: boolean;
  double_first_class?: boolean;
  ministere?: boolean;
  domaine?: string | null;
};
const RAW_UNIVERSITIES = (universitesJson as { universites: UniversityLogo[] }).universites;

/** Une date d'accord AAAA-MM-JJ réelle (pas le « AAAA-MM-JJ » du modèle). */
const hasConsent = (date?: string) => Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date));

/** Vidéo : seulement des liens YouTube / TikTok (ouverts dans un nouvel onglet). */
export function isAllowedVideoUrl(url?: string | null): url is string {
  return Boolean(url && /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|tiktok\.com|vm\.tiktok\.com)\//.test(url));
}

/** Vidéo hébergée par Odysseo : fichier MP4 dans public/videos/ ou sur Vercel Blob. */
export function isAllowedVideoFile(src?: string | null): src is string {
  return Boolean(src && /^(\/videos\/[\w./-]+|https:\/\/[\w-]+\.public\.blob\.vercel-storage\.com\/[\w./%-]+)\.mp4$/i.test(src));
}

/**
 * Lecteur intégré pour un lien YouTube ou TikTok (null si le lien ne donne pas
 * l'identifiant de la vidéo, ex. lien court vm.tiktok.com : on ouvre alors le lien).
 */
export function videoEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&playsinline=1&rel=0`;
  const tt = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
  if (tt) return `https://www.tiktok.com/player/v1/${tt[1]}?autoplay=1&rel=0`;
  return null;
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

/** Témoignages vidéo (accueil) : publiés, avec accord, une photo (affiche) et une vidéo lisible. */
export function getVideoTestimonials(): Testimonial[] {
  return RAW_TESTIMONIALS.filter(
    (t) =>
      t.publie === true &&
      hasConsent(t.accord_signe_le) &&
      Boolean(t.prenom && t.photo) &&
      (isAllowedVideoFile(t.video_fichier) || isAllowedVideoUrl(t.video_url)),
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

/** Mur des admissions (accueil) : toutes les lettres d'admission publiées, sans limite. */
export function getAdmissionLetters(): ProofDocument[] {
  return RAW_PROOFS.filter(
    (p) => p.publie === true && hasConsent(p.accord_signe_le) && Boolean(p.image) && p.type === "admission_notice",
  );
}

/** Chiffres de l'accueil : seulement ceux qui ont une valeur réelle. */
export function getStats(): Stat[] {
  return RAW_STATS.filter((s) => typeof s.valeur === "number" && Number.isFinite(s.valeur) && s.valeur > 0);
}

export function statLabel(s: Stat, locale: Locale) {
  return (locale === "en" && s.libelle_en) || s.libelle_fr;
}

export function statDetail(s: Stat, locale: Locale) {
  return (locale === "en" && s.detail_en) || s.detail_fr || null;
}

/** Une photo de campus ne s'affiche que si sa licence et sa source sont connues (obligation de crédit). */
export function hasCreditedPhoto(u: UniversityLogo): u is UniversityLogo & { photo: string; photo_licence: string; photo_source: string } {
  return Boolean(u.photo && u.photo_licence && u.photo_source);
}

/** Logos du bandeau de l'accueil (publiés seulement). */
export function getUniversityLogos(): UniversityLogo[] {
  return RAW_UNIVERSITIES.filter((u) => u.publie === true && Boolean(u.logo && u.nom_en));
}

export type SitePhoto = {
  id: string;
  image: string;
  legende_fr: string;
  legende_en?: string | null;
  auteur?: string | null;
  licence: string;
  licence_url?: string | null;
  source: string;
};
const RAW_SITE_PHOTOS = (photosSiteJson as { photos: SitePhoto[] }).photos;

/** Photos du site (bannière, cursus) : uniquement celles dont la licence et la source sont connues. */
export function getSitePhotos(): SitePhoto[] {
  return RAW_SITE_PHOTOS.filter((p) => Boolean(p.image && p.licence && p.source));
}

export function getSitePhoto(id: string): SitePhoto | undefined {
  return getSitePhotos().find((p) => p.id === id);
}

export type CampusVideo = { id: string; universite: string; youtube: string; titre_fr: string; titre_en?: string | null; chaine: string };
const RAW_VIDEOS = (videosJson as { videos: CampusVideo[] }).videos;

/** Vidéos officielles des universités : identifiant YouTube valide et université publiée. */
export function getCampusVideos(): (CampusVideo & { university: UniversityLogo })[] {
  return RAW_VIDEOS.flatMap((v) => {
    const university = getUniversity(v.universite);
    return /^[\w-]{11}$/.test(v.youtube) && university ? [{ ...v, university }] : [];
  });
}

export function getUniversity(id: string): UniversityLogo | undefined {
  return getUniversityLogos().find((u) => u.id === id);
}

export function universityPlace(u: UniversityLogo, locale: Locale) {
  const city = (locale === "en" ? u.ville_en : u.ville_fr) || u.ville_en || u.ville_fr || "";
  const prov = (locale === "en" ? u.province_en : u.province_fr) || u.province_en || "";
  return { city, province: prov && prov !== city ? prov : "" };
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
    ...getAdmissionLetters().map((p) => p.image),
    ...getUniversityLogos().map((u) => u.logo),
    ...getUniversityLogos().flatMap((u) => (hasCreditedPhoto(u) ? [u.photo] : [])),
    ...getAdvisors().flatMap((a) => (a.photo ? [a.photo] : [])),
  ];
}
