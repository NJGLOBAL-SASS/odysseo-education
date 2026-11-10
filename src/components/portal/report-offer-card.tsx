import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Check } from "lucide-react";

import type { PortalReport } from "@/lib/admission/server";

type ReportOfferView = PortalReport["offers"][number] & { revealReason?: string | null };

const ROLE_STYLE: Record<string, string> = {
  ambitieuse: "bg-noir text-white",
  cible: "bg-rouge text-white",
  securite: "bg-fond text-noir border border-bord",
};

/** Carte d'une offre du rapport : « Université *** – lieu », sauf si l'équipe a révélé le nom. */
export function ReportOfferCard({ offer }: { offer: ReportOfferView }) {
  const t = useTranslations("portal");
  const locale = useLocale();
  const date = offer.date_limite
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(
        new Date(`${offer.date_limite}T00:00:00Z`),
      )
    : null;
  return (
    <article className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-bord px-4 py-2.5">
        <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${ROLE_STYLE[offer.role]}`}>{t(`home.roles.${offer.role}`)}</span>
        <span className="text-[12px] font-semibold text-gris">{offer.ref}</span>
      </div>
      <div className="p-4">
        <h3 className="text-[17px] font-extrabold leading-snug">
          {offer.university ? t("report.revealed", { name: offer.university, place: offer.lieu_affiche }) : t("report.university", { place: offer.lieu_affiche })}
        </h3>
        <p className="mt-0.5 text-[13px] text-gris">{[offer.langue, offer.duree].filter(Boolean).join(" · ")}</p>
        {offer.arguments.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-[15px]">
            {offer.arguments.map((a) => (
              <li key={a} className="flex gap-2">
                <Check className="mt-[3px] h-4 w-4 flex-shrink-0 text-ok" strokeWidth={3} />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        )}
        {date && (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-rouge-fonce">
            <CalendarClock className="h-4 w-4" /> {t("report.deadline", { date })}
          </p>
        )}
      </div>
    </article>
  );
}
