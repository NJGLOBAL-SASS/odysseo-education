import { test } from "node:test";
import assert from "node:assert/strict";

import { isLinkButton, normalizeLinkSource } from "./config";

test("normalizeLinkSource : direct par défaut, autre si inconnu", () => {
  assert.equal(normalizeLinkSource(null), "direct");
  assert.equal(normalizeLinkSource(""), "direct");
  assert.equal(normalizeLinkSource("TikTok"), "tiktok");
  assert.equal(normalizeLinkSource("facebook"), "facebook");
  assert.equal(normalizeLinkSource("instagram"), "autre");
});

test("isLinkButton n'accepte que les 5 boutons", () => {
  assert.ok(isLinkButton("analyse"));
  assert.ok(isLinkButton("partenaire"));
  assert.ok(!isLinkButton("autre"));
  assert.ok(!isLinkButton(3));
});
