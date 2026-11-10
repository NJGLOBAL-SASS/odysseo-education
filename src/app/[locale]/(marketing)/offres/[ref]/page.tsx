import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, CalendarClock, Info, MessageCircle } from "lucide-react";

import { locales } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { formatDeadline, formatIntake } from "@/components/offers/format";
import { getPublicOffer, publicOfferSlugs, type PublicOffer } from "@/lib/offers/public-catalogue";
import { buildPageMetadata, toLocale } from "@/lib/seo";

export function generateStaticParams() {
  return locales.flatMap((locale) => publicOfferSlugs().map((ref) => ({ locale, ref })));
}

/** Niveau du formulaire /postuler correspondant au cycle de l'offre. */
const FORM_LEVEL = { master: "master", phd: "doctorat" } as const;

export async function generateMetadata({ params }: { params: { locale: string; ref: string } }): Promise<Metadata> {
  const locale = toLocale(params.locale);
  const offer = getPublicOffer(params.ref, locale);
  if (!offer) return {};
  const t = await getTranslations({ locale, namespace: "offers" });
  const cycle = t(`cycles.${offer.cycle}`);
  return buildPageMetadata({
    locale,
    path: `/offres/${offer.slug}`,
    title: t("detail.metaTitle", { cycle, city: offer.ville, ref: offer.ref }),
    description: t("detail.metaDescription", {
      cycle,
      place: offer.lieu_affiche,
      intake: formatIntake(offer.rentree, locale),
      arguments: offer.arguments.join(" · "),
    }),
  });
}

/** /offres/[ref] — une page par offre publiable (PACK-03), destination des publicités « Envoyez P-04 ». */
export default async function OfferPage({ params }: { params: { locale: string; ref: string } }) {
  setRequestLocale(params.locale);
  const locale = toLocale(params.locale);
  const offer = getPublicOffer(params.ref, locale);
  if (!offer) notFound();
  // URL canonique en minuscules (/fr/offres/MA-24 → /fr/offres/ma-24).
  if (params.ref !== offer.slug) permanentRedirect(`/${locale}/offres/${offer.slug}`);

  const t = await getTranslations("offers");
  const waNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(t("detail.waMessage", { ref: offer.ref }))}` : null;
  const applyHref = `/postuler?ref=${offer.ref}&level=${FORM_LEVEL[offer.cycle]}`;
  const ns = t("detail.notSpecified");

  const rows: [string, string | null][] = [
    [t("detail.table.language"), offer.langue],
    [t("detail.table.duration"), offer.duree],
    [t("detail.table.scholarship"), offer.bourse_texte],
    [t("detail.table.allowance"), offer.allocation_texte],
    [t("detail.table.housing"), offer.logement_texte],
    [t("detail.table.conditions"), offer.conditions_texte],
    [t("detail.table.deadline"), offer.date_limite ? formatDeadline(offer.date_limite, locale) : null],
  ];

  return (
    <div className="bg-white">
      <section className="bg-noir text-white">
        <div className="wrap-site max-w-[900px] py-10 sm:py-14">
          <Link href="/offres" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#C9C9D1] hover:text-white">
            <ArrowLeft className="h-4 w-4" /> {t("detail.back")}
          </Link>
          <p className="text-sm font-extrabold uppercase tracking-wide text-rouge">{t("detail.ref", { ref: offer.ref })}</p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-5xl">{t("card.university", { place: offer.lieu_affiche })}</h1>
          <p className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
            <span className="rounded-full bg-white px-3 py-1 text-noir">{t(`cycles.${offer.cycle}`)}</span>
            <span className="rounded-full border border-white/30 px-3 py-1">{t("detail.intake", { date: formatIntake(offer.rentree, locale) })}</span>
            {offer.date_limite && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rouge px-3 py-1">
                <CalendarClock className="h-4 w-4" /> {t("card.deadline", { date: formatDeadline(offer.date_limite, locale) })}
              </span>
            )}
          </p>
          {offer.arguments.length > 0 && (
            <ul className="mt-5 space-y-1 text-[17px] text-[#E5E5EA]">
              {offer.arguments.map((a) => (
                <li key={a}>✓ {a}</li>
              ))}
            </ul>
          )}
          <Cta applyHref={applyHref} waHref={waHref} t={t} className="mt-7" />
        </div>
        <div className="h-[5px] bg-rouge" />
      </section>

      <div className="wrap-site max-w-[900px] space-y-10 py-10 sm:py-12">
        <section aria-labelledby="essentiel">
          <h2 id="essentiel" className="mb-3 text-2xl font-extrabold">
            {t("detail.summary")}
          </h2>
          <dl className="card divide-y divide-bord">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                <dt className="text-[14px] font-bold text-gris">{label}</dt>
                <dd className="text-[15px]">{value || ns}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[13px] text-gris">{t("detail.note")}</p>
        </section>

        <Majors offer={offer} t={t} />

        <aside className="rounded-brand border-l-[4px] border-rouge bg-fond p-5">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Info className="h-5 w-5 text-rouge" /> {t("detail.whyTitle")}
          </h2>
          <p className="mt-2 text-[15px]">{t("detail.whyText")}</p>
        </aside>

        <div className="card p-5 sm:p-6">
          <Cta applyHref={applyHref} waHref={waHref} t={t} light />
        </div>
      </div>
    </div>
  );
}

type T = Awaited<ReturnType<typeof getTranslations<"offers">>>;

function Cta({ applyHref, waHref, t, light, className }: { applyHref: string; waHref: string | null; t: T; light?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={applyHref} className="btn-primary sm:!w-auto sm:px-6" data-track-location="offre_eligibilite">
          {t("detail.eligibility")} <ArrowRight className="h-4 w-4" />
        </Link>
        {waHref && (
          <a href={waHref} target="_blank" rel="noopener noreferrer" data-track-location="offre_whatsapp" className="btn-wa sm:!w-auto sm:px-6">
            <MessageCircle className="h-4 w-4" /> {t("detail.whatsapp")}
          </a>
        )}
      </div>
      <p className={`mt-2 text-[13px] ${light ? "text-gris" : "text-[#C9C9D1]"}`}>{t("detail.eligibilityHint")}</p>
    </div>
  );
}

function Majors({ offer, t }: { offer: PublicOffer; t: T }) {
  const groups = (["anglais", "chinois"] as const)
    .map((lang) => ({ lang, items: offer.filieres.filter((f) => f.langue === lang).map((f) => f.nom) }))
    .filter((g) => g.items.length > 0);
  if (groups.length === 0) return null;
  return (
    <section aria-labelledby="filieres">
      <h2 id="filieres" className="mb-3 text-2xl font-extrabold">
        {t("detail.majors", { count: offer.filieres.length })}
      </h2>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.lang} className="card p-4">
            <h3 className="mb-2 text-[15px] font-extrabold">
              {t(`detail.taughtIn.${g.lang}`)} · {g.items.length}
            </h3>
            <ul className="columns-1 gap-6 text-[14px] leading-relaxed sm:columns-2">
              {g.items.map((name) => (
                <li key={name} className="break-inside-avoid py-0.5">
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
