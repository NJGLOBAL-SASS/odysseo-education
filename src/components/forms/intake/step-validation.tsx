"use client";

import { useTranslations } from "next-intl";

import { Field, TextInput, ChipGroup, CheckboxField } from "./fields";
import type { IntakeDraft, StepErrors } from "./types";

export function StepValidation({
  data,
  errors,
  onChange,
}: {
  data: IntakeDraft;
  errors: StepErrors;
  onChange: <K extends keyof IntakeDraft>(field: K, value: IntakeDraft[K]) => void;
}) {
  const t = useTranslations("intake");

  return (
    <section>
      <h2 className="text-xl font-extrabold">{t("steps.validation.title")}</h2>
      <p className="mb-3 text-sm text-gris">{t("steps.validation.intro")}</p>

      <Field label={t("fields.referred.label")} required error={errors.referred}>
        <ChipGroup
          name="referred"
          value={data.referred}
          onChange={(v) => onChange("referred", v as IntakeDraft["referred"])}
          column
          options={[
            { value: "no", label: t("fields.referred.options.no") },
            { value: "yes", label: t("fields.referred.options.yes") },
          ]}
        />
      </Field>

      {data.referred === "yes" && (
        <Field
          label={t("fields.partnerDeclared.label")}
          hint={t("fields.partnerDeclared.hint")}
          required
          error={errors.partnerDeclared}
        >
          <TextInput
            value={data.partnerDeclared}
            onChange={(v) => onChange("partnerDeclared", v.toUpperCase())}
            maxLength={60}
            error={errors.partnerDeclared}
          />
        </Field>
      )}

      <Field
        label={`${t("fields.discovery.label")} ${t("fields.discovery.optional")}`}
      >
        <ChipGroup
          name="discovery"
          value={data.discoverySource}
          onChange={(v) => onChange("discoverySource", v)}
          options={[
            { value: "tiktok", label: t("fields.discovery.options.tiktok") },
            { value: "facebook", label: t("fields.discovery.options.facebook") },
            { value: "friend", label: t("fields.discovery.options.friend") },
            { value: "partner", label: t("fields.discovery.options.partner") },
            { value: "other", label: t("fields.discovery.options.other") },
          ]}
        />
      </Field>

      <CheckboxField
        checked={data.consentGiven}
        onChange={(v) => onChange("consentGiven", v)}
        label={t("fields.consent.label")}
        error={errors.consentGiven}
      />

      {/* Anti-robot : champ invisible, doit rester vide */}
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="site_web">Ne pas remplir</label>
        <input
          id="site_web"
          tabIndex={-1}
          autoComplete="off"
          value={data.siteWeb}
          onChange={(e) => onChange("siteWeb", e.target.value)}
        />
      </div>
    </section>
  );
}
