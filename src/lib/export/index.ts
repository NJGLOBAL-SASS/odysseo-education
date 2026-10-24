import { toCsv } from "./csv";
import { buildExcelBuffer } from "./excel";
import { buildPdfBuffer } from "./pdf";
import type { ExportColumn, ExportFormat } from "./types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function buildExport<T>({
  format,
  title,
  columns,
  rows,
}: {
  format: ExportFormat;
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  const generatedAt = new Date();
  const datePart = generatedAt.toISOString().slice(0, 10);
  const baseName = `odysseo-${slugify(title)}-${datePart}`;

  if (format === "csv") {
    // BOM UTF-8 pour un affichage correct des accents dans Excel.
    return {
      buffer: Buffer.from("﻿" + toCsv(columns, rows), "utf-8"),
      contentType: "text/csv; charset=utf-8",
      filename: `${baseName}.csv`,
    };
  }

  if (format === "xlsx") {
    const buffer = await buildExcelBuffer({ title, columns, rows, generatedAt });
    return {
      buffer: Buffer.from(buffer),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: `${baseName}.xlsx`,
    };
  }

  const buffer = await buildPdfBuffer({ title, columns, rows, generatedAt });
  return {
    buffer,
    contentType: "application/pdf",
    filename: `${baseName}.pdf`,
  };
}
