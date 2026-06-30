---
# Served at /orrery-sw.js (root scope). Front matter makes Jekyll process Liquid.
---
// Offline service worker for the /orrery/ PWA. Production: cache-first, permanent.
// Localhost: self-destruct so dev edits show immediately. (Mirrors clock-sw.js.)
const DEV = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].indexOf(self.location.hostname) !== -1;
const CACHE_VERSION = 'v1';
const CACHE = 'orrery-' + CACHE_VERSION;
const ASSETS = [
  '{{ "/orrery/" | relative_url }}',
  '{{ "/assets/js/orrery.js" | relative_url }}',
  '{{ "/assets/fonts/inter-latin-wght.woff2" | relative_url }}',
  '{{ "/assets/fonts/jetbrains-mono-latin-wght.woff2" | relative_url }}',
  '{{ "/assets/orrery.webmanifest" | relative_url }}',
  '{{ "/assets/images/orrery/icon-180.png" | relative_url }}',
  '{{ "/assets/images/orrery/icon-192.png" | relative_url }}',
  '{{ "/assets/images/orrery/icon-512.png" | relative_url }}'
];

if (DEV) {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll({ type: 'window' }))
        .then((clients) => clients.forEach((c) => c.navigate(c.url)))
    );
  });
} else {
  self.addEventListener('install', (event) => { event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
  self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.indexOf('orrery-') === 0 && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
  });
  self.addEventListener('fetch', (event) => {
    const req = event.request; if (req.method !== 'GET') return;
    event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') { const c = res.clone(); caches.open(CACHE).then((x) => x.put(req, c)); }
      return res;
    }).catch(() => (req.mode === 'navigate' ? caches.match('{{ "/orrery/" | relative_url }}') : Response.error()))));
  });
}
