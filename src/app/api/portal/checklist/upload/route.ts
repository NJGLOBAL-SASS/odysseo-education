import type { NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { prisma } from "@/lib/prisma";
import { BLOB_PREFIX, blobConfigured } from "@/lib/documents-server";
import { json, onPortalHost } from "@/lib/portal/guard";
import { getPortalSession } from "@/lib/portal/session";
import { contentTypesFor } from "@/lib/admission/file-type";

/**
 * Jeton d'envoi direct navigateur → stockage privé, pour un document de la checklist.
 * Chemin imposé : documents/espace/checklist/{code}/{document}/{AAAAMMJJ-HHMMSS}-{n}.{ext}
 * (jamais le nom d'origine) ; taille et formats propres au document.
 */
export async function POST(req: NextRequest) {
  if (!onPortalHost(req)) return json({ error: "notFound" }, 404);
  if (!blobConfigured()) return json({ error: "storageNotConfigured" }, 503);
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return json({ error: "invalid" }, 400);
  try {
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await getPortalSession();
        if (!session || session.role !== "STUDENT") throw new Error("Non autorisé.");
        const itemId = (JSON.parse(clientPayload || "{}") as { itemId?: string }).itemId;
        const item = itemId
          ? await prisma.checklistItem.findFirst({ where: { id: itemId, candidateId: session.candidateId, removedAt: null } })
          : null;
        if (!item || item.kind !== "fichier" || item.status === "valide") throw new Error("Document refusé.");
        const prefix = `${BLOB_PREFIX}espace/checklist/${session.candidate.code}/${item.key}/`;
        if (!pathname.startsWith(prefix) || !/^\d{8}-\d{6}-\d+\.[a-z0-9]{2,4}$/.test(pathname.slice(prefix.length))) {
          throw new Error("Chemin refusé.");
        }
        return { allowedContentTypes: contentTypesFor(item.formats), maximumSizeInBytes: item.maxMb * 1024 * 1024, addRandomSuffix: true };
      },
    });
    return json(result);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "uploadFailed" }, 400);
  }
}
