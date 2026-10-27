"use client";

/**
 * Petit wrapper IndexedDB (sans dépendance) pour mettre en cache les listes
 * du tableau de bord et permettre leur consultation hors-ligne.
 */

const DB_NAME = "odysseo-dashboard";
const DB_VERSION = 1;
const STORE_NAME = "datasets";

export type CachedDataset<T> = {
  resource: string;
  data: T[];
  cachedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "resource" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDataset<T>(resource: string, data: T[]): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      resource,
      data,
      cachedAt: new Date().toISOString(),
    } satisfies CachedDataset<T>);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadDataset<T>(resource: string): Promise<CachedDataset<T> | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  const result = await new Promise<CachedDataset<T> | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(resource);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

/** Supprime toutes les données mises en cache (appelé à la déconnexion). */
export async function clearAllDatasets(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
