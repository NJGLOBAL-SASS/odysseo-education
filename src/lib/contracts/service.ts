/**
 * Contrat partenaire en ligne (PACK-11), CÔTÉ SERVEUR uniquement : création, lien de signature,
 * code à usage unique, signature, PDF signé, preuve d'acceptation.
 *
 * Le modèle, la configuration, la signature du fondateur et le cachet sont lus sur le disque du
 * serveur (content/contrats, config/) et ne sont jamais servis tels quels au navigateur.
 */
import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Partner, PartnerApplication, PartnerContract, Prisma } from "@prisma/client";
import { parsePhoneNumberFromString } from "libphonenumber-js";

import { prisma } from "@/lib/prisma";
import { referralLink } from "@/lib/referral";
import cfgJson from "../../../config/contrat_partenaire.config.json";
import { renderContractPdf } from "./pdf";
import { fcfa, fillTemplate, maskEmail, maskPhone, parseContract, type ContractConfig } from "./rules";

export const CONTRACT_CONFIG = cfgJson as unknown as ContractConfig;
const ROOT = process.cwd();
const TEMPLATE = path.join(ROOT, "content/contrats/contrat_partenaire_v1.fr.md");
const SIGNATURE = path.join(ROOT, CONTRACT_CONFIG.signataire_odysseo.signature_image);
const STAMP = path.join(ROOT, CONTRACT_CONFIG.signataire_odysseo.cachet_image);

export { ATTRIBUTING_CONTRACT_STATUSES as ATTRIBUTING } from "./rules";
import { ATTRIBUTING_CONTRACT_STATUSES } from "./rules";

export const sha256 = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

export function founderSignatureAvailable() {
  return fs.existsSync(SIGNATURE);
}

export function partnerCanAttribute(p: Pick<Partner, "status" | "contractStatus">) {
  return p.status === "ACTIVE" && ATTRIBUTING_CONTRACT_STATUSES.includes(p.contractStatus);
}

/** Journal des statuts (demande ou partenaire). */
export function logStatus(
  db: Prisma.TransactionClient | typeof prisma,
  e: { partnerId?: string | null; applicationId?: string | null; from?: string | null; to: string; actor: string; note?: string },
) {
  return db.partnerStatusEvent.create({
    data: { partnerId: e.partnerId ?? null, applicationId: e.applicationId ?? null, fromStatus: e.from ?? null, toStatus: e.to, actorName: e.actor, note: e.note ?? null },
  });
}

/** Destination masquée du code (e-mail par défaut ; WhatsApp seulement si l'API existe un jour). */
export function otpDestination(email: string) {
  return { channel: "email" as const, masked: maskEmail(email) };
}

export function maskWhatsapp(phone: string) {
  const parsed = parsePhoneNumberFromString(phone);
  return maskPhone(phone, parsed?.countryCallingCode.length ?? 3);
}

/** Champs du contrat (instantané enregistré à l'envoi). */
export function contractFields(app: PartnerApplication, partner: Partner, number: string) {
  const c = CONTRACT_CONFIG;
  const fullName = [app.firstName, app.lastName].filter(Boolean).join(" ") || app.fullName;
  return {
    contrat_version: c.contrat_version,
    contrat_numero: number,
    partenaire_nom_complet: fullName,
    partenaire_ville: app.city,
    partenaire_pays: app.country,
    partenaire_piece_type: app.idType ?? "—",
    partenaire_piece_numero: app.idNumber ?? "—",
    partenaire_whatsapp: app.whatsapp,
    partenaire_email: app.email,
    partenaire_code: partner.referralCode,
    partenaire_lien: referralLink(partner.referralCode),
    partenaire_paiement_operateur: app.payoutMethod ?? "—",
    partenaire_paiement_numero: app.payoutNumber ?? app.whatsapp,
    prix_date: c.prix_date,
    delai_paiement_jours: String(c.delai_paiement_jours),
    prime_ouverture: fcfa(c.prime_ouverture),
    attribution_mois: String(c.attribution_mois),
    duree_mois: String(c.duree_mois),
    preavis_jours: String(c.preavis_jours),
    tribunal_ville: c.tribunal_ville,
    fuseau_libelle: c.fuseau_libelle,
    otp_canal_libelle: "e-mail",
  };
}
export type ContractFields = ReturnType<typeof contractFields>;

/** Contrat rempli → blocs (HTML de la page de signature et PDF). */
export function contractBlocks(fields: Record<string, string>, signedAt?: Date) {
  const md = fs.readFileSync(TEMPLATE, "utf8");
  const fmt = (o: Intl.DateTimeFormatOptions) => (signedAt ? new Intl.DateTimeFormat("fr-FR", { ...o, timeZone: CONTRACT_CONFIG.fuseau }).format(signedAt) : "…");
  const all = {
    ...fields,
    date_signature: fmt({ day: "2-digit", month: "long", year: "numeric" }),
    heure_signature: fmt({ hour: "2-digit", minute: "2-digit" }),
  };
  return parseContract(fillTemplate(md, all));
}

async function nextNumber(db: Prisma.TransactionClient, year: number) {
  const prefix = `ODY-P-${year}-`;
  const last = await db.partnerContract.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  const n = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/**
 * Crée un contrat (nouvelle version ou premier envoi) et son lien de signature.
 * Renvoie le jeton en clair (à mettre dans le lien) : seul son hachage est stocké.
 */
export async function createContract(db: Prisma.TransactionClient, app: PartnerApplication, partner: Partner, sentByName: string) {
  const token = newToken();
  const expires = new Date(Date.now() + CONTRACT_CONFIG.lien_contrat_validite_jours * 86_400_000);
  const year = new Date().getFullYear();
  // Numéro séquentiel : en cas de collision (deux envois simultanés), on réessaie.
  for (let attempt = 0; ; attempt++) {
    const number = await nextNumber(db, year);
    try {
      const contract = await db.partnerContract.create({
        data: {
          partnerId: partner.id,
          number,
          version: CONTRACT_CONFIG.contrat_version,
          fields: contractFields(app, partner, number),
          tokenHash: sha256(token),
          tokenExpiresAt: expires,
          sentByName,
        },
      });
      return { contract, token };
    } catch (err) {
      if (attempt >= 3) throw err;
    }
  }
}

/** Nouveau lien (l'ancien est invalidé). */
export async function renewToken(contractId: string) {
  const token = newToken();
  await prisma.partnerContract.update({
    where: { id: contractId },
    data: { tokenHash: sha256(token), tokenExpiresAt: new Date(Date.now() + CONTRACT_CONFIG.lien_contrat_validite_jours * 86_400_000), sentAt: new Date() },
  });
  return token;
}

export type TokenState =
  | { ok: true; contract: PartnerContract & { partner: Partner & { application: PartnerApplication | null } } }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/** Lien de signature : valable, expiré (le partenaire passe en « lien expiré ») ou déjà utilisé. */
export async function contractFromToken(token: string): Promise<TokenState> {
  if (!token || token.length < 20) return { ok: false, reason: "invalid" };
  const contract = await prisma.partnerContract.findUnique({
    where: { tokenHash: sha256(token) },
    include: { partner: { include: { application: true } } },
  });
  if (!contract) return { ok: false, reason: "invalid" };
  if (contract.signedAt) return { ok: false, reason: "used" };
  if (!contract.tokenExpiresAt || contract.tokenExpiresAt < new Date()) {
    if (contract.partner.contractStatus === "contrat_envoye") {
      await prisma.$transaction([
        prisma.partner.update({ where: { id: contract.partnerId }, data: { contractStatus: "lien_expire", contractStatusAt: new Date() } }),
        logStatus(prisma, { partnerId: contract.partnerId, from: "contrat_envoye", to: "lien_expire", actor: "système" }),
      ]);
    }
    return { ok: false, reason: "expired" };
  }
  return { ok: true, contract };
}

/** Code à usage unique : 6 chiffres, haché, valable 10 minutes. */
export function newOtp() {
  const code = String(randomInt(0, 10 ** CONTRACT_CONFIG.otp.longueur)).padStart(CONTRACT_CONFIG.otp.longueur, "0");
  return { code, hash: (contractId: string) => sha256(`${contractId}:${code}:${process.env.AUTH_SECRET ?? ""}`) };
}
export const otpHash = (contractId: string, code: string) => sha256(`${contractId}:${code}:${process.env.AUTH_SECRET ?? ""}`);

/** PDF du contrat : aperçu (sans signatures) ou version signée (signature du fondateur + cachet). */
export async function buildContractPdf(contract: Pick<PartnerContract, "number" | "version" | "fields">, signed?: { at: Date; name: string; destination: string }) {
  const fields = contract.fields as Record<string, string>;
  const blocks = contractBlocks(fields, signed?.at);
  const when = signed
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: CONTRACT_CONFIG.fuseau }).format(signed.at)
    : "";
  const signedLine = signed ? `Signé électroniquement par ${signed.name} le ${when} (heure de ${CONTRACT_CONFIG.fuseau_libelle}) · code confirmé sur ${signed.destination}` : null;
  // Empreinte du contenu (hors pied de page) : texte du contrat + ligne de signature.
  const contentHash = sha256(JSON.stringify({ blocks, signedLine, number: contract.number, version: contract.version }));
  if (signed && !founderSignatureAvailable()) throw new Error("FOUNDER_SIGNATURE_MISSING");
  const pdf = await renderContractPdf({
    blocks,
    config: CONTRACT_CONFIG,
    number: contract.number,
    version: contract.version,
    contentHash,
    preview: !signed,
    signature: {
      founderSignature: signed ? fs.readFileSync(SIGNATURE) : null,
      stamp: signed && fs.existsSync(STAMP) ? fs.readFileSync(STAMP) : null,
      partnerName: fields.partenaire_nom_complet,
      signedLine,
    },
  });
  return { pdf, contentHash, pdfHash: sha256(pdf) };
}

export function newFinalToken() {
  const token = newToken();
  return { token, hash: sha256(token), expires: new Date(Date.now() + 24 * 3600_000) };
}
