import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { signPendingToken } from "@/lib/pending-2fa-token";

const PENDING_COOKIE = "odysseo_2fa_pending";

/**
 * 1er facteur : vérifie l'email + mot de passe.
 * - Si la 2FA n'est pas activée, renvoie { twoFactorRequired: false } : le client
 *   peut alors appeler signIn("credentials", { email, password }) directement.
 * - Si la 2FA est activée, pose un cookie "pending" signé et renvoie
 *   { twoFactorRequired: true } : le client redirige vers /verify-2fa.
 */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }

  if (!user.twoFactorEnabled) {
    return NextResponse.json({ twoFactorRequired: false });
  }

  const token = await signPendingToken(user.id);
  const res = NextResponse.json({ twoFactorRequired: true });
  res.cookies.set(PENDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 5,
    path: "/",
  });
  return res;
}
