import { getTranslations } from "next-intl/server";
import { Users, TrendingUp, Percent, Trophy } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/stat-card";

export default async function DashboardOverviewPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations("dashboard.overview");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, last7Days, qualifiedOrBetter, topPartners] = await Promise.all([
    prisma.candidate.count(),
    prisma.candidate.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.candidate.count({
      where: { status: { in: ["QUALIFIE", "DOSSIER_EN_COURS", "BOURSE_SOUMISE", "ADMIS", "VISA_EN_COURS"] } },
    }),
    prisma.partner.findMany({
      orderBy: { pointsBalance: "desc" },
      take: 5,
      select: { id: true, fullName: true, referralCode: true, pointsBalance: true },
    }),
  ]);

  const conversion = total > 0 ? Math.round((qualifiedOrBetter / total) * 100) : 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold">{t("title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label={t("totalCandidates")} value={total} />
        <StatCard icon={TrendingUp} label={t("last7Days")} value={last7Days} />
        <StatCard icon={Percent} label={t("conversion")} value={`${conversion}%`} />
        <StatCard icon={Trophy} label={t("topPartners")} value={topPartners.length} />
      </div>

      <div className="mt-8 card p-5">
        <h2 className="mb-4 font-extrabold">{t("topPartners")}</h2>
        {topPartners.length === 0 ? (
          <p className="text-sm text-gris">—</p>
        ) : (
          <ul className="divide-y divide-bord">
            {topPartners.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fond text-xs font-bold text-gris">
                    {i + 1}
                  </span>
                  {p.fullName}
                  <span className="text-gris">· {p.referralCode}</span>
                </span>
                <span className="font-bold">{p.pointsBalance} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
