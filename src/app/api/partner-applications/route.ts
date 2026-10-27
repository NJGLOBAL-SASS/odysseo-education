import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/validations/intake";
import { notifyPartnerApplication } from "@/lib/notifications";

const schema = z.object({
  fullName: z.string().trim().min(3).max(80).refine((v) => v.split(/\s+/).length >= 2, "fullName"),
  email: z.string().trim().toLowerCase().email().max(120),
  whatsapp: z.string().refine((v) => /^\+\d{9,15}$/.test(normalizePhone(v)), "whatsapp"),
  country: z.string().trim().min(1).max(60),
  city: z.string().trim().min(1).max(60),
  profile: z.enum(["student", "teacher", "agency", "creator", "other"]),
  motivation: z.string().trim().min(30).max(2000),
  consent: z.literal(true),
  locale: z.enum(["fr", "en"]).default("fr"),
  website: z.string().max(0).optional(), // honeypot
});

/** Public : dépôt d'une demande de partenariat depuis /partenaires. */
export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => ({}));
  if (raw?.website) return NextResponse.json({ ok: true }); // robot : succès simulé

  const body = schema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json({ error: "invalid", fields: Object.keys(body.error.flatten().fieldErrors) }, { status: 400 });
  }
  const d = body.data;

  const [existingPartner, pending] = await Promise.all([
    prisma.partner.findFirst({ where: { email: { equals: d.email, mode: "insensitive" } } }),
    prisma.partnerApplication.findFirst({
      where: { email: { equals: d.email, mode: "insensitive" }, status: "PENDING" },
    }),
  ]);
  if (existingPartner) return NextResponse.json({ error: "alreadyPartner" }, { status: 409 });
  if (pending) return NextResponse.json({ error: "alreadyPending" }, { status: 409 });

  const application = await prisma.partnerApplication.create({
    data: {
      fullName: d.fullName,
      email: d.email,
      whatsapp: normalizePhone(d.whatsapp),
      country: d.country,
      city: d.city,
      profile: d.profile,
      motivation: d.motivation,
      locale: d.locale,
    },
  });

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
      partner: { select: { referralCode: true } },
    },
  });
  return NextResponse.json({ applications });
}
