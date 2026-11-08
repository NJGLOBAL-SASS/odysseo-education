import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ALL_COUNTRIES, PRIORITY_COUNTRY_CODES, countryByCode, countryByValue, countryLabel, dialCodeFor } from "./countries";
import { formatNational, isAcceptablePhone, phoneExample, splitPhone, toInternational } from "./phone";

test("liste des pays : complète, noms existants conservés, nationalités du catalogue présentes", () => {
  assert.ok(ALL_COUNTRIES.length >= 240);
  for (const name of ["Cameroun", "Gabon", "Tchad", "Côte d'Ivoire", "Sénégal", "Mali", "Guinée", "Congo", "RD Congo", "Bénin", "Togo", "Burkina Faso", "Centrafrique"]) {
    assert.ok(countryByValue(name), name);
  }
  const catalogue = JSON.parse(readFileSync("data/offres/offres_2027.json", "utf8"));
  const excluded = new Set<string>(catalogue.offres.flatMap((o: { criteres: { nationalites_exclues?: string[] } }) => o.criteres.nationalites_exclues ?? []));
  for (const n of excluded) assert.equal(countryByValue(n)?.fr, n, `nationalité du catalogue : ${n}`);
  for (const code of PRIORITY_COUNTRY_CODES) assert.ok(countryByCode(code), code);
  assert.equal(new Set(ALL_COUNTRIES.map((c) => c.fr)).size, ALL_COUNTRIES.length, "noms FR uniques");
  assert.equal(dialCodeFor("Cameroun"), "+237");
  assert.equal(countryLabel("Cameroun", "en"), "Cameroon");
  assert.equal(countryLabel("Autre", "en"), "Other");
});

test("téléphone : format de l'indicatif, valeur internationale, contrôle de longueur", () => {
  assert.equal(formatNational("CM", "699123456"), "6 99 12 34 56");
  assert.equal(toInternational("CM", "699123456"), "+237699123456");
  assert.equal(toInternational("FR", "0612345678"), "+33612345678", "0 initial retiré");
  assert.equal(isAcceptablePhone("+237699123456"), true);
  assert.equal(isAcceptablePhone("+23769912345"), false, "8 chiffres au Cameroun");
  assert.equal(isAcceptablePhone("+2250707123456"), true);
  assert.equal(isAcceptablePhone("+221771234567"), true);
  assert.equal(isAcceptablePhone("+12"), false);
  assert.ok(phoneExample("CM").length > 0);
});

test("téléphone : relecture d'une valeur enregistrée ou d'un ancien brouillon", () => {
  assert.deepEqual(splitPhone("+237699123456"), { code: "CM", digits: "699123456" });
  assert.deepEqual(splitPhone("+237 6 99 12"), { code: "CM", digits: "69912" });
  assert.deepEqual(splitPhone("0033612345678"), { code: "FR", digits: "612345678" });
  assert.equal(splitPhone("+14165551234", "CA").code, "CA", "+1 : le pays choisi l'emporte");
  assert.deepEqual(splitPhone("", "SN"), { code: "SN", digits: "" });
});
