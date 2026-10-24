import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Trophy, Users } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { findPartnerByCode } from "@/lib/points";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { StatusBadge } from "@/components/dashboard/status-badge";

export default async function PartnerStatsPage({
  params,
}: {
  params: { locale: string; code: string };
}) {
  const t = await getTranslations("partner");
  const partner = await findPartnerByCode(params.code);
  if (!partner) notFound();

  const [candidates, rank] = await Promise.all([
    prisma.candidate.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.partner.count({
      where: { pointsBalance: { gt: partner.pointsBalance }, status: "ACTIVE" },
    }),
  ]);

  const host = headers().get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const link = `${protocol}://${host}/r/${partner.referralCode}`;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">{t("title")}</h1>
      <p className="mb-6 text-gris">{partner.fullName}</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <Trophy className="mb-2 h-5 w-5 text-rouge" />
          <p className="text-2xl font-extrabold">{partner.pointsBalance}</p>
          <p className="text-sm text-gris">{t("points")}</p>
        </div>
        <div className="card p-5">
          <Users className="mb-2 h-5 w-5 text-rouge" />
          <p className="text-2xl font-extrabold">{candidates.length}</p>
          <p className="text-sm text-gris">{t("referred")}</p>
        </div>
        <div className="card p-5">
          <p className="text-2xl font-extrabold">#{rank + 1}</p>
          <p className="text-sm text-gris">{t("leaderboard")}</p>
        </div>
      </div>

      <div className="card mb-6 p-5">
        <h2 className="mb-2 font-extrabold">{t("yourLink")}</h2>
        <CopyLinkButton link={link} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-bord text-gris">
            <tr>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Nom</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bord">
            {candidates.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                <td className="px-4 py-3">{c.fullName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} locale={params.locale} />
                </td>
                <td className="px-4 py-3 text-gris">
                  {new Intl.DateTimeFormat(params.locale).format(c.createdAt)}
                </td>
              </tr>
            ))}
            {candidates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gris">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
