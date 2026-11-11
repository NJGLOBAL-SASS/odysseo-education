/**
 * Espace partenaire : connexion par code à usage unique envoyé à l'e-mail du partenaire, puis
 * session de 90 jours (cookie httpOnly signé). Le code de parrainage seul ne donne plus accès :
 * il est public (il figure dans le lien partagé aux étudiants).
 *
 * Aucune table dédiée : le défi (empreinte du code + partenaire + expiration) est un jeton signé
 * posé en cookie httpOnly ; les essais sont comptés en base par `allowAttempt`.
 */
import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { prisma } from "@/lib/prisma";

export const PARTNER_SESSION_COOKIE = "odysseo_partner";
export const PARTNER_CHALLENGE_COOKIE = "odysseo_partner_otp";
const SESSION_DAYS = 90;
export const CODE_MINUTES = 10;

function secretKey(scope: string) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET manquant.");
  // Clé dérivée : ces jetons ne peuvent servir ni à l'équipe, ni à l'espace étudiant.
  return createHash("sha256").update(`odysseo-partner-space:${scope}:${secret}`).digest();
}

const baseCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const codeHash = (partnerId: string, code: string) => createHash("sha256").update(`${partnerId}:${code}:${process.env.AUTH_SECRET ?? ""}`).digest("hex");

/** Nouveau code à 6 chiffres ; le défi signé est posé en cookie (10 minutes). */
export async function startChallenge(partnerId: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const token = await new SignJWT({ h: codeHash(partnerId, code) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(partnerId)
    .setIssuedAt()
    .setExpirationTime(`${CODE_MINUTES}m`)
    .setAudience("odysseo-partner-otp")
    .sign(secretKey("otp"));
  cookies().set(PARTNER_CHALLENGE_COOKIE, token, { ...baseCookie, maxAge: CODE_MINUTES * 60 });
  return code;
}

/** Partenaire du défi en cours (ou null si absent / expiré). */
export async function challengePartnerId() {
  const token = cookies().get(PARTNER_CHALLENGE_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey("otp"), { audience: "odysseo-partner-otp" });
    return payload.sub ? { partnerId: payload.sub, hash: String(payload.h ?? "") } : null;
  } catch {
    return null;
  }
}

export function codeMatches(partnerId: string, expectedHash: string, code: string) {
  const a = Buffer.from(codeHash(partnerId, code.trim()));
  const b = Buffer.from(expectedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startPartnerSession(partnerId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(partnerId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .setAudience("odysseo-partner")
    .sign(secretKey("session"));
  cookies().set(PARTNER_SESSION_COOKIE, token, { ...baseCookie, maxAge: SESSION_DAYS * 24 * 3600 });
  cookies().set(PARTNER_CHALLENGE_COOKIE, "", { ...baseCookie, maxAge: 0 });
}

export function endPartnerSession() {
  cookies().set(PARTNER_SESSION_COOKIE, "", { ...baseCookie, maxAge: 0 });
}

/** Partenaire connecté (actif), ou null. Un partenaire suspendu perd l'accès immédiatement. */
export async function getPartnerSession() {
  const token = cookies().get(PARTNER_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey("session"), { audience: "odysseo-partner" });
    if (!payload.sub) return null;
    return prisma.partner.findFirst({ where: { id: payload.sub, status: "ACTIVE" } });
  } catch {
    return null;
  }
}

/** Retrouve un partenaire actif par e-mail ou numéro (WhatsApp / téléphone, comparé sur les 9 derniers chiffres). */
export async function findPartnerByIdentifier(identifier: string) {
  const id = identifier.trim();
  if (id.includes("@")) return prisma.partner.findFirst({ where: { email: id.toLowerCase(), status: "ACTIVE" } });
  const digits = id.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const tail = digits.slice(-9);
  const withPhone = await prisma.partner.findMany({ where: { status: "ACTIVE", phone: { not: null } }, select: { id: true, phone: true } });
  const hit = withPhone.find((p) => (p.phone ?? "").replace(/\D/g, "").endsWith(tail));
  return hit ? prisma.partner.findUnique({ where: { id: hit.id } }) : null;
}
