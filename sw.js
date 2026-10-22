// ===================================================================
// Service worker: a small script the browser runs in the background.
// It sits between the page and the network, so it can answer requests
// from a saved copy when there's no signal.
// ===================================================================

// Change this name (v1 -> v2) whenever you add or remove files in ASSETS.
const CACHE = "fire-risk-v3";

// Everything the app needs in order to open with no connection.
// Paths are relative, so this works from a sub-folder like /fire-risk-app/.
const ASSETS = [
  "./",
  "index.html",
  "dexie.min.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

// INSTALL: runs once when a new version of this file is found.
// Downloads every file in ASSETS into the cache.
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();                 // don't wait for old tabs to close
});

// ACTIVATE: runs after install. Deletes caches left by older versions.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())  // start controlling open pages now
  );
});

// FETCH: runs for every request the page makes.
// Strategy "stale-while-revalidate":
//   1. If we have a saved copy, return it straight away (fast, works offline).
//   2. At the same time, fetch a fresh copy and save it for next time.
// So after you push an update, the first load shows the old version and
// the next load shows the new one.
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;   // our own files only

  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const refresh = fetch(request)
        .then(response => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);               // offline: ignore the failure

      return cached || (await refresh) || new Response("You are offline and this file is not saved yet.", { status: 503 });
    })
  );
});
