import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { PROGRAMS } from "@/lib/programs";
import {
  getAdvisors,
  getProofDocuments,
  getTestimonials,
  isAllowedVideoUrl,
  publishedImagePaths,
  testimonialQuote,
  QUOTE_MAX_LENGTH,
} from "./trust";

const MAX_IMAGE_BYTES = 150 * 1024;

test("chaque image publiée existe dans public/ et pèse 150 Ko maximum", () => {
  for (const src of publishedImagePaths()) {
    assert.ok(src.startsWith("/images/"), `chemin attendu sous /images/ : ${src}`);
    const file = path.join(process.cwd(), "public", src);
    assert.ok(existsSync(file), `image introuvable : public${src}`);
    const size = statSync(file).size;
    assert.ok(size <= MAX_IMAGE_BYTES, `image trop lourde (${Math.round(size / 1024)} Ko > 150 Ko) : public${src}`);
  }
});

test("témoignages publiés : cursus valide, citation ≤ 300 caractères, université jamais nommée", () => {
  const slugs = new Set(PROGRAMS.map((p) => p.slug));
  for (const t of getTestimonials()) {
    assert.ok(slugs.has(t.cursus), `${t.id} : cursus inconnu « ${t.cursus} »`);
    assert.ok(/^[A-ZÀ-Ý]\.?$/.test(t.initiale_nom), `${t.id} : seulement l'initiale du nom (ex. « K. »)`);
    for (const text of [t.citation_fr, t.citation_en ?? "", t.ville_chine]) {
      assert.ok(!/universit|university|大学/i.test(text), `${t.id} : ne pas nommer l'université (« ${text} »)`);
    }
    assert.ok(testimonialQuote(t, "fr").length <= QUOTE_MAX_LENGTH);
    assert.ok(t.citation_fr.length <= QUOTE_MAX_LENGTH, `${t.id} : citation_fr > 300 caractères`);
    if (t.video_url) assert.ok(isAllowedVideoUrl(t.video_url), `${t.id} : vidéo YouTube ou TikTok uniquement`);
  }
});

test("conseillers : numéro WhatsApp au format international sans « + »", () => {
  for (const a of getAdvisors()) {
    if (a.whatsapp) assert.match(a.whatsapp, /^\d{8,15}$/, `${a.prenom} : ${a.whatsapp}`);
  }
});

test("au plus 3 documents d'exemple", () => {
  assert.ok(getProofDocuments().length <= 3);
});

test("liens vidéo autorisés", () => {
  assert.equal(isAllowedVideoUrl("https://www.youtube.com/watch?v=x"), true);
  assert.equal(isAllowedVideoUrl("https://www.tiktok.com/@odysseo/video/1"), true);
  assert.equal(isAllowedVideoUrl("https://exemple.com/video"), false);
  assert.equal(isAllowedVideoUrl(null), false);
});
