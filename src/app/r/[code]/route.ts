import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { findPartnerByCode } from "@/lib/points";
import { defaultLocale } from "@/i18n/config";

/**
 * Lien de parrainage court : /r/AUDY-012 -> journalise le clic puis redirige
 * vers le formulaire avec ?ref=AUDY-012 (repris côté client en sessionStorage).
 */
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const partner = await findPartnerByCode(params.code);

  if (partner) {
    await prisma.referralEvent.create({
      data: {
        partnerId: partner.id,
        type: "LINK_CLICK",
        userAgent: req.headers.get("user-agent") || undefined,
      },
    });
  }

  const url = new URL(`/${defaultLocale}/postuler`, req.url);
  url.searchParams.set("ref", params.code.toUpperCase());
  return NextResponse.redirect(url);
}
