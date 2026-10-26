import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { Trophy, Users, MousePointerClick } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { findPartnerByCode } from "@/lib/points";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { referralLink } from "@/lib/referral";
import { APP_TIME_ZONE } from "@/lib/utils";
import { optionLabel } from "@/lib/intake-labels";

export default async function PartnerStatsPage({
  params,
}: {
  params: { locale: string; code: string };
}) {
  const t = await getTranslations("partner");
  const partner = await findPartnerByCode(params.code);
  if (!partner) notFound();

  const [candidates, rank, clicks] = await Promise.all([
    prisma.candidate.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.partner.count({
      where: { pointsBalance: { gt: partner.pointsBalance }, status: "ACTIVE" },
    }),
    prisma.referralEvent.count({ where: { partnerId: partner.id, type: "LINK_CLICK" } }),
  ]);

  const link = referralLink(partner.referralCode);
  const qr = await QRCode.toDataURL(link, { width: 280, margin: 1 });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">{t("title")}</h1>
      <p className="mb-6 text-gris">{partner.fullName}</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <MousePointerClick className="mb-2 h-5 w-5 text-rouge" />
          <p className="text-2xl font-extrabold">{clicks}</p>
          <p className="text-sm text-gris">Clics sur votre lien</p>
        </div>
        <div className="card p-5">
          <p className="text-2xl font-extrabold">#{rank + 1}</p>
          <p className="text-sm text-gris">{t("leaderboard")}</p>
        </div>
      </div>

      <div className="card mb-6 flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR code de votre lien" className="h-32 w-32 flex-shrink-0 rounded-[10px] border border-bord" />
        <div className="min-w-0 flex-1">
          <h2 className="mb-1 font-extrabold">{t("yourLink")}</h2>
          <p className="mb-3 text-sm text-gris">
            Partagez ce lien ou ce QR code : les personnes qui remplissent le formulaire depuis celui-ci vous sont
            attribuées automatiquement, sans code à saisir.
          </p>
          <CopyLinkButton link={link} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-bord text-gris">
            <tr>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Nom</th>
              <th className="px-4 py-3 font-semibold">Niveau</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bord">
            {candidates.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                <td className="px-4 py-3">{c.fullName}</td>
                <td className="px-4 py-3">{optionLabel("targetLevel", c.targetLevel, params.locale)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} locale={params.locale} />
                </td>
                <td className="px-4 py-3 text-gris">
                  {new Intl.DateTimeFormat(params.locale, { timeZone: APP_TIME_ZONE }).format(c.createdAt)}
                </td>
              </tr>
            ))}
            {candidates.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gris">
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
