import { test } from "node:test";
import assert from "node:assert/strict";

import {
  averageToPct,
  bankStatementUsdMax,
  hskToInt,
  isValidEnglishScore,
  parseDecimal,
} from "./qualification";
import { intakeSchema } from "./validations/intake";
import { validateStep, type Messages } from "@/components/forms/intake/validate-step";
import { emptyDraft, type IntakeDraft } from "@/components/forms/intake/types";
import fr from "@/i18n/messages/fr.json";

test("moyenne_pct : « 13,5 » sur /20 → 67.5, et les autres barèmes", () => {
  assert.equal(averageToPct(parseDecimal("13,5"), "20"), 67.5);
  assert.equal(averageToPct(parseDecimal("3.2"), "4"), 80);
  assert.equal(averageToPct(parseDecimal("4"), "5"), 80);
  assert.equal(averageToPct(parseDecimal("72"), "100"), 72);
  assert.equal(averageToPct(parseDecimal("14"), "unknown"), null);
  assert.equal(averageToPct(parseDecimal("21"), "20"), null, "hors barème");
  assert.equal(parseDecimal("abc"), null);
});

test("scores d'anglais : IELTS 6,5 accepté, 10 et 6,3 refusés ; TOEFL et Duolingo bornés", () => {
  assert.equal(isValidEnglishScore("ielts", parseDecimal("6,5")), true);
  assert.equal(isValidEnglishScore("ielts", 10), false);
  assert.equal(isValidEnglishScore("ielts", 6.3), false);
  assert.equal(isValidEnglishScore("ielts", null), false);
  assert.equal(isValidEnglishScore("toefl", 120), true);
  assert.equal(isValidEnglishScore("toefl", 121), false);
  assert.equal(isValidEnglishScore("duolingo", 9), false);
  assert.equal(isValidEnglishScore("duolingo", 110), true);
});

test("HSK et relevé bancaire", () => {
  assert.equal(hskToInt("2"), 2);
  assert.equal(hskToInt("0"), 0);
  assert.equal(hskToInt("7"), null);
  assert.deepEqual(
    ["lt2500", "2500-5000", "5000-10000", "gt10000", "unknown"].map(bankStatementUsdMax),
    [0, 2500, 5000, 10000, null],
  );
});

const messages: Messages = {
  required: "required",
  fullName: "fullName",
  whatsapp: "whatsapp",
  email: "email",
  dateOfBirth: "dateOfBirth",
  consent: "consent",
  domainsMax: "domainsMax",
  average: (max) => `average/${max}`,
  englishScore: ({ type }) => `englishScore:${type}`,
};
const degrees = fr.intake.fields.degree.options;

const step2 = (over: Partial<IntakeDraft>) =>
  validateStep(1, { ...emptyDraft, currentSituation: "student", highestDegree: degrees[3], degreeYear: "2024", averageScale: "20", averageValue: "13,5", originalDiplomas: "yes", degreeField: "Génie civil", ...over }, messages, degrees);

test("étape 2 : filière obligatoire pour Licence / Master, jamais pour Bac / Probatoire", () => {
  assert.deepEqual(step2({}), {});
  assert.equal(step2({ degreeField: "" }).degreeField, "required");
  assert.equal(step2({ highestDegree: degrees[4], degreeField: "" }).degreeField, "required");
  assert.equal(step2({ highestDegree: degrees[1], degreeField: "" }).degreeField, undefined);
  assert.equal(step2({ highestDegree: degrees[0], degreeField: "" }).degreeField, undefined);
  assert.equal(step2({ averageValue: "25" }).averageValue, "average/20");
  assert.equal(step2({ averageScale: "unknown", averageValue: "" }).averageValue, undefined);
});

const step3 = (over: Partial<IntakeDraft>) =>
  validateStep(2, { ...emptyDraft, targetLevel: "master", domains: ["ingenierie"], passportStatus: "valid", englishCertificate: "ielts", englishScore: "6,5", hsk: "0", bankStatement: "2500-5000", fundingPlan: "scholarshipOnly", targetIntake: "september", ...over }, messages, degrees);

test("étape 3 : IELTS sans score bloque, 6,5 passe, 10 est refusé ; 2 domaines maximum", () => {
  assert.deepEqual(step3({}), {});
  assert.equal(step3({ englishScore: "" }).englishScore, "englishScore:ielts");
  assert.equal(step3({ englishScore: "10" }).englishScore, "englishScore:ielts");
  assert.equal(step3({ englishCertificate: "none" }).englishLevel, "required", "niveau demandé sans certificat");
  assert.equal(step3({ englishCertificate: "studiedInEnglish", englishScore: "" }).englishLevel, undefined);
  assert.equal(step3({ domains: ["ingenierie", "sciences", "commerce"] }).domains, "domainsMax");
  assert.equal(step3({ domains: ["autre"] }).fieldOther, "required");
});

test("API : le schéma serveur accepte un dossier complet et refuse un IELTS hors bornes", () => {
  const base = {
    fullName: "Paul Kamga", whatsapp: "+237600000000", email: "paul@example.com", dateOfBirth: "2000-01-01",
    country: "CM", city: "Douala", managedBy: "self", currentSituation: "student", highestDegree: degrees[3],
    degreeYear: "2024", degreeField: "Génie civil", averageValue: "13,5", averageScale: "20", originalDiplomas: "yes",
    targetLevel: "master", domains: ["ingenierie"], passportStatus: "valid", englishCertificate: "ielts",
    englishScore: "6,5", hsk: "0", bankStatement: "5000-10000", fundingPlan: "scholarshipOnly", targetIntake: "september",
    referred: "no", consentGiven: true, submissionDurationSec: 60,
  };
  assert.equal(intakeSchema.safeParse(base).success, true);
  assert.equal(intakeSchema.safeParse({ ...base, englishScore: "10" }).success, false);
  assert.equal(intakeSchema.safeParse({ ...base, domains: ["a", "b"] }).success, false);
  assert.equal(intakeSchema.safeParse({ ...base, englishCertificate: "none" }).success, false, "niveau d'anglais requis");
});
