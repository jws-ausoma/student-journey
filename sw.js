/* AUSOMA Student Journey — Service Worker
 *
 * Job: make this site installable as a PWA. We are NOT trying to be an
 * offline-first cache here. The dashboards rely on freshly-built data and
 * stale HTML would mislead the user, so the SW deliberately stays out of
 * the way for HTML/data fetches:
 *
 *   - HTML / xlsx / json   →  network-first, no cache (always live)
 *   - icons / manifest     →  cache-first (won't change between deploys)
 *
 * Bumping CACHE_VERSION evicts the old cache on the next page load.
 */
const CACHE_VERSION = "ausoma-journey-v1";
const SHELL_ASSETS = [
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isShell = SHELL_ASSETS.some((p) => url.pathname.endsWith(p.replace("./", "/")));

  if (isShell) {
    // cache-first for static shell assets
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // Everything else (HTML pages, data) — network-first, no cache.
  // We let the browser's normal HTTP cache do its thing; the SW just
  // exists so the site qualifies as installable.
});
