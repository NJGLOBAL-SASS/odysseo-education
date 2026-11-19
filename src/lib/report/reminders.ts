/**
 * Relances (ODY-15 §7) et liens WhatsApp. Module pur, testé (reminders.test.ts).
 *
 * Calendrier : config/relances.json (jours après l'envoi, 8 h heure de Douala, jamais le
 * dimanche). Messages : config/messages_relance.json. Douala = UTC+1 toute l'année.
 */
import calendar from "../../../config/relances.json";
import templates from "../../../config/messages_relance.json";
import { countryByValue } from "@/lib/countries";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const OFFSET = 1; // Africa/Douala, pas d'heure d'été

export const REMINDER_DAYS: number[] = calendar.jours;
export const REMINDER_HOUR: number = calendar.heure_locale;
export const POSTPONE_DAYS: number = calendar.report_jours;
export const MAX_REMINDERS = REMINDER_DAYS.length;

/** Jour local (Douala) d'un instant, sous forme de « jour zéro » UTC. */
export function localDay(d: Date) {
  const shifted = new Date(d.getTime() + OFFSET * HOUR);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}
/** Instant correspondant à `hour` heure locale du jour `day` (valeur de localDay). */
export const atLocal = (day: number, hour: number) => new Date(day + (hour - OFFSET) * HOUR);
const isSunday = (day: number) => new Date(day).getUTCDay() === 0;
const skipSunday = (day: number) => (isSunday(day) ? day + DAY : day);

/** Clé AAAA-MM-JJ du jour local (filtre « aujourd'hui »). */
export const localDayKey = (d: Date) => new Date(localDay(d)).toISOString().slice(0, 10);

export interface PlannedReminder {
  number: number;
  dueAt: Date;
}

/**
 * Relances à créer après un envoi. Celles dont la date est aujourd'hui ou déjà passée
 * (envoi rattrapé, daté dans le passé) sont regroupées en une seule R1 à faire aujourd'hui,
 * puis le calendrier continue.
 */
export function planReminders(sentAt: Date, now: Date = new Date(), days: number[] = REMINDER_DAYS): PlannedReminder[] {
  const base = localDay(sentAt);
  const today = localDay(now);
  const planned = days.map((k, i) => ({ number: i + 1, day: skipSunday(base + k * DAY) }));
  const due = planned.filter((p) => p.day <= today);
  const later = planned.filter((p) => p.day > today);
  const out: PlannedReminder[] = [];
  if (due.length > 0) out.push({ number: 1, dueAt: atLocal(today, REMINDER_HOUR) });
  for (const p of later) out.push({ number: p.number, dueAt: atLocal(p.day, REMINDER_HOUR) });
  return out;
}

/** « Reporter de 2 jours » : à partir d'aujourd'hui (ou de la date prévue si elle est plus loin). */
export function postponedDate(dueAt: Date, now: Date = new Date(), days = POSTPONE_DAYS) {
  const from = Math.max(localDay(dueAt), localDay(now));
  return atLocal(skipSunday(from + days * DAY), REMINDER_HOUR);
}

/** À faire aujourd'hui : date prévue au plus tard aujourd'hui (jour local). */
export const isDueToday = (dueAt: Date, now: Date = new Date()) => localDay(dueAt) <= localDay(now);

/** date_validite : envoi + validite_rapport_jours (tarifs.json). */
export const validUntilFrom = (sentAt: Date, days: number) => new Date(sentAt.getTime() + days * DAY);

/** Jours restants avant l'expiration (0 = expire aujourd'hui, négatif = expiré). */
export const daysLeft = (validUntil: Date, now: Date = new Date()) => Math.round((localDay(validUntil) - localDay(now)) / DAY);

// ── Messages ──

export type TemplateKey = keyof typeof templates;

export function reminderTemplateKey(number: number, o: { read: boolean; cas: string; parent: boolean }): TemplateKey {
  let key: string;
  if (number <= 1) key = o.read ? "R1_lu" : "R1_non_lu";
  else if (number >= 3) key = "R3";
  else if (o.cas === "moyenne_faible") key = "R2_moyenne_faible";
  else if (o.cas === "mbbs" || o.cas === "parcours_complet") key = "R2_mbbs";
  else key = "R2_standard";
  const parentKey = `${key}_parent`;
  return (o.parent && parentKey in templates ? parentKey : key) as TemplateKey;
}

export interface MessageVars {
  prenom: string;
  lien_rapport?: string | null;
  nb_offres?: number | null;
  rentree?: string | null;
  premier_versement?: string | null;
  date_validite?: string | null;
  liste_infos?: string | null;
}

/**
 * Remplace les variables. Sans lien (envoi rattrapé sans PDF), les lignes qui contiennent
 * {lien_rapport} sont retirées ; une phrase dont une valeur manque garde un texte neutre.
 */
export function fillTemplate(text: string, v: MessageVars) {
  const lines = text.split("\n").filter((l) => v.lien_rapport || !l.includes("{lien_rapport}"));
  const values: Record<string, string> = {
    prenom: v.prenom,
    lien_rapport: v.lien_rapport ?? "",
    nb_offres: v.nb_offres ? String(v.nb_offres) : "",
    rentree: v.rentree ?? "",
    premier_versement: v.premier_versement ?? "",
    date_validite: v.date_validite ?? "",
    liste_infos: v.liste_infos ?? "",
  };
  return lines
    .join("\n")
    .replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? values[k] : m))
    .replace(/vos  offres/g, "vos offres")
    .replace(/ses  offres/g, "ses offres")
    .replace(/ {2,}/g, " ");
}

/**
 * Message d'une relance. `deadline` : vraie date limite d'université plus proche que la
 * validité (R2 et R3 la citent). R3 dit « expire demain » seulement si c'est le cas.
 */
export function reminderMessage(
  number: number,
  o: { read: boolean; cas: string; parent: boolean; vars: MessageVars; validUntil: Date | null; deadline?: Date | null; now?: Date },
) {
  const key = reminderTemplateKey(number, o);
  const now = o.now ?? new Date();
  const fmt = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Douala" }).format(d);
  let limit = o.validUntil;
  if (number >= 2 && o.deadline && localDay(o.deadline) >= localDay(now) && (!limit || o.deadline < limit)) limit = o.deadline;
  let text: string = templates[key];
  if (number >= 3 && limit && daysLeft(limit, now) !== 1) text = text.replace("expire demain ({date_validite})", "expire le {date_validite}");
  return fillTemplate(text, { ...o.vars, date_validite: limit ? fmt(limit) : o.vars.date_validite });
}

// ── WhatsApp (ODY-15 §5.3) ──

/**
 * Numéro pour wa.me : format international sans « + », espaces ni « 00 » initial ;
 * indicatif ajouté s'il manque, selon le pays du dossier. null si absent ou invalide.
 */
export function waNumber(phone: string | null | undefined, country?: string | null): string | null {
  const raw = (phone ?? "").trim();
  if (!raw) return null;
  const international = raw.startsWith("+") || raw.startsWith("00");
  let digits = raw.replace(/\D/g, "");
  if (raw.startsWith("00")) digits = digits.slice(2);
  if (!international) {
    const dial = countryByValue(country)?.dial;
    if (dial && !(digits.startsWith(dial) && digits.length > dial.length + 7)) digits = `${dial}${digits.replace(/^0+/, "")}`;
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function waLink(number: string, text: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** Ajoute le lien du rapport à la fin du message s'il n'y est pas déjà (ODY-15 §5.2). */
export function withReportLink(message: string, link: string | null) {
  if (!link || message.includes(link)) return message;
  return `${message.trimEnd()}\n\n📄 Votre rapport : ${link}`;
}
