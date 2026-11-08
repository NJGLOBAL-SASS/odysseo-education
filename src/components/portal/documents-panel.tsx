"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import { Download, Eye, FilePlus2, FileText, Trash2, X } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { ACCEPT_ATTRIBUTE, CANDIDATE_DOCUMENT_KINDS, MAX_FILE_SIZE, formatBytes, resolveContentType } from "@/lib/documents";
import type { PortalFolder } from "@/lib/portal/documents";
import { cn } from "@/lib/utils";
import { requestPushPrompt } from "@/lib/portal/push-client";

const safeName = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120) || "fichier";

/** Documents de l'espace étudiant : liste (envois + documents approuvés par l'équipe) et envoi. */
export function DocumentsPanel() {
  const t = useTranslations("portal.documents");
  const tKinds = useTranslations("dashboard.documents.kinds");
  const locale = useLocale();
  const [folders, setFolders] = useState<PortalFolder[] | null>(null);
  const [storageReady, setStorageReady] = useState(true);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/portal/documents", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const json = (await res.json()) as { folders: PortalFolder[]; storageReady: boolean };
    setFolders(json.folders);
    setStorageReady(json.storageReady);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function remove(fileId: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/portal/files/${fileId}`, { method: "DELETE" });
    if (res.ok) load();
  }

  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const sourceLabel = (s: PortalFolder["source"]) =>
    s === "team" ? t("fromTeam") : s === "me" ? t("fromMe") : s === "parent" ? t("fromParent") : t("fromStudent");

  return (
    <div className="space-y-4">
      {storageReady ? (
        <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full sm:w-auto">
          <FilePlus2 className="h-4 w-4" /> {t("send")}
        </button>
      ) : (
        <p className="rounded-[10px] bg-fond p-3 text-[14px] text-gris">{t("storage")}</p>
      )}
      {notice && <p className="rounded-[10px] bg-[#E1F6EA] p-3 text-[14px] font-semibold text-ok">{notice}</p>}

      {folders === null && <div className="skeleton h-24 rounded-brand" />}
      {folders?.length === 0 && <p className="card p-5 text-center text-[15px] text-gris">{t("empty")}</p>}
      <ul className="space-y-3">
        {folders?.map((f) => (
          <li key={f.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] font-bold uppercase tracking-wide text-gris">{tKinds(f.kind as "passport")}</p>
                <h3 className="break-words text-[16px] font-extrabold">{f.title}</h3>
                {f.description && <p className="mt-0.5 text-[14px] text-gris">{f.description}</p>}
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-bold", f.source === "team" ? "bg-noir text-white" : "bg-fond text-noir")}>
                {sourceLabel(f.source)}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-gris">{dateFmt.format(new Date(f.createdAt))}</p>
            <ul className="mt-3 divide-y divide-bord rounded-[10px] border border-bord">
              {f.files.map((file) => (
                <li key={file.id} className="flex items-center gap-2 px-3 py-2.5">
                  <FileText className="h-4 w-4 flex-shrink-0 text-rouge" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{file.name}</span>
                    <span className="text-[12px] text-gris">{formatBytes(file.size, locale)}</span>
                  </span>
                  <a href={`/api/portal/files/${file.id}?mode=view`} target="_blank" rel="noopener" className="btn-sm border border-bord bg-white !px-2.5" aria-label={t("view")}>
                    <Eye className="h-4 w-4" />
                  </a>
                  <a href={`/api/portal/files/${file.id}?mode=download`} className="btn-sm border border-bord bg-white !px-2.5" aria-label={t("download")}>
                    <Download className="h-4 w-4" />
                  </a>
                  {file.mine && (
                    <button type="button" onClick={() => remove(file.id)} className="btn-sm border border-bord bg-white !px-2.5 text-erreur" aria-label={t("delete")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {open && (
        <UploadDialog
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            setNotice(t("form.sent"));
            requestPushPrompt("document");
            load();
          }}
        />
      )}
    </div>
  );
}

function UploadDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const t = useTranslations("portal.documents.form");
  const tKinds = useTranslations("dashboard.documents.kinds");
  const tDocs = useTranslations("portal.documents");
  const [kind, setKind] = useState<string>("passport");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: File[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_SIZE) return setError(t("errors.tooBig", { name: f.name }));
      if (!resolveContentType(f.name, f.type)) return setError(t("errors.type", { name: f.name }));
      next.push(f);
    }
    setError("");
    setFiles((cur) => [...cur, ...next].slice(0, 20));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return setError(t("errors.title"));
    if (files.length === 0) return setError(t("errors.files"));
    setError("");
    setProgress({ done: 0, total: files.length });
    try {
      const uploaded = [];
      for (const [i, file] of files.entries()) {
        const blob = await upload(`documents/espace/${safeName(file.name)}`, file, {
          access: "private",
          handleUploadUrl: "/api/portal/documents/upload",
          contentType: resolveContentType(file.name, file.type) ?? undefined,
          multipart: file.size > 8 * 1024 * 1024,
        });
        uploaded.push({ url: blob.url, name: file.name });
        setProgress({ done: i + 1, total: files.length });
      }
      const res = await fetch("/api/portal/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title: title.trim(), description: description.trim() || undefined, files: uploaded }),
      });
      if (!res.ok) throw new Error();
      onDone();
    } catch {
      setError(t("errors.generic"));
      setProgress(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-noir/50 sm:items-center sm:p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[18px] bg-white p-5 sm:rounded-brand" role="dialog" aria-modal="true">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{tDocs("send")}</h2>
          <button type="button" onClick={onClose} aria-label={t("cancel")} className="rounded-full p-1.5 hover:bg-fond">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="mb-3.5 block">
          <span className="mb-1.5 block text-[15px] font-semibold">{t("kind")}</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="field-input">
            {CANDIDATE_DOCUMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {tKinds(k)}
              </option>
            ))}
          </select>
        </label>
        <label className="mb-3.5 block">
          <span className="mb-1.5 block text-[15px] font-semibold">{t("title")}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder={t("titlePlaceholder")} className="field-input" />
        </label>
        <label className="mb-3.5 block">
          <span className="mb-1.5 block text-[15px] font-semibold">{t("description")}</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 1000))} rows={2} className="field-input resize-none" />
        </label>
        <div className="mb-3.5">
          <span className="mb-1.5 block text-[15px] font-semibold">{t("files")}</span>
          <input ref={inputRef} type="file" multiple accept={ACCEPT_ATTRIBUTE} className="hidden" onChange={(e) => addFiles(e.target.files)} />
          <button type="button" onClick={() => inputRef.current?.click()} className="btn-ghost w-full">
            <FilePlus2 className="h-4 w-4" /> {t("choose")}
          </button>
          <p className="mt-1 text-[13px] text-gris">{t("filesHint")}</p>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1 text-[14px]">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-[8px] bg-fond px-2.5 py-1.5">
                  <FileText className="h-4 w-4 flex-shrink-0 text-rouge" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <button type="button" onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} aria-label="×">
                    <X className="h-4 w-4 text-gris" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <p className="mb-3 text-[14px] font-semibold text-erreur">{error}</p>}
        <button type="submit" disabled={progress !== null} className="btn-primary w-full">
          {progress ? (
            <>
              <Spinner /> {t("sending", progress)}
            </>
          ) : (
            t("submit")
          )}
        </button>
      </form>
    </div>
  );
}
