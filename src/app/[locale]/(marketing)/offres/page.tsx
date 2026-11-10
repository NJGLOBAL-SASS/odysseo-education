import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { BrandWatermark } from "@/components/layout/brand-watermark";
import { OffersExplorer } from "@/components/offers/offers-explorer";
import { OfferCard } from "@/components/offers/offer-card";
import { formatIntake } from "@/components/offers/format";
import { getPublicOffers, offerFamilies, toOfferCard } from "@/lib/offers/public-catalogue";
import { publicPageMetadata, toLocale } from "@/lib/seo";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return publicPageMetadata("offers", params.locale);
}

/** /offres — catalogue public filtrable (PACK-03). Page statique : le filtrage se fait dans le navigateur. */
export default async function OffersPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const locale = toLocale(params.locale);
  const t = await getTranslations("offers.index");
  const offers = getPublicOffers(locale);
  const cards = offers.map(toOfferCard);
  const cities = [...new Set(offers.map((o) => o.ville))].sort((a, b) => a.localeCompare(b, locale));
  const intake = offers[0] ? formatIntake(offers[0].rentree, locale) : "";

  return (
    <div className="relative isolate">
      <BrandWatermark />
      <section className="bg-noir text-white">
        <div className="wrap-site py-12 sm:py-16">
          <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-rouge">{t("eyebrow")}</p>
          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">{t("title", { count: offers.length, intake })}</h1>
          <p className="mt-4 max-w-xl text-[#D4D4DA]">{t("intro")}</p>
          <Link href="/postuler" className="btn-primary mt-6 !w-auto px-5">
            {t("cta")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="h-[5px] bg-rouge" />
      </section>

      <div className="wrap-site relative py-8 sm:py-10">
        {/* Sans JavaScript (ou avant hydratation) : liste complète, non filtrée. */}
        <Suspense
          fallback={
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((o) => (
                <li key={o.ref}>
                  <OfferCard offer={o} />
                </li>
              ))}
            </ul>
          }
        >
          <OffersExplorer offers={cards} families={offerFamilies(locale)} cities={cities} />
        </Suspense>
        <p className="mt-8 text-center text-sm text-gris">
          {t("free")}{" "}
          <Link href="/postuler" className="font-bold text-noir underline underline-offset-2">
            {t("cta")}
          </Link>
        </p>
      </div>
    </div>
  );
}
