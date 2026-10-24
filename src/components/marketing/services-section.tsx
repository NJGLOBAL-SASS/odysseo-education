import Image from "next/image";
import { getTranslations } from "next-intl/server";

const SERVICES = [
  { key: "orientation", image: "/images/services/service-01-orientation-evaluation.jpg" },
  { key: "bourses", image: "/images/services/service-02-recherche-bourses.jpg" },
  { key: "dossier", image: "/images/services/service-05-dossier-optimisation.jpg" },
  { key: "candidatures", image: "/images/services/service-04-gestion-candidatures.jpg" },
] as const;

export async function ServicesSection() {
  const t = await getTranslations("services");

  return (
    <section className="wrap-site py-12" id="services">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-extrabold sm:text-3xl">{t("title")}</h2>
        <p className="mt-2 text-gris">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {SERVICES.map((service, i) => (
          <article key={service.key} className="card overflow-hidden">
            <div className="relative h-48 w-full">
              <Image
                src={service.image}
                alt={t(`${service.key}.title`)}
                fill
                className="object-cover"
              />
              <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-[6px] bg-noir text-sm font-extrabold text-white">
                {i + 1}
              </span>
            </div>
            <div className="p-4">
              <h3 className="mb-2 font-extrabold">{t(`${service.key}.title`)}</h3>
              <ul className="space-y-1 text-sm text-gris">
                {t.raw(`${service.key}.items`).map((item: string) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-rouge">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
