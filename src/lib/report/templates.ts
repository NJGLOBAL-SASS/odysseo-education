/**
 * Messages d'envoi du rapport (PACK-13 §7, config/messages_whatsapp.json) et résumé du
 * profil « à coller dans Claude » (ODY-15 §5.2). Module pur.
 */
import whatsapp from "../../../config/messages_whatsapp.json";
import { fillTemplate, type MessageVars } from "./reminders";

export const SEND_TEMPLATES = [
  "MSG-BACHELOR",
  "MSG-MOYENNE",
  "MSG-SEPTEMBRE",
  "MSG-MBBS",
  "MSG-PARCOURS",
  "MSG-LANGUE",
  "MSG-MASTER-PHD",
  "MSG-MAJ",
  "MSG-INFOS-MANQUANTES",
] as const;
export type SendTemplate = (typeof SEND_TEMPLATES)[number];

/** Choix automatique du modèle (PACK-13 §7). `service` : cursus facturé (langue, bachelor, mbbs, master, phd, parcours_complet). */
export function pickSendTemplate(o: { cas?: string | null; service?: string | null; update?: boolean }): SendTemplate {
  if (o.update) return "MSG-MAJ";
  if (o.cas === "mbbs") return "MSG-MBBS";
  if (o.service === "parcours_complet" || o.cas === "parcours_complet") return "MSG-PARCOURS";
  if (o.cas === "moyenne_faible") return "MSG-MOYENNE";
  if (o.cas === "septembre_non_ouvert") return "MSG-SEPTEMBRE";
  if (o.service === "langue" || o.service === "langue-chinoise" || o.cas === "langue") return "MSG-LANGUE";
  if (o.service === "master" || o.service === "phd" || o.service === "doctorat" || o.cas === "master_phd") return "MSG-MASTER-PHD";
  return "MSG-BACHELOR";
}

export function sendTemplateText(key: SendTemplate, vars: MessageVars) {
  return fillTemplate(whatsapp[key], vars);
}

export interface ProfileForClaude {
  code: string;
  createdAt: Date | string;
  filledBy: string;
  fullName: string;
  whatsapp: string;
  country: string;
  city: string;
  age: number | null;
  level: string;
  intake: string;
  degree: string;
  average: string;
  field: string;
  budget: string;
  scholarship: string;
  comment: string;
}

/** Résumé texte du profil (champs du formulaire, sans données internes), format ODY-15 §5.2. */
export function profileForClaude(p: ProfileForClaude) {
  const d = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Africa/Douala" }).format(new Date(p.createdAt));
  const v = (x: string | number | null | undefined) => (x === null || x === undefined || x === "" ? "—" : String(x));
  return [
    `Demande ${p.code} · reçue le ${d}`,
    `Rempli par : ${p.filledBy}`,
    `Prénom / Nom : ${v(p.fullName)}`,
    `Téléphone WhatsApp : ${v(p.whatsapp)}`,
    `Pays / Ville : ${v(p.country)} / ${v(p.city)}`,
    `Âge : ${v(p.age)}`,
    `Niveau demandé : ${v(p.level)} · Rentrée : ${v(p.intake)}`,
    `Diplôme / Série : ${v(p.degree)} · Moyenne : ${v(p.average)}`,
    `Filière souhaitée : ${v(p.field)}`,
    `Budget : ${v(p.budget)}`,
    `Bourse : ${v(p.scholarship)}`,
    `Commentaire : ${v(p.comment)}`,
  ].join("\n");
}
