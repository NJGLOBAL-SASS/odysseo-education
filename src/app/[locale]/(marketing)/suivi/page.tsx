import { getTranslations, setRequestLocale } from "next-intl/server";

import { TrackingLookup } from "@/components/tracking/tracking-lookup";
import { publicPageMetadata } from "@/lib/seo";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return publicPageMetadata("tracking", params.locale);
}

/** Suivi de dossier en ligne (PACK-08) : code dossier + 4 derniers chiffres du WhatsApp. */
export default async function TrackingPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("suivi");
  return (
    <div className="relative">
      <section className="bg-noir text-white">
        <div className="wrap-site max-w-[560px] py-10 sm:py-14">
          <h1 className="text-[28px] font-extrabold leading-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 text-[15px] text-[#D4D4DA]">{t("intro")}</p>
        </div>
        <div className="h-[5px] bg-rouge" />
      </section>
      <div className="wrap-site max-w-[560px] py-8">
        <TrackingLookup />
      </div>
    </div>
  );
}
