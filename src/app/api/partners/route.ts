import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { slugifyReferralCode } from "@/lib/utils";
import { notifyPartnerWelcome } from "@/lib/notifications";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const [partners, clicks] = await Promise.all([
    prisma.partner.findMany({
      orderBy: { pointsBalance: "desc" },
      include: { _count: { select: { candidates: true } } },
    }),
    prisma.referralEvent.groupBy({
      by: ["partnerId"],
      where: { type: "LINK_CLICK" },
      _count: true,
    }),
  ]);

  const clicksByPartner = new Map(clicks.map((c) => [c.partnerId, c._count]));
  return NextResponse.json({
    partners: partners.map((p) => ({ ...p, linkClicks: clicksByPartner.get(p.id) ?? 0 })),
  });
}

const schema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Nom ou email invalide." }, { status: 400 });

  if (await prisma.partner.findUnique({ where: { email: body.data.email } })) {
    return NextResponse.json({ error: "Un partenaire existe déjà avec cet email." }, { status: 409 });
  }

  let referralCode = slugifyReferralCode(body.data.fullName);
  // évite les collisions improbables
  while (await prisma.partner.findUnique({ where: { referralCode } })) {
    referralCode = slugifyReferralCode(body.data.fullName);
  }

  const partner = await prisma.partner.create({
    data: { ...body.data, phone: body.data.phone || undefined, referralCode },
  });

  // Le partenaire reçoit immédiatement son lien : plus besoin de lui dicter son code.
  const welcomeEmailSent = await notifyPartnerWelcome(partner).catch(() => false);

  return NextResponse.json({ partner, welcomeEmailSent });
}
