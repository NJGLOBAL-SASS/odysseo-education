"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Link2, X, Inbox, CheckSquare } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { useOfflineDataset } from "@/hooks/use-offline-dataset";
import { STATUS_LABELS_FR, STATUS_LABELS_EN } from "@/components/dashboard/status-badge";
import { OfflineBanner } from "@/components/dashboard/offline-banner";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ReportBadge } from "@/components/dashboard/report/report-badge";
import { RemindersQueue } from "@/components/dashboard/report/reminders-queue";
import { candidateColumns, type CandidateExportRow } from "@/lib/export/columns";
import { optionLabel, optionEntries } from "@/lib/intake-labels";
import { CASES } from "@/lib/report/status";
import type { ReportSummary } from "@/lib/report/server";

type Row = CandidateExportRow & {
  partner?: { referralCode: string; fullName?: string } | null;
  _count?: { portalMessages?: number; checklistItems?: number };
  report?: ReportSummary;
};

const FILTERS = ["envoyer", "relancer", "nonlus", "reverifier", "tous"] as const;
type Filter = (typeof FILTERS)[number];

function matches(f: Filter, r?: ReportSummary) {
  if (f === "tous") return true;
  if (!r) return false;
  if (f === "envoyer") return r.toSend;
  if (f === "relancer") return r.remindToday;
  if (f === "nonlus") return r.sentUnread;
  return r.recheck;
}

/** Temps écoulé depuis la soumission : « 45 min », « 5 h », « 3 j ». */
function elapsed(from: string | Date, now: number) {
  const min = Math.max(0, Math.floor((now - new Date(from).getTime()) / 60_000));
  if (min < 60) return { label: `${min} min`, hours: 0 };
  const h = Math.floor(min / 60);
  return { label: h < 48 ? `${h} h` : `${Math.floor(h / 24)} j`, hours: h };
}

export function CandidatesPanel({ locale }: { locale: string }) {
  const t = useTranslations("dashboard.candidates");
  const tr = useTranslations("dashboard.report");
  const tc = useTranslations("dashboard.common");
  const toast = useToast();
  const params = useSearchParams();
  const statusLabels = locale === "en" ? STATUS_LABELS_EN : STATUS_LABELS_FR;
  const { data, loading, isOffline, cachedAt, refresh } = useOfflineDataset<Row>("candidatures", "/api/candidatures", "candidates");

  const initial = params.get("filtre");
  const [filter, setFilter] = useState<Filter>((FILTERS as readonly string[]).includes(initial ?? "") ? (initial as Filter) : "envoyer");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [level, setLevel] = useState("");
  const [source, setSource] = useState<"" | "partner" | "direct">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const activeFilter: Filter = isOffline ? "tous" : filter;

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, data.filter((c) => matches(f, c.report)).length])) as Record<Filter, number>, [data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = data.filter((c) => {
      if (!matches(activeFilter, c.report)) return false;
      if (status && c.status !== status) return false;
      if (level && c.targetLevel !== level) return false;
      if (source === "partner" && !c.partnerId) return false;
      if (source === "direct" && c.partnerId) return false;
      if (!needle) return true;
      return [c.fullName, c.code, c.city, c.country, c.whatsapp, c.email, c.partner?.referralCode]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
    // « À envoyer » : le plus ancien d'abord.
    return activeFilter === "envoyer" ? [...rows].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : rows;
  }, [data, q, status, level, source, activeFilter]);

  const hasFilters = Boolean(q || status || level || source);
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectable = (c: Row) => Boolean(c.report?.toSend) && !c.report?.sentAt;
  const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });

  const waiting = (c: Row) => {
    if (activeFilter !== "envoyer") return null;
    const e = elapsed(c.createdAt, now);
    return <span className={`text-xs font-semibold tabular-nums ${e.hours >= 24 ? "text-erreur" : "text-gris"}`}>{tr("list.waiting", { time: e.label })}</span>;
  };
  const badge = (c: Row) => (c.report ? <ReportBadge badge={c.report.badge} recheck={c.report.recheck} /> : null);
  const pipeline = (c: Row) => (c.status !== "NOUVEAU" ? <p className="mt-1 text-[11px] text-gris">{tr("list.pipeline", { status: statusLabels[c.status] ?? c.status })}</p> : null);
  const unread = (c: Row) => (
    <>
      {(c._count?.portalMessages ?? 0) > 0 && (
        <span className="ml-1.5 inline-flex items-center rounded-full bg-rouge px-1.5 align-middle text-[11px] font-bold text-white" title="Messages non lus">
          💬 {c._count?.portalMessages}
        </span>
      )}
      {(c._count?.checklistItems ?? 0) > 0 && (
        <span className="ml-1.5 inline-flex items-center rounded-full bg-noir px-1.5 align-middle text-[11px] font-bold text-white" title={t("documentsToReview")}>
          📄 {c._count?.checklistItems}
        </span>
      )}
    </>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">{t("eyebrow")}</p>
          <h1 className="page-title">{t("title")}</h1>
          <p className="mt-1 text-sm text-gris">
            {loading ? t("loading") : hasFilters ? t("countOf", { count: filtered.length, total: data.length }) : t("count", { count: filtered.length })}
          </p>
        </div>
        <ExportButtons resource="candidatures" isOffline={isOffline} offlineRows={filtered} offlineColumns={candidateColumns} />
      </div>

      {isOffline && <OfflineBanner cachedAt={cachedAt} />}

      {/* Filtres rapides (ODY-15 §5.1) */}
      {!isOffline && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
                setSelected(new Set());
              }}
              className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold ${filter === f ? "border-noir bg-noir text-white" : "border-bord bg-white text-noir"}`}
            >
              {tr(`list.filters.${f}`)}
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${filter === f ? "bg-white/20" : "bg-fond"}`}>{counts[f]}</span>
            </button>
          ))}
        </div>
      )}

      {activeFilter === "relancer" ? (
        <RemindersQueue onChange={refresh} />
      ) : (
        <>
          <div className="card mb-4 flex flex-col gap-2 p-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="field-input !min-h-[42px] pl-9 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-2 lg:flex">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input !min-h-[42px] text-sm lg:w-44" aria-label={t("status")}>
                <option value="">{t("allStatuses")}</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="field-input !min-h-[42px] text-sm lg:w-40">
                <option value="">{t("allLevels")}</option>
                {optionEntries("targetLevel", locale).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select value={source} onChange={(e) => setSource(e.target.value as typeof source)} className="field-input !min-h-[42px] text-sm lg:w-40">
                <option value="">{t("allSources")}</option>
                <option value="partner">{t("viaPartner")}</option>
                <option value="direct">{t("direct")}</option>
              </select>
            </div>
            {hasFilters && (
              <button
                onClick={() => {
                  setQ("");
                  setStatus("");
                  setLevel("");
                  setSource("");
                }}
                className="btn-sm-ghost !min-h-[42px]"
              >
                <X className="h-4 w-4" /> {tc("clear")}
              </button>
            )}
          </div>

          {/* Rattrapage groupé */}
          {selected.size > 0 && (
            <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-brand bg-noir px-3 py-2 text-sm text-white shadow-pop">
              <span>{tr("list.selected", { count: selected.size })}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelected(new Set())} className="btn-sm border border-white/30 text-white">
                  {tc("clear")}
                </button>
                <button type="button" onClick={() => setBulkOpen(true)} className="btn-sm bg-white text-noir">
                  <CheckSquare className="h-4 w-4" /> {tr("list.bulkSent")}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <SkeletonTable />
          ) : filtered.length === 0 ? (
            <div className="card px-4 py-14 text-center">
              <Inbox className="mx-auto mb-2 h-8 w-8 text-bord" />
              <p className="font-semibold">{hasFilters ? t("noMatch") : t("empty")}</p>
              <p className="text-sm text-gris">{hasFilters ? t("noMatchHint") : t("emptyHint")}</p>
            </div>
          ) : (
            <>
              {/* Téléphone : cartes */}
              <ul className="space-y-2 lg:hidden">
                {filtered.map((c) => (
                  <li key={c.id} className="card flex gap-3 p-3">
                    {selectable(c) && !isOffline && (
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="mt-1 h-5 w-5 shrink-0" aria-label={tr("list.select")} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        {isOffline ? (
                          <span className="font-semibold">{c.fullName}</span>
                        ) : (
                          <Link href={`/dashboard/candidatures/${c.id}`} className="min-w-0 break-words font-semibold hover:underline">
                            {c.fullName}
                            {unread(c)}
                          </Link>
                        )}
                        {waiting(c)}
                      </div>
                      <p className="text-xs text-gris">
                        <span className="font-mono">{c.code}</span> · {optionLabel("targetLevel", c.targetLevel, locale)} · {c.country}
                      </p>
                      <div className="mt-2">{badge(c)}</div>
                      {pipeline(c)}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Ordinateur : tableau */}
              <div className="card hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="w-8 px-3 py-3" />
                      <th className="px-4 py-3">{t("columns.name")}</th>
                      <th className="px-4 py-3">{t("columns.contact")}</th>
                      <th className="px-4 py-3">{t("columns.country")}</th>
                      <th className="px-4 py-3">{t("columns.level")}</th>
                      <th className="px-4 py-3">{t("source")}</th>
                      <th className="px-4 py-3">{tr("list.column")}</th>
                      <th className="px-4 py-3 text-right">{t("columns.date")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bord">
                    {filtered.map((c) => (
                      <tr key={c.id} className="transition-colors hover:bg-fond">
                        <td className="px-3 py-3">
                          {selectable(c) && !isOffline && <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="h-4 w-4" aria-label={tr("list.select")} />}
                        </td>
                        <td className="px-4 py-3">
                          {isOffline ? (
                            <span className="font-semibold">{c.fullName}</span>
                          ) : (
                            <Link href={`/dashboard/candidatures/${c.id}`} className="font-semibold hover:underline">
                              {c.fullName}
                              {unread(c)}
                            </Link>
                          )}
                          <p className="font-mono text-[11px] text-gris">{c.code}</p>
                        </td>
                        <td className="max-w-[200px] px-4 py-3">
                          <p className="tabular-nums">{c.whatsapp}</p>
                          {c.email ? <p className="truncate text-xs text-gris">{c.email}</p> : <p className="text-xs text-gris">—</p>}
                        </td>
                        <td className="px-4 py-3">
                          {c.country}
                          <p className="text-xs text-gris">{c.city}</p>
                        </td>
                        <td className="px-4 py-3">{optionLabel("targetLevel", c.targetLevel, locale)}</td>
                        <td className="px-4 py-3">
                          {c.partner ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-fond px-2 py-0.5 text-xs font-semibold">
                              <Link2 className="h-3 w-3 text-rouge" />
                              {c.partner.referralCode}
                            </span>
                          ) : (
                            <span className="text-xs text-gris">{optionLabel("discoverySource", c.discoverySource, locale) || t("directLabel")}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {badge(c)}
                          {pipeline(c)}
                        </td>
                        <td className="px-4 py-3 text-right text-gris">
                          {dateFmt.format(new Date(c.createdAt))}
                          <div>{waiting(c)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {bulkOpen && (
        <BulkSentDialog
          ids={[...selected]}
          onClose={() => setBulkOpen(false)}
          onDone={(done, skipped) => {
            setBulkOpen(false);
            setSelected(new Set());
            toast({ tone: "success", title: tr("list.bulkDone", { done, skipped }) });
            refresh();
          }}
        />
      )}
    </div>
  );
}

function BulkSentDialog({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: (done: number, skipped: number) => void }) {
  const tr = useTranslations("dashboard.report");
  const toast = useToast();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cas, setCas] = useState("standard");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      // Par lots de 25 : chaque dossier crée sa version et ses relances (limite de durée Vercel).
      let done = 0;
      let skipped = 0;
      for (let i = 0; i < ids.length; i += 25) {
        const res = await fetch("/api/rapports/rattrapage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: ids.slice(i, i + 25), date, cas }) });
        if (!res.ok) {
          toast({ tone: "error", title: tr("failed") });
          break;
        }
        const json = (await res.json()) as { done: number; skipped: string[] };
        done += json.done;
        skipped += json.skipped.length;
      }
      onDone(done, skipped);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={tr("list.bulkTitle")}
      description={tr("list.bulkHint")}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-sm-ghost">
            {tr("cancel")}
          </button>
          <button type="button" disabled={busy || !date} onClick={submit} className="btn-sm-dark">
            {tr("list.bulkSave", { count: ids.length })}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">
          {tr("list.bulkDate")}
          <input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="field-input mt-1 !min-h-[44px] text-sm" />
        </label>
        <label className="text-xs font-bold">
          {tr("cas")}
          <select value={cas} onChange={(e) => setCas(e.target.value)} className="field-input mt-1 !min-h-[44px] text-sm">
            {CASES.map((c) => (
              <option key={c} value={c}>
                {tr(`cases.${c}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Dialog>
  );
}
