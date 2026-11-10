"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { Cycle } from "@/lib/matching/types";
import { OfferCard, type OfferCardData } from "./offer-card";

const CYCLES: Cycle[] = ["master", "phd"];

/**
 * Liste filtrable des offres (PACK-03). Filtres dans l'URL (?cycle=&famille=&ville=) :
 * partageables, et le bouton retour du navigateur les restaure.
 */
export function OffersExplorer({
  offers,
  families,
  cities,
}: {
  offers: OfferCardData[];
  families: { slug: string; label: string }[];
  cities: string[];
}) {
  const t = useTranslations("offers.index");
  const tCycles = useTranslations("offers.cycles");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const cycleParam = params.get("cycle");
  const cycle = CYCLES.includes(cycleParam as Cycle) ? (cycleParam as Cycle) : null;
  const famille = families.some((f) => f.slug === params.get("famille")) ? params.get("famille") : null;
  const ville = cities.includes(params.get("ville") ?? "") ? params.get("ville") : null;

  const visible = useMemo(
    () =>
      offers.filter(
        (o) => (!cycle || o.cycle === cycle) && (!famille || o.familles.includes(famille)) && (!ville || o.ville === ville),
      ),
    [offers, cycle, famille, ville],
  );

  function setParam(key: "cycle" | "famille" | "ville", value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const filtered = Boolean(cycle || famille || ville);

  return (
    <div>
      <div role="group" aria-label={t("filters.label")} className="card space-y-3 p-4">
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-gris">{t("filters.level")}</p>
          <div className="flex flex-wrap gap-2">
            {[null, ...CYCLES].map((c) => (
              <button
                key={c ?? "all"}
                type="button"
                aria-pressed={cycle === c}
                onClick={() => setParam("cycle", c)}
                className={cycle === c ? "chip-selected" : "chip"}
              >
                {c ? tCycles(c) : t("filters.all")}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-gris">{t("filters.domain")}</span>
            <select value={famille ?? ""} onChange={(e) => setParam("famille", e.target.value || null)} className="field-input">
              <option value="">{t("filters.allDomains")}</option>
              {families.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-gris">{t("filters.city")}</span>
            <select value={ville ?? ""} onChange={(e) => setParam("ville", e.target.value || null)} className="field-input">
              <option value="">{t("filters.allCities")}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mb-3 mt-5 flex items-center justify-between gap-3" aria-live="polite">
        <p className="text-[15px] font-bold">{t("results", { count: visible.length })}</p>
        {filtered && (
          <button type="button" onClick={() => router.replace(pathname, { scroll: false })} className="flex items-center gap-1 text-[14px] font-semibold text-gris hover:text-noir">
            <X className="h-4 w-4" /> {t("filters.reset")}
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="card p-6 text-center text-gris">{t("empty")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((o) => (
            <li key={o.ref}>
              <OfferCard offer={o} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
