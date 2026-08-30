// Kabatu Farm — offline service worker, scoped narrowly to what the
// person actually asked for: milk entry offline-capable, not the whole
// app. Deliberately simple (no Workbox/next-pwa dependency) — a
// hand-rolled "network first, fall back to cache" strategy is enough for
// this scope and easier to reason about than a generic precache-manifest
// tool fighting Next.js App Router's hashed build filenames.
//
// KNOWN LIMITATION, stated plainly rather than glossed over: this caches
// whatever the browser actually requests while online (runtime caching),
// not a guaranteed precache list. That means the VERY FIRST time someone
// opens /dairy/milk-log/entry, they must be online — only SUBSEQUENT
// visits (after this service worker has cached the shell) work offline.
// There is no way around that for a first-ever visit to any URL.

const CACHE_NAME = "kabatu-offline-v1";
// Only cache navigations/assets for the milk-entry surface — this is not
// a whole-app offline cache.
const OFFLINE_SCOPE = "/dairy/milk-log";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only intervene for same-origin GET requests under the milk-entry
  // scope (the page itself, plus its JS/CSS chunks, which Next.js also
  // serves same-origin under /_next/). Everything else (API calls to
  // PocketBase, other pages) passes through untouched — this service
  // worker has no opinion about them.
  const inScope = url.origin === self.location.origin && (url.pathname.startsWith(OFFLINE_SCOPE) || url.pathname.startsWith("/_next/"));
  if (event.request.method !== "GET" || !inScope) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache genuinely good responses — caching a 4xx/5xx would
        // mean "offline" permanently replays that error.
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
  );
});
