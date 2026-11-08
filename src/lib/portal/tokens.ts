import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

export type TokenPurpose = "invite" | "reset";
const TTL_HOURS: Record<TokenPurpose, number> = { invite: 14 * 24, reset: 2 };

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Nouveau lien à usage unique (les liens précédents du même type sont annulés). */
export async function createPortalToken(accountId: string, purpose: TokenPurpose) {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.portalToken.deleteMany({ where: { accountId, purpose, usedAt: null } }),
    prisma.portalToken.create({
      data: { accountId, purpose, tokenHash: hash(token), expiresAt: new Date(Date.now() + TTL_HOURS[purpose] * 3600_000) },
    }),
  ]);
  return token;
}

/** Lien valide (non utilisé, non expiré, compte actif) → compte ; sinon null. Ne consomme pas le lien. */
export async function findValidToken(token: string, purpose: TokenPurpose) {
  if (!token || token.length > 200) return null;
  const row = await prisma.portalToken.findUnique({
    where: { tokenHash: hash(token) },
    include: { account: { select: { id: true, email: true, name: true, disabledAt: true, sessionVersion: true, role: true } } },
  });
  if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt < new Date() || row.account.disabledAt) return null;
  return row;
}

export async function markTokenUsed(id: string) {
  await prisma.portalToken.update({ where: { id }, data: { usedAt: new Date() } });
}
