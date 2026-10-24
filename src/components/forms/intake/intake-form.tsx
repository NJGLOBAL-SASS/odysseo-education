"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ProgressBar } from "./progress-bar";
import { DoneScreen } from "./done-screen";
import { StepVous } from "./step-vous";
import { StepParcours } from "./step-parcours";
import { StepProjet } from "./step-projet";
import { StepValidation } from "./step-validation";
import { validateStep } from "./validate-step";
import { emptyDraft, type IntakeDraft, type StepErrors } from "./types";

const STEP_COUNT = 4;

function readReferralCode() {
  if (typeof window === "undefined") return "";
  const url = new URLSearchParams(window.location.search);
  const fromUrl = (url.get("ref") || url.get("partenaire") || url.get("src") || "").trim();
  if (fromUrl) {
    sessionStorage.setItem("odysseo_ref", fromUrl);
    return fromUrl;
  }
  return sessionStorage.getItem("odysseo_ref") || "";
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

  useEffect(() => {
    setRefCode(readReferralCode());
  }, []);

  function onChange<K extends keyof IntakeDraft>(field: K, value: IntakeDraft[K]) {
    setData((d) => ({ ...d, [field]: value }));
  }

  function errorMessages() {
    return {
      required: t("errors.required"),
      fullName: t("errors.fullName"),
      whatsapp: t("errors.whatsapp"),
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
        <DoneScreen code={result.code} firstName={firstName} />
      </div>
    );
  }

  const stepName = t(`steps.${(["vous", "parcours", "projet", "validation"] as const)[step]}.name`);

  return (
    <div className="wrap py-4">
      <ProgressBar step={step} total={STEP_COUNT} stepName={stepName} />

      <div className="card mt-2 p-4">
        {step === 0 && <StepVous data={data} errors={errors} onChange={onChange} />}
        {step === 1 && <StepParcours data={data} errors={errors} onChange={onChange} />}
        {step === 2 && <StepProjet data={data} errors={errors} onChange={onChange} />}
        {step === 3 && <StepValidation data={data} errors={errors} onChange={onChange} />}

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
