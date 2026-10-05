/* Peta Dunia 3D (peta.html): glob globe.gl dengan data negara dan laluan pusat kewangan.
   Semua aset dimuat dari laman sendiri (CSP 'self'), jadi peta berfungsi luar talian selepas lawatan pertama. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const container = $('globe-container');
  const tooltip = $('tooltip');
  const statusEl = $('peta-status');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setStatus = (text, bad) => {
    statusEl.textContent = text;
    statusEl.classList.toggle('is-ok', !bad);
    statusEl.classList.toggle('is-bad', !!bad);
  };
  const showMsg = text => {
    const p = document.createElement('p');
    p.className = 'peta-msg';
    p.textContent = text;
    document.body.appendChild(p);
  };

  const hasWebGL = () => {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  };
  if (typeof window.Globe !== 'function') { setStatus('Gagal dimuat', true); showMsg('Enjin peta gagal dimuat. Cuba muat semula halaman.'); return; }
  if (!hasWebGL()) { setStatus('Tiada WebGL', true); showMsg('Pelayar atau peranti ini tidak menyokong WebGL, jadi peta 3D tidak dapat dipaparkan.'); return; }

  // Nama negara dalam Bahasa Melayu melalui Intl, dengan nama Inggeris sebagai sandaran
  let regionNames = null;
  try { regionNames = new Intl.DisplayNames(['ms'], { type: 'region' }); } catch (e) { /* pelayar lama */ }
  const countryName = p => {
    if (p.a2 === 'PS') return 'Palestin'; // satu wilayah Palestin pada peta ini
    if (regionNames && p.a2) {
      try { const n = regionNames.of(p.a2); if (n && n !== p.a2) return n; } catch (e) { /* kod tidak sah */ }
    }
    return p.n || 'Tidak diketahui';
  };
  const fmtPop = n => {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return 'Tiada data';
    if (n >= 1e9) return (n / 1e9).toLocaleString('ms-MY', { maximumFractionDigits: 2 }) + ' bilion';
    if (n >= 1e6) return (n / 1e6).toLocaleString('ms-MY', { maximumFractionDigits: 1 }) + ' juta';
    return n.toLocaleString('ms-MY');
  };
  const fmtCoord = (lat, lng, dp = 2) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return '-';
    return `${Math.abs(lat).toFixed(dp)}°${lat >= 0 ? 'U' : 'S'}, ${Math.abs(lng).toFixed(dp)}°${lng >= 0 ? 'T' : 'B'}`;
  };

  // Pusat kewangan utama (bursa saham); Kuala Lumpur sentiasa menjadi hab
  const HUBS = [
    { name: 'Kuala Lumpur', lat: 3.139, lng: 101.687 },
    { name: 'Singapura', lat: 1.283, lng: 103.851 },
    { name: 'Jakarta', lat: -6.2, lng: 106.817 },
    { name: 'Hong Kong', lat: 22.285, lng: 114.158 },
    { name: 'Shanghai', lat: 31.23, lng: 121.474 },
    { name: 'Tokyo', lat: 35.681, lng: 139.767 },
    { name: 'Mumbai', lat: 18.93, lng: 72.835 },
    { name: 'Riyadh', lat: 24.713, lng: 46.675 },
    { name: 'Dubai', lat: 25.204, lng: 55.27 },
    { name: 'London', lat: 51.513, lng: -0.089 },
    { name: 'Frankfurt', lat: 50.11, lng: 8.682 },
    { name: 'New York', lat: 40.706, lng: -74.009 },
    { name: 'Sao Paulo', lat: -23.548, lng: -46.636 },
    { name: 'Sydney', lat: -33.865, lng: 151.209 }
  ];
  const COLORS = ['#00ffff', '#ff00ff', '#ffffff'];
  const CAP = 'rgba(10, 20, 30, 0.7)';
  const CAP_HOT = 'rgba(255, 0, 255, 0.6)';
  const CAP_SEL = 'rgba(0, 255, 255, 0.45)';
  const GPS_COLOR = '#39ff14';

  const narrow = () => window.innerWidth < 720;
  let hovered = null;
  let selected = null;
  let dest = null; // destinasi daripada Peta Jalan
  const posListeners = [];

  const world = window.Globe({ animateIn: !reduceMotion })(container)
    .width(container.clientWidth || window.innerWidth)
    .height(container.clientHeight || window.innerHeight)
    .backgroundColor('rgba(0,0,0,0)')
    .globeImageUrl('data/peta/bumi-gelap.jpg')
    .showAtmosphere(true)
    .atmosphereColor('#00ffff')
    .atmosphereAltitude(0.15)
    .polygonSideColor(() => 'rgba(0, 255, 255, 0.1)')
    .polygonStrokeColor(() => '#004466')
    .polygonCapColor(d => d === hovered ? CAP_HOT : d === selected ? CAP_SEL : CAP)
    .polygonAltitude(d => d === hovered ? 0.12 : d === selected ? 0.06 : 0.01)
    .polygonsTransitionDuration(reduceMotion ? 0 : 300)
    // Titik dan label pusat kewangan
    .pointsData(HUBS)
    .pointLat('lat').pointLng('lng')
    .pointColor(d => d.me ? GPS_COLOR : d.dest ? '#ff00ff' : d.name === 'Kuala Lumpur' ? '#ffff00' : '#00ffff')
    .pointAltitude(0.015)
    .pointRadius(d => d.me || d.dest ? 0.45 : d.name === 'Kuala Lumpur' ? 0.6 : 0.35)
    .labelsData(HUBS)
    .labelLat('lat').labelLng('lng')
    .labelText('name')
    .labelSize(0.9)
    .labelDotRadius(0)
    .labelAltitude(0.02)
    .labelColor(d => d.me ? GPS_COLOR : d.dest ? '#ff00ff' : 'rgba(160, 216, 239, 0.85)')
    .labelResolution(2)
    // Gelang denyut GPS pada lokasi pengguna
    .ringLat('lat').ringLng('lng')
    .ringColor(() => t => `rgba(57, 255, 20, ${Math.max(0, 1 - t)})`)
    .ringMaxRadius('r')
    .ringPropagationSpeed('speed')
    .ringRepeatPeriod(reduceMotion ? 0 : 900)
    // Laluan perjalanan (daripada Peta Jalan) dilukis sebagai garis di atas permukaan
    .pathPointLat(p => p[0]).pathPointLng(p => p[1])
    .pathColor(() => ['rgba(0,255,255,0.9)', 'rgba(57,255,20,0.9)'])
    .pathStroke(1.2)
    .pathPointAlt(0.012)
    .pathDashLength(0.2).pathDashGap(0.05).pathDashAnimateTime(reduceMotion ? 0 : 3000)
    .pathTransitionDuration(0)
    // Laluan
    .arcColor('color')
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(reduceMotion ? 0 : 2000)
    .arcStroke(0.5)
    .arcAltitudeAutoScale(0.5);

  const refreshPolygons = () => world
    .polygonCapColor(world.polygonCapColor())
    .polygonAltitude(world.polygonAltitude());

  const showCountry = d => {
    const p = d.properties || {};
    const pop = fmtPop(p.pop);
    $('selected-country').textContent = countryName(p);
    $('country-pop').textContent = p.yr && pop !== 'Tiada data' ? `${pop} (${p.yr})` : pop;
    $('country-coords').textContent = fmtCoord(p.lat, p.lng);
  };
  const setTooltip = (title, sub) => {
    $('tt-name').textContent = title;
    $('tt-sub').textContent = sub;
    tooltip.style.display = 'block';
  };
  const hideTooltip = () => { tooltip.style.display = 'none'; };

  fetch('data/peta/negara.json')
    .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(geo => {
      const features = (geo && Array.isArray(geo.features)) ? geo.features : [];
      countries = features;
      if (me) { const f = countryAt(me.lat, me.lng); if (f) $('gps-country').textContent = countryName(f.properties || {}); }
      world.polygonsData(features)
        .onPolygonHover(d => {
          hovered = d || null;
          container.style.cursor = d ? 'pointer' : '';
          refreshPolygons();
          if (d) {
            const p = d.properties || {};
            setTooltip(countryName(p), `Populasi anggaran: ${fmtPop(p.pop)}`);
            showCountry(d);
          } else {
            hideTooltip();
            if (selected) showCountry(selected);
          }
        })
        .onPolygonClick((d, ev) => {
          selected = d;
          refreshPolygons();
          showCountry(d);
          const p = d.properties || {};
          if (ev && typeof ev.clientX === 'number') moveTooltip(ev.clientX, ev.clientY);
          setTooltip(countryName(p), `Populasi anggaran: ${fmtPop(p.pop)}`);
          if (typeof p.lat === 'number' && typeof p.lng === 'number') {
            world.pointOfView({ lat: p.lat, lng: p.lng, altitude: narrow() ? 2.4 : 1.8 }, reduceMotion ? 0 : 1000);
          }
        });
      $('peta-count').textContent = String(features.length);
      setStatus('Aktif');
    })
    .catch(() => {
      setStatus(navigator.onLine === false ? 'Luar talian' : 'Data gagal dimuat', true);
      $('peta-count').textContent = '0';
    });

  let baseArcs = [];
  let userArcs = [];
  // Laluan rawak antara pusat kewangan; separuh daripadanya bermula dari Kuala Lumpur
  function generateArcs() {
    const pick = () => HUBS[Math.floor(Math.random() * HUBS.length)];
    const seen = new Set();
    const arcs = [];
    for (let guard = 0; arcs.length < 20 && guard < 200; guard++) {
      const a = arcs.length % 2 === 0 ? HUBS[0] : pick();
      const b = pick();
      const key = [a.name, b.name].sort().join('|');
      if (a === b || seen.has(key)) continue;
      seen.add(key);
      arcs.push({
        startLat: a.lat, startLng: a.lng, endLat: b.lat, endLng: b.lng,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }
    baseArcs = arcs;
    paintArcs();
  }
  function paintArcs() {
    const all = baseArcs.concat(userArcs);
    world.arcsData(all);
    $('peta-arcs').textContent = String(all.length);
  }
  generateArcs();

  const controls = world.controls();
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 1.2;
  controls.enableDamping = true;
  world.pointOfView({ lat: 10, lng: 101.7, altitude: 2.5 });

  // Tooltip mengikut kursor (koordinat tetingkap kerana #tooltip berkedudukan fixed)
  function moveTooltip(x, y) {
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }
  container.addEventListener('pointermove', e => moveTooltip(e.clientX, e.clientY));
  container.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hideTooltip(); });

  const resize = () => {
    world.width(container.clientWidth || window.innerWidth);
    world.height(container.clientHeight || window.innerHeight);
  };
  window.addEventListener('resize', resize);

  // Jimat bateri: hentikan pemaparan apabila tab tidak kelihatan
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) world.pauseAnimation(); else world.resumeAnimation();
  });

  const btnRotate = $('toggleRotation');
  const syncRotateLabel = () => { btnRotate.textContent = controls.autoRotate ? 'Hentikan Putaran' : 'Teruskan Putaran'; };
  syncRotateLabel();
  btnRotate.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    syncRotateLabel();
  });

  const btnRoutes = $('generateRoutes');
  let routesTimer = 0;
  btnRoutes.addEventListener('click', () => {
    generateArcs();
    btnRoutes.textContent = 'Laluan Dikemas Kini!';
    clearTimeout(routesTimer);
    routesTimer = setTimeout(() => { btnRoutes.textContent = 'Jana Laluan Baharu'; }, 2000);
  });

  $('focusMalaysia').addEventListener('click', () => {
    const my = (world.polygonsData() || []).find(d => d.properties && d.properties.a2 === 'MY');
    if (my) { selected = my; refreshPolygons(); showCountry(my); }
    world.pointOfView({ lat: 4.2, lng: 108, altitude: narrow() ? 2.2 : 1.4 }, reduceMotion ? 0 : 1200);
  });
  /* ---------- GPS masa nyata ---------- */
  const gpsBtn = $('gpsBtn');
  const gpsBox = $('gps-box');
  let watchId = null;
  let me = null;
  let firstFix = false;
  let countries = [];

  // Jarak bulatan besar (km)
  const haversine = (a, b) => {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  const fmtKm = km => km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('ms-MY', { maximumFractionDigits: km < 100 ? 1 : 0 })} km`;
  // Titik dalam poligon (ray casting), berfungsi luar talian dengan data negara.json
  const inRing = (lng, lat, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const inPolygon = (lng, lat, poly) => inRing(lng, lat, poly[0]) && !poly.slice(1).some(h => inRing(lng, lat, h));
  const countryAt = (lat, lng) => countries.find(f => {
    const g = f.geometry;
    if (!g) return false;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    return polys.some(p => inPolygon(lng, lat, p));
  }) || null;

  const setGps = (text, bad) => {
    const el = $('gps-status');
    el.textContent = text;
    el.classList.toggle('is-ok', !bad && watchId !== null && !!me);
    el.classList.toggle('is-bad', !!bad);
  };
  const paintMe = () => {
    const extra = (me ? [{ name: 'Anda', lat: me.lat, lng: me.lng, me: true }] : []).concat(dest ? [{ name: dest.name, lat: dest.lat, lng: dest.lng, dest: true }] : []);
    world.pointsData(HUBS.concat(extra)).labelsData(HUBS.concat(extra));
    world.ringsData(me ? [
      { lat: me.lat, lng: me.lng, r: 4, speed: 3 },
      // Gelang ketepatan: jejari sebenar dalam darjah (minimum supaya tetap kelihatan)
      { lat: me.lat, lng: me.lng, r: Math.max(0.3, (me.acc || 0) / 111320), speed: 0.6 }
    ] : []);
    if (me) {
      const near = HUBS.map(h => ({ h, d: haversine(me, h) })).sort((a, b) => a.d - b.d);
      const targets = [HUBS[0]].concat(near.filter(x => x.h !== HUBS[0]).slice(0, 3).map(x => x.h));
      userArcs = targets.filter(h => haversine(me, h) > 5).map(h => ({
        startLat: me.lat, startLng: me.lng, endLat: h.lat, endLng: h.lng, color: GPS_COLOR
      }));
      $('gps-hub').textContent = `${near[0].h.name} (${fmtKm(near[0].d)})`;
    } else {
      userArcs = [];
    }
    paintArcs();
  };
  const flyToMe = () => {
    if (!me) return;
    controls.autoRotate = false;
    syncRotateLabel();
    world.pointOfView({ lat: me.lat, lng: me.lng, altitude: narrow() ? 1.6 : 1.1 }, reduceMotion ? 0 : 1500);
  };

  function onPos(pos) {
    const c = pos.coords;
    me = { lat: c.latitude, lng: c.longitude, acc: c.accuracy };
    $('gps-coords').textContent = fmtCoord(me.lat, me.lng, 5);
    $('gps-acc').textContent = typeof c.accuracy === 'number' ? `± ${fmtKm(c.accuracy / 1000)}` : '-';
    $('gps-speed').textContent = typeof c.speed === 'number' && c.speed >= 0 ? `${(c.speed * 3.6).toLocaleString('ms-MY', { maximumFractionDigits: 1 })} km/j` : '-';
    $('gps-alt').textContent = typeof c.altitude === 'number' ? `${Math.round(c.altitude)} m` : '-';
    const f = countryAt(me.lat, me.lng);
    $('gps-country').textContent = f ? countryName(f.properties || {}) : 'Lautan / tidak diketahui';
    setGps(`Aktif · ${new Date(pos.timestamp || Date.now()).toLocaleTimeString('ms-MY')}`);
    paintMe();
    posListeners.forEach(fn => { try { fn(pos); } catch (e) { /* pendengar rosak tidak menghentikan GPS */ } });
    if (!firstFix) { firstFix = true; if (!(window.PetaJalan && window.PetaJalan.aktif())) flyToMe(); }
  }
  function onErr(err) {
    const msg = !err ? 'Ralat GPS'
      : err.code === 1 ? 'Akses lokasi ditolak. Benarkan lokasi dalam tetapan pelayar.'
      : err.code === 2 ? 'Isyarat GPS tiada. Cuba di kawasan terbuka.'
      : err.code === 3 ? 'GPS lambat. Masih mencuba...'
      : 'Ralat GPS';
    setGps(msg, err && err.code !== 3);
    if (err && err.code === 1) stopGps(true);
  }
  function startGps() {
    if (!('geolocation' in navigator)) { gpsBox.hidden = false; setGps('Peranti ini tidak menyokong GPS.', true); return; }
    if (!window.isSecureContext) { gpsBox.hidden = false; setGps('GPS memerlukan sambungan HTTPS.', true); return; }
    gpsBox.hidden = false;
    firstFix = false;
    setGps('Mencari isyarat GPS...');
    watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    gpsBtn.textContent = 'Matikan GPS';
    gpsBtn.setAttribute('aria-pressed', 'true');
  }
  function stopGps(keepMsg) {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    me = null;
    paintMe();
    gpsBtn.textContent = 'Hidupkan GPS';
    gpsBtn.setAttribute('aria-pressed', 'false');
    if (!keepMsg) gpsBox.hidden = true;
  }
  gpsBtn.addEventListener('click', () => { if (watchId === null) startGps(); else stopGps(); });
  $('gpsFocus').addEventListener('click', flyToMe);
  // Jimat bateri: GPS berhenti semasa tab tersembunyi dan bersambung semula selepas itu
  document.addEventListener('visibilitychange', () => {
    if (watchId === null) return;
    if (document.hidden) { navigator.geolocation.clearWatch(watchId); watchId = -1; }
    else if (watchId === -1) watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  });
  /* ---------- Jambatan ke Peta Jalan (js/peta-jalan.js) ---------- */
  const flyTo = (lat, lng) => {
    controls.autoRotate = false;
    syncRotateLabel();
    world.pointOfView({ lat, lng, altitude: narrow() ? 1.2 : 0.8 }, reduceMotion ? 0 : 1200);
  };
  window.PetaGlob = {
    startGps: () => { if (watchId === null) startGps(); },
    onPos: fn => { posListeners.push(fn); if (me) fn({ coords: { latitude: me.lat, longitude: me.lng, accuracy: me.acc, speed: null, heading: null }, timestamp: Date.now() }); },
    getMe: () => me,
    flyTo,
    setDest: (lat, lng, name) => { dest = { lat, lng, name: name || 'Destinasi' }; paintMe(); },
    setRoute: coords => { world.pathsData(coords && coords.length ? [coords.map(c => [c.lat, c.lng])] : []); },
    countryCodeAt: (lat, lng) => { const f = countryAt(lat, lng); return f && f.properties ? f.properties.a2 || '' : ''; }
  };
  $('openJalan').addEventListener('click', () => { if (window.PetaJalan) window.PetaJalan.buka(); else showMsg('Peta jalan gagal dimuat. Cuba muat semula halaman.'); });
  $('gpsArah').addEventListener('click', () => { if (window.PetaJalan) window.PetaJalan.buka({ lat: me ? me.lat : undefined, lng: me ? me.lng : undefined, zoom: 15 }); });
})();
