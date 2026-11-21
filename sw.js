/* 金澤・名古屋 2027 旅程網站：離線快取
   網頁本體：先抓網路，抓不到才用快取（所以更新會自動生效）
   字型、Firebase 程式、圖示：先用快取，背景再更新 */
var CACHE = "kn2027-20261121";
var CORE = ["./", "./index.html", "./manifest.json", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  var same = url.origin === self.location.origin;
  var isPage = req.mode === "navigate" || (same && /\/(index\.html)?$/.test(url.pathname));
  var isStatic = (same && /\.(png|json|svg|webmanifest)$/.test(url.pathname)) ||
    url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com" ||
    (url.hostname === "www.gstatic.com" && url.pathname.indexOf("/firebasejs/") === 0);
  if (isPage) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put("./index.html", cp); }); }
      return res;
    }).catch(function () { return caches.match("./index.html").then(function (r) { return r || caches.match("./"); }); }));
  } else if (isStatic) {
    e.respondWith(caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    }));
  }
  /* 其他（Firestore 同步、天氣、匯率、Google 地圖）直接走網路，不攔截 */
});
