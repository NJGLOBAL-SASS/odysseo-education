import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Check, Plane, Car, Landmark, BedDouble, ArrowRight } from "lucide-react";

import { formatFcfa, ENGLISH_TEST_OPTION_PRICE, type Locale, type Program } from "@/lib/programs";
import { cn } from "@/lib/utils";

/**
 * Sections des pages cursus, au style des grilles tarifaires officielles
 * (noir / rouge / gris). Réutilisées telles quelles par la mise en page A4
 * qui génère les brochures PDF (variante `print`).
 */

const CONTACT_EMAIL = "contact.odysseo@gmail.com";

/** Rendu des textes de données contenant <b>…</b> (contenu interne, pas de saisie utilisateur). */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(<b>[\s\S]*?<\/b>)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("<b>") ? (
          <b key={i} className="font-bold text-texte">
            {p.slice(3, -4)}
          </b>
        ) : (
          p
        )
      )}
    </>
  );
}

const b = (chunks: ReactNode) => <b className="font-bold">{chunks}</b>;
const r = (chunks: ReactNode) => <b className="font-bold text-rouge">{chunks}</b>;

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-1 text-[13px] font-extrabold uppercase tracking-[0.04em] text-rouge">{children}</p>;
}

function SectionTitle({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <div className="mb-5">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-[30px]">{title}</h2>
      {intro && <p className="mt-1.5 max-w-3xl text-[15px] text-gris">{intro}</p>}
    </div>
  );
}

function Callout({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-r-[6px] border-l-[5px] border-rouge px-5 py-4 text-[15px] leading-relaxed",
        dark ? "bg-noir text-white" : "bg-[#F2F2F4]",
        className
      )}
    >
      {children}
    </div>
  );
}

function HeadCard({
  title,
  children,
  tone,
}: {
  title: string;
  children: ReactNode;
  tone: "red" | "black";
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[4px]">
      <div className={cn("px-5 py-3 text-[15px] font-bold uppercase text-white", tone === "red" ? "bg-rouge" : "bg-noir")}>
        {title}
      </div>
      <div className="flex-1 bg-[#F2F2F4] px-5 py-4 text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}

function CheckList({ items, highlightFrom, light }: { items: string[]; highlightFrom?: number; light?: boolean }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={item} className="flex gap-2 text-[15px] leading-snug">
          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-rouge" strokeWidth={3} />
          <span className={cn(highlightFrom !== undefined && i >= highlightFrom && "font-bold", light && "text-white")}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ sections */

export async function SupportSection({ program, locale }: { program: Program; locale: Locale }) {
  const t = await getTranslations("programs.support");
  return (
    <section>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />
      <div className="grid overflow-hidden rounded-[4px] md:grid-cols-2 print:grid-cols-2">
        <div className="bg-[#F2F2F4] p-5">
          <h3 className="mb-3 text-lg font-bold">{t("provide")}</h3>
          <CheckList items={program.provide[locale]} />
          {program.provideNote && <p className="mt-3 font-bold text-gris">{program.provideNote[locale]}</p>}
        </div>
        <div className="bg-noir p-5 text-white">
          <h3 className="mb-3 text-lg font-bold">{t("handle")}</h3>
          <CheckList items={program.handle[locale]} highlightFrom={program.handleHighlightFrom} light />
        </div>
      </div>
      <Callout className="mt-4">
        <Rich text={program.goal[locale]} />
      </Callout>
    </section>
  );
}

export async function ScholarshipsSection({ program, locale }: { program: Program; locale: Locale }) {
  const t = await getTranslations("programs.scholarships");
  const rows = t.raw("rows") as [string, string, string][];
  return (
    <section>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />
      <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
        <HeadCard title={t("fullTitle")} tone="red">
          {t("fullText")}
        </HeadCard>
        <HeadCard title={t("partialTitle")} tone="black">
          {t("partialText")}
        </HeadCard>
      </div>

      <h3 className="mb-2.5 mt-6 text-lg font-bold">{t("profileTitle")}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-[15px]">
          <thead>
            <tr className="bg-rouge text-white">
              <th className="px-4 py-3 font-bold uppercase">{t("colProfile")}</th>
              <th className="px-4 py-3 font-bold uppercase">{t("colStrategy")}</th>
              <th className="px-4 py-3 font-bold uppercase">{t("colTarget")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([profile, strategy, target], i) => (
              <tr key={profile} className={cn("border-b border-[#E3E3E8]", i % 2 === 1 && "bg-[#F7F7F8]")}>
                <td className="px-4 py-3 font-bold">{profile}</td>
                <td className="px-4 py-3">{strategy}</td>
                <td className="bg-[#FFEDED] px-4 py-3 font-bold">
                  {i === 0 && program.excellentTarget ? program.excellentTarget[locale] : target}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Callout dark className="mt-4">
        <p className="mb-1 text-lg font-bold">{t("commitmentTitle")}</p>
        <p>{t.rich("commitment", { r })}</p>
      </Callout>
    </section>
  );
}

export async function LanguageProgramsSection() {
  const t = await getTranslations("programs.languagePrograms");
  const offers = t.raw("offers") as [string, string, string][];
  return (
    <section>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
        <HeadCard title={t("reducedTitle")} tone="red">
          {t("reducedText")}
        </HeadCard>
        <HeadCard title={t("freeTitle")} tone="black">
          {t("freeText")}
        </HeadCard>
      </div>
      <h3 className="mb-2.5 mt-6 text-lg font-bold">{t("offersTitle")}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-left text-[15px]">
          <thead>
            <tr className="bg-noir text-white">
              <th className="px-4 py-3 font-bold uppercase">{t("colUniversity")}</th>
              <th className="px-4 py-3 font-bold uppercase">{t("colOffer")}</th>
            </tr>
          </thead>
          <tbody>
            {offers.map(([uni, region, offer], i) => (
              <tr key={uni} className={cn("border-b border-[#E3E3E8]", i % 2 === 1 && "bg-[#F7F7F8]")}>
                <td className="px-4 py-3">
                  <b>{uni}</b> {region}
                </td>
                <td className="px-4 py-3">{offer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-gris">{t("note")}</p>
      <Callout dark className="mt-4">
        <p className="mb-1 text-lg font-bold">{t("licenceTitle")}</p>
        <p>{t.rich("licenceText", { b })}</p>
      </Callout>
    </section>
  );
}

export async function CalendarSection() {
  const t = await getTranslations("programs.calendar");
  return (
    <section>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
        <HeadCard title={t("marchTitle")} tone="red">
          {t.rich("march", { b })}
        </HeadCard>
        <HeadCard title={t("septemberTitle")} tone="black">
          {t.rich("september", { b })}
        </HeadCard>
      </div>
    </section>
  );
}

/** Frise mars → octobre : session de langue (Bachelor, Master) ou étude du dossier et entretiens (PhD). */
export async function TimelineSection({ program, locale }: { program: Program; locale: Locale }) {
  if (!program.timeline) return null;
  const t = await getTranslations("programs.timeline");
  const months = t.raw("months") as string[];
  const language = program.timeline.kind === "languageSession";
  return (
    <section>
      <h3 className="mb-1.5 text-xl font-bold">{language ? t("languageTitle") : t("interviewsTitle")}</h3>
      <p className="mb-5 text-[15px] leading-relaxed">{program.timeline.text[locale]}</p>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[560px]">
          <div className="flex gap-2">
            <div
              className={cn(
                "flex-[6] rounded-[5px] px-3 py-2 text-center text-sm font-bold text-white",
                language ? "bg-rouge" : "bg-noir"
              )}
            >
              {language ? t("languageBar") : t("interviewsBar")}
            </div>
            <div className="flex-[1.4] rounded-[5px] bg-noir px-3 py-2 text-center text-sm font-bold text-white">
              {language ? t("degreeBar") : t("startBar")}
            </div>
          </div>
          <div className="relative mt-2 flex justify-between">
            <span className="absolute inset-x-0 top-[5px] h-[3px] rounded-full bg-[#E3E3E8]" />
            {months.map((m, i) => (
              <span key={m} className="relative flex flex-col items-center">
                <span className={cn("h-[13px] w-[13px] rounded-full border-2 border-white", i === 0 || i === 6 ? "bg-rouge" : "bg-gris")} />
                <span className={cn("mt-1 text-sm", i === 0 || i === 6 ? "font-bold" : "text-gris")}>{m}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      {language && (
        <Callout className="mt-4">
          <p>{t.rich("languageNote", { b })}</p>
        </Callout>
      )}
    </section>
  );
}

/** Exemple chiffré de bourse partielle en Bachelor (Jiangsu University of Science and Technology). */
export async function BachelorExampleSection() {
  const t = await getTranslations("programs.example");
  const waves = [
    { n: 1, amount: 800_000, cls: "bg-rouge text-white", h: "h-[140px] print:h-[120px]" },
    { n: 2, amount: 600_000, cls: "bg-rouge-fonce text-white", h: "h-[105px] print:h-[92px]" },
    { n: 3, amount: 400_000, cls: "bg-noir text-white", h: "h-[70px] print:h-[64px]" },
    { n: 4, amount: 200_000, cls: "bg-gris text-white", h: "h-[35px] print:h-[40px]" },
  ];
  return (
    <section>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <Callout>{t.rich("university", { b })}</Callout>

      <p className="mb-2 mt-6 text-sm font-extrabold uppercase">{t("costTitle")}</p>
      <div className="space-y-2.5">
        <div className="grid grid-cols-[minmax(0,150px)_1fr_auto] items-center gap-3 text-[15px] sm:grid-cols-[200px_1fr_110px]">
          <span>{t("withoutScholarship")}</span>
          <span className="h-5 rounded-sm bg-[#E3E3E8]" />
          <b className="text-right">{formatFcfa(1_400_000)}</b>
        </div>
        <div className="grid grid-cols-[minmax(0,150px)_1fr_auto] items-center gap-3 text-[15px] sm:grid-cols-[200px_1fr_110px]">
          <span>{t("partial")}</span>
          <span className="flex h-5 overflow-hidden rounded-sm">
            <span className="w-1/2 bg-rouge" />
            <span className="flex w-1/2 items-center justify-center bg-[#FFD9D9] text-[11px] font-bold text-rouge-fonce sm:text-xs">
              {t("offered")}
            </span>
          </span>
          <span className="text-right">
            <b className="text-rouge">{formatFcfa(700_000)}</b>
            <span className="block text-xs text-gris">{t("perYear")}</span>
          </span>
        </div>
      </div>

      <p className="mb-3 mt-7 text-sm font-extrabold uppercase">{t("bonusTitle")}</p>
      <div className="flex flex-col gap-5 md:flex-row md:items-end print:flex-row print:items-end">
        <div className="grid flex-1 grid-cols-4 items-end gap-2 sm:gap-4">
          {waves.map((w) => (
            <div key={w.n} className="flex flex-col">
              <div className={cn("flex flex-col justify-start rounded-t-[3px] px-1.5 py-2 text-center", w.cls, w.h)}>
                <span className="text-sm font-extrabold tabular-nums sm:text-lg">{formatFcfa(w.amount)}</span>
                <span className="text-[11px] sm:text-sm">FCFA</span>
              </div>
              <span className="mt-1.5 text-center text-xs font-bold sm:text-sm">{t("wave", { n: w.n })}</span>
            </div>
          ))}
        </div>
        <div className="rounded-[8px] bg-noir p-4 text-[15px] leading-snug text-white md:w-[230px] print:w-[230px]">{t.rich("callout", { b, r })}</div>
      </div>

      <Callout className="mt-5">{t.rich("more", { b })}</Callout>
      <p className="mt-2 text-sm text-gris">{t("disclaimer")}</p>
    </section>
  );
}

/** Parcours en 4 étapes (Master, PhD). */
export async function JourneySection({ program, locale }: { program: Program; locale: Locale }) {
  if (!program.journey) return null;
  const t = await getTranslations("programs.journey");
  const colors = ["bg-rouge", "bg-rouge-fonce", "bg-noir", "bg-gris"];
  return (
    <section>
      <SectionTitle
        eyebrow={t("eyebrow")}
        title={t("title", { name: program.slug === "doctorat" ? (locale === "fr" ? "Doctorat" : "PhD") : "Master" })}
        intro={program.journey.intro[locale]}
      />
      <ol className="space-y-3">
        {program.journey.steps.map((s, i) => (
          <li key={i} className="flex items-stretch gap-3">
            <span className={cn("flex w-14 flex-shrink-0 items-center justify-center text-2xl font-extrabold text-white", colors[i])}>
              {i + 1}
            </span>
            <span className="flex-1 bg-[#F2F2F4] px-4 py-2.5">
              <b className="block text-[16px]">{s.title[locale]}</b>
              <span className="text-[15px] text-gris">{s.text[locale]}</span>
            </span>
          </li>
        ))}
      </ol>
      <Callout className="mt-4">{t.rich("role", { b })}</Callout>
    </section>
  );
}

export async function ArrivalSection() {
  const t = await getTranslations("programs.arrival");
  const steps = t.raw("steps") as [string, string][];
  const icons = [Plane, Car, Landmark, BedDouble];
  return (
    <section>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <div className="grid grid-cols-2 gap-3 md:flex md:items-center md:gap-2 print:flex print:items-center print:gap-2">
        {steps.map(([title, sub], i) => {
          const Icon = icons[i]!;
          const dark = i % 2 === 1;
          return (
            <div key={title} className="contents md:flex md:flex-1 md:items-center md:gap-2 print:flex print:flex-1 print:items-center print:gap-2">
              <div
                className={cn(
                  "flex flex-1 flex-col items-center justify-center rounded-[10px] px-3 py-5 text-center",
                  dark ? "bg-noir text-white" : "bg-[#F2F2F4]"
                )}
              >
                <Icon className={cn("mb-2 h-9 w-9", dark ? "text-rouge" : "text-noir")} strokeWidth={2.2} />
                <b className="text-[16px]">{title}</b>
                <span className={cn("text-sm", dark ? "text-[#C9C9D1]" : "text-gris")}>{sub}</span>
              </div>
              {i < steps.length - 1 && <ArrowRight className="hidden h-6 w-6 flex-shrink-0 text-rouge md:block print:block" strokeWidth={3} />}
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 print:grid-cols-2">
        <HeadCard title={t("pickupTitle")} tone="red">
          {t("pickupText")}
        </HeadCard>
        <HeadCard title={t("roomTitle")} tone="black">
          {t.rich("roomText", { b })}
        </HeadCard>
      </div>
    </section>
  );
}

export async function TicketSection() {
  const t = await getTranslations("programs.ticket");
  const steps = t.raw("steps") as string[];
  return (
    <section>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
      <div className="overflow-x-auto pb-1">
        <div className="relative min-w-[560px] px-2 pt-7">
          <p className="absolute left-[25%] right-[25%] top-0 rounded-t-[10px] bg-[#FFEDED] py-1 text-center text-sm font-extrabold uppercase text-rouge-fonce">
            {t("window")}
          </p>
          <div className="relative flex justify-between">
            <span className="absolute left-[10%] right-[10%] top-[18px] h-[3px] bg-[#E3E3E8]" />
            <span className="absolute left-[30%] right-[30%] top-[18px] h-[3px] bg-rouge" />
            {steps.map((s, i) => {
              const red = i === 2 || i === 3;
              return (
                <div key={s} className="relative z-10 flex w-1/5 flex-col items-center text-center">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white",
                      red ? "bg-rouge" : "bg-noir"
                    )}
                  >
                    {i === 2 ? <Plane className="h-5 w-5" /> : i === 3 ? <Car className="h-5 w-5" /> : i + 1}
                  </span>
                  <span className={cn("mt-2 text-sm font-bold leading-tight", red && "text-rouge")}>{s}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Callout className="mt-5 space-y-1">
        <p>{t.rich("when", { b })}</p>
        <p>{t.rich("arrive", { b })}</p>
        <p>{t.rich("send", { b })}</p>
      </Callout>
    </section>
  );
}

export async function PriceSection({ program, locale }: { program: Program; locale: Locale }) {
  const t = await getTranslations("programs.pricing");
  return (
    <section>
      <SectionTitle eyebrow={t("eyebrow")} title={t("title", { name: program.name[locale] })} />
      <Eyebrow>{program.name[locale]}</Eyebrow>
      <div className="mb-3 border-b-[4px] border-rouge bg-noir px-5 py-5 text-white">
        <span className="text-[38px] font-extrabold leading-none tracking-tight sm:text-[46px]">{formatFcfa(program.price)}</span>{" "}
        <span className="text-[17px] font-bold">{t("allInclusive")}</span>
      </div>
      <p className="mb-3 text-[15px] leading-relaxed">{program.priceText[locale]}</p>
      <div className="rounded-r-[6px] border-l-[5px] border-rouge bg-[#FFEDED] px-5 py-4 text-[15px]">{t.rich("included", { b })}</div>
      {program.englishTestOption && (
        <div className="mt-3 flex flex-col gap-3 bg-[#FFEDED] px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <b className="block text-[15px]">{t("optionTitle")}</b>
            <span className="text-[15px] text-gris">{t("optionText")}</span>
          </div>
          <div className="text-center sm:w-32 sm:border-l sm:border-rouge">
            <b className="block text-2xl text-rouge">{formatFcfa(ENGLISH_TEST_OPTION_PRICE)}</b>
            <span className="text-sm">FCFA</span>
          </div>
        </div>
      )}
    </section>
  );
}

export async function PaymentSection({ program, locale }: { program: Program; locale: Locale }) {
  const tp = await getTranslations("programs.payment");
  const total = program.payments.reduce((s, p) => s + p.amount, 0);
  return (
    <section>
      <div>
        <SectionTitle
          eyebrow={tp("eyebrow", { count: program.payments.length })}
          title={program.kind === "language" ? tp("titleLanguage") : tp("titleDegree")}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[15px]">
            <thead>
              <tr className="bg-noir text-white">
                <th className="px-4 py-3 text-left font-bold uppercase">{tp("colStep")}</th>
                <th className="px-4 py-3 text-right font-bold uppercase">{tp("colAmount")}</th>
              </tr>
            </thead>
            <tbody>
              {program.payments.map((p, i) => (
                <tr key={i} className={cn("border-b border-[#E3E3E8]", i % 2 === 1 && "bg-[#F7F7F8]")}>
                  <td className="px-4 py-3">
                    <b className="block">
                      {i + 1}. {p.label[locale]}
                    </b>
                    <span className={cn("text-sm", p.refundable ? "text-rouge-fonce" : "text-gris")}>{p.when[locale]}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold tabular-nums">{formatFcfa(p.amount)}</td>
                </tr>
              ))}
              <tr className="bg-rouge text-white">
                <td className="px-4 py-3 font-extrabold uppercase">{tp("total")}</td>
                <td className="px-4 py-3 text-right text-xl font-extrabold tabular-nums">{formatFcfa(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {program.paymentNote && <p className="mt-2 text-sm text-gris">{program.paymentNote[locale]}</p>}
      </div>
    </section>
  );
}

export async function RefundSection({ program }: { program: Program }) {
  const t = await getTranslations("programs.refund");
  const degree = program.refund === "degree";
  const rules = t.raw(degree ? "degree" : "language") as string[];
  const notIf = t.raw(degree ? "notIfDegree" : "notIfLanguage") as string[];
  return (
    <section>
      <h3 className="mb-2 text-xl font-bold">{t("title")}</h3>
      <ul className="space-y-1.5">
        {rules.map((rule) => (
          <li key={rule} className="flex gap-2 text-[15px]">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-ok" strokeWidth={3} />
            <span>
              <Rich text={rule} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mb-1 mt-3 text-[15px] font-bold">{t("notIf")}</p>
      <ul className="space-y-1 pl-5 text-[15px]">
        {notIf.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <p className="mt-2 text-[15px] text-gris">{degree ? t("afterDegree") : t("afterLanguage")}</p>
    </section>
  );
}

export async function NotIncludedSection({ program }: { program: Program }) {
  const tn = await getTranslations("programs.notIncluded");
  const items = [...(tn.raw(program.kind === "language" ? "language" : "degree") as string[])];
  if (program.languageSessionNotIncluded) items.push(tn("languageSession"));
  return (
    <section>
      <h3 className="mb-2 text-xl font-bold">{tn("title")}</h3>
      <ul className="grid gap-x-8 gap-y-2 bg-[#F2F2F4] px-6 py-4 text-[15px] sm:grid-cols-2 print:grid-cols-2">
        {items.map((n) => (
          <li key={n}>
            <Rich text={n} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function VisaSection() {
  const tv = await getTranslations("programs.visa");
  return (
    <section>
      <h3 className="mb-1.5 text-xl font-bold">{tv("title")}</h3>
      <p className="text-[15px] leading-relaxed">{tv("text")}</p>
    </section>
  );
}

export async function ClosingCta({
  program,
  locale,
  actions,
}: {
  program: Program;
  locale: Locale;
  actions?: ReactNode;
}) {
  const t = await getTranslations("programs");
  return (
    <section>
      <Callout dark>
        <p className="mb-1 text-xl font-bold">{t("cta.title")}</p>
        <p className="text-[#E5E5EA]">{t("cta.text", { answer: program.ctaAnswer[locale] })}</p>
        <p className="mt-1 font-bold text-rouge">{t("cta.contact", { email: CONTACT_EMAIL })}</p>
        {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
      </Callout>
      <p className="mt-3 text-sm text-gris">{t("disclaimer")}</p>
    </section>
  );
}

/** Bandeau haut des pages 2 et suivantes de la brochure (comme les PDF d'origine). */
async function PrintPageHeader({ program, locale }: { program: Program; locale: Locale }) {
  const t = await getTranslations("programs.brochure");
  return (
    <div className="brochure-bleed mb-7 border-b-[4px] border-rouge bg-noir py-3.5 text-white">
      <div className="flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo/logo-full-white-tight.png" alt="Odysseo" className="h-[9mm] w-auto" />
        <span className="text-[15px] font-bold">{t("header", { name: program.short[locale] })}</span>
      </div>
    </div>
  );
}

/**
 * Ordre des sections, identique aux brochures (la langue n'a pas de grille de bourses).
 * En impression, chaque groupe occupe une page A4 avec son bandeau.
 * Le CTA final (ClosingCta) est ajouté par la page : boutons différents en web et en PDF.
 */
export async function ProgramBody({
  program,
  locale,
  print,
  closing,
}: {
  program: Program;
  locale: Locale;
  print?: boolean;
  closing?: ReactNode;
}) {
  const degree = program.kind === "degree";
  const groups: ReactNode[][] = degree
    ? [
        [<SupportSection key="support" program={program} locale={locale} />],
        [<ScholarshipsSection key="sch" program={program} locale={locale} />, <CalendarSection key="cal" />],
        [
          <TimelineSection key="tl" program={program} locale={locale} />,
          program.example === "bachelorScholarship" ? (
            <BachelorExampleSection key="ex" />
          ) : (
            <JourneySection key="jr" program={program} locale={locale} />
          ),
        ],
        [<ArrivalSection key="arr" />, <TicketSection key="tk" />],
        [<PriceSection key="price" program={program} locale={locale} />, <PaymentSection key="pay" program={program} locale={locale} />],
        [<RefundSection key="ref" program={program} />, <NotIncludedSection key="ni" program={program} />, <VisaSection key="visa" />, closing],
      ]
    : [
        [<SupportSection key="support" program={program} locale={locale} />],
        [<LanguageProgramsSection key="lp" />],
        [<CalendarSection key="cal" />, <ArrivalSection key="arr" />],
        [<TicketSection key="tk" />, <PriceSection key="price" program={program} locale={locale} />],
        [<PaymentSection key="pay" program={program} locale={locale} />, <RefundSection key="ref" program={program} />, <NotIncludedSection key="ni" program={program} />],
        [<VisaSection key="visa" />, closing],
      ];

  if (!print) {
    return (
      <div className="space-y-14">
        {groups.flat().map((node, i) => (
          <div key={i}>{node}</div>
        ))}
      </div>
    );
  }

  return (
    <>
      {groups.map((nodes, i) => (
        // La première page porte la couverture : son contenu suit directement.
        <div key={i} className={cn("space-y-7", i > 0 && "break-before-page")}>
          {i > 0 && <PrintPageHeader program={program} locale={locale} />}
          {nodes}
        </div>
      ))}
    </>
  );
}
