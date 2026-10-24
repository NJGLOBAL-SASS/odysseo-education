"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail, CheckCircle2 } from "lucide-react";

export function NewsletterForm() {
  const t = useTranslations("newsletter");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <Mail className="mx-auto mb-2 h-6 w-6 text-rouge" />
      <h3 className="text-lg font-extrabold">{t("title")}</h3>
      <p className="mb-4 text-sm text-gris">{t("subtitle")}</p>

      {status === "done" ? (
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-ok">
          <CheckCircle2 className="h-4 w-4" /> {t("success")}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            placeholder={t("placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
          <button type="submit" disabled={status === "sending"} className="btn-primary !w-auto">
            {t("submit")}
          </button>
        </form>
      )}
      {status === "error" && <p className="mt-2 text-sm text-erreur">{t("error")}</p>}
    </div>
  );
}
