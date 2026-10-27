/**
 * Nettoyage du HTML produit par l'éditeur d'emails du dashboard.
 * Liste blanche stricte : seules les balises de mise en forme sont gardées,
 * sans aucun attribut (sauf href http(s)/mailto sur les liens). Tout le reste
 * (script, style, iframe, on*=, javascript:, images distantes...) est retiré.
 */

const ALLOWED = new Set([
  "p", "br", "div", "b", "strong", "i", "em", "u", "s", "strike",
  "ul", "ol", "li", "h2", "h3", "blockquote", "a", "span",
]);
// Balises dont le contenu entier doit disparaître (pas seulement la balise).
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template|svg|math|head|title)\b[\s\S]*?<\/\1\s*>/gi;

function safeHref(raw: string) {
  const value = raw.trim().replace(/^["']|["']$/g, "").replace(/&amp;/g, "&");
  if (/^(https?:\/\/|mailto:)/i.test(value)) return value.replace(/"/g, "%22").replace(/&/g, "&amp;");
  return null;
}

export function sanitizeEmailHtml(input: string) {
  const kept: string[] = [];
  const keep = (tag: string) => `\u0000${kept.push(tag) - 1}\u0000`;

  let html = String(input || "")
    .replace(/\u0000/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(DROP_WITH_CONTENT, "");

  // 1) Les balises autorisées, réécrites sans attribut, sont mises de côté...
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^<>]*)>/g, (tag, rawName: string, attrs: string) => {
    const name = rawName.toLowerCase();
    if (!ALLOWED.has(name)) return "";
    if (tag.startsWith("</")) return name === "br" ? "" : keep(`</${name}>`);
    if (name === "br") return keep("<br>");
    if (name === "a") {
      const m = /href\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i.exec(attrs);
      const href = m ? safeHref(m[1]!) : null;
      return keep(href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">` : "<a>");
    }
    return keep(`<${name}>`);
  });

  // 2) ...puis TOUT chevron restant devient du texte : aucune balise non fermée,
  //    découpée ou imbriquée ne peut survivre.
  html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return html.replace(/\u0000(\d+)\u0000/g, (_, i: string) => kept[Number(i)]!).trim();
}

/** Texte brut (aperçu, recherche, vérification "message vide"). */
export function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h2|h3|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
