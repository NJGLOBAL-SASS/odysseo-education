import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteBlobs, logDocumentActivity } from "@/lib/documents-server";
import { retentionExpired } from "@/lib/admission/retention";

/**
 * Suppression de tous les documents d'un dossier terminé depuis plus de 12 mois (politique de
 * conservation, PACK-10). Administrateur seulement, après confirmation dans la fiche dossier.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    select: { id: true, stage: true, stageUpdatedAt: true, documentFolders: { include: { files: true } } },
  });
  if (!candidate) return NextResponse.json({ error: "notFound" }, { status: 404 });
  if (!retentionExpired(candidate)) return NextResponse.json({ error: "notExpired" }, { status: 409 });

  const urls = candidate.documentFolders.flatMap((f) => f.files.map((x) => x.blobUrl));
  const actor = { id: session.user.id, name: session.user.name, email: session.user.email };
  await prisma.$transaction([
    ...candidate.documentFolders.map((folder) => logDocumentActivity(prisma, { action: "DELETE_FOLDER", actor, folder, req, deleted: "folder" })),
    prisma.documentFolder.deleteMany({ where: { candidateId: candidate.id } }),
  ]);
  await deleteBlobs(urls);
  return NextResponse.json({ ok: true, files: urls.length });
}
