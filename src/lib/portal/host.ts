/**
 * Espace étudiant : sous-domaine dédié (odysseo-application.vercel.app, application.localhost
 * en développement). Partagé par le middleware, les e-mails et les pages.
 */
export const PORTAL_HOSTNAME = (process.env.PORTAL_HOSTNAME || "odysseo-application.vercel.app").split(":")[0];

export function isPortalHost(host: string) {
  const bare = host.split(":")[0];
  return bare === PORTAL_HOSTNAME || bare.startsWith("application.");
}

/** Adresse absolue d'une page de l'espace étudiant (liens des e-mails). */
export function portalUrl(path: string) {
  const base = process.env.PORTAL_URL || `https://${PORTAL_HOSTNAME}`;
  return `${base.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Chemins publics de l'espace (sans session) : connexion, activation, mot de passe oublié. */
export const PORTAL_PUBLIC_PATHS = ["/espace/connexion", "/espace/activer", "/espace/mot-de-passe-oublie", "/espace/reinitialiser"];

export const PORTAL_COOKIE = "odysseo_portal";
export const PORTAL_OAUTH_COOKIE = "odysseo_portal_oauth";
