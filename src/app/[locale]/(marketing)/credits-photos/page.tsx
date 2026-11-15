import { getTranslations, setRequestLocale } from "next-intl/server";

import { getUniversityLogos, hasCreditedPhoto } from "@/lib/content/trust";
import { publicPageMetadata } from "@/lib/seo";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return publicPageMetadata("photoCredits", params.locale);
}

/** Crédits obligatoires des photos de campus sous licence libre (Wikimedia Commons), et mention sur les logos. */
export default async function PhotoCreditsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("photoCredits");
  const photos = getUniversityLogos()
    .filter(hasCreditedPhoto)
    .sort((a, b) => a.nom_en.localeCompare(b.nom_en));

  return (
    <div className="wrap-site py-10 sm:py-14">
      <p className="text-sm font-extrabold uppercase tracking-wide text-rouge">{t("eyebrow")}</p>
      <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-gris">{t("intro")}</p>
      <p className="mt-2 text-sm font-semibold">{t("count", { count: photos.length })}</p>

      <ul className="mt-6 divide-y divide-bord rounded-brand border border-bord bg-white text-sm">
        {photos.map((u) => (
          <li key={u.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <span className="font-bold">{u.nom_en}</span>
            <span className="text-gris">
              {t("photo", { author: u.photo_auteur || t("unknown") })} ·{" "}
              {u.photo_licence_url ? (
                <a href={u.photo_licence_url} target="_blank" rel="noopener noreferrer license" className="underline hover:text-rouge">
                  {u.photo_licence}
                </a>
              ) : (
                u.photo_licence
              )}
              , via{" "}
              <a href={u.photo_source} target="_blank" rel="noopener noreferrer" className="underline hover:text-rouge">
                Wikimedia Commons
              </a>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-8 max-w-2xl text-xs text-gris">{t("logos")}</p>
    </div>
  );
}
