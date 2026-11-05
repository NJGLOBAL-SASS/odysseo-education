import { test } from "node:test";
import assert from "node:assert/strict";

import { filterFaq, getChecklist, getFaq, isPublishable } from "./faq";

const LOCALES = ["fr", "en"] as const;

test("aucun texte affiché ne contient « [À » ni de nombre entre crochets à valider", () => {
  for (const locale of LOCALES) {
    const faq = getFaq(locale);
    const checklist = getChecklist(locale);
    const shown = [
      ...faq.flatMap((c) => [c.titre, ...c.questions.flatMap((x) => [x.q, x.r])]),
      checklist.titre,
      ...checklist.sections.flatMap((s) => [s.titre, ...s.items.map((i) => i.text)]),
    ];
    for (const text of shown) {
      assert.ok(!text.includes("[À"), `[${locale}] texte non validé affiché : ${text}`);
      assert.ok(!/\[\s*\d+\s*\]/.test(text), `[${locale}] nombre à valider affiché : ${text}`);
    }
  }
});

test("règle de publication", () => {
  assert.equal(isPublishable("Texte validé."), true);
  assert.equal(isPublishable("Commencez en novembre. [À VALIDER]"), false);
  assert.equal(isPublishable("[À VALIDER : lister les moyens]"), false);
  assert.equal(isPublishable("au moins [7] jours avant le départ"), false);
});

test("19 questions visibles avec le fichier fourni, en FR comme en EN", () => {
  for (const locale of LOCALES) {
    const faq = getFaq(locale);
    assert.equal(faq.length, 6, `[${locale}] 6 catégories`);
    assert.equal(faq.reduce((n, c) => n + c.questions.length, 0), 19, `[${locale}] 19 questions`);
  }
});

test("la checklist masque l'élément « [7] jours [À VALIDER] »", () => {
  for (const locale of LOCALES) {
    const items = getChecklist(locale).sections.flatMap((s) => s.items);
    assert.equal(items.length, 18, `[${locale}] 18 éléments visibles sur 19`);
    assert.equal(new Set(items.map((i) => i.id)).size, items.length, `[${locale}] identifiants uniques`);
  }
});

test("« relevé » ne laisse que la question sur le relevé bancaire", () => {
  for (const query of ["relevé", "releve", "Relevé"]) {
    const result = filterFaq(getFaq("fr"), query).flatMap((c) => c.questions);
    assert.equal(result.length, 1, `requête « ${query} »`);
    assert.match(result[0].q, /relevé bancaire/);
  }
  assert.equal(filterFaq(getFaq("en"), "bank statement").flatMap((c) => c.questions).length, 1);
  assert.equal(filterFaq(getFaq("fr"), "").flatMap((c) => c.questions).length, 19);
});
