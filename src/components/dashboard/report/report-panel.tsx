"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import { ClipboardCopy, Download, Eye, EyeOff, MessageCircle, Share2, Upload, CheckCircle2, RefreshCw, Archive } from "lucide-react";

import { copyText } from "@/lib/copy-text";
import { useToast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";
import { PdfPages } from "@/components/report/pdf-pages";
import { CASES, STOP_REASONS, reportBadge, type ReportStatus } from "@/lib/report/status";
import { MAX_REMINDERS, waLink, withReportLink } from "@/lib/report/reminders";
import type { CheckedOffer } from "@/lib/report/offers-check";
import { ReportBadge } from "./report-badge";
import { useReturnConfirm } from "./use-return-confirm";

type Doc = {
  id: string;
  version: number;
  hasPdf: boolean;
  link: string | null;
  fileName: string | null;
  message: string;
  source: string;
  cas: string;
  nbOffres: number | null;
  depositedAt: string;
  depositedByName: string | null;
  depositedById: string | null;
  sentAt: string | null;
  sentByName: string | null;
  sentMessage: string | null;
  sendMode: "whatsapp_lien" | "partage_pdf" | "hors_plateforme" | null;
  validUntil: string | null;
  readAt: string | null;
  archivedAt: string | null;
  offers: CheckedOffer[];
};
type Reminder = { id: string; number: number; dueAt: string; status: string; sentAt: string | null; sentByName: string | null };
type Event = { id: string; type: string; actorName: string | null; detail: string | null; createdAt: string };
type Data = {
  status: ReportStatus | null;
  remindersActive: boolean;
  stopReason: string | null;
  stopNote: string | null;
  ouiAt: string | null;
  ouiByName: string | null;
  whatsappNumber: string | null;
  missing: string[];
  missingMessage: string;
  draftRefs: string[];
  profileText: string;
  suggestedTemplate: string;
  templates: Record<string, string>;
  documents: Doc[];
  reminders: Reminder[];
  events: Event[];
  isAdmin: boolean;
  meId: string | null;
  validityDays?: number;
};
type Recheck = { version: number; offers: CheckedOffer[]; fresh: string[]; needsUpdate: boolean };
type SendKind = { docId: string; mode: "whatsapp_lien" | "partage_pdf"; message: string };

const TZ = "Africa/Douala";
const fmtDate = (d: string | Date) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }).format(new Date(d));
const fmtTime = (d: string | Date) => new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(d));
const fmtShort = (d: string | Date) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(d));
const safe = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_").slice(0, 40);

/** Message final : lien et date de validité remplacés, lien ajouté à la fin s'il manque. */
function finalMessage(message: string, link: string | null, validityDays: number) {
  const until = fmtDate(new Date(Date.now() + validityDays * 86_400_000));
  let text = message.replaceAll("{date_validite}", until);
  text = link ? text.replaceAll("{lien_rapport}", link) : text.split("\n").filter((l) => !l.includes("{lien_rapport}")).join("\n");
  return withReportLink(text, link);
}

export function ReportPanel({ candidateId, code, firstName }: { candidateId: string; code: string; firstName: string }) {
  const t = useTranslations("dashboard.report");
  const toast = useToast();
  const base = `/api/candidatures/${candidateId}/rapports`;
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositTemplate, setDepositTemplate] = useState<string | null>(null);
  const [stopOpen, setStopOpen] = useState(false);
  const [recheck, setRecheck] = useState<Recheck | null>(null);
  const confirm = useReturnConfirm<SendKind>();

  const load = useCallback(async () => {
    const res = await fetch(base, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, [base]);
  useEffect(() => {
    load();
  }, [load]);

  async function act(body: Record<string, unknown>, ok?: string) {
    setBusy(true);
    try {
      const res = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ tone: "error", title: t("failed") });
        return null;
      }
      if (ok) toast({ tone: "success", title: ok });
      await load();
      return json;
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <p className="py-6 text-sm text-gris">{t("loading")}</p>;

  const docs = data.documents.filter((d) => !d.archivedAt);
  const latest = docs[0] ?? null;
  const sent = docs.find((d) => d.sentAt) ?? null;
  const pendingDoc = latest && !latest.sentAt ? latest : null;
  const validityDays = data.validityDays ?? 7;
  const lastReminder = Math.max(0, ...data.reminders.filter((r) => r.status === "envoyee").map((r) => r.number));
  const badge = reportBadge({ status: data.status, latest, sent: sent && { sentAt: sent.sentAt!, sentByName: sent.sentByName, readAt: sent.readAt }, lastReminder, stopReason: data.stopReason });
  const closed = data.status === "oui_recu" || data.status === "premier_versement_recu" || data.status === "sans_suite";
  const followed = data.status === "envoye" || data.status === "lu";

  const copyProfile = async () => toast((await copyText(data.profileText)) ? { tone: "success", title: t("profileCopied") } : { tone: "error", title: t("failed") });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ReportBadge badge={badge} />
        <button type="button" onClick={copyProfile} className="btn-sm-ghost">
          <ClipboardCopy className="h-4 w-4" /> {t("copyProfile")}
        </button>
      </div>

      {/* 0. Profil incomplet (PACK-13 §3.6) : poser la question avant tout rapport */}
      {data.status === "infos_manquantes" && <MissingInfo data={data} busy={busy} onReceived={() => act({ action: "infosRecues" })} />}

      {/* 1. Rien de déposé : « Nouveau » */}
      {!latest && !depositOpen && (
        <button type="button" onClick={() => setDepositOpen(true)} className="btn-sm-dark w-full !min-h-[48px] sm:w-auto">
          <Upload className="h-4 w-4" /> {t("deposit")}
        </button>
      )}

      {depositOpen && (
        <DepositForm
          code={code}
          firstName={firstName}
          uploadUrl={`${base}/upload`}
          templates={data.templates}
          initialTemplate={depositTemplate}
          draftRefs={recheck ? [...recheck.offers.filter((o) => o.state !== "closed").map((o) => o.ref), ...recheck.fresh].slice(0, 4) : data.draftRefs}
          defaultCas={sent?.cas ?? "standard"}
          onCancel={() => {
            setDepositOpen(false);
            setDepositTemplate(null);
          }}
          onSave={async (body) => {
            const ok = await act({ action: "deposit", ...body }, t("deposited"));
            if (ok) {
              setDepositOpen(false);
              setDepositTemplate(null);
              setRecheck(null);
            }
          }}
          busy={busy}
        />
      )}

      {/* 2. Version prête, pas encore envoyée */}
      {pendingDoc && !depositOpen && (
        <ReadyBlock
          key={pendingDoc.id}
          doc={pendingDoc}
          base={base}
          number={data.whatsappNumber}
          validityDays={validityDays}
          canArchive={data.isAdmin || (pendingDoc.depositedById !== null && pendingDoc.depositedById === data.meId)}
          busy={busy}
          onSaveMessage={(message) => act({ action: "message", documentId: pendingDoc.id, message })}
          onSendStart={(s) => confirm.start(s)}
          onMarkSent={() => act({ action: "sent", documentId: pendingDoc.id, mode: "hors_plateforme", message: finalMessage(pendingDoc.message, pendingDoc.link, validityDays) }, t("markedSent"))}
          onReplace={() => setDepositOpen(true)}
          onArchive={() => window.confirm(t("archiveConfirm", { version: pendingDoc.version })) && act({ action: "archive", documentId: pendingDoc.id })}
        />
      )}

      {/* 3. Envoyé et suivants */}
      {sent && (
        <SentBlock
          doc={sent}
          base={base}
          reminders={data.reminders.filter((r) => r.status !== "annulee" || r.sentAt)}
          number={data.whatsappNumber}
          status={data.status}
          busy={busy}
          onResend={() => confirm.start({ docId: sent.id, mode: "whatsapp_lien", message: sent.sentMessage ?? sent.message })}
          onCancelSend={() => window.confirm(t("cancelSendConfirm", { version: sent.version })) && act({ action: "cancel", documentId: sent.id }, t("sendCancelled"))}
        />
      )}

      {data.status === "premier_versement_recu" && <p className="rounded-brand bg-noir px-3 py-2 text-sm font-semibold text-white">{t("paid")}</p>}
      {data.ouiAt && <p className="rounded-brand bg-[#E1F6EA] px-3 py-2 text-sm font-semibold text-ok">{t("ouiDone", { date: fmtDate(data.ouiAt), name: data.ouiByName ?? "" })}</p>}
      {data.status === "sans_suite" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-brand bg-fond px-3 py-2 text-sm">
          <span>
            {t("stopped", { reason: data.stopReason ? t(`stopReasons.${data.stopReason}` as "stopReasons.autre") : "" })}
            {data.stopNote ? ` · ${data.stopNote}` : ""}
          </span>
          <button type="button" disabled={busy} onClick={() => act({ action: "resume" })} className="btn-sm-ghost">
            {t("resume")}
          </button>
        </div>
      )}

      {/* Suite : OUI, arrêt, revérifier */}
      {sent && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const r = await act({ action: "recheck" });
              if (r) setRecheck(r as Recheck);
            }}
            className={closed && data.status !== "sans_suite" ? "btn-sm-dark" : "btn-sm-ghost"}
          >
            <RefreshCw className="h-4 w-4" /> {t("recheck")}
          </button>
          {!pendingDoc && !depositOpen && (
            <button type="button" onClick={() => setDepositOpen(true)} className="btn-sm-ghost">
              <Upload className="h-4 w-4" /> {t("newVersion")}
            </button>
          )}
          {followed && (
            <>
              <button type="button" disabled={busy} onClick={() => act({ action: "oui" }, t("ouiSaved"))} className="btn-sm bg-ok text-white">
                <CheckCircle2 className="h-4 w-4" /> {t("oui")}
              </button>
              <button type="button" disabled={busy} onClick={() => setStopOpen(true)} className="btn-sm-ghost">
                {t("stop")}
              </button>
            </>
          )}
        </div>
      )}

      {recheck && (
        <RecheckResult
          r={recheck}
          onPrepare={() => {
            setDepositTemplate("MSG-MAJ");
            setDepositOpen(true);
          }}
        />
      )}

      <Versions docs={data.documents.filter((d) => d.id !== latest?.id && d.id !== sent?.id)} base={base} />
      <History events={data.events} />

      {stopOpen && <StopDialog busy={busy} onClose={() => setStopOpen(false)} onStop={async (reason, note) => (await act({ action: "stop", reason, note }, t("stopSaved"))) && setStopOpen(false)} />}

      {confirm.ask && confirm.pending && (
        <Dialog
          title={t("confirmTitle")}
          tone="success"
          onClose={confirm.clear}
          busy={busy}
          footer={
            <>
              <button type="button" onClick={confirm.clear} className="btn-sm-ghost">
                {t("confirmNo")}
              </button>
              <button
                type="button"
                disabled={busy}
                className="btn-sm-dark"
                onClick={async () => {
                  const p = confirm.pending!;
                  if (await act({ action: "sent", documentId: p.docId, mode: p.mode, message: p.message }, t("markedSent"))) confirm.clear();
                }}
              >
                {t("confirmYes")}
              </button>
            </>
          }
        />
      )}
    </div>
  );
}

// ── Profil incomplet ──

function MissingInfo({ data, busy, onReceived }: { data: Data; busy: boolean; onReceived: () => void }) {
  const t = useTranslations("dashboard.report");
  const toast = useToast();
  return (
    <div className="space-y-2 rounded-brand border-2 border-[#E8E8EC] p-3 text-sm">
      <p className="font-bold">{t("missingTitle")}</p>
      <ul className="list-disc pl-5">
        {data.missing.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <p className="whitespace-pre-line rounded-brand bg-fond p-3">{data.missingMessage}</p>
      <div className="flex flex-wrap gap-2">
        {data.whatsappNumber && (
          <a href={waLink(data.whatsappNumber, data.missingMessage)} target="_blank" rel="noopener noreferrer" className="btn-sm bg-[#1FAF55] text-white">
            <MessageCircle className="h-4 w-4" /> {t("missingAsk")}
          </a>
        )}
        <button type="button" onClick={async () => toast((await copyText(data.missingMessage)) ? { tone: "success", title: t("messageCopied") } : { tone: "error", title: t("failed") })} className="btn-sm-ghost">
          <ClipboardCopy className="h-4 w-4" /> {t("copyMessage")}
        </button>
        <button type="button" disabled={busy} onClick={onReceived} className="btn-sm-dark">
          {t("missingReceived")}
        </button>
      </div>
    </div>
  );
}

// ── Dépôt ──

function DepositForm({
  code,
  firstName,
  uploadUrl,
  templates,
  initialTemplate,
  draftRefs,
  defaultCas,
  onCancel,
  onSave,
  busy,
}: {
  code: string;
  firstName: string;
  uploadUrl: string;
  templates: Record<string, string>;
  initialTemplate: string | null;
  draftRefs: string[];
  defaultCas: string;
  onCancel: () => void;
  onSave: (body: { file: { url: string; name: string } | null; message: string; cas: string; nbOffres: number | null; refs: string }) => Promise<void>;
  busy: boolean;
}) {
  const t = useTranslations("dashboard.report");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState(initialTemplate ? templates[initialTemplate] ?? "" : "");
  const [cas, setCas] = useState(defaultCas);
  const [nb, setNb] = useState(draftRefs.length ? String(draftRefs.length) : "");
  const [refs, setRefs] = useState(draftRefs.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file && !message.trim()) return setError(t("needPdfOrMessage"));
    if (file && (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024)) return setError(t("pdfOnly"));
    let uploaded: { url: string; name: string } | null = null;
    if (file) {
      setUploading(true);
      try {
        const name = `Rapport_Odysseo_${safe(firstName) || code}.pdf`;
        const blob = await upload(`documents/equipe/rapports/${code}/${name}`, file, { access: "private", handleUploadUrl: uploadUrl, contentType: "application/pdf" });
        uploaded = { url: blob.url, name };
      } catch {
        setUploading(false);
        return setError(t("uploadFailed"));
      }
      setUploading(false);
    }
    await onSave({ file: uploaded, message: message.trim(), cas, nbOffres: nb ? Number(nb) : null, refs });
  }

  const field = "field-input mt-1 !min-h-[44px] text-sm";
  return (
    <form onSubmit={submit} className="space-y-3 rounded-brand border border-bord bg-fond p-3">
      <p className="text-sm font-extrabold">{t("depositTitle")}</p>
      <label className="block text-xs font-bold">
        {t("pdf")}
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
      </label>
      <label className="block text-xs font-bold">
        <span className="flex flex-wrap items-center justify-between gap-2">
          {t("message")}
          <select className="field-input !min-h-[34px] !w-auto py-0 text-xs" value="" onChange={(e) => e.target.value && setMessage(templates[e.target.value] ?? "")}>
            <option value="">{t("template")}</option>
            {Object.keys(templates).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} className="field-input mt-1 text-sm" />
        <span className="mt-1 block font-normal text-gris">{t("messageHint")}</span>
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold">
          {t("cas")}
          <select value={cas} onChange={(e) => setCas(e.target.value)} className={field}>
            {CASES.map((c) => (
              <option key={c} value={c}>
                {t(`cases.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          {t("nbOffres")}
          <input inputMode="numeric" value={nb} onChange={(e) => setNb(e.target.value.replace(/\D/g, "").slice(0, 2))} className={field} />
        </label>
        <label className="text-xs font-bold">
          {t("refs")}
          <input value={refs} onChange={(e) => setRefs(e.target.value)} className={field} placeholder="B-03, L-07" />
        </label>
      </div>
      <p className="text-xs text-gris">{t("refsHint")}</p>
      {error && <p className="text-sm font-semibold text-erreur">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || uploading} className="btn-sm-dark !min-h-[44px]">
          {busy || uploading ? t("saving") : t("save")}
        </button>
        <button type="button" onClick={onCancel} className="btn-sm-ghost !min-h-[44px]">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

// ── Prêt à envoyer ──

function ReadyBlock({
  doc,
  base,
  number,
  validityDays,
  canArchive,
  busy,
  onSaveMessage,
  onSendStart,
  onMarkSent,
  onReplace,
  onArchive,
}: {
  doc: Doc;
  base: string;
  number: string | null;
  validityDays: number;
  canArchive: boolean;
  busy: boolean;
  onSaveMessage: (m: string) => void;
  onSendStart: (s: SendKind) => void;
  onMarkSent: () => void;
  onReplace: () => void;
  onArchive: () => void;
}) {
  const t = useTranslations("dashboard.report");
  const toast = useToast();
  const [message, setMessage] = useState(doc.message);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(true);
  const pdfUrl = `${base}/${doc.id}/pdf`;
  const final = useMemo(() => finalMessage(message, doc.link, validityDays), [message, doc.link, validityDays]);

  // Le PDF est chargé à l'avance : le partage natif doit partir directement du clic (iPhone).
  useEffect(() => {
    if (!doc.hasPdf) return;
    let cancelled = false;
    fetch(pdfUrl)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!b || cancelled) return;
        const f = new File([b], doc.fileName || "Rapport_Odysseo.pdf", { type: "application/pdf" });
        if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [f] })) setFile(f);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pdfUrl, doc.hasPdf, doc.fileName]);

  const share = () => {
    if (!file) return;
    void copyText(final);
    toast({ tone: "info", title: t("shareToast") });
    onSendStart({ docId: doc.id, mode: "partage_pdf", message: final });
    navigator.share({ files: [file], text: final }).catch(() => undefined);
  };

  return (
    <div className="space-y-3 rounded-brand border-2 border-[#FFE9CC] p-3">
      <p className="text-sm font-semibold">
        {t("ready", { version: doc.version, date: fmtShort(doc.depositedAt), name: doc.depositedByName ?? "" })}
        <span className="font-normal text-gris"> · {t(`source.${doc.source}` as "source.manuel")} · {t(`cases.${doc.cas}` as "cases.standard")}</span>
      </p>
      <PdfBlock doc={doc} pdfUrl={pdfUrl} preview={preview} setPreview={setPreview} />
      <label className="block text-xs font-bold">
        {t("message")}
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} onBlur={() => message.trim() && message !== doc.message && onSaveMessage(message.trim())} rows={8} className="field-input mt-1 text-sm" />
      </label>
      {!number && <p className="rounded-brand bg-erreur-fond px-3 py-2 text-xs font-semibold text-erreur">{t("noNumber")}</p>}
      <div className="grid gap-2 sm:flex sm:flex-wrap">
        {number ? (
          <a
            href={waLink(number, final)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onSendStart({ docId: doc.id, mode: "whatsapp_lien", message: final })}
            className="btn-sm !min-h-[48px] justify-center bg-[#1FAF55] text-white hover:bg-[#1A9A4A]"
          >
            <MessageCircle className="h-4 w-4" /> {t("sendWhatsapp")}
          </a>
        ) : (
          <button type="button" disabled className="btn-sm !min-h-[48px] justify-center bg-[#1FAF55]/40 text-white">
            <MessageCircle className="h-4 w-4" /> {t("sendWhatsapp")}
          </button>
        )}
        {file && (
          <button type="button" onClick={share} className="btn-sm-dark !min-h-[48px] justify-center">
            <Share2 className="h-4 w-4" /> {t("sharePdf")}
          </button>
        )}
        <button
          type="button"
          onClick={async () => toast((await copyText(final)) ? { tone: "success", title: t("messageCopied") } : { tone: "error", title: t("failed") })}
          className="btn-sm-ghost !min-h-[44px] justify-center"
        >
          <ClipboardCopy className="h-4 w-4" /> {t("copyMessage")}
        </button>
        <button type="button" onClick={onReplace} className="btn-sm-ghost !min-h-[44px] justify-center">
          <Upload className="h-4 w-4" /> {t("replace")}
        </button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <button type="button" disabled={busy} onClick={onMarkSent} className="text-gris underline hover:text-noir">
          {t("markSent")}
        </button>
        {canArchive && (
          <button type="button" disabled={busy} onClick={onArchive} className="inline-flex items-center gap-1 text-gris underline hover:text-noir">
            <Archive className="h-3 w-3" /> {t("archive")}
          </button>
        )}
      </div>
    </div>
  );
}

function PdfBlock({ doc, pdfUrl, preview, setPreview }: { doc: Doc; pdfUrl: string; preview: boolean; setPreview: (v: boolean) => void }) {
  const t = useTranslations("dashboard.report");
  if (!doc.hasPdf) return <p className="text-xs text-gris">{t("noPdf")}</p>;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <a href={`${pdfUrl}?download`} className="btn-sm-ghost">
          <Download className="h-4 w-4" /> {t("download")}
        </a>
        <button type="button" onClick={() => setPreview(!preview)} className="btn-sm-ghost">
          {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {preview ? t("hidePreview") : t("preview")}
        </button>
      </div>
      {preview && (
        <div className="mt-2 max-h-[70vh] overflow-y-auto rounded-brand bg-[#E8E8EC] p-2">
          <PdfPages src={pdfUrl} loadingLabel={t("previewLoading")} errorLabel={t("previewError")} />
        </div>
      )}
    </div>
  );
}

// ── Envoyé ──

function SentBlock({
  doc,
  base,
  reminders,
  number,
  status,
  busy,
  onResend,
  onCancelSend,
}: {
  doc: Doc;
  base: string;
  reminders: Reminder[];
  number: string | null;
  status: ReportStatus | null;
  busy: boolean;
  onResend: () => void;
  onCancelSend: () => void;
}) {
  const t = useTranslations("dashboard.report");
  const [preview, setPreview] = useState(false);
  const message = doc.sentMessage ?? doc.message;
  return (
    <div className="space-y-3">
      <div className="rounded-brand bg-[#E1F6EA] px-3 py-2 text-sm text-ok">
        <p className="font-bold">
          {t("sentBox", { date: fmtDate(doc.sentAt!), time: fmtTime(doc.sentAt!), name: doc.sentByName ?? "" })} {doc.sendMode ? t(`sentMode.${doc.sendMode}`) : ""}
          {doc.version > 1 ? ` · v${doc.version}` : ""}
        </p>
        <p className="text-xs">
          {doc.readAt ? t("readOn", { date: fmtShort(doc.readAt) }) : t("notRead")}
          {doc.validUntil ? ` · ${t("validUntil", { date: fmtDate(doc.validUntil) })}` : ""}
        </p>
      </div>
      <PdfBlock doc={doc} pdfUrl={`${base}/${doc.id}/pdf`} preview={preview} setPreview={setPreview} />
      {message && (
        <details>
          <summary className="cursor-pointer text-xs font-bold">{t("sentMessage")}</summary>
          <p className="mt-1 whitespace-pre-line rounded-brand bg-fond p-3 text-sm">{message}</p>
        </details>
      )}
      <div>
        <p className="mb-1 text-xs font-bold">{t("reminders")}</p>
        {reminders.length === 0 ? (
          <p className="text-xs text-gris">{t("noReminders")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {reminders.map((r) => (
              <li key={r.id} className={r.status === "annulee" ? "text-gris line-through" : ""}>
                {r.status === "envoyee"
                  ? t("reminderSent", { n: r.number, max: MAX_REMINDERS, date: fmtShort(r.sentAt!), name: r.sentByName ?? "" })
                  : r.status === "annulee"
                    ? t("reminderCancelled", { n: r.number, max: MAX_REMINDERS })
                    : r.status === "reportee"
                      ? t("reminderPostponed", { n: r.number, max: MAX_REMINDERS, date: fmtDate(r.dueAt) })
                      : t("reminderPlanned", { n: r.number, max: MAX_REMINDERS, date: fmtDate(r.dueAt) })}
              </li>
            ))}
          </ul>
        )}
      </div>
      {(status === "envoye" || status === "lu") && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {number && message && (
            <a href={waLink(number, message)} target="_blank" rel="noopener noreferrer" onClick={onResend} className="text-gris underline hover:text-noir">
              {t("resend")}
            </a>
          )}
          <button type="button" disabled={busy} onClick={onCancelSend} className="text-gris underline hover:text-noir">
            {t("cancelSend")}
          </button>
        </div>
      )}
    </div>
  );
}

function RecheckResult({ r, onPrepare }: { r: Recheck; onPrepare: () => void }) {
  const t = useTranslations("dashboard.report");
  return (
    <div className="space-y-2 rounded-brand border border-bord p-3 text-sm">
      <p className="font-bold">{t("recheckTitle", { version: r.version })}</p>
      {r.offers.length === 0 ? (
        <p className="text-gris">{t("noSnapshot")}</p>
      ) : (
        <ul className="space-y-1">
          {r.offers.map((o) => (
            <li key={o.ref}>
              <span className="font-mono font-bold">{o.ref}</span> · {t(`offerState.${o.state}`)}
              {o.date_limite ? ` · ${t("deadline", { date: fmtDate(o.date_limite) })}` : ""}
            </li>
          ))}
        </ul>
      )}
      {r.fresh.length > 0 && <p>{t("fresh", { refs: r.fresh.join(", ") })}</p>}
      {r.offers.length > 0 && !r.needsUpdate && r.offers.every((o) => o.state === "ok") && <p className="font-semibold text-ok">{t("allGood")}</p>}
      {(r.needsUpdate || r.fresh.length > 0) && (
        <div>
          <button type="button" onClick={onPrepare} className="btn-sm-dark">
            {t("prepareUpdate")}
          </button>
          <p className="mt-1 text-xs text-gris">{t("prepareUpdateHint", { version: r.version + 1 })}</p>
        </div>
      )}
    </div>
  );
}

function Versions({ docs, base }: { docs: Doc[]; base: string }) {
  const t = useTranslations("dashboard.report");
  if (docs.length === 0) return null;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs font-bold">{t("versions")}</summary>
      <ul className="mt-1 space-y-1">
        {docs.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-2">
            <span>
              {t("versionLine", {
                version: d.version,
                state: d.archivedAt ? t("versionArchived") : d.sentAt ? t("versionSent", { date: fmtDate(d.sentAt) }) : t("versionReady"),
              })}
            </span>
            {d.hasPdf && (
              <a href={`${base}/${d.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                PDF
              </a>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function History({ events }: { events: Event[] }) {
  const t = useTranslations("dashboard.report");
  return (
    <div>
      <p className="mb-1 text-xs font-bold">{t("history")}</p>
      {events.length === 0 ? (
        <p className="text-xs text-gris">{t("noHistory")}</p>
      ) : (
        <ol className="space-y-1 border-l-2 border-bord pl-3 text-sm">
          {events.map((e) => (
            <li key={e.id}>
              <span className="tabular-nums text-gris">{fmtShort(e.createdAt)}</span> · {t(`events.${e.type}` as "events.note")}
              {e.detail ? ` (${e.detail})` : ""}
              {e.actorName ? ` · ${t("by", { name: e.actorName })}` : ""}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StopDialog({ busy, onClose, onStop }: { busy: boolean; onClose: () => void; onStop: (reason: string, note: string) => void }) {
  const t = useTranslations("dashboard.report");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  return (
    <Dialog
      title={t("stop")}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-sm-ghost">
            {t("cancel")}
          </button>
          <button type="button" disabled={!reason || busy} onClick={() => onStop(reason, note)} className="btn-sm-dark">
            {t("stopConfirm")}
          </button>
        </>
      }
    >
      <label className="block text-xs font-bold">
        {t("stopReason")}
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="field-input mt-1 !min-h-[44px] text-sm">
          <option value="">—</option>
          {STOP_REASONS.map((r) => (
            <option key={r} value={r}>
              {t(`stopReasons.${r}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-xs font-bold">
        {t("stopNote")}
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="field-input mt-1 !min-h-[44px] text-sm" />
      </label>
    </Dialog>
  );
}
