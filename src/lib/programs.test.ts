import { test } from "node:test";
import assert from "node:assert/strict";

import { PROGRAMS, getProgram, paidAfterAdmission } from "./programs";

test("échéanciers : la somme des étapes est égale au prix affiché", () => {
  for (const p of PROGRAMS) {
    assert.equal(p.payments.reduce((s, x) => s + x.amount, 0), p.price, p.slug);
  }
});

test("part payée après l'admission, pour chaque cursus (arrondi inférieur)", () => {
  const pct = (slug: string) => paidAfterAdmission(getProgram(slug)!).pct;
  assert.equal(pct("langue-chinoise"), 60); // 600 000 + 300 000 sur 1 500 000
  assert.equal(pct("bachelor"), 58); // 1 700 000 sur 2 900 000 (58,6 %)
  assert.equal(pct("master"), 63); // 1 075 000 × 2 sur 3 400 000 (63,2 %)
  assert.equal(pct("doctorat"), 58); // 1 075 000 × 2 sur 3 700 000 (58,1 %)
  assert.deepEqual(paidAfterAdmission({ payments: [{ label: { fr: "", en: "" }, when: { fr: "", en: "" }, amount: 100 }] }), { total: 100, after: 0, pct: 0 });
});

test("les étapes « après l'admission » sont les dernières de chaque échéancier", () => {
  for (const p of PROGRAMS) {
    const first = p.payments.findIndex((x) => x.afterAdmission);
    assert.ok(first > 0, p.slug);
    assert.ok(p.payments.slice(first).every((x) => x.afterAdmission), p.slug);
  }
});

import { getPaymentMethods, getPaymentRules } from "./content/payment-methods";

test("moyens de paiement : seuls les moyens actifs (confirmés) sont affichés", () => {
  assert.deepEqual(getPaymentMethods("fr"), [], "aucun moyen confirmé pour l'instant");
  const data = {
    moyens: [
      { id: "a", type: "mobile", libelle_fr: "Orange Money", libelle_en: "Orange Money", actif: true },
      { id: "b", libelle_fr: "Virement bancaire", libelle_en: "Bank transfer", actif: false },
    ],
    regles_affichees_fr: ["Reçu"],
  };
  assert.deepEqual(getPaymentMethods("en", data).map((m) => m.label), ["Orange Money"]);
  assert.deepEqual(getPaymentRules("en", data), ["Reçu"], "repli sur le français");
  assert.equal(getPaymentRules("en").length, 2);
});
