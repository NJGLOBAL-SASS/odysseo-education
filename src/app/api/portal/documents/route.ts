import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { CANDIDATE_DOCUMENT_KINDS } from "@/lib/documents";
import { blobConfigured, logDocumentActivity, uploadedFilesSchema, verifyUploadedFiles } from "@/lib/documents-server";
import { json, requirePortalSession } from "@/lib/portal/guard";
import { portalFolderWhere, toPortalFolder } from "@/lib/portal/documents";
import { notifyTeamFromPortal } from "@/lib/notifications";

/** Documents visibles par le compte : ses envois (et ceux de l'étudiant / du parent) + ceux approuvés par l'équipe. */
export async function GET(req: NextRequest) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const folders = await prisma.documentFolder.findMany({
    where: portalFolderWhere(auth.session.candidateId),
    orderBy: { createdAt: "desc" },
    include: { files: { orderBy: { createdAt: "asc" } }, uploadedByPortal: { select: { name: true, role: true } } },
  });
  return json({ folders: folders.map((f) => toPortalFolder(f, auth.session.id)), storageReady: blobConfigured() });
}

const schema = z.object({
  kind: z.enum(CANDIDATE_DOCUMENT_KINDS),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  files: uploadedFilesSchema,
});

/** L'étudiant / le parent envoie un lot de documents à l'équipe. */
export async function POST(req: NextRequest) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "invalid" }, 400);
  if (!body.data.files.every((f) => new URL(f.url).pathname.includes("/documents/espace/"))) return json({ error: "invalid" }, 400);
  const files = await verifyUploadedFiles(body.data.files);
  if (!files) return json({ error: "fileMissing" }, 400);

  const s = auth.session;
  const actor = { id: s.id, name: s.name, email: s.email, portal: true };
  await prisma.$transaction(async (tx) => {
    const folder = await tx.documentFolder.create({
      data: {
        kind: body.data.kind,
        title: body.data.title,
        description: body.data.description || null,
        candidateId: s.candidateId,
        uploadedByPortalId: s.id,
        visibleToCandidate: true,
      },
    });
    for (const f of files) {
      const file = await tx.documentFile.create({ data: { ...f, folderId: folder.id, uploadedByPortalId: s.id } });
      await logDocumentActivity(tx, { action: "UPLOAD", actor, folder, file, req });
    }
  });
  notifyTeamFromPortal(s.candidate, "document", s.name, `${body.data.title} (${files.length} fichier${files.length > 1 ? "s" : ""})`).catch((err) =>
    console.error("[portal] alerte équipe :", err),
  );
  return json({ ok: true });
}
