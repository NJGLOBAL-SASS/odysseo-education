import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { allowAttempt } from "@/lib/portal/rate-limit";
import { sendSignedContract } from "@/lib/notifications";

/**
 * Espace partenaire (accessible avec le seul code, qui est public) : le contrat signé n'est jamais
 * téléchargé ici, il est renvoyé à l'adresse e-mail du partenaire (3 fois par jour au plus).
 */
export async function POST(req: NextRequest) {
  const code = String(((await req.json().catch(() => null)) as { code?: string } | null)?.code ?? "").trim().toUpperCase();
  const partner = code ? await prisma.partner.findUnique({ where: { referralCode: code } }) : null;
  const contract = partner && (await prisma.partnerContract.findFirst({ where: { partnerId: partner.id, signedAt: { not: null } }, orderBy: { signedAt: "desc" } }));
  if (!partner || !contract?.pdf) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (!(await allowAttempt(`contract-email:${partner.id}`, 3, 24 * 3600_000))) return NextResponse.json({ error: "tooMany" }, { status: 429 });
  await sendSignedContract(partner, contract.number, Buffer.from(contract.pdf), req.nextUrl.searchParams.get("locale") === "en" ? "en" : "fr").catch(() => undefined);
  return NextResponse.json({ ok: true });
}
