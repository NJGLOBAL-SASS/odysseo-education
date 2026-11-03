"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Download, FileQuestion, X } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { fileUrl, formatBytes, previewKind } from "@/lib/documents";
import type { DocumentFileView } from "./types";

const PdfCanvasViewer = dynamic(() => import("./pdf-canvas-viewer").then((m) => m.PdfCanvasViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-white/70">
      <Spinner className="h-6 w-6" />
    </div>
  ),
});

const TEXT_PREVIEW_LIMIT = 200_000;

function TextPreview({ src }: { src: string }) {
  const t = useTranslations("dashboard.documents.viewer");
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    fetch(src, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((body) => !cancelled && setText(body))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (failed) return <p className="p-6 text-center text-white/80">{t("loadFailed")}</p>;
  if (text === null)
    return (
      <div className="flex h-full items-center justify-center text-white/70">
        <Spinner className="h-6 w-6" />
      </div>
    );
  return (
    <pre className="mx-auto h-full max-w-4xl overflow-auto whitespace-pre-wrap break-words bg-white p-5 font-mono text-xs leading-relaxed text-noir sm:text-sm">
      {text.slice(0, TEXT_PREVIEW_LIMIT)}
      {text.length > TEXT_PREVIEW_LIMIT && `\n\n… ${t("truncated")}`}
    </pre>
  );
}

/**
 * Visionneuse plein écran : PDF, images, vidéo, audio et texte s'ouvrent dans
 * l'application ; flèches ← → pour passer d'un fichier du lot à l'autre.
 */
export function DocumentViewer({
  files,
  index,
  title,
  onIndexChange,
  onClose,
}: {
  files: DocumentFileView[];
  index: number;
  title: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations("dashboard.documents.viewer");
  const tc = useTranslations("dashboard.common");
  const locale = useLocale();
  const file = files[index]!;
  const kind = previewKind(file.contentType);
  const src = fileUrl(file.id, "view");
  const [nativePdf, setNativePdf] = useState<boolean | null>(null);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);
  const onPdfError = useCallback(() => setPdfFailed(true), []);

  useEffect(() => {
    // Chrome Android et certaines PWA n'affichent pas les PDF dans un iframe.
    setNativePdf((navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled === true);
  }, []);

  useEffect(() => {
    setImageZoomed(false);
    setPdfFailed(false);
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < files.length - 1) onIndexChange(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, files.length, onIndexChange, onClose]);

  const unavailable = (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
      <FileQuestion className="h-10 w-10 text-white/60" />
      <p className="font-semibold">{kind === "none" ? t("noPreview") : t("loadFailed")}</p>
      <p className="max-w-sm text-sm text-white/70">{t("noPreviewHint")}</p>
      <a href={fileUrl(file.id, "download")} className="btn-sm-primary mt-2">
        <Download className="h-4 w-4" /> {t("download")}
      </a>
    </div>
  );

  let body: React.ReactNode = unavailable;
  if (kind === "pdf" && !pdfFailed) {
    body =
      nativePdf === null ? null : nativePdf ? (
        <iframe key={file.id} src={src} title={file.name} className="h-full w-full bg-white" />
      ) : (
        <PdfCanvasViewer key={file.id} src={src} onError={onPdfError} />
      );
  } else if (kind === "image") {
    body = (
      <div className={imageZoomed ? "h-full overflow-auto" : "flex h-full items-center justify-center p-3"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={file.id}
          src={src}
          alt={file.name}
          onClick={() => setImageZoomed((z) => !z)}
          className={imageZoomed ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain"}
        />
      </div>
    );
  } else if (kind === "video") {
    body = (
      <div className="flex h-full items-center justify-center p-3">
        <video key={file.id} src={src} controls className="max-h-full max-w-full" />
      </div>
    );
  } else if (kind === "audio") {
    body = (
      <div className="flex h-full items-center justify-center p-6">
        <audio key={file.id} src={src} controls className="w-full max-w-md" />
      </div>
    );
  } else if (kind === "text") {
    body = <TextPreview key={file.id} src={src} />;
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#111114]/95 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={file.name}>
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 pt-[max(10px,env(safe-area-inset-top))] text-white sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{file.name}</p>
          <p className="truncate text-xs text-white/60">
            {title} · {formatBytes(file.size, locale)}
            {files.length > 1 && ` · ${index + 1} / ${files.length}`}
          </p>
        </div>
        <a href={fileUrl(file.id, "download")} className="btn-sm !min-h-[36px] bg-white/10 text-white hover:bg-white/20" title={t("download")}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{t("download")}</span>
        </a>
        <button onClick={onClose} className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label={tc("close")}>
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        {body}
        {files.length > 1 && (
          <>
            <button
              onClick={() => onIndexChange(index - 1)}
              disabled={index === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-noir/70 p-2.5 text-white shadow-pop hover:bg-noir disabled:opacity-0"
              aria-label={t("previous")}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => onIndexChange(index + 1)}
              disabled={index === files.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-noir/70 p-2.5 text-white shadow-pop hover:bg-noir disabled:opacity-0"
              aria-label={t("next")}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
