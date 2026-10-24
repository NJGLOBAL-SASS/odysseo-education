import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateTwoFactorSecret, buildTwoFactorEnrollment } from "@/lib/auth-2fa";

/** Génère un nouveau secret TOTP + QR code pour l'utilisateur connecté (pas encore activé). */
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const secret = generateTwoFactorSecret();
  const { qrDataUrl, otpauth } = await buildTwoFactorEnrollment(session.user.email, secret);

  return NextResponse.json({ secret, qrDataUrl, otpauth });
}
