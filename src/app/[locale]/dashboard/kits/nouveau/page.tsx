import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { publicSiteUrl } from "@/lib/referral";
import { KitEditor } from "@/components/dashboard/kit-editor";

export default async function NewKitPage() {
  const t = await getTranslations("dashboard.kits");
  return (
    <div className="space-y-4">
      <Link href="/dashboard/kits" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gris hover:text-noir">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>
      <h1 className="text-2xl font-extrabold">{t("editor.newTitle")}</h1>
      <KitEditor siteUrl={publicSiteUrl()} />
    </div>
  );
}
