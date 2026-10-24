import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Génère un code dossier lisible, ex. ODY-7K2QX9 */
export function generateCandidateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `ODY-${code}`;
}

/** Génère un code de parrainage à partir du nom du partenaire. */
export function slugifyReferralCode(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 6);
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${base || "PART"}-${suffix}`;
}
