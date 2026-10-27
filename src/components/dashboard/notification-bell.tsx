"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, UserPlus, Handshake, CheckCheck, Mail, Inbox, X } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { optionLabel } from "@/lib/intake-labels";
import { cn } from "@/lib/utils";
import { useDashboardCounts } from "./dashboard-counts";

type FeedItem = {
  id: string;
  kind: "candidate" | "application" | "partner" | "newsletter";
  name: string;
  meta: { country?: string; level?: string; via?: string | null; code?: string; status?: string };
  href: string;
  createdAt: string;
  unread: boolean;
};

const POLL_MS = 45_000;
const ICONS = { candidate: UserPlus, application: Inbox, partner: Handshake, newsletter: Mail };

/**
 * Notifications in-app : la cloche interroge le serveur régulièrement
 * (onglet visible uniquement) et affiche un toast à chaque nouveauté.
 * Sur mobile, le panneau s'ouvre en pleine largeur sous la barre du haut.
 */
export function NotificationBell() {
  const t = useTranslations("dashboard.bell");
  const tc = useTranslations("dashboard.common");
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const { refresh: refreshCounts } = useDashboardCounts();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [unread, setUnread] = useState(0);
  const lastTopId = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const title = useCallback(
    (item: FeedItem) => (item.kind === "newsletter" ? t("newsletter") : t(item.kind, { name: item.name })),
    [t]
  );

  const body = useCallback(
    (item: FeedItem) => {
      const m = item.meta;
      if (item.kind === "candidate") {
        return [m.country, m.level ? optionLabel("targetLevel", m.level, locale) : null, m.via ? t("via", { name: m.via }) : null]
          .filter(Boolean)
          .join(" · ");
      }
      if (item.kind === "application") {
        const status = m.status === "APPROVED" ? t("approved") : m.status === "REJECTED" ? t("rejected") : t("pending");
        return [m.country, status].filter(Boolean).join(" · ");
      }
      if (item.kind === "partner") return t("code", { code: m.code ?? "" });
      return item.name;
    },
    [t, locale]
  );

  const timeAgo = useCallback(
    (date: string) => {
      const s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
      if (s < 60) return t("now");
      if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
      if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
      return rtf.format(-Math.round(s / 86400), "day");
    },
    [locale, t]
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/feed", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { items: FeedItem[]; unread: number };
      const top = json.items[0];
      if (lastTopId.current && top && top.id !== lastTopId.current && top.unread) {
        toast({ tone: "info", title: title(top), description: body(top) });
        refreshCounts();
        router.refresh();
      }
      lastTopId.current = top?.id ?? null;
      setItems(json.items);
      setUnread(json.unread);
    } catch {
      // hors-ligne : on garde le dernier état connu
    }
  }, [toast, router, title, body, refreshCounts]);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
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

  async function markAllRead() {
    setUnread(0);
    setItems((all) => all?.map((i) => ({ ...i, unread: false })) ?? null);
    await fetch("/api/notifications/feed", { method: "POST" }).catch(() => {});
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-[10px] text-noir transition-colors hover:bg-fond"
        aria-label={unread ? t("unread", { count: unread }) : t("title")}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rouge px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-x-2 top-[68px] z-50 flex max-h-[calc(100dvh-84px)] animate-fade-up flex-col overflow-hidden rounded-brand bg-white shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:max-h-[520px] sm:w-[400px]"
          role="dialog"
          aria-label={t("title")}
        >
          <div className="flex items-center justify-between gap-2 border-b border-bord px-4 py-3">
            <p className="text-sm font-bold">{t("title")}</p>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-gris hover:bg-fond hover:text-noir"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> <span className="hidden min-[380px]:inline">{t("markAll")}</span>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-gris hover:bg-fond hover:text-noir sm:hidden"
                aria-label={tc("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {items === null ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="mb-1.5 h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gris">{t("empty")}</p>
            ) : (
              <ul className="divide-y divide-bord">
                {items.map((item) => {
                  const Icon = ICONS[item.kind];
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn("flex gap-3 px-4 py-3 transition-colors hover:bg-fond", item.unread && "bg-[#FFF6F6]")}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                            item.kind === "candidate" || item.kind === "application" ? "bg-noir text-white" : "bg-fond text-noir"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{title(item)}</span>
                          <span className="block truncate text-xs text-gris">{body(item)}</span>
                          <span className="mt-0.5 block text-[11px] text-gris">{timeAgo(item.createdAt)}</span>
                        </span>
                        {item.unread && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-rouge" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
