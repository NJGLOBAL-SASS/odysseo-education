"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import { Menu, LogOut, Settings, ChevronDown } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { Sidebar } from "./sidebar";
import { NotificationBell } from "./notification-bell";
import { ToastProvider } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { InstallAppBanner, InstallAppMenuItem } from "./install-app";
import { clearOfflineData } from "@/lib/pwa/install";

type ShellUser = { name?: string | null; email?: string | null; role?: string };

function initials(user: ShellUser) {
  const source = user.name || user.email || "?";
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-[10px] py-1 pl-1 pr-2 transition-colors hover:bg-fond"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-noir text-xs font-bold text-white">
          {initials(user)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[160px] truncate text-sm font-semibold leading-tight">
            {user.name || user.email}
          </span>
          <span className="block text-[11px] leading-tight text-gris">
            {user.role === "ADMIN" ? "Administrateur" : "Équipe"}
          </span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-gris sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-60 animate-fade-up overflow-hidden rounded-brand bg-white py-1.5 shadow-pop">
          <div className="border-b border-bord px-3.5 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold">{user.name || "—"}</p>
            <p className="truncate text-xs text-gris">{user.email}</p>
          </div>
          <Link
            href="/dashboard/parametres"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-fond"
          >
            <Settings className="h-4 w-4 text-gris" /> Paramètres
          </Link>
          <InstallAppMenuItem onDone={() => setOpen(false)} />
          <button
            onClick={async () => {
              setSigningOut(true);
              // Aucune donnée de candidat ne doit rester sur l'appareil après déconnexion.
              await clearOfflineData().catch(() => {});
              signOut({ callbackUrl: "/" });
            }}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-erreur hover:bg-erreur-fond"
          >
            {signingOut ? <Spinner /> : <LogOut className="h-4 w-4" />} Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Ferme le tiroir mobile à chaque navigation.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-fond lg:flex">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-bord/70 bg-white/85 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <button
                onClick={() => setMenuOpen(true)}
                className="-ml-1.5 flex h-10 w-10 items-center justify-center rounded-[10px] hover:bg-fond lg:hidden"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo/logo-mark-black-tight.png" alt="" className="h-6 w-auto lg:hidden" />

              <div className="ml-auto flex items-center gap-1.5">
                <NotificationBell />
                <span className="mx-1 h-6 w-px bg-bord" />
                <UserMenu user={user} />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <InstallAppBanner />
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
