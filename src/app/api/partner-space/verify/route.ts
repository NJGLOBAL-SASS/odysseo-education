import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { allowAttempt } from "@/lib/portal/rate-limit";
import { challengePartnerId, codeMatches, startPartnerSession } from "@/lib/partner-space/session";

const schema = z.object({ code: z.string().trim().regex(/^\d{6}$/) });

/** Espace partenaire : vérifie le code (5 essais par quart d'heure) puis ouvre une session de 90 jours. */
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "code" }, { status: 400 });
  const challenge = await challengePartnerId();
  if (!challenge) return NextResponse.json({ error: "expired" }, { status: 410 });
  if (!(await allowAttempt(`partner-space-verify:${challenge.partnerId}`, 5, 15 * 60_000))) return NextResponse.json({ error: "tooMany" }, { status: 429 });
  if (!codeMatches(challenge.partnerId, challenge.hash, body.data.code)) return NextResponse.json({ error: "code" }, { status: 400 });
  const partner = await prisma.partner.findFirst({ where: { id: challenge.partnerId, status: "ACTIVE" }, select: { id: true, referralCode: true } });
  if (!partner) return NextResponse.json({ error: "expired" }, { status: 410 });
  await startPartnerSession(partner.id);
  return NextResponse.json({ ok: true, code: partner.referralCode });
}
