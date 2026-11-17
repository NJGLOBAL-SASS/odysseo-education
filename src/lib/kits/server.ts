import "server-only";

import { get } from "@vercel/blob";
import sharp from "sharp";
import { verifyUploadedFiles, deleteBlobs } from "@/lib/documents-server";
import { sniffFileType } from "@/lib/admission/file-type";
import { FLYER_MAX_MB } from "./rules";
import { prisma } from "@/lib/prisma";
import { findPartnerByCode } from "@/lib/points";
import { ATTRIBUTING_CONTRACT_STATUSES } from "@/lib/contracts/rules";
import { publicSiteUrl } from "@/lib/referral";
import { kitPageUrl, kitReferralLink, partnerFirstName, renderTemplate, whatsappMessage, type QrPosition } from "./rules";

/**
 * Kit visible publiquement pour un partenaire : kit « prêt » (ou archivé, déjà envoyé) avec un flyer,
 * partenaire actif qui peut attribuer des étudiants. Sinon null (→ 404).
 */
export async function publicKit(slug: string, code: string) {
  const [kit, partner] = await Promise.all([
    prisma.kit.findUnique({ where: { slug } }),
    findPartnerByCode(code),
  ]);
  if (!kit || !partner || kit.status === "brouillon" || !kit.imageUrl) return null;
  return { kit, partner, ...partnerKitContent(kit, partner) };
}

/** Lien tracé, texte rempli, page du kit et message WhatsApp pour un partenaire. */
export function partnerKitContent(kit: { slug: string; template: string }, partner: { fullName: string; referralCode: string }) {
  const site = publicSiteUrl();
  const firstName = partnerFirstName(partner.fullName);
  const link = kitReferralLink(site, partner.referralCode, kit.slug);
  const text = renderTemplate(kit.template, { firstName, link, code: partner.referralCode });
  const kitUrl = kitPageUrl(site, kit.slug, partner.referralCode);
  return { firstName, link, text, kitUrl, message: whatsappMessage({ firstName, kitUrl, text }) };
}

/** Partenaires actifs (statut ACTIVE et contrat qui attribue) : destinataires des kits. */
export async function activePartners() {
  return prisma.partner.findMany({
    where: { status: "ACTIVE", contractStatus: { in: ATTRIBUTING_CONTRACT_STATUSES } },
    select: { id: true, fullName: true, phone: true, referralCode: true },
    orderBy: { fullName: "asc" },
  });
}

export const asPosition = (p: string) => p as QrPosition;


/** Flyers envoyés par l'équipe : documents/kits/flyers/{AAAAMMJJ-HHMMSS}-{n}.{ext}. */
export const FLYER_PREFIX = "documents/kits/flyers/";

/** Flyer envoyé : chemin, taille (10 Mo), type réel JPG/PNG ; renvoie l'adresse et les dimensions. */
export async function verifyFlyer(file: { url: string; name: string }) {
  if (!new URL(file.url).pathname.slice(1).startsWith(FLYER_PREFIX)) return { error: "invalid" as const };
  const [f] = (await verifyUploadedFiles([file])) ?? [];
  if (!f) return { error: "fileMissing" as const };
  const blob = await get(f.blobUrl, { access: "private" }).catch(() => null);
  const bytes = blob && blob.statusCode === 200 ? Buffer.from(await new Response(blob.stream).arrayBuffer()) : null;
  const type = bytes && f.size <= FLYER_MAX_MB * 1024 * 1024 ? sniffFileType(bytes.subarray(0, 64)) : null;
  if (!bytes || (type !== "jpg" && type !== "png")) {
    await deleteBlobs([f.blobUrl]);
    return { error: f.size > FLYER_MAX_MB * 1024 * 1024 ? ("tooBig" as const) : ("badType" as const) };
  }
  const meta = await sharp(bytes).rotate().metadata();
  return { imageUrl: f.blobUrl, imageWidth: meta.width ?? null, imageHeight: meta.height ?? null };
}

/** Slug unique : « titre », puis « titre-2 », « titre-3 »… */
export async function uniqueSlug(base: string, exceptId?: string) {
  for (let i = 1; i < 100; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const taken = await prisma.kit.findUnique({ where: { slug }, select: { id: true } });
    if (!taken || taken.id === exceptId) return slug;
  }
  return `${base}-${Date.now()}`;
}
