import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { locales } from "@/i18n/config";
import { PROGRAMS, getProgram, type Locale } from "@/lib/programs";
import { ProgramBody, ClosingCta } from "@/components/programs/program-sections";
import { BrochureDownload } from "@/components/programs/brochure-download";

export function generateStaticParams() {
  return locales.flatMap((locale) => PROGRAMS.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: { locale: string; slug: string } }) {
  const program = getProgram(params.slug);
  if (!program) return {};
  const locale = (params.locale === "en" ? "en" : "fr") as Locale;
  return {
    title: `${program.name[locale]} — Odysseo Education`,
    description: program.cardText[locale],
  };
}

export default async function ProgramPage({ params }: { params: { locale: string; slug: string } }) {
  setRequestLocale(params.locale);
  const program = getProgram(params.slug);
  if (!program) notFound();
  const locale = (params.locale === "en" ? "en" : "fr") as Locale;
  const t = await getTranslations("programs");

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-noir text-white">
        <Image
          src="/images/hero/hero-banner-home.jpg"
          alt=""
          fill
          priority
          className="object-cover object-right opacity-50 md:opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/90 to-noir/10" />
        <div className="wrap-site relative py-12 sm:py-16">
          <Link href="/cursus" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#C9C9D1] hover:text-white">
            <ArrowLeft className="h-4 w-4" /> {t("nav")}
          </Link>
          <p className="max-w-md text-lg font-light text-[#E5E5EA] sm:text-xl">{t("hero.banner")}</p>
          <p className="mt-2 inline-block bg-rouge px-3 py-1.5 text-sm font-bold sm:text-base">{t("hero.slogan")}</p>
          <p className="mt-8 text-sm font-extrabold uppercase tracking-wide text-rouge">
            {t("hero.label", { name: program.short[locale] })}
          </p>
          <h1 className="mt-1 max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">{t("hero.title")}</h1>
          <p className="mt-2 max-w-2xl text-[#C9C9D1]">
            {program.name[locale]} · {program.tagline[locale]}
          </p>
          <p className="mt-1 text-sm font-bold">{t("hero.intakes")}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <BrochureDownload program={program} locale={locale} tone="dark" />
            <Link href="/postuler" className="inline-flex min-h-[46px] items-center gap-2 px-1 text-sm font-bold text-white hover:underline">
              {t("hero.apply")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="h-[5px] bg-rouge" />
      </section>

      <div className="wrap-site max-w-[900px] py-12 sm:py-16">
        <ProgramBody
          program={program}
          locale={locale}
          closing={
            <ClosingCta
              key="cta"
              program={program}
              locale={locale}
              actions={
                <>
                  <Link href="/postuler" className="btn-primary !min-h-[46px] !w-auto px-5 text-sm">
                    {t("cta.button")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <BrochureDownload program={program} locale={locale} tone="dark" compact />
                </>
              }
            />
          }
        />

        <nav className="mt-12 border-t border-bord pt-6">
          <p className="mb-3 text-sm font-bold">{t("cta.other")}</p>
          <div className="flex flex-wrap gap-2">
            {PROGRAMS.filter((p) => p.slug !== program.slug).map((p) => (
              <Link key={p.slug} href={`/cursus/${p.slug}`} className="btn-ghost !min-h-[42px] !w-auto px-4 text-sm hover:bg-fond">
                {p.name[locale]}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
