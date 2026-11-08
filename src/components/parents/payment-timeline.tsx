"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type TimelineProgram = {
  slug: string;
  name: string;
  /** Montants déjà formatés côté serveur depuis src/lib/programs.ts. */
  total: string;
  pct: number;
  steps: { label: string; when: string; amount: string; refundable: boolean; after: boolean }[];
  guaranteeTitle: string;
  guarantee: ReactNode;
};

/**
 * Blocs 1 et 2 de la page Parents (PACK-07) : sélecteur de cursus, frise des paiements
 * (verticale sur mobile, horizontale à partir de sm) et engagement de remboursement.
 * Cursus présélectionné par ?cursus=<slug> (lien « voir le détail » des pages cursus).
 */
export function PaymentTimeline({ programs, defaultSlug }: { programs: TimelineProgram[]; defaultSlug: string }) {
  const t = useTranslations("parents.payment");
  const [slug, setSlug] = useState(defaultSlug);

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("cursus");
    if (wanted && programs.some((p) => p.slug === wanted)) setSlug(wanted);
  }, [programs]);

  const program = programs.find((p) => p.slug === slug) ?? programs[0];

  return (
    <>
      <section id="paiement" aria-labelledby="paiement-title" className="scroll-mt-6">
        <h2 id="paiement-title" className="text-2xl font-extrabold leading-tight">
          {t("title")}
        </h2>

        <div role="radiogroup" aria-label={t("selectorLabel")} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {programs.map((p) => (
            <button
              key={p.slug}
              type="button"
              role="radio"
              aria-checked={p.slug === program.slug}
              onClick={() => setSlug(p.slug)}
              className={cn(
                "min-h-[44px] rounded-[10px] border-[1.5px] px-3 text-[15px] font-bold",
                p.slug === program.slug ? "border-noir bg-noir text-white" : "border-bord bg-white text-noir hover:border-noir",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-brand bg-noir p-5 text-white">
          <p className="text-[18px] leading-snug [&_b]:text-[32px] [&_b]:font-extrabold [&_b]:text-rouge">
            {t.rich("stat", { pct: program.pct, b: (c) => <b>{c}</b> })}
          </p>
          <p className="mt-1 text-[14px] text-[#D4D4DA]">{t.rich("total", { amount: program.total, b: (c) => <b className="text-white">{c}</b> })}</p>
        </div>

        <ol className={cn("relative mt-5 grid gap-3 sm:gap-2", program.steps.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4")}>
          {program.steps.map((s, i) => (
            <li
              key={`${program.slug}-${i}`}
              className={cn(
                "relative rounded-[10px] border-[1.5px] bg-white p-4 pl-14 sm:pl-4 sm:pt-12",
                s.after ? "border-rouge" : "border-bord",
              )}
            >
              <span
                className={cn(
                  "absolute left-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-sm font-extrabold",
                  s.after ? "bg-rouge text-white" : "bg-fond text-noir",
                )}
              >
                {i + 1}
              </span>
              {s.after && (
                <span className="mb-1.5 inline-block rounded-full bg-[#FFEDED] px-2 py-0.5 text-[12px] font-bold text-rouge-fonce sm:absolute sm:right-3 sm:top-4 sm:mb-0">
                  {t("afterBadge")}
                </span>
              )}
              <b className="block text-[15px] leading-snug">{s.label}</b>
              <span className="mt-1 block text-[20px] font-extrabold tabular-nums">
                {s.amount} <span className="text-[13px] font-bold text-gris">FCFA</span>
              </span>
              <span className={cn("mt-0.5 block text-[13px]", s.refundable ? "font-semibold text-rouge-fonce" : "text-gris")}>{s.when}</span>
            </li>
          ))}
        </ol>

        <Link
          href={`/cursus/${program.slug}`}
          className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-noir underline-offset-2 hover:underline"
        >
          {t("details")} <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section aria-labelledby="garantie-title" className="rounded-brand border-l-[5px] border-rouge bg-[#FFEDED] p-5">
        <h2 id="garantie-title" className="text-xl font-extrabold">
          {program.guaranteeTitle}
        </h2>
        <div className="mt-2 text-[15px] leading-relaxed">{program.guarantee}</div>
      </section>
    </>
  );
}
