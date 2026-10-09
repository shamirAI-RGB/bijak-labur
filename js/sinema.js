/* Rupa sinema: pentas ciri di atas halaman utama. Barisan ikon di atas; setiap ikon menukar latar
   penuh (lukisan sendiri dalam images/jelajah), tajuk besar, penerangan, alamat dan panduan bertab.
   Tiada h2, .card atau .page-head di sini supaya kunci teks Mod Pemilik tidak beralih. */
(function () {
  const home = $('#view-utama');
  if (!home) return;
  const CIRI = [
    { id: 'pasaran', ic: 'chart', jenis: 'Pasaran langsung', tajuk: 'Pasaran', href: '#pasaran',
      desc: 'Harga kripto dan saham bergerak secara langsung, dengan carta lilin, buku pesanan dan saringan Syariah.',
      tab: [['Apa ia', 'Harga kripto dikemas kini setiap saat, dan saham AS setiap minit. Setiap kripto ditanda status Syariahnya.'],
            ['Cara guna', 'Pilih Kripto atau Saham, tekan satu simbol untuk buka carta, kemudian tukar tempoh carta di atasnya.'],
            ['Petua', 'Harga di sini untuk belajar membaca pasaran. Semak semula dalam app broker sebelum membuat pesanan.']] },
    { id: 'solat', ic: 'mosque', jenis: 'Seluruh Malaysia', tajuk: 'Waktu Solat', href: '#solat',
      desc: 'Waktu solat rasmi JAKIM untuk setiap zon, kiraan detik ke waktu seterusnya, azan dan arah kiblat.',
      tab: [['Apa ia', 'Waktu solat ikut zon JAKIM, boleh dikesan secara automatik melalui lokasi atau dipilih sendiri.'],
            ['Cara guna', 'Pilih zon sekali sahaja. Hidupkan azan dan peringatan jika mahu notifikasi setiap waktu.'],
            ['Petua', 'Waktu boleh dibaca luar talian kerana jadual sebulan disimpan dalam peranti.']] },
    { id: 'belajar', ic: 'cap', jenis: 'Modul berperingkat', tajuk: 'Belajar Melabur', href: '#belajar',
      desc: 'Belajar saham menggunakan Moomoo, asas kripto, analisis fundamental dan teknikal, langkah demi langkah.',
      tab: [['Apa ia', 'Modul dari tahap asas hingga mahir, dengan rajah, kuiz dan contoh sebenar dari Bursa dan pasaran AS.'],
            ['Cara guna', 'Mula dari modul pertama. Kemajuan anda disimpan dan cincin di halaman utama menunjukkan peratusnya.'],
            ['Petua', 'Ini pendidikan, bukan nasihat pelaburan. Cuba dengan jumlah kecil dahulu.']] },
    { id: 'semak', ic: 'file', jenis: 'Untuk pelajar', tajuk: 'Semak Kertas', href: '#semak',
      desc: 'Anggaran peratus tulisan AI dan plagiat, dengan cadangan pembetulan yang ditanda terus pada teks.',
      tab: [['Apa ia', 'Penyemak membandingkan tulisan anda dengan Wikipedia dan pangkalan jurnal terbuka, dan menilai gaya tulisan AI.'],
            ['Cara guna', 'Tampal teks atau muat naik fail, tekan Semak, kemudian buka setiap tanda untuk melihat cadangan.'],
            ['Petua', 'Peratus ialah anggaran. Gunakan untuk membaiki tulisan, bukan sebagai keputusan rasmi.']] },
    { id: 'fiqh', ic: 'book', jenis: 'Rujukan kitab', tajuk: 'Tanya AI Fiqh', href: '#ibadah/fiqh',
      desc: 'Soalan fiqh muamalat dan ibadah dijawab dengan petikan muka surat kitab dan fatwa rasmi.',
      tab: [['Apa ia', 'Jawapan disertakan sumber: gambar muka surat kitab cetakan, resolusi Syariah dan fatwa yang boleh disemak.'],
            ['Cara guna', 'Taip soalan dalam bahasa biasa. Tekan sumber di bawah jawapan untuk melihat muka surat asal.'],
            ['Petua', 'Untuk keputusan peribadi yang penting, rujuk juga mufti atau guru yang dipercayai.']] },
    { id: 'ibadah', ic: 'moon-star', jenis: 'Harian', tajuk: 'Ibadah', href: '#ibadah',
      desc: 'Al-Quran, doa, zikir, tasbih, kiblat, kalendar Hijri dan rekod ibadah dalam satu tempat.',
      tab: [['Apa ia', 'Lima belas alat ibadah harian, termasuk bacaan Al-Quran dengan suara dan rekod solat.'],
            ['Cara guna', 'Buka Ibadah dan pilih alat. Kegemaran anda boleh dibuka terus dari halaman utama.'],
            ['Petua', 'Tetapkan nama panggilan dalam Profil supaya ucapan di halaman utama lebih mesra.']] },
    { id: 'halal', ic: 'shield', jenis: 'Pengurusan Industri Halal', tajuk: 'Audit Halal', href: '#halal',
      desc: 'Senarai semak audit halal mengikut skim pensijilan, log ketakakuran dan muat turun Excel atau PDF.',
      tab: [['Apa ia', 'Senarai semak untuk sembilan skim pensijilan halal Malaysia, dengan rujukan setiap perkara.'],
            ['Cara guna', 'Pilih skim, tanda setiap perkara, catat ketakakuran, kemudian muat turun laporan.'],
            ['Petua', 'Data disimpan dalam peranti anda sahaja. Muat turun salinan sebelum menukar telefon.']] },
    { id: 'jadual', ic: 'calendar', jenis: 'UiTM', tajuk: 'Jadual Kelas', href: '#jadual',
      desc: 'Jadual kelas UiTM anda dalam paparan hari dan minggu, siap dengan wallpaper skrin kunci.',
      tab: [['Apa ia', 'Jadual kelas dibaca dari sistem UiTM dan dipaparkan dengan kemas, berserta waktu solat.'],
            ['Cara guna', 'Masukkan kod kursus dan kumpulan, kemudian simpan. Tekan Skrin kunci untuk menjana wallpaper.'],
            ['Petua', 'Jadual boleh dibuka luar talian selepas disimpan sekali.']] }
  ];

  const stage = document.createElement('div');
  stage.className = 'sn-stage';
  stage.setAttribute('aria-label', 'Ciri utama');
  stage.setAttribute('role', 'region');
  stage.innerHTML = `
    <div class="sn-bg" aria-hidden="true"><div class="sn-layer"></div><div class="sn-layer"></div></div>
    <div class="sn-glyph" aria-hidden="true"></div>
    <canvas class="sn-zarah" aria-hidden="true"></canvas>
    <div class="sn-icons" role="tablist" aria-label="Pilih ciri"><div class="sn-track">
      ${CIRI.map((c, i) => `<button type="button" role="tab" class="sn-ic" id="snt-${c.id}" aria-controls="sn-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" title="${esc(c.tajuk)}"><span class="sn-tile">${icon(c.ic)}</span><span class="sn-lbl">${esc(c.tajuk)}</span></button>`).join('')}
    </div></div>
    <div class="sn-body" id="sn-panel" role="tabpanel" aria-live="polite">
      <div class="sn-chips"><span class="sn-chip sn-chip-on" data-sn="jenis"></span><span class="sn-chip">Percuma</span></div>
      <p class="sn-title" data-sn="tajuk"></p>
      <p class="sn-desc" data-sn="desc"></p>
      <div class="sn-cmd"><span class="sn-prompt" aria-hidden="true">›</span><code data-sn="url"></code><button type="button" class="sn-copy" aria-label="Salin pautan">${icon('copy')}</button></div>
      <div class="sn-acts">
        <a class="sn-btn sn-btn-main" data-sn="href" href="#">${icon('play')}<span>Buka</span></a>
        <button type="button" class="sn-btn" data-sn-guide>${icon('book')}<span>Lihat panduan</span></button>
      </div>
    </div>
    <div class="sn-keys" aria-hidden="true"><span><kbd>←</kbd><kbd>→</kbd> Tukar</span><span><kbd>Enter</kbd> Buka</span></div>
    <div class="sn-guide" hidden role="dialog" aria-modal="true" aria-labelledby="sn-g-t">
      <div class="sn-g-inner">
        <button type="button" class="sn-back" data-sn-close>${icon('x')}<span>Tutup</span></button>
        <div class="sn-g-head"><span class="sn-g-ic" aria-hidden="true"></span><div><span class="sn-chip sn-chip-on" data-sn="jenis"></span><p class="sn-title" id="sn-g-t" data-sn="tajuk"></p><p class="sn-desc" data-sn="desc"></p></div></div>
        <div class="sn-tabs" role="tablist" aria-label="Panduan"></div>
        <p class="sn-g-body" role="tabpanel"></p>
      </div>
    </div>`;
  home.insertBefore(stage, home.firstChild);

  const layers = $$('.sn-layer', stage), btns = $$('.sn-ic', stage), guide = $('.sn-guide', stage);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let cur = -1, top = 0, tab = 0;
  const url = c => location.host ? location.host + location.pathname.replace(/index\.html$/, '') + c.href : 'bijaklabur.my/' + c.href;

  function fill(c) {
    $$('[data-sn="jenis"]', stage).forEach(e => { e.textContent = c.jenis; });
    $$('[data-sn="tajuk"]', stage).forEach(e => { e.textContent = c.tajuk; });
    $$('[data-sn="desc"]', stage).forEach(e => { e.textContent = c.desc; });
    $('[data-sn="url"]', stage).textContent = url(c);
    $('[data-sn="href"]', stage).setAttribute('href', c.href);
    $('.sn-glyph', stage).innerHTML = icon(c.ic);
    $('.sn-g-ic', stage).innerHTML = icon(c.ic);
  }
  function show(i, focus) {
    i = (i + CIRI.length) % CIRI.length;
    if (i === cur) return;
    cur = i; const c = CIRI[i];
    // Dua lapisan latar bergilir supaya gambar lama pudar perlahan ke gambar baharu
    top = 1 - top;
    layers[top].style.backgroundImage = `url("images/jelajah/${c.id}.svg")`;
    layers[top].classList.add('on'); layers[1 - top].classList.remove('on');
    stage.dataset.ciri = c.id;
    btns.forEach((b, k) => { const on = k === i; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    if (focus) btns[i].focus({ preventScroll: true });
    geser();
    const body = $('.sn-body', stage);
    body.classList.remove('masuk'); void body.offsetWidth; body.classList.add('masuk');
    fill(c); tab = 0; paintTabs();
  }
  // Seperti menu konsol: barisan meluncur supaya ikon terpilih sentiasa di hujung kiri
  const track = $('.sn-track', stage);
  const ukur = () => btns.forEach(b => b.style.setProperty('--lbl', $('.sn-lbl', b).offsetWidth + 'px'));
  function geser() {
    const b = btns[cur]; if (!b) return;
    // Kira kedudukan sasaran sendiri: offsetLeft masih membaca margin yang sedang beranimasi
    const w = b.offsetWidth, gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const lebar = btns.length * (w + gap) + (parseFloat(b.style.getPropertyValue('--lbl')) || 0) + 34;
    const max = Math.max(0, lebar - track.parentElement.clientWidth + 8);
    track.style.transform = `translate3d(${-Math.min(cur * (w + gap), max)}px,0,0)`;
  }
  addEventListener('resize', geser, { passive: true });
  if (document.fonts) document.fonts.ready.then(() => { ukur(); geser(); });

  function paintTabs() {
    const c = CIRI[cur];
    $('.sn-tabs', stage).innerHTML = c.tab.map((t, k) => `<button type="button" role="tab" class="sn-tab" aria-selected="${k === tab}" data-sn-tab="${k}">${esc(t[0])}</button>`).join('');
    $('.sn-g-body', stage).textContent = c.tab[tab][1];
  }

  stage.addEventListener('click', e => {
    const b = e.target.closest('.sn-ic');
    if (b) { show(btns.indexOf(b)); return; }
    if (e.target.closest('.sn-copy')) {
      const t = 'https://' + url(CIRI[cur]);
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Pautan disalin'), () => toast(t));
      return;
    }
    if (e.target.closest('[data-sn-guide]')) { guide.hidden = false; stage.classList.add('panduan'); $('.sn-back', guide).focus(); return; }
    if (e.target.closest('[data-sn-close]')) { tutup(); return; }
    const t = e.target.closest('[data-sn-tab]');
    if (t) { tab = +t.dataset.snTab; paintTabs(); $(`[data-sn-tab="${tab}"]`, stage).focus(); }
  });
  function tutup() { guide.hidden = true; stage.classList.remove('panduan'); $('[data-sn-guide]', stage).focus(); }
  stage.addEventListener('keydown', e => {
    if (!guide.hidden) { if (e.key === 'Escape') tutup(); return; }
    if (!e.target.closest('.sn-icons')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1, true); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1, true); }
    else if (e.key === 'Home') { e.preventDefault(); show(0, true); }
    else if (e.key === 'End') { e.preventDefault(); show(CIRI.length - 1, true); }
    else if (e.key === 'Enter' && e.target.closest('.sn-ic')) { e.preventDefault(); location.hash = CIRI[cur].href; }
  });
  // Leret kiri atau kanan pada telefon
  let x0 = null, y0 = 0;
  stage.addEventListener('touchstart', e => { if (!guide.hidden) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // Muat semua latar sekali di belakang tabir supaya pertukaran tidak berkelip
  const pra = () => CIRI.forEach(c => { const im = new Image(); im.src = `images/jelajah/${c.id}.svg`; });
  'requestIdleCallback' in window ? requestIdleCallback(pra) : setTimeout(pra, 1500);
  if (reduce.matches) stage.classList.add('tenang');
  ukur(); show(0);

  // Latar bergerak perlahan ikut tetikus (paralaks) dan hanyut sendiri pada telefon
  const bg = $('.sn-bg', stage), glyph = $('.sn-glyph', stage);
  let tx = 0, ty = 0, px = 0, py = 0, nampak = true, jalan = false, t0 = performance.now();
  stage.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - .5); ty = ((e.clientY - r.top) / r.height - .5);
  }, { passive: true });
  stage.addEventListener('pointerleave', () => { tx = ty = 0; });

  // Zarah cahaya terapung, dilukis dalam kanvas (berhenti apabila pentas tidak kelihatan)
  const cv = $('.sn-zarah', stage), cx = cv.getContext('2d');
  let Z = [], W = 0, H = 0, dpr = 1;
  function saiz() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = stage.clientWidth; H = stage.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(46, W / 28));
    Z = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: .6 + Math.random() * 1.8, v: .08 + Math.random() * .28, a: .15 + Math.random() * .45, f: Math.random() * 6.28 }));
  }
  saiz(); addEventListener('resize', saiz, { passive: true });
  const mula = () => { if (!jalan && !reduce.matches) { jalan = true; requestAnimationFrame(langkah); } };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { nampak = es[0].isIntersecting; mula(); }).observe(stage);
  document.addEventListener('visibilitychange', mula);
  document.addEventListener('viewchange', mula);
  function langkah(now) {
    if (!nampak || document.hidden || reduce.matches || !home.classList.contains('active')) { jalan = false; return; }
    const t = (now - t0) / 1000;
    const hx = tx || Math.sin(t / 7) * .25, hy = ty || Math.cos(t / 9) * .18;
    px += (hx - px) * .05; py += (hy - py) * .05;
    bg.style.transform = `translate3d(${(-px * 22).toFixed(2)}px,${(-py * 16).toFixed(2)}px,0) scale(1.06)`;
    glyph.style.transform = `translate3d(${(px * 34).toFixed(2)}px,${(py * 26).toFixed(2)}px,0)`;
    cx.clearRect(0, 0, W, H);
    for (const z of Z) {
      z.y -= z.v; z.x += Math.sin(t + z.f) * .15 - px * .2;
      if (z.y < -6) { z.y = H + 6; z.x = Math.random() * W; }
      cx.globalAlpha = z.a * (.6 + .4 * Math.sin(t * 1.3 + z.f));
      cx.beginPath(); cx.arc(z.x, z.y, z.r, 0, 6.283); cx.fillStyle = '#fff'; cx.fill();
    }
    requestAnimationFrame(langkah);
  }
  mula();
})();
