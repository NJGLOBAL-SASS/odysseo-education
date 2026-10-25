"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, KeyRound, Lock, Mail, MailCheck, ShieldX } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap py-12 sm:py-16">
      <div className="card animate-fade-up p-6 sm:p-8">{children}</div>
    </div>
  );
}

function IconBadge({ icon: Icon, tone = "noir" }: { icon: typeof Mail; tone?: "noir" | "ok" | "erreur" }) {
  return (
    <span
      className={cn(
        "mb-5 flex h-11 w-11 items-center justify-center rounded-full",
        tone === "ok" && "bg-[#E1F6EA] text-ok",
        tone === "erreur" && "bg-erreur-fond text-erreur",
        tone === "noir" && "bg-noir text-white"
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-erreur/30 bg-erreur-fond px-3 py-2.5 text-sm font-semibold text-erreur">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      {message}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const t = useTranslations("auth.login");
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoComplete="new-password"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="field-input pl-9 pr-11 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gris transition-colors hover:bg-fond hover:text-noir"
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Shell>
        <IconBadge icon={MailCheck} tone="ok" />
        <h1 className="text-2xl font-extrabold tracking-tight">{t("sentTitle")}</h1>
        <p className="mb-6 mt-1 text-sm text-gris">{t("sentText", { email })}</p>
        <Link href="/login" className="btn-ghost w-full hover:bg-fond">
          <ArrowLeft className="h-4 w-4" /> {t("back")}
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <IconBadge icon={KeyRound} />
      <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="mb-6 mt-1 text-sm text-gris">{t("subtitle")}</p>

      <form onSubmit={onSubmit} className="space-y-4">
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
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="field-input pl-9 disabled:opacity-60"
            />
          </div>
        </div>

        {error && <ErrorBox message={error} />}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Spinner />}
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>

      <Link
        href="/login"
        className="mt-5 flex items-center justify-center gap-1.5 text-sm font-semibold text-gris hover:text-noir"
      >
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>
    </Shell>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth.reset");
  const token = useSearchParams().get("token") || "";
  const [status, setStatus] = useState<"checking" | "invalid" | "ready" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    fetch(`/api/auth/password-reset/confirm?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j: { valid: boolean }) => setStatus(j.valid ? "ready" : "invalid"))
      .catch(() => setStatus("invalid"));
  }, [token]);

  const rules = [
    { key: "length", ok: password.length >= 8 },
    { key: "letter", ok: /[A-Za-z]/.test(password) },
    { key: "digit", ok: /\d/.test(password) },
  ] as const;
  const valid = rules.every((r) => r.ok);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (res.status === 410) {
        setStatus("invalid");
        return;
      }
      if (!res.ok) {
        setError(json.error);
        return;
      }
      setStatus("done");
    } catch {
      setError(t("invalidText"));
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking") return <PasswordResetSkeleton />;

  if (status === "invalid") {
    return (
      <Shell>
        <IconBadge icon={ShieldX} tone="erreur" />
        <h1 className="text-2xl font-extrabold tracking-tight">{t("invalidTitle")}</h1>
        <p className="mb-6 mt-1 text-sm text-gris">{t("invalidText")}</p>
        <Link href="/forgot-password" className="btn-primary w-full">
          {t("newRequest")}
        </Link>
      </Shell>
    );
  }

  if (status === "done") {
    return (
      <Shell>
        <IconBadge icon={Check} tone="ok" />
        <h1 className="text-2xl font-extrabold tracking-tight">{t("doneTitle")}</h1>
        <p className="mb-6 mt-1 text-sm text-gris">{t("doneText")}</p>
        <Link href="/login" className="btn-primary w-full">
          {t("goLogin")}
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <IconBadge icon={KeyRound} />
      <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="mb-6 mt-1 text-sm text-gris">{t("subtitle")}</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordField id="password" label={t("password")} value={password} onChange={setPassword} disabled={loading} autoFocus />

        <ul className="grid gap-1 text-xs sm:grid-cols-3">
          {rules.map((r) => (
            <li key={r.key} className={cn("flex items-center gap-1.5", r.ok ? "text-ok" : "text-gris")}>
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full",
                  r.ok ? "bg-ok text-white" : "border border-bord"
                )}
              >
                {r.ok && <Check className="h-3 w-3" />}
              </span>
              {t(`rules.${r.key}`)}
            </li>
          ))}
        </ul>

        <PasswordField id="confirm" label={t("confirm")} value={confirm} onChange={setConfirm} disabled={loading} />
        {confirm && confirm !== password && <p className="-mt-2 text-xs font-semibold text-erreur">{t("mismatch")}</p>}

        {error && <ErrorBox message={error} />}

        <button type="submit" disabled={loading || !valid || !confirm} className="btn-primary w-full">
          {loading && <Spinner />}
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>
    </Shell>
  );
}

export function PasswordResetSkeleton() {
  return (
    <div className="wrap py-12 sm:py-16">
      <div className="card p-6 sm:p-8">
        <Skeleton className="mb-5 h-11 w-11 rounded-full" />
        <Skeleton className="mb-2 h-7 w-52" />
        <Skeleton className="mb-7 h-4 w-full" />
        <Skeleton className="mb-2 h-4 w-28" />
        <Skeleton className="mb-6 h-[46px] w-full rounded-[10px]" />
        <Skeleton className="h-[50px] w-full rounded-brand" />
      </div>
    </div>
  );
}
