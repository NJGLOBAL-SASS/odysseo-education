"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import { AlertTriangle, Camera, CheckCircle2, Eye, FilePlus2, ShieldCheck, Trash2 } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { formatBytes } from "@/lib/documents";
import { passportTooShort } from "@/lib/admission/rules";
import { cn } from "@/lib/utils";
import type { ParentChecklistItem, StudentChecklistItem } from "@/lib/admission/server";

type Data =
  | { open: false }
  | { open: true; role: "PARENT"; progress: { done: number; total: number }; items: ParentChecklistItem[] }
  | {
      open: true;
      role: "STUDENT";
      progress: { done: number; total: number };
      consent: boolean;
      storageReady: boolean;
      items: StudentChecklistItem[];
    };

const STATUS_STYLE: Record<string, string> = {
  a_fournir: "bg-fond text-noir border border-bord",
  recu: "bg-[#FFF5D6] text-[#7A5600]",
  valide: "bg-[#EAF7F0] text-ok",
  a_refaire: "bg-erreur-fond text-erreur",
  en_preparation: "bg-fond text-gris border border-bord",
  a_valider: "bg-rouge text-white",
  modification_demandee: "bg-[#FFF5D6] text-[#7A5600]",
};

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic", pdf: "application/pdf", mp4: "video/mp4", mov: "video/quicktime" };
const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);

/** Photo réduite (côté le plus long 2 000 px, JPEG qualité 0,8). Les PDF, HEIC et vidéos passent tels quels. */
async function compressImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Checklist des documents (PACK-10) dans l'onglet Documents de l'espace.
 * Étudiant : envoi par document (photo ou fichier), états, commentaires, documents préparés.
 * Parent : progression et état de chaque document seulement.
 */
export function ChecklistPanel({ code, deadline }: { code: string; deadline: string | null }) {
  const t = useTranslations("portal.checklist");
  const locale = useLocale();
  const [data, setData] = useState<Data | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/portal/checklist?locale=${locale}`, { cache: "no-store" }).catch(() => null);
    if (res?.ok) setData((await res.json()) as Data);
  }, [locale]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <div className="skeleton mb-6 h-40 rounded-brand" />;
  if (!data.open) {
    return <p className="card mb-6 p-4 text-[15px] text-gris">{t("notOpen")}</p>;
  }

  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const pct = data.progress.total ? Math.round((data.progress.done / data.progress.total) * 100) : 0;
  const header = (
    <div className="card p-4">
      <h2 className="text-lg font-extrabold">{t("title")}</h2>
      <p className="mt-1 text-[15px] font-semibold">{t("progress", data.progress)}</p>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-fond" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      {deadline && <p className="mt-2 text-[13px] font-semibold text-rouge-fonce">{t("deadline", { date: dateFmt.format(new Date(`${deadline}T00:00:00Z`)) })}</p>}
    </div>
  );

  if (data.role === "PARENT") {
    return (
      <section className="mb-8 space-y-3">
        {header}
        <p className="px-1 text-[14px] text-gris">{t("parentIntro")}</p>
        {(["maintenant", "plus_tard"] as const).map((phase) => {
          const items = data.items.filter((i) => i.kind !== "prepare" && i.phase === phase);
          if (!items.length) return null;
          return (
            <Group key={phase} title={t(phase === "maintenant" ? "now" : "later")}>
              <ul className="card divide-y divide-bord">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-[15px]">{i.label}</span>
                    <StatusBadge status={i.status} />
                  </li>
                ))}
              </ul>
            </Group>
          );
        })}
      </section>
    );
  }

  const student = data;
  const groups = [
    { title: t("now"), items: student.items.filter((i) => i.kind !== "prepare" && i.phase === "maintenant") },
    { title: t("later"), items: student.items.filter((i) => i.kind !== "prepare" && i.phase === "plus_tard") },
  ];
  const prepared = student.items.filter((i) => i.kind === "prepare");

  return (
    <section className="mb-8 space-y-4">
      {header}
      {!student.consent && <ConsentBox onDone={load} />}
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <Group key={g.title} title={g.title}>
              <ul className="space-y-3">
                {g.items.map((i) => (
                  <li key={i.id}>
                    <StudentItem item={i} code={code} canUpload={student.consent && student.storageReady} storageReady={student.storageReady} onChange={load} />
                  </li>
                ))}
              </ul>
            </Group>
          ),
      )}
      {prepared.length > 0 && (
        <Group title={t("prepared")}>
          <p className="mb-2 px-1 text-[14px] text-gris">{t("preparedIntro")}</p>
          <ul className="space-y-3">
            {prepared.map((i) => (
              <li key={i.id}>
                <PreparedItem item={i} onChange={load} />
              </li>
            ))}
          </ul>
        </Group>
      )}
    </section>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 px-1 text-[13px] font-extrabold uppercase tracking-wide text-gris">{title}</h3>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("portal.checklist.status");
  return <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold", STATUS_STYLE[status])}>{t(status as "recu")}</span>;
}

function ConsentBox({ onDone }: { onDone: () => void }) {
  const t = useTranslations("portal.checklist");
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  async function accept() {
    setLoading(true);
    const res = await fetch("/api/portal/checklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: true }) }).catch(() => null);
    setLoading(false);
    if (res?.ok) onDone();
  }
  return (
    <div className="rounded-brand border-[1.5px] border-noir bg-white p-4">
      <p className="flex items-center gap-2 font-extrabold">
        <ShieldCheck className="h-5 w-5 text-rouge" /> {t("consentTitle")}
      </p>
      <label className="mt-2 flex cursor-pointer items-start gap-3 text-[15px]">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 h-5 w-5 flex-shrink-0 accent-noir" />
        <span>{t("consentText")}</span>
      </label>
      <button type="button" onClick={accept} disabled={!checked || loading} className="btn-dark mt-3 !min-h-[48px]">
        {loading && <Spinner />} {t("consentButton")}
      </button>
    </div>
  );
}

function FileLinks({ files, onDelete, canDelete }: { files: StudentChecklistItem["files"]; onDelete?: (id: string) => void; canDelete: boolean }) {
  const t = useTranslations("portal.checklist");
  const locale = useLocale();
  if (!files.length) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-2 rounded-[8px] bg-fond px-3 py-2 text-[14px]">
          <span className="min-w-0 flex-1 truncate">{f.name}</span>
          <span className="text-[12px] text-gris">{formatBytes(f.size, locale)}</span>
          <a href={`/api/portal/checklist/files/${f.id}`} target="_blank" rel="noopener noreferrer" className="rounded p-1.5 hover:bg-white" aria-label={t("view")}>
            <Eye className="h-4 w-4" />
          </a>
          {canDelete && f.mine && onDelete && (
            <button type="button" onClick={() => onDelete(f.id)} className="rounded p-1.5 text-erreur hover:bg-white" aria-label={t("delete")}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function StudentItem({
  item,
  code,
  canUpload,
  storageReady,
  onChange,
}: {
  item: StudentChecklistItem;
  code: string;
  canUpload: boolean;
  storageReady: boolean;
  onChange: () => void;
}) {
  const t = useTranslations("portal.checklist");
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState(item.documentLanguage ?? "");
  const [expiry, setExpiry] = useState(item.passportExpiry ?? "");
  const [state, setState] = useState<{ busy?: string; error?: string; ok?: string }>({});
  const locked = item.status === "valide";
  const isPassport = item.key === "passeport";
  const accept = item.formats.map((f) => `.${f}`).join(",") + "," + [...new Set(item.formats.map((f) => MIME[f]).filter(Boolean))].join(",");
  const formatsLabel = item.formats.map((f) => f.toUpperCase()).join(", ");

  function pick(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 10));
    setState({});
  }

  async function send() {
    if (!language) return setState({ error: t("errors.language") });
    if (isPassport && !expiry) return setState({ error: t("errors.passport") });
    setState({ busy: t("compressing") });
    try {
      const ready = await Promise.all(files.map(compressImage));
      for (const f of ready) {
        if (!item.formats.includes(extOf(f.name))) return setState({ error: t("errors.type", { name: f.name, formats: formatsLabel }) });
        if (f.size > item.maxMb * 1024 * 1024) return setState({ error: t("errors.tooBig", { name: f.name, max: item.maxMb }) });
      }
      const uploaded: { url: string; name: string }[] = [];
      const base = stamp();
      for (const [i, f] of ready.entries()) {
        setState({ busy: t("sending", { done: i, total: ready.length }) });
        const ext = extOf(f.name) === "jpeg" ? "jpg" : extOf(f.name);
        const blob = await upload(`documents/espace/checklist/${code}/${item.key}/${base}-${i + 1}.${ext}`, f, {
          access: "private",
          handleUploadUrl: "/api/portal/checklist/upload",
          clientPayload: JSON.stringify({ itemId: item.id }),
          contentType: f.type || MIME[ext],
          multipart: f.size > 8 * 1024 * 1024,
        });
        uploaded.push({ url: blob.url, name: f.name });
      }
      const res = await fetch(`/api/portal/checklist/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "files", files: uploaded, language, ...(isPassport && { passportExpiry: expiry }) }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string; name?: string };
        const key = json.error === "tooBig" ? "tooBig" : json.error === "badType" ? "badType" : json.error === "consentRequired" ? "consent" : "generic";
        return setState({ error: t(`errors.${key}`, { name: json.name ?? "", max: item.maxMb, formats: formatsLabel }) });
      }
      setFiles([]);
      setState({ ok: t("sent") });
      onChange();
    } catch {
      setState({ error: t("errors.generic") });
    }
  }

  async function remove(fileId: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    await fetch(`/api/portal/checklist/files/${fileId}`, { method: "DELETE" }).catch(() => null);
    onChange();
  }

  return (
    <article className={cn("card p-4", item.status === "a_refaire" && "ring-2 ring-erreur")}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-[16px] font-bold leading-snug">
          {item.label}
          {!item.required && <span className="ml-1.5 text-[13px] font-normal text-gris">· {t("optional")}</span>}
        </h4>
        <StatusBadge status={item.status} />
      </div>
      {item.help && <p className="mt-1 text-[14px] text-gris">{item.help}</p>}
      {item.note && <p className="mt-2 whitespace-pre-line rounded-[8px] bg-[#FFF5D6] px-3 py-2 text-[14px]">{item.note}</p>}
      {item.teamComment && (
        <p className="mt-2 rounded-[8px] bg-erreur-fond px-3 py-2 text-[14px]">
          <b className="block text-[13px] text-erreur">{t("teamComment")}</b>
          {item.teamComment}
        </p>
      )}
      {isPassport && item.passportExpiry && passportTooShort(new Date(item.passportExpiry)) && (
        <p className="mt-2 flex gap-2 text-[14px] font-semibold text-erreur">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {t("passportShort")}
        </p>
      )}

      {item.kind === "formulaire" ? (
        <RefereesForm item={item} locked={locked} onChange={onChange} />
      ) : (
        <>
          <FileLinks files={item.files} onDelete={remove} canDelete={!locked} />
          {!locked && storageReady && (
            <div className="mt-3">
              <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files)} />
              <input ref={fileRef} type="file" accept={accept} multiple className="hidden" onChange={(e) => pick(e.target.files)} />
              <div className="grid grid-cols-2 gap-2">
                {item.formats.some((f) => ["jpg", "jpeg", "png"].includes(f)) && (
                  <button type="button" disabled={!canUpload} onClick={() => photoRef.current?.click()} className="btn-ghost !min-h-[48px] text-[14px]">
                    <Camera className="h-4 w-4" /> {t("takePhoto")}
                  </button>
                )}
                <button type="button" disabled={!canUpload} onClick={() => fileRef.current?.click()} className="btn-ghost !min-h-[48px] text-[14px]">
                  <FilePlus2 className="h-4 w-4" /> {item.files.length ? t("replace") : t("chooseFile")}
                </button>
              </div>
              <p className="mt-1.5 text-[12px] text-gris">{t("formats", { formats: formatsLabel, max: item.maxMb })}</p>
              {files.length > 0 && (
                <div className="mt-3 space-y-3 rounded-[10px] border border-bord p-3">
                  <ul className="space-y-1 text-[14px]">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={() => setFiles((l) => l.filter((_, j) => j !== i))} className="text-gris" aria-label={t("delete")}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <label className="block">
                    <span className="mb-1 block text-[14px] font-semibold">{t("language")}</span>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="field-input">
                      <option value="">—</option>
                      {(["fr", "en", "zh", "other"] as const).map((l) => (
                        <option key={l} value={l}>
                          {t(`languages.${l}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isPassport && (
                    <label className="block">
                      <span className="mb-1 block text-[14px] font-semibold">{t("passportExpiry")}</span>
                      <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="field-input" />
                      {expiry && passportTooShort(new Date(expiry)) && <span className="mt-1 block text-[13px] font-semibold text-erreur">{t("passportShort")}</span>}
                    </label>
                  )}
                  <button type="button" onClick={send} disabled={Boolean(state.busy)} className="btn-primary !min-h-[48px]">
                    {state.busy ? (
                      <>
                        <Spinner /> {state.busy}
                      </>
                    ) : (
                      t("send")
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
          {!storageReady && !locked && <p className="mt-2 text-[13px] text-gris">{t("errors.storage")}</p>}
        </>
      )}
      {state.error && (
        <p role="alert" className="mt-2 text-[14px] font-semibold text-erreur">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-2 flex items-center gap-1.5 text-[14px] font-semibold text-ok">
          <CheckCircle2 className="h-4 w-4" /> {state.ok}
        </p>
      )}
    </article>
  );
}

const REFEREE_FIELDS = ["nom", "titre", "etablissement", "email", "whatsapp"] as const;
type Referee = Record<(typeof REFEREE_FIELDS)[number], string>;

function RefereesForm({ item, locked, onChange }: { item: StudentChecklistItem; locked: boolean; onChange: () => void }) {
  const t = useTranslations("portal.checklist");
  const empty: Referee = { nom: "", titre: "", etablissement: "", email: "", whatsapp: "" };
  const initial = Array.isArray(item.formData) ? (item.formData as Referee[]) : [];
  const [refs, setRefs] = useState<Referee[]>([initial[0] ?? empty, initial[1] ?? empty]);
  const [state, setState] = useState<{ loading?: boolean; error?: string; ok?: boolean }>({});

  async function save() {
    if (!refs.every((r) => r.nom.trim() && r.titre.trim() && r.etablissement.trim() && /\S+@\S+\.\S+/.test(r.email))) return setState({ error: t("errors.form") });
    setState({ loading: true });
    const res = await fetch(`/api/portal/checklist/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "form", referees: refs }),
    }).catch(() => null);
    if (!res?.ok) return setState({ error: t("errors.generic") });
    setState({ ok: true });
    onChange();
  }

  return (
    <div className="mt-3 space-y-3">
      {refs.map((r, n) => (
        <fieldset key={n} disabled={locked} className="space-y-2 rounded-[10px] border border-bord p-3">
          <legend className="px-1 text-[14px] font-bold">{t("referees.title", { n: n + 1 })}</legend>
          {REFEREE_FIELDS.map((f) => (
            <label key={f} className="block">
              <span className="mb-1 block text-[13px] font-semibold">{t(`referees.${f}`)}</span>
              <input
                type={f === "email" ? "email" : f === "whatsapp" ? "tel" : "text"}
                value={r[f]}
                onChange={(e) => setRefs((list) => list.map((x, j) => (j === n ? { ...x, [f]: e.target.value } : x)))}
                className="field-input"
              />
            </label>
          ))}
        </fieldset>
      ))}
      {!locked && (
        <button type="button" onClick={save} disabled={state.loading} className="btn-primary !min-h-[48px]">
          {state.loading && <Spinner />} {t("referees.submit")}
        </button>
      )}
      {state.error && <p className="text-[14px] font-semibold text-erreur">{state.error}</p>}
      {state.ok && <p className="text-[14px] font-semibold text-ok">{t("sent")}</p>}
    </div>
  );
}

function PreparedItem({ item, onChange }: { item: StudentChecklistItem; onChange: () => void }) {
  const t = useTranslations("portal.checklist");
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<{ loading?: boolean; error?: string; ok?: string }>({});

  async function act(action: "approve" | "requestChange") {
    setState({ loading: true });
    const res = await fetch(`/api/portal/checklist/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "approve" ? { action } : { action, comment }),
    }).catch(() => null);
    if (!res?.ok) return setState({ error: t("errors.generic") });
    setState({ ok: action === "approve" ? undefined : t("changeSent") });
    setAsking(false);
    onChange();
  }

  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-[16px] font-bold">{item.label}</h4>
        <StatusBadge status={item.status} />
      </div>
      {item.studentComment && item.status === "modification_demandee" && <p className="mt-2 rounded-[8px] bg-fond px-3 py-2 text-[14px]">{item.studentComment}</p>}
      <FileLinks files={item.files} canDelete={false} />
      {item.status === "a_valider" && (
        <div className="mt-3 space-y-2">
          {asking ? (
            <>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000} placeholder={t("changePlaceholder")} className="field-input" />
              <button type="button" onClick={() => act("requestChange")} disabled={state.loading || comment.trim().length < 3} className="btn-dark !min-h-[48px]">
                {state.loading && <Spinner />} {t("requestChange")}
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => act("approve")} disabled={state.loading} className="btn-primary !min-h-[48px] text-[14px]">
                <CheckCircle2 className="h-4 w-4" /> {t("approve")}
              </button>
              <button type="button" onClick={() => setAsking(true)} className="btn-ghost !min-h-[48px] text-[14px]">
                {t("requestChange")}
              </button>
            </div>
          )}
        </div>
      )}
      {state.error && <p className="mt-2 text-[14px] font-semibold text-erreur">{state.error}</p>}
      {state.ok && <p className="mt-2 text-[14px] font-semibold text-ok">{state.ok}</p>}
    </article>
  );
}
