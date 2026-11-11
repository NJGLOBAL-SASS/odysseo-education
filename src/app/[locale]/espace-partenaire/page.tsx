"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "@/i18n/navigation";

type ErrorKey = "notFound" | "code" | "expired" | "tooMany" | "unavailable" | "generic";

/** Connexion à l'espace partenaire : e-mail ou numéro, puis code reçu par e-mail (session de 90 jours). */
export default function PartnerAccessPage() {
  const t = useTranslations("partner.space");
  const locale = useLocale();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<{ destination: string; minutes: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | "">("");

  async function post(url: string, body: unknown) {
    setBusy(true);
    setError("");
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) setError((["notFound", "code", "expired", "tooMany", "unavailable"].includes(json.error) ? json.error : "generic") as ErrorKey);
    return res?.ok ? json : null;
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    const json = await post("/api/partner-space/code", { identifier, locale });
    if (json) setSent({ destination: json.destination, minutes: json.minutes });
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    const json = await post("/api/partner-space/verify", { code });
    if (json?.code) router.replace(`/espace-partenaire/${json.code}`);
  }

  return (
    <div className="wrap py-14">
      <div className="card mx-auto max-w-md p-6">
        <KeyRound className="mx-auto mb-2 h-8 w-8 text-rouge" />
        <h1 className="text-center text-xl font-extrabold">{t("loginTitle")}</h1>
        <p className="mb-5 mt-1 text-center text-sm text-gris">{t("loginIntro")}</p>
        {!sent ? (
          <form onSubmit={sendCode} className="space-y-3">
            <label className="block text-sm font-semibold" htmlFor="pid">
              {t("identifier")}
            </label>
            <input id="pid" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="email" className="field-input" required />
            <button type="submit" disabled={busy} className="btn-primary">
              {busy && <Spinner />} {t("sendCode")}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <p className="rounded-[10px] bg-fond p-3 text-sm">{t("codeSent", sent)}</p>
            <label className="block text-sm font-semibold" htmlFor="pcode">
              {t("code")}
            </label>
            <input
              id="pcode"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="field-input text-center text-2xl font-extrabold tracking-[0.4em]"
              required
            />
            <button type="submit" disabled={busy || code.length !== 6} className="btn-primary">
              {busy && <Spinner />} {t("verify")}
            </button>
            <button
              type="button"
              onClick={() => {
                setSent(null);
                setCode("");
                setError("");
              }}
              className="w-full text-center text-sm font-semibold underline underline-offset-2"
            >
              {t("changeIdentifier")}
            </button>
            <p className="text-center text-xs text-gris">{t("stayLoggedIn")}</p>
          </form>
        )}
        {error && <p className="mt-3 rounded-[10px] bg-[#FFEDED] p-3 text-sm font-semibold text-rouge-fonce">{t(`errors.${error}`)}</p>}
      </div>
    </div>
  );
}
