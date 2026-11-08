import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { isPortalHost } from "./host";
import { getPortalSession } from "./session";

/** Les API de l'espace étudiant ne répondent que sur son sous-domaine (le cookie y est rattaché). */
export function onPortalHost(req: NextRequest) {
  return isPortalHost(req.headers.get("x-forwarded-host") || req.headers.get("host") || "");
}

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Session obligatoire : renvoie la session, ou une réponse 401/404 à retourner telle quelle. */
export async function requirePortalSession(req: NextRequest) {
  if (!onPortalHost(req)) return { error: json({ error: "notFound" }, 404) } as const;
  const session = await getPortalSession();
  if (!session) return { error: json({ error: "unauthenticated" }, 401) } as const;
  return { session } as const;
}
