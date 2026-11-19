import assert from "node:assert/strict";
import { test } from "node:test";

import { shortName, stageIndex } from "./display";
import { STAGES } from "@/lib/tracking-stages";

test("shortName : prénom + initiale, quel que soit l'ordre de saisie", () => {
  assert.equal(shortName("Ngono Aïcha"), "Aïcha N.");
  assert.equal(shortName("NGONO Aïcha"), "Aïcha N.");
  assert.equal(shortName("Moussa"), "Moussa");
});

test("stageIndex : étapes de la frise et états parallèles", () => {
  assert.equal(stageIndex("recu"), 0);
  assert.equal(stageIndex("arrive"), STAGES.length - 1, "dernière étape de la frise (PACK-12 : 13 étapes)");
  assert.equal(stageIndex("valide_attente_paiement"), stageIndex("accord"), "étape retirée = son équivalent");
  assert.equal(stageIndex("clos"), -1);
});
