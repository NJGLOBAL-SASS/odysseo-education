/**
 * Erreur typique d'un onglet resté ouvert pendant un déploiement : les fichiers
 * JavaScript de l'ancienne version n'existent plus sur Vercel.
 */
export function isChunkLoadError(error: unknown) {
  const e = error as { name?: string; message?: string } | null;
  const text = `${e?.name ?? ""} ${e?.message ?? ""}`;
  return /ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(text);
}

const RELOAD_KEY = "odysseo_reload_after_update";

/** Recharge une seule fois (pas de boucle si l'erreur persiste après rechargement). */
export function reloadOnceForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
