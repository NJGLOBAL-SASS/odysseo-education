import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { sameName } from "@/lib/contracts/rules";
import { CONTRACT_CONFIG, contractFromToken, newOtp, otpDestination } from "@/lib/contracts/service";
import { sendContractOtp } from "@/lib/notifications";

const schema = z.object({ token: z.string().min(20).max(100), name: z.string().trim().min(2).max(120), locale: z.enum(["fr", "en"]).default("fr") });

/** Envoie le code à usage unique (e-mail) après vérification du nom saisi. */
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const state = await contractFromToken(body.data.token);
  if (!state.ok) return NextResponse.json({ error: state.reason }, { status: 410 });
  const { contract } = state;
  const fields = contract.fields as Record<string, string>;
  if (!sameName(body.data.name, fields.partenaire_nom_complet)) return NextResponse.json({ error: "name" }, { status: 400 });

  const otp = CONTRACT_CONFIG.otp;
  const recent = await prisma.partnerContractOtp.count({ where: { contractId: contract.id, createdAt: { gt: new Date(Date.now() - 3600_000) } } });
  if (recent >= otp.renvois_max_par_heure) return NextResponse.json({ error: "tooManyCodes" }, { status: 429 });

  const email = contract.partner.email;
  const dest = otpDestination(email);
  const { code, hash } = newOtp();
  await prisma.$transaction([
    // Un seul code valable à la fois.
    prisma.partnerContractOtp.updateMany({ where: { contractId: contract.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.partnerContractOtp.create({
      data: { contractId: contract.id, codeHash: hash(contract.id), channel: dest.channel, destination: dest.masked, expiresAt: new Date(Date.now() + otp.validite_minutes * 60_000) },
    }),
  ]);
  const sent = await sendContractOtp(email, code, otp.validite_minutes, body.data.locale).catch(() => false);
  if (!sent) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true, destination: dest.masked, minutes: otp.validite_minutes });
}
