import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ListChecks, MessageCircle } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { FaqExplorer } from "@/components/content/faq-explorer";
import { getFaq } from "@/lib/content/faq";
import { publicPageMetadata, toLocale } from "@/lib/seo";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return publicPageMetadata("faq", params.locale);
}

/** FAQ (PACK-09) : textes de content/faq/faq_{fr,en}.json, questions [À VALIDER] masquées. */
export default async function FaqPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const locale = toLocale(params.locale);
  const t = await getTranslations("faq");
  const categories = getFaq(locale);
  const waNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");

  // Données structurées FAQPage, générées à partir des seules questions affichées.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: categories.flatMap((c) =>
      c.questions.map((x) => ({
        "@type": "Question",
        name: x.q,
        acceptedAnswer: { "@type": "Answer", text: x.r },
      })),
    ),
  };

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="bg-noir text-white">
        <div className="wrap-site max-w-[820px] py-12 sm:py-16">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-[#D4D4DA]">{t("intro")}</p>
        </div>
        <div className="h-[5px] bg-rouge" />
      </section>

      <div className="wrap-site relative max-w-[820px] py-10">
        <FaqExplorer categories={categories} />

        <Link
          href="/guides/avant-le-depart"
          className="mt-10 flex items-center gap-3 rounded-brand border-[1.5px] border-bord bg-white p-4 text-[15px] font-bold hover:border-noir"
        >
          <ListChecks className="h-5 w-5 flex-shrink-0 text-rouge" />
          <span className="flex-1">{t("guideLink")}</span>
          <ArrowRight className="h-4 w-4 flex-shrink-0" />
        </Link>

        <section className="mt-10 rounded-brand bg-noir p-6 text-white sm:p-8">
          <h2 className="text-xl font-extrabold sm:text-2xl">{t("notFoundTitle")}</h2>
          <p className="mt-2 text-[15px] text-[#D4D4DA]">{t("notFoundText")}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                data-track-location="faq"
                className="btn-wa sm:!w-auto"
              >
                <MessageCircle className="h-5 w-5" /> {t("whatsapp")}
              </a>
            )}
            <Link href="/postuler" className="btn-primary sm:!w-auto">
              {t("freeAnalysis")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
