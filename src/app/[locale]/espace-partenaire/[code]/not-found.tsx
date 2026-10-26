import { getTranslations } from "next-intl/server";
import { KeyRound } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Glyph404 } from "@/components/errors/not-found-view";

/** Code de parrainage inconnu ou suspendu dans l'espace partenaire. */
export default async function PartnerNotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="wrap py-6">
      <div className="card px-6 py-12 text-center">
        <Glyph404 size="sm" />
        <div className="mx-auto mt-4 h-[3px] w-10 rounded-full bg-rouge" />
        <h1 className="mt-4 text-xl font-extrabold">{t("partnerTitle")}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gris">{t("partnerText")}</p>
        <Link href="/espace-partenaire" className="btn-primary mx-auto mt-6 !w-auto">
          <KeyRound className="h-4 w-4" /> {t("partnerRetry")}
        </Link>
      </div>
    </div>
  );
}
