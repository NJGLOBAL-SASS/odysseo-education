import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { ServicesSection } from "@/components/marketing/services-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { Link } from "@/i18n/navigation";

export default async function ServicesPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("services");
  const tIntake = await getTranslations("intake");

  return (
    <>
      <section className="relative overflow-hidden bg-noir text-white">
        <Image
          src="/images/services/service-00-cover-nos-services.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-60"
        />
        <div className="relative wrap-site flex min-h-[260px] flex-col items-start justify-center py-16">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{t("cover.title")}</h1>
          <Link href="/postuler" className="btn-primary mt-6 !w-auto">
            {tIntake("navigation.submit")}
          </Link>
        </div>
      </section>

      <ServicesSection />
      <TrustSection />
    </>
  );
}
