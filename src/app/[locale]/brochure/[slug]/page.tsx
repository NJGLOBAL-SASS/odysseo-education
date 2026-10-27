import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { locales } from "@/i18n/config";
import { PROGRAMS, getProgram, type Locale } from "@/lib/programs";
import { ProgramBody, ClosingCta } from "@/components/programs/program-sections";

/**
 * Mise en page A4 des brochures, imprimée en PDF par scripts/generate-brochures.mjs
 * (en-tête et pied de page ajoutés par Chrome). Non indexée : les visiteurs
 * utilisent /cursus/[slug] et téléchargent le PDF.
 */
export const metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return locales.flatMap((locale) => PROGRAMS.map((p) => ({ locale, slug: p.slug })));
}

export default async function BrochurePrintPage({ params }: { params: { locale: string; slug: string } }) {
  setRequestLocale(params.locale);
  const program = getProgram(params.slug);
  if (!program) notFound();
  const locale = (params.locale === "en" ? "en" : "fr") as Locale;
  const t = await getTranslations("programs");

  return (
    <div className="brochure mx-auto bg-white text-texte">
      {/* Couverture (haut de la page 1) */}
      <section className="brochure-bleed relative mb-7 overflow-hidden bg-noir !px-0 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero/hero-banner-home.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-right" />
        <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/75 to-transparent" />
        <div className="brochure-gutter relative pb-5 pt-[10mm]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo/logo-full-white-tight.png" alt="Odysseo" className="h-[17mm] w-auto" />
          <p className="mt-5 max-w-[95mm] text-[21px] font-light leading-tight">{t("hero.banner")}</p>
          <p className="mt-3 inline-block bg-rouge px-4 py-2 text-[19px] font-bold">{t("hero.slogan")}</p>
          <p className="mt-7 text-[15px] font-extrabold uppercase text-rouge">{t("hero.label", { name: program.short[locale] })}</p>
          <h1 className="text-[30px] font-extrabold leading-tight">{t("hero.title")}</h1>
          <p className="text-[15px] text-[#C9C9D1]">
            {program.name[locale]} · {program.tagline[locale]}
          </p>
          <p className="mt-0.5 text-[14px] font-bold">{t("hero.intakes")}</p>
        </div>
        <div className="relative h-[5px] bg-rouge" />
      </section>

      <ProgramBody program={program} locale={locale} print closing={<ClosingCta key="cta" program={program} locale={locale} />} />
    </div>
  );
}
