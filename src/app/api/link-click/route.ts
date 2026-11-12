import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { allowAttempt, clientIp } from "@/lib/portal/rate-limit";
import { isLinkButton, normalizeLinkSource } from "@/lib/links/config";

/**
 * Clic sur un bouton de la page /liens (envoyé par navigator.sendBeacon).
 * Corps JSON { bouton, src } ; seuls le bouton, la source et la date sont stockés.
 * Limite : 30 clics par IP sur 10 min (seule une empreinte de l'IP est conservée,
 * dans tracking_attempts, 24 h). Répond toujours 204 : le navigateur n'attend rien.
 */
export async function POST(req: NextRequest) {
  let body: { bouton?: unknown; src?: unknown } = {};
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!isLinkButton(body.bouton)) return new NextResponse(null, { status: 400 });
  const src = normalizeLinkSource(typeof body.src === "string" ? body.src.slice(0, 32) : null);

  try {
    if (await allowAttempt(`link-click|${clientIp(req)}`, 30, 10 * 60_000)) {
      await prisma.linkClick.create({ data: { bouton: body.bouton, src } });
    }
  } catch (err) {
    console.error("[link-click]", err);
  }
  return new NextResponse(null, { status: 204 });
}
