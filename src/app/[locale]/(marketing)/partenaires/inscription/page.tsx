import { getTranslations, setRequestLocale } from "next-intl/server";

import { PartnerApplicationForm } from "@/components/marketing/partner-application-form";
import { BrandWatermark } from "@/components/layout/brand-watermark";
import { CONTRACT_CONFIG } from "@/lib/contracts/service";
import { buildPageMetadata, toLocale } from "@/lib/seo";

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: toLocale(params.locale), namespace: "partnerApply.v2" });
  return buildPageMetadata({ locale: toLocale(params.locale), path: "/partenaires/inscription", title: t("pageTitle"), description: t("pageIntro"), defaultImage: true });
}

/** /partenaires/inscription — demande de partenariat (PACK-11). */
export default async function PartnerSignupPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("partnerApply.v2");
  return (
    <div className="relative isolate">
      <BrandWatermark />
      <div className="wrap-site relative py-10 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 text-center text-3xl font-extrabold">{t("pageTitle")}</h1>
          <p className="mb-8 text-center text-gris">{t("ctaText")}</p>
          <PartnerApplicationForm idTypes={CONTRACT_CONFIG.pieces_identite} payoutMethods={CONTRACT_CONFIG.operateurs_paiement} />
        </div>
      </div>
    </div>
  );
}
