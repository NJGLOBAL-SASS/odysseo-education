import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";

export async function TrustSection() {
  const t = await getTranslations("trust");

  const items = [
    { label: t("labels.admission"), text: t("admission") },
    { label: t("labels.scholarship"), text: t("scholarship") },
    { label: t("labels.visa"), text: t("visa") },
  ];

  return (
    <section className="wrap-site py-10">
      <div className="rounded-brand bg-noir p-6 text-white sm:p-8">
        <h2 className="mb-4 text-lg font-extrabold sm:text-xl">
          {t("title").split(",")[0]}
          <span className="text-rouge">, {t("title").split(",")[1]}</span>
        </h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.label} className="flex gap-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[8px] bg-[#1E1E23] text-rouge">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-sm leading-relaxed text-[#D7D7DE]">
                <b className="text-white">{item.label} : </b>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
