"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Maximize2, X } from "lucide-react";

export type ProofItem = { id: string; image: string; caption: string };

/** Vignettes cliquables + agrandissement plein écran (Échap, clic sur le fond ou bouton pour fermer). */
export function ProofGallery({ items }: { items: ProofItem[] }) {
  const t = useTranslations("proof");
  const [open, setOpen] = useState<ProofItem | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <ul className="grid grid-cols-3 gap-3">
        {items.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={(e) => {
                triggerRef.current = e.currentTarget;
                setOpen(p);
              }}
              className="group relative block aspect-[3/4] w-full overflow-hidden rounded-[6px] border border-bord bg-white"
              aria-label={t("enlarge", { name: p.caption })}
            >
              <Image src={p.image} alt="" fill sizes="(min-width: 900px) 280px, 33vw" className="object-cover transition-transform group-hover:scale-105" />
              <span className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-noir/75 text-white">
                <Maximize2 className="h-4 w-4" />
              </span>
            </button>
            <p className="mt-1.5 text-xs leading-snug text-gris sm:text-sm">{p.caption}</p>
          </li>
        ))}
      </ul>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.caption}
          className="fixed inset-0 z-[90] flex flex-col bg-noir/95 p-3 sm:p-6"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(null)}
        >
          <div className="flex justify-end">
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(null)}
              className="flex h-12 w-12 items-center justify-center rounded-full text-white hover:bg-white/10"
              aria-label={t("close")}
            >
              <X className="h-7 w-7" />
            </button>
          </div>
          <div className="relative flex-1" onMouseDown={(e) => e.target === e.currentTarget && setOpen(null)}>
            <Image src={open.image} alt={open.caption} fill sizes="100vw" className="object-contain" />
          </div>
          <p className="mt-3 text-center text-sm text-[#D4D4DA]">{open.caption}</p>
        </div>
      )}
    </>
  );
}
