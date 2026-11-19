/**
 * Modèles de messages du PACK-12 (_ameliorations/PACK-12/messages.md) : alertes équipe, message WhatsApp
 * d'envoi du rapport, relances, ouverture de l'espace. Module pur.
 *
 * Messages destinés à l'étudiant : jamais de nom réel d'université ni de partenaire.
 * Ils ne reçoivent que des offres « publiques » (référence, lieu, arguments, textes).
 */
import { formatFcfa } from "@/lib/pricing/tarifs";

export interface MessageOffer {
  ref: string;
  role: string;
  lieu: string;
  arguments: string[];
  bourse_texte: string | null;
  date_limite: string | null;
}

/** « 2027-01-30 » → « 30/01/2027 ». */
export function frDate(iso: string | Date | null | undefined) {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso) : iso;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(d);
}

/** {{resume}} = premier argument, sinon bourse_texte raccourci à 70 caractères. */
export function resumeOf(o: Pick<MessageOffer, "arguments" | "bourse_texte">) {
  if (o.arguments[0]) return o.arguments[0];
  const b = (o.bourse_texte ?? "").trim();
  return b.length > 70 ? `${b.slice(0, 69).trimEnd()}…` : b;
}

/** Première date limite à venir parmi les offres (ou la plus proche si toutes passées). */
export function firstDeadline(offers: Pick<MessageOffer, "date_limite">[]) {
  const dates = offers.map((o) => o.date_limite).filter((d): d is string => Boolean(d)).sort();
  return dates[0] ?? null;
}

// ── 1. Alerte nouveau profil (équipe) ──

export interface AlertProfile {
  code: string;
  prenom: string;
  age: number | null;
  pays: string;
  niveau: string;
  domaines: string;
  diplome: string;
  moyenne: string;
  hsk: string;
  anglais: string;
  funding: string;
}

export function newProfileSubject(p: Pick<AlertProfile, "code" | "niveau" | "pays">) {
  return `🔔 Nouveau profil ${p.code} · ${p.niveau} · ${p.pays}`;
}

export function newProfileAlert(p: AlertProfile, offers: { ref: string; role: string }[], repliLangue: boolean, adminLink: string) {
  const main = offers.filter((o) => o.role !== "alternative").map((o) => `${o.ref} (${o.role})`);
  const alt = offers.filter((o) => o.role === "alternative").map((o) => `${o.ref} (alternative)`);
  const draft = offers.length ? [...main, ...alt].join(" · ") : "aucune offre automatique, à compléter";
  return [
    `🔔 Nouveau profil ${p.code}`,
    `${p.prenom} · ${p.age ?? "?"} ans · ${p.pays}`,
    `Niveau visé : ${p.niveau} · Domaines : ${p.domaines}`,
    `Diplôme : ${p.diplome} · Moyenne : ${p.moyenne} · HSK : ${p.hsk} · Anglais : ${p.anglais}`,
    `Budget : ${p.funding}`,
    "",
    `Brouillon prêt : ${draft}`,
    ...(repliLangue ? ["⚠️ Aucune licence possible (âge/HSK) : repli sur la langue, à vérifier"] : []),
    "",
    `👉 Relire et valider : ${adminLink}`,
  ].join("\n");
}

// Relances équipe et étudiant : remplacées par ODY-15 (src/lib/report/reminders.ts, alerte de 8 h).

// ── 3. Message WhatsApp d'envoi du rapport ──

export interface ReportMessageInput {
  prenom: string;
  code: string;
  offers: MessageOffer[];
  /** null : cursus sur devis (MBBS). */
  firstInstallment: number | null;
  expiresAt: Date | string | null;
}

export function reportWhatsAppMessage(i: ReportMessageInput) {
  const deadline = firstDeadline(i.offers);
  const ref1 = i.offers[0]?.ref ?? "";
  const price =
    i.firstInstallment == null
      ? ["Votre devis personnalisé suit dans un prochain message."]
      : [`Pour lancer votre dossier : ouverture de ${formatFcfa(i.firstInstallment)} FCFA. Vous ne réglez la totalité qu'une fois votre visa obtenu.`];
  const dates = [
    deadline ? `⏳ Première date limite : ${frDate(deadline)}.` : "",
    i.expiresAt ? `Rapport valable jusqu'au ${frDate(i.expiresAt)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return [
    `Bonjour ${i.prenom} 👋 C'est Odysseo Education.`,
    "Bonne nouvelle : votre profil est éligible à une admission avec bourse ✅",
    "",
    `Votre rapport d'admissibilité (${i.code}) est en pièce jointe. Nous avons sélectionné pour vous :`,
    ...i.offers.map((o) => `▪️ ${o.ref} · ${o.lieu} · ${resumeOf(o)}`),
    "",
    ...price,
    "",
    ...(dates ? [dates, ""] : []),
    `Quelle offre vous intéresse ? Répondez simplement avec sa référence (ex. ${ref1}). Nous pouvons aussi vous appeler 10 minutes, vous ou vos parents.`,
  ].join("\n");
}

// ── 6. Ouverture de l'espace ──

export function spaceOpeningMessage(prenom: string, code: string, montant: number, lien: string) {
  return [
    `Merci ${prenom} ! Votre versement de ${formatFcfa(montant)} FCFA est bien reçu ✅`,
    `Votre dossier ${code} est ouvert. Suivez chaque étape et déposez vos documents ici : ${lien}`,
    "(Pour la première connexion, on vous demandera les 4 derniers chiffres de votre numéro WhatsApp.)",
    "L'équipe Odysseo",
  ].join("\n");
}
