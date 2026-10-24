import { setRequestLocale } from "next-intl/server";

import { Hero } from "@/components/marketing/hero";
import { ServicesSection } from "@/components/marketing/services-section";
import { TrustSection } from "@/components/marketing/trust-section";

export default function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);

  return (
    <>
      <Hero />
      <ServicesSection />
      <TrustSection />
    </>
  );
}
