import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { sendPasswordChangedEmail } from "@/lib/notifications";
import { hashResetToken, passwordProblem } from "@/lib/password-reset";

const schema = z.object({ token: z.string().min(20), password: z.string() });

async function findValidToken(token: string) {
  const entry = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!entry || entry.usedAt || entry.expiresAt < new Date()) return null;
  return entry;
}

/** Vérifie un lien avant d'afficher le formulaire (lien expiré / déjà utilisé). */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const entry = token ? await findValidToken(token) : null;
  return NextResponse.json({ valid: Boolean(entry) });
}

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const problem = passwordProblem(body.data.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const entry = await findValidToken(body.data.token);
  if (!entry) {
    return NextResponse.json(
      { error: "Ce lien a expiré ou a déjà été utilisé. Faites une nouvelle demande." },
      { status: 410 }
    );
  }

  const passwordHash = await bcrypt.hash(body.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: entry.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: entry.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: entry.userId, usedAt: null } }),
  ]);

  sendPasswordChangedEmail(entry.user).catch(() => {});
  return NextResponse.json({ ok: true });
}
