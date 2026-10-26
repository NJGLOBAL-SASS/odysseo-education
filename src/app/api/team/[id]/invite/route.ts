import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { inviteMember, requireAdmin } from "@/lib/team";

/** Renvoie l'email d'invitation avec un nouveau lien (l'ancien est invalidé). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const member = await prisma.user.findUnique({ where: { id: params.id } });
  if (!member) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const invitedBy = guard.session.user.name || guard.session.user.email || "Un administrateur";
  const emailSent = await inviteMember(req, member, invitedBy);
  return NextResponse.json({ ok: true, emailSent });
}
