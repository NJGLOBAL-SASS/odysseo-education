import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { auth } from "@/lib/auth";
import { ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE } from "@/lib/documents";
import { BLOB_PREFIX, blobConfigured } from "@/lib/documents-server";

/**
 * Jeton d'envoi direct navigateur → Vercel Blob (contourne la limite de 4,5 Mo
 * du corps de requête des fonctions Vercel). Le fichier n'est rattaché à un
 * dossier qu'ensuite, par POST /api/documents, qui vérifie qu'il existe bien.
 */
export async function POST(req: NextRequest) {
  if (!blobConfigured()) return NextResponse.json({ error: "storageNotConfigured" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth();
        if (!session?.user) throw new Error("Non authentifié.");
        if (!pathname.startsWith(BLOB_PREFIX)) throw new Error("Chemin refusé.");
        return {
          allowedContentTypes: [...ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "uploadFailed" }, { status: 400 });
  }
}
