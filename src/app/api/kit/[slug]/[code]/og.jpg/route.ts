import { NextRequest, NextResponse } from "next/server";

import { loadFlyer, partnerFlyer, partnerOgImage } from "@/lib/kits/image";
import { asPosition, publicKit } from "@/lib/kits/server";

export const runtime = "nodejs";

/** Aperçu WhatsApp du lien du kit : 1200 × 630, moins de 300 Ko. */
export async function GET(_req: NextRequest, { params }: { params: { slug: string; code: string } }) {
  const ctx = await publicKit(params.slug, decodeURIComponent(params.code).toUpperCase());
  if (!ctx) return NextResponse.json({ error: "notFound" }, { status: 404 });
  const flyer = await partnerFlyer(await loadFlyer(ctx.kit.imageUrl!), { link: ctx.link, code: ctx.partner.referralCode, position: asPosition(ctx.kit.qrPosition) });
  const og = await partnerOgImage(flyer);
  return new Response(new Uint8Array(og), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400" },
  });
}
