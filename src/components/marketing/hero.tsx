import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function Hero() {
  const t = await getTranslations("home.hero");

  return (
    <section className="relative overflow-hidden bg-noir text-white">
      <Image
        src="/images/hero/hero-banner-home.jpg"
        alt=""
        fill
        priority
        className="object-cover opacity-70"
      />
      <div className="relative wrap-site py-16 sm:py-24">
        <div className="flex flex-wrap gap-2">
          {[t("badge1"), t("badge2"), t("badge3"), t("badge4")].map((b) => (
            <span
              key={b}
              className="rounded-full border border-[#3A3A42] px-3 py-1 text-[13px] font-semibold text-[#EDEDF2]"
            >
              {b}
            </span>
          ))}
        </div>

        <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          {t.rich("title", {
            red: (chunks) => <span className="text-rouge">{chunks}</span>,
          })}
        </h1>
        <p className="mt-3 max-w-lg text-[#C9C9D1] sm:text-lg">{t("subtitle")}</p>

        <Link href="/postuler" className="btn-primary mt-6 !w-auto">
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
