"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, BadgeCheck } from "lucide-react";

import { ProgressBar } from "./progress-bar";
import { DoneScreen } from "./done-screen";
import { StepVous } from "./step-vous";
import { StepParcours } from "./step-parcours";
import { StepProjet } from "./step-projet";
import { StepValidation } from "./step-validation";
import { validateStep } from "./validate-step";
import { emptyDraft, type IntakeDraft, type StepErrors, type ReferralInfo } from "./types";
import { Spinner } from "@/components/ui/spinner";
import { getAttributionClient } from "@/lib/attribution";
import { getMetaBrowserIds, hasMarketingConsent } from "@/lib/tracking/meta-pixel";
import { trackFormStepView, trackFormSubmitSuccess } from "@/lib/tracking/events";

const STEP_COUNT = 4;

const REF_STORAGE_KEY = "odysseo_ref";

/** Brouillon du formulaire (PACK-01) : restauré au retour, vidé après l'envoi. Jamais le consentement. */
const DRAFT_STORAGE_KEY = "odysseo_form_draft";

type StoredDraft = { step: number; data: Partial<IntakeDraft> };

function readDraft(): { step: number; data: IntakeDraft } | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed || typeof parsed !== "object" || !parsed.data) return null;
    const data: IntakeDraft = { ...emptyDraft };
    for (const key of Object.keys(emptyDraft) as (keyof IntakeDraft)[]) {
      const v = parsed.data[key];
      if (v === undefined) continue;
      // On ne restaure que des valeurs du bon type (brouillons d'une ancienne version du formulaire).
      if (Array.isArray(emptyDraft[key]) ? Array.isArray(v) : typeof v === typeof emptyDraft[key]) {
        (data as Record<string, unknown>)[key] = v;
      }
    }
    data.consentGiven = false;
    data.siteWeb = "";
    const step = Number.isInteger(parsed.step) ? Math.min(Math.max(parsed.step, 0), STEP_COUNT - 1) : 0;
    return { step, data };
  } catch {
    return null;
  }
}

function writeDraft(step: number, data: IntakeDraft) {
  try {
    const rest: Partial<IntakeDraft> = { ...data };
    delete rest.consentGiven;
    delete rest.siteWeb;
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ step, data: rest } satisfies StoredDraft));
  } catch {
    // Navigation privée / stockage plein : pas de brouillon, le formulaire fonctionne quand même.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Code transmis par le lien de parrainage (?ref=), mémorisé pour toute la session. */
function readReferralCode() {
  if (typeof window === "undefined") return "";
  const url = new URLSearchParams(window.location.search);
  const fromUrl = (url.get("ref") || url.get("partenaire") || url.get("src") || "").trim();
  try {
    if (fromUrl) {
      sessionStorage.setItem(REF_STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    return sessionStorage.getItem(REF_STORAGE_KEY) || "";
  } catch {
    return fromUrl;
  }
}

export function IntakeForm() {
  const t = useTranslations("intake");
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeDraft>(emptyDraft);
  const [errors, setErrors] = useState<StepErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<{ code: string } | null>(null);
  const startedAt = useRef(Date.now());
  const [refCode, setRefCode] = useState("");
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const draftRestored = useRef(false);
  const degreeOptions = t.raw("fields.degree.options") as string[];

  // Brouillon : restauré une fois au chargement, puis enregistré à chaque modification.
  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setData((d) => ({ ...draft.data, consentGiven: d.consentGiven }));
      setStep(draft.step);
    }
    draftRestored.current = true;
  }, []);

  useEffect(() => {
    if (draftRestored.current && !result) writeDraft(step, data);
  }, [step, data, result]);

  // Lien de parrainage : on vérifie le code puis on pré-remplit l'étape
  // "Validation" pour que le candidat n'ait rien à taper.
  useEffect(() => {
    const code = readReferralCode();
    setRefCode(code);
    if (!code) return;

    fetch(`/api/referral/${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((json: { valid: boolean; code?: string; partnerName?: string }) => {
        if (!json.valid || !json.code) return;
        setReferral({ code: json.code, partnerName: json.partnerName ?? "" });
        setData((d) => ({
          ...d,
          referred: "yes",
          partnerDeclared: json.code!,
          discoverySource: d.discoverySource || "partner",
        }));
      })
      .catch(() => {});
  }, []);

  // Mesure de l'abandon : une vue par étape (1 à 4), sans aucune donnée saisie.
  useEffect(() => {
    trackFormStepView(step + 1);
  }, [step]);

  function onChange<K extends keyof IntakeDraft>(field: K, value: IntakeDraft[K]) {
    setData((d) => ({ ...d, [field]: value }));
  }

  function errorMessages() {
    return {
      required: t("errors.required"),
      fullName: t("errors.fullName"),
      whatsapp: t("errors.whatsapp"),
      email: t("errors.email"),
      dateOfBirth: t("errors.dateOfBirth"),
      consent: t("errors.consent"),
      domainsMax: t("errors.domainsMax"),
      average: (max: number) => t("errors.average", { max }),
      englishScore: ({ type, min, max, step }: { type: string; min: number; max: number; step: number }) =>
        t("errors.englishScore", {
          type: t(`fields.englishCertificate.options.${type}`),
          min,
          max,
          step: step < 1 ? "half" : "whole",
        }),
    };
  }

  async function goNext() {
    const stepErrors = validateStep(step, data, errorMessages(), degreeOptions);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    if (step < STEP_COUNT - 1) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    await submit();
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError("");

    // Origine du visiteur (UTM, ref d'offre...) et consentement marketing, pour
    // l'attribution du dossier et l'API Conversions Meta (dédupliquée par code dossier).
    const attribution = getAttributionClient();
    const marketingConsent = hasMarketingConsent();
    const payload = {
      ...data,
      locale,
      srcParam: refCode,
      submissionDurationSec: Math.round((Date.now() - startedAt.current) / 1000),
      attribution,
      marketingConsent,
      ...(marketingConsent && getMetaBrowserIds(attribution?.fbclid, attribution?.firstVisitAt)),
      pageUrl: window.location.origin + window.location.pathname,
    };

    try {
      const res = await fetch("/api/candidatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "error");
      setResult({ code: json.code });
      clearDraft();
      trackFormSubmitSuccess({ code: json.code, targetLevel: data.targetLevel });
    } catch {
      setSubmitError(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const firstName = data.fullName.trim().split(/\s+/).slice(-1)[0] || "";
    return (
      <div className="wrap py-6">
        <DoneScreen code={result.code} firstName={firstName} email={data.email.trim()} />
      </div>
    );
  }

  const stepName = t(`steps.${(["vous", "parcours", "projet", "validation"] as const)[step]}.name`);

  return (
    <div className="wrap py-4">
      <ProgressBar step={step} total={STEP_COUNT} stepName={stepName} />

      {referral && step === 0 && (
        <div className="mt-2 flex items-center gap-2.5 rounded-brand border border-ok/20 bg-[#EAF7F0] px-3.5 py-2.5 text-sm text-ok">
          <BadgeCheck className="h-4 w-4 flex-shrink-0" />
          <span>
            {t("referral.banner", { name: referral.partnerName })}
          </span>
        </div>
      )}

      <div className="card mt-2 p-4">
        {step === 0 && <StepVous data={data} errors={errors} onChange={onChange} />}
        {step === 1 && <StepParcours data={data} errors={errors} onChange={onChange} />}
        {step === 2 && <StepProjet data={data} errors={errors} onChange={onChange} />}
        {step === 3 && <StepValidation data={data} errors={errors} onChange={onChange} referral={referral} />}

        {submitError && (
          <div className="mb-3.5 rounded-[10px] border-[1.5px] border-erreur bg-erreur-fond p-3 text-sm">
            <strong className="text-erreur">{submitError}</strong>
          </div>
        )}

        <div className="mt-1 flex gap-2.5">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="btn-ghost"
              disabled={submitting}
            >
              <ChevronLeft className="h-4 w-4" /> {t("navigation.prev")}
            </button>
          )}
          <button type="button" onClick={goNext} disabled={submitting} className="btn-primary flex-1">
            {submitting && <Spinner />}
            {submitting
              ? t("navigation.sending")
              : step === STEP_COUNT - 1
                ? t("navigation.submit")
                : t("navigation.next")}
            {!submitting && step < STEP_COUNT - 1 && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
