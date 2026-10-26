import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { findPartnerByCode } from "@/lib/points";
import { locales, defaultLocale } from "@/i18n/config";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE,
  isLinkPreviewBot,
  publicSiteUrl,
} from "@/lib/referral";

/**
 * Lien de parrainage court : /r/AUDY-012 -> journalise le clic puis redirige
 * vers le formulaire du site public avec ?ref=AUDY-012. Le formulaire
 * pré-remplit alors le parrainage tout seul ; un cookie de 30 jours garde
 * l'attribution si le candidat revient plus tard.
 */
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code).trim().toUpperCase();
  const partner = await findPartnerByCode(code);
  const userAgent = req.headers.get("user-agent");

  if (partner && !isLinkPreviewBot(userAgent)) {
    await prisma.referralEvent.create({
      data: { partnerId: partner.id, type: "LINK_CLICK", userAgent: userAgent || undefined },
    });
  }

  const lang = req.nextUrl.searchParams.get("lang");
  const locale = locales.find((l) => l === lang) || defaultLocale;
  const url = new URL(`/${locale}/postuler`, publicSiteUrl());
  if (partner) url.searchParams.set("ref", partner.referralCode);

  const res = NextResponse.redirect(url);
  if (partner) {
    res.cookies.set(REFERRAL_COOKIE, partner.referralCode, {
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}
