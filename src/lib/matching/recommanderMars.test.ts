import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import catalogueJson from "../../../data/offres/offres_2027.json";
import { aLeBac, famillesDepuisDomaines, marsCycleFor, profilMarsDepuisCandidature } from "./profil";
import { exclusionsMars, recommanderMars, type MarsProfile } from "./recommanderMars";
import type { Offer, OfferCatalogue } from "./types";

const catalogue = catalogueJson as unknown as OfferCatalogue;
const TODAY = "2026-11-14";

type Fixture = {
  profil: MarsProfile & { id: string };
  attendu_refs: string[];
  attendu_roles: string[];
  attendu_proposer_bachelor: string | null;
  attendu_repli_langue: boolean;
};
const fixtures = JSON.parse(readFileSync("_ameliorations/PACK-12/fixtures_mars.json", "utf8")) as { date_reference: string; fixtures: Fixture[] };

test("fixtures : date de référence 2026-11-14, 7 profils", () => {
  assert.equal(fixtures.date_reference, TODAY);
  assert.equal(fixtures.fixtures.length, 7);
});

for (const f of fixtures.fixtures) {
  test(`fixture ${f.profil.id} : références, rôles, proposer_bachelor, repli_langue identiques au Python`, () => {
    const r = recommanderMars(f.profil, catalogue.offres, TODAY);
    assert.deepEqual(r.recommandations.map((x) => x.ref), f.attendu_refs);
    assert.deepEqual(r.recommandations.map((x) => x.role), f.attendu_roles);
    assert.equal(r.proposer_bachelor, f.attendu_proposer_bachelor);
    assert.equal(r.repli_langue, f.attendu_repli_langue);
  });
}

// ── Exclusions (une par règle) ──
const base = catalogue.offres.find((o) => o.ref === "L-04")!;
const offer = (patch: Partial<Offer>): Offer => ({ ...base, ...patch, criteres: { ...base.criteres, ...(patch.criteres ?? {}) } });
const p = { age: 20, hsk: null };

test("exclusion : offre non publiable", () => {
  assert.deepEqual(exclusionsMars(offer({ publiable: false }), p, TODAY), ["publiable"]);
  assert.ok(!recommanderMars({ cycle_vise: "langue", age: 20, familles: [], hsk: null, a_le_bac: false, funding: null }, catalogue.offres, TODAY).recommandations.some((r) => r.ref === "L-14"));
});

test("exclusion : date limite dépassée (la veille exclue, le jour même accepté)", () => {
  assert.deepEqual(exclusionsMars(offer({ date_limite: "2026-11-13" }), p, TODAY), ["date_limite"]);
  assert.deepEqual(exclusionsMars(offer({ date_limite: TODAY }), p, TODAY), []);
});

test("exclusion : âge hors [age_min, age_max]", () => {
  assert.deepEqual(exclusionsMars(offer({ criteres: { age_min: 21 } }), p, TODAY), ["age"]);
  assert.deepEqual(exclusionsMars(offer({ criteres: { age_max: 19 } }), p, TODAY), ["age"]);
  assert.deepEqual(exclusionsMars(offer({ criteres: { age_min: 20, age_max: 20 } }), p, TODAY), []);
});

test("exclusion : HSK minimum non atteint", () => {
  assert.deepEqual(exclusionsMars(offer({ criteres: { hsk_min: 3 } }), { age: 20, hsk: 2 }, TODAY), ["hsk"]);
  assert.deepEqual(exclusionsMars(offer({ criteres: { hsk_min: 3 } }), { age: 20, hsk: 3 }, TODAY), []);
});

test("exclusion : offre réservée aux candidats asiatiques", () => {
  assert.deepEqual(exclusionsMars(offer({ criteres: { reserve_asie: true } }), p, TODAY), ["reserve_asie"]);
});

test("la date du jour est un paramètre : après la date limite de B-01, B-01 n'est plus proposée", () => {
  const prof: MarsProfile = { cycle_vise: "licence", age: 19, familles: ["informatique-ia-electronique-telecoms"], hsk: null, a_le_bac: true, funding: "bourse_uniquement" };
  assert.ok(recommanderMars(prof, catalogue.offres, TODAY).recommandations.some((r) => r.ref === "B-01"));
  assert.ok(!recommanderMars(prof, catalogue.offres, "2026-11-29").recommandations.some((r) => r.ref === "B-01"));
});

test("MBBS seulement si medecine-sante est choisi", () => {
  const prof: MarsProfile = { cycle_vise: "licence", age: 20, familles: [], hsk: null, a_le_bac: true, funding: "total" };
  assert.ok(!recommanderMars(prof, catalogue.offres, TODAY).recommandations.some((r) => r.ref.startsWith("MB-")));
});

// ── Formulaire → profil ──
test("formulaire → profil : Langue, Licence ; Master / Doctorat → moteur PACK-02", () => {
  assert.equal(marsCycleFor("language"), "langue");
  assert.equal(marsCycleFor("licence"), "licence");
  assert.equal(marsCycleFor("master"), null);
  assert.equal(marsCycleFor("doctorat"), null);
});

test("formulaire → profil : bac ou plus", () => {
  assert.equal(aLeBac("Bac / GCE A Level"), true);
  assert.equal(aLeBac("Licence"), true);
  assert.equal(aLeBac("Master's"), true);
  assert.equal(aLeBac("Probatoire / GCE O Level"), false);
  assert.equal(aLeBac("Autre : CAP"), false);
  assert.equal(aLeBac(null), false);
});

test("formulaire → profil : médecine → medecine-sante", () => {
  assert.ok(famillesDepuisDomaines(["medecine"]).includes("medecine-sante"));
});

test("critère d'acceptation : Licence, 19 ans, informatique, bourse uniquement → B-01, B-05, B-07, B-04", () => {
  const prof = profilMarsDepuisCandidature({
    targetLevel: "licence",
    studyFields: ["informatique"],
    age: 19,
    hskLevel: null,
    fundingPlan: "scholarshipOnly",
    highestDegree: "Bac / GCE A Level",
  })!;
  assert.deepEqual(prof, { cycle_vise: "licence", age: 19, familles: ["informatique-ia-electronique-telecoms"], hsk: null, a_le_bac: true, funding: "bourse_uniquement" });
  assert.deepEqual(recommanderMars(prof, catalogue.offres, TODAY).recommandations.map((r) => r.ref), ["B-01", "B-05", "B-07", "B-04"]);
});
