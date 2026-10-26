import { getTranslations } from "next-intl/server";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Glyph404 } from "@/components/errors/not-found-view";

/** Élément introuvable dans le dashboard (dossier supprimé, lien erroné) : reste dans la coquille équipe. */
export default async function DashboardNotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="card mx-auto mt-6 max-w-xl px-6 py-12 text-center">
      <Glyph404 size="sm" />
      <div className="mx-auto mt-4 h-[3px] w-10 rounded-full bg-rouge" />
      <h1 className="mt-4 text-xl font-extrabold">{t("itemTitle")}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-gris">{t("itemText")}</p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Link href="/dashboard/candidatures" className="btn-sm-ghost">
          <ArrowLeft className="h-4 w-4" /> {t("candidates")}
        </Link>
        <Link href="/dashboard" className="btn-sm-dark">
          <LayoutDashboard className="h-4 w-4" /> {t("dashboard")}
        </Link>
      </div>
    </div>
  );
}
