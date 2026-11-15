"use client";
/* eslint-disable @next/next/no-img-element -- logos de formats variés (PNG/JPG), déjà à la bonne taille */

import { useDeferredValue, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { normalizeSearch } from "@/lib/content/faq-search";

export type GridUniversity = { id: string; en: string; zh: string; logo: string };

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
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {shown.map((u) => (
            <li key={u.id} className="flex flex-col items-center gap-2 rounded-brand border border-bord bg-white p-3 text-center">
              <img src={u.logo} alt="" loading="lazy" decoding="async" width={64} height={64} className="h-16 w-16 object-contain" />
              <span className="text-[13px] font-bold leading-tight">{u.en}</span>
              {u.zh && <span className="text-xs text-gris">{u.zh}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
