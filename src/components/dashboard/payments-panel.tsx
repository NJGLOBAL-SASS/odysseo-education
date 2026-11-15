"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import { CheckCircle2, Download, Eye, Mail, MessageCircle, Plus, XCircle } from "lucide-react";

import { METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod, whatsappLink } from "@/lib/payments/rules";

type Payment = {
  id: string;
  amount: number;
  stepIndex: number | null;
  stepLabel: string | null;
  method: string;
  methodNote: string | null;
  paidOn: string;
  status: "en_verification" | "confirme" | "refuse";
  rejectReason: string | null;
  source: string;
  declaredByName: string | null;
  recordedByName: string | null;
  confirmedByName: string | null;
  receiptNumber: string | null;
  receiptEmailedAt: string | null;
  hasProof: boolean;
};
type Data = {
  payments: Payment[];
  program: { name: string; total: number; steps: { label: string; when: string; amount: number }[] } | null;
  legacy: { date: string; amount: number | null } | null;
};

const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);

/**
 * Fiche dossier : paiements à vérifier (preuve, confirmer, refuser), paiements confirmés
 * (reçu PDF, WhatsApp, renvoi e-mail) et enregistrement direct par l'équipe.
 */
export function PaymentsPanel({ candidateId, code, whatsapp, firstName, spaceUrl }: { candidateId: string; code: string; whatsapp: string; firstName: string; spaceUrl: string }) {
  const t = useTranslations("dashboard.candidate.payments");
  const locale = useLocale() === "en" ? "en" : "fr";
  const nf = new Intl.NumberFormat("fr-FR");
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(false);

  const base = `/api/candidatures/${candidateId}/payments`;
  const load = useCallback(async () => {
    const res = await fetch(base, { cache: "no-store" }).catch(() => null);
    if (res?.ok) setData((await res.json()) as Data);
  }, [base]);
  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setError("");
    setNotice("");
    const res = await fetch(`${base}/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(null);
    if (!res?.ok) return setError(t("failed"));
    const json = (await res.json()) as { emailed?: number };
    if (body.action !== "refuse") setNotice(json.emailed ? t("emailed") : t("notEmailed"));
    load();
  }

  const refuse = (id: string) => {
    const reason = window.prompt(t("refusePrompt"))?.trim();
    if (reason && reason.length >= 3) act(id, { action: "refuse", reason });
  };

  const waText = (p: Payment) =>
    `Bonjour ${firstName}, nous avons bien reçu et vérifié votre paiement de ${nf.format(p.amount)} FCFA. Votre reçu Odysseo ${p.receiptNumber} vous a été envoyé par e-mail et reste disponible dans votre espace : ${spaceUrl}`;

  if (!data) return <div className="skeleton h-24 rounded-brand" />;
  const pending = data.payments.filter((p) => p.status === "en_verification");
  const confirmed = data.payments.filter((p) => p.status === "confirme");
  const refused = data.payments.filter((p) => p.status === "refuse");
  const paid = confirmed.length ? confirmed.reduce((s, p) => s + p.amount, 0) : data.legacy?.amount ?? 0;

  const line = (p: Payment) => (
    <div>
      <p className="font-extrabold">
        {nf.format(p.amount)} FCFA <span className="font-semibold text-gris">· {p.stepLabel ?? t("otherStep")}</span>
      </p>
      <p className="text-xs text-gris">
        {[METHOD_LABELS[p.method as PaymentMethod]?.fr ?? p.method, p.methodNote, dateFmt.format(new Date(p.paidOn))].filter(Boolean).join(" · ")}
      </p>
      <p className="text-xs text-gris">
        {p.source === "espace" ? t("declaredBy", { name: p.declaredByName ?? "?" }) : t("recordedBy", { name: p.recordedByName ?? "?" })}
      </p>
    </div>
  );

  return (
    <div id="paiements" className="scroll-mt-24 space-y-4">
      {data.program ? (
        <p className="text-sm font-bold">
          {data.program.name} · {t("total", { paid: nf.format(paid), total: nf.format(data.program.total) })}
        </p>
      ) : (
        <p className="text-xs text-gris">{t("noReport")}</p>
      )}
      {data.legacy && confirmed.length === 0 && data.legacy.amount && (
        <p className="text-xs text-gris">{t("legacy", { date: dateFmt.format(new Date(data.legacy.date)), amount: nf.format(data.legacy.amount) })}</p>
      )}
      {error && <p className="field-error">{error}</p>}
      {notice && <p className="text-sm font-semibold text-ok">{notice}</p>}

      {pending.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-rouge">
            {t("pending")} ({pending.length})
          </h3>
          <ul className="space-y-2">
            {pending.map((p) => (
              <li key={p.id} className="rounded-brand border-[1.5px] border-[#F5C26B] bg-[#FFFBF0] p-3">
                {line(p)}
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.hasProof ? (
                    <a href={`${base}/${p.id}/proof`} target="_blank" rel="noopener noreferrer" className="btn-sm-ghost">
                      <Eye className="h-4 w-4" /> {t("proof")}
                    </a>
                  ) : (
                    <span className="text-xs text-gris">{t("noProof")}</span>
                  )}
                  <button type="button" disabled={busy === p.id} onClick={() => act(p.id, { action: "confirm" })} className="btn-sm-primary">
                    <CheckCircle2 className="h-4 w-4" /> {t("confirm")}
                  </button>
                  <button type="button" disabled={busy === p.id} onClick={() => refuse(p.id)} className="btn-sm-ghost text-erreur">
                    <XCircle className="h-4 w-4" /> {t("refuse")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirmed.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-gris">{t("confirmed")}</h3>
          <ul className="space-y-2">
            {confirmed.map((p) => {
              const wa = whatsappLink(whatsapp, waText(p));
              return (
                <li key={p.id} className="rounded-brand border border-bord p-3">
                  {line(p)}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={`${base}/${p.id}/receipt`} target="_blank" rel="noopener noreferrer" className="btn-sm-dark">
                      <Download className="h-4 w-4" /> {t("receipt", { number: p.receiptNumber ?? "" })}
                    </a>
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-sm inline-flex bg-[#1FAF55] text-white">
                        <MessageCircle className="h-4 w-4" /> {t("whatsapp")}
                      </a>
                    )}
                    <button type="button" disabled={busy === p.id} onClick={() => act(p.id, { action: "resend" })} className="btn-sm-ghost">
                      <Mail className="h-4 w-4" /> {t("resend")}
                    </button>
                    {p.hasProof && (
                      <a href={`${base}/${p.id}/proof`} target="_blank" rel="noopener noreferrer" className="btn-sm-ghost">
                        <Eye className="h-4 w-4" /> {t("proof")}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {refused.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-gris">{t("refusedList")}</h3>
          <ul className="space-y-2">
            {refused.map((p) => (
              <li key={p.id} className="rounded-brand border border-bord bg-fond p-3 opacity-80">
                {line(p)}
                {p.rejectReason && <p className="mt-1 text-xs text-erreur">{p.rejectReason}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.payments.length === 0 && <p className="text-sm text-gris">{t("empty")}</p>}

      {form ? (
        <RecordForm
          base={base}
          code={code}
          steps={data.program?.steps ?? []}
          onDone={(msg) => {
            setForm(false);
            setNotice(msg);
            load();
          }}
          onCancel={() => setForm(false)}
        />
      ) : (
        <button type="button" onClick={() => setForm(true)} className="btn-sm-ghost">
          <Plus className="h-4 w-4" /> {t("record")}
        </button>
      )}
    </div>
  );
}

function RecordForm({
  base,
  code,
  steps,
  onDone,
  onCancel,
}: {
  base: string;
  code: string;
  steps: { label: string; amount: number }[];
  onDone: (notice: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("dashboard.candidate.payments");
  const nf = new Intl.NumberFormat("fr-FR");
  const [stepIndex, setStepIndex] = useState<number | null>(steps.length ? 0 : null);
  const [amount, setAmount] = useState(steps[0] ? String(steps[0].amount) : "");
  const [method, setMethod] = useState<PaymentMethod>("especes");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(/\D/g, ""));
    if (!value) return;
    setState({ busy: true });
    try {
      let proof: { url: string; name: string } | undefined;
      if (file) {
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace("jpeg", "jpg");
        const blob = await upload(`documents/equipe/paiements/${code}/${stamp()}-1.${ext}`, file, {
          access: "private",
          handleUploadUrl: `${base}/upload`,
          contentType: file.type || undefined,
        });
        proof = { url: blob.url, name: file.name };
      }
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepIndex, amount: value, method, methodNote: note.trim() || undefined, paidOn, proof }),
      });
      if (!res.ok) return setState({ error: t("failed") });
      const json = (await res.json()) as { emailed?: number };
      onDone(json.emailed ? t("emailed") : t("notEmailed"));
    } catch {
      setState({ error: t("failed") });
    }
  }

  const field = "field-input mt-1 !min-h-[40px] text-sm";
  return (
    <form onSubmit={submit} className="space-y-3 rounded-brand border border-bord bg-fond p-3">
      <p className="text-sm font-extrabold">{t("record")}</p>
      <p className="text-xs text-gris">{t("recordIntro")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">
          {t("step")}
          <select
            className={field}
            value={stepIndex ?? ""}
            onChange={(e) => {
              const i = e.target.value === "" ? null : Number(e.target.value);
              setStepIndex(i);
              if (i != null && steps[i]) setAmount(String(steps[i].amount));
            }}
          >
            {steps.map((s, i) => (
              <option key={s.label} value={i}>
                {s.label} · {nf.format(s.amount)} FCFA
              </option>
            ))}
            <option value="">{t("otherStep")}</option>
          </select>
        </label>
        <label className="text-xs font-bold">
          {t("amount")}
          <input className={field} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label className="text-xs font-bold">
          {t("method")}
          <select className={field} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m].fr}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          {t("date")}
          <input className={field} type="date" value={paidOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPaidOn(e.target.value)} required />
        </label>
      </div>
      <label className="block text-xs font-bold">
        {t("note")}
        <input className={field} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
      </label>
      <label className="block text-xs font-bold">
        {t("proofOptional")}
        <input type="file" accept="image/*,application/pdf" className="mt-1 block text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      {state.error && <p className="field-error">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={state.busy} className="btn-sm-primary">
          {state.busy ? t("saving") : t("save")}
        </button>
        <button type="button" onClick={onCancel} className="btn-sm-ghost">
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
