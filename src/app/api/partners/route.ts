import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { slugifyReferralCode } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const partners = await prisma.partner.findMany({
    orderBy: { pointsBalance: "desc" },
    include: { _count: { select: { candidates: true } } },
  });
  return NextResponse.json({ partners });
}

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  let referralCode = slugifyReferralCode(body.data.fullName);
  // évite les collisions improbables
  while (await prisma.partner.findUnique({ where: { referralCode } })) {
    referralCode = slugifyReferralCode(body.data.fullName);
  }

  const partner = await prisma.partner.create({
    data: { ...body.data, referralCode },
  });

  return NextResponse.json({ partner });
}
