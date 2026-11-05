"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Printer, RotateCcw } from "lucide-react";

import type { ChecklistSection } from "@/lib/content/faq";
import { cn } from "@/lib/utils";

export const CHECKLIST_STORAGE_KEY = "odysseo_checklist_depart";

function readChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function writeChecked(ids: Set<string>) {
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Navigation privée / stockage bloqué : les cases restent cochées le temps de la visite.
  }
}

/** Checklist « Avant le départ » (PACK-09) : cases mémorisées sur l'appareil, impression propre. */
export function DepartureChecklist({ sections }: { sections: ChecklistSection[] }) {
  const t = useTranslations("guide");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const done = sections.reduce((n, s) => n + s.items.filter((i) => checked.has(i.id)).length, 0);

  useEffect(() => setChecked(readChecked()), []);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeChecked(next);
      return next;
    });
  }

  function reset() {
    const empty = new Set<string>();
    writeChecked(empty);
    setChecked(empty);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold" aria-live="polite">
          {t("progress", { done, total })}
        </p>
        <div className="flex flex-wrap gap-2">
          {done > 0 && (
            <button type="button" onClick={reset} className="btn-ghost !min-h-[44px] !px-4 text-sm">
              <RotateCcw className="h-4 w-4" /> {t("reset")}
            </button>
          )}
          <button type="button" onClick={() => window.print()} className="btn-primary !min-h-[44px] !w-auto !px-4 text-sm">
            <Printer className="h-4 w-4" /> {t("print")}
          </button>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-bord print:hidden" aria-hidden="true">
        <div className="h-full bg-rouge transition-[width]" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>

      <div className="checklist-print mt-8 space-y-8 print:mt-4 print:space-y-4">
        {sections.map((s, si) => (
          <section key={s.titre} aria-labelledby={`cl-${si}`} className="checklist-section">
            <h2 id={`cl-${si}`} className="mb-3 text-lg font-extrabold print:mb-1.5 print:text-[13pt]">
              {s.titre}
            </h2>
            <ul className="card divide-y divide-bord overflow-hidden print:rounded-none print:shadow-none">
              {s.items.map((item) => {
                const isChecked = checked.has(item.id);
                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-4 py-3.5 hover:bg-fond print:px-0 print:py-[3pt]">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(item.id)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[5px] border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-noir peer-focus-visible:ring-offset-2 print:h-[11pt] print:w-[11pt] print:rounded-[2pt] print:border-[1.2pt]",
                          isChecked ? "border-noir bg-noir text-white" : "border-gris bg-white",
                        )}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5 print:h-[8pt] print:w-[8pt]" strokeWidth={3.5} />}
                      </span>
                      <span className={cn("text-[15px] leading-snug print:text-[10.5pt]", isChecked && "text-gris line-through print:no-underline print:text-black")}>
                        {item.text}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
