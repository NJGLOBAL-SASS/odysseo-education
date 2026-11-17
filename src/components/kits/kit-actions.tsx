"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";

type Props = { slug: string; code: string; imageUrl: string; downloadUrl: string; text: string; fileName: string };

/** Boutons de la page du kit : télécharger l'image, copier le texte, partager (si le téléphone le permet). */
export function KitActions({ slug, code, imageUrl, downloadUrl, text, fileName }: Props) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const track = (type: "page_ouverte" | "texte_copie") =>
    fetch(`/api/kit/${encodeURIComponent(slug)}/${encodeURIComponent(code)}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
      keepalive: true,
    }).catch(() => undefined);

  useEffect(() => {
    track("page_ouverte");
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    track("texte_copie");
    setTimeout(() => setCopied(false), 2500);
  }

  async function share() {
    try {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], fileName, { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text });
      else await navigator.share({ text });
    } catch {
      /* partage annulé */
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <a href={downloadUrl} download={fileName} className="btn-primary">
          <Download className="h-5 w-5" /> Télécharger l&apos;image
        </a>
        <button type="button" onClick={copy} className="btn-dark">
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copied ? "Texte copié" : "Copier le texte"}
        </button>
      </div>
      {canShare && (
        <button type="button" onClick={share} className="btn-ghost w-full">
          <Share2 className="h-5 w-5" /> Partager
        </button>
      )}
      <div className="card p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gris">Texte à poster avec l&apos;image</p>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
