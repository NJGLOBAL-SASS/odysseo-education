import type { Candidate, NotificationChannel, Partner } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { optionLabel } from "@/lib/intake-labels";
import { publicSiteUrl, referralLink } from "@/lib/referral";
import { sendEmail, emailLayout, emailRows, escapeHtml } from "./email";
import { sendWhatsAppMessage } from "./whatsapp";
import { sendPush } from "./push";

type ChannelResult = { sent: boolean | number; reason?: string };

/**
 * Exécute un envoi et journalise le résultat réel dans NotificationLog :
 * SENT seulement si le message est parti, SKIPPED si le canal n'est pas
 * configuré (ou personne à notifier), FAILED si le fournisseur a refusé.
 */
async function deliver(
  channel: NotificationChannel,
  recipient: string,
  send: () => Promise<ChannelResult>,
  extra: { subject?: string; candidateId?: string } = {}
) {
  const log = await prisma.notificationLog.create({
    data: { channel, recipient, subject: extra.subject, candidateId: extra.candidateId },
  });
  try {
    const result = await send();
    const ok = typeof result.sent === "number" ? result.sent > 0 : result.sent;
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: ok ? { status: "SENT" } : { status: "SKIPPED", error: result.reason },
    });
    return ok;
  } catch (err) {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "FAILED", error: String(err).slice(0, 1000) },
    });
    return false;
  }
}

/** Destinataires email des alertes équipe : NOTIFY_ADMIN_EMAILS + préférences individuelles. */
async function staffEmailRecipients() {
  const fromEnv = (process.env.NOTIFY_ADMIN_EMAILS || "admin@odysseo-education.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const prefs = await prisma.notificationPreference.findMany({
    select: { emailOnNewLead: true, user: { select: { email: true } } },
  });
  const optedIn = prefs.filter((p) => p.emailOnNewLead).map((p) => p.user.email.toLowerCase());
  const optedOut = new Set(prefs.filter((p) => !p.emailOnNewLead).map((p) => p.user.email.toLowerCase()));

  return [...new Set([...fromEnv, ...optedIn])].filter((e) => !optedOut.has(e));
}

/** URL absolue sur le sous-domaine équipe (dashboard, connexion, réinitialisation). */
export function teamUrl(path: string) {
  const host = process.env.TEAM_HOSTNAME;
  if (!host) return `${publicSiteUrl()}${path}`;
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}${path}`;
}

/**
 * Déclenché à chaque nouvelle candidature. Alerte l'équipe sur les 3 canaux
 * (email / WhatsApp / push) — chaque canal est indépendant : l'échec de l'un
 * n'empêche pas les autres.
 */
export async function notifyNewCandidate(candidate: Candidate & { partner?: Partner | null }) {
  const adminWhatsApp = process.env.WHATSAPP_ADMIN_NUMBER;
  const level = optionLabel("targetLevel", candidate.targetLevel);

  const subject = `Nouveau dossier — ${candidate.fullName} (${candidate.code})`;
  const summary = `${candidate.fullName} · ${candidate.country}, ${candidate.city} · ${level}`;
  const detailPath = `/fr/dashboard/candidatures/${candidate.id}`;

  const html = emailLayout({
    title: "Nouvelle candidature reçue",
    intro: `Dossier ${candidate.code}`,
    bodyHtml: emailRows([
      ["Nom", candidate.fullName],
      ["WhatsApp", candidate.whatsapp],
      ["Email", candidate.email],
      ["Pays / ville", `${candidate.country}, ${candidate.city}`],
      ["Géré par", optionLabel("managedBy", candidate.managedBy)],
      ["Niveau visé", level],
      ["Domaine", candidate.fieldOfStudy],
      ["Financement", optionLabel("fundingPlan", candidate.fundingPlan)],
      ["Rentrée", optionLabel("targetIntake", candidate.targetIntake)],
      ["Partenaire", candidate.partner ? `${candidate.partner.fullName} (${candidate.partner.referralCode})` : ""],
    ]),
    cta: { label: "Ouvrir le dossier", url: teamUrl(detailPath) },
  });

  const recipients = await staffEmailRecipients();

  await Promise.all([
    ...recipients.map((to) =>
      deliver("EMAIL", to, () => sendEmail(to, subject, html), { subject, candidateId: candidate.id })
    ),

    adminWhatsApp
      ? deliver(
          "WHATSAPP",
          adminWhatsApp,
          () => sendWhatsAppMessage(adminWhatsApp, `Nouveau dossier Odysseo : ${summary} (${candidate.code})`),
          { candidateId: candidate.id }
        )
      : Promise.resolve(),

    deliver(
      "PUSH",
      "équipe",
      () => sendPush({ title: "Nouvelle candidature", body: summary, url: detailPath }),
      { subject: "Nouvelle candidature", candidateId: candidate.id }
    ),
  ]);
}

/** Email de bienvenue envoyé au partenaire avec son code et son lien de parrainage. */
export async function notifyPartnerWelcome(partner: Partner) {
  const link = referralLink(partner.referralCode);
  const portal = `${publicSiteUrl()}/fr/espace-partenaire/${partner.referralCode}`;
  const subject = "Votre lien de parrainage Odysseo Education";

  const html = emailLayout({
    title: `Bienvenue dans le programme partenaires, ${partner.fullName.split(/\s+/)[0]} !`,
    intro:
      "Partagez simplement votre lien : chaque personne qui remplit le formulaire depuis ce lien vous est attribuée automatiquement, sans code à taper.",
    bodyHtml: `${emailRows([
      ["Votre code", partner.referralCode],
      ["Votre lien", link],
    ])}
      <p style="margin:16px 0 0;font-size:14px;color:#5B5B66">Suivez vos dossiers et vos points dans votre espace partenaire :
      <a href="${escapeHtml(portal)}" style="color:#0B0B0D;font-weight:700">${escapeHtml(portal)}</a></p>`,
    cta: { label: "Ouvrir mon lien", url: link },
  });

  return deliver("EMAIL", partner.email, () => sendEmail(partner.email, subject, html), { subject });
}

/** Envoi de test depuis la page Paramètres, pour vérifier chaque canal. */
export async function sendTestNotification(
  channel: "EMAIL" | "PUSH" | "WHATSAPP",
  user: { id: string; email: string }
) {
  if (channel === "EMAIL") {
    const subject = "Test de notification — Odysseo";
    const html = emailLayout({
      title: "Les emails fonctionnent ✔",
      intro: "Ceci est un email de test envoyé depuis les paramètres du tableau de bord.",
      bodyHtml: emailRows([["Envoyé le", new Date().toLocaleString("fr-FR")]]),
    });
    return deliver("EMAIL", user.email, () => sendEmail(user.email, subject, html), { subject });
  }

  if (channel === "PUSH") {
    return deliver(
      "PUSH",
      user.email,
      () =>
        sendPush(
          { title: "Test Odysseo", body: "Les notifications push fonctionnent sur cet appareil.", url: "/fr/dashboard" },
          { userId: user.id }
        ),
      { subject: "Test" }
    );
  }

  const to = process.env.WHATSAPP_ADMIN_NUMBER || "";
  return deliver("WHATSAPP", to || "—", async () =>
    to ? sendWhatsAppMessage(to, "Test Odysseo : les alertes WhatsApp fonctionnent.") : { sent: false, reason: "WHATSAPP_ADMIN_NUMBER manquant" }
  );
}

/**
 * Accusé de réception envoyé au candidat : son code dossier et le rappel que
 * WhatsApp + email sont les deux canaux officiels de sa procédure.
 */
export async function notifyCandidateConfirmation(candidate: Candidate) {
  if (!candidate.email) return false;
  const en = candidate.locale === "en";
  const firstName = candidate.fullName.trim().split(/\s+/).slice(-1)[0] ?? "";
  const subject = en
    ? `Your application ${candidate.code} has been received`
    : `Votre dossier ${candidate.code} est bien enregistré`;

  const html = emailLayout({
    title: en ? `Thank you ${firstName}!` : `Merci ${firstName} !`,
    intro: en
      ? "Your application has been received. Keep your file code: it is used to track your application."
      : "Votre dossier est bien enregistré. Gardez votre code dossier : il sert à suivre votre procédure.",
    bodyHtml: `${emailRows([
      [en ? "File code" : "Code dossier", candidate.code],
      [en ? "Target level" : "Niveau visé", optionLabel("targetLevel", candidate.targetLevel, candidate.locale)],
      [en ? "Field of study" : "Domaine", candidate.fieldOfStudy],
      ["WhatsApp", candidate.whatsapp],
      ["Email", candidate.email],
    ])}
      <p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#0B0B0D;background:#F4F4F6;border-left:3px solid #FF0000;padding:12px 14px;border-radius:0 8px 8px 0">${
        en
          ? "<b>Your contact channels:</b> all information about your application (progress, documents to provide, proposals) will be sent to you only on the WhatsApp number and email address above. If one of them is wrong, reply to us on WhatsApp."
          : "<b>Vos canaux de contact :</b> toutes les informations liées à votre procédure (avancement du dossier, documents à fournir, propositions) vous seront communiquées uniquement sur le numéro WhatsApp et l'adresse email ci-dessus. Si l'un d'eux est erroné, signalez-le-nous sur WhatsApp."
      }</p>
      <p style="margin:16px 0 0;font-size:14px;color:#5B5B66">${
        en
          ? "Next step: our team reviews your profile and gets back to you within 48 hours."
          : "Prochaine étape : notre équipe étudie votre profil et revient vers vous sous 48 heures."
      }</p>`,
  });

  return deliver("EMAIL", candidate.email, () => sendEmail(candidate.email!, subject, html), {
    subject,
    candidateId: candidate.id,
  });
}

/** Lien de réinitialisation du mot de passe (valable 1 heure, usage unique). */
export async function sendPasswordResetEmail(user: { email: string; name: string | null }, link: string) {
  const subject = "Réinitialisation de votre mot de passe — Odysseo";
  const html = emailLayout({
    title: "Réinitialiser votre mot de passe",
    intro: `Bonjour${user.name ? ` ${user.name.split(/\s+/)[0]}` : ""}, une demande de réinitialisation a été faite pour votre compte de l'espace équipe.`,
    bodyHtml: `<p style="margin:0;font-size:14px;color:#5B5B66">Ce lien est valable <b>1 heure</b> et ne peut servir qu'une seule fois. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe actuel reste inchangé.</p>
      <p style="margin:16px 0 0;font-size:12px;color:#5B5B66;word-break:break-all">Lien direct : ${escapeHtml(link)}</p>`,
    cta: { label: "Choisir un nouveau mot de passe", url: link },
  });
  return deliver("EMAIL", user.email, () => sendEmail(user.email, subject, html), { subject });
}

/** Alerte de sécurité après un changement de mot de passe. */
export async function sendPasswordChangedEmail(user: { email: string }) {
  const subject = "Votre mot de passe a été modifié — Odysseo";
  const html = emailLayout({
    title: "Mot de passe modifié",
    intro: `Le mot de passe de votre compte a été modifié le ${new Date().toLocaleString("fr-FR")}.`,
    bodyHtml: `<p style="margin:0;font-size:14px;color:#5B5B66">Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement un administrateur.</p>`,
    cta: { label: "Se connecter", url: teamUrl("/fr/login") },
  });
  return deliver("EMAIL", user.email, () => sendEmail(user.email, subject, html), { subject });
}
