import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { locales, defaultLocale } from "@/i18n/config";
import { isTeamHost } from "@/lib/hosts";
import { PORTAL_COOKIE, PORTAL_PUBLIC_PATHS, isPortalHost } from "@/lib/portal/host";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

// Chemins (hors préfixe de langue) réservés au sous-domaine équipe.
const TEAM_ONLY_PREFIXES = ["/dashboard", "/login", "/verify-2fa", "/forgot-password", "/reset-password"];

/** Déclenche la page 404 native de Next.js (aucune route ne correspond). */
function blockWithNotFound(req: NextRequest, locale: string) {
  return NextResponse.rewrite(new URL(`/${locale}/__route-indisponible-sur-ce-domaine`, req.url));
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Liens de parrainage /r/CODE : route handler hors i18n, valable sur tous
  // les domaines (il redirige lui-même vers le formulaire du site public).
  if (pathname.startsWith("/r/")) return NextResponse.next();

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const onTeamHost = isTeamHost(host);
  const onPortalHost = isPortalHost(host);

  const locale = locales.find((l) => pathname.startsWith(`/${l}`)) || defaultLocale;
  const pathWithoutLocale = pathname.replace(/^\/(fr|en)/, "") || "/";
  const isTeamOnlyPath = TEAM_ONLY_PREFIXES.some((p) => pathWithoutLocale.startsWith(p));
  const isPortalPath = pathWithoutLocale === "/espace" || pathWithoutLocale.startsWith("/espace/");

  // Espace étudiant (odysseo-application.vercel.app) : uniquement /espace, rien du site
  // public ni de l'équipe. Ailleurs, /espace n'existe pas.
  if (onPortalHost) {
    if (pathWithoutLocale === "/") return NextResponse.redirect(new URL(`/${locale}/espace`, req.url));
    if (!isPortalPath) return blockWithNotFound(req, locale);
    const isPublic = PORTAL_PUBLIC_PATHS.some((p) => pathWithoutLocale.startsWith(p));
    if (!isPublic && !req.cookies.get(PORTAL_COOKIE)) {
      const loginUrl = new URL(`/${locale}/espace/connexion`, req.url);
      if (pathWithoutLocale !== "/espace") loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return intlMiddleware(req);
  }
  if (isPortalPath) return blockWithNotFound(req, locale);

  // Site public (odysseo-education.com, previews, etc.) : la zone équipe
  // n'existe tout simplement pas — aucune URL ni aucun lien ne doit y mener.
  if (!onTeamHost && isTeamOnlyPath) {
    return blockWithNotFound(req, locale);
  }

  // Sous-domaine équipe (team.odysseo-education.com) : uniquement la zone
  // équipe, rien du site vitrine (candidat, services, newsletter...).
  if (onTeamHost) {
    if (pathWithoutLocale === "/") {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }
    if (!isTeamOnlyPath) {
      return blockWithNotFound(req, locale);
    }
  }

  if (pathWithoutLocale.startsWith("/dashboard")) {
    const sessionCookie =
      req.cookies.get("authjs.session-token") ?? req.cookies.get("__Secure-authjs.session-token");

    if (!sessionCookie) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
