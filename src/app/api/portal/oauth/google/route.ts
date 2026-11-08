import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";

import { onPortalHost } from "@/lib/portal/guard";
import { PORTAL_OAUTH_COOKIE as OAUTH_COOKIE } from "@/lib/portal/host";



/** Connexion Google (espace étudiant) : redirection vers Google, avec state + PKCE. */
export async function GET(req: NextRequest) {
  if (!onPortalHost(req) || !process.env.AUTH_GOOGLE_ID) return NextResponse.json({ error: "notFound" }, { status: 404 });
  const locale = req.nextUrl.searchParams.get("locale") === "en" ? "en" : "fr";
  const next = req.nextUrl.searchParams.get("next") || "";
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID,
    redirect_uri: `${req.nextUrl.origin}/api/portal/oauth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, verifier, locale, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/portal/oauth",
    maxAge: 600,
  });
  return res;
}
