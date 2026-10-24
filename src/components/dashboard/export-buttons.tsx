"use client";

import { FileDown, FileSpreadsheet, FileText } from "lucide-react";

import { toCsv } from "@/lib/export/csv";
import type { ExportColumn, ExportResource } from "@/lib/export/types";

export function ExportButtons<T>({
  resource,
  isOffline,
  offlineRows,
  offlineColumns,
}: {
  resource: ExportResource;
  isOffline?: boolean;
  offlineRows?: T[];
  offlineColumns?: ExportColumn<T>[];
}) {
  const base = `/api/export/${resource}`;
  const disabledClass = "pointer-events-none opacity-40";

  function downloadOfflineCsv() {
    if (!offlineRows || !offlineColumns) return;
    const csv = "﻿" + toCsv(offlineColumns, offlineRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `odysseo-${resource}-hors-ligne-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isOffline ? (
        <button
          type="button"
          onClick={downloadOfflineCsv}
          disabled={!offlineRows?.length}
          className="btn-ghost !min-h-[36px] text-sm disabled:opacity-40"
        >
          <FileDown className="h-4 w-4" /> CSV (hors-ligne)
        </button>
      ) : (
        <a href={`${base}?format=csv`} className="btn-ghost !min-h-[36px] text-sm">
          <FileDown className="h-4 w-4" /> CSV
        </a>
      )}

      <a
        href={isOffline ? undefined : `${base}?format=xlsx`}
        aria-disabled={isOffline}
        title={isOffline ? "Excel nécessite une connexion internet" : undefined}
        className={`btn-ghost !min-h-[36px] text-sm ${isOffline ? disabledClass : ""}`}
      >
        <FileSpreadsheet className="h-4 w-4" /> Excel
      </a>

      <a
        href={isOffline ? undefined : `${base}?format=pdf`}
        aria-disabled={isOffline}
        title={isOffline ? "PDF nécessite une connexion internet" : undefined}
        className={`btn-ghost !min-h-[36px] text-sm ${isOffline ? disabledClass : ""}`}
      >
        <FileText className="h-4 w-4" /> PDF
      </a>
    </div>
  );
}
