export const COOKIE_CONSENT_STORAGE_KEY = "odysseo_cookie_consent";
export const OPEN_COOKIE_SETTINGS_EVENT = "odysseo:open-cookie-settings";

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export function getStoredCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CookieConsent) : null;
  } catch {
    return null;
  }
}

/** Rouvre le bandeau de consentement (ex. depuis le footer ou la page Cookies). */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
