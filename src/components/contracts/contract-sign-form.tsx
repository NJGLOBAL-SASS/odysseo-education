"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Copy, Download, FileText, LayoutDashboard, PenLine } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Done = { code: string; link: string; downloadToken: string; number: string };

/**
 * Lecture puis signature (PACK-11) : la case ne s'active qu'en bas du contrat, le nom doit
 * correspondre à la demande, puis code à usage unique reçu par e-mail.
 */
export function ContractSignForm({ token, expectedName, otpMinutes, contract }: { token: string; expectedName: string; otpMinutes: number; contract: ReactNode }) {
  const t = useTranslations("partnerContract");
  const locale = useLocale();
  const boxRef = useRef<HTMLDivElement>(null);
  const [readToEnd, setReadToEnd] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState<"" | "otp" | "sign">("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const check = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReadToEnd(true);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, []);

  const errorText = (json: { error?: string; left?: number }) => {
    const key = json.error ?? "generic";
    if (key === "code") return t("errors.code", { left: json.left ?? 0 });
    if (["name", "codeBlocked", "codeExpired", "tooManyCodes", "noCode", "unavailable"].includes(key)) return t(`errors.${key as "name"}`);
    if (["invalid", "expired", "used"].includes(key)) return t("invalidTitle");
    return t("errors.generic");
  };

  async function requestCode() {
    setError("");
    if (!accepted) return setError(t("errors.accept"));
    setBusy("otp");
    const res = await fetch("/api/partner-contract/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, locale }),
    }).catch(() => null);
    setBusy("");
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) return setError(errorText(json));
    setSentTo(json.destination);
  }

  async function sign() {
    setError("");
    if (!accepted) return setError(t("errors.accept"));
    setBusy("sign");
    const res = await fetch("/api/partner-contract/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, code: code.trim(), accepted: true, locale }),
    }).catch(() => null);
    setBusy("");
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) return setError(errorText(json));
    setDone(json as Done);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <div className="card mt-6 animate-fade-up space-y-4 p-6">
        <h2 className="flex items-start gap-2 text-2xl font-extrabold">
          <CheckCircle2 className="mt-1 h-7 w-7 flex-shrink-0 text-ok" /> {t("doneTitle")}
        </h2>
        <p className="text-[15px] text-gris">{t("doneText")}</p>
        <div>
          <p className="mb-1 text-[13px] font-bold uppercase tracking-wide text-gris">{t("yourLink")}</p>
          <div className="flex gap-2">
            <input readOnly value={done.link} className="field-input min-w-0 flex-1 font-mono text-sm" onFocus={(e) => e.target.select()} />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(done.link).catch(() => undefined);
                setCopied(true);
              }}
              className="btn-dark !w-auto px-4"
            >
              <Copy className="h-4 w-4" /> {copied ? t("copied") : t("copy")}
            </button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <a href={`/api/partner-contract/signed?token=${encodeURIComponent(done.downloadToken)}`} className="btn-ghost !min-h-[48px]">
            <Download className="h-4 w-4" /> {t("download")}
          </a>
          <a href={`/${locale}/espace-partenaire/${done.code}`} className="btn-primary !min-h-[48px]">
            <LayoutDashboard className="h-4 w-4" /> {t("dashboard")}
          </a>
        </div>
        <p className="rounded-[10px] bg-fond p-3 text-[14px]">{t("kit")}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="card overflow-hidden">
        <div ref={boxRef} tabIndex={0} className="max-h-[65vh] overflow-y-auto p-5 sm:p-7" aria-label={t("title")}>
          {contract}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-bord bg-fond px-4 py-3">
          <a href={`/api/partner-contract/preview?token=${encodeURIComponent(token)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[14px] font-bold underline underline-offset-2">
            <FileText className="h-4 w-4" /> {t("preview")}
          </a>
          {!readToEnd && <span className="text-[13px] text-gris">{t("scrollHint")}</span>}
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <label className={cn("flex items-start gap-3 text-[15px]", readToEnd ? "cursor-pointer" : "cursor-not-allowed opacity-50")}>
          <input type="checkbox" disabled={!readToEnd} checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-5 w-5 flex-shrink-0 accent-noir" />
          <span>{t("accept")}</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-[15px] font-semibold">{t("name")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="field-input" />
          <span className="mt-1 block text-[13px] text-gris">{t("nameHint", { name: expectedName })}</span>
        </label>

        {!sentTo ? (
          <button type="button" onClick={requestCode} disabled={busy !== "" || !accepted || name.trim().length < 2} className="btn-dark !min-h-[50px]">
            {busy === "otp" && <Spinner />} {t("sendCode")}
          </button>
        ) : (
          <>
            <p className="rounded-[10px] bg-[#EAF7F0] p-3 text-[14px] text-ok">{t("codeSent", { destination: sentTo, minutes: otpMinutes })}</p>
            <label className="block">
              <span className="mb-1 block text-[15px] font-semibold">{t("code")}</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="field-input text-center text-2xl tracking-[0.4em]"
              />
            </label>
            <button type="button" onClick={sign} disabled={busy !== "" || code.length < 4} className="btn-primary !min-h-[52px] text-[16px]">
              {busy === "sign" ? <Spinner /> : <PenLine className="h-5 w-5" />} {busy === "sign" ? t("signing") : t("sign")}
            </button>
            <button type="button" onClick={requestCode} disabled={busy !== ""} className="text-[14px] font-semibold underline underline-offset-2">
              {t("resend")}
            </button>
          </>
        )}
        {error && (
          <p role="alert" className="text-[14px] font-semibold text-erreur">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
