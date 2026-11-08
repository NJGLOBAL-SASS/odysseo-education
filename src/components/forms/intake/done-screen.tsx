"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, ListChecks, MapPinned } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { PublicRecommendation } from "@/lib/matching/types";

export interface DoneResult {
  code: string;
  /** null : niveau Langue / Licence, offres envoyées par un conseiller. */
  cycle: "master" | "phd" | null;
  offers: PublicRecommendation[];
}

const ROLE_STYLE: Record<PublicRecommendation["role"], string> = {
  ambitieuse: "bg-noir text-white",
  cible: "bg-rouge text-white",
  securite: "bg-fond text-noir border border-bord",
};

/** Écran après l'envoi (PACK-02) : code dossier et « Vos 3 offres recommandées ». */
export function DoneScreen({
  result,
  firstName,
  email,
  targetLevel,
}: {
  result: DoneResult;
  firstName: string;
  email?: string;
  targetLevel: string;
}) {
  const t = useTranslations("intake.done");
  const locale = useLocale();
  const { code, offers } = result;
  const refs = offers.map((o) => o.ref);

  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  // Lien de suivi (PACK-08) ajouté au message WhatsApp.
  const trackingPath = `/suivi?code=${encodeURIComponent(code)}`;
  const trackingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}${trackingPath}`;
  const waText = [
    t("waMessage", { code }),
    refs.length ? t("waOffers", { refs: refs.join(", ") }) : "",
    t("waTracking", { url: trackingUrl }),
  ]
    .filter(Boolean)
    .join(" ");
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const level = (["language", "licence", "master", "doctorat"] as const).includes(targetLevel as never)
    ? t(`offers.levels.${targetLevel as "language" | "licence" | "master" | "doctorat"}`)
    : "";

  return (
    <div className="space-y-4">
      <div className="card p-5 text-center sm:p-6">
        <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-noir text-white">
          <Check className="h-7 w-7" strokeWidth={3} />
        </div>
        <h2 className="text-xl font-extrabold">{t("title", { name: firstName })}</h2>
        <p className="text-gris">{t("subtitle")}</p>
        <div className="my-3 rounded-brand border-2 border-dashed border-noir bg-fond p-2 text-[26px] font-extrabold tracking-wide">
          {code}
        </div>
        <p className="text-[13px] text-gris">{t("codeNote")}</p>
      </div>

      <section aria-labelledby="offres-title" className="space-y-3">
        {offers.length > 0 ? (
          <>
            <div className="px-1">
              <h2 id="offres-title" className="text-[22px] font-extrabold leading-tight">
                {t("offers.title", { count: offers.length })}
              </h2>
              <p className="mt-1 text-[14px] text-gris">{t("offers.subtitle")}</p>
            </div>
            <ul className="space-y-3">
              {offers.map((o) => (
                <li key={o.ref} className="card overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-bord px-4 py-2.5">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${ROLE_STYLE[o.role]}`}>
                      {t(`offers.roles.${o.role}`)}
                    </span>
                    <span className="text-[12px] font-semibold text-gris">{t("offers.ref", { ref: o.ref })}</span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-[17px] font-extrabold leading-snug">
                      {t("offers.university")} – {o.lieu_affiche}
                    </h3>
                    <p className="mt-0.5 text-[13px] text-gris">
                      {[t(`offers.cycles.${o.cycle}`), o.langue, o.duree].filter(Boolean).join(" · ")}
                    </p>
                    {o.arguments.length > 0 && (
                      <ul className="mt-3 space-y-1.5 text-[15px]">
                        {o.arguments.map((a) => (
                          <li key={a} className="flex gap-2">
                            <Check className="mt-[3px] h-4 w-4 flex-shrink-0 text-ok" strokeWidth={3} />
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {o.filieres_correspondantes[0] && (
                      <p className="mt-3 rounded-[8px] bg-fond px-3 py-2 text-[14px]">
                        {t.rich("offers.yourField", {
                          field: o.filieres_correspondantes[0],
                          b: (chunks) => <b>{chunks}</b>,
                        })}
                      </p>
                    )}
                    {o.date_limite && (
                      <p className="mt-2 text-[13px] font-semibold text-rouge-fonce">
                        {t("offers.deadline", { date: dateFmt.format(new Date(o.date_limite)) })}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {offers.length < 3 && <p className="px-1 text-[14px] text-gris">{t("offers.fewer")}</p>}
          </>
        ) : (
          <div className="card p-5">
            <h2 id="offres-title" className="text-[17px] font-extrabold">
              {t("offers.none", { level })}
            </h2>
          </div>
        )}
      </section>

      <div className="card space-y-3 p-5 sm:p-6">
        <a
          href={`https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`}
          target="_blank"
          rel="noopener noreferrer"
          data-track-location="form_done"
          className="btn-wa"
        >
          {t("offers.whatsappButton")}
        </a>
        <Link href={trackingPath} className="btn-ghost w-full">
          <MapPinned className="h-4 w-4" /> {t("trackButton")}
        </Link>
        {email && <p className="text-center text-[13px] text-gris">{t("emailNote", { email })}</p>}

        <ol className="list-none space-y-3 pt-2 text-left text-[15px]">
          {(["analysis", "firstAnswer", "proposal"] as const).map((key, i) => (
            <li key={key} className="relative pl-10">
              <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-rouge text-sm font-extrabold text-white">
                {i + 1}
              </span>
              <b className="block">{t(`steps.${key}.title`)}</b>
              {t(`steps.${key}.text`)}
            </li>
          ))}
        </ol>
      </div>

      <Link
        href="/guides/avant-le-depart"
        className="flex items-center gap-3 rounded-brand border-[1.5px] border-bord bg-white p-4 text-[15px] font-bold hover:border-noir"
      >
        <ListChecks className="h-5 w-5 flex-shrink-0 text-rouge" />
        <span className="flex-1">{t("offers.guide")}</span>
        <ArrowRight className="h-4 w-4 flex-shrink-0" />
      </Link>

      <p className="px-1 text-[12px] leading-relaxed text-gris">{t("offers.disclaimer")}</p>
    </div>
  );
}
