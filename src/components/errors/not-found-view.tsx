import type { ReactNode } from "react";

import { BrandWatermark } from "@/components/layout/brand-watermark";

/**
 * "404" aux couleurs Odysseo : le zéro est remplacé par le logo Od et son
 * orbite rouge. Taille pilotée par `size`.
 */
export function Glyph404({ size = "lg" }: { size?: "lg" | "sm" }) {
  const digit =
    size === "lg"
      ? "text-[96px] sm:text-[150px] leading-none tracking-tighter"
      : "text-[64px] leading-none tracking-tighter";
  const mark = size === "lg" ? "h-[78px] sm:h-[122px]" : "h-[52px]";

  return (
    <div className="flex select-none items-center justify-center gap-1 sm:gap-2" aria-hidden="true">
      <span className={`font-extrabold text-noir ${digit}`}>4</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo/logo-mark-black-tight.png" alt="" className={`${mark} w-auto animate-fade-up`} />
      <span className={`font-extrabold text-noir ${digit}`}>4</span>
    </div>
  );
}

/** Page 404 plein écran (site public, espace équipe, URL inconnue). */
export function NotFoundView({
  eyebrow,
  title,
  text,
  actions,
  links,
  homeHref,
  footer,
}: {
  eyebrow: string;
  title: string;
  text: string;
  actions: ReactNode;
  links?: ReactNode;
  homeHref: string;
  footer: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-fond">
      <header className="relative z-10 bg-noir py-4">
        <div className="wrap-site">
          <a href={homeHref}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo/logo-full-white-tight.png"
              alt="Odysseo Education"
              className="h-7 w-auto "
            />
          </a>
        </div>
      </header>

      <main className="relative isolate flex flex-1 items-center justify-center px-4 py-14">
        <BrandWatermark />
        <div className="relative w-full max-w-xl text-center">
          <Glyph404 />
          <div className="mx-auto mt-5 h-[3px] w-12 rounded-full bg-rouge" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-gris">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-[32px]">{title}</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-gris">{text}</p>
          <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">{actions}</div>
          {links && <div className="mt-9">{links}</div>}
        </div>
      </main>

      <footer className="relative border-t border-bord bg-white py-4 text-center text-xs text-gris">{footer}</footer>
    </div>
  );
}
