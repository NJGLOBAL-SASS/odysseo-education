import crypto from "node:crypto";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure
/** Une invitation laisse plus de temps au nouveau membre pour activer son compte. */
export const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
/** Délai minimal entre deux demandes pour un même compte (anti-spam). */
export const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;

export function generateResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Règle commune de robustesse : 8 caractères minimum, au moins une lettre et un chiffre. */
export function passwordProblem(password: string) {
  if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  }
  return null;
}

/**
 * Crée un lien à usage unique pour (re)définir le mot de passe d'un membre.
 * Un seul lien valide à la fois : les précédents non utilisés sont invalidés.
 * Retourne le jeton en clair (à mettre dans l'email) ; seule son empreinte est stockée.
 */
export async function createPasswordToken(userId: string, ttlMs: number) {
  const token = generateResetToken();
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + ttlMs) },
    }),
  ]);
  return token;
}

/**
 * Domaine des liens envoyés par email. On ne fait jamais confiance à l'en-tête
 * Host tel quel (sinon un attaquant pourrait faire envoyer à une victime un lien
 * vers son propre domaine) : seuls le sous-domaine équipe et NEXTAUTH_URL sont acceptés.
 */
export function trustedTeamOrigin(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
  const allowed = new Map<string, string>();
  if (process.env.TEAM_HOSTNAME) {
    allowed.set(process.env.TEAM_HOSTNAME.toLowerCase(), `https://${process.env.TEAM_HOSTNAME}`);
  }
  if (process.env.NEXTAUTH_URL) {
    const u = new URL(process.env.NEXTAUTH_URL);
    allowed.set(u.host.toLowerCase(), u.origin);
  }
  if (process.env.NODE_ENV !== "production" && /^(team\.)?localhost(:\d+)?$/.test(host)) {
    allowed.set(host, `http://${host}`);
  }
  const fallback = process.env.TEAM_HOSTNAME
    ? `https://${process.env.TEAM_HOSTNAME}`
    : (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
  return allowed.get(host) ?? fallback;
}
