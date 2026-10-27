import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/team";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().optional(),
  locale: z.enum(["fr", "en"]).optional(),
  confirmed: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (body.data.email) {
    const clash = await prisma.newsletterSubscriber.findFirst({
      where: { email: body.data.email, NOT: { id: params.id } },
    });
    if (clash) return NextResponse.json({ error: "emailTaken" }, { status: 409 });
  }

  const subscriber = await prisma.newsletterSubscriber
    .update({ where: { id: params.id }, data: body.data })
    .catch(() => null);
  if (!subscriber) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return NextResponse.json({ subscriber });
}

/** Désinscription / suppression d'un abonné (administrateurs). */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const deleted = await prisma.newsletterSubscriber.delete({ where: { id: params.id } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
