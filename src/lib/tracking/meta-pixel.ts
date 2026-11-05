/**
 * Meta Pixel (PACK-04) — chargé UNIQUEMENT après consentement « marketing ».
 *
 * - NEXT_PUBLIC_META_PIXEL_ID vide → rien n'est jamais chargé.
 * - Consentement donné en cours de visite → le script est chargé à ce moment-là.
 * - Consentement retiré → fbq("consent", "revoke"), script retiré et plus aucun événement envoyé.
 * - Aucune donnée personnelle (nom, email, téléphone) n'est envoyée par le navigateur.
 */
import { getStoredCookieConsent } from "@/lib/cookie-consent";

export const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID || "").trim();
const SCRIPT_ID = "odysseo-meta-pixel";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: unknown;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let initialized = false;

export function hasMarketingConsent() {
  return getStoredCookieConsent()?.marketing === true;
}

function canTrack() {
  return Boolean(META_PIXEL_ID) && initialized && hasMarketingConsent() && typeof window.fbq === "function";
}

/** Charge le pixel si (et seulement si) l'ID est configuré et le consentement marketing donné. */
export function loadMetaPixel() {
  if (typeof window === "undefined" || !META_PIXEL_ID || !hasMarketingConsent()) return false;

  if (initialized && window.fbq) {
    window.fbq("consent", "grant");
    return true;
  }

  // Code d'amorçage officiel de Meta (file d'attente fbq), réécrit sans eval.
  if (!window.fbq) {
    const fbq: Fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue!.push(args);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
  }

  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq("consent", "grant");
  window.fbq("init", META_PIXEL_ID);
  initialized = true;
  return true;
}

/** Consentement retiré : plus aucun événement, et le script est retiré de la page. */
export function revokeMetaPixel() {
  if (typeof window === "undefined" || !initialized) return;
  try {
    window.fbq?.("consent", "revoke");
  } catch {
    // ignore
  }
  document.getElementById(SCRIPT_ID)?.remove();
  initialized = false;
}

/** Événement standard Meta (PageView, ViewContent, Lead, Contact). event_id sert à la déduplication avec l'API Conversions. */
export function metaTrack(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (!canTrack()) return;
  if (eventId) window.fbq!("track", event, params ?? {}, { eventID: eventId });
  else window.fbq!("track", event, params ?? {});
}

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Identifiants navigateur Meta (_fbp, _fbc) à transmettre à l'API Conversions.
 * Uniquement avec consentement marketing. _fbc est reconstitué depuis fbclid si besoin.
 */
export function getMetaBrowserIds(fbclid?: string, clickedAt?: string) {
  if (typeof document === "undefined" || !hasMarketingConsent()) return {};
  const fbp = readCookie("_fbp");
  const clickTime = (clickedAt && new Date(clickedAt).getTime()) || Date.now();
  const fbc = readCookie("_fbc") || (fbclid ? `fb.1.${clickTime}.${fbclid}` : undefined);
  return { fbp, fbc };
}
