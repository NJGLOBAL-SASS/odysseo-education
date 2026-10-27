import { getTranslations } from "next-intl/server";
import { Mail, Smartphone, BellRing, Sheet, ExternalLink } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkBrevoAccount } from "@/lib/notifications/email";
import { isPushConfigured } from "@/lib/notifications/push";
import { checkSheetsAccess } from "@/lib/google-sheets";
import { APP_TIME_ZONE } from "@/lib/utils";
import { TwoFactorSetup } from "@/components/dashboard/two-factor-setup";
import { PushSubscribeButton } from "@/components/dashboard/push-subscribe-button";
import { InstallAppCard } from "@/components/dashboard/install-app";
import { SettingsNav } from "@/components/dashboard/settings-nav";
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
const CHANNEL_ICONS = { EMAIL: Mail, WHATSAPP: Smartphone, PUSH: BellRing };

export default async function DashboardSettingsPage({ params }: { params: { locale: string } }) {
  const [t, tCand, session] = await Promise.all([
    getTranslations("dashboard.settings"),
    getTranslations("dashboard.candidate"),
    auth(),
  ]);
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

  const health = (r: { code: string; params?: Record<string, string | number> }) => t(`health.${r.code}`, r.params ?? {});
  const failures = new Map(recentFailures.map((f) => [f.channel, f._count]));
  const emailFailures = failures.get("EMAIL") ?? 0;
  const waConfigured = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  const sheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/edit` : null;

  const channels: ChannelHealth[] = [
    {
      key: "EMAIL",
      name: t("channel.email"),
      state: brevo.ok ? (emailFailures ? "warning" : "ok") : "error",
      detail: brevo.ok
        ? t("emailOk", { detail: health(brevo), sender: process.env.BREVO_SENDER_EMAIL ?? "—" }) +
          (emailFailures ? t("emailFailures", { count: emailFailures }) : "")
        : health(brevo),
      testable: brevo.ok,
    },
    {
      key: "PUSH",
      name: t("channel.push"),
      state: !isPushConfigured() ? "error" : pushSubs === 0 ? "warning" : "ok",
      detail: !isPushConfigured() ? t("pushMissing") : t("pushDevices", { total: pushSubs, mine: mySubs }),
      testable: isPushConfigured() && mySubs > 0,
    },
    {
      key: "WHATSAPP",
      name: t("channel.whatsapp"),
      state: waConfigured ? "ok" : "error",
      detail: waConfigured ? t("waOk", { number: process.env.WHATSAPP_ADMIN_NUMBER ?? "—" }) : t("waMissing"),
      testable: waConfigured,
    },
    {
      key: "SHEETS",
      name: t("channel.sheets"),
      state: sheets.ok ? "ok" : "error",
      detail: health(sheets),
      testable: false,
    },
  ];

  const dateTime = new Intl.DateTimeFormat(params.locale, { dateStyle: "short", timeStyle: "short", timeZone: APP_TIME_ZONE });

  const prefsInitial = {
    // Sans préférence enregistrée, l'email part seulement si l'adresse figure dans NOTIFY_ADMIN_EMAILS.
    emailOnNewLead:
      user?.notificationPrefs?.emailOnNewLead ??
      (process.env.NOTIFY_ADMIN_EMAILS ?? "")
        .toLowerCase()
        .split(",")
        .map((e) => e.trim())
        .includes(user?.email.toLowerCase() ?? ""),
    pushOnNewLead: user?.notificationPrefs?.pushOnNewLead ?? true,
  };

  return (
    <div>
      <div className="mb-6">
        <p className="page-eyebrow">{t("eyebrow")}</p>
        <h1 className="page-title">{t("title")}</h1>
      </div>

      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[220px_minmax(0,900px)]">
        <aside>
          <SettingsNav />
        </aside>

        <div className="min-w-0 space-y-10">
          <SettingsSection id="notifications" title={t("sections.notifications")} hint={t("sectionsHint.notifications")}>
            <section className="card p-5">
              <h3 className="section-title mb-1">{t("channels")}</h3>
              <p className="mb-4 text-xs text-gris">{t("channelsHint")}</p>
              <ChannelHealthList channels={channels} />
            </section>
            <section className="card p-5">
              <h3 className="section-title mb-1">{t("notifications")}</h3>
              <p className="mb-4 text-xs text-gris">{t("notificationsHint")}</p>
              <NotificationPreferences initial={prefsInitial} />
              <div className="mt-5 border-t border-bord pt-4">
                <p className="mb-2 text-sm font-semibold">{t("thisDevice")}</p>
                <PushSubscribeButton />
              </div>
            </section>
          </SettingsSection>

          <SettingsSection id="integrations" title={t("sections.integrations")} hint={t("sectionsHint.integrations")}>
            <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#E6F4EA] text-[#188038]">
                <Sheet className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="section-title">{t("sheetTitle")}</h3>
                <p className="text-xs text-gris">{t("sheetText")}</p>
                {process.env.GOOGLE_SHEETS_CLIENT_EMAIL && (
                  <p className="mt-1 text-[11px] text-gris [overflow-wrap:anywhere]">
                    {t("sheetShare", { email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL })}
                  </p>
                )}
              </div>
              {sheetUrl ? (
                <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="btn-sm-dark flex-shrink-0">
                  <ExternalLink className="h-4 w-4" /> {t("sheetOpen")}
                </a>
              ) : (
                <p className="text-sm text-erreur">{t("sheetMissing")}</p>
              )}
            </section>
          </SettingsSection>

          <SettingsSection id="security" title={t("sections.security")} hint={t("sectionsHint.security")}>
            <section className="card p-5">
              <h3 className="section-title mb-1">{t("twoFactor")}</h3>
              <p className="mb-4 text-xs text-gris">{t("twoFactorHint")}</p>
              <TwoFactorSetup enabled={Boolean(user?.twoFactorEnabled)} />
            </section>
          </SettingsSection>

          <SettingsSection id="app" title={t("sections.app")} hint={t("sectionsHint.app")}>
            <InstallAppCard />
          </SettingsSection>

          <SettingsSection id="log" title={t("sections.log")} hint={t("sectionsHint.log")}>
            <section className="card overflow-hidden">
          <div className="p-5 pb-3">
            <h3 className="section-title">{t("log")}</h3>
            <p className="text-xs text-gris">{t("logHint")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-2.5">{t("logColumns.channel")}</th>
                  <th className="px-5 py-2.5">{t("logColumns.recipient")}</th>
                  <th className="px-5 py-2.5">{t("logColumns.subject")}</th>
                  <th className="px-5 py-2.5">{t("logColumns.status")}</th>
                  <th className="px-5 py-2.5 text-right">{t("logColumns.date")}</th>
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
                          {tCand(`logStatus.${log.status}`)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-right text-xs text-gris">{dateTime.format(log.createdAt)}</td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gris">
                      {t("noLog")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}

/** Bloc de section des paramètres (ancre de navigation + titre). */
function SettingsSection({ id, title, hint, children }: { id: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-32 space-y-4 lg:scroll-mt-24">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
        <p className="text-sm text-gris">{hint}</p>
      </div>
      {children}
    </div>
  );
}
