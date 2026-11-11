"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";

import { copyText } from "@/lib/copy-text";

export function CopyLinkButton({ link }: { link: string }) {
  const t = useTranslations("partner");
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!(await copyText(link))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex gap-2">
      <input readOnly value={link} className="field-input flex-1 !text-sm" onFocus={(e) => e.target.select()} />
      <button onClick={copy} className="btn-dark !w-auto">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}
