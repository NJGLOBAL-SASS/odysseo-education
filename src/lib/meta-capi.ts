import { createHash } from "node:crypto";

/**
 * API Conversions Meta (PACK-04), côté serveur uniquement.
 *
 * Envoie l'événement « Lead » d'un dossier, avec le même event_id que le Pixel
 * du navigateur (le code dossier) : Meta ne le compte qu'une fois.
 * Conditions : META_CAPI_TOKEN + NEXT_PUBLIC_META_PIXEL_ID définis ET consentement
 * marketing transmis avec la candidature. Email et téléphone : uniquement hachés (SHA-256).
 * Ne lève jamais d'erreur : un échec Meta ne doit pas bloquer l'enregistrement du dossier.
 */
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v23.0";
const TIMEOUT_MS = 4000;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function hashEmail(email?: string | null) {
  const v = (email || "").trim().toLowerCase();
  return v ? sha256(v) : undefined;
}

/** Téléphone : chiffres uniquement, indicatif pays inclus (ex. +237 6 99… → 237699…). */
export function hashPhone(phone?: string | null) {
  const v = (phone || "").replace(/\D/g, "").replace(/^00/, "");
  return v ? sha256(v) : undefined;
}

export function isMetaCapiConfigured() {
  return Boolean(process.env.META_CAPI_TOKEN && process.env.NEXT_PUBLIC_META_PIXEL_ID);
}

export async function sendMetaLeadEvent(input: {
  eventId: string;
  email?: string | null;
  phone?: string | null;
  fbp?: string;
  fbc?: string;
  ip?: string;
  userAgent?: string;
  sourceUrl?: string;
  contentCategory?: string;
}) {
  const token = process.env.META_CAPI_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!token || !pixelId) return;

  const em = hashEmail(input.email);
  const ph = hashPhone(input.phone);
  const body = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.sourceUrl,
        user_data: {
          ...(em && { em: [em] }),
          ...(ph && { ph: [ph] }),
          ...(input.fbp && { fbp: input.fbp }),
          ...(input.fbc && { fbc: input.fbc }),
          ...(input.ip && { client_ip_address: input.ip }),
          ...(input.userAgent && { client_user_agent: input.userAgent }),
        },
        custom_data: input.contentCategory ? { content_category: input.contentCategory } : undefined,
      },
    ],
    // Code « Test Events » du gestionnaire d'événements, pour vérifier la réception (facultatif).
    ...(process.env.META_CAPI_TEST_EVENT_CODE && { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE }),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok) console.error("[meta-capi] réponse", res.status, (await res.text()).slice(0, 300));
  } catch (err) {
    console.error("[meta-capi] échec :", err instanceof Error ? err.message : err);
  }
}
