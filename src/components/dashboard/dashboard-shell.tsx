"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { Menu, LogOut, Settings, ChevronDown, Languages } from "lucide-react";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/config";
import { Sidebar } from "./sidebar";
import { NotificationBell } from "./notification-bell";
import { DashboardCountsProvider } from "./dashboard-counts";
import { ToastProvider } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { InstallAppBanner, InstallAppMenuItem } from "./install-app";
import { clearOfflineData } from "@/lib/pwa/install";
import { cn } from "@/lib/utils";

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

/** Bascule FR / EN du tableau de bord (conserve la page et ses paramètres d'URL). */
function LanguageToggle() {
  const t = useTranslations("dashboard.shell");
  const tc = useTranslations("dashboard.common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  function switchTo(l: Locale) {
    if (l === locale) return;
    setPending(l);
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`${pathname}${search}`, { locale: l });
  }

  useEffect(() => setPending(null), [locale]);

  return (
    <div
      className="flex items-center rounded-[10px] border border-bord bg-white p-0.5"
      role="group"
      aria-label={t("language")}
    >
      <Languages className="ml-1.5 mr-0.5 hidden h-4 w-4 text-gris sm:block" aria-hidden="true" />
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          aria-pressed={l === locale}
          title={t("switchTo", { lang: l === "fr" ? tc("french") : tc("english") })}
          className={cn(
            "flex h-8 min-w-[34px] items-center justify-center rounded-[8px] px-2 text-xs font-bold transition-colors",
            l === locale ? "bg-noir text-white" : "text-gris hover:bg-fond hover:text-noir"
          )}
        >
          {pending === l ? <Spinner className="h-3.5 w-3.5" /> : l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-[10px] py-1 pl-1 pr-1 transition-colors hover:bg-fond sm:pr-2"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-noir text-xs font-bold text-white">
          {initials(user)}
        </span>
        <span className="hidden text-left md:block">
          <span className="block max-w-[160px] truncate text-sm font-semibold leading-tight">
            {user.name || user.email}
          </span>
          <span className="block text-[11px] leading-tight text-gris">
            {user.role === "ADMIN" ? t("shell.admin") : t("shell.staff")}
          </span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-gris md:block" />
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[68px] z-50 animate-fade-up overflow-hidden rounded-brand bg-white py-1.5 shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-64">
          <div className="border-b border-bord px-3.5 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold">{user.name || "—"}</p>
            <p className="truncate text-xs text-gris">{user.email}</p>
          </div>
          <Link
            href="/dashboard/parametres"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-fond"
          >
            <Settings className="h-4 w-4 text-gris" /> {t("nav.settings")}
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
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-erreur hover:bg-erreur-fond"
          >
            {signingOut ? <Spinner /> : <LogOut className="h-4 w-4" />} {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

export function DashboardShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const t = useTranslations("dashboard.nav");
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Ferme le tiroir mobile à chaque navigation.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <ToastProvider>
      <DashboardCountsProvider>
        <div className="min-h-screen bg-fond lg:flex">
          <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 border-b border-bord/70 bg-white/85 backdrop-blur">
              <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
                <button
                  onClick={() => setMenuOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] hover:bg-fond lg:hidden"
                  aria-label={t("openMenu")}
                >
                  <Menu className="h-5 w-5" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo/logo-mark-black-tight.png" alt="" className="h-6 w-auto lg:hidden" />

                <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
                  <LanguageToggle />
                  <NotificationBell />
                  <span className="mx-0.5 hidden h-6 w-px bg-bord sm:block" />
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
      </DashboardCountsProvider>
    </ToastProvider>
  );
}
