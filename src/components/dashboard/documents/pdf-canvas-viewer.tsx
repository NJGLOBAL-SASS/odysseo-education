"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ZoomIn, ZoomOut } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";

type PdfDocument = import("pdfjs-dist").PDFDocumentProxy;

/**
 * Rendu PDF avec pdf.js, pour les navigateurs sans lecteur PDF intégré
 * (Chrome Android, PWA installée...) : chaque page est dessinée dans un canvas.
 */
export function PdfCanvasViewer({ src, onError }: { src: string; onError: () => void }) {
  const t = useTranslations("dashboard.documents.viewer");
  const containerRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;
    let loaded: PdfDocument | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        // Servi depuis public/ (copié à l'installation, voir scripts/copy-pdf-worker.mjs).
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        loaded = await pdfjs.getDocument({ url: src, withCredentials: true }).promise;
        if (cancelled) loaded.destroy();
        else setDoc(loaded);
      } catch {
        if (!cancelled) onError();
      }
    })();
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [src, onError]);

  useEffect(() => {
    const container = containerRef.current;
    if (!doc || !container) return;
    let cancelled = false;
    container.replaceChildren();

    (async () => {
      const width = container.clientWidth - 16;
      const ratio = window.devicePixelRatio || 1;
      for (let n = 1; n <= doc.numPages && !cancelled; n++) {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (width / base.width) * zoom });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.className = "mx-auto mb-3 block bg-white shadow-sm";
        container.appendChild(canvas);
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined }).promise;
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [doc, zoom]);

  return (
    <div className="relative h-full">
      {!doc && (
        <div className="flex h-full items-center justify-center text-white/70">
          <Spinner className="h-6 w-6" />
        </div>
      )}
      <div ref={containerRef} className="h-full overflow-auto p-2" />
      {doc && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-noir/80 p-1 text-white shadow-pop">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="rounded-full p-2 hover:bg-white/10" aria-label={t("zoomOut")}>
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-[3.5rem] text-center text-xs tabular-nums">
            {Math.round(zoom * 100)}% · {t("pages", { count: doc.numPages })}
          </span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="rounded-full p-2 hover:bg-white/10" aria-label={t("zoomIn")}>
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
