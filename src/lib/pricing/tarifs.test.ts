import { test } from "node:test";
import assert from "node:assert/strict";

import catalogue from "../../../data/offres/offres_2027.json";
import internes from "../../../data/offres/offres_2027_internes.json";
import { PROGRAMS } from "../programs";
import { TARIFS, firstInstallment, formatFcfa, isSurDevis, tarifOf } from "./tarifs";

type O = { ref: string; cycle: string; familles: string[]; filieres: { famille: string }[]; publiable: boolean };
const offres = (catalogue as unknown as { offres: O[] }).offres;

test("catalogue PACK-12 : 26 offres de mars ajoutées, P-xx et MA-xx conservées", () => {
  assert.equal(catalogue.meta.version, "2027.09-v3+2027.03-v1");
  assert.equal(catalogue.meta.mise_a_jour, "2026-11-14");
  assert.equal(offres.filter((o) => /^(P|MA)-/.test(o.ref)).length, 40);
  assert.equal(offres.filter((o) => /^(L|B|MB)-/.test(o.ref)).length, 26);
  assert.equal(new Set(offres.map((o) => o.ref)).size, offres.length);
});

test("catalogue : tous les slugs de familles existent (dont langue-chinoise, medecine-sante)", () => {
  const slugs = new Set(catalogue.familles.map((f) => f.slug));
  assert.ok(slugs.has("langue-chinoise") && slugs.has("medecine-sante"));
  for (const o of offres) for (const s of [...o.familles, ...o.filieres.map((f) => f.famille)]) assert.ok(slugs.has(s), `${o.ref} : ${s}`);
});

test("internes : une entrée par offre du catalogue", () => {
  const refs = new Set((internes as unknown as { offres: { ref: string }[] }).offres.map((o) => o.ref));
  for (const o of offres) assert.ok(refs.has(o.ref), o.ref);
});

test("L-14 n'est pas publiable", () => {
  assert.equal(offres.find((o) => o.ref === "L-14")?.publiable, false);
});

test("tarifs : Bachelor 2 900 000 FCFA, 1er versement 200 000 FCFA", () => {
  assert.equal(tarifOf("bachelor")?.prix, 2_900_000);
  assert.equal(firstInstallment("bachelor"), 200_000);
  assert.equal(formatFcfa(2_900_000), "2 900 000");
});

test("tarifs : MBBS au même tarif que le Bachelor (19/11/2026)", () => {
  assert.equal(isSurDevis("mbbs"), false);
  assert.equal(tarifOf("mbbs")!.prix, tarifOf("bachelor")!.prix);
  assert.deepEqual(tarifOf("mbbs")!.versements, tarifOf("bachelor")!.versements);
  assert.equal(firstInstallment("mbbs"), 200_000);
});

test("tarifs : test d'anglais en option, pas dans le « non inclus »", () => {
  assert.ok(!TARIFS.non_inclus.some((x) => /test d'anglais/i.test(x)));
  assert.ok(TARIFS.options?.some((x) => /test d'anglais/i.test(x)));
});

test("tarifs : les 4 versements font le prix total", () => {
  for (const [k, c] of Object.entries(TARIFS.cursus)) {
    if (c.sur_devis) continue;
    assert.equal(c.versements!.length, 4, k);
    assert.equal(c.versements!.reduce((a, b) => a + b, 0), c.prix, k);
  }
});

test("tarifs : mêmes totaux que les pages /cursus (programs.ts)", () => {
  const map = { "langue-chinoise": "langue", bachelor: "bachelor", master: "master", doctorat: "phd" } as const;
  for (const p of PROGRAMS) assert.equal(p.price, TARIFS.cursus[map[p.slug]].prix, p.slug);
});
