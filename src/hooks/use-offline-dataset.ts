"use client";

import { useCallback, useEffect, useState } from "react";

import { loadDataset, saveDataset } from "@/lib/offline/db";

/**
 * Charge un jeu de données du tableau de bord depuis l'API ; si la requête
 * échoue (hors-ligne), retombe sur la dernière copie mise en cache en
 * IndexedDB. Utilisé par les listes candidatures / partenaires / newsletter.
 */
export function useOfflineDataset<T>(resource: string, apiUrl: string, jsonKey: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`Requête ${apiUrl} en échec`);
      const json = await res.json();
      const rows = (json[jsonKey] ?? []) as T[];
      setData(rows);
      setIsOffline(false);
      setCachedAt(null);
      void saveDataset(resource, rows);
    } catch {
      const cached = await loadDataset<T>(resource);
      setData(cached?.data ?? []);
      setCachedAt(cached?.cachedAt ?? null);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [resource, apiUrl, jsonKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, isOffline, cachedAt, refresh: load };
}
