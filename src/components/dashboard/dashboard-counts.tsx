"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";

export type DashboardCounts = { candidates: number; partnerRequests: number; newsletter: number };

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

  return <CountsContext.Provider value={{ counts, refresh }}>{children}</CountsContext.Provider>;
}
