export type IntakeDraft = {
  fullName: string;
  whatsapp: string;
  email: string;
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
  /** PACK-01 : filière du diplôme (filiereDiplome), moyenne structurée, diplômes originaux. */
  degreeField: string;
  averageValue: string;
  averageScale: string;
  originalDiplomas: "" | "yes" | "notYet";

  targetLevel: string;
  /** PACK-01 : domaines souhaités (codes, 2 maximum) — remplace l'ancien choix unique. */
  domains: string[];
  fieldOther: string;
  passportStatus: string;
  englishCertificate: string;
  englishScore: string;
  /** Oui / Un peu / Non : demandé seulement sans certificat ni études en anglais. */
  englishLevel: string;
  hsk: string;
  bankStatement: string;
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
  email: "",
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
  degreeField: "",
  averageValue: "",
  averageScale: "",
  originalDiplomas: "",
  targetLevel: "",
  domains: [],
  fieldOther: "",
  passportStatus: "",
  englishCertificate: "",
  englishScore: "",
  englishLevel: "",
  hsk: "",
  bankStatement: "",
  fundingPlan: "",
  targetIntake: "",
  referred: "",
  partnerDeclared: "",
  discoverySource: "",
  consentGiven: false,
  siteWeb: "",
};

export type StepErrors = Partial<Record<keyof IntakeDraft, string>>;

/** Parrainage reconnu via le lien /r/CODE (pré-remplit et verrouille l'étape Validation). */
export type ReferralInfo = { code: string; partnerName: string };
