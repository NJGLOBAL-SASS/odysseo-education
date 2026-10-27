"use client";

import { useState } from "react";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

import { toCsv } from "@/lib/export/csv";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import type { ExportColumn, ExportFormat, ExportResource } from "@/lib/export/types";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const FORMATS: { format: ExportFormat; label: string; Icon: typeof FileDown }[] = [
  { format: "csv", label: "CSV", Icon: FileDown },
  { format: "xlsx", label: "Excel", Icon: FileSpreadsheet },
  { format: "pdf", label: "PDF", Icon: FileText },
];

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
  const t = useTranslations("dashboard.export");
  const tc = useTranslations("dashboard.common");
  const toast = useToast();
  const [pending, setPending] = useState<ExportFormat | null>(null);

  function downloadOfflineCsv() {
    if (!offlineRows || !offlineColumns) return;
    const csv = "﻿" + toCsv(offlineColumns, offlineRows);
    saveBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `odysseo-${resource}-hors-ligne-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  // Téléchargement via fetch pour afficher un loader pendant la génération (PDF / Excel peuvent prendre du temps).
  async function download(format: ExportFormat) {
    setPending(format);
    try {
      const res = await fetch(`/api/export/${resource}?format=${format}`);
      if (!res.ok) throw new Error();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filename =
        /filename="?([^"]+)"?/.exec(disposition)?.[1] ??
        `odysseo-${resource}-${new Date().toISOString().slice(0, 10)}.${format}`;
      saveBlob(await res.blob(), filename);
    } catch {
      toast({ tone: "error", title: t("failed"), description: tc("retry") });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {FORMATS.map(({ format, label, Icon }) => {
        if (isOffline && format === "csv") {
          return (
            <button
              key={format}
              type="button"
              onClick={downloadOfflineCsv}
              disabled={!offlineRows?.length}
              className="btn-sm-ghost"
            >
              <Icon className="h-4 w-4" /> {t("offlineCsv")}
            </button>
          );
        }
        return (
          <button
            key={format}
            type="button"
            onClick={() => download(format)}
            disabled={isOffline || pending !== null}
            title={isOffline ? t("needsConnection", { format: label }) : t("exportAs", { format: label })}
            className="btn-sm-ghost"
          >
            {pending === format ? <Spinner /> : <Icon className="h-4 w-4" />} {label}
          </button>
        );
      })}
    </div>
  );
}
