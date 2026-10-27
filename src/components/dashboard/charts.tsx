"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Graphiques légers du dashboard (SVG/HTML, sans dépendance).
 * Une seule série par graphique : pas de légende, le titre de la carte la nomme.
 */

export function TrendChart({
  data,
  locale,
}: {
  data: { date: string; count: number }[];
  locale: string;
}) {
  const t = useTranslations("dashboard.overview");
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const ticks = [max, Math.round(max / 2), 0].filter((v, i, a) => a.indexOf(v) === i);
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const active = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <div className="flex h-[180px] gap-3">
        {/* Axe Y */}
        <div className="flex flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-gris">
          {ticks.map((t) => (
            <span key={t} className="leading-none">
              {t}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* Grille */}
          <div className="pointer-events-none absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between">
            {ticks.map((t) => (
              <span key={t} className="border-t border-dashed border-[#E6E6EB]" />
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-6 top-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <button
                key={d.date}
                type="button"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="group relative flex h-full flex-1 items-end focus:outline-none"
                aria-label={`${fmt.format(new Date(d.date))} : ${t("trendTooltip", { count: d.count })}`}
              >
                <span
                  className={
                    "w-full rounded-t-[4px] transition-colors " +
                    (hover === i ? "bg-rouge" : d.count > 0 ? "bg-noir" : "bg-[#E6E6EB]")
                  }
                  style={{ height: d.count > 0 ? `${Math.max(4, (d.count / max) * 100)}%` : "2px" }}
                />
              </button>
            ))}
          </div>

          {/* Axe X : premier, milieu, dernier jour */}
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-gris">
            <span>{fmt.format(new Date(data[0]!.date))}</span>
            <span>{fmt.format(new Date(data[Math.floor(data.length / 2)]!.date))}</span>
            <span>{fmt.format(new Date(data[data.length - 1]!.date))}</span>
          </div>

          {active && hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-[calc(100%+6px)] whitespace-nowrap rounded-lg bg-noir px-2.5 py-1.5 text-xs text-white shadow-pop"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              <span className="font-bold">{t("trendTooltip", { count: active.count })}</span>
              <span className="text-[#B4B4BE]"> · {fmt.format(new Date(active.date))}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Barres horizontales étiquetées : répartition d'un total (pipeline, sources, pays...). */
export function BarList({
  rows,
  total,
  emptyLabel,
}: {
  rows: { label: string; value: number; hint?: string }[];
  total?: number;
  emptyLabel?: string;
}) {
  const sum = total ?? rows.reduce((s, r) => s + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));

  if (rows.length === 0 || sum === 0) {
    return <p className="py-6 text-center text-sm text-gris">{emptyLabel ?? "—"}</p>;
  }

  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const pct = sum > 0 ? Math.round((r.value / sum) * 100) : 0;
        return (
          <li key={r.label} className="group" title={`${r.label} : ${r.value} (${pct}%)`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium">{r.label}</span>
              <span className="flex-shrink-0 tabular-nums text-gris">
                <b className="font-semibold text-texte">{r.value}</b> · {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-fond">
              <div
                className="h-full rounded-full bg-noir transition-colors group-hover:bg-rouge"
                style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
