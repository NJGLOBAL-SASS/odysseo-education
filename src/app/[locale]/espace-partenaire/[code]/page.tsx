import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { Coins, Trophy, Users, MousePointerClick } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";
import { EmailContractButton } from "@/components/contracts/email-contract-button";
import { PartnerLogoutButton } from "@/components/partner-space/logout-button";
import { getPartnerSession } from "@/lib/partner-space/session";
import { PAID_STAGES, shortName, stageIndex } from "@/lib/partner-space/display";
import { STAGES } from "@/lib/tracking-stages";
import { referralLink } from "@/lib/referral";
import { APP_TIME_ZONE } from "@/lib/utils";
import { optionLabel } from "@/lib/intake-labels";

export default async function PartnerStatsPage({
  params,
}: {
  params: { locale: string; code: string };
}) {
  const t = await getTranslations("partner");
  const ts = await getTranslations("partner.space");
  const tStage = await getTranslations("suivi.stages");
  // Accès réservé au partenaire connecté (le code seul est public : il figure dans son lien).
  const partner = await getPartnerSession();
  if (!partner) redirect(`/${params.locale}/espace-partenaire`);
  if (partner.referralCode !== decodeURIComponent(params.code).trim().toUpperCase()) redirect(`/${params.locale}/espace-partenaire/${partner.referralCode}`);

  const [candidates, rank, clicks, pointsByCandidate] = await Promise.all([
    prisma.candidate.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, fullName: true, targetLevel: true, stage: true, stageUpdatedAt: true, createdAt: true },
    }),
    prisma.partner.count({
      where: { pointsBalance: { gt: partner.pointsBalance }, status: "ACTIVE" },
    }),
    prisma.referralEvent.count({ where: { partnerId: partner.id, type: "LINK_CLICK" } }),
    prisma.pointsLedgerEntry.groupBy({ by: ["candidateId"], where: { partnerId: partner.id, candidateId: { not: null } }, _sum: { points: true } }),
  ]);
  const pointsOf = new Map(pointsByCandidate.map((p) => [p.candidateId, p._sum.points ?? 0]));
  const dateFmt = new Intl.DateTimeFormat(params.locale, { timeZone: APP_TIME_ZONE, dateStyle: "medium" });

  const signedContract = await prisma.partnerContract.findFirst({
    where: { partnerId: partner.id, signedAt: { not: null } },
    orderBy: { signedAt: "desc" },
    select: { number: true },
  });
  const link = referralLink(partner.referralCode);
  const qr = await QRCode.toDataURL(link, { width: 280, margin: 1 });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-extrabold">{t("title")}</h1>
          <p className="text-gris">{partner.fullName}</p>
        </div>
        <PartnerLogoutButton />
      </div>

      {/* PACK-11 : lien inactif tant que le contrat n'est pas signé. */}
      {(partner.contractStatus === "contrat_envoye" || partner.contractStatus === "lien_expire") && (
        <p className="mb-6 rounded-brand border-l-[4px] border-rouge bg-[#FFEDED] p-4 text-[15px] font-semibold">
          {t(partner.contractStatus === "contrat_envoye" ? "contract.contractPending" : "contract.contractExpired")}
        </p>
      )}
      {signedContract && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm font-semibold">{t("contract.contractNumber", { number: signedContract.number })}</p>
          <EmailContractButton code={partner.referralCode} label={t("contract.emailContract")} doneLabel={t("contract.emailSent")} />
        </div>
      )}

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
          <p className="text-sm text-gris">{ts("clicks")}</p>
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
          <p className="mb-3 text-sm text-gris">{ts("linkIntro")}</p>
          <CopyLinkButton link={link} />
        </div>
      </div>

      <section aria-labelledby="files-title">
        <h2 id="files-title" className="text-lg font-extrabold">{ts("files")}</h2>
        <p className="mb-3 text-sm text-gris">{ts("filesIntro")}</p>
        <p className="mb-4 flex items-center gap-2 text-xs font-semibold text-gris">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFF3D6]">
            <Coins className="h-3 w-3 text-[#8A6200]" />
          </span>
          {ts("paidStep")}
        </p>
        {candidates.length === 0 ? (
          <p className="card p-6 text-center text-sm text-gris">{ts("noFiles")}</p>
        ) : (
          <ul className="space-y-3">
            {candidates.map((c) => {
              const idx = stageIndex(c.stage);
              const label = tStage(`${c.stage as "recu"}.label`);
              const pts = pointsOf.get(c.id) ?? 0;
              return (
                <li key={c.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-extrabold">{shortName(c.fullName)}</p>
                      <p className="text-xs text-gris">
                        {optionLabel("targetLevel", c.targetLevel, params.locale)} · {ts("since", { date: dateFmt.format(c.createdAt) })}
                      </p>
                    </div>
                    {pts > 0 && <span className="rounded-full bg-fond px-2.5 py-1 text-xs font-bold">{ts("pointsShort", { points: pts })}</span>}
                  </div>
                  <p className={`mt-3 text-sm font-extrabold ${idx === -1 ? "text-gris" : "text-rouge-fonce"}`}>{label}</p>
                  <ol className="mt-2 flex items-center" aria-label={label}>
                    {STAGES.map((s, i) => {
                      const done = idx >= 0 && i < idx;
                      const current = i === idx;
                      const paid = PAID_STAGES.has(s);
                      return (
                        <li key={s} className="flex flex-1 items-center last:flex-none" title={tStage(`${s}.label`)}>
                          <span
                            className={`relative flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                              current ? "bg-rouge ring-4 ring-[#FFD6D6]" : done ? "bg-noir" : "border border-bord bg-white"
                            }`}
                          >
                            {paid && <Coins className={`h-2.5 w-2.5 ${current || done ? "text-[#FFD24D]" : "text-[#C9A227]"}`} />}
                          </span>
                          {i < STAGES.length - 1 && <span className={`h-[2px] flex-1 ${done ? "bg-noir" : "bg-bord"}`} />}
                        </li>
                      );
                    })}
                  </ol>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
