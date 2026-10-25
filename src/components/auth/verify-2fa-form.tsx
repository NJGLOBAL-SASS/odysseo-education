"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

export function Verify2FAForm() {
  const t = useTranslations("auth.verify2fa");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || t("error"));
        return;
      }

      const result = await signIn("credentials", {
        mode: "2fa-assertion",
        assertionToken: json.assertionToken,
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
      <div className="card p-6 text-center">
        <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-rouge" />
        <h1 className="text-xl font-extrabold">{t("title")}</h1>
        <p className="mb-5 text-sm text-gris">{t("subtitle")}</p>

        <form onSubmit={onSubmit} className="space-y-3.5">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="field-input text-center text-2xl tracking-[0.5em]"
          />

          {error && <p className="text-sm font-semibold text-erreur">{error}</p>}

          <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
            {loading && <Spinner />}
            {t("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
