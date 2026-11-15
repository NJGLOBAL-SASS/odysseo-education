import { setRequestLocale } from "next-intl/server";

import { Hero } from "@/components/marketing/hero";
import { UniversityLogos } from "@/components/home/university-logos";
import { AdmissionWall } from "@/components/home/admission-wall";
import { VideoTestimonials } from "@/components/home/video-testimonials";
import { CampusVideos } from "@/components/home/campus-videos";
import { FinalCta, HomeFaq, HowItWorks, PaymentTrust, ProgramsStrip } from "@/components/home/sections";
import { OffersClosingSoon } from "@/components/offers/closing-soon";
import { getAdmissionLetters } from "@/lib/content/trust";
import { publicPageMetadata, toLocale } from "@/lib/seo";

// Bloc « Offres à date limite proche » : recalculé chaque jour (les dates limites passent).
export const revalidate = 86400;

export function generateMetadata({ params }: { params: { locale: string } }) {
  return publicPageMetadata("home", params.locale);
}

/**
 * Accueil : la preuve d'abord, puis un parcours simple.
 * Les blocs de preuves (logos, lettres, vidéos, chiffres) ne s'affichent que si
 * leur fichier dans content/ a des entrées réelles publiées (voir content/README.md).
 */
export default function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const locale = toLocale(params.locale);

  return (
    <>
      <Hero locale={locale} hasAdmissions={getAdmissionLetters().length > 0} />
      <UniversityLogos />
      <AdmissionWall locale={locale} />
      <VideoTestimonials locale={locale} />
      <HowItWorks />
      <ProgramsStrip locale={locale} />
      <CampusVideos locale={locale} />
      <OffersClosingSoon locale={locale} />
      <PaymentTrust />
      <HomeFaq locale={locale} />
      <FinalCta locale={locale} />
    </>
  );
}
