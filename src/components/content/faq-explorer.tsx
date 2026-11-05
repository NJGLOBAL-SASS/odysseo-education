"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Search, X } from "lucide-react";

import { filterFaq, type FaqCategory } from "@/lib/content/faq-search";
import { cn } from "@/lib/utils";

/**
 * FAQ (PACK-09) : recherche instantanée, catégories en ancres, questions en
 * accordéon (une seule ouverte à la fois). Clavier : Tab / Entrée / Espace,
 * et ↑ ↓ Début Fin pour passer d'une question à l'autre.
 */
export function FaqExplorer({ categories }: { categories: FaqCategory[] }) {
  const t = useTranslations("faq");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => filterFaq(categories, query), [categories, query]);
  const count = visible.reduce((n, c) => n + c.questions.length, 0);
  const searching = query.trim().length > 0;

  // Un seul résultat : on l'ouvre directement.
  useEffect(() => {
    if (searching && count === 1) setOpenId(visible[0].questions[0].id);
  }, [searching, count, visible]);

  // Lien direct vers une question (#q-…) : on l'ouvre.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash.startsWith("q-")) setOpenId(hash);
  }, []);

  function onHeaderKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-faq-toggle]") ?? []);
    const i = buttons.indexOf(e.currentTarget);
    const next =
      e.key === "ArrowDown" ? buttons[i + 1] : e.key === "ArrowUp" ? buttons[i - 1] : e.key === "Home" ? buttons[0] : e.key === "End" ? buttons.at(-1) : null;
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }

  return (
    <div>
      <div className="relative">
        <label htmlFor="faq-search" className="sr-only">
          {t("searchLabel")}
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gris" aria-hidden="true" />
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          className="field-input !min-h-[52px] !pl-10 !pr-11 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {searching && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[10px] text-gris hover:bg-fond hover:text-texte"
            aria-label={t("clear")}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-gris" aria-live="polite">
        {searching ? t("results", { count }) : null}
      </p>

      {!searching && (
        <nav aria-label={t("categories")} className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="chip !min-h-[38px] !text-sm hover:border-noir">
              {c.titre}
            </a>
          ))}
        </nav>
      )}

      <div ref={listRef} className="mt-8 space-y-10">
        {visible.map((c) => (
          <section key={c.id} id={c.id} aria-labelledby={`${c.id}-title`} className="scroll-mt-6">
            <h2 id={`${c.id}-title`} className="mb-3 text-xl font-extrabold">
              {c.titre}
            </h2>
            <div className="card divide-y divide-bord overflow-hidden">
              {c.questions.map((x) => {
                const open = openId === x.id;
                return (
                  <div key={x.id} id={x.id} className="scroll-mt-6">
                    <h3>
                      <button
                        type="button"
                        id={`${x.id}-button`}
                        data-faq-toggle
                        aria-expanded={open}
                        aria-controls={`${x.id}-panel`}
                        onClick={() => setOpenId(open ? null : x.id)}
                        onKeyDown={onHeaderKeyDown}
                        className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left text-[16px] font-bold leading-snug hover:bg-fond focus-visible:bg-fond focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-noir sm:px-5"
                      >
                        <span>{x.q}</span>
                        <ChevronDown
                          className={cn("mt-0.5 h-5 w-5 flex-shrink-0 text-rouge transition-transform", open && "rotate-180")}
                          aria-hidden="true"
                        />
                      </button>
                    </h3>
                    <div
                      id={`${x.id}-panel`}
                      role="region"
                      aria-labelledby={`${x.id}-button`}
                      hidden={!open}
                      className="px-4 pb-5 text-[15px] leading-relaxed text-texte sm:px-5"
                    >
                      {x.r}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {searching && count === 0 && (
          <p className="card p-5 text-[15px]">{t("noResults", { query: query.trim() })}</p>
        )}
      </div>
    </div>
  );
}
