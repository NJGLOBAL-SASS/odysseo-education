import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { blobConfigured } from "@/lib/documents-server";
import { json, requirePortalSession } from "@/lib/portal/guard";
import { activeItemsWhere, checklistInclude, progressOf, toParentItem, toStudentItem } from "@/lib/admission/server";

/** Checklist du dossier : complète pour l'étudiant, états seulement pour le parent. */
export async function GET(req: NextRequest) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  const s = auth.session;
  const locale = req.nextUrl.searchParams.get("locale") === "en" ? "en" : "fr";
  const report = await prisma.admissionReport.findUnique({
    where: { candidateId: s.candidateId },
    select: { paymentReceivedAt: true, documentsConsentAt: true },
  });
  if (!report?.paymentReceivedAt) return json({ open: false });
  const items = await prisma.checklistItem.findMany({
    where: activeItemsWhere(s.candidateId),
    include: checklistInclude,
    orderBy: { sortOrder: "asc" },
  });
  const progress = progressOf(items);
  if (s.role !== "STUDENT") return json({ open: true, role: "PARENT", progress, items: items.map((i) => toParentItem(i, locale)) });
  return json({
    open: true,
    role: "STUDENT",
    progress,
    consent: Boolean(report.documentsConsentAt),
    storageReady: blobConfigured(),
    items: items.map((i) => toStudentItem(i, locale, s.id)),
  });
}

/** Accord de conservation et de transmission des documents, demandé avant le premier envoi. */
export async function POST(req: NextRequest) {
  const auth = await requirePortalSession(req);
  if ("error" in auth) return auth.error;
  if (auth.session.role !== "STUDENT") return json({ error: "studentOnly" }, 403);
  const body = (await req.json().catch(() => null)) as { consent?: boolean } | null;
  if (body?.consent !== true) return json({ error: "invalid" }, 400);
  const updated = await prisma.admissionReport.updateMany({
    where: { candidateId: auth.session.candidateId, documentsConsentAt: null },
    data: { documentsConsentAt: new Date() },
  });
  return json({ ok: true, recorded: updated.count > 0 });
}
