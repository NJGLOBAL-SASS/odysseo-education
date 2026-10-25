"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Link2, X, Inbox } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { useOfflineDataset } from "@/hooks/use-offline-dataset";
import { StatusBadge, STATUS_LABELS_FR, STATUS_LABELS_EN } from "@/components/dashboard/status-badge";
import { OfflineBanner } from "@/components/dashboard/offline-banner";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { SkeletonTable } from "@/components/ui/skeleton";
import { candidateColumns, type CandidateExportRow } from "@/lib/export/columns";
import { optionLabel, optionEntries } from "@/lib/intake-labels";

type Row = CandidateExportRow & { partner?: { referralCode: string; fullName?: string } | null };

export function CandidatesPanel({ locale }: { locale: string }) {
  const t = useTranslations("dashboard.candidates");
  const statusLabels = locale === "en" ? STATUS_LABELS_EN : STATUS_LABELS_FR;
  const { data, loading, isOffline, cachedAt } = useOfflineDataset<Row>(
    "candidatures",
    "/api/candidatures",
    "candidates"
  );

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [level, setLevel] = useState("");
  const [source, setSource] = useState<"" | "partner" | "direct">("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.filter((c) => {
      if (status && c.status !== status) return false;
      if (level && c.targetLevel !== level) return false;
      if (source === "partner" && !c.partnerId) return false;
      if (source === "direct" && c.partnerId) return false;
      if (!needle) return true;
      return [c.fullName, c.code, c.city, c.country, c.whatsapp, c.email, c.partner?.referralCode]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [data, q, status, level, source]);

  const hasFilters = Boolean(q || status || level || source);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">Suivi</p>
          <h1 className="page-title">{t("title")}</h1>
          <p className="mt-1 text-sm text-gris">
            {loading ? "Chargement…" : `${filtered.length} dossier(s)${hasFilters ? ` sur ${data.length}` : ""}`}
          </p>
        </div>
        <ExportButtons
          resource="candidatures"
          isOffline={isOffline}
          offlineRows={filtered}
          offlineColumns={candidateColumns}
        />
      </div>

      {isOffline && <OfflineBanner cachedAt={cachedAt} />}

      <div className="card mb-4 flex flex-col gap-2 p-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="field-input !min-h-[42px] pl-9 text-sm"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input !min-h-[42px] text-sm lg:w-48">
          <option value="">Tous les statuts</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="field-input !min-h-[42px] text-sm lg:w-44">
          <option value="">Tous les niveaux</option>
          {optionEntries("targetLevel", locale).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as typeof source)}
          className="field-input !min-h-[42px] text-sm lg:w-44"
        >
          <option value="">Toutes les sources</option>
          <option value="partner">Via un partenaire</option>
          <option value="direct">Sans partenaire</option>
        </select>
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
            <X className="h-4 w-4" /> Effacer
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonTable />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">{t("columns.name")}</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">{t("columns.country")}</th>
                <th className="px-4 py-3">{t("columns.level")}</th>
                <th className="px-4 py-3">Géré par</th>
                <th className="px-4 py-3">{t("source")}</th>
                <th className="px-4 py-3">{t("columns.status")}</th>
                <th className="px-4 py-3 text-right">{t("columns.date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bord">
              {filtered.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-fond">
                  <td className="px-4 py-3">
                    {isOffline ? (
                      <span className="font-semibold">{c.fullName}</span>
                    ) : (
                      <Link href={`/dashboard/candidatures/${c.id}`} className="font-semibold hover:underline">
                        {c.fullName}
                      </Link>
                    )}
                    <p className="font-mono text-[11px] text-gris">{c.code}</p>
                  </td>
                  <td className="max-w-[220px] px-4 py-3">
                    <p className="tabular-nums">{c.whatsapp}</p>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="block truncate text-xs text-gris hover:text-noir hover:underline">
                        {c.email}
                      </a>
                    ) : (
                      <p className="text-xs text-gris">—</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.country}
                    <p className="text-xs text-gris">{c.city}</p>
                  </td>
                  <td className="px-4 py-3">{optionLabel("targetLevel", c.targetLevel, locale)}</td>
                  <td className="px-4 py-3 text-gris">{optionLabel("managedBy", c.managedBy, locale)}</td>
                  <td className="px-4 py-3">
                    {c.partner ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-fond px-2 py-0.5 text-xs font-semibold">
                        <Link2 className="h-3 w-3 text-rouge" />
                        {c.partner.referralCode}
                      </span>
                    ) : (
                      <span className="text-xs text-gris">
                        {optionLabel("discoverySource", c.discoverySource, locale) || "Direct"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} locale={locale} />
                  </td>
                  <td className="px-4 py-3 text-right text-gris">
                    {new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(
                      new Date(c.createdAt)
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <Inbox className="mx-auto mb-2 h-8 w-8 text-bord" />
                    <p className="font-semibold">{hasFilters ? "Aucun dossier ne correspond" : "Aucun dossier"}</p>
                    <p className="text-sm text-gris">
                      {hasFilters ? "Modifiez ou effacez les filtres." : "Les candidatures apparaîtront ici."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
