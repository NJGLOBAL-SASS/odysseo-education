"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Mail } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

/** Espace partenaire : le contrat signé est renvoyé par e-mail (jamais téléchargé depuis une page ouverte avec le seul code). */
export function EmailContractButton({ code, label, doneLabel }: { code: string; label: string; doneLabel: string }) {
  const locale = useLocale();
  const [state, setState] = useState<"" | "busy" | "done">("");
  async function send() {
    setState("busy");
    const res = await fetch(`/api/partner-contract/email?locale=${locale}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => null);
    setState(res?.ok ? "done" : "");
  }
  if (state === "done") return <p className="text-sm font-semibold text-ok">{doneLabel}</p>;
  return (
    <button type="button" onClick={send} disabled={state === "busy"} className="btn-sm-ghost">
      {state === "busy" ? <Spinner /> : <Mail className="h-4 w-4" />} {label}
    </button>
  );
}
