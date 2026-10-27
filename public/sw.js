/* Service worker de l'application équipe Odysseo (PWA du tableau de bord).
 * Responsabilités :
 *  1) Notifications push (nouvelle candidature), même application fermée.
 *  2) App shell hors-ligne : pages déjà consultées + page /offline.html de secours
 *     (les listes elles-mêmes sont mises en cache en IndexedDB, voir src/lib/offline/db.ts).
 *  3) Effacement de tout le cache à la déconnexion (message CLEAR_CACHE) :
 *     aucune donnée de candidat ne doit rester sur un appareil partagé.
 *  4) Pastille de l'icône (API Badging) : total des nouveautés reçu avec chaque push.
 */

const VERSION = "v4";
const STATIC_CACHE = `odysseo-static-${VERSION}`;
const PAGES_CACHE = `odysseo-pages-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-96.png",
  "/images/logo/logo-full-white-tight.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Requêtes internes de navigation Next.js (payload RSC) : jamais mises en cache. */
function isRscRequest(request, url) {
  return request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API : la fraîcheur prime en ligne, IndexedDB prend le relais hors-ligne.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/r/")) return;
  if (isRscRequest(request, url)) return;

  // Fichiers versionnés (_next/static) et images : cache d'abord, réseau ensuite.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/")
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Pages : réseau d'abord ; hors-ligne, dernière version consultée ou page de secours.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES_CACHE);
        try {
          const response = await fetch(request);
          // Pages du tableau de bord seulement, réponses finales (pas de redirection vers /login).
          if (response.ok && !response.redirected && url.pathname.includes("/dashboard")) {
            cache.put(url.pathname, response.clone());
          }
          return response;
        } catch {
          return (
            (await cache.match(url.pathname)) ||
            (await caches.match(OFFLINE_URL)) ||
            new Response("Hors-ligne", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
          );
        }
      })()
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(Promise.all([caches.delete(PAGES_CACHE), setBadge(0)]));
  }

  // Préchargement des pages principales (envoyé par le dashboard une fois connecté et en ligne),
  // pour qu'elles s'ouvrent hors-ligne même si elles n'ont pas encore été visitées.
  if (event.data?.type === "WARM_PAGES" && Array.isArray(event.data.paths)) {
    event.waitUntil(
      (async () => {
        const pages = await caches.open(PAGES_CACHE);
        const assets = new Set();
        await Promise.all(
          event.data.paths.map(async (path) => {
            try {
              const response = await fetch(path, { credentials: "include" });
              if (!response.ok || response.redirected) return;
              const html = await response.clone().text();
              await pages.put(path, response);
              // JS / CSS de la page : sans eux, la page en cache ne peut pas s'afficher hors-ligne.
              for (const match of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) assets.add(match[0]);
            } catch {
              // hors-ligne ou erreur ponctuelle : on réessaiera à la prochaine visite
            }
          })
        );
        const statics = await caches.open(STATIC_CACHE);
        await Promise.all(
          [...assets].map(async (asset) => {
            if (await statics.match(asset)) return;
            try {
              const response = await fetch(asset);
              if (response.ok) await statics.put(asset, response);
            } catch {
              // ignoré : récupéré à la prochaine visite
            }
          })
        );
      })()
    );
  }
});

/** Pastille de l'icône de l'application (Chrome/Edge ordinateur, Safari macOS et iOS 16.4+ installé). */
function setBadge(count) {
  if (!("setAppBadge" in navigator)) return Promise.resolve();
  return (count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge()).catch(() => {});
}

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  event.waitUntil(
    Promise.all([
      typeof payload.badge === "number" ? setBadge(payload.badge) : Promise.resolve(),
      self.registration.showNotification(payload.title || "Odysseo Education", {
        body: payload.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-96.png",
        tag: payload.url || "odysseo",
        renotify: true,
        data: { url: payload.url || "/fr/dashboard" },
      }),
    ])
  );
});

// Clic sur une notification : réutilise la fenêtre de l'application si elle est ouverte.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/fr/dashboard", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        return existing.navigate(target);
      }
      return clients.openWindow(target);
    })()
  );
});
