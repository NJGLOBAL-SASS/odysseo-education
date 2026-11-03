"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Download,
  Eye,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  File as FileIcon,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { documentKinds, fileUrl, formatBytes, previewKind, type DocumentScope } from "@/lib/documents";
import { cn } from "@/lib/utils";
import { DocumentUploadDialog } from "./document-upload-dialog";
import { DocumentViewer } from "./document-viewer";
import type { CurrentUser, DocumentFileView, DocumentFolderView } from "./types";

function iconFor(contentType: string) {
  const kind = previewKind(contentType);
  if (kind === "image" || contentType.startsWith("image/")) return FileImage;
  if (kind === "video") return FileVideo;
  if (kind === "audio") return FileAudio;
  if (contentType.includes("zip")) return FileArchive;
  if (contentType.includes("sheet") || contentType.includes("excel") || contentType === "text/csv") return FileSpreadsheet;
  if (kind === "pdf" || kind === "text" || contentType.includes("word") || contentType.includes("document")) return FileText;
  return FileIcon;
}

const canDelete = (user: CurrentUser, authorId: string | null) => user.role === "ADMIN" || (authorId !== null && authorId === user.id);

/** Modification du type, du nom et de la description d'un lot. */
function EditFolderDialog({
  folder,
  scope,
  onClose,
  onSaved,
}: {
  folder: DocumentFolderView;
  scope: DocumentScope;
  onClose: () => void;
  onSaved: (folder: DocumentFolderView) => void;
}) {
  const t = useTranslations("dashboard.documents");
  const tc = useTranslations("dashboard.common");
  const toast = useToast();
  const [kind, setKind] = useState(folder.kind);
  const [title, setTitle] = useState(folder.title);
  const [description, setDescription] = useState(folder.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (title.trim().length < 2) return setError(t("upload.titleRequired"));
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title: title.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      toast({ tone: "success", title: t("edit.saved") });
      onSaved(json.folder);
      onClose();
    } catch {
      setError(tc("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={t("edit.title")}
      icon={<Pencil className="h-5 w-5" />}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button onClick={onClose} disabled={busy} className="btn-sm-ghost">
            {tc("cancel")}
          </button>
          <button onClick={save} disabled={busy} className="btn-sm-dark">
            {busy && <Spinner />} {busy ? tc("saving") : tc("save")}
          </button>
        </>
      }
    >
      <div className="space-y-3 pb-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t("upload.kind")}</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="field-input !min-h-[42px] text-sm">
            {documentKinds(scope).map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t("upload.name")}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="field-input !min-h-[42px] text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">
            {t("upload.description")} <span className="font-normal text-gris">{t("upload.optional")}</span>
          </span>
          <textarea
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="field-input !min-h-0 py-2.5 text-sm"
          />
        </label>
        {error && <p className="text-sm font-semibold text-erreur">{error}</p>}
      </div>
    </Dialog>
  );
}

/** Menu d'actions d'un lot (ajouter des fichiers, modifier, supprimer). */
function FolderMenu({
  onAdd,
  onEdit,
  onDelete,
  deletable,
}: {
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deletable: boolean;
}) {
  const t = useTranslations("dashboard.documents");
  const tc = useTranslations("dashboard.common");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-lg p-1.5 text-gris hover:bg-fond hover:text-noir"
        aria-label={tc("edit")}
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-[10px] border border-bord bg-white py-1 text-sm shadow-pop">
          <button onClick={onAdd} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-fond">
            <Plus className="h-4 w-4" /> {t("addFiles")}
          </button>
          <button onClick={onEdit} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-fond">
            <Pencil className="h-4 w-4" /> {tc("edit")}
          </button>
          <button
            onClick={onDelete}
            disabled={!deletable}
            title={deletable ? undefined : t("deleteForbidden")}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-erreur hover:bg-erreur-fond disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> {t("deleteFolder")}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Gestion des documents d'un dossier candidat (`candidateId`) ou de l'espace
 * Données interne : envoi multi-fichiers, aperçu, téléchargement, suppression.
 */
export function DocumentsManager({
  scope,
  candidateId,
  currentUser,
  onActivity,
  withFilters,
}: {
  scope: DocumentScope;
  candidateId?: string;
  currentUser: CurrentUser;
  /** Appelé après chaque action, pour rafraîchir un journal affiché à côté. */
  onActivity?: () => void;
  withFilters?: boolean;
}) {
  const t = useTranslations("dashboard.documents");
  const tc = useTranslations("dashboard.common");
  const locale = useLocale();
  const toast = useToast();

  const [folders, setFolders] = useState<DocumentFolderView[] | null>(null);
  const [storageReady, setStorageReady] = useState(true);
  const [uploading, setUploading] = useState<{ folder?: DocumentFolderView } | null>(null);
  const [editing, setEditing] = useState<DocumentFolderView | null>(null);
  const [viewer, setViewer] = useState<{ folder: DocumentFolderView; index: number } | null>(null);
  const [deleting, setDeleting] = useState<{ folder: DocumentFolderView; file?: DocumentFileView } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents${candidateId ? `?candidateId=${candidateId}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setFolders(json.folders);
      setStorageReady(json.storageReady);
    } catch {
      setFolders([]);
    }
  }, [candidateId]);

  useEffect(() => {
    load();
  }, [load]);

  function upsert(folder: DocumentFolderView) {
    setFolders((prev) =>
      prev?.some((f) => f.id === folder.id) ? prev.map((f) => (f.id === folder.id ? folder : f)) : [folder, ...(prev ?? [])]
    );
    onActivity?.();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const { folder, file } = deleting;
    try {
      const res = await fetch(file ? `/api/documents/files/${file.id}` : `/api/documents/${folder.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(res.status === 403 ? "forbidden" : "error");
      setFolders((prev) =>
        (prev ?? []).flatMap((f) => {
          if (f.id !== folder.id) return [f];
          if (!file) return [];
          return [{ ...f, files: f.files.filter((x) => x.id !== file.id) }];
        })
      );
      toast({ tone: "success", title: file ? t("deletedFile") : t("deletedFolder"), description: file?.name ?? folder.title });
      setDeleting(null);
      onActivity?.();
    } catch (err) {
      toast({ tone: "error", title: err instanceof Error && err.message === "forbidden" ? t("deleteForbidden") : tc("error") });
    } finally {
      setDeleteBusy(false);
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (folders ?? []).filter(
      (f) =>
        (kindFilter === "all" || f.kind === kindFilter) &&
        (!q ||
          f.title.toLowerCase().includes(q) ||
          f.description?.toLowerCase().includes(q) ||
          f.files.some((file) => file.name.toLowerCase().includes(q)))
    );
  }, [folders, search, kindFilter]);

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {withFilters && (
          <>
            <label className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="field-input !min-h-[40px] pl-9 text-sm"
              />
            </label>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="field-input !min-h-[40px] !w-auto text-sm"
              aria-label={t("upload.kind")}
            >
              <option value="all">{t("allKinds")}</option>
              {documentKinds(scope).map((k) => (
                <option key={k} value={k}>
                  {t(`kinds.${k}`)}
                </option>
              ))}
            </select>
          </>
        )}
        <button
          onClick={() => setUploading({})}
          disabled={!storageReady}
          title={storageReady ? undefined : t("storageMissing")}
          className={cn("btn-sm-primary", !withFilters && "ml-auto")}
        >
          <Plus className="h-4 w-4" /> {t("add")}
        </button>
      </div>

      {!storageReady && (
        <p className="mb-4 flex items-start gap-2 rounded-[10px] bg-[#FFF3D6] p-3 text-sm text-[#8A6200]">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {t("storageMissing")}
        </p>
      )}

      {folders === null ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-32 rounded-brand" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-brand border border-dashed border-bord px-4 py-10 text-center">
          <FolderOpen className="mx-auto mb-2 h-8 w-8 text-bord" />
          <p className="font-semibold">{folders.length === 0 ? t("empty") : t("noMatch")}</p>
          {folders.length === 0 && <p className="text-sm text-gris">{scope === "candidate" ? t("emptyHintCandidate") : t("emptyHintInternal")}</p>}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((folder) => (
            <article key={folder.id} className="rounded-brand border border-bord bg-white p-4">
              <header className="mb-2 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <span className="mb-1 inline-flex rounded-full bg-fond px-2 py-0.5 text-[11px] font-semibold text-gris">
                    {t(`kinds.${folder.kind}`)}
                  </span>
                  <h3 className="break-words font-bold leading-snug">{folder.title}</h3>
                  <p className="text-xs text-gris">
                    {t("addedBy", {
                      name: folder.createdBy?.name || folder.createdBy?.email || t("activity.someone"),
                      date: dateFmt.format(new Date(folder.createdAt)),
                    })}
                  </p>
                </div>
                <FolderMenu
                  onAdd={() => setUploading({ folder })}
                  onEdit={() => setEditing(folder)}
                  onDelete={() => setDeleting({ folder })}
                  deletable={canDelete(currentUser, folder.createdById)}
                />
              </header>
              {folder.description && <p className="mb-2 whitespace-pre-line text-sm text-gris">{folder.description}</p>}
              <ul className="divide-y divide-bord rounded-[10px] border border-bord">
                {folder.files.map((file, i) => {
                  const Icon = iconFor(file.contentType);
                  const previewable = previewKind(file.contentType) !== "none";
                  return (
                    <li key={file.id} className="flex items-center gap-2 px-2.5 py-1.5">
                      <button
                        onClick={() => setViewer({ folder, index: i })}
                        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-1 text-left hover:text-rouge"
                        title={previewable ? t("open") : t("viewer.noPreview")}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0 text-gris" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{file.name}</span>
                          <span className="block text-[11px] text-gris">{formatBytes(file.size, locale)}</span>
                        </span>
                      </button>
                      <button
                        onClick={() => setViewer({ folder, index: i })}
                        className="rounded-lg p-1.5 text-gris hover:bg-fond hover:text-noir"
                        aria-label={`${t("open")} ${file.name}`}
                        title={t("open")}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <a
                        href={fileUrl(file.id, "download")}
                        onClick={() => setTimeout(() => onActivity?.(), 1500)}
                        className="rounded-lg p-1.5 text-gris hover:bg-fond hover:text-noir"
                        aria-label={`${t("viewer.download")} ${file.name}`}
                        title={t("viewer.download")}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {canDelete(currentUser, file.uploadedById) && (
                        <button
                          onClick={() => setDeleting({ folder, file })}
                          className="rounded-lg p-1.5 text-gris hover:bg-erreur-fond hover:text-erreur"
                          aria-label={`${tc("delete")} ${file.name}`}
                          title={tc("delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
                {folder.files.length === 0 && <li className="px-3 py-2 text-sm text-gris">{t("noFiles")}</li>}
              </ul>
            </article>
          ))}
        </div>
      )}

      {uploading && (
        <DocumentUploadDialog
          scope={scope}
          candidateId={candidateId}
          folder={uploading.folder}
          onClose={() => setUploading(null)}
          onSaved={upsert}
        />
      )}
      {editing && <EditFolderDialog folder={editing} scope={scope} onClose={() => setEditing(null)} onSaved={upsert} />}
      {viewer && (
        <DocumentViewer
          files={viewer.folder.files}
          index={viewer.index}
          title={viewer.folder.title}
          onIndexChange={(index) => setViewer({ ...viewer, index })}
          onClose={() => {
            setViewer(null);
            onActivity?.();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={deleting.file ? t("confirmDeleteFile", { name: deleting.file.name }) : t("confirmDeleteFolder", { title: deleting.folder.title })}
          text={deleting.file ? t("confirmDeleteFileText") : t("confirmDeleteFolderText", { count: deleting.folder.files.length })}
          confirmLabel={deleteBusy ? tc("deleting") : tc("delete")}
          icon={<Trash2 className="h-5 w-5" />}
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
