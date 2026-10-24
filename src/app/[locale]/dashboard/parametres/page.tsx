import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TwoFactorSetup } from "@/components/dashboard/two-factor-setup";
import { PushSubscribeButton } from "@/components/dashboard/push-subscribe-button";

export default async function DashboardSettingsPage() {
  const t = await getTranslations("dashboard.settings");
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-extrabold">{t("title")}</h1>

      <div className="card mb-4 p-5">
        <h2 className="mb-2 font-extrabold">{t("twoFactor")}</h2>
        <p className="mb-3 text-sm text-gris">
          Ajoutez une couche de sécurité supplémentaire avec une application d&apos;authentification
          (Google Authenticator, Authy...).
        </p>
        <TwoFactorSetup enabled={Boolean(user?.twoFactorEnabled)} />
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-extrabold">{t("notifications")}</h2>
        <p className="mb-3 text-sm text-gris">
          Recevez une alerte sur cet appareil dès qu&apos;une nouvelle candidature arrive.
        </p>
        <PushSubscribeButton />
      </div>
    </div>
  );
}
