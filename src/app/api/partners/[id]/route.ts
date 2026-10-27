import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/team";

const schema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z.string().trim().max(30).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

/** Modification d'un partenaire (le code de parrainage, déjà diffusé, ne change jamais). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (body.data.email) {
    const clash = await prisma.partner.findFirst({
      where: { email: { equals: body.data.email, mode: "insensitive" }, NOT: { id: params.id } },
    });
    if (clash) return NextResponse.json({ error: "emailTaken" }, { status: 409 });
  }

  const partner = await prisma.partner
    .update({ where: { id: params.id }, data: { ...body.data, phone: body.data.phone || null } })
    .catch(() => null);
  if (!partner) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return NextResponse.json({ partner });
}

/**
 * Suppression (administrateurs) : ses dossiers sont conservés mais détachés,
 * son historique de clics et de points est supprimé.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const deleted = await prisma.partner.delete({ where: { id: params.id } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
