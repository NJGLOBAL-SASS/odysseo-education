import { getTranslations } from "next-intl/server";

import { getProgram, type Locale } from "@/lib/programs";
import { getVideoTestimonials, isAllowedVideoFile, isAllowedVideoUrl, videoEmbedUrl } from "@/lib/content/trust";
import { VideoTestimonialCards } from "./video-testimonial-cards";

/**
 * Témoignages vidéo de l'accueil (content/temoignages.json : "video_fichier" ou "video_url").
 * Non rendu s'il n'y a aucune vidéo publiée. L'université n'est jamais nommée.
 */
export async function VideoTestimonials({ locale }: { locale: Locale }) {
  const list = getVideoTestimonials();
  if (list.length === 0) return null;
  const t = await getTranslations("home.videos");

  const items = list.map((x) => {
    const link = isAllowedVideoUrl(x.video_url) ? x.video_url : undefined;
    return {
      id: x.id,
      name: `${x.prenom} ${x.initiale_nom}`.trim(),
      flag: x.drapeau,
      country: x.pays,
      program: getProgram(x.cursus)?.name[locale] ?? x.cursus,
      city: x.ville_chine,
      year: x.annee_depart,
      poster: x.photo,
      file: isAllowedVideoFile(x.video_fichier) ? x.video_fichier : undefined,
      embed: link ? (videoEmbedUrl(link) ?? undefined) : undefined,
      link,
    };
  });

  return (
    <section className="wrap-site py-12" aria-labelledby="videos-title">
      <h2 id="videos-title" className="mb-5 text-2xl font-extrabold sm:text-3xl">
        {t("title")}
      </h2>
      <VideoTestimonialCards items={items} />
    </section>
  );
}
