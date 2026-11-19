import { test } from "node:test";
import assert from "node:assert/strict";

import { joinFr, missingInfo } from "./missing-info";
import { pickExamples } from "./examples";
import { fewOffers, prefilterOffers, publicOfferForAI } from "./prefilter";
import type { Offer } from "@/lib/matching/types";

const complete = { highestDegree: "Bac / GCE A Level", degreeField: "C", averagePct: 82, degreeAverage: "16,5/20", age: 19, fieldOfStudy: "Informatique", studyFields: ["informatique"] };

test("profil incomplet (PACK-13 §3.6, test 7)", () => {
  assert.deepEqual(missingInfo(complete), []);
  assert.deepEqual(missingInfo({ ...complete, averagePct: null, degreeAverage: "" }), ["votre moyenne (dernier relevé de notes ou bulletin)"]);
  assert.deepEqual(missingInfo({ ...complete, degreeField: "" }), ["la série de votre bac"]);
  assert.deepEqual(missingInfo({ ...complete, highestDegree: "Licence", degreeField: null }), [], "série demandée seulement pour le bac");
  assert.equal(missingInfo({ ...complete, fieldOfStudy: "", studyFields: [], age: null }).length, 2);
  assert.equal(joinFr(["a", "b", "c"]), "a, b et c");
});

test("choix des exemples (PACK-13 §2.1)", () => {
  const base = { targetLevel: "licence", medecine: false, averagePct: 80, rentreeNonOuverte: false, highestDegree: "Bac", lettres: false, langueAvecBourseSeulement: false };
  assert.deepEqual(pickExamples({ ...base, medecine: true }), ["01", "02"]);
  assert.deepEqual(pickExamples({ ...base, averagePct: 55 }), ["04", "09"]);
  assert.deepEqual(pickExamples({ ...base, rentreeNonOuverte: true }), ["10", "03"]);
  assert.deepEqual(pickExamples({ ...base, rentreeNonOuverte: true, averagePct: 65 }), ["11", "03"]);
  assert.deepEqual(pickExamples({ ...base, targetLevel: "doctorat", highestDegree: "Licence" }), ["05", "08"]);
  assert.deepEqual(pickExamples({ ...base, targetLevel: "master", lettres: true }), ["06", "08"]);
  assert.deepEqual(pickExamples({ ...base, targetLevel: "language", langueAvecBourseSeulement: true }), ["06", "03"]);
});

const offer = (o: Partial<Offer>): Offer =>
  ({
    ref: "X-01", cycle: "bachelor", ville: "V", province: "P", nom_public: "Université ***", lieu_affiche: "V (P)", rentree: "mars 2027",
    date_limite: "2027-01-30", langue: "anglais", duree: null, bourse_texte: null, allocation_texte: null, logement_texte: null, conditions_texte: null,
    arguments: [], allocation_min_rmb_mois: 0, allocation_max_rmb_mois: 0, logement_resume: null, scolarite_offerte_garantie: false, score: "argent",
    potentiel_or: false, familles: ["informatique"], filieres: [], criteres: {}, statut: "active", publiable: true, ...o,
  }) as Offer;

test("pré-filtre (PACK-13 §3.1)", () => {
  const today = new Date("2026-11-19T09:00:00Z");
  const offers = [
    offer({ ref: "B-01" }),
    offer({ ref: "B-02", statut: "quota_atteint" }),
    offer({ ref: "B-03", date_limite: "2026-11-01" }),
    offer({ ref: "B-04", date_limite: null }),
    offer({ ref: "B-05", criteres: { age_max: 18 } }),
    offer({ ref: "B-06", familles: ["commerce"] }),
    offer({ ref: "B-07", familles: ["ingenierie"] }),
    offer({ ref: "MB-01", cycle: "mbbs", familles: [] }),
    offer({ ref: "L-01", cycle: "langue", familles: [] }),
    offer({ ref: "MA-01", cycle: "master" }),
  ];
  const lic = prefilterOffers(offers, { cycle: "bachelor", age: 19, familles: ["informatique"], motsCles: [] }, today).map((o) => o.ref);
  assert.deepEqual(lic, ["B-01", "B-04"], "statut, date passée, âge, filière ; « à confirmer » incluse");
  const mbbs = prefilterOffers(offers, { cycle: "mbbs", age: 19, familles: ["medecine"], motsCles: [] }, today).map((o) => o.ref);
  assert.deepEqual(mbbs, ["B-01", "B-04", "B-07", "MB-01", "L-01"], "MB + L + B sciences / ingénierie");
  assert.equal(fewOffers(lic), true);
  const pub = publicOfferForAI(offers[0]);
  assert.equal(pub.universite, "Université *** · V (P)");
  assert.equal("criteres" in pub || "statut" in pub, false, "aucun critère interne ni statut envoyé");
});
