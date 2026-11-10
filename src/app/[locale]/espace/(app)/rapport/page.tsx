import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { CheckCircle2, MessageCircle } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal/session";
import { firstNameOf } from "@/lib/tracking-stages";
import { formatFcfa } from "@/lib/programs";
import { SITE_URL } from "@/lib/seo";
import { toPortalReport } from "@/lib/admission/server";
import { ReportOfferCard } from "@/components/portal/report-offer-card";
import { ReportValidation } from "@/components/portal/report-validation";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getTranslations("portal.report"))("title") };
}

/** Rapport d'admissibilité (PACK-10) : offres proposées, tarif du cursus, validation par l'étudiant. */
export default async function PortalReportPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const session = await getPortalSession();
  if (!session) redirect(`/${params.locale}/espace/connexion`);
  const locale = params.locale === "en" ? "en" : "fr";
  const [row, candidate] = await Promise.all([
    prisma.admissionReport.findUnique({ where: { candidateId: session.candidateId } }),
    prisma.candidate.findUniqueOrThrow({ where: { id: session.candidateId }, select: { fullName: true, code: true } }),
  ]);
  const report = toPortalReport(row, locale);
  if (!report) redirect(`/${params.locale}/espace`);

  const t = await getTranslations("portal.report");
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const waNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(t("waMessage", { code: candidate.code }))}` : null;
  const anyHidden = report.offers.some((o) => !o.university);

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        <p className="mt-1 text-[15px]">{t("hello", { name: firstNameOf(candidate.fullName) })}</p>
      </div>

      {report.comment && (
        <div className="rounded-brand border-l-[4px] border-rouge bg-white p-5 shadow-card">
          <p className="text-[13px] font-bold uppercase tracking-wide text-gris">{t("advisor")}</p>
          <p className="mt-1 whitespace-pre-line text-[15px]">{report.comment}</p>
        </div>
      )}

      <section aria-labelledby="report-offers" className="space-y-2">
        <h2 id="report-offers" className="px-1 text-lg font-extrabold">
          {t("offersTitle")}
        </h2>
        <ul className="space-y-3">
          {report.offers.map((o) => (
            <li key={o.ref}>
              <ReportOfferCard offer={o} />
            </li>
          ))}
        </ul>
        {anyHidden && <p className="px-1 text-[13px] text-gris">{t("hiddenNote")}</p>}
        <p className="px-1 text-[12px] text-gris">{t("note")}</p>
      </section>

      {report.program && (
        <section className="card p-5" aria-labelledby="report-price">
          <h2 id="report-price" className="text-lg font-extrabold">
            {t("priceTitle", { program: report.program.name })}
          </h2>
          <p className="mt-1 text-[15px]">{t.rich("priceTotal", { amount: formatFcfa(report.program.price, locale), b: (c) => <b>{c}</b> })}</p>
          <ol className="mt-3 divide-y divide-bord rounded-[10px] border border-bord">
            {report.program.payments.map((p, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-3 py-2.5 text-[14px]">
                <span>{t("priceStep", { label: p.label, when: p.when })}</span>
                <b className="whitespace-nowrap tabular-nums">{formatFcfa(p.amount, locale)} FCFA</b>
              </li>
            ))}
          </ol>
          <a
            href={`${SITE_URL}/${locale}/cursus/${report.program.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[13px] font-semibold underline underline-offset-2"
          >
            {t("priceConditions")}
          </a>
        </section>
      )}

      {report.paymentReceived ? (
        <div className="card flex flex-col gap-3 p-5">
          <p className="flex items-start gap-2 text-[15px] font-semibold text-ok">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" /> {t("paid")}
          </p>
          <Link href="/espace/documents" className="btn-dark !min-h-[48px]">
            {t("openDocuments")}
          </Link>
        </div>
      ) : report.validatedCurrent ? (
        <div className="card p-5">
          <p className="flex items-start gap-2 text-[15px] font-semibold text-ok">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" /> {t("validated")}
          </p>
          {report.validatedAt && <p className="mt-1 text-[13px] text-gris">{t("validatedOn", { date: dateFmt.format(new Date(report.validatedAt)) })}</p>}
        </div>
      ) : session.role === "STUDENT" ? (
        <ReportValidation version={report.version} termsUrl={`${SITE_URL}/${locale}/conditions-generales`} />
      ) : (
        <p className="card p-5 text-[15px] text-gris">{t("parentOnly")}</p>
      )}

      {waHref && (
        <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-ghost !min-h-[48px]">
          <MessageCircle className="h-4 w-4" /> {t("question")}
        </a>
      )}
    </div>
  );
}
