import { setRequestLocale } from "next-intl/server";

import { Hero } from "@/components/marketing/hero";
import { ServicesSection } from "@/components/marketing/services-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { Testimonials } from "@/components/trust/testimonials";
import { AdvisorCard } from "@/components/trust/advisor-card";
import { OffersClosingSoon } from "@/components/offers/closing-soon";
import { publicPageMetadata, toLocale } from "@/lib/seo";

// Bloc « Offres à date limite proche » : recalculé chaque jour (les dates limites passent).
export const revalidate = 86400;

export function generateMetadata({ params }: { params: { locale: string } }) {
  return publicPageMetadata("home", params.locale);
}

export default function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  return (
    <>
      <Hero />
      <OffersClosingSoon locale={toLocale(params.locale)} />
      <ServicesSection />
      <TrustSection />
      {/* PACK-06 : rendus seulement si content/temoignages.json et conseillers.json ont des entrées. */}
      <Testimonials locale={toLocale(params.locale)} pick={3} className="wrap-site pb-10" />
      <AdvisorCard locale={toLocale(params.locale)} className="max-w-md" wrapperClassName="wrap-site mb-10" />
    </>
  );
}
