"use client";

import { useTranslations } from "next-intl";

import { Field, TextInput, SelectInput, ChipGroup } from "./fields";
import type { IntakeDraft, StepErrors } from "./types";

const YEARS = Array.from({ length: new Date().getFullYear() + 1 - 1990 + 1 }, (_, i) =>
  String(new Date().getFullYear() + 1 - i)
);

export function StepParcours({
  data,
  errors,
  onChange,
}: {
  data: IntakeDraft;
  errors: StepErrors;
  onChange: <K extends keyof IntakeDraft>(field: K, value: IntakeDraft[K]) => void;
}) {
  const t = useTranslations("intake");
  const degreeOptions = t.raw("fields.degree.options") as string[];

  return (
    <section>
      <h2 className="text-xl font-extrabold">{t("steps.parcours.title")}</h2>
      <p className="mb-3 text-sm text-gris">{t("steps.parcours.intro")}</p>

      <Field label={t("fields.situation.label")} required error={errors.currentSituation}>
        <ChipGroup
          name="situation"
          value={data.currentSituation}
          onChange={(v) => onChange("currentSituation", v)}
          options={[
            { value: "pupil", label: t("fields.situation.options.pupil") },
            { value: "student", label: t("fields.situation.options.student") },
            { value: "working", label: t("fields.situation.options.working") },
            { value: "none", label: t("fields.situation.options.none") },
          ]}
        />
      </Field>

      <Field label={t("fields.degree.label")} required error={errors.highestDegree}>
        <SelectInput
          value={data.highestDegree}
          onChange={(v) => onChange("highestDegree", v)}
          options={degreeOptions}
          placeholder={t("fields.degree.placeholder")}
          error={errors.highestDegree}
        />
      </Field>

      {data.highestDegree === degreeOptions[degreeOptions.length - 1] && (
        <Field label={t("fields.degreeOther.label")} required error={errors.degreeOther}>
          <TextInput
            value={data.degreeOther}
            onChange={(v) => onChange("degreeOther", v)}
            maxLength={80}
            error={errors.degreeOther}
          />
        </Field>
      )}

      <Field label={t("fields.degreeYear.label")} required error={errors.degreeYear}>
        <SelectInput
          value={data.degreeYear}
          onChange={(v) => onChange("degreeYear", v)}
          options={YEARS}
          placeholder={t("fields.degreeYear.placeholder")}
          error={errors.degreeYear}
        />
      </Field>

      <Field
        label={t("fields.degreeAverage.label")}
        hint={t("fields.degreeAverage.hint")}
        required
        error={errors.degreeAverage}
      >
        <TextInput
          value={data.degreeAverage}
          onChange={(v) => onChange("degreeAverage", v)}
          maxLength={40}
          error={errors.degreeAverage}
        />
      </Field>
    </section>
  );
}
