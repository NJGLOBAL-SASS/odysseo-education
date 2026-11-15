import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Check } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/lib/programs";
import { getStats, statDetail, statLabel } from "@/lib/content/trust";

/**
 * Haut de l'accueil : promesse, deux actions (analyse gratuite + preuves) et,
 * s'ils sont renseignés dans content/chiffres.json, les chiffres réels.
 * Le second bouton mène au mur des admissions s'il existe, sinon aux offres.
 */
export async function Hero({ locale, hasAdmissions }: { locale: Locale; hasAdmissions: boolean }) {
  const t = await getTranslations("home.hero");
  const stats = getStats();
  const nf = new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR");

  return (
    <section className="relative overflow-hidden bg-noir text-white">
      <Image src="/images/hero/hero-banner-home.jpg" alt="" fill priority sizes="100vw" className="object-cover object-right opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/80 to-noir/10" />
      <div className="relative wrap-site py-14 sm:py-24">
        <p className="text-sm font-extrabold uppercase tracking-wide text-rouge">{t("eyebrow")}</p>
        <h1 className="mt-3 max-w-2xl text-[2rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
          {t.rich("title", { red: (chunks) => <span className="text-rouge">{chunks}</span> })}
        </h1>
        <p className="mt-4 max-w-xl text-[#D4D4DA] sm:text-lg">{t("subtitle")}</p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/postuler" className="btn-primary sm:!w-auto" data-track-location="accueil-hero">
            {t("cta")} <ArrowRight className="h-5 w-5" />
          </Link>
          {hasAdmissions ? (
            <a href="#admissions" className="btn border-[1.5px] border-white/30 text-white hover:bg-white/10">
              {t("ctaProof")}
            </a>
          ) : (
            <Link href="/offres" className="btn border-[1.5px] border-white/30 text-white hover:bg-white/10">
              {t("ctaOffers")}
            </Link>
          )}
        </div>

        <ul className="mt-6 flex flex-col gap-2 text-[15px] text-[#EDEDF2] sm:flex-row sm:flex-wrap sm:gap-x-6">
          {(t.raw("reassure") as string[]).map((r) => (
            <li key={r} className="flex items-center gap-2">
              <Check className="h-4 w-4 flex-shrink-0 text-rouge" strokeWidth={3} /> {r}
            </li>
          ))}
        </ul>

        {stats.length > 0 && (
          <dl className="mt-10 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-5 border-t border-white/15 pt-6 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
            {stats.map((s) => (
              <div key={s.id}>
                <dt className="sr-only">{statLabel(s, locale)}</dt>
                <dd className="text-3xl font-extrabold tabular-nums sm:text-4xl">
                  {nf.format(s.valeur as number)}
                  {s.suffixe}
                </dd>
                <dd className="mt-0.5 text-sm text-[#C9C9D1]" aria-hidden="true">
                  {statLabel(s, locale)}
                </dd>
                {statDetail(s, locale) && <dd className="mt-1 text-xs leading-snug text-[#9C9CA6]">{statDetail(s, locale)}</dd>}
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="h-[5px] bg-rouge" />
    </section>
  );
}
