"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";

import { useRouter } from "@/i18n/navigation";

export default function PartnerAccessPage() {
  const t = useTranslations("partner");
  const router = useRouter();
  const [code, setCode] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.trim()) router.push(`/espace-partenaire/${code.trim().toUpperCase()}`);
  }

  return (
    <div className="wrap py-14">
      <div className="card p-6 text-center">
        <KeyRound className="mx-auto mb-2 h-8 w-8 text-rouge" />
        <h1 className="text-xl font-extrabold">{t("title")}</h1>
        <p className="mb-5 text-sm text-gris">
          Entrez votre code de parrainage pour accéder à votre espace.
        </p>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="AUDY-012"
            className="field-input text-center uppercase"
          />
          <button type="submit" className="btn-primary !w-auto">
            OK
          </button>
        </form>
      </div>
    </div>
  );
}
