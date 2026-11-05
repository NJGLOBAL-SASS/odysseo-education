import { getTranslations } from "next-intl/server";

import { getProgram, type Locale, type ProgramSlug } from "@/lib/programs";
import { getTestimonials, isAllowedVideoUrl, testimonialQuote } from "@/lib/content/trust";
import { TestimonialCards } from "./testimonial-cards";

/**
 * Section témoignages (PACK-06), depuis content/temoignages.json.
 * Non rendue s'il n'y a aucun témoignage publié. L'université n'est jamais nommée.
 */
export async function Testimonials({
  locale,
  cursus,
  pick,
  className,
}: {
  locale: Locale;
  cursus?: ProgramSlug;
  pick?: number;
  className?: string;
}) {
  const list = getTestimonials(cursus);
  if (list.length === 0) return null;
  const t = await getTranslations("proof");

  const items = list.map((x) => ({
    id: x.id,
    name: `${x.prenom} ${x.initiale_nom}`.trim(),
    flag: x.drapeau,
    country: x.pays,
    program: getProgram(x.cursus)?.name[locale] ?? x.cursus,
    city: x.ville_chine,
    year: x.annee_depart,
    quote: testimonialQuote(x, locale),
    photo: x.photo,
    videoUrl: isAllowedVideoUrl(x.video_url) ? x.video_url : undefined,
  }));

  return (
    <section className={className} aria-labelledby="temoignages-title">
      <h2 id="temoignages-title" className="mb-5 text-2xl font-extrabold">
        {cursus ? t("testimonialsTitleProgram") : t("testimonialsTitle")}
      </h2>
      <TestimonialCards items={items} pick={pick} />
    </section>
  );
}
