/**
 * Paiements des étudiants : moyens acceptés, validation des déclarations, numéros de reçu.
 *
 * Principe : l'étudiant (ou le parent) déclare un paiement avec sa preuve, ou l'équipe
 * l'enregistre ; c'est toujours Odysseo qui confirme. Seuls les paiements confirmés
 * comptent comme réglés et donnent un reçu.
 */
import { z } from "zod";

export const PAYMENT_METHODS = ["especes", "virement", "orange_money", "mtn_momo", "autre"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const METHOD_LABELS: Record<PaymentMethod, { fr: string; en: string }> = {
  especes: { fr: "Espèces, au bureau de Douala (RT Services)", en: "Cash, at the Douala office (RT Services)" },
  virement: { fr: "Virement bancaire", en: "Bank transfer" },
  orange_money: { fr: "Orange Money", en: "Orange Money" },
  mtn_momo: { fr: "MTN Mobile Money", en: "MTN Mobile Money" },
  autre: { fr: "Autre moyen", en: "Other method" },
};

/** Bureau où l'on paie en espèces (affiché dans l'espace et sur le reçu). */
export const PAYMENT_OFFICE = {
  fr: "Douala – Mboppi, après Ecobank et CBC Bank, immeuble Jadever : prenez l'escalier en fer jusqu'au bureau RT Services.",
  en: "Douala – Mboppi, after Ecobank and CBC Bank, Jadever building: take the iron staircase up to the RT Services office.",
};

export const PAYMENT_STATUSES = ["en_verification", "confirme", "refuse"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Preuve : photo ou PDF, 10 Mo maximum. */
export const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
export const PROOF_MAX_MB = 10;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Paiement daté au plus tôt il y a 2 ans, au plus tard aujourd'hui (fuseau large : +1 jour). */
export function isPlausiblePaymentDate(value: string, now = new Date()) {
  const d = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return false; // ex. 30 février
  const max = now.getTime() + 24 * 3600 * 1000;
  const min = now.getTime() - 2 * 365 * 24 * 3600 * 1000;
  return d.getTime() <= max && d.getTime() >= min;
}

const base = {
  stepIndex: z.number().int().min(0).max(20).nullable(),
  amount: z.number().int().positive().max(100_000_000),
  method: z.enum(PAYMENT_METHODS),
  methodNote: z.string().trim().max(200).optional(),
  paidOn: isoDate.refine((v) => isPlausiblePaymentDate(v), "date"),
};

/** Preuve annoncée par le navigateur : taille et type réels sont relus dans le stockage (côté serveur). */
const proof = z.object({
  url: z.string().url().max(1000),
  name: z.string().trim().min(1).max(200),
});

/** Déclaration depuis l'espace : la preuve est obligatoire. */
export const declareSchema = z.object({ ...base, proof }).refine((v) => v.method !== "autre" || Boolean(v.methodNote), {
  path: ["methodNote"],
  message: "note",
});

/** Enregistrement par l'équipe (paiement reçu au bureau, preuve reçue sur WhatsApp) : preuve facultative. */
export const recordSchema = z.object({ ...base, proof: proof.optional() });

/** Numéro de reçu : REC-AAAA-NNNN (séquence annuelle). */
export function receiptNumber(year: number, sequence: number) {
  return `REC-${year}-${String(sequence).padStart(4, "0")}`;
}

/** Prochain numéro de séquence pour l'année, à partir des numéros existants. */
export function nextSequence(existing: (string | null)[], year: number) {
  const prefix = `REC-${year}-`;
  const max = existing.reduce((m, n) => {
    if (!n?.startsWith(prefix)) return m;
    const seq = Number(n.slice(prefix.length));
    return Number.isInteger(seq) ? Math.max(m, seq) : m;
  }, 0);
  return max + 1;
}

/**
 * Montant réglé pour l'échéancier : la somme des paiements confirmés ; à défaut
 * (dossiers antérieurs), le premier paiement saisi par l'équipe sur le rapport.
 */
export function confirmedTotal(payments: { status: string; amount: number }[], legacyFirstPayment: number | null | undefined) {
  const confirmed = payments.filter((p) => p.status === "confirme");
  if (confirmed.length > 0) return confirmed.reduce((sum, p) => sum + p.amount, 0);
  return legacyFirstPayment ?? 0;
}

/** Lien WhatsApp prêt à envoyer (numéro au format international, sans « + »). */
export function whatsappLink(phone: string | null | undefined, message: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
}
