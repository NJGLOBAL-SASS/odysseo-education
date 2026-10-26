import { normalizePhone, ageFrom } from "@/lib/validations/intake";
import type { IntakeDraft, StepErrors } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Errors = "required" | "fullName" | "whatsapp" | "email" | "dateOfBirth" | "consent";
type Messages = Record<Errors, string>;

function isMinor(data: IntakeDraft) {
  const age = ageFrom(data.dateOfBirth);
  return age !== null && age >= 0 && age < 18;
}

function needsGuardian(data: IntakeDraft) {
  return isMinor(data) || data.managedBy === "parent" || data.managedBy === "guardian";
}

export function validateStep(step: number, data: IntakeDraft, m: Messages): StepErrors {
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
    if (data.whatsapp.trim() && !/^\+\d{9,15}$/.test(normalizePhone(data.whatsapp))) {
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
      if (
        data.guardianWhatsapp.trim() &&
        !/^\+\d{9,15}$/.test(normalizePhone(data.guardianWhatsapp))
      ) {
        errors.guardianWhatsapp = m.whatsapp;
      }
    }
  }

  if (step === 1) {
    req(data.currentSituation.length > 0, "currentSituation");
    req(data.highestDegree.length > 0, "highestDegree");
    req(data.degreeYear.length > 0, "degreeYear");
    req(data.degreeAverage.trim().length > 0, "degreeAverage");
  }

  if (step === 2) {
    req(data.targetLevel.length > 0, "targetLevel");
    req(data.fieldOfStudy.length > 0, "fieldOfStudy");
    req(data.passportStatus.length > 0, "passportStatus");
    req(data.englishLevel.length > 0, "englishLevel");
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
