"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import { CheckCircle2, FilePlus2, UploadCloud, X, AlertCircle } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  documentKinds,
  formatBytes,
  resolveContentType,
  type DocumentScope,
} from "@/lib/documents";
import { cn } from "@/lib/utils";
import type { DocumentFolderView } from "./types";

type Pending = {
  key: string;
  file: File;
  progress: number;
  status: "waiting" | "uploading" | "done" | "error";
  url?: string;
  error?: string;
};

const CONCURRENCY = 3;

function safeName(name: string) {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-120);
  return clean || "fichier";
}

/**
 * Formulaire d'envoi : type de document, nom, description (facultative) et un ou
 * plusieurs fichiers. Avec `folder`, ajoute seulement des fichiers à un lot existant.
 * Les fichiers partent directement du navigateur vers le stockage privé.
 */
export function DocumentUploadDialog({
  scope,
  candidateId,
  folder,
  onClose,
  onSaved,
}: {
  scope: DocumentScope;
  candidateId?: string;
  folder?: DocumentFolderView;
  onClose: () => void;
  onSaved: (folder: DocumentFolderView) => void;
}) {
  const t = useTranslations("dashboard.documents");
  const tc = useTranslations("dashboard.common");
  const locale = useLocale();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const kinds = documentKinds(scope);
  const [kind, setKind] = useState(kinds[0]!);
  const [title, setTitle] = useState(t(`kinds.${kinds[0]}`));
  const [titleEdited, setTitleEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<Pending[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function chooseKind(next: string) {
    setKind(next);
    // Le nom suit le type tant que l'utilisateur ne l'a pas personnalisé.
    if (!titleEdited) setTitle(next === "other" ? "" : t(`kinds.${next}`));
  }

  function addFiles(list: FileList | File[]) {
    setError("");
    const incoming = Array.from(list);
    const rejected: string[] = [];
    const accepted: Pending[] = [];
    for (const file of incoming) {
      if (!resolveContentType(file.name, file.type)) rejected.push(t("upload.badType", { name: file.name }));
      else if (file.size > MAX_FILE_SIZE) rejected.push(t("upload.tooBig", { name: file.name, max: formatBytes(MAX_FILE_SIZE, locale) }));
      else if (file.size === 0) rejected.push(t("upload.empty", { name: file.name }));
      else accepted.push({ key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file, progress: 0, status: "waiting" });
    }
    setItems((prev) => {
      const merged = [...prev, ...accepted];
      if (merged.length > MAX_FILES_PER_UPLOAD) rejected.push(t("upload.tooMany", { max: MAX_FILES_PER_UPLOAD }));
      return merged.slice(0, MAX_FILES_PER_UPLOAD);
    });
    if (rejected.length) setError(rejected.join(" "));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!busy && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  const patch = (key: string, data: Partial<Pending>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...data } : it)));

  async function uploadOne(item: Pending): Promise<{ url: string; name: string } | null> {
    if (item.status === "done" && item.url) return { url: item.url, name: item.file.name };
    patch(item.key, { status: "uploading", progress: 0, error: undefined });
    const folderPath = scope === "candidate" ? `candidats/${candidateId}` : "interne";
    try {
      const blob = await upload(`documents/${folderPath}/${safeName(item.file.name)}`, item.file, {
        access: "private",
        handleUploadUrl: "/api/documents/upload",
        contentType: resolveContentType(item.file.name, item.file.type) ?? undefined,
        multipart: item.file.size > 8 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => patch(item.key, { progress: percentage }),
      });
      patch(item.key, { status: "done", progress: 100, url: blob.url });
      return { url: blob.url, name: item.file.name };
    } catch (err) {
      patch(item.key, { status: "error", error: err instanceof Error ? err.message : tc("error") });
      return null;
    }
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    setError("");
    if (!folder && title.trim().length < 2) return setError(t("upload.titleRequired"));
    if (items.length === 0) return setError(t("upload.filesRequired"));

    setBusy(true);
    try {
      // Envoi en parallèle par petits paquets ; les fichiers déjà envoyés ne repartent pas.
      const results: ({ url: string; name: string } | null)[] = new Array(items.length).fill(null);
      let cursor = 0;
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
          while (cursor < items.length) {
            const i = cursor++;
            results[i] = await uploadOne(items[i]!);
          }
        })
      );
      if (results.some((r) => r === null)) {
        setError(t("upload.someFailed"));
        return;
      }

      const res = await fetch(folder ? `/api/documents/${folder.id}/files` : "/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          folder
            ? { files: results }
            : { candidateId, kind, title: title.trim(), description: description.trim() || undefined, files: results }
        ),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error === "fileMissing" ? t("upload.fileMissing") : tc("error"));
        return;
      }
      toast({ tone: "success", title: t("upload.done", { count: items.length }), description: json.folder.title });
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
      title={folder ? t("upload.addTo", { title: folder.title }) : t("upload.title")}
      description={folder ? undefined : scope === "candidate" ? t("upload.hintCandidate") : t("upload.hintInternal")}
      icon={<FilePlus2 className="h-5 w-5" />}
      onClose={onClose}
      busy={busy}
      size="lg"
      footer={
        <>
          <button onClick={onClose} disabled={busy} className="btn-sm-ghost">
            {tc("cancel")}
          </button>
          <button onClick={() => submit()} disabled={busy || items.length === 0} className="btn-sm-dark">
            {busy && <Spinner />} {busy ? t("upload.sending") : t("upload.submit", { count: items.length })}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3 pb-2">
        {!folder && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">{t("upload.kind")}</span>
                <select
                  value={kind}
                  onChange={(e) => chooseKind(e.target.value)}
                  disabled={busy}
                  className="field-input !min-h-[42px] text-sm"
                >
                  {kinds.map((k) => (
                    <option key={k} value={k}>
                      {t(`kinds.${k}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">{t("upload.name")}</span>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTitleEdited(true);
                  }}
                  disabled={busy}
                  placeholder={t("upload.namePlaceholder")}
                  className="field-input !min-h-[42px] text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">
                {t("upload.description")} <span className="font-normal text-gris">{t("upload.optional")}</span>
              </span>
              <textarea
                rows={2}
                maxLength={2000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
                placeholder={t("upload.descriptionPlaceholder")}
                className="field-input !min-h-0 py-2.5 text-sm"
              />
            </label>
          </>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !busy && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-brand border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragOver ? "border-rouge bg-[#FFF5F5]" : "border-bord hover:border-gris hover:bg-fond",
            busy && "pointer-events-none opacity-60"
          )}
        >
          <UploadCloud className="h-7 w-7 text-gris" />
          <p className="text-sm font-semibold">{t("upload.drop")}</p>
          <p className="text-xs text-gris">{t("upload.limits", { max: formatBytes(MAX_FILE_SIZE, locale), count: MAX_FILES_PER_UPLOAD })}</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {items.length > 0 && (
          <ul className="divide-y divide-bord rounded-brand border border-bord">
            {items.map((it) => (
              <li key={it.key} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{it.file.name}</span>
                  <span className="block text-xs text-gris">
                    {formatBytes(it.file.size, locale)}
                    {it.status === "error" && <span className="text-erreur"> · {it.error}</span>}
                  </span>
                  {it.status === "uploading" && (
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-fond">
                      <span className="block h-full bg-rouge transition-[width]" style={{ width: `${it.progress}%` }} />
                    </span>
                  )}
                </span>
                {it.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-ok" />
                ) : it.status === "uploading" ? (
                  <span className="text-xs tabular-nums text-gris">{Math.round(it.progress)}%</span>
                ) : it.status === "error" ? (
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-erreur" />
                ) : null}
                {!busy && it.status !== "done" && (
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((p) => p.key !== it.key))}
                    className="rounded-lg p-1 text-gris hover:bg-fond hover:text-noir"
                    aria-label={t("upload.remove", { name: it.file.name })}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-sm font-semibold text-erreur">{error}</p>}
      </form>
    </Dialog>
  );
}
