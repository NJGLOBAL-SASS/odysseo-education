"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/** Zone équipe (tableau de bord, connexion) : exclue de la mesure d'audience. */
const TEAM_PATH = /^\/(?:fr|en)\/(?:dashboard|login|verify-2fa|forgot-password|reset-password)(?:\/|$)/;

/**
 * Vercel Web Analytics (PACK-04) : mesure d'audience sans cookie ni donnée
 * personnelle, active pour tous les visiteurs. Les paramètres d'URL sont
 * retirés des pages vues (ils peuvent contenir un code de parrainage).
 */
export function WebAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        const url = new URL(event.url);
        if (TEAM_PATH.test(url.pathname)) return null;
        url.search = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
