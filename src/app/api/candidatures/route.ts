import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { intakeSchema, normalizePhone, ageFrom } from "@/lib/validations/intake";
import { generateCandidateCode } from "@/lib/utils";
import { findPartnerByCode, awardPoints, POINTS_RULES } from "@/lib/points";
import { notifyNewCandidate, notifyCandidateConfirmation } from "@/lib/notifications";
import { appendCandidateRow } from "@/lib/google-sheets";
import { REFERRAL_COOKIE } from "@/lib/referral";

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

  // Attribution de source, par ordre de fiabilité : le lien de parrainage
  // (?ref= capté côté client), puis le cookie posé par /r/CODE (visite
  // antérieure), et seulement en dernier recours le code tapé à la main.
  const cookieRef = req.cookies.get(REFERRAL_COOKIE)?.value;
  const srcParam = d.srcParam || cookieRef || undefined;
  const partner =
    (await findPartnerByCode(srcParam)) || (await findPartnerByCode(d.partnerDeclared));

  // "Autre" + précision : on garde la précision, sinon elle était perdue.
  const withOther = (value: string, other?: string) =>
    /^(autre|other)$/i.test(value) && other?.trim() ? `${value} : ${other.trim()}` : value;

  const candidate = await prisma.candidate.create({
    data: {
      code: generateCandidateCode(),
      fullName: d.fullName.trim(),
      whatsapp: normalizePhone(d.whatsapp),
      email: d.email,
      dateOfBirth: new Date(d.dateOfBirth),
      age: ageFrom(d.dateOfBirth) ?? undefined,
      country: d.country,
      city: d.city.trim(),
      managedBy: d.managedBy,
      guardianName: d.guardianName,
      guardianLink: d.guardianLink,
      guardianWhatsapp: d.guardianWhatsapp ? normalizePhone(d.guardianWhatsapp) : undefined,
      currentSituation: d.currentSituation,
      highestDegree: withOther(d.highestDegree, d.degreeOther),
      degreeYear: d.degreeYear,
      degreeAverage: d.degreeAverage,
      targetLevel: d.targetLevel,
      fieldOfStudy: withOther(d.fieldOfStudy, d.fieldOther),
      passportStatus: d.passportStatus,
      englishLevel: d.englishLevel,
      fundingPlan: d.fundingPlan,
      targetIntake: d.targetIntake,
      referredByPartnerDeclared: d.partnerDeclared,
      discoverySource: d.discoverySource,
      consentGiven: d.consentGiven,
      submissionDurationSec: d.submissionDurationSec,
      srcParam,
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

  notifyNewCandidate({ ...candidate, partner }).catch((err) => console.error("[notify] échec :", err));
  notifyCandidateConfirmation(candidate).catch((err) => console.error("[notify] confirmation candidat :", err));
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
            { email: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { partner: { select: { fullName: true, referralCode: true } } },
  });

  return NextResponse.json({ candidates });
}
