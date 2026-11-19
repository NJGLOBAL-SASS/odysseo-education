/** Texte enrichi du rapport PDF : **gras**, !!gras rouge!!, ~~barré~~ (« Université *** » reste intact). Module pur. */

export type Seg = { text: string; bold: boolean; strike?: boolean; red?: boolean };

const STARS = "\uE000"; // « Université *** » : les trois astérisques ne sont pas du gras

export function parseRich(input: string): Seg[] {
  const s = input.replaceAll("***", STARS);
  const out: Seg[] = [];
  const re = /(\*\*[^*]+\*\*|~~[^~]+~~|!![^!]+!!)/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index! > last) out.push({ text: s.slice(last, m.index), bold: false });
    const raw = m[0];
    const inner = raw.slice(2, -2);
    out.push(raw.startsWith("**") ? { text: inner, bold: true } : raw.startsWith("!!") ? { text: inner, bold: true, red: true } : { text: inner, bold: false, strike: true });
    last = m.index! + raw.length;
  }
  if (last < s.length) out.push({ text: s.slice(last), bold: false });
  for (const seg of out) seg.text = seg.text.replaceAll(STARS, "***");
  return out.length ? out : [{ text: "", bold: false }];
}
