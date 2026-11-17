import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QR_POSITIONS, type QrPosition } from "@/lib/kits/rules";
import { loadFlyer, partnerFlyer } from "@/lib/kits/image";
import { partnerKitContent } from "@/lib/kits/server";

export const runtime = "nodejs";

/** Aperçu du flyer personnalisé pour un partenaire exemple (écran de création), position au choix. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const kit = await prisma.kit.findUnique({ where: { id: params.id } });
  if (!kit?.imageUrl) return NextResponse.json({ error: "notFound" }, { status: 404 });
  const asked = req.nextUrl.searchParams.get("position") as QrPosition | null;
  const position = asked && (QR_POSITIONS as readonly string[]).includes(asked) ? asked : (kit.qrPosition as QrPosition);
  const sample = partnerKitContent(kit, { fullName: "Exemple", referralCode: "ODY-000" });
  const image = await partnerFlyer(await loadFlyer(kit.imageUrl), { link: sample.link, code: "ODY-000", position });
  return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" } });
}
