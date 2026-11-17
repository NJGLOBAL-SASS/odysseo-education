/**
 * ODY-14 — Kits partenaires : variables du texte modèle, liens, message WhatsApp,
 * numéros, position du badge (QR + code) sur le flyer. Fonctions pures, testées.
 */
import { z } from "zod";

export const QR_POSITIONS = ["bas-droite", "bas-gauche", "bas-centre", "haut-droite"] as const;
export type QrPosition = (typeof QR_POSITIONS)[number];

export const KIT_STATUSES = ["brouillon", "pret", "archive"] as const;
export type KitStatus = (typeof KIT_STATUSES)[number];

/** Au-delà, un lien wa.me peut échouer sur certains téléphones : avertissement à la création. */
export const WA_URL_WARN_LENGTH = 2000;

export const FLYER_TYPES = ["image/jpeg", "image/png"];
export const FLYER_MAX_MB = 10;

export const kitSchema = z.object({
  title: z.string().trim().min(3).max(120),
  template: z.string().trim().min(10).max(3000),
  qrPosition: z.enum(QR_POSITIONS),
  status: z.enum(["brouillon", "pret"]),
});

/** Slug lisible depuis le titre : « Une université par jour #3 » → « une-universite-par-jour-3 ». */
export function slugify(title: string) {
  return (
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "kit"
  );
}

/** Prénom affiché : premier mot du nom complet (sinon le nom). */
export function partnerFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName.trim();
}

/** Lien de parrainage tracé par kit : /r/{CODE}?src=kit-{slug}. */
export function kitReferralLink(siteUrl: string, code: string, slug: string) {
  return `${siteUrl}/r/${encodeURIComponent(code)}?src=${encodeURIComponent(`kit-${slug}`)}`;
}

/** Page publique du kit du partenaire (sans connexion). */
export function kitPageUrl(siteUrl: string, slug: string, code: string) {
  return `${siteUrl}/fr/kit/${encodeURIComponent(slug)}/${encodeURIComponent(code)}`;
}

/** Texte modèle avec les variables remplacées. */
export function renderTemplate(template: string, v: { firstName: string; link: string; code: string }) {
  return template.replaceAll("{PRENOM}", v.firstName).replaceAll("{LIEN}", v.link).replaceAll("{CODE}", v.code);
}

/** Message WhatsApp complet envoyé au partenaire (spec ODY-14 §4). */
export function whatsappMessage(v: { firstName: string; kitUrl: string; text: string }) {
  return [
    `Salut ${v.firstName} 👋 Nouveau kit Odysseo prêt à poster !`,
    "",
    `📥 Ton visuel (avec ton QR code) : ${v.kitUrl}`,
    "",
    "📝 Texte à copier-coller avec ton image :",
    "———",
    v.text,
    "———",
    "Merci de garder le lien tel quel, c'est lui qui t'attribue tes étudiants 🙏",
  ].join("\n");
}

/** Numéro WhatsApp international sans « + », espaces ni « 00 » initial ; null si invalide. */
export function normalizeWhatsapp(raw: string | null | undefined) {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function waLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Badge (QR + « Code : XXX ») : 18 % de la largeur du flyer (220 px minimum, sans dépasser
 * le flyer), marge de 3 % de la largeur, placé selon la position choisie.
 */
export function badgeLayout(width: number, height: number, position: QrPosition) {
  const badgeW = Math.min(Math.max(Math.round(width * 0.18), 220), Math.round(width * 0.9));
  const badgeH = Math.round(badgeW * 1.22); // carré du QR + bandeau du code
  const margin = Math.round(width * 0.03);
  const left =
    position === "bas-gauche" ? margin : position === "bas-centre" ? Math.round((width - badgeW) / 2) : width - badgeW - margin;
  const top = position === "haut-droite" ? margin : height - badgeH - margin;
  return { left: Math.max(0, left), top: Math.max(0, top), width: badgeW, height: badgeH };
}
