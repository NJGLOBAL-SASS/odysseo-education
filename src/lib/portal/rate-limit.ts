import "server-only";

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/**
 * Limite d'essais (connexion, mot de passe oublié…) comptée en base : fiable entre les
 * instances serverless. Seule une empreinte est stockée (jamais l'IP ni l'e-mail en clair).
 * Renvoie true si l'essai est autorisé (et le compte), false s'il faut refuser.
 */
export async function allowAttempt(key: string, max: number, windowMs: number) {
  const ipHash = createHash("sha256").update(`${key}|${process.env.AUTH_SECRET ?? ""}`).digest("hex");
  const count = await prisma.trackingAttempt.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - windowMs) } } });
  if (count >= max) return false;
  await prisma.trackingAttempt.create({ data: { ipHash } });
  prisma.trackingAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 3600_000) } } }).catch(() => undefined);
  return true;
}
