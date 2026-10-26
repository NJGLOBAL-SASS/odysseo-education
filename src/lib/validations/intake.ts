import { z } from "zod";

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

export const intakeSchema = z.object({
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
  degreeAverage: z.string().trim().min(1, "required"),

  targetLevel: z.string().min(1, "required"),
  fieldOfStudy: z.string().min(1, "required"),
  fieldOther: z.string().optional(),
  passportStatus: z.string().min(1, "required"),
  englishLevel: z.string().min(1, "required"),
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
});

export type IntakeInput = z.infer<typeof intakeSchema>;
