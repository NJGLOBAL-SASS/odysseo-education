"use client";

import { useLocale, useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";

export function OfflineBanner({ cachedAt }: { cachedAt: string | null }) {
  const t = useTranslations("dashboard.offline");
  const locale = useLocale();
  const date = cachedAt ? t("from", { date: new Date(cachedAt).toLocaleString(locale) }) : "";

  return (
    <div className="mb-4 flex items-center gap-2 rounded-brand border-[1.5px] border-[#E8D26B] bg-[#FFF8D6] px-3.5 py-2.5 text-sm text-[#5B4A00]">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>{t("banner", { date })}</span>
    </div>
  );
}
