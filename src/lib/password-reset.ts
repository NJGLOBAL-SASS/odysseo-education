import crypto from "node:crypto";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure
/** Délai minimal entre deux demandes pour un même compte (anti-spam). */
export const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;

export function generateResetToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Règle commune de robustesse : 8 caractères minimum, au moins une lettre et un chiffre. */
export function passwordProblem(password: string) {
  if (password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre et un chiffre.";
  }
  return null;
}
