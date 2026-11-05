"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { COOKIE_CONSENT_CHANGED_EVENT } from "@/lib/cookie-consent";
import { captureAttributionClient, getAttributionClient, looksLikeOfferRef } from "@/lib/attribution";
import { loadMetaPixel, metaTrack, revokeMetaPixel, hasMarketingConsent } from "@/lib/tracking/meta-pixel";
import { trackBrochureDownload, trackWhatsappClick } from "@/lib/tracking/events";

/** Pages qui déclenchent ViewContent : /fr/cursus/master, /en/offres/P-04 (PACK-03)... */
const CONTENT_PAGE = /^\/(?:fr|en)\/(cursus|offres)\/([^/?#]+)/;

/**
 * Mesure du site public (PACK-04), montée dans le layout (marketing) :
 * - capture l'origine du visiteur (UTM, fbclid, ref) à chaque page ;
 * - charge / retire le Meta Pixel selon le consentement marketing, envoie PageView et ViewContent ;
 * - suit les clics WhatsApp (tous les liens wa.me) et les téléchargements de brochure (data-track).
 */
export function SiteTracking() {
  const pathname = usePathname();
  const pixelReady = useRef(false);

  // Consentement : au chargement, puis à chaque changement dans le bandeau.
  useEffect(() => {
    pixelReady.current = loadMetaPixel();

    function onConsentChanged() {
      if (hasMarketingConsent()) {
        const wasReady = pixelReady.current;
        pixelReady.current = loadMetaPixel();
        // Consentement donné en cours de visite : on compte la page courante.
        if (!wasReady && pixelReady.current) trackPage(window.location.pathname);
      } else {
        revokeMetaPixel();
        pixelReady.current = false;
      }
    }
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, onConsentChanged);
  }, []);

  // Chaque page (y compris navigation côté client).
  useEffect(() => {
    captureAttributionClient();
    if (pixelReady.current) trackPage(pathname);
  }, [pathname]);

  // Clics : délégation sur le document (les liens peuvent être rendus côté serveur).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const link = (e.target as HTMLElement | null)?.closest?.("a");
      if (!link) return;
      const href = link.getAttribute("href") || "";

      if (link.dataset.track === "brochure_download") {
        trackBrochureDownload({ cursus: link.dataset.trackCursus || "", langue: link.dataset.trackLangue || "" });
        return;
      }
      if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) {
        trackWhatsappClick(link.dataset.trackLocation || window.location.pathname);
      }
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}

function trackPage(pathname: string) {
  metaTrack("PageView");
  const match = CONTENT_PAGE.exec(pathname);
  if (!match) return;
  const [, kind, slug] = match;
  const ref = kind === "offres" ? decodeURIComponent(slug) : getAttributionClient()?.ref;
  metaTrack("ViewContent", {
    content_name: decodeURIComponent(slug),
    content_type: kind === "offres" ? "offer" : "program",
    ...(looksLikeOfferRef(ref) && { content_ids: [ref!.toUpperCase()] }),
  });
}
