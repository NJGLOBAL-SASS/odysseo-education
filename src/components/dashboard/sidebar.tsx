"use client";

import { useTranslations } from "next-intl";
import { LayoutDashboard, Users, Handshake, Mail, Settings, X } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, key: "overview" },
  { href: "/dashboard/candidatures", icon: Users, key: "candidates" },
  { href: "/dashboard/partenaires", icon: Handshake, key: "partners" },
  { href: "/dashboard/newsletter", icon: Mail, key: "newsletter" },
  { href: "/dashboard/parametres", icon: Settings, key: "settings" },
] as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("dashboard.nav");
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Voile mobile */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-noir/50 backdrop-blur-[2px] transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-noir text-white transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" onClick={onClose}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo/logo-full-white-tight.png" alt="Odysseo" className="mix-blend-lighten h-8 w-auto" />
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#C9C9D1] hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="px-6 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7C7C88]">
          Espace équipe
        </p>

        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-white/[0.09] font-semibold text-white"
                    : "font-medium text-[#B4B4BE] hover:bg-white/[0.05] hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-rouge transition-opacity",
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
                <item.icon className={cn("h-[18px] w-[18px]", active ? "text-rouge" : "text-current")} />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="relative m-3 overflow-hidden rounded-brand border border-white/10 bg-white/[0.04] p-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo/logo-mark-white-tight.png"
            alt=""
            aria-hidden="true"
            className="mix-blend-lighten pointer-events-none absolute -bottom-3 -right-3 w-20 opacity-10"
          />
          <p className="text-xs font-semibold">Odysseo Education</p>
          <p className="mt-0.5 text-[11px] text-[#9A9AA6]">Tableau de bord · v1.1</p>
        </div>
      </aside>
    </>
  );
}
