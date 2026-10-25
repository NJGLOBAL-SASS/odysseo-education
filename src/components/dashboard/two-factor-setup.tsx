"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const t = useTranslations("dashboard.settings");
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [done, setDone] = useState(enabled);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function startEnrollment() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur");
      setQr(json.qrDataUrl);
      setSecret(json.secret);
      setEnrolling(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, code }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erreur");
        return;
      }
      setDone(true);
      setEnrolling(false);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-ok">
        <ShieldCheck className="h-4 w-4" /> 2FA activée sur ce compte.
      </p>
    );
  }

  if (!enrolling) {
    return (
      <div>
        <button onClick={startEnrollment} disabled={loading} className="btn-sm-dark">
          {loading && <Spinner />}
          {t("enable2fa")}
        </button>
        {error && <p className="mt-2 text-sm text-erreur">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-xs">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {qr && <img src={qr} alt="QR code 2FA" width={180} height={180} />}
      <p className="my-2 text-xs text-gris">
        Scannez ce QR code avec Google Authenticator ou Authy, puis entrez le code généré.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        maxLength={6}
        placeholder="123456"
        className="field-input mb-2 text-center tracking-[0.4em]"
      />
      {error && <p className="mb-2 text-sm text-erreur">{error}</p>}
      <button onClick={confirm} disabled={code.length !== 6 || loading} className="btn-sm-primary w-full">
        {loading && <Spinner />}
        {loading ? "Vérification…" : "Confirmer"}
      </button>
    </div>
  );
}
