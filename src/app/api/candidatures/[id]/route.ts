import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { syncCandidatePoints } from "@/lib/points";
import { ALL_STAGES, PUBLIC_NOTE_MAX, appendStage, normalizeHistory } from "@/lib/tracking-stages";
import { notifyPortalAccounts } from "@/lib/notifications";
import fr from "@/i18n/messages/fr.json";
import en from "@/i18n/messages/en.json";

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
  // Suivi en ligne (PACK-08) : étape visible par l'étudiant et note publique.
  stage: z.enum(ALL_STAGES).optional(),
  publicNote: z.string().trim().max(PUBLIC_NOTE_MAX).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const existing = await prisma.candidate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const { stage, publicNote, ...rest } = body.data;
  const stageChanged = stage !== undefined && stage !== existing.stage;
  const now = new Date();
  const candidate = await prisma.candidate.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(publicNote !== undefined && { publicNote: publicNote || null }),
      ...(stageChanged && {
        stage,
        stageUpdatedAt: now,
        stageHistory: appendStage(normalizeHistory(existing.stageHistory, existing.createdAt), existing.stage, stage, now),
      }),
    },
  });

  // Espace étudiant : l'étudiant et le parent sont prévenus du changement d'étape.
  if (stageChanged && stage) {
    notifyPortalAccounts(
      candidate.id,
      "stage",
      {
        fr: `Votre dossier passe à l'étape : ${fr.suivi.stages[stage].label}.`,
        en: `Your application moves to the step: ${en.suivi.stages[stage].label}.`,
      },
      "/espace",
    ).catch((err) => console.error("[portal] alerte étape :", err));
  }

  // Points du partenaire : ajout si le dossier monte de palier, retrait s'il redescend.
  if (body.data.status) {
    await syncCandidatePoints(candidate, existing.status, body.data.status, session.user.id);
  }

  return NextResponse.json({ candidate });
}
