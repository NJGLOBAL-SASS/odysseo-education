import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

import { APP_TIME_ZONE } from "@/lib/utils";
import type { ExportColumn } from "./types";

const LOGO_PATH = path.join(process.cwd(), "public/images/logo/logo-full-black-tight.png");
const NOIR = "#0B0B0D";
const ROUGE = "#FF0000";
const GRIS = "#5B5B66";
const FOND = "#F4F4F6";

function drawWatermark(doc: PDFKit.PDFDocument) {
  const { width, height } = doc.page;
  doc.save();
  doc.fillOpacity(0.06);
  doc.fillColor(NOIR);
  doc.fontSize(130);
  doc.rotate(-35, { origin: [width / 2, height / 2] });
  doc.text("ODYSSEO", 0, height / 2 - 70, { width, align: "center" });
  doc.restore();
  doc.fillOpacity(1);
}

function drawHeader(doc: PDFKit.PDFDocument, title: string, generatedAt: Date, rowCount: number) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.page.margins.top;

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, left, top, { height: 20 });
  }

  doc
    .fontSize(8)
    .fillColor(GRIS)
    .text(`Généré le ${generatedAt.toLocaleString("fr-FR", { timeZone: APP_TIME_ZONE })}`, left, top, {
      width: right - left,
      align: "right",
    });

  doc
    .fontSize(16)
    .fillColor(NOIR)
    .font("Helvetica-Bold")
    .text(`${title} — Odysseo Education`, left, top + 28);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(GRIS)
    .text(`${rowCount} ligne(s)`, left, top + 48);

  doc
    .moveTo(left, top + 64)
    .lineTo(right, top + 64)
    .strokeColor(ROUGE)
    .lineWidth(1.5)
    .stroke();

  return top + 78;
}

function drawFooter(doc: PDFKit.PDFDocument, pageNumber: number, pageCount: number) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const y = doc.page.height - doc.page.margins.bottom + 12;

  doc
    .fontSize(8)
    .fillColor(GRIS)
    .text(
      `odysseo-education.com — Document confidentiel · Page ${pageNumber}/${pageCount}`,
      left,
      y,
      { width: right - left, align: "center" }
    );
}

export function buildPdfBuffer<T>({
  title,
  columns,
  rows,
  generatedAt,
}: {
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
  generatedAt: Date;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pdfColumns = columns.filter((c) => c.pdfWeight !== 0);
    const totalWeight = pdfColumns.reduce((sum, c) => sum + (c.pdfWeight ?? 1), 0);
    const widths = pdfColumns.map((c) => (usableWidth * (c.pdfWeight ?? 1)) / totalWeight);
    const rowHeight = 18;

    function drawTableRow(y: number, values: string[], isHeader: boolean, zebra: boolean) {
      let x = left;
      if (isHeader) {
        doc.rect(left, y, usableWidth, rowHeight + 2).fill(NOIR);
      } else if (zebra) {
        doc.rect(left, y, usableWidth, rowHeight).fill(FOND);
      }
      values.forEach((value, i) => {
        const colWidth = widths[i]!;
        doc
          .fillColor(isHeader ? "#FFFFFF" : NOIR)
          .font(isHeader ? "Helvetica-Bold" : "Helvetica")
          .fontSize(isHeader ? 8 : 7.5)
          .text(value, x + 4, y + 5, { width: colWidth - 8, height: rowHeight - 4, ellipsis: true });
        x += colWidth;
      });
    }

    function newPage() {
      drawWatermark(doc);
      const contentTop = drawHeader(doc, title, generatedAt, rows.length);
      let y = contentTop;
      drawTableRow(y, pdfColumns.map((c) => c.header), true, false);
      return y + rowHeight + 4;
    }

    let y = newPage();

    rows.forEach((row, idx) => {
      if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
        doc.addPage();
        y = newPage();
      }
      drawTableRow(y, pdfColumns.map((c) => c.get(row)), false, idx % 2 === 1);
      y += rowHeight;
    });

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      drawFooter(doc, i + 1, range.count);
    }

    doc.end();
  });
}
