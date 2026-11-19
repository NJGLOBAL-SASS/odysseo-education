/**
 * PDF du rapport d'admissibilité (PACK-13 §4), CÔTÉ SERVEUR. Reproduit la mise en page des
 * rapports envoyés (connaissances/structure_rapport.md) : bandeau noir ODYSSEO / EDUCATION,
 * verdict à filet rouge, titres rouges numérotés, tableau des offres « Notre choix »,
 * graphique en barres, encadré noir « Pour lancer votre dossier », pied de page x/N.
 *
 * Le contenu (ReportContent) vient de l'analyse IA validée, ou d'un brouillon de secours.
 * Les montants Odysseo, les textes « offres évolutives » et les dates viennent toujours du code.
 * En ligne : **gras**, !!gras rouge!!, ~~barré (frais d'origine)~~.
 */
import "server-only";

import path from "node:path";
import PDFDocument from "pdfkit";

import { parseRich } from "./rich";

const ROOT = process.cwd();
const FONT_REGULAR = path.join(ROOT, "src/assets/fonts/Inter-Regular.ttf");
const FONT_BOLD = path.join(ROOT, "src/assets/fonts/Inter-ExtraBold.ttf");

const NOIR = "#0B0B0D";
const ROUGE = "#FF0000";
const ROSE = "#FDE7E7";
const GRIS = "#6B6B75";
const GRIS_FOND = "#F1F1F3";
const BORD = "#DADADF";

const W = 595.28;
const H = 841.89;
const M = 48; // marges gauche / droite
const CW = W - 2 * M; // largeur utile
const TOP = 104; // sous le bandeau
const BOTTOM = H - 62; // au-dessus du pied de page
const BODY = 10.5;
const GAP = 1.4;

// ── Contenu ──

export type Rich = string; // **gras**, !!gras rouge!!, ~~barré~~

export interface OfferRow {
  ref: string;
  /** « Université *** · Pékin » */
  title: string;
  /** Filières, langue, durée (gras possible). */
  details: Rich;
  /** Après bourse : lignes (frais d'origine barrés possibles via « ~~ »). */
  afterScholarship: Rich[];
  deadline: string | null;
  chosen?: boolean;
}

export type Section =
  | { kind: "bullets"; title: string; bullets: Rich[]; box?: { title: string; text: Rich } }
  | { kind: "plan"; title: string; steps: { label: string; text: Rich }[]; text?: Rich }
  | {
      kind: "offers";
      title: string;
      intro?: Rich;
      deadlineLabel?: string;
      offers: OfferRow[];
      chart?: { title: string; bars: { label: string; min: number; max: number; text: string }[] };
      why?: Rich;
      readyEarly?: Rich;
    }
  | { kind: "table"; title: string; head: string[]; rows: Rich[][]; widths: number[] }
  | { kind: "dossier"; title: string; provide: Rich[]; weDo: Rich[]; meet?: Rich }
  | { kind: "calendar"; title: string; rows: { when: string; what: Rich }[] }
  | { kind: "tarif"; title: string; rows: { label: string; amount: string; when: Rich }[]; included: string[]; excluded: string[]; formulas?: Rich };

export interface ReportContent {
  code: string;
  emittedAt: Date;
  validUntil: Date;
  fullName: string;
  /** Rapport mis à jour (v2…) : bandeau + « Ce qui change ». */
  update?: { changes: Rich[] };
  verdict: { title: Rich; nuance?: Rich };
  profile: [string, string][];
  atouts: Rich;
  attention?: Rich;
  sections: Section[];
  /** Textes fixes « offres évolutives » (PACK-13 §4) : insérés sous le tableau des offres. */
  availabilityNote: string;
  launch: { firstInstallment: Rich; deadline?: Rich; todo: Rich };
}

// ── Texte enrichi ──

const plain = (s: Rich) => parseRich(s).map((x) => x.text).join("");

export function renderReportPdf(c: ReportContent): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: TOP, bottom: H - BOTTOM, left: M, right: M },
    bufferPages: true,
    autoFirstPage: false,
    info: { Title: `Rapport d'admissibilité ${c.code}`, Author: "Odysseo Education", Subject: "Rapport d'admissibilité" },
  });
  doc.registerFont("R", FONT_REGULAR);
  doc.registerFont("B", FONT_BOLD);
  const chunks: Buffer[] = [];
  doc.on("data", (b: Buffer) => chunks.push(b));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  const emitted = fmtDate(c.emittedAt);

  doc.on("pageAdded", () => {
    doc.rect(0, 0, W, 78).fill(NOIR);
    doc.rect(0, 78, W, 4).fill(ROUGE);
    doc.font("B").fontSize(26).fillColor("#FFFFFF").text("ODYSSEO", M, 26, { lineBreak: false });
    const wOdy = doc.widthOfString("ODYSSEO");
    doc.font("B").fontSize(12).fillColor(ROUGE).text("EDUCATION", M + wOdy + 8, 38, { lineBreak: false });
    doc.font("B").fontSize(12).fillColor("#FFFFFF").text("RAPPORT D'ADMISSIBILITÉ", M, 26, { width: CW, align: "right" });
    doc.font("R").fontSize(11).fillColor("#FFFFFF").text(`Dossier ${c.code} · émis le ${emitted}`, M, 44, { width: CW, align: "right" });
    doc.x = M;
    doc.y = TOP;
  });
  doc.addPage();

  // ── Primitives ──

  const ensure = (h: number) => {
    if (doc.y + h > BOTTOM) doc.addPage();
  };
  const heightOf = (s: Rich, width: number, size = BODY) => doc.font("B").fontSize(size).heightOfString(plain(s) || " ", { width, lineGap: GAP });

  /** Texte enrichi à (x, y) sur `width` ; renvoie la hauteur écrite. */
  const rich = (s: Rich, x: number, y: number, width: number, o: { size?: number; color?: string; boldAll?: boolean; align?: "left" | "right" } = {}) => {
    const segs = parseRich(s);
    const size = o.size ?? BODY;
    const startY = y;
    segs.forEach((seg, i) => {
      doc.font(seg.bold || o.boldAll ? "B" : "R").fontSize(size).fillColor(seg.red ? ROUGE : seg.strike ? GRIS : (o.color ?? NOIR));
      const opts = { width, lineGap: GAP, continued: i < segs.length - 1, strike: Boolean(seg.strike), align: o.align ?? "left" };
      if (i === 0) doc.text(seg.text, x, y, opts);
      else doc.text(seg.text, opts);
    });
    return doc.y - startY;
  };
  const para = (s: Rich, o: { size?: number; color?: string; gapAfter?: number } = {}) => {
    ensure(heightOf(s, CW, o.size) + 2);
    rich(s, M, doc.y, CW, o);
    doc.y += o.gapAfter ?? 6;
  };
  let sectionNo = 0;
  const title = (t: string, numbered = true) => {
    ensure(46);
    doc.y += 4;
    const label = numbered ? `${++sectionNo}. ${t.toUpperCase()}` : t.toUpperCase();
    doc.font("B").fontSize(13.5).fillColor(ROUGE).text(label, M, doc.y, { width: CW });
    doc.y += 5;
  };
  const bullets = (items: Rich[]) => {
    for (const b of items) {
      const h = heightOf(b, CW - 16);
      ensure(h + 4);
      const y = doc.y;
      doc.font("R").fontSize(BODY).fillColor(NOIR).text("•", M + 2, y, { lineBreak: false });
      rich(b, M + 16, y, CW - 16);
      doc.y += 4;
    }
  };
  const box = (t: string, text: Rich, tone: "rose" | "noir") => {
    const pad = 12;
    const lines = text.split("\n");
    const h = 18 + lines.reduce((sum, l) => sum + heightOf(l, CW - 2 * pad), 0) + 2 * pad - 4;
    ensure(h + 8);
    const y = doc.y;
    if (tone === "rose") doc.rect(M, y, CW, h).fillAndStroke(ROSE, ROUGE);
    else doc.rect(M, y, CW, h).fill(NOIR);
    doc.font("B").fontSize(11.5).fillColor(ROUGE).text(t.toUpperCase(), M + pad, y + pad, { width: CW - 2 * pad });
    let ly = doc.y + 2;
    for (const line of lines) ly += rich(line, M + pad, ly, CW - 2 * pad, { color: tone === "noir" ? "#FFFFFF" : NOIR });
    doc.y = y + h + 10;
  };

  /** Tableau : en-tête noir (ou aucun), cellules enrichies, ligne surlignée en rose. */
  const table = (head: string[] | null, rows: { cells: Rich[]; highlight?: boolean; firstCellRed?: boolean }[], widths: number[]) => {
    const total = widths.reduce((a, b) => a + b, 0);
    const cols = widths.map((w) => (w / total) * CW);
    const pad = 6;
    const drawHead = () => {
      if (!head) return;
      const hh = Math.max(...head.map((h, i) => doc.font("B").fontSize(BODY).heightOfString(h, { width: cols[i] - 2 * pad }))) + 2 * pad;
      const y = doc.y;
      doc.rect(M, y, CW, hh).fill(NOIR);
      let x = M;
      head.forEach((h, i) => {
        doc.font("B").fontSize(BODY).fillColor("#FFFFFF").text(h, x + pad, y + pad, { width: cols[i] - 2 * pad });
        x += cols[i];
      });
      doc.y = y + hh;
    };
    ensure(60);
    drawHead();
    for (const row of rows) {
      const rh = Math.max(...row.cells.map((cell, i) => cell.split("\n").reduce((s, l) => s + heightOf(l, cols[i] - 2 * pad), 0))) + 2 * pad;
      if (doc.y + rh > BOTTOM) {
        doc.addPage();
        drawHead();
      }
      const y = doc.y;
      if (row.highlight) doc.rect(M, y, CW, rh).fill(ROSE);
      if (row.firstCellRed) doc.rect(M, y, cols[0], rh).fill(ROUGE);
      let x = M;
      row.cells.forEach((cell, i) => {
        let cy = y + pad;
        for (const line of cell.split("\n")) {
          cy += rich(line, x + pad, cy, cols[i] - 2 * pad, i === 0 && row.firstCellRed ? { color: "#FFFFFF", boldAll: true } : {});
        }
        x += cols[i];
      });
      doc.moveTo(M, y + rh).lineTo(M + CW, y + rh).lineWidth(0.6).strokeColor(BORD).stroke();
      doc.y = y + rh;
    }
    doc.y += 8;
  };

  /** Graphique en barres horizontales (fourchette min → max ; rouge plein jusqu'au min, rose jusqu'au max). */
  const chart = (t: string, bars: { label: string; min: number; max: number; text: string }[]) => {
    const rowH = 18;
    ensure(22 + bars.length * (rowH + 4));
    doc.font("B").fontSize(BODY).fillColor(NOIR).text(t, M, doc.y);
    doc.y += 4;
    const labelW = 120;
    const valueW = 120;
    const barW = CW - labelW - valueW;
    const scale = Math.max(1, ...bars.map((b) => b.max));
    for (const b of bars) {
      const y = doc.y;
      doc.font("R").fontSize(BODY).fillColor(NOIR).text(b.label, M, y + 3, { width: labelW - 6, lineBreak: false, ellipsis: true });
      const wMax = (b.max / scale) * barW;
      const wMin = (b.min / scale) * barW;
      if (wMax > 0) doc.rect(M + labelW, y + 2, wMax, rowH - 4).fill(ROSE);
      if (wMin > 0) doc.rect(M + labelW, y + 2, wMin, rowH - 4).fill(ROUGE);
      doc.font("B").fontSize(BODY).fillColor(NOIR).text(b.text, M + labelW + Math.max(wMax, wMin) + 6, y + 3, { width: valueW + barW - Math.max(wMax, wMin) - 6, lineBreak: false });
      doc.y = y + rowH + 4;
    }
    doc.y += 2;
  };

  // ── Rapport mis à jour ──
  if (c.update) {
    const lines = c.update.changes.map((x) => `• ${x}`).join("\n");
    box(`Rapport mis à jour · ${emitted}`, `**Ce qui change :**\n${lines}`, "rose");
  }

  // ── Verdict ──
  {
    const pad = 12;
    const head = `VOTRE VERDICT · ${c.fullName.toUpperCase()}`;
    const hTitle = doc.font("B").fontSize(14).heightOfString(plain(c.verdict.title), { width: CW - 2 * pad - 6, lineGap: GAP });
    const hNuance = c.verdict.nuance ? heightOf(c.verdict.nuance, CW - 2 * pad - 6, 11) : 0;
    const h = pad + 16 + hTitle + (hNuance ? hNuance + 4 : 0) + pad;
    const y = doc.y;
    doc.rect(M, y, CW, h).fill(GRIS_FOND);
    doc.rect(M - 2, y - 2, 4, h + 4).fill(ROUGE);
    doc.font("B").fontSize(11).fillColor(ROUGE).text(head, M + pad + 6, y + pad, { width: CW - 2 * pad - 6 });
    rich(c.verdict.title, M + pad + 6, doc.y + 1, CW - 2 * pad - 6, { size: 14, boldAll: true });
    if (c.verdict.nuance) rich(c.verdict.nuance, M + pad + 6, doc.y + 3, CW - 2 * pad - 6, { size: 11 });
    doc.y = y + h + 12;
  }

  // ── Profil ──
  title("Votre profil", false);
  {
    const rows: { cells: Rich[] }[] = [];
    for (let i = 0; i < c.profile.length; i += 2) {
      const a = c.profile[i];
      const b = c.profile[i + 1];
      rows.push({ cells: [`**${a[0]}**`, a[1], b ? `**${b[0]}**` : "", b ? b[1] : ""] });
    }
    table(null, rows, [17, 33, 17, 33]);
    doc.y -= 4;
    para(`**Vos atouts :** ${c.atouts}`, { gapAfter: 2 });
    if (c.attention) para(`**Point d'attention :** ${c.attention}`, { gapAfter: 2 });
    para("Analyse établie sur vos déclarations, sous réserve de vérification de vos documents.", { color: GRIS, gapAfter: 8 });
  }

  // ── Sections ──
  for (const s of c.sections) {
    if (s.kind === "bullets") {
      title(s.title);
      bullets(s.bullets);
      if (s.box) box(s.box.title, s.box.text, "rose");
    } else if (s.kind === "plan") {
      title(s.title);
      table(null, s.steps.map((st) => ({ cells: [st.label, st.text], firstCellRed: true })), [32, 68]);
      if (s.text) para(s.text);
    } else if (s.kind === "offers") {
      title(s.title);
      if (s.intro) para(s.intro);
      table(
        ["Option", "Ville, filières, cours", "Après bourse", s.deadlineLabel ?? "Date limite"],
        s.offers.map((o, i) => ({
          cells: [`**${i + 1}**${o.chosen ? "\n!!Notre choix!!" : ""}`, `**${o.title}**\n${o.details}`, o.afterScholarship.join("\n"), o.deadline ?? "à confirmer"],
          highlight: o.chosen,
        })),
        [10, 37, 37, 16],
      );
      para(c.availabilityNote, { size: 8.5, color: GRIS, gapAfter: 8 });
      if (s.chart) chart(s.chart.title, s.chart.bars);
      if (s.why) para(`**Pourquoi l'option 1 :** ${s.why}`);
      if (s.readyEarly) box("Si vous êtes prêt plus tôt", s.readyEarly, "rose");
    } else if (s.kind === "table") {
      title(s.title);
      table(s.head, s.rows.map((cells) => ({ cells })), s.widths);
    } else if (s.kind === "dossier") {
      title(s.title);
      table(["Ce que vous fournissez", "Ce dont nous nous chargeons"], [{ cells: [s.provide.map((x) => `• ${x}`).join("\n"), s.weDo.map((x) => `• ${x}`).join("\n")] }], [45, 55]);
      if (s.meet) para(s.meet);
    } else if (s.kind === "calendar") {
      title(s.title);
      table(null, s.rows.map((r) => ({ cells: [r.when, r.what], firstCellRed: true })), [24, 76]);
    } else if (s.kind === "tarif") {
      title(s.title);
      if (s.formulas) para(s.formulas);
      table(null, s.rows.map((r) => ({ cells: [`**${r.label}**`, `**${r.amount}**`, r.when] })), [26, 15, 59]);
      doc.y -= 4;
      para(`**Inclus :** ${s.included.join(", ")}. **Non inclus :** ${s.excluded.join(", ")}.`);
      para("Vous ne réglez la totalité qu'une fois votre visa obtenu.", { color: GRIS });
    }
  }

  // ── Pour lancer votre dossier ──
  box(
    "Pour lancer votre dossier",
    [
      `1er versement : ${c.launch.firstInstallment}`,
      ...(c.launch.deadline ? [c.launch.deadline] : []),
      `Rapport valable jusqu'au **${fmtDate(c.validUntil)}** · offres sous réserve de places disponibles · Moyens de paiement : envoyés par votre conseiller sur WhatsApp`,
      `**À faire dès maintenant :** ${c.launch.todo}`,
    ].join("\n"),
    "noir",
  );

  // ── Pieds de page ──
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0; // le pied de page est sous la marge : sans cela, pdfkit ajoute une page
    const y = H - 44;
    doc.moveTo(M, y - 6).lineTo(M + CW, y - 6).lineWidth(0.8).strokeColor(BORD).stroke();
    doc.font("R").fontSize(9).fillColor(GRIS).text("L'équipe Odysseo · WhatsApp +86 131 7946 8571 · contact.odysseo@gmail.com", M, y, { width: CW, lineBreak: false });
    doc.text(`Page ${i + 1}/${range.count}`, M, y, { width: CW, align: "right", lineBreak: false });
  }
  doc.end();
  return done;
}

export function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Douala" }).format(d);
}

/** Texte fixe « offres évolutives » sous le tableau des offres (PACK-13 §4, jamais généré par l'IA). */
export const availabilityNote = (emittedAt: Date) =>
  `Offres ouvertes au ${fmtDate(emittedAt)}. Les places dépendent des dates limites et des quotas des universités : à l'ouverture de votre dossier, nous confirmons les offres encore disponibles et, si l'une a fermé, nous vous proposons la meilleure offre équivalente du moment.`;
