"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Circle, Copy, Download, Eye, MessageCircle, Search, SkipForward, Undo2 } from "lucide-react";

export type SendRow = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  message: string;
  wa: string | null;
  sentAt: string | null;
  viewed: boolean;
  downloaded: boolean;
};

/**
 * Envoi d'un kit (ODY-14 §6.3) : « Envoyer » ouvre WhatsApp (nouvel onglet) et marque l'envoi,
 * « Copier » en secours, « Annuler l'envoi » en cas d'erreur, « Suivant non envoyé » pour enchaîner.
 */
export function KitSender({ kitId, rows: initial }: { kitId: string; rows: SendRow[] }) {
  const t = useTranslations("dashboard.kits.sender");
  const locale = useLocale();
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const sentCount = rows.filter((r) => r.sentAt).length;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (filter === "all" || !r.sentAt) && (!q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)));
  }, [rows, filter, query]);

  async function mark(id: string, action: "send" | "unsend") {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, sentAt: action === "send" ? new Date().toISOString() : null } : r)));
    await fetch(`/api/kits/${kitId}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partnerId: id, action }) }).catch(() => null);
  }

  function send(row: SendRow) {
    if (!row.wa) return;
    window.open(row.wa, "_blank", "noopener");
    mark(row.id, "send");
  }

  async function copy(row: SendRow) {
    await navigator.clipboard.writeText(row.message).catch(() => undefined);
    setCopied(row.id);
    setTimeout(() => setCopied(null), 2000);
  }

  const nextUnsent = rows.find((r) => !r.sentAt && r.wa);

  return (
    <div className="space-y-3">
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-extrabold">{t("progress", { sent: sentCount, total: rows.length })}</p>
        {nextUnsent ? (
          <button type="button" onClick={() => send(nextUnsent)} className="btn-sm inline-flex bg-[#1FAF55] text-white">
            <SkipForward className="h-4 w-4" /> {t("next")} · {nextUnsent.name}
          </button>
        ) : (
          rows.length > 0 && <p className="text-sm font-semibold text-ok">{t("allSent")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-[10px] bg-fond p-1">
          {(["pending", "all"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-[8px] px-3 py-1.5 text-sm font-semibold ${filter === f ? "bg-white shadow-card" : "text-gris"}`}>
              {t(`filters.${f}`)}
            </button>
          ))}
        </div>
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris" />
          <input className="field-input !min-h-[40px] pl-9 text-sm" placeholder={t("search")} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="card p-5 text-sm text-gris">{t("none")}</p>
      ) : (
        <ul className="card divide-y divide-bord">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-bold">
                  {r.sentAt ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-ok" /> : <Circle className="h-4 w-4 flex-shrink-0 text-bord" />}
                  <span className="truncate">{r.name}</span>
                  <span className="font-mono text-xs text-gris">{r.code}</span>
                </p>
                <p className="ml-6 text-xs text-gris">
                  {r.phone ? `+${r.phone}` : <span className="font-semibold text-erreur">{t("noPhone")}</span>} ·{" "}
                  {r.sentAt ? t("sentOn", { date: dateFmt.format(new Date(r.sentAt)) }) : t("notSent")}
                  {r.viewed && (
                    <span className="ml-2 inline-flex items-center gap-1 font-semibold text-noir">
                      <Eye className="h-3.5 w-3.5" /> {t("viewed")}
                    </span>
                  )}
                  {r.downloaded && (
                    <span className="ml-2 inline-flex items-center gap-1 font-semibold text-noir">
                      <Download className="h-3.5 w-3.5" /> {t("downloaded")}
                    </span>
                  )}
                </p>
              </div>
              <div className="ml-6 flex flex-shrink-0 flex-wrap gap-2 sm:ml-0">
                <button type="button" disabled={!r.wa} onClick={() => send(r)} className="btn-sm inline-flex bg-[#1FAF55] text-white disabled:opacity-40">
                  <MessageCircle className="h-4 w-4" /> {t("send")}
                </button>
                <button type="button" onClick={() => copy(r)} className="btn-sm-ghost">
                  <Copy className="h-4 w-4" /> {copied === r.id ? t("copied") : t("copy")}
                </button>
                {r.sentAt && (
                  <button type="button" onClick={() => mark(r.id, "unsend")} className="btn-sm-ghost text-gris">
                    <Undo2 className="h-4 w-4" /> {t("unsend")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
