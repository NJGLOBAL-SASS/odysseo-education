"use client";

import type { ReactNode } from "react";

import { normalizeLinkSource, type LinkButton } from "@/lib/links/config";

export type LinkItem = {
  id: LinkButton;
  emoji: string;
  label: string;
  href: string;
  variant: "primary" | "whatsapp" | "ghost";
  external?: boolean;
};

const VARIANTS: Record<LinkItem["variant"], string> = {
  primary: "btn-primary w-full min-h-[60px] text-[17px] shadow-[0_6px_18px_-6px_rgba(255,0,0,.55)] hover:bg-rouge-fonce",
  whatsapp: "btn-wa hover:bg-[#1A9A4B] active:bg-[#1A9A4B]",
  ghost: "btn-ghost w-full hover:bg-fond",
};

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 flex-shrink-0 fill-current">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.43 9.43 0 0 1-4.8-1.32l-.35-.2-3.57.93.96-3.48-.23-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.99 6.67 2.77a9.37 9.37 0 0 1 2.76 6.68c0 5.21-4.24 9.44-9.44 9.44m8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.58 23.7l6.1-1.6a11.3 11.3 0 0 0 5.37 1.37h.01c6.26 0 11.36-5.1 11.36-11.37 0-3.03-1.18-5.89-3.33-8.03" />
    </svg>
  );
}

/** Enregistre le clic sans retarder l'ouverture du lien (sendBeacon, sinon fetch keepalive). */
function trackClick(bouton: LinkButton) {
  try {
    const src = normalizeLinkSource(new URLSearchParams(window.location.search).get("src"));
    const payload = JSON.stringify({ bouton, src });
    if (navigator.sendBeacon?.("/api/link-click", new Blob([payload], { type: "text/plain" }))) return;
    void fetch("/api/link-click", { method: "POST", body: payload, keepalive: true }).catch(() => undefined);
  } catch {
    // Le suivi ne doit jamais bloquer le lien.
  }
}

export function LinkButtons({ items }: { items: LinkItem[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const content: ReactNode = (
          <>
            {item.variant === "whatsapp" ? (
              <WhatsappIcon />
            ) : (
              <span aria-hidden="true" className="text-xl leading-none">
                {item.emoji}
              </span>
            )}
            <span className="flex-1 text-left leading-snug">
              {item.variant === "whatsapp" && <span aria-hidden="true">{item.emoji} </span>}
              {item.label}
            </span>
          </>
        );
        return (
          <li key={item.id}>
            <a
              href={item.href}
              aria-label={item.label}
              onClick={() => trackClick(item.id)}
              {...(item.external && { target: "_blank", rel: "noopener noreferrer" })}
              className={`${VARIANTS[item.variant]} py-3 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-noir/25`}
            >
              {content}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
