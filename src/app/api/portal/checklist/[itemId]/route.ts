import type { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { BLOB_PREFIX, deleteBlobs, logDocumentActivity, verifyUploadedFiles } from "@/lib/documents-server";
import { json, requirePortalSession } from "@/lib/portal/guard";
import { allowAttempt } from "@/lib/portal/rate-limit";
import { acceptedTypes, sniffFileType } from "@/lib/admission/file-type";
import { notifyTeamFromPortal } from "@/lib/notifications";

const filesSchema = z.object({
  action: z.literal("files"),
  files: z.array(z.object({ url: z.string().url(), name: z.string().trim().min(1).max(255) })).min(1).max(10),
  language: z.enum(["fr", "en", "zh", "other"]),
  passportExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const referee = z.object({
  nom: z.string().trim().min(2).max(100),
  titre: z.string().trim().min(2).max(100),
  etablissement: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(160),
  whatsapp: z.string().trim().max(30).optional().default(""),
});
const schema = z.discriminatedUnion("action", [
  filesSchema,
  z.object({ action: z.literal("form"), referees: z.array(referee).length(2) }),
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("requestChange"), comment: z.string().trim().min(3).max(1000) }),
]);

/** Premiers octets d'un fichier du stockage privé (contrôle de la signature). */
async function firstBytes(url: string) {
  const blob = await get(url, { access: "private" }).catch(() => null);
  if (!blob || blob.statusCode !== 200) return null;
  const reader = blob.stream.getReader();
  const { value } = await reader.read();
  reader.cancel().catch(() => undefined);
  return value ?? null;
}

/** Actions de l'étudiant sur un document de sa checklist : envoi, formulaire, validation d'un document préparé. */
export async function POST(req: NextRequest, { params }: { params: { itemId: string } }) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const s = auth.session;
  if (s.role !== "STUDENT") return json({ error: "studentOnly" }, 403);
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "invalid" }, 400);
  const item = await prisma.checklistItem.findFirst({ where: { id: params.itemId, candidateId: s.candidateId, removedAt: null } });
  if (!item) return json({ error: "notFound" }, 404);
  const actor = { id: s.id, name: s.name, email: s.email, portal: true };
  const d = body.data;

  if (d.action === "approve" || d.action === "requestChange") {
    if (item.kind !== "prepare" || item.status !== "a_valider") return json({ error: "invalidState" }, 409);
    await prisma.checklistItem.update({
      where: { id: item.id },
      data: d.action === "approve" ? { status: "valide", studentComment: null } : { status: "modification_demandee", studentComment: d.comment },
    });
    const text = d.action === "approve" ? `Document validé : ${item.labelFr}` : `Modification demandée — ${item.labelFr} : ${d.comment}`;
    notifyTeamFromPortal(s.candidate, "document", s.name, text).catch(() => undefined);
    return json({ ok: true });
  }

  if (item.status === "valide") return json({ error: "alreadyValidated" }, 409);

  if (d.action === "form") {
    if (item.kind !== "formulaire") return json({ error: "invalid" }, 400);
    await prisma.checklistItem.update({ where: { id: item.id }, data: { formData: d.referees, status: "recu", submittedAt: new Date(), teamComment: null } });
    await notifyDocs(s.candidate, s.name, item.labelFr);
    return json({ ok: true });
  }

  // Envoi de fichiers.
  if (item.kind !== "fichier") return json({ error: "invalid" }, 400);
  const report = await prisma.admissionReport.findUnique({ where: { candidateId: s.candidateId }, select: { documentsConsentAt: true } });
  if (!report?.documentsConsentAt) return json({ error: "consentRequired" }, 409);
  const prefix = `${BLOB_PREFIX}espace/checklist/${s.candidate.code}/${item.key}/`;
  if (!d.files.every((f) => new URL(f.url).pathname.slice(1).startsWith(prefix))) return json({ error: "invalid" }, 400);
  const files = await verifyUploadedFiles(d.files);
  if (!files) return json({ error: "fileMissing" }, 400);

  // Taille et type réel (signature) : tout fichier refusé est supprimé du stockage.
  const allowed = acceptedTypes(item.formats);
  for (const f of files) {
    const type = f.size <= item.maxMb * 1024 * 1024 ? sniffFileType((await firstBytes(f.blobUrl)) ?? new Uint8Array()) : null;
    if (!type || !allowed.has(type)) {
      await deleteBlobs(files.map((x) => x.blobUrl));
      return json({ error: f.size > item.maxMb * 1024 * 1024 ? "tooBig" : "badType", name: f.name }, 400);
    }
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const folder = item.folderId
      ? await tx.documentFolder.findUniqueOrThrow({ where: { id: item.folderId } })
      : await tx.documentFolder.create({ data: { kind: item.key, title: item.labelFr, candidateId: s.candidateId, visibleToCandidate: false } });
    for (const f of files) {
      const file = await tx.documentFile.create({ data: { ...f, folderId: folder.id, uploadedByPortalId: s.id } });
      await logDocumentActivity(tx, { action: "UPLOAD", actor, folder, file, req });
    }
    await tx.checklistItem.update({
      where: { id: item.id },
      data: {
        folderId: folder.id,
        status: "recu",
        submittedAt: now,
        teamComment: null,
        documentLanguage: d.language,
        ...(d.passportExpiry && { passportExpiry: new Date(`${d.passportExpiry}T00:00:00Z`) }),
      },
    });
    // Document en français ou dans une autre langue : tâche « Traduction » pour l'équipe.
    if ((d.language === "fr" || d.language === "other") && !(await tx.translationTask.findFirst({ where: { itemId: item.id, doneAt: null } }))) {
      await tx.translationTask.create({ data: { candidateId: s.candidateId, itemId: item.id, language: d.language } });
    }
  });
  await notifyDocs(s.candidate, s.name, `${item.labelFr} (${files.length} fichier${files.length > 1 ? "s" : ""})`);
  return json({ ok: true });
}

/** Alerte l'équipe au plus une fois par heure et par dossier (le compteur « À traiter » fait le reste). */
async function notifyDocs(candidate: { id: string; code: string; fullName: string }, author: string, detail: string) {
  if (!(await allowAttempt(`checklist-notif:${candidate.id}`, 1, 3600_000))) return;
  notifyTeamFromPortal(candidate, "document", author, `Checklist : ${detail}`).catch((err) => console.error("[portal] alerte documents :", err));
}
