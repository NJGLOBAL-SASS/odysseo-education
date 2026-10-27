"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

import { captureInstallPrompt } from "@/lib/pwa/install";
import { saveDataset } from "@/lib/offline/db";

// Listes consultables hors-ligne (mêmes clés que useOfflineDataset dans les panneaux).
const OFFLINE_DATASETS = [
  { resource: "candidatures", url: "/api/candidatures", key: "candidates" },
  { resource: "partenaires", url: "/api/partners", key: "partners" },
  { resource: "newsletter", url: "/api/newsletter", key: "subscribers" },
];

let installCaptured = false;

/**
 * Enregistre le service worker de la PWA équipe (notifications push, hors-ligne)
 * et, une fois connecté, précharge les pages principales et leurs données pour l'usage hors-ligne.
 */
export function ServiceWorkerRegister({ warm = false }: { warm?: boolean }) {
  const locale = useLocale();

  useEffect(() => {
    if (!installCaptured) {
      captureInstallPrompt();
      installCaptured = true;
    }
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async () => {
        if (!warm || !navigator.onLine) return;
        // Données des listes, pour qu'elles s'affichent même sans connexion.
        for (const d of OFFLINE_DATASETS) {
          fetch(d.url, { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => json && saveDataset(d.resource, json[d.key] ?? []))
            .catch(() => {});
        }
        const reg = await navigator.serviceWorker.ready;
        const base = `/${locale}/dashboard`;
        reg.active?.postMessage({
          type: "WARM_PAGES",
          paths: [base, `${base}/candidatures`, `${base}/partenaires`, `${base}/newsletter`],
        });
      })
      .catch(() => {});
  }, [warm, locale]);

  return null;
}
