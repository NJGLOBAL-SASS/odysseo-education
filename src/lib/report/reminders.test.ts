import { test } from "node:test";
import assert from "node:assert/strict";

import { daysLeft, fillTemplate, isDueToday, localDayKey, planReminders, postponedDate, reminderMessage, reminderTemplateKey, waNumber, withReportLink } from "./reminders";
import { reportBadge, reportStatus } from "./status";
import { checkOffers, needsRecheck, nearestDeadline, parseRefs } from "./offers-check";
import { pickSendTemplate, profileForClaude } from "./templates";

const at = (iso: string) => new Date(iso);
const keys = (r: { number: number; dueAt: Date }[]) => r.map((x) => `R${x.number}:${localDayKey(x.dueAt)}`);

test("calendrier J+1, J+3, J+6 à 8 h (Douala), dimanche décalé au lundi", () => {
  // Mercredi 18/11/2026 14:32 heure de Douala.
  const sent = at("2026-11-18T13:32:00Z");
  const r = planReminders(sent, sent);
  assert.deepEqual(keys(r), ["R1:2026-11-19", "R2:2026-11-21", "R3:2026-11-24"]);
  assert.equal(r[0].dueAt.toISOString(), "2026-11-19T07:00:00.000Z", "8 h à Douala = 7 h UTC");
  // Vendredi 20/11 : J+6 = jeudi 26, J+1 samedi 21, J+3 = lundi 23.
  assert.deepEqual(keys(planReminders(at("2026-11-20T10:00:00Z"), at("2026-11-20T10:00:00Z"))), ["R1:2026-11-21", "R2:2026-11-23", "R3:2026-11-26"]);
  // Samedi 21/11 : J+1 = dimanche 22 → lundi 23.
  assert.deepEqual(keys(planReminders(at("2026-11-21T10:00:00Z"), at("2026-11-21T10:00:00Z"))).slice(0, 1), ["R1:2026-11-23"]);
});

test("envoi tard le soir : le jour local compte (23 h 30 UTC = lendemain à Douala)", () => {
  const sent = at("2026-11-18T23:30:00Z"); // jeudi 19 à 0 h 30, Douala
  assert.deepEqual(keys(planReminders(sent, sent)).slice(0, 1), ["R1:2026-11-20"]);
});

test("rattrapage : relances passées regroupées en une seule R1 aujourd'hui, puis le calendrier continue", () => {
  const now = at("2026-11-19T09:00:00Z");
  // Envoyé il y a 4 jours (dimanche 15) : R1 (16) et R2 (18) passées, R3 (21) à venir.
  assert.deepEqual(keys(planReminders(at("2026-11-15T10:00:00Z"), now)), ["R1:2026-11-19", "R3:2026-11-21"]);
  // Envoyé il y a 10 jours : une seule R1 aujourd'hui.
  assert.deepEqual(keys(planReminders(at("2026-11-09T10:00:00Z"), now)), ["R1:2026-11-19"]);
  // Envoyé hier : R1 aujourd'hui, le reste suit.
  assert.deepEqual(keys(planReminders(at("2026-11-18T10:00:00Z"), now)), ["R1:2026-11-19", "R2:2026-11-21", "R3:2026-11-24"]);
});

test("reporter de 2 jours, à faire aujourd'hui, jours restants", () => {
  const now = at("2026-11-19T09:00:00Z"); // jeudi
  assert.equal(localDayKey(postponedDate(at("2026-11-19T07:00:00Z"), now)), "2026-11-21");
  assert.equal(localDayKey(postponedDate(at("2026-11-18T07:00:00Z"), at("2026-11-20T09:00:00Z"))), "2026-11-23", "samedi + 2 = lundi (dimanche sauté)");
  assert.equal(isDueToday(at("2026-11-19T07:00:00Z"), now), true);
  assert.equal(isDueToday(at("2026-11-18T07:00:00Z"), now), true, "en retard : toujours à faire");
  assert.equal(isDueToday(at("2026-11-20T07:00:00Z"), now), false);
  assert.equal(daysLeft(at("2026-11-25T13:00:00Z"), now), 6);
});

test("choix du message de relance", () => {
  assert.equal(reminderTemplateKey(1, { read: false, cas: "standard", parent: false }), "R1_non_lu");
  assert.equal(reminderTemplateKey(1, { read: true, cas: "mbbs", parent: true }), "R1_lu_parent");
  assert.equal(reminderTemplateKey(2, { read: false, cas: "moyenne_faible", parent: false }), "R2_moyenne_faible");
  assert.equal(reminderTemplateKey(2, { read: false, cas: "parcours_complet", parent: false }), "R2_mbbs");
  assert.equal(reminderTemplateKey(2, { read: false, cas: "master_phd", parent: false }), "R2_standard");
  assert.equal(reminderTemplateKey(3, { read: true, cas: "mbbs", parent: false }), "R3");
});

test("messages : variables, lien absent, vraie date limite plus proche", () => {
  const vars = { prenom: "Paul", lien_rapport: "https://x/rapport/abc", nb_offres: 3, premier_versement: "200 000" };
  const now = at("2026-11-24T09:00:00Z");
  const r3 = reminderMessage(3, { read: false, cas: "standard", parent: false, vars, validUntil: at("2026-11-25T13:00:00Z"), now });
  assert.match(r3, /expire demain \(25\/11\/2026\)/);
  assert.match(r3, /https:\/\/x\/rapport\/abc/);
  const r3dl = reminderMessage(3, { read: false, cas: "standard", parent: false, vars, validUntil: at("2026-11-30T13:00:00Z"), deadline: at("2026-11-28T00:00:00Z"), now });
  assert.match(r3dl, /expire le 28\/11\/2026/, "date limite d'université plus proche");
  const noLink = reminderMessage(1, { read: false, cas: "standard", parent: false, vars: { ...vars, lien_rapport: null }, validUntil: null, now });
  assert.doesNotMatch(noLink, /📄|\{lien_rapport\}/);
  assert.doesNotMatch(fillTemplate("Bonjour {prenom}, {inconnu}", { prenom: "A" }), /\{prenom\}/);
});

test("numéro WhatsApp : indicatif ajouté selon le pays, + / 00 / espaces retirés", () => {
  assert.equal(waNumber("+237 6 99 12 34 56", "Cameroun"), "237699123456");
  assert.equal(waNumber("00237699123456", "Cameroun"), "237699123456");
  assert.equal(waNumber("699123456", "Cameroun"), "237699123456");
  assert.equal(waNumber("077 12 34 56", "Gabon"), "24177123456");
  assert.equal(waNumber("237699123456", "Cameroun"), "237699123456", "indicatif déjà présent");
  assert.equal(waNumber("", "Cameroun"), null);
  assert.equal(waNumber("12", "Cameroun"), null);
  assert.equal(withReportLink("Bonjour", "https://l"), "Bonjour\n\n📄 Votre rapport : https://l");
  assert.equal(withReportLink("Voir https://l", "https://l"), "Voir https://l");
});

test("statut unique et badge de la liste", () => {
  assert.equal(reportStatus(null), null);
  assert.equal(reportStatus({ status: "valide" }), "a_valider", "valeur PACK-12");
  assert.equal(reportStatus({ publishedAt: new Date() }), "envoye", "rapport PACK-10");
  assert.equal(reportBadge({ status: null }).key, "nouveau");
  assert.equal(reportBadge({ status: "brouillon" }).key, "nouveau");
  assert.equal(reportBadge({ status: "a_valider", latest: { version: 1, sentAt: null } }).key, "pret");
  const sent = reportBadge({ status: "envoye", latest: { version: 1, sentAt: "2026-11-18T13:32:00Z" }, sent: { sentAt: "2026-11-18T13:32:00Z", sentByName: "Jiresse Kuate" } });
  assert.deepEqual(sent, { key: "envoye", date: "18/11", by: "Jiresse" });
  assert.equal(reportBadge({ status: "lu", latest: { version: 1, sentAt: "x" }, sent: { sentAt: "2026-11-18T13:32:00Z", readAt: "2026-11-18T19:00:00Z" } }).key, "lu");
  assert.deepEqual(reportBadge({ status: "envoye", latest: { version: 1, sentAt: "x" }, sent: { sentAt: "2026-11-18T13:32:00Z" }, lastReminder: 2 }), { key: "relance", n: 2, read: false });
  assert.deepEqual(reportBadge({ status: "envoye", latest: { version: 2, sentAt: null }, sent: { sentAt: "2026-11-18T13:32:00Z" } }), { key: "pret", version: 2 });
  assert.equal(reportBadge({ status: "oui_recu" }).key, "oui");
  assert.equal(reportBadge({ status: "sans_suite", stopReason: "injoignable" }).reason, "injoignable");
});

test("revérifier les offres", () => {
  const cat = new Map([
    ["B-01", { ref: "B-01", date_limite: "2026-12-30", statut: "active" }],
    ["B-02", { ref: "B-02", date_limite: "2026-11-28", statut: "active" }],
    ["B-03", { ref: "B-03", date_limite: "2027-03-30", statut: "quota_atteint" }],
    ["B-04", { ref: "B-04", date_limite: "2026-11-10", statut: "active" }],
  ]);
  const today = at("2026-11-19T09:00:00Z");
  const r = checkOffers([{ ref: "B-01" }, { ref: "B-02" }, { ref: "B-03" }, { ref: "B-04" }, { ref: "X-99" }], (ref) => cat.get(ref), today);
  assert.deepEqual(r.map((x) => x.state), ["ok", "soon", "closed", "closed", "unknown"]);
  assert.equal(needsRecheck(r), true);
  assert.equal(needsRecheck(r.slice(0, 1)), false);
  assert.equal(nearestDeadline(r, today)?.toISOString().slice(0, 10), "2026-11-28");
  assert.deepEqual(parseRefs("b-03, L-07 ; b-03 xx"), ["B-03", "L-07"]);
});

test("modèle d'envoi et profil pour Claude", () => {
  assert.equal(pickSendTemplate({ cas: "mbbs", service: "bachelor" }), "MSG-MBBS");
  assert.equal(pickSendTemplate({ cas: "standard", service: "langue-chinoise" }), "MSG-LANGUE");
  assert.equal(pickSendTemplate({ cas: "standard", service: "master" }), "MSG-MASTER-PHD");
  assert.equal(pickSendTemplate({ cas: "standard", service: "bachelor" }), "MSG-BACHELOR");
  assert.equal(pickSendTemplate({ update: true }), "MSG-MAJ");
  const txt = profileForClaude({
    code: "ODY-ABC123", createdAt: "2026-11-18T10:00:00Z", filledBy: "parent", fullName: "Paul Kamga", whatsapp: "+237699123456",
    country: "Cameroun", city: "Douala", age: 19, level: "Licence", intake: "Mars 2027", degree: "Bac C", average: "14/20",
    field: "Informatique", budget: "", scholarship: "Bourse partielle", comment: "",
  });
  assert.match(txt, /^Demande ODY-ABC123 · reçue le 18\/11\/2026\nRempli par : parent/);
  assert.match(txt, /Budget : —/);
});

test("PDF : texte enrichi, « Université *** » intact", async () => {
  const { parseRich } = await import("./pdf/rich");
  assert.deepEqual(parseRich("**Université *** · Pékin**"), [{ text: "Université *** · Pékin", bold: true }]);
  assert.deepEqual(parseRich("1 !!Notre choix!! ~~24 000~~"), [
    { text: "1 ", bold: false },
    { text: "Notre choix", bold: true, red: true },
    { text: " ", bold: false },
    { text: "24 000", bold: false, strike: true },
  ]);
});
