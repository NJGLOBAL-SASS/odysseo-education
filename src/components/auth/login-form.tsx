"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Chrome, Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

export function LoginForm() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  // Erreurs renvoyées par Auth.js après un aller-retour Google (?error=...).
  const oauthError = searchParams.get("error");
  const [error, setError] = useState(
    oauthError === "AccessDenied"
      ? t("googleDenied")
      : oauthError
        ? t("googleError")
        : ""
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/password-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || t("error"));
        setLoading(false);
        return;
      }

      if (json.twoFactorRequired) {
        router.push(`/verify-2fa?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      const result = await signIn("credentials", {
        mode: "password",
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("error"));
        setLoading(false);
        return;
      }

      // Le loader reste affiché jusqu'à l'arrivée sur le dashboard.
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError(t("error"));
      setLoading(false);
    }
  }

  const busy = loading || googleLoading;

  return (
    <div className="wrap py-12 sm:py-16">
      <div className="card animate-fade-up p-6 sm:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo/logo-mark-black-tight.png" alt="" className="mb-5 h-10 w-auto" />
        <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mb-6 text-sm text-gris">{t("subtitle")}</p>

        <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
              {t("email")}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                className="field-input pl-9 disabled:opacity-60"
                placeholder="prenom@odysseo-education.com"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor="password" className="block text-sm font-semibold">
                {t("password")}
              </label>
              <Link href="/forgot-password" className="text-xs font-semibold text-gris hover:text-noir hover:underline">
                {t("forgot")}
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                disabled={busy}
                className="field-input px-9 pr-11 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gris transition-colors hover:bg-fond hover:text-noir"
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                aria-pressed={showPassword}
                title={showPassword ? t("hidePassword") : t("showPassword")}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {capsLock && <p className="mt-1.5 text-xs font-semibold text-[#8A6200]">{t("capsLock")}</p>}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-[10px] border border-erreur/30 bg-erreur-fond px-3 py-2.5 text-sm font-semibold text-erreur">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {loading && <Spinner />}
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-gris">
          <span className="h-px flex-1 bg-bord" />
          {t("or")}
          <span className="h-px flex-1 bg-bord" />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setGoogleLoading(true);
            signIn("google", { callbackUrl });
          }}
          className="btn-ghost w-full transition-colors hover:bg-fond disabled:opacity-60"
        >
          {googleLoading ? <Spinner /> : <Chrome className="h-4 w-4" />} {t("googleButton")}
        </button>
      </div>
    </div>
  );
}

/** Affiché pendant le chargement de la page de connexion (Suspense / loading.tsx). */
export function LoginFormSkeleton() {
  return (
    <div className="wrap py-12 sm:py-16">
      <div className="card p-6 sm:p-8">
        <Skeleton className="mb-4 h-10 w-10 rounded-full" />
        <Skeleton className="mb-2 h-7 w-44" />
        <Skeleton className="mb-7 h-4 w-64" />
        <Skeleton className="mb-2 h-4 w-16" />
        <Skeleton className="mb-5 h-[46px] w-full rounded-[10px]" />
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="mb-6 h-[46px] w-full rounded-[10px]" />
        <Skeleton className="mb-5 h-[50px] w-full rounded-brand" />
        <Skeleton className="h-[50px] w-full rounded-brand" />
      </div>
    </div>
  );
}
