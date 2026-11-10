import { test } from "node:test";
import assert from "node:assert/strict";

import { generateChecklist, passportTooShort, progressOf } from "./checklist";
import { sniffFileType } from "./file-type";

test("checklist Master avec MA-21 : vidéo ajoutée, relevé bancaire obligatoire", () => {
  const list = generateChecklist("master", ["MA-21", "MA-05"]);
  const video = list.find((d) => d.key === "video_presentation");
  assert.ok(video, "vidéo de présentation présente");
  assert.equal(video!.maxMb, 100);
  assert.deepEqual(video!.formats, ["mp4", "mov"]);
  const bank = list.find((d) => d.key === "releve_bancaire")!;
  assert.equal(bank.required, true);
  assert.match(bank.noteFr ?? "", /10 000 USD/);
});

test("checklist Master sans MA-21 : pas de vidéo, relevé bancaire facultatif", () => {
  const list = generateChecklist("master", ["MA-05"]);
  assert.equal(list.find((d) => d.key === "video_presentation"), undefined);
  assert.equal(list.find((d) => d.key === "releve_bancaire")!.required, false);
});

test("checklist : « maintenant » avant « plus tard », puis documents préparés, sans doublon", () => {
  const list = generateChecklist("doctorat", ["MA-20", "MA-22"]);
  const keys = list.map((d) => d.key);
  assert.equal(new Set(keys).size, keys.length);
  const firstLater = list.findIndex((d) => d.phase === "plus_tard");
  const lastNow = list.map((d) => d.kind !== "prepare" && d.phase === "maintenant").lastIndexOf(true);
  assert.ok(lastNow < firstLater);
  assert.ok(list.filter((d) => d.kind === "prepare").every((d) => d.key.startsWith("prep-")));
  assert.ok(keys.includes("prep-projet_recherche"));
  assert.equal(list.find((d) => d.key === "recommandants")!.kind, "formulaire");
});

test("passeport : moins de 6 mois après la rentrée de septembre 2027", () => {
  assert.equal(passportTooShort(new Date("2028-01-15")), true);
  assert.equal(passportTooShort(new Date("2028-03-02")), false);
});

test("progression : les documents préparés par Odysseo ne comptent pas", () => {
  assert.deepEqual(
    progressOf([
      { status: "valide", kind: "fichier", required: true },
      { status: "recu", kind: "fichier", required: true },
      { status: "valide", kind: "prepare", required: true },
    ]),
    { done: 1, total: 2 },
  );
});

test("signature : un .exe renommé en .pdf est reconnu", () => {
  assert.equal(sniffFileType(new Uint8Array([0x4d, 0x5a, 0x90, 0x00])), null);
  assert.equal(sniffFileType(new TextEncoder().encode("%PDF-1.7")), "pdf");
  assert.equal(sniffFileType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "jpg");
  assert.equal(sniffFileType(new Uint8Array([0, 0, 0, 0x18, ...new TextEncoder().encode("ftypheic")])), "heic");
});
