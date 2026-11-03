import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { syncCandidatePoints } from "@/lib/points";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: { partner: true, notificationLogs: true },
  });
  if (!candidate) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  return NextResponse.json({ candidate });
}

const patchSchema = z.object({
  status: z
    .enum([
      "NOUVEAU",
      "QUALIFIE",
      "DOSSIER_EN_COURS",
      "BOURSE_SOUMISE",
      "ADMIS",
      "VISA_EN_COURS",
      "CLOTURE",
      "REFUSE",
    ])
    .optional(),
  internalNotes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const existing = await prisma.candidate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const candidate = await prisma.candidate.update({
    where: { id: params.id },
    data: body.data,
  });

  // Points du partenaire : ajout si le dossier monte de palier, retrait s'il redescend.
  if (body.data.status) {
    await syncCandidatePoints(candidate, existing.status, body.data.status, session.user.id);
  }

  return NextResponse.json({ candidate });
}
