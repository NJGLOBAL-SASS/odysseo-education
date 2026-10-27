"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";

import type { DashboardCounts } from "@/lib/dashboard-counts";

export type { DashboardCounts };

const EMPTY: DashboardCounts = { candidates: 0, partnerRequests: 0, newsletter: 0 };
const POLL_MS = 45_000;

const CountsContext = createContext<{ counts: DashboardCounts; refresh: () => void }>({
  counts: EMPTY,
  refresh: () => {},
});

/** Compteurs de la sidebar (nouveaux dossiers, demandes de partenariat en attente, inscriptions newsletter). */
export function useDashboardCounts() {
  return useContext(CountsContext);
}

/** Sections dont le compteur repart à zéro quand on les ouvre. */
const SEEN_ON_VISIT: Record<string, "candidates" | "newsletter"> = {
  "/dashboard/candidatures": "candidates",
  "/dashboard/newsletter": "newsletter",
};

export function DashboardCountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<DashboardCounts>(EMPTY);
  const pathname = usePathname();
  const lastSeenPath = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/counts", { cache: "no-store" });
      if (res.ok) setCounts(await res.json());
    } catch {
      // hors-ligne : on garde les derniers compteurs
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => document.visibilityState === "visible" && void refresh(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Ouvrir une section la marque comme vue (compteur à zéro), une fois par visite.
  useEffect(() => {
    const section = SEEN_ON_VISIT[pathname];
    if (!section || lastSeenPath.current === pathname) return;
    lastSeenPath.current = pathname;
    setCounts((c) => ({ ...c, [section]: 0 }));
    fetch("/api/dashboard/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section }),
    }).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!SEEN_ON_VISIT[pathname]) lastSeenPath.current = null;
  }, [pathname]);

  const total = counts.candidates + counts.partnerRequests + counts.newsletter;
  useAppBadge(total);

  return <CountsContext.Provider value={{ counts, refresh }}>{children}</CountsContext.Provider>;
}

const TITLE_PREFIX = /^\(\d+\+?\)\s/;

/**
 * Total des nouveautés affiché comme une messagerie : pastille sur l'icône de
 * l'application installée (API Badging) et « (3) » devant le titre de l'onglet.
 */
function useAppBadge(total: number) {
  useEffect(() => {
    if ("setAppBadge" in navigator) {
      (total > 0 ? navigator.setAppBadge(total) : navigator.clearAppBadge()).catch(() => {});
    }

    // Next.js réécrit le titre à chaque navigation : on remet le préfixe à chaque changement.
    const label = total > 99 ? "99+" : String(total);
    const apply = () => {
      const base = document.title.replace(TITLE_PREFIX, "");
      const next = total > 0 ? `(${label}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [total]);
}
