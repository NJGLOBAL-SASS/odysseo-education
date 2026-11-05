"use client";

import { useTranslations } from "next-intl";

import { Field, TextInput, SelectInput, ChipGroup } from "./fields";
import type { IntakeDraft, StepErrors } from "./types";
import { AVERAGE_SCALES, DEGREE_FIELD_REQUIRED_INDEXES, DEGREE_FIELD_SHOWN_INDEXES } from "@/lib/qualification";
import suggestions from "../../../../content/filieres_suggestions.json";

const FIELD_SUGGESTIONS = (suggestions as { filieres: string[] }).filieres;

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
  const degreeIdx = degreeOptions.indexOf(data.highestDegree);

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

      {DEGREE_FIELD_SHOWN_INDEXES.includes(degreeIdx) && (
        <Field
          label={t("fields.degreeField.label")}
          hint={t("fields.degreeField.hint")}
          required={DEGREE_FIELD_REQUIRED_INDEXES.includes(degreeIdx)}
          error={errors.degreeField}
        >
          {/* Autocomplétion native (datalist) : non bloquante, on peut taper autre chose. */}
          <TextInput
            value={data.degreeField}
            onChange={(v) => onChange("degreeField", v)}
            maxLength={120}
            list="filieres-suggestions"
            autoComplete="off"
            placeholder={t("fields.degreeField.placeholder")}
            error={errors.degreeField}
          />
          <datalist id="filieres-suggestions">
            {FIELD_SUGGESTIONS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </Field>
      )}

      <Field
        label={t("fields.degreeAverage.label")}
        hint={`${t("fields.averageScale.label")} ${t("fields.degreeAverage.hint")}`}
        required
        error={errors.averageScale || errors.averageValue}
      >
        <ChipGroup
          name="averageScale"
          value={data.averageScale}
          onChange={(v) => onChange("averageScale", v)}
          options={AVERAGE_SCALES.map((v) => ({ value: v, label: t(`fields.averageScale.options.${v}`) }))}
        />
        {data.averageScale && data.averageScale !== "unknown" && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="w-32">
              <TextInput
                value={data.averageValue}
                onChange={(v) => onChange("averageValue", v.replace(/[^\d.,]/g, ""))}
                inputMode="decimal"
                maxLength={6}
                placeholder={t("fields.degreeAverage.placeholder")}
                error={errors.averageValue}
                aria-label={t("fields.degreeAverage.label")}
              />
            </div>
            <span className="text-[15px] font-bold">{t(`fields.averageScale.options.${data.averageScale}`)}</span>
          </div>
        )}
      </Field>

      <Field label={t("fields.originalDiplomas.label")} required error={errors.originalDiplomas}>
        <ChipGroup
          name="originalDiplomas"
          value={data.originalDiplomas}
          onChange={(v) => onChange("originalDiplomas", v as IntakeDraft["originalDiplomas"])}
          options={[
            { value: "yes", label: t("fields.originalDiplomas.options.yes") },
            { value: "notYet", label: t("fields.originalDiplomas.options.notYet") },
          ]}
        />
      </Field>
    </section>
  );
}
