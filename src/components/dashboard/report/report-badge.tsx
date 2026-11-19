"use client";

import { useTranslations } from "next-intl";

import type { Badge } from "@/lib/report/status";
import { MAX_REMINDERS } from "@/lib/report/reminders";

const TONES: Record<Badge["key"], string> = {
  nouveau: "bg-[#E8E8EC] text-[#3F3F46]",
  infos: "bg-[#E8E8EC] text-[#3F3F46]",
  analyse: "bg-[#E8E8EC] text-[#3F3F46]",
  a_revoir: "bg-[#FFE9CC] text-[#A35400]",
  pret: "bg-[#FFE9CC] text-[#A35400]",
  envoye: "bg-[#E1F6EA] text-[#0F7B3F]",
  lu: "bg-[#E3F0FF] text-[#0B5FA5]",
  relance: "bg-[#F1E6FF] text-[#6A2DBF]",
  oui: "bg-[#0F7B3F] text-white",
  versement: "bg-noir text-white",
  sans_suite: "bg-[#F4F4F6] text-[#8A8A93]",
};

/** Badge « Rapport » de la liste et de la fiche (ODY-15 §5.1). */
export function ReportBadge({ badge, recheck = false }: { badge: Badge; recheck?: boolean }) {
  const t = useTranslations("dashboard.report");
  let label: string;
  if (badge.key === "envoye") label = badge.by ? t("badge.envoye", { date: badge.date ?? "", by: badge.by }) : t("badge.envoyeShort");
  else if (badge.key === "pret" && badge.version) label = t("badge.pretV", { version: badge.version });
  else if (badge.key === "relance") label = t("badge.relance", { n: badge.n ?? 1, max: MAX_REMINDERS });
  else label = t(`badge.${badge.key}`);
  const title = badge.key === "sans_suite" && badge.reason ? t(`stopReasons.${badge.reason}` as "stopReasons.autre") : undefined;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span title={title} className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[badge.key]}`}>
        {label}
        {badge.key === "relance" && badge.read ? " · ✓" : ""}
      </span>
      {recheck && <span className="inline-flex whitespace-nowrap rounded-full bg-[#FFE9CC] px-2 py-0.5 text-[11px] font-bold text-[#A35400]">{t("badge.recheck")}</span>}
    </span>
  );
}
