"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

import { ProofGallery, type ProofItem } from "@/components/trust/proof-gallery";

/** Lettres affichées d'abord (les plus récentes) ; le reste ne se charge qu'au clic. */
const FIRST = 8;

/**
 * Mur des admissions : grille en colonnes, groupée par année de rentrée (la plus récente d'abord).
 * Léger : 8 miniatures au départ, chargées à l'approche de l'écran ; « Voir les N lettres » ajoute le reste.
 */
export function AdmissionYears({ groups, total }: { groups: { year: number | null; items: ProofItem[] }[]; total: number }) {
  const t = useTranslations("home.admissions");
  const [all, setAll] = useState(false);

  let budget = all ? Infinity : FIRST;
  const shown = groups.flatMap((g) => {
    if (budget <= 0) return [];
    const items = g.items.slice(0, budget);
    budget -= items.length;
    return [{ ...g, items }];
  });

  return (
    <div className="space-y-6">
      {shown.map((g) => (
        <div key={g.year ?? "autres"}>
          {g.year && <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-gris">{t("year", { year: g.year })}</h3>}
          <ProofGallery layout="wall" items={g.items} />
        </div>
      ))}
      {!all && total > FIRST && (
        <button type="button" onClick={() => setAll(true)} className="btn-ghost mx-auto flex !min-h-[46px] text-[15px] sm:!w-auto">
          {t("showAll", { count: total })} <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
