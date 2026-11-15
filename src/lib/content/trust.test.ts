import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { PROGRAMS } from "@/lib/programs";
import {
  getAdvisors,
  getProofDocuments,
  getTestimonials,
  isAllowedVideoFile,
  isAllowedVideoUrl,
  getStats,
  getUniversityLogos,
  getVideoTestimonials,
  hasCreditedPhoto,
  publishedImagePaths,
  videoEmbedUrl,
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

test("lecteur intégré : YouTube et TikTok reconnus, lien court ouvert à part", () => {
  assert.equal(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")?.startsWith("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"), true);
  assert.equal(videoEmbedUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")?.includes("/embed/dQw4w9WgXcQ"), true);
  assert.equal(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.includes("/embed/dQw4w9WgXcQ"), true);
  assert.equal(videoEmbedUrl("https://www.tiktok.com/@odysseo/video/7301234567890123456"), "https://www.tiktok.com/player/v1/7301234567890123456?autoplay=1&rel=0");
  assert.equal(videoEmbedUrl("https://vm.tiktok.com/ZMabc123/"), null);
});

test("vidéos hébergées : MP4 dans public/videos/ ou sur Vercel Blob uniquement", () => {
  assert.equal(isAllowedVideoFile("/videos/temoignage-t-001.mp4"), true);
  assert.equal(isAllowedVideoFile("https://abc123.public.blob.vercel-storage.com/videos/t-001.mp4"), true);
  assert.equal(isAllowedVideoFile("https://exemple.com/video.mp4"), false);
  assert.equal(isAllowedVideoFile("/videos/t-001.mov"), false);
  for (const t of getVideoTestimonials()) {
    if (t.video_fichier?.startsWith("/")) {
      assert.ok(existsSync(path.join(process.cwd(), "public", t.video_fichier)), `vidéo introuvable : public${t.video_fichier}`);
    }
  }
});

test("chiffres affichés : uniquement des nombres réels et positifs", () => {
  for (const s of getStats()) assert.ok(typeof s.valeur === "number" && s.valeur > 0, s.id);
});

test("logos publiés : fichier sous /images/universites/, noms uniques", () => {
  const ids = new Set<string>();
  for (const u of getUniversityLogos()) {
    assert.ok(u.logo.startsWith("/images/universites/"), `${u.id} : ${u.logo}`);
    assert.ok(!ids.has(u.id), `doublon : ${u.id}`);
    ids.add(u.id);
  }
});

test("photos de campus : chacune a une licence libre et une source Wikimedia Commons", () => {
  for (const u of getUniversityLogos()) {
    if (!u.photo) continue;
    assert.ok(hasCreditedPhoto(u), `${u.id} : photo sans licence ou sans source`);
    assert.ok(u.photo.startsWith("/images/campus/"), `${u.id} : ${u.photo}`);
    assert.match(u.photo_licence ?? "", /CC|Public domain|PD|GFDL|Attribution/i, `${u.id} : licence non libre`);
    assert.ok(u.photo_source?.startsWith("https://commons.wikimedia.org/"), `${u.id} : source ${u.photo_source}`);
  }
});
