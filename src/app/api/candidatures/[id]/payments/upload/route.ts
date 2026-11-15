import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { blobConfigured } from "@/lib/documents-server";
import { PROOF_MAX_MB, PROOF_TYPES } from "@/lib/payments/rules";
import { proofPrefix } from "@/lib/payments/server";

/** Jeton d'envoi de la preuve par l'équipe (reçue sur WhatsApp) : documents/equipe/paiements/{code}/… */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
        const candidate = await prisma.candidate.findUnique({ where: { id: params.id }, select: { code: true } });
        if (!candidate) throw new Error("Dossier introuvable.");
        const prefix = proofPrefix(candidate.code, "equipe");
        if (!pathname.startsWith(prefix) || !/^\d{8}-\d{6}-\d+\.[a-z0-9]{2,4}$/.test(pathname.slice(prefix.length))) throw new Error("Chemin refusé.");
        return { allowedContentTypes: PROOF_TYPES, maximumSizeInBytes: PROOF_MAX_MB * 1024 * 1024, addRandomSuffix: true };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "uploadFailed" }, { status: 400 });
  }
}
