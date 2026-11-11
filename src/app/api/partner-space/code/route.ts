import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { maskEmail } from "@/lib/contracts/rules";
import { sendPartnerSpaceCode } from "@/lib/notifications";
import { allowAttempt, clientIp } from "@/lib/portal/rate-limit";
import { CODE_MINUTES, findPartnerByIdentifier, startChallenge } from "@/lib/partner-space/session";

const schema = z.object({ identifier: z.string().trim().min(5).max(120), locale: z.enum(["fr", "en"]).default("fr") });

/** Espace partenaire : envoie un code de connexion à l'e-mail du partenaire (e-mail ou numéro saisi). */
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (!(await allowAttempt(`partner-space-code-ip:${clientIp(req)}`, 10, 3600_000))) return NextResponse.json({ error: "tooMany" }, { status: 429 });
  const partner = await findPartnerByIdentifier(body.data.identifier);
  if (!partner) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (!(await allowAttempt(`partner-space-code:${partner.id}`, 5, 3600_000))) return NextResponse.json({ error: "tooMany" }, { status: 429 });
  const code = await startChallenge(partner.id);
  const sent = await sendPartnerSpaceCode(partner.email, code, CODE_MINUTES, body.data.locale).catch(() => false);
  if (!sent) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true, destination: maskEmail(partner.email), minutes: CODE_MINUTES });
}
