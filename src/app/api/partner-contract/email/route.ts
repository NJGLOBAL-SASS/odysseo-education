import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { allowAttempt } from "@/lib/portal/rate-limit";
import { sendSignedContract } from "@/lib/notifications";
import { getPartnerSession } from "@/lib/partner-space/session";

/**
 * Espace partenaire (partenaire connecté) : le contrat signé n'est jamais téléchargé ici, il est
 * renvoyé à l'adresse e-mail du partenaire (3 fois par jour au plus).
 */
export async function POST(req: NextRequest) {
  const partner = await getPartnerSession();
  const contract = partner && (await prisma.partnerContract.findFirst({ where: { partnerId: partner.id, signedAt: { not: null } }, orderBy: { signedAt: "desc" } }));
  if (!partner || !contract?.pdf) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (!(await allowAttempt(`contract-email:${partner.id}`, 3, 24 * 3600_000))) return NextResponse.json({ error: "tooMany" }, { status: 429 });
  await sendSignedContract(partner, contract.number, Buffer.from(contract.pdf), req.nextUrl.searchParams.get("locale") === "en" ? "en" : "fr").catch(() => undefined);
  return NextResponse.json({ ok: true });
}
