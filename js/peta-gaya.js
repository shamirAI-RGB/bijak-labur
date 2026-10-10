/* SiswaCap: teras peta bersama untuk semua peta (Peta Jalan, Jejak Aktiviti, Peta rakan).
   Peta dilukis terus oleh MapLibre GL: jubin vektor OpenFreeMap (percuma, tanpa kunci) © OpenMapTiles © OpenStreetMap,
   gaya sendiri dalam data/peta/gaya-*.json (dijana oleh scripts/bina-gaya-peta.mjs): terang, gelap, satelit hibrid.
   Label diutamakan dalam Bahasa Melayu (name:ms). Mod 3D: bangunan 3D, rupa bumi berbukit (Terrain Tiles) dan glob.
   Jika jubin vektor gagal, jubin raster OSM/Esri dipakai supaya peta tetap kelihatan.
   Guna: const p = await PetaGaya.cipta(el, { kunci: 'jejak', pusat: [lat, lng], zum: 16, lapisan: (map, tema) => {...} });
   p.map ialah peta MapLibre. Lapisan sendiri dipasang dalam `lapisan` kerana ia dipanggil semula setiap kali gaya bertukar. */
(() => {
  'use strict';
  if (window.PetaGaya) return;

  const OSM = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  const RASTER = {
    terang: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', OSM],
    gelap: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', OSM],
    satelit: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 'Imej © Esri, Maxar, Earthstar Geographics']
  };
  const TEMA = ['terang', 'gelap', 'satelit'];
  const gayaUrl = t => new URL(`data/peta/gaya-${t}.json`, document.baseURI).href;
  const gelapLaman = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  };
  const sebenar = t => t === 'auto' ? (gelapLaman() ? 'gelap' : 'terang') : (RASTER[t] ? t : 'terang');
  const kurangGerak = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const simpan = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storan dilarang */ } };
  const baca = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  // Zum gaya jubin 256 px (seperti Google/Leaflet) ke zum MapLibre (jubin 512 px)
  const Z = z => z - 1;
  // [lat, lng] atau { lat, lng } ke [lng, lat]
  const LL = p => Array.isArray(p) ? [p[1], p[0]] : [p.lng, p.lat];

  const skrip = {};
  const muatSkrip = src => skrip[src] || (skrip[src] = new Promise((ok, gagal) => {
    const s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = ok; s.onerror = () => { delete skrip[src]; gagal(new Error('Gagal memuat ' + src)); };
    document.head.appendChild(s);
  }));
  const muatCss = href => { if (!document.querySelector(`link[href="${href}"]`)) document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href })); };
  let webgl = null;
  const adaWebGL = () => {
    if (webgl != null) return webgl;
    try { const c = document.createElement('canvas'); webgl = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { webgl = false; }
    return webgl;
  };
  const muatMaplibre = async () => { await muatSkrip('js/vendor/maplibre-gl.js'); return window.maplibregl; };

  // Gaya raster dalam bentuk gaya MapLibre (sandaran apabila jubin vektor gagal)
  const rasterGaya = t => {
    const [url, atr] = RASTER[t] || RASTER.terang;
    const gelap = t === 'gelap';
    return { version: 8, sources: { r: { type: 'raster', tiles: [url], tileSize: 256, maxzoom: 19, attribution: atr } },
      layers: [{ id: 'latar', type: 'background', paint: { 'background-color': gelap ? '#101714' : '#f2f0e9' } },
        { id: 'r', type: 'raster', source: 'r', paint: gelap ? { 'raster-brightness-min': 0.92, 'raster-brightness-max': 0.08, 'raster-hue-rotate': 180, 'raster-saturation': -0.5, 'raster-contrast': -0.1 } : {} }] };
  };

  // Vektor gagal sekali dalam sesi ini (cth. luar talian atau disekat): semua peta terus guna raster selepas itu
  let vektorRosak = false;
  // Muat gaya ke peta. Jika jubin vektor gagal sebelum peta pertama siap, tukar ke raster tema yang sama.
  // Ralat lain (cth. ikon tiada dalam sprite, jubin ketinggian gagal) diabaikan kerana peta tetap boleh dipakai.
  function muatGaya(map, t) {
    let siap = false, gagalJubin = 0;
    map.__pgTema = t;
    map.setStyle(vektorRosak ? rasterGaya(t) : gayaUrl(t), { diff: false });
    if (vektorRosak) return;
    map.once('idle', () => { siap = true; });
    const r = e => {
      if (siap || vektorRosak || map.__pgTema !== t) { map.off('error', r); return; }
      if (e && e.sourceId && e.sourceId !== 'openmaptiles') return;
      const er = (e && e.error) || {};
      if (!(er.name === 'AJAXError' || 'status' in er || /fetch|network|load/i.test(er.message || ''))) return;
      if (e.tile && ++gagalJubin < 3) return;
      vektorRosak = true; map.off('error', r);
      muatGaya(map, map.__pgTema);
    };
    map.on('error', r);
    setTimeout(() => map.off('error', r), 20000);
  }
  // Mod 3D: bangunan 3D dan rupa bumi berbukit. Glob apabila zum jauh (sentiasa).
  function terap3D(map, on) {
    if (!map || !map.getStyle()) return;
    try { map.setProjection({ type: 'globe' }); } catch (e) { /* versi lama */ }
    const ada = id => !!map.getLayer(id);
    if (ada('building-3d')) map.setLayoutProperty('building-3d', 'visibility', on ? 'visible' : 'none');
    if (ada('building_bayang')) map.setLayoutProperty('building_bayang', 'visibility', on ? 'none' : 'visible');
    // Bangunan rata kekal pada zum jauh (sebelum bangunan 3D muncul) supaya bandar tidak kelihatan kosong
    if (ada('building')) { const l = map.getLayer('building'), z3 = (map.getLayer('building-3d') || {}).minzoom || 14; map.setLayerZoomRange('building', l.minzoom || 13, on ? z3 : 24); }
    try { map.setTerrain(on && map.getSource('dem') ? { source: 'dem', exaggeration: 1.5 } : null); } catch (e) { /* rupa bumi tidak disokong */ }
  }
  const labelPertama = map => ((map.getStyle() || { layers: [] }).layers.find(l => l.type === 'symbol') || {}).id;
  const adaGlyph = map => !!(map.getStyle() || {}).glyphs;
  // Bulatan (poligon) berjejari r meter di sekeliling p
  const bulatan = (p, r) => {
    const n = 48, out = [], lat = Array.isArray(p) ? p[0] : p.lat, lng = Array.isArray(p) ? p[1] : p.lng;
    const dLat = r / 111320, dLng = r / (111320 * Math.cos(lat * Math.PI / 180));
    for (let i = 0; i <= n; i++) { const a = i / n * 2 * Math.PI; out.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]); }
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [out] } }] };
  };
  const kosong = () => ({ type: 'FeatureCollection', features: [] });
  // Warna lapisan sendiri mengikut tema peta
  const WARNA = {
    terang: { saya: '#1d7fd6', aksen: '#0f7a5c', tepi: '#0b3f31', merah: '#c8402f', hijau: '#16935f', putih: '#ffffff', teks: '#14201b', halo: '#ffffff' },
    gelap: { saya: '#5cb4ff', aksen: '#4fd1a1', tepi: '#04261c', merah: '#ff7a66', hijau: '#4fd1a1', putih: '#101714', teks: '#e6ece8', halo: '#101714' },
    satelit: { saya: '#5cb4ff', aksen: '#5fe0b0', tepi: '#02140e', merah: '#ff7a66', hijau: '#5fe0b0', putih: '#ffffff', teks: '#ffffff', halo: '#0b100e' }
  };

  const SVG = d => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IK = {
    tambah: SVG('<path d="M12 5v14M5 12h14"/>'),
    tolak: SVG('<path d="M5 12h14"/>'),
    lapisan: SVG('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>'),
    skrin: SVG('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')
  };
  const PILIHAN = [['auto', 'Ikut tema'], ['terang', 'Jalan'], ['gelap', 'Malam'], ['satelit', 'Satelit']];

  /* Cipta peta MapLibre lengkap dengan kawalan (zum, 3D, lapisan, jarum utara, skrin penuh), tema automatik,
     sandaran raster dan titik lokasi saya. Melontar ralat jika WebGL tiada. */
  async function cipta(el, o) {
    o = o || {};
    if (!adaWebGL()) throw new Error('Peta memerlukan WebGL');
    muatCss('css/maplibre-gl.css'); muatCss('css/peta-gaya.css');
    const ML = await muatMaplibre();
    if (!ML || !el.isConnected) throw new Error('MapLibre tidak dimuat');
    const kunci = 'peta.' + (o.kunci || 'umum');
    let pilihan = baca(kunci + '.lapisan', 'auto');
    if (pilihan !== 'auto' && !TEMA.includes(pilihan)) pilihan = 'auto';
    let mod3d = !!baca(kunci + '.3d', false);
    let tema = sebenar(pilihan);
    const pusat = o.pusat || [3.139, 101.687];

    el.classList.add('pg-peta');
    el.dataset.pgTema = tema;
    const map = new ML.Map({ container: el, style: { version: 8, sources: {}, layers: [] }, center: LL(pusat), zoom: Z(o.zum || 15), maxZoom: 20, maxPitch: 75,
      attributionControl: { compact: true }, fadeDuration: 200, pixelRatio: Math.min(window.devicePixelRatio || 1, 2), dragRotate: true, pitchWithRotate: true, touchPitch: true });

    /* ---------- Kawalan ---------- */
    const kawal = document.createElement('div');
    kawal.className = 'pg-kawal';
    kawal.innerHTML = `<button type="button" class="pg-btn pg-utara" data-pg="utara" title="Hala ke utara" aria-label="Hala peta ke utara" hidden><span class="pg-jarum" aria-hidden="true"></span></button>
      <button type="button" class="pg-btn pg-btn--teks" data-pg="3d" title="Paparan 3D" aria-label="Paparan 3D" aria-pressed="false">3D</button>
      <button type="button" class="pg-btn" data-pg="lapisan" title="Tukar lapisan peta" aria-label="Tukar lapisan peta" aria-expanded="false">${IK.lapisan}</button>
      ${document.fullscreenEnabled && el.requestFullscreen ? `<button type="button" class="pg-btn" data-pg="penuh" title="Skrin penuh" aria-label="Skrin penuh" aria-pressed="false">${IK.skrin}</button>` : ''}
      <span class="pg-zum"><button type="button" class="pg-btn" data-pg="masuk" aria-label="Zum masuk">${IK.tambah}</button><button type="button" class="pg-btn" data-pg="keluar" aria-label="Zum keluar">${IK.tolak}</button></span>`;
    const menu = document.createElement('div');
    menu.className = 'pg-menu';
    menu.hidden = true;
    menu.setAttribute('role', 'group');
    menu.setAttribute('aria-label', 'Lapisan peta');
    menu.innerHTML = PILIHAN.map(([k, n]) => `<button type="button" data-pg-lapisan="${k}" aria-pressed="false"><i class="pg-sw pg-sw--${k}" aria-hidden="true"></i>${n}</button>`).join('');
    el.append(kawal, menu);
    const btn = k => kawal.querySelector(`[data-pg="${k}"]`);

    const tandaKawal = () => {
      const b = btn('3d');
      b.textContent = mod3d ? '2D' : '3D';
      b.setAttribute('aria-pressed', String(mod3d));
      b.setAttribute('aria-label', mod3d ? 'Paparan 2D' : 'Paparan 3D');
      menu.querySelectorAll('[data-pg-lapisan]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.pgLapisan === pilihan)));
      el.dataset.pgTema = tema;
    };
    const jarum = () => {
      const b = map.getBearing(), p = map.getPitch(), u = btn('utara');
      u.hidden = Math.abs(b) < 0.5 && p < 1;
      u.firstElementChild.style.transform = `rotateX(${p * 0.6}deg) rotate(${-b}deg)`;
    };
    map.on('rotate', jarum); map.on('pitch', jarum);

    const set3D = (on, gerak) => {
      mod3d = on; simpan(kunci + '.3d', on);
      terap3D(map, on); tandaKawal();
      if (gerak) map.easeTo({ pitch: on ? 58 : 0, bearing: on ? map.getBearing() : 0, zoom: on ? Math.max(map.getZoom(), Z(15)) : map.getZoom(), duration: kurangGerak() ? 0 : 1100 });
    };
    function set(k) {
      pilihan = k === 'auto' || TEMA.includes(k) ? k : 'auto';
      simpan(kunci + '.lapisan', pilihan);
      const t = sebenar(pilihan);
      if (t !== tema) { tema = t; muatGaya(map, t); }
      tandaKawal();
    }
    const tutupMenu = () => { menu.hidden = true; btn('lapisan').setAttribute('aria-expanded', 'false'); };
    kawal.addEventListener('click', e => {
      const b = e.target.closest('[data-pg]'); if (!b) return;
      const k = b.dataset.pg;
      if (k === 'masuk') map.zoomIn();
      else if (k === 'keluar') map.zoomOut();
      else if (k === '3d') set3D(!mod3d, true);
      else if (k === 'utara') map.easeTo({ bearing: 0, pitch: mod3d ? map.getPitch() : 0, duration: kurangGerak() ? 0 : 600 });
      else if (k === 'lapisan') { menu.hidden = !menu.hidden; b.setAttribute('aria-expanded', String(!menu.hidden)); }
      else if (k === 'penuh') { if (document.fullscreenElement === el) document.exitFullscreen().catch(() => {}); else el.requestFullscreen().catch(() => {}); }
    });
    menu.addEventListener('click', e => { const b = e.target.closest('[data-pg-lapisan]'); if (b) { set(b.dataset.pgLapisan); tutupMenu(); } });
    map.on('click', tutupMenu);
    const padaPenuh = () => {
      const b = btn('penuh'); if (!b) return;
      const on = document.fullscreenElement === el;
      b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Keluar skrin penuh' : 'Skrin penuh');
      el.classList.toggle('pg-penuh', on);
      setTimeout(() => map.resize(), 60);
    };
    document.addEventListener('fullscreenchange', padaPenuh);
    const ikutTema = () => { if (pilihan === 'auto') set('auto'); };
    document.addEventListener('themechange', ikutTema);

    /* ---------- Lokasi saya ---------- */
    let saya = null, sayaMarker = null;
    const pasangSaya = () => {
      if (!map.getSource('pg-ketepatan')) map.addSource('pg-ketepatan', { type: 'geojson', data: saya ? bulatan(saya.p, saya.acc) : kosong() });
      const w = WARNA[tema] || WARNA.terang;
      if (!map.getLayer('pg-ketepatan')) map.addLayer({ id: 'pg-ketepatan', type: 'fill', source: 'pg-ketepatan', paint: { 'fill-color': w.saya, 'fill-opacity': 0.1, 'fill-outline-color': w.saya } }, labelPertama(map));
    };
    function lokasi(p, acc) {
      if (!p) return;
      saya = { p, acc: Math.min(acc || 20, 300) };
      if (!sayaMarker) {
        const d = document.createElement('div');
        d.className = 'pg-saya-wrap';
        d.innerHTML = '<span class="pg-saya"></span>';
        sayaMarker = new ML.Marker({ element: d }).setLngLat(LL(p)).addTo(map);
      } else sayaMarker.setLngLat(LL(p));
      const s = map.getSource('pg-ketepatan'); if (s) s.setData(bulatan(saya.p, saya.acc));
    }

    /* ---------- Gaya ---------- */
    let pertama = true;
    map.on('style.load', () => {
      const sebenarnya = !!(map.getSource('openmaptiles') || map.getSource('r'));
      if (!sebenarnya) return;
      pasangSaya();
      if (o.lapisan) { try { o.lapisan(map, tema, WARNA[tema] || WARNA.terang); } catch (e) { /* lapisan sendiri gagal: peta tetap dipaparkan */ } }
      terap3D(map, mod3d);
      // Mod 3D yang disimpan: condongkan kamera sebaik gaya pertama siap
      if (pertama) { pertama = false; if (mod3d && !o.tanpaCondong) map.jumpTo({ pitch: 55 }); }
    });
    muatGaya(map, tema);
    tandaKawal();

    const pandang = (p, z, animasi) => map[animasi && !kurangGerak() ? 'easeTo' : 'jumpTo']({ center: LL(p), zoom: z == null ? map.getZoom() : Z(z), duration: 600 });
    // Muatkan semua titik dalam pandangan
    const muat = (pts, padding, maxZ, animasi) => {
      if (!pts || !pts.length) return;
      if (pts.length === 1) return pandang(pts[0], maxZ || 15, animasi);
      const b = new ML.LngLatBounds();
      pts.forEach(p => b.extend(LL(p)));
      map.fitBounds(b, { padding: padding == null ? 40 : padding, maxZoom: Z(maxZ || 17), duration: animasi && !kurangGerak() ? 800 : 0, pitch: map.getPitch(), bearing: map.getBearing() });
    };
    return {
      map, ML, Z, LL,
      get tema() { return tema; },
      get warna() { return WARNA[tema] || WARNA.terang; },
      get mod3d() { return mod3d; },
      set, set3D, pandang, muat, lokasi, resize: () => map.resize(),
      buang() {
        document.removeEventListener('themechange', ikutTema);
        document.removeEventListener('fullscreenchange', padaPenuh);
        try { map.remove(); } catch (e) { /* sudah dibuang */ }
      }
    };
  }

  window.PetaGaya = { cipta, muatGaya, terap3D, gayaUrl, rasterGaya, adaWebGL, muatMaplibre, bulatan, labelPertama, adaGlyph, Z, LL, WARNA };
})();
