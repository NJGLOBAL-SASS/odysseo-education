import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Check } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { PROGRAMS, formatFcfa, type Locale } from "@/lib/programs";
import { BrochureDownload } from "@/components/programs/brochure-download";
import { BrandWatermark } from "@/components/layout/brand-watermark";

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: "programs.index" });
  return { title: `${t("title")} — Odysseo Education`, description: t("intro") };
}

export default async function ProgramsIndexPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const locale = (params.locale === "en" ? "en" : "fr") as Locale;
  const t = await getTranslations("programs");

  return (
    <div className="relative isolate">
      <BrandWatermark />
      <section className="relative overflow-hidden bg-noir text-white">
        <Image src="/images/hero/hero-banner-home.jpg" alt="" fill priority className="object-cover object-right opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/85 to-transparent" />
        <div className="wrap-site relative py-14 sm:py-20">
          <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-rouge">{t("index.eyebrow")}</p>
          <h1 className="max-w-2xl text-3xl font-extrabold sm:text-5xl">{t("index.title")}</h1>
          <p className="mt-4 max-w-xl text-[#D4D4DA]">{t("index.intro")}</p>
        </div>
        <div className="h-[5px] bg-rouge" />
      </section>

      <div className="wrap-site relative py-12">
        <div className="grid gap-6 md:grid-cols-2">
          {PROGRAMS.map((p) => (
            <article key={p.slug} className="card flex flex-col overflow-hidden">
              <Link href={`/cursus/${p.slug}`} className="group relative block h-44 overflow-hidden bg-noir">
                <Image
                  src={p.image}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-noir/90 to-transparent" />
                <h2 className="absolute bottom-4 left-5 text-2xl font-extrabold text-white">{p.name[locale]}</h2>
              </Link>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[15px] text-gris">{p.cardText[locale]}</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {p.handle[locale].slice(0, 3).map((h) => (
                    <li key={h} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-rouge" strokeWidth={3} /> {h}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 border-t border-bord pt-4">
                  <p className="text-2xl font-extrabold tabular-nums">
                    {formatFcfa(p.price)} <span className="text-sm font-bold">FCFA</span>
                  </p>
                  <p className="text-xs text-gris">{t("index.from")}</p>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/cursus/${p.slug}`} className="btn-dark !min-h-[46px] !w-auto px-4 text-sm">
                    {t("index.discover")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <BrochureDownload program={p} locale={locale} compact />
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gris">{t("index.free")}</p>
      </div>
    </div>
  );
}
