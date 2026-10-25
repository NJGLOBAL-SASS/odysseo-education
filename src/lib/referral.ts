/**
 * Liens de parrainage. Un partenaire reçoit à sa création un code unique
 * (ex. AUDY-012) et un lien court /r/AUDY-012 : c'est ce lien qui attribue
 * automatiquement le candidat au partenaire, sans rien taper.
 *
 * Ce module ne dépend que de variables NEXT_PUBLIC_* : utilisable côté client et serveur.
 */

/** Cookie posé par /r/CODE, relu à la soumission si le navigateur a perdu le sessionStorage. */
export const REFERRAL_COOKIE = "odysseo_ref";
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

/** URL du site public : les liens doivent y pointer, jamais vers team.odysseo-education.com. */
export function publicSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://odysseo-education.com").replace(/\/+$/, "");
}

export function referralLink(code: string) {
  return `${publicSiteUrl()}/r/${encodeURIComponent(code)}`;
}

/** Les aperçus de lien (WhatsApp, Facebook, Telegram...) ne doivent pas compter comme des clics. */
export function isLinkPreviewBot(userAgent: string | null) {
  if (!userAgent) return true;
  return /bot|crawler|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|twitter|linkedin|skype/i.test(
    userAgent
  );
}

/** "Audrey Kamga" -> "Audrey K." : assez pour rassurer le candidat, sans exposer le nom complet. */
export function shortPartnerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
