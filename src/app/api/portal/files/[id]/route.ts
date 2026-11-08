import type { NextRequest } from "next/server";
import { get } from "@vercel/blob";

import { prisma } from "@/lib/prisma";
import { previewKind } from "@/lib/documents";
import { deleteBlobs, logDocumentActivity } from "@/lib/documents-server";
import { json, requirePortalSession } from "@/lib/portal/guard";
import { canPortalSeeFolder } from "@/lib/portal/documents";

function contentDisposition(type: "inline" | "attachment", name: string) {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** Sert un fichier visible par le compte (aperçu ou téléchargement), journalisé. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const file = await prisma.documentFile.findUnique({ where: { id: params.id }, include: { folder: true } });
  if (!file || !canPortalSeeFolder(file.folder, auth.session.candidateId)) return json({ error: "notFound" }, 404);

  const download = req.nextUrl.searchParams.get("mode") === "download" || previewKind(file.contentType) === "none";
  const blob = await get(file.blobUrl, { access: "private" }).catch(() => null);
  if (!blob || blob.statusCode !== 200) return json({ error: "storageUnavailable" }, 502);

  const s = auth.session;
  await logDocumentActivity(prisma, {
    action: download ? "DOWNLOAD" : "VIEW",
    actor: { id: s.id, name: s.name, email: s.email, portal: true },
    folder: file.folder,
    file,
    req,
  });
  const headers: Record<string, string> = {
    "Content-Type": file.contentType,
    "Content-Length": String(blob.blob.size),
    "Content-Disposition": contentDisposition(download ? "attachment" : "inline", file.name),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (file.contentType !== "application/pdf") headers["Content-Security-Policy"] = "sandbox; default-src 'none'";
  return new Response(blob.stream, { headers });
}

/** Supprime un fichier que ce compte a lui-même envoyé (le lot vide est supprimé aussi). */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const s = auth.session;
  const file = await prisma.documentFile.findUnique({ where: { id: params.id }, include: { folder: { include: { _count: { select: { files: true } } } } } });
  if (!file || file.folder.candidateId !== s.candidateId || file.uploadedByPortalId !== s.id) return json({ error: "notFound" }, 404);

  const actor = { id: s.id, name: s.name, email: s.email, portal: true };
  const lastFile = file.folder._count.files <= 1;
  await prisma.$transaction([
    prisma.documentFile.delete({ where: { id: file.id } }),
    logDocumentActivity(prisma, { action: "DELETE_FILE", actor, folder: file.folder, file, req, deleted: "file" }),
    ...(lastFile ? [prisma.documentFolder.delete({ where: { id: file.folder.id } })] : []),
  ]);
  await deleteBlobs([file.blobUrl]);
  return json({ ok: true });
}
