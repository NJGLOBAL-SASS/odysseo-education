import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";

/** Référence inconnue ou offre non publiable : 404 avec un lien vers le catalogue. */
export default async function OfferNotFound() {
  const t = await getTranslations("offers.notFound");
  return (
    <div className="wrap-site max-w-xl py-16 text-center">
      <p className="text-sm font-extrabold uppercase tracking-wide text-rouge">404</p>
      <h1 className="mt-2 text-3xl font-extrabold">{t("title")}</h1>
      <p className="mt-3 text-gris">{t("text")}</p>
      <Link href="/offres" className="btn-dark mx-auto mt-6 !w-auto px-5">
        <ArrowLeft className="h-4 w-4" /> {t("link")}
      </Link>
    </div>
  );
}
