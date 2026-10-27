"use client";

/**
 * Proposition d'installation de la PWA. L'événement `beforeinstallprompt`
 * (Chrome, Edge, Android) arrive souvent avant que le bouton soit affiché :
 * on le capte au plus tôt et on le garde ici.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function captureInstallPrompt() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function canPromptInstall() {
  return deferred !== null;
}

export async function promptInstall() {
  if (!deferred) return "unavailable" as const;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  notify();
  return outcome;
}

/** Déjà lancée comme application installée (et non dans un onglet du navigateur). */
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone / iPad sous Safari : pas de beforeinstallprompt, installation manuelle via « Partager ». */
export function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Déconnexion : efface les pages et listes mises en cache sur l'appareil. */
export async function clearOfflineData() {
  const { clearAllDatasets } = await import("@/lib/offline/db");
  await clearAllDatasets().catch(() => {});
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  reg?.active?.postMessage({ type: "CLEAR_CACHE" });
  await navigator.clearAppBadge?.().catch(() => {});
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("odysseo-pages-")).map((k) => caches.delete(k)));
  }
}
