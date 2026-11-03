import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { previewKind } from "@/lib/documents";
import { canDelete, deleteBlobs, logDocumentActivity } from "@/lib/documents-server";

// Une même consultation déclenche parfois plusieurs requêtes (lecteur PDF, vidéo,
// rechargement) : on ne journalise qu'une fois par personne, fichier et action dans cet intervalle.
const DEDUP_MS = 2 * 60 * 1000;

function contentDisposition(type: "inline" | "attachment", name: string) {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * Sert un fichier privé à un membre connecté : ?mode=view pour l'aperçu dans
 * l'application, ?mode=download pour le télécharger. Chaque accès est journalisé.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const file = await prisma.documentFile.findUnique({ where: { id: params.id }, include: { folder: true } });
  if (!file) return NextResponse.json({ error: "notFound" }, { status: 404 });

  // Seuls les formats inoffensifs s'affichent dans le navigateur ; le reste est
  // toujours proposé en téléchargement (jamais de HTML / SVG exécuté sur notre domaine).
  const download = req.nextUrl.searchParams.get("mode") === "download" || previewKind(file.contentType) === "none";
  const action = download ? "DOWNLOAD" : "VIEW";

  const blob = await get(file.blobUrl, { access: "private" }).catch(() => null);
  if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: "storageUnavailable" }, { status: 502 });

  const recent = await prisma.documentActivity.findFirst({
    where: { fileId: file.id, userId: session.user.id, action, createdAt: { gt: new Date(Date.now() - DEDUP_MS) } },
    select: { id: true },
  });
  if (!recent) {
    await logDocumentActivity(prisma, { action, actor: session.user, folder: file.folder, file, req });
  }

  const headers: Record<string, string> = {
    "Content-Type": file.contentType,
    "Content-Length": String(blob.blob.size),
    "Content-Disposition": contentDisposition(download ? "attachment" : "inline", file.name),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  // Le lecteur PDF de Chrome refuse de s'afficher dans un document « sandbox ».
  if (file.contentType !== "application/pdf") headers["Content-Security-Policy"] = "sandbox; default-src 'none'";

  return new Response(blob.stream, { headers });
}

/** Supprime un fichier d'un lot (auteur de l'envoi ou administrateur). */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const file = await prisma.documentFile.findUnique({ where: { id: params.id }, include: { folder: true } });
  if (!file) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (!canDelete(session.user, file.uploadedById)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.$transaction([
    prisma.documentFile.delete({ where: { id: file.id } }),
    logDocumentActivity(prisma, { action: "DELETE_FILE", actor: session.user, folder: file.folder, file, req, deleted: "file" }),
  ]);
  await deleteBlobs([file.blobUrl]);

  return NextResponse.json({ ok: true });
}
