"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type HeroSlide = { src: string; position?: string; credit?: string; /** Opacité de l'image visible (le fond est noir). */ opacity?: string };

/**
 * Fond de la bannière d'accueil : images en fondu enchaîné toutes les 6 s.
 * Le texte et les boutons restent fixes. Pause quand l'onglet est caché ;
 * une seule image fixe si l'utilisateur a demandé moins d'animations.
 * Seule la première image est prioritaire ; next/image sert une taille adaptée au téléphone.
 */
export function HeroSlides({ slides, interval = 6000 }: { slides: HeroSlide[]; interval?: number }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = window.setInterval(() => setActive((i) => (i + 1) % slides.length), interval);
    const onVisibility = () => {
      window.clearInterval(timer);
      if (!document.hidden) timer = window.setInterval(() => setActive((i) => (i + 1) % slides.length), interval);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [slides.length, interval]);

  const credit = slides[active]?.credit;

  return (
    <>
      {slides.map((s, i) => (
        <Image
          key={s.src}
          src={s.src}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-[1500ms] ease-in-out ${s.position ?? "object-center"} ${i === active ? (s.opacity ?? "opacity-60") : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/75 to-noir/10" />
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5" aria-hidden="true">
          {slides.map((s, i) => (
            <span key={s.src} className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? "w-6 bg-rouge" : "w-1.5 bg-white/50"}`} />
          ))}
        </div>
      )}
      {credit && <p className="absolute bottom-3 left-4 z-10 max-w-[60%] truncate text-[10px] text-white/55 sm:left-auto sm:right-24">{credit}</p>}
    </>
  );
}
