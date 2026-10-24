"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Users, Handshake, Mail, Settings, LogOut } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, key: "overview" },
  { href: "/dashboard/candidatures", icon: Users, key: "candidates" },
  { href: "/dashboard/partenaires", icon: Handshake, key: "partners" },
  { href: "/dashboard/newsletter", icon: Mail, key: "newsletter" },
  { href: "/dashboard/parametres", icon: Settings, key: "settings" },
] as const;

export function Sidebar() {
  const t = useTranslations("dashboard.nav");
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col bg-noir text-white">
      <div className="flex h-16 items-center px-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo/logo-full-white.png" alt="Odysseo" className="h-6 w-auto" />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-3 rounded-[10px] bg-white/10 px-3 py-2.5 text-sm font-semibold text-white"
                  : "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-[#C9C9D1] hover:bg-white/5 hover:text-white"
              }
            >
              <item.icon className="h-4 w-4" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="mx-3 mb-5 flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-[#C9C9D1] hover:bg-white/5 hover:text-white"
      >
        <LogOut className="h-4 w-4" />
        {t("signOut")}
      </button>
    </aside>
  );
}
