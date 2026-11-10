import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/validations/intake";
import { slugifyReferralCode } from "@/lib/utils";
import { publicSiteUrl } from "@/lib/referral";
import { sendPartnerApplicationDecision, sendPartnerContractLink } from "@/lib/notifications";
import { CONTRACT_CONFIG, createContract, founderSignatureAvailable, logStatus, renewToken } from "@/lib/contracts/service";

const editSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email().max(120),
  whatsapp: z.string().refine((v) => /^\+\d{9,15}$/.test(normalizePhone(v)), "whatsapp"),
  country: z.string().trim().min(1).max(60),
  city: z.string().trim().min(1).max(60),
  idType: z.string().trim().min(2).max(40),
  idNumber: z.string().trim().min(5).max(30),
  payoutMethod: z.string().trim().min(2).max(40),
  payoutNumber: z.string().trim().min(5).max(60),
});

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm"), note: z.string().trim().max(3000).default("") }),
  z.object({ action: z.literal("reject"), note: z.string().trim().max(3000).default("") }),
  z.object({ action: z.literal("edit"), data: editSchema }),
  z.object({ action: z.literal("resend") }),
]);

const contractLink = (locale: string, token: string) => `${publicSiteUrl()}/${locale === "en" ? "en" : "fr"}/partenaires/contrat/${token}`;

/**
 * Équipe (PACK-11) : confirmer (code + contrat + lien de signature), refuser, corriger la demande
 * avant confirmation, renvoyer le lien (l'ancien est invalidé).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const who = session.user.name || session.user.email || "Équipe";

  const app = await prisma.partnerApplication.findUnique({ where: { id: params.id }, include: { partner: true } });
  if (!app) return NextResponse.json({ error: "notFound" }, { status: 404 });
  const d = body.data;

  if (d.action === "edit") {
    if (app.status !== "PENDING") return NextResponse.json({ error: "alreadyReviewed" }, { status: 409 });
    const v = d.data;
    await prisma.partnerApplication.update({
      where: { id: app.id },
      data: { ...v, whatsapp: normalizePhone(v.whatsapp), fullName: `${v.firstName} ${v.lastName}` },
    });
    await logStatus(prisma, { applicationId: app.id, from: "demande_recue", to: "demande_recue", actor: who, note: "Informations corrigées" });
    return NextResponse.json({ ok: true });
  }

  if (d.action === "resend") {
    if (!app.partner || !["contrat_envoye", "lien_expire"].includes(app.partner.contractStatus)) {
      return NextResponse.json({ error: "invalidState" }, { status: 409 });
    }
    const contract = await prisma.partnerContract.findFirst({ where: { partnerId: app.partner.id, signedAt: null }, orderBy: { createdAt: "desc" } });
    if (!contract) return NextResponse.json({ error: "invalidState" }, { status: 409 });
    const token = await renewToken(contract.id);
    if (app.partner.contractStatus === "lien_expire") {
      await prisma.partner.update({ where: { id: app.partner.id }, data: { contractStatus: "contrat_envoye", contractStatusAt: new Date() } });
    }
    await logStatus(prisma, { partnerId: app.partner.id, from: app.partner.contractStatus, to: "contrat_envoye", actor: who, note: "Lien renvoyé" });
    const link = contractLink(app.locale, token);
    const emailSent = await sendPartnerContractLink(app, link).catch(() => false);
    return NextResponse.json({ ok: true, link, number: contract.number, emailSent });
  }

  if (app.status !== "PENDING") return NextResponse.json({ error: "alreadyReviewed" }, { status: 409 });

  if (d.action === "reject") {
    const updated = await prisma.partnerApplication.update({
      where: { id: app.id },
      data: { status: "REJECTED", responseNote: d.note || null, reviewedAt: new Date(), reviewedById: session.user.id },
    });
    await logStatus(prisma, { applicationId: app.id, from: "demande_recue", to: "refusee", actor: who, note: d.note || undefined });
    const emailSent = await sendPartnerApplicationDecision(updated, "REJECTED", d.note).catch(() => false);
    return NextResponse.json({ ok: true, emailSent });
  }

  // Confirmer : aucun contrat ne part sans la signature du fondateur.
  if (!founderSignatureAvailable()) return NextResponse.json({ error: "signatureMissing" }, { status: 409 });
  const exists = await prisma.partner.findFirst({ where: { email: { equals: app.email, mode: "insensitive" } } });
  if (exists) return NextResponse.json({ error: "alreadyPartner" }, { status: 409 });

  let referralCode = slugifyReferralCode(app.fullName);
  while (await prisma.partner.findUnique({ where: { referralCode } })) referralCode = slugifyReferralCode(app.fullName);

  const { contract, token } = await prisma.$transaction(async (tx) => {
    const partner = await tx.partner.create({
      data: { fullName: app.fullName, email: app.email, phone: app.whatsapp, referralCode, contractStatus: "contrat_envoye", contractStatusAt: new Date() },
    });
    await tx.partnerApplication.update({
      where: { id: app.id },
      data: { status: "APPROVED", responseNote: d.note || null, reviewedAt: new Date(), reviewedById: session.user!.id, partnerId: partner.id },
    });
    await logStatus(tx, { applicationId: app.id, from: "demande_recue", to: "contrat_envoye", actor: who });
    await logStatus(tx, { partnerId: partner.id, to: "contrat_envoye", actor: who });
    return createContract(tx, app, partner, who);
  }, { timeout: 20_000 });
  const link = contractLink(app.locale, token);
  const emailSent = await sendPartnerContractLink(app, link, d.note).catch(() => false);
  return NextResponse.json({ ok: true, link, number: contract.number, days: CONTRACT_CONFIG.lien_contrat_validite_jours, emailSent, code: referralCode });
}
