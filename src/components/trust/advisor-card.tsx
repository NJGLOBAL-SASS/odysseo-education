import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { MessageCircle, UserRound } from "lucide-react";

import type { Locale } from "@/lib/programs";
import { advisorRole, getAdvisors } from "@/lib/content/trust";
import { cn } from "@/lib/utils";

/** « Votre conseiller : Prénom, rôle » (PACK-06). Non rendue si content/conseillers.json est vide. */
export async function AdvisorCard({
  locale,
  className,
  wrapperClassName,
}: {
  locale: Locale;
  className?: string;
  /** Conteneur optionnel (ex. largeur de page), rendu seulement s'il y a un conseiller. */
  wrapperClassName?: string;
}) {
  const advisor = getAdvisors()[0];
  if (!advisor) return null;
  const t = await getTranslations("proof");
  const wa = (advisor.whatsapp || "").replace(/\D/g, "");

  const card = (
    <div className={cn("flex items-center gap-3 rounded-brand border border-bord bg-white p-3", className)}>
      {advisor.photo ? (
        <Image src={advisor.photo} alt="" width={48} height={48} sizes="48px" className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-fond text-gris">
          <UserRound className="h-6 w-6" />
        </span>
      )}
      <div className="min-w-0 flex-1 text-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-gris">{t("advisorLabel")}</p>
        <p className="font-extrabold">
          {advisor.prenom}, <span className="font-semibold">{advisorRole(advisor, locale)}</span>
        </p>
        {advisor.langues && advisor.langues.length > 0 && (
          <p className="text-xs text-gris">{t("speaks", { languages: advisor.langues.join(", ") })}</p>
        )}
      </div>
      {wa && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          data-track-location="conseiller"
          aria-label={t("advisorWhatsapp")}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1FAF55] text-white"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
      )}
    </div>
  );
  return wrapperClassName ? <div className={wrapperClassName}>{card}</div> : card;
}
