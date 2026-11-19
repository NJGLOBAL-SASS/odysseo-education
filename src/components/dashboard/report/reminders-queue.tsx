"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ClipboardCopy, MessageCircle, ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { copyText } from "@/lib/copy-text";
import { useToast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";
import { MAX_REMINDERS, daysLeft, waLink } from "@/lib/report/reminders";
import { STOP_REASONS } from "@/lib/report/status";
import { useReturnConfirm } from "./use-return-confirm";

type Row = {
  id: string;
  number: number;
  dueAt: string;
  candidate: { id: string; code: string; firstName: string };
  cas: string;
  read: boolean;
  validUntil: string | null;
  recheck: boolean;
  message: string;
  waNumber: string | null;
};

/**
 * « À relancer aujourd'hui » (ODY-15 §7.3) : une relance à la fois, message prêt, envoi en
 * 1 clic, confirmation au retour, puis la suivante. Objectif : 20 relances en 5 minutes.
 */
export function RemindersQueue({ onChange }: { onChange?: () => void }) {
  const t = useTranslations("dashboard.report");
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [index, setIndex] = useState(0);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [stopFor, setStopFor] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const confirm = useReturnConfirm<{ id: string; message: string }>();

  const load = useCallback(async () => {
    const res = await fetch("/api/rapports/relances", { cache: "no-store" });
    if (!res.ok) return setRows([]);
    const json = (await res.json()) as { reminders: Row[] };
    setRows(json.reminders);
    setIndex((i) => Math.min(i, Math.max(0, json.reminders.length - 1)));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function post(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/rapports/relances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        toast({ tone: "error", title: t("failed") });
        return false;
      }
      toast({ tone: "success", title: ok });
      await load();
      onChange?.();
      return true;
    } finally {
      setBusy(false);
    }
  }

  if (!rows) return <p className="py-8 text-center text-sm text-gris">{t("loading")}</p>;
  if (rows.length === 0) return <p className="card px-4 py-12 text-center font-semibold">{t("queue.empty")}</p>;

  const row = rows[Math.min(index, rows.length - 1)];
  const message = messages[row.id] ?? row.message;
  const left = row.validUntil ? daysLeft(new Date(row.validUntil)) : null;

  return (
    <div className="card mx-auto max-w-2xl space-y-3 p-4">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-bold tabular-nums">{t("queue.position", { current: index + 1, total: rows.length })}</span>
        <div className="flex gap-1">
          <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)} className="btn-sm-ghost" aria-label={t("queue.previous")}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" disabled={index >= rows.length - 1} onClick={() => setIndex(index + 1)} className="btn-sm-ghost">
            {t("queue.next")} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <p className="text-lg font-extrabold">
          {row.candidate.firstName} <span className="font-mono text-xs font-normal text-gris">{row.candidate.code}</span>
        </p>
        <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-[#F1E6FF] px-2 py-0.5 font-semibold text-[#6A2DBF]">{t("queue.reminderN", { n: row.number, max: MAX_REMINDERS })}</span>
          <span className="rounded-full bg-fond px-2 py-0.5">{t(`cases.${row.cas}` as "cases.standard")}</span>
          <span className={`rounded-full px-2 py-0.5 ${row.read ? "bg-[#E3F0FF] text-[#0B5FA5]" : "bg-fond text-gris"}`}>{row.read ? t("queue.read") : t("queue.unread")}</span>
          {left !== null && <span className="rounded-full bg-fond px-2 py-0.5">{left < 0 ? t("queue.expired") : t("queue.daysLeft", { days: left })}</span>}
        </p>
      </div>

      {row.recheck && <p className="rounded-brand bg-[#FFE9CC] px-3 py-2 text-sm font-semibold text-[#A35400]">{t("queue.recheckWarning")}</p>}

      <textarea value={message} onChange={(e) => setMessages({ ...messages, [row.id]: e.target.value })} rows={9} className="field-input text-sm" />

      <div className="grid gap-2 sm:grid-cols-2">
        {row.waNumber ? (
          <a
            href={waLink(row.waNumber, message)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => confirm.start({ id: row.id, message })}
            className="btn-sm !min-h-[52px] justify-center bg-[#1FAF55] text-base text-white hover:bg-[#1A9A4A] sm:col-span-2"
          >
            <MessageCircle className="h-5 w-5" /> {t("queue.relaunch")}
          </a>
        ) : (
          <p className="rounded-brand bg-erreur-fond px-3 py-2 text-xs font-semibold text-erreur sm:col-span-2">{t("noNumber")}</p>
        )}
        <button type="button" onClick={async () => toast((await copyText(message)) ? { tone: "success", title: t("messageCopied") } : { tone: "error", title: t("failed") })} className="btn-sm-ghost !min-h-[44px] justify-center">
          <ClipboardCopy className="h-4 w-4" /> {t("queue.copy")}
        </button>
        <button type="button" disabled={busy} onClick={() => post({ action: "postpone", id: row.id }, t("queue.postponed"))} className="btn-sm-ghost !min-h-[44px] justify-center">
          <Clock className="h-4 w-4" /> {t("queue.postpone")}
        </button>
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-xs">
        <button type="button" onClick={() => setStopFor(row)} className="text-gris underline hover:text-noir">
          {t("stop")}
        </button>
        <Link href={`/dashboard/candidatures/${row.candidate.id}`} className="text-gris underline hover:text-noir">
          {t("queue.open")}
        </Link>
      </div>

      {confirm.ask && confirm.pending && (
        <Dialog
          title={t("reminderConfirmTitle")}
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
                  if (await post({ action: "sent", id: p.id, message: p.message }, t("queue.done"))) confirm.clear();
                }}
              >
                {t("confirmYes")}
              </button>
            </>
          }
        />
      )}

      {stopFor && (
        <Dialog
          title={t("stop")}
          onClose={() => setStopFor(null)}
          busy={busy}
          footer={
            <>
              <button type="button" onClick={() => setStopFor(null)} className="btn-sm-ghost">
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={!reason || busy}
                className="btn-sm-dark"
                onClick={async () => {
                  if (await post({ action: "stop", id: stopFor.id, reason }, t("stopSaved"))) {
                    setStopFor(null);
                    setReason("");
                  }
                }}
              >
                {t("stopConfirm")}
              </button>
            </>
          }
        >
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="field-input !min-h-[44px] text-sm">
            <option value="">{t("stopReason")}</option>
            {STOP_REASONS.map((r) => (
              <option key={r} value={r}>
                {t(`stopReasons.${r}`)}
              </option>
            ))}
          </select>
        </Dialog>
      )}
    </div>
  );
}
