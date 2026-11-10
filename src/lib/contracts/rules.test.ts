import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import cfg from "../../../config/contrat_partenaire.config.json";
import { PROGRAMS } from "../programs";
import { commission, commissionTable, fillTemplate, maskEmail, maskPhone, parseContract, sameName, type ContractConfig } from "./rules";

const config = cfg as unknown as ContractConfig;

test("commissions : Master palier Argent = 510 000 FCFA, arrondi au millier", () => {
  assert.equal(commission(3_400_000, 0.15), 510_000);
  const table = commissionTable(config);
  const master = table.rows.find((r) => r.service === "Master")!;
  assert.deepEqual(master.amounts, [340_000, 510_000, 680_000]);
  assert.equal(table.rows.length, 4);
});

test("prix du contrat alignés sur les cursus du site", () => {
  const bySlug = Object.fromEntries(PROGRAMS.map((p) => [p.slug, p.price]));
  assert.equal(config.prix_services.langue, bySlug["langue-chinoise"]);
  assert.equal(config.prix_services.bachelor, bySlug.bachelor);
  assert.equal(config.prix_services.master, bySlug.master);
  assert.equal(config.prix_services.phd, bySlug.doctorat);
});

test("destination masquée", () => {
  assert.equal(maskEmail("jean.dupont@gmail.com"), "j***@gmail.com");
  assert.equal(maskPhone("+237699124512"), "+237 6** ** 45 12");
});

test("nom saisi : sans majuscules, accents ni ordre", () => {
  assert.ok(sameName("Aïcha KAMGA", "kamga aicha"));
  assert.ok(!sameName("Aïcha KAMGA", "Paul KAMGA"));
  assert.ok(!sameName("", ""));
});

test("modèle : tous les champs remplis, blocs spéciaux reconnus", () => {
  const md = readFileSync(new URL("../../../content/contrats/contrat_partenaire_v1.fr.md", import.meta.url), "utf8");
  const keys = [...new Set([...md.replace(/<!--[\s\S]*?-->/g, "").matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];
  const filled = fillTemplate(md, Object.fromEntries(keys.map((k) => [k, `«${k}»`])));
  assert.equal(/\{\{(?!tableau_commissions|bloc_signatures)/.test(filled), false);
  const blocks = parseContract(filled);
  assert.ok(blocks.some((b) => b.type === "commissions"));
  assert.ok(blocks.some((b) => b.type === "signatures"));
  assert.ok(blocks.some((b) => b.type === "ol"));
  assert.equal(blocks.filter((b) => b.type === "h1").length, 1);
});
