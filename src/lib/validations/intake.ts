import { z } from "zod";

import { attributionSchema } from "@/lib/attribution";
import {
  AVERAGE_SCALES,
  BANK_STATEMENT_BANDS,
  DOMAIN_CODES,
  ENGLISH_CERTIFICATES,
  HSK_LEVELS,
  MAX_DOMAINS,
  isScoredCertificate,
  isValidAverage,
  isValidEnglishScore,
  parseDecimal,
} from "@/lib/qualification";

export function normalizePhone(v: string) {
  return String(v || "")
    .replace(/[\s.\-()/]/g, "")
    .replace(/^00/, "+");
}

export function ageFrom(dateStr: string) {
  if (!dateStr) return null;
  const birth = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const phoneRegex = /^\+\d{9,15}$/;

const intakeBaseSchema = z.object({
  fullName: z
    .string()
    .trim()
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, "fullName"),
  whatsapp: z.string().refine((v) => phoneRegex.test(normalizePhone(v)), "whatsapp"),
  email: z.string().trim().toLowerCase().email("email").max(120),
  dateOfBirth: z.string().refine((v) => {
    const a = ageFrom(v);
    return a !== null && a >= 12 && a <= 65;
  }, "dateOfBirth"),
  country: z.string().min(1, "required"),
  city: z.string().trim().min(1, "required"),
  managedBy: z.enum(["self", "parent", "guardian"]),
  guardianName: z.string().optional(),
  guardianLink: z.string().optional(),
  guardianWhatsapp: z.string().optional(),

  currentSituation: z.string().min(1, "required"),
  highestDegree: z.string().min(1, "required"),
  degreeOther: z.string().optional(),
  degreeYear: z.coerce.number().int().optional(),
  // PACK-01 : filière, moyenne structurée (valeur + barème), diplômes originaux.
  degreeField: z.string().trim().max(120).optional(),
  averageValue: z.union([z.string(), z.number()]).optional(),
  averageScale: z.enum(AVERAGE_SCALES),
  originalDiplomas: z.enum(["yes", "notYet"]),

  targetLevel: z.string().min(1, "required"),
  domains: z.array(z.enum(DOMAIN_CODES)).min(1, "required").max(MAX_DOMAINS, "domainsMax"),
  fieldOther: z.string().optional(),
  passportStatus: z.string().min(1, "required"),
  englishCertificate: z.enum(ENGLISH_CERTIFICATES),
  englishScore: z.union([z.string(), z.number()]).optional(),
  englishLevel: z.string().optional(),
  hsk: z.enum(HSK_LEVELS),
  bankStatement: z.enum(BANK_STATEMENT_BANDS),
  fundingPlan: z.string().min(1, "required"),
  targetIntake: z.string().min(1, "required"),

  referred: z.enum(["yes", "no"]),
  partnerDeclared: z.string().optional(),
  discoverySource: z.string().optional(),
  consentGiven: z.boolean().refine((v) => v === true, "consent"),

  // anti-robot
  siteWeb: z.string().max(0).optional().or(z.literal("")),
  submissionDurationSec: z.number().optional(),

  locale: z.enum(["fr", "en"]).default("fr"),
  srcParam: z.string().optional(),
  /** Offre choisie sur /offres (PACK-03), ex. « MA-24 ». */
  offerRef: z.string().trim().max(10).optional().catch(undefined),

  // Mesure des conversions (PACK-04) — jamais bloquant : une valeur invalide est ignorée.
  attribution: attributionSchema.nullish().catch(null),
  marketingConsent: z.boolean().optional().catch(false),
  fbp: z.string().max(200).optional().catch(undefined),
  fbc: z.string().max(700).optional().catch(undefined),
  pageUrl: z.string().max(500).optional().catch(undefined),
});

export const intakeSchema = intakeBaseSchema.superRefine((d, ctx) => {
  if (d.averageScale !== "unknown" && !isValidAverage(parseDecimal(d.averageValue), d.averageScale)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["averageValue"], message: "average" });
  }
  if (isScoredCertificate(d.englishCertificate) && !isValidEnglishScore(d.englishCertificate, parseDecimal(d.englishScore))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["englishScore"], message: "englishScore" });
  }
  if (d.englishCertificate === "none" && !["yes", "little", "no"].includes(d.englishLevel ?? "")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["englishLevel"], message: "required" });
  }
  if (d.domains.includes("autre") && !d.fieldOther?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fieldOther"], message: "required" });
  }
});

export type IntakeInput = z.infer<typeof intakeSchema>;
