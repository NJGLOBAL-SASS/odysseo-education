import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ArrowRight, Check, FileText, MessageCircle } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal/session";
import { firstNameOf, normalizeHistory } from "@/lib/tracking-stages";
import { getOffer } from "@/lib/matching/catalogue";
import { toPublicRecommendation } from "@/lib/matching/public-offer";
import type { StoredRecommendation } from "@/lib/matching/types";
import { StageTimeline } from "@/components/portal/stage-timeline";
import { ReportOfferCard } from "@/components/portal/report-offer-card";
import { toPortalReport } from "@/lib/admission/server";
import { ClipboardCheck } from "lucide-react";

export const dynamic = "force-dynamic";

/** Accueil de l'espace : étape du dossier, prochaine action, note du conseiller, offres recommandées. */
export default async function PortalHomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const session = await getPortalSession();
  if (!session) redirect(`/${params.locale}/espace/connexion`);
  const t = await getTranslations("portal.home");
  const c = await prisma.candidate.findUniqueOrThrow({
    where: { id: session.candidateId },
    select: { code: true, fullName: true, stage: true, stageUpdatedAt: true, createdAt: true, stageHistory: true, publicNote: true, recommendations: true },
  });
  const locale = params.locale === "en" ? "en" : "fr";
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const studentFirst = firstNameOf(c.fullName);

  // Offres recommandées (PACK-02) : champs publics seulement, jamais l'université réelle.
  const report = toPortalReport(await prisma.admissionReport.findUnique({ where: { candidateId: session.candidateId } }), locale);
  const tReport = await getTranslations("portal.report");
  const offers = ((Array.isArray(c.recommendations) ? c.recommendations : []) as unknown as StoredRecommendation[])
    .map((r) => {
      const o = getOffer(r.ref);
      return o ? toPublicRecommendation(o, { ref: r.ref, role: r.role, ville: o.ville, total: 0, filieres_correspondantes: [] }, locale) : null;
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h1 className="text-2xl font-extrabold">
          {session.role === "PARENT" ? t("parentOf", { name: studentFirst }) : t("hello", { name: studentFirst })}
        </h1>
        <p className="mt-1 text-[14px] text-gris">{t("code", { code: c.code })}</p>
        <p className="text-[13px] text-gris">{t("updated", { date: dateFmt.format(c.stageUpdatedAt ?? c.createdAt) })}</p>
      </div>

      {report && (
        <Link
          href="/espace/rapport"
          className={`flex items-start gap-3 rounded-brand p-5 ${report.validatedCurrent || report.paymentReceived ? "card hover:ring-1 hover:ring-noir" : "bg-rouge text-white"}`}
        >
          <ClipboardCheck className="mt-0.5 h-6 w-6 flex-shrink-0" />
          <span className="flex-1">
            <b className="block text-[17px]">{tReport("homeCard")}</b>
            <span className="text-[14px] opacity-90">
              {report.validatedCurrent || report.paymentReceived ? tReport("homeCardValidated") : tReport("homeCardText")}
            </span>
          </span>
          <ArrowRight className="mt-1 h-5 w-5" />
        </Link>
      )}

      <StageTimeline stage={c.stage} history={normalizeHistory(c.stageHistory, c.createdAt)} locale={locale} />

      {c.publicNote && (
        <div className="card p-5">
          <p className="text-[13px] font-bold uppercase tracking-wide text-gris">{t("note")}</p>
          <p className="mt-1 whitespace-pre-line text-[15px]">{c.publicNote}</p>
        </div>
      )}

      {report && report.offers.length > 0 && (
        <section aria-labelledby="offers-title" className="space-y-2">
          <h2 id="offers-title" className="px-1 text-lg font-extrabold">
            {tReport("offersTitle")}
          </h2>
          <ul className="space-y-2">
            {report.offers.map((o) => (
              <li key={o.ref}>
                <ReportOfferCard offer={o} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!report && offers.length > 0 && (
        <section aria-labelledby="offers-title" className="space-y-2">
          <div className="px-1">
            <h2 id="offers-title" className="text-lg font-extrabold">
              {t("offers")}
            </h2>
            <p className="text-[13px] text-gris">{t("offersNote")}</p>
          </div>
          <ul className="space-y-2">
            {offers.map((o) => (
              <li key={o.ref} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-fond px-2.5 py-1 text-[12px] font-bold">{t(`roles.${o.role}`)}</span>
                  <span className="text-[12px] font-semibold text-gris">{o.ref}</span>
                </div>
                <p className="mt-2 font-extrabold">{t("university", { place: o.lieu_affiche })}</p>
                <ul className="mt-1.5 space-y-1 text-[14px]">
                  {o.arguments.map((a) => (
                    <li key={a} className="flex gap-2">
                      <Check className="mt-[3px] h-4 w-4 flex-shrink-0 text-ok" strokeWidth={3} />
                      {a}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/espace/messages" className="card flex items-start gap-3 p-4 hover:ring-1 hover:ring-noir">
          <MessageCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rouge" />
          <span className="flex-1">
            <b className="block">{t("contactTitle")}</b>
            <span className="text-[14px] text-gris">{t("contactText")}</span>
          </span>
          <ArrowRight className="mt-1 h-4 w-4" />
        </Link>
        <Link href="/espace/documents" className="card flex items-start gap-3 p-4 hover:ring-1 hover:ring-noir">
          <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-rouge" />
          <span className="flex-1">
            <b className="block">{t("documentsTitle")}</b>
            <span className="text-[14px] text-gris">{t("documentsText")}</span>
          </span>
          <ArrowRight className="mt-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
