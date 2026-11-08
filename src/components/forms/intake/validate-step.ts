import { ageFrom } from "@/lib/validations/intake";
import { isAcceptablePhone } from "@/lib/phone";
import {
  DEGREE_FIELD_REQUIRED_INDEXES,
  ENGLISH_SCORE_RULES,
  MAX_DOMAINS,
  averageScaleMax,
  isScoredCertificate,
  isValidAverage,
  isValidEnglishScore,
  parseDecimal,
} from "@/lib/qualification";
import type { IntakeDraft, StepErrors } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Errors = "required" | "fullName" | "whatsapp" | "email" | "dateOfBirth" | "consent" | "domainsMax";
export type Messages = Record<Errors, string> & {
  average: (max: number) => string;
  englishScore: (p: { type: string; min: number; max: number; step: number }) => string;
};

/** Options de diplôme (libellés de la langue du formulaire), pour savoir si la filière est obligatoire. */
export function degreeIndex(degree: string, degreeOptions: string[]) {
  return degreeOptions.indexOf(degree);
}

/** Pas de certificat ni d'études en anglais : on garde la question « Parlez-vous anglais ? ». */
export function asksEnglishLevel(data: IntakeDraft) {
  return data.englishCertificate === "none";
}

function isMinor(data: IntakeDraft) {
  const age = ageFrom(data.dateOfBirth);
  return age !== null && age >= 0 && age < 18;
}

function needsGuardian(data: IntakeDraft) {
  return isMinor(data) || data.managedBy === "parent" || data.managedBy === "guardian";
}

export function validateStep(step: number, data: IntakeDraft, m: Messages, degreeOptions: string[] = []): StepErrors {
  const errors: StepErrors = {};
  const req = (cond: boolean, field: keyof IntakeDraft) => {
    if (!cond) errors[field] = m.required;
  };

  if (step === 0) {
    req(data.fullName.trim().length > 0, "fullName");
    if (data.fullName.trim() && data.fullName.trim().split(/\s+/).length < 2) {
      errors.fullName = m.fullName;
    }
    req(data.whatsapp.trim().length > 0, "whatsapp");
    if (data.whatsapp.trim() && !isAcceptablePhone(data.whatsapp)) {
      errors.whatsapp = m.whatsapp;
    }
    req(data.email.trim().length > 0, "email");
    if (data.email.trim() && !EMAIL_RE.test(data.email.trim())) {
      errors.email = m.email;
    }
    req(data.dateOfBirth.length > 0, "dateOfBirth");
    const age = ageFrom(data.dateOfBirth);
    if (data.dateOfBirth && (age === null || age < 12 || age > 65)) {
      errors.dateOfBirth = m.dateOfBirth;
    }
    req(data.country.length > 0, "country");
    req(data.city.trim().length > 0, "city");
    req(data.managedBy.length > 0, "managedBy");

    if (needsGuardian(data)) {
      req(data.guardianName.trim().length > 0, "guardianName");
      req(data.guardianLink.length > 0, "guardianLink");
      req(data.guardianWhatsapp.trim().length > 0, "guardianWhatsapp");
      if (data.guardianWhatsapp.trim() && !isAcceptablePhone(data.guardianWhatsapp)) {
        errors.guardianWhatsapp = m.whatsapp;
      }
    }
  }

  if (step === 1) {
    req(data.currentSituation.length > 0, "currentSituation");
    req(data.highestDegree.length > 0, "highestDegree");
    req(data.degreeYear.length > 0, "degreeYear");
    if (DEGREE_FIELD_REQUIRED_INDEXES.includes(degreeIndex(data.highestDegree, degreeOptions))) {
      req(data.degreeField.trim().length > 0, "degreeField");
    }
    req(data.averageScale.length > 0, "averageScale");
    if (data.averageScale && data.averageScale !== "unknown") {
      if (!isValidAverage(parseDecimal(data.averageValue), data.averageScale)) {
        errors.averageValue = m.average(averageScaleMax(data.averageScale) ?? 20);
      }
    }
    req(data.originalDiplomas.length > 0, "originalDiplomas");
  }

  if (step === 2) {
    req(data.targetLevel.length > 0, "targetLevel");
    req(data.domains.length > 0, "domains");
    if (data.domains.length > MAX_DOMAINS) errors.domains = m.domainsMax;
    if (data.domains.includes("autre")) req(data.fieldOther.trim().length > 0, "fieldOther");
    req(data.passportStatus.length > 0, "passportStatus");
    req(data.englishCertificate.length > 0, "englishCertificate");
    if (isScoredCertificate(data.englishCertificate)) {
      const rule = ENGLISH_SCORE_RULES[data.englishCertificate];
      if (!isValidEnglishScore(data.englishCertificate, parseDecimal(data.englishScore))) {
        errors.englishScore = m.englishScore({ type: data.englishCertificate, ...rule });
      }
    }
    if (asksEnglishLevel(data)) req(data.englishLevel.length > 0, "englishLevel");
    req(data.hsk.length > 0, "hsk");
    req(data.bankStatement.length > 0, "bankStatement");
    req(data.fundingPlan.length > 0, "fundingPlan");
    req(data.targetIntake.length > 0, "targetIntake");
  }

  if (step === 3) {
    req(data.referred.length > 0, "referred");
    if (data.referred === "yes") {
      req(data.partnerDeclared.trim().length > 0, "partnerDeclared");
    }
    if (!data.consentGiven) errors.consentGiven = m.consent;
  }

  return errors;
}
