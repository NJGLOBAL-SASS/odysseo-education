"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Aperçu léger d'un PDF (pdf.js, toutes les pages à la largeur de l'écran), lisible sur
 * téléphone, sans dépendre des traductions : page publique /rapport et fiche équipe.
 */
export function PdfPages({ src, loadingLabel, errorLabel, className = "" }: { src: string; loadingLabel: string; errorLabel: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    setState("loading");
    container.replaceChildren();
    (async () => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      const doc = await pdfjs.getDocument({ url: src, withCredentials: true }).promise;
      destroy = () => void doc.destroy();
      if (cancelled) return;
      const width = Math.max(240, container.clientWidth);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      for (let n = 1; n <= doc.numPages && !cancelled; n++) {
        const page = await doc.getPage(n);
        const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        canvas.className = "mb-2 block rounded bg-white shadow-sm";
        container.appendChild(canvas);
        const ctx = canvas.getContext("2d");
        if (ctx) await page.render({ canvasContext: ctx, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined }).promise;
        if (n === 1 && !cancelled) setState("ready");
      }
    })().catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [src]);

  return (
    <div className={className}>
      {state === "loading" && <p className="py-10 text-center text-sm text-gris">{loadingLabel}</p>}
      {state === "error" && <p className="py-10 text-center text-sm text-gris">{errorLabel}</p>}
      <div ref={ref} />
    </div>
  );
}
