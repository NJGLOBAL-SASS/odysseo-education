import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { localDay } from "@/lib/report/reminders";

const DAY = 86_400_000;

/**
 * Mesure simple (ODY-15 §7.5, PACK-13 §1) : par semaine d'envoi, rapports envoyés → lus → OUI,
 * étape du OUI (sans relance, après R1, R2, R3) et délai moyen soumission → envoi.
 */
export async function ReportStatsCard() {
  const t = await getTranslations("dashboard.report.stats");
  const since = new Date(Date.now() - 6 * 7 * DAY);
  const docs = await prisma.reportDocument.findMany({
    where: { sentAt: { gte: since }, archivedAt: null },
    orderBy: { sentAt: "asc" },
    select: {
      candidateId: true,
      sentAt: true,
      readAt: true,
      sendMode: true,
      candidate: {
        select: {
          createdAt: true,
          admissionReport: { select: { ouiAt: true, status: true } },
          reportReminders: { where: { status: "envoyee" }, select: { number: true, sentAt: true } },
        },
      },
    },
  });
  // Un dossier compte une fois : sa première version envoyée.
  const seen = new Set<string>();
  const firsts = docs.filter((d) => !seen.has(d.candidateId) && seen.add(d.candidateId));
  type Week = { key: number; sent: number; read: number; oui: number; stages: number[]; delays: number[] };
  const weeks = new Map<number, Week>();
  for (const d of firsts) {
    const day = localDay(d.sentAt!);
    const monday = day - ((new Date(day).getUTCDay() + 6) % 7) * DAY;
    const w = weeks.get(monday) ?? { key: monday, sent: 0, read: 0, oui: 0, stages: [0, 0, 0, 0], delays: [] };
    w.sent++;
    if (d.readAt) w.read++;
    const report = d.candidate.admissionReport;
    const ouiAt = report?.ouiAt ?? (report?.status === "premier_versement_recu" ? new Date() : null);
    if (ouiAt) {
      w.oui++;
      const before = d.candidate.reportReminders.filter((r) => r.sentAt && r.sentAt <= ouiAt).map((r) => r.number);
      w.stages[Math.min(3, Math.max(0, ...before))]++;
    }
    // Délai de réponse : seulement les envois faits depuis la plateforme (pas le rattrapage).
    if (d.sendMode !== "hors_plateforme") w.delays.push((d.sentAt!.getTime() - d.candidate.createdAt.getTime()) / 3_600_000);
    weeks.set(monday, w);
  }
  const rows = [...weeks.values()].sort((a, b) => b.key - a.key);
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const hours = (xs: number[]) => (xs.length ? `${Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)} h` : "—");

  return (
    <section className="card p-5">
      <h2 className="section-title">{t("title")}</h2>
      <p className="mb-3 text-xs text-gris">{t("subtitle")}</p>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gris">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm tabular-nums">
            <thead className="text-left text-xs text-gris">
              <tr>
                <th className="py-2 pr-3">{t("week")}</th>
                <th className="px-2">{t("sent")}</th>
                <th className="px-2">{t("read")}</th>
                <th className="px-2">{t("oui")}</th>
                <th className="px-2">{t("ouiStage")}</th>
                <th className="pl-2 text-right">{t("responseTime")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bord">
              {rows.map((w) => (
                <tr key={w.key}>
                  <td className="py-2 pr-3">{fmt.format(new Date(w.key))}</td>
                  <td className="px-2 font-bold">{w.sent}</td>
                  <td className="px-2">
                    {w.read} <span className="text-xs text-gris">({Math.round((w.read / w.sent) * 100)} %)</span>
                  </td>
                  <td className="px-2">
                    {w.oui} <span className="text-xs text-gris">({Math.round((w.oui / w.sent) * 100)} %)</span>
                  </td>
                  <td className="px-2">{w.stages.join(" · ")}</td>
                  <td className="pl-2 text-right">{hours(w.delays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
