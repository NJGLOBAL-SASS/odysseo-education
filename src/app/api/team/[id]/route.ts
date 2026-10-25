import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { isLastAdmin, requireAdmin } from "@/lib/team";

const patchSchema = z.object({
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  name: z.string().trim().min(2).optional(),
  // Membre qui a perdu son téléphone : désactive la 2FA, il la réactivera lui-même.
  resetTwoFactor: z.literal(true).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const member = await prisma.user.findUnique({ where: { id: params.id } });
  if (!member) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  if (body.data.role === "STAFF" && member.role === "ADMIN" && (await isLastAdmin(member.id))) {
    return NextResponse.json({ error: "Il doit rester au moins un administrateur." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: member.id },
    data: {
      role: body.data.role,
      name: body.data.name,
      ...(body.data.resetTwoFactor ? { twoFactorEnabled: false, twoFactorSecret: null } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

/** Retire un membre : son accès est coupé immédiatement (voir callback jwt dans lib/auth.ts). */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  if (params.id === guard.session.user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas retirer votre propre compte." }, { status: 400 });
  }
  const member = await prisma.user.findUnique({ where: { id: params.id } });
  if (!member) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
  if (member.role === "ADMIN" && (await isLastAdmin(member.id))) {
    return NextResponse.json({ error: "Il doit rester au moins un administrateur." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.pushSubscription.deleteMany({ where: { userId: member.id } }),
    prisma.user.delete({ where: { id: member.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
