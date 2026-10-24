"use client";

import { useEffect } from "react";

/** Enregistre le service worker du dashboard pour permettre la consultation hors-ligne. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
