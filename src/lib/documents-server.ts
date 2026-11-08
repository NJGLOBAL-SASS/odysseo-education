import type { NextRequest } from "next/server";
import type { DocumentAction, Prisma } from "@prisma/client";
import { del, head } from "@vercel/blob";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { MAX_FILES_PER_UPLOAD } from "@/lib/documents";

/** `portal` : action faite depuis l'espace étudiant (id = PortalAccount.id). */
type Actor = { id: string; name?: string | null; email?: string | null; portal?: boolean };

/** Les fichiers sont toujours rangés sous ce préfixe du store Blob. */
export const BLOB_PREFIX = "documents/";

export function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Écrit une ligne au journal des documents (avec IP / navigateur si une requête est fournie). */
export function logDocumentActivity(
  db: Prisma.TransactionClient | typeof prisma,
  entry: {
    action: DocumentAction;
    actor: Actor;
    folder: { id: string; title: string; candidateId: string | null };
    file?: { id: string; name: string };
    req?: NextRequest;
    /** Élément supprimé dans la même transaction : la ligne ne peut plus le référencer, les noms suffisent. */
    deleted?: "file" | "folder";
  }
) {
  const { action, actor, folder, file, req, deleted } = entry;
  return db.documentActivity.create({
    data: {
      action,
      userId: actor.portal ? null : actor.id,
      portalAccountId: actor.portal ? actor.id : null,
      actorName: actor.name || actor.email || null,
      folderId: deleted === "folder" ? null : folder.id,
      fileId: deleted || !file ? null : file.id,
      candidateId: folder.candidateId,
      folderTitle: folder.title,
      fileName: file?.name ?? null,
      ip: req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: req?.headers.get("user-agent")?.slice(0, 300) || null,
    },
  });
}

/** Suppression des fichiers dans le store : une erreur ici ne doit pas bloquer la suppression en base. */
export async function deleteBlobs(urls: string[]) {
  if (urls.length === 0 || !blobConfigured()) return;
  await del(urls).catch((err) => console.error("[documents] suppression Blob échouée :", err));
}

/** Seuls l'auteur d'un envoi et les administrateurs peuvent supprimer. */
export function canDelete(user: { id: string; role?: string }, authorId: string | null) {
  return user.role === "ADMIN" || (authorId !== null && authorId === user.id);
}

export const folderInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { name: true, email: true } },
  uploadedByPortal: { select: { name: true, role: true } },
  files: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      size: true,
      contentType: true,
      createdAt: true,
      uploadedById: true,
      uploadedByPortalId: true,
      uploadedBy: { select: { name: true, email: true } },
    },
  },
} satisfies Prisma.DocumentFolderInclude;

export type FolderWithFiles = Prisma.DocumentFolderGetPayload<{ include: typeof folderInclude }>;

export const activityInclude = {
  candidate: { select: { id: true, code: true, fullName: true } },
} satisfies Prisma.DocumentActivityInclude;

export const uploadedFilesSchema = z
  .array(
    z.object({
      url: z.string().url(),
      name: z.string().trim().min(1).max(255),
    })
  )
  .min(1)
  .max(MAX_FILES_PER_UPLOAD);

/**
 * Vérifie auprès de Vercel Blob que chaque fichier annoncé a bien été envoyé dans
 * notre store : taille et type viennent du store, pas du navigateur.
 */
export async function verifyUploadedFiles(files: z.infer<typeof uploadedFilesSchema>) {
  const checked = [];
  for (const f of files) {
    const meta = await head(f.url).catch(() => null);
    if (!meta || !meta.pathname.startsWith(BLOB_PREFIX)) return null;
    checked.push({ name: f.name, blobUrl: meta.url, size: meta.size, contentType: meta.contentType });
  }
  return checked;
}
