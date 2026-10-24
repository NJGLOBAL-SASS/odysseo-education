import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/** Liste des abonnés pour le tableau de bord (protégé). */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ subscribers });
}

const schema = z.object({
  email: z.string().email(),
  locale: z.enum(["fr", "en"]).default("fr"),
});

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  await prisma.newsletterSubscriber.upsert({
    where: { email: body.data.email },
    update: {},
    create: { email: body.data.email, locale: body.data.locale },
  });

  return NextResponse.json({ ok: true });
}
