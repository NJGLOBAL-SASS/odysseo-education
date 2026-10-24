"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Chrome } from "lucide-react";

export function LoginForm() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap py-14">
      <div className="card p-6">
        <h1 className="text-xl font-extrabold">{t("title")}</h1>
        <p className="mb-5 text-sm text-gris">{t("subtitle")}</p>

        <form onSubmit={onSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[15px] font-semibold">{t("email")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[15px] font-semibold">{t("password")}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input"
            />
          </div>

          {error && <p className="text-sm font-semibold text-erreur">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {t("submit")}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase text-gris">
          <span className="h-px flex-1 bg-bord" />
          {t("or")}
          <span className="h-px flex-1 bg-bord" />
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="btn-ghost w-full"
        >
          <Chrome className="h-4 w-4" /> {t("googleButton")}
        </button>
      </div>
    </div>
  );
}
