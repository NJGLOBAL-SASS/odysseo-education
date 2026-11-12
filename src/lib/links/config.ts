/**
 * Page /liens (lien unique des bios TikTok et Facebook) — v0.14.0.
 * Partagé entre la page (client) et l'API : aucune dépendance serveur.
 */
export const LINK_BUTTONS = ["analyse", "chaine", "groupe", "conseiller", "partenaire"] as const;
export type LinkButton = (typeof LINK_BUTTONS)[number];

export const LINK_SOURCES = ["tiktok", "facebook", "whatsapp", "autre", "direct"] as const;
export type LinkSource = (typeof LINK_SOURCES)[number];

export function isLinkButton(value: unknown): value is LinkButton {
  return typeof value === "string" && (LINK_BUTTONS as readonly string[]).includes(value);
}

/** `?src=` : absent → « direct », valeur inconnue → « autre ». */
export function normalizeLinkSource(value: string | null | undefined): LinkSource {
  const v = (value ?? "").trim().toLowerCase();
  if (!v) return "direct";
  return (LINK_SOURCES as readonly string[]).includes(v) ? (v as LinkSource) : "autre";
}
