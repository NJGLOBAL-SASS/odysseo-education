"use client";

import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1 text-sm font-semibold">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => router.replace(pathname, { locale: l })}
          className={
            l === locale
              ? "rounded-full bg-white px-2.5 py-1 text-noir"
              : "rounded-full px-2.5 py-1 text-[#C9C9D1] hover:text-white"
          }
          aria-current={l === locale}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
