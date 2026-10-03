/* Service worker: simpan app shell untuk kegunaan luar talian */
const CACHE = 'bijak-labur-v9';
const SHELL = ['./', 'index.html', 'css/style.css', 'fonts/Geist-Variable.woff2', 'js/app.js', 'js/learn.js', 'js/market.js', 'js/solat.js', 'js/checker.js', 'js/premium.js', 'js/pro.js', 'js/pro-invest.js', 'js/pro-study.js', 'js/vendor/lightweight-charts.js',
  'manifest.webmanifest', 'privacy.html', 'terma.html', 'terma-app.html', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin) {
    // Rangkaian dahulu supaya kemas kini cepat sampai, cache jika luar talian
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
  } else if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/.test(url.host)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
    })));
  }
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
