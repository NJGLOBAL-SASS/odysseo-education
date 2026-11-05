import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";

import type { Locale } from "@/lib/programs";
import { getProofDocuments, proofCaption } from "@/lib/content/trust";
import { ProofGallery } from "./proof-gallery";

/**
 * « Ce que vous recevez » (PACK-06) : 3 documents réels floutés (Admission Notice,
 * JW202, visa X1) depuis content/preuves.json. Non rendue si la liste est vide.
 */
export async function ProofDocuments({ locale }: { locale: Locale }) {
  const docs = getProofDocuments();
  if (docs.length === 0) return null;
  const t = await getTranslations("proof");

  return (
    <section aria-labelledby="preuves-title">
      <h2 id="preuves-title" className="text-2xl font-extrabold">
        {t("proofsTitle")}
      </h2>
      <p className="mb-4 mt-1 text-[15px] text-gris">{t("proofsIntro")}</p>
      <ProofGallery items={docs.map((p) => ({ id: p.id, image: p.image, caption: proofCaption(p, locale) }))} />
      <p className="mt-4 flex items-start gap-2 text-sm text-gris">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-rouge" />
        {t("proofsCaption")}
      </p>
    </section>
  );
}
