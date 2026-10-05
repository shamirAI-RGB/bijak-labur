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
  const fmtCoord = (lat, lng) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return '-';
    return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'U' : 'S'}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'T' : 'B'}`;
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

  const narrow = () => window.innerWidth < 720;
  let hovered = null;
  let selected = null;

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
    .pointColor(d => d.name === 'Kuala Lumpur' ? '#ffff00' : '#00ffff')
    .pointAltitude(0.015)
    .pointRadius(d => d.name === 'Kuala Lumpur' ? 0.6 : 0.35)
    .labelsData(HUBS)
    .labelLat('lat').labelLng('lng')
    .labelText('name')
    .labelSize(0.9)
    .labelDotRadius(0)
    .labelAltitude(0.02)
    .labelColor(() => 'rgba(160, 216, 239, 0.85)')
    .labelResolution(2)
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
    world.arcsData(arcs);
    $('peta-arcs').textContent = String(arcs.length);
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
})();
