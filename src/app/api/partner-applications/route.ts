import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/validations/intake";
import { notifyPartnerApplication } from "@/lib/notifications";
import { allowAttempt, clientIp } from "@/lib/portal/rate-limit";
import { CONTRACT_CONFIG, logStatus } from "@/lib/contracts/service";

const cfg = CONTRACT_CONFIG;
const PROFILES = ["teacher", "counselor", "alumni_china", "creator", "association", "other"] as const;

const schema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email().max(120),
  whatsapp: z.string().refine((v) => /^\+\d{9,15}$/.test(normalizePhone(v)), "whatsapp"),
  country: z.string().trim().min(1).max(60),
  city: z.string().trim().min(1).max(60),
  idType: z.enum(cfg.pieces_identite as [string, ...string[]]),
  idNumber: z.string().trim().min(5).max(30),
  profile: z.enum(PROFILES),
  networks: z.string().trim().max(300).optional().default(""),
  estimate: z.enum(["1-3", "4-9", "10+"]).optional(),
  payoutMethod: z.enum(cfg.operateurs_paiement as [string, ...string[]]),
  payoutNumber: z.string().trim().min(5).max(60),
  consent: z.literal(true),
  locale: z.enum(["fr", "en"]).default("fr"),
  website: z.string().max(0).optional(), // honeypot
});

/**
 * Public : demande de partenariat (PACK-11) depuis /partenaires/inscription.
 * Statut « demande reçue » ; 3 demandes maximum par numéro WhatsApp et par IP sur 24 h ;
 * une seule demande par numéro ou e-mail.
 */
export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => ({}));
  if (raw?.website) return NextResponse.json({ ok: true }); // robot : succès simulé

  const body = schema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json({ error: "invalid", fields: Object.keys(body.error.flatten().fieldErrors) }, { status: 400 });
  }
  const d = body.data;
  const whatsapp = normalizePhone(d.whatsapp);

  const ipOk = await allowAttempt(`partner-app-ip:${clientIp(req)}`, 3, 24 * 3600_000);
  const waOk = ipOk && (await allowAttempt(`partner-app-wa:${whatsapp}`, 3, 24 * 3600_000));
  if (!ipOk || !waOk) return NextResponse.json({ error: "tooMany" }, { status: 429 });

  const [existingPartner, existingApp] = await Promise.all([
    prisma.partner.findFirst({ where: { OR: [{ email: { equals: d.email, mode: "insensitive" } }, { phone: whatsapp }] } }),
    prisma.partnerApplication.findFirst({
      where: { status: { not: "REJECTED" }, OR: [{ email: { equals: d.email, mode: "insensitive" } }, { whatsapp }] },
    }),
  ]);
  if (existingPartner || existingApp) return NextResponse.json({ error: "duplicate" }, { status: 409 });

  const application = await prisma.partnerApplication.create({
    data: {
      fullName: `${d.firstName} ${d.lastName}`,
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      whatsapp,
      country: d.country,
      city: d.city,
      profile: d.profile,
      motivation: "",
      networks: d.networks || null,
      estimate: d.estimate ?? null,
      idType: d.idType,
      idNumber: d.idNumber,
      payoutMethod: d.payoutMethod,
      payoutNumber: d.payoutNumber,
      contractConsentAt: new Date(),
      locale: d.locale,
    },
  });
  await logStatus(prisma, { applicationId: application.id, to: "demande_recue", actor: "système" });

  notifyPartnerApplication(application).catch((err) => console.error("[partner-application] notify:", err));
  return NextResponse.json({ ok: true });
}

/** Équipe : liste des demandes (les plus récentes d'abord, en attente en tête). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const applications = await prisma.partnerApplication.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
    include: {
      reviewedBy: { select: { name: true, email: true } },
      partner: {
        select: {
          id: true,
          referralCode: true,
          contractStatus: true,
          contracts: { orderBy: { createdAt: "desc" }, select: { id: true, number: true, version: true, sentAt: true, signedAt: true, tokenExpiresAt: true } },
        },
      },
      statusEvents: { orderBy: { createdAt: "asc" }, select: { toStatus: true, actorName: true, createdAt: true, note: true } },
    },
  });
  return NextResponse.json({ applications, latestVersion: CONTRACT_CONFIG.contrat_version });
}
