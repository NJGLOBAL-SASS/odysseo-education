import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { offersClosingSoon, toOfferCard } from "@/lib/offers/public-catalogue";
import { OfferCard } from "./offer-card";

/** Accueil (PACK-03) : les 3 offres publiables dont la date limite est la plus proche. */
export async function OffersClosingSoon({ locale }: { locale: string }) {
  const offers = offersClosingSoon(locale, 3);
  if (offers.length === 0) return null;
  const t = await getTranslations("offers.home");
  return (
    <section className="wrap-site py-12" aria-labelledby="offres-proches">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-rouge">{t("eyebrow")}</p>
          <h2 id="offres-proches" className="text-2xl font-extrabold sm:text-3xl">
            {t("title")}
          </h2>
        </div>
        <Link href="/offres" className="inline-flex items-center gap-1.5 text-[15px] font-bold hover:text-rouge">
          {t("all")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {offers.map((o) => (
          <li key={o.ref}>
            <OfferCard offer={toOfferCard(o)} headingLevel="h3" />
          </li>
        ))}
      </ul>
    </section>
  );
}
