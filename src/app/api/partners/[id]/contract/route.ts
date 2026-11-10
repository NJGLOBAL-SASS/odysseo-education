import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicSiteUrl } from "@/lib/referral";
import { sendPartnerContractLink } from "@/lib/notifications";
import { CONTRACT_CONFIG, createContract, founderSignatureAvailable, logStatus } from "@/lib/contracts/service";

/** Équipe : contrats, acceptations et historique d'un partenaire. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const partner = await prisma.partner.findUnique({
    where: { id: params.id },
    select: {
      contractStatus: true,
      contracts: { orderBy: { createdAt: "desc" }, select: { id: true, number: true, version: true, sentAt: true, signedAt: true, tokenExpiresAt: true, pdfSha256: true } },
      statusEvents: { orderBy: { createdAt: "asc" }, select: { fromStatus: true, toStatus: true, actorName: true, note: true, createdAt: true } },
    },
  });
  if (!partner) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return NextResponse.json({ ...partner, latestVersion: CONTRACT_CONFIG.contrat_version });
}

/** « Demander la signature de la nouvelle version » : même circuit, statut du partenaire inchangé. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!founderSignatureAvailable()) return NextResponse.json({ error: "signatureMissing" }, { status: 409 });
  const partner = await prisma.partner.findUnique({ where: { id: params.id }, include: { application: true } });
  if (!partner?.application) return NextResponse.json({ error: "noApplication" }, { status: 409 });
  const who = session.user.name || session.user.email || "Équipe";
  const app = partner.application;
  const { contract, token } = await prisma.$transaction(async (tx) => {
    const created = await createContract(tx, app, partner, who);
    await logStatus(tx, { partnerId: partner.id, from: partner.contractStatus, to: partner.contractStatus, actor: who, note: `Nouvelle version ${CONTRACT_CONFIG.contrat_version} envoyée (${created.contract.number})` });
    return created;
  }, { timeout: 20_000 });
  const link = `${publicSiteUrl()}/${app.locale === "en" ? "en" : "fr"}/partenaires/contrat/${token}`;
  const emailSent = await sendPartnerContractLink(app, link).catch(() => false);
  return NextResponse.json({ ok: true, link, number: contract.number, emailSent });
}
