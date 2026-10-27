"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  RemoveFormatting,
  Paperclip,
  X,
  Send,
  Mail,
  FileText,
  ChevronDown,
} from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const MAX_BYTES = 3 * 1024 * 1024; // doit rester aligné avec l'API (limite Vercel ~4,5 Mo en base64)
const MAX_FILES = 8;
const BLOCKED_EXT = /\.(exe|bat|cmd|com|scr|js|vbs|msi|sh|jar|apk|ps1)$/i;

type Attachment = { name: string; type: string; size: number; content: string };
type Candidate = { id: string; email: string; code: string; fullName: string };

const TOOLS = [
  { cmd: "bold", icon: Bold, key: "bold", shortcut: "B" },
  { cmd: "italic", icon: Italic, key: "italic", shortcut: "I" },
  { cmd: "underline", icon: Underline, key: "underline", shortcut: "U" },
  { cmd: "strikeThrough", icon: Strikethrough, key: "strike" },
  { cmd: "formatBlock:h2", icon: Heading2, key: "heading" },
  { cmd: "insertUnorderedList", icon: List, key: "bullet" },
  { cmd: "insertOrderedList", icon: ListOrdered, key: "numbered" },
  { cmd: "formatBlock:blockquote", icon: Quote, key: "quote" },
  { cmd: "createLink", icon: Link2, key: "link" },
  { cmd: "removeFormat", icon: RemoveFormatting, key: "clear" },
] as const;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Éditeur d'email (objet, texte mis en forme, pièces jointes) envoyé au candidat depuis sa fiche. */
function Composer({ candidate, senderEmail, onClose }: { candidate: Candidate; senderEmail: string; onClose: () => void }) {
  const t = useTranslations("dashboard.composer");
  const tc = useTranslations("dashboard.common");
  const toast = useToast();
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [isEmpty, setIsEmpty] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const totalBytes = attachments.reduce((s, a) => s + a.size, 0);
  const dirty = Boolean(subject.trim()) || !isEmpty || attachments.length > 0;
  const firstName = candidate.fullName.trim().split(/\s+/).slice(-1)[0] ?? "";

  const refreshState = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    setIsEmpty(!el.textContent?.trim() && !el.querySelector("li"));
    const next: Record<string, boolean> = {};
    for (const tool of TOOLS) {
      if (tool.cmd.includes(":") || tool.cmd === "createLink" || tool.cmd === "removeFormat") continue;
      try {
        next[tool.cmd] = document.queryCommandState(tool.cmd);
      } catch {
        next[tool.cmd] = false;
      }
    }
    try {
      const block = String(document.queryCommandValue("formatBlock")).toLowerCase();
      next["formatBlock:h2"] = block === "h2";
      next["formatBlock:blockquote"] = block === "blockquote";
    } catch {
      // ignoré
    }
    setActive(next);
  }, []);

  useEffect(() => {
    document.execCommand("defaultParagraphSeparator", false, "p");
    const onSel = () => {
      if (editorRef.current?.contains(document.getSelection()?.anchorNode ?? null)) refreshState();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [refreshState]);

  // Échap ferme (avec confirmation si le message est commencé) ; on bloque le défilement de la page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  });

  function requestClose() {
    if (sending) return;
    if (dirty && !window.confirm(t("discardConfirm"))) return;
    onClose();
  }

  function run(cmd: string) {
    editorRef.current?.focus();
    if (cmd === "createLink") {
      const url = window.prompt(t("toolbar.linkPrompt"), "https://");
      if (!url || !/^(https?:\/\/|mailto:)/i.test(url.trim())) return;
      document.execCommand("createLink", false, url.trim());
    } else if (cmd.startsWith("formatBlock:")) {
      const tag = cmd.split(":")[1]!;
      const current = String(document.queryCommandValue("formatBlock")).toLowerCase();
      document.execCommand("formatBlock", false, current === tag ? "p" : tag);
    } else {
      document.execCommand(cmd);
    }
    refreshState();
  }

  function applyTemplate(key: "documents" | "followup") {
    const fill = (raw: string) =>
      raw.replace(/\{firstName\}/g, escapeHtml(firstName)).replace(/\{code\}/g, escapeHtml(candidate.code));
    setSubject(t(`tpl.${key}.subject`));
    if (editorRef.current) editorRef.current.innerHTML = fill(t.raw(`tpl.${key}.body`) as string);
    setShowTemplates(false);
    refreshState();
  }

  async function addFiles(list: FileList | File[]) {
    setError("");
    const files = Array.from(list);
    if (attachments.length + files.length > MAX_FILES) return setError(t("tooMany"));
    if (files.some((f) => BLOCKED_EXT.test(f.name))) return setError(t("blocked"));
    const size = totalBytes + files.reduce((s, f) => s + f.size, 0);
    if (size > MAX_BYTES) return setError(t("tooLarge", { max: MAX_BYTES / 1024 / 1024 }));
    const read = await Promise.all(
      files.map(async (f) => ({ name: f.name, type: f.type || "application/octet-stream", size: f.size, content: await readAsBase64(f) }))
    );
    setAttachments((a) => [...a, ...read]);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
  }

  async function send() {
    const html = editorRef.current?.innerHTML ?? "";
    if (!subject.trim() || isEmpty) return setError(t("empty"));
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/candidatures/${candidate.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          html,
          attachments: attachments.map(({ name, type, content }) => ({ name, type, content })),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error === "tooLarge" ? t("tooLarge", { max: 3 }) : json.error === "blockedFile" ? t("blocked") : t("failed"));
        return;
      }
      toast({ tone: "success", title: t("sent"), description: t("sentTo", { email: candidate.email }) });
      router.refresh();
      onClose();
    } catch {
      setError(t("failed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-noir/50 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        className="flex max-h-[100dvh] w-full max-w-2xl animate-fade-up flex-col overflow-hidden bg-white shadow-pop sm:max-h-[92vh] sm:rounded-brand"
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragging(false);
        }}
        onDrop={onDrop}
      >
        <div className="flex items-center justify-between gap-3 border-b border-bord bg-noir px-4 py-3 text-white sm:px-5">
          <p className="flex items-center gap-2 font-bold">
            <Mail className="h-4 w-4 text-rouge" /> {t("title")}
          </p>
          <button onClick={requestClose} className="rounded-lg p-1 text-[#B4B4BE] hover:bg-white/10 hover:text-white" aria-label={tc("close")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 border-b border-bord px-4 py-2.5 text-sm sm:px-5">
            <span className="w-14 flex-shrink-0 text-gris">{t("to")}</span>
            <span className="min-w-0 truncate font-semibold">
              {candidate.fullName} <span className="font-normal text-gris">&lt;{candidate.email}&gt;</span>
            </span>
          </div>
          <label className="flex items-center gap-3 border-b border-bord px-4 py-1.5 text-sm sm:px-5">
            <span className="w-14 flex-shrink-0 text-gris">{t("subject")}</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder={t("subjectPlaceholder")}
              className="min-h-[38px] flex-1 bg-transparent font-semibold outline-none placeholder:font-normal placeholder:text-gris"
              disabled={sending}
            />
          </label>

          {/* Barre de mise en forme */}
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-bord bg-[#FAFAFB] px-2 py-1.5 sm:px-3" role="toolbar">
            {TOOLS.map((tool) => (
              <button
                key={tool.cmd}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => run(tool.cmd)}
                title={`${t(`toolbar.${tool.key}`)}${"shortcut" in tool ? ` (Ctrl+${tool.shortcut})` : ""}`}
                aria-label={t(`toolbar.${tool.key}`)}
                aria-pressed={active[tool.cmd] ?? false}
                disabled={sending}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  active[tool.cmd] ? "bg-noir text-white" : "text-noir hover:bg-white"
                )}
              >
                <tool.icon className="h-4 w-4" />
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-bord" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplates((v) => !v)}
                className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-noir hover:bg-white"
                aria-expanded={showTemplates}
              >
                <FileText className="h-4 w-4" /> {t("templates")} <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showTemplates && (
                <div className="absolute left-0 top-9 z-20 w-56 overflow-hidden rounded-brand bg-white py-1 shadow-pop">
                  {(["documents", "followup"] as const).map((k) => (
                    <button key={k} onClick={() => applyTemplate(k)} className="block w-full px-3 py-2 text-left text-sm hover:bg-fond">
                      {t(`tpl.${k}.name`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div
              ref={editorRef}
              contentEditable={!sending}
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label={t("message")}
              data-placeholder={t("placeholder")}
              onInput={refreshState}
              onKeyUp={refreshState}
              // Le collage arrive en texte brut : pas de styles Word / pages web dans l'email.
              onPaste={(e) => {
                e.preventDefault();
                document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
              }}
              className="rich-editor min-h-[220px] px-4 py-3 text-[15px] leading-relaxed outline-none sm:px-5"
            />
            {dragging && (
              <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-brand border-2 border-dashed border-rouge bg-white/90 text-sm font-semibold text-rouge">
                <Paperclip className="mr-2 h-4 w-4" /> {t("addFiles")}
              </div>
            )}
          </div>

          <div className="border-t border-bord px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={sending} className="btn-sm-ghost !min-h-[34px] text-xs">
                <Paperclip className="h-3.5 w-3.5" /> {t("addFiles")}
              </button>
              <span className="text-xs text-gris">{t("attachHint", { max: MAX_BYTES / 1024 / 1024 })}</span>
              <input
                ref={fileRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            {attachments.length > 0 && (
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <li key={`${a.name}-${i}`} className="flex max-w-full items-center gap-2 rounded-[10px] border border-bord bg-fond py-1 pl-2.5 pr-1 text-xs">
                    <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-gris" />
                    <span className="truncate font-semibold">{a.name}</span>
                    <span className="flex-shrink-0 text-gris">{formatSize(a.size)}</span>
                    <button
                      onClick={() => setAttachments((all) => all.filter((_, j) => j !== i))}
                      className="rounded p-0.5 text-gris hover:bg-white hover:text-noir"
                      aria-label={t("remove", { name: a.name })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="border-t border-bord bg-[#FAFAFB] px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-5">
          {error && <p className="mb-2 text-sm font-semibold text-erreur">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="min-w-0 flex-1 text-xs text-gris">{t("replyNote", { email: senderEmail })}</p>
            <div className="flex flex-shrink-0 gap-2">
              <button onClick={requestClose} disabled={sending} className="btn-sm-ghost flex-1 sm:flex-none">
                {tc("cancel")}
              </button>
              <button onClick={send} disabled={sending} className="btn-sm-primary flex-1 sm:flex-none">
                {sending ? <Spinner /> : <Send className="h-4 w-4" />}
                {sending ? t("sending") : t("send")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bouton « Écrire un email » de la fiche candidat (désactivé si aucun email enregistré). */
export function EmailComposerButton({
  candidate,
  senderEmail,
}: {
  candidate: { id: string; email: string | null; code: string; fullName: string };
  senderEmail: string;
}) {
  const t = useTranslations("dashboard.candidate");
  const [open, setOpen] = useState(false);
  const email = candidate.email;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!email}
        title={email ? undefined : t("noEmailTitle")}
        className="btn-sm-dark"
      >
        <Mail className="h-4 w-4" /> {t("writeEmail")}
      </button>
      {open && email && (
        <Composer candidate={{ ...candidate, email }} senderEmail={senderEmail} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
