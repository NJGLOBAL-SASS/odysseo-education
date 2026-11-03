import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { folderInclude, logDocumentActivity, uploadedFilesSchema, verifyUploadedFiles } from "@/lib/documents-server";

const schema = z.object({ files: uploadedFilesSchema });

/** Ajoute des fichiers à un lot existant (ex. le verso d'un passeport reçu plus tard). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const existing = await prisma.documentFolder.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "notFound" }, { status: 404 });

  const files = await verifyUploadedFiles(body.data.files);
  if (!files) return NextResponse.json({ error: "fileMissing" }, { status: 400 });

  const actor = session.user;
  const folder = await prisma.$transaction(async (tx) => {
    for (const f of files) {
      const file = await tx.documentFile.create({ data: { ...f, folderId: existing.id, uploadedById: actor.id } });
      await logDocumentActivity(tx, { action: "UPLOAD", actor, folder: existing, file, req });
    }
    // touche updatedAt pour remonter le lot dans les listes
    return tx.documentFolder.update({ where: { id: existing.id }, data: {}, include: folderInclude });
  });

  return NextResponse.json({ folder });
}
