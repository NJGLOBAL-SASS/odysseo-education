import "server-only";

import { prisma } from "@/lib/prisma";

/** Durée de conservation des documents après la fin du dossier (PACK-10, validée par le fondateur). */
export const RETENTION_MONTHS = 12;
export const ENDED_STAGES = ["clos", "arrive"];

export function retentionLimit(now = new Date()) {
  const d = new Date(now);
  d.setMonth(d.getMonth() - RETENTION_MONTHS);
  return d;
}

export function retentionExpired(c: { stage: string; stageUpdatedAt: Date | null }, now = new Date()) {
  return ENDED_STAGES.includes(c.stage) && c.stageUpdatedAt !== null && c.stageUpdatedAt < retentionLimit(now);
}

/** Dossiers terminés depuis plus de 12 mois qui ont encore des documents. */
export function dossiersToPurge(now = new Date()) {
  return prisma.candidate.findMany({
    where: { stage: { in: ENDED_STAGES }, stageUpdatedAt: { lt: retentionLimit(now) }, documentFolders: { some: {} } },
    select: { id: true, code: true, fullName: true, stage: true, stageUpdatedAt: true, _count: { select: { documentFolders: true } } },
    orderBy: { stageUpdatedAt: "asc" },
  });
}
