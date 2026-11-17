import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isLinkPreviewBot } from "@/lib/referral";
import { loadFlyer, partnerFlyer } from "@/lib/kits/image";
import { asPosition, publicKit } from "@/lib/kits/server";

export const runtime = "nodejs";

/**
 * Flyer personnalisé du partenaire (QR + code incrustés), JPEG ≤ 1080 px.
 * Mis en cache par le CDN : l'adresse porte la version du flyer (?v=), changée à chaque nouveau flyer.
 * ?download=1 : vrai téléchargement (et trace « image téléchargée »).
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string; code: string } }) {
  const ctx = await publicKit(params.slug, decodeURIComponent(params.code).toUpperCase());
  if (!ctx) return NextResponse.json({ error: "notFound" }, { status: 404 });
  const download = req.nextUrl.searchParams.get("download") === "1";
  const image = await partnerFlyer(await loadFlyer(ctx.kit.imageUrl!), { link: ctx.link, code: ctx.partner.referralCode, position: asPosition(ctx.kit.qrPosition) });
  if (download && !isLinkPreviewBot(req.headers.get("user-agent"))) {
    await prisma.kitView.create({ data: { kitId: ctx.kit.id, partnerId: ctx.partner.id, type: "image_telechargee" } }).catch(() => undefined);
  }
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": download ? "private, no-store" : "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400",
      ...(download && { "Content-Disposition": `attachment; filename="odysseo-${ctx.kit.slug}-${ctx.partner.referralCode}.jpg"` }),
    },
  });
}
