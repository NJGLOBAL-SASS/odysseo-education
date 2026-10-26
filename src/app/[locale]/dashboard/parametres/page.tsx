import { getTranslations } from "next-intl/server";
import { Mail, Smartphone, BellRing } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkBrevoAccount } from "@/lib/notifications/email";
import { isPushConfigured } from "@/lib/notifications/push";
import { checkSheetsAccess } from "@/lib/google-sheets";
import { APP_TIME_ZONE } from "@/lib/utils";
import { TwoFactorSetup } from "@/components/dashboard/two-factor-setup";
import { PushSubscribeButton } from "@/components/dashboard/push-subscribe-button";
import {
  ChannelHealthList,
  NotificationPreferences,
  type ChannelHealth,
} from "@/components/dashboard/notification-settings";

const LOG_STATUS = {
  SENT: "bg-[#E1F6EA] text-ok",
  SKIPPED: "bg-fond text-gris",
  FAILED: "bg-erreur-fond text-erreur",
  PENDING: "bg-[#FFF3D6] text-[#8A6200]",
};
const LOG_LABEL = { SENT: "Envoyé", SKIPPED: "Non envoyé", FAILED: "Échec", PENDING: "En attente" };
const CHANNEL_ICONS = { EMAIL: Mail, WHATSAPP: Smartphone, PUSH: BellRing };

export default async function DashboardSettingsPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations("dashboard.settings");
  const session = await auth();
  const userId = session?.user?.id;

  const [user, brevo, sheets, pushSubs, mySubs, logs, recentFailures] = await Promise.all([
    userId ? prisma.user.findUnique({ where: { id: userId }, include: { notificationPrefs: true } }) : null,
    checkBrevoAccount(),
    checkSheetsAccess(),
    prisma.pushSubscription.count(),
    userId ? prisma.pushSubscription.count({ where: { userId } }) : 0,
    prisma.notificationLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.notificationLog.groupBy({
      by: ["channel"],
      where: { status: "FAILED", createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      _count: true,
    }),
  ]);

  const failures = new Map(recentFailures.map((f) => [f.channel, f._count]));
  const waConfigured = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);

  const channels: ChannelHealth[] = [
    {
      key: "EMAIL",
      name: "Email (Brevo)",
      state: brevo.ok ? (failures.get("EMAIL") ? "warning" : "ok") : "error",
      detail: brevo.ok
        ? `${brevo.detail} · expéditeur ${process.env.BREVO_SENDER_EMAIL ?? "par défaut"}${
            failures.get("EMAIL") ? ` · ${failures.get("EMAIL")} échec(s) cette semaine` : ""
          }`
        : brevo.detail,
      testable: brevo.ok,
    },
    {
      key: "PUSH",
      name: "Notifications push",
      state: !isPushConfigured() ? "error" : pushSubs === 0 ? "warning" : "ok",
      detail: !isPushConfigured()
        ? "Clés VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquantes"
        : `${pushSubs} appareil(s) abonné(s) dans l'équipe, dont ${mySubs} pour vous`,
      testable: isPushConfigured() && mySubs > 0,
    },
    {
      key: "WHATSAPP",
      name: "WhatsApp (Cloud API Meta)",
      state: waConfigured ? "ok" : "error",
      detail: waConfigured
        ? `Alertes envoyées au ${process.env.WHATSAPP_ADMIN_NUMBER ?? "—"} (messages libres : fenêtre de 24 h)`
        : "WHATSAPP_PHONE_NUMBER_ID et WHATSAPP_ACCESS_TOKEN non renseignés",
      testable: waConfigured,
    },
    {
      key: "SHEETS",
      name: "Copie Google Sheets",
      state: sheets.ok ? "ok" : "error",
      detail: sheets.detail,
      testable: false,
    },
  ];

  const dateTime = new Intl.DateTimeFormat(params.locale, { dateStyle: "short", timeStyle: "short", timeZone: APP_TIME_ZONE });

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <p className="page-eyebrow">Compte & système</p>
        <h1 className="page-title">{t("title")}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 lg:col-span-2">
          <h2 className="section-title mb-1">Canaux de notification</h2>
          <p className="mb-4 text-xs text-gris">État vérifié en direct à l&apos;ouverture de cette page.</p>
          <ChannelHealthList channels={channels} />
        </section>

        <section className="card p-5">
          <h2 className="section-title mb-1">{t("notifications")}</h2>
          <p className="mb-4 text-xs text-gris">Ce que vous recevez à l&apos;arrivée d&apos;un dossier.</p>
          <NotificationPreferences
            initial={{
              // Sans préférence enregistrée, l'email part seulement si l'adresse figure dans NOTIFY_ADMIN_EMAILS.
              emailOnNewLead:
                user?.notificationPrefs?.emailOnNewLead ??
                (process.env.NOTIFY_ADMIN_EMAILS ?? "")
                  .toLowerCase()
                  .split(",")
                  .map((e) => e.trim())
                  .includes(user?.email.toLowerCase() ?? ""),
              pushOnNewLead: user?.notificationPrefs?.pushOnNewLead ?? true,
            }}
          />
          <div className="mt-5 border-t border-bord pt-4">
            <p className="mb-2 text-sm font-semibold">Cet appareil</p>
            <PushSubscribeButton />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="section-title mb-1">{t("twoFactor")}</h2>
          <p className="mb-4 text-xs text-gris">
            Ajoutez une couche de sécurité avec une application d&apos;authentification (Google Authenticator,
            Authy...).
          </p>
          <TwoFactorSetup enabled={Boolean(user?.twoFactorEnabled)} />
        </section>

        <section className="card overflow-hidden lg:col-span-2">
          <div className="p-5 pb-3">
            <h2 className="section-title">Journal des notifications</h2>
            <p className="text-xs text-gris">Les 12 derniers envois, tous canaux confondus.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-2.5">Canal</th>
                  <th className="px-5 py-2.5">Destinataire</th>
                  <th className="px-5 py-2.5">Objet / détail</th>
                  <th className="px-5 py-2.5">Statut</th>
                  <th className="px-5 py-2.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bord">
                {logs.map((log) => {
                  const Icon = CHANNEL_ICONS[log.channel];
                  return (
                    <tr key={log.id}>
                      <td className="px-5 py-2.5">
                        <Icon className="h-4 w-4 text-gris" aria-label={log.channel} />
                      </td>
                      <td className="max-w-[200px] truncate px-5 py-2.5">{log.recipient}</td>
                      <td className="max-w-[260px] px-5 py-2.5">
                        <span className="block truncate">{log.subject ?? "—"}</span>
                        {log.error && (
                          <span className="block truncate text-xs text-gris" title={log.error}>
                            {log.error}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${LOG_STATUS[log.status]}`}>
                          {LOG_LABEL[log.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-right text-xs text-gris">
                        {dateTime.format(log.createdAt)}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gris">
                      Aucun envoi journalisé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
