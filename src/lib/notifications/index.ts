import type { Candidate, NotificationChannel, Partner, PartnerApplication } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { APP_TIME_ZONE } from "@/lib/utils";
import { optionLabel } from "@/lib/intake-labels";
import { publicSiteUrl, referralLink } from "@/lib/referral";
import { sendEmail, emailLayout, emailRows, escapeHtml, textToHtml, styleRichHtml, type EmailAttachment } from "./email";
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
      () => sendPush({ title: "Nouvelle candidature", body: summary, url: detailPath }, { badge: true }),
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
      bodyHtml: emailRows([["Envoyé le", new Date().toLocaleString("fr-FR", { timeZone: APP_TIME_ZONE })]]),
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
    intro: `Le mot de passe de votre compte a été modifié le ${new Date().toLocaleString("fr-FR", { timeZone: APP_TIME_ZONE })}.`,
    bodyHtml: `<p style="margin:0;font-size:14px;color:#5B5B66">Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement un administrateur.</p>`,
    cta: { label: "Se connecter", url: teamUrl("/fr/login") },
  });
  return deliver("EMAIL", user.email, () => sendEmail(user.email, subject, html), { subject });
}

/** Invitation d'un nouveau membre : lien pour choisir son mot de passe (valable 7 jours). */
export async function sendTeamInvitationEmail(
  invitee: { email: string; name: string | null },
  invitedBy: string,
  link: string,
  loginUrl: string
) {
  const subject = "Invitation à l'espace équipe Odysseo Education";
  const html = emailLayout({
    title: `Bienvenue dans l'équipe${invitee.name ? `, ${invitee.name.split(/\s+/)[0]}` : ""} !`,
    intro: `${invitedBy} vous a ajouté(e) à l'espace équipe d'Odysseo Education (suivi des candidatures et des partenaires).`,
    bodyHtml: `<p style="margin:0;font-size:14px;color:#5B5B66">Pour activer votre compte, choisissez votre mot de passe avec le bouton ci-dessous. Ce lien est valable <b>7 jours</b> et ne sert qu'une fois.</p>
      <p style="margin:12px 0 0;font-size:14px;color:#5B5B66">Vous pouvez aussi vous connecter directement avec <b>Google</b> si ${escapeHtml(invitee.email)} est une adresse Google, depuis ${escapeHtml(loginUrl)}.</p>
      <p style="margin:16px 0 0;font-size:12px;color:#5B5B66;word-break:break-all">Lien direct : ${escapeHtml(link)}</p>`,
    cta: { label: "Activer mon compte", url: link },
  });
  return deliver("EMAIL", invitee.email, () => sendEmail(invitee.email, subject, html), { subject });
}

const PROFILE_LABELS: Record<string, { fr: string; en: string }> = {
  student: { fr: "Étudiant(e) / ancien(ne) étudiant(e)", en: "Student / alumni" },
  teacher: { fr: "Enseignant(e) / encadrant(e)", en: "Teacher / mentor" },
  agency: { fr: "Agence / consultant(e)", en: "Agency / consultant" },
  creator: { fr: "Créateur(trice) de contenu", en: "Content creator" },
  other: { fr: "Autre", en: "Other" },
};

export function partnerProfileLabel(profile: string, locale = "fr") {
  const entry = PROFILE_LABELS[profile];
  return entry ? entry[locale === "en" ? "en" : "fr"] : profile;
}

/** Nouvelle demande de partenariat : accusé de réception au demandeur + alerte équipe. */
export async function notifyPartnerApplication(app: PartnerApplication) {
  const en = app.locale === "en";
  const firstName = app.fullName.trim().split(/\s+/)[0] ?? "";
  const ackSubject = en ? "We received your partnership request" : "Nous avons bien reçu votre demande de partenariat";
  const ackHtml = emailLayout({
    title: en ? `Thank you ${firstName}!` : `Merci ${firstName} !`,
    intro: en
      ? "Your request to join the Odysseo Education partner program has been received. Our team reviews every request and will reply to you by email."
      : "Votre demande pour rejoindre le programme partenaires d'Odysseo Education est bien enregistrée. Notre équipe étudie chaque demande et vous répondra par email.",
    bodyHtml: emailRows([
      [en ? "Name" : "Nom", app.fullName],
      ["WhatsApp", app.whatsapp],
      [en ? "Profile" : "Profil", partnerProfileLabel(app.profile, app.locale)],
      [en ? "Country / city" : "Pays / ville", `${app.country}, ${app.city}`],
    ]),
  });

  const teamSubject = `Nouvelle demande de partenariat — ${app.fullName}`;
  const teamHtml = emailLayout({
    title: "Nouvelle demande de partenariat",
    intro: "À examiner dans le tableau de bord (Partenaires → Demandes).",
    bodyHtml: `${emailRows([
      ["Nom", app.fullName],
      ["Email", app.email],
      ["WhatsApp", app.whatsapp],
      ["Pays / ville", `${app.country}, ${app.city}`],
      ["Profil", partnerProfileLabel(app.profile)],
    ])}<p style="margin:16px 0 4px;font-size:13px;color:#5B5B66">Motivation :</p>${textToHtml(app.motivation)}`,
    cta: { label: "Examiner la demande", url: teamUrl("/fr/dashboard/partenaires?onglet=demandes") },
  });

  const recipients = await staffEmailRecipients();
  await Promise.all([
    deliver("EMAIL", app.email, () => sendEmail(app.email, ackSubject, ackHtml), { subject: ackSubject }),
    ...recipients.map((to) => deliver("EMAIL", to, () => sendEmail(to, teamSubject, teamHtml), { subject: teamSubject })),
    deliver(
      "PUSH",
      "équipe",
      () =>
        sendPush({
          title: "Nouvelle demande de partenariat",
          body: `${app.fullName} · ${app.country}`,
          url: "/fr/dashboard/partenaires?onglet=demandes",
        }, { badge: true }),
      { subject: "Demande de partenariat" }
    ),
  ]);
}

/** Décision de l'équipe envoyée au demandeur, avec le message rédigé dans le dashboard. */
export async function sendPartnerApplicationDecision(
  app: PartnerApplication,
  decision: "APPROVED" | "REJECTED",
  note: string,
  partner?: Partner | null
) {
  const en = app.locale === "en";
  const firstName = app.fullName.trim().split(/\s+/)[0] ?? "";
  const noteHtml = note.trim() ? textToHtml(note) : "";

  if (decision === "APPROVED" && partner) {
    const link = referralLink(partner.referralCode);
    const portal = `${publicSiteUrl()}/${en ? "en" : "fr"}/espace-partenaire/${partner.referralCode}`;
    const subject = en ? "Your partnership request has been accepted 🎉" : "Votre demande de partenariat est acceptée 🎉";
    const html = emailLayout({
      title: en ? `Welcome aboard, ${firstName}!` : `Bienvenue parmi nos partenaires, ${firstName} !`,
      intro: en
        ? "Share your personal link: everyone who applies through it is automatically credited to you, no code to type."
        : "Partagez votre lien personnel : chaque personne qui dépose son dossier depuis ce lien vous est attribuée automatiquement, sans code à taper.",
      bodyHtml: `${noteHtml}${emailRows([
        [en ? "Your code" : "Votre code", partner.referralCode],
        [en ? "Your link" : "Votre lien", link],
      ])}<p style="margin:16px 0 0;font-size:14px;color:#5B5B66">${
        en ? "Track your referrals and points in your partner area:" : "Suivez vos dossiers et vos points dans votre espace partenaire :"
      } <a href="${escapeHtml(portal)}" style="color:#0B0B0D;font-weight:700">${escapeHtml(portal)}</a></p>`,
      cta: { label: en ? "Open my link" : "Ouvrir mon lien", url: link },
    });
    return deliver("EMAIL", app.email, () => sendEmail(app.email, subject, html), { subject });
  }

  const subject = en ? "About your partnership request" : "Votre demande de partenariat";
  const html = emailLayout({
    title: en ? `Hello ${firstName},` : `Bonjour ${firstName},`,
    intro: en
      ? "Thank you for your interest in the Odysseo Education partner program. After review, we are unable to accept your request at this time."
      : "Merci pour l'intérêt que vous portez au programme partenaires d'Odysseo Education. Après étude, nous ne pouvons pas donner suite à votre demande pour le moment.",
    bodyHtml: noteHtml,
  });
  return deliver("EMAIL", app.email, () => sendEmail(app.email, subject, html), { subject });
}

/** Email rédigé dans le dashboard et envoyé à un candidat (réponses vers l'auteur). */
export async function sendCandidateEmail(
  candidate: Candidate,
  message: { subject: string; html: string; attachments: EmailAttachment[] },
  sender: { email: string; name: string | null }
) {
  const to = candidate.email!;
  const html = emailLayout({
    title: message.subject,
    intro: `${candidate.locale === "en" ? "File" : "Dossier"} ${candidate.code}`,
    bodyHtml: styleRichHtml(message.html),
    footer:
      candidate.locale === "en"
        ? `Odysseo Education — ${sender.name ?? "the team"}. You can reply directly to this email.`
        : `Odysseo Education — ${sender.name ?? "l'équipe"}. Vous pouvez répondre directement à cet email.`,
  });

  let error: string | undefined;
  const ok = await deliver(
    "EMAIL",
    to,
    async () => {
      try {
        return await sendEmail(to, message.subject, html, {
          attachments: message.attachments,
          replyTo: { email: sender.email, name: sender.name ?? undefined },
        });
      } catch (err) {
        error = String(err).slice(0, 500);
        throw err;
      }
    },
    { subject: message.subject, candidateId: candidate.id }
  );
  return { ok, error };
}
