/* Neon Warfare : service worker de la version installable (hébergée en HTTPS, par ex. GitHub Pages).
   Le jeu passe d'abord par le réseau pour recevoir les mises à jour ; hors ligne, la dernière version en cache prend le relais.
   Le cache HTTP du navigateur est toujours contourné : sinon une ancienne version pourrait se glisser dans le cache hors ligne. */
const CACHE = 'neon-warfare-v2';
const FILES = ['neon-warfare.html', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => fetch(f, { cache: 'reload' }).then(r => r.ok && c.put(f, r)))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // serveurs de mise en relation : jamais en cache
  const key = url.pathname.endsWith('/') ? 'index.html' : url.pathname.split('/').pop();
  e.respondWith(
    fetch(url.href, { cache: 'no-cache' }).then(res => {
      if (res.ok && FILES.includes(key)) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return res;
    }).catch(() => caches.open(CACHE).then(c => c.match(key)).then(r => r || caches.open(CACHE).then(c => c.match('neon-warfare.html'))))
  );
});
