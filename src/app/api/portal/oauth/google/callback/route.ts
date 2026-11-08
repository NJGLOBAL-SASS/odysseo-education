import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { onPortalHost } from "@/lib/portal/guard";
import { startPortalSession } from "@/lib/portal/session";
import { PORTAL_OAUTH_COOKIE as OAUTH_COOKIE } from "@/lib/portal/host";

/**
 * Retour de Google : échange du code côté serveur (PKCE), lecture de l'e-mail vérifié,
 * puis connexion SEULEMENT si un compte de l'espace étudiant existe pour cette adresse
 * (comptes créés par l'équipe ; Google ne crée jamais de compte).
 */
export async function GET(req: NextRequest) {
  if (!onPortalHost(req)) return NextResponse.json({ error: "notFound" }, { status: 404 });
  let saved: { state?: string; verifier?: string; locale?: string; next?: string } = {};
  try {
    saved = JSON.parse(req.cookies.get(OAUTH_COOKIE)?.value || "{}");
  } catch {
    /* cookie absent ou altéré */
  }
  const locale = saved.locale === "en" ? "en" : "fr";
  const fail = (code: string) => {
    const res = NextResponse.redirect(new URL(`/${locale}/espace/connexion?error=${code}`, req.nextUrl.origin));
    res.cookies.set(OAUTH_COOKIE, "", { path: "/api/portal/oauth", maxAge: 0 });
    return res;
  };

  const code = req.nextUrl.searchParams.get("code");
  if (!code || !saved.state || saved.state !== req.nextUrl.searchParams.get("state") || !saved.verifier) return fail("google");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID ?? "",
        client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
        code,
        code_verifier: saved.verifier,
        grant_type: "authorization_code",
        redirect_uri: `${req.nextUrl.origin}/api/portal/oauth/google/callback`,
      }),
    });
    if (!tokenRes.ok) return fail("google");
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
    if (!infoRes.ok) return fail("google");
    const info = (await infoRes.json()) as { email?: string; email_verified?: boolean };
    const email = info.email?.trim().toLowerCase();
    if (!email || info.email_verified !== true) return fail("google");

    const account = await prisma.portalAccount.findFirst({ where: { email: { equals: email, mode: "insensitive" }, disabledAt: null } });
    if (!account) return fail("googleUnknown");
    if (!account.activatedAt) await prisma.portalAccount.update({ where: { id: account.id }, data: { activatedAt: new Date() } });
    await startPortalSession(account);

    const next = saved.next && /^\/(fr|en)\/espace(\/|$)/.test(saved.next) ? saved.next : `/${locale}/espace`;
    const res = NextResponse.redirect(new URL(next, req.nextUrl.origin));
    res.cookies.set(OAUTH_COOKIE, "", { path: "/api/portal/oauth", maxAge: 0 });
    return res;
  } catch (err) {
    console.error("[portal] Google :", err);
    return fail("google");
  }
}
