"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Coins, Minus, Plus } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  points: number;
  reason: "NEW_LEAD" | "QUALIFIED_LEAD" | "ENROLLED" | "MANUAL_ADJUSTMENT";
  note: string | null;
  balanceAfter: number | null;
  createdAt: string;
  candidate: { id: string; code: string; fullName: string } | null;
  createdBy: { name: string | null; email: string } | null;
};

/** Solde, ajout / retrait manuel (motif obligatoire) et historique complet des points d'un partenaire. */
export function PartnerPointsDialog({
  partner,
  onClose,
  onChanged,
}: {
  partner: { id: string; fullName: string; referralCode: string };
  onClose: () => void;
  onChanged: () => void;
}) {
  const t = useTranslations("dashboard.partners.points");
  const tc = useTranslations("dashboard.common");
  const tr = useTranslations("dashboard.candidate.pointsReasons");
  const locale = useLocale();
  const toast = useToast();

  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/partners/${partner.id}/points`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setEntries(json.entries);
      setBalance(json.balance);
    } catch {
      setEntries([]);
    }
  }, [partner.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const n = Number.parseInt(amount, 10);
    if (!Number.isFinite(n) || n <= 0) return setError(t("amountInvalid"));
    if (note.trim().length < 3) return setError(t("noteRequired"));
    if (mode === "remove" && balance !== null && n > balance) return setError(t("insufficient", { balance }));

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/partners/${partner.id}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: mode === "add" ? n : -n, note: note.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error === "insufficient" ? t("insufficient", { balance: balance ?? 0 }) : tc("error"));
        return;
      }
      toast({
        tone: "success",
        title: mode === "add" ? t("added", { count: n }) : t("removed", { count: n }),
        description: t("newBalance", { balance: json.balance }),
      });
      setAmount("");
      setNote("");
      onChanged();
      load();
    } catch {
      setError(tc("error"));
    } finally {
      setBusy(false);
    }
  }

  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <Dialog
      title={t("title", { name: partner.fullName })}
      description={
        <>
          <span className="font-mono">{partner.referralCode}</span> ·{" "}
          {balance === null ? "…" : <strong className="text-noir">{t("balance", { balance })}</strong>}
        </>
      }
      icon={<Coins className="h-5 w-5" />}
      onClose={onClose}
      busy={busy}
      size="lg"
    >
      <form onSubmit={submit} className="mb-5 rounded-brand border border-bord p-4">
        <div className="mb-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("operation")}>
          {(["add", "remove"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-[10px] border-[1.5px] px-3 py-2 text-sm font-semibold",
                mode === m
                  ? m === "add"
                    ? "border-ok bg-[#E1F6EA] text-ok"
                    : "border-erreur bg-erreur-fond text-erreur"
                  : "border-bord text-gris hover:text-noir"
              )}
            >
              {m === "add" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              {t(m)}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t("amount")}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={10000}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              className="field-input !min-h-[42px] text-sm tabular-nums"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t("note")}</span>
            <input
              required
              minLength={3}
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              placeholder={mode === "add" ? t("notePlaceholderAdd") : t("notePlaceholderRemove")}
              className="field-input !min-h-[42px] text-sm"
            />
          </label>
        </div>
        {error && <p className="mt-2 text-sm font-semibold text-erreur">{error}</p>}
        <div className="mt-3 flex justify-end">
          <button type="submit" disabled={busy} className={mode === "add" ? "btn-sm-dark" : "btn-sm bg-erreur text-white hover:bg-rouge-fonce"}>
            {busy && <Spinner />} {mode === "add" ? t("submitAdd") : t("submitRemove")}
          </button>
        </div>
      </form>

      <h3 className="section-title mb-2">{t("history")}</h3>
      {entries === null ? (
        <div className="space-y-2 pb-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-10 w-full rounded-[10px]" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="pb-4 text-sm text-gris">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-bord pb-3">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start gap-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {tr(e.reason)}
                  {e.candidate && (
                    <>
                      {" · "}
                      <Link href={`/dashboard/candidatures/${e.candidate.id}`} className="font-mono text-xs text-gris hover:text-noir hover:underline">
                        {e.candidate.code}
                      </Link>
                    </>
                  )}
                </span>
                {e.note && <span className="block text-gris">{e.note}</span>}
                <span className="block text-xs text-gris">
                  {dateTime.format(new Date(e.createdAt))} ·{" "}
                  {e.createdBy ? t("by", { name: e.createdBy.name || e.createdBy.email }) : t("automatic")}
                </span>
              </span>
              <span className="text-right">
                <span className={cn("block font-bold tabular-nums", e.points > 0 ? "text-ok" : "text-erreur")}>
                  {e.points > 0 ? `+${e.points}` : `−${Math.abs(e.points)}`}
                </span>
                {e.balanceAfter !== null && (
                  <span className="block text-xs tabular-nums text-gris">{t("after", { balance: e.balanceAfter })}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
