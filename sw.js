/* Service worker: simpan app shell untuk kegunaan luar talian */
const CACHE = 'bijak-labur-v52';
const SHELL = ['./', 'index.html', 'css/style.css', 'css/langit.css', 'css/ibadah.css', 'css/belajar-visual.css', 'css/fiqh.css', 'css/pustaka.css', 'css/suara.css', 'css/jadual.css', 'css/nota.css', 'css/akaun.css', 'js/ibadah-data.js', 'js/ibadah.js', 'js/fiqh-data.js', 'js/fiqh.js', 'js/quran-src.js', 'fonts/Geist-Variable.woff2', 'fonts/AmiriQuran-Arabic.woff2', 'js/boot.js', 'js/app.js', 'js/suara.js', 'js/learn-visuals.js', 'js/learn.js', 'js/market.js', 'js/solat.js', 'js/semak-pakar.js', 'js/checker.js', 'js/akaun.js', 'js/premium.js', 'js/pustaka-data.js', 'js/pustaka.js', 'js/pro.js', 'js/pro-invest.js', 'js/pro-study.js', 'js/jadual.js', 'js/nota.js', 'js/sihat.js', 'js/studio.js', 'js/buku.js', 'js/kerja.js', 'js/gaya-ai.js', 'js/jejak.js', 'js/komuniti.js', 'css/komuniti.css', 'js/iklan.js', 'js/pemilik.js', 'css/sihat.css', 'css/studio.css', 'css/buku.css', 'css/jejak.css', 'css/iklan.css', 'js/vendor/lightweight-charts.js', 'css/menu.css', 'js/menu.js', 'css/rupa.css', 'fonts/Fraunces-Variable.woff2',
  'manifest.webmanifest', 'privacy.html', 'terma.html', 'terma-app.html', 'tentang.html', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'];

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
    // Sentiasa sahkan dengan pelayan (304 jika sama) supaya kemas kini sampai serta-merta,
    // bukan selepas cache HTTP GitHub Pages (10 minit) tamat
    const req = e.request.mode === 'navigate' ? new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(e.request, { cache: 'no-cache' });
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
  } else if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|api\.alquran\.cloud|api\.quran\.com/.test(url.host)) {
    // Simpan respons yang berjaya sahaja, supaya ralat sementara (cth. 500) tidak tersimpan selama-lamanya
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    })));
  }
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
