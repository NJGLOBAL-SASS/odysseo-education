import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyPortalAccounts } from "@/lib/notifications";

const select = { id: true, authorType: true, authorName: true, body: true, createdAt: true, readByCandidateAt: true } as const;

/** Fil de messages d'un dossier (équipe) ; les messages de l'étudiant / du parent sont marqués lus. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const [messages] = await Promise.all([
    prisma.portalMessage.findMany({ where: { candidateId: params.id }, orderBy: { createdAt: "asc" }, take: 500, select }),
    prisma.portalMessage.updateMany({ where: { candidateId: params.id, authorType: { not: "TEAM" }, readByTeamAt: null }, data: { readByTeamAt: new Date() } }),
  ]);
  return NextResponse.json({ messages });
}

const schema = z.object({ body: z.string().trim().min(1).max(4000) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const candidate = await prisma.candidate.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!candidate) return NextResponse.json({ error: "notFound" }, { status: 404 });

  // Nom affiché à l'étudiant : prénom du membre de l'équipe, ou « Équipe Odysseo ».
  const first = session.user.name?.trim().split(/\s+/)[0];
  const message = await prisma.portalMessage.create({
    data: { candidateId: candidate.id, authorType: "TEAM", userId: session.user.id, authorName: first ? `${first} · Odysseo` : "Équipe Odysseo", body: body.data.body },
    select,
  });
  notifyPortalAccounts(candidate.id, "message", { fr: body.data.body.slice(0, 300), en: body.data.body.slice(0, 300) }, "/espace/messages").catch((err) =>
    console.error("[portal] alerte message :", err),
  );
  return NextResponse.json({ message });
}
