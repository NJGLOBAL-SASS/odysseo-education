import { test } from "node:test";
import assert from "node:assert/strict";

import { documentProgress, nextAction, paymentSchedule } from "./next-action";

const doc = (status: string, extra: Partial<{ phase: string; required: boolean; kind: string }> = {}) => ({
  status,
  phase: "maintenant",
  required: true,
  kind: "fichier",
  ...extra,
});
const report = (o: Partial<{ published: boolean; validatedCurrent: boolean; paymentReceived: boolean; documentsConsent: boolean }> = {}) => ({
  published: true,
  validatedCurrent: true,
  paymentReceived: true,
  documentsConsent: true,
  ...o,
});

test("prochaine action : une seule, dans l'ordre du parcours", () => {
  assert.equal(nextAction({ report: report({ validatedCurrent: false }), checklist: [], unreadMessages: 3 }).key, "validateReport");
  assert.equal(nextAction({ report: report({ paymentReceived: false }), checklist: [], unreadMessages: 0 }).key, "firstPayment");
  assert.equal(nextAction({ report: report(), checklist: [doc("a_fournir")], unreadMessages: 2 }).key, "readMessages");
  assert.equal(nextAction({ report: report({ documentsConsent: false }), checklist: [doc("a_fournir")], unreadMessages: 0 }).key, "documentsConsent");
  const send = nextAction({ report: report(), checklist: [doc("a_fournir"), doc("a_refaire"), doc("recu"), doc("a_fournir", { phase: "plus_tard" })], unreadMessages: 0 });
  assert.deepEqual([send.key, send.count], ["sendDocuments", 2]);
  const review = nextAction({ report: report(), checklist: [doc("valide"), doc("a_valider", { kind: "prepare" })], unreadMessages: 0 });
  assert.deepEqual([review.key, review.count], ["reviewPrepared", 1]);
  assert.equal(nextAction({ report: report(), checklist: [doc("valide")], unreadMessages: 0 }).key, "wait");
  assert.equal(nextAction({ report: null, checklist: [], unreadMessages: 0 }).key, "wait", "dossier avant rapport : rien à faire");
});

test("progression des documents : seulement les documents obligatoires attendus maintenant", () => {
  const p = documentProgress([doc("valide"), doc("recu"), doc("a_fournir"), doc("a_fournir", { required: false }), doc("valide", { kind: "prepare" })]);
  assert.deepEqual(p, { total: 3, received: 2, validated: 1 });
});

test("échéancier : une étape n'est réglée que si le montant enregistré la couvre entièrement", () => {
  const steps = [
    { label: "Ouverture", when: "signature", amount: 150_000 },
    { label: "Lancement", when: "dossier validé", amount: 450_000 },
    { label: "Admission", when: "JW202", amount: 600_000 },
  ];
  assert.deepEqual(paymentSchedule(steps, null).lines.map((l) => l.status), ["upcoming", "upcoming", "upcoming"]);
  const s = paymentSchedule(steps, 600_000);
  assert.deepEqual(s.lines.map((l) => l.status), ["paid", "paid", "upcoming"]);
  assert.deepEqual([s.total, s.paid, s.rest], [1_200_000, 600_000, 600_000]);
  assert.deepEqual(paymentSchedule(steps, 200_000).lines.map((l) => l.status), ["paid", "upcoming", "upcoming"], "paiement partiel : pas d'étape à moitié « réglée »");
});
