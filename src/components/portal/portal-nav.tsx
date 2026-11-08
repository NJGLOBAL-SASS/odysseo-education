"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, Home, MessageCircle, UserRound } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/espace", key: "home", icon: Home },
  { href: "/espace/documents", key: "documents", icon: FileText },
  { href: "/espace/messages", key: "messages", icon: MessageCircle },
  { href: "/espace/compte", key: "account", icon: UserRound },
] as const;

/** Navigation de l'espace : barre du bas sur mobile, onglets en haut sur ordinateur. */
export function PortalNav({ unread }: { unread: number }) {
  const t = useTranslations("portal.nav");
  const pathname = usePathname().replace(/^\/(fr|en)/, "") || "/";
  const active = (href: string) => (href === "/espace" ? pathname === "/espace" : pathname.startsWith(href));

  return (
    <nav
      aria-label="Espace"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-bord bg-white pb-[env(safe-area-inset-bottom)] sm:static sm:border-0 sm:bg-transparent sm:pb-0"
    >
      <ul className="mx-auto grid max-w-[720px] grid-cols-4 sm:flex sm:gap-1">
        {ITEMS.map(({ href, key, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cn(
                "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[12px] font-semibold sm:min-h-[40px] sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:text-[14px]",
                active(href) ? "text-rouge sm:bg-white/10 sm:text-white" : "text-gris sm:text-[#C9C9D1] sm:hover:text-white",
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
                {key === "messages" && unread > 0 && !active("/espace/messages") && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rouge px-1 text-[10px] font-extrabold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
