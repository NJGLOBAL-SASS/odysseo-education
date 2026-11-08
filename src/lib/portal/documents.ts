import type { DocumentFile, DocumentFolder, Prisma } from "@prisma/client";

/**
 * Règle de visibilité de l'espace étudiant : un lot du dossier est visible s'il a été envoyé
 * depuis l'espace (étudiant ou parent) OU approuvé par l'équipe (visibleToCandidate).
 */
export function portalFolderWhere(candidateId: string): Prisma.DocumentFolderWhereInput {
  return { candidateId, OR: [{ visibleToCandidate: true }, { uploadedByPortalId: { not: null } }] };
}

export function canPortalSeeFolder(folder: Pick<DocumentFolder, "candidateId" | "visibleToCandidate" | "uploadedByPortalId">, candidateId: string) {
  return folder.candidateId === candidateId && (folder.visibleToCandidate || folder.uploadedByPortalId !== null);
}

/** Champs renvoyés au navigateur (jamais l'URL Blob, ni les membres de l'équipe). */
export function toPortalFolder(
  f: DocumentFolder & { files: DocumentFile[]; uploadedByPortal: { name: string; role: string } | null },
  myAccountId: string,
) {
  return {
    id: f.id,
    kind: f.kind,
    title: f.title,
    description: f.description,
    createdAt: f.createdAt,
    source: f.uploadedByPortalId ? (f.uploadedByPortalId === myAccountId ? "me" : f.uploadedByPortal?.role === "PARENT" ? "parent" : "student") : "team",
    authorName: f.uploadedByPortal?.name ?? null,
    files: f.files.map((x) => ({
      id: x.id,
      name: x.name,
      size: x.size,
      contentType: x.contentType,
      createdAt: x.createdAt,
      mine: x.uploadedByPortalId === myAccountId,
    })),
  };
}
export type PortalFolder = ReturnType<typeof toPortalFolder>;
