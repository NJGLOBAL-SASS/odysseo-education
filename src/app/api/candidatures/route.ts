import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { intakeSchema, normalizePhone, ageFrom } from "@/lib/validations/intake";
import { generateCandidateCode } from "@/lib/utils";
import { findPartnerByCode, awardPoints, POINTS_RULES } from "@/lib/points";
import { notifyNewCandidate } from "@/lib/notifications";
import { appendCandidateRow } from "@/lib/google-sheets";

export async function POST(req: NextRequest) {
  const raw = await req.json();

  // Détection anti-robot : honeypot rempli ou soumission trop rapide.
  const isBot = Boolean(raw.siteWeb) || (raw.submissionDurationSec ?? 99) < 5;

  const parsed = intakeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  if (isBot) {
    // On simule un succès sans rien enregistrer, pour ne pas alerter le robot.
    return NextResponse.json({ ok: true, code: "ODY-000000" });
  }

  // Attribution de source : code saisi par le candidat OU ?ref= capté côté client.
  const partner =
    (await findPartnerByCode(d.partnerDeclared)) || (await findPartnerByCode(d.srcParam));

  const candidate = await prisma.candidate.create({
    data: {
      code: generateCandidateCode(),
      fullName: d.fullName.trim(),
      whatsapp: normalizePhone(d.whatsapp),
      dateOfBirth: new Date(d.dateOfBirth),
      age: ageFrom(d.dateOfBirth) ?? undefined,
      country: d.country,
      city: d.city.trim(),
      managedBy: d.managedBy,
      guardianName: d.guardianName,
      guardianLink: d.guardianLink,
      guardianWhatsapp: d.guardianWhatsapp ? normalizePhone(d.guardianWhatsapp) : undefined,
      currentSituation: d.currentSituation,
      highestDegree: d.highestDegree,
      degreeYear: d.degreeYear,
      degreeAverage: d.degreeAverage,
      targetLevel: d.targetLevel,
      fieldOfStudy: d.fieldOfStudy,
      passportStatus: d.passportStatus,
      englishLevel: d.englishLevel,
      fundingPlan: d.fundingPlan,
      targetIntake: d.targetIntake,
      referredByPartnerDeclared: d.partnerDeclared,
      discoverySource: d.discoverySource,
      consentGiven: d.consentGiven,
      submissionDurationSec: d.submissionDurationSec,
      srcParam: d.srcParam,
      locale: d.locale,
      partnerId: partner?.id,
    },
  });

  if (partner) {
    await prisma.referralEvent.create({
      data: { partnerId: partner.id, type: "FORM_SUBMITTED", candidateId: candidate.id },
    });
    await awardPoints(partner.id, POINTS_RULES.NEW_LEAD, "NEW_LEAD", candidate.id);
  }

  notifyNewCandidate(candidate).catch((err) => console.error("[notify] échec :", err));
  appendCandidateRow(candidate).catch((err) => console.error("[google-sheets] échec :", err));

  return NextResponse.json({ ok: true, code: candidate.code });
}

/** Liste des candidatures pour le tableau de bord (protégé). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const candidates = await prisma.candidate.findMany({
    where: {
      status: status ? (status as never) : undefined,
      OR: q
        ? [
            { fullName: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { partner: { select: { fullName: true, referralCode: true } } },
  });

  return NextResponse.json({ candidates });
}
