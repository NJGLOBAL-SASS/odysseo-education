"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Mail, Send } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { COUNTRIES, dialCodeFor } from "@/lib/countries";
import { normalizePhone } from "@/lib/validations/intake";
import { Field, TextInput, SelectInput, ChipGroup, CheckboxField } from "@/components/forms/intake/fields";
import { Spinner } from "@/components/ui/spinner";

const PROFILES = ["student", "teacher", "agency", "creator", "other"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Draft = {
  fullName: string;
  email: string;
  whatsapp: string;
  country: string;
  city: string;
  profile: string;
  motivation: string;
  consent: boolean;
  website: string; // honeypot
};

const EMPTY: Draft = {
  fullName: "",
  email: "",
  whatsapp: "",
  country: "",
  city: "",
  profile: "",
  motivation: "",
  consent: false,
  website: "",
};

/** Demande de partenariat depuis le site public : envoyée à l'équipe, réponse par email. */
export function PartnerApplicationForm() {
  const t = useTranslations("partnerApply");
  const locale = useLocale();
  const [data, setData] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setData((d) => ({ ...d, [k]: v }));

  function validate() {
    const e: Partial<Record<keyof Draft, string>> = {};
    const req = (k: keyof Draft, ok: boolean) => {
      if (!ok) e[k] = t("required");
    };
    req("fullName", data.fullName.trim().length > 0);
    if (data.fullName.trim() && data.fullName.trim().split(/\s+/).length < 2) e.fullName = t("fullNameError");
    req("email", data.email.trim().length > 0);
    if (data.email.trim() && !EMAIL_RE.test(data.email.trim())) e.email = t("emailError");
    req("whatsapp", data.whatsapp.trim().length > 0);
    if (data.whatsapp.trim() && !/^\+\d{9,15}$/.test(normalizePhone(data.whatsapp))) e.whatsapp = t("whatsappError");
    req("country", Boolean(data.country));
    req("city", data.city.trim().length > 0);
    req("profile", Boolean(data.profile));
    if (data.motivation.trim().length < 30) e.motivation = t("motivationError");
    if (!data.consent) e.consent = t("consentError");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;
    setSending(true);
    try {
      const res = await fetch("/api/partner-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, email: data.email.trim(), locale }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(
          json.error === "alreadyPending" ? t("alreadyPending") : json.error === "alreadyPartner" ? t("alreadyPartner") : t("generic")
        );
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError(t("generic"));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="card animate-fade-up p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-ok" />
        <h2 className="text-xl font-extrabold">{t("doneTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-gris">
          {t("doneText", { name: data.fullName.trim().split(/\s+/)[0] ?? "", email: data.email.trim() })}
        </p>
        <Link href="/" className="btn-ghost mx-auto mt-6 !w-auto">
          {t("doneBack")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card p-5 sm:p-7">
      <h2 className="text-xl font-extrabold">{t("title")}</h2>
      <p className="mb-5 text-sm text-gris">{t("intro")}</p>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t("fullName")} required error={errors.fullName}>
            <TextInput value={data.fullName} onChange={(v) => set("fullName", v)} maxLength={80} autoComplete="name" error={errors.fullName} />
          </Field>
        </div>
        <Field label={t("email")} required error={errors.email}>
          <TextInput
            type="email"
            inputMode="email"
            autoComplete="email"
            value={data.email}
            onChange={(v) => set("email", v.trim())}
            maxLength={120}
            error={errors.email}
          />
        </Field>
        <Field label={t("whatsapp")} required error={errors.whatsapp}>
          <TextInput
            type="tel"
            autoComplete="tel"
            value={data.whatsapp}
            onChange={(v) => set("whatsapp", v)}
            placeholder="+237 6XX XX XX XX"
            maxLength={22}
            error={errors.whatsapp}
          />
        </Field>
        <Field label={t("country")} required error={errors.country}>
          <SelectInput
            value={data.country}
            onChange={(v) => {
              set("country", v);
              const dial = dialCodeFor(v);
              if (dial && !data.whatsapp.trim()) set("whatsapp", `${dial} `);
            }}
            options={COUNTRIES.map((c) => c.value)}
            placeholder={t("countryPlaceholder")}
            error={errors.country}
          />
        </Field>
        <Field label={t("city")} required error={errors.city}>
          <TextInput value={data.city} onChange={(v) => set("city", v)} maxLength={60} error={errors.city} />
        </Field>
      </div>

      <Field label={t("profile")} required error={errors.profile}>
        <ChipGroup
          name="profile"
          value={data.profile}
          onChange={(v) => set("profile", v)}
          options={PROFILES.map((p) => ({ value: p, label: t(`profiles.${p}`) }))}
        />
      </Field>

      <Field label={t("motivation")} hint={t("motivationHint")} required error={errors.motivation}>
        <textarea
          value={data.motivation}
          onChange={(e) => set("motivation", e.target.value)}
          rows={5}
          maxLength={2000}
          className={`${errors.motivation ? "field-error" : "field-input"} resize-y`}
        />
        <p className="mt-1 text-right text-xs tabular-nums text-gris">{data.motivation.trim().length} / 2000</p>
      </Field>

      <div className="mb-4 flex gap-2.5 rounded-[10px] border border-bord bg-fond p-3 text-[13px] text-gris">
        <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-rouge" />
        {t("contactNotice")}
      </div>

      <CheckboxField checked={data.consent} onChange={(v) => set("consent", v)} label={t("consent")} error={errors.consent} />

      {/* Anti-robot : champ invisible, doit rester vide */}
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Ne pas remplir</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={data.website} onChange={(e) => set("website", e.target.value)} />
      </div>

      {submitError && (
        <div className="mb-3.5 rounded-[10px] border-[1.5px] border-erreur bg-erreur-fond p-3 text-sm font-semibold text-erreur">
          {submitError}
        </div>
      )}

      <button type="submit" disabled={sending} className="btn-primary w-full">
        {sending ? <Spinner /> : <Send className="h-4 w-4" />}
        {sending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
