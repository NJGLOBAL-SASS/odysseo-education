import { setRequestLocale, getTranslations } from "next-intl/server";

import { IntakeForm } from "@/components/forms/intake/intake-form";

export default async function PostulerPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("home.hero");

  return (
    <div className="bg-fond">
      <div className="bg-noir py-6 text-center text-white">
        <h1 className="text-xl font-extrabold sm:text-2xl">{t("tagline")}</h1>
      </div>
      <IntakeForm />
    </div>
  );
}
