"use client";

import { useTranslations } from "next-intl";

export function DoneScreen({ code, firstName, email }: { code: string; firstName: string; email?: string }) {
  const t = useTranslations("intake.done");
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  const waText = encodeURIComponent(
    `Bonjour Odysseo Education, je viens de remplir le formulaire. Mon code dossier : ${code}.`
  );

  return (
    <div className="card p-6 text-center">
      <div className="mx-auto mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-noir text-[30px] text-white">
        ✓
      </div>
      <h2 className="text-xl font-extrabold">{t("title", { name: firstName })}</h2>
      <p className="text-gris">{t("subtitle")}</p>

      <div className="my-3 rounded-brand border-2 border-dashed border-noir bg-fond p-2 text-[28px] font-extrabold tracking-wide">
        {code}
      </div>
      <p className="mb-3 text-[13px] text-gris">{t("codeNote")}</p>
      {email && <p className="mb-3 text-[13px] text-gris">{t("emailNote", { email })}</p>}

      <a
        href={`https://wa.me/${waNumber}?text=${waText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-wa"
      >
        {t("whatsappButton")}
      </a>

      <ol className="mt-4 list-none space-y-3 text-left text-[15px]">
        {(["analysis", "firstAnswer", "proposal"] as const).map((key, i) => (
          <li key={key} className="relative pl-10">
            <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-rouge text-sm font-extrabold text-white">
              {i + 1}
            </span>
            <b className="block">{t(`steps.${key}.title`)}</b>
            {t(`steps.${key}.text`)}
          </li>
        ))}
      </ol>
    </div>
  );
}
