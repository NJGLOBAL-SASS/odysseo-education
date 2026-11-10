import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";

import { STAGES, isParallelStage, type StageHistoryEntry } from "@/lib/tracking-stages";
import { cn } from "@/lib/utils";

/** Frise des étapes (passées cochées, actuelle en rouge, suivantes grisées) ; statuts parallèles à la place. */
export async function StageTimeline({ stage, history, locale }: { stage: string; history: StageHistoryEntry[]; locale: string }) {
  const t = await getTranslations("suivi.stages");
  const tHome = await getTranslations("portal.home");
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const dateOf = (s: string) => [...history].reverse().find((h) => h.stage === s)?.date;
  const next = t(`${stage as "recu"}.next`);

  if (isParallelStage(stage)) {
    return (
      <div className="rounded-brand border-l-[5px] border-rouge bg-[#FFEDED] p-5">
        <p className="text-[13px] font-bold uppercase tracking-wide text-rouge-fonce">{t(`${stage as "clos"}.label`)}</p>
        <p className="mt-1 text-[17px] font-extrabold">{next}</p>
      </div>
    );
  }
  const current = (STAGES as readonly string[]).indexOf(stage);
  return (
    <>
      {next && (
        <div className="rounded-brand bg-noir p-5 text-white">
          <p className="text-[13px] font-bold uppercase tracking-wide text-rouge">{tHome("next")}</p>
          <p className="mt-1 text-[17px] font-bold">{next}</p>
        </div>
      )}
      <section className="card p-5" aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="mb-4 text-[15px] font-bold">
          {tHome("timeline")}
        </h2>
        <ol>
          {STAGES.map((s, i) => {
            const done = i < current;
            const isCurrent = i === current;
            const date = done || isCurrent ? dateOf(s) : undefined;
            return (
              <li key={s} className="relative flex gap-3 pb-4 last:pb-0" aria-current={isCurrent ? "step" : undefined}>
                {i < STAGES.length - 1 && (
                  <span className={cn("absolute left-[13px] top-7 h-[calc(100%-24px)] w-[2px]", done ? "bg-noir" : "bg-bord")} aria-hidden />
                )}
                <span
                  className={cn(
                    "relative z-[1] flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold",
                    done && "bg-noir text-white",
                    isCurrent && "bg-rouge text-white ring-4 ring-[#FFD6D6]",
                    !done && !isCurrent && "border-[1.5px] border-bord bg-white text-gris",
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className={cn("block text-[15px]", isCurrent ? "font-extrabold text-rouge-fonce" : done ? "font-semibold" : "text-gris")}>
                    {t(`${s}.label`)}
                  </span>
                  {date && <span className="block text-[12px] text-gris">{dateFmt.format(new Date(date))}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
