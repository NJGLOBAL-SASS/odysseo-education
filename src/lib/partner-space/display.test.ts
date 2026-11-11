import assert from "node:assert/strict";
import { test } from "node:test";

import { shortName, stageIndex } from "./display";

test("shortName : prénom + initiale, quel que soit l'ordre de saisie", () => {
  assert.equal(shortName("Ngono Aïcha"), "Aïcha N.");
  assert.equal(shortName("NGONO Aïcha"), "Aïcha N.");
  assert.equal(shortName("Moussa"), "Moussa");
});

test("stageIndex : étapes de la frise et états parallèles", () => {
  assert.equal(stageIndex("recu"), 0);
  assert.equal(stageIndex("arrive"), 10);
  assert.equal(stageIndex("clos"), -1);
});
