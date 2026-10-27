import { getTranslations } from "next-intl/server";
import { Download, FileText } from "lucide-react";

import type { Locale, Program } from "@/lib/programs";
import { cn } from "@/lib/utils";

/**
 * Téléchargement de la brochure PDF dans les deux langues. La langue de la page
 * est proposée en premier (bouton principal), l'autre en second.
 */
export async function BrochureDownload({
  program,
  locale,
  tone = "light",
  compact,
}: {
  program: Program;
  locale: Locale;
  tone?: "light" | "dark";
  compact?: boolean;
}) {
  const t = await getTranslations("programs.download");
  const order: Locale[] = locale === "en" ? ["en", "fr"] : ["fr", "en"];
  const fileName = (l: Locale) => program.pdf[l].split("/").pop();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact && "gap-1.5")}>
      {order.map((l, i) => (
        <a
          key={l}
          href={program.pdf[l]}
          download={fileName(l)}
          hrefLang={l}
          className={cn(
            "inline-flex min-h-[46px] items-center gap-2 rounded-brand px-4 text-sm font-bold transition-colors",
            i === 0
              ? "bg-rouge text-white hover:bg-rouge-fonce"
              : tone === "dark"
                ? "border border-white/25 text-white hover:bg-white/10"
                : "border-[1.5px] border-bord bg-white text-noir hover:bg-fond"
          )}
        >
          {i === 0 ? <Download className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          <span>
            {i === 0 && !compact && <span className="mr-1">{t("button")}</span>}
            <span className={cn(i === 0 && !compact && "opacity-80")}>{t(l)}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
