import { getTranslations } from "next-intl/server";
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, FileText, Receipt, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { formatFcfa, type Locale } from "@/lib/programs";
import type { NextAction, ScheduleLine } from "@/lib/portal/next-action";
import { Zh } from "@/components/ui/zh";

/** « Votre prochaine action » : une seule chose à faire, avec un bouton. */
export async function NextActionCard({
  action,
  waitText,
  isParent,
  studentName,
}: {
  action: NextAction;
  /** Texte de l'étape en cours (suivi), affiché quand il n'y a rien à faire. */
  waitText?: string;
  isParent: boolean;
  studentName: string;
}) {
  const t = await getTranslations("portal.next");
  const urgent = action.key !== "wait";
  const values = { count: action.count ?? 0 };

  return (
    <section
      aria-labelledby="next-action-title"
      className={`rounded-brand p-5 ${urgent ? "bg-noir text-white" : "card"}`}
    >
      <p className={`flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide ${urgent ? "text-rouge" : "text-gris"}`}>
        <Sparkles className="h-3.5 w-3.5" /> {isParent ? t("parentLabel") : t("label")}
        <Zh className={urgent ? "text-[#9C9CA6]" : undefined}>待办</Zh>
      </p>
      <h2 id="next-action-title" className="mt-1.5 text-xl font-extrabold leading-snug">
        {t(`${action.key}.title`, values)}
      </h2>
      <p className={`mt-1 text-[15px] leading-relaxed ${urgent ? "text-[#D4D4DA]" : "text-gris"}`}>
        {action.key === "wait" && waitText ? waitText : t(`${action.key}.text`, values)}
      </p>
      {isParent && action.studentOnly && <p className="mt-2 text-[13px] font-semibold text-[#F5C26B]">{t("parentNote", { name: studentName })}</p>}
      <Link
        href={action.href}
        className={`mt-4 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-brand px-4 text-[15px] font-bold sm:w-auto ${
          urgent ? "bg-rouge text-white active:bg-rouge-fonce" : "border-[1.5px] border-bord bg-white text-noir"
        }`}
      >
        {t(`${action.key}.button`, values)} <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

/** « 3 sur 7 reçus » avec une barre de progression. */
export async function DocumentProgressCard({ total, received, validated }: { total: number; received: number; validated: number }) {
  const t = await getTranslations("portal.progress");
  const pct = total > 0 ? Math.round((received / total) * 100) : 0;
  return (
    <Link href="/espace/documents" className="card block p-4 hover:ring-1 hover:ring-noir">
      <p className="flex items-center gap-2 font-extrabold">
        <FileText className="h-5 w-5 text-rouge" /> {t("title")}
        <Zh>材料</Zh>
      </p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums">{t("received", { received, total })}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-fond" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={received}>
        <div className="h-full rounded-full bg-rouge transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[13px] text-gris">{t("validated", { count: validated })}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-[14px] font-bold">
        {t("open")} <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

/**
 * Échéancier : « Réglé » seulement pour ce que l'équipe a enregistré, le reste « À venir ».
 * Rappel anti-arnaque (content/paiement.json).
 */
export async function PaymentsCard({
  locale,
  programName,
  lines,
  total,
  paid,
  rest,
  paidOn,
  rules,
  children,
}: {
  locale: Locale;
  programName: string;
  lines: ScheduleLine[];
  total: number;
  paid: number;
  rest: number;
  paidOn: string | null;
  rules: string[];
  /** Déclaration « J'ai payé » et historique (composant client). */
  children?: React.ReactNode;
}) {
  const t = await getTranslations("portal.payments");
  const fcfa = (n: number) => formatFcfa(n, locale);

  return (
    <section aria-labelledby="payments-title" className="card p-5">
      <h2 id="payments-title" className="flex items-center gap-2 text-lg font-extrabold">
        <Receipt className="h-5 w-5 text-rouge" /> {t("title")}
        <Zh>缴费</Zh>
      </h2>
      <p className="mt-1 text-[14px] text-gris">{t("program", { program: programName, amount: fcfa(total) })}</p>
      {paidOn && <p className="mt-1 text-[14px] font-semibold text-ok">{t("paidOn", { date: paidOn })}</p>}

      <ol className="mt-4 divide-y divide-bord border-y border-bord">
        {lines.map((l, i) => (
          <li key={`${l.label}-${i}`} className="flex items-start justify-between gap-3 py-3">
            <span className="flex items-start gap-2.5">
              {l.status === "paid" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-ok" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 flex-shrink-0 text-bord" />
              )}
              <span>
                <b className="block text-[15px]">{l.label}</b>
                <span className="text-[13px] text-gris">{l.when}</span>
              </span>
            </span>
            <span className="flex-shrink-0 text-right">
              <b className="block whitespace-nowrap tabular-nums">{fcfa(l.amount)} FCFA</b>
              <span className={`text-[12px] font-bold ${l.status === "paid" ? "text-ok" : "text-gris"}`}>
                {l.status === "paid" ? t("paid") : t("upcoming")}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[14px]">
        <span className="font-semibold">{t("totalPaid", { amount: fcfa(paid) })}</span>
        <span className="font-extrabold">{t("rest", { amount: fcfa(rest) })}</span>
      </div>
      <p className="mt-2 text-[13px] text-gris">{t("note")}</p>
      {children}

      {rules.length > 0 && (
        <div className="mt-4 rounded-brand border border-[#F5C26B]/60 bg-[#FFF8E8] p-3.5">
          <p className="flex items-center gap-2 text-[14px] font-extrabold text-[#8A5A00]">
            <AlertTriangle className="h-4 w-4" /> {t("alertTitle")}
          </p>
          <ul className="mt-1.5 space-y-1 text-[13px] leading-relaxed text-[#6B4A00]">
            {rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
