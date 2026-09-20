/* 越南六天五夜 — offline shell.
   The whole app is one self-contained index.html (images are inlined as
   base64), so caching that single file is enough to open with no signal.
   Data still lives in localStorage and syncs to Supabase when back online. */
var CACHE = "vn6-v11";
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./vn-core.js",
             "./icon.svg", "./favicon.ico", "./apple-touch-icon.png",
             "./icon-192.png", "./icon-512.png",
             "./wx-sun.png", "./wx-partly.png", "./wx-cloud.png",
             "./wx-rain.png", "./wx-storm.png", "./wx-wind.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);

  // Never cache the sync backend or the weather API — stale trip data or a
  // stale forecast is worse than an honest failure the app already handles.
  if (url.origin !== self.location.origin) return;

  // Navigations: serve fresh when possible, fall back to the cached page.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok && /text\/html/i.test(res.headers.get("content-type") || "text/html")) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
        }
        return res;
      }).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  var path = url.pathname;
  var htmlish = /(?:\/|index\.html|vn-core\.js)$/.test(path);
  if (htmlish) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match("./index.html"); });
      })
    );
    return;
  }

  // Other same-origin assets: cache first, then network.
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
