"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronRight, Menu, X } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./locale-switcher";

const LINKS = [
  { href: "/", key: "home" },
  { href: "/cursus", key: "programs" },
  { href: "/services", key: "services" },
  { href: "/partenaires", key: "partners" },
] as const;

/**
 * Menu du site public sur mobile (< md) : bouton burger qui ouvre un panneau
 * plein écran. Se ferme au changement de page, avec Échap ou en passant sur
 * ordinateur ; le défilement de la page est bloqué tant qu'il est ouvert.
 */
export function MobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const desktop = window.matchMedia("(min-width: 768px)");
    const onResize = () => desktop.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="-mr-2 flex h-10 w-10 items-center justify-center rounded-[10px] text-white hover:bg-white/10 md:hidden"
        aria-label={t("openMenu")}
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <div
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
          className="fixed inset-0 z-[60] flex animate-fade-up flex-col bg-noir text-white md:hidden"
        >
          <div className="wrap-site flex h-16 flex-shrink-0 items-center justify-between border-b border-white/10">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logo/logo-full-white-tight.png"
                alt={t("brand")}
                width={860}
                height={310}
                className="h-7 w-auto"
              />
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="-mr-2 flex h-10 w-10 items-center justify-center rounded-[10px] hover:bg-white/10"
              aria-label={t("closeMenu")}
              autoFocus
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="wrap-site flex-1 overflow-y-auto py-4">
            <ul className="divide-y divide-white/10">
              {LINKS.map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between py-4 text-lg font-semibold",
                      isActive(href) ? "text-white" : "text-[#C9C9D1] hover:text-white"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn("h-5 w-[3px] rounded-full", isActive(href) ? "bg-rouge" : "bg-transparent")} />
                      {t(key)}
                    </span>
                    <ChevronRight className="h-5 w-5 opacity-50" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="wrap-site flex-shrink-0 space-y-4 border-t border-white/10 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <Link href="/postuler" onClick={() => setOpen(false)} className="btn-primary w-full justify-center">
              {t("apply")} <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="flex justify-center">
              <LocaleSwitcher />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
