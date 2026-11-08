"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Check, MessageCircle, Search } from "lucide-react";

import { Field, TextInput, CheckboxField } from "@/components/forms/intake/fields";
import { Spinner } from "@/components/ui/spinner";
import { STAGES, isParallelStage, normalizeCode, type StageHistoryEntry } from "@/lib/tracking-stages";
import { cn } from "@/lib/utils";

const REMEMBER_KEY = "odysseo_suivi_code";

type Dossier = {
  code: string;
  firstName: string;
  targetLevel: string;
  stage: string;
  stageUpdatedAt: string;
  publicNote: string | null;
  history: StageHistoryEntry[];
  recommendations: { ref: string; role: string }[];
};

/**
 * Suivi de dossier (PACK-08) : code + 4 derniers chiffres du WhatsApp, sans compte.
 * Rien n'est gardé sur l'appareil, sauf le code si « Se souvenir de ce code » est coché.
 */
export function TrackingLookup() {
  const t = useTranslations("suivi");
  const tLevel = useTranslations("intake.fields.level.options");
  const locale = useLocale();
  const [code, setCode] = useState("");
  const [phone4, setPhone4] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ code?: string; phone4?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("code");
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(REMEMBER_KEY);
    } catch {
      /* stockage indisponible */
    }
    if (fromUrl) setCode(normalizeCode(fromUrl));
    else if (saved) {
      setCode(saved);
      setRemember(true);
    }
  }, []);

  function levelLabel(level: string) {
    return ["language", "licence", "master", "doctorat"].includes(level) ? tLevel(level as "master") : level;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const c = normalizeCode(code);
    const next: typeof errors = {};
    if (!/^ODY-[A-Z0-9]{6}$/.test(c)) next.code = t("errors.code");
    if (!/^\d{4}$/.test(phone4)) next.phone4 = t("errors.phone4");
    setErrors(next);
    if (next.code || next.phone4) return;

    setLoading(true);
    try {
      const res = await fetch("/api/suivi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, telephone4: phone4 }),
      });
      if (res.status === 404) throw new Error("notFound");
      if (res.status === 429) throw new Error("tooMany");
      if (!res.ok) throw new Error("generic");
      const json = (await res.json()) as { dossier: Dossier };
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, c);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* stockage indisponible */
      }
      setDossier(json.dossier);
      setPhone4("");
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      const key = err instanceof Error && ["notFound", "tooMany"].includes(err.message) ? err.message : "generic";
      setErrors({ form: t(`errors.${key as "notFound" | "tooMany" | "generic"}`) });
    } finally {
      setLoading(false);
    }
  }

  if (dossier) {
    return (
      <div ref={resultRef} className="scroll-mt-6">
        <TrackingResult dossier={dossier} locale={locale} levelLabel={levelLabel(dossier.targetLevel)} />
        <button type="button" onClick={() => setDossier(null)} className="mt-5 text-[14px] font-semibold underline underline-offset-2">
          {t("another")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="card p-5 sm:p-6">
      <Field label={t("code")} required error={errors.code}>
        <TextInput
          value={code}
          onChange={(v) => setCode(v.toUpperCase())}
          placeholder={t("codePlaceholder")}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          error={errors.code}
        />
      </Field>
      <Field label={t("phone4")} required error={errors.phone4}>
        <TextInput
          value={phone4}
          onChange={(v) => setPhone4(v.replace(/\D/g, "").slice(0, 4))}
          placeholder={t("phone4Placeholder")}
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          error={errors.phone4}
        />
      </Field>
      <CheckboxField checked={remember} onChange={setRemember} label={t("remember")} />
      {errors.form && (
        <p role="alert" className="mb-3 flex items-start gap-2 rounded-[10px] border-[1.5px] border-erreur bg-erreur-fond p-3 text-[14px] font-semibold text-erreur">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {errors.form}
        </p>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? <Spinner /> : <Search className="h-4 w-4" />}
        {loading ? t("searching") : t("submit")}
      </button>
    </form>
  );
}

function TrackingResult({ dossier, locale, levelLabel }: { dossier: Dossier; locale: string; levelLabel: string }) {
  const t = useTranslations("suivi");
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const waNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  const parallel = isParallelStage(dossier.stage);
  const currentIndex = (STAGES as readonly string[]).indexOf(dossier.stage);
  const dateOf = (stage: string) => [...dossier.history].reverse().find((h) => h.stage === stage)?.date;
  const nextAction = t(`stages.${dossier.stage as "recu"}.next`);

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="text-2xl font-extrabold">{t("hello", { name: dossier.firstName })}</h2>
        <p className="mt-1 text-[14px] text-gris">
          {dossier.code} · {t("level", { level: levelLabel })}
        </p>
        <p className="text-[13px] text-gris">{t("updated", { date: dateFmt.format(new Date(dossier.stageUpdatedAt)) })}</p>
      </div>

      {parallel ? (
        <div className="rounded-brand border-l-[5px] border-rouge bg-[#FFEDED] p-5">
          <p className="text-[13px] font-bold uppercase tracking-wide text-rouge-fonce">{t(`stages.${dossier.stage as "clos"}.label`)}</p>
          <p className="mt-1 text-[17px] font-extrabold">{nextAction}</p>
        </div>
      ) : (
        <>
          <ol className="card p-5" aria-label={t("current")}>
            {STAGES.map((stage, i) => {
              const done = i < currentIndex;
              const current = i === currentIndex;
              const date = done || current ? dateOf(stage) : undefined;
              return (
                <li key={stage} className="relative flex gap-3 pb-4 last:pb-0" aria-current={current ? "step" : undefined}>
                  {i < STAGES.length - 1 && (
                    <span className={cn("absolute left-[13px] top-7 h-[calc(100%-24px)] w-[2px]", done ? "bg-noir" : "bg-bord")} aria-hidden />
                  )}
                  <span
                    className={cn(
                      "relative z-[1] flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold",
                      done && "bg-noir text-white",
                      current && "bg-rouge text-white ring-4 ring-[#FFD6D6]",
                      !done && !current && "border-[1.5px] border-bord bg-white text-gris",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className={cn("block text-[15px]", current ? "font-extrabold text-rouge-fonce" : done ? "font-semibold" : "text-gris")}>
                      {t(`stages.${stage}.label`)}
                    </span>
                    {date && <span className="block text-[12px] text-gris">{dateFmt.format(new Date(date))}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          {nextAction && (
            <div className="rounded-brand bg-noir p-5 text-white">
              <p className="text-[13px] font-bold uppercase tracking-wide text-rouge">{t("next")}</p>
              <p className="mt-1 text-[17px] font-bold">{nextAction}</p>
            </div>
          )}
        </>
      )}

      {dossier.publicNote && (
        <div className="card p-5">
          <p className="text-[13px] font-bold uppercase tracking-wide text-gris">{t("note")}</p>
          <p className="mt-1 whitespace-pre-line text-[15px]">{dossier.publicNote}</p>
        </div>
      )}

      {dossier.recommendations.length > 0 && (
        <p className="px-1 text-[14px] text-gris">{t("offers", { refs: dossier.recommendations.map((r) => r.ref).join(", ") })}</p>
      )}

      <a
        href={`https://wa.me/${waNumber}?text=${encodeURIComponent(t("waMessage", { code: dossier.code }))}`}
        target="_blank"
        rel="noopener noreferrer"
        data-track-location="suivi"
        className="btn-wa"
      >
        <MessageCircle className="h-4 w-4" /> {t("question")}
      </a>
    </div>
  );
}
