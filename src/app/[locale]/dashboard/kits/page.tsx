import { getTranslations } from "next-intl/server";
import { Plus, Send, PenLine } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { activePartners } from "@/lib/kits/server";

export const dynamic = "force-dynamic";

/** ODY-14 : liste des kits partenaires (titre, date, statut, « Envoyés X / Y partenaires actifs »). */
export default async function KitsPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations("dashboard.kits");
  const [kits, partners] = await Promise.all([
    prisma.kit.findMany({ orderBy: { createdAt: "desc" }, include: { sends: { select: { partnerId: true } } } }),
    activePartners(),
  ]);
  const active = new Set(partners.map((p) => p.id));
  const dateFmt = new Intl.DateTimeFormat(params.locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const badge: Record<string, string> = { brouillon: "bg-fond text-gris", pret: "bg-[#EAF6EF] text-ok", archive: "bg-fond text-gris line-through" };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{t("title")}</h1>
          <p className="max-w-2xl text-sm text-gris">{t("intro")}</p>
        </div>
        <Link href="/dashboard/kits/nouveau" className="btn-sm-primary">
          <Plus className="h-4 w-4" /> {t("new")}
        </Link>
      </div>

      {kits.length === 0 ? (
        <p className="card p-6 text-sm text-gris">{t("empty")}</p>
      ) : (
        <ul className="card divide-y divide-bord">
          {kits.map((k) => {
            const sent = k.sends.filter((s) => active.has(s.partnerId)).length;
            return (
              <li key={k.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-extrabold">{k.title}</p>
                  <p className="text-xs text-gris">
                    {dateFmt.format(k.createdAt)} ·{" "}
                    <span className={`rounded-full px-2 py-0.5 font-bold ${badge[k.status] ?? ""}`}>{t(`status.${k.status as "brouillon" | "pret" | "archive"}`)}</span> ·{" "}
                    <b className="text-noir">{t("sentCount", { sent, total: partners.length })}</b>
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <Link href={`/dashboard/kits/${k.id}`} className="btn-sm-ghost">
                    <PenLine className="h-4 w-4" /> {t("edit")}
                  </Link>
                  {k.status === "pret" && (
                    <Link href={`/dashboard/kits/${k.id}/envoyer`} className="btn-sm-dark">
                      <Send className="h-4 w-4" /> {t("send")}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
