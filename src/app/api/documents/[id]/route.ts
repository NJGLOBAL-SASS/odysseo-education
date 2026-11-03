import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentKinds } from "@/lib/documents";
import { canDelete, deleteBlobs, folderInclude, logDocumentActivity } from "@/lib/documents-server";

const patchSchema = z.object({
  kind: z.string().optional(),
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
});

/** Modifie le type, le nom ou la description d'un lot de documents. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const existing = await prisma.documentFolder.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (body.data.kind && !documentKinds(existing.candidateId ? "candidate" : "internal").includes(body.data.kind)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const folder = await prisma.$transaction(async (tx) => {
    const updated = await tx.documentFolder.update({
      where: { id: params.id },
      data: { ...body.data, description: body.data.description === undefined ? undefined : body.data.description || null },
      include: folderInclude,
    });
    await logDocumentActivity(tx, { action: "UPDATE", actor: session.user, folder: updated, req });
    return updated;
  });
  return NextResponse.json({ folder });
}

/** Supprime le lot et tous ses fichiers (auteur ou administrateur). Le journal garde la trace. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const folder = await prisma.documentFolder.findUnique({ where: { id: params.id }, include: { files: true } });
  if (!folder) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (!canDelete(session.user, folder.createdById)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.$transaction([
    prisma.documentFolder.delete({ where: { id: folder.id } }),
    logDocumentActivity(prisma, { action: "DELETE_FOLDER", actor: session.user, folder, req, deleted: "folder" }),
  ]);
  await deleteBlobs(folder.files.map((f) => f.blobUrl));

  return NextResponse.json({ ok: true });
}
