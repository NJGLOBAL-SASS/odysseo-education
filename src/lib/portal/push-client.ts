"use client";

/**
 * Notifications push de l'espace étudiant, côté navigateur. État partagé entre la
 * bannière d'activation (toutes les pages) et la page « Mon compte » : activer à un
 * endroit met l'autre à jour.
 */

export type PushState = "checking" | "idle" | "working" | "on" | "denied" | "unsupported";

/** Contexte qui relance la proposition : après un message ou un envoi de documents. */
export type PushContext = "default" | "message" | "document";
export const PUSH_CONTEXT_EVENT = "odysseo:push-context";

let state: PushState = "checking";
let started = false;
const listeners = new Set<() => void>();

function set(next: PushState) {
  state = next;
  listeners.forEach((l) => l());
}

export function subscribePush(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void detect();
  }
  return () => listeners.delete(listener);
}

export const getPushState = () => state;
export const getServerPushState = (): PushState => "checking";

function supported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const raw = atob((base64String + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function save(sub: PushSubscription) {
  const res = await fetch("/api/portal/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  return res.ok;
}

async function subscribe(reg: ServiceWorkerRegistration) {
  const { publicKey } = (await (await fetch("/api/push/public-key")).json()) as { publicKey: string | null };
  if (!publicKey) return false;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
  return save(sub);
}

/**
 * État de l'appareil. Si la permission est déjà accordée, l'abonnement est (re)créé
 * et rattaché au compte connecté sans rien demander (ex. autre compte sur le même téléphone).
 */
async function detect() {
  if (!supported()) return set("unsupported");
  if (Notification.permission === "denied") return set("denied");
  if (Notification.permission === "default") return set("idle");
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    set((await subscribe(reg)) ? "on" : "idle");
  } catch {
    set("idle");
  }
}

/** Demande l'autorisation (à appeler depuis un clic) puis abonne l'appareil. */
export async function enablePush() {
  if (!supported()) return set("unsupported");
  set("working");
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return set(permission === "denied" ? "denied" : "idle");
    set((await subscribe(reg)) ? "on" : "idle");
  } catch {
    set("idle");
  }
}

/** Relance la proposition d'activation avec un message adapté (ex. après l'envoi d'un message). */
export function requestPushPrompt(context: PushContext) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PushContext>(PUSH_CONTEXT_EVENT, { detail: context }));
}
