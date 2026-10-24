import { authenticator } from "otplib";
import QRCode from "qrcode";

const ISSUER = "Odysseo Education";

/** Génère un nouveau secret TOTP pour un utilisateur. */
export function generateTwoFactorSecret() {
  return authenticator.generateSecret();
}

/** Construit l'URL otpauth:// + un QR code en data-URI pour l'app d'authentification. */
export async function buildTwoFactorEnrollment(email: string, secret: string) {
  const otpauth = authenticator.keyuri(email, ISSUER, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);
  return { otpauth, qrDataUrl };
}

/** Vérifie un code à 6 chiffres saisi par l'utilisateur. */
export function verifyTwoFactorToken(token: string, secret: string) {
  return authenticator.check(token, secret);
}
