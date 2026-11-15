"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";
import { Camera, CheckCircle2, Clock3, Download, Paperclip, Plus, XCircle } from "lucide-react";

import { METHOD_LABELS, PAYMENT_METHODS, PAYMENT_OFFICE, PROOF_MAX_MB, type PaymentMethod } from "@/lib/payments/rules";

export type PortalPaymentItem = {
  id: string;
  amount: number;
  stepLabel: string | null;
  method: string;
  paidOn: string;
  status: string;
  receiptNumber: string | null;
  rejectReason: string | null;
};

type Step = { index: number; label: string; amount: number };

const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/** Photo réduite (côté le plus long 2 000 px, JPEG 0,8) ; PDF et HEIC passent tels quels. */
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
 * « J'ai effectué un paiement » (étudiant ou parent) + historique des déclarations.
 * La déclaration part « en vérification » : seule l'équipe Odysseo confirme et émet le reçu.
 */
export function PaymentDeclare({ code, steps, payments }: { code: string; steps: Step[]; payments: PortalPaymentItem[] }) {
  const t = useTranslations("portal.payments");
  const locale = useLocale() === "en" ? "en" : "fr";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState<number | null>(steps[0]?.index ?? null);
  const [amount, setAmount] = useState<string>(steps[0] ? String(steps[0].amount) : "");
  const [method, setMethod] = useState<PaymentMethod>("orange_money");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<{ busy?: boolean; error?: string; ok?: boolean }>({});
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const nf = new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR");

  function chooseStep(value: string) {
    const idx = value === "" ? null : Number(value);
    setStepIndex(idx);
    const s = steps.find((x) => x.index === idx);
    if (s) setAmount(String(s.amount));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(/\D/g, ""));
    if (!value) return setState({ error: t("declare.errors.amount") });
    if (method === "autre" && !note.trim()) return setState({ error: t("declare.noteRequired") });
    if (!file) return setState({ error: t("declare.errors.proof") });
    setState({ busy: true });
    try {
      const ready = await compressImage(file);
      if (ready.size > PROOF_MAX_MB * 1024 * 1024) return setState({ error: t("declare.errors.tooBig") });
      const ext = extOf(ready.name) === "jpeg" ? "jpg" : extOf(ready.name) || "jpg";
      const blob = await upload(`documents/espace/paiements/${code}/${stamp()}-1.${ext}`, ready, {
        access: "private",
        handleUploadUrl: "/api/portal/payments/upload",
        contentType: ready.type || undefined,
      });
      const res = await fetch("/api/portal/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepIndex, amount: value, method, methodNote: note.trim() || undefined, paidOn, proof: { url: blob.url, name: ready.name } }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        const key = json.error === "badType" ? "badType" : json.error === "tooBig" ? "tooBig" : json.error === "storageNotConfigured" ? "storage" : "generic";
        return setState({ error: t(`declare.errors.${key}`) });
      }
      setOpen(false);
      setFile(null);
      setNote("");
      setState({ ok: true });
      router.refresh();
    } catch {
      setState({ error: t("declare.errors.generic") });
    }
  }

  const field = "field-input mt-1";
  const label = "block text-[14px] font-bold";

  return (
    <div className="mt-4 space-y-3">
      {state.ok && (
        <p className="flex items-start gap-2 rounded-brand bg-[#EAF6EF] p-3 text-[14px] font-semibold text-ok">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> {t("declare.sent")}
        </p>
      )}

      {!open ? (
        <button type="button" onClick={() => { setOpen(true); setState({}); }} className="btn-dark !min-h-[46px] text-[15px]">
          <Plus className="h-5 w-5" /> {t("declare.open")}
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3 rounded-brand border border-bord bg-fond p-4">
          <p className="font-extrabold">{t("declare.title")}</p>
          <p className="text-[13px] text-gris">{t("declare.intro")}</p>

          {steps.length > 0 && (
            <label className={label}>
              {t("declare.step")}
              <select className={field} value={stepIndex ?? ""} onChange={(e) => chooseStep(e.target.value)}>
                {steps.map((s) => (
                  <option key={s.index} value={s.index}>
                    {s.label} · {nf.format(s.amount)} FCFA
                  </option>
                ))}
                <option value="">{t("declare.otherStep")}</option>
              </select>
            </label>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              {t("declare.amount")}
              <input className={field} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </label>
            <label className={label}>
              {t("declare.date")}
              <input className={field} type="date" value={paidOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPaidOn(e.target.value)} required />
            </label>
          </div>

          <label className={label}>
            {t("declare.method")}
            <select className={field} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABELS[m][locale]}
                </option>
              ))}
            </select>
          </label>
          {method === "especes" && <p className="text-[13px] text-gris">{t("declare.office", { address: PAYMENT_OFFICE[locale] })}</p>}

          <label className={label}>
            {t("declare.note")}
            <input className={field} value={note} maxLength={200} placeholder={t("declare.notePlaceholder")} onChange={(e) => setNote(e.target.value)} required={method === "autre"} />
          </label>

          <div>
            <p className={label}>{t("declare.proof")}</p>
            <p className="text-[12px] text-gris">{t("declare.proofHint")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="btn-sm-ghost cursor-pointer">
                <Camera className="h-4 w-4" /> {t("declare.takePhoto")}
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <label className="btn-sm-ghost cursor-pointer">
                <Paperclip className="h-4 w-4" /> {t("declare.chooseFile")}
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            {file && <p className="mt-1.5 truncate text-[13px] font-semibold">{file.name}</p>}
          </div>

          {state.error && <p className="field-error">{state.error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={state.busy} className="btn-primary !min-h-[46px] text-[15px]">
              {state.busy ? t("declare.sending") : t("declare.submit")}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost !min-h-[46px] text-[15px]">
              {t("declare.cancel")}
            </button>
          </div>
        </form>
      )}

      {payments.length > 0 && (
        <div>
          <p className="mt-2 text-[13px] font-bold uppercase tracking-wide text-gris">{t("history")}</p>
          <ul className="mt-2 divide-y divide-bord rounded-brand border border-bord bg-white">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-col gap-1 p-3 text-[14px]">
                <div className="flex items-start justify-between gap-3">
                  <span>
                    <b className="whitespace-nowrap">{nf.format(p.amount)} FCFA</b>
                    <span className="block text-[13px] text-gris">
                      {[p.stepLabel, METHOD_LABELS[p.method as PaymentMethod]?.[locale], dateFmt.format(new Date(p.paidOn))].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <StatusBadge status={p.status} label={t(`status.${p.status as "en_verification" | "confirme" | "refuse"}`)} />
                </div>
                {p.status === "confirme" && p.receiptNumber && (
                  <a href={`/api/portal/payments/${p.id}/receipt`} className="inline-flex min-h-[40px] items-center gap-1.5 font-bold text-rouge hover:underline">
                    <Download className="h-4 w-4" /> {t("receipt", { number: p.receiptNumber })}
                  </a>
                )}
                {p.status === "refuse" && p.rejectReason && <p className="text-[13px] text-erreur">{t("refused", { reason: p.rejectReason })}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const style =
    status === "confirme" ? "bg-[#EAF6EF] text-ok" : status === "refuse" ? "bg-erreur-fond text-erreur" : "bg-[#FFF5D6] text-[#7A5600]";
  const Icon = status === "confirme" ? CheckCircle2 : status === "refuse" ? XCircle : Clock3;
  return (
    <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${style}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}
