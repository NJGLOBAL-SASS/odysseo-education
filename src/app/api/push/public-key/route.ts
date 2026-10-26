import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Clé publique VAPID servie au navigateur. Évite de la dupliquer dans
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY (source d'erreurs : les deux divergeaient).
 */
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}
