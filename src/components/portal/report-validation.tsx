"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

/** Case des conditions générales + « Je valide mon dossier » (étudiant seulement). */
export function ReportValidation({ version, termsUrl }: { version: number; termsUrl: string }) {
  const t = useTranslations("portal.report");
  const router = useRouter();
  const [terms, setTerms] = useState(false);
  const [state, setState] = useState<{ loading?: boolean; error?: string }>({});

  async function validate() {
    if (!terms) return setState({ error: t("errors.terms") });
    setState({ loading: true });
    const res = await fetch("/api/portal/report/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version, terms: true }),
    }).catch(() => null);
    if (res?.ok) return router.refresh();
    const error = res ? ((await res.json().catch(() => ({}))) as { error?: string }).error : null;
    setState({ error: error === "outdated" ? t("outdated") : t("errors.generic") });
    if (error === "outdated") router.refresh();
  }

  return (
    <div className="card space-y-3 p-5">
      <label className="flex cursor-pointer items-start gap-3 text-[15px]">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-5 w-5 flex-shrink-0 accent-noir" />
        <span>
          {t.rich("terms", {
            link: (c) => (
              <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
                {c}
              </a>
            ),
          })}
        </span>
      </label>
      {state.error && (
        <p role="alert" className="text-[14px] font-semibold text-erreur">
          {state.error}
        </p>
      )}
      <button type="button" onClick={validate} disabled={state.loading} className="btn-primary !min-h-[50px]">
        {state.loading ? <Spinner /> : <CheckCircle2 className="h-5 w-5" />} {t("validate")}
      </button>
    </div>
  );
}
