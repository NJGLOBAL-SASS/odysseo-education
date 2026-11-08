import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { PasswordSetupForm } from "@/components/portal/auth-forms";
import { findValidToken } from "@/lib/portal/tokens";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("portal.activate");
  return { title: t("title") };
}

/** Lien reçu par e-mail : choix du mot de passe (invite). */
export default async function Page({ params, searchParams }: { params: { locale: string }; searchParams: { token?: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("portal.activate");
  const token = searchParams.token ?? "";
  const row = await findValidToken(token, "invite");
  return (
    <div className="card p-5 sm:p-6">
      <h1 className="text-2xl font-extrabold">{t("title")}</h1>
      {row ? (
        <>
          <p className="mb-5 mt-1 text-[15px] text-gris">{t("intro", { name: row.account.name.split(/\s+/)[0], email: row.account.email })}</p>
          <PasswordSetupForm token={token} purpose="invite" />
        </>
      ) : (
        <>
          <p className="mt-2 text-[15px]">{t("expired")}</p>
          <Link href="/espace/connexion" className="btn-primary mt-5 w-full">
            {(await getTranslations("portal.forgot"))("back")}
          </Link>
        </>
      )}
    </div>
  );
}
