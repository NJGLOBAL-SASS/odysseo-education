"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Spinner } from "@/components/ui/spinner";
import { isAcceptablePassword } from "@/lib/portal/password";

function ErrorBox({ message }: { message: string }) {
  return (
    <p role="alert" className="mb-3 flex items-start gap-2 rounded-[10px] border-[1.5px] border-erreur bg-erreur-fond p-3 text-[14px] font-semibold text-erreur">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      {message}
    </p>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="mb-3.5 block">
      <span className="mb-1.5 block text-[15px] font-semibold">{label}</span>
      <input {...rest} className="field-input" />
    </label>
  );
}

/** Bouton « Continuer avec Google » (connexion réservée aux comptes ouverts par l'équipe). */
export function GoogleButton({ label, next }: { label: string; next?: string }) {
  const locale = useLocale();
  const href = `/api/portal/oauth/google?locale=${locale}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  return (
    <a href={href} className="btn w-full border-[1.5px] border-bord bg-white text-noir hover:border-noir">
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.3-.4-3.5z" />
      </svg>
      {label}
    </a>
  );
}

export function LoginForm({ initialError, next }: { initialError?: string; next?: string }) {
  const t = useTranslations("portal.login");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    initialError && ["google", "googleUnknown"].includes(initialError) ? t(`errors.${initialError as "google"}`) : "",
  );
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.ok) {
        router.replace(next && /^\/(fr|en)\/espace(\/|$)/.test(next) ? next : `/${locale}/espace`);
        router.refresh();
        return;
      }
      const code = res.status === 429 ? "tooMany" : res.status === 401 || res.status === 400 ? "invalid" : "generic";
      setError(t(`errors.${code}`));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <ErrorBox message={error} />}
      <GoogleButton label={t("google")} next={next} />
      <p className="my-4 flex items-center gap-3 text-[13px] text-gris before:h-px before:flex-1 before:bg-bord after:h-px after:flex-1 after:bg-bord">{t("or")}</p>
      <form onSubmit={submit} noValidate>
        <Input label={t("email")} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label={t("password")} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" disabled={loading || !email || !password} className="btn-primary w-full">
          {loading && <Spinner />} {t("submit")}
        </button>
      </form>
      <p className="mt-4 text-center text-[14px]">
        <Link href="/espace/mot-de-passe-oublie" className="font-semibold underline underline-offset-2">
          {t("forgot")}
        </Link>
      </p>
      <p className="mt-4 text-center text-[13px] text-gris">{t("noAccount")}</p>
    </div>
  );
}

/** Choix du mot de passe : activation (invite) ou réinitialisation (reset). */
export function PasswordSetupForm({ token, purpose }: { token: string; purpose: "invite" | "reset" }) {
  const t = useTranslations("portal.activate");
  const tLogin = useTranslations("portal.login");
  const locale = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isAcceptablePassword(password)) return setError(t("errors.weakPassword"));
    if (password !== confirm) return setError(t("errors.mismatch"));
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/portal/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, purpose }),
      });
      if (res.ok) {
        router.replace(`/${locale}/espace`);
        router.refresh();
        return;
      }
      const json = await res.json().catch(() => ({}));
      setError(t(`errors.${["weakPassword", "expired"].includes(json.error) ? json.error : "generic"}` as "errors.generic"));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <ErrorBox message={error} />}
      <form onSubmit={submit} noValidate>
        <Input label={t("password")} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label={t("confirm")} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <p className="-mt-1.5 mb-4 text-[13px] text-gris">{t("rule")}</p>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Spinner />} {purpose === "invite" ? t("submit") : t("submitReset")}
        </button>
      </form>
      {purpose === "invite" && (
        <>
          <p className="my-4 flex items-center gap-3 text-[13px] text-gris before:h-px before:flex-1 before:bg-bord after:h-px after:flex-1 after:bg-bord">{t("google")}</p>
          <GoogleButton label={tLogin("google")} />
        </>
      )}
    </div>
  );
}

export function ForgotForm() {
  const t = useTranslations("portal.forgot");
  const tErr = useTranslations("portal.login.errors");
  const tLogin = useTranslations("portal.login");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/portal/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 429) setError(tErr("tooMany"));
      else if (!res.ok) setError(tErr("generic"));
      else setSent(true);
    } catch {
      setError(tErr("generic"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="flex items-start gap-2 rounded-[10px] bg-fond p-3 text-[15px]">
        <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-ok" />
        {t("sent")}
      </p>
    );
  }
  return (
    <form onSubmit={submit} noValidate>
      {error && <ErrorBox message={error} />}
      <Input label={tLogin("email")} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit" disabled={loading || !email.includes("@")} className="btn-primary w-full">
        {loading && <Spinner />} {t("submit")}
      </button>
    </form>
  );
}
