/* Bijak Labur: gaya peta vektor untuk semua peta Leaflet (Peta Jalan, Jejak Aktiviti, Peta rakan).
   Peta dilukis oleh MapLibre GL di bawah Leaflet (pemalam maplibre-gl-leaflet), jadi penanda dan laluan Leaflet
   sedia ada tidak berubah. Jubin vektor: OpenFreeMap (percuma, tanpa kunci) © OpenMapTiles © OpenStreetMap.
   Gaya sendiri dalam data/peta/gaya-*.json (dijana oleh scripts/bina-gaya-peta.mjs): terang, gelap, satelit hibrid.
   Label diutamakan dalam Bahasa Melayu (name:ms). Jika WebGL tiada atau jubin vektor gagal, jubin raster OSM dipakai.
   Guna: const g = await PetaGaya.pasang(map, { tema: 'auto' | 'terang' | 'gelap' | 'satelit' }); g.set('gelap'); */
(() => {
  'use strict';
  if (window.PetaGaya) return;

  const OSM = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  const RASTER = {
    terang: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: OSM }],
    gelap: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: OSM, className: 'pg-raster-gelap' }],
    satelit: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imej © Esri, Maxar, Earthstar Geographics' }]
  };
  const ATR_VEKTOR = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' + OSM;
  const atribusi = t => t === 'satelit' ? ATR_VEKTOR + ', Imej © Esri, Maxar, Earthstar Geographics' : ATR_VEKTOR;
  const gayaUrl = t => new URL(`data/peta/gaya-${t}.json`, document.baseURI).href;
  const gelapLaman = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  };
  const sebenar = t => t === 'auto' ? (gelapLaman() ? 'gelap' : 'terang') : (RASTER[t] ? t : 'terang');

  const skrip = {};
  const muatSkrip = src => skrip[src] || (skrip[src] = new Promise((ok, gagal) => {
    const s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = ok; s.onerror = () => { delete skrip[src]; gagal(new Error('Gagal memuat ' + src)); };
    document.head.appendChild(s);
  }));
  let webgl = null;
  const adaWebGL = () => {
    if (webgl != null) return webgl;
    try { const c = document.createElement('canvas'); webgl = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { webgl = false; }
    return webgl;
  };
  // Vektor gagal sekali dalam sesi ini (cth. luar talian atau disekat): terus guna raster selepas itu
  let vektorRosak = false;
  async function sediaVektor(L) {
    if (vektorRosak || !adaWebGL()) return false;
    try {
      await muatSkrip('js/vendor/maplibre-gl.js');
      await muatSkrip('js/vendor/leaflet-maplibre-gl.js');
      return !!(window.maplibregl && L.maplibreGL);
    } catch (e) { return false; }
  }

  async function pasang(map, opsyen) {
    const L = window.L;
    if (!document.querySelector('link[href="css/peta-gaya.css"]')) document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'css/peta-gaya.css' }));
    let pilihan = (opsyen && opsyen.tema) || 'auto';
    let lapisan = null, mod = null, temaKini = null;
    const bekas = map.getContainer();
    if (map.getMaxZoom() === Infinity) map.setMaxZoom(20);

    const tandakan = () => {
      bekas.classList.add('pg-peta');
      bekas.dataset.pgTema = temaKini;
      bekas.dataset.pgMod = mod;
    };
    const buang = () => { if (lapisan) { map.removeLayer(lapisan); lapisan = null; } };
    const raster = t => {
      buang();
      mod = 'raster'; temaKini = t;
      const [url, o] = RASTER[t];
      lapisan = L.tileLayer(url, o).addTo(map);
      tandakan();
    };
    const vektor = t => {
      buang();
      mod = 'vektor'; temaKini = t;
      let siap = false, gagalJubin = 0;
      const lp = L.maplibreGL({ style: gayaUrl(t), fadeDuration: 150, attributionControl: { customAttribution: atribusi(t) }, pixelRatio: Math.min(window.devicePixelRatio || 1, 2) });
      lapisan = lp.addTo(map);
      const gl = lp.getMaplibreMap();
      gl.once('idle', () => { siap = true; });
      gl.on('error', e => {
        // Gaya atau jubin vektor gagal dimuat sebelum peta pertama siap: tukar ke raster supaya peta tetap kelihatan.
        // Ralat lain (cth. ikon tiada dalam sprite) diabaikan.
        if (siap || lapisan !== lp) return;
        if (e && e.sourceId && e.sourceId !== 'openmaptiles') return; // cth. jubin ketinggian gagal: peta tetap boleh dipakai
        const r = (e && e.error) || {};
        if (!(r.name === 'AJAXError' || 'status' in r || /fetch|network|load/i.test(r.message || ''))) return;
        if (e.tile && ++gagalJubin < 3) return;
        vektorRosak = true;
        raster(t);
      });
      tandakan();
    };
    const guna = t => ok && !vektorRosak ? vektor(t) : raster(t);

    const ok = await sediaVektor(L);
    guna(sebenar(pilihan));

    const ikutTema = () => { if (pilihan === 'auto' && sebenar('auto') !== temaKini) set('auto'); };
    document.addEventListener('themechange', ikutTema);

    function set(t) {
      pilihan = t;
      const k = sebenar(t);
      if (k === temaKini && lapisan) return;
      if (mod === 'vektor' && lapisan && !vektorRosak) {
        const ac = map.attributionControl, lama = atribusi(temaKini);
        temaKini = k;
        lapisan.options.attributionControl.customAttribution = atribusi(k);
        if (ac && lama !== atribusi(k)) ac.removeAttribution(lama).addAttribution(atribusi(k));
        lapisan.getMaplibreMap().setStyle(gayaUrl(k));
        tandakan();
      } else guna(k);
    }
    return {
      set,
      get tema() { return temaKini; },
      get mod() { return mod; },
      buang() { document.removeEventListener('themechange', ikutTema); buang(); }
    };
  }

  // Gaya raster dalam bentuk gaya MapLibre (sandaran Peta Jalan 3D apabila jubin vektor gagal)
  const rasterGaya = t => {
    const [url, o] = RASTER[t] || RASTER.terang;
    const gelap = t === 'gelap';
    return { version: 8, sources: { r: { type: 'raster', tiles: [url.replace('{s}', 'a')], tileSize: 256, maxzoom: 19, attribution: o.attribution } },
      layers: [{ id: 'latar', type: 'background', paint: { 'background-color': gelap ? '#101714' : '#f2f0e9' } },
        { id: 'r', type: 'raster', source: 'r', paint: gelap ? { 'raster-brightness-min': 0.92, 'raster-brightness-max': 0.08, 'raster-hue-rotate': 180, 'raster-saturation': -0.5, 'raster-contrast': -0.1 } : {} }] };
  };
  const muatMaplibre = async () => { await muatSkrip('js/vendor/maplibre-gl.js'); return window.maplibregl; };

  window.PetaGaya = { pasang, gayaUrl, rasterGaya, adaWebGL, muatMaplibre };
})();
