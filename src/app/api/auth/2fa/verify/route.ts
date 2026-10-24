import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyTwoFactorToken } from "@/lib/auth-2fa";
import { verifyPendingToken, signAssertionToken } from "@/lib/pending-2fa-token";

const PENDING_COOKIE = "odysseo_2fa_pending";

/**
 * 2e facteur : vérifie le code TOTP à 6 chiffres contre le cookie "pending"
 * posé par /api/auth/password-check. En cas de succès, renvoie un jeton
 * d'assertion que le client transmet à signIn("credentials", { mode: "2fa-assertion", ... }).
 */
export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const pendingToken = req.cookies.get(PENDING_COOKIE)?.value;

  if (!pendingToken || !code) {
    return NextResponse.json({ error: "Session de connexion expirée." }, { status: 400 });
  }

  const userId = await verifyPendingToken(pendingToken);
  if (!userId) {
    return NextResponse.json({ error: "Session de connexion expirée." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: "2FA non configurée." }, { status: 400 });
  }

  const ok = verifyTwoFactorToken(String(code).trim(), user.twoFactorSecret);
  if (!ok) {
    return NextResponse.json({ error: "Code invalide." }, { status: 401 });
  }

  const assertionToken = await signAssertionToken(user.id);
  const res = NextResponse.json({ assertionToken });
  res.cookies.delete(PENDING_COOKIE);
  return res;
}
