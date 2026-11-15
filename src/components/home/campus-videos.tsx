import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/lib/programs";
import { getCampusVideos, hasCreditedPhoto, universityPlace } from "@/lib/content/trust";
import { Zh } from "@/components/ui/zh";
import { CampusVideoCards, type CampusVideoCard } from "./campus-video-cards";

/** Cartes vidéo prêtes à afficher (titre dans la langue, affiche = photo du campus créditée). */
export async function campusVideoCards(locale: Locale, filter?: (universityId: string) => boolean): Promise<CampusVideoCard[]> {
  const t = await getTranslations({ locale, namespace: "campusVideos" });
  const usedPosters = new Set<string>();
  return getCampusVideos()
    .filter((v) => !filter || filter(v.universite))
    .map((v) => {
      const u = v.university;
      // Une même photo de campus ne sert d'affiche qu'une fois ; sinon, vignette YouTube.
      const photo = hasCreditedPhoto(u) && !usedPosters.has(u.photo) ? u : null;
      if (photo) usedPosters.add(photo.photo);
      return {
        id: v.id,
        youtube: v.youtube,
        title: (locale === "en" && v.titre_en) || v.titre_fr,
        channel: v.chaine,
        universityId: u.id,
        universityName: u.nom_en,
        city: universityPlace(u, locale).city || undefined,
        poster: photo?.photo,
        posterCredit: photo ? t("posterCredit", { author: photo.photo_auteur || "?", license: photo.photo_licence }) : undefined,
      };
    });
}

/** Section « Visitez les campus » de l'accueil (6 vidéos), masquée s'il n'y a aucune vidéo. */
export async function CampusVideos({ locale, max = 6 }: { locale: Locale; max?: number }) {
  const items = (await campusVideoCards(locale)).slice(0, max);
  if (items.length === 0) return null;
  const t = await getTranslations("campusVideos");
  const total = getCampusVideos().length;

  return (
    <section className="bg-fond py-12" aria-labelledby="campus-videos-title">
      <div className="wrap-site">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-rouge">{t("eyebrow")}</p>
            <h2 id="campus-videos-title" className="text-2xl font-extrabold sm:text-3xl">
              {t("title")}
              <Zh>线上展会</Zh>
            </h2>
            <p className="mt-1 max-w-2xl text-[15px] text-gris">{t("intro")}</p>
          </div>
          {total > items.length && (
            <Link href="/videos" className="inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-bold hover:text-rouge">
              {t("all", { count: total })} <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <CampusVideoCards items={items} />
        <p className="mt-4 text-xs text-gris">{t("privacy")}</p>
      </div>
    </section>
  );
}
