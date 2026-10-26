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

const STEP_COUNT = 4;

const REF_STORAGE_KEY = "odysseo_ref";

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
    };
  }

  async function goNext() {
    const stepErrors = validateStep(step, data, errorMessages());
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

    const payload = {
      ...data,
      locale,
      srcParam: refCode,
      submissionDurationSec: Math.round((Date.now() - startedAt.current) / 1000),
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
