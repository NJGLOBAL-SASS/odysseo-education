/* eslint-disable @next/next/no-img-element -- logos et photos déjà à la bonne taille (WebP) */
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, Award, Building2, CalendarDays, Landmark, MapPin } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { locales } from "@/i18n/config";
import { PROGRAMS, type Locale } from "@/lib/programs";
import { getUniversity, getUniversityLogos, hasCreditedPhoto, universityPlace } from "@/lib/content/trust";
import { buildPageMetadata } from "@/lib/seo";
import { Zh } from "@/components/ui/zh";
import { CampusVideoCards } from "@/components/home/campus-video-cards";
import { campusVideoCards } from "@/components/home/campus-videos";

/** Niveau pré-sélectionné dans le formulaire /postuler (?level=). */
const LEVEL_PARAM = { "langue-chinoise": "language", bachelor: "licence", master: "master", doctorat: "doctorat" } as const;

export function generateStaticParams() {
  return locales.flatMap((locale) => getUniversityLogos().map((u) => ({ locale, id: u.id })));
}

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  const u = getUniversity(params.id);
  if (!u) return {};
  const locale = (params.locale === "en" ? "en" : "fr") as Locale;
  const t = await getTranslations({ locale, namespace: "university" });
  const { city } = universityPlace(u, locale);
  const place = city || (locale === "en" ? "China" : "Chine");
  return buildPageMetadata({
    locale,
    path: `/universites/${u.id}`,
    title: t("metaTitle", { name: u.nom_en, place }),
    description: t("metaDescription", { name: u.nom_en, place }),
    defaultImage: true,
  });
}

/**
 * Fiche d'une université (faits Wikidata, photo Wikimedia Commons créditée).
 * Aucun lien vers l'université : la seule action proposée est de soumettre son dossier
 * à Odysseo. Programmes, bourses et frais sont remis dans le rapport personnalisé.
 */
export default async function UniversityPage({ params }: { params: { locale: string; id: string } }) {
  setRequestLocale(params.locale);
  const u = getUniversity(params.id);
  if (!u) notFound();
  const locale = (params.locale === "en" ? "en" : "fr") as Locale;
  const t = await getTranslations("university");
  const { city, province } = universityPlace(u, locale);
  const place = [city, province].filter(Boolean).join(", ");
  const photo = hasCreditedPhoto(u) ? u : null;

  const intro = [
    t("intro", {
      name: u.nom_en,
      kind: u.prive ? t("kindPrivate") : t("kindPublic"),
      founded: u.creation ? String(u.creation) : "none",
      place: place || "none",
    }),
    u.domaine ? t("domainSentence", { domain: t(`domains.${u.domaine}`) }) : "",
    u.double_first_class ? t("dfcSentence") : "",
    u.ministere ? t("ministrySentence") : "",
  ]
    .filter(Boolean)
    .join(" ");

  const videos = await campusVideoCards(locale, (id) => id === u.id);
  const tv = await getTranslations("campusVideos");

  const credit = photo
    ? t("photoCredit", { author: photo.photo_auteur || t("photoUnknown"), license: photo.photo_licence })
    : null;

  return (
    <div className="bg-fond">
      <div className="wrap-site py-6 sm:py-10">
        <Link href="/universites" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-gris hover:text-noir">
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </Link>

        <div className="mt-2 grid gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
          {/* Carte de l'université (fixe sur ordinateur), avec la seule action proposée. */}
          <aside className="card overflow-hidden lg:sticky lg:top-24">
            <div className="relative bg-noir">
              {photo ? (
                <img src={photo.photo} alt="" width={640} height={400} className="aspect-[16/10] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center bg-fond">
                  <img src={u.logo} alt="" width={96} height={96} className="h-24 w-24 object-contain" />
                </div>
              )}
              {photo && (
                <img
                  src={u.logo}
                  alt=""
                  width={64}
                  height={64}
                  className="absolute -bottom-8 left-5 h-16 w-16 rounded-full border-2 border-white bg-white object-contain p-1 shadow-card"
                />
              )}
            </div>
            <div className={`px-5 pb-5 ${photo ? "pt-10" : "pt-4"}`}>
              <h1 className="text-2xl font-extrabold leading-tight">{u.nom_en}</h1>
              {u.nom_zh && <p className="mt-0.5 text-gris">{u.nom_zh}</p>}

              <dl className="mt-4 divide-y divide-bord border-y border-bord text-sm">
                {city && <Fact icon={<MapPin className="h-4 w-4" />} label={t("city")} value={city} />}
                {province && <Fact icon={<Landmark className="h-4 w-4" />} label={t("province")} value={province} />}
                {u.creation && <Fact icon={<CalendarDays className="h-4 w-4" />} label={t("founded")} value={String(u.creation)} />}
                <Fact icon={<Building2 className="h-4 w-4" />} label={t("status")} value={u.prive ? t("private") : t("public")} />
                {u.double_first_class && <Fact icon={<Award className="h-4 w-4 text-rouge" />} label={t("dfc")} value="✓" />}
              </dl>

              <Link href="/postuler" className="btn-primary mt-5 w-full !px-3 !text-[15px]" data-track-location={`universite-${u.id}`}>
                {t("cta")} <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-2 text-center text-xs text-gris">{t("ctaHint")}</p>
              {credit && (
                <p className="mt-4 border-t border-bord pt-3 text-[11px] leading-snug text-gris lg:hidden">
                  {credit} ·{" "}
                  <Link href="/credits-photos" className="underline">
                    {t("allCredits")}
                  </Link>
                </p>
              )}
            </div>
          </aside>

          <div className="space-y-6">
            {u.double_first_class && (
              <p className="inline-flex items-center gap-2 rounded-full bg-noir px-3 py-1.5 text-sm font-bold text-white">
                <Award className="h-4 w-4 text-rouge" /> {t("dfc")} · <span className="font-semibold text-[#C9C9D1]">{t("dfcText")}</span>
              </p>
            )}

            <section className="card p-5 sm:p-6" aria-labelledby="about-title">
              <h2 id="about-title" className="text-xl font-extrabold">
                {t("about")}
                <Zh>学校概况</Zh>
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed">{intro}</p>
            </section>

            {photo && (
              <section aria-labelledby="campus-title" className="hidden lg:block">
                <h2 id="campus-title" className="mb-3 text-xl font-extrabold">
                  {t("campus")}
                  <Zh>校园风光</Zh>
                </h2>
                <figure className="card overflow-hidden">
                  <img src={photo.photo} alt={`${t("campus")} – ${u.nom_en}`} width={640} height={400} className="aspect-[16/9] w-full object-cover" />
                  <figcaption className="px-4 py-2.5 text-xs text-gris">
                    {credit}{" "}
                    ·{" "}
                    <Link href="/credits-photos" className="underline hover:text-rouge">
                      {t("allCredits")}
                    </Link>
                  </figcaption>
                </figure>
              </section>
            )}

            {videos.length > 0 && (
              <section aria-labelledby="video-title">
                <h2 id="video-title" className="mb-3 text-xl font-extrabold">
                  {tv("campusTitle")}
                  <Zh>校园视频</Zh>
                </h2>
                <CampusVideoCards items={videos} showUniversityLink={false} />
                <p className="mt-2 text-xs text-gris">{tv("privacy")}</p>
              </section>
            )}

            <section aria-labelledby="levels-title">
              <h2 id="levels-title" className="text-xl font-extrabold">
                {t("levelsTitle", { name: u.nom_en })}
                <Zh>学习项目</Zh>
              </h2>
              <p className="mt-1 max-w-2xl text-[15px] text-gris">{t("levelsIntro")}</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {PROGRAMS.map((p) => (
                  <li key={p.slug} className="card flex flex-col p-4">
                    <h3 className="text-lg font-extrabold">{p.name[locale]}</h3>
                    <p className="mt-1 line-clamp-3 text-sm text-gris">{p.cardText[locale]}</p>
                    <Link
                      href={`/postuler?level=${LEVEL_PARAM[p.slug]}`}
                      className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-rouge hover:underline"
                    >
                      {t("levelCta")} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-brand bg-noir p-6 text-white sm:p-8" aria-labelledby="report-title">
              <h2 id="report-title" className="text-2xl font-extrabold">
                {t("reportTitle")}
              </h2>
              <p className="mt-2 max-w-2xl text-[#D4D4DA]">{t("reportText")}</p>
              <Link href="/postuler" className="btn-primary mt-5 sm:!w-auto" data-track-location={`universite-${u.id}-rapport`}>
                {t("submit")} <ArrowRight className="h-5 w-5" />
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="flex items-center gap-2 text-gris">
        {icon} {label}
      </dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
