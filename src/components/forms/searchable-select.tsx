"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SearchOption {
  value: string;
  label: string;
  /** Texte à droite (ex. « +237 »). */
  hint?: string;
  /** Avant le libellé (ex. drapeau). */
  prefix?: ReactNode;
  /** Mots supplémentaires pour la recherche (nom dans l'autre langue, code, indicatif…). */
  keywords?: string;
}

/** Minuscules, sans accents ni ponctuation : « Côte d'Ivoire » → « cote d ivoire ». */
export function normalizeSearch(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Liste déroulante avec champ de recherche (combobox accessible, clavier ↑ ↓ Entrée Échap).
 * Sans recherche, les options `priority` s'affichent en tête.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  priority = [],
  labels,
  placeholder,
  error,
  renderValue,
  triggerClassName,
  panelClassName,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  priority?: string[];
  labels: { search: string; noResults: string; frequent?: string; all?: string };
  placeholder?: string;
  error?: string;
  renderValue?: (option: SearchOption) => ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
  ariaLabel?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  const index = useMemo(
    () => options.map((o) => ({ o, hay: normalizeSearch(`${o.label} ${o.hint ?? ""} ${o.keywords ?? ""}`) })),
    [options],
  );

  // Sans recherche : pays fréquents puis tous ; avec recherche : résultats, ceux qui commencent par la saisie d'abord.
  const { items, frequentCount } = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) {
      const top = priority.map((v) => options.find((o) => o.value === v)).filter(Boolean) as SearchOption[];
      return { items: [...top, ...options], frequentCount: top.length };
    }
    const words = q.split(" ");
    const hits = index.filter(({ hay }) => words.every((w) => hay.includes(w)));
    const starts = (h: (typeof hits)[number]) => (normalizeSearch(h.o.label).startsWith(q) ? 0 : 1);
    return { items: hits.sort((a, b) => starts(a) - starts(b)).map((h) => h.o), frequentCount: 0 };
  }, [query, index, options, priority]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    inputRef.current?.focus({ preventScroll: true });
    rootRef.current?.scrollIntoView({ block: "nearest" });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  useEffect(() => {
    // Défile dans la liste seulement (scrollIntoView ferait aussi défiler la page).
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!list || !el) return;
    if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
    else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
    }
  }, [active, open]);

  function openPanel() {
    setQuery("");
    const top = priority.filter((v) => options.some((o) => o.value === v));
    const inTop = top.indexOf(value);
    const inAll = options.findIndex((o) => o.value === value);
    setActive(inTop >= 0 ? inTop : inAll >= 0 ? top.length + inAll : 0);
    setOpen(true);
  }

  function choose(option: SearchOption) {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[active]) choose(items[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && !open) {
            e.preventDefault();
            openPanel();
          }
        }}
        className={cn(
          error ? "field-error" : "field-input",
          "flex items-center gap-2 text-left",
          triggerClassName,
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-gris")}>
          {selected ? (renderValue ? renderValue(selected) : (
            <>
              {selected.prefix && <span className="mr-2">{selected.prefix}</span>}
              {selected.label}
            </>
          )) : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-gris" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-[calc(100%+4px)] z-30 w-full overflow-hidden rounded-[10px] border-[1.5px] border-noir bg-white shadow-card",
            panelClassName,
          )}
        >
          <div className="flex items-center gap-2 border-b border-bord px-3">
            <Search className="h-4 w-4 flex-shrink-0 text-gris" />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded
              aria-controls={`${id}-list`}
              aria-activedescendant={items[active] ? `${id}-opt-${active}` : undefined}
              aria-autocomplete="list"
              aria-label={labels.search}
              placeholder={labels.search}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-3 text-[16px] outline-none [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
          <ul ref={listRef} id={`${id}-list`} role="listbox" className="relative max-h-[min(55vh,18rem)] overflow-y-auto py-1">
            {items.length === 0 && <li className="px-3 py-3 text-[14px] text-gris">{labels.noResults}</li>}
            {items.map((o, i) => (
              <li key={`${i < frequentCount ? "top" : "all"}-${o.value}`} role="presentation">
                {i === 0 && frequentCount > 0 && labels.frequent && (
                  <p className="px-3 pb-1 pt-2 text-[12px] font-bold uppercase tracking-wide text-gris">{labels.frequent}</p>
                )}
                {i === frequentCount && frequentCount > 0 && labels.all && (
                  <p className="mt-1 border-t border-bord px-3 pb-1 pt-3 text-[12px] font-bold uppercase tracking-wide text-gris">
                    {labels.all}
                  </p>
                )}
                <div
                  id={`${id}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={o.value === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 px-3 py-2.5 text-[15px]",
                    i === active && "bg-fond",
                    o.value === value && "font-bold",
                  )}
                >
                  {o.prefix && <span className="flex-shrink-0">{o.prefix}</span>}
                  <span className="min-w-0 flex-1">{o.label}</span>
                  {o.hint && <span className="flex-shrink-0 text-[14px] tabular-nums text-gris">{o.hint}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
