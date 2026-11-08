"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { SearchableSelect, type SearchOption } from "./searchable-select";
import { ALL_COUNTRIES, OTHER_COUNTRY, PRIORITY_COUNTRY_CODES, countryByCode, countryByValue, flagEmoji } from "@/lib/countries";
import { formatNational, maxNationalDigits, phoneExample, splitPhone, toInternational } from "@/lib/phone";
import { cn } from "@/lib/utils";

function useSortedCountries() {
  const locale = useLocale();
  return useMemo(
    () =>
      [...ALL_COUNTRIES].sort((a, b) =>
        (locale === "en" ? a.en : a.fr).localeCompare(locale === "en" ? b.en : b.fr, locale === "en" ? "en" : "fr"),
      ),
    [locale],
  );
}

/** Pays avec recherche. La valeur reste le nom FR (« Cameroun »), quelle que soit la langue. */
export function CountrySelect({
  value,
  onChange,
  error,
  placeholder,
}: {
  value: string;
  /** Nom FR stocké, et code ISO (vide pour « Autre »). */
  onChange: (value: string, code: string) => void;
  error?: string;
  placeholder?: string;
}) {
  const t = useTranslations("countryPicker");
  const locale = useLocale();
  const countries = useSortedCountries();
  const options = useMemo<SearchOption[]>(
    () => [
      ...countries.map((c) => ({
        value: c.fr,
        label: locale === "en" ? c.en : c.fr,
        prefix: flagEmoji(c.code),
        keywords: `${c.fr} ${c.en} ${c.code}`,
      })),
      { value: OTHER_COUNTRY, label: t("other"), keywords: "autre other" },
    ],
    [countries, locale, t],
  );
  const priority = PRIORITY_COUNTRY_CODES.map((code) => countryByCode(code)!.fr);
  // Ancienne valeur inconnue de la liste (dossier antérieur) : affichée telle quelle.
  const withCurrent = value && !options.some((o) => o.value === value) ? [{ value, label: value }, ...options] : options;

  return (
    <SearchableSelect
      value={value}
      onChange={(v) => onChange(v, countryByValue(v)?.code ?? "")}
      options={withCurrent}
      priority={priority}
      placeholder={placeholder}
      error={error}
      labels={{ search: t("search"), noResults: t("noResults"), frequent: t("frequent"), all: t("all") }}
    />
  );
}

/**
 * Numéro WhatsApp : indicatif dans une liste (avec recherche) et numéro mis au format
 * du pays pendant la saisie. `value` est au format international (« +237699123456 »).
 */
export function PhoneInput({
  value,
  country,
  onChange,
  error,
}: {
  value: string;
  /** Code ISO de l'indicatif choisi (distingue USA / Canada, qui partagent le +1). */
  country: string;
  onChange: (value: string, country: string) => void;
  error?: string;
}) {
  const t = useTranslations("countryPicker");
  const locale = useLocale();
  const countries = useSortedCountries();
  const parsed = splitPhone(value, country);
  // Chiffres tels que saisis (garde un « 0 » initial, ex. 06… en France).
  const [typed, setTyped] = useState(parsed.digits);
  const code = country || parsed.code;
  const digits = toInternational(code, typed) === value ? typed : parsed.digits;

  const options = useMemo<SearchOption[]>(
    () =>
      countries.map((c) => ({
        value: c.code,
        label: locale === "en" ? c.en : c.fr,
        hint: `+${c.dial}`,
        prefix: flagEmoji(c.code),
        keywords: `${c.fr} ${c.en} ${c.code} ${c.dial} +${c.dial}`,
      })),
    [countries, locale],
  );
  const priority = PRIORITY_COUNTRY_CODES;
  const dial = countryByCode(code)?.dial ?? "";
  const example = phoneExample(code);

  function update(nextCode: string, nextDigits: string) {
    const clipped = nextDigits.slice(0, maxNationalDigits(nextCode));
    setTyped(clipped);
    onChange(toInternational(nextCode, clipped), nextCode);
  }

  return (
    <div className="flex gap-2">
      <div className="w-[118px] flex-shrink-0">
        <SearchableSelect
          value={code}
          onChange={(c) => update(c, digits)}
          options={options}
          priority={priority}
          ariaLabel={t("dial")}
          error={error}
          triggerClassName="!px-2.5"
          panelClassName="!w-[min(20rem,calc(100vw-32px))]"
          renderValue={(o) => (
            <span className="tabular-nums">
              {o.prefix} {o.hint}
            </span>
          )}
          labels={{ search: t("dialSearch"), noResults: t("noResults"), frequent: t("frequent"), all: t("all") }}
        />
      </div>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        aria-label={dial ? `${t("number")} (+${dial})` : t("number")}
        value={formatNational(code, digits)}
        onChange={(e) => {
          const raw = e.target.value.trim();
          // Numéro collé au format international : on bascule sur son indicatif.
          if (/^(\+|00)/.test(raw)) {
            const p = splitPhone(raw, code);
            update(p.code, p.digits);
          } else {
            update(code, raw.replace(/\D/g, ""));
          }
        }}
        placeholder={example || undefined}
        className={cn(error ? "field-error" : "field-input", "min-w-0 flex-1 tabular-nums")}
      />
    </div>
  );
}
