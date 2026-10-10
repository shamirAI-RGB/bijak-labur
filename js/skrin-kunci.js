/* SiswaCap: Studio Skrin Kunci. Menjana wallpaper skrin kunci daripada jadual kelas UiTM.
   Satu reka bentuk: Minggu (seminggu sekali pandang, hari terpilih ditonjolkan). Pilihan hari (setiap hari ada gambar sendiri),
   latar (gradien, warna atau foto sendiri), susun atur dan paparan (bilik, tarikh Hijri, waktu solat, warna kursus).
   Reka bentuk lain (Hari ini, Jadual, Grid) dibuang buat masa ini dan boleh ditambah semula apabila app sudah ada.
   Semua dilukis dalam peranti (kanvas); tiada apa dihantar ke mana-mana pelayan. Foto tidak disimpan. */
(function () {
  const FAM = '"Schibsted Grotesk", -apple-system, "SF Pro Text", "Segoe UI", Roboto, sans-serif';
  const SYS = '-apple-system, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
  const F = (w, px) => `${w} ${px}px ${FAM}`;
  const MON = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  const MON_FULL = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
  const HIJ = ['Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'];
  const DEV = { ip: [1170, 2532, 'iPhone 13 hingga 15'], pro: [1206, 2622, 'iPhone 16 Pro'], max: [1290, 2796, 'iPhone Pro Max'], and: [1080, 2400, 'Android'] };
  const BG = {
    senja: ['Senja', ['#c2569b', '#8a56b0', '#e1796f']], hutan: ['Hutan', ['#145a47', '#0c3a2f', '#06120e']],
    laut: ['Laut', ['#0b2a4a', '#1a63a0', '#2fa0c8']], malam: ['Malam', ['#0b0f24', '#2a1f55', '#5a3a8a']],
    anggur: ['Anggur', ['#3b0f4a', '#7a1f6b', '#d04a6e']], karbon: ['Karbon', ['#101114', '#1c1e24', '#2b2f38']],
    pasir: ['Pasir', ['#2a2118', '#6b4a2c', '#d29a52']], fajar: ['Fajar', ['#0f3b46', '#1d7a76', '#e7b85c']]
  };
  const CFG0 = {
    bg: 'senja', color: '#3a2a5e', blur: 6, dim: 30, pos: 'atas', size: 'm', card: 'kaca', alpha: 55, radius: 22, dev: 'ip', jam: true,
    show: { bilik: true, warna: true, hijri: true, solat: false, tanda: true }
  };
  const SHOW = [['bilik', 'Bilik atau dewan'], ['warna', 'Warna ikut kursus'], ['hijri', 'Tarikh Hijri'], ['solat', 'Waktu solat'], ['tanda', 'siswacap.my']];

  const load = () => { const s = store.get('kunci_cfg', {}) || {}; return { ...CFG0, ...s, show: { ...CFG0.show, ...(s.show || {}) } }; };
  let cfg = load(), dayIdx = 0, tab = 'bg', photo = null, dlg = null, raf = 0;

  /* ---------- Tarikh ---------- */
  const utc = d => Date.UTC(d.y, d.m - 1, d.d);
  const addDays = (d, n) => { const t = new Date(utc(d) + n * 864e5); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
  const wdOf = d => ((new Date(utc(d)).getUTCDay() + 6) % 7) + 1;
  function todayMY() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date()).filter(x => x.type !== 'literal').map(x => [x.type, +x.value]));
    return { y: p.year, m: p.month, d: p.day };
  }
  const durTxt = m => { const h = Math.floor(m / 60), r = m % 60; return h && r ? `${h} j ${r} min` : h ? `${h} jam` : `${r} min`; };

  /* ---------- Waktu solat dan tarikh Hijri (daripada data yang sudah disimpan oleh halaman Waktu Solat) ---------- */
  function dayInfo(dt, fmt) {
    let hijri = '', solat = null;
    try {
      const zone = store.get('zone', 'WLY01'), city = store.get('solatCity', null);
      const key = zone === 'GL' && city ? `solat_GL_${city.lat.toFixed(2)}_${city.lon.toFixed(2)}_${dt.y}_${dt.m}` : `solat_${zone}_${dt.y}_${dt.m}`;
      const mo = store.get(key, null), row = mo && mo.prayers && mo.prayers.find(p => p.day === dt.d);
      if (row) {
        const [hy, hm, hd] = String(row.hijri || '').split('-').map(Number);
        if (hy) hijri = `${hd} ${HIJ[hm - 1]} ${hy}H`;
        const tz = zone === 'GL' && city && city.tz ? city.tz : 'Asia/Kuala_Lumpur';
        const mins = sec => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date(sec * 1000)).filter(x => x.type !== 'literal').map(x => [x.type, +x.value])); return (p.hour % 24) * 60 + p.minute; };
        solat = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map(k => fmt(mins(row[k])));
      }
    } catch {}
    if (!hijri) {
      try {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(new Date(utc(dt) + 12 * 36e5)).filter(x => x.type !== 'literal').map(x => [x.type, parseInt(x.value, 10)]));
        hijri = `${p.day} ${HIJ[p.month - 1]} ${p.year}H`;
      } catch {}
    }
    return { hijri, solat };
  }

  /* ---------- Data untuk satu hari ---------- */
  function dataFor(J, i) {
    const date = addDays(todayMY(), i), wd = wdOf(date), by = d => J.slots.filter(s => s.d === d).sort((a, b) => a.s - b.s || a.e - b.e);
    const monday = addDays(date, -(wd - 1));
    const week = Array.from({ length: 7 }, (_, j) => ({ date: addDays(monday, j), wd: j + 1, slots: by(j + 1) }));
    return { i, date, wd, list: by(wd), week, J, ...dayInfo(date, J.fmt) };
  }

  /* ---------- Lukisan ---------- */
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
  const scratch = mk(1, 1).getContext('2d');
  function rrPath(x, X, Y, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w, h, r); else x.rect(X, Y, w, h); }
  function rr(x, c, X, Y, w, h, r) { rrPath(x, X, Y, w, h, r); x.fillStyle = c; x.fill(); }
  const ls = (x, px) => { if ('letterSpacing' in x) x.letterSpacing = px + 'px'; };
  function fit(x, t, w) { if (x.measureText(t).width <= w) return t; while (t.length > 1 && x.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; }
  const mixHex = (a, b, t) => { const A = a.match(/\w\w/g).map(v => parseInt(v, 16)), B = b.match(/\w\w/g).map(v => parseInt(v, 16)); return '#' + A.map((v, i) => Math.round(v * t + B[i] * (1 - t)).toString(16).padStart(2, '0')).join(''); };
  function cover(x, img, W, H) { const s = Math.max(W / img.width, H / img.height); x.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s); }

  function background(x, W, H) {
    if (cfg.bg === 'foto' && photo) {
      if (cfg.blur > 0) {
        const f = 1 + cfg.blur * 0.9, sm = mk(W / f, H / f), sx = sm.getContext('2d'); cover(sx, photo, sm.width, sm.height);
        x.imageSmoothingQuality = 'high'; x.drawImage(sm, 0, 0, W, H);
      } else cover(x, photo, W, H);
      x.fillStyle = `rgba(0,0,0,${cfg.dim / 100})`; x.fillRect(0, 0, W, H);
      return;
    }
    const stops = cfg.bg === 'warna' ? [mixHex(cfg.color, 'ffffff', .82), cfg.color, mixHex(cfg.color, '000000', .6)] : (BG[cfg.bg] || BG.senja)[1];
    const g = x.createLinearGradient(W * .15, 0, W * .85, H);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const r = x.createRadialGradient(W * .8, H * .08, 0, W * .8, H * .08, W * 1.1);
    r.addColorStop(0, 'rgba(255,255,255,.14)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = r; x.fillRect(0, 0, W, H);
  }

  function theme() {
    return cfg.card === 'cerah'
      ? { text: '#17171f', muted: 'rgba(23,23,31,.58)', line: 'rgba(23,23,31,.16)', sel: 'rgba(23,23,31,.08)', accent: '#2f62d1', pal: null, light: true }
      : { text: '#ffffff', muted: 'rgba(255,255,255,.64)', line: 'rgba(255,255,255,.16)', sel: 'rgba(255,255,255,.13)', accent: '#3b7cff', pal: null, light: false };
  }

  function cardBg(x, W, H, X, Y, w, h, r) {
    if (cfg.card === 'tiada') return;
    const a = cfg.alpha / 100;
    if (cfg.card !== 'gelap') {   // latar dikaburkan (kecilkan kemudian besarkan semula)
      const sm = mk(Math.ceil(W / 14), Math.ceil(H / 14)); sm.getContext('2d').drawImage(x.canvas, 0, 0, sm.width, sm.height);
      x.save(); rrPath(x, X, Y, w, h, r); x.clip(); x.imageSmoothingQuality = 'high'; x.drawImage(sm, 0, 0, W, H); x.restore();
    }
    rr(x, cfg.card === 'kaca' ? `rgba(20,14,36,${a * .9})` : cfg.card === 'gelap' ? `rgba(14,12,22,${.5 + a * .5})` : `rgba(255,255,255,${.3 + a * .65})`, X, Y, w, h, r);
    rrPath(x, X + .5, Y + .5, w - 1, h - 1, r); x.strokeStyle = cfg.card === 'cerah' ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.16)'; x.lineWidth = Math.max(1, W / 390); x.stroke();
  }

  /* Bahagian bawah kad: baris waktu solat, tarikh Hijri dan tanda air */
  function footer(c, y) {
    const { x, X, w, k, th, D } = c, sh = cfg.show, p = 14 * k;
    x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    if (sh.solat && D.solat) {
      x.strokeStyle = th.line; x.lineWidth = k; x.setLineDash([]); x.beginPath(); x.moveTo(X + p, y + 2 * k); x.lineTo(X + w - p, y + 2 * k); x.stroke();
      const nm = ['Subuh', 'Zohor', 'Asar', 'Maghrib', 'Isyak'], cw = (w - 2 * p) / 5;
      x.textAlign = 'center';
      D.solat.forEach((t, i) => {
        x.font = F(650, 8.5 * k); ls(x, .4 * k); x.fillStyle = th.muted; x.fillText(nm[i].toUpperCase(), X + p + cw * (i + .5), y + 19 * k); ls(x, 0);
        x.font = F(700, 11 * k); x.fillStyle = th.text; x.fillText(t, X + p + cw * (i + .5), y + 34 * k);
      });
      x.textAlign = 'left'; y += 44 * k;
    }
    const left = sh.hijri && D.hijri, right = sh.tanda;
    if (left || right) {
      y += 8 * k; x.font = F(500, 9.5 * k); x.fillStyle = th.muted;
      if (left) x.fillText(D.hijri, X + p, y + 8 * k);
      if (right) { x.textAlign = 'right'; x.fillText('siswacap.my', X + w - p, y + 8 * k); x.textAlign = 'left'; }
      y += 12 * k;
    }
    return y + p;
  }
  function header(c, y, left, right) {
    const { x, X, w, k, th } = c, p = 14 * k;
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.font = F(650, 10.5 * k); ls(x, .6 * k); x.fillStyle = th.muted; x.fillText(left, X + p, y + 9 * k); ls(x, 0);
    if (right) {
      x.font = F(750, 9 * k); ls(x, .5 * k); const pw = x.measureText(right).width + 14 * k; ls(x, 0);
      rr(x, th.accent, X + w - p - pw, y - 1 * k, pw, 17 * k, 8.5 * k);
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = F(750, 9 * k); ls(x, .5 * k); x.fillText(right, X + w - p - pw / 2, y + 10.5 * k); ls(x, 0); x.textAlign = 'left';
    }
    return y + 28 * k;
  }
  const bar = (c, s) => cfg.show.warna ? c.th.pal[s.hue % 8] : c.th.muted;

  /* ---- Reka bentuk: Minggu (seminggu sekali pandang). Reka bentuk lain boleh ditambah kemudian. ---- */
  function tMinggu(c) {
    const { x, X, Y, w, k, th, D } = c, sh = cfg.show, p = 14 * k, J = D.J, chipPal = J.PAL.light;
    const mon = D.week[0].date, sun = D.week[6].date, total = D.week.reduce((a, d) => a + d.slots.length, 0);
    let y = Y + p;
    x.font = F(650, 10.5 * k);
    y = header(c, y, `MINGGU ${mon.d}${mon.m !== sun.m ? ' ' + MON[mon.m - 1].toUpperCase() : ''} – ${sun.d} ${MON[sun.m - 1].toUpperCase()}`, `${total} KELAS`);
    const cw = (w - 2 * p) / 7, uniq = d => { const seen = new Set(); return d.slots.filter(s => !seen.has(s.it.course) && seen.add(s.it.course)); };
    const rows = Math.min(4, Math.max(1, ...D.week.map(d => uniq(d).length))), extra = D.week.some(d => uniq(d).length > 4) ? 11 * k : 0;
    const colH = 46 * k + rows * 15 * k + extra;
    D.week.forEach((d, j) => {
      const cx = X + p + cw * (j + .5), sel = d.wd === D.wd, isToday = D.i === 0 && sel;
      if (sel) rr(x, th.sel, X + p + cw * j + 1 * k, y - 6 * k, cw - 2 * k, colH, 9 * k);
      x.textAlign = 'center'; x.font = F(650, 8.5 * k); ls(x, .4 * k); x.fillStyle = sel ? th.text : th.muted; x.fillText(J.DAY3[d.wd].toUpperCase(), cx, y + 6 * k); ls(x, 0);
      if (sel) { x.beginPath(); x.arc(cx, y + 22 * k, 11 * k, 0, 7); x.fillStyle = th.accent; x.fill(); }
      x.font = F(650, 12.5 * k); x.fillStyle = sel ? '#fff' : th.text; x.fillText(d.date.d, cx, y + 26.5 * k);
      const us = uniq(d);
      us.slice(0, 4).forEach((s, n) => {
        const cy = y + 40 * k + n * 15 * k;
        rr(x, sh.warna ? chipPal[s.hue % 8] : th.sel, X + p + cw * j + 3 * k, cy, cw - 6 * k, 12.5 * k, 4 * k);
        x.font = F(750, 7.6 * k); x.fillStyle = sh.warna ? '#fff' : th.text; x.fillText(s.it.course, cx, cy + 9 * k);
      });
      if (us.length > 4) { x.font = F(650, 8 * k); x.fillStyle = th.muted; x.fillText(`+${us.length - 4}`, cx, y + 40 * k + 4 * 15 * k + 8 * k); }
      if (!us.length) { x.font = F(650, 11 * k); x.fillStyle = th.muted; x.fillText('·', cx, y + 49 * k); }
    });
    y += colH + 2 * k; x.textAlign = 'left';
    x.strokeStyle = th.line; x.lineWidth = k; x.beginPath(); x.moveTo(X + p, y); x.lineTo(X + w - p, y); x.stroke(); y += 16 * k;
    const dot = (cy, col, fill) => { x.beginPath(); x.arc(X + p + 4 * k, cy - 3.5 * k, 3.5 * k, 0, 7); if (fill) { x.fillStyle = col; x.fill(); } else { x.strokeStyle = col; x.lineWidth = 1.3 * k; x.stroke(); } };
    const L = D.list, lbl = D.i === 0 ? 'hari ini' : D.i === 1 ? 'esok' : J.DAY[D.wd].toLowerCase();
    if (!L.length) { dot(y, th.muted, false); x.font = F(550, 11.5 * k); x.fillStyle = th.text; x.fillText(`Tiada kelas ${lbl}. Nikmati rehat.`, X + p + 14 * k, y); y += 18 * k; }
    else {
      const f = L[0], last = L[L.length - 1], hrs = L.reduce((a, s) => a + s.e - s.s, 0);
      dot(y, bar(c, f), true); x.font = F(650, 11.5 * k); x.fillStyle = th.text;
      x.fillText(fit(x, `Pertama ${J.fmt(f.s)} · ${f.it.course}${sh.bilik && f.room ? ' · ' + f.room : ''}`, w - 2 * p - 14 * k), X + p + 14 * k, y); y += 18 * k;
      dot(y, th.muted, false); x.font = F(500, 11.5 * k); x.fillStyle = th.muted;
      x.fillText(fit(x, `Habis ${J.fmt(last.e)} · ${L.length} kelas · ${durTxt(hrs)}`, w - 2 * p - 14 * k), X + p + 14 * k, y); y += 18 * k;
    }
    return footer(c, y - 6 * k);
  }


  /* ---------- Pelukis utama ---------- */
  function overlay(x, W, H, D) {
    const k = W / 390, J = D.J;
    x.save(); x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    rr(x, '#000', W / 2 - 60 * k, 11 * k, 120 * k, 34 * k, 17 * k);
    x.fillStyle = 'rgba(255,255,255,.92)'; x.font = `600 ${17 * k}px ${SYS}`; x.fillText(`${J.DAY[D.wd]}, ${D.date.d} ${MON_FULL[D.date.m - 1]}`, W / 2, 92 * k);
    x.fillStyle = 'rgba(255,255,255,.96)'; x.font = `700 ${96 * k}px ${SYS}`; x.fillText('9:41', W / 2, 196 * k);
    for (const cx of [52 * k, W - 52 * k]) { x.beginPath(); x.arc(cx, H - 76 * k, 24 * k, 0, 7); x.fillStyle = 'rgba(0,0,0,.30)'; x.fill(); }
    x.fillStyle = 'rgba(255,255,255,.9)'; rr(x, 'rgba(255,255,255,.9)', 47 * k, H - 88 * k, 10 * k, 13 * k, 2 * k); rr(x, 'rgba(255,255,255,.9)', 45 * k, H - 74 * k, 14 * k, 14 * k, 3 * k);
    rr(x, 'rgba(255,255,255,.9)', W - 66 * k, H - 86 * k, 28 * k, 20 * k, 5 * k); x.beginPath(); x.arc(W - 52 * k, H - 76 * k, 5 * k, 0, 7); x.fillStyle = 'rgba(0,0,0,.45)'; x.fill();
    rr(x, 'rgba(255,255,255,.85)', W / 2 - 67 * k, H - 13 * k, 134 * k, 5 * k, 2.5 * k);
    x.restore();
  }

  /** Lukis wallpaper pada kanvas berlebar W. opt.overlay: jam dan butang iOS (pratonton sahaja). */
  function paint(canvas, W, i, opt = {}) {
    const J = window.Jadual.kunci(), dev = DEV[cfg.dev] || DEV.ip, H = Math.round(W * dev[1] / dev[0]), u = W / 390;
    canvas.width = W; canvas.height = H;
    const x = canvas.getContext('2d'); x.clearRect(0, 0, W, H);
    background(x, W, H);
    const D = dataFor(J, i), th = theme(); th.pal = th.light ? J.PAL.light : J.PAL.dark;
    const cw = W - 32 * u, X = 16 * u, topMin = H * .275, bottomMax = H - 108 * u, base = { k: .9, m: 1, b: 1.1 }[cfg.size] || 1;
    let f = base, h;
    for (;;) {
      h = tMinggu({ x: scratch, X: 0, Y: 0, w: cw, k: u * f, th, D, cfg });
      if (h <= bottomMax - topMin || f < .55) break;
      f *= .94;
    }
    const Y = cfg.pos === 'atas' ? topMin : cfg.pos === 'bawah' ? bottomMax - h : (topMin + bottomMax - h) / 2;
    x.save();
    cardBg(x, W, H, X, Y, cw, h, cfg.radius * u);
    if (cfg.card === 'tiada') { x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 8 * u; x.shadowOffsetY = 1 * u; }
    tMinggu({ x, X, Y, w: cw, k: u * f, th, D, cfg });
    x.restore();
    if (opt.overlay) overlay(x, W, H, D);
    return canvas;
  }

  /* ---------- Eksport ---------- */
  const fname = i => { const d = addDays(todayMY(), i), J = window.Jadual.kunci(); return `jadual-kunci-${J.DAY3[wdOf(d)].toLowerCase()}-${d.d}-${MON[d.m - 1].toLowerCase()}.jpg`; };
  async function blobFor(i) {
    if (document.fonts && document.fonts.load) await document.fonts.load(`700 20px "Schibsted Grotesk"`).catch(() => {});
    const dev = DEV[cfg.dev] || DEV.ip, c = paint(mk(1, 1), dev[0], i);
    return new Promise(r => c.toBlob(r, 'image/jpeg', .93));
  }
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = -1; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  /** ZIP tanpa mampatan (JPEG sudah dimampatkan) */
  function zip(files) {
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    for (const f of files) {
      const nm = enc.encode(f.name), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, 0, true); h.setUint16(12, 0x21, true);
      h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(h.buffer), nm, f.data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
      c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      cen.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + f.data.length;
    }
    const cl = cen.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cl, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: 'application/zip' });
  }
  async function downloadOne(btn) {
    btn.disabled = true;
    try { await window.Jadual.kunci().saveBlob(await blobFor(dayIdx), fname(dayIdx), 'Wallpaper dimuat turun. Buka Foto atau Galeri, kemudian tetapkan sebagai wallpaper.'); }
    catch (e) { toast('Gagal menyimpan: ' + e.message, 4000); }
    btn.disabled = false;
  }
  async function downloadAll(btn) {
    btn.disabled = true; const old = btn.innerHTML;
    try {
      const files = [];
      for (let i = 0; i < 7; i++) { btn.textContent = `Menyediakan ${i + 1}/7`; const b = await blobFor(i); files.push({ name: fname(i), blob: b }); await new Promise(r => setTimeout(r, 0)); }
      const fl = files.map(f => new File([f.blob], f.name, { type: 'image/jpeg' }));
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: fl })) {
        try { await navigator.share({ files: fl, title: 'Jadual skrin kunci' }); btn.innerHTML = old; btn.disabled = false; return; } catch (e) { if (e.name === 'AbortError') { btn.innerHTML = old; btn.disabled = false; return; } }
      }
      const data = await Promise.all(files.map(async f => ({ name: f.name, data: new Uint8Array(await f.blob.arrayBuffer()) })));
      const a = document.createElement('a'); a.href = URL.createObjectURL(zip(data)); a.download = 'jadual-kunci-7-hari.zip'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('7 gambar dimuat turun dalam satu fail ZIP.', 4000);
    } catch (e) { toast('Gagal menyediakan gambar: ' + e.message, 4000); }
    btn.innerHTML = old; btn.disabled = false;
  }

  /* ---------- Antara muka ---------- */
  const labelDay = i => { const d = addDays(todayMY(), i), J = window.Jadual.kunci(); return i === 0 ? 'Hari ini' : i === 1 ? 'Esok' : `${J.DAY3[wdOf(d)]} ${d.d}`; };
  const q = (s, r = dlg) => r.querySelector(s);
  const save = () => store.set('kunci_cfg', cfg);
  const sw = (id, label, on) => `<label class="kc-sw"><span>${esc(label)}</span><input type="checkbox" role="switch" data-show="${id}" ${on ? 'checked' : ''}></label>`;
  const segs = (key, list) => `<div class="segmented kc-seg" role="group">${list.map(([v, n]) => `<button type="button" class="seg ${cfg[key] === v ? 'active' : ''}" data-set="${key}" data-v="${v}">${n}</button>`).join('')}</div>`;
  const rng = (key, label, min, max, unit = '') => `<label class="kc-rng"><span>${label}<b id="kcv-${key}">${cfg[key]}${unit}</b></span><input type="range" min="${min}" max="${max}" value="${cfg[key]}" data-rng="${key}"></label>`;

  function panel() {
    const P = q('#kcPanel');
    if (tab === 'bg') {
      P.innerHTML = `<div class="kc-sws">${Object.entries(BG).map(([id, [n, st]]) => `<button type="button" class="kc-bg ${cfg.bg === id ? 'on' : ''}" data-bg="${id}" aria-label="${n}" title="${n}" style="background:linear-gradient(160deg,${st.join(',')})"><span>${n}</span></button>`).join('')}</div>
        <div class="kc-row"><label class="kc-col ${cfg.bg === 'warna' ? 'on' : ''}"><span>Warna sendiri</span><input type="color" id="kcColor" value="${cfg.color}"></label>
          <label class="btn ghost sm kc-file ${cfg.bg === 'foto' ? 'on' : ''}">${icon('upload')}<span>${photo ? 'Tukar foto' : 'Gunakan foto anda'}</span><input type="file" accept="image/*" id="kcPhoto" class="sr-only"></label></div>
        ${cfg.bg === 'foto' && photo ? `${rng('blur', 'Kabur', 0, 20)}${rng('dim', 'Gelapkan', 0, 70, '%')}` : ''}
        <p class="muted small">Foto diproses dalam peranti anda dan tidak dihantar ke mana-mana.</p>`;
    } else if (tab === 'lay') {
      P.innerHTML = `<div class="kc-grp"><span>Kedudukan</span>${segs('pos', [['atas', 'Bawah jam'], ['tengah', 'Tengah'], ['bawah', 'Bawah']])}</div>
        <div class="kc-grp"><span>Saiz teks</span>${segs('size', [['k', 'Kecil'], ['m', 'Sederhana'], ['b', 'Besar']])}</div>
        <div class="kc-grp"><span>Gaya kad</span>${segs('card', [['kaca', 'Kaca'], ['gelap', 'Gelap'], ['cerah', 'Cerah'], ['tiada', 'Tiada']])}</div>
        ${rng('alpha', 'Kelegapan kad', 20, 95, '%')}${rng('radius', 'Bucu kad', 0, 36)}
        <label class="kc-sel"><span>Peranti</span><select id="kcDev">${Object.entries(DEV).map(([id, d]) => `<option value="${id}" ${cfg.dev === id ? 'selected' : ''}>${d[2]} (${d[0]}×${d[1]})</option>`).join('')}</select></label>`;
    } else {
      P.innerHTML = `<div class="kc-sws2">${SHOW.map(([id, n]) => sw(id, n, cfg.show[id])).join('')}</div>
        <p class="muted small">${cfg.show.solat ? 'Waktu solat diambil daripada zon yang anda pilih di halaman Waktu Solat. Jika kosong, buka halaman itu sekali dahulu.' : 'Tarikh Hijri dan waktu solat mengikut zon di halaman Waktu Solat.'}</p>`;
    }
    $$('.kc-tabs .seg', dlg).forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
  }
  function days() {
    q('#kcDays').innerHTML = Array.from({ length: 7 }, (_, i) => `<button type="button" role="tab" class="kc-day ${i === dayIdx ? 'on' : ''}" aria-selected="${i === dayIdx}" data-day="${i}">${labelDay(i)}</button>`).join('');
    q('#kcDl').innerHTML = `${icon('download')}Muat turun ${labelDay(dayIdx).toLowerCase()}`;
  }
  function draw() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(async () => {
      if (!dlg) return;
      if (document.fonts && document.fonts.load) await document.fonts.load('700 20px "Schibsted Grotesk"').catch(() => {});
      if (!dlg) return;
      const c = q('#kcPrev'), dev = DEV[cfg.dev] || DEV.ip;
      c.style.aspectRatio = `${dev[0]} / ${dev[1]}`;
      paint(c, 640, dayIdx, { overlay: cfg.jam });
    });
  }

  function open() {
    const J = window.Jadual && window.Jadual.kunci && window.Jadual.kunci();
    if (!J || !J.slots.length) { toast('Bina jadual anda dahulu, kemudian buka Skrin kunci.'); return; }
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'kc-dlg'; dlg.setAttribute('aria-labelledby', 'kcT');
    dlg.innerHTML = `<header class="kc-top"><button class="icon-btn" type="button" data-close aria-label="Tutup">${icon('x')}</button><h2 id="kcT">Skrin kunci</h2>
        <button class="icon-btn" type="button" data-help aria-label="Cara menetapkan wallpaper" title="Cara menetapkan wallpaper">${icon('help')}</button></header>
      <div class="kc-main">
        <section class="kc-stage" aria-label="Pratonton">
          <div class="kc-phone"><canvas id="kcPrev" aria-label="Pratonton skrin kunci" role="img"></canvas></div>
          <div class="kc-sub"><span>Setiap hari ada gambar sendiri</span><button type="button" class="chip kc-jam ${cfg.jam ? 'active' : ''}" data-jam aria-pressed="${cfg.jam}">Jam</button></div>
          <div class="kc-days" id="kcDays" role="tablist" aria-label="Pilih hari"></div>
        </section>
        <section class="kc-ctl">
          <div class="segmented kc-tabs" role="tablist">${[['bg', 'Latar'], ['lay', 'Susun atur'], ['show', 'Papar']].map(([id, n]) => `<button type="button" role="tab" class="seg" data-tab="${id}">${n}</button>`).join('')}</div>
          <div class="kc-scroll"><div class="kc-panel" id="kcPanel"></div>
            <p class="kc-note muted small">Wallpaper ialah gambar tetap. Simpan ketujuh-tujuh hari sekali gus dan tukar gambar hari itu setiap pagi, atau muat turun semula selepas jadual berubah. <button type="button" class="link-btn" data-reset>Tetap semula reka bentuk</button></p></div>
          <div class="kc-act"><button class="btn" type="button" id="kcDl"></button><button class="btn ghost" type="button" id="kcAll">${icon('layers')}Semua 7 hari</button></div>
        </section>
      </div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => { dlg.remove(); dlg = null; cancelAnimationFrame(raf); });
    dlg.addEventListener('click', e => {
      const t = e.target;
      if (t === dlg || t.closest('[data-close]')) { dlg.close(); return; }
      let b;
      if ((b = t.closest('[data-tab]'))) { tab = b.dataset.tab; panel(); }
      else if ((b = t.closest('[data-day]'))) { dayIdx = +b.dataset.day; days(); draw(); }
      else if ((b = t.closest('[data-bg]'))) { cfg.bg = b.dataset.bg; save(); panel(); draw(); }
      else if ((b = t.closest('[data-set]'))) { cfg[b.dataset.set] = b.dataset.v; save(); panel(); draw(); }
      else if (t.closest('[data-jam]')) { cfg.jam = !cfg.jam; save(); const j = q('[data-jam]'); j.classList.toggle('active', cfg.jam); j.setAttribute('aria-pressed', cfg.jam); draw(); }
      else if (t.closest('[data-help]')) help();
      else if (t.closest('[data-reset]')) { const p = photo; cfg = { ...CFG0, show: { ...CFG0.show } }; photo = p; save(); panel(); draw(); toast('Reka bentuk ditetapkan semula.'); }
      else if (t.closest('#kcDl')) downloadOne(t.closest('#kcDl'));
      else if (t.closest('#kcAll')) downloadAll(t.closest('#kcAll'));
    });
    dlg.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.rng) { cfg[t.dataset.rng] = +t.value; const v = q('#kcv-' + t.dataset.rng); if (v) v.textContent = t.value + (t.dataset.rng === 'alpha' || t.dataset.rng === 'dim' ? '%' : ''); save(); draw(); }
      else if (t.id === 'kcColor') { cfg.bg = 'warna'; cfg.color = t.value; save(); draw(); }
    });
    dlg.addEventListener('change', async e => {
      const t = e.target;
      if (t.dataset.show) { cfg.show[t.dataset.show] = t.checked; save(); draw(); if (t.dataset.show === 'solat') panel(); }
      else if (t.id === 'kcDev') { cfg.dev = t.value; save(); draw(); }
      else if (t.id === 'kcPhoto' && t.files[0]) {
        try {
          const bmp = await createImageBitmap(t.files[0]), s = Math.min(1, 1800 / Math.max(bmp.width, bmp.height)), c = mk(bmp.width * s, bmp.height * s);
          c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); photo = c; cfg.bg = 'foto'; save(); panel(); draw();
        } catch { toast('Foto tidak dapat dibaca. Cuba gambar JPG atau PNG.'); }
      }
    });
    dlg.showModal(); days(); panel(); draw();
  }

  function help() {
    const d = document.createElement('dialog'); d.className = 'kc-help';
    d.innerHTML = `<button class="icon-btn plain km-x" type="button" data-close aria-label="Tutup">${icon('x')}</button><h2>Cara menetapkan wallpaper</h2>
      <h3>iPhone</h3><ol><li>Muat turun gambar, kemudian buka <b>Foto</b> dan pilih gambar itu.</li><li>Tekan <b>Kongsi</b>, kemudian <b>Gunakan sebagai Wallpaper</b>.</li><li>Pilih skrin kunci. Jangan letak widget di bawah jam supaya kad jadual tidak tertutup.</li></ol>
      <h3>Android</h3><ol><li>Buka gambar dalam <b>Galeri</b>.</li><li>Tekan menu ⋮, pilih <b>Tetapkan sebagai</b>, kemudian <b>Wallpaper skrin kunci</b>.</li></ol>
      <p class="muted small">Ruang di atas dikosongkan untuk jam dan tarikh. Kad bermula di bawahnya, jadi tidak bertindih dengan jam iPhone atau Android.</p>`;
    document.body.appendChild(d); d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); }); d.addEventListener('close', () => d.remove()); d.showModal();
  }

  window.SkrinKunci = { open, paint: (c, W, i, o) => paint(c, W, i, o), _cfg: () => cfg };
})();
