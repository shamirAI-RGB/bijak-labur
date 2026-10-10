/* SiswaCap: lapisan masa depan ("Bijak OS"), dimuat paling akhir.
   1. Arahan: palet arahan (Ctrl/⌘ K, "/" atau butang di bar atas). Carian kabur ke setiap halaman dan alat,
      arahan suara (Web Speech API), kiraan pantas (zakat, peratus, aritmetik) dan laluan terus ke Tanya AI Fiqh.
   2. HUD: jalur maklumat hidup di atas pentas utama (tarikh Hijri, solat seterusnya dengan kiraan detik,
      kelas seterusnya, harga kripto) dan taklimat suara yang membaca semuanya.
   3. Konteks: pentas utama memilih sendiri ciri yang paling berguna sekarang (solat hampir, kelas hampir,
      waktu pasaran, malam untuk ibadah) dan menanda ikonnya.
   4. Aurora: latar cahaya WebGL (shader) yang mengikut ciri terpilih dan penunjuk; dimatikan apabila
      pentas tidak kelihatan, pergerakan dikurangkan atau WebGL tiada.
   5. Sentuhan: kad condong 3D ikut penunjuk, giroskop menggerakkan paralaks di telefon, getaran halus.
   Tiada h2, .card atau .page-head ditambah supaya kunci teks Mod Pemilik tidak beralih. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const halus = matchMedia('(hover: hover) and (pointer: fine)');
  const TZ = 'Asia/Kuala_Lumpur';
  const jamKL = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return { d: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1, h: +p.hour % 24, m: (+p.hour % 24) * 60 + +p.minute };
  };
  const fmtJam = ts => new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ts * 1000));
  const fmtMin = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const RM = n => 'RM ' + n.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const MIC = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>';

  /* ---------- Getaran halus (Android dan app) ---------- */
  function getar(ms = 6) {
    if (reduce.matches) return;
    const H = typeof plugin === 'function' && plugin('Haptics');
    if (H && H.impact) { H.impact({ style: 'LIGHT' }).catch(() => {}); return; }
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch {} }
  }
  document.addEventListener('click', e => { if (e.target.closest('.sn-ic, .tabbar a, .desk-nav a, .md-hud a')) getar(); });

  /* ---------- Data hidup (daripada modul lain, jika sudah ada) ---------- */
  const solatNext = () => (window.Solat && Solat.seterusnya()) || null;
  function kelasNext() {
    if (!window.Jadual) return null;
    let k; try { k = Jadual.kunci(); } catch { return null; }
    const all = k.slots || []; if (!all.length) return null;
    const n = jamKL();
    const live = all.find(s => s.d === n.d && s.s <= n.m && n.m < s.e);
    if (live) return { s: live, live: true, in: 0, left: live.e - n.m, DAY3: k.DAY3 };
    let best = null, bestIn = Infinity;
    for (const s of all) {
      let delta = ((s.d - n.d + 7) % 7) * 1440 + s.s - n.m;
      if (delta <= 0) delta += 7 * 1440;
      if (delta < bestIn) { best = s; bestIn = delta; }
    }
    return best ? { s: best, live: false, in: bestIn, DAY3: k.DAY3 } : null;
  }
  function hijriHariIni() {
    const j = window.Solat && Solat.hijri(); if (j) return j;
    if (window.Ibadah) { try { return Ibadah.hStr(Ibadah.hijri(new Date())); } catch {} }
    return '';
  }
  const kripto = () => {
    if (!window.Pasaran) return null;
    const s = Pasaran.simbol()[0]; const h = s && Pasaran.harga(s);
    return h && Number.isFinite(h.price) ? { s, ...h } : null;
  };

  /* ---------- Destinasi dan tindakan untuk palet arahan ---------- */
  const TUJU = [
    { t: 'Utama', s: 'Halaman utama', h: '#utama', ic: 'home', k: 'home rumah mula' },
    { t: 'Belajar Melabur', s: 'Modul saham, kripto, analisis', h: '#belajar', ic: 'cap', k: 'kursus modul moomoo saham kripto pelaburan asas kuiz' },
    { t: 'Pasaran kripto', s: 'Harga langsung dan status Syariah', h: '#pasaran', ic: 'chart', k: 'bitcoin btc eth harga crypto koin carta' , act: () => store.set('marketSeg', 'crypto') },
    { t: 'Pasaran saham', s: 'Saham AS dan Bursa', h: '#pasaran', ic: 'bars', k: 'stock bursa klse nasdaq apple nvidia tesla' , act: () => store.set('marketSeg', 'stock') },
    { t: 'Waktu Solat', s: 'Zon JAKIM, azan, kiraan detik', h: '#solat', ic: 'mosque', k: 'subuh zohor asar maghrib isyak azan prayer waktu' },
    { t: 'Arah Kiblat', s: 'Kompas kiblat', h: '#ibadah/kiblat', ic: 'compass', k: 'qibla kompas kaabah arah' },
    { t: 'Ibadah', s: 'Semua alat ibadah harian', h: '#ibadah', ic: 'moon-star', k: 'islam harian alat' },
    { t: 'Al-Quran', s: 'Baca dan dengar', h: '#ibadah/quran', ic: 'book', k: 'quran surah ayat tilawah baca mushaf yasin' },
    { t: 'Doa & Zikir', s: 'Doa harian dan zikir', h: '#ibadah/doa', ic: 'pray', k: 'doa zikir wirid' },
    { t: 'Tasbih', s: 'Pembilang tasbih', h: '#ibadah/tasbih', ic: 'beads', k: 'tasbih kira bilang' },
    { t: 'Kalendar Islam', s: 'Tarikh dan peristiwa Hijri', h: '#ibadah/kalendar', ic: 'calendar', k: 'hijri kalendar ramadan puasa raya' },
    { t: 'Asmaul Husna', s: '99 nama Allah', h: '#ibadah/asma', ic: 'star', k: 'asma nama allah' },
    { t: 'Kalkulator Zakat', s: 'Zakat pendapatan, simpanan, saham', h: '#ibadah/zakat', ic: 'coins', k: 'zakat nisab haul kira' },
    { t: 'Tukar Tarikh', s: 'Masihi ke Hijri dan sebaliknya', h: '#ibadah/tukar', ic: 'refresh', k: 'tarikh hijri masihi tukar convert' },
    { t: 'Panduan Haji & Umrah', s: 'Langkah demi langkah', h: '#ibadah/haji', ic: 'plane', k: 'haji umrah mekah' },
    { t: 'Fiqh & Rujukan', s: 'Hukum dengan sumber kitab', h: '#ibadah/fiqh', ic: 'book', k: 'fiqh hukum muamalat riba halal haram rujukan kitab fatwa' },
    { t: 'Tanya AI Fiqh', s: 'Soalan dijawab dengan muka surat kitab', h: '#ibadah/fiqh/tanya', ic: 'quote', k: 'tanya ai soalan fiqh hukum' },
    { t: 'Semak Kertas', s: 'Peratus AI dan plagiat', h: '#semak', ic: 'file', k: 'plagiat ai tulisan esei assignment semak kertas turnitin' },
    { t: 'Jadual Kelas', s: 'Jadual UiTM dan skrin kunci', h: '#jadual', ic: 'calendar', k: 'uitm kelas kuliah timetable wallpaper skrin kunci' },
    { t: 'Kedai Nota', s: 'Nota IC220', h: '#nota', ic: 'receipt', k: 'nota ic220 beli kedai' },
    { t: 'Komuniti pelajar', s: 'Rakan dan acara', h: '#komuniti', ic: 'chat', k: 'komuniti rakan acara forum' },
    { t: 'Studio Gambar AI', s: 'Jana gambar', h: '#studio', ic: 'camera', k: 'gambar imej studio jana ai' },
    { t: 'Buku Nota AI', s: 'Ringkasan dan soalan daripada fail', h: '#buku', ic: 'layers', k: 'buku nota ringkasan pdf ai belajar' },
    { t: 'Kerjaya AI', s: 'Resume dan temu duga', h: '#kerja', ic: 'target', k: 'kerjaya resume cv temu duga kerja' },
    { t: 'Sihat', s: 'Kalori dan langkah', h: '#sihat', ic: 'flame', k: 'sihat kalori langkah diet makanan' },
    { t: 'Jejak Aktiviti', s: 'GPS lari, jalan, basikal', h: '#jejak', ic: 'pin', k: 'jejak gps lari jalan basikal peta' },
    { t: 'Audit Halal', s: 'Senarai semak skim pensijilan', h: '#halal', ic: 'shield', k: 'halal audit jakim pensijilan senarai semak' },
    { t: 'Premium', s: 'Pelan dan ciri Premium', h: '#premium', ic: 'star', k: 'premium bayar langgan pelan' },
    { t: 'Ruang soalan', s: 'Hubungi Shamir dan Wabil', h: '#soalan', ic: 'mail', k: 'soalan hubungi whatsapp emel bantuan' },
    { t: 'Profil', s: 'Nama panggilan dan tetapan', h: '#ibadah/profil', ic: 'user', k: 'profil nama tetapan akaun' },
    { t: 'Peta Jalan 3D', s: 'Peta Malaysia dengan navigasi', h: 'peta.html', ic: 'compass', k: 'peta map jalan navigasi 3d', luar: true },
    { t: 'Tentang kami', s: 'Pengasas dan misi', h: 'tentang.html', ic: 'help', k: 'tentang pengasas siapa kami', luar: true },
    { t: 'Tema cerah', s: 'Rupa kertas Takwim', ic: 'sun', k: 'tema cerah terang light', act: () => tema('light') },
    { t: 'Tema gelap', s: 'Rupa sinema', ic: 'moon', k: 'tema gelap dark sinema', act: () => tema('dark') },
    { t: 'Tema auto', s: 'Ikut peranti', ic: 'sunmoon', k: 'tema auto sistem', act: () => tema('auto') },
    { t: 'Bacakan halaman ini', s: 'Suara membaca kandungan', ic: 'volume', k: 'baca suara dengar bacakan', act: () => { const b = $('#sayBtn'); if (b) b.click(); } },
    { t: 'Taklimat hari ini', s: 'Suara: tarikh, solat, kelas, pasaran', ic: 'play', k: 'taklimat ringkasan hari ini briefing', act: () => taklimat() },
    { t: 'Tetapan dan bantuan', s: 'Menu tetapan', ic: 'sliders', k: 'tetapan menu saiz tulisan bantuan', act: () => { const b = $('#menuBtn'); if (b) b.click(); } },
    { t: 'Pasang app', s: 'Tambah ke skrin utama', ic: 'download', k: 'pasang install app skrin utama', act: async () => { if (!(window.installApp && await installApp())) toast('Di Chrome: menu ⋮ kemudian Install app. Di Safari: Kongsi kemudian Add to Home Screen.', 5000); } }
  ];
  function tema(v) {
    if (v === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v;
    store.set('theme', v === 'auto' ? null : v);
    if (typeof paintThemeIcon === 'function') paintThemeIcon();
    document.dispatchEvent(new CustomEvent('themechange'));
  }
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%?+\-*/.,() ]+/g, ' ').trim();
  const kerap = () => store.get('arahanKerap', {});
  function skor(q, d) {
    const teks = norm(d.t + ' ' + d.s + ' ' + (d.k || '')), kata = teks.split(/\s+/);
    let jumlah = 0;
    for (const tok of q.split(/\s+/).filter(Boolean)) {
      let best = 0;
      if (norm(d.t).startsWith(tok)) best = 6;
      else if (kata.some(w => w.startsWith(tok))) best = 4;
      else if (teks.includes(tok)) best = 2;
      else {
        // Padanan subjujukan: "jdl" memadankan "jadual"
        let i = 0; for (const ch of norm(d.t).replace(/\s/g, '')) if (ch === tok[i]) i++;
        if (i === tok.length && tok.length >= 2) best = 1;
      }
      if (!best) return 0;
      jumlah += best;
    }
    return jumlah + Math.min(2, (kerap()[d.h || d.t] || 0) * .25);
  }

  /* Kiraan pantas tanpa eval: aritmetik + - * / ( ), "x" sebagai darab, peratus, zakat */
  function kiraUngkapan(src) {
    const s = src.replace(/,/g, '').replace(/x|×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
    if (!/^[\d.+\-*/()%]+$/.test(s) || !/\d/.test(s) || !/[+\-*/%]/.test(s)) return null;
    let i = 0;
    const peek = () => s[i], next = () => s[i++];
    function nombor() {
      if (peek() === '(') { next(); const v = jumlah(); if (next() !== ')') throw 0; return v; }
      if (peek() === '-') { next(); return -nombor(); }
      const m = /^\d*\.?\d+/.exec(s.slice(i)); if (!m) throw 0; i += m[0].length;
      let v = parseFloat(m[0]);
      if (peek() === '%') { next(); v /= 100; }
      return v;
    }
    function hasil() { let v = nombor(); while (peek() === '*' || peek() === '/') { const op = next(), r = nombor(); v = op === '*' ? v * r : v / r; } return v; }
    function jumlah() { let v = hasil(); while (peek() === '+' || peek() === '-') { const op = next(), r = hasil(); v = op === '+' ? v + r : v - r; } return v; }
    try { const v = jumlah(); if (i !== s.length || !Number.isFinite(v)) return null; return v; } catch { return null; }
  }
  function kiraan(qAsal) {
    const q = norm(qAsal), out = [];
    let m = /^zakat\s*(?:rm)?\s*([\d.,]+)/.exec(q) || /^([\d.,]+)\s*zakat/.exec(q);
    if (m) {
      const n = parseFloat(m[1].replace(/,/g, ''));
      if (Number.isFinite(n)) out.push({ t: `Zakat 2.5% daripada ${RM(n)} = ${RM(n * .025)}`, s: 'Kadar zakat harta 2.5%. Semak nisab dan haul dalam Kalkulator Zakat.', h: '#ibadah/zakat', ic: 'coins', kira: true });
    }
    m = /^([\d.,]+)\s*%\s*(?:daripada|dari|of)\s*(?:rm)?\s*([\d.,]+)/.exec(q);
    if (m) {
      const a = parseFloat(m[1].replace(/,/g, '')), b = parseFloat(m[2].replace(/,/g, ''));
      if (Number.isFinite(a) && Number.isFinite(b)) out.push({ t: `${a}% daripada ${b.toLocaleString('ms-MY')} = ${(a / 100 * b).toLocaleString('ms-MY', { maximumFractionDigits: 4 })}`, s: 'Kiraan peratus', ic: 'diff', kira: true, salin: String(a / 100 * b) });
    }
    const v = kiraUngkapan(qAsal.replace(/^(kira|hitung)\s*/i, ''));
    if (v !== null) out.push({ t: `= ${v.toLocaleString('ms-MY', { maximumFractionDigits: 6 })}`, s: 'Tekan Enter untuk salin', ic: 'diff', kira: true, salin: String(v) });
    return out;
  }
  const soalanFiqh = q => q.length > 10 && (/\?$/.test(q) || /^(hukum|apakah|adakah|bolehkah|boleh ke|kenapa|mengapa|bagaimana|macam mana|apa itu|halal ke|haram ke|wajib ke)\b/i.test(q));

  /* ---------- Palet arahan ---------- */
  const palet = document.createElement('div');
  palet.className = 'md-palet'; palet.hidden = true;
  palet.setAttribute('role', 'dialog'); palet.setAttribute('aria-modal', 'true'); palet.setAttribute('aria-label', 'Arahan');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  palet.innerHTML = `
    <div class="md-box">
      <div class="md-in">${icon('search')}<input id="mdCari" type="text" placeholder="Taip arahan, soalan atau kiraan" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Arahan" role="combobox" aria-expanded="true" aria-controls="mdHasil" aria-autocomplete="list">
        <button type="button" class="md-mic" aria-label="Arahan suara" aria-pressed="false" title="Arahan suara"${SR ? '' : ' hidden'}>${MIC}</button>
        <button type="button" class="md-tutup" aria-label="Tutup">${icon('x')}</button></div>
      <ul class="md-hasil" id="mdHasil" role="listbox" aria-label="Hasil"></ul>
      <div class="md-kaki" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> pilih</span><span><kbd>Enter</kbd> buka</span><span><kbd>Esc</kbd> tutup</span><span class="md-eg">Cth: "zakat 5000", "12% daripada 350", "hukum forex?"</span></div>
    </div>`;
  document.body.appendChild(palet);
  const inp = $('#mdCari', palet), hasilEl = $('#mdHasil', palet), micBtn = $('.md-mic', palet);
  let hasil = [], pilih = 0, buka = false, kembali = null;

  // Butang di bar atas (sebelum butang Bacakan)
  const bar = $('.topbar-inner'), sayBtn = $('#sayBtn');
  if (bar) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'icon-btn'; b.id = 'arahanBtn';
    b.setAttribute('aria-label', 'Arahan dan carian (Ctrl K)'); b.title = 'Arahan (Ctrl K)';
    b.innerHTML = icon('search');
    bar.insertBefore(b, sayBtn || null);
    b.addEventListener('click', () => bukaPalet());
  }

  function bukaPalet(awal = '') {
    if (buka) return;
    buka = true; kembali = document.activeElement; palet.hidden = false;
    document.documentElement.classList.add('md-buka');
    inp.value = awal; cari(); getar(4);
    requestAnimationFrame(() => inp.focus());
  }
  function tutupPalet() {
    if (!buka) return;
    buka = false; palet.hidden = true; hentiSuara();
    document.documentElement.classList.remove('md-buka');
    if (kembali && kembali.focus) kembali.focus({ preventScroll: true });
  }
  function syorKonteks() {
    const out = [], nx = solatNext(), kl = kelasNext(), kr = kripto();
    if (nx) out.push({ t: `${nx.n} ${fmtJam(nx.ts)}`, s: 'Waktu solat seterusnya', h: '#solat', ic: 'mosque', ctx: true });
    if (kl) out.push({ t: `${kl.live ? 'Sekarang' : kl.DAY3[kl.s.d] + ' ' + fmtMin(kl.s.s)}: ${kl.s.it.course}`, s: kl.s.room ? 'Kelas seterusnya di ' + kl.s.room : 'Kelas seterusnya', h: '#jadual', ic: 'calendar', ctx: true });
    if (kr) out.push({ t: `${kr.s} $${kr.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, s: `${kr.chg >= 0 ? 'Naik' : 'Turun'} ${Math.abs(kr.chg).toFixed(2)}% dalam 24 jam`, h: '#pasaran', ic: 'chart', ctx: true });
    return out;
  }
  function cari() {
    const qAsal = inp.value.trim(), q = norm(qAsal);
    if (!q) {
      const kk = kerap();
      const sering = TUJU.filter(d => d.h && kk[d.h]).sort((a, b) => kk[b.h] - kk[a.h]).slice(0, 4);
      hasil = [...syorKonteks(), ...sering, ...TUJU.filter(d => d.h && !sering.includes(d)).slice(0, 7 - sering.length)];
    } else {
      hasil = [...kiraan(qAsal)];
      if (soalanFiqh(qAsal)) hasil.push({ t: `Tanya AI Fiqh: "${qAsal}"`, s: 'Dijawab dengan muka surat kitab dan fatwa rasmi', h: '#ibadah/fiqh/tanya', ic: 'quote', tanya: qAsal });
      // Kiraan: padankan halaman dengan perkataan sahaja ("zakat 5000" turut mencadangkan Kalkulator Zakat)
      const qKata = hasil.length ? q.replace(/[\d.,%()+\-*/]+/g, ' ').trim() : q;
      if (qKata) hasil.push(...TUJU.map(d => [skor(qKata, d), d]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]));
      if (!hasil.length) hasil.push({ t: `Tanya AI Fiqh: "${qAsal}"`, s: 'Tiada padanan halaman. Tanya AI tentang hukumnya?', h: '#ibadah/fiqh/tanya', ic: 'quote', tanya: qAsal });
    }
    pilih = 0; lukis();
  }
  function lukis() {
    hasilEl.innerHTML = hasil.map((d, i) => `<li role="option" id="md-o${i}" class="${d.ctx ? 'md-ctx' : ''} ${d.kira ? 'md-kira' : ''}" aria-selected="${i === pilih}" data-i="${i}">${icon(d.ic || 'chev')}<span class="md-t">${esc(d.t)}</span><span class="md-s">${esc(d.s || '')}</span>${d.luar ? icon('external', 'ic md-luar') : ''}</li>`).join('');
    inp.setAttribute('aria-activedescendant', hasil.length ? 'md-o' + pilih : '');
  }
  function gerak(d) {
    if (!hasil.length) return;
    pilih = (pilih + d + hasil.length) % hasil.length;
    $$('li', hasilEl).forEach((li, i) => li.setAttribute('aria-selected', i === pilih));
    inp.setAttribute('aria-activedescendant', 'md-o' + pilih);
    const li = $(`#md-o${pilih}`, palet); if (li) li.scrollIntoView({ block: 'nearest' });
  }
  async function laksana(d) {
    if (!d) return;
    getar();
    if (d.salin) { try { await navigator.clipboard.writeText(d.salin); toast('Jawapan disalin'); } catch {} tutupPalet(); return; }
    tutupPalet();
    if (d.act) { await d.act(); }
    if (d.h) {
      const kk = kerap(); kk[d.h] = (kk[d.h] || 0) + 1; store.set('arahanKerap', kk);
      if (d.luar) { location.href = d.h; return; }
      if (location.hash === d.h) { document.dispatchEvent(new CustomEvent('viewchange', { detail: d.h.slice(1).split('/')[0] })); } else location.hash = d.h;
      if (d.tanya) prasoal(d.tanya);
    }
  }
  // Isi soalan ke dalam Tanya AI Fiqh selepas halamannya dilukis (tidak dihantar sendiri)
  function prasoal(q) {
    let cuba = 0;
    const t = setInterval(() => {
      const ta = $('#fqAsk');
      if (ta) { clearInterval(t); ta.value = q.slice(0, 500); ta.focus(); ta.scrollIntoView({ block: 'center', behavior: 'smooth' }); toast('Soalan diisi. Tekan Tanya untuk hantar.'); }
      else if (++cuba > 40) clearInterval(t);
    }, 100);
  }
  inp.addEventListener('input', cari);
  palet.addEventListener('click', e => {
    if (e.target === palet || e.target.closest('.md-tutup')) { tutupPalet(); return; }
    if (e.target.closest('.md-mic')) { toggleSuara(); return; }
    const li = e.target.closest('li[data-i]'); if (li) laksana(hasil[+li.dataset.i]);
  });
  palet.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); tutupPalet(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); gerak(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); gerak(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); laksana(hasil[pilih]); }
    else if (e.key === 'Tab') { e.preventDefault(); gerak(e.shiftKey ? -1 : 1); }
  });
  document.addEventListener('keydown', e => {
    const dalamInput = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName) || (document.activeElement && document.activeElement.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); buka ? tutupPalet() : bukaPalet(); }
    else if (e.key === '/' && !buka && !dalamInput && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); bukaPalet(); }
  });
  window.addEventListener('hashchange', () => { if (buka) tutupPalet(); });

  /* Arahan suara: Web Speech API (Chrome, Edge, Safari). Hasil terbaik dibuka terus. */
  let rec = null, dengar = false;
  function toggleSuara() { dengar ? hentiSuara() : mulaSuara(); }
  function mulaSuara() {
    if (!SR) return;
    try {
      rec = new SR(); rec.lang = 'ms-MY'; rec.interimResults = true; rec.maxAlternatives = 1;
      rec.onresult = ev => {
        let teks = '', akhir = false;
        for (const r of ev.results) { teks += r[0].transcript; if (r.isFinal) akhir = true; }
        inp.value = teks.trim(); cari();
        if (akhir) { hentiSuara(); if (hasil[0] && !hasil[0].ctx) { toast(`Membuka ${hasil[0].t}`); laksana(hasil[0]); } }
      };
      rec.onerror = ev => { hentiSuara(); if (ev.error === 'not-allowed') toast('Kebenaran mikrofon ditolak.'); else if (ev.error !== 'aborted') toast('Suara tidak dikenali. Cuba sebut lebih jelas.'); };
      rec.onend = () => hentiSuara();
      rec.start(); dengar = true; getar(10);
      micBtn.setAttribute('aria-pressed', 'true'); palet.classList.add('md-dengar'); inp.placeholder = 'Sebut, cth. "buka waktu solat"';
    } catch { toast('Arahan suara tidak disokong pelayar ini.'); }
  }
  function hentiSuara() {
    if (rec) { try { rec.onend = null; rec.stop(); } catch {} rec = null; }
    dengar = false; micBtn.setAttribute('aria-pressed', 'false'); palet.classList.remove('md-dengar'); inp.placeholder = 'Taip arahan, soalan atau kiraan';
  }

  /* ---------- Taklimat suara ---------- */
  function ayatTaklimat() {
    const a = [typeof greetText === 'function' ? greetText() : 'Assalamualaikum'];
    const hj = hijriHariIni(); if (hj) a.push(`Hari ini ${hj}.`);
    const nx = solatNext();
    if (nx) { const min = Math.max(0, Math.round((nx.ts - Date.now() / 1000) / 60)); a.push(`Solat seterusnya ${nx.n} pada pukul ${fmtJam(nx.ts)}, ${min >= 60 ? Math.floor(min / 60) + ' jam ' + (min % 60) + ' minit' : min + ' minit'} lagi.`); }
    const kl = kelasNext();
    if (kl) a.push(kl.live ? `Kelas ${kl.s.it.course} sedang berjalan${kl.s.room ? ' di ' + kl.s.room : ''}, ${kl.left} minit lagi.` : `Kelas seterusnya ${kl.s.it.course} pada ${kl.DAY3[kl.s.d]} ${fmtMin(kl.s.s)}${kl.s.room ? ' di ' + kl.s.room : ''}.`);
    const kr = kripto();
    if (kr) a.push(`${kr.s} ${Math.round(kr.price).toLocaleString('ms-MY')} dolar, ${kr.chg >= 0 ? 'naik' : 'turun'} ${Math.abs(kr.chg).toFixed(1)} peratus dalam 24 jam.`);
    a.push('Selamat beramal dan belajar.');
    return a.join(' ');
  }
  function taklimat() {
    if (!window.Suara) { toast('Suara belum sedia.'); return; }
    if (Suara.active) { Suara.stop(); return; }
    Suara.read(ayatTaklimat(), 'ms');
  }

  /* ---------- HUD di atas pentas utama ---------- */
  const stage = window.Sinema && Sinema.stage;
  if (!stage) return;
  const hud = document.createElement('div');
  hud.className = 'md-hud'; hud.setAttribute('aria-label', 'Maklumat hari ini');
  hud.innerHTML = `<span class="md-chip md-hijri" hidden>${icon('calendar')}<span></span></span>
    <a class="md-chip md-solat" href="#solat" hidden>${icon('mosque')}<span></span><b class="num"></b></a>
    <a class="md-chip md-kelas" href="#jadual" hidden>${icon('calendar')}<span></span></a>
    <a class="md-chip md-kripto" href="#pasaran" hidden>${icon('chart')}<span></span><b class="num"></b></a>
    <button type="button" class="md-chip md-taklimat" aria-label="Dengar taklimat hari ini" title="Taklimat suara">${icon('volume')}<span>Taklimat</span></button>`;
  stage.insertBefore(hud, $('.sn-icons', stage));
  hud.addEventListener('click', e => { if (e.target.closest('.md-taklimat')) { getar(); taklimat(); } });
  const tunjuk = (el, ok) => { el.hidden = !ok; };
  function hudTick() {
    if (!stage.isConnected || document.hidden) return;
    const h = $('.md-hijri', hud), hj = hijriHariIni();
    tunjuk(h, !!hj); if (hj) $('span', h).textContent = hj;
    const s = $('.md-solat', hud), nx = solatNext();
    tunjuk(s, !!nx);
    if (nx) {
      const beza = Math.max(0, Math.floor(nx.ts - Date.now() / 1000));
      $('span', s).textContent = `${nx.n} ${fmtJam(nx.ts)}`;
      $('b', s).textContent = beza >= 3600 ? `${Math.floor(beza / 3600)}j ${Math.floor(beza % 3600 / 60)}m` : `${String(Math.floor(beza / 60)).padStart(2, '0')}:${String(beza % 60).padStart(2, '0')}`;
      s.classList.toggle('md-hampir', beza < 900);
    }
    const k = $('.md-kelas', hud), kl = kelasNext();
    tunjuk(k, !!kl);
    if (kl) $('span', k).textContent = kl.live ? `Sekarang: ${kl.s.it.course}${kl.s.room ? ' · ' + kl.s.room : ''}` : `${kl.DAY3[kl.s.d]} ${fmtMin(kl.s.s)} ${kl.s.it.course}`;
    const c = $('.md-kripto', hud), kr = kripto();
    tunjuk(c, !!kr);
    if (kr) { $('span', c).textContent = kr.s; const b = $('b', c); b.textContent = `$${kr.price.toLocaleString('en-US', { maximumFractionDigits: kr.price > 100 ? 0 : 2 })} ${kr.chg >= 0 ? '▲' : '▼'}${Math.abs(kr.chg).toFixed(1)}%`; b.classList.toggle('turun', kr.chg < 0); }
    $('.md-taklimat', hud).classList.toggle('on', !!(window.Suara && Suara.active));
  }
  hudTick(); setInterval(hudTick, 1000);
  document.addEventListener('viewchange', hudTick);

  /* ---------- Konteks: ciri yang paling berguna sekarang ---------- */
  let sentuh = false;
  stage.addEventListener('pointerdown', () => { sentuh = true; }, { once: true, passive: true });
  stage.addEventListener('keydown', () => { sentuh = true; }, { once: true });
  function syor() {
    const nx = solatNext(), kl = kelasNext(), n = jamKL();
    if (nx) { const min = (nx.ts - Date.now() / 1000) / 60; if (min >= 0 && min <= 40) return 'solat'; }
    if (kl && (kl.live || kl.in <= 90)) return 'jadual';
    if (n.h < 7) return 'solat';
    if (n.d <= 5 && n.h >= 9 && n.h < 17) return 'pasaran';
    if (n.h >= 19) return 'ibadah';
    return null;
  }
  function pakaiSyor() {
    const id = syor();
    $$('.sn-ic', stage).forEach(b => b.classList.toggle('md-syor', b.id === 'snt-' + id));
    if (id && !sentuh && Sinema.semasa() !== id) Sinema.pilih(id);
  }
  setTimeout(pakaiSyor, 900); setTimeout(pakaiSyor, 4000); setInterval(pakaiSyor, 5 * 60000);

  /* ---------- Aurora WebGL ---------- */
  const WARNA = {
    pasaran: [[.1, .85, .7], [.1, .4, .95], [.6, .95, .5]], solat: [[.35, .25, .9], [.95, .72, .35], [.7, .3, .9]],
    belajar: [[.98, .6, .25], [.95, .3, .45], [.98, .85, .4]], semak: [[.2, .8, .95], [.35, .4, .98], [.6, .35, .95]],
    fiqh: [[.9, .7, .35], [.55, .35, .2], [.2, .75, .65]], ibadah: [[.55, .3, .95], [.25, .3, .85], [.95, .45, .75]],
    halal: [[.2, .85, .5], [.75, .95, .35], [.15, .7, .7]], jadual: [[.25, .55, .98], [.35, .85, .98], [.5, .95, .8]]
  };
  (function aurora() {
    if (reduce.matches || (navigator.deviceMemory && navigator.deviceMemory < 2)) return;
    const cv = document.createElement('canvas'); cv.className = 'md-aurora'; cv.setAttribute('aria-hidden', 'true');
    const bgEl = $('.sn-bg', stage); stage.insertBefore(cv, bgEl ? bgEl.nextSibling : stage.firstChild);
    const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) { cv.remove(); return; }
    const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    const FS = `precision mediump float;uniform vec2 r;uniform float t;uniform vec2 p;uniform vec3 c1,c2,c3;
      float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 q){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(q);q=q*2.03+vec2(1.7,9.2);a*=.5;}return v;}
      void main(){vec2 uv=gl_FragCoord.xy/r;vec2 q=vec2(uv.x*r.x/r.y,uv.y);
        float n=fbm(q*1.5+vec2(t*.045,-t*.03)+p*.35);
        float m=fbm(q*2.2-vec2(t*.035,t*.02)+n*1.2);
        vec3 col=mix(c1,c2,smoothstep(.25,.8,n));col=mix(col,c3,smoothstep(.45,.95,m)*.85);
        float jalur=smoothstep(.12,.95,n*m*2.4);
        vec2 pusat=vec2(.62+p.x*.25,.55-p.y*.2);float d=distance(vec2(uv.x*r.x/r.y,uv.y),vec2(pusat.x*r.x/r.y,pusat.y));
        float sinar=exp(-d*d*2.2);
        float a=clamp(jalur*.75+sinar*.35,0.,1.)*(1.-smoothstep(.0,.9,uv.y)*.35);
        gl_FragColor=vec4(col*a,a);}`;
    function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) { cv.remove(); return; }
    const pg = gl.createProgram(); gl.attachShader(pg, vs); gl.attachShader(pg, fs); gl.linkProgram(pg);
    if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) { cv.remove(); return; }
    gl.useProgram(pg);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(pg, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const U = Object.fromEntries(['r', 't', 'p', 'c1', 'c2', 'c3'].map(k => [k, gl.getUniformLocation(pg, k)]));
    const cur = WARNA.pasaran.map(c => c.slice());
    let W = 0, H = 0, px = 0, py = 0, tx = 0, ty = 0, jalan = false, nampak = true, t0 = performance.now();
    function saiz() {
      const k = Math.min(devicePixelRatio || 1, 1.5) * .5;
      W = Math.max(1, Math.round(stage.clientWidth * k)); H = Math.max(1, Math.round(stage.clientHeight * k));
      cv.width = W; cv.height = H; gl.viewport(0, 0, W, H);
    }
    saiz(); addEventListener('resize', saiz, { passive: true });
    stage.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const b = stage.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width - .5; ty = (e.clientY - b.top) / b.height - .5; }, { passive: true });
    stage.addEventListener('pointerleave', () => { tx = ty = 0; });
    const home = $('#view-utama');
    function langkah(now) {
      if (!nampak || document.hidden || reduce.matches || !home.classList.contains('active')) { jalan = false; return; }
      const t = (now - t0) / 1000, sasar = WARNA[stage.dataset.ciri] || WARNA.pasaran;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cur[i][j] += (sasar[i][j] - cur[i][j]) * .03;
      px += (tx - px) * .04; py += (ty - py) * .04;
      gl.uniform2f(U.r, W, H); gl.uniform1f(U.t, t); gl.uniform2f(U.p, px, py);
      gl.uniform3fv(U.c1, cur[0]); gl.uniform3fv(U.c2, cur[1]); gl.uniform3fv(U.c3, cur[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(langkah);
    }
    const mula = () => { if (!jalan && !reduce.matches) { jalan = true; requestAnimationFrame(langkah); } };
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { nampak = es[0].isIntersecting; mula(); }).observe(stage);
    document.addEventListener('visibilitychange', mula); document.addEventListener('viewchange', mula);
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); jalan = false; }); cv.addEventListener('webglcontextrestored', mula);
    stage.classList.add('md-ada-aurora'); mula();
  })();

  /* ---------- Kad condong 3D ikut penunjuk (tetikus sahaja) ---------- */
  if (halus.matches && !reduce.matches) {
    const SASAR = 'a.card, .card.shortcut, .tool-card, .sn-btn, .md-chip';
    let aktif = null;
    document.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const el = e.target.closest(SASAR);
      if (aktif && aktif !== el) { aktif.style.removeProperty('--rx'); aktif.style.removeProperty('--ry'); aktif.classList.remove('md-condong'); aktif = null; }
      if (!el) return;
      const b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
      const had = b.width > 420 ? 2.2 : 5;
      el.style.setProperty('--ry', (x * had).toFixed(2) + 'deg'); el.style.setProperty('--rx', (-y * had).toFixed(2) + 'deg');
      el.style.setProperty('--gx', (x * 100 + 50).toFixed(1) + '%'); el.style.setProperty('--gy', (y * 100 + 50).toFixed(1) + '%');
      el.classList.add('md-condong'); aktif = el;
    }, { passive: true });
    document.addEventListener('pointerout', e => { if (aktif && !aktif.contains(e.relatedTarget)) { aktif.style.removeProperty('--rx'); aktif.style.removeProperty('--ry'); aktif.classList.remove('md-condong'); aktif = null; } }, { passive: true });
  }

  /* ---------- Giroskop: condongkan telefon untuk menggerakkan latar pentas ---------- */
  if (!halus.matches && !reduce.matches && 'DeviceOrientationEvent' in window) {
    let asas = null;
    addEventListener('deviceorientation', e => {
      if (e.gamma == null || e.beta == null || !$('#view-utama').classList.contains('active')) return;
      if (asas === null) asas = { g: e.gamma, b: e.beta };
      const x = Math.max(-.5, Math.min(.5, (e.gamma - asas.g) / 40)), y = Math.max(-.5, Math.min(.5, (e.beta - asas.b) / 40));
      Sinema.condong(x, y);
    }, { passive: true });
  }

  window.MasaDepan = { buka: bukaPalet, tutup: tutupPalet, taklimat, syor };
})();
