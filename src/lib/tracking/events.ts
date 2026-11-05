/**
 * Événements de mesure (PACK-04), côté navigateur.
 * - Vercel Web Analytics : sans cookie, aucune donnée personnelle → toujours actif.
 * - Meta Pixel : seulement avec consentement marketing (géré dans meta-pixel.ts).
 */
import { track } from "@vercel/analytics";

import { metaTrack } from "./meta-pixel";

type Props = Record<string, string | number | boolean | null | undefined>;

function vercel(name: string, props?: Props) {
  try {
    track(name, props);
  } catch {
    // La mesure ne doit jamais casser l'interface.
  }
}

export function trackFormStepView(step: number) {
  vercel("form_step_view", { step });
}

/** Envoi réussi : Vercel (sans PII) + Meta Lead (event_id = code dossier, dédupliqué avec l'API Conversions). */
export function trackFormSubmitSuccess({ code, targetLevel }: { code: string; targetLevel: string }) {
  vercel("form_submit_success", { level: targetLevel });
  metaTrack("Lead", { content_category: targetLevel }, code);
}

/** source : emplacement du lien (« bouton_flottant », « footer », « faq », « form_done »… ou chemin de la page). */
export function trackWhatsappClick(source: string) {
  vercel("whatsapp_click", { source });
  metaTrack("Contact", { content_category: source });
}

export function trackBrochureDownload({ cursus, langue }: { cursus: string; langue: string }) {
  vercel("brochure_download", { cursus, langue });
}
