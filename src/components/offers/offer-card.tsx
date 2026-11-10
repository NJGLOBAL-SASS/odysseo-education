import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CalendarClock, Check, GraduationCap } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { Cycle } from "@/lib/matching/types";
import { formatDeadline } from "./format";

/** Données d'une carte d'offre (liste /offres et bloc de l'accueil). */
export interface OfferCardData {
  ref: string;
  slug: string;
  cycle: Cycle;
  ville: string;
  lieu_affiche: string;
  date_limite: string | null;
  arguments: string[];
  majorsCount: number;
  familles: string[];
}

export function OfferCard({ offer, headingLevel = "h2" }: { offer: OfferCardData; headingLevel?: "h2" | "h3" }) {
  const t = useTranslations("offers");
  const locale = useLocale();
  const Heading = headingLevel;
  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-bord px-4 py-2.5">
        <span className="rounded-full bg-noir px-2.5 py-1 text-[12px] font-bold text-white">{t(`cycles.${offer.cycle}`)}</span>
        <span className="text-[13px] font-bold tracking-wide text-gris">{offer.ref}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <Heading className="text-[17px] font-extrabold leading-snug">
          <Link href={`/offres/${offer.slug}`} className="hover:text-rouge">
            {t("card.university", { place: offer.lieu_affiche })}
          </Link>
        </Heading>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-gris">
          <GraduationCap className="h-3.5 w-3.5" /> {t("card.majors", { count: offer.majorsCount })}
        </p>
        {offer.arguments.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-[15px]">
            {offer.arguments.slice(0, 2).map((a) => (
              <li key={a} className="flex gap-2">
                <Check className="mt-[3px] h-4 w-4 flex-shrink-0 text-ok" strokeWidth={3} />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-4">
          {offer.date_limite && (
            <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-rouge-fonce">
              <CalendarClock className="h-4 w-4" /> {t("card.deadline", { date: formatDeadline(offer.date_limite, locale) })}
            </p>
          )}
          <Link href={`/offres/${offer.slug}`} className="btn-dark !min-h-[44px] text-sm">
            {t("card.view")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
