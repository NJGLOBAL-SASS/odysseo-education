import type { NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE } from "@/lib/documents";
import { BLOB_PREFIX, blobConfigured } from "@/lib/documents-server";
import { json, onPortalHost } from "@/lib/portal/guard";
import { getPortalSession } from "@/lib/portal/session";

/** Jeton d'envoi direct navigateur → Vercel Blob, pour un compte de l'espace étudiant. */
export async function POST(req: NextRequest) {
  if (!onPortalHost(req)) return json({ error: "notFound" }, 404);
  if (!blobConfigured()) return json({ error: "storageNotConfigured" }, 503);
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return json({ error: "invalid" }, 400);
  try {
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const session = await getPortalSession();
        if (!session) throw new Error("Non authentifié.");
        if (!pathname.startsWith(`${BLOB_PREFIX}espace/`)) throw new Error("Chemin refusé.");
        return { allowedContentTypes: [...ALLOWED_CONTENT_TYPES], maximumSizeInBytes: MAX_FILE_SIZE, addRandomSuffix: true };
      },
    });
    return json(result);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "uploadFailed" }, 400);
  }
}
