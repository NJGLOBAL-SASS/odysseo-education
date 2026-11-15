"use client";
/* eslint-disable @next/next/no-img-element -- logos de formats variés (PNG/JPG), déjà à la bonne taille */

import { useDeferredValue, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { normalizeSearch } from "@/lib/content/faq-search";

export type GridUniversity = { id: string; en: string; zh: string; logo: string; photo?: string; photoTitle?: string };

/** Grille de toutes les universités + recherche (nom anglais ou chinois, sans accents). */
export function UniversityGrid({ items }: { items: GridUniversity[] }) {
  const t = useTranslations("universities");
  const [query, setQuery] = useState("");
  const q = normalizeSearch(useDeferredValue(query));

  const shown = useMemo(
    () => (q ? items.filter((u) => normalizeSearch(`${u.en} ${u.zh}`).includes(q)) : items),
    [items, q],
  );

  return (
    <div className="mt-8">
      <label htmlFor="uni-search" className="sr-only">
        {t("search")}
      </label>
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gris" />
        <input
          id="uni-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="field-input pl-10"
          autoComplete="off"
        />
      </div>
      <p className="mt-3 text-sm font-semibold text-gris" aria-live="polite">
        {t("results", { count: shown.length })}
      </p>

      {shown.length === 0 ? (
        <p className="mt-6 text-gris">{t("empty")}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {shown.map((u) => (
            <li key={u.id}>
              <Link href={`/universites/${u.id}`} className="group flex h-full flex-col overflow-hidden rounded-brand border border-bord bg-white text-center transition-shadow hover:shadow-pop">
              {u.photo ? (
                <div className="relative">
                  <img src={u.photo} alt="" title={u.photoTitle} loading="lazy" decoding="async" width={320} height={200} className="aspect-[16/10] w-full object-cover" />
                  <img src={u.logo} alt="" loading="lazy" decoding="async" width={48} height={48} className="absolute -bottom-6 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full border-2 border-white bg-white object-contain p-0.5 shadow-card" />
                </div>
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center bg-fond">
                  <img src={u.logo} alt="" loading="lazy" decoding="async" width={64} height={64} className="h-16 w-16 object-contain" />
                </div>
              )}
              <div className={`flex flex-1 flex-col gap-0.5 px-3 pb-3 ${u.photo ? "pt-8" : "pt-3"}`}>
                <span className="text-[13px] font-bold leading-tight group-hover:text-rouge">{u.en}</span>
                {u.zh && <span className="text-xs text-gris">{u.zh}</span>}
              </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
