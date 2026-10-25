"use client";

import type { ReactNode } from "react";

import { openCookieSettings } from "@/lib/cookie-consent";

export function ManageCookiesButton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      {children}
    </button>
  );
}
