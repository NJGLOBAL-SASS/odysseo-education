"use client";

import { useEffect } from "react";

import { isChunkLoadError, reloadOnceForNewVersion } from "@/lib/chunk-error";

/** Dernier filet de sécurité (erreur dans la mise en page racine) : texte FR/EN sans dépendance. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
    if (isChunkLoadError(error)) reloadOnceForNewVersion();
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, sans-serif", background: "#F4F4F6", color: "#0B0B0D" }}>
        <main style={{ maxWidth: 520, margin: "0 auto", padding: "64px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Un problème est survenu</h1>
          <p style={{ color: "#5B5B66", fontSize: 15 }}>Rechargez la page. Si le problème continue, écrivez-nous sur WhatsApp.</p>
          <p style={{ color: "#5B5B66", fontSize: 14 }}>Something went wrong. Please reload the page.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, minHeight: 46, padding: "0 20px", border: 0, borderRadius: 12, background: "#FF0000", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
          >
            Recharger la page / Reload
          </button>
          {error.digest && <p style={{ marginTop: 16, fontSize: 12, color: "#5B5B66" }}>Réf. {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
