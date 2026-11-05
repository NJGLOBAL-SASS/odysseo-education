import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { DepartureChecklist } from "@/components/content/departure-checklist";
import { getChecklist } from "@/lib/content/faq";
import { SITE_URL, publicPageMetadata, toLocale } from "@/lib/seo";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return publicPageMetadata("guide", params.locale);
}

/**
 * Impression (« Imprimer / Enregistrer en PDF ») : noir sur blanc, logo en tête,
 * sans menu ni pied de page, 2 pages A4 maximum. Ces règles ne s'appliquent qu'à
 * cette page (elles remplacent les marges A4 des brochures définies dans globals.css).
 */
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 14mm 16mm; }
  html, body { background: #fff !important; color: #000 !important; }
  body * { box-shadow: none !important; }
  .guide-page { padding: 0 !important; }
  .checklist-section { break-inside: avoid; }
}
`;

/** Guide « Avant le départ » (PACK-09) : content/guides/checklist_depart_{fr,en}.json. */
export default async function DepartureGuidePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const locale = toLocale(params.locale);
  const t = await getTranslations("guide");
  const checklist = getChecklist(locale);

  return (
    <div className="guide-page bg-fond print:bg-white">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <section className="bg-noir text-white print:hidden">
        <div className="wrap-site max-w-[820px] py-12 sm:py-16">
          <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-rouge">{t("eyebrow")}</p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{checklist.titre}</h1>
          <p className="mt-3 max-w-2xl text-[#D4D4DA]">{t("intro")}</p>
        </div>
        <div className="h-[5px] bg-rouge" />
      </section>

      {/* En-tête imprimé uniquement : logo et titre. */}
      <div className="hidden print:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo/logo-full-black-tight.png" alt="Odysseo Education" className="h-[11mm] w-auto" />
        <h1 className="mt-4 border-b-[2pt] border-black pb-2 text-[17pt] font-extrabold text-black">{checklist.titre}</h1>
      </div>

      <div className="wrap-site max-w-[820px] py-10 print:max-w-none print:p-0 print:py-0">
        <DepartureChecklist sections={checklist.sections} />

        <Link
          href="/faq"
          className="mt-10 inline-flex items-center gap-2 text-[15px] font-bold text-rouge hover:underline print:hidden"
        >
          {t("faqLink")} <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="hidden pt-4 text-[9pt] text-black print:block">
          {t("printFooter", {
            date: new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(
              new Date(`${checklist.version}T00:00:00Z`),
            ),
          })}{" "}
          · {SITE_URL.replace(/^https?:\/\//, "")}
        </p>
      </div>
    </div>
  );
}
