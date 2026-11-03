import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentKinds } from "@/lib/documents";
import {
  blobConfigured,
  folderInclude,
  logDocumentActivity,
  uploadedFilesSchema,
  verifyUploadedFiles,
} from "@/lib/documents-server";

/** Documents d'un dossier candidat (?candidateId=) ou de l'espace Données (sans paramètre). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const candidateId = req.nextUrl.searchParams.get("candidateId");
  const folders = await prisma.documentFolder.findMany({
    where: { candidateId: candidateId || null },
    orderBy: { createdAt: "desc" },
    include: folderInclude,
  });
  return NextResponse.json({ folders, storageReady: blobConfigured() });
}

const createSchema = z.object({
  candidateId: z.string().optional(),
  kind: z.string(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  files: uploadedFilesSchema,
});

/** Crée un lot de documents (type, nom, description, fichiers déjà envoyés sur Blob). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { candidateId, kind, title, description } = body.data;

  if (!documentKinds(candidateId ? "candidate" : "internal").includes(kind)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (candidateId && !(await prisma.candidate.findUnique({ where: { id: candidateId }, select: { id: true } }))) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const files = await verifyUploadedFiles(body.data.files);
  if (!files) return NextResponse.json({ error: "fileMissing" }, { status: 400 });

  const actor = session.user;
  const folder = await prisma.$transaction(async (tx) => {
    const created = await tx.documentFolder.create({
      data: { kind, title, description: description || null, candidateId: candidateId || null, createdById: actor.id },
    });
    for (const f of files) {
      const file = await tx.documentFile.create({ data: { ...f, folderId: created.id, uploadedById: actor.id } });
      await logDocumentActivity(tx, { action: "UPLOAD", actor, folder: created, file, req });
    }
    return tx.documentFolder.findUniqueOrThrow({ where: { id: created.id }, include: folderInclude });
  });

  return NextResponse.json({ folder });
}
