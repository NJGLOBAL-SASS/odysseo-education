export type IntakeDraft = {
  fullName: string;
  whatsapp: string;
  dateOfBirth: string;
  country: string;
  city: string;
  managedBy: "" | "self" | "parent" | "guardian";
  guardianName: string;
  guardianLink: string;
  guardianWhatsapp: string;

  currentSituation: string;
  highestDegree: string;
  degreeOther: string;
  degreeYear: string;
  degreeAverage: string;

  targetLevel: string;
  fieldOfStudy: string;
  fieldOther: string;
  passportStatus: string;
  englishLevel: string;
  fundingPlan: string;
  targetIntake: string;

  referred: "" | "yes" | "no";
  partnerDeclared: string;
  discoverySource: string;
  consentGiven: boolean;

  siteWeb: string; // honeypot
};

export const emptyDraft: IntakeDraft = {
  fullName: "",
  whatsapp: "",
  dateOfBirth: "",
  country: "",
  city: "",
  managedBy: "",
  guardianName: "",
  guardianLink: "",
  guardianWhatsapp: "",
  currentSituation: "",
  highestDegree: "",
  degreeOther: "",
  degreeYear: "",
  degreeAverage: "",
  targetLevel: "",
  fieldOfStudy: "",
  fieldOther: "",
  passportStatus: "",
  englishLevel: "",
  fundingPlan: "",
  targetIntake: "",
  referred: "",
  partnerDeclared: "",
  discoverySource: "",
  consentGiven: false,
  siteWeb: "",
};

export type StepErrors = Partial<Record<keyof IntakeDraft, string>>;
