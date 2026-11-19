import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { optionLabel } from "@/lib/intake-labels";
import { firstNameOf } from "@/lib/tracking-stages";
import { getOffer } from "@/lib/matching/catalogue";
import { matchingFor } from "@/lib/report/draft";
import { CASES, SEND_MODES, STOP_REASONS, reportStatus } from "@/lib/report/status";
import { parseRefs } from "@/lib/report/offers-check";
import { profileForClaude, pickSendTemplate, sendTemplateText, SEND_TEMPLATES } from "@/lib/report/templates";
import { waNumber } from "@/lib/report/reminders";
import { joinFr, missingInfo } from "@/lib/analysis/missing-info";
import { formatFcfa } from "@/lib/pricing/tarifs";
import {
  REPORT_MAX_MB,
  VALIDITY_DAYS,
  cancelSend,
  checkSnapshot,
  depositDocument,
  firstInstallmentFor,
  logEvent,
  markOui,
  markSent,
  reportBlobPrefix,
  reportLink,
  resumeFollowUp,
  stopReminders,
} from "@/lib/report/server";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function staff() {
  const session = await auth();
  if (!session?.user) return null;
  return { id: session.user.id ?? null, name: session.user.name || session.user.email || "Équipe", isAdmin: session.user.role === "ADMIN" };
}

/** Bloc « Rapport d'admissibilité » de la fiche (ODY-15 §5.2) : versions, relances, historique. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const me = await staff();
  if (!me) return bad("Non authentifié.", 401);
  const c = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: {
      admissionReport: true,
      reportDocuments: { orderBy: { version: "desc" } },
      reportReminders: { orderBy: [{ number: "asc" }, { createdAt: "asc" }] },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!c) return bad("notFound", 404);
  const report = c.admissionReport;
  const program = report?.program;
  const latestSent = c.reportDocuments.find((d) => d.sentAt && !d.archivedAt);
  const parent = c.managedBy !== "self";
  const prenom = parent && c.guardianName ? firstNameOf(c.guardianName) : firstNameOf(c.fullName);
  const installment = firstInstallmentFor(program);
  const draftRefs = Array.isArray(report?.offers) ? (report!.offers as { ref: string }[]).map((o) => o.ref) : [];
  const service = program === "langue-chinoise" ? "langue" : program;

  return NextResponse.json({
    status: reportStatus(report),
    remindersActive: report?.remindersActive ?? true,
    stopReason: report?.stopReason ?? null,
    stopNote: report?.stopNote ?? null,
    ouiAt: report?.ouiAt ?? null,
    ouiByName: report?.ouiByName ?? null,
    whatsappNumber: waNumber(c.whatsapp, c.country),
    // PACK-13 §3.6 : informations manquantes et message de question prêt.
    missing: missingInfo(c),
    missingMessage: sendTemplateText("MSG-INFOS-MANQUANTES", { prenom, liste_infos: joinFr(missingInfo(c)) }),
    draftRefs,
    profileText: profileForClaude({
      code: c.code,
      createdAt: c.createdAt,
      filledBy: parent ? "parent" : "étudiant",
      fullName: c.fullName,
      whatsapp: c.whatsapp,
      country: c.country,
      city: c.city,
      age: c.age,
      level: optionLabel("targetLevel", c.targetLevel),
      intake: optionLabel("targetIntake", c.targetIntake),
      degree: [c.highestDegree, c.degreeField].filter(Boolean).join(" · "),
      average: c.degreeAverage ?? (c.averageValue != null ? `${c.averageValue}/${c.averageScale ?? "?"}` : ""),
      field: c.fieldOfStudy,
      budget: [optionLabel("bankStatement", c.bankStatement), optionLabel("fundingPlan", c.fundingPlan)].filter(Boolean).join(" · "),
      scholarship: optionLabel("fundingPlan", c.fundingPlan),
      comment: "",
    }),
    // Modèles d'envoi (PACK-13 §7) : modèle proposé + textes, lien ajouté à l'envoi.
    suggestedTemplate: pickSendTemplate({ cas: latestSent?.cas, service, update: Boolean(latestSent) }),
    templates: Object.fromEntries(
      SEND_TEMPLATES.map((k) => [
        k,
        sendTemplateText(k, {
          prenom,
          lien_rapport: "{lien_rapport}",
          nb_offres: draftRefs.length || null,
          rentree: optionLabel("targetIntake", c.targetIntake) || null,
          premier_versement: installment ? formatFcfa(installment) : null,
          date_validite: "{date_validite}",
        }),
      ]),
    ),
    documents: c.reportDocuments.map(({ blobUrl, token, ...d }) => ({
      ...d,
      hasPdf: Boolean(blobUrl),
      link: blobUrl ? reportLink(token) : null,
      offers: checkSnapshot(d.offersSnapshot),
    })),
    reminders: c.reportReminders,
    events: c.events,
    isAdmin: me.isAdmin,
    meId: me.id,
    validityDays: VALIDITY_DAYS,
  });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("deposit"),
    file: z.object({ url: z.string().url(), name: z.string().trim().min(1).max(200) }).nullable(),
    message: z.string().trim().max(5000),
    cas: z.enum(CASES),
    nbOffres: z.number().int().min(0).max(20).nullable(),
    refs: z.string().max(300).default(""),
  }),
  z.object({ action: z.literal("message"), documentId: z.string(), message: z.string().trim().min(1).max(5000) }),
  z.object({ action: z.literal("sent"), documentId: z.string(), mode: z.enum(SEND_MODES), message: z.string().max(6000).nullable().optional() }),
  z.object({ action: z.literal("cancel"), documentId: z.string() }),
  z.object({ action: z.literal("archive"), documentId: z.string() }),
  z.object({ action: z.literal("oui") }),
  z.object({ action: z.literal("stop"), reason: z.enum(STOP_REASONS), note: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("recheck") }),
  z.object({ action: z.literal("note"), text: z.string().trim().min(1).max(500) }),
  z.object({ action: z.literal("infosRecues") }),
]);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await staff();
  if (!me) return bad("Non authentifié.", 401);
  const body = actionSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return bad("invalid");
  const candidate = await prisma.candidate.findUnique({ where: { id: params.id } });
  if (!candidate) return bad("notFound", 404);
  const d = body.data;
  const actor = { id: me.id, name: me.name };

  /** La version visée appartient bien à ce dossier. */
  const ownDoc = async (documentId: string) => prisma.reportDocument.findFirst({ where: { id: documentId, candidateId: candidate.id } });

  switch (d.action) {
    case "deposit": {
      let file: { blobUrl: string; size: number; name: string } | null = null;
      if (d.file) {
        // Taille, type et emplacement vérifiés auprès du store, pas du navigateur.
        const meta = await head(d.file.url).catch(() => null);
        if (!meta || !meta.pathname.startsWith(reportBlobPrefix(candidate.code))) return bad("fileNotFound");
        if (meta.contentType !== "application/pdf") return bad("pdfOnly");
        if (meta.size > REPORT_MAX_MB * 1024 * 1024) return bad("tooLarge");
        file = { blobUrl: meta.url, size: meta.size, name: d.file.name };
      }
      if (!file && !d.message) return bad("empty");
      const refs = parseRefs(d.refs).filter((r) => getOffer(r));
      const doc = await depositDocument(
        { candidateId: candidate.id, blobUrl: file?.blobUrl ?? null, fileName: file?.name ?? null, fileSize: file?.size ?? null, message: d.message, cas: d.cas, nbOffres: d.nbOffres, refs },
        actor,
      );
      return NextResponse.json({ ok: true, id: doc.id });
    }
    case "message": {
      const doc = await ownDoc(d.documentId);
      if (!doc || doc.sentAt) return bad("notEditable", 409);
      await prisma.reportDocument.update({ where: { id: doc.id }, data: { message: d.message } });
      return NextResponse.json({ ok: true });
    }
    case "sent": {
      const doc = await ownDoc(d.documentId);
      if (!doc) return bad("notFound", 404);
      await markSent(doc.id, { mode: d.mode, message: d.message ?? null }, actor);
      return NextResponse.json({ ok: true });
    }
    case "cancel": {
      if (!(await ownDoc(d.documentId))) return bad("notFound", 404);
      await cancelSend(d.documentId, actor);
      return NextResponse.json({ ok: true });
    }
    case "archive": {
      // Seul l'auteur du dépôt ou un administrateur (fondateur) ; archivage, jamais d'effacement.
      const doc = await ownDoc(d.documentId);
      if (!doc) return bad("notFound", 404);
      if (!me.isAdmin && (!doc.depositedById || doc.depositedById !== me.id)) return bad("forbidden", 403);
      if (doc.sentAt) return bad("sentCannotArchive", 409);
      await prisma.$transaction([
        prisma.reportDocument.update({ where: { id: doc.id }, data: { archivedAt: new Date(), archivedByName: me.name } }),
        logEvent(prisma, candidate.id, "version_archivee", me.name, `v${doc.version}`),
      ]);
      // Plus aucune version prête : la candidature revient à « Nouveau » (ou reste envoyée).
      const [left, sent] = await Promise.all([
        prisma.reportDocument.count({ where: { candidateId: candidate.id, archivedAt: null } }),
        prisma.reportDocument.count({ where: { candidateId: candidate.id, archivedAt: null, sentAt: { not: null } } }),
      ]);
      const report = await prisma.admissionReport.findUnique({ where: { candidateId: candidate.id } });
      if (report && reportStatus(report) === "a_valider") {
        await prisma.admissionReport.update({ where: { id: report.id }, data: { status: left === 0 ? "brouillon" : sent ? "envoye" : "a_valider" } });
      }
      return NextResponse.json({ ok: true });
    }
    case "oui":
      await markOui(candidate.id, actor);
      return NextResponse.json({ ok: true });
    case "stop":
      await stopReminders(candidate.id, d.reason, d.note || null, actor);
      return NextResponse.json({ ok: true });
    case "resume":
      await resumeFollowUp(candidate.id, actor);
      return NextResponse.json({ ok: true });
    case "infosRecues": {
      // Infos reçues sur WhatsApp : le dossier repasse « à envoyer » (avec la clé API : l'analyse se lancera ici).
      const report = await prisma.admissionReport.findUnique({ where: { candidateId: candidate.id } });
      if (report && reportStatus(report) === "infos_manquantes") {
        await prisma.$transaction([
          prisma.admissionReport.update({ where: { id: report.id }, data: { status: "brouillon" } }),
          logEvent(prisma, candidate.id, "note", me.name, "Informations manquantes reçues"),
        ]);
      }
      return NextResponse.json({ ok: true });
    }
    case "note":
      await logEvent(prisma, candidate.id, "note", me.name, d.text);
      return NextResponse.json({ ok: true });
    case "recheck": {
      // « Revérifier les offres » (PACK-13 §5) : offres du dernier rapport envoyé face au catalogue du jour.
      const sent = await prisma.reportDocument.findFirst({ where: { candidateId: candidate.id, sentAt: { not: null }, archivedAt: null }, orderBy: { version: "desc" } });
      const doc = sent ?? (await prisma.reportDocument.findFirst({ where: { candidateId: candidate.id, archivedAt: null }, orderBy: { version: "desc" } }));
      if (!doc) return bad("noReport", 409);
      const checked = checkSnapshot(doc.offersSnapshot);
      const inReport = new Set(checked.map((x) => x.ref));
      const fresh = matchingFor(candidate).stored.map((s) => s.ref).filter((ref) => !inReport.has(ref));
      const counts = { ok: 0, soon: 0, closed: 0, unknown: 0 };
      for (const x of checked) counts[x.state]++;
      await logEvent(
        prisma,
        candidate.id,
        "offres_reverifiees",
        me.name,
        checked.length
          ? `v${doc.version} : ${counts.ok} ouverte(s), ${counts.soon} date proche, ${counts.closed} fermée(s)${fresh.length ? `, ${fresh.length} nouvelle(s) compatible(s)` : ""}`
          : `v${doc.version} : offres du rapport non renseignées`,
      );
      return NextResponse.json({ ok: true, version: doc.version, offers: checked, fresh, needsUpdate: counts.closed > 0 });
    }
  }
}
