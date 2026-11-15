import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";

import type { Locale } from "@/lib/programs";
import { getAdmissionLetters, proofCaption } from "@/lib/content/trust";
import { ProofGallery } from "@/components/trust/proof-gallery";
import { Zh } from "@/components/ui/zh";
import { CountUp } from "@/components/ui/count-up";

/**
 * Mur des admissions (accueil) : toutes les lettres d'admission réelles et floutées
 * de content/preuves.json (type "admission_notice"). Non rendu si la liste est vide.
 */
export async function AdmissionWall({ locale }: { locale: Locale }) {
  const letters = getAdmissionLetters();
  if (letters.length === 0) return null;
  const t = await getTranslations("home.admissions");

  return (
    <section id="admissions" className="scroll-mt-20 bg-fond py-12" aria-labelledby="admissions-title">
      <div className="wrap-site">
        <p className="text-sm font-extrabold uppercase tracking-wide text-rouge">{t("eyebrow")}</p>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="admissions-title" className="text-2xl font-extrabold sm:text-3xl">
            {t("title")}
            <Zh>录取通知书</Zh>
          </h2>
          <p className="flex items-baseline gap-1.5 text-[15px] font-bold">
            <span className="text-3xl font-extrabold text-rouge">
              <CountUp value={letters.length} locale={locale} />
            </span>
            {t("countLabel", { count: letters.length })}
          </p>
        </div>
        <p className="mb-5 mt-2 max-w-2xl text-[15px] text-gris">{t("intro")}</p>
        <ProofGallery layout="strip" items={letters.map((p) => ({ id: p.id, image: p.image, caption: proofCaption(p, locale) }))} />
        <p className="mt-2 flex items-start gap-2 text-sm text-gris">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-rouge" />
          {t("hint")}
        </p>
      </div>
    </section>
  );
}
