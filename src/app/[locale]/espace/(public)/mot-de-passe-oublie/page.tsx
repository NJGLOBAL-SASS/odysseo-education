import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ForgotForm } from "@/components/portal/auth-forms";

export async function generateMetadata() {
  return { title: (await getTranslations("portal.forgot"))("title") };
}

export default async function PortalForgotPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("portal.forgot");
  return (
    <div className="card p-5 sm:p-6">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <p className="mb-5 mt-1 text-[15px] text-gris">{t("intro")}</p>
      <ForgotForm />
      <p className="mt-5 text-center text-[14px]">
        <Link href="/espace/connexion" className="font-semibold underline underline-offset-2">
          {t("back")}
        </Link>
      </p>
    </div>
  );
}
