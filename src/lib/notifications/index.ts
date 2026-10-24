import type { Candidate } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "./email";
import { sendWhatsAppMessage } from "./whatsapp";
import { sendPushToAllSubscribers } from "./push";

/**
 * Déclenché à chaque nouvelle candidature. Envoie une alerte à l'équipe sur
 * les 3 canaux configurés (email / WhatsApp / push) et journalise le résultat
 * dans NotificationLog — chaque canal est indépendant : l'échec de l'un
 * n'empêche pas les autres.
 */
export async function notifyNewCandidate(candidate: Candidate) {
  const adminEmails = (process.env.NOTIFY_ADMIN_EMAILS || "admin@odysseo-education.com").split(",");
  const adminWhatsApp = process.env.WHATSAPP_ADMIN_NUMBER;

  const subject = `Nouveau dossier — ${candidate.fullName} (${candidate.code})`;
  const summary = `${candidate.fullName} · ${candidate.country}, ${candidate.city} · Niveau : ${candidate.targetLevel}`;

  await Promise.all([
    ...adminEmails.map(async (to) => {
      const log = await prisma.notificationLog.create({
        data: { channel: "EMAIL", recipient: to.trim(), subject, candidateId: candidate.id },
      });
      try {
        await sendEmail(
          to.trim(),
          subject,
          `<p>Nouvelle candidature reçue.</p><p>${summary}</p><p>Code dossier : <b>${candidate.code}</b></p>`
        );
        await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "SENT" } });
      } catch (err) {
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: { status: "FAILED", error: String(err) },
        });
      }
    }),

    (async () => {
      if (!adminWhatsApp) return;
      const log = await prisma.notificationLog.create({
        data: { channel: "WHATSAPP", recipient: adminWhatsApp, candidateId: candidate.id },
      });
      try {
        await sendWhatsAppMessage(adminWhatsApp, `Nouveau dossier Odysseo : ${summary} (${candidate.code})`);
        await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "SENT" } });
      } catch (err) {
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: { status: "FAILED", error: String(err) },
        });
      }
    })(),

    (async () => {
      const log = await prisma.notificationLog.create({
        data: { channel: "PUSH", recipient: "staff", candidateId: candidate.id },
      });
      try {
        await sendPushToAllSubscribers({
          title: "Nouvelle candidature",
          body: summary,
          url: `/dashboard/candidatures/${candidate.id}`,
        });
        await prisma.notificationLog.update({ where: { id: log.id }, data: { status: "SENT" } });
      } catch (err) {
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: { status: "FAILED", error: String(err) },
        });
      }
    })(),
  ]);
}
