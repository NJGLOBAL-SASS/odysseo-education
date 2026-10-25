"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, UserPlus, Handshake, CheckCheck } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type FeedItem = {
  id: string;
  kind: "candidate" | "partner";
  title: string;
  body: string;
  href: string;
  createdAt: string;
  unread: boolean;
};

const POLL_MS = 45_000;

function timeAgo(date: string) {
  const s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  if (s < 60) return "à l'instant";
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}

/**
 * Notifications in-app : la cloche interroge le serveur régulièrement
 * (onglet visible uniquement) et affiche un toast à l'arrivée d'un dossier.
 */
export function NotificationBell() {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [unread, setUnread] = useState(0);
  const lastTopId = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/feed", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { items: FeedItem[]; unread: number };
      const top = json.items[0];
      if (lastTopId.current && top && top.id !== lastTopId.current && top.unread) {
        toast({ tone: "info", title: top.title, description: top.body });
        router.refresh();
      }
      lastTopId.current = top?.id ?? null;
      setItems(json.items);
      setUnread(json.unread);
    } catch {
      // hors-ligne : on garde le dernier état connu
    }
  }, [toast, router]);

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
        aria-label={unread ? `${unread} notification(s) non lue(s)` : "Notifications"}
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
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] animate-fade-up overflow-hidden rounded-brand bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-bord px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-gris hover:text-noir"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
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
              <p className="px-4 py-10 text-center text-sm text-gris">Aucune notification pour l&apos;instant.</p>
            ) : (
              <ul className="divide-y divide-bord">
                {items.map((item) => {
                  const Icon = item.kind === "candidate" ? UserPlus : Handshake;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex gap-3 px-4 py-3 transition-colors hover:bg-fond",
                          item.unread && "bg-[#FFF6F6]"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                            item.kind === "candidate" ? "bg-noir text-white" : "bg-fond text-noir"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{item.title}</span>
                          <span className="block truncate text-xs text-gris">{item.body}</span>
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
