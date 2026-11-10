import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOffer } from "@/lib/matching/catalogue";
import { getInternalOffer } from "@/lib/matching/internes";
import { appendStage, normalizeHistory, STAGES, type Stage } from "@/lib/tracking-stages";
import { notifyPortalAccounts } from "@/lib/notifications";
import { REVEAL_REASONS, checklistInclude, ensureChecklist, progressOf, reportDraftSchema, reportOffers } from "@/lib/admission/server";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Étape suivante seulement si le dossier n'est pas déjà plus loin dans la frise. */
function advance(candidate: { stage: string; stageHistory: unknown; createdAt: Date }, target: Stage, now: Date) {
  const cur = (STAGES as readonly string[]).indexOf(candidate.stage);
  if (cur === -1 || cur >= (STAGES as readonly string[]).indexOf(target)) return {};
  return {
    stage: target,
    stageUpdatedAt: now,
    stageHistory: appendStage(normalizeHistory(candidate.stageHistory, candidate.createdAt), candidate.stage, target, now),
  };
}

/** Bloc « Rapport et documents » de la fiche dossier : rapport, checklist (avec fichiers), traductions. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return bad("Non authentifié.", 401);
  const [report, items, translations] = await Promise.all([
    prisma.admissionReport.findUnique({ where: { candidateId: params.id } }),
    prisma.checklistItem.findMany({ where: { candidateId: params.id }, include: checklistInclude, orderBy: { sortOrder: "asc" } }),
    prisma.translationTask.findMany({ where: { candidateId: params.id }, include: { item: { select: { labelFr: true } } }, orderBy: { createdAt: "asc" } }),
  ]);
  return NextResponse.json({
    report: report && {
      ...report,
      offers: reportOffers(report).map((o) => ({ ...o, university: getInternalOffer(o.ref)?.universite ?? null, place: getOffer(o.ref)?.lieu_affiche ?? null })),
    },
    items: items.map(({ folder, ...i }) => ({ ...i, files: folder?.files.map(({ blobUrl: _b, ...f }) => f) ?? [] })),
    progress: progressOf(items.filter((i) => !i.removedAt)),
    translations: translations.map((t) => ({ id: t.id, label: t.item.labelFr, language: t.language, doneAt: t.doneAt, doneByName: t.doneByName })),
  });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save") }).merge(reportDraftSchema),
  z.object({ action: z.literal("publish") }),
  z.object({ action: z.literal("payment"), amount: z.number().int().positive().max(100_000_000), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ action: z.literal("reveal"), ref: z.string(), reason: z.enum(REVEAL_REASONS).nullable() }),
  z.object({
    action: z.literal("addItem"),
    labelFr: z.string().trim().min(2).max(160),
    labelEn: z.string().trim().max(160).optional(),
    helpFr: z.string().trim().max(500).optional(),
    phase: z.enum(["maintenant", "plus_tard"]).default("maintenant"),
    required: z.boolean().default(true),
  }),
]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return bad("Non authentifié.", 401);
  const body = actionSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return bad("invalid");
  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    select: { id: true, stage: true, stageHistory: true, createdAt: true },
  });
  if (!candidate) return bad("notFound", 404);
  const who = session.user.name || session.user.email || "Équipe";
  const report = await prisma.admissionReport.findUnique({ where: { candidateId: candidate.id } });
  const d = body.data;
  const now = new Date();

  if (d.action === "save") {
    if (new Set(d.offers.map((o) => o.ref)).size !== d.offers.length) return bad("duplicateOffer");
    if (!d.offers.every((o) => getOffer(o.ref))) return bad("unknownOffer");
    // Les révélations déjà faites sont conservées pour les offres gardées.
    const previous = new Map(reportOffers(report).map((o) => [o.ref, o]));
    const offers = d.offers.map((o) => ({ ref: o.ref, role: o.role, revealedAt: previous.get(o.ref)?.revealedAt ?? null, revealReason: previous.get(o.ref)?.revealReason ?? null }));
    const data = { program: d.program, offers, comment: d.comment || null };
    await prisma.admissionReport.upsert({ where: { candidateId: candidate.id }, update: data, create: { ...data, candidateId: candidate.id } });
    // Checklist déjà ouverte : les documents demandés par une nouvelle offre s'ajoutent.
    if (report?.paymentReceivedAt) await ensureChecklist(candidate.id);
    return NextResponse.json({ ok: true });
  }

  if (!report) return bad("noReport", 409);

  if (d.action === "publish") {
    if (reportOffers(report).length < 2) return bad("tooFewOffers");
    await prisma.$transaction([
      prisma.admissionReport.update({ where: { id: report.id }, data: { version: { increment: 1 }, publishedAt: now, publishedByName: who } }),
      prisma.candidate.update({ where: { id: candidate.id }, data: advance(candidate, "rapport_envoye", now) }),
    ]);
    notifyPortalAccounts(
      candidate.id,
      "report",
      {
        fr: "Votre rapport d'admissibilité est prêt : découvrez les offres sélectionnées pour vous et validez votre dossier.",
        en: "Your eligibility report is ready: see the offers selected for you and confirm your application.",
      },
      "/espace/rapport",
    ).catch((err) => console.error("[admission] alerte rapport :", err));
    return NextResponse.json({ ok: true });
  }

  if (d.action === "payment") {
    if (!report.publishedAt) return bad("notPublished", 409);
    await prisma.$transaction(async (tx) => {
      await tx.admissionReport.update({
        where: { id: report.id },
        data: { paymentReceivedAt: new Date(`${d.date}T12:00:00Z`), paymentAmount: d.amount, paymentRecordedByName: who },
      });
      await tx.candidate.update({ where: { id: candidate.id }, data: advance(candidate, "ouvert", now) });
      await ensureChecklist(candidate.id, tx);
    });
    notifyPortalAccounts(
      candidate.id,
      "report",
      {
        fr: "Paiement reçu, merci ! Vous pouvez maintenant envoyer vos documents depuis l'onglet Documents de votre espace.",
        en: "Payment received, thank you! You can now send your documents from the Documents tab of your space.",
      },
      "/espace/documents",
    ).catch((err) => console.error("[admission] alerte paiement :", err));
    return NextResponse.json({ ok: true });
  }

  if (d.action === "reveal") {
    const offers = reportOffers(report);
    if (!offers.some((o) => o.ref === d.ref)) return bad("unknownOffer");
    const next = offers.map((o) =>
      o.ref === d.ref ? { ...o, revealedAt: d.reason ? now.toISOString() : null, revealReason: d.reason } : o,
    );
    await prisma.admissionReport.update({ where: { id: report.id }, data: { offers: next } });
    if (d.reason) {
      notifyPortalAccounts(
        candidate.id,
        "report",
        { fr: "Une nouvelle information sur votre offre est disponible dans votre espace.", en: "New information about your offer is available in your space." },
        "/espace/rapport",
      ).catch(() => undefined);
    }
    return NextResponse.json({ ok: true });
  }

  // addItem : document libre ajouté par l'équipe.
  const key = `libre-${Date.now().toString(36)}`;
  const last = await prisma.checklistItem.findFirst({ where: { candidateId: candidate.id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  await prisma.checklistItem.create({
    data: {
      candidateId: candidate.id,
      key,
      kind: "fichier",
      labelFr: d.labelFr,
      labelEn: d.labelEn || d.labelFr,
      helpFr: d.helpFr || null,
      helpEn: d.helpFr || null,
      phase: d.phase,
      required: d.required,
      formats: ["pdf", "jpg", "jpeg", "png", "heic"],
      maxMb: 10,
      sortOrder: (last?.sortOrder ?? 0) + 10,
    },
  });
  return NextResponse.json({ ok: true });
}
