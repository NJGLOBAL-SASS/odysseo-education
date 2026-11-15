import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getUniversityLogos, hasCreditedPhoto } from "@/lib/content/trust";
import { publicPageMetadata } from "@/lib/seo";
import { Zh } from "@/components/ui/zh";
import { UniversityGrid } from "@/components/home/university-grid";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return publicPageMetadata("universities", params.locale);
}

/**
 * Toutes les universités publiées dans content/universites.json, avec une recherche.
 * Aucune ne renvoie vers l'université : l'étudiant passe par son conseiller.
 */
export default async function UniversitiesPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const list = getUniversityLogos();
  if (list.length === 0) notFound();
  const t = await getTranslations("universities");

  return (
    <div className="wrap-site py-10 sm:py-14">
      <p className="text-sm font-extrabold uppercase tracking-wide text-rouge">{t("eyebrow")}</p>
      <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
        {t("title", { count: list.length })}
        <Zh>院校库</Zh>
      </h1>
      <p className="mt-3 max-w-2xl text-gris">{t("intro")}</p>

      <div className="mt-6 flex flex-col gap-3 rounded-brand bg-noir p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[15px]">{t("ctaText")}</p>
        <Link href="/postuler" className="btn-primary flex-shrink-0" data-track-location="universites">
          {t("cta")} <ArrowRight className="h-5 w-5" />
        </Link>
      </div>

      <UniversityGrid
        items={list.map((u) => ({
          id: u.id,
          en: u.nom_en,
          zh: u.nom_zh ?? "",
          logo: u.logo,
          ...(hasCreditedPhoto(u) ? { photo: u.photo, photoTitle: `${u.photo_auteur ?? ""} · ${u.photo_licence}` } : {}),
        }))}
      />

      <p className="mt-8 text-xs text-gris">
        {t("credit")}{" "}
        <Link href="/credits-photos" className="underline hover:text-rouge">
          {t("creditsLink")}
        </Link>
      </p>
    </div>
  );
}
