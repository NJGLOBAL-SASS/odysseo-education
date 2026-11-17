import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { isLinkPreviewBot } from "@/lib/referral";
import { publicKit } from "@/lib/kits/server";

const schema = z.object({ type: z.enum(["page_ouverte", "texte_copie", "image_telechargee"]) });

/** Le partenaire a ouvert sa page, copié le texte ou téléchargé l'image (relances ciblées). */
export async function POST(req: NextRequest, { params }: { params: { slug: string; code: string } }) {
  if (isLinkPreviewBot(req.headers.get("user-agent"))) return NextResponse.json({ ok: true });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const ctx = await publicKit(params.slug, decodeURIComponent(params.code).toUpperCase());
  if (!ctx) return NextResponse.json({ error: "notFound" }, { status: 404 });
  await prisma.kitView.create({ data: { kitId: ctx.kit.id, partnerId: ctx.partner.id, type: body.data.type } });
  return NextResponse.json({ ok: true });
}
