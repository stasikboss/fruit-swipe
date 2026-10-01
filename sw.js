/* Offline support for "הפירות שלי": everything the game needs is stored on the device after the first visit. */
const VERSION = 'fruit-7e9963679e';
const ASSETS = [
  "./",
  "./fonts/fonts.css",
  "./fonts/fredoka-hebrew-500-normal.woff2",
  "./fonts/fredoka-hebrew-600-normal.woff2",
  "./fonts/fredoka-hebrew-700-normal.woff2",
  "./fonts/fredoka-latin-500-normal.woff2",
  "./fonts/fredoka-latin-600-normal.woff2",
  "./fonts/fredoka-latin-700-normal.woff2",
  "./fonts/nunito-cyrillic-600-normal.woff2",
  "./fonts/nunito-cyrillic-700-normal.woff2",
  "./fonts/nunito-cyrillic-800-normal.woff2",
  "./fonts/nunito-latin-600-normal.woff2",
  "./fonts/nunito-latin-700-normal.woff2",
  "./fonts/nunito-latin-800-normal.woff2",
  "./fonts/varela-round-hebrew-400-normal.woff2",
  "./fonts/varela-round-latin-400-normal.woff2",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./index.html",
  "./manifest.webmanifest",
  "./og.jpg",
  "./play.html",
  "./qr.js",
  "./screens/end.jpg",
  "./screens/game.jpg"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('fruit-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request).then(res => { clearTimeout(timer); resolve(res); }, err => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Pages: try the network briefly so updates arrive, otherwise play from the device.
  if (req.mode === 'navigate') {
    event.respondWith(
      fromNetwork(req, 3500)
        .then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then(hit => hit || caches.match('./play.html')))
    );
    return;
  }

  // Everything else (fonts, icons, pictures): from the device first.
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
