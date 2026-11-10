"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Send, ShieldCheck } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { isAcceptablePhone } from "@/lib/phone";
import { Field, TextInput, ChipGroup, CheckboxField } from "@/components/forms/intake/fields";
import { CountrySelect, PhoneInput } from "@/components/forms/country-fields";
import { Spinner } from "@/components/ui/spinner";

const PROFILES = ["teacher", "counselor", "alumni_china", "creator", "association", "other"] as const;
const ESTIMATES = ["1-3", "4-9", "10+"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Draft = {
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  country: string;
  city: string;
  idType: string;
  idNumber: string;
  profile: string;
  networks: string;
  estimate: string;
  payoutMethod: string;
  payoutNumber: string;
  consent: boolean;
  website: string; // honeypot
};

const EMPTY: Draft = {
  firstName: "",
  lastName: "",
  email: "",
  whatsapp: "",
  country: "",
  city: "",
  idType: "",
  idNumber: "",
  profile: "",
  networks: "",
  estimate: "",
  payoutMethod: "",
  payoutNumber: "",
  consent: false,
  website: "",
};

/**
 * Demande de partenariat (PACK-11) : informations du futur contrat. Réponse sous 48 h,
 * contrat à signer en ligne. Les listes (pièces, moyens de paiement) viennent du serveur.
 */
export function PartnerApplicationForm({ idTypes, payoutMethods }: { idTypes: string[]; payoutMethods: string[] }) {
  const t = useTranslations("partnerApply");
  const v2 = useTranslations("partnerApply.v2");
  const locale = useLocale();
  const [data, setData] = useState<Draft>(EMPTY);
  const [phoneCountry, setPhoneCountry] = useState("");
  const [payoutTouched, setPayoutTouched] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setData((d) => ({ ...d, [k]: v }));

  function validate() {
    const e: Partial<Record<keyof Draft, string>> = {};
    const req = (k: keyof Draft, ok: boolean, msg = t("required")) => {
      if (!ok) e[k] = msg;
    };
    const len = (v: string, a: number, b: number) => v.trim().length >= a && v.trim().length <= b;
    req("firstName", len(data.firstName, 2, 60), data.firstName.trim() ? v2("firstNameError") : t("required"));
    req("lastName", len(data.lastName, 2, 60), data.lastName.trim() ? v2("firstNameError") : t("required"));
    req("email", data.email.trim().length > 0);
    if (data.email.trim() && !EMAIL_RE.test(data.email.trim())) e.email = t("emailError");
    req("whatsapp", data.whatsapp.trim().length > 0);
    if (data.whatsapp.trim() && !isAcceptablePhone(data.whatsapp)) e.whatsapp = t("whatsappError");
    req("country", Boolean(data.country));
    req("city", data.city.trim().length > 0);
    req("idType", Boolean(data.idType));
    req("idNumber", len(data.idNumber, 5, 30), data.idNumber.trim() ? v2("idNumberError") : t("required"));
    req("profile", Boolean(data.profile));
    req("payoutMethod", Boolean(data.payoutMethod));
    req("payoutNumber", len(payoutValue(), 5, 60));
    if (!data.consent) e.consent = t("consentError");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Numéro de paiement : le WhatsApp par défaut, tant qu'il n'a pas été modifié.
  const payoutValue = () => (payoutTouched ? data.payoutNumber : data.payoutNumber || data.whatsapp);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;
    setSending(true);
    try {
      const res = await fetch("/api/partner-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          email: data.email.trim(),
          payoutNumber: payoutValue(),
          estimate: data.estimate || undefined,
          locale,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(json.error === "duplicate" ? v2("duplicate") : json.error === "tooMany" ? v2("tooMany") : t("generic"));
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
        <h2 className="text-xl font-extrabold">{v2("receivedTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-gris">{v2("receivedText")}</p>
        <Link href="/" className="btn-ghost mx-auto mt-6 !w-auto">
          {t("doneBack")}
        </Link>
      </div>
    );
  }

  const select = (k: "idType" | "payoutMethod" | "estimate", options: { value: string; label: string }[]) => (
    <select value={data[k]} onChange={(e) => set(k, e.target.value)} className={errors[k] ? "field-error" : "field-input"}>
      <option value="">{v2("choose")}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="card relative p-5 sm:p-7">
      <h2 className="text-xl font-extrabold">{t("title")}</h2>
      <p className="mb-5 text-sm text-gris">{v2("pageIntro")}</p>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={v2("firstName")} required error={errors.firstName}>
          <TextInput value={data.firstName} onChange={(v) => set("firstName", v)} maxLength={60} autoComplete="given-name" error={errors.firstName} />
        </Field>
        <Field label={v2("lastName")} required error={errors.lastName}>
          <TextInput value={data.lastName} onChange={(v) => set("lastName", v)} maxLength={60} autoComplete="family-name" error={errors.lastName} />
        </Field>
        <Field label={t("country")} required error={errors.country}>
          <CountrySelect
            value={data.country}
            onChange={(v, code) => {
              set("country", v);
              if (code && !data.whatsapp.trim()) setPhoneCountry(code);
            }}
            placeholder={t("countryPlaceholder")}
            error={errors.country}
          />
        </Field>
        <Field label={t("city")} required error={errors.city}>
          <TextInput value={data.city} onChange={(v) => set("city", v)} maxLength={60} error={errors.city} />
        </Field>
        <Field label={t("whatsapp")} required error={errors.whatsapp}>
          <PhoneInput
            value={data.whatsapp}
            country={phoneCountry}
            onChange={(v, code) => {
              set("whatsapp", v);
              setPhoneCountry(code);
            }}
            error={errors.whatsapp}
          />
        </Field>
        <Field label={t("email")} required error={errors.email}>
          <TextInput type="email" inputMode="email" autoComplete="email" value={data.email} onChange={(v) => set("email", v.trim())} maxLength={120} error={errors.email} />
        </Field>
        <Field label={v2("idType")} required error={errors.idType}>
          {select("idType", idTypes.map((x) => ({ value: x, label: x })))}
        </Field>
        <Field label={v2("idNumber")} required error={errors.idNumber}>
          <TextInput value={data.idNumber} onChange={(v) => set("idNumber", v)} maxLength={30} autoComplete="off" error={errors.idNumber} />
        </Field>
      </div>

      <Field label={t("profile")} required error={errors.profile}>
        <ChipGroup name="profile" value={data.profile} onChange={(v) => set("profile", v)} options={PROFILES.map((p) => ({ value: p, label: t(`profiles.${p}`) }))} />
      </Field>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label={v2("networks")} hint={v2("networksHint")}>
          <TextInput value={data.networks} onChange={(v) => set("networks", v)} maxLength={300} />
        </Field>
        <Field label={v2("estimate")}>{select("estimate", ESTIMATES.map((x) => ({ value: x, label: v2(`estimates.${x}`) })))}</Field>
        <Field label={v2("payoutMethod")} required error={errors.payoutMethod}>
          {select("payoutMethod", payoutMethods.map((x) => ({ value: x, label: x })))}
        </Field>
        <Field label={v2("payoutNumber")} hint={v2("payoutHint")} required error={errors.payoutNumber}>
          <TextInput
            value={payoutValue()}
            onChange={(v) => {
              setPayoutTouched(true);
              set("payoutNumber", v);
            }}
            maxLength={60}
            error={errors.payoutNumber}
          />
        </Field>
      </div>

      <div className="mb-4 flex gap-2.5 rounded-[10px] border border-bord bg-fond p-3 text-[13px] text-gris">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-rouge" />
        {v2("privacyNote")}
      </div>

      <CheckboxField checked={data.consent} onChange={(v) => set("consent", v)} label={v2("contractConsent")} error={errors.consent} />

      {/* Anti-robot : champ invisible, doit rester vide */}
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Ne pas remplir</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={data.website} onChange={(e) => set("website", e.target.value)} />
      </div>

      {submitError && (
        <div className="mb-3.5 rounded-[10px] border-[1.5px] border-erreur bg-erreur-fond p-3 text-sm font-semibold text-erreur">{submitError}</div>
      )}

      <button type="submit" disabled={sending} className="btn-primary w-full">
        {sending ? <Spinner /> : <Send className="h-4 w-4" />}
        {sending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
