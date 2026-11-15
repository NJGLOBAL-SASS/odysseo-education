import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, ArrowRight, Check, ChevronDown, Receipt } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { PROGRAMS, formatFcfa, type Locale } from "@/lib/programs";
import { getFaqPicks } from "@/lib/content/faq";
import { AdvisorCard } from "@/components/trust/advisor-card";
import { Zh } from "@/components/ui/zh";
import { getSitePhoto } from "@/lib/content/trust";

/** Images des cursus (photos du site sous licence libre), à défaut l'image du cursus. */
export const CURSUS_PHOTO = { "langue-chinoise": "cursus-langue", bachelor: "cursus-licence", master: "cursus-master", doctorat: "cursus-doctorat" } as const;

/** « Comment ça marche » : 4 étapes, un seul interlocuteur. */
export async function HowItWorks() {
  const t = await getTranslations("home.steps");
  const steps = t.raw("items") as { title: string; text: string }[];

  return (
    <section className="wrap-site py-12" aria-labelledby="steps-title">
      <h2 id="steps-title" className="text-2xl font-extrabold sm:text-3xl">
        {t("title")}
        <Zh>申请流程</Zh>
      </h2>
      <p className="mt-1 text-gris">{t("subtitle")}</p>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="card relative p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rouge text-[15px] font-extrabold text-white">
              {i + 1}
            </span>
            <h3 className="mt-3 text-lg font-extrabold">{s.title}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-gris">{s.text}</p>
          </li>
        ))}
      </ol>
      <Link href="/postuler" className="btn-primary mt-6 w-full sm:w-auto" data-track-location="accueil-etapes">
        {t("cta")} <ArrowRight className="h-5 w-5" />
      </Link>
    </section>
  );
}

/** Les cursus, en cartes courtes (le détail et les tarifs complets sont sur /cursus). */
export async function ProgramsStrip({ locale }: { locale: Locale }) {
  const t = await getTranslations("home.programs");

  return (
    <section className="wrap-site py-12" aria-labelledby="programs-title">
      <h2 id="programs-title" className="mb-6 text-2xl font-extrabold sm:text-3xl">
        {t("title")}
        <Zh>学习项目</Zh>
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PROGRAMS.map((p) => (
          <li key={p.slug}>
            <Link href={`/cursus/${p.slug}`} className="card group flex h-full flex-col overflow-hidden hover:shadow-pop">
              <div className="relative h-40 overflow-hidden bg-noir sm:h-44">
                <Image
                  src={getSitePhoto(CURSUS_PHOTO[p.slug])?.image ?? p.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-noir/90 via-noir/20 to-transparent" />
                <h3 className="absolute bottom-3 left-4 text-xl font-extrabold text-white">{p.name[locale]}</h3>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="line-clamp-3 text-[15px] text-gris">{p.cardText[locale]}</p>
                <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                  <div>
                    <p className="text-xs text-gris">{t("from")}</p>
                    <p className="text-lg font-extrabold tabular-nums">
                      {formatFcfa(p.price, locale)} <span className="text-xs font-bold">FCFA</span>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-bold group-hover:text-rouge">
                    {t("discover")} <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Combien et quand on paie, avec l'avertissement anti-arnaque et l'engagement honnête. */
export async function PaymentTrust() {
  const t = await getTranslations("home.payment");

  return (
    <section className="wrap-site py-12" aria-labelledby="payment-title">
      <div className="grid gap-6 rounded-brand bg-noir p-6 text-white sm:p-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 id="payment-title" className="flex items-center gap-2 text-2xl font-extrabold">
            <Receipt className="h-6 w-6 text-rouge" /> {t("title")}
            <Zh className="text-[#9C9CA6]">费用说明</Zh>
          </h2>
          <ul className="mt-4 space-y-3">
            {(t.raw("points") as string[]).map((p) => (
              <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-[#E4E4EA]">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-rouge" strokeWidth={3} /> {p}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-[#B9B9C2]">{t("honest")}</p>
          <Link href="/cursus" className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-bold text-white hover:text-rouge">
            {t("link")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="self-start rounded-brand border border-[#F5C26B]/40 bg-[#2A2312] p-5">
          <p className="flex items-center gap-2 font-extrabold text-[#F5C26B]">
            <AlertTriangle className="h-5 w-5" /> {t("alertTitle")}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#F3E6C8]">{t("alert")}</p>
        </div>
      </div>
    </section>
  );
}

/** 4 questions choisies dans content/faq (catégorie, position) — même ordre en FR et en EN. */
const FAQ_PICKS = [
  ["bourses", 2], // La bourse est-elle garantie ?
  ["conditions", 2], // Dois-je parler chinois ?
  ["paiement", 2], // Que se passe-t-il si je ne suis admis nulle part ?
  ["parents", 0], // Comment vérifier que ce n'est pas une arnaque ?
] as const;

export async function HomeFaq({ locale }: { locale: Locale }) {
  const questions = getFaqPicks(locale, FAQ_PICKS);
  if (questions.length === 0) return null;
  const t = await getTranslations("home.faq");

  return (
    <section className="wrap-site py-12" aria-labelledby="faq-title">
      <div className="mx-auto max-w-3xl">
        <h2 id="faq-title" className="mb-5 text-2xl font-extrabold sm:text-3xl">
          {t("title")}
          <Zh>常见问题</Zh>
        </h2>
        <div className="divide-y divide-bord rounded-brand border border-bord bg-white">
          {questions.map((x) => (
            <details key={x.id} className="group">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 font-bold [&::-webkit-details-marker]:hidden">
                {x.q}
                <ChevronDown className="h-5 w-5 flex-shrink-0 text-gris transition-transform group-open:rotate-180" />
              </summary>
              <p className="whitespace-pre-line px-5 pb-4 text-[15px] leading-relaxed text-gris">{x.r}</p>
            </details>
          ))}
        </div>
        <Link href="/faq" className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-bold hover:text-rouge">
          {t("all")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/** Dernier appel à l'action, avec la carte du conseiller si elle est renseignée. */
export async function FinalCta({ locale }: { locale: Locale }) {
  const t = await getTranslations("home.final");

  return (
    <section className="wrap-site pb-14 pt-4" aria-labelledby="final-title">
      <div className="flex flex-col gap-5 rounded-brand bg-rouge p-6 text-white sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="final-title" className="text-2xl font-extrabold sm:text-3xl">
            {t("title")}
          </h2>
          <p className="mt-1 max-w-xl text-white/90">{t("text")}</p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <Link href="/postuler" className="btn bg-white text-noir hover:bg-fond" data-track-location="accueil-final">
            {t("cta")} <ArrowRight className="h-5 w-5" />
          </Link>
          <AdvisorCard locale={locale} className="max-w-sm text-noir" />
        </div>
      </div>
    </section>
  );
}
