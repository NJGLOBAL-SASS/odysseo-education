import { getTranslations } from "next-intl/server";
import { Link2 } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { LINK_BUTTONS, LINK_SOURCES } from "@/lib/links/config";
import { SITE_URL } from "@/lib/seo";

const DAY = 24 * 60 * 60 * 1000;

type Row = { key: string; label: string; d7: number; d30: number };

async function loadCounts() {
  const since30 = new Date(Date.now() - 30 * DAY);
  const since7 = new Date(Date.now() - 7 * DAY);
  try {
    const [byButton30, byButton7, bySrc30, bySrc7] = await Promise.all([
      prisma.linkClick.groupBy({ by: ["bouton"], where: { createdAt: { gte: since30 } }, _count: true }),
      prisma.linkClick.groupBy({ by: ["bouton"], where: { createdAt: { gte: since7 } }, _count: true }),
      prisma.linkClick.groupBy({ by: ["src"], where: { createdAt: { gte: since30 } }, _count: true }),
      prisma.linkClick.groupBy({ by: ["src"], where: { createdAt: { gte: since7 } }, _count: true }),
    ]);
    const map = <K extends string>(rows: ({ _count: number } & Record<K, string>)[], k: K) =>
      new Map(rows.map((r) => [r[k], r._count]));
    return {
      button: { d7: map(byButton7, "bouton"), d30: map(byButton30, "bouton") },
      src: { d7: map(bySrc7, "src"), d30: map(bySrc30, "src") },
    };
  } catch (err) {
    // Table link_clicks absente (npm run db:push pas encore lancé) : la vue d'ensemble reste utilisable.
    console.error("[dashboard] link_clicks", err);
    return null;
  }
}

function CountTable({ head, rows, d7, d30 }: { head: string; rows: Row[]; d7: string; d30: string }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[11px] font-medium uppercase tracking-wide text-gris">
          <th className="pb-2 text-left font-medium">{head}</th>
          <th className="pb-2 text-right font-medium">{d7}</th>
          <th className="pb-2 pl-3 text-right font-medium">{d30}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-bord">
        {rows.map((r) => (
          <tr key={r.key}>
            <td className="py-2">{r.label}</td>
            <td className="py-2 text-right tabular-nums">{r.d7}</td>
            <td className="py-2 pl-3 text-right font-bold tabular-nums">{r.d30}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Carte « Page liens » de la vue d'ensemble : clics par bouton et par source, 7 et 30 jours. */
export async function LinkClicksCard() {
  const t = await getTranslations("dashboard.overview.links");
  const counts = await loadCounts();

  const buttonRows: Row[] = LINK_BUTTONS.map((b) => ({
    key: b,
    label: t(`buttons.${b}`),
    d7: counts?.button.d7.get(b) ?? 0,
    d30: counts?.button.d30.get(b) ?? 0,
  }));
  const srcRows: Row[] = LINK_SOURCES.map((s) => ({
    key: s,
    label: t(`sources.${s}`),
    d7: counts?.src.d7.get(s) ?? 0,
    d30: counts?.src.d30.get(s) ?? 0,
  })).filter((r) => r.d30 > 0);
  const total30 = buttonRows.reduce((sum, r) => sum + r.d30, 0);

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">{t("title")}</h2>
          <p className="text-xs text-gris">{t("hint", { count: total30 })}</p>
        </div>
        <a
          href={`${SITE_URL}/fr/liens`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-semibold text-gris hover:text-noir"
        >
          <Link2 className="h-3.5 w-3.5" /> /liens
        </a>
      </div>
      {counts == null ? (
        <p className="py-6 text-center text-sm text-gris">{t("unavailable")}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <CountTable head={t("byButton")} rows={buttonRows} d7={t("d7")} d30={t("d30")} />
          {srcRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-gris">{t("empty")}</p>
          ) : (
            <CountTable head={t("bySource")} rows={srcRows} d7={t("d7")} d30={t("d30")} />
          )}
        </div>
      )}
    </section>
  );
}
