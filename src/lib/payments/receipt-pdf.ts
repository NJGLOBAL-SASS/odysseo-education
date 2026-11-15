import "server-only";

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

const ROOT = process.cwd();
const FONT_REGULAR = path.join(ROOT, "src/assets/fonts/Inter-Regular.ttf");
const FONT_BOLD = path.join(ROOT, "src/assets/fonts/Inter-ExtraBold.ttf");
const LOGO = path.join(ROOT, "public/images/logo/logo-full-black-tight.png");
const STAMP = path.join(ROOT, "content/contrats/cachet_odysseo.png");
const SIGNATURE = path.join(ROOT, "content/contrats/signature_fondateur.png");
const NOIR = "#0B0B0D";
const ROUGE = "#FF0000";
const GRIS = "#5B5B66";
const BORD = "#D9D9DE";
const FOND = "#F4F4F6";

/** Identité d'Odysseo sur le reçu (mêmes mentions que le contrat partenaire et les mentions légales). */
export const RECEIPT_ISSUER = {
  name: "Odysseo Education",
  status: "Marque en cours d'immatriculation, représentée par son fondateur, Dr Jiresse Nguetsa Kuate Loïc",
  address: "Siège : Zhenjiang – Dantu – 212002",
  office: "Bureau de paiement (Cameroun) : Douala – Mboppi, après Ecobank et CBC Bank, immeuble Jadever, bureau RT Services (escalier en fer)",
  contact: "WhatsApp +86 131 7946 8571 · contact.odysseo@gmail.com",
  founder: "Dr Jiresse Nguetsa Kuate Loïc, fondateur",
};

export type ReceiptInput = {
  number: string;
  issuedOn: string; // date lisible (fr)
  studentName: string;
  fileCode: string;
  programName: string | null;
  stepLabel: string | null;
  amount: number;
  methodLabel: string;
  methodNote: string | null;
  paidOn: string; // date lisible (fr)
  confirmedBy: string | null;
  totalPaid: number | null;
  totalDue: number | null;
};

const fcfa = (n: number) => new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ");

/** Reçu Odysseo (A4, une page) : généré à la confirmation du paiement par l'équipe. */
export function renderReceiptPdf(r: ReceiptInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 50, bottom: 50, left: 56, right: 56 }, info: { Title: `Reçu ${r.number}`, Author: "Odysseo Education" } });
  doc.registerFont("R", FONT_REGULAR);
  doc.registerFont("B", FONT_BOLD);
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;

  // En-tête : logo à gauche, « REÇU » et numéro à droite.
  const top = doc.y;
  if (fs.existsSync(LOGO)) doc.image(LOGO, left, top, { height: 24 });
  doc.font("B").fontSize(20).fillColor(NOIR).text("REÇU DE PAIEMENT", left, top - 2, { width, align: "right" });
  doc.font("B").fontSize(11).fillColor(ROUGE).text(r.number, left, top + 24, { width, align: "right" });
  doc.font("R").fontSize(9).fillColor(GRIS).text(`Émis le ${r.issuedOn}`, left, top + 40, { width, align: "right" });
  doc.moveTo(left, top + 62).lineTo(left + width, top + 62).strokeColor(ROUGE).lineWidth(2).stroke();

  // Émetteur
  let y = top + 76;
  doc.font("B").fontSize(10).fillColor(NOIR).text(RECEIPT_ISSUER.name, left, y);
  doc.font("R").fontSize(8.5).fillColor(GRIS);
  doc.text(RECEIPT_ISSUER.status, left, doc.y + 1, { width: width * 0.62 });
  doc.text(RECEIPT_ISSUER.address, { width: width * 0.62 });
  doc.text(RECEIPT_ISSUER.office, { width: width * 0.62 });
  doc.text(RECEIPT_ISSUER.contact, { width: width * 0.62 });

  // Reçu de
  y = doc.y + 18;
  doc.font("B").fontSize(8.5).fillColor(ROUGE).text("REÇU DE", left, y);
  doc.font("B").fontSize(13).fillColor(NOIR).text(r.studentName, left, y + 13);
  doc.font("R").fontSize(9).fillColor(GRIS).text(`Dossier ${r.fileCode}${r.programName ? ` · Accompagnement ${r.programName}` : ""}`, left, doc.y + 1);

  // Montant (bandeau)
  y = doc.y + 18;
  doc.roundedRect(left, y, width, 64, 8).fillColor(FOND).fill();
  doc.font("R").fontSize(9).fillColor(GRIS).text("Montant reçu", left + 18, y + 14);
  doc.font("B").fontSize(24).fillColor(NOIR).text(`${fcfa(r.amount)} FCFA`, left + 18, y + 28);
  doc.font("B").fontSize(9).fillColor("#0F7B3F").text("PAIEMENT CONFIRMÉ", left, y + 26, { width: width - 18, align: "right" });

  // Détails
  y += 84;
  const rows: [string, string][] = [
    ["Objet", r.stepLabel ? `Accompagnement Odysseo – ${r.stepLabel}` : "Accompagnement Odysseo"],
    ["Moyen de paiement", r.methodNote ? `${r.methodLabel} (${r.methodNote})` : r.methodLabel],
    ["Date du paiement", r.paidOn],
    ...(r.totalDue != null && r.totalPaid != null
      ? ([
          ["Total réglé à ce jour", `${fcfa(r.totalPaid)} FCFA sur ${fcfa(r.totalDue)} FCFA`],
          ["Reste à régler", `${fcfa(Math.max(0, r.totalDue - r.totalPaid))} FCFA`],
        ] as [string, string][])
      : []),
  ];
  for (const [label, value] of rows) {
    doc.font("R").fontSize(9).fillColor(GRIS).text(label, left, y, { width: 160 });
    doc.font("B").fontSize(9.5).fillColor(NOIR).text(value, left + 170, y, { width: width - 170 });
    y = Math.max(doc.y, y + 14) + 8;
    doc.moveTo(left, y - 4).lineTo(left + width, y - 4).strokeColor(BORD).lineWidth(0.5).stroke();
  }

  // Signature : cachet légèrement tourné, signature du fondateur par-dessus (comme le contrat).
  y += 18;
  const boxW = 220;
  const bx = left + width - boxW;
  doc.font("B").fontSize(8.5).fillColor(ROUGE).text("POUR ODYSSEO", bx, y, { width: boxW });
  doc.font("R").fontSize(8.5).fillColor(GRIS).text(r.confirmedBy ? `Paiement vérifié par ${r.confirmedBy}` : "Paiement vérifié par l'équipe Odysseo", bx, y + 12, { width: boxW });
  const size = 96;
  const cx = bx + boxW / 2;
  const cy = y + 40 + size / 2;
  if (fs.existsSync(STAMP)) {
    doc.save();
    doc.opacity(0.85);
    doc.rotate(-8, { origin: [cx, cy] });
    doc.image(STAMP, cx - size / 2, cy - size / 2, { width: size, height: size });
    doc.restore();
    doc.opacity(1);
  }
  if (fs.existsSync(SIGNATURE)) doc.image(SIGNATURE, cx - 75 - 12, cy - 44, { fit: [150, 90], align: "center", valign: "center" });
  doc.font("B").fontSize(8.5).fillColor(NOIR).text(RECEIPT_ISSUER.founder, bx, cy + size / 2 + 8, { width: boxW, align: "center" });

  // Pied de page
  const footY = doc.page.height - doc.page.margins.bottom - 34;
  doc.moveTo(left, footY).lineTo(left + width, footY).strokeColor(BORD).lineWidth(0.5).stroke();
  doc.font("R").fontSize(7.5).fillColor(GRIS).text(
    "Ce reçu atteste qu'Odysseo Education a reçu et vérifié le paiement ci-dessus. Il est aussi disponible dans votre espace «\u00a0Mon dossier\u00a0». " +
      "Ne payez jamais sur un numéro qui ne vous a pas été communiqué par votre conseiller Odysseo.",
    left,
    footY + 6,
    { width, align: "center" },
  );

  doc.end();
  return done;
}
