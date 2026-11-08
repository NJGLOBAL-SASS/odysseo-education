import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/components/portal/auth-forms";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getTranslations("portal.login"))("title") };
}

export default async function PortalLoginPage({ params, searchParams }: { params: { locale: string }; searchParams: { error?: string; next?: string } }) {
  setRequestLocale(params.locale);
  if (await getPortalSession()) redirect(`/${params.locale}/espace`);
  const t = await getTranslations("portal.login");
  return (
    <div className="card p-5 sm:p-6">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <p className="mb-5 mt-1 text-[15px] text-gris">{t("intro")}</p>
      <LoginForm initialError={searchParams.error} next={searchParams.next} />
    </div>
  );
}
