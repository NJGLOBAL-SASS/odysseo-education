"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

import { useRouter } from "@/i18n/navigation";

export function PartnerLogoutButton() {
  const t = useTranslations("partner.space");
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/partner-space/logout", { method: "POST" }).catch(() => undefined);
        router.replace("/espace-partenaire");
      }}
      className="btn-sm-ghost"
    >
      <LogOut className="h-4 w-4" /> {t("logout")}
    </button>
  );
}
