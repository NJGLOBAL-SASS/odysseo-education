import { test } from "node:test";
import assert from "node:assert/strict";

import { confirmedTotal, declareSchema, isPlausiblePaymentDate, nextSequence, receiptNumber, recordSchema, whatsappLink } from "./rules";

const proof = { url: "https://x.private.blob.vercel-storage.com/documents/espace/paiements/OD-1/a.jpg", name: "recu.jpg" };
const today = new Date().toISOString().slice(0, 10);

test("déclaration depuis l'espace : preuve obligatoire, précision exigée pour « autre »", () => {
  assert.equal(declareSchema.safeParse({ stepIndex: 0, amount: 150_000, method: "orange_money", paidOn: today, proof }).success, true);
  assert.equal(declareSchema.safeParse({ stepIndex: 0, amount: 150_000, method: "orange_money", paidOn: today }).success, false, "sans preuve");
  assert.equal(declareSchema.safeParse({ stepIndex: 0, amount: 150_000, method: "autre", paidOn: today, proof }).success, false, "« autre » sans précision");
  assert.equal(declareSchema.safeParse({ stepIndex: 0, amount: 150_000, method: "autre", methodNote: "Western Union", paidOn: today, proof }).success, true);
  assert.equal(declareSchema.safeParse({ stepIndex: 0, amount: 150_000, method: "orange_money", paidOn: today, proof: { ...proof, url: "pas-une-url" } }).success, false, "adresse invalide");
});

test("enregistrement par l'équipe : preuve facultative (paiement au bureau)", () => {
  assert.equal(recordSchema.safeParse({ stepIndex: 1, amount: 450_000, method: "especes", paidOn: today }).success, true);
  assert.equal(recordSchema.safeParse({ stepIndex: 1, amount: 0, method: "especes", paidOn: today }).success, false, "montant nul");
});

test("date de paiement plausible : ni dans le futur, ni plus de 2 ans en arrière", () => {
  const now = new Date("2026-11-15T10:00:00Z");
  assert.equal(isPlausiblePaymentDate("2026-11-15", now), true);
  assert.equal(isPlausiblePaymentDate("2026-12-01", now), false);
  assert.equal(isPlausiblePaymentDate("2023-01-01", now), false);
  assert.equal(isPlausiblePaymentDate("2026-02-30", now), false, "date impossible");
});

test("numéros de reçu : séquence annuelle sur 4 chiffres", () => {
  assert.equal(receiptNumber(2026, 7), "REC-2026-0007");
  assert.equal(nextSequence([null, "REC-2026-0003", "REC-2026-0012", "REC-2025-0099"], 2026), 13);
  assert.equal(nextSequence([], 2027), 1);
});

test("montant réglé : paiements confirmés seulement, sinon premier paiement déjà saisi", () => {
  assert.equal(confirmedTotal([{ status: "confirme", amount: 150_000 }, { status: "en_verification", amount: 450_000 }, { status: "refuse", amount: 9 }], 600_000), 150_000);
  assert.equal(confirmedTotal([{ status: "en_verification", amount: 450_000 }], 600_000), 600_000, "dossier antérieur");
  assert.equal(confirmedTotal([], null), 0);
});

test("lien WhatsApp : numéro international, message encodé", () => {
  assert.equal(whatsappLink("+237 6 99 00 11 22", "Reçu REC-2026-0001"), "https://wa.me/237699001122?text=Re%C3%A7u%20REC-2026-0001");
  assert.equal(whatsappLink("", "x"), null);
});
