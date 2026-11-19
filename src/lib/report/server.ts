/**
 * Rapport d'admissibilité : dépôt, envoi, lecture, relances, arrêt (ODY-15), CÔTÉ SERVEUR.
 * Toutes les transitions du statut unique (AdmissionReport.status) passent par ici et
 * écrivent une ligne d'historique (CandidateEvent).
 */
import "server-only";

import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { publicSiteUrl } from "@/lib/referral";
import { CATALOGUE_VERSION, getOffer } from "@/lib/matching/catalogue";
import { PROGRAM_BY_LEVEL, TARIFS, firstInstallment as installmentOf } from "@/lib/pricing/tarifs";
import { optionLabel } from "@/lib/intake-labels";
import { appendStage, firstNameOf, normalizeHistory, stagePosition, type Stage } from "@/lib/tracking-stages";
import { isClosed, isPreSend, reportBadge, reportStatus, type ReportStatus, type SendMode } from "./status";
import { MAX_REMINDERS, isDueToday, planReminders, postponedDate, reminderMessage, validUntilFrom } from "./reminders";
import { checkOffers, needsRecheck, nearestDeadline, type SnapshotOffer } from "./offers-check";

type Db = Prisma.TransactionClient | typeof prisma;
export type Actor = { id?: string | null; name: string };

/** Le lien privé reste actif 30 jours après l'envoi (ODY-15 §6). */
export const LINK_DAYS = 30;
export const REPORT_MAX_MB = 10;
export const VALIDITY_DAYS = TARIFS.validite_rapport_jours ?? 7;
export const PENDING_REMINDER = ["a_faire", "reportee"];

export const newToken = () => randomBytes(24).toString("base64url"); // 32 caractères
export const reportLink = (token: string) => `${publicSiteUrl()}/rapport/${token}`;
export const reportBlobPrefix = (code: string) => `documents/equipe/rapports/${code}/`;

export function logEvent(db: Db, candidateId: string, type: string, actor: string | null, detail?: string | null) {
  return db.candidateEvent.create({ data: { candidateId, type, actorName: actor, detail: detail?.slice(0, 500) ?? null } });
}

/** Rapport (ligne AdmissionReport) du dossier, créé au besoin (dossiers antérieurs au PACK-12). */
export async function ensureReport(db: Db, candidateId: string) {
  const existing = await db.admissionReport.findUnique({ where: { candidateId } });
  if (existing) return existing;
  const c = await db.candidate.findUniqueOrThrow({ where: { id: candidateId }, select: { targetLevel: true } });
  return db.admissionReport.create({ data: { candidateId, program: PROGRAM_BY_LEVEL[c.targetLevel] ?? "master", status: "brouillon" } });
}

/** Étape de la frise de l'étudiant : n'avance que si le dossier n'est pas déjà plus loin. */
async function advanceStage(db: Db, candidateId: string, target: Stage, now: Date) {
  const c = await db.candidate.findUniqueOrThrow({ where: { id: candidateId }, select: { stage: true, stageHistory: true, createdAt: true } });
  const cur = stagePosition(c.stage);
  if (cur === -1 || cur >= stagePosition(target)) return;
  await db.candidate.update({
    where: { id: candidateId },
    data: { stage: target, stageUpdatedAt: now, stageHistory: appendStage(normalizeHistory(c.stageHistory, c.createdAt), c.stage, target, now) },
  });
}

async function cancelPendingReminders(db: Db, candidateId: string) {
  await db.reportReminder.updateMany({ where: { candidateId, status: { in: PENDING_REMINDER } }, data: { status: "annulee" } });
}

/** 1er versement (FCFA) du cursus facturé (tarifs.json ; MBBS au tarif Bachelor). */
export function firstInstallmentFor(program: string | null | undefined) {
  return installmentOf(program);
}

/** Instantané des offres à l'émission (ref, date limite, statut). */
export function snapshotOf(refs: string[]): SnapshotOffer[] {
  return refs.map((ref) => {
    const o = getOffer(ref);
    return { ref, date_limite: o?.date_limite ?? null, statut: o?.statut ?? null };
  });
}

const catalogueLookup = (ref: string) => {
  const o = getOffer(ref);
  return o ? { ref: o.ref, date_limite: o.date_limite, statut: o.statut } : undefined;
};

export function checkSnapshot(snapshot: unknown, today = new Date()) {
  return checkOffers(Array.isArray(snapshot) ? (snapshot as SnapshotOffer[]) : [], catalogueLookup, today);
}

// ── Dépôt ──

export interface DepositInput {
  candidateId: string;
  blobUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  message: string;
  cas: string;
  nbOffres: number | null;
  refs: string[];
  source?: "manuel" | "ia" | "regles";
}

export async function depositDocument(input: DepositInput, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const report = await ensureReport(tx, input.candidateId);
    const last = await tx.reportDocument.findFirst({ where: { candidateId: input.candidateId }, orderBy: { version: "desc" }, select: { version: true } });
    const version = (last?.version ?? 0) + 1;
    const doc = await tx.reportDocument.create({
      data: {
        candidateId: input.candidateId,
        version,
        blobUrl: input.blobUrl,
        fileName: input.fileName,
        fileSize: input.fileSize,
        message: input.message,
        source: input.source ?? "manuel",
        cas: input.cas,
        nbOffres: input.nbOffres ?? (input.refs.length || null),
        firstInstallment: firstInstallmentFor(report.program),
        offersSnapshot: input.refs.length ? (snapshotOf(input.refs) as unknown as Prisma.InputJsonValue) : undefined,
        catalogueVersion: input.refs.length ? CATALOGUE_VERSION : null,
        token: newToken(),
        depositedById: actor.id ?? null,
        depositedByName: actor.name,
      },
    });
    const status = reportStatus(report);
    // Rapport prêt : avant l'envoi, ou nouvelle version après un envoi resté sans réponse.
    if (isPreSend(status) || status === "envoye" || status === "lu") {
      await tx.admissionReport.update({ where: { id: report.id }, data: { status: "a_valider" } });
    }
    await logEvent(tx, input.candidateId, version > 1 ? "rapport_modifie" : "rapport_depose", actor.name, `v${version}${input.fileName ? ` · ${input.fileName}` : ""}`);
    return doc;
  });
}

// ── Envoi ──

/**
 * « Le rapport est bien parti ? » → Oui. Enregistre le message exact, crée les 3 relances
 * (sauf suivi terminé), passe la candidature en « envoye ». `sentAt` : date d'un envoi rattrapé.
 */
export async function markSent(documentId: string, o: { mode: SendMode; message?: string | null; sentAt?: Date }, actor: Actor) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const doc = await tx.reportDocument.findUniqueOrThrow({ where: { id: documentId } });
    if (doc.archivedAt) throw new Error("archived");
    const report = await ensureReport(tx, doc.candidateId);
    const status = reportStatus(report);
    if (doc.sentAt) {
      // « Renvoyer le rapport » : seulement une ligne d'historique.
      await logEvent(tx, doc.candidateId, "rapport_envoye", actor.name, `v${doc.version} renvoyé (${o.mode})`);
      return doc;
    }
    const sentAt = o.sentAt ?? now;
    const updated = await tx.reportDocument.update({
      where: { id: doc.id },
      data: {
        sentAt,
        sentById: actor.id ?? null,
        sentByName: actor.name,
        sentMessage: o.message ?? doc.message,
        sendMode: o.mode,
        validUntil: validUntilFrom(sentAt, VALIDITY_DAYS),
      },
    });
    await cancelPendingReminders(tx, doc.candidateId);
    if (!isClosed(status)) {
      await tx.admissionReport.update({ where: { id: report.id }, data: { status: "envoye" } });
      if (report.remindersActive) {
        const plan = planReminders(sentAt, now);
        if (plan.length) await tx.reportReminder.createMany({ data: plan.map((p) => ({ candidateId: doc.candidateId, documentId: doc.id, number: p.number, dueAt: p.dueAt })) });
      }
      await advanceStage(tx, doc.candidateId, "rapport_envoye", now);
    }
    const how = { whatsapp_lien: "via WhatsApp", partage_pdf: "par partage du PDF", hors_plateforme: "hors plateforme" }[o.mode];
    await logEvent(tx, doc.candidateId, "rapport_envoye", actor.name, `v${doc.version} ${how}${o.sentAt ? ` (envoyé le ${o.sentAt.toLocaleDateString("fr-FR")})` : ""}`);
    return updated;
  });
}

/** « Annuler l'envoi » (erreur) : la version redevient « prête », les relances sont annulées. */
export async function cancelSend(documentId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.reportDocument.findUniqueOrThrow({ where: { id: documentId } });
    if (!doc.sentAt) return doc;
    await tx.reportDocument.update({ where: { id: doc.id }, data: { sentAt: null, sentById: null, sentByName: null, sentMessage: null, sendMode: null, validUntil: null } });
    await tx.reportReminder.updateMany({ where: { documentId: doc.id, status: { in: PENDING_REMINDER } }, data: { status: "annulee" } });
    const report = await ensureReport(tx, doc.candidateId);
    const otherSent = await tx.reportDocument.count({ where: { candidateId: doc.candidateId, sentAt: { not: null }, archivedAt: null } });
    if (!otherSent && ["envoye", "lu"].includes(reportStatus(report) ?? "")) {
      await tx.admissionReport.update({ where: { id: report.id }, data: { status: "a_valider" } });
    }
    await logEvent(tx, doc.candidateId, "envoi_annule", actor.name, `v${doc.version}`);
    return doc;
  });
}

// ── Lien privé ──

export function linkActive(doc: { sentAt: Date | null; depositedAt: Date; archivedAt: Date | null }, now = new Date()) {
  if (doc.archivedAt) return false;
  const from = doc.sentAt ?? doc.depositedAt;
  return now.getTime() - from.getTime() <= LINK_DAYS * 86_400_000;
}

/** 1re ouverture du lien par l'étudiant → « lu » (seule confirmation automatique possible). */
export async function markRead(token: string) {
  const doc = await prisma.reportDocument.findUnique({ where: { token } });
  if (!doc || doc.readAt || !doc.sentAt || !linkActive(doc)) return;
  await prisma.$transaction(async (tx) => {
    const fresh = await tx.reportDocument.updateMany({ where: { id: doc.id, readAt: null }, data: { readAt: new Date() } });
    if (fresh.count === 0) return;
    const report = await tx.admissionReport.findUnique({ where: { candidateId: doc.candidateId } });
    if (report && reportStatus(report) === "envoye") await tx.admissionReport.update({ where: { id: report.id }, data: { status: "lu" } });
    await logEvent(tx, doc.candidateId, "rapport_lu", "l'étudiant", `v${doc.version}`);
  });
}

// ── Suite ──

export async function markOui(candidateId: string, actor: Actor) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const report = await ensureReport(tx, candidateId);
    if (reportStatus(report) === "premier_versement_recu") return;
    await tx.admissionReport.update({
      where: { id: report.id },
      data: { status: "oui_recu", ouiAt: now, ouiByName: actor.name, remindersActive: false, stopReason: "oui_recu", stoppedAt: now, stoppedByName: actor.name },
    });
    await cancelPendingReminders(tx, candidateId);
    await advanceStage(tx, candidateId, "accord", now);
    await logEvent(tx, candidateId, "oui_recu", actor.name);
  });
}

export async function stopReminders(candidateId: string, reason: string, note: string | null, actor: Actor) {
  await prisma.$transaction(async (tx) => {
    const report = await ensureReport(tx, candidateId);
    const status = reportStatus(report);
    await tx.admissionReport.update({
      where: { id: report.id },
      data: {
        remindersActive: false,
        stopReason: reason,
        stopNote: note,
        stoppedAt: new Date(),
        stoppedByName: actor.name,
        ...(isClosed(status) ? {} : { status: "sans_suite" }),
      },
    });
    await cancelPendingReminders(tx, candidateId);
    await logEvent(tx, candidateId, "relances_arretees", actor.name, [reason, note].filter(Boolean).join(" · "));
  });
}

/** Reprendre le suivi après « Sans suite » (erreur ou étudiant revenu). */
export async function resumeFollowUp(candidateId: string, actor: Actor) {
  await prisma.$transaction(async (tx) => {
    const report = await ensureReport(tx, candidateId);
    if (reportStatus(report) !== "sans_suite") return;
    const sent = await tx.reportDocument.findFirst({ where: { candidateId, sentAt: { not: null }, archivedAt: null }, orderBy: { version: "desc" } });
    await tx.admissionReport.update({
      where: { id: report.id },
      data: { status: sent ? (sent.readAt ? "lu" : "envoye") : "a_valider", remindersActive: true, stopReason: null, stopNote: null, stoppedAt: null, stoppedByName: null },
    });
    await logEvent(tx, candidateId, "note", actor.name, "Suivi repris");
  });
}

/** 1er versement confirmé (paiements) : suivi terminé, relances arrêtées. Appelé dans la transaction du paiement. */
export async function onFirstPayment(tx: Db, candidateId: string, actor: string) {
  const report = await ensureReport(tx, candidateId);
  await tx.admissionReport.update({
    where: { id: report.id },
    data: { status: "premier_versement_recu", remindersActive: false, stopReason: report.stopReason ?? "versement", stoppedAt: report.stoppedAt ?? new Date(), stoppedByName: report.stoppedByName ?? actor },
  });
  await cancelPendingReminders(tx, candidateId);
  await logEvent(tx, candidateId, "versement_recu", actor);
}

// ── Relances ──

export async function reminderSent(reminderId: string, message: string, actor: Actor) {
  await prisma.$transaction(async (tx) => {
    const r = await tx.reportReminder.findUniqueOrThrow({ where: { id: reminderId } });
    if (!PENDING_REMINDER.includes(r.status)) return;
    await tx.reportReminder.update({ where: { id: r.id }, data: { status: "envoyee", sentAt: new Date(), sentByName: actor.name, message } });
    await logEvent(tx, r.candidateId, "relance_envoyee", actor.name, `Relance ${r.number}/${MAX_REMINDERS}`);
  });
}

export async function postponeReminder(reminderId: string, actor: Actor) {
  await prisma.$transaction(async (tx) => {
    const r = await tx.reportReminder.findUniqueOrThrow({ where: { id: reminderId } });
    if (!PENDING_REMINDER.includes(r.status)) return;
    const dueAt = postponedDate(r.dueAt);
    await tx.reportReminder.update({ where: { id: r.id }, data: { status: "reportee", dueAt } });
    await logEvent(tx, r.candidateId, "relance_reportee", actor.name, `Relance ${r.number} au ${dueAt.toLocaleDateString("fr-FR", { timeZone: "Africa/Douala" })}`);
  });
}

// ── Rattrapage groupé (ODY-15 §5.1) ──

/** « Marquer rapport envoyé » sur plusieurs candidatures déjà traitées hors plateforme. */
export async function bulkMarkSent(candidateIds: string[], o: { sentAt: Date; cas: string }, actor: Actor) {
  let done = 0;
  const skipped: string[] = [];
  for (const candidateId of candidateIds) {
    const report = await prisma.admissionReport.findUnique({ where: { candidateId } });
    const status = reportStatus(report);
    const alreadySent = await prisma.reportDocument.count({ where: { candidateId, sentAt: { not: null }, archivedAt: null } });
    if (alreadySent || (status && !isPreSend(status))) {
      skipped.push(candidateId);
      continue;
    }
    // Version déjà déposée et pas encore envoyée : on la marque envoyée ; sinon envoi sans PDF.
    const pending = await prisma.reportDocument.findFirst({ where: { candidateId, sentAt: null, archivedAt: null }, orderBy: { version: "desc" } });
    const doc =
      pending ??
      (await depositDocument({ candidateId, blobUrl: null, fileName: null, fileSize: null, message: "", cas: o.cas, nbOffres: null, refs: [] }, actor));
    await markSent(doc.id, { mode: "hors_plateforme", sentAt: o.sentAt }, actor);
    done++;
  }
  return { done, skipped };
}

// ── Liste du tableau de bord ──

export const listInclude = {
  admissionReport: { select: { status: true, publishedAt: true, paymentReceivedAt: true, stopReason: true, remindersActive: true } },
  reportDocuments: {
    where: { archivedAt: null },
    orderBy: { version: "desc" as const },
    select: { id: true, version: true, sentAt: true, sentByName: true, readAt: true, validUntil: true, offersSnapshot: true, cas: true },
  },
  reportReminders: { select: { number: true, status: true, dueAt: true } },
} satisfies Prisma.CandidateInclude;

type ListRow = Pick<Prisma.CandidateGetPayload<{ include: typeof listInclude }>, "admissionReport" | "reportDocuments" | "reportReminders">;

export interface ReportSummary {
  status: ReportStatus | null;
  badge: ReturnType<typeof reportBadge>;
  toSend: boolean;
  remindToday: boolean;
  sentUnread: boolean;
  recheck: boolean;
  cas: string | null;
  sentAt: string | null;
}

export function summarize(c: ListRow, now = new Date()): ReportSummary {
  const status = reportStatus(c.admissionReport);
  const latest = c.reportDocuments[0] ?? null;
  const sent = c.reportDocuments.find((d) => d.sentAt) ?? null;
  const lastReminder = Math.max(0, ...c.reportReminders.filter((r) => r.status === "envoyee").map((r) => r.number));
  const pending = c.reportReminders.filter((r) => PENDING_REMINDER.includes(r.status));
  const followed = status === "envoye" || status === "lu";
  const recheckable = followed || status === "oui_recu";
  return {
    status,
    badge: reportBadge({ status, latest, sent: sent && { sentAt: sent.sentAt!, sentByName: sent.sentByName, readAt: sent.readAt }, lastReminder, stopReason: c.admissionReport?.stopReason }),
    toSend: isPreSend(status) || Boolean(latest && !latest.sentAt && followed),
    remindToday: followed && pending.some((r) => isDueToday(r.dueAt, now)),
    sentUnread: followed && Boolean(sent) && !sent?.readAt,
    recheck: recheckable && Boolean(sent) && needsRecheck(checkSnapshot(sent?.offersSnapshot, now)),
    cas: (sent ?? latest)?.cas ?? null,
    sentAt: sent?.sentAt?.toISOString() ?? null,
  };
}

// ── Liste « À relancer aujourd'hui » (ODY-15 §7.3) ──

export async function remindersDueToday(now = new Date()) {
  const rows = await prisma.reportReminder.findMany({
    where: { status: { in: PENDING_REMINDER }, dueAt: { lte: new Date(now.getTime() + 86_400_000) } },
    orderBy: [{ dueAt: "asc" }],
    include: {
      candidate: {
        select: {
          id: true, code: true, fullName: true, whatsapp: true, country: true, managedBy: true, guardianName: true, targetIntake: true,
          admissionReport: { select: { status: true, publishedAt: true, paymentReceivedAt: true } },
        },
      },
    },
  });
  const due = rows.filter((r) => isDueToday(r.dueAt, now) && ["envoye", "lu"].includes(reportStatus(r.candidate.admissionReport) ?? ""));
  const docs = await prisma.reportDocument.findMany({ where: { id: { in: due.map((r) => r.documentId).filter((x): x is string => Boolean(x)) } } });
  const byId = new Map(docs.map((d) => [d.id, d]));
  return due.map((r) => {
    const doc = r.documentId ? byId.get(r.documentId) : undefined;
    const c = r.candidate;
    const parent = c.managedBy !== "self";
    const checked = checkSnapshot(doc?.offersSnapshot, now);
    const read = Boolean(doc?.readAt);
    const message = reminderMessage(r.number, {
      read,
      cas: doc?.cas ?? "standard",
      parent,
      validUntil: doc?.validUntil ?? null,
      deadline: nearestDeadline(checked, now),
      now,
      vars: {
        prenom: parent && c.guardianName ? firstNameOf(c.guardianName) : firstNameOf(c.fullName),
        lien_rapport: doc?.blobUrl ? reportLink(doc.token) : null,
        nb_offres: doc?.nbOffres ?? null,
        rentree: optionLabel("targetIntake", c.targetIntake) || null,
        premier_versement: doc?.firstInstallment ? new Intl.NumberFormat("fr-FR").format(doc.firstInstallment).replace(/ | /g, " ") : null,
      },
    });
    return {
      id: r.id,
      number: r.number,
      dueAt: r.dueAt.toISOString(),
      candidate: { id: c.id, code: c.code, firstName: firstNameOf(c.fullName), whatsapp: c.whatsapp, country: c.country },
      cas: doc?.cas ?? "standard",
      read,
      validUntil: doc?.validUntil?.toISOString() ?? null,
      recheck: needsRecheck(checked),
      message,
    };
  });
}

export type DueReminder = Awaited<ReturnType<typeof remindersDueToday>>[number];
