import { test } from "node:test";
import assert from "node:assert/strict";

import { appendStage, firstNameOf, lastFourDigits, normalizeCode, normalizeHistory } from "./tracking-stages";

test("prénom seul, jamais le nom de famille", () => {
  assert.equal(firstNameOf("KAMGA Paul"), "Paul");
  assert.equal(firstNameOf("KAMGA NJOYA Marie Claire"), "Marie");
  assert.equal(firstNameOf("Paul Kamga"), "Kamga", "sans majuscules : dernier mot, comme l'écran de fin");
  assert.equal(firstNameOf("paul"), "Paul");
  assert.equal(firstNameOf(""), "");
});

test("code dossier et 4 derniers chiffres", () => {
  assert.equal(normalizeCode(" ody-2bq9x1 "), "ODY-2BQ9X1");
  assert.equal(normalizeCode("2BQ9X1"), "ODY-2BQ9X1");
  assert.equal(normalizeCode("ODY2BQ9X1"), "ODY-2BQ9X1");
  assert.equal(lastFourDigits("+237699123456"), "3456");
});

test("historique : « reçu » ajouté pour les anciens dossiers, une ligne par changement", () => {
  const created = new Date("2026-11-01T10:00:00Z");
  const h = normalizeHistory([], created);
  assert.deepEqual(h, [{ stage: "recu", date: created.toISOString() }]);
  const now = new Date("2026-11-08T10:00:00Z");
  const h2 = appendStage(h, "recu", "analyse", now);
  assert.equal(h2.length, 2);
  assert.deepEqual(h2[1], { stage: "analyse", date: now.toISOString() });
  assert.equal(appendStage(h2, "analyse", "analyse", now).length, 2, "même étape : pas de ligne");
  assert.equal(normalizeHistory([{ stage: "pirate", date: "x" }, null], created).length, 1, "entrées invalides ignorées");
});

import { isChunkLoadError } from "./chunk-error";

test("erreur de version périmée reconnue (rechargement automatique)", () => {
  assert.equal(isChunkLoadError({ name: "ChunkLoadError", message: "Loading chunk 4447 failed." }), true);
  assert.equal(isChunkLoadError(new Error("Failed to fetch dynamically imported module: https://x/_next/a.js")), true);
  assert.equal(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')")), false);
  assert.equal(isChunkLoadError(null), false);
});

import { matchesPhoneDigits } from "./tracking-stages";

test("4 chiffres : WhatsApp de l'étudiant ou du parent", () => {
  const c = { whatsapp: "+237699123456", guardianWhatsapp: "+237677001122" };
  assert.equal(matchesPhoneDigits(c, "3456"), true, "étudiant");
  assert.equal(matchesPhoneDigits(c, "1122"), true, "parent");
  assert.equal(matchesPhoneDigits(c, "0000"), false);
  assert.equal(matchesPhoneDigits({ whatsapp: "+237699123456", guardianWhatsapp: null }, "1122"), false, "pas de parent");
  assert.equal(matchesPhoneDigits({ whatsapp: "+237699123456", guardianWhatsapp: "" }, ""), false, "vide refusé");
  assert.equal(matchesPhoneDigits({ whatsapp: "+237699123456", guardianWhatsapp: "12" }, "12"), false);
});
