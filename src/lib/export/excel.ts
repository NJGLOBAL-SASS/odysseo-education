import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

import { APP_TIME_ZONE } from "@/lib/utils";
import type { ExportColumn } from "./types";

const LOGO_PATH = path.join(process.cwd(), "public/images/logo/logo-full-black-tight.png");
const BRAND_NOIR = "FF0B0B0D";
const BRAND_ROUGE = "FFFF0000";
const BRAND_GRIS = "FF5B5B66";
const BRAND_FOND = "FFF4F4F6";
const WATERMARK_GRIS = "FFEFEFF2";

export async function buildExcelBuffer<T>({
  title,
  columns,
  rows,
  generatedAt,
}: {
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
  generatedAt: Date;
}): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Odysseo Education";
  workbook.created = generatedAt;

  const sheet = workbook.addWorksheet(title.slice(0, 31), {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    views: [{ state: "frozen", ySplit: 6 }],
  });

  const colCount = Math.max(columns.length, 4);

  // Bandeau "filigrane" (ExcelJS ne supporte pas nativement un filigrane
  // diagonal transparent ; on approxime avec un bandeau de marque en haut
  // de feuille — voir DOCUMENTATION.md § Exports pour le détail du choix).
  sheet.mergeCells(1, 1, 1, colCount);
  const watermarkCell = sheet.getCell(1, 1);
  watermarkCell.value = "ODYSSEO";
  watermarkCell.font = { size: 32, bold: true, color: { argb: WATERMARK_GRIS } };
  watermarkCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 40;

  if (fs.existsSync(LOGO_PATH)) {
    const imageId = workbook.addImage({ filename: LOGO_PATH, extension: "png" });
    sheet.addImage(imageId, { tl: { col: 0, row: 1.15 }, ext: { width: 72, height: 26 } });
  }

  sheet.mergeCells(2, 2, 2, colCount);
  const titleCell = sheet.getCell(2, 2);
  titleCell.value = `${title} — Odysseo Education`;
  titleCell.font = { size: 13, bold: true, color: { argb: BRAND_NOIR } };
  titleCell.alignment = { vertical: "middle" };
  sheet.getRow(2).height = 22;

  sheet.mergeCells(3, 1, 3, colCount);
  const dateCell = sheet.getCell(3, 1);
  dateCell.value = `Généré le ${generatedAt.toLocaleString("fr-FR", { timeZone: APP_TIME_ZONE })} · ${rows.length} ligne(s)`;
  dateCell.font = { size: 10, italic: true, color: { argb: BRAND_GRIS } };

  sheet.getRow(4).height = 6;

  const headerRowIndex = 5;
  const headerRow = sheet.getRow(headerRowIndex);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_NOIR } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: BRAND_ROUGE } } };
  });
  headerRow.height = 22;

  rows.forEach((row, idx) => {
    const excelRow = sheet.addRow(columns.map((c) => c.get(row)));
    if (idx % 2 === 1) {
      excelRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_FOND } };
      });
    }
  });

  columns.forEach((col, i) => {
    sheet.getColumn(i + 1).width = Math.max(col.header.length + 4, 14);
  });

  const footerRowIndex = sheet.rowCount + 2;
  sheet.mergeCells(footerRowIndex, 1, footerRowIndex, colCount);
  const footerCell = sheet.getCell(footerRowIndex, 1);
  footerCell.value = "odysseo-education.com — Document confidentiel, usage interne uniquement.";
  footerCell.font = { size: 9, italic: true, color: { argb: BRAND_GRIS } };

  return workbook.xlsx.writeBuffer();
}
