import { getTranslations } from "next-intl/server";
import { Users, TrendingUp, Percent, GraduationCap, Link2, ArrowRight, Inbox } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";
import { optionLabel } from "@/lib/intake-labels";
import { APP_TIME_ZONE } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge, STATUS_LABELS_FR, STATUS_LABELS_EN } from "@/components/dashboard/status-badge";
import { TrendChart, BarList } from "@/components/dashboard/charts";

const DAY = 24 * 60 * 60 * 1000;
const PIPELINE = Object.keys(STATUS_LABELS_FR);
const QUALIFIED = ["QUALIFIE", "DOSSIER_EN_COURS", "BOURSE_SOUMISE", "ADMIS", "VISA_EN_COURS"];

function pctDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="text-xs text-gris">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function DashboardOverviewPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations("dashboard.overview");
  const tc = await getTranslations("dashboard.common");
  const session = await auth();
  const locale = params.locale;
  const statusLabels = locale === "en" ? STATUS_LABELS_EN : STATUS_LABELS_FR;

  const now = Date.now();
  const since30 = new Date(now - 30 * DAY);
  const since7 = new Date(now - 7 * DAY);
  const since14 = new Date(now - 14 * DAY);

  const [
    total,
    last7,
    prev7,
    byStatus,
    recent30,
    byCountry,
    bySource,
    partnerSourced,
    clicks30,
    referredSubmissions30,
    latest,
    topPartners,
    pendingRequests,
  ] = await Promise.all([
    prisma.candidate.count(),
    prisma.candidate.count({ where: { createdAt: { gte: since7 } } }),
    prisma.candidate.count({ where: { createdAt: { gte: since14, lt: since7 } } }),
    prisma.candidate.groupBy({ by: ["status"], _count: true }),
    prisma.candidate.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } }),
    prisma.candidate.groupBy({ by: ["country"], _count: true, orderBy: { _count: { country: "desc" } }, take: 6 }),
    prisma.candidate.groupBy({ by: ["discoverySource"], _count: true }),
    prisma.candidate.count({ where: { partnerId: { not: null } } }),
    prisma.referralEvent.count({ where: { type: "LINK_CLICK", createdAt: { gte: since30 } } }),
    prisma.referralEvent.count({ where: { type: "FORM_SUBMITTED", createdAt: { gte: since30 } } }),
    prisma.candidate.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        code: true,
        fullName: true,
        country: true,
        targetLevel: true,
        status: true,
        createdAt: true,
        partner: { select: { fullName: true } },
      },
    }),
    prisma.partner.findMany({
      orderBy: { pointsBalance: "desc" },
      take: 5,
      select: {
        id: true,
        fullName: true,
        referralCode: true,
        pointsBalance: true,
        _count: { select: { candidates: true } },
      },
    }),
    prisma.partnerApplication.count({ where: { status: "PENDING" } }),
  ]);

  const statusCount = new Map(byStatus.map((s) => [s.status as string, s._count]));
  const qualified = QUALIFIED.reduce((sum, s) => sum + (statusCount.get(s) ?? 0), 0);
  const admitted = (statusCount.get("ADMIS") ?? 0) + (statusCount.get("VISA_EN_COURS") ?? 0);
  const conversion = total > 0 ? Math.round((qualified / total) * 100) : 0;
  const partnerShare = total > 0 ? Math.round((partnerSourced / total) * 100) : 0;
  const linkConversion = clicks30 > 0 ? Math.round((referredSubmissions30 / clicks30) * 100) : null;

  // Série journalière sur 30 jours (jours sans dossier inclus).
  const perDay = new Map<string, number>();
  for (const c of recent30) {
    const key = c.createdAt.toISOString().slice(0, 10);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const trend = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(now - (29 - i) * DAY).toISOString().slice(0, 10);
    return { date, count: perDay.get(date) ?? 0 };
  });

  const firstName = session?.user?.name?.split(/\s+/)[0];
  const today = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: APP_TIME_ZONE }).format(new Date());
  const b = (chunks: React.ReactNode) => <b className="tabular-nums">{chunks}</b>;
  const deltaLabels = { new: t("deltaNew"), newTitle: t("deltaNewTitle"), title: t("deltaTitle") };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">{today}</p>
          <h1 className="page-title">{firstName ? t("hello", { name: firstName }) : t("title")}</h1>
          <p className="mt-1 text-sm text-gris">{t("intro")}</p>
        </div>
        <Link href="/dashboard/candidatures" className="btn-sm-dark">
          {t("viewCandidates")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {pendingRequests > 0 && (
        <Link
          href="/dashboard/partenaires?onglet=demandes"
          className="flex items-center gap-3 rounded-brand border border-rouge/25 bg-[#FFF6F6] px-4 py-3 text-sm transition-colors hover:bg-[#FFEDED]"
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rouge text-white">
            <Inbox className="h-4 w-4" />
          </span>
          <span className="flex-1 font-semibold">{t("pendingRequests", { count: pendingRequests })}</span>
          <span className="hidden items-center gap-1 text-xs font-semibold text-rouge-fonce sm:flex">
            {t("review")} <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label={t("totalCandidates")} value={total} hint={t("sinceLaunch")} accent />
        <StatCard
          icon={TrendingUp}
          label={t("last7Days")}
          value={last7}
          delta={pctDelta(last7, prev7)}
          deltaLabels={deltaLabels}
          hint={t("previousWeek", { count: prev7 })}
        />
        <StatCard icon={Percent} label={t("conversion")} value={`${conversion}%`} hint={t("qualifiedHint", { count: qualified })} />
        <StatCard icon={GraduationCap} label={t("admitted")} value={admitted} hint={t("admittedHint")} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title={t("trend")} subtitle={t("trendHint", { count: recent30.length })} className="xl:col-span-2">
          <TrendChart data={trend} locale={locale} />
        </Card>

        <Card title={t("referral")} subtitle={t("referralHint")}>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: t("clicks"), value: clicks30 },
              { label: t("files"), value: referredSubmissions30 },
              { label: t("conversionShort"), value: linkConversion == null ? "—" : `${linkConversion}%` },
            ].map((k) => (
              <div key={k.label} className="rounded-[10px] bg-fond px-2 py-3">
                <p className="text-xl font-extrabold tabular-nums">{k.value}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-gris">{k.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-bord px-3 py-2.5 text-sm">
            <Link2 className="h-4 w-4 text-rouge" />
            <span>{t.rich("partnerShare", { pct: partnerShare, b })}</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={t("pipeline")} subtitle={t("pipelineHint")}>
          <BarList
            emptyLabel={t("noData")}
            total={total}
            rows={PIPELINE.map((s) => ({ label: statusLabels[s] ?? s, value: statusCount.get(s) ?? 0 })).filter(
              (r) => r.value > 0
            )}
          />
        </Card>
        <Card title={t("sources")} subtitle={t("sourcesHint")}>
          <BarList
            emptyLabel={t("noData")}
            rows={bySource
              .map((s) => ({
                label: s.discoverySource ? optionLabel("discoverySource", s.discoverySource, locale) : t("notSpecified"),
                value: s._count,
              }))
              .sort((a, b) => b.value - a.value)}
          />
        </Card>
        <Card title={t("countries")} subtitle={t("countriesHint")}>
          <BarList emptyLabel={t("noData")} total={total} rows={byCountry.map((c) => ({ label: c.country, value: c._count }))} />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="card overflow-hidden xl:col-span-2">
          <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
            <h2 className="section-title">{t("latest")}</h2>
            <Link href="/dashboard/candidatures" className="text-xs font-semibold text-gris hover:text-noir">
              {tc("seeAll")}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <tbody className="divide-y divide-bord">
                {latest.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-fond">
                    <td className="py-3 pl-5 pr-3">
                      <Link href={`/dashboard/candidatures/${c.id}`} className="font-semibold hover:underline">
                        {c.fullName}
                      </Link>
                      <p className="font-mono text-[11px] text-gris">{c.code}</p>
                    </td>
                    <td className="px-3 py-3 text-gris">
                      {c.country} · {optionLabel("targetLevel", c.targetLevel, locale)}
                      {c.partner && <p className="text-[11px]">{t("via", { name: c.partner.fullName })}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={c.status} locale={locale} />
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right text-xs text-gris">
                      {new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: APP_TIME_ZONE }).format(c.createdAt)}
                    </td>
                  </tr>
                ))}
                {latest.length === 0 && (
                  <tr>
                    <td className="px-5 py-10 text-center text-gris">{t("noFiles")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <Card
          title={t("topPartners")}
          action={
            <Link href="/dashboard/partenaires" className="text-xs font-semibold text-gris hover:text-noir">
              {tc("manage")}
            </Link>
          }
        >
          {topPartners.length === 0 ? (
            <p className="py-6 text-center text-sm text-gris">{t("noPartners")}</p>
          ) : (
            <ol className="space-y-3">
              {topPartners.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? "bg-rouge text-white" : "bg-fond text-gris"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.fullName}</span>
                    <span className="block font-mono text-[11px] text-gris">
                      {t("partnerFiles", { code: p.referralCode, count: p._count.candidates })}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums">{t("pts", { count: p.pointsBalance })}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
