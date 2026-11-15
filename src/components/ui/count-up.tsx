"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Nombre qui compte de 0 à sa valeur quand il apparaît à l'écran (1,6 s).
 * Le rendu serveur affiche la valeur finale (référencement, sans JavaScript) ;
 * rien ne bouge si l'utilisateur a demandé moins d'animations.
 */
export function CountUp({ value, locale, suffix = "", duration = 1600 }: { value: number; locale: string; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const nf = new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    let raf = 0;
    setShown(0);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      <span aria-hidden="true">
        {nf.format(shown)}
        {suffix}
      </span>
      <span className="sr-only">
        {nf.format(value)}
        {suffix}
      </span>
    </span>
  );
}
