"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";

import { Field, TextInput, SelectInput, ChipGroup } from "./fields";
import { COUNTRIES, dialCodeFor } from "@/lib/countries";
import { ageFrom } from "@/lib/validations/intake";
import type { IntakeDraft, StepErrors } from "./types";

export function StepVous({
  data,
  errors,
  onChange,
}: {
  data: IntakeDraft;
  errors: StepErrors;
  onChange: <K extends keyof IntakeDraft>(field: K, value: IntakeDraft[K]) => void;
}) {
  const t = useTranslations("intake");
  const age = ageFrom(data.dateOfBirth);
  const isMinor = age !== null && age >= 0 && age < 18;
  const showGuardian = isMinor || data.managedBy === "parent" || data.managedBy === "guardian";

  function onCountryChange(country: string) {
    onChange("country", country);
    const dial = dialCodeFor(country);
    if (dial && !data.whatsapp.trim()) onChange("whatsapp", `${dial} `);
  }

  return (
    <section>
      <h2 className="text-xl font-extrabold">{t("steps.vous.title")}</h2>
      <p className="mb-3 text-sm text-gris">{t("steps.vous.intro")}</p>

      <Field label={t("fields.fullName.label")} required error={errors.fullName}>
        <TextInput
          value={data.fullName}
          onChange={(v) => onChange("fullName", v)}
          placeholder={t("fields.fullName.placeholder")}
          maxLength={80}
          error={errors.fullName}
        />
      </Field>

      <Field label={t("fields.whatsapp.label")} required error={errors.whatsapp}>
        <TextInput
          type="tel"
          value={data.whatsapp}
          onChange={(v) => onChange("whatsapp", v)}
          placeholder={t("fields.whatsapp.placeholder")}
          maxLength={22}
          error={errors.whatsapp}
        />
      </Field>

      <Field label={t("fields.email.label")} required error={errors.email}>
        <TextInput
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={data.email}
          onChange={(v) => onChange("email", v.trim())}
          placeholder={t("fields.email.placeholder")}
          maxLength={120}
          error={errors.email}
        />
      </Field>

      <div className="mb-3.5 -mt-0.5 flex gap-2.5 rounded-[10px] border border-bord bg-fond p-3 text-[13px] leading-snug">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-rouge" />
        <p>
          <b className="block text-[14px]">{t("fields.contactNotice.title")}</b>
          <span className="text-gris">{t("fields.contactNotice.text")}</span>
        </p>
      </div>

      <Field label={t("fields.dateOfBirth.label")} required error={errors.dateOfBirth}>
        <TextInput
          type="date"
          value={data.dateOfBirth}
          onChange={(v) => onChange("dateOfBirth", v)}
          error={errors.dateOfBirth}
        />
        {age !== null && age >= 12 && age <= 65 && (
          <p className="mt-1 text-[13px] text-gris">Âge : {age}</p>
        )}
      </Field>

      <Field label={t("fields.country.label")} required error={errors.country}>
        <SelectInput
          value={data.country}
          onChange={onCountryChange}
          options={COUNTRIES.map((c) => c.value)}
          placeholder={t("fields.country.placeholder")}
          error={errors.country}
        />
      </Field>

      <Field label={t("fields.city.label")} required error={errors.city}>
        <TextInput
          value={data.city}
          onChange={(v) => onChange("city", v)}
          placeholder={t("fields.city.placeholder")}
          maxLength={60}
          error={errors.city}
        />
      </Field>

      <Field label={t("fields.managedBy.label")} required error={errors.managedBy}>
        <ChipGroup
          name="managedBy"
          value={data.managedBy}
          onChange={(v) => onChange("managedBy", v as IntakeDraft["managedBy"])}
          options={[
            { value: "self", label: t("fields.managedBy.options.self") },
            { value: "parent", label: t("fields.managedBy.options.parent") },
            { value: "guardian", label: t("fields.managedBy.options.guardian") },
          ]}
        />
      </Field>

      {showGuardian && (
        <div className="mb-3.5 -mt-0.5 rounded-r-[10px] border-l-[3px] border-rouge bg-[#FAFAFB] p-2.5">
          <h3 className="mb-1 text-[15px] font-semibold">{t("fields.guardianBlock.title")}</h3>
          <p className="mb-2.5 text-[13px] text-gris">
            {isMinor
              ? t("fields.guardianBlock.whyMinor")
              : t("fields.guardianBlock.whyDefault")}
          </p>

          <Field label={t("fields.guardianBlock.name")} required error={errors.guardianName}>
            <TextInput
              value={data.guardianName}
              onChange={(v) => onChange("guardianName", v)}
              maxLength={80}
              error={errors.guardianName}
            />
          </Field>

          <Field label={t("fields.guardianBlock.link")} required error={errors.guardianLink}>
            <ChipGroup
              name="guardianLink"
              value={data.guardianLink}
              onChange={(v) => onChange("guardianLink", v)}
              options={[
                { value: "father", label: t("fields.guardianBlock.linkOptions.father") },
                { value: "mother", label: t("fields.guardianBlock.linkOptions.mother") },
                { value: "sibling", label: t("fields.guardianBlock.linkOptions.sibling") },
                { value: "auntUncle", label: t("fields.guardianBlock.linkOptions.auntUncle") },
                { value: "other", label: t("fields.guardianBlock.linkOptions.other") },
              ]}
            />
          </Field>

          <Field
            label={t("fields.guardianBlock.whatsapp")}
            required
            error={errors.guardianWhatsapp}
          >
            <TextInput
              type="tel"
              value={data.guardianWhatsapp}
              onChange={(v) => onChange("guardianWhatsapp", v)}
              maxLength={22}
              error={errors.guardianWhatsapp}
            />
          </Field>
        </div>
      )}
    </section>
  );
}
