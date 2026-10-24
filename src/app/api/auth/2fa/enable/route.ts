import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTwoFactorToken } from "@/lib/auth-2fa";

/** Confirme l'activation de la 2FA : vérifie un code contre le secret fourni puis le persiste. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { secret, code } = await req.json();
  if (!secret || !code) {
    return NextResponse.json({ error: "Secret et code requis." }, { status: 400 });
  }

  const ok = verifyTwoFactorToken(String(code).trim(), secret);
  if (!ok) {
    return NextResponse.json({ error: "Code invalide." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: true, twoFactorSecret: secret },
  });

  return NextResponse.json({ ok: true });
}
