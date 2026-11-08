import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { getPortalSession } from "@/lib/portal/session";
import { AppAndNotifications, LogoutButton, PasswordChange } from "@/components/portal/account-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getTranslations("portal.account"))("title") };
}

export default async function PortalAccountPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const session = await getPortalSession();
  if (!session) redirect(`/${params.locale}/espace/connexion`);
  const t = await getTranslations("portal.account");
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4 border-b border-bord py-2.5 text-[14px] last:border-0">
      <dt className="text-gris">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold">{value}</dd>
    </div>
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      <section className="card p-5">
        <h2 className="mb-1 text-[15px] font-bold">{t("profile")}</h2>
        <dl>
          {row(t("name"), session.name)}
          {row(t("email"), session.email)}
          {row(t("role"), t(`roles.${session.role}`))}
          {row(t("file"), session.candidate.code)}
        </dl>
      </section>
      <section className="card p-5">
        <h2 className="mb-3 text-[15px] font-bold">{t("password")}</h2>
        <PasswordChange hasPassword={session.hasPassword} />
      </section>
      <section className="card p-5">
        <h2 className="mb-2 text-[15px] font-bold">{t("app")}</h2>
        <AppAndNotifications />
      </section>
      <LogoutButton />
    </div>
  );
}
