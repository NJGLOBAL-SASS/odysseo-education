import { SignJWT, jwtVerify } from "jose";

/**
 * Jetons signés de courte durée utilisés pour l'authentification à deux facteurs.
 *
 *  - "pending"   : émis après vérification du mot de passe (1er facteur), consommé par
 *                  /api/auth/2fa/verify pour savoir quel utilisateur valider.
 *  - "assertion" : émis après vérification du code TOTP (2e facteur), consommé par le
 *                  provider Credentials de NextAuth pour créer la session finale.
 *
 * On évite ainsi de créer une session NextAuth tant que les deux facteurs ne sont pas validés.
 */

type TokenKind = "pending" | "assertion";

const secretKey = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");

async function sign(userId: string, kind: TokenKind, expiresIn: string) {
  return new SignJWT({ userId, kind })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

async function verify(token: string, kind: TokenKind) {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.kind !== kind) return null;
    return payload.userId as string;
  } catch {
    return null;
  }
}

export const signPendingToken = (userId: string) => sign(userId, "pending", "5m");
export const verifyPendingToken = (token: string) => verify(token, "pending");

export const signAssertionToken = (userId: string) => sign(userId, "assertion", "1m");
export const verifyAssertionToken = (token: string) => verify(token, "assertion");
