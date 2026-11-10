import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logDocumentActivity, uploadedFilesSchema, verifyUploadedFiles } from "@/lib/documents-server";
import { notifyPortalAccounts } from "@/lib/notifications";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("review"), status: z.enum(["valide", "a_refaire"]), comment: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal("remove") }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("prepared"), files: uploadedFilesSchema }),
]);

/** Équipe : valider / faire refaire un document, le retirer, déposer un document préparé par Odysseo. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return bad("Non authentifié.", 401);
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return bad("invalid");
  const item = await prisma.checklistItem.findUnique({ where: { id: params.id } });
  if (!item) return bad("notFound", 404);
  const who = session.user.name || session.user.email || "Équipe";
  const d = body.data;

  if (d.action === "remove" || d.action === "restore") {
    await prisma.checklistItem.update({ where: { id: item.id }, data: { removedAt: d.action === "remove" ? new Date() : null } });
    return NextResponse.json({ ok: true });
  }

  if (d.action === "review") {
    if (item.kind === "prepare") return bad("invalid");
    if (d.status === "a_refaire" && !d.comment) return bad("commentRequired");
    await prisma.checklistItem.update({
      where: { id: item.id },
      data: { status: d.status, teamComment: d.status === "a_refaire" ? d.comment : null, reviewedAt: new Date(), reviewedByName: who },
    });
    if (d.status === "a_refaire") {
      notifyPortalAccounts(
        item.candidateId,
        "document",
        { fr: `Document à refaire : ${item.labelFr}. ${d.comment}`, en: `Document to redo: ${item.labelEn}. ${d.comment}` },
        "/espace/documents",
      ).catch(() => undefined);
    }
    return NextResponse.json({ ok: true });
  }

  // Document préparé par Odysseo (CV, lettre…) : déposé par l'équipe, à valider par l'étudiant.
  if (item.kind !== "prepare") return bad("invalid");
  const files = await verifyUploadedFiles(d.files);
  if (!files) return bad("fileMissing");
  const actor = { id: session.user.id, name: session.user.name, email: session.user.email };
  await prisma.$transaction(async (tx) => {
    const folder = item.folderId
      ? await tx.documentFolder.findUniqueOrThrow({ where: { id: item.folderId } })
      : await tx.documentFolder.create({ data: { kind: item.key, title: item.labelFr, candidateId: item.candidateId, createdById: actor.id, visibleToCandidate: false } });
    for (const f of files) {
      const file = await tx.documentFile.create({ data: { ...f, folderId: folder.id, uploadedById: actor.id } });
      await logDocumentActivity(tx, { action: "UPLOAD", actor, folder, file, req });
    }
    await tx.checklistItem.update({ where: { id: item.id }, data: { folderId: folder.id, status: "a_valider", studentComment: null, submittedAt: new Date() } });
  }, { timeout: 20_000 });
  notifyPortalAccounts(
    item.candidateId,
    "document",
    { fr: `${item.labelFr} est prêt : relisez-le et validez-le dans votre espace.`, en: `${item.labelEn} is ready: read it and approve it in your space.` },
    "/espace/documents",
  ).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
