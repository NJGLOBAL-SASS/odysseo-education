/** Formes JSON renvoyées par /api/documents (dates sérialisées en chaînes). */
export type DocumentFileView = {
  id: string;
  name: string;
  size: number;
  contentType: string;
  createdAt: string;
  uploadedById: string | null;
  uploadedBy: { name: string | null; email: string } | null;
};

export type DocumentFolderView = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  candidateId: string | null;
  createdById: string | null;
  createdBy: { id: string; name: string | null; email: string } | null;
  createdAt: string;
  updatedAt: string;
  files: DocumentFileView[];
};

export type DocumentActivityView = {
  id: string;
  action: "UPLOAD" | "VIEW" | "DOWNLOAD" | "UPDATE" | "DELETE_FILE" | "DELETE_FOLDER";
  actorName: string | null;
  folderTitle: string;
  fileName: string | null;
  ip: string | null;
  createdAt: string;
  candidate: { id: string; code: string; fullName: string } | null;
};

export type CurrentUser = { id: string; role: "ADMIN" | "STAFF" };
