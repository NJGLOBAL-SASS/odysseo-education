"use client";

import { useTranslations } from "next-intl";

import { Field, TextInput, ChipGroup, MultiChipGroup } from "./fields";
import type { IntakeDraft, StepErrors } from "./types";
import { asksEnglishLevel } from "./validate-step";
import {
  BANK_STATEMENT_BANDS,
  DOMAIN_CODES,
  ENGLISH_CERTIFICATES,
  HSK_LEVELS,
  MAX_DOMAINS,
  isScoredCertificate,
} from "@/lib/qualification";

export function StepProjet({
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
      <h2 className="text-xl font-extrabold">{t("steps.projet.title")}</h2>
      <p className="mb-3 text-sm text-gris">{t("steps.projet.intro")}</p>

      <Field label={t("fields.level.label")} required error={errors.targetLevel}>
        <ChipGroup
          name="level"
          value={data.targetLevel}
          onChange={(v) => onChange("targetLevel", v)}
          options={[
            { value: "language", label: t("fields.level.options.language") },
            { value: "licence", label: t("fields.level.options.licence") },
            { value: "master", label: t("fields.level.options.master") },
            { value: "doctorat", label: t("fields.level.options.doctorat") },
          ]}
        />
      </Field>

      <Field label={t("fields.field.label")} hint={t("fields.field.hint")} required error={errors.domains}>
        <MultiChipGroup
          value={data.domains}
          onChange={(v) => onChange("domains", v)}
          max={MAX_DOMAINS}
          options={DOMAIN_CODES.map((c) => ({ value: c, label: t(`fields.field.options.${c}`) }))}
        />
      </Field>

      {data.domains.includes("autre") && (
        <Field label={t("fields.fieldOther.label")} required error={errors.fieldOther}>
          <TextInput
            value={data.fieldOther}
            onChange={(v) => onChange("fieldOther", v)}
            maxLength={80}
            error={errors.fieldOther}
          />
        </Field>
      )}

      <Field label={t("fields.passport.label")} required error={errors.passportStatus}>
        <ChipGroup
          name="passport"
          value={data.passportStatus}
          onChange={(v) => onChange("passportStatus", v)}
          options={[
            { value: "valid", label: t("fields.passport.options.valid") },
            { value: "inProgress", label: t("fields.passport.options.inProgress") },
            { value: "none", label: t("fields.passport.options.none") },
          ]}
        />
      </Field>

      <Field label={t("fields.englishCertificate.label")} required error={errors.englishCertificate}>
        <ChipGroup
          name="englishCertificate"
          value={data.englishCertificate}
          onChange={(v) => onChange("englishCertificate", v)}
          options={ENGLISH_CERTIFICATES.map((c) => ({ value: c, label: t(`fields.englishCertificate.options.${c}`) }))}
        />
      </Field>

      {isScoredCertificate(data.englishCertificate) && (
        <Field
          label={t("fields.englishScore.label", { type: t(`fields.englishCertificate.options.${data.englishCertificate}`) })}
          hint={t(`fields.englishScore.hint.${data.englishCertificate}`)}
          required
          error={errors.englishScore}
        >
          <div className="w-32">
            <TextInput
              value={data.englishScore}
              onChange={(v) => onChange("englishScore", v.replace(/[^\d.,]/g, ""))}
              inputMode="decimal"
              maxLength={5}
              error={errors.englishScore}
            />
          </div>
        </Field>
      )}

      {asksEnglishLevel(data) && (
        <Field label={t("fields.english.label")} required error={errors.englishLevel}>
          <ChipGroup
            name="english"
            value={data.englishLevel}
            onChange={(v) => onChange("englishLevel", v)}
            options={[
              { value: "yes", label: t("fields.english.options.yes") },
              { value: "little", label: t("fields.english.options.little") },
              { value: "no", label: t("fields.english.options.no") },
            ]}
          />
        </Field>
      )}

      <Field label={t("fields.hsk.label")} required error={errors.hsk}>
        <ChipGroup
          name="hsk"
          value={data.hsk}
          onChange={(v) => onChange("hsk", v)}
          options={HSK_LEVELS.map((h) => ({ value: h, label: t(`fields.hsk.options.${h}`) }))}
        />
      </Field>

      <Field label={t("fields.bankStatement.label")} hint={t("fields.bankStatement.hint")} required error={errors.bankStatement}>
        <ChipGroup
          name="bankStatement"
          value={data.bankStatement}
          onChange={(v) => onChange("bankStatement", v)}
          options={BANK_STATEMENT_BANDS.map((b) => ({ value: b, label: t(`fields.bankStatement.options.${b}`) }))}
        />
      </Field>

      <Field label={t("fields.funding.label")} required error={errors.fundingPlan}>
        <ChipGroup
          name="funding"
          value={data.fundingPlan}
          onChange={(v) => onChange("fundingPlan", v)}
          column
          options={[
            { value: "scholarshipOnly", label: t("fields.funding.options.scholarshipOnly") },
            { value: "familyPart", label: t("fields.funding.options.familyPart") },
            { value: "fullFunding", label: t("fields.funding.options.fullFunding") },
          ]}
        />
      </Field>

      <Field label={t("fields.intake.label")} required error={errors.targetIntake}>
        <ChipGroup
          name="intake"
          value={data.targetIntake}
          onChange={(v) => onChange("targetIntake", v)}
          options={[
            { value: "march", label: t("fields.intake.options.march") },
            { value: "september", label: t("fields.intake.options.september") },
            { value: "later", label: t("fields.intake.options.later") },
          ]}
        />
      </Field>
    </section>
  );
}
