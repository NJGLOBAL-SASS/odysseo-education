import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MessageCircle } from "lucide-react";

import { ContractView } from "@/components/contracts/contract-view";
import { ContractSignForm } from "@/components/contracts/contract-sign-form";
import { commissionTable } from "@/lib/contracts/rules";
import { CONTRACT_CONFIG, contractBlocks, contractFromToken } from "@/lib/contracts/service";

export const dynamic = "force-dynamic";

// Jeton dans l'URL : jamais indexé, jamais transmis en « Referer » aux sites externes.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

/** /partenaires/contrat/[jeton] — lecture et signature en ligne du contrat (PACK-11). */
export default async function ContractPage({ params }: { params: { locale: string; token: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("partnerContract");
  const state = await contractFromToken(params.token);

  if (!state.ok) {
    return (
      <div className="wrap max-w-xl py-16 text-center">
        <h1 className="text-2xl font-extrabold">{t("invalidTitle")}</h1>
        <p className="mt-3 text-gris">{t("invalidText")}</p>
        <a href="https://wa.me/8613179468571" target="_blank" rel="noopener noreferrer" className="btn-wa mx-auto mt-6 !w-auto px-6">
          <MessageCircle className="h-4 w-4" /> {t("whatsapp")}
        </a>
      </div>
    );
  }

  const { contract } = state;
  const fields = contract.fields as Record<string, string>;
  return (
    <div className="wrap max-w-3xl py-8 sm:py-12">
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <p className="mt-3 inline-block rounded-full bg-rouge px-3 py-1.5 text-sm font-bold text-white">{t("banner")}</p>
      <p className="mt-3 text-gris">{t("intro")}</p>
      {params.locale === "en" && <p className="mt-1 text-sm text-gris">{t("textLanguage")}</p>}
      <ContractSignForm
        token={params.token}
        expectedName={fields.partenaire_nom_complet}
        otpMinutes={CONTRACT_CONFIG.otp.validite_minutes}
        contract={<ContractView blocks={contractBlocks(fields)} table={commissionTable(CONTRACT_CONFIG)} partnerName={fields.partenaire_nom_complet} />}
      />
    </div>
  );
}
