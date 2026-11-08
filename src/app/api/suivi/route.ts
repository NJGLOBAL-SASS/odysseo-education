import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { firstNameOf, matchesPhoneDigits, normalizeCode, normalizeHistory } from "@/lib/tracking-stages";

/**
 * Limites comptées en base (fiables entre les instances serverless), par heure :
 * - 5 essais par adresse IP ET par code dossier : protège les 4 chiffres d'un dossier ;
 * - 30 essais par adresse IP, tous codes confondus.
 * Une même adresse IP est souvent partagée par beaucoup d'abonnés mobiles : une limite
 * de 5 par IP seule bloquerait des familles qui n'ont rien fait.
 */
const MAX_PER_CODE = 5;
const MAX_PER_IP = 30;
const WINDOW_MS = 60 * 60 * 1000;

const bodySchema = z.object({
  code: z.string().max(20),
  telephone4: z.string().regex(/^\d{4}$/),
});

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Empreinte stockée (jamais l'IP en clair). `scope` : "" pour l'IP seule, sinon le code dossier. */
function attemptKey(ip: string, scope: string) {
  return createHash("sha256").update(`${ip}|${scope}|${process.env.AUTH_SECRET ?? "odysseo-suivi"}`).digest("hex");
}

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });

/**
 * Suivi de dossier public (PACK-08) : code dossier + 4 derniers chiffres du WhatsApp
 * (de l'étudiant, ou du parent / tuteur indiqué dans le formulaire).
 * Réponse générique si l'un des deux est faux. Ne renvoie jamais le nom complet, l'e-mail,
 * le téléphone, l'université réelle ni le partenaire.
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  const code = parsed.success ? normalizeCode(parsed.data.code) : "";

  const ip = clientIp(req);
  const ipKey = attemptKey(ip, "");
  const codeKey = attemptKey(ip, code || "invalide");
  const since = new Date(Date.now() - WINDOW_MS);
  const [perIp, perCode] = await Promise.all([
    prisma.trackingAttempt.count({ where: { ipHash: ipKey, createdAt: { gte: since } } }),
    prisma.trackingAttempt.count({ where: { ipHash: codeKey, createdAt: { gte: since } } }),
  ]);
  if (perIp >= MAX_PER_IP || perCode >= MAX_PER_CODE) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429, headers: { "Retry-After": "3600" } });
  }
  await prisma.trackingAttempt.createMany({ data: [{ ipHash: ipKey }, { ipHash: codeKey }] });
  // Purge des essais de plus de 24 h (sans attendre).
  prisma.trackingAttempt
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * WINDOW_MS) } } })
    .catch(() => undefined);

  if (!parsed.success) return notFound();

  const candidate = await prisma.candidate.findUnique({
    where: { code },
    select: {
      code: true,
      fullName: true,
      whatsapp: true,
      guardianWhatsapp: true,
      targetLevel: true,
      createdAt: true,
      stage: true,
      stageUpdatedAt: true,
      stageHistory: true,
      publicNote: true,
      recommendations: true,
    },
  });
  // 4 derniers chiffres du WhatsApp de l'étudiant, ou de celui du parent / tuteur s'il a été renseigné.
  if (!candidate || !matchesPhoneDigits(candidate, parsed.data.telephone4)) return notFound();

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
