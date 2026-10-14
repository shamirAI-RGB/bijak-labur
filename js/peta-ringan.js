/* SiswaCap: peta ringan 2D (Leaflet + jubin raster OpenStreetMap, percuma tanpa kunci) untuk Jejak Aktiviti.
   Dipakai apabila peta 3D (js/peta-gaya.js, MapLibre) tidak dapat dibuka, cth. pelayar atau peranti tanpa WebGL,
   supaya laluan tetap dilukis pada peta dan bukan mesej ralat.
   Guna: const p = await PetaRingan.cipta(el, { pusat: [lat, lng], zum: 16 });
   p.lukis(data) menerima FeatureCollection yang sama seperti lapisan peta 3D ('jk-langsung', 'jk-sejarah', 'jk-titik', 'jk-km').
   Zum dalam skala Google/Leaflet (jubin 256 px), sama seperti argumen PetaGaya.pandang/muat. */
(() => {
  'use strict';
  if (window.PetaRingan) return;

  const JUBIN = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATR = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  const WARNA = {
    terang: { saya: '#1d7fd6', aksen: '#0f7a5c', tepi: '#0b3f31', merah: '#c8402f', hijau: '#16935f', sejarah: '#e08a1e' },
    gelap: { saya: '#5cb4ff', aksen: '#4fd1a1', tepi: '#04261c', merah: '#ff7a66', hijau: '#4fd1a1', sejarah: '#f2b544' }
  };
  const gelapLaman = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  };
  const kurangGerak = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const muatCss = href => { if (!document.querySelector(`link[href="${href}"]`)) document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href })); };
  // [lng, lat] (GeoJSON) ke [lat, lng] (Leaflet)
  const ke = c => [c[1], c[0]];

  async function cipta(el, o) {
    o = o || {};
    muatCss('css/leaflet.css');
    await loadScript('js/vendor/leaflet.js');
    const L = window.L;
    if (!L || !el.isConnected) throw new Error('Leaflet tidak dimuat');
    el.classList.add('pr-peta');
    const map = L.map(el, { center: o.pusat || [3.139, 101.687], zoom: o.zum || 15, maxZoom: 19, zoomControl: true, attributionControl: true });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    L.tileLayer(JUBIN, { maxZoom: 19, attribution: ATR, crossOrigin: true }).addTo(map);

    let tema = gelapLaman() ? 'gelap' : 'terang';
    const tandaTema = () => el.classList.toggle('pr-gelap', tema === 'gelap');
    tandaTema();
    const laluan = L.layerGroup().addTo(map);
    let data = null, saya = null, sayaAcc = null;

    function lukis(d) {
      data = d;
      laluan.clearLayers();
      const w = WARNA[tema];
      const garis = (fc, warna) => (fc && fc.features || []).forEach(f => {
        if (!f.geometry || f.geometry.type !== 'LineString') return;
        const c = f.geometry.coordinates.map(ke);
        L.polyline(c, { color: w.tepi, weight: 9, opacity: 0.5, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(laluan);
        L.polyline(c, { color: warna, weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(laluan);
      });
      garis(d['jk-sejarah'], w.sejarah);
      garis(d['jk-langsung'], w.aksen);
      (d['jk-titik'] && d['jk-titik'].features || []).forEach(f => L.circleMarker(ke(f.geometry.coordinates), {
        radius: 7, color: '#ffffff', weight: 2.5, fillColor: f.properties.jenis === 'akhir' ? w.merah : w.hijau, fillOpacity: 1,
        interactive: false
      }).addTo(laluan));
      (d['jk-km'] && d['jk-km'].features || []).forEach(f => L.marker(ke(f.geometry.coordinates), {
        icon: L.divIcon({ className: 'pr-km', html: `<span>${Number(f.properties.label) || ''}</span>`, iconSize: [20, 20] }),
        interactive: false, keyboard: false
      }).addTo(laluan));
    }

    function lokasi(p, acc) {
      if (!p) return;
      const r = Math.min(acc || 20, 300), w = WARNA[tema];
      if (!saya) {
        sayaAcc = L.circle(p, { radius: r, color: w.saya, weight: 1, fillColor: w.saya, fillOpacity: 0.1, interactive: false }).addTo(map);
        saya = L.circleMarker(p, { radius: 8, color: '#ffffff', weight: 3, fillColor: w.saya, fillOpacity: 1, interactive: false }).addTo(map);
      } else { saya.setLatLng(p); sayaAcc.setLatLng(p).setRadius(r); }
    }

    const pandang = (p, z, animasi) => map.setView(p, z == null ? map.getZoom() : z, { animate: !!animasi && !kurangGerak() });
    const muat = (pts, padding, maxZ, animasi) => {
      if (!pts || !pts.length) return;
      if (pts.length === 1) return pandang(pts[0], maxZ || 15, animasi);
      const pad = padding == null ? 40 : padding;
      map.fitBounds(L.latLngBounds(pts.map(p => [p[0], p[1]])), { padding: [pad, pad], maxZoom: maxZ || 17, animate: !!animasi && !kurangGerak() });
    };
    const ikutTema = () => {
      const t = gelapLaman() ? 'gelap' : 'terang';
      if (t === tema) return;
      tema = t; tandaTema();
      if (saya) { const w = WARNA[tema]; saya.setStyle({ fillColor: w.saya }); sayaAcc.setStyle({ color: w.saya, fillColor: w.saya }); }
      if (data) lukis(data);
    };
    document.addEventListener('themechange', ikutTema);

    return {
      ringan: true, map, mod3d: false,
      lukis, lokasi, pandang, muat,
      zum: () => map.getZoom(),
      // Kira semula saiz peta (cth. selepas halaman yang tersembunyi dibuka)
      resize: () => map.invalidateSize(),
      buang() {
        document.removeEventListener('themechange', ikutTema);
        try { map.remove(); } catch (e) { /* sudah dibuang */ }
        el.classList.remove('pr-peta', 'pr-gelap');
      }
    };
  }

  window.PetaRingan = { cipta };
})();
