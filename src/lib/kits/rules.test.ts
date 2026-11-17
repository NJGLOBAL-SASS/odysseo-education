import { test } from "node:test";
import assert from "node:assert/strict";

import { WA_URL_WARN_LENGTH, badgeLayout, kitPageUrl, kitReferralLink, normalizeWhatsapp, renderTemplate, slugify, waLink, whatsappMessage } from "./rules";

const SITE = "https://odysseo-education.vercel.app";

test("slug depuis le titre", () => {
  assert.equal(slugify("Une université par jour #3"), "une-universite-par-jour-3");
  assert.equal(slugify("  !!  "), "kit");
});

test("liens : parrainage tracé par kit et page publique", () => {
  assert.equal(kitReferralLink(SITE, "JIRESS-797", "unipardjour-03"), `${SITE}/r/JIRESS-797?src=kit-unipardjour-03`);
  assert.equal(kitPageUrl(SITE, "unipardjour-03", "JIRESS-797"), `${SITE}/fr/kit/unipardjour-03/JIRESS-797`);
});

test("variables du texte modèle remplacées partout", () => {
  const out = renderTemplate("Salut {PRENOM} ! Postule ici : {LIEN} (code {CODE}) — {LIEN}", { firstName: "Awa", link: "L", code: "C-1" });
  assert.equal(out, "Salut Awa ! Postule ici : L (code C-1) — L");
});

test("message WhatsApp : lien du kit, texte entre deux traits, rappel du lien", () => {
  const m = whatsappMessage({ firstName: "Awa", kitUrl: "https://k", text: "Texte" });
  assert.match(m, /^Salut Awa 👋/);
  assert.match(m, /📥 Ton visuel \(avec ton QR code\) : https:\/\/k/);
  assert.match(m, /———\nTexte\n———/);
});

test("numéros WhatsApp normalisés au format international", () => {
  assert.equal(normalizeWhatsapp("+237 6 99 12 34 56"), "237699123456");
  assert.equal(normalizeWhatsapp("00237699123456"), "237699123456");
  assert.equal(normalizeWhatsapp("1234"), null);
  assert.equal(normalizeWhatsapp(null), null);
  assert.ok(waLink("237699123456", "a b").startsWith("https://wa.me/237699123456?text=a%20b"));
  assert.ok(WA_URL_WARN_LENGTH > 1000);
});

test("badge : 18 % de la largeur (220 px min), marge 3 %, dans le flyer", () => {
  const b = badgeLayout(1080, 1350, "bas-droite");
  assert.equal(b.width, 220, "18 % de 1080 = 194 → minimum 220");
  assert.equal(b.left, 1080 - 220 - 32);
  assert.ok(b.top + b.height <= 1350);
  const big = badgeLayout(2000, 2000, "haut-droite");
  assert.equal(big.width, 360);
  assert.equal(big.top, 60);
  assert.equal(badgeLayout(1080, 1080, "bas-centre").left, Math.round((1080 - 220) / 2));
  assert.equal(badgeLayout(1080, 1080, "bas-gauche").left, 32);
});
