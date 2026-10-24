"use client";

import { useTranslations } from "next-intl";

import { Field, TextInput, SelectInput, ChipGroup } from "./fields";
import type { IntakeDraft, StepErrors } from "./types";

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
  const fieldOptions = t.raw("fields.field.options") as string[];

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

      <Field label={t("fields.field.label")} required error={errors.fieldOfStudy}>
        <SelectInput
          value={data.fieldOfStudy}
          onChange={(v) => onChange("fieldOfStudy", v)}
          options={fieldOptions}
          placeholder={t("fields.field.placeholder")}
          error={errors.fieldOfStudy}
        />
      </Field>

      {data.fieldOfStudy === fieldOptions[fieldOptions.length - 1] && (
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
