import type { NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { blobConfigured } from "@/lib/documents-server";
import { json, onPortalHost } from "@/lib/portal/guard";
import { getPortalSession } from "@/lib/portal/session";
import { PROOF_MAX_MB, PROOF_TYPES } from "@/lib/payments/rules";
import { proofPrefix } from "@/lib/payments/server";

/**
 * Jeton d'envoi direct navigateur → stockage privé, pour la preuve d'un paiement (étudiant ou parent).
 * Chemin imposé : documents/espace/paiements/{code}/{AAAAMMJJ-HHMMSS}-{n}.{ext}.
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
      onBeforeGenerateToken: async (pathname) => {
        const session = await getPortalSession();
        if (!session) throw new Error("Non autorisé.");
        const prefix = proofPrefix(session.candidate.code, "espace");
        if (!pathname.startsWith(prefix) || !/^\d{8}-\d{6}-\d+\.[a-z0-9]{2,4}$/.test(pathname.slice(prefix.length))) throw new Error("Chemin refusé.");
        return { allowedContentTypes: PROOF_TYPES, maximumSizeInBytes: PROOF_MAX_MB * 1024 * 1024, addRandomSuffix: true };
      },
    });
    return json(result);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "uploadFailed" }, 400);
  }
}
