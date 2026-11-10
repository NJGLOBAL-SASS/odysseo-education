import type { NextRequest } from "next/server";
import { get } from "@vercel/blob";

import { prisma } from "@/lib/prisma";
import { previewKind } from "@/lib/documents";
import { deleteBlobs, logDocumentActivity } from "@/lib/documents-server";
import { json, requirePortalSession } from "@/lib/portal/guard";

function contentDisposition(type: "inline" | "attachment", name: string) {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** Fichier d'un document de la checklist : étudiant du dossier seulement (jamais le parent). */
async function load(req: NextRequest, fileId: string) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return { ok: false, error: auth.error } as const;
  if (auth.session.role !== "STUDENT") return { ok: false, error: json({ error: "notFound" }, 404) } as const;
  const file = await prisma.documentFile.findUnique({ where: { id: fileId }, include: { folder: { include: { checklistItem: true } } } });
  if (!file || file.folder.candidateId !== auth.session.candidateId || !file.folder.checklistItem) {
    return { ok: false, error: json({ error: "notFound" }, 404) } as const;
  }
  return { ok: true, session: auth.session, file, item: file.folder.checklistItem } as const;
}

export async function GET(req: NextRequest, { params }: { params: { fileId: string } }) {
  const r = await load(req, params.fileId);
  if (!r.ok) return r.error;
  const { file, session: s } = r;
  const download = req.nextUrl.searchParams.get("mode") === "download" || previewKind(file.contentType) === "none";
  const blob = await get(file.blobUrl, { access: "private" }).catch(() => null);
  if (!blob || blob.statusCode !== 200) return json({ error: "storageUnavailable" }, 502);
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

/** L'étudiant retire un fichier qu'il a envoyé, tant que le document n'est pas validé. */
export async function DELETE(req: NextRequest, { params }: { params: { fileId: string } }) {
  const r = await load(req, params.fileId);
  if (!r.ok) return r.error;
  const { file, item, session: s } = r;
  if (file.uploadedByPortalId !== s.id || item.status === "valide") return json({ error: "forbidden" }, 403);
  const remaining = await prisma.documentFile.count({ where: { folderId: file.folderId, id: { not: file.id } } });
  await prisma.$transaction([
    prisma.documentFile.delete({ where: { id: file.id } }),
    logDocumentActivity(prisma, {
      action: "DELETE_FILE",
      actor: { id: s.id, name: s.name, email: s.email, portal: true },
      folder: file.folder,
      file,
      req,
      deleted: "file",
    }),
    ...(remaining === 0 ? [prisma.checklistItem.update({ where: { id: item.id }, data: { status: "a_fournir", submittedAt: null } })] : []),
  ]);
  await deleteBlobs([file.blobUrl]);
  return json({ ok: true });
}
