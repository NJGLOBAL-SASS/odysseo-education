import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, MessageCircle, Link2, PenLine, Globe, Mail, Smartphone, BellRing, Paperclip } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { optionLabel } from "@/lib/intake-labels";
import { APP_TIME_ZONE } from "@/lib/utils";
import { StatusUpdater } from "@/components/dashboard/status-updater";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { InternalNotes } from "@/components/dashboard/internal-notes";
import { EmailComposerButton } from "@/components/dashboard/email-composer";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-4 border-b border-bord py-2.5 text-sm last:border-0">
      <dt className="text-gris">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="section-title mb-2">{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}

const CHANNEL_ICONS = { EMAIL: Mail, WHATSAPP: Smartphone, PUSH: BellRing };
const LOG_STATUS = {
  SENT: "bg-[#E1F6EA] text-ok",
  SKIPPED: "bg-fond text-gris",
  FAILED: "bg-erreur-fond text-erreur",
  PENDING: "bg-[#FFF3D6] text-[#8A6200]",
};

type StoredAttachment = { name: string; size: number };

export default async function CandidateDetailPage({ params }: { params: { locale: string; id: string } }) {
  const [candidate, session, t] = await Promise.all([
    prisma.candidate.findUnique({
      where: { id: params.id },
      include: {
        partner: true,
        notificationLogs: { orderBy: { createdAt: "desc" } },
        pointsLedgerEntries: { orderBy: { createdAt: "desc" } },
        messages: { orderBy: { createdAt: "desc" }, include: { sentBy: { select: { name: true, email: true } } } },
      },
    }),
    auth(),
    getTranslations("dashboard.candidate"),
  ]);
  if (!candidate) notFound();

  const L = params.locale;
  const r = (key: string) => t(`rows.${key}`);
  const dateTime = new Intl.DateTimeFormat(L, { dateStyle: "medium", timeStyle: "short", timeZone: APP_TIME_ZONE });
  const viaLink = Boolean(candidate.partner) && candidate.srcParam?.toUpperCase() === candidate.partner?.referralCode;
  // Alertes envoyées à l'équipe uniquement (les emails au candidat ont leur propre historique).
  const teamAlerts = candidate.notificationLogs.filter((log) => log.recipient !== candidate.email);

  return (
    <div>
      <Link
        href="/dashboard/candidatures"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gris hover:text-noir"
      >
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="page-eyebrow font-mono !normal-case !tracking-normal">{candidate.code}</p>
          <h1 className="page-title break-words">{candidate.fullName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gris">
            <StatusBadge status={candidate.status} locale={L} />
            <span>
              {candidate.country}, {candidate.city} · {t("receivedOn", { date: dateTime.format(candidate.createdAt) })}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`https://wa.me/${candidate.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-sm bg-[#1FAF55] text-white hover:bg-[#1A9A4A]"
          >
            <MessageCircle className="h-4 w-4" /> {t("whatsapp")}
          </a>
          <EmailComposerButton
            candidate={{ id: candidate.id, email: candidate.email, code: candidate.code, fullName: candidate.fullName }}
            senderEmail={session?.user?.email ?? ""}
          />
          <StatusUpdater candidateId={candidate.id} currentStatus={candidate.status} locale={L} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 md:grid-cols-2 lg:col-span-2">
          <Section title={t("sections.you")}>
            <Row label={r("whatsapp")} value={candidate.whatsapp} />
            <Row label={r("email")} value={candidate.email ?? r("notProvided")} />
            <Row label={r("birthDate")} value={new Intl.DateTimeFormat(L, { timeZone: "UTC" }).format(candidate.dateOfBirth)} />
            <Row label={r("age")} value={candidate.age != null ? t("rows.ageValue", { age: candidate.age }) : null} />
            <Row label={r("country")} value={candidate.country} />
            <Row label={r("city")} value={candidate.city} />
            <Row label={r("managedBy")} value={optionLabel("managedBy", candidate.managedBy, L)} />
            <Row label={r("guardian")} value={candidate.guardianName} />
            <Row label={r("guardianLink")} value={optionLabel("guardianLink", candidate.guardianLink, L)} />
            <Row label={r("guardianWhatsapp")} value={candidate.guardianWhatsapp} />
          </Section>

          <Section title={t("sections.background")}>
            <Row label={r("situation")} value={optionLabel("currentSituation", candidate.currentSituation, L)} />
            <Row label={r("degree")} value={candidate.highestDegree} />
            <Row label={r("degreeYear")} value={candidate.degreeYear} />
            <Row label={r("average")} value={candidate.degreeAverage} />
          </Section>

          <Section title={t("sections.project")}>
            <Row label={r("level")} value={optionLabel("targetLevel", candidate.targetLevel, L)} />
            <Row label={r("field")} value={candidate.fieldOfStudy} />
            <Row label={r("passport")} value={optionLabel("passportStatus", candidate.passportStatus, L)} />
            <Row label={r("english")} value={optionLabel("englishLevel", candidate.englishLevel, L)} />
            <Row label={r("funding")} value={optionLabel("fundingPlan", candidate.fundingPlan, L)} />
            <Row label={r("intake")} value={optionLabel("targetIntake", candidate.targetIntake, L)} />
          </Section>

          <Section title={t("sections.origin")}>
            {candidate.partner ? (
              <div className="mb-2 flex items-start gap-3 rounded-[10px] bg-fond p-3">
                {viaLink ? <Link2 className="mt-0.5 h-4 w-4 text-rouge" /> : <PenLine className="mt-0.5 h-4 w-4 text-gris" />}
                <div className="text-sm">
                  <p className="font-semibold">{candidate.partner.fullName}</p>
                  <p className="text-xs text-gris">
                    <span className="font-mono">{candidate.partner.referralCode}</span> · {viaLink ? t("viaLink") : t("viaCode")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-2 flex items-center gap-3 rounded-[10px] bg-fond p-3 text-sm">
                <Globe className="h-4 w-4 text-gris" /> {t("directArrival")}
              </div>
            )}
            <Row label={r("typedCode")} value={!viaLink ? candidate.referredByPartnerDeclared : null} />
            <Row label={r("discovery")} value={optionLabel("discoverySource", candidate.discoverySource, L)} />
            <Row
              label={r("formLanguage")}
              value={candidate.locale === "en" ? (L === "en" ? "English" : "Anglais") : L === "en" ? "French" : "Français"}
            />
            <Row
              label={r("duration")}
              value={
                candidate.submissionDurationSec
                  ? t("rows.durationValue", {
                      min: Math.floor(candidate.submissionDurationSec / 60),
                      sec: candidate.submissionDurationSec % 60,
                    })
                  : null
              }
            />
          </Section>

          <section className="card p-5 md:col-span-2">
            <h2 className="section-title mb-3">{t("messages")}</h2>
            {candidate.messages.length === 0 ? (
              <p className="text-sm text-gris">{t("noMessages")}</p>
            ) : (
              <ul className="divide-y divide-bord">
                {candidate.messages.map((m) => {
                  const files = (m.attachments as StoredAttachment[] | null) ?? [];
                  return (
                    <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                      <details>
                        <summary className="flex cursor-pointer list-none items-start gap-3">
                          <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-gris" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{m.subject}</span>
                            <span className="block text-xs text-gris">
                              {dateTime.format(m.createdAt)}
                              {m.sentBy && ` · ${t("sentBy", { name: m.sentBy.name || m.sentBy.email })}`}
                              {files.length > 0 && (
                                <>
                                  {" · "}
                                  <Paperclip className="mb-0.5 inline h-3 w-3" /> {t("attachmentsCount", { count: files.length })}
                                </>
                              )}
                            </span>
                          </span>
                          {m.status !== "SENT" && (
                            <span
                              className="rounded-full bg-erreur-fond px-2 py-0.5 text-[11px] font-semibold text-erreur"
                              title={m.error ?? undefined}
                            >
                              {t("messageFailed")}
                            </span>
                          )}
                        </summary>
                        {/* HTML nettoyé à l'enregistrement (liste blanche, voir lib/html-sanitize). */}
                        <div
                          className="rich-content mt-3 rounded-[10px] bg-fond p-3.5 text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: m.html }}
                        />
                        {files.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {files.map((f, i) => (
                              <li key={i} className="rounded-md border border-bord px-2 py-0.5 text-xs text-gris">
                                {f.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="section-title mb-1">{t("notes")}</h2>
            <p className="mb-3 text-xs text-gris">{t("notesHint")}</p>
            <InternalNotes candidateId={candidate.id} initial={candidate.internalNotes ?? ""} />
          </section>

          {candidate.pointsLedgerEntries.length > 0 && (
            <section className="card p-5">
              <h2 className="section-title mb-3">{t("points")}</h2>
              <ul className="space-y-2 text-sm">
                {candidate.pointsLedgerEntries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3">
                    <span>
                      {t(`pointsReasons.${e.reason}`)}
                      <span className="block text-xs text-gris">{dateTime.format(e.createdAt)}</span>
                    </span>
                    <span className="font-bold tabular-nums text-ok">+{e.points}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-5">
            <h2 className="section-title mb-3">{t("alerts")}</h2>
            {teamAlerts.length === 0 ? (
              <p className="text-sm text-gris">{t("noAlerts")}</p>
            ) : (
              <ul className="space-y-2.5">
                {teamAlerts.map((log) => {
                  const Icon = CHANNEL_ICONS[log.channel];
                  return (
                    <li key={log.id} className="flex items-start gap-2.5 text-sm" title={log.error ?? undefined}>
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gris" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{log.recipient}</span>
                        {log.error && <span className="block truncate text-xs text-gris">{log.error}</span>}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${LOG_STATUS[log.status]}`}>
                        {t(`logStatus.${log.status}`)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
