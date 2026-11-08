/**
 * Session de l'espace étudiant, totalement séparée de celle de l'équipe (NextAuth) :
 * cookie httpOnly « odysseo_portal » contenant un jeton signé (HS256), vérifié à chaque
 * requête contre la base (compte actif, version de session).
 */
import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { prisma } from "@/lib/prisma";
import { PORTAL_COOKIE } from "./host";

/** Session longue (« accès sans contrainte ») : 90 jours, renouvelée à chaque connexion. */
const SESSION_DAYS = 90;

function secretKey() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET manquant.");
  // Clé dérivée : un jeton de l'espace étudiant ne peut jamais servir ailleurs.
  return createHash("sha256").update(`odysseo-portal:${secret}`).digest();
}

export async function createSessionToken(account: { id: string; sessionVersion: number }) {
  return new SignJWT({ v: account.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(account.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .setAudience("odysseo-portal")
    .sign(secretKey());
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

/** Pose le cookie de session (route handlers uniquement). */
export async function startPortalSession(account: { id: string; sessionVersion: number }) {
  cookies().set(PORTAL_COOKIE, await createSessionToken(account), sessionCookieOptions);
  await prisma.portalAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
}

export function endPortalSession() {
  cookies().set(PORTAL_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { audience: "odysseo-portal" });
    return payload.sub ? { accountId: payload.sub, version: Number(payload.v ?? 0) } : null;
  } catch {
    return null;
  }
}

export type PortalSession = NonNullable<Awaited<ReturnType<typeof getPortalSession>>>;

/** Compte connecté (avec son dossier), ou null. Un compte désactivé ou déconnecté partout est refusé. */
export async function getPortalSession() {
  const claims = await verifySessionToken(cookies().get(PORTAL_COOKIE)?.value);
  if (!claims) return null;
  const account = await prisma.portalAccount.findUnique({
    where: { id: claims.accountId },
    select: {
      id: true,
      role: true,
      email: true,
      name: true,
      locale: true,
      disabledAt: true,
      sessionVersion: true,
      passwordHash: true,
      candidateId: true,
      candidate: { select: { id: true, code: true, fullName: true } },
    },
  });
  if (!account || account.disabledAt || account.sessionVersion !== claims.version) return null;
  const { passwordHash, ...rest } = account;
  return { ...rest, hasPassword: Boolean(passwordHash) };
}
