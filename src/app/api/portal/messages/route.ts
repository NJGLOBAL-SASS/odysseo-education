import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { json, requirePortalSession } from "@/lib/portal/guard";
import { notifyTeamFromPortal } from "@/lib/notifications";

const MESSAGE_MAX = 4000;

/** Fil de messages du dossier connecté ; les messages de l'équipe sont marqués lus. */
export async function GET(req: NextRequest) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const { candidateId } = auth.session;
  const [messages] = await Promise.all([
    prisma.portalMessage.findMany({
      where: { candidateId },
      orderBy: { createdAt: "asc" },
      take: 500,
      select: { id: true, authorType: true, authorName: true, portalAccountId: true, body: true, createdAt: true },
    }),
    prisma.portalMessage.updateMany({ where: { candidateId, authorType: "TEAM", readByCandidateAt: null }, data: { readByCandidateAt: new Date() } }),
  ]);
  return json({ messages, me: auth.session.id });
}

const schema = z.object({ body: z.string().trim().min(1).max(MESSAGE_MAX) });

export async function POST(req: NextRequest) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "invalid" }, 400);
  const s = auth.session;
  const message = await prisma.portalMessage.create({
    data: {
      candidateId: s.candidateId,
      authorType: s.role === "PARENT" ? "PARENT" : "STUDENT",
      portalAccountId: s.id,
      authorName: s.name,
      body: body.data.body,
    },
    select: { id: true, authorType: true, authorName: true, portalAccountId: true, body: true, createdAt: true },
  });
  notifyTeamFromPortal(s.candidate, "message", `${s.name}${s.role === "PARENT" ? " (parent)" : ""}`, body.data.body).catch((err) =>
    console.error("[portal] alerte équipe :", err),
  );
  return json({ message });
}
