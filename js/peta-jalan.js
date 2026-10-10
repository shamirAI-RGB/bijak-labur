/* Peta Jalan (peta.html): peta jalan 3D (MapLibre GL, jubin vektor OpenFreeMap dengan gaya sendiri dalam data/peta/)
   di atas glob 3D: condong dan pusing dengan dua jari, bangunan 3D, rupa bumi berbukit, dan kamera navigasi yang
   berpusing mengikut arah perjalanan.
   Carian tempat (Nominatim), arah perjalanan (OSRM: kereta, basikal, jalan kaki),
   navigasi langsung dengan suara Bahasa Melayu, tempat disimpan, cuaca dan waktu solat di destinasi.
   Dimuat selepas js/peta.js dan bercakap dengan glob melalui window.PetaGlob. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const glob = window.PetaGlob || null;
  const root = $('jalan');
  const ML = window.maplibregl;
  if (!root || !ML) return;
  const PG = window.PetaGaya;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = () => window.innerWidth < 720;

  /* ---------- Perkhidmatan (semua percuma, OpenStreetMap) ---------- */
  const NOMINATIM = 'https://nominatim.openstreetmap.org';
  const OSRM = { car: 'https://routing.openstreetmap.de/routed-car', bike: 'https://routing.openstreetmap.de/routed-bike', foot: 'https://routing.openstreetmap.de/routed-foot' };
  const OSRM_SANDARAN = 'https://router.project-osrm.org';
  const CUACA = 'https://api.open-meteo.com/v1/forecast';
  const SOLAT = 'https://api.aladhan.com/v1/timings';
  // Lapisan peta: gaya vektor sendiri dalam data/peta/ (OpenFreeMap), raster jika jubin vektor gagal
  const GAYA = { jalan: 'terang', gelap: 'gelap', satelit: 'satelit' };
  const PUSAT = [3.139, 101.687]; // Kuala Lumpur
  const PROFIL = { car: 'Kereta', bike: 'Basikal', foot: 'Jalan kaki' };
  const CHIPS = [['Masjid', 'masjid'], ['Makan', 'restoran'], ['Minyak', 'stesen minyak'], ['ATM', 'atm'], ['Hospital', 'hospital'], ['Farmasi', 'farmasi'], ['Pasar raya', 'pasar raya'], ['Surau', 'surau']];

  /* ---------- Ikon (SVG garis, 24x24) ---------- */
  const IKON = {
    glob: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    cari: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    tutup: '<path d="M6 6l12 12M18 6 6 18"/>',
    lapisan: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    kompas: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
    lokasi: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/>',
    tambah: '<path d="M12 5v14M5 12h14"/>',
    tolak: '<path d="M5 12h14"/>',
    arah: '<path d="M12 2.5 21.5 12 12 21.5 2.5 12 12 2.5Z"/><path d="M9 13v-2.5h5M12 8l2.5 2.5L12 13"/>',
    simpan: '<path d="M7 3.5h10v17l-5-3.5-5 3.5v-17Z"/>',
    disimpan: '<path d="M7 3.5h10v17l-5-3.5-5 3.5v-17Z" fill="currentColor"/>',
    kongsi: '<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12v7.5h14V12"/>',
    main: '<path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/>',
    suara: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    senyap: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    kereta: '<path d="M5 16.5V12l1.8-4.6A1.5 1.5 0 0 1 8.2 6.5h7.6a1.5 1.5 0 0 1 1.4.9L19 12v4.5"/><path d="M3.5 16.5h17M5 12h14"/><circle cx="8" cy="16.5" r="1.8"/><circle cx="16" cy="16.5" r="1.8"/>',
    basikal: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="m6 16 4-7h5l3 7M10 9 8.5 6.5H7M15 9l-3 7"/>',
    kaki: '<circle cx="13" cy="4.5" r="1.8"/><path d="m9 21 2.5-6.5L14 17v4M11.5 14.5 12.5 9l3.5 3 2.5.5M12.5 9 9.5 10.5 8 13.5"/>'
  };
  const ik = n => `<svg class="pj-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[n]}</svg>`;

  /* ---------- Pembantu ---------- */
  const haversine = (a, b) => {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  const bearing = (a, b) => {
    const rad = Math.PI / 180;
    const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
    const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
    return (Math.atan2(y, x) / rad + 360) % 360;
  };
  const fmtM = m => m < 1000 ? `${Math.round(m / 10) * 10 || Math.round(m)} m` : `${(m / 1000).toLocaleString('ms-MY', { maximumFractionDigits: m < 100000 ? 1 : 0 })} km`;
  const fmtMasa = s => {
    const m = Math.round(s / 60);
    if (m < 1) return 'kurang 1 minit';
    if (m < 60) return `${m} minit`;
    const j = Math.floor(m / 60), b = m % 60;
    return b ? `${j} jam ${b} minit` : `${j} jam`;
  };
  const fmtJam = d => d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
  const ARAH8 = ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'];
  const arahKompas = deg => ARAH8[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
  const simpan = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storan penuh atau dilarang */ } };
  const baca = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const ms = n => new Promise(r => setTimeout(r, n));

  // Nominatim: paling banyak 1 permintaan sesaat, dengan cache
  const cacheCari = new Map();
  let giliran = Promise.resolve();
  let terakhir = 0;
  const nominatim = (path, params) => {
    const url = `${NOMINATIM}/${path}?${new URLSearchParams(Object.assign({ format: 'jsonv2', 'accept-language': 'ms,en', addressdetails: 1 }, params))}`;
    if (cacheCari.has(url)) return cacheCari.get(url);
    const p = (giliran = giliran.then(async () => {
      const tunggu = 1100 - (Date.now() - terakhir);
      if (tunggu > 0) await ms(tunggu);
      terakhir = Date.now();
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }));
    cacheCari.set(url, p);
    p.catch(() => cacheCari.delete(url));
    return p;
  };
  // Nama negara mengikut peta ini: Palestin bagi seluruh wilayah itu
  const namaNegara = n => /^(israel|palestinian territory|palestine|palestinian territories|state of palestine)$/i.test(String(n || '').trim()) ? 'Palestin' : n;
  const alamatPendek = r => {
    const a = Object.assign({}, r.address || {});
    if (a.country) a.country = namaNegara(a.country);
    const bahagian = [a.road || a.pedestrian || a.neighbourhood || a.suburb, a.city || a.town || a.village || a.municipality || a.county, a.state, a.country];
    return bahagian.filter((x, i, arr) => x && arr.indexOf(x) === i).join(', ') || String(r.display_name || '').replace(/\b(Israel|Palestinian Territory|Palestinian Territories|State of Palestine)\b/gi, 'Palestin');
  };
  const namaTempat = r => namaNegara(r.name || (r.display_name || '').split(',')[0] || 'Tempat');
  const keTempat = r => ({ name: namaTempat(r), alamat: alamatPendek(r), lat: +r.lat, lng: +r.lon, jenis: r.type || '', kategori: r.category || r.class || '' });

  /* ---------- Keadaan ---------- */
  let map = null;
  let lapisanSemasa = 'jalan';
  let me = null; // { lat, lng, acc, heading, speed }
  let meMarker = null, meBulatan = null;
  let ikutSaya = false;
  let tempat = null; // tempat yang dipilih
  let tempatMarker = null;
  let hasilMarkers = [];
  let laluan = null; // { coords:[{lat,lng}], steps:[], distance, duration, profil, dari, ke, kumul:[] }
  let mod3d = baca('peta.3d', false);
  let alternatif = [];
  let profil = baca('peta.profil', 'car');
  let navi = null; // keadaan navigasi
  let suara = baca('peta.suara', true);
  let kompasAktif = false;
  let headingPeranti = null;
  let aktif = false;

  /* ---------- Antara muka ---------- */
  root.innerHTML = `
    <div id="jalan-map" aria-label="Peta jalan"></div>
    <div class="pj-top">
      <button type="button" class="pj-ikon" id="pjGlob" title="Kembali ke glob 3D" aria-label="Kembali ke glob 3D">${ik('glob')}</button>
      <div class="pj-search">
        <input type="search" id="pjCari" placeholder="Cari tempat atau alamat" autocomplete="off" aria-label="Cari tempat" enterkeyhint="search">
        <button type="button" class="pj-ikon pj-ikon--dalam" id="pjClear" aria-label="Kosongkan" hidden>${ik('tutup')}</button>
        <button type="button" class="pj-ikon pj-ikon--dalam" id="pjGo" aria-label="Cari">${ik('cari')}</button>
      </div>
      <div class="pj-hasil" id="pjHasil" hidden></div>
    </div>
    <div class="pj-chips" id="pjChips">${CHIPS.map(([t, q]) => `<button type="button" class="pj-chip" data-q="${esc(q)}">${esc(t)}</button>`).join('')}</div>
    <div class="pj-fab">
      <button type="button" class="pj-ikon pj-utara" id="pjUtara" title="Hala ke utara" aria-label="Hala peta ke utara" hidden><span class="pj-jarum" aria-hidden="true"></span></button>
      <button type="button" class="pj-ikon pj-ikon--teks" id="pj3d" title="Paparan 3D" aria-label="Paparan 3D" aria-pressed="false">3D</button>
      <button type="button" class="pj-ikon" id="pjLapisan" title="Tukar lapisan peta" aria-label="Tukar lapisan peta">${ik('lapisan')}</button>
      <button type="button" class="pj-ikon" id="pjKompas" title="Kompas" aria-label="Kompas" aria-pressed="false">${ik('kompas')}</button>
      <button type="button" class="pj-ikon pj-ikon--gps" id="pjLokasi" title="Lokasi saya" aria-label="Lokasi saya" aria-pressed="false">${ik('lokasi')}</button>
      <button type="button" class="pj-ikon" id="pjZoomIn" aria-label="Zum masuk">${ik('tambah')}</button>
      <button type="button" class="pj-ikon" id="pjZoomOut" aria-label="Zum keluar">${ik('tolak')}</button>
    </div>
    <div class="pj-lapisan" id="pjLapisanMenu" hidden>
      <button type="button" data-lapisan="jalan" aria-pressed="false"><i class="pj-sw pj-sw--jalan" aria-hidden="true"></i>Jalan</button>
      <button type="button" data-lapisan="gelap" aria-pressed="false"><i class="pj-sw pj-sw--gelap" aria-hidden="true"></i>Malam</button>
      <button type="button" data-lapisan="satelit" aria-pressed="false"><i class="pj-sw pj-sw--satelit" aria-hidden="true"></i>Satelit</button>
    </div>
    <div class="pj-sheet" id="pjSheet" hidden></div>
    <div class="pj-navi" id="pjNavi" hidden></div>
    <div class="pj-toast" id="pjToast" role="status" aria-live="polite" hidden></div>`;

  const input = $('pjCari'), hasilEl = $('pjHasil'), sheet = $('pjSheet'), naviEl = $('pjNavi');
  let toastTimer = 0;
  const toast = (t, lama) => {
    const el = $('pjToast');
    el.textContent = t; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, lama || 3000);
  };

  /* ---------- Peta (MapLibre) ---------- */
  const LL = p => [p.lng, p.lat];
  const Z = z => z - 1; // zum gaya jubin 256 px (seperti Google/Leaflet) ke zum MapLibre (jubin 512 px)
  const WARNA = {
    terang: { saya: '#1d7fd6', laluan: '#1b74c9', tepi: '#0f3f70', alt: '#8a958f', mula: '#ffffff' },
    gelap: { saya: '#5cb4ff', laluan: '#5cb4ff', tepi: '#0a2440', alt: '#7d8a84', mula: '#101714' },
    satelit: { saya: '#5cb4ff', laluan: '#5cb4ff', tepi: '#04182c', alt: '#c9d2cd', mula: '#ffffff' }
  };
  const warna = () => WARNA[GAYA[lapisanSemasa]] || WARNA.terang;
  const kosong = () => ({ type: 'FeatureCollection', features: [] });
  const bulatan = (p, r) => {
    const n = 48, out = [], dLat = r / 111320, dLng = r / (111320 * Math.cos(p.lat * Math.PI / 180));
    for (let i = 0; i <= n; i++) { const a = i / n * 2 * Math.PI; out.push([p.lng + dLng * Math.cos(a), p.lat + dLat * Math.sin(a)]); }
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [out] } }] };
  };
  const dataLaluan = () => {
    const f = [];
    if (laluan) {
      alternatif.forEach((r, j) => { if (r !== laluan) f.push({ type: 'Feature', properties: { jenis: 'alt', j }, geometry: { type: 'LineString', coordinates: r.coords.map(LL) } }); });
      f.push({ type: 'Feature', properties: { jenis: 'utama' }, geometry: { type: 'LineString', coordinates: laluan.coords.map(LL) } });
      f.push({ type: 'Feature', properties: { jenis: 'mula' }, geometry: { type: 'Point', coordinates: LL(laluan.dari) } });
    }
    return { type: 'FeatureCollection', features: f };
  };
  const setData = (id, d) => { const src = map && map.getSource(id); if (src) src.setData(d); };
  const setLaluan = () => setData('pj-laluan', dataLaluan());
  // Lapisan sendiri (laluan, ketepatan GPS) dipasang semula setiap kali gaya bertukar, di bawah label peta
  function pasangLapisanSendiri() {
    const w = warna();
    const label = (map.getStyle().layers.find(l => l.type === 'symbol') || {}).id;
    if (!map.getSource('pj-laluan')) map.addSource('pj-laluan', { type: 'geojson', data: dataLaluan() });
    if (!map.getSource('pj-ketepatan')) map.addSource('pj-ketepatan', { type: 'geojson', data: me ? bulatan(me, me.acc || 0) : kosong() });
    const lebar = k => ['interpolate', ['exponential', 1.5], ['zoom'], 8, 3 * k, 13, 5 * k, 17, 10 * k, 20, 22 * k];
    const tambah = l => { if (!map.getLayer(l.id)) map.addLayer(l, label); };
    tambah({ id: 'pj-ketepatan', type: 'fill', source: 'pj-ketepatan', paint: { 'fill-color': w.saya, 'fill-opacity': 0.1, 'fill-outline-color': w.saya } });
    tambah({ id: 'pj-laluan-alt', type: 'line', source: 'pj-laluan', filter: ['==', ['get', 'jenis'], 'alt'], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': w.alt, 'line-width': lebar(1), 'line-opacity': 0.85 } });
    tambah({ id: 'pj-laluan-tepi', type: 'line', source: 'pj-laluan', filter: ['==', ['get', 'jenis'], 'utama'], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': w.tepi, 'line-width': lebar(1.6), 'line-opacity': 0.6 } });
    tambah({ id: 'pj-laluan-garis', type: 'line', source: 'pj-laluan', filter: ['==', ['get', 'jenis'], 'utama'], layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': w.laluan, 'line-width': lebar(1) } });
    tambah({ id: 'pj-laluan-mula', type: 'circle', source: 'pj-laluan', filter: ['==', ['get', 'jenis'], 'mula'], paint: { 'circle-radius': 6, 'circle-color': w.mula, 'circle-stroke-color': w.laluan, 'circle-stroke-width': 3, 'circle-pitch-alignment': 'map' } });
    terapkan3D(false);
  }
  // Mod 3D: condong, rupa bumi berbukit (Terrain Tiles) dan bangunan 3D. Glob apabila zum jauh.
  function terapkan3D(gerak) {
    if (!map || !map.getStyle()) return;
    PG.terap3D(map, mod3d);
    $('pj3d').setAttribute('aria-pressed', String(mod3d));
    $('pj3d').textContent = mod3d ? '2D' : '3D';
    $('pj3d').setAttribute('aria-label', mod3d ? 'Paparan 2D' : 'Paparan 3D');
    if (gerak && !navi) map.easeTo({ pitch: mod3d ? 60 : 0, bearing: mod3d ? map.getBearing() : 0, zoom: mod3d ? Math.max(map.getZoom(), Z(16)) : map.getZoom(), duration: reduceMotion ? 0 : 1200 });
  }
  // Gaya vektor dengan sandaran raster (js/peta-gaya.js)
  const muatGaya = k => PG.muatGaya(map, GAYA[k]);
  function pasangPeta() {
    if (map) return;
    lapisanSemasa = baca('peta.lapisan', 'jalan');
    if (!GAYA[lapisanSemasa]) lapisanSemasa = 'jalan';
    map = new ML.Map({ container: 'jalan-map', style: { version: 8, sources: {}, layers: [] }, center: LL({ lat: PUSAT[0], lng: PUSAT[1] }), zoom: Z(12), maxZoom: 20, maxPitch: 75,
      attributionControl: { compact: true }, fadeDuration: 200, pixelRatio: Math.min(window.devicePixelRatio || 1, 2), dragRotate: true, pitchWithRotate: true, touchPitch: true });
    map.on('style.load', pasangLapisanSendiri);
    muatGaya(lapisanSemasa);
    // Mod 3D yang disimpan: condongkan kamera sebaik gaya sebenar siap
    const condongAwal = () => { if (!map.getSource('openmaptiles') && !map.getSource('r')) return; map.off('style.load', condongAwal); if (mod3d) terapkan3D(true); };
    map.on('style.load', condongAwal);
    map.on('dragstart', () => { if (ikutSaya) setIkut(false); });
    // Klik kanan, atau tekan lama pada skrin sentuh: "Apa di sini?"
    map.on('contextmenu', e => pilihKoordinat(e.lngLat.lat, e.lngLat.lng));
    let tekanLama = 0;
    map.on('touchstart', e => { clearTimeout(tekanLama); if (e.originalEvent.touches.length === 1) tekanLama = setTimeout(() => pilihKoordinat(e.lngLat.lat, e.lngLat.lng), 650); });
    for (const ev of ['touchend', 'touchcancel', 'movestart', 'pitchstart', 'rotatestart']) map.on(ev, () => clearTimeout(tekanLama));
    map.on('click', () => { hasilEl.hidden = true; $('pjLapisanMenu').hidden = true; });
    map.on('click', 'pj-laluan-alt', e => { const f = e.features && e.features[0]; if (f) pilihLaluan(+f.properties.j); });
    map.on('mouseenter', 'pj-laluan-alt', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'pj-laluan-alt', () => { map.getCanvas().style.cursor = ''; });
    // Jarum utara: muncul apabila peta dipusing atau dicondongkan
    const jarum = () => {
      const b = map.getBearing(), p = map.getPitch();
      $('pjUtara').hidden = Math.abs(b) < 0.5 && p < 1;
      $('pjUtara').firstElementChild.style.transform = `rotateX(${p * 0.6}deg) rotate(${-b}deg)`;
    };
    map.on('rotate', jarum); map.on('pitch', jarum);
    $$('[data-lapisan]').forEach(b => b.addEventListener('click', () => tukarLapisan(b.dataset.lapisan)));
  }
  function tukarLapisan(k) {
    if (!GAYA[k] || k === lapisanSemasa) { $('pjLapisanMenu').hidden = true; return; }
    lapisanSemasa = k;
    muatGaya(k);
    simpan('peta.lapisan', k);
    root.dataset.lapisan = k;
    tandaLapisan();
    $('pjLapisanMenu').hidden = true;
  }
  // Gerak kamera ke titik (zum dalam skala Google/Leaflet)
  const pandang = (p, z, animasi) => map[animasi && !reduceMotion ? 'easeTo' : 'jumpTo']({ center: LL(p), zoom: z == null ? map.getZoom() : Z(z), duration: 500 });

  const tandaLapisan = () => $$('[data-lapisan]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lapisan === lapisanSemasa)));

  /* ---------- Mod: glob <-> jalan ---------- */
  function buka(opsyen) {
    aktif = true;
    document.body.classList.add('mode-jalan');
    root.hidden = false; // bekas mesti kelihatan sebelum peta mengukur saiznya
    if (glob && glob.ditutup) glob.ditutup(true);
    try { pasangPeta(); } catch (e) { $('jalan-map').innerHTML = '<p class="pj-tiada">Peta jalan memerlukan WebGL. Kemas kini pelayar atau cuba pelayar lain.</p>'; return; }
    root.dataset.lapisan = lapisanSemasa;
    tandaLapisan();
    map.resize();
    setTimeout(() => map.resize(), 50);
    lukisSaya();
    if (opsyen && opsyen.lat != null) pandang(opsyen, opsyen.zoom || 15);
    else if (me) pandang(me, 15);
    if (!(opsyen && opsyen.fokusTiada)) setTimeout(() => { if (!narrow()) input.focus({ preventScroll: true }); }, 100);
  }
  function tutup() {
    aktif = false;
    document.body.classList.remove('mode-jalan');
    root.hidden = true;
    hasilEl.hidden = true;
    if (glob && glob.ditutup) glob.ditutup(false);
  }
  $('pjGlob').addEventListener('click', () => {
    if (navi) { toast('Tamatkan navigasi dahulu.'); return; }
    tutup();
    if (glob && tempat) glob.flyTo(tempat.lat, tempat.lng);
  });
  $('pjZoomIn').addEventListener('click', () => map.zoomIn());
  $('pjZoomOut').addEventListener('click', () => map.zoomOut());
  $('pj3d').addEventListener('click', () => { mod3d = !mod3d; simpan('peta.3d', mod3d); terapkan3D(true); });
  $('pjUtara').addEventListener('click', () => map.easeTo({ bearing: 0, pitch: navi || mod3d ? map.getPitch() : 0, duration: reduceMotion ? 0 : 600 }));
  $('pjLapisan').addEventListener('click', e => { e.stopPropagation(); const m = $('pjLapisanMenu'); m.hidden = !m.hidden; });

  /* ---------- Lokasi saya ---------- */
  function setIkut(on) {
    ikutSaya = on;
    $('pjLokasi').setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on && me) { if (navi) kameraNavi(true); else pandang(me, Math.max(map.getZoom() + 1, 15), true); }
  }
  $('pjLokasi').addEventListener('click', () => {
    if (!me) {
      if (glob) { glob.startGps(); toast('Mencari isyarat GPS...'); setIkut(true); }
      return;
    }
    setIkut(true);
  });
  function lukisSaya() {
    if (!map || !me) return;
    const deg = me.heading != null ? me.heading : headingPeranti;
    if (!meMarker) {
      const el = document.createElement('div');
      el.className = 'pj-me-wrap';
      el.innerHTML = '<div class="pj-me"><div class="pj-me-arah"></div><span class="pg-saya"></span></div>';
      // Kon arah terletak rata di atas jalan dan berpusing bersama peta
      meMarker = new ML.Marker({ element: el, rotationAlignment: 'map', pitchAlignment: 'map' }).setLngLat(LL(me)).addTo(map);
    } else meMarker.setLngLat(LL(me));
    setData('pj-ketepatan', bulatan(me, Math.min(me.acc || 0, 2000)));
    meMarker.setRotation(deg != null ? deg : 0);
    const arah = meMarker.getElement().querySelector('.pj-me-arah');
    if (arah) arah.classList.toggle('ada', deg != null);
    if (ikutSaya) { if (navi) kameraNavi(); else pandang(me, null, true); }
  }
  // Kamera navigasi: condong, berpusing mengikut arah perjalanan, lokasi di bahagian bawah skrin
  function kameraNavi(segera) {
    if (!map || !me) return;
    const arah = me.heading != null ? me.heading : headingPeranti;
    map.easeTo({ center: LL(me), zoom: Math.max(map.getZoom(), Z(17)), pitch: 58, bearing: arah != null ? arah : map.getBearing(),
      offset: [0, Math.round(map.getContainer().clientHeight * 0.22)], duration: reduceMotion || segera ? 0 : 900, easing: t => t });
  }
  let posSebelum = null;
  function padaLokasi(pos) {
    const c = pos.coords;
    const baru = { lat: c.latitude, lng: c.longitude, acc: c.accuracy, speed: c.speed, heading: (typeof c.heading === 'number' && !isNaN(c.heading) && c.speed > 0.8) ? c.heading : null, t: pos.timestamp || Date.now() };
    // Arah daripada pergerakan jika peranti tidak memberi heading
    if (baru.heading == null && posSebelum && haversine(posSebelum, baru) > 4) baru.heading = bearing(posSebelum, baru);
    posSebelum = me;
    me = baru;
    lukisSaya();
    if (navi) kemasNavi();
    if (tempat && sheet.dataset.mod === 'tempat') { const j = $('pjJarak'); if (j) j.textContent = `${fmtM(haversine(me, tempat))} dari anda`; }
  }
  if (glob) glob.onPos(padaLokasi);

  /* ---------- Kompas peranti ---------- */
  function padaOrientasi(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
    else if (e.absolute && typeof e.alpha === 'number') h = (360 - e.alpha) % 360;
    if (h == null) return;
    headingPeranti = h;
    $('pjKompas').style.transform = `rotate(${-h}deg)`;
    if (me && me.heading == null) lukisSaya();
  }
  $('pjKompas').addEventListener('click', async () => {
    if (kompasAktif) {
      window.removeEventListener('deviceorientationabsolute', padaOrientasi);
      window.removeEventListener('deviceorientation', padaOrientasi);
      kompasAktif = false; headingPeranti = null;
      $('pjKompas').style.transform = ''; $('pjKompas').setAttribute('aria-pressed', 'false');
      return;
    }
    try {
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') { toast('Akses kompas ditolak.'); return; }
      }
    } catch (e) { toast('Kompas tidak tersedia.'); return; }
    if (!('ondeviceorientationabsolute' in window) && !('ondeviceorientation' in window)) { toast('Peranti ini tiada kompas.'); return; }
    window.addEventListener('deviceorientationabsolute', padaOrientasi);
    window.addEventListener('deviceorientation', padaOrientasi);
    kompasAktif = true;
    $('pjKompas').setAttribute('aria-pressed', 'true');
    toast('Kompas dihidupkan. Pusingkan telefon untuk arah.');
  });

  /* ---------- Carian ---------- */
  let cariTimer = 0, cariId = 0;
  const kotakPandang = () => {
    if (!map) return {};
    const b = map.getBounds();
    return { viewbox: `${b.getWest()},${b.getNorth()},${b.getEast()},${b.getSouth()}`, bounded: 0 };
  };
  const koordDariTeks = t => {
    const m = String(t).trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (!m) return null;
    const lat = +m[1], lng = +m[2];
    return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  };
  const kotak = pts => pts.reduce((b, p) => [[Math.min(b[0][0], p.lng), Math.min(b[0][1], p.lat)], [Math.max(b[1][0], p.lng), Math.max(b[1][1], p.lat)]], [[180, 90], [-180, -90]]);
  const kosongHasil = () => { hasilMarkers.forEach(m => m.remove()); hasilMarkers = []; };
  async function cari(q, pilihPertama) {
    q = String(q || '').trim();
    if (!q) { paparSenaraiMula(); return; }
    const k = koordDariTeks(q);
    if (k) { pilihKoordinat(k.lat, k.lng); return; }
    const id = ++cariId;
    hasilEl.innerHTML = '<div class="pj-item pj-muted">Mencari...</div>'; hasilEl.hidden = false;
    let rows;
    try { rows = await nominatim('search', Object.assign({ q, limit: 8 }, kotakPandang())); }
    catch (e) { if (id === cariId) hasilEl.innerHTML = `<div class="pj-item pj-muted">${navigator.onLine === false ? 'Anda luar talian.' : 'Carian gagal. Cuba lagi.'}</div>`; return; }
    if (id !== cariId) return;
    const senarai = (rows || []).map(keTempat);
    if (!senarai.length) { hasilEl.innerHTML = '<div class="pj-item pj-muted">Tiada hasil. Cuba nama lain.</div>'; return; }
    if (pilihPertama && senarai.length === 1) { pilihTempat(senarai[0]); return; }
    kosongHasil();
    senarai.forEach((t, i) => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'pj-hasil-titik'; el.setAttribute('aria-label', t.name); el.textContent = String(i + 1);
      el.addEventListener('click', e => { e.stopPropagation(); pilihTempat(t); });
      hasilMarkers.push(new ML.Marker({ element: el }).setLngLat(LL(t)).addTo(map));
      t.i = i;
    });
    hasilEl.innerHTML = senarai.map((t, i) => `<button type="button" class="pj-item" data-i="${i}"><b>${esc(t.name)}</b><span>${esc(t.alamat)}</span>${me ? `<em>${fmtM(haversine(me, t))}</em>` : ''}</button>`).join('');
    $$('.pj-item', hasilEl).forEach(b => b.addEventListener('click', () => pilihTempat(senarai[+b.dataset.i])));
    if (senarai.length > 1 && map) map.fitBounds(kotak(senarai), { padding: { top: 140, bottom: 60, left: narrow() ? 40 : 600, right: 80 }, maxZoom: Z(15), duration: reduceMotion ? 0 : 800 });
    hasilEl.hidden = false;
  }
  input.addEventListener('input', () => {
    $('pjClear').hidden = !input.value;
    clearTimeout(cariTimer);
    if (!input.value.trim()) { paparSenaraiMula(); return; }
    cariTimer = setTimeout(() => cari(input.value), 550);
  });
  input.addEventListener('focus', () => { if (!input.value.trim()) paparSenaraiMula(); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(cariTimer); cari(input.value, true); } if (e.key === 'Escape') { hasilEl.hidden = true; input.blur(); } });
  $('pjGo').addEventListener('click', () => { clearTimeout(cariTimer); cari(input.value, true); });
  $('pjClear').addEventListener('click', () => { input.value = ''; $('pjClear').hidden = true; kosongHasil(); hasilEl.hidden = true; input.focus(); });
  $$('.pj-chip').forEach(b => b.addEventListener('click', () => { input.value = b.dataset.q; $('pjClear').hidden = false; cari(b.dataset.q + (me || map ? '' : ' Malaysia')); }));

  // Tempat disimpan dan carian terbaru apabila kotak carian kosong
  function paparSenaraiMula() {
    const disimpan = baca('peta.simpan', []), baru = baca('peta.baru', []);
    if (!disimpan.length && !baru.length) { hasilEl.hidden = true; return; }
    hasilEl.innerHTML = (disimpan.length ? `<div class="pj-head">Tempat disimpan</div>${disimpan.map((t, i) => `<button type="button" class="pj-item" data-s="${i}"><b>★ ${esc(t.name)}</b><span>${esc(t.alamat || '')}</span></button>`).join('')}` : '')
      + (baru.length ? `<div class="pj-head">Terbaru</div>${baru.map((t, i) => `<button type="button" class="pj-item" data-b="${i}"><b>${esc(t.name)}</b><span>${esc(t.alamat || '')}</span></button>`).join('')}` : '');
    $$('.pj-item', hasilEl).forEach(b => b.addEventListener('click', () => pilihTempat(b.dataset.s != null ? disimpan[+b.dataset.s] : baru[+b.dataset.b])));
    hasilEl.hidden = false;
  }
  const ingat = t => {
    const baru = baca('peta.baru', []).filter(x => !(Math.abs(x.lat - t.lat) < 1e-5 && Math.abs(x.lng - t.lng) < 1e-5));
    baru.unshift({ name: t.name, alamat: t.alamat, lat: t.lat, lng: t.lng });
    simpan('peta.baru', baru.slice(0, 8));
  };
  const disimpanKah = t => baca('peta.simpan', []).some(x => Math.abs(x.lat - t.lat) < 1e-5 && Math.abs(x.lng - t.lng) < 1e-5);

  async function pilihKoordinat(lat, lng) {
    const t = { name: 'Titik dipilih', alamat: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
    pilihTempat(t, true);
    try {
      const r = await nominatim('reverse', { lat, lon: lng, zoom: 18 });
      if (r && !r.error && tempat === t) { t.name = namaTempat(r); t.alamat = alamatPendek(r); paparTempat(); }
    } catch (e) { /* kekal dengan koordinat */ }
  }
  function pilihTempat(t, tanpaIngat) {
    tempat = t;
    hasilEl.hidden = true;
    input.value = t.name; $('pjClear').hidden = false;
    if (!tanpaIngat) ingat(t);
    if (tempatMarker) tempatMarker.remove();
    const pin = document.createElement('div');
    pin.className = 'pj-pin-wrap'; pin.innerHTML = '<div class="pj-pin"></div>';
    tempatMarker = new ML.Marker({ element: pin, anchor: 'bottom' }).setLngLat(LL(t)).addTo(map);
    setIkut(false);
    const z = Math.max(map.getZoom(), Z(15));
    if (reduceMotion) map.jumpTo({ center: LL(t), zoom: z }); else map.flyTo({ center: LL(t), zoom: z, duration: 1400, essential: true, padding: narrow() ? { bottom: 260 } : { left: 420 } });
    if (glob) glob.setDest(t.lat, t.lng, t.name);
    paparTempat();
    muatInfoTempat(t);
  }

  /* ---------- Kad tempat ---------- */
  const labelSuara = () => suara ? `${ik('suara')}Suara` : `${ik('senyap')}Senyap`;
  const labelSimpan = t => disimpanKah(t) ? `${ik('disimpan')}Disimpan` : `${ik('simpan')}Simpan`;
  function paparTempat() {
    if (!tempat) return;
    const t = tempat;
    sheet.dataset.mod = 'tempat';
    sheet.innerHTML = `
      <div class="pj-grip"></div>
      <div class="pj-sheet-head"><div><h2>${esc(t.name)}</h2><p>${esc(t.alamat || '')}</p>${me ? `<p class="pj-jarak" id="pjJarak">${fmtM(haversine(me, t))} dari anda</p>` : ''}</div><button type="button" class="pj-ikon pj-ikon--kecil" id="pjTutup" aria-label="Tutup">${ik('tutup')}</button></div>
      <div class="pj-aksi">
        <button type="button" class="pj-btn pj-btn--utama" id="pjArah">${ik('arah')}Arah ke sini</button>
        <button type="button" class="pj-btn" id="pjSimpan">${labelSimpan(t)}</button>
        <button type="button" class="pj-btn" id="pjKongsi">${ik('kongsi')}Kongsi</button>
        <button type="button" class="pj-btn" id="pjGlobLihat">${ik('glob')}Glob</button>
      </div>
      <div class="pj-info" id="pjInfo"><div class="pj-info-item"><span>Koordinat</span><b>${t.lat.toFixed(5)}, ${t.lng.toFixed(5)}</b></div></div>`;
    sheet.hidden = false;
    $('pjTutup').addEventListener('click', tutupSheet);
    $('pjArah').addEventListener('click', () => mulaArah(t));
    $('pjSimpan').addEventListener('click', () => {
      let s = baca('peta.simpan', []);
      if (disimpanKah(t)) { s = s.filter(x => !(Math.abs(x.lat - t.lat) < 1e-5 && Math.abs(x.lng - t.lng) < 1e-5)); toast('Dibuang daripada tempat disimpan.'); }
      else { s.unshift({ name: t.name, alamat: t.alamat, lat: t.lat, lng: t.lng }); toast('Tempat disimpan.'); }
      simpan('peta.simpan', s.slice(0, 50));
      $('pjSimpan').innerHTML = labelSimpan(t);
    });
    $('pjKongsi').addEventListener('click', async () => {
      const url = `${location.origin}${location.pathname}#tempat=${t.lat.toFixed(5)},${t.lng.toFixed(5)},${encodeURIComponent(t.name)}`;
      try {
        if (navigator.share) await navigator.share({ title: t.name, text: `${t.name}: ${t.alamat || ''}`, url });
        else { await navigator.clipboard.writeText(url); toast('Pautan disalin.'); }
      } catch (e) { /* dibatalkan */ }
    });
    $('pjGlobLihat').addEventListener('click', () => { tutup(); if (glob) glob.flyTo(t.lat, t.lng); });
  }
  function tutupSheet() { sheet.hidden = true; sheet.dataset.mod = ''; }

  // Cuaca semasa dan waktu solat di tempat itu (dipaparkan jika berjaya sahaja)
  const KOD_CUACA = { 0: 'Cerah', 1: 'Kebanyakannya cerah', 2: 'Sebahagian berawan', 3: 'Mendung', 45: 'Berkabus', 48: 'Berkabus', 51: 'Gerimis', 53: 'Gerimis', 55: 'Gerimis lebat', 61: 'Hujan ringan', 63: 'Hujan', 65: 'Hujan lebat', 66: 'Hujan beku', 67: 'Hujan beku', 71: 'Salji', 73: 'Salji', 75: 'Salji lebat', 77: 'Salji', 80: 'Hujan renyai', 81: 'Hujan', 82: 'Hujan sangat lebat', 85: 'Salji', 86: 'Salji', 95: 'Ribut petir', 96: 'Ribut petir dan hujan batu', 99: 'Ribut petir dan hujan batu' };
  async function muatInfoTempat(t) {
    const info = $('pjInfo');
    const tambah = (label, nilai) => { if (tempat !== t || !info || !info.isConnected) return; const d = document.createElement('div'); d.className = 'pj-info-item'; d.innerHTML = `<span>${esc(label)}</span><b>${esc(nilai)}</b>`; info.appendChild(d); };
    try {
      const r = await fetch(`${CUACA}?latitude=${t.lat}&longitude=${t.lng}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`);
      const j = r.ok ? await r.json() : null;
      const c = j && j.current;
      if (c && typeof c.temperature_2m === 'number') tambah('Cuaca sekarang', `${Math.round(c.temperature_2m)}°C, ${KOD_CUACA[c.weather_code] || 'Tidak pasti'}, angin ${Math.round(c.wind_speed_10m || 0)} km/j`);
    } catch (e) { /* cuaca tiada */ }
    try {
      const d = new Date();
      const tarikh = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      const kod = glob && glob.countryCodeAt ? glob.countryCodeAt(t.lat, t.lng) : '';
      const kaedah = kod === 'MY' ? 17 : kod === 'SG' ? 11 : kod === 'ID' ? 20 : 3;
      const r = await fetch(`${SOLAT}/${tarikh}?latitude=${t.lat}&longitude=${t.lng}&method=${kaedah}`);
      const j = r.ok ? await r.json() : null;
      const w = j && j.data && j.data.timings;
      if (w) tambah(`Waktu solat di sini${kaedah === 3 ? ' (anggaran)' : ''}`, `Subuh ${w.Fajr}, Zohor ${w.Dhuhr}, Asar ${w.Asr}, Maghrib ${w.Maghrib}, Isyak ${w.Isha}`.replace(/ \(\+\d+\)/g, ''));
    } catch (e) { /* waktu solat tiada */ }
  }

  /* ---------- Arah perjalanan ---------- */
  const terjemahLangkah = s => {
    const m = s.maneuver || {}, mod = m.modifier || '', jalan = s.name ? ` ke ${s.name}` : '';
    const belok = { left: 'kiri', right: 'kanan', 'slight left': 'sedikit ke kiri', 'slight right': 'sedikit ke kanan', 'sharp left': 'tajam ke kiri', 'sharp right': 'tajam ke kanan', straight: 'lurus', uturn: 'pusingan U' }[mod] || '';
    const ikon = { left: '↰', right: '↱', 'slight left': '↖', 'slight right': '↗', 'sharp left': '↙', 'sharp right': '↘', straight: '↑', uturn: '↩' }[mod] || '↑';
    switch (m.type) {
      case 'depart': return { ikon: '●', teks: `Bertolak${jalan}${m.bearing_after != null ? ` menghala ${arahKompas(m.bearing_after)}` : ''}` };
      case 'arrive': return { ikon: '◆', teks: `Tiba di destinasi${mod === 'left' ? ', di sebelah kiri' : mod === 'right' ? ', di sebelah kanan' : ''}` };
      case 'roundabout': case 'rotary': return { ikon: '⟳', teks: `Di bulatan, ambil keluar ke-${m.exit || 1}${jalan}` };
      case 'roundabout turn': return { ikon: '⟳', teks: `Di bulatan, belok ${belok || 'kanan'}${jalan}` };
      case 'exit roundabout': case 'exit rotary': return { ikon: '⟳', teks: `Keluar dari bulatan${jalan}` };
      case 'merge': return { ikon: ikon, teks: `Masuk ${belok ? 'ke ' + belok : ''}${jalan}`.replace(/\s+/g, ' ') };
      case 'on ramp': return { ikon: ikon, teks: `Ambil susur masuk${belok ? ' ' + belok : ''}${jalan}` };
      case 'off ramp': return { ikon: ikon, teks: `Ambil susur keluar${belok ? ' ' + belok : ''}${jalan}` };
      case 'fork': return { ikon: ikon, teks: `Ambil cabang ${belok || 'kiri'}${jalan}` };
      case 'end of road': return { ikon: ikon, teks: `Di hujung jalan, belok ${belok || 'kanan'}${jalan}` };
      case 'new name': case 'continue': case 'notification': return mod && mod !== 'straight' ? { ikon, teks: `Belok ${belok}${jalan}` } : { ikon: '↑', teks: `Teruskan lurus${jalan}` };
      case 'turn': default:
        if (mod === 'uturn') return { ikon, teks: `Buat pusingan U${jalan}` };
        if (mod === 'straight' || !belok) return { ikon: '↑', teks: `Teruskan lurus${jalan}` };
        return { ikon, teks: `Belok ${belok}${jalan}` };
    }
  };
  async function mintaLaluan(dari, ke, prof) {
    const q = `${dari.lng},${dari.lat};${ke.lng},${ke.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    const pangkal = [OSRM[prof]].concat(prof === 'car' ? [OSRM_SANDARAN] : []);
    let ralat = null;
    for (const p of pangkal) {
      try {
        const r = await fetch(`${p}/route/v1/driving/${q}`);
        const j = r.ok ? await r.json() : null;
        if (j && j.code === 'Ok' && j.routes && j.routes.length) return j.routes;
        ralat = new Error(j && j.code ? j.code : 'HTTP ' + r.status);
      } catch (e) { ralat = e; }
    }
    throw ralat || new Error('tiada laluan');
  }
  const olahLaluan = (r, prof, dari, ke) => {
    const coords = r.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
    const kumul = [0];
    for (let i = 1; i < coords.length; i++) kumul.push(kumul[i - 1] + haversine(coords[i - 1], coords[i]));
    const steps = [];
    let jarakStep = 0;
    (r.legs || []).forEach(leg => (leg.steps || []).forEach(s => {
      const t = terjemahLangkah(s);
      steps.push({ ikon: t.ikon, teks: t.teks, jarak: s.distance || 0, masa: s.duration || 0, mula: jarakStep, lokasi: s.maneuver && s.maneuver.location ? { lat: s.maneuver.location[1], lng: s.maneuver.location[0] } : null });
      jarakStep += s.distance || 0;
    }));
    return { coords, kumul, steps, distance: r.distance, duration: r.duration, profil: prof, dari, ke };
  };
  async function mulaArah(ke, dariPilihan) {
    const dari = dariPilihan || me;
    if (!dari) {
      if (glob) { glob.startGps(); }
      toast('Menunggu lokasi anda... Benarkan GPS, atau klik kanan peta untuk titik mula.', 5000);
      sheet.dataset.mod = 'arah';
      sheet.innerHTML = `<div class="pj-grip"></div><div class="pj-sheet-head"><div><h2>Arah ke ${esc(ke.name)}</h2><p>Menunggu isyarat GPS untuk titik mula...</p></div><button type="button" class="pj-ikon pj-ikon--kecil" id="pjTutup" aria-label="Tutup">${ik('tutup')}</button></div>
        <div class="pj-aksi"><button type="button" class="pj-btn" id="pjDariPeta">Pilih titik mula di peta</button></div>`;
      sheet.hidden = false;
      $('pjTutup').addEventListener('click', tutupSheet);
      $('pjDariPeta').addEventListener('click', () => { toast('Klik kanan atau ketik lama pada peta untuk titik mula.', 4000); map.once('contextmenu', e => mulaArah(ke, { lat: e.latlng.lat, lng: e.latlng.lng })); });
      const tunggu = setInterval(() => { if (me) { clearInterval(tunggu); if (sheet.dataset.mod === 'arah' && !laluan) mulaArah(ke); } }, 1000);
      setTimeout(() => clearInterval(tunggu), 60000);
      return;
    }
    sheet.dataset.mod = 'arah';
    sheet.innerHTML = `<div class="pj-grip"></div><div class="pj-sheet-head"><div><h2>Arah ke ${esc(ke.name)}</h2><p>Mengira laluan ${PROFIL[profil].toLowerCase()}...</p></div><button type="button" class="pj-ikon pj-ikon--kecil" id="pjTutup" aria-label="Tutup">${ik('tutup')}</button></div>`;
    sheet.hidden = false;
    $('pjTutup').addEventListener('click', () => { tutupSheet(); kosongkanLaluan(); });
    let routes;
    try { routes = await mintaLaluan(dari, ke, profil); }
    catch (e) {
      if (sheet.dataset.mod !== 'arah') return;
      sheet.querySelector('p').textContent = navigator.onLine === false ? 'Anda luar talian. Laluan memerlukan internet.' : 'Laluan tidak dijumpai. Cuba mod lain atau titik lain.';
      const b = document.createElement('div'); b.className = 'pj-aksi'; b.innerHTML = pilihanProfil(); sheet.appendChild(b); ikatProfil(ke, dari);
      return;
    }
    alternatif = routes.map(r => olahLaluan(r, profil, dari, ke));
    pilihLaluan(0);
  }
  const pilihanProfil = () => Object.keys(PROFIL).map(k => `<button type="button" class="pj-btn pj-btn--profil${k === profil ? ' aktif' : ''}" data-profil="${k}">${ik(k === 'car' ? 'kereta' : k === 'bike' ? 'basikal' : 'kaki')}${PROFIL[k]}</button>`).join('');
  const ikatProfil = (ke, dari) => $$('[data-profil]', sheet).forEach(b => b.addEventListener('click', () => { profil = b.dataset.profil; simpan('peta.profil', profil); mulaArah(ke, dari === me ? null : dari); }));
  function kosongkanLaluan() {
    laluan = null; alternatif = [];
    setLaluan();
    if (glob) glob.setRoute(null);
  }
  function pilihLaluan(i) {
    laluan = alternatif[i];
    if (!laluan) return;
    setLaluan();
    if (!navi) map.fitBounds(kotak(laluan.coords), { padding: narrow() ? { top: 130, bottom: Math.round(window.innerHeight * 0.5), left: 40, right: 40 } : { top: 130, bottom: 70, left: 470, right: 90 }, bearing: 0, pitch: mod3d ? 45 : 0, duration: reduceMotion ? 0 : 1000 });
    if (glob) glob.setRoute(laluan.coords);
    paparArah(i);
  }
  function paparArah(i) {
    const r = laluan, ke = r.ke;
    const tiba = new Date(Date.now() + r.duration * 1000);
    sheet.dataset.mod = 'arah';
    sheet.innerHTML = `
      <div class="pj-grip"></div>
      <div class="pj-sheet-head"><div><h2>${fmtMasa(r.duration)} <small>(${fmtM(r.distance)})</small></h2><p>Ke ${esc(ke.name)} · tiba sekitar ${fmtJam(tiba)}${r.profil !== 'car' ? '' : ' tanpa kesesakan'}</p></div><button type="button" class="pj-ikon pj-ikon--kecil" id="pjTutup" aria-label="Tutup">${ik('tutup')}</button></div>
      <div class="pj-aksi">${pilihanProfil()}</div>
      ${alternatif.length > 1 ? `<div class="pj-alt">${alternatif.map((a, j) => `<button type="button" class="pj-btn pj-btn--kecil${j === i ? ' aktif' : ''}" data-alt="${j}">Laluan ${j + 1}: ${fmtMasa(a.duration)}, ${fmtM(a.distance)}</button>`).join('')}</div>` : ''}
      <div class="pj-aksi"><button type="button" class="pj-btn pj-btn--utama pj-btn--besar" id="pjMulaNavi">${ik('main')}Mula navigasi</button><button type="button" class="pj-btn" id="pjSuara" aria-pressed="${suara}">${labelSuara()}</button></div>
      <ol class="pj-langkah">${r.steps.map(s => `<li><span class="pj-ikon-langkah">${esc(s.ikon)}</span><div><b>${esc(s.teks)}</b>${s.jarak > 0 ? `<span>${fmtM(s.jarak)}</span>` : ''}</div></li>`).join('')}</ol>`;
    sheet.hidden = false;
    $('pjTutup').addEventListener('click', () => { tutupSheet(); kosongkanLaluan(); });
    ikatProfil(ke, r.dari);
    $$('[data-alt]', sheet).forEach(b => b.addEventListener('click', () => pilihLaluan(+b.dataset.alt)));
    $('pjMulaNavi').addEventListener('click', mulaNavi);
    $('pjSuara').addEventListener('click', () => { suara = !suara; simpan('peta.suara', suara); $('pjSuara').innerHTML = labelSuara(); $('pjSuara').setAttribute('aria-pressed', String(suara)); if (suara) cakap('Suara navigasi dihidupkan.'); });
  }

  /* ---------- Navigasi langsung ---------- */
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let suaraMs = null;
  const pilihSuara = () => {
    if (!synth) return null;
    const v = synth.getVoices();
    return v.find(x => /^ms/i.test(x.lang)) || v.find(x => /^id/i.test(x.lang)) || null;
  };
  if (synth) { suaraMs = pilihSuara(); synth.onvoiceschanged = () => { suaraMs = pilihSuara(); }; }
  function cakap(teks) {
    if (!suara || !synth) return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(teks);
      u.lang = 'ms-MY'; u.rate = 1;
      if (suaraMs) u.voice = suaraMs;
      synth.speak(u);
    } catch (e) { /* suara tiada */ }
  }
  // Titik terdekat pada laluan: indeks segmen, jarak sepanjang laluan dan jarak sisi (m)
  function unjurKeLaluan(p) {
    const c = laluan.coords, cosLat = Math.cos(p.lat * Math.PI / 180);
    let terbaik = { d: Infinity, along: 0, i: 0 };
    for (let i = 0; i < c.length - 1; i++) {
      const ax = c[i].lng * cosLat, ay = c[i].lat, bx = c[i + 1].lng * cosLat, by = c[i + 1].lat, px = p.lng * cosLat, py = p.lat;
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const qx = ax + t * dx, qy = ay + t * dy;
      const d = Math.hypot(px - qx, py - qy) * 111320;
      if (d < terbaik.d) terbaik = { d, i, along: laluan.kumul[i] + t * (laluan.kumul[i + 1] - laluan.kumul[i]) };
    }
    return terbaik;
  }
  let wakeLock = null;
  async function kunciSkrin() { try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { wakeLock = null; } }
  function mulaNavi() {
    if (!laluan) return;
    if (!me) { toast('Navigasi memerlukan GPS. Hidupkan GPS dahulu.', 4000); if (glob) glob.startGps(); return; }
    navi = { langkah: 0, diumum: new Set(), sesat: 0, terakhirKira: 0, mula: Date.now() };
    sheet.hidden = true;
    naviEl.hidden = false;
    document.body.classList.add('mode-navi');
    setIkut(true);
    kameraNavi();
    kunciSkrin();
    document.addEventListener('visibilitychange', () => { if (!document.hidden && navi) kunciSkrin(); });
    cakap(`Navigasi bermula. ${laluan.steps[0] ? laluan.steps[0].teks : ''}`);
    kemasNavi();
  }
  function tamatNavi(mesej) {
    navi = null;
    naviEl.hidden = true;
    document.body.classList.remove('mode-navi');
    if (wakeLock) { try { wakeLock.release(); } catch (e) { /* abaikan */ } wakeLock = null; }
    if (synth) synth.cancel();
    if (map) map.easeTo({ pitch: mod3d ? 60 : 0, bearing: 0, offset: [0, 0], duration: reduceMotion ? 0 : 800 });
    if (mesej) { toast(mesej, 5000); cakap(mesej); }
    if (laluan) paparArah(alternatif.indexOf(laluan));
  }
  async function kiraSemula() {
    if (!navi || !laluan || !me) return;
    navi.terakhirKira = Date.now();
    toast('Anda tersasar. Mengira semula laluan...');
    cakap('Mengira semula laluan.');
    try {
      const routes = await mintaLaluan(me, laluan.ke, laluan.profil);
      if (!navi) return;
      alternatif = routes.map(r => olahLaluan(r, laluan.profil, { lat: me.lat, lng: me.lng }, laluan.ke));
      laluan = alternatif[0];
      setLaluan();
      if (glob) glob.setRoute(laluan.coords);
      navi.langkah = 0; navi.diumum = new Set(); navi.sesat = 0;
      kemasNavi();
    } catch (e) { toast('Laluan baharu tidak dijumpai. Kembali ke laluan asal.'); }
  }
  function kemasNavi() {
    if (!navi || !laluan || !me) return;
    const u = unjurKeLaluan(me);
    const baki = Math.max(0, laluan.distance - u.along);
    // Tersasar: lebih 60 m dari laluan dalam 3 bacaan berturut-turut
    if (u.d > Math.max(60, (me.acc || 0) * 1.5)) { navi.sesat++; } else navi.sesat = 0;
    if (navi.sesat >= 3 && Date.now() - navi.terakhirKira > 15000) { navi.sesat = 0; kiraSemula(); return; }
    // Langkah semasa: langkah terakhir yang titik mulanya sudah dilepasi
    let k = navi.langkah;
    while (k + 1 < laluan.steps.length && u.along >= laluan.steps[k + 1].mula - 15) k++;
    if (k !== navi.langkah) { navi.langkah = k; navi.diumum = new Set(); }
    const semasa = laluan.steps[k], seterusnya = laluan.steps[k + 1] || null;
    const keSeterusnya = seterusnya ? Math.max(0, seterusnya.mula - u.along) : baki;
    const papar = seterusnya || semasa;
    const purata = laluan.distance / Math.max(1, laluan.duration); // m/s
    const laju = (typeof me.speed === 'number' && me.speed > 1) ? me.speed : purata;
    const masaBaki = baki / Math.max(0.5, Math.min(laju, purata * 1.5));
    const tiba = new Date(Date.now() + masaBaki * 1000);
    if (baki < 30 || (!seterusnya && keSeterusnya < 30)) { tamatNavi('Anda telah tiba di destinasi.'); return; }
    naviEl.innerHTML = `
      <div class="pj-navi-atas">
        <div class="pj-navi-ikon">${esc(papar.ikon)}</div>
        <div class="pj-navi-teks"><b>${esc(papar.teks)}</b><span>dalam ${fmtM(keSeterusnya)}</span></div>
        <button type="button" class="pj-ikon pj-ikon--kecil" id="pjNaviSuara" aria-label="Suara" aria-pressed="${suara}">${ik(suara ? 'suara' : 'senyap')}</button>
      </div>
      ${laluan.steps[k + 2] ? `<div class="pj-navi-lepas">Kemudian ${esc(laluan.steps[k + 2].ikon)} ${esc(laluan.steps[k + 2].teks)}</div>` : ''}
      <div class="pj-navi-bawah">
        <div><b>${fmtMasa(masaBaki)}</b><span>${fmtM(baki)} · tiba ${fmtJam(tiba)}</span></div>
        <div class="pj-navi-laju"><b>${typeof me.speed === 'number' && me.speed >= 0 ? Math.round(me.speed * 3.6) : 0}</b><span>km/j</span></div>
        <button type="button" class="pj-btn pj-btn--tamat" id="pjTamat">Tamat</button>
      </div>`;
    $('pjTamat').addEventListener('click', () => tamatNavi('Navigasi ditamatkan.'));
    $('pjNaviSuara').addEventListener('click', () => { suara = !suara; simpan('peta.suara', suara); kemasNavi(); });
    // Pengumuman suara: 400 m, 100 m dan semasa
    if (seterusnya) {
      const umum = (kunci, teks) => { if (!navi.diumum.has(kunci)) { navi.diumum.add(kunci); cakap(teks); } };
      if (keSeterusnya < 40) umum('kini', seterusnya.teks);
      else if (keSeterusnya < 120) umum('dekat', `Dalam 100 meter, ${seterusnya.teks}`);
      else if (keSeterusnya < 450 && laluan.profil === 'car') umum('jauh', `Dalam 400 meter, ${seterusnya.teks}`);
    }
    if (ikutSaya) kameraNavi();
  }

  /* ---------- Pautan dalam (deep link) ---------- */
  function bacaHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return false;
    let m;
    if ((m = h.match(/^tempat=(-?[\d.]+),(-?[\d.]+)(?:,(.*))?$/))) { buka({ lat: +m[1], lng: +m[2], zoom: 16, fokusTiada: true }); pilihTempat({ name: m[3] || 'Tempat dikongsi', alamat: `${(+m[1]).toFixed(5)}, ${(+m[2]).toFixed(5)}`, lat: +m[1], lng: +m[2] }, true); return true; }
    if ((m = h.match(/^arah=(-?[\d.]+),(-?[\d.]+)(?:,(.*))?$/))) { buka({ lat: +m[1], lng: +m[2], zoom: 14, fokusTiada: true }); const t = { name: m[3] || 'Destinasi', alamat: '', lat: +m[1], lng: +m[2] }; pilihTempat(t, true); if (glob) glob.startGps(); mulaArah(t); return true; }
    if ((m = h.match(/^@(-?[\d.]+),(-?[\d.]+)(?:,(\d+))?$/))) { buka({ lat: +m[1], lng: +m[2], zoom: m[3] ? +m[3] : 14, fokusTiada: true }); return true; }
    if ((m = h.match(/^(?:q|cari)=(.+)$/))) { buka({ fokusTiada: true }); input.value = m[1]; $('pjClear').hidden = false; cari(m[1], true); return true; }
    if (h === 'jalan') { buka(); return true; }
    return false;
  }
  window.addEventListener('hashchange', bacaHash);

  /* ---------- Pendedahan kepada glob ---------- */
  window.PetaJalan = {
    buka, tutup,
    arahKe: (lat, lng, name) => { buka({ lat, lng, zoom: 14, fokusTiada: true }); const t = { name: name || 'Destinasi', alamat: '', lat, lng }; pilihTempat(t, true); mulaArah(t); },
    aktif: () => aktif
  };
  bacaHash();
})();
