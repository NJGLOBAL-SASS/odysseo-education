"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { useOfflineDataset } from "@/hooks/use-offline-dataset";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { OfflineBanner } from "@/components/dashboard/offline-banner";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { candidateColumns, type CandidateExportRow } from "@/lib/export/columns";

const STATUSES = [
  "NOUVEAU",
  "QUALIFIE",
  "DOSSIER_EN_COURS",
  "BOURSE_SOUMISE",
  "ADMIS",
  "VISA_EN_COURS",
  "CLOTURE",
  "REFUSE",
];

export function CandidatesPanel({ locale }: { locale: string }) {
  const t = useTranslations("dashboard.candidates");
  const { data, loading, isOffline, cachedAt } = useOfflineDataset<CandidateExportRow>(
    "candidatures",
    "/api/candidatures",
    "candidates"
  );

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.filter((c) => {
      if (status && c.status !== status) return false;
      if (!needle) return true;
      return (
        c.fullName.toLowerCase().includes(needle) ||
        c.code.toLowerCase().includes(needle) ||
        c.city.toLowerCase().includes(needle)
      );
    });
  }, [data, q, status]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        <ExportButtons
          resource="candidatures"
          isOffline={isOffline}
          offlineRows={filtered}
          offlineColumns={candidateColumns}
        />
      </div>

      {isOffline && <OfflineBanner cachedAt={cachedAt} />}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="field-input pl-9"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input sm:w-56">
          <option value="">{t("status")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-bord text-gris">
            <tr>
              <th className="px-4 py-3 font-semibold">{t("columns.code")}</th>
              <th className="px-4 py-3 font-semibold">{t("columns.name")}</th>
              <th className="px-4 py-3 font-semibold">{t("columns.country")}</th>
              <th className="px-4 py-3 font-semibold">{t("columns.level")}</th>
              <th className="px-4 py-3 font-semibold">{t("columns.status")}</th>
              <th className="px-4 py-3 font-semibold">{t("columns.date")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bord">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-fond">
                <td className="px-4 py-3 font-mono text-xs">
                  {isOffline ? (
                    <span className="font-bold text-noir">{c.code}</span>
                  ) : (
                    <Link href={`/dashboard/candidatures/${c.id}`} className="font-bold text-noir">
                      {c.code}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3">{c.fullName}</td>
                <td className="px-4 py-3">
                  {c.country}, {c.city}
                </td>
                <td className="px-4 py-3">{c.targetLevel}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} locale={locale} />
                </td>
                <td className="px-4 py-3 text-gris">
                  {new Intl.DateTimeFormat(locale).format(new Date(c.createdAt))}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gris">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
