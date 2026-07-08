// Served at /clock-sw.js (root scope so it controls /clock/).
// Offline service worker for the /clock/ PWA.
//
// Production: download the whole bundle ONCE on install, keep it under a STABLE
// cache name, and serve everything cache-first forever. Refreshes, cold launches
// and no-network use all hit the permanent cache.
//
// Localhost (development): the opposite — never cache, and actively tear down any
// existing cache/registration so code edits always show up immediately. (A
// permanent cache during dev silently masks every change.)
//
// To ship a production update, bump CACHE_VERSION; the browser swaps to the new
// bundle in the background the next time it's online.
const DEV = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].indexOf(self.location.hostname) !== -1;
const CACHE_VERSION = 'v6'; // v6: un-broke the worker after the Hugo port (Liquid paths were served raw)
const CACHE = 'clock-' + CACHE_VERSION;

const ASSETS = [
  '/clock/',
  '/assets/js/clock.js',
  '/assets/fonts/inter-latin-wght.woff2',
  '/assets/fonts/jetbrains-mono-latin-wght.woff2',
  '/assets/fonts/inter-latin-wght-italic.woff2',
  '/assets/fonts/jetbrains-mono-latin-wght-italic.woff2',
  '/assets/clock.webmanifest',
  '/assets/images/clock/icon-180.png',
  '/assets/images/clock/icon-192.png',
  '/assets/images/clock/icon-512.png'
];

if (DEV) {
  // Dev kill-switch: purge caches, unregister, and reload open tabs so the page
  // falls back to plain network and picks up the latest code.
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll({ type: 'window' }))
        .then((clients) => clients.forEach((c) => c.navigate(c.url)))
    );
  });
} else {
  self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
  });
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k.indexOf('clock-') === 0 && k !== CACHE).map((k) => caches.delete(k))))
        .then(() => self.clients.claim())
    );
  });
  self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => (req.mode === 'navigate' ? caches.match('/clock/') : Response.error()));
      })
    );
  });
}
