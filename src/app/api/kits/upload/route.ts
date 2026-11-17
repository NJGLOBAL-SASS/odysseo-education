import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { auth } from "@/lib/auth";
import { blobConfigured } from "@/lib/documents-server";
import { FLYER_MAX_MB, FLYER_TYPES } from "@/lib/kits/rules";
import { FLYER_PREFIX } from "@/lib/kits/server";

/** Jeton d'envoi du flyer d'un kit (équipe), stockage privé. */
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
        if (!session?.user) throw new Error("Non autorisé.");
        if (!pathname.startsWith(FLYER_PREFIX) || !/^\d{8}-\d{6}-\d+\.(jpg|png)$/.test(pathname.slice(FLYER_PREFIX.length))) throw new Error("Chemin refusé.");
        return { allowedContentTypes: FLYER_TYPES, maximumSizeInBytes: FLYER_MAX_MB * 1024 * 1024, addRandomSuffix: true };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "uploadFailed" }, { status: 400 });
  }
}
