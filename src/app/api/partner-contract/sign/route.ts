import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/portal/rate-limit";
import { referralLink } from "@/lib/referral";
import { sameName } from "@/lib/contracts/rules";
import { CONTRACT_CONFIG, buildContractPdf, contractFromToken, logStatus, newFinalToken, otpHash } from "@/lib/contracts/service";
import { sendSignedContract } from "@/lib/notifications";
import { startPartnerSession } from "@/lib/partner-space/session";

const schema = z.object({
  token: z.string().min(20).max(100),
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().regex(/^\d{4,8}$/),
  accepted: z.literal(true),
  locale: z.enum(["fr", "en"]).default("fr"),
});

/**
 * Signature : case cochée + nom identique à la demande + code valable. Génère le PDF signé
 * (signature du fondateur + cachet), enregistre la preuve d'acceptation, active le partenaire.
 */
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const d = body.data;
  const state = await contractFromToken(d.token);
  if (!state.ok) return NextResponse.json({ error: state.reason }, { status: 410 });
  const { contract } = state;
  const fields = contract.fields as Record<string, string>;
  if (!sameName(d.name, fields.partenaire_nom_complet)) return NextResponse.json({ error: "name" }, { status: 400 });

  const otp = await prisma.partnerContractOtp.findFirst({ where: { contractId: contract.id, usedAt: null }, orderBy: { createdAt: "desc" } });
  if (!otp) return NextResponse.json({ error: "noCode" }, { status: 400 });
  if (otp.expiresAt < new Date()) return NextResponse.json({ error: "codeExpired" }, { status: 400 });
  if (otp.attempts >= CONTRACT_CONFIG.otp.tentatives_max) return NextResponse.json({ error: "codeBlocked" }, { status: 429 });
  if (otp.codeHash !== otpHash(contract.id, d.code)) {
    const attempts = otp.attempts + 1;
    await prisma.partnerContractOtp.update({ where: { id: otp.id }, data: { attempts, ...(attempts >= CONTRACT_CONFIG.otp.tentatives_max && { usedAt: new Date() }) } });
    const left = CONTRACT_CONFIG.otp.tentatives_max - attempts;
    return NextResponse.json({ error: left > 0 ? "code" : "codeBlocked", left }, { status: 400 });
  }

  const signedAt = new Date();
  let built;
  try {
    built = await buildContractPdf(contract, { at: signedAt, name: fields.partenaire_nom_complet, destination: otp.destination });
  } catch (err) {
    console.error("[contrat] PDF :", err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  const final = newFinalToken();
  const partner = contract.partner;
  const newStatus = partner.contractStatus === "actif" || partner.contractStatus === "non_requis" ? partner.contractStatus : "actif";

  // Une seule transaction groupée (un aller-retour) : rapide même avec une base distante.
  await prisma.$transaction([
    prisma.partnerContractOtp.update({ where: { id: otp.id }, data: { usedAt: signedAt } }),
    prisma.partnerContract.update({
      where: { id: contract.id },
      data: {
        signedAt,
        tokenHash: null, // lien de signature à usage unique
        pdf: built.pdf,
        pdfSha256: built.pdfHash,
        contentSha256: built.contentHash,
        finalTokenHash: final.hash,
        finalTokenExpiry: final.expires,
      },
    }),
    prisma.partnerContractAcceptance.create({
      data: {
        contractId: contract.id,
        partnerId: partner.id,
        contractNumber: contract.number,
        contractVersion: contract.version,
        fieldsSnapshot: contract.fields ?? {},
        typedName: d.name,
        otpChannel: otp.channel,
        otpDestination: otp.destination,
        signedAt,
        ip: clientIp(req),
        userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
        pdfSha256: built.pdfHash,
        pdfLocation: "base : partner_contracts.pdf",
      },
    }),
    prisma.partner.update({ where: { id: partner.id }, data: { contractStatus: newStatus, contractStatusAt: signedAt } }),
    logStatus(prisma, { partnerId: partner.id, from: partner.contractStatus, to: newStatus, actor: "système", note: `Contrat ${contract.number} signé` }),
  ]);

  // Signé avec le code reçu par e-mail : le partenaire est connecté à son espace (90 jours).
  await startPartnerSession(partner.id).catch(() => undefined);
  sendSignedContract({ ...partner, contractStatus: newStatus }, contract.number, built.pdf, d.locale).catch((err) => console.error("[contrat] e-mail :", err));
  return NextResponse.json({ ok: true, code: partner.referralCode, link: referralLink(partner.referralCode), downloadToken: final.token, number: contract.number });
}
