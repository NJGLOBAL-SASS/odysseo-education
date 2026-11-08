import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { firstNameOf, lastFourDigits, normalizeCode, normalizeHistory } from "@/lib/tracking-stages";

/** 5 essais par heure et par adresse IP (comptés en base : fiable entre les instances serverless). */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000;

const bodySchema = z.object({
  code: z.string().max(20),
  telephone4: z.string().regex(/^\d{4}$/),
});

function ipHash(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${ip}:${process.env.AUTH_SECRET ?? "odysseo-suivi"}`).digest("hex");
}

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });

/**
 * Suivi de dossier public (PACK-08) : code dossier + 4 derniers chiffres du WhatsApp.
 * Réponse générique si l'un des deux est faux. Ne renvoie jamais le nom complet, l'e-mail,
 * le téléphone, l'université réelle ni le partenaire.
 */
export async function POST(req: NextRequest) {
  const hash = ipHash(req);
  const since = new Date(Date.now() - WINDOW_MS);
  const attempts = await prisma.trackingAttempt.count({ where: { ipHash: hash, createdAt: { gte: since } } });
  if (attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429, headers: { "Retry-After": "3600" } });
  }
  await prisma.trackingAttempt.create({ data: { ipHash: hash } });
  // Purge des essais de plus de 24 h (sans attendre).
  prisma.trackingAttempt
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * WINDOW_MS) } } })
    .catch(() => undefined);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return notFound();

  const candidate = await prisma.candidate.findUnique({
    where: { code: normalizeCode(parsed.data.code) },
    select: {
      code: true,
      fullName: true,
      whatsapp: true,
      targetLevel: true,
      createdAt: true,
      stage: true,
      stageUpdatedAt: true,
      stageHistory: true,
      publicNote: true,
      recommendations: true,
    },
  });
  if (!candidate || lastFourDigits(candidate.whatsapp) !== parsed.data.telephone4) return notFound();

  const recommendations = (Array.isArray(candidate.recommendations) ? candidate.recommendations : [])
    .map((r) => (r && typeof r === "object" && "ref" in r ? { ref: String(r.ref), role: String((r as { role?: string }).role ?? "") } : null))
    .filter(Boolean);

  return NextResponse.json(
    {
      ok: true,
      dossier: {
        code: candidate.code,
        firstName: firstNameOf(candidate.fullName),
        targetLevel: candidate.targetLevel,
        stage: candidate.stage,
        stageUpdatedAt: (candidate.stageUpdatedAt ?? candidate.createdAt).toISOString(),
        publicNote: candidate.publicNote,
        history: normalizeHistory(candidate.stageHistory, candidate.createdAt),
        recommendations,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
