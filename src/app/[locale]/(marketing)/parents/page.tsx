import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BadgeCheck, Building2, FileCheck2, Landmark, MessageCircle, ReceiptText, ShieldCheck, Smartphone, Wallet } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Rich } from "@/components/programs/program-sections";
import { PaymentTimeline, type TimelineProgram } from "@/components/parents/payment-timeline";
import { ProofDocuments } from "@/components/trust/proof-documents";
import { getProofDocuments } from "@/lib/content/trust";
import { getFaq } from "@/lib/content/faq";
import { getPaymentMethods, getPaymentRules } from "@/lib/content/payment-methods";
import { PROGRAMS, formatFcfa, paidAfterAdmission } from "@/lib/programs";
import { publicPageMetadata, toLocale } from "@/lib/seo";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return publicPageMetadata("parents", params.locale);
}

const red = (chunks: ReactNode) => <b className="font-bold text-rouge-fonce">{chunks}</b>;
const bold = (chunks: ReactNode) => <b className="font-bold">{chunks}</b>;

/**
 * Page Parents (PACK-07). Montants, étapes et pourcentages lus dans src/lib/programs.ts
 * (même source que les pages cursus et les brochures) ; engagement repris des textes cursus.
 */
export default async function ParentsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const locale = toLocale(params.locale);
  const t = await getTranslations("parents");
  const tSch = await getTranslations("programs.scholarships");
  const tRefund = await getTranslations("programs.refund");
  const waNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  const wa = (text: string) => `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;

  const programs: TimelineProgram[] = PROGRAMS.map((p) => {
    const { total, pct } = paidAfterAdmission(p);
    const degree = p.kind === "degree";
    return {
      slug: p.slug,
      name: p.short[locale],
      total: formatFcfa(total, locale),
      pct,
      steps: p.payments.map((s) => ({
        label: s.label[locale],
        // L'astérisque renvoie au tableau « Et si… » de la page cursus (lien sous la frise).
        when: s.when[locale].replace(/\*$/, ""),
        amount: formatFcfa(s.amount, locale),
        refundable: Boolean(s.refundable),
        after: Boolean(s.afterAdmission),
      })),
      guaranteeTitle: degree ? t("guarantee.titleDegree") : t("guarantee.titleLanguage"),
      guarantee: degree ? (
        <p>{tSch.rich(p.refund === "visa" ? "commitmentDeposit" : "commitment", { r: red })}</p>
      ) : (
        <ul className="space-y-1.5">
          {(tRefund.raw("language") as string[]).map((rule) => (
            <li key={rule}>
              <Rich text={rule} />
            </li>
          ))}
        </ul>
      ),
    };
  });

  const methods = getPaymentMethods(locale);
  const rules = getPaymentRules(locale);
  const parentsFaq = getFaq(locale).find((c) => c.id === "parents");
  const verifyIcons = [Building2, FileCheck2, ReceiptText];

  return (
    <div className="relative">
      <section className="bg-noir text-white">
        <div className="wrap-site max-w-[820px] py-10 sm:py-14">
          <p className="text-[13px] font-bold uppercase tracking-wide text-rouge">{t("eyebrow")}</p>
          <h1 className="mt-2 text-[28px] font-extrabold leading-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-[15px] text-[#D4D4DA]">{t("intro")}</p>
        </div>
        <div className="h-[5px] bg-rouge" />
      </section>

      <div className="wrap-site max-w-[820px] space-y-10 py-10">
        <PaymentTimeline programs={programs} defaultSlug="master" />

        <section aria-labelledby="payer-title">
          <h2 id="payer-title" className="text-2xl font-extrabold">
            {t("methods.title")}
          </h2>
          {methods.length > 0 ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {methods.map((m) => {
                const Icon = m.type === "mobile" ? Smartphone : m.type === "banque" ? Landmark : Wallet;
                return (
                  <li key={m.id} className="flex items-center gap-3 rounded-[10px] border-[1.5px] border-bord bg-white p-3.5">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-fond">
                      <Icon className="h-5 w-5 text-rouge" />
                    </span>
                    <span className="min-w-0">
                      <b className="block text-[15px]">{m.label}</b>
                      {m.countries.length > 0 && (
                        <span className="text-[13px] text-gris">{t("methods.countries", { list: m.countries.join(", ") })}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-[15px]">{t("methods.empty")}</p>
          )}
          <ul className="mt-3 space-y-1.5 text-[15px]">
            {[...rules, t("methods.private")].map((rule) => (
              <li key={rule} className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-rouge" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="verifier-title">
          <h2 id="verifier-title" className="text-2xl font-extrabold">
            {t("verify.title")}
          </h2>
          <ul className="mt-3 space-y-2.5">
            {(t.raw("verify.items") as string[]).map((item, i) => {
              const Icon = verifyIcons[i] ?? BadgeCheck;
              return (
                <li key={item} className="flex gap-3 rounded-[10px] bg-fond p-3.5 text-[15px]">
                  <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-rouge" />
                  <span>
                    <Rich text={item} />
                  </span>
                </li>
              );
            })}
          </ul>
          {getProofDocuments().length > 0 && (
            <div className="mt-6">
              <ProofDocuments locale={locale} />
            </div>
          )}
        </section>

        <section aria-labelledby="suivi-title" className="rounded-brand border-[1.5px] border-bord bg-white p-5">
          <h2 id="suivi-title" className="text-xl font-extrabold">
            {t("follow.title")}
          </h2>
          <p className="mt-1.5 text-[15px] text-gris">{t("follow.text")}</p>
          <a
            href={wa(t("follow.waMessage"))}
            target="_blank"
            rel="noopener noreferrer"
            data-track-location="parents_suivi"
            className="btn-wa mt-4"
          >
            <MessageCircle className="h-4 w-4" /> {t("follow.button")}
          </a>
        </section>

        {parentsFaq && parentsFaq.questions.length > 0 && (
          <section aria-labelledby="faq-parents-title">
            <h2 id="faq-parents-title" className="text-2xl font-extrabold">
              {t("faq.title")}
            </h2>
            <div className="mt-3 divide-y divide-bord rounded-brand border-[1.5px] border-bord bg-white">
              {parentsFaq.questions.map((q) => (
                <details key={q.id} className="group px-4 py-3.5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-[15px] font-bold [&::-webkit-details-marker]:hidden">
                    {q.q}
                    <span className="mt-0.5 text-rouge transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-[15px] leading-relaxed text-gris">{q.r}</p>
                </details>
              ))}
            </div>
            <Link href="/faq" className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold hover:underline">
              {t("faq.more")} <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        )}

        <section className="rounded-brand bg-noir p-6 text-white">
          <h2 className="text-xl font-extrabold">{t("cta.title")}</h2>
          <p className="mt-1.5 text-[15px] text-[#D4D4DA]">{t.rich("cta.text", { b: bold })}</p>
          <a
            href={wa(t("cta.waMessage"))}
            target="_blank"
            rel="noopener noreferrer"
            data-track-location="parents_bas"
            className="btn-wa mt-4"
          >
            <MessageCircle className="h-4 w-4" /> {t("cta.button")}
          </a>
        </section>
      </div>
    </div>
  );
}
