"use client";

import { useTranslations } from "next-intl";

export function ProgressBar({
  step,
  total,
  stepName,
}: {
  step: number;
  total: number;
  stepName: string;
}) {
  const t = useTranslations("intake");

  return (
    <div className="sticky top-0 z-10 -mx-4 bg-fond/85 px-4 pb-2 pt-2 backdrop-blur">
      <div className="mb-1 flex justify-between text-[13px] font-semibold text-gris">
        <span>{t("progress", { current: step + 1, total })}</span>
        <span>{stepName}</span>
      </div>
      <div className="h-[7px] overflow-hidden rounded-full bg-[#E3E3E8]">
        <div
          className="h-full rounded-full bg-rouge transition-[width] duration-300"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
