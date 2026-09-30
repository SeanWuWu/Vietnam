/* 越南六天五夜 — offline shell.
   The whole app is one self-contained index.html (images are inlined as
   base64), so caching that single file is enough to open with no signal.
   Data still lives in localStorage and syncs to Supabase when back online. */
var CACHE = "vn6-v17";
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./vn-core.js",
             "./icon.svg", "./favicon.ico", "./apple-touch-icon.png",
             "./icon-192.png", "./icon-512.png",
             "./wx-sun.png", "./wx-partly.png", "./wx-cloud.png",
             "./wx-rain.png", "./wx-storm.png", "./wx-wind.png",
             "./games/packing/check.js", "./games/pack.js", "./games/cross.js",
             "./games/packing/data/items.json", "./games/packing/data/levels.json",
             "./games/crossing/data/levels.json",
             "./games/packing/assets/items/passport.webp", "./games/packing/assets/items/phone.webp",
             "./games/packing/assets/items/power_bank.webp", "./games/packing/assets/items/charger.webp",
             "./games/packing/assets/items/earphones.webp", "./games/packing/assets/items/medicine.webp",
             "./games/packing/assets/items/sunscreen.webp", "./games/packing/assets/items/toothpaste.webp",
             "./games/packing/assets/items/toothbrush.webp", "./games/packing/assets/items/contacts.webp",
             "./games/packing/assets/items/umbrella.webp", "./games/packing/assets/items/raincoat.webp",
             "./games/packing/assets/items/tshirt.webp", "./games/packing/assets/items/shorts.webp",
             "./games/packing/assets/items/jeans.webp", "./games/packing/assets/items/underwear.webp",
             "./games/packing/assets/items/socks.webp", "./games/packing/assets/items/sandals.webp",
             "./games/packing/assets/items/sneakers.webp", "./games/packing/assets/items/cap.webp",
             "./games/packing/assets/items/sunglasses.webp", "./games/packing/assets/items/camera.webp",
             "./games/packing/assets/items/foldbag.webp", "./games/packing/assets/items/snack.webp",
             "./games/packing/assets/items/bottle.webp", "./games/packing/assets/items/firstaid.webp",
             "./games/packing/assets/items/wipes.webp", "./games/packing/assets/items/mosquito.webp",
             "./games/packing/assets/items/adapter.webp", "./games/packing/assets/items/soap.webp",
             "./games/crossing/assets/sprites/player.webp", "./games/crossing/assets/sprites/player_step.webp",
             "./games/crossing/assets/sprites/moto_l.webp", "./games/crossing/assets/sprites/moto_r.webp",
             "./games/crossing/assets/sprites/taxi.webp", "./games/crossing/assets/sprites/cyclo.webp",
             "./games/crossing/assets/sprites/bus.webp", "./games/crossing/assets/sprites/island.webp",
             "./games/crossing/assets/sprites/crosswalk.webp"];

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
