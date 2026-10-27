import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  delta,
  accent,
  deltaLabels = { new: "nouveau", newTitle: "", title: "" },
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Ligne de contexte sous la valeur (ex. "sur 30 jours"). */
  hint?: string;
  /** Variation en % par rapport à la période précédente. */
  delta?: number | null;
  accent?: boolean;
  /** Libellés traduits du badge d'évolution. */
  deltaLabels?: { new: string; newTitle: string; title: string };
}) {
  const DeltaIcon = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="card relative overflow-hidden p-5">
      {accent && <span className="absolute inset-x-0 top-0 h-[3px] bg-rouge" />}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-fond text-noir">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              delta == null || delta === 0
                ? "bg-fond text-gris"
                : delta > 0
                  ? "bg-[#E1F6EA] text-ok"
                  : "bg-erreur-fond text-erreur"
            )}
            title={delta == null ? deltaLabels.newTitle : deltaLabels.title}
          >
            {delta == null ? (
              deltaLabels.new
            ) : (
              <>
                <DeltaIcon className="h-3.5 w-3.5" />
                {`${delta > 0 ? "+" : ""}${delta}%`}
              </>
            )}
          </span>
        )}
      </div>
      <p className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums">{value}</p>
      <p className="mt-1.5 text-sm font-medium text-texte">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-gris">{hint}</p>}
    </div>
  );
}
