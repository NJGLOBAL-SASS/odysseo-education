import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { publicPageMetadata, toLocale } from "@/lib/seo";
import { Zh } from "@/components/ui/zh";
import { CampusVideoCards } from "@/components/home/campus-video-cards";
import { campusVideoCards } from "@/components/home/campus-videos";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return publicPageMetadata("videos", params.locale);
}

/** Toutes les vidéos officielles des campus. */
export default async function VideosPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const locale = toLocale(params.locale);
  const items = await campusVideoCards(locale);
  if (items.length === 0) notFound();
  const t = await getTranslations("campusVideos");

  return (
    <div className="bg-fond">
      <div className="wrap-site py-10 sm:py-14">
        <p className="text-sm font-extrabold uppercase tracking-wide text-rouge">{t("eyebrow")}</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
          {t("title")}
          <Zh>线上展会</Zh>
        </h1>
        <p className="mt-3 max-w-2xl text-gris">{t("intro")}</p>
        <div className="mt-8">
          <CampusVideoCards items={items} />
        </div>
        <p className="mt-4 text-xs text-gris">{t("privacy")}</p>
        <div className="mt-10 flex flex-col gap-3 rounded-brand bg-noir p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg font-extrabold">{t("ctaText")}</p>
          <Link href="/postuler" className="btn-primary flex-shrink-0" data-track-location="videos">
            {t("cta")} <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
