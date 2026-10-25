import { setRequestLocale, getTranslations } from "next-intl/server";

import { IntakeForm } from "@/components/forms/intake/intake-form";
import { BrandWatermark } from "@/components/layout/brand-watermark";

export default async function PostulerPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("home.hero");

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] bg-fond">
      <BrandWatermark />
      <div className="relative overflow-hidden bg-noir py-7 text-center text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo/logo-mark-white.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-1/2 w-72 -translate-y-1/2 opacity-[0.08]"
        />
        <h1 className="relative px-4 text-xl font-extrabold sm:text-2xl">{t("tagline")}</h1>
        <div className="relative mx-auto mt-3 h-[3px] w-12 rounded-full bg-rouge" />
      </div>
      <div className="relative pb-10">
        <IntakeForm />
      </div>
    </div>
  );
}
