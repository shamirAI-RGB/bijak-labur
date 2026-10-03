/* Bijak Labur: Ibadah. Al-Quran, doa, tasbih, kalendar Islam, Asmaul Husna, panduan dan tetapan */
(function () {
  const D = IbadahData;
  const TZ = 'Asia/Kuala_Lumpur';
  const AUDIO = (qari, n, br = 128) => `https://cdn.islamic.network/quran/audio/${br}/${qari}/${n}.mp3`;
  const BASMALAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
  const HIJRI_M = ['Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'];
  const HIJRI_S = ['Muh', 'Saf', 'RAw', 'RAk', 'JAw', 'JAk', 'Rej', 'Sya', 'Ram', 'Syw', 'ZKa', 'ZHj'];
  const QARI = { 'ar.alafasy': 'Mishary Rashid Alafasy', 'ar.husary': 'Mahmoud Khalil Al-Husary' };
  const day = 86400000;

  /* ---------- Ikon jubin (putih, di atas latar berwarna) ---------- */
  const G = {
    quran: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z" fill="#fff"/><path d="M12 6.5v13" stroke="currentColor" stroke-width="1.4" opacity=".35"/>',
    doa: '<path d="M8.5 21c-2-1.6-3.5-3.8-3.5-6.6V9.2c0-.9.7-1.6 1.5-1.6S8 8.3 8 9.2V13l1-1V4.6C9 3.7 9.7 3 10.5 3S12 3.7 12 4.6V17c0 1.6-.6 3-1.5 4Z" fill="#fff"/><path d="M15.5 21c2-1.6 3.5-3.8 3.5-6.6V9.2c0-.9-.7-1.6-1.5-1.6S16 8.3 16 9.2V13l-1-1V4.6c0-.9-.7-1.6-1.5-1.6S12 3.7 12 4.6V17c0 1.6.6 3 1.5 4Z" fill="#fff" opacity=".82"/>',
    kiblat: '<circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="2"/><path d="m16.5 7.5-3 7.4L6.5 17.5l3-7.4Z" fill="#fff"/>',
    tasbih: '<g fill="#fff">' + Array.from({ length: 11 }, (_, i) => { const a = (i / 11) * Math.PI * 2 - Math.PI / 2 + 0.3; return `<circle cx="${(12 + Math.cos(a) * 7).toFixed(1)}" cy="${(11 + Math.sin(a) * 7).toFixed(1)}" r="1.7"/>`; }).join('') + '<path d="M12 18.2v3.3" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="22" r="1.1"/></g>',
    kalendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="#fff"/><rect x="3.5" y="5" width="17" height="4.5" rx="2" fill="#fff" opacity=".6"/><path d="M8 3v4M16 3v4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
    asma: '<path d="m12 2 2.6 3.3 4.1-.6-.6 4.1L21.4 12l-3.3 2.6.6 4.1-4.1-.6L12 21.4l-2.6-3.3-4.1.6.6-4.1L2.6 12l3.3-2.6-.6-4.1 4.1.6Z" fill="#fff"/>',
    galeri: '<rect x="3" y="4" width="18" height="16" rx="3" fill="#fff"/><path d="M3 17l5-5 4 4 3-3 6 6" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".45"/><path d="M16.5 7.2a2.4 2.4 0 1 0 1.6 3.6 2 2 0 0 1-1.6-3.6Z" fill="currentColor" opacity=".55"/>',
    haid: '<path d="M12 2.5S5.5 9.6 5.5 14.2a6.5 6.5 0 0 0 13 0C18.5 9.6 12 2.5 12 2.5Z" fill="#fff"/><path d="M12 17.6s-3-2-3-3.8a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 1.8-3 3.8-3 3.8Z" fill="currentColor" opacity=".55"/>',
    haji: '<path d="M4 8.5 12 5l8 3.5v10L12 22l-8-3.5Z" fill="#fff"/><path d="M4 11.2 12 14.6l8-3.4" fill="none" stroke="#e8c76a" stroke-width="1.8"/><path d="M12 14.6V22" stroke="currentColor" stroke-width="1" opacity=".3"/>',
    umrah: '<circle cx="12" cy="12" r="3.2" fill="#fff"/><path d="M12 4a8 8 0 0 1 7.4 5M20 12a8 8 0 0 1-5 7.4M12 20a8 8 0 0 1-7.4-5M4 12a8 8 0 0 1 5-7.4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="m19.8 6.3-.4 2.7-2.6-.6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    tukar: '<rect x="3" y="3" width="8" height="11" rx="2" fill="#fff"/><rect x="13" y="10" width="8" height="11" rx="2" fill="#fff" opacity=".85"/><path d="M14 4.5h3.5a2 2 0 0 1 2 2V8M10 19.5H6.5a2 2 0 0 1-2-2V16" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>',
    zakat: '<rect x="5" y="2.5" width="14" height="19" rx="2.5" fill="#fff"/><rect x="7.5" y="5" width="9" height="4" rx="1" fill="currentColor" opacity=".4"/><g fill="currentColor" opacity=".45"><circle cx="9" cy="12.5" r="1"/><circle cx="12" cy="12.5" r="1"/><circle cx="15" cy="12.5" r="1"/><circle cx="9" cy="16" r="1"/><circle cx="12" cy="16" r="1"/><circle cx="15" cy="16" r="1"/></g>',
    tetapan: '<path d="M12 2.5 14 4l2.4-.4.9 2.3 2.3.9-.4 2.4 1.5 2-1.5 2 .4 2.4-2.3.9-.9 2.3-2.4-.4-2 1.5-2-1.5-2.4.4-.9-2.3-2.3-.9.4-2.4L2.5 12 4 10l-.4-2.4 2.3-.9.9-2.3L9.2 4Z" fill="#fff"/><circle cx="12" cy="12" r="3.3" fill="currentColor" opacity=".45"/>',
    profil: '<circle cx="12" cy="12" r="9.5" fill="#fff"/><circle cx="12" cy="9.6" r="3.2" fill="currentColor" opacity=".5"/><path d="M6.2 18.2a7 7 0 0 1 11.6 0" fill="currentColor" opacity=".5"/>',
    fiqh: '<path d="M12 3.5v16.5M7 20.5h10M4.5 7.5h15" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M7 8 4 14a3 3 0 0 0 6 0ZM17 8l-3 6a3 3 0 0 0 6 0Z" fill="#fff"/><circle cx="12" cy="4" r="1.6" fill="#fff"/>',
    bantuan: '<path d="M12 2.8a9.2 9.2 0 0 0-8 13.7L3 21l4.5-1a9.2 9.2 0 1 0 4.5-17.2Z" fill="#fff"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity=".55"/><circle cx="12" cy="16.6" r="1.1" fill="currentColor" opacity=".55"/>'
  };
  const TILES = [
    ['quran', 'Al-Quran', '#1f9d63', '#0e7a4c'], ['doa', 'Doa & Zikir', '#7b5cf0', '#5a3fd1'], ['fiqh', 'Fiqh & Rujukan', '#c9853a', '#9c5f1c'], ['kiblat', 'Arah Kiblat', '#8fd14f', '#4caf2a'],
    ['tasbih', 'Tasbih', '#2bb8f0', '#1192d6'], ['kalendar', 'Kalendar Islam', '#4cc8ee', '#1a9ccc'], ['asma', 'Asmaul Husna', '#7f8cff', '#5864f0'],
    ['galeri', 'Galeri', '#c08cf5', '#9a62e6'], ['haid', 'Panduan Haid', '#ff9cc9', '#f06aa6'], ['haji', 'Panduan Haji', '#5d6470', '#3a4049'],
    ['umrah', 'Panduan Umrah', '#ffd25a', '#f2b51f'], ['tukar', 'Tukar Tarikh', '#ff9a7a', '#f2704d'], ['zakat', 'Kalkulator Zakat', '#2fbf71', '#16934f'],
    ['tetapan', 'Tetapan', '#8d98b8', '#66718f'], ['profil', 'Profil', '#6a5cff', '#4636e6'], ['bantuan', 'Bantuan', '#3fd3b0', '#19ad8b']
  ];
  const TILE = Object.fromEntries(TILES.map(t => [t[0], t]));
  const glyph = (k, size = 26) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${G[k]}</svg>`;
  const tileIcon = (k, cls = '') => { const [, , a, b] = TILE[k]; return `<span class="app-ic ${cls}" style="--a:${a};--b:${b}">${glyph(k)}</span>`; };

  /* ---------- Tarikh Hijri (Umm al-Qura) dengan pelarasan ---------- */
  const hFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: TZ, day: 'numeric', month: 'numeric', year: 'numeric' });
  const adj = () => store.get('hijriAdj', 0);
  function hijri(date) {
    const p = Object.fromEntries(hFmt.formatToParts(new Date(date.getTime() + adj() * day)).filter(x => x.type !== 'literal').map(x => [x.type, parseInt(x.value, 10)]));
    return { d: p.day, m: p.month, y: p.year };
  }
  const hStr = h => `${h.d} ${HIJRI_M[h.m - 1]} ${h.y}H`;
  const gFmt = new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const gShort = new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
  const klNoon = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 4));
  const todayKL = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date()).filter(x => x.type !== 'literal').map(x => [x.type, +x.value])); return klNoon(p.year, p.month, p.day); };
  const isoKL = d => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

  /* ---------- Rangka panel ---------- */
  const root = $('#view-ibadah');
  let sub = null;
  function head(k, extra = '') {
    return `<div class="ib-head"><a class="ib-back" href="#ibadah" aria-label="Kembali ke Ibadah">${icon('chev')}</a>${tileIcon(k, 'sm')}<h1>${TILE[k][1]}</h1>${extra}</div>`;
  }
  function renderHub() {
    const h = hijri(todayKL());
    $('#ibHub').innerHTML = `<div class="page-head"><p class="eyebrow">${esc(gFmt.format(new Date()))} · ${hStr(h)}</p><h1 id="h-ibadah">Ibadah</h1></div>
      <div class="ib-grid">${TILES.map(([k, n]) => `<a class="ib-tile" href="#ibadah/${k}">${k === 'kalendar' ? `<span class="app-ic cal" style="--a:#d9f6ff;--b:#9fe3f7"><b>${h.d}</b><small>${HIJRI_S[h.m - 1]}</small></span>` : tileIcon(k)}<span>${n}</span></a>`).join('')}</div>
      ${continueCard()}`;
  }
  function continueCard() {
    const lr = store.get('qLast', null);
    if (!lr) return '';
    return `<a class="card shortcut" href="#ibadah/quran/${lr.s}/${lr.a}">${tileIcon('quran', 'sm')}<div class="sc-body"><div class="sc-title">Sambung bacaan</div><div class="sc-sub">${esc(lr.name || 'Surah ' + lr.s)}, ayat ${lr.a}</div></div>${icon('chev', 'ic chev')}</a>`;
  }

  function show() {
    const parts = (location.hash || '').slice(1).split('/');
    if (parts[0] !== 'ibadah') return;
    sub = parts[1] || null;
    $('#ibHub').classList.toggle('hidden', !!sub);
    $('#ibPanel').classList.toggle('hidden', !sub);
    if (!sub) { renderHub(); return; }
    if (sub === 'kiblat') { location.replace('#solat'); setTimeout(() => { const q = $('.qibla'); if (q) q.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 250); return; }
    const fn = PANELS[sub];
    if (!fn) { location.replace('#ibadah'); return; }
    fn(parts.slice(2));
  }
  document.addEventListener('viewchange', show);

  const P = () => $('#ibPanel');

  /* ---------- Al-Quran ---------- */
  let qList = store.get('qList', null), qTab = 'surah';
  const qCache = {};
  async function getList() {
    if (qList && qList.length === 114) return qList;
    qList = await QuranSrc.list();
    store.set('qList', qList);
    return qList;
  }
  async function getSurah(n) {
    if (qCache[n]) return qCache[n];
    return (qCache[n] = { n, ayahs: await QuranSrc.surah(n) });
  }
  const bm = () => store.get('qBm', []);
  const isBm = (s, a) => bm().some(b => b.s === s && b.a === a);
  function toggleBm(s, a) {
    const list = bm(), i = list.findIndex(b => b.s === s && b.a === a);
    if (i >= 0) list.splice(i, 1); else list.unshift({ s, a, t: Date.now() });
    store.set('qBm', list.slice(0, 200));
    return i < 0;
  }
  const surahName = n => { const s = qList && qList[n - 1]; return s ? s.en : 'Surah ' + n; };
  const offline = msg => `<div class="card empty"><p>${msg}</p><button class="btn sm ghost" data-retry>Cuba lagi</button></div>`;

  async function panelQuran(args) {
    if (args[0]) return panelReader(+args[0], +(args[1] || 0));
    P().innerHTML = head('quran', `<button class="icon-btn plain" data-go="quran-bm" aria-label="Penanda">${icon('bookmark')}</button>`) + `
      ${continueCard()}
      <div class="segmented q-tabs" role="tablist" aria-label="Senarai">
        <button role="tab" class="seg" data-qtab="surah">Surah</button><button role="tab" class="seg" data-qtab="juz">Juz</button><button role="tab" class="seg" data-qtab="bm">Penanda</button>
      </div>
      <div class="search-in q-search"><svg class="ic"><use href="#i-search"/></svg><input id="qFind" placeholder="Cari surah, cth. Yasin atau 36" aria-label="Cari surah" autocomplete="off"></div>
      <div class="list q-list" id="qListBox"><div class="pad muted">Memuatkan senarai surah</div></div>
      <p class="source">Teks Uthmani dan terjemahan Tafsir Pimpinan Ar-Rahman (Abdullah Basmeih) melalui api.alquran.cloud, dengan Quran.com sebagai sumber sandaran. Audio ${esc(QARI[qari()] || '')} melalui cdn.islamic.network.</p>`;
    paintQTab();
    try { await getList(); paintQTab(); }
    catch { if (!qList) $('#qListBox').innerHTML = offline('Senarai surah perlukan sambungan internet kali pertama.'); }
  }
  function paintQTab() {
    $$('[data-qtab]').forEach(b => { const on = b.dataset.qtab === qTab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    const box = $('#qListBox'); if (!box) return;
    $('.q-search').classList.toggle('hidden', qTab !== 'surah');
    const q = ($('#qFind') && $('#qFind').value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (qTab === 'juz') {
      box.innerHTML = D.JUZ.map(([s, a], i) => `<a class="q-row" href="#ibadah/quran/${s}/${a}"><span class="q-num">${i + 1}</span><span class="q-main"><b>Juz ${i + 1}</b><small>Bermula ${esc(surahName(s))} ayat ${a}</small></span>${icon('chev', 'ic chev')}</a>`).join('');
      return;
    }
    if (qTab === 'bm') {
      const list = bm();
      box.innerHTML = list.length ? list.map(b => `<a class="q-row" href="#ibadah/quran/${b.s}/${b.a}"><span class="q-num">${icon('bookmark')}</span><span class="q-main"><b>${esc(surahName(b.s))}</b><small>Ayat ${b.a}</small></span>${icon('chev', 'ic chev')}</a>`).join('')
        : '<div class="pad muted">Tiada penanda lagi. Tekan ikon penanda pada mana-mana ayat untuk menyimpannya.</div>';
      return;
    }
    if (!qList) return;
    const rows = qList.filter(s => !q || String(s.n) === q || s.en.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q) || s.tr.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q));
    box.innerHTML = rows.map(s => `<div class="q-row">
      <a class="q-link" href="#ibadah/quran/${s.n}"><span class="q-num">${s.n}</span><span class="q-main"><b>${esc(s.en)}</b><small>${esc(s.t)} · ${s.c} ayat</small></span><span class="q-ar" lang="ar">${esc(s.ar.replace(/^سُورَةُ\s*/, ''))}</span></a>
      <button class="q-play" data-play="${s.n}" aria-label="Main bacaan ${esc(s.en)}">${icon(player.s === s.n && !player.audio.paused ? 'pause' : 'play')}</button></div>`).join('') || '<div class="pad muted">Tiada surah sepadan.</div>';
  }

  async function panelReader(n, focus) {
    if (!(n >= 1 && n <= 114)) return location.replace('#ibadah/quran');
    P().innerHTML = head('quran') + `<div id="qReader"><div class="card pad muted">Memuatkan surah</div></div>`;
    let s;
    try { await getList().catch(() => {}); s = await getSurah(n); }
    catch { $('#qReader').innerHTML = offline('Surah ini belum disimpan dalam peranti. Sambung ke internet untuk memuatkannya.'); return; }
    const meta = qList ? qList[n - 1] : { n, en: 'Surah ' + n, ar: '', tr: '', c: s.ayahs.length, t: '' };
    const read = store.get('qRead', []); if (!read.includes(n)) { read.push(n); store.set('qRead', read); }
    $('#qReader').innerHTML = `
      <div class="q-hero"><p class="q-ar-big" lang="ar">${esc(meta.ar)}</p><h2>${esc(meta.en)}</h2><p>${esc(meta.tr)} · ${esc(meta.t)} · ${meta.c} ayat</p>
        <div class="actions center"><button class="btn sm light" data-play="${n}">${icon('play')}Main dari awal</button><a class="btn sm light" href="${QuranSrc.web(n)}" target="_blank" rel="noopener">Buka di Quran.com</a></div></div>
      ${n !== 1 && n !== 9 ? `<p class="q-basm" lang="ar">${BASMALAH}</p>` : ''}
      <ol class="ayahs">${s.ayahs.map(a => `<li class="ayah" id="ay-${a.k}" data-k="${a.k}">
        <div class="ay-bar"><span class="ay-n">${n}:${a.k}</span><span class="ay-acts">
          <button class="icon-btn plain" data-ayplay="${a.k}" aria-label="Main ayat ${a.k}">${icon('play')}</button>
          <button class="icon-btn plain ${isBm(n, a.k) ? 'on' : ''}" data-bm="${a.k}" aria-label="Penanda ayat ${a.k}">${icon('bookmark')}</button>
          <button class="icon-btn plain" data-copy="${a.k}" aria-label="Salin ayat ${a.k}">${icon('copy')}</button></span></div>
        <p class="ay-ar" lang="ar" dir="rtl">${esc(a.ar)} <span class="ay-end">${toArabicNum(a.k)}</span></p>
        <p class="ay-ms">${esc(a.ms)}</p></li>`).join('')}</ol>
      <div class="q-nav">${n > 1 ? `<a class="btn ghost" href="#ibadah/quran/${n - 1}">${icon('chev', 'ic flip')}${esc(surahName(n - 1))}</a>` : '<span></span>'}${n < 114 ? `<a class="btn ghost" href="#ibadah/quran/${n + 1}">${esc(surahName(n + 1))}${icon('chev')}</a>` : ''}</div>`;
    markPlaying();
    if (focus > 1) { const el = $('#ay-' + focus); if (el) { el.classList.add('flash'); setTimeout(() => el.scrollIntoView({ block: 'center' }), 60); } }
    else window.scrollTo({ top: 0 });
    // Simpan kedudukan bacaan terakhir
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) store.set('qLast', { s: n, a: +e.target.dataset.k, name: meta.en });
    }), { rootMargin: '-40% 0px -55% 0px' });
    $$('.ayah').forEach(el => io.observe(el));
    const stop = () => { io.disconnect(); window.removeEventListener('hashchange', stop); };
    window.addEventListener('hashchange', stop);
  }
  const toArabicNum = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

  /* Pemain audio ayat demi ayat */
  const qari = () => store.get('qari', 'ar.alafasy');
  const player = { audio: new Audio(), s: 0, list: [], i: 0, br: 128 };
  player.audio.preload = 'none';
  async function playFrom(n, k = 1) {
    try { await getList().catch(() => {}); const s = await getSurah(n); player.s = n; player.list = s.ayahs; player.i = Math.max(0, s.ayahs.findIndex(a => a.k === k)); player.br = 128; startAyah(); }
    catch { toast('Audio memerlukan sambungan internet.'); }
  }
  function startAyah() {
    const a = player.list[player.i]; if (!a) return stopPlayer();
    player.audio.src = AUDIO(qari(), a.g, player.br);
    player.audio.play().catch(() => {});
    paintMini(); markPlaying();
  }
  player.audio.addEventListener('ended', () => { player.i++; if (player.i < player.list.length) startAyah(); else stopPlayer(); });
  player.audio.addEventListener('error', () => { if (player.br === 128) { player.br = 64; startAyah(); } else { toast('Audio tidak dapat dimainkan.'); stopPlayer(); } });
  player.audio.addEventListener('play', () => { paintMini(); paintQTab(); });
  player.audio.addEventListener('pause', () => { paintMini(); paintQTab(); });
  function stopPlayer() { player.audio.pause(); player.s = 0; player.list = []; paintMini(); markPlaying(); paintQTab(); }
  function paintMini() {
    const m = $('#qMini');
    if (!player.s) { m.classList.add('hidden'); return; }
    const a = player.list[player.i];
    m.classList.remove('hidden');
    m.innerHTML = `${tileIcon('quran', 'xs')}<a class="qm-body" href="#ibadah/quran/${player.s}/${a ? a.k : 1}"><b>${esc(surahName(player.s))}</b><small>Ayat ${a ? a.k : ''} · ${esc(QARI[qari()] || '')}</small></a>
      <button class="icon-btn plain" data-mini="toggle" aria-label="${player.audio.paused ? 'Main' : 'Jeda'}">${icon(player.audio.paused ? 'play' : 'pause')}</button>
      <button class="icon-btn plain" data-mini="stop" aria-label="Henti">${icon('x')}</button>`;
  }
  function markPlaying() {
    $$('.ayah.playing').forEach(el => el.classList.remove('playing'));
    const a = player.list[player.i];
    if (!a || !$('#qReader') || location.hash.split('/')[2] != player.s) return;
    const el = $('#ay-' + a.k); if (el) { el.classList.add('playing'); if (!player.audio.paused) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
  document.addEventListener('click', e => {
    const m = e.target.closest('[data-mini]');
    if (m) { if (m.dataset.mini === 'stop') stopPlayer(); else player.audio.paused ? player.audio.play() : player.audio.pause(); }
  });

  /* ---------- Doa & Zikir ---------- */
  function panelDoa() {
    const groups = [...new Set(D.DOA.map(c => c.grp))];
    P().innerHTML = head('doa') + `
      <div class="search-in"><svg class="ic"><use href="#i-search"/></svg><input id="doaFind" placeholder="Cari doa, cth. makan atau hutang" aria-label="Cari doa" autocomplete="off"></div>
      <div id="doaBox">${groups.map(g => `<h2 class="grid-title">${g}</h2><div class="list doa-list">${D.DOA.filter(c => c.grp === g).map(c => `
        <details class="doa-cat" data-cat="${c.key}"><summary>${icon(c.icon)}<span>${c.name}</span><small class="num">${c.items.length}</small>${icon('chev-down', 'ic chev')}</summary>
          <div class="doa-items">${c.items.map(doaCard).join('')}</div></details>`).join('')}</div>`).join('')}</div>
      <p class="source">Doa disusun daripada Al-Quran dan hadis yang masyhur. Jika terdapat kesilapan, sila maklumkan kepada kami melalui halaman Bantuan.</p>`;
  }
  function doaCard([t, ar, rumi, ms, ref, link]) {
    return `<article class="doa" data-q="${esc((t + ' ' + rumi + ' ' + ms).toLowerCase())}"><h3>${esc(t)}</h3>${ar ? `<p class="ar" lang="ar" dir="rtl">${esc(ar)}</p>` : ''}<p class="rumi">${esc(rumi)}</p><p class="tr">${esc(ms)}</p>
      <div class="row-between"><span class="ref">${esc(ref)}</span>${link ? `<a class="link-btn" href="#ibadah/quran/${link.split(':')[0]}/${link.split(':')[1]}">Buka dalam Al-Quran</a>` : `<button class="link-btn" data-copytext="${esc(ar + '\n' + rumi + '\n' + ms)}">Salin</button>`}</div></article>`;
  }

  /* ---------- Tasbih ---------- */
  const DZIKIR = [['سُبْحَانَ اللَّهِ', 'Subhanallah'], ['الْحَمْدُ لِلَّهِ', 'Alhamdulillah'], ['اللَّهُ أَكْبَرُ', 'Allahu akbar'], ['لَا إِلَٰهَ إِلَّا اللَّهُ', 'La ilaha illallah'], ['أَسْتَغْفِرُ اللَّهَ', 'Astaghfirullah'], ['اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', 'Selawat']];
  function tsState() {
    const s = store.get('tasbih', { z: 0, c: 0, target: 33, total: 0, day: '', today: 0 });
    const t = isoKL(new Date()); if (s.day !== t) { s.day = t; s.today = 0; }
    return s;
  }
  function panelTasbih() {
    const s = tsState();
    P().innerHTML = head('tasbih') + `
      <div class="chips ts-chips" role="tablist" aria-label="Zikir">${DZIKIR.map(([, r], i) => `<button class="chip ${i === s.z ? 'active' : ''}" data-z="${i}">${r}</button>`).join('')}</div>
      <div class="ts-wrap">
        <p class="ts-ar" lang="ar" id="tsAr"></p>
        <button class="ts-btn" id="tsBtn" aria-label="Kira">
          <svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="88" class="ts-bg"/><circle cx="100" cy="100" r="88" class="ts-fg" id="tsRing" stroke-dasharray="553" stroke-dashoffset="553"/></svg>
          <span class="ts-count num" id="tsCount">0</span><span class="ts-of" id="tsOf"></span>
        </button>
        <div class="segmented small" id="tsTarget" aria-label="Sasaran">${[33, 99, 100, 0].map(t => `<button class="seg ${t === s.target ? 'active' : ''}" data-t="${t}">${t || 'Bebas'}</button>`).join('')}</div>
        <div class="stat-row two ts-stats"><div class="stat"><div class="v num" id="tsToday">0</div><div class="k">Hari ini</div></div><div class="stat"><div class="v num" id="tsTotal">0</div><div class="k">Jumlah keseluruhan</div></div></div>
        <button class="btn sm ghost" id="tsReset" type="button">Set semula kiraan</button>
      </div>`;
    paintTasbih();
  }
  function paintTasbih() {
    const s = tsState();
    $('#tsAr').textContent = DZIKIR[s.z][0];
    $('#tsCount').textContent = s.c;
    $('#tsOf').textContent = s.target ? `daripada ${s.target}` : 'tekan untuk mengira';
    $('#tsRing').style.strokeDashoffset = s.target ? 553 - 553 * Math.min(1, (s.c % s.target || (s.c ? s.target : 0)) / s.target) : 553;
    $('#tsToday').textContent = s.today.toLocaleString('ms-MY');
    $('#tsTotal').textContent = s.total.toLocaleString('ms-MY');
  }
  function tsTap() {
    const s = tsState(); s.c++; s.total++; s.today++;
    store.set('tasbih', s);
    const done = s.target && s.c % s.target === 0;
    if (navigator.vibrate) navigator.vibrate(done ? [60, 60, 120] : 12);
    if (done) toast(`${s.c} kali. Alhamdulillah.`);
    paintTasbih();
    const b = $('#tsBtn'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
  }

  /* ---------- Kalendar Islam ---------- */
  let calOff = 0;
  function panelKalendar() {
    const t = todayKL(), h = hijri(t);
    P().innerHTML = head('kalendar') + `
      <div class="cal-hero"><p class="eyebrow">Hari ini</p><h2>${hStr(h)}</h2><p>${esc(gFmt.format(new Date()))}</p></div>
      <div class="card cal-card"><div class="row-between"><button class="icon-btn plain" data-cal="-1" aria-label="Bulan sebelum">${icon('chev', 'ic flip')}</button><h3 id="calTitle"></h3><button class="icon-btn plain" data-cal="1" aria-label="Bulan seterusnya">${icon('chev')}</button></div>
        <div class="cal-grid" id="calGrid"></div></div>
      <div class="block-head"><h2>Tarikh penting</h2></div>
      <div class="list" id="calEvents"></div>
      <p class="source">Dikira mengikut kalendar Umm al-Qura${adj() ? ` dengan pelarasan ${adj() > 0 ? '+' : ''}${adj()} hari` : ''}. Tarikh rasmi di Malaysia ditentukan melalui rukyah dan hisab, dan boleh berbeza sehari. Laraskan dalam Tetapan.</p>`;
    paintCal(); paintEvents();
  }
  function paintCal() {
    const t = todayKL(), base = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + calOff, 1, 4));
    const y = base.getUTCFullYear(), m = base.getUTCMonth(), days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), start = (base.getUTCDay() + 6) % 7;
    const h1 = hijri(base), h2 = hijri(new Date(Date.UTC(y, m, days, 4)));
    $('#calTitle').innerHTML = `${new Intl.DateTimeFormat('ms-MY', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(base)}<small>${HIJRI_M[h1.m - 1]}${h1.m !== h2.m ? ' – ' + HIJRI_M[h2.m - 1] : ''} ${h2.y}H</small>`;
    const ev = Object.fromEntries(D.EVENTS.map(([em, ed, n]) => [em + '-' + ed, n]));
    let html = ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Ahd'].map(d => `<span class="cal-dow">${d}</span>`).join('') + '<span></span>'.repeat(start);
    for (let d = 1; d <= days; d++) {
      const dt = new Date(Date.UTC(y, m, d, 4)), h = hijri(dt), isT = dt.getTime() === t.getTime(), e = ev[h.m + '-' + h.d];
      html += `<span class="cal-d ${isT ? 'today' : ''} ${e ? 'event' : ''} ${(start + d - 1) % 7 === 4 ? 'fri' : ''}" ${e ? `title="${esc(e)}"` : ''}><b>${d}</b><small>${h.d === 1 ? HIJRI_S[h.m - 1] : h.d}</small></span>`;
    }
    $('#calGrid').innerHTML = html;
  }
  function upcoming(limit = 10) {
    const t = todayKL(), out = [], seen = new Set();
    for (let i = 0; i < 400 && out.length < limit; i++) {
      const dt = new Date(t.getTime() + i * day), h = hijri(dt);
      const e = D.EVENTS.find(([em, ed]) => em === h.m && ed === h.d);
      if (e && !seen.has(e[2] + h.y)) { seen.add(e[2] + h.y); out.push({ dt, h, name: e[2], i }); }
    }
    return out;
  }
  function paintEvents() {
    $('#calEvents').innerHTML = upcoming().map(e => `<div class="ev-row"><span class="ev-date"><b>${e.h.d}</b><small>${HIJRI_S[e.h.m - 1]}</small></span><span class="q-main"><b>${esc(e.name)}</b><small>${esc(gFmt.format(e.dt))}</small></span><span class="ev-left">${e.i === 0 ? 'Hari ini' : e.i === 1 ? 'Esok' : `${e.i} hari lagi`}</span></div>`).join('');
  }

  /* ---------- Tukar tarikh ---------- */
  function hijriToG(y, m, d) {
    const est = new Date(Date.UTC(622, 6, 16, 4) + ((y - 1) * 354.36707 + (m - 1) * 29.530589 + (d - 1)) * day);
    for (let i = -6; i <= 6; i++) { const dt = new Date(est.getTime() + i * day), h = hijri(dt); if (h.y === y && h.m === m && h.d === d) return dt; }
    return null;
  }
  function panelTukar() {
    const h = hijri(todayKL());
    P().innerHTML = head('tukar') + `
      <div class="two-col">
        <div class="card"><h3>Masihi ke Hijri</h3><div class="field"><label for="tkG">Tarikh Masihi</label><input type="date" id="tkG" value="${isoKL(new Date())}"></div><div class="tk-out" id="tkGOut" aria-live="polite"></div></div>
        <div class="card"><h3>Hijri ke Masihi</h3><div class="form-grid tk-h">
          <div class="field"><label for="tkHd">Hari</label><input id="tkHd" type="number" min="1" max="30" value="${h.d}" inputmode="numeric"></div>
          <div class="field"><label for="tkHm">Bulan</label><select id="tkHm">${HIJRI_M.map((n, i) => `<option value="${i + 1}" ${i + 1 === h.m ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label for="tkHy">Tahun</label><input id="tkHy" type="number" min="1300" max="1600" value="${h.y}" inputmode="numeric"></div></div>
          <div class="tk-out" id="tkHOut" aria-live="polite"></div></div>
      </div>
      <p class="source">Kiraan Umm al-Qura${adj() ? ` dengan pelarasan ${adj() > 0 ? '+' : ''}${adj()} hari` : ''}. Tarikh rasmi Malaysia boleh berbeza sehari.</p>`;
    convert();
  }
  function convert() {
    const g = $('#tkG').value;
    if (g) { const [y, m, d] = g.split('-').map(Number), dt = klNoon(y, m, d); $('#tkGOut').innerHTML = `<b>${hStr(hijri(dt))}</b><small>${esc(gFmt.format(dt))}</small>`; }
    const r = hijriToG(+$('#tkHy').value, +$('#tkHm').value, +$('#tkHd').value);
    $('#tkHOut').innerHTML = r ? `<b>${esc(gFmt.format(r))}</b><small>${hStr(hijri(r))}</small>` : '<small>Tarikh ini tiada dalam bulan tersebut.</small>';
  }

  /* ---------- Asmaul Husna ---------- */
  function panelAsma() {
    P().innerHTML = head('asma') + `
      <p class="lead">"Dan Allah mempunyai nama-nama yang baik, maka berdoalah kepada-Nya dengan menyebut nama-nama itu." (Surah Al-A'raf, 7:180)</p>
      <div class="search-in"><svg class="ic"><use href="#i-search"/></svg><input id="asmaFind" placeholder="Cari, cth. Ar-Razzaq atau rezeki" aria-label="Cari nama" autocomplete="off"></div>
      <div class="asma-grid" id="asmaGrid">${D.ASMA.map(([ar, r, m], i) => `<div class="asma" data-q="${esc((r + ' ' + m).toLowerCase())}"><span class="asma-n num">${i + 1}</span><p class="ar" lang="ar">${esc(ar)}</p><b>${esc(r)}</b><small>${esc(m)}</small></div>`).join('')}</div>
      <p class="source">Senarai 99 nama berdasarkan riwayat at-Tirmizi.</p>`;
  }

  /* ---------- Galeri: kad ayat dan doa untuk dimuat turun atau dikongsi ---------- */
  const SKIES = [['#070b1f', '#253462', '#3c4f86'], ['#182452', '#5a4c8a', '#e0957a'], ['#164f93', '#2f7fc4', '#78b6e2'], ['#1c1840', '#6c3767', '#e47157'], ['#0b3d33', '#0e6a55', '#2f9b7c'], ['#2b2214', '#6b5226', '#c9a14a']];
  function galleryItems() {
    const pick = D.DOA.flatMap(c => c.items).filter(x => x[1] && x[1].length < 130);
    return [...pick.map(x => ({ ar: x[1], tr: x[3], ref: x[4] })), ...D.ASMA.slice(0, 6).map(([ar, r, m]) => ({ ar, tr: `${r}: ${m}`, ref: 'Asmaul Husna' }))];
  }
  let galCache = [];
  function panelGaleri() {
    const items = galleryItems();
    P().innerHTML = head('galeri') + `<p class="lead">Kad ayat, doa dan Asmaul Husna untuk dijadikan kertas dinding atau dikongsi.</p><div class="gal-grid" id="galGrid">${items.map((_, i) => `<button class="gal" data-gal="${i}" aria-label="Kad ${i + 1}"><img alt="" id="gal-${i}"></button>`).join('')}</div>`;
    galCache = items;
    let i = 0;
    const step = () => { if (!$('#galGrid')) return; const img = $('#gal-' + i); if (img) img.src = drawCard(items[i], i, 540, 675).toDataURL('image/jpeg', .85); i++; if (i < items.length) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    return lines;
  }
  function drawCard(it, i, W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), s = W / 540, sky = SKIES[i % SKIES.length];
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, sky[0]); g.addColorStop(.6, sky[1]); g.addColorStop(1, sky[2]);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // bintang dan bulan
    x.fillStyle = 'rgba(255,255,255,.7)';
    for (let k = 0; k < 40; k++) { const px = ((k * 97 + i * 31) % 100) / 100 * W, py = ((k * 53 + i * 17) % 45) / 100 * H; x.beginPath(); x.arc(px, py, (k % 3 ? 0.9 : 1.5) * s, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255,246,216,.95)'; x.beginPath(); x.arc(W * .8, H * .13, 26 * s, 0, 7); x.fill();
    x.fillStyle = sky[0]; x.beginPath(); x.arc(W * .8 + 11 * s, H * .13 - 6 * s, 23 * s, 0, 7); x.fill();
    // bukit
    x.fillStyle = 'rgba(5,33,27,.55)'; x.beginPath(); x.moveTo(0, H * .86); x.bezierCurveTo(W * .3, H * .78, W * .6, H * .92, W, H * .82); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    x.fillStyle = 'rgba(4,26,21,.9)'; x.beginPath(); x.moveTo(0, H * .93); x.bezierCurveTo(W * .35, H * .87, W * .7, H * .97, W, H * .9); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    // teks
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.direction = 'rtl';
    let fs = 40 * s; x.font = `${fs}px "Amiri","Scheherazade New","Noto Naskh Arabic","Geeza Pro","Traditional Arabic",serif`;
    let ar = wrap(x, it.ar, W * .82);
    while (ar.length > 5 && fs > 24 * s) { fs -= 3 * s; x.font = x.font.replace(/^[\d.]+px/, fs + 'px'); ar = wrap(x, it.ar, W * .82); }
    const lh = fs * 1.75; let y = H * .4 - (ar.length - 1) * lh / 2;
    ar.forEach(l => { x.fillText(l, W / 2, y); y += lh; });
    x.direction = 'ltr'; x.font = `${17 * s}px Geist, -apple-system, "Segoe UI", sans-serif`; x.fillStyle = 'rgba(255,255,255,.88)';
    y += 10 * s; wrap(x, it.tr, W * .8).slice(0, 5).forEach(l => { x.fillText(l, W / 2, y); y += 25 * s; });
    x.font = `600 ${13 * s}px Geist, -apple-system, sans-serif`; x.fillStyle = 'rgba(255,226,160,.95)'; x.fillText(it.ref, W / 2, y + 8 * s);
    x.font = `600 ${12 * s}px Geist, -apple-system, sans-serif`; x.fillStyle = 'rgba(255,255,255,.6)'; x.fillText('bijaklabur.my', W / 2, H - 18 * s);
    return c;
  }
  async function shareCard(i) {
    const c = drawCard(galCache[i], i, 1080, 1350);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const file = new File([blob], `bijak-labur-${i + 1}.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Bijak Labur' }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Kad dimuat turun');
  }

  /* ---------- Panduan Haji dan Umrah ---------- */
  function guide(k, g) {
    P().innerHTML = head(k) + `<p class="lead">${esc(g.intro)}</p>
      <ol class="steps">${g.steps.map(([t, b], i) => `<li><span class="step-n num">${i + 1}</span><div><h3>${esc(t)}</h3><p>${esc(b)}</p></div></li>`).join('')}</ol>
      <p class="note">${icon('alert')}<span>${esc(g.notes)}</span></p>`;
  }

  /* ---------- Panduan Haid dan mod uzur ---------- */
  function panelHaid() {
    const H = D.HAID, u = store.get('uzur', { on: false, start: '', log: [] });
    const days = u.on ? Math.floor((todayKL() - new Date(u.start + 'T12:00:00+08:00')) / day) + 1 : 0;
    P().innerHTML = head('haid') + `
      <div class="card toggle-row uzur ${u.on ? 'on' : ''}">
        <span class="sc-ico pink">${icon('drops')}</span>
        <div class="sc-body"><div class="sc-title">Mod uzur</div><div class="sc-sub">${u.on ? `Aktif sejak ${esc(gShort.format(new Date(u.start + 'T12:00:00+08:00')))} (hari ke-${days}). Rekod solat dijeda tanpa memutuskan rantaian.` : 'Hidupkan semasa haid atau nifas. Rekod solat akan dijeda.'}</div></div>
        <button class="switch" id="uzurBtn" role="switch" aria-checked="${u.on}" aria-label="Mod uzur"><span></span></button>
      </div>
      ${u.on && days > 15 ? `<p class="note">${icon('alert')}<span>Sudah melebihi 15 hari. Mengikut mazhab Syafie, darah selepas 15 hari ialah istihadah. Sila rujuk ustazah.</span></p>` : ''}
      <p class="lead">${esc(H.intro)}</p>
      <div class="card"><h3>Tempoh</h3><dl class="zk-lines">${H.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>
      <div class="two-col"><div class="card"><h3>Perkara yang dilarang</h3><ul class="tick no">${H.forbidden.map(x => `<li>${icon('x')}${esc(x)}</li>`).join('')}</ul></div>
      <div class="card"><h3>Amalan yang boleh</h3><ul class="tick">${H.allowed.map(x => `<li>${icon('check')}${esc(x)}</li>`).join('')}</ul></div></div>
      <div class="card"><h3>Selepas suci</h3><p>${esc(H.end)}</p></div>
      ${u.log.length ? `<div class="block-head"><h2>Rekod kitaran</h2></div><div class="list">${u.log.slice(0, 12).map(l => { const n = Math.round((new Date(l.e) - new Date(l.s)) / day) + 1; return `<div class="ev-row"><span class="q-main"><b>${esc(gShort.format(new Date(l.s + 'T12:00:00+08:00')))} hingga ${esc(gShort.format(new Date(l.e + 'T12:00:00+08:00')))}</b><small>${n} hari</small></span></div>`; }).join('')}</div>` : ''}
      <p class="source">Rekod disimpan dalam peranti ini sahaja.</p>`;
  }

  /* ---------- Zakat ---------- */
  function panelZakat() {
    const z = store.get('zakatIb', {});
    P().innerHTML = head('zakat') + `
      <div class="two-col">
        <div class="card"><h3>Zakat fitrah</h3>
          <div class="form-grid"><div class="field"><label for="zfN">Bilangan orang</label><input id="zfN" type="number" min="1" value="${z.n || 1}" inputmode="numeric"></div>
          <div class="field"><label for="zfR">Kadar seorang (RM)</label><input id="zfR" type="number" min="0" step="0.5" value="${z.r || ''}" placeholder="Ikut negeri" inputmode="decimal"></div></div>
          <div class="zk-due"><span>Jumlah fitrah</span><b class="num" id="zfOut">RM0.00</b></div>
          <p class="muted small">Kadar ditetapkan oleh majlis agama negeri setiap tahun dan berbeza mengikut jenis beras.</p></div>
        <div class="card"><h3>Zakat simpanan</h3>
          <div class="form-grid"><div class="field"><label for="zsS">Baki simpanan terendah setahun (RM)</label><input id="zsS" type="number" min="0" step="any" value="${z.s || ''}" inputmode="decimal"></div>
          <div class="field"><label for="zsG">Harga emas segram (RM)</label><input id="zsG" type="number" min="0" step="any" value="${z.g || ''}" placeholder="Harga hari ini" inputmode="decimal"></div></div>
          <div class="zk-due"><span id="zsLbl">Zakat 2.5%</span><b class="num" id="zsOut">RM0.00</b></div>
          <p class="muted small" id="zsNote">Nisab ialah nilai 85 gram emas.</p></div>
      </div>
      <a class="card shortcut hidden" href="#premium" data-premium-entry>${tileIcon('zakat', 'sm')}<div class="sc-body"><div class="sc-title">Zakat pelaburan</div><div class="sc-sub">Saham, kripto dan portfolio dalam Bijak Labur Premium</div></div>${icon('chev', 'ic chev')}</a>
      <p class="source">Kiraan ringkas untuk panduan. Rujuk pusat zakat negeri anda sebelum membayar.</p>`;
    const vis = $('.desk-nav [data-premium-entry]');
    if (vis && !vis.classList.contains('hidden')) $$('[data-premium-entry]', P()).forEach(el => el.classList.remove('hidden'));
    calcZakat();
  }
  const rm = v => 'RM' + (v || 0).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function calcZakat() {
    const n = +$('#zfN').value || 0, r = +$('#zfR').value || 0, s = +$('#zsS').value || 0, g = +$('#zsG').value || 0;
    store.set('zakatIb', { n, r, s, g });
    $('#zfOut').textContent = rm(n * r);
    const nisab = g * 85;
    if (!g) { $('#zsOut').textContent = rm(0); $('#zsNote').textContent = 'Masukkan harga emas untuk mengira nisab (85 gram).'; return; }
    const due = s >= nisab ? s * 0.025 : 0;
    $('#zsOut').textContent = rm(due);
    $('#zsNote').textContent = s >= nisab ? `Simpanan melebihi nisab ${rm(nisab)}. Wajib zakat jika cukup haul.` : `Belum cukup nisab ${rm(nisab)}. Tiada zakat simpanan.`;
  }

  /* ---------- Tetapan ---------- */
  function panelTetapan() {
    const theme = document.documentElement.dataset.theme || 'auto', a = adj(), sz = store.get('arSize', 28);
    P().innerHTML = head('tetapan') + `
      <div class="card set-list">
        <div class="set-row"><span>Tema</span><div class="segmented small" id="setTheme">${[['auto', 'Auto'], ['light', 'Cerah'], ['dark', 'Gelap']].map(([k, n]) => `<button class="seg ${k === theme ? 'active' : ''}" data-theme-set="${k}">${n}</button>`).join('')}</div></div>
        <div class="set-row"><label for="setAr">Saiz tulisan Arab</label><input type="range" id="setAr" min="20" max="44" step="2" value="${sz}"></div>
        <p class="ar set-prev" lang="ar" id="setPrev">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
        <div class="set-row"><label for="setQari">Qari</label><select id="setQari">${Object.entries(QARI).map(([k, n]) => `<option value="${k}" ${k === qari() ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="set-row"><span>Pelarasan tarikh Hijri</span><div class="segmented small" id="setAdj">${[-2, -1, 0, 1, 2].map(v => `<button class="seg ${v === a ? 'active' : ''}" data-adj="${v}">${v > 0 ? '+' + v : v}</button>`).join('')}</div></div>
        <a class="set-row link" href="#solat"><span>Zon waktu solat dan peringatan azan</span>${icon('chev', 'ic chev')}</a>
        <a class="set-row link" href="#ibadah/profil"><span>Profil</span>${icon('chev', 'ic chev')}</a>
      </div>
      <div class="card"><h3>Data dalam peranti</h3><p class="muted small">Rekod solat, tasbih, penanda Al-Quran, profil dan mod uzur disimpan dalam peranti ini sahaja.</p><button class="btn sm ghost danger" id="setWipe">Padam data ibadah</button></div>`;
  }

  /* ---------- Profil ---------- */
  function panelProfil() {
    const name = store.get('nama', ''), rek = store.get('rekod', {}), ts = store.get('tasbih', { total: 0 });
    const full = Object.values(rek).filter(v => v.length >= 5).length, prayers = Object.values(rek).reduce((a, v) => a + v.length, 0);
    P().innerHTML = head('profil') + `
      <div class="card profile"><span class="avatar">${esc((name || 'B').trim().charAt(0).toUpperCase())}</span>
        <div class="field grow"><label for="pfName">Nama panggilan</label><input id="pfName" maxlength="30" value="${esc(name)}" placeholder="Untuk ucapan di halaman utama" autocomplete="nickname"></div></div>
      <div class="stat-row four">
        <div class="stat"><div class="v num">${prayers}</div><div class="k">Solat direkod</div></div>
        <div class="stat"><div class="v num">${full}</div><div class="k">Hari lengkap 5 waktu</div></div>
        <div class="stat"><div class="v num">${(ts.total || 0).toLocaleString('ms-MY')}</div><div class="k">Zikir dikira</div></div>
        <div class="stat"><div class="v num">${store.get('qRead', []).length}</div><div class="k">Surah dibuka</div></div>
      </div>
      <p class="source">Tiada akaun diperlukan. Profil disimpan dalam peranti ini sahaja.</p>`;
  }

  /* ---------- Bantuan ---------- */
  function panelBantuan() {
    P().innerHTML = head('bantuan') + `<div class="list faq">${D.FAQ.map(([q, a]) => `<details class="doa-cat"><summary><span>${esc(q)}</span>${icon('chev-down', 'ic chev')}</summary><p class="faq-a">${esc(a)}</p></details>`).join('')}</div>
      <div class="card"><h3>Hubungi kami</h3><p class="muted small">Untuk laporan kesilapan atau cadangan, buka isu di GitHub projek ini.</p>
        <div class="actions"><a class="btn sm ghost" href="https://github.com/shamirAI-RGB/bijak-labur/issues" target="_blank" rel="noopener">${icon('link')}Laporkan isu</a><a class="btn sm ghost" href="privacy.html">Dasar privasi</a><a class="btn sm ghost" href="terma.html">Terma</a></div></div>`;
  }

  const PANELS = { quran: panelQuran, doa: panelDoa, tasbih: panelTasbih, kalendar: panelKalendar, tukar: panelTukar, asma: panelAsma, galeri: panelGaleri,
    haji: () => guide('haji', D.HAJI), umrah: () => guide('umrah', D.UMRAH), haid: panelHaid, zakat: panelZakat, tetapan: panelTetapan, profil: panelProfil, bantuan: panelBantuan,
    fiqh: args => Fiqh.render(P(), args, head('fiqh')) };

  /* ---------- Acara ---------- */
  root.addEventListener('click', async e => {
    const t = e.target;
    let b;
    if ((b = t.closest('[data-retry]'))) return show();
    if ((b = t.closest('[data-qtab]'))) { qTab = b.dataset.qtab; return paintQTab(); }
    if ((b = t.closest('[data-go="quran-bm"]'))) { qTab = 'bm'; return paintQTab(); }
    if ((b = t.closest('[data-play]'))) { const n = +b.dataset.play; if (player.s === n && !player.audio.paused) return player.audio.pause(); if (player.s === n && player.list.length) return player.audio.play(); return playFrom(n, 1); }
    if ((b = t.closest('[data-ayplay]'))) { const n = +location.hash.split('/')[2]; return playFrom(n, +b.dataset.ayplay); }
    if ((b = t.closest('[data-bm]'))) { const n = +location.hash.split('/')[2], on = toggleBm(n, +b.dataset.bm); b.classList.toggle('on', on); return toast(on ? 'Penanda disimpan' : 'Penanda dibuang'); }
    if ((b = t.closest('[data-copy]'))) { const n = +location.hash.split('/')[2], a = qCache[n].ayahs.find(x => x.k === +b.dataset.copy); return copy(`${a.ar}\n\n${a.ms}\n(${surahName(n)} ${n}:${a.k})`); }
    if ((b = t.closest('[data-copytext]'))) return copy(b.dataset.copytext);
    if ((b = t.closest('[data-z]'))) { const s = tsState(); s.z = +b.dataset.z; s.c = 0; store.set('tasbih', s); $$('[data-z]').forEach(x => x.classList.toggle('active', x === b)); return paintTasbih(); }
    if ((b = t.closest('[data-t]'))) { const s = tsState(); s.target = +b.dataset.t; store.set('tasbih', s); $$('[data-t]').forEach(x => x.classList.toggle('active', x === b)); return paintTasbih(); }
    if (t.closest('#tsBtn')) return tsTap();
    if (t.closest('#tsReset')) { const s = tsState(); s.c = 0; store.set('tasbih', s); return paintTasbih(); }
    if ((b = t.closest('[data-cal]'))) { calOff += +b.dataset.cal; return paintCal(); }
    if ((b = t.closest('[data-gal]'))) return shareCard(+b.dataset.gal);
    if (t.closest('#uzurBtn')) {
      const u = store.get('uzur', { on: false, start: '', log: [] }), today = isoKL(new Date());
      if (u.on) { u.log.unshift({ s: u.start, e: today }); u.on = false; u.start = ''; toast('Mod uzur dimatikan. Rekod solat disambung.'); }
      else { u.on = true; u.start = today; toast('Mod uzur diaktifkan'); }
      store.set('uzur', u); document.dispatchEvent(new CustomEvent('uzurchange')); return panelHaid();
    }
    if ((b = t.closest('[data-theme-set]'))) {
      const v = b.dataset.themeSet;
      if (v === 'auto') { delete document.documentElement.dataset.theme; store.set('theme', null); } else { document.documentElement.dataset.theme = v; store.set('theme', v); }
      if (typeof paintThemeIcon === 'function') paintThemeIcon();
      document.dispatchEvent(new CustomEvent('themechange'));
      return $$('[data-theme-set]').forEach(x => x.classList.toggle('active', x === b));
    }
    if ((b = t.closest('[data-adj]'))) { store.set('hijriAdj', +b.dataset.adj); $$('[data-adj]').forEach(x => x.classList.toggle('active', x === b)); return toast('Tarikh Hijri dilaraskan'); }
    if (t.closest('#setWipe')) {
      if (!confirm('Padam rekod solat, tasbih, penanda Al-Quran, profil dan mod uzur dalam peranti ini?')) return;
      ['rekod', 'tasbih', 'qBm', 'qLast', 'qRead', 'nama', 'uzur', 'zakatIb'].forEach(k => { try { localStorage.removeItem('bl_' + k); } catch {} });
      document.dispatchEvent(new CustomEvent('uzurchange'));
      return toast('Data ibadah dipadam');
    }
  });
  root.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'qFind') paintQTab();
    else if (id === 'doaFind') {
      const q = e.target.value.toLowerCase().trim();
      $$('.doa-cat', root).forEach(c => {
        let any = false;
        $$('.doa', c).forEach(d => { const hit = !q || d.dataset.q.includes(q) || c.querySelector('summary span').textContent.toLowerCase().includes(q); d.classList.toggle('hidden', !hit); any = any || hit; });
        c.classList.toggle('hidden', !any); c.open = !!q && any;
      });
    } else if (id === 'asmaFind') { const q = e.target.value.toLowerCase().trim(); $$('.asma', root).forEach(a => a.classList.toggle('hidden', !!q && !a.dataset.q.includes(q))); }
    else if (['tkG', 'tkHd', 'tkHm', 'tkHy'].includes(id)) convert();
    else if (['zfN', 'zfR', 'zsS', 'zsG'].includes(id)) calcZakat();
    else if (id === 'setAr') { store.set('arSize', +e.target.value); applyArSize(); }
    else if (id === 'pfName') { store.set('nama', e.target.value.trim()); if (window.greet) greet(); }
  });
  root.addEventListener('change', e => { if (e.target.id === 'setQari') { store.set('qari', e.target.value); toast('Qari ditukar'); } });
  async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Disalin'); } catch { toast('Tidak dapat menyalin'); } }
  function applyArSize() { document.documentElement.style.setProperty('--ar-size', store.get('arSize', 28) + 'px'); }
  applyArSize();

  window.Ibadah = { hijri, hStr };
  if (location.hash.startsWith('#ibadah')) show();
})();
