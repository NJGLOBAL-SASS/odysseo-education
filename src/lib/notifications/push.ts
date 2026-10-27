import webpush from "web-push";

import { badgeTotal, getDashboardCounts } from "@/lib/dashboard-counts";
import { prisma } from "@/lib/prisma";

let configured = false;

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensureConfigured() {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;

  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:contact.odysseo@gmail.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  configured = true;
  return true;
}

type PushPayload = { title: string; body: string; url?: string };

/**
 * Envoie une notification aux appareils abonnés. Sans `userId`, cible tous
 * les membres de l'équipe qui n'ont pas désactivé les alertes "nouveau dossier".
 * Avec `badge` (alertes réelles, pas les tests), chaque appareil reçoit aussi le
 * total de nouveautés de son membre, affiché en pastille sur l'icône de l'application.
 */
export async function sendPush(payload: PushPayload, opts: { userId?: string; badge?: boolean } = {}) {
  if (!ensureConfigured()) {
    console.warn("[push] VAPID non configuré — notification push non envoyée.");
    return { sent: 0, total: 0, reason: "Clés VAPID non configurées" };
  }

  const optedOut = opts.userId
    ? []
    : (
        await prisma.notificationPreference.findMany({
          where: { pushOnNewLead: false },
          select: { userId: true },
        })
      ).map((p) => p.userId);

  const subscriptions = await prisma.pushSubscription.findMany({
    where: opts.userId
      ? { userId: opts.userId }
      : { OR: [{ userId: null }, { userId: { notIn: optedOut } }] },
  });
  let sent = 0;
  let lastError = "";

  const badges = new Map<string, number>();
  if (opts.badge) {
    const userIds = [...new Set(subscriptions.map((s) => s.userId).filter((id): id is string => !!id))];
    await Promise.all(
      userIds.map(async (id) => badges.set(id, badgeTotal(await getDashboardCounts(id))))
    );
  }

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(sub.userId && badges.has(sub.userId) ? { ...payload, badge: badges.get(sub.userId) } : payload)
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        lastError = String((err as { body?: string })?.body || err);
        if (statusCode === 410 || statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );

  const reason =
    subscriptions.length === 0 ? "Aucun appareil abonné aux notifications push" : lastError || undefined;
  return { sent, total: subscriptions.length, reason };
}
