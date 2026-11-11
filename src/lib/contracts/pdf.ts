import "server-only";

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

import { commissionTable, fcfa, type Block, type ContractConfig, type Inline } from "./rules";

const ROOT = process.cwd();
const FONT_REGULAR = path.join(ROOT, "src/assets/fonts/Inter-Regular.ttf");
const FONT_BOLD = path.join(ROOT, "src/assets/fonts/Inter-ExtraBold.ttf");
const LOGO = path.join(ROOT, "public/images/logo/logo-full-black-tight.png");
const NOIR = "#0B0B0D";
const ROUGE = "#FF0000";
const GRIS = "#5B5B66";
const BORD = "#D9D9DE";

export type SignatureInfo = {
  /** Images lues côté serveur (absentes pour l'aperçu). */
  founderSignature: Buffer | null;
  stamp: Buffer | null;
  partnerName: string;
  /** « Signé électroniquement … » : absent pour l'aperçu non signé. */
  signedLine: string | null;
};

export type ContractPdfInput = {
  blocks: Block[];
  config: ContractConfig;
  number: string;
  version: string;
  contentHash: string;
  signature: SignatureInfo;
  preview: boolean;
};

/** Rendu A4 du contrat rempli (en-tête, texte, tableau des commissions, signatures, pied de page X/Y). */
export function renderContractPdf(input: ContractPdfInput): Promise<Buffer> {
  const { blocks, config, number, version, contentHash, signature, preview } = input;
  const doc = new PDFDocument({ size: "A4", margins: { top: 46, bottom: 54, left: 52, right: 52 }, bufferPages: true, info: { Title: `Contrat ${number}`, Author: "Odysseo Education" } });
  doc.registerFont("R", FONT_REGULAR);
  doc.registerFont("B", FONT_BOLD);
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const BODY = 8.6;

  if (fs.existsSync(LOGO)) doc.image(LOGO, left, doc.y, { height: 18 });
  doc.moveDown(2.2);

  const writeInline = (parts: Inline, opts: PDFKit.Mixins.TextOptions & { size?: number; color?: string } = {}) => {
    const size = opts.size ?? BODY;
    parts.forEach((p, i) => {
      doc.font(p.bold ? "B" : "R").fontSize(size).fillColor(opts.color ?? NOIR);
      doc.text(p.text, { ...opts, continued: i < parts.length - 1, lineGap: 1.6 });
    });
  };

  for (const b of blocks) {
    if (b.type === "h1") {
      writeInline(b.inline, { size: 14 });
      doc.moveDown(0.3);
    } else if (b.type === "h2") {
      ensureSpace(doc, 48); // un intertitre n'est jamais seul en bas de page
      doc.moveDown(0.35);
      writeInline(b.inline, { size: 10.5, color: ROUGE });
      doc.moveDown(0.15);
    } else if (b.type === "p") {
      ensureSpace(doc, doc.font("R").fontSize(BODY).heightOfString(b.inline.map((p) => p.text).join(""), { width, lineGap: 1.6 }) > 40 ? 24 : 12);
      writeInline(b.inline, { align: "left" });
      doc.moveDown(0.45);
    } else if (b.type === "ul" || b.type === "ol") {
      b.items.forEach((item, i) => {
        const bullet = b.type === "ul" ? "•" : `${i + 1}.`;
        // Puce et texte toujours sur la même page.
        const textHeight = doc.font("R").fontSize(BODY).heightOfString(item.map((p) => p.text).join(""), { width: width - 18, lineGap: 1.6 });
        ensureSpace(doc, textHeight + 4);
        const y = doc.y;
        doc.font("R").fontSize(BODY).fillColor(NOIR).text(bullet, left + 4, y, { width: 14 });
        doc.y = y;
        doc.x = left + 18;
        writeInline(item, { width: width - 18 });
        doc.x = left;
        doc.moveDown(0.2);
      });
      doc.moveDown(0.3);
    } else if (b.type === "commissions") {
      drawCommissions(doc, config, left, width);
    } else {
      drawSignatures(doc, signature, config, left, width, preview);
    }
  }

  if (preview) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.save().fillOpacity(0.07).fillColor(ROUGE).font("B").fontSize(70);
      doc.rotate(-35, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.text("APERÇU", 0, doc.page.height / 2 - 40, { width: doc.page.width, align: "center", lineBreak: false });
      doc.restore().fillOpacity(1);
    }
  }

  // Pied de page sur chaque page : numéro, version, empreinte, page X/Y.
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - 34;
    doc.page.margins.bottom = 0;
    doc
      .font("R")
      .fontSize(7.5)
      .fillColor(GRIS)
      .text(`Contrat n° ${number} · version ${version} · empreinte SHA-256 : ${contentHash.slice(0, 12)} · page ${i + 1}/${range.count}`, left, bottom, {
        width,
        align: "center",
        lineBreak: false,
      });
  }
  doc.end();
  return done;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function drawCommissions(doc: PDFKit.PDFDocument, config: ContractConfig, left: number, width: number) {
  const table = commissionTable(config);
  const firstCol = 112;
  const col = (width - firstCol) / table.paliers.length;
  const rowH = 17;
  ensureSpace(doc, rowH * (table.rows.length + 2) + 10);
  let y = doc.y + 2;
  const top = y;
  // En-tête
  doc.rect(left, y, width, 26).fill("#0B0B0D");
  doc.font("B").fontSize(8).fillColor("#FFFFFF").text("Cursus de l'étudiant", left + 6, y + 9, { width: firstCol - 8 });
  table.paliers.forEach((p, i) => doc.text(p.label, left + firstCol + i * col + 4, y + 4, { width: col - 8, align: "center" }));
  y += 26;
  table.rows.forEach((r, ri) => {
    if (ri % 2 === 1) doc.rect(left, y, width, rowH).fill("#F4F4F6");
    doc.font("B").fontSize(8.5).fillColor(NOIR).text(r.service, left + 6, y + 5, { width: firstCol - 8 });
    r.amounts.forEach((a, i) => doc.font("R").text(`${fcfa(a)} FCFA`, left + firstCol + i * col, y + 5, { width: col, align: "center" }));
    y += rowH;
  });
  doc.rect(left, top, width, y - top).strokeColor(BORD).lineWidth(0.6).stroke();
  doc.x = left;
  doc.y = y + 8;
}

function drawSignatures(doc: PDFKit.PDFDocument, s: SignatureInfo, config: ContractConfig, left: number, width: number, preview: boolean) {
  const boxH = 150;
  ensureSpace(doc, boxH + 10);
  const y = doc.y + 4;
  const half = (width - 14) / 2;
  const right = left + half + 14;
  doc.rect(left, y, half, boxH).strokeColor(BORD).lineWidth(0.6).stroke();
  doc.rect(right, y, half, boxH).stroke();

  doc.font("B").fontSize(8.5).fillColor(ROUGE).text("POUR ODYSSEO", left + 10, y + 8);
  doc.font("B").fontSize(9).fillColor(NOIR).text(`${config.signataire_odysseo.nom}, ${config.signataire_odysseo.fonction.toLowerCase()}`, left + 10, y + 22, { width: half - 20 });
  // Cachet et signature superposés (usage des documents officiels) : le cachet dessous, légèrement
  // tourné, la signature du fondateur par-dessus, qui le traverse en biais.
  const size = 104; // environ 3,7 cm
  const cx = left + half / 2;
  const cy = y + 40 + size / 2;
  if (s.stamp) {
    doc.save();
    doc.opacity(0.85);
    doc.rotate(-8, { origin: [cx, cy] });
    doc.image(s.stamp, cx - size / 2, cy - size / 2, { width: size, height: size });
    doc.restore();
    doc.opacity(1);
  }
  if (s.founderSignature) {
    const sw = 150;
    const sh = 96;
    doc.image(s.founderSignature, cx - sw / 2 - 14, cy - sh / 2 + 4, { fit: [sw, sh], align: "center", valign: "center" });
  }
  if (preview && !s.founderSignature) doc.font("R").fontSize(8).fillColor(GRIS).text("Signature apposée à la signature du contrat.", left + 10, y + 60, { width: half - 20 });

  doc.font("B").fontSize(8.5).fillColor(ROUGE).text("LE PARTENAIRE", right + 10, y + 8);
  doc.font("B").fontSize(9).fillColor(NOIR).text(s.partnerName, right + 10, y + 22, { width: half - 20 });
  doc
    .font("R")
    .fontSize(8.5)
    .fillColor(s.signedLine ? NOIR : GRIS)
    .text(s.signedLine ? `« Lu et approuvé »\n${s.signedLine}` : "Non signé (aperçu).", right + 10, y + 44, { width: half - 20, lineGap: 1.5 });
  doc.x = left;
  doc.y = y + boxH + 8;
}
