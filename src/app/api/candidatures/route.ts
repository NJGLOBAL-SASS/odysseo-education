import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { intakeSchema, normalizePhone, ageFrom } from "@/lib/validations/intake";
import { generateCandidateCode } from "@/lib/utils";
import { findPartnerByCode, awardPoints, POINTS_RULES } from "@/lib/points";
import { notifyNewCandidate, notifyCandidateConfirmation } from "@/lib/notifications";
import { appendCandidateRow } from "@/lib/google-sheets";
import { REFERRAL_COOKIE } from "@/lib/referral";
import { looksLikeOfferRef } from "@/lib/attribution";
import {
  DEGREE_FIELD_REQUIRED_INDEXES,
  averageDisplay,
  averageToPct,
  bankStatementUsdMax,
  hskToInt,
  isScoredCertificate,
  parseDecimal,
} from "@/lib/qualification";
import fr from "@/i18n/messages/fr.json";
import en from "@/i18n/messages/en.json";
import { isMetaCapiConfigured, sendMetaLeadEvent } from "@/lib/meta-capi";
import { MOTEUR_VERSION, recommendForCandidate } from "@/lib/matching/catalogue";

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

  // Filière obligatoire pour une Licence ou un Master (libellés FR ou EN, même ordre).
  const degreeIdx = [fr, en].map((m) => m.intake.fields.degree.options.indexOf(d.highestDegree)).find((i) => i >= 0) ?? -1;
  if (DEGREE_FIELD_REQUIRED_INDEXES.includes(degreeIdx) && !d.degreeField?.trim()) {
    return NextResponse.json(
      { error: "Données invalides.", issues: { fieldErrors: { degreeField: ["required"] } } },
      { status: 400 }
    );
  }

  if (isBot) {
    // On simule un succès sans rien enregistrer, pour ne pas alerter le robot.
    return NextResponse.json({ ok: true, code: "ODY-000000", recommendations: { cycle: null, offers: [] } });
  }

  // Attribution de source, par ordre de fiabilité : le lien de parrainage
  // (?ref= capté côté client), puis le cookie posé par /r/CODE (visite
  // antérieure), et seulement en dernier recours le code tapé à la main.
  // L'attribution « premier contact » (PACK-04) peut aussi porter le partenaire
  // d'une visite antérieure (?partenaire= / ?ref=).
  const att = d.attribution ?? null;
  const cookieRef = req.cookies.get(REFERRAL_COOKIE)?.value;
  const firstTouchPartner = att?.partner || (att?.ref && !looksLikeOfferRef(att.ref) ? att.ref : undefined);
  // Une référence d'offre (?ref=MA-24) n'est jamais un code partenaire : elle ne masque pas le cookie.
  const srcParam = (d.srcParam && !looksLikeOfferRef(d.srcParam) ? d.srcParam : undefined) || cookieRef || firstTouchPartner || undefined;
  const partner =
    (await findPartnerByCode(srcParam)) || (await findPartnerByCode(d.partnerDeclared));

  // "Autre" + précision : on garde la précision, sinon elle était perdue.
  const withOther = (value: string, other?: string) =>
    /^(autre|other)$/i.test(value) && other?.trim() ? `${value} : ${other.trim()}` : value;

  // PACK-01 : valeurs calculées côté serveur. Les colonnes historiques (degreeAverage,
  // fieldOfStudy, englishLevel) gardent un texte lisible pour le dashboard, les exports et les emails.
  const formFields = (d.locale === "en" ? en : fr).intake.fields;
  const averageValue = d.averageScale === "unknown" ? null : parseDecimal(d.averageValue);
  const englishScore = isScoredCertificate(d.englishCertificate) ? parseDecimal(d.englishScore) : null;
  const domainLabels = d.domains.map((code) => {
    const label = (formFields.field.options as Record<string, string>)[code] ?? code;
    return code === "autre" && d.fieldOther?.trim() ? `${label} : ${d.fieldOther.trim()}` : label;
  });

  // Moteur « Vos 3 offres » (PACK-02), à partir des valeurs enregistrées ci-dessous.
  // Seuls les champs publics des offres retenues sont renvoyés au navigateur.
  const age = ageFrom(d.dateOfBirth);
  const averagePct = averageToPct(averageValue, d.averageScale);
  const matching = recommendForCandidate(
    {
      targetLevel: d.targetLevel,
      studyFields: d.domains,
      degreeField: d.degreeField,
      age,
      averagePct,
      englishCertificate: d.englishCertificate,
      englishScore,
      hskLevel: hskToInt(d.hsk),
      bankStatementUsdMax: bankStatementUsdMax(d.bankStatement),
      originalDiplomas: d.originalDiplomas === "yes",
      country: d.country,
      fundingPlan: d.fundingPlan,
    },
    d.locale,
  );

  const candidate = await prisma.candidate.create({
    data: {
      code: generateCandidateCode(),
      fullName: d.fullName.trim(),
      whatsapp: normalizePhone(d.whatsapp),
      email: d.email,
      dateOfBirth: new Date(d.dateOfBirth),
      age: age ?? undefined,
      country: d.country,
      city: d.city.trim(),
      managedBy: d.managedBy,
      guardianName: d.guardianName,
      guardianLink: d.guardianLink,
      guardianWhatsapp: d.guardianWhatsapp ? normalizePhone(d.guardianWhatsapp) : undefined,
      currentSituation: d.currentSituation,
      highestDegree: withOther(d.highestDegree, d.degreeOther),
      degreeYear: d.degreeYear,
      degreeAverage: averageDisplay(averageValue, d.averageScale, d.locale),
      degreeField: d.degreeField?.trim() || undefined,
      averageValue: averageValue ?? undefined,
      averageScale: d.averageScale,
      averagePct: averagePct ?? undefined,
      originalDiplomas: d.originalDiplomas === "yes",
      targetLevel: d.targetLevel,
      fieldOfStudy: domainLabels.join(" + "),
      studyFields: d.domains,
      passportStatus: d.passportStatus,
      // Sans certificat : réponse Oui / Un peu / Non ; avec certificat ou études en anglais : « Oui ».
      englishLevel: d.englishCertificate === "none" ? d.englishLevel! : "yes",
      englishCertificate: d.englishCertificate,
      englishScore: englishScore ?? undefined,
      hskLevel: hskToInt(d.hsk) ?? undefined,
      bankStatement: d.bankStatement,
      bankStatementUsdMax: bankStatementUsdMax(d.bankStatement) ?? undefined,
      fundingPlan: d.fundingPlan,
      targetIntake: d.targetIntake,
      referredByPartnerDeclared: d.partnerDeclared,
      discoverySource: d.discoverySource,
      consentGiven: d.consentGiven,
      submissionDurationSec: d.submissionDurationSec,
      srcParam,
      locale: d.locale,
      partnerId: partner?.id,
      // Attribution (PACK-04) : publicité, campagne et référence d'offre.
      utmSource: att?.utm_source,
      utmMedium: att?.utm_medium,
      utmCampaign: att?.utm_campaign,
      utmContent: att?.utm_content,
      fbclid: att?.fbclid,
      offerRef: [att?.ref, d.offerRef, d.srcParam].find(looksLikeOfferRef)?.trim().toUpperCase(),
      landingPage: att?.landingPage,
      firstVisitAt: att?.firstVisitAt && !Number.isNaN(Date.parse(att.firstVisitAt)) ? new Date(att.firstVisitAt) : undefined,
      marketingConsent: d.marketingConsent === true,
      // Recommandations (PACK-02) : références et rôles seulement ([] pour Langue / Licence).
      recommendations: matching.stored.map(({ ref, role }) => ({ ref, role })),
      matchingVersion: MOTEUR_VERSION,
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

  // API Conversions Meta : seulement avec consentement marketing. Attendu (avec délai
  // max) pour ne pas être coupé par la fin de la fonction serverless ; ne lève jamais.
  if (d.marketingConsent === true && isMetaCapiConfigured()) {
    await sendMetaLeadEvent({
      eventId: candidate.code,
      email: candidate.email,
      phone: candidate.whatsapp,
      fbp: d.fbp || req.cookies.get("_fbp")?.value,
      fbc: d.fbc || req.cookies.get("_fbc")?.value,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
      sourceUrl: d.pageUrl,
      contentCategory: candidate.targetLevel,
    });
  }

  return NextResponse.json({
    ok: true,
    code: candidate.code,
    recommendations: { cycle: matching.cycle, offers: matching.offers },
  });
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
    include: {
      partner: { select: { fullName: true, referralCode: true } },
      // Messages de l'espace étudiant non lus par l'équipe (pastille dans la liste).
      _count: {
        select: {
          portalMessages: { where: { authorType: { not: "TEAM" }, readByTeamAt: null } },
          checklistItems: { where: { status: "recu", removedAt: null } },
        },
      },
    },
  });

  return NextResponse.json({ candidates });
}
