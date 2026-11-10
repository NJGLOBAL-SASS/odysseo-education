"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import { ArrowDown, ArrowUp, Copy, Download, Eye, FileUp, Plus, Trash2, X } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { formatBytes } from "@/lib/documents";
import { passportTooShort } from "@/lib/admission/rules";
import { cn } from "@/lib/utils";

type Role = "ambitieuse" | "cible" | "securite";
type ReportOffer = { ref: string; role: Role; revealedAt?: string | null; revealReason?: string | null; university?: string | null; place?: string | null };
type FileRow = { id: string; name: string; size: number; contentType: string; createdAt: string; uploadedByPortalId: string | null };
type Item = {
  id: string;
  key: string;
  kind: "fichier" | "formulaire" | "prepare";
  labelFr: string;
  labelEn: string;
  phase: string;
  required: boolean;
  status: string;
  teamComment: string | null;
  studentComment: string | null;
  documentLanguage: string | null;
  passportExpiry: string | null;
  formData: unknown;
  removedAt: string | null;
  files: FileRow[];
};
type Report = {
  program: string;
  offers: ReportOffer[];
  comment: string | null;
  version: number;
  publishedAt: string | null;
  publishedByName: string | null;
  validatedAt: string | null;
  validatedVersion: number | null;
  paymentReceivedAt: string | null;
  paymentAmount: number | null;
  paymentRecordedByName: string | null;
};
type Data = {
  report: Report | null;
  items: Item[];
  progress: { done: number; total: number };
  translations: { id: string; label: string; language: string; doneAt: string | null; doneByName: string | null }[];
};

const PROGRAMS = ["langue-chinoise", "bachelor", "master", "doctorat"] as const;
const ROLES: Role[] = ["ambitieuse", "cible", "securite"];
const REVEAL = ["entretien", "pre_admission", "admission"] as const;

const fill = (tpl: string, vars: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
const ascii = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/**
 * Fiche dossier (équipe) — PACK-10 : rapport d'admissibilité (offres, rôles, commentaire, cursus),
 * publication, validation, tranche 1, révélation du nom de l'université, checklist et traductions.
 * Les messages WhatsApp copiés sont toujours en français (modèles passés par le serveur).
 */
export function AdmissionPanel({
  candidateId,
  code,
  fullName,
  firstName,
  hasSpace,
  offerOptions,
  defaultOffers,
  defaultProgram,
  portalLink,
  advisorName,
  wa,
  purgeEligible,
  isAdmin,
}: {
  candidateId: string;
  code: string;
  fullName: string;
  firstName: string;
  hasSpace: boolean;
  offerOptions: { ref: string; label: string }[];
  defaultOffers: { ref: string; role: Role }[];
  defaultProgram: string;
  portalLink: string;
  advisorName: string;
  wa: Record<"report" | "payment" | "redo" | "prepared" | "reminder", string>;
  purgeEligible: boolean;
  isAdmin: boolean;
}) {
  const t = useTranslations("dashboard.candidate.admission");
  const tStatus = useTranslations("portal.checklist.status");
  const locale = useLocale();
  const [data, setData] = useState<Data | null>(null);
  const [program, setProgram] = useState(defaultProgram);
  const [offers, setOffers] = useState<{ ref: string; role: Role }[]>(defaultOffers);
  const [comment, setComment] = useState("");
  const [flash, setFlash] = useState<{ ok?: string; error?: string }>({});
  const [busy, setBusy] = useState("");
  const [zipLabel, setZipLabel] = useState("");
  const [payment, setPayment] = useState({ amount: "", date: new Date().toISOString().slice(0, 10) });

  const load = useCallback(async () => {
    const res = await fetch(`/api/candidatures/${candidateId}/admission`, { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const json = (await res.json()) as Data;
    setData(json);
    if (json.report) {
      setProgram(json.report.program);
      setOffers(json.report.offers.map((o) => ({ ref: o.ref, role: o.role })));
      setComment(json.report.comment ?? "");
    }
  }, [candidateId]);

  useEffect(() => {
    load();
  }, [load]);

  async function call(action: string, body: Record<string, unknown> = {}, okMessage?: string) {
    setBusy(action);
    setFlash({});
    const res = await fetch(`/api/candidatures/${candidateId}/admission`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    }).catch(() => null);
    setBusy("");
    if (!res?.ok) {
      const err = res ? ((await res.json().catch(() => ({}))) as { error?: string }).error : undefined;
      setFlash({ error: err && ["duplicateOffer", "tooFewOffers"].includes(err) ? t(`errors.${err as "duplicateOffer"}`) : t("errors.generic") });
      return false;
    }
    if (okMessage) setFlash({ ok: okMessage });
    await load();
    return true;
  }

  async function patchItem(id: string, body: Record<string, unknown>) {
    setBusy(id);
    const res = await fetch(`/api/checklist-items/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setBusy("");
    if (!res?.ok) setFlash({ error: t("errors.generic") });
    await load();
    return Boolean(res?.ok);
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setFlash({ ok: t("copied") });
  }

  function saveDraft() {
    if (offers.length < 2 || offers.length > 4 || offers.some((o) => !o.ref)) return setFlash({ error: t("errors.offers") });
    return call("save", { program, offers, comment }, t("saved"));
  }

  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "medium" });
  const report = data?.report ?? null;
  const items = data?.items ?? [];
  const active = items.filter((i) => !i.removedAt);
  const link = `${portalLink}/fr/espace`;

  // Messages WhatsApp (français).
  const redoItems = active.filter((i) => i.status === "a_refaire");
  const preparedReady = active.filter((i) => i.kind === "prepare" && i.status === "a_valider");
  const missing = active.filter((i) => i.kind !== "prepare" && i.required && (i.status === "a_fournir" || i.status === "a_refaire"));
  const nowCount = active.filter((i) => i.kind !== "prepare" && i.phase === "maintenant").length;

  async function downloadZip() {
    const files = active.flatMap((i) => i.files.map((f, n) => ({ f, item: i, n })));
    if (!files.length) return;
    const { zipSync } = await import("fflate");
    const parts = fullName.trim().split(/\s+/);
    const nom = ascii(parts.find((w) => !/\p{Ll}/u.test(w)) ?? parts[0] ?? "").toUpperCase();
    const prefix = [nom, ascii(firstName)].filter(Boolean).join("_") || code;
    const entries: Record<string, Uint8Array> = {};
    for (const [k, { f, item, n }] of files.entries()) {
      setZipLabel(t("zipWorking", { done: k, total: files.length }));
      const res = await fetch(`/api/documents/files/${f.id}?mode=download`).catch(() => null);
      if (!res?.ok) continue;
      const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : "bin";
      const count = item.files.length > 1 ? `_${n + 1}` : "";
      entries[`${prefix}_${ascii(item.labelFr).slice(0, 60)}${count}.${ext}`] = new Uint8Array(await res.arrayBuffer());
    }
    setZipLabel("");
    const zip = zipSync(entries, { level: 0 });
    const url = URL.createObjectURL(new Blob([zip as Uint8Array<ArrayBuffer>], { type: "application/zip" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${prefix}_${code}.zip` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function uploadPrepared(item: Item, list: FileList | null) {
    if (!list?.length) return;
    setBusy(item.id);
    try {
      const uploaded = [];
      const base = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
      for (const [i, file] of Array.from(list).entries()) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
        const blob = await upload(`documents/checklist/${code}/${item.key}/${base}-${i + 1}.${ext}`, file, {
          access: "private",
          handleUploadUrl: "/api/documents/upload",
          multipart: file.size > 8 * 1024 * 1024,
        });
        uploaded.push({ url: blob.url, name: file.name });
      }
      await patchItem(item.id, { action: "prepared", files: uploaded });
    } catch {
      setFlash({ error: t("errors.generic") });
      setBusy("");
    }
  }

  async function purge() {
    if (!window.confirm(t("purgeConfirm"))) return;
    setBusy("purge");
    await fetch(`/api/candidatures/${candidateId}/purge-documents`, { method: "POST" }).catch(() => null);
    setBusy("");
    await load();
  }

  if (!data) return <div className="skeleton h-40 rounded-brand" />;

  return (
    <div className="space-y-5 text-sm">
      {!hasSpace && <p className="rounded-[8px] bg-[#FFF5D6] px-3 py-2">{t("noSpace")}</p>}

      {/* ── Rapport ── */}
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block font-semibold">{t("program")}</span>
          <select value={program} onChange={(e) => setProgram(e.target.value)} className="field-input">
            {PROGRAMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="mb-1 font-semibold">{t("offers")}</p>
          <ul className="space-y-2">
            {offers.map((o, i) => {
              const saved = report?.offers.find((x) => x.ref === o.ref);
              return (
                <li key={i} className="rounded-[10px] border border-bord p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={o.ref}
                      onChange={(e) => setOffers((l) => l.map((x, j) => (j === i ? { ...x, ref: e.target.value } : x)))}
                      className="field-input min-w-0 flex-1 !min-h-[40px] text-sm"
                    >
                      <option value="">{t("chooseOffer")}</option>
                      {offerOptions.map((opt) => (
                        <option key={opt.ref} value={opt.ref}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={o.role}
                      aria-label={t("role")}
                      onChange={(e) => setOffers((l) => l.map((x, j) => (j === i ? { ...x, role: e.target.value as Role } : x)))}
                      className="field-input !min-h-[40px] !w-auto text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t(`roles.${r}`)}
                        </option>
                      ))}
                    </select>
                    <button type="button" aria-label={t("up")} disabled={i === 0} onClick={() => setOffers((l) => { const c = [...l]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; })} className="rounded p-1.5 hover:bg-fond disabled:opacity-30">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={t("down")} disabled={i === offers.length - 1} onClick={() => setOffers((l) => { const c = [...l]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; return c; })} className="rounded p-1.5 hover:bg-fond disabled:opacity-30">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={t("removeOffer")} onClick={() => setOffers((l) => l.filter((_, j) => j !== i))} className="rounded p-1.5 text-erreur hover:bg-fond">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {saved && report?.publishedAt && (
                    <label className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-gris">{t("reveal")} :</span>
                      <select
                        value={saved.revealReason ?? ""}
                        onChange={(e) => call("reveal", { ref: saved.ref, reason: e.target.value || null })}
                        className="field-input !min-h-[34px] !w-auto text-xs"
                      >
                        <option value="">{t("revealHidden")}</option>
                        {REVEAL.map((r) => (
                          <option key={r} value={r}>
                            {t(`revealReasons.${r}`)}
                          </option>
                        ))}
                      </select>
                      {saved.revealReason && saved.university && <b>{saved.university}</b>}
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
          {offers.length < 4 && (
            <button type="button" onClick={() => setOffers((l) => [...l, { ref: "", role: "cible" }])} className="btn-sm-ghost mt-2">
              <Plus className="h-4 w-4" /> {t("addOffer")}
            </button>
          )}
        </div>

        <label className="block">
          <span className="mb-1 block font-semibold">{t("comment")}</span>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={3} className="field-input" />
          <span className="text-xs text-gris">{comment.length}/500</span>
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveDraft} disabled={Boolean(busy)} className="btn-sm-ghost">
            {busy === "save" && <Spinner />} {t("save")}
          </button>
          {report && (
            <button type="button" onClick={() => call("publish")} disabled={Boolean(busy) || !hasSpace} className="btn-sm-dark">
              {busy === "publish" && <Spinner />} {report.publishedAt ? t("republish") : t("publish")}
            </button>
          )}
          {report?.publishedAt && (
            <button type="button" onClick={() => copy(fill(wa.report, { name: firstName, count: report.offers.length, link: `${portalLink}/fr/espace/rapport`, advisor: advisorName }))} className="btn-sm-ghost">
              <Copy className="h-4 w-4" /> {t("copyReport")}
            </button>
          )}
        </div>

        <ul className="space-y-1 text-xs text-gris">
          <li>
            {report?.publishedAt
              ? t("published", { version: report.version, date: dateFmt.format(new Date(report.publishedAt)), name: report.publishedByName ?? "—" })
              : t("notPublished")}
          </li>
          {report?.publishedAt &&
            (report.validatedAt && report.validatedVersion === report.version ? (
              <li className="font-semibold text-ok">{t("validated", { date: dateFmt.format(new Date(report.validatedAt)), version: report.validatedVersion })}</li>
            ) : report.validatedAt ? (
              <li className="font-semibold text-[#7A5600]">{t("validatedOld", { version: report.validatedVersion ?? 0 })}</li>
            ) : (
              <li>{t("waitingValidation")}</li>
            ))}
        </ul>

        {report?.publishedAt && !report.paymentReceivedAt && (
          <div className="rounded-[10px] border border-bord p-3">
            <p className="mb-2 font-semibold">{t("payment")}</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="mb-1 block text-xs text-gris">{t("paymentAmount")}</span>
                <input inputMode="numeric" value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value.replace(/\D/g, "") }))} className="field-input !min-h-[40px] !w-36" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-gris">{t("paymentDate")}</span>
                <input type="date" value={payment.date} onChange={(e) => setPayment((p) => ({ ...p, date: e.target.value }))} className="field-input !min-h-[40px] !w-auto" />
              </label>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => (payment.amount && payment.date ? call("payment", { amount: Number(payment.amount), date: payment.date }) : setFlash({ error: t("errors.payment") }))}
                className="btn-sm-dark"
              >
                {busy === "payment" && <Spinner />} {t("paymentSave")}
              </button>
            </div>
          </div>
        )}
        {report?.paymentReceivedAt && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-ok">
              {t("paymentDone", {
                date: dateFmt.format(new Date(report.paymentReceivedAt)),
                amount: new Intl.NumberFormat("fr-FR").format(report.paymentAmount ?? 0),
                name: report.paymentRecordedByName ?? "—",
              })}
            </p>
            <button
              type="button"
              onClick={() => copy(fill(wa.payment, { name: firstName, amount: new Intl.NumberFormat("fr-FR").format(report.paymentAmount ?? 0), link, count: nowCount }))}
              className="btn-sm-ghost"
            >
              <Copy className="h-4 w-4" /> {t("copyPayment")}
            </button>
          </div>
        )}
      </div>

      {(flash.ok || flash.error) && (
        <p role="status" className={cn("text-sm font-semibold", flash.error ? "text-erreur" : "text-ok")}>
          {flash.error ?? flash.ok}
        </p>
      )}

      {/* ── Checklist ── */}
      <div className="border-t border-bord pt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold">{t("checklist")}</h3>
          {items.length > 0 && <span className="text-xs font-semibold">{t("progress", data.progress)}</span>}
        </div>
        {!report?.paymentReceivedAt && items.length === 0 ? (
          <p className="text-gris">{t("checklistClosed")}</p>
        ) : (
          <>
            {(["maintenant", "plus_tard", "prepare"] as const).map((group) => {
              const list = items.filter((i) => (group === "prepare" ? i.kind === "prepare" : i.kind !== "prepare" && i.phase === group));
              if (!list.length) return null;
              return (
                <div key={group} className="mb-3">
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gris">{t(group === "maintenant" ? "now" : group === "plus_tard" ? "later" : "prepared")}</p>
                  <ul className="space-y-2">
                    {list.map((i) => (
                      <ChecklistRow
                        key={i.id}
                        item={i}
                        busy={busy === i.id}
                        statusLabel={tStatus(i.status as "recu")}
                        onPatch={(body) => patchItem(i.id, body)}
                        onUploadPrepared={(files) => uploadPrepared(i, files)}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
            <AddItem onAdd={(body) => call("addItem", body)} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={downloadZip} disabled={Boolean(busy || zipLabel) || !active.some((i) => i.files.length)} className="btn-sm-dark">
                {zipLabel ? <Spinner /> : <Download className="h-4 w-4" />} {zipLabel || t("zip")}
              </button>
              {redoItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => copy(fill(wa.redo, { name: firstName, count: redoItems.length, list: redoItems.map((i) => `• ${i.labelFr} : ${i.teamComment ?? ""}`).join("\n"), link }))}
                  className="btn-sm-ghost"
                >
                  <Copy className="h-4 w-4" /> {t("copyRedo")}
                </button>
              )}
              {preparedReady.length > 0 && (
                <button type="button" onClick={() => copy(fill(wa.prepared, { name: firstName, docs: preparedReady.map((i) => i.labelFr.toLowerCase()).join(", "), link }))} className="btn-sm-ghost">
                  <Copy className="h-4 w-4" /> {t("copyPrepared")}
                </button>
              )}
              {missing.length > 0 && (
                <button type="button" onClick={() => copy(fill(wa.reminder, { name: firstName, count: missing.length, deadline: "", link }))} className="btn-sm-ghost">
                  <Copy className="h-4 w-4" /> {t("copyReminder")}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Traductions ── */}
      {data.translations.length > 0 && (
        <div className="border-t border-bord pt-4">
          <h3 className="mb-2 font-extrabold">{t("translations")}</h3>
          <ul className="space-y-1.5">
            {data.translations.map((tr) => (
              <li key={tr.id}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(tr.doneAt)}
                    onChange={async (e) => {
                      await fetch(`/api/translation-tasks/${tr.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: e.target.checked }) });
                      load();
                    }}
                    className="h-4 w-4 accent-noir"
                  />
                  <span className={cn(tr.doneAt && "text-gris line-through")}>
                    {tr.label} · {t(`translationLang.${tr.language === "fr" ? "fr" : "other"}`)}
                  </span>
                  {tr.doneByName && <span className="text-xs text-gris">({tr.doneByName})</span>}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {purgeEligible && isAdmin && (
        <div className="rounded-[10px] border border-erreur bg-erreur-fond p-3">
          <p className="text-xs">{t("purgeHint")}</p>
          <button type="button" onClick={purge} disabled={busy === "purge"} className="btn-sm-dark mt-2 !bg-erreur">
            <Trash2 className="h-4 w-4" /> {t("purge")}
          </button>
        </div>
      )}
    </div>
  );
}

function ChecklistRow({
  item,
  busy,
  statusLabel,
  onPatch,
  onUploadPrepared,
}: {
  item: Item;
  busy: boolean;
  statusLabel: string;
  onPatch: (body: Record<string, unknown>) => Promise<boolean>;
  onUploadPrepared: (files: FileList | null) => void;
}) {
  const t = useTranslations("dashboard.candidate.admission");
  const locale = useLocale();
  const [redo, setRedo] = useState(false);
  const [comment, setComment] = useState("");
  const removed = Boolean(item.removedAt);
  const referees = Array.isArray(item.formData) ? (item.formData as Record<string, string>[]) : [];

  return (
    <li className={cn("rounded-[10px] border border-bord p-3", removed && "opacity-50", item.status === "recu" && "border-noir")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-semibold">
          {item.labelFr}
          {!item.required && <span className="ml-1 font-normal text-gris">({t("optional")})</span>}
        </p>
        <span className="rounded-full bg-fond px-2 py-0.5 text-xs font-bold">{removed ? t("removed") : statusLabel}</span>
      </div>
      <div className="mt-1 space-y-0.5 text-xs text-gris">
        {item.documentLanguage && <p>{t("language", { language: item.documentLanguage })}</p>}
        {item.passportExpiry && (
          <p>
            {t("passport", { date: new Date(item.passportExpiry).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR") })}{" "}
            {passportTooShort(new Date(item.passportExpiry)) && <b className="text-erreur">{t("passportShort")}</b>}
          </p>
        )}
        {item.teamComment && <p className="text-erreur">« {item.teamComment} »</p>}
        {item.studentComment && <p className="text-[#7A5600]">{t("studentComment", { comment: item.studentComment })}</p>}
      </div>
      {referees.length > 0 && (
        <div className="mt-2 text-xs">
          <p className="font-semibold">{t("referees")}</p>
          {referees.map((r, i) => (
            <p key={i}>
              {r.nom} · {r.titre} · {r.etablissement} · {r.email} {r.whatsapp && `· ${r.whatsapp}`}
            </p>
          ))}
        </div>
      )}
      {item.files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {item.files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-gris">{formatBytes(f.size, locale)}</span>
              <a href={`/api/documents/files/${f.id}?mode=view`} target="_blank" rel="noopener noreferrer" className="rounded p-1 hover:bg-fond" aria-label="Aperçu">
                <Eye className="h-4 w-4" />
              </a>
              <a href={`/api/documents/files/${f.id}?mode=download`} className="rounded p-1 hover:bg-fond" aria-label="Télécharger">
                <Download className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {!removed && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.kind === "prepare" ? (
            <label className={cn("btn-sm-ghost cursor-pointer", busy && "pointer-events-none opacity-60")}>
              {busy ? <Spinner /> : <FileUp className="h-4 w-4" />} {t("uploadPrepared")}
              <input type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => onUploadPrepared(e.target.files)} />
            </label>
          ) : (
            (item.status === "recu" || item.status === "a_refaire" || item.status === "valide") && (
              <>
                {item.status !== "valide" && (
                  <button type="button" disabled={busy} onClick={() => onPatch({ action: "review", status: "valide" })} className="btn-sm-dark">
                    {t("validate")}
                  </button>
                )}
                <button type="button" disabled={busy} onClick={() => setRedo((v) => !v)} className="btn-sm-ghost">
                  {t("redo")}
                </button>
              </>
            )
          )}
          <button type="button" disabled={busy} onClick={() => onPatch({ action: "remove" })} className="btn-sm-ghost text-erreur">
            {t("remove")}
          </button>
        </div>
      )}
      {removed && (
        <button type="button" onClick={() => onPatch({ action: "restore" })} className="btn-sm-ghost mt-2">
          {t("restore")}
        </button>
      )}
      {redo && (
        <div className="mt-2 flex gap-2">
          <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder={t("redoComment")} className="field-input !min-h-[38px] flex-1 text-sm" />
          <button
            type="button"
            disabled={busy || comment.trim().length < 3}
            onClick={async () => {
              if (await onPatch({ action: "review", status: "a_refaire", comment })) {
                setRedo(false);
                setComment("");
              }
            }}
            className="btn-sm-dark"
          >
            {t("sendRedo")}
          </button>
        </div>
      )}
    </li>
  );
}

function AddItem({ onAdd }: { onAdd: (body: Record<string, unknown>) => Promise<boolean> }) {
  const t = useTranslations("dashboard.candidate.admission");
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [help, setHelp] = useState("");
  const [later, setLater] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-sm-ghost">
        <Plus className="h-4 w-4" /> {t("addItem")}
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-[10px] border border-bord p-3">
      <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={160} placeholder={t("addItemLabel")} className="field-input !min-h-[40px] text-sm" />
      <input value={help} onChange={(e) => setHelp(e.target.value)} maxLength={500} placeholder={t("addItemHelp")} className="field-input !min-h-[40px] text-sm" />
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={later} onChange={(e) => setLater(e.target.checked)} className="accent-noir" /> {t("addItemLater")}
      </label>
      <button
        type="button"
        disabled={label.trim().length < 2}
        onClick={async () => {
          if (await onAdd({ labelFr: label, helpFr: help || undefined, phase: later ? "plus_tard" : "maintenant" })) {
            setOpen(false);
            setLabel("");
            setHelp("");
          }
        }}
        className="btn-sm-dark"
      >
        {t("addItemSave")}
      </button>
    </div>
  );
}
