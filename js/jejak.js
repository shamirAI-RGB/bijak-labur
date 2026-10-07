/* Bijak Labur: Jejak Aktiviti. Penjejak GPS masa nyata untuk jalan, lari dan berbasikal: peta laluan langsung
   (Leaflet + OpenStreetMap), jarak, masa bergerak, rentak/kelajuan, langkah, kalori, pendakian, catatan setiap km
   dengan pengumuman suara, jeda/sambung, sejarah, dan eksport GPX. Semua data disimpan dalam peranti ini sahaja.
   Dalam pelayar, penjejakan hanya berjalan semasa halaman dibuka dan skrin hidup (kunci skrin diminta).
   Dalam app (Android/iOS), pemalam @capgo/background-geolocation meneruskan GPS walaupun skrin dikunci
   atau app ditutup, dengan notifikasi kekal di Android. */
(function () {
  const root = $('#view-jejak');
  if (!root) return;

  const JENIS = {
    jalan: { nama: 'Jalan', vmax: 3.5, acc: 30, stride: 0.415 },
    lari: { nama: 'Lari', vmax: 7, acc: 30, stride: 0.6 },
    basikal: { nama: 'Basikal', vmax: 14, acc: 35, stride: 0 }   // had 50 km/j: lebih laju dianggap kenderaan
  };
  // Pusat lalai peta: UiTM Shah Alam (dari pautan Google Maps Shamir)
  const PUSAT = [3.0716068, 101.4902525];
  const profil = () => Object.assign({ tinggi: 165, berat: 60 }, store.get('sihat_profil', {}));
  const day = (d = new Date()) => d.toLocaleDateString('en-CA');

  /* ---------- Format ---------- */
  const two = n => String(n).padStart(2, '0');
  const dur = ms => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`; };
  const km = m => (m / 1000).toFixed(m < 10000 ? 2 : 1);
  const pace = (ms, m) => m < 20 ? '–' : dur(ms / (m / 1000));                   // min:saat sekilometer
  const kmh = (ms, m) => ms < 1000 ? '–' : (m / 1000 / (ms / 3600000)).toFixed(1);
  const hav = (a, b) => { const R = 6371000, r = x => x * Math.PI / 180, dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  // MET (Compendium of Physical Activities, anggaran) mengikut kelajuan km/j
  const met = (jenis, v) => jenis === 'basikal' ? (v < 16 ? 6 : v < 20 ? 8 : 10) : jenis === 'lari' ? Math.max(6, v * 1.0) : (v < 4 ? 3 : v < 5.5 ? 3.8 : 5);

  /* ---------- Keadaan ---------- */
  const blank = jenis => ({ on: false, paused: false, jenis, start: 0, pausedMs: 0, pauseAt: 0, pts: [], dist: 0, kcal: 0, ascent: 0, steps: 0, splits: [], lastSplit: 0, skips: 0, altS: null, altLo: null });
  let T = blank(store.get('jejak_jenis', 'jalan'));
  let acc = null, here = null, watch = null, lock = null, follow = true, viewing = null;
  let suara = store.get('jejak_suara', true);
  let sejarah = store.get('jejak_sejarah', []);
  const moving = () => !T.start ? 0 : (T.paused ? T.pauseAt : Date.now()) - T.start - T.pausedMs;

  // Sambung aktiviti yang tergendala (cth. tab dimuat semula) jika kurang daripada 3 jam
  const saved = store.get('jejak_aktif', null);
  const resumeNative = !!(saved && saved.start && !saved.paused && Native);
  if (saved && saved.start && Date.now() - (saved.saved || 0) < 3 * 3600e3) T = Object.assign(blank(saved.jenis), saved, { on: true, paused: true, pauseAt: saved.pauseAt || saved.saved });
  const persist = () => { if (T.on) store.set('jejak_aktif', { ...T, saved: Date.now() }); else store.set('jejak_aktif', null); };

  /* ---------- Pedometer (algoritma sama seperti js/sihat.js) ---------- */
  const ped = { base: 9.8, s: 0, above: false, last: 0, t0: 0, tPrev: 0, motion: false };
  function onMotion(e) {
    if (!T.on || T.paused || T.jenis === 'basikal') return;
    const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
    ped.motion = true;
    const t = e.timeStamp || performance.now(), m = Math.hypot(a.x, a.y, a.z);
    const dt = Math.min(0.2, Math.max(0.001, (t - (ped.tPrev || t - 16)) / 1000)); ped.tPrev = t;
    ped.base += (m - ped.base) * (1 - Math.exp(-dt / 1.5));
    ped.s += ((m - ped.base) - ped.s) * (1 - Math.exp(-dt / 0.06));
    if (t - ped.t0 < 1500) return;
    if (!ped.above && ped.s > 1.0 && t - ped.last > 250) { T.steps++; ped.last = t; ped.above = true; }
    if (ped.above && ped.s < 0.1) ped.above = false;
  }
  const steps = () => T.jenis === 'basikal' ? 0 : ped.motion && T.steps > 0 ? T.steps : Math.round(T.dist / (profil().tinggi * JENIS[T.jenis].stride / 100));

  /* ---------- Peta ---------- */
  let map = null, line = null, dot = null, ring = null, startDot = null, histLayer = null, gaya = null;
  // Peta vektor bergaya Bijak Labur (js/peta-gaya.js), ikut tema terang/gelap laman; raster OSM jika gagal
  async function pasangGaya(m) {
    try {
      await loadScript('js/peta-gaya.js');
      const g = await PetaGaya.pasang(m, { tema: 'auto' });
      if (map === m) gaya = g; else g.buang();
    } catch { if (map === m) L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(m); }
  }
  async function ensureMap() {
    if (map) { map.invalidateSize(); return; }
    if (!document.querySelector('link[href="css/leaflet.css"]')) document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'css/leaflet.css' }));
    try { await loadScript('js/vendor/leaflet.js'); } catch { $('#jkMap', root).innerHTML = '<p class="muted jk-nomap">Peta tidak dapat dimuatkan. Penjejakan tetap berfungsi.</p>'; return; }
    const el = $('#jkMap', root); if (!el || map) return;
    const last = T.pts.length ? T.pts[T.pts.length - 1] : here;
    map = L.map(el, { zoomControl: true, attributionControl: true }).setView(last ? [last[0], last[1]] : PUSAT, 16);
    map.attributionControl.setPrefix(false);
    pasangGaya(map);
    const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#0f5a46';
    line = L.polyline(T.pts.map(p => [p[0], p[1]]), { color: brand, weight: 6, opacity: .95, className: 'pg-laluan' }).addTo(map);
    histLayer = L.layerGroup().addTo(map);
    map.on('dragstart', () => { if (follow) { follow = false; paintCtl(); } });
    if (T.pts.length) startDot = L.circleMarker(T.pts[0], { radius: 6, color: '#fff', weight: 2, fillColor: '#0f8a5f', fillOpacity: 1 }).addTo(map);
    setTimeout(() => map && map.invalidateSize(), 150);
    paintHere();
  }
  function paintHere() {
    if (!map || !here) return;
    if (!dot) {
      ring = L.circle(here, { radius: acc || 20, className: 'pg-ketepatan', weight: 1, interactive: false }).addTo(map);
      dot = L.marker(here, { icon: L.divIcon({ className: 'pg-saya-wrap', html: '<span class="pg-saya"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(map);
    }
    dot.setLatLng(here); ring.setLatLng(here).setRadius(Math.min(acc || 20, 200));
    if (follow && !viewing) map.panTo(here, { animate: true });
  }

  /* ---------- GPS ---------- */
  // App: GPS latar belakang (terus berjalan apabila skrin dikunci atau app di latar belakang)
  const BG = plugin('BackgroundGeolocation');
  let bgId = null;
  async function startBg() {
    if (!BG) return false;
    if (bgId != null) return true;
    stopWatch();
    try {
      bgId = await BG.start({
        backgroundTitle: 'Jejak Aktiviti sedang merekod',
        backgroundMessage: 'Bijak Labur merekod laluan anda. Buka app untuk jeda atau tamat.',
        requestPermissions: true, stale: false, distanceFilter: 0
      }, (loc, err) => {
        if (err) {
          if (err.code === 'NOT_AUTHORIZED') { acc = -1; paintCtl(); if (confirm('Bijak Labur memerlukan kebenaran lokasi untuk menjejak aktiviti. Buka tetapan sekarang?')) BG.openSettings(); }
          return;
        }
        if (loc) onPos({ coords: { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, altitude: loc.altitude, altitudeAccuracy: loc.altitudeAccuracy }, timestamp: loc.time || Date.now() });
      });
      return true;
    } catch { bgId = null; return false; }
  }
  async function stopBg() { if (BG && bgId != null) { bgId = null; try { await BG.stop(); } catch {} } }
  // Semasa menjejak dalam app: latar belakang; selainnya (atau dalam pelayar): GPS halaman biasa
  async function track() { if (!(await startBg())) startWatch(); }

  function startWatch() {
    if (watch != null || bgId != null || !navigator.geolocation) return;
    watch = navigator.geolocation.watchPosition(onPos, err => { acc = err && err.code === 1 ? -1 : acc; paintCtl(); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
  }
  function stopWatch() { if (watch != null) navigator.geolocation.clearWatch(watch); watch = null; }

  function onPos(p) {
    acc = p.coords.accuracy;
    here = [p.coords.latitude, p.coords.longitude];
    paintHere();
    const J = JENIS[T.jenis];
    if (!T.on || T.paused || acc > J.acc) return paintCtl();
    const c = [+here[0].toFixed(6), +here[1].toFixed(6), Math.round((p.timestamp - T.start) / 1000)];
    const last = T.pts[T.pts.length - 1];
    if (last) {
      const d = hav(last, c), dt = Math.max(1, c[2] - last[2]), v = d / dt;
      if (d < Math.max(3, acc / 2)) return paintCtl();
      if (v > J.vmax) {
        // Terlalu laju untuk aktiviti ini (kenderaan atau lompatan GPS): jangan kira jarak
        if (++T.skips >= 5) { T.skips = 0; c[3] = 1; T.pts.push(c); line && line.addLatLng([c[0], c[1]]); }
        return paintCtl();
      }
      T.skips = 0;
      T.dist += d;
      T.kcal += met(T.jenis, v * 3.6) * profil().berat * (dt / 3600);
    } else if (map && !startDot) startDot = L.circleMarker([c[0], c[1]], { radius: 6, color: '#fff', weight: 2, fillColor: '#0f8a5f', fillOpacity: 1 }).addTo(map);
    // Pendakian: ketinggian dilicinkan, hanya kenaikan > 2 m dikira
    const alt = p.coords.altitude;
    if (alt != null && p.coords.altitudeAccuracy != null && p.coords.altitudeAccuracy < 25) {
      T.altS = T.altS == null ? alt : T.altS * 0.7 + alt * 0.3;
      if (T.altLo == null || T.altS < T.altLo) T.altLo = T.altS;
      else if (T.altS - T.altLo > 2) { T.ascent += T.altS - T.altLo; T.altLo = T.altS; }
    }
    T.pts.push(c);
    if (T.pts.length % 10 === 0) persist();
    if (line) line.addLatLng([c[0], c[1]]);
    while (T.dist >= (T.splits.length + 1) * 1000) {
      const ms = moving();
      T.splits.push(ms - T.lastSplit); T.lastSplit = ms;
      announce();
    }
    paintCtl();
  }

  function announce() {
    if (!suara || !window.speechSynthesis) return;
    const n = T.splits.length, s = Math.round(T.splits[n - 1] / 1000), tot = Math.round(moving() / 1000);
    const lafaz = sec => `${Math.floor(sec / 60)} minit ${sec % 60} saat`;
    const u = new SpeechSynthesisUtterance(`${n} kilometer. Masa ${lafaz(tot)}. ${T.jenis === 'basikal' ? `Kelajuan ${kmh(T.splits[n - 1], 1000)} kilometer sejam` : `Kilometer terakhir ${lafaz(s)}`}.`);
    u.lang = 'ms-MY'; speechSynthesis.speak(u);
  }

  /* ---------- Kawalan ---------- */
  async function mula() {
    if (!navigator.geolocation) { toast('Peranti ini tidak menyokong GPS.'); return; }
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') { try { await DeviceMotionEvent.requestPermission(); } catch {} }
    T = blank(T.jenis); Object.assign(T, { on: true, start: Date.now() });
    Object.assign(ped, { base: 9.8, s: 0, above: false, last: 0, t0: performance.now(), tPrev: 0, motion: false });
    viewing = null; if (histLayer) histLayer.clearLayers();
    if (line) line.setLatLngs([]);
    if (startDot) { startDot.remove(); startDot = null; }
    follow = true; await track(); await keepAwake(); persist(); paintAll();
    if (suara && window.speechSynthesis) { const u = new SpeechSynthesisUtterance('Aktiviti bermula.'); u.lang = 'ms-MY'; speechSynthesis.speak(u); }
  }
  function jeda() { if (!T.on || T.paused) return; T.paused = true; T.pauseAt = Date.now(); stopBg().then(() => { if (root.offsetParent) startWatch(); }); persist(); paintCtl(); }
  async function sambung() {
    if (!T.on || !T.paused) return;
    T.pausedMs += Date.now() - T.pauseAt; T.paused = false;
    // Elak garis lurus merentasi tempoh jeda
    if (T.pts.length) T.pts[T.pts.length - 1][2] = Math.round((Date.now() - T.start) / 1000);
    await track(); await keepAwake(); persist(); paintCtl();
  }
  function tamat() {
    if (!T.on) return;
    if (!T.paused) { T.paused = true; T.pauseAt = Date.now(); }
    if (T.dist < 50) {
      if (confirm('Aktiviti ini kurang daripada 50 m dan tidak akan disimpan. Tamatkan juga?')) buang(); else paintCtl();
      return;
    }
    const rec = {
      id: `${T.start}`, jenis: T.jenis, start: T.start, ms: moving(), dist: Math.round(T.dist), kcal: Math.round(T.kcal), ascent: Math.round(T.ascent), steps: steps(), splits: T.splits,
      pts: simplify(T.pts)
    };
    {
      sejarah = [rec, ...sejarah].slice(0, 40);
      for (let n = sejarah.length; n > 0; n--) { try { localStorage.setItem('bl_jejak_sejarah', JSON.stringify(sejarah.slice(0, n))); sejarah = sejarah.slice(0, n); break; } catch {} }
      // Tambah ke log harian Sihat
      const log = store.get('sihat_log', {}), d = log[day()] = log[day()] || { makan: [], langkah: 0, manual: 0, jarak: 0 };
      d.langkah = (d.langkah || 0) + rec.steps; d.jarak = (d.jarak || 0) + rec.dist; store.set('sihat_log', log);
      toast(`Disimpan: ${km(rec.dist)} km dalam ${dur(rec.ms)}${rec.steps ? `, ${rec.steps.toLocaleString('ms-MY')} langkah ditambah ke Sihat` : ''}.`, 4500);
      viewing = rec;
    }
    buang(true);
  }
  function buang(kept) {
    stopWatch(); stopBg(); if (lock) { lock.release().catch(() => {}); lock = null; }
    const jenis = T.jenis; T = blank(jenis); persist();
    if (!kept && line) line.setLatLngs([]);
    paintAll(); if (viewing) lihat(viewing);
  }
  async function keepAwake() { try { if ('wakeLock' in navigator && !lock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } } catch {} }

  // Simpan laluan ringkas: titik sekurang-kurangnya 8 m dari yang sebelumnya, paling banyak 800 titik
  function simplify(pts) {
    const out = [];
    for (const p of pts) if (!out.length || p[3] || hav(out[out.length - 1], p) >= 8) out.push(p);
    if (pts.length && out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
    const step = Math.ceil(out.length / 800);
    return step > 1 ? out.filter((_, i) => i % step === 0 || i === out.length - 1) : out;
  }

  /* ---------- Sejarah ---------- */
  function lihat(rec) {
    viewing = rec;
    if (map) {
      histLayer.clearLayers(); if (line && !T.on) line.setLatLngs([]);
      const ll = rec.pts.map(p => [p[0], p[1]]);
      if (ll.length) {
        L.polyline(ll, { color: '#c8402f', weight: 6, opacity: .9, className: 'pg-laluan' }).addTo(histLayer);
        L.circleMarker(ll[0], { radius: 6, color: '#fff', weight: 2, fillColor: '#0f8a5f', fillOpacity: 1 }).addTo(histLayer);
        L.circleMarker(ll[ll.length - 1], { radius: 6, color: '#fff', weight: 2, fillColor: '#c8402f', fillOpacity: 1 }).addTo(histLayer);
        map.fitBounds(L.latLngBounds(ll), { padding: [24, 24] });
      }
    }
    paintHist();
  }
  function gpx(rec) {
    const t0 = rec.start, x = s => String(s).replace(/[<&>]/g, c => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' }[c]));
    let trk = '<trkseg>';
    for (const p of rec.pts) { if (p[3]) trk += '</trkseg><trkseg>'; trk += `<trkpt lat="${p[0]}" lon="${p[1]}"><time>${new Date(t0 + p[2] * 1000).toISOString()}</time></trkpt>`; }
    trk += '</trkseg>';
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Bijak Labur" xmlns="http://www.topografix.com/GPX/1/1"><metadata><time>${new Date(t0).toISOString()}</time></metadata><trk><name>${x(JENIS[rec.jenis].nama)} ${new Date(t0).toLocaleDateString('ms-MY')}</name><type>${rec.jenis === 'basikal' ? 'cycling' : rec.jenis === 'lari' ? 'running' : 'walking'}</type>${trk}</trk></gpx>\n`;
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/gpx+xml' }));
    Object.assign(document.createElement('a'), { href: url, download: `bijak-labur-${rec.jenis}-${day(new Date(t0))}.gpx` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ---------- Paparan ---------- */
  const stat = (v, l) => `<div class="jk-stat"><b class="num">${v}</b><span>${l}</span></div>`;
  function recentSpeed() {
    // Kelajuan semasa: 20 saat terakhir
    const p = T.pts; if (p.length < 2) return 0;
    const end = p[p.length - 1]; let d = 0, i = p.length - 1;
    while (i > 0 && end[2] - p[i - 1][2] <= 20) { if (!p[i][3]) d += hav(p[i - 1], p[i]); i--; }
    const dt = end[2] - p[i][2]; return dt > 0 ? d / dt : 0;
  }
  function ctlHTML() {
    const J = T.jenis, ms = moving(), bike = J === 'basikal', v = recentSpeed();
    const gps = acc == null ? 'Mencari isyarat GPS…' : acc < 0 ? 'Kebenaran lokasi ditolak. Benarkan lokasi dalam tetapan pelayar.' : `GPS: ketepatan ${Math.round(acc)} m${acc > JENIS[J].acc ? ' (lemah, menunggu isyarat lebih baik)' : ''}`;
    return `<div class="segmented jk-type" role="radiogroup" aria-label="Jenis aktiviti">${Object.entries(JENIS).map(([k, j]) => `<button type="button" class="seg${J === k ? ' active' : ''}" role="radio" aria-checked="${J === k}" data-jenis="${k}" ${T.on ? 'disabled' : ''}>${j.nama}</button>`).join('')}</div>
      <div class="jk-time num" aria-label="Masa bergerak">${dur(ms)}</div>
      <div class="jk-stats">
        ${stat(km(T.dist), 'km')}
        ${bike ? stat(T.on && !T.paused && v ? (v * 3.6).toFixed(1) : kmh(ms, T.dist), 'km/j') : stat(T.on && !T.paused && v > 0.3 && T.dist >= 20 ? dur(1000 / v * 1000) : pace(ms, T.dist), 'rentak /km')}
        ${bike ? stat(kmh(ms, T.dist), 'purata km/j') : stat(steps().toLocaleString('ms-MY'), 'langkah')}
        ${stat(Math.round(T.kcal), 'kcal')}
        ${stat(Math.round(T.ascent), 'm naik')}
      </div>
      <p class="jk-gps ${acc > 0 && acc <= JENIS[J].acc ? 'ok' : ''}" role="status">${esc(gps)}${T.on && T.paused ? ' · <b>Dijeda</b>' : ''}</p>
      <div class="jk-btns">${!T.on ? `<button class="btn jk-go" type="button" data-act="mula">${icon('play')}Mula</button>`
        : `${T.paused ? `<button class="btn" type="button" data-act="sambung">${icon('play')}Sambung</button>` : `<button class="btn ghost" type="button" data-act="jeda">${icon('pause')}Jeda</button>`}
           <button class="btn${T.paused ? ' ghost' : ''}" type="button" data-act="tamat">${icon('check')}Tamat dan simpan</button>`}</div>
      <div class="jk-opts">
        <label class="bk-on"><input type="checkbox" id="jkSuara" ${suara ? 'checked' : ''}><span class="small">Umumkan setiap kilometer (suara)</span></label>
        ${map ? `<button class="link-btn" type="button" data-act="ikut">${icon('compass')}${follow ? 'Mengikut lokasi anda' : 'Ikut lokasi saya'}</button>` : ''}
      </div>
      ${T.splits.length ? `<h3>Setiap kilometer</h3><ol class="jk-splits">${T.splits.map((s, i) => `<li><span>Km ${i + 1}</span><b class="num">${bike ? kmh(s, 1000) + ' km/j' : dur(s)}</b></li>`).join('')}</ol>` : ''}`;
  }
  function histHTML() {
    if (viewing) {
      const r = viewing, bike = r.jenis === 'basikal';
      return `<div class="row-between"><h2>${JENIS[r.jenis].nama} · ${new Date(r.start).toLocaleDateString('ms-MY', { weekday: 'short', day: 'numeric', month: 'short' })}</h2><button class="link-btn" type="button" data-act="tutup">${icon('x')}Tutup</button></div>
        <div class="jk-stats">${stat(km(r.dist), 'km')}${stat(dur(r.ms), 'masa')}${bike ? stat(kmh(r.ms, r.dist), 'purata km/j') : stat(pace(r.ms, r.dist), 'rentak /km')}${r.steps ? stat(r.steps.toLocaleString('ms-MY'), 'langkah') : ''}${stat(r.kcal, 'kcal')}${stat(r.ascent, 'm naik')}</div>
        ${r.splits.length ? `<ol class="jk-splits">${r.splits.map((s, i) => `<li><span>Km ${i + 1}</span><b class="num">${bike ? kmh(s, 1000) + ' km/j' : dur(s)}</b></li>`).join('')}</ol>` : ''}
        <div class="row-gap"><button class="btn ghost" type="button" data-act="gpx">${icon('download')}Eksport GPX</button><button class="link-btn" type="button" data-act="padam">${icon('trash')}Padam</button></div>
        <p class="muted small">Fail GPX boleh diimport ke Strava, Garmin Connect atau Google Earth.</p>`;
    }
    const sum = sejarah.filter(r => Date.now() - r.start < 7 * 864e5).reduce((t, r) => t + r.dist, 0);
    return `<div class="row-between"><h2>Sejarah</h2>${sejarah.length ? `<span class="muted small">7 hari: ${km(sum)} km</span>` : ''}</div>
      ${sejarah.length ? `<ul class="jk-hist">${sejarah.map(r => `<li><button type="button" data-lihat="${esc(r.id)}"><b>${JENIS[r.jenis].nama}</b><span class="muted small">${new Date(r.start).toLocaleString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        <span class="num">${km(r.dist)} km · ${dur(r.ms)}</span>${icon('chev')}</button></li>`).join('')}</ul>` : '<p class="muted">Aktiviti yang anda simpan akan dipaparkan di sini.</p>'}`;
  }
  const paintCtl = () => { const e = $('#jkCtl', root); if (e) e.innerHTML = ctlHTML(); };
  const paintHist = () => { const e = $('#jkHist', root); if (e) e.innerHTML = histHTML(); };
  function paintAll() { paintCtl(); paintHist(); }

  function render() {
    root.innerHTML = `<div class="page-head"><p class="eyebrow">Kesihatan</p><h1 id="h-jejak">Jejak Aktiviti</h1>
        <p class="lead">Jejak jalan, lari atau berbasikal dengan GPS secara masa nyata: laluan pada peta, jarak, rentak, kalori dan catatan setiap kilometer. Langkah dan jarak ditambah ke halaman <a href="#sihat">Sihat</a>.</p></div>
      <div class="jk-grid">
        <div class="card jk-mapcard"><div id="jkMap" class="jk-map" role="region" aria-label="Peta laluan"></div></div>
        <div class="card jk-ctl" id="jkCtl"></div>
        <div class="card" id="jkHist"></div>
      </div>
      <p class="note">${icon('alert')}<span>${BG ? 'Dalam app ini, penjejakan diteruskan walaupun skrin dikunci atau anda membuka app lain (notifikasi "Jejak Aktiviti" dipaparkan). Tekan Tamat apabila selesai untuk menjimatkan bateri.' : 'Dalam pelayar, pastikan skrin kekal hidup semasa menjejak: pelayar menghentikan GPS apabila skrin dikunci atau halaman ditutup. Untuk menjejak dengan skrin dikunci, gunakan app Bijak Labur (Android/iOS).'} Lokasi dan laluan anda disimpan dalam peranti ini sahaja dan tidak dihantar ke pelayan Bijak Labur. Peta dimuatkan daripada OpenFreeMap (data OpenStreetMap). Utamakan keselamatan: perhatikan jalan raya, bukan skrin.</span></p>`;
    if (gaya) gaya.buang();
    map = null; line = dot = ring = startDot = histLayer = gaya = null;
    paintAll();
  }

  /* ---------- Peristiwa ---------- */
  root.addEventListener('click', e => {
    const j = e.target.closest('[data-jenis]');
    if (j && !T.on) { T.jenis = j.dataset.jenis; store.set('jejak_jenis', T.jenis); paintCtl(); return; }
    const h = e.target.closest('[data-lihat]'); if (h) { const r = sejarah.find(x => x.id === h.dataset.lihat); if (r) { lihat(r); $('#jkMap', root).scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'mula') mula();
    if (act === 'jeda') jeda();
    if (act === 'sambung') sambung();
    if (act === 'tamat') tamat();
    if (act === 'ikut') { follow = true; viewing = null; if (histLayer) histLayer.clearLayers(); if (here && map) map.setView(here, Math.max(map.getZoom(), 16)); paintAll(); }
    if (act === 'tutup') { viewing = null; if (histLayer) histLayer.clearLayers(); if (line && !T.on) line.setLatLngs([]); follow = true; paintHere(); paintHist(); }
    if (act === 'gpx' && viewing) gpx(viewing);
    if (act === 'padam' && viewing && confirm('Padam aktiviti ini?')) {
      sejarah = sejarah.filter(r => r !== viewing); store.set('jejak_sejarah', sejarah);
      viewing = null; if (histLayer) histLayer.clearLayers(); paintHist();
    }
  });
  root.addEventListener('change', e => { if (e.target.id === 'jkSuara') { suara = e.target.checked; store.set('jejak_suara', suara); } });
  window.addEventListener('devicemotion', onMotion);
  // Masa berdetik setiap saat semasa aktif; simpan keadaan berkala supaya boleh disambung jika tab dimuat semula
  setInterval(() => { if (T.on && !T.paused && document.visibilityState === 'visible' && root.offsetParent) { const t = $('.jk-time', root); if (t) t.textContent = dur(moving()); } }, 1000);
  setInterval(() => { if (T.on) persist(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persist(); else if (T.on && !T.paused) keepAwake(); });
  document.addEventListener('viewchange', e => {
    if (e.detail !== 'jejak') { if (!T.on) stopWatch(); return; }
    if (!$('#jkMap', root)) render();
    paintAll(); ensureMap(); startWatch();
  });
  render();
  if (document.documentElement.dataset.view === 'jejak') { ensureMap(); startWatch(); }
  if (T.on && resumeNative) setTimeout(() => { sambung(); toast('Jejak Aktiviti disambung semula.', 3500); }, 600);
  else if (T.on) setTimeout(() => toast('Aktiviti yang tergendala dipulihkan. Tekan Sambung untuk meneruskan.', 4500), 800);
  else if (BG) BG.stop().catch(() => {});   // bersihkan notifikasi lama jika app dimulakan semula
})();
