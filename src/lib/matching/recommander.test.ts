import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { exclusions, recommander } from "./recommander";
import { profilDepuisCandidature } from "./profil";
import { toPublicRecommendation, translateOfferText } from "./public-offer";
import type { MatchingProfile, Offer, OfferCatalogue } from "./types";

const catalogue = JSON.parse(readFileSync("data/offres/offres_2027.json", "utf8")) as OfferCatalogue;
const fixtures = JSON.parse(readFileSync("_ameliorations/PACK-02/fixtures_profils.json", "utf8")) as {
  profils: { id: string; profil: MatchingProfile; attendu_refs: string[]; attendu_detail: unknown[] }[];
};

for (const f of fixtures.profils) {
  test(`fixture ${f.id} : exactement ${f.attendu_refs.join(", ")}`, () => {
    const res = recommander(catalogue.offres, f.profil);
    assert.deepEqual(res.map((r) => r.ref), f.attendu_refs);
    assert.deepEqual(res, f.attendu_detail, "rôles, villes, totaux et filières identiques au script Python");
  });
}

// Offre fictive pour tester chaque exclusion isolément.
const base: Offer = {
  ...catalogue.offres.find((o) => o.ref === "MA-26")!,
  criteres: {},
};
const profil: MatchingProfile = {
  cycle: "master", domaines: ["ingenierie"], filiere_libre: "", age: 25, moyenne_pct: 70,
  anglais: { type: "ielts", score: 6.5 }, hsk: 0, releve_bancaire_usd_max: 5000,
  diplomes_originaux: true, nationalite: "Cameroun", financement: "bourse_uniquement", eligible_omm: false,
};
const why = (criteres: Offer["criteres"], over: Partial<MatchingProfile> = {}) =>
  exclusions({ ...base, criteres }, { ...profil, ...over });

test("exclusions : âge, moyenne, IELTS, HSK, relevé bancaire, nationalité, OMM, diplômes originaux", () => {
  assert.deepEqual(why({}), []);
  assert.deepEqual(why({ age_max: 24 }), ["age"]);
  assert.deepEqual(why({ age_max: 25 }), [], "âge égal à age_max accepté");
  assert.deepEqual(why({ moyenne_min_pct: 75 }), ["moyenne"]);
  assert.deepEqual(why({ ielts_min: 7 }), ["anglais"]);
  assert.deepEqual(why({ ielts_min: 6.5 }), []);
  assert.deepEqual(why({ ielts_min: 6 }, { anglais: { type: "aucun" } }), ["certificat_anglais"]);
  assert.deepEqual(why({ ielts_min: 6, certificat_anglais_obligatoire: false }, { anglais: { type: "etudes_en_anglais" } }), []);
  assert.deepEqual(why({ toefl_min: 90 }, { anglais: { type: "toefl", score: 85 } }), ["anglais"]);
  assert.deepEqual(why({ hsk_min: 4 }), ["hsk"]);
  assert.deepEqual(why({ hsk_min: 4 }, { hsk: 5 }), []);
  assert.deepEqual(why({ releve_bancaire_usd: 10000 }), ["releve_bancaire"]);
  assert.deepEqual(why({ releve_bancaire_usd: 10000 }, { releve_bancaire_usd_max: null }), [], "relevé inconnu : pas d'exclusion");
  assert.deepEqual(why({ nationalites_exclues: ["Cameroun"] }), ["nationalite"]);
  assert.deepEqual(why({ eligibilite_omm_requise: true }), ["omm"]);
  assert.deepEqual(why({ diplomes_originaux: true }, { diplomes_originaux: false }), ["diplomes_originaux"]);
});

test("les offres non publiables (en vérification) ne sont jamais proposées", () => {
  const hidden = new Set(catalogue.offres.filter((o) => !o.publiable).map((o) => o.ref));
  assert.ok(hidden.size > 0);
  for (const f of fixtures.profils) {
    for (const r of recommander(catalogue.offres, f.profil)) assert.ok(!hidden.has(r.ref), r.ref);
  }
});

const dossier = {
  targetLevel: "master", studyFields: ["ingenierie"], degreeField: "Civil Engineering", age: 25,
  averagePct: 70, englishCertificate: "ielts", englishScore: 6.5, hskLevel: 0, bankStatementUsdMax: 5000,
  originalDiplomas: true, country: "Cameroun", fundingPlan: "scholarshipOnly",
};

test("profilDepuisCandidature : le dossier P1 donne MA-26, MA-17, MA-10 (ambitieuse, cible, sécurité)", () => {
  const p = profilDepuisCandidature(dossier)!;
  assert.deepEqual(p, { ...fixtures.profils[0].profil, eligible_omm: false });
  const res = recommander(catalogue.offres, p);
  assert.deepEqual(res.map((r) => [r.ref, r.role]), [["MA-26", "ambitieuse"], ["MA-17", "cible"], ["MA-10", "securite"]]);
});

test("profilDepuisCandidature : Langue et Licence → pas de recommandation ; Doctorat → phd", () => {
  assert.equal(profilDepuisCandidature({ ...dossier, targetLevel: "licence" }), null);
  assert.equal(profilDepuisCandidature({ ...dossier, targetLevel: "language" }), null);
  assert.equal(profilDepuisCandidature({ ...dossier, targetLevel: "doctorat" })!.cycle, "phd");
  const p = profilDepuisCandidature({ ...dossier, englishCertificate: "studiedInEnglish", englishScore: null, fundingPlan: "familyPart" })!;
  assert.deepEqual(p.anglais, { type: "etudes_en_anglais" });
  assert.equal(p.financement, "partiel");
  assert.deepEqual(profilDepuisCandidature({ ...dossier, englishCertificate: "none" })!.anglais, { type: "aucun" });
});

test("projection publique : aucun score, critère, statut ni nom d'université", () => {
  const res = recommander(catalogue.offres, fixtures.profils[0].profil);
  for (const locale of ["fr", "en"]) {
    const pub = res.map((r) => toPublicRecommendation(catalogue.offres.find((o) => o.ref === r.ref)!, r, locale));
    assert.deepEqual(Object.keys(pub[0]).sort(), [
      "arguments", "cycle", "date_limite", "duree", "filieres_correspondantes", "langue", "lieu_affiche", "ref", "role",
    ]);
    const json = JSON.stringify(pub);
    for (const forbidden of ["University", "RK", "bronze", "argent", "\"or\"", "criteres", "statut", "score"]) {
      assert.ok(!json.includes(forbidden), `${forbidden} dans ${json}`);
    }
  }
});

test("traduction anglaise des textes du catalogue", () => {
  assert.equal(translateOfferText("Frais de scolarité offerts"), "Tuition fees covered");
  assert.equal(translateOfferText("Allocation : jusqu'à 3 500 RMB/mois"), "Allowance: up to 3 500 RMB/month");
  assert.equal(translateOfferText("Chinois (HSK 5 exigé)"), "Chinese (HSK 5 required)");
  assert.equal(translateOfferText("3 ans"), "3 years");
  const french = /offert|mois|jusqu|Allocation|Logement|Scolarit|Bourse|ensuite|exigé|Anglais|Chinois|\bans\b|\bou\b|\bet\b/;
  const left = catalogue.offres.flatMap((o) => [...o.arguments, o.langue, o.duree ?? ""]).map(translateOfferText).filter((s) => french.test(s));
  assert.deepEqual(left, [], "textes restés en français");
});
