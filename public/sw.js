/* Service worker du tableau de bord Odysseo (team.odysseo-education.com).
 * Deux responsabilités :
 *  1) Notifications push (nouvelle candidature).
 *  2) Cache de l'app shell pour permettre de consulter le dashboard hors-ligne
 *     (les données elles-mêmes sont mises en cache séparément en IndexedDB,
 *     voir src/lib/offline/db.ts).
 */

const CACHE_NAME = "odysseo-dashboard-v1";
const PRECACHE_URLS = ["/images/logo/logo-full-white.png", "/images/logo/favicon-64.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Les appels API ne sont jamais mis en cache ici : la fraîcheur des
  // données prime en ligne, et IndexedDB prend le relais hors-ligne.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await cache.match("/dashboard", { ignoreSearch: true });
          if (shell) return shell;
        }
        throw new Error("offline-and-not-cached");
      }
    })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  event.waitUntil(
    self.registration.showNotification(payload.title || "Odysseo Education", {
      body: payload.body,
      icon: "/images/logo/favicon-64.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
