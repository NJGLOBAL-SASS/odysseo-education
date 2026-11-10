import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { json, requirePortalSession } from "@/lib/portal/guard";
import { clientIp } from "@/lib/portal/rate-limit";
import { appendStage, normalizeHistory } from "@/lib/tracking-stages";
import { notifyTeamFromPortal } from "@/lib/notifications";

const schema = z.object({ version: z.number().int().positive(), terms: z.literal(true) });

/**
 * « Je valide mon dossier » (PACK-10) : réservé à l'étudiant. Enregistre la date, l'IP et la
 * version du rapport ; l'étape passe à « Dossier validé » (en attente du paiement).
 */
export async function POST(req: NextRequest) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const s = auth.session;
  if (s.role !== "STUDENT") return json({ error: "studentOnly" }, 403);
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "invalid" }, 400);

  const report = await prisma.admissionReport.findUnique({ where: { candidateId: s.candidateId } });
  if (!report?.publishedAt) return json({ error: "notFound" }, 404);
  // Rapport republié entre-temps : l'étudiant doit relire la nouvelle version.
  if (report.version !== body.data.version) return json({ error: "outdated" }, 409);
  if (report.validatedAt && report.validatedVersion === report.version) return json({ ok: true });

  const candidate = await prisma.candidate.findUniqueOrThrow({
    where: { id: s.candidateId },
    select: { id: true, code: true, fullName: true, stage: true, stageHistory: true, createdAt: true },
  });
  const now = new Date();
  // L'étape n'avance que si le dossier n'est pas déjà plus loin (ex. paiement déjà saisi).
  const moveStage = ["recu", "analyse", "rapport_envoye"].includes(candidate.stage);
  await prisma.$transaction([
    prisma.admissionReport.update({
      where: { id: report.id },
      data: { validatedAt: now, validatedVersion: report.version, validatedIp: clientIp(req), validatedByPortalId: s.id },
    }),
    ...(moveStage
      ? [
          prisma.candidate.update({
            where: { id: candidate.id },
            data: {
              stage: "valide_attente_paiement",
              stageUpdatedAt: now,
              stageHistory: appendStage(normalizeHistory(candidate.stageHistory, candidate.createdAt), candidate.stage, "valide_attente_paiement", now),
            },
          }),
        ]
      : []),
  ]);
  notifyTeamFromPortal(candidate, "validation", s.name, `Rapport v${report.version} validé : envoyer les instructions de paiement.`).catch((err) =>
    console.error("[portal] alerte validation :", err),
  );
  return json({ ok: true });
}
