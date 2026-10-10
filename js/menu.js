/* Menu titik tiga (tetapan pantas) dan Ruang Soalan */
(() => {
  // Menu lungsur "Alat AI" di bar atas: tutup apabila memilih pautan atau klik di luar
  document.addEventListener('click', e => {
    $$('details.nav-more[open]').forEach(d => { if (!d.contains(e.target) || e.target.closest('a')) d.open = false; });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('details.nav-more[open]').forEach(d => { d.open = false; d.querySelector('summary').focus(); }); });
  const btn = $('#menuBtn'), menu = $('#mainMenu');
  const NOTA_API = (store.get('nota_api', '') || 'https://nota.bijaklabur.my').replace(/\/$/, '');
  const EMEL = 'hello@bijaklabur.my';

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
    const A = typeof Akaun !== 'undefined' ? Akaun : null, u = A && A.user, nama = store.get('nama', '');
    const st = A ? A.state : 'off', signedIn = !!u && st === 'active';
    const shown = signedIn ? (u.name || u.email || u.phone) : (nama || 'Tetamu');
    $('#kmName').textContent = shown;
    $('#kmAvatar').innerHTML = signedIn ? esc(shown.trim().charAt(0).toUpperCase()) : icon('user');
    $('#kmAvatar').classList.toggle('on', signedIn);
    $('#kmSub').textContent = signedIn ? (u.name && (u.email || u.phone) ? (u.email || u.phone) : 'Akaun aktif pada peranti ini')
      : u && st !== 'loading' ? 'Lengkapkan langkah akaun anda'
      : st === 'loading' ? 'Memeriksa akaun...'
      : 'Tetamu · log masuk untuk Premium';
    const slot = $('[data-account-slot]', menu);
    slot.setAttribute('aria-label', signedIn ? `Akaun: ${shown}` : 'Log masuk atau daftar akaun');
  }
  document.addEventListener('akaunchange', () => { if ($('[data-account-slot] #kmName', menu)) paintAccount(); });
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
      const items = $$('.km-account, .km-item:not(.hidden), .seg', menu), i = items.indexOf(document.activeElement);
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
      const data = { title: 'SiswaCap', text: 'Belajar melabur, harga pasaran masa nyata dan waktu solat seluruh Malaysia.', url: 'https://siswacap.my/' };
      try {
        if (navigator.share) await navigator.share(data);
        else { await navigator.clipboard.writeText(data.url); toast('Pautan disalin'); }
      } catch (err) { if (err && err.name !== 'AbortError') toast('Tidak dapat berkongsi. Pautan: siswacap.my', 4000); }
      return;
    }
    // Pautan dan butang lain (Suara bacaan, Ruang soalan, dll.) menutup menu selepas ditekan
    if (e.target.closest('.km-item, .km-account')) close();
  });

  /* ---------- Ruang Soalan ---------- */
  const TOPICS = ['Umum', 'Belajar & pasaran', 'Waktu solat & ibadah', 'Semak kertas kerja', 'Premium & bayaran', 'Laporkan masalah'];
  const FAQ = [
    ['Umum', 'Adakah SiswaCap percuma?', 'Ya. Pelajaran pelaburan, harga pasaran, waktu solat, ibadah dan penyemak kertas kerja asas adalah percuma dan kekal percuma. Semakan tugasan dan AI mempunyai had harian percuma; Premium membuang had itu dan menambah amaran harga, portfolio patuh Syariah dan alat lanjutan.'],
    ['Umum', 'Perlukah saya daftar akaun?', 'Tidak buat masa ini. Anda boleh guna sebagai tetamu. Tetapan, profil dan rekod disimpan dalam peranti anda sahaja.'],
    ['Umum', 'Bagaimana pasang SiswaCap seperti app?', 'Di iPhone, buka siswacap.my dalam Safari, tekan butang Kongsi, kemudian Add to Home Screen. Di Android, buka dalam Chrome dan tekan Install app, atau guna Pasang app dalam menu ini.'],
    ['Umum', 'Bolehkah saya guna tanpa internet?', 'Halaman utama, pelajaran dan waktu solat yang sudah dimuat turun boleh dibuka tanpa internet. Harga pasaran, audio Al-Quran dan semakan plagiat memerlukan internet.'],
    ['Belajar & pasaran', 'Adakah ini nasihat kewangan?', 'Tidak. SiswaCap ialah bahan pendidikan. Buat kajian sendiri dan rujuk penasihat berlesen sebelum melabur. Kami tidak bergabung dengan mana-mana broker yang disebut.'],
    ['Belajar & pasaran', 'Dari mana harga kripto dan saham diambil?', 'Harga kripto dan carta saham AS daripada data pasaran awam yang dikemas kini secara masa nyata. Untuk saham Bursa Malaysia, semak kaunter dalam app broker anda.'],
    ['Belajar & pasaran', 'Bagaimana tahu saham atau kripto patuh Syariah?', 'Bahagian Belajar dan Fiqh menerangkan kaedah saringan Suruhanjaya Sekuriti dan pandangan ulama, dengan rujukan. Untuk keputusan muktamad, rujuk senarai rasmi SC dan Majlis Penasihat Syariah.'],
    ['Waktu solat & ibadah', 'Dari mana waktu solat diambil?', 'Daripada data waktu solat rasmi Malaysia, mengikut zon yang anda pilih di halaman Waktu Solat.'],
    ['Waktu solat & ibadah', 'Kenapa notifikasi azan tidak keluar?', 'Benarkan notifikasi apabila diminta. Di iPhone, notifikasi pelayar hanya berfungsi selepas laman dipasang ke Home Screen.'],
    ['Waktu solat & ibadah', 'Kenapa tarikh Hijri berbeza sehari?', 'Kalendar dikira mengikut Umm al-Qura. Malaysia menentukan awal bulan melalui rukyah dan hisab. Laraskan dalam Tetapan ibadah.'],
    ['Semak kertas kerja', 'Setepat mana peratus AI dan plagiarisme?', 'Peratus AI ialah anggaran berdasarkan gaya penulisan, bukan bukti. Plagiarisme disemak terhadap ensiklopedia dalam talian dan pangkalan jurnal akademik terbuka, bukan pangkalan peribadi sistem semakan universiti.'],
    ['Semak kertas kerja', 'Adakah kertas kerja saya dimuat naik ke pelayan?', 'Teks diproses dalam pelayar anda. Hanya potongan ayat pendek dihantar ke enjin carian sumber terbuka untuk mencari padanan.'],
    ['Premium & bayaran', 'Bagaimana cuba Premium percuma?', 'Buka halaman Premium dan mulakan percubaan percuma 1 hari (sekali bagi setiap akaun). Dalam app telefon, percubaan 3 hari dan langganan diuruskan oleh Google Play atau App Store.'],
    ['Premium & bayaran', 'Saya sudah bayar tetapi Premium tidak aktif.', 'Di laman web, buka halaman Premium, tekan "Sudah membayar? Aktifkan Premium pada peranti ini", kemudian masukkan kod bil dan e-mel semasa membayar. Dalam app, guna akaun Google Play atau App Store yang sama. Jika masih gagal, hantar soalan kepada kami.']
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
    const draft = { nama: '', emel: '', topik: TOPICS[0], teks: '', ...store.get('soalanDraf', {}) };
    const orang = window.Hubungi ? Hubungi.ORANG : [];
    root.innerHTML = `
      <div class="page-head">
        <p class="eyebrow">Bantuan</p>
        <h1 id="h-soalan">Ruang soalan</h1>
        <p class="lead">Cari jawapan kepada soalan lazim, atau hantar soalan anda terus kepada pasukan SiswaCap.</p>
      </div>
      <div class="sq-grid">
        <div>
          <label class="sq-search"><span class="sr-only">Cari soalan</span>${icon('search')}<input type="search" id="sqFind" placeholder="Cari, cth. azan, plagiat, premium" autocomplete="off"></label>
          <div id="sqFaq">${faqHtml('')}</div>
        </div>
        <aside class="card sq-ask">
          <h2>Tanya kami</h2>
          <p class="muted small">Soalan anda terus masuk ke e-mel pasukan SiswaCap. Isi e-mel anda supaya kami boleh membalas.</p>
          <form id="sqForm" novalidate>
            <div class="field"><label for="sqNama">Nama (pilihan)</label><input id="sqNama" maxlength="40" autocomplete="name" value="${esc(draft.nama)}"></div>
            <div class="field"><label for="sqEmel">E-mel anda</label><input id="sqEmel" type="email" inputmode="email" maxlength="120" autocomplete="email" placeholder="nama@gmail.com" value="${esc(draft.emel)}"></div>
            <div class="sq-perangkap" aria-hidden="true"><label for="sqLaman">Laman web</label><input id="sqLaman" tabindex="-1" autocomplete="off"></div>
            <div class="field"><label for="sqTopik">Topik</label><select id="sqTopik">${TOPICS.map(t => `<option ${t === draft.topik ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
            <div class="field"><label for="sqTeks">Soalan anda</label><textarea id="sqTeks" class="short" maxlength="1000" required placeholder="Tulis soalan anda di sini">${esc(draft.teks)}</textarea><p class="muted small sq-count"><span id="sqLen">${draft.teks.length}</span>/1000</p></div>
            <p class="err" id="sqErr" role="alert"></p>
            <button class="btn block" type="submit" id="sqHantar">${icon('mail')}<span>Hantar ke e-mel kami</span></button>
            <div class="sq-or"><span>atau WhatsApp</span></div>
            <div class="sq-wa">${orang.map(o => `<button class="btn ghost" type="button" data-sq-wa="${esc(o.no)}">${Hubungi.LOGO}${esc(o.nama)}</button>`).join('')}</div>
            <button class="link-btn sq-copy" type="button" id="sqCopy">${icon('copy')}Salin soalan</button>
          </form>
          <div class="sq-done" id="sqDone" hidden role="status">
            <span class="sq-done-ic">${icon('check')}</span>
            <h3>Soalan diterima</h3>
            <p class="muted small" id="sqDoneTeks"></p>
            <button class="btn ghost" type="button" id="sqLagi">Tanya soalan lain</button>
          </div>
          <p class="muted small sq-note">Jangan kongsi kata laluan, nombor kad atau maklumat peribadi sensitif dalam soalan.</p>
        </aside>
      </div>`;
  }

  const EMEL_RE = /^[^\s@<>()",;:]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$/i;
  function message() {
    const nama = $('#sqNama').value.trim(), emel = $('#sqEmel').value.trim(), topik = $('#sqTopik').value, teks = $('#sqTeks').value.trim();
    return { nama, emel, topik, teks, msg: `Salam SiswaCap, saya ${nama || 'pengguna'} ada soalan.\n\nTopik: ${topik}\nSoalan: ${teks}\n\n(Dihantar dari siswacap.my)` };
  }
  const saveDraft = () => store.set('soalanDraf', { nama: $('#sqNama').value, emel: $('#sqEmel').value, topik: $('#sqTopik').value, teks: $('#sqTeks').value });
  function clearQuestion() {
    store.set('soalanDraf', { nama: $('#sqNama').value, emel: $('#sqEmel').value, topik: TOPICS[0], teks: '' });
    $('#sqTeks').value = ''; $('#sqLen').textContent = '0'; $('#sqTopik').value = TOPICS[0];
  }
  // Soalan mesti ada sebelum dihantar ke mana-mana saluran
  function check(m) {
    if (m.teks.length < 5) { $('#sqErr').textContent = 'Tulis soalan anda dahulu.'; $('#sqTeks').focus(); return false; }
    $('#sqErr').textContent = '';
    return true;
  }
  // Jika pelayan tidak dapat dihubungi, tawarkan aplikasi e-mel pengguna sebagai jalan lain
  function fallback(m, why) {
    const href = `mailto:${EMEL}?subject=${encodeURIComponent('[SiswaCap] ' + m.topik)}&body=${encodeURIComponent(m.msg)}`;
    $('#sqErr').innerHTML = `${esc(why)} <a href="${esc(href)}">Hantar melalui aplikasi e-mel</a> ke ${EMEL}, atau pilih WhatsApp di bawah.`;
  }
  root.addEventListener('input', e => {
    if (e.target.id === 'sqFind') { $('#sqFaq').innerHTML = faqHtml(e.target.value.trim()); return; }
    if (e.target.id === 'sqTeks') $('#sqLen').textContent = e.target.value.length;
    if (e.target.closest('#sqForm') && e.target.id !== 'sqLaman') saveDraft();
  });
  root.addEventListener('change', e => { if (e.target.id === 'sqTopik') saveDraft(); });
  root.addEventListener('submit', async e => {
    if (e.target.id !== 'sqForm') return;
    e.preventDefault();
    const m = message(), b = $('#sqHantar');
    if (!check(m) || b.disabled) return;
    if (!m.emel) { $('#sqErr').textContent = 'Isi e-mel anda supaya kami boleh membalas. Jika tidak mahu, pilih WhatsApp di bawah.'; $('#sqEmel').focus(); return; }
    if (!EMEL_RE.test(m.emel)) { $('#sqErr').textContent = 'Semak semula alamat e-mel anda.'; $('#sqEmel').focus(); return; }
    b.disabled = true; b.lastElementChild.textContent = 'Menghantar...';
    try {
      const r = await fetch(NOTA_API + '/tanya', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: m.nama, emel: m.emel, topik: m.topik, teks: m.teks, sumber: Native ? 'app' : 'web', laman: $('#sqLaman').value })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 400 || r.status === 429) $('#sqErr').textContent = j.error || 'Soalan tidak dapat dihantar.';
        else fallback(m, 'Soalan tidak dapat dihantar sekarang.');
        return;
      }
      clearQuestion();
      $('#sqDoneTeks').textContent = `Terima kasih${m.nama ? ', ' + m.nama : ''}. Kami akan membalas ke ${m.emel}. Semak juga folder Spam atau Promosi.`;
      $('#sqForm').hidden = true; $('#sqDone').hidden = false; $('#sqLagi').focus();
    } catch {
      fallback(m, 'Tiada sambungan internet atau pelayan tidak dapat dihubungi.');
    } finally {
      b.disabled = false; b.lastElementChild.textContent = 'Hantar ke e-mel kami';
    }
  });
  root.addEventListener('click', async e => {
    let b;
    if ((b = e.target.closest('[data-sq-wa]'))) {
      const m = message();
      if (!check(m)) return;
      window.open(Hubungi.waUrl(b.dataset.sqWa, m.msg), '_blank', 'noopener');
      clearQuestion();
      toast('WhatsApp dibuka. Tekan hantar di sana.', 3500);
      return;
    }
    if (e.target.closest('#sqLagi')) { $('#sqDone').hidden = true; $('#sqForm').hidden = false; $('#sqTeks').focus(); return; }
    if (!e.target.closest('#sqCopy')) return;
    const { teks, msg } = message();
    if (!teks) { $('#sqErr').textContent = 'Tulis soalan anda dahulu.'; return; }
    try { await navigator.clipboard.writeText(msg); toast('Soalan disalin'); } catch { toast('Tidak dapat menyalin'); }
  });
  document.addEventListener('viewchange', e => { if (e.detail === 'soalan' && !rendered) render(); });
  if ((location.hash || '').slice(1).split('/')[0] === 'soalan' && !rendered) render();
})();
