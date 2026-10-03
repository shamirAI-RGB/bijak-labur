/* Menu titik tiga (tetapan pantas) dan Ruang Soalan */
(() => {
  const btn = $('#menuBtn'), menu = $('#mainMenu');
  const WA = '60102546720';

  /* ---------- Saiz tulisan ---------- */
  const FONT = { sm: '93.75%', md: '', lg: '112.5%' };
  function applyFont(k) {
    document.documentElement.style.fontSize = FONT[k] || '';
    document.documentElement.dataset.font = k;
    store.set('fontScale', k);
  }
  applyFont(store.get('fontScale', 'md'));

  /* ---------- Akaun (diisi oleh modul akaun kemudian) ---------- */
  function paintAccount() {
    const nama = store.get('nama', '');
    $('#kmName').textContent = nama || 'Tetamu';
    $('#kmSub').textContent = nama ? 'Tetamu · data dalam peranti ini' : 'Data disimpan dalam peranti ini';
  }
  // Modul akaun boleh menggantikan kandungan slot ini, cth. Menu.setAccount('<b>Nama</b>...')
  window.Menu = {
    setAccount(html) { const slot = $('[data-account-slot]', menu); if (slot) slot.innerHTML = html; },
    close
  };

  /* ---------- Buka / tutup ---------- */
  function paintState() {
    const th = document.documentElement.dataset.theme || 'auto', fs = store.get('fontScale', 'md');
    $$('[data-km-theme]', menu).forEach(b => b.classList.toggle('active', b.dataset.kmTheme === th));
    $$('[data-km-font]', menu).forEach(b => b.classList.toggle('active', b.dataset.kmFont === fs));
    if (!Native && typeof deferredPrompt !== 'undefined' && deferredPrompt) $('#kmInstall').classList.remove('hidden');
    if ($('[data-account-slot] #kmName', menu)) paintAccount();
  }
  function open() {
    paintState();
    menu.hidden = false; btn.setAttribute('aria-expanded', 'true');
    const first = $('button, a', menu); if (first) first.focus({ preventScroll: true });
  }
  function close(refocus) {
    if (menu.hidden) return;
    menu.hidden = true; btn.setAttribute('aria-expanded', 'false');
    if (refocus) btn.focus();
  }
  btn.addEventListener('click', e => { e.stopPropagation(); menu.hidden ? open() : close(); });
  document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('.kebab')) close(); });
  document.addEventListener('keydown', e => {
    if (menu.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = $$('.km-item:not(.hidden), .seg', menu), i = items.indexOf(document.activeElement);
      e.preventDefault();
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    }
  });
  menu.addEventListener('focusout', e => { if (e.relatedTarget && !menu.contains(e.relatedTarget) && e.relatedTarget !== btn) close(); });
  window.addEventListener('hashchange', () => close());
  window.addEventListener('beforeinstallprompt', () => { if (!Native) $('#kmInstall').classList.remove('hidden'); });

  menu.addEventListener('click', async e => {
    let b;
    if ((b = e.target.closest('[data-km-theme]'))) {
      const v = b.dataset.kmTheme;
      if (v === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v;
      store.set('theme', v === 'auto' ? null : v);
      paintThemeIcon();
      document.dispatchEvent(new CustomEvent('themechange'));
      return paintState();
    }
    if ((b = e.target.closest('[data-km-font]'))) { applyFont(b.dataset.kmFont); return paintState(); }
    if (e.target.closest('#kmInstall')) {
      close();
      const ok = window.installApp && await window.installApp();
      $('#kmInstall').classList.add('hidden');
      if (ok) $('#installCard').classList.add('hidden');
      return;
    }
    if (e.target.closest('#kmShare')) {
      close();
      const data = { title: 'Bijak Labur', text: 'Belajar melabur, harga pasaran masa nyata dan waktu solat seluruh Malaysia.', url: 'https://bijaklabur.my/' };
      try {
        if (navigator.share) await navigator.share(data);
        else { await navigator.clipboard.writeText(data.url); toast('Pautan disalin'); }
      } catch (err) { if (err && err.name !== 'AbortError') toast('Tidak dapat berkongsi. Pautan: bijaklabur.my', 4000); }
      return;
    }
    // Pautan dan butang lain (Suara bacaan, Ruang soalan, dll.) menutup menu selepas ditekan
    if (e.target.closest('.km-item')) close();
  });

  /* ---------- Ruang Soalan ---------- */
  const TOPICS = ['Umum', 'Belajar & pasaran', 'Waktu solat & ibadah', 'Semak kertas kerja', 'Premium & bayaran', 'Laporkan masalah'];
  const FAQ = [
    ['Umum', 'Adakah Bijak Labur percuma?', 'Ya. Pelajaran pelaburan, harga pasaran, waktu solat, ibadah dan penyemak kertas kerja asas adalah percuma. Premium hanya menambah alat lanjutan dan ciri percuma kekal percuma.'],
    ['Umum', 'Perlukah saya daftar akaun?', 'Tidak buat masa ini. Anda boleh guna sebagai tetamu. Tetapan, profil dan rekod disimpan dalam peranti anda sahaja.'],
    ['Umum', 'Bagaimana pasang Bijak Labur seperti app?', 'Di iPhone, buka bijaklabur.my dalam Safari, tekan butang Kongsi, kemudian Add to Home Screen. Di Android, buka dalam Chrome dan tekan Install app, atau guna Pasang app dalam menu ini.'],
    ['Umum', 'Bolehkah saya guna tanpa internet?', 'Halaman utama, pelajaran dan waktu solat yang sudah dimuat turun boleh dibuka tanpa internet. Harga pasaran, audio Al-Quran dan semakan plagiat memerlukan internet.'],
    ['Belajar & pasaran', 'Adakah ini nasihat kewangan?', 'Tidak. Bijak Labur ialah bahan pendidikan. Buat kajian sendiri dan rujuk penasihat berlesen sebelum melabur. Kami tidak bergabung dengan Moomoo atau Futu.'],
    ['Belajar & pasaran', 'Dari mana harga kripto dan saham diambil?', 'Harga kripto masa nyata daripada Binance (CoinGecko sebagai sandaran). Carta saham AS daripada widget TradingView. Saham Bursa Malaysia dibuka di laman luar kerana tidak disediakan oleh widget percuma.'],
    ['Belajar & pasaran', 'Bagaimana tahu saham atau kripto patuh Syariah?', 'Bahagian Belajar dan Fiqh menerangkan kaedah saringan Suruhanjaya Sekuriti dan pandangan ulama, dengan rujukan. Untuk keputusan muktamad, rujuk senarai rasmi SC dan Majlis Penasihat Syariah.'],
    ['Waktu solat & ibadah', 'Dari mana waktu solat diambil?', 'Daripada data rasmi JAKIM melalui api.waktusolat.app, mengikut zon yang anda pilih di halaman Waktu Solat.'],
    ['Waktu solat & ibadah', 'Kenapa notifikasi azan tidak keluar?', 'Benarkan notifikasi apabila diminta. Di iPhone, notifikasi pelayar hanya berfungsi selepas laman dipasang ke Home Screen.'],
    ['Waktu solat & ibadah', 'Kenapa tarikh Hijri berbeza sehari?', 'Kalendar dikira mengikut Umm al-Qura. Malaysia menentukan awal bulan melalui rukyah dan hisab. Laraskan dalam Tetapan ibadah.'],
    ['Semak kertas kerja', 'Setepat mana peratus AI dan plagiarisme?', 'Peratus AI ialah anggaran berdasarkan gaya penulisan, bukan bukti. Plagiarisme disemak terhadap Wikipedia dan pangkalan jurnal terbuka (OpenAlex, Crossref, Semantic Scholar, DOAJ, Europe PMC), bukan pangkalan peribadi Turnitin.'],
    ['Semak kertas kerja', 'Adakah kertas kerja saya dimuat naik ke pelayan?', 'Teks diproses dalam pelayar anda. Hanya potongan ayat pendek dihantar ke enjin carian sumber terbuka untuk mencari padanan.'],
    ['Premium & bayaran', 'Bagaimana cuba Premium percuma?', 'Buka halaman Premium dan mulakan percubaan percuma 3 hari. Dalam app telefon, percubaan dan langganan diuruskan oleh Google Play atau App Store.'],
    ['Premium & bayaran', 'Saya sudah bayar tetapi Premium tidak aktif.', 'Di laman web, buka halaman Premium, tekan "Sudah membayar? Aktifkan Premium pada peranti ini", kemudian masukkan kod bil ToyyibPay dan e-mel semasa membayar. Dalam app, guna akaun Google Play atau App Store yang sama. Jika masih gagal, hantar soalan kepada kami.']
  ];
  const root = $('#view-soalan');
  let rendered = false;

  function faqHtml(q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hit = FAQ.filter(([t, s, a]) => words.every(w => (t + ' ' + s + ' ' + a).toLowerCase().includes(w)));
    if (!hit.length) return `<p class="muted sq-empty">Tiada jawapan untuk "${esc(q)}". Tanya kami terus di bawah.</p>`;
    return TOPICS.filter(t => hit.some(f => f[0] === t)).map(t => `
      <h3 class="grid-title">${esc(t)}</h3>
      <div class="card flush list faq">${hit.filter(f => f[0] === t).map(([, s, a]) => `<details class="doa-cat"${words.length ? ' open' : ''}><summary><span>${esc(s)}</span>${icon('chev-down', 'ic chev')}</summary><p class="faq-a">${esc(a)}</p></details>`).join('')}</div>`).join('');
  }

  function render() {
    rendered = true;
    const draft = store.get('soalanDraf', { nama: '', topik: TOPICS[0], teks: '' });
    root.innerHTML = `
      <div class="page-head">
        <p class="eyebrow">Bantuan</p>
        <h1 id="h-soalan">Ruang soalan</h1>
        <p class="lead">Cari jawapan kepada soalan lazim, atau hantar soalan anda terus kepada pasukan Bijak Labur.</p>
      </div>
      <div class="sq-grid">
        <div>
          <label class="sq-search"><span class="sr-only">Cari soalan</span>${icon('search')}<input type="search" id="sqFind" placeholder="Cari, cth. azan, plagiat, premium" autocomplete="off"></label>
          <div id="sqFaq">${faqHtml('')}</div>
        </div>
        <aside class="card sq-ask">
          <h2>Tanya kami</h2>
          <p class="muted small">Soalan dihantar melalui WhatsApp kepada pengasas. Kami balas secepat mungkin.</p>
          <form id="sqForm">
            <div class="field"><label for="sqNama">Nama (pilihan)</label><input id="sqNama" maxlength="40" autocomplete="name" value="${esc(draft.nama)}"></div>
            <div class="field"><label for="sqTopik">Topik</label><select id="sqTopik">${TOPICS.map(t => `<option ${t === draft.topik ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
            <div class="field"><label for="sqTeks">Soalan anda</label><textarea id="sqTeks" class="short" maxlength="1000" required placeholder="Tulis soalan anda di sini">${esc(draft.teks)}</textarea><p class="muted small sq-count"><span id="sqLen">${draft.teks.length}</span>/1000</p></div>
            <p class="err" id="sqErr" role="alert"></p>
            <button class="btn block" type="submit">${icon('chat')}Hantar melalui WhatsApp</button>
            <button class="btn ghost block sq-copy" type="button" id="sqCopy">${icon('copy')}Salin soalan</button>
          </form>
          <p class="muted small sq-note">Jangan kongsi kata laluan, nombor kad atau maklumat peribadi sensitif dalam soalan.</p>
        </aside>
      </div>`;
  }

  function message() {
    const nama = $('#sqNama').value.trim(), topik = $('#sqTopik').value, teks = $('#sqTeks').value.trim();
    return { teks, msg: `Salam Bijak Labur, saya ${nama || 'pengguna'} ada soalan.\n\nTopik: ${topik}\nSoalan: ${teks}\n\n(Dihantar dari bijaklabur.my)` };
  }
  root.addEventListener('input', e => {
    if (e.target.id === 'sqFind') { $('#sqFaq').innerHTML = faqHtml(e.target.value.trim()); return; }
    if (e.target.id === 'sqTeks') $('#sqLen').textContent = e.target.value.length;
    if (e.target.closest('#sqForm')) store.set('soalanDraf', { nama: $('#sqNama').value, topik: $('#sqTopik').value, teks: $('#sqTeks').value });
  });
  root.addEventListener('change', e => { if (e.target.id === 'sqTopik') store.set('soalanDraf', { nama: $('#sqNama').value, topik: e.target.value, teks: $('#sqTeks').value }); });
  root.addEventListener('submit', e => {
    if (e.target.id !== 'sqForm') return;
    e.preventDefault();
    const { teks, msg } = message();
    if (teks.length < 5) { $('#sqErr').textContent = 'Tulis soalan anda dahulu.'; $('#sqTeks').focus(); return; }
    $('#sqErr').textContent = '';
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    store.set('soalanDraf', { nama: $('#sqNama').value, topik: TOPICS[0], teks: '' });
    $('#sqTeks').value = ''; $('#sqLen').textContent = '0';
    toast('WhatsApp dibuka. Tekan hantar di sana.', 3500);
  });
  root.addEventListener('click', async e => {
    if (!e.target.closest('#sqCopy')) return;
    const { teks, msg } = message();
    if (!teks) { $('#sqErr').textContent = 'Tulis soalan anda dahulu.'; return; }
    try { await navigator.clipboard.writeText(msg); toast('Soalan disalin'); } catch { toast('Tidak dapat menyalin'); }
  });
  document.addEventListener('viewchange', e => { if (e.detail === 'soalan' && !rendered) render(); });
  if ((location.hash || '').slice(1).split('/')[0] === 'soalan' && !rendered) render();
})();
