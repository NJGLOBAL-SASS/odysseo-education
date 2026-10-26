import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteMember, listMembers, requireAdmin } from "@/lib/team";

/** Liste des membres de l'équipe (visible par tous les membres). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  return NextResponse.json({ members: await listMembers() });
}

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court."),
  email: z.string().trim().toLowerCase().email("Email invalide."),
  role: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
});

/** Invite un nouveau membre (administrateurs uniquement). */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }

  const exists = await prisma.user.findFirst({
    where: { email: { equals: body.data.email, mode: "insensitive" } },
  });
  if (exists) return NextResponse.json({ error: "Ce membre fait déjà partie de l'équipe." }, { status: 409 });

  const member = await prisma.user.create({
    data: { ...body.data, notificationPrefs: { create: {} } },
  });

  const invitedBy = guard.session.user.name || guard.session.user.email || "Un administrateur";
  const emailSent = await inviteMember(req, member, invitedBy);

  return NextResponse.json({ ok: true, emailSent });
}
