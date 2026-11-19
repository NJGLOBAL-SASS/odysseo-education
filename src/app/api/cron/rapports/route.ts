import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { notifyTeamAlert } from "@/lib/notifications";
import { listInclude, remindersDueToday, summarize } from "@/lib/report/server";
import { CATALOGUE_VERSION } from "@/lib/matching/catalogue";

/**
 * Alerte quotidienne de 8 h, heure de Douala (vercel.json : 7 h UTC) — ODY-15 §7.3 :
 * « 📲 7 relances à faire aujourd'hui · 3 rapports à envoyer » + rapports à revérifier.
 * Remplace les relances 48 h / 5 jours du PACK-12. Rien n'est envoyé aux étudiants.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const [due, rows] = await Promise.all([
    remindersDueToday(),
    prisma.candidate.findMany({ where: { createdAt: { gte: new Date(Date.now() - 180 * 86_400_000) } }, include: listInclude }),
  ]);
  const summaries = rows.map((c) => summarize(c));

  // PACK-13 §6 : nouveau catalogue déployé → une alerte « rapports touchés » (une seule fois par version).
  const catalogueSubject = `Catalogue ${CATALOGUE_VERSION}`;
  const alreadyAlerted = await prisma.notificationLog.findFirst({ where: { subject: { startsWith: catalogueSubject } }, select: { id: true } });
  if (!alreadyAlerted) {
    const touched = summaries.filter((s) => s.recheck).length;
    await notifyTeamAlert({
      subject: `${catalogueSubject} : ${touched} rapport${touched > 1 ? "s" : ""} touché${touched > 1 ? "s" : ""}`,
      text: touched
        ? `🔄 Catalogue ${CATALOGUE_VERSION} en ligne · ${touched} rapport${touched > 1 ? "s" : ""} touché${touched > 1 ? "s" : ""} par la mise à jour (offre fermée ou qui ferme bientôt) : « Revérifier les offres » avant toute relance.`
        : `🔄 Catalogue ${CATALOGUE_VERSION} en ligne · aucun rapport envoyé n'est touché.`,
      path: "/fr/dashboard/candidatures?filtre=reverifier",
      cta: "Ouvrir « Offres à revérifier »",
    });
  }
  const toSend = summaries.filter((s) => s.toSend).length;
  const recheck = summaries.filter((s) => s.recheck).length;
  if (due.length === 0 && toSend === 0 && recheck === 0) return NextResponse.json({ ok: true, sent: false });
  const parts = [
    `📲 ${due.length} relance${due.length > 1 ? "s" : ""} à faire aujourd'hui`,
    `${toSend} rapport${toSend > 1 ? "s" : ""} à envoyer`,
    ...(recheck ? [`⚠️ ${recheck} rapport${recheck > 1 ? "s" : ""} à revérifier`] : []),
  ];
  await notifyTeamAlert({
    subject: parts.join(" · "),
    text: parts.join(" · "),
    path: `/fr/dashboard/candidatures?filtre=${due.length ? "relancer" : "envoyer"}`,
    cta: due.length ? "Ouvrir les relances du jour" : "Ouvrir les rapports à envoyer",
  });
  return NextResponse.json({ ok: true, sent: true, reminders: due.length, toSend, recheck });
}
