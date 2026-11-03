/**
 * Documents : pièces des dossiers candidats et espace « Données » interne.
 * Partagé client / serveur (aucun import serveur ici, voir documents-server.ts).
 */

/** Types de pièces d'un dossier candidat (libellés dans dashboard.documents.kinds). */
export const CANDIDATE_DOCUMENT_KINDS = [
  "passport",
  "transcript",
  "diploma",
  "birthCertificate",
  "photo",
  "cv",
  "motivationLetter",
  "recommendation",
  "languageCertificate",
  "criminalRecord",
  "medical",
  "financial",
  "admission",
  "visa",
  "other",
] as const;

/** Catégories de l'espace Données (documents internes à l'entreprise). */
export const INTERNAL_DOCUMENT_KINDS = [
  "contracts",
  "templates",
  "procedures",
  "marketing",
  "universities",
  "finance",
  "hr",
  "other",
] as const;

export type DocumentScope = "candidate" | "internal";

export function documentKinds(scope: DocumentScope): readonly string[] {
  return scope === "candidate" ? CANDIDATE_DOCUMENT_KINDS : INTERNAL_DOCUMENT_KINDS;
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Mo par fichier
export const MAX_FILES_PER_UPLOAD = 20;

/** Formats acceptés à l'envoi (contrôlés aussi par Vercel Blob au moment de l'upload). */
export const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
] as const;

export const ACCEPT_ATTRIBUTE = [
  ...ALLOWED_CONTENT_TYPES,
  ".pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.zip,.mp4,.mov,.mp3,.m4a,.ogg,.wav",
].join(",");

/** Certains navigateurs ne donnent pas de type MIME (HEIC, docx sous Windows...) : on le déduit de l'extension. */
const EXTENSION_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  zip: "application/zip",
  mp4: "video/mp4",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  wav: "audio/wav",
};

export function resolveContentType(name: string, browserType?: string) {
  if (browserType && (ALLOWED_CONTENT_TYPES as readonly string[]).includes(browserType)) return browserType;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[ext] ?? null;
}

/**
 * Aperçu possible dans l'application. Les autres formats (Word, Excel, zip, HEIC...)
 * se téléchargent : leur rendu fidèle demanderait de les envoyer à un service tiers.
 */
export type PreviewKind = "pdf" | "image" | "video" | "audio" | "text" | "none";

export function previewKind(contentType: string): PreviewKind {
  if (contentType === "application/pdf") return "pdf";
  if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(contentType)) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType === "text/plain" || contentType === "text/csv") return "text";
  return "none";
}

export function formatBytes(bytes: number, locale = "fr") {
  const units = locale === "en" ? ["B", "KB", "MB", "GB"] : ["o", "Ko", "Mo", "Go"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: i === 0 ? 0 : 1 }).format(value)} ${units[i]}`;
}

export function fileUrl(fileId: string, mode: "view" | "download") {
  return `/api/documents/files/${fileId}?mode=${mode}`;
}
