import type { ExportColumn } from "./types";

/**
 * Générateur CSV sans dépendance : utilisé aussi bien côté serveur (export
 * en ligne) que côté client (export en mode hors-ligne, données en cache).
 */
function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvValue(c.get(row) ?? "")).join(",")
  );
  return [header, ...lines].join("\r\n");
}
