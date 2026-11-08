"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { isChunkLoadError, reloadOnceForNewVersion } from "@/lib/chunk-error";

/**
 * Remplace l'écran brut « Application error » (erreur côté navigateur).
 * Après un déploiement, un onglet resté ouvert ne trouve plus les anciens fichiers :
 * la page se recharge alors une fois d'elle-même.
 */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  const update = isChunkLoadError(error);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    console.error(error);
    if (update && reloadOnceForNewVersion()) setReloading(true);
  }, [error, update]);

  return (
    <div className="wrap-site flex min-h-[60vh] max-w-[560px] flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fond">
        <RefreshCw className={reloading ? "h-6 w-6 animate-spin text-rouge" : "h-6 w-6 text-rouge"} />
      </div>
      <h1 className="text-2xl font-extrabold">{update ? t("updateTitle") : t("title")}</h1>
      <p className="mt-2 text-[15px] text-gris">{update ? t("updateText") : t("text")}</p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" onClick={() => (update ? window.location.reload() : reset())} className="btn-primary">
          <RefreshCw className="h-4 w-4" /> {t("reload")}
        </button>
        <Link href="/" className="btn-ghost">
          {t("home")}
        </Link>
      </div>
      {error.digest && <p className="mt-4 text-[12px] text-gris">{t("reference", { digest: error.digest })}</p>}
    </div>
  );
}
