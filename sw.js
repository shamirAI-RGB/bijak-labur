/* Service worker: simpan app shell untuk kegunaan luar talian */
const CACHE = 'bijak-labur-v104';
const SHELL = ['./', 'index.html', 'css/style.css', 'css/langit.css', 'css/ibadah.css', 'css/belajar-visual.css', 'css/fiqh.css', 'css/suara.css', 'css/jadual.css', 'css/nota.css', 'css/akaun.css', 'js/ibadah-data.js', 'js/ibadah.js', 'js/fiqh-data.js', 'js/fiqh.js', 'js/quran-src.js', 'fonts/Geist-Variable.woff2', 'fonts/AmiriQuran-Arabic.woff2', 'js/boot.js', 'js/bingkai.js', 'js/app.js', 'js/suara.js', 'js/learn-visuals.js', 'js/akademi.js', 'js/learn.js', 'css/akademi.css', 'js/market.js', 'js/solat.js', 'js/semak-pakar.js', 'js/semak-industri.js', 'js/checker.js', 'js/semak-audit.js', 'js/akaun.js', 'js/premium.js', 'js/pro.js', 'js/pro-invest.js', 'js/pro-study.js', 'js/pro-syariah.js', 'js/jadual.js', 'js/skrin-kunci.js', 'css/skrin-kunci.css', 'js/nota.js', 'js/sihat.js', 'js/studio.js', 'js/buku.js', 'js/kerja.js', 'js/gaya-ai.js', 'js/jejak.js', 'js/komuniti.js', 'css/komuniti.css', 'js/iklan.js', 'js/pemilik.js', 'css/sihat.css', 'css/studio.css', 'css/buku.css', 'css/jejak.css', 'css/iklan.css', 'js/vendor/lightweight-charts.js', 'css/menu.css', 'js/menu.js', 'css/hubungi.css', 'js/hubungi.js', 'js/bukupesanan.js', 'js/saringan.js', 'js/halal.js', 'css/alat-syariah.css', 'js/vendor/adhan.min.js', 'images/rajah/saringan-syariah.svg', 'images/rajah/pensijilan-halal.svg', 'images/rajah/aliran-ncr.svg', 'css/rupa.css', 'css/takwim.css', 'js/takwim.js', 'fonts/Newsreader-Variable.woff2', 'fonts/Newsreader-Italic.woff2', 'fonts/SchibstedGrotesk-Variable.woff2', 'fonts/Fraunces-Variable.woff2', 'audio/azan.mp3', 'css/sinema.css', 'js/sinema.js', 'css/masa-depan.css', 'js/masa-depan.js', 'css/pameran.css', 'js/pameran.js', 'js/pusat-denyut.js', 'pusat.html', 'css/pusat.css', 'js/pusat.js', 'css/suis.css', 'js/bahasa.js', 'icons/favicon.svg', 'data/bahasa/en.json', 'data/bahasa/ar.json', 'images/jelajah/pasaran.svg', 'images/jelajah/solat.svg', 'images/jelajah/belajar.svg', 'images/jelajah/semak.svg', 'images/jelajah/fiqh.svg', 'images/jelajah/ibadah.svg', 'images/jelajah/halal.svg', 'images/jelajah/jadual.svg',
  'manifest.webmanifest', 'peta.html', 'css/peta.css', 'js/peta.js', 'js/peta-jalan.js', 'js/peta-gaya.js', 'css/peta-gaya.css', 'css/maplibre-gl.css', 'data/peta/gaya-terang.json', 'data/peta/gaya-gelap.json', 'data/peta/gaya-satelit.json', 'privacy.html', 'terma.html', 'terma-app.html', 'tentang.html', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'];

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
    // Simpan respons yang berjaya sahaja, tanpa rentetan pertanyaan (cth. ?bill= daripada ToyyibPay tidak tersimpan dalam cache)
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(url.origin + url.pathname, copy)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
  } else if (url.hostname === 's3.amazonaws.com' && url.pathname.startsWith('/elevation-tiles-prod/')) {
    // Jubin ketinggian tidak berubah: cache dahulu
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    })));
  } else if (url.hostname === 'tiles.openfreemap.org') {
    // Peta vektor: rangkaian dahulu (TileJSON menunjuk ke versi jubin terkini), cache jika luar talian
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || Response.error())));
  } else if (/^(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|api\.alquran\.cloud|api\.quran\.com|tile\.openstreetmap\.org|([a-z0-9-]+\.)?basemaps\.cartocdn\.com|server\.arcgisonline\.com)$/.test(url.hostname)) {
    // Jubin peta yang pernah dilihat kekal tersedia luar talian
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
