/* SiswaCap: Komuniti. Peta rakan (lokasi untuk rakan sahaja), sembang, acara dan memo kampus, servis pelajar
   (tawaran dan permintaan dengan harga RM dan gambar), notifikasi dalam app dan tetapan privasi.
   Perlu log masuk akaun. Data disimpan di pelayan SiswaCap (worker/src/komuniti.js).
   Lokasi dimatikan secara lalai, hanya dihantar semasa halaman Peta dibuka, dan tiada mod awam. */
(function () {
  const root = $('#view-komuniti');
  if (!root) return;
  const API = (store.get('akaun_api', '') || 'https://bijak-labur-premium.khanz-amir.workers.dev').replace(/\/$/, '') + '/komuniti';

  const UNI = ['UiTM', 'UM', 'UKM', 'UPM', 'USM', 'UTM', 'UIAM', 'UUM', 'UNIMAS', 'UMS', 'UPSI', 'UTHM', 'UTeM', 'UMPSA', 'UniMAP', 'UMT', 'UniSZA', 'UMK', 'USIM', 'UPNM', 'Politeknik', 'Kolej', 'Lain'];
  const UNI_NAMA = { Lain: 'Lain-lain' };
  const KAT = {
    tuisyen: ['📚', 'Tuisyen'], reka: ['🎨', 'Reka bentuk'], tulis: ['✍️', 'Penulisan'], teknologi: ['💻', 'Teknologi'], foto: ['📷', 'Foto & video'],
    hantar: ['🛵', 'Penghantaran'], jual: ['🛍️', 'Jual beli'], gaya: ['💇', 'Gaya & kecantikan'], makanan: ['🍱', 'Makanan'], lain: ['✨', 'Lain-lain']
  };
  const WARNA = ['#0E7C66', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#CA8A04', '#0891B2', '#475569'];
  const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  // Pusat lalai peta: UiTM Shah Alam (dari pautan Google Maps Shamir)
  const PUSAT = [3.0716068, 101.4902525];

  let S = { tab: store.get('km_tab', 'peta'), me: null, belum: 0, peta: null, list: null, busy: false, err: '',
    acara: { jenis: 'semua', uni: '' }, servis: { mod: 'layari', jenis: 'tawar', kategori: '', q: '' } };
  let shown = false, pollT = null, geoT = null, lastSent = null, peta = null, penanda = [], fitted = false, memuatPeta = false;

  /* ---------- Pembantu ---------- */
  const inisial = s => String(s || '?').trim().split(/\s+/).slice(0, 2).map(w => [...w][0] || '').join('').toUpperCase() || '?';
  const avatar = (p, cls = '') => `<span class="km-av ${cls}" style="--c:${esc(WARNA.includes(p.warna) ? p.warna : WARNA[0])}" aria-hidden="true">${esc(inisial(p.nama))}</span>`;
  const lalu = t => { const s = Math.max(0, Date.now() / 1000 - t); return s < 60 ? 'baru sahaja' : s < 3600 ? `${Math.floor(s / 60)} min lalu` : s < 86400 ? `${Math.floor(s / 3600)} jam lalu` : `${Math.floor(s / 86400)} hari lalu`; };
  const rm = sen => sen == null ? 'Harga runding' : sen === 0 ? 'Percuma' : 'RM' + (sen / 100).toLocaleString('ms-MY', { minimumFractionDigits: sen % 100 ? 2 : 0, maximumFractionDigits: 2 });
  const uniNama = u => UNI_NAMA[u] || u;
  const uniOpts = (sel, semua) => (semua ? `<option value="">${esc(semua)}</option>` : '') + UNI.map(u => `<option value="${u}" ${u === sel ? 'selected' : ''}>${esc(uniNama(u))}</option>`).join('');
  const AK = () => typeof Akaun !== 'undefined' ? Akaun : null;   // const global, bukan window.Akaun
  const login = () => AK() && AK().enabled && AK().user;
  const owner = () => !!store.get('nota_key', '');

  async function api(op, data = {}, retry = true) {
    const token = await Akaun.token(!retry);
    const r = await fetch(API + '/' + op, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(data) });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && retry) return api(op, data, false);
    if (!r.ok) throw Object.assign(new Error(d.error || 'Komuniti tidak tersedia buat masa ini.'), { status: r.status });
    return d;
  }
  async function adminApi(op, data = {}) {
    const r = await fetch(API + '/' + op, { method: 'POST', headers: { 'content-type': 'application/json', 'x-kunci-pemilik': store.get('nota_key', '') }, body: JSON.stringify(data) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Ralat pelayan.');
    return d;
  }
  const errMsg = e => e && e.message && !/fetch|network|load failed/i.test(e.message) ? e.message : 'Tiada sambungan internet. Cuba lagi.';

  function dialog(html, cls = '') {
    const d = document.createElement('dialog');
    d.className = 'km-dialog ' + cls;
    d.innerHTML = `<button class="icon-btn plain km-x" type="button" data-close aria-label="Tutup">${icon('x')}</button>${html}`;
    document.body.appendChild(d);
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', () => { d.dispatchEvent(new Event('tutup')); d.remove(); });
    d.showModal();
    return d;
  }

  /* ---------- Rangka halaman ---------- */
  function shell() {
    root.innerHTML = `<div class="page-head km-head"><div><p class="eyebrow">Kampus</p><h1 id="h-komuniti">Komuniti</h1>
        <p class="lead">Rakan, acara kampus dan servis pelajar dalam satu tempat.</p></div>
        <div class="km-acts">
          ${owner() ? `<button class="icon-btn" type="button" data-act="moderasi" aria-label="Moderasi" title="Moderasi">${icon('shield')}</button>` : ''}
          <button class="icon-btn" type="button" data-act="inbox" aria-label="Sembang" title="Sembang">${icon('chat')}</button>
          <button class="icon-btn km-bell" type="button" data-act="notif" aria-label="Notifikasi" title="Notifikasi">${icon('bell')}<span class="km-badge hidden" id="kmBadge"></span></button>
          <button class="icon-btn" type="button" data-act="tetapan" aria-label="Tetapan Komuniti" title="Tetapan Komuniti">${icon('sliders')}</button>
        </div></div>
      <div class="km-tabs" role="tablist" aria-label="Bahagian Komuniti">
        ${[['peta', 'pin', 'Peta'], ['acara', 'calendar', 'Acara'], ['servis', 'grid', 'Servis']].map(([k, ic, n]) => `<button type="button" role="tab" class="km-tab ${S.tab === k ? 'on' : ''}" aria-selected="${S.tab === k}" data-tab="${k}">${icon(ic)}<span>${n}</span></button>`).join('')}
      </div>
      <div id="kmBody"></div>
      <button class="km-fab hidden" type="button" id="kmFab" data-act="baru" aria-label="Hantaran baharu">${icon('plus')}</button>`;
  }

  function gate() {
    const off = !(AK() && AK().enabled);
    root.innerHTML = `<div class="page-head"><p class="eyebrow">Kampus</p><h1 id="h-komuniti">Komuniti</h1>
        <p class="lead">Rakan, acara kampus dan servis pelajar dalam satu tempat.</p></div>
      <div class="km-hero card">
        <div class="km-hero-art" aria-hidden="true"><span class="km-av" style="--c:#0E7C66">AM</span><span class="km-av" style="--c:#7C3AED">SN</span><span class="km-av" style="--c:#EA580C">FZ</span><span class="km-av" style="--c:#2563EB">HK</span></div>
        <h2>Sertai komuniti pelajar</h2>
        <div class="km-feat">
          <div>${icon('pin')}<b>Peta rakan</b><span>Lihat rakan berdekatan. Lokasi hanya untuk rakan yang anda pilih.</span></div>
          <div>${icon('calendar')}<b>Acara dan memo</b><span>Program, kelab dan makluman mengikut universiti anda.</span></div>
          <div>${icon('grid')}<b>Servis pelajar</b><span>Tawar atau cari tuisyen, reka bentuk, penghantaran dan banyak lagi.</span></div>
          <div>${icon('chat')}<b>Sembang</b><span>Berbual dengan rakan dan pihak servis secara terus.</span></div>
        </div>
        ${off ? '<p class="muted">Log masuk akaun belum dibuka.</p>' : `<button class="btn" type="button" data-act="login">${icon('user')}Log masuk untuk mula</button>`}
        ${jemputan() ? `<p class="km-invite">${icon('user')}Anda dijemput sebagai rakan. Log masuk dahulu, kemudian permintaan rakan akan dihantar.</p>` : ''}
        <p class="muted small">Percuma. Lokasi dimatikan sehingga anda menghidupkannya.</p>
      </div>`;
  }

  /* ---------- Pautan jemputan: #komuniti/kod/ABC234 ---------- */
  const KOD_RE = /^[A-Z2-9]{6}$/;
  const jemputan = () => { const k = store.get('km_jemput', ''); return KOD_RE.test(k) ? k : ''; };
  function bacaJemputan() {
    const [, a, b] = location.hash.slice(1).split('/');
    const kod = String(b || '').toUpperCase();
    if (a === 'kod' && KOD_RE.test(kod)) store.set('km_jemput', kod);
    // Buang kod daripada alamat supaya tidak diproses semula apabila dimuat semula
    if (a === 'kod') history.replaceState(null, '', location.pathname + location.search + '#komuniti');
  }
  async function prosesJemputan() {
    const kod = jemputan();
    if (!kod || !S.me) return;
    store.set('km_jemput', '');
    if (kod === S.me.kod) return;
    if (!confirm(`Hantar permintaan rakan kepada pemilik kod ${kod}?`)) return;
    try { const r = await api('tambah', { kod }); toast(r.status === 'rakan' ? `Kini anda berkawan dengan ${r.nama}.` : `Permintaan dihantar kepada ${r.nama}.`); S.tab = 'peta'; render(); }
    catch (er) { toast(errMsg(er)); }
  }

  async function start() {
    stopTimers();
    if (!login()) { gate(); return; }
    shell();
    body('<div class="km-skel" aria-busy="true"><i></i><i></i><i></i></div>');
    try {
      const d = await api('saya');
      S.me = d.profil; badge(d.belum);
      if (!S.acara.uni) S.acara.uni = S.me.uni;
      render();
      prosesJemputan();
    } catch (e) { body(`<div class="card km-empty"><p>${esc(errMsg(e))}</p><button class="btn ghost" type="button" data-act="ulang">${icon('refresh')}Cuba lagi</button></div>`); }
  }

  const body = html => { const b = $('#kmBody', root); if (b) b.innerHTML = html; };
  function badge(n) {
    S.belum = n;
    const b = $('#kmBadge'); if (!b) return;
    b.textContent = n > 9 ? '9+' : String(n); b.classList.toggle('hidden', !n);
  }

  function render() {
    if (!S.me) return;
    $$('.km-tab', root).forEach(t => { const on = t.dataset.tab === S.tab; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); });
    $('#kmFab', root).classList.toggle('hidden', S.tab === 'peta');
    if (S.tab === 'peta') return renderPeta();
    stopGeo();
    if (S.tab === 'acara') return renderAcara();
    renderServis();
  }

  /* ---------- PETA ---------- */
  function renderPeta() { body(petaHtml()); ensureMap(); loadPeta(); startGeo(); }
  // Lukis semula senarai tanpa memulakan semula peta (elemen peta yang sama dipindahkan semula)
  function repaintPeta() {
    const old = peta ? peta.map.getContainer() : null;
    body(petaHtml());
    const slot = $('#kmMap', root);
    if (old && slot) { slot.replaceWith(old); peta.resize(); paintMarkers(); } else ensureMap();
  }
  function petaHtml() {
    const p = S.peta, me = S.me;
    const priv = { rakan: 'Semua rakan', pilihan: 'Rakan pilihan', tutup: 'Mati' }[me.privasi];
    return `<div class="km-mapcard">
        <div class="km-map" id="kmMap"></div>
        <div class="km-map-top">
          <span class="km-mechip">${avatar(me, 'sm')}<b>${esc(me.nama)}</b>${me.streak > 1 ? `<span class="km-streak" title="Hari berturut-turut">${icon('flame')}${me.streak}</span>` : ''}</span>
          <button type="button" class="km-locpill ${me.privasi === 'tutup' ? 'off' : ''}" data-act="privasi">${icon('pin')}Lokasi: ${esc(priv)}</button>
        </div>
        <div class="km-map-bottom">${p && p.rakan.length ? `<div class="km-fchips">${p.rakan.map(r => `<button type="button" class="km-fchip" data-rakan="${esc(r.uid)}">${avatar(r, 'sm')}<span><b>${esc(r.nama.split(' ')[0])}</b><small>${r.lokasi ? esc(lalu(r.lokasi.t)) : 'Lokasi tidak dikongsi'}</small></span></button>`).join('')}</div>` : ''}</div>
      </div>
      ${me.privasi === 'tutup' ? `<div class="card km-note">${icon('lock')}<div><b>Lokasi anda tidak dikongsi.</b><span class="muted small">Hidupkan untuk muncul pada peta rakan. Lokasi hanya dihantar semasa halaman ini dibuka, dan disembunyikan selepas 24 jam.</span></div><button class="btn sm" type="button" data-act="privasi">Hidupkan</button></div>` : ''}
      ${p && p.masuk.length ? `<div class="card km-req"><h3>Permintaan rakan</h3>${p.masuk.map(r => `<div class="km-row">${avatar(r)}<div class="km-row-b"><b>${esc(r.nama)}</b><small class="muted">${esc(uniNama(r.uni))}</small></div>
          <button class="btn sm" type="button" data-terima="${esc(r.uid)}">Terima</button><button class="btn sm ghost" type="button" data-tolak="${esc(r.uid)}">Tolak</button></div>`).join('')}</div>` : ''}
      <div class="km-grid2">
        <div class="card km-add">
          <h3>Tambah rakan</h3>
          <p class="muted small">Kongsi kod anda, atau masukkan kod rakan.</p>
          <div class="km-code"><span class="num">${esc(me.kod)}</span><button class="icon-btn plain" type="button" data-act="salinkod" aria-label="Salin kod">${icon('copy')}</button><button class="icon-btn plain" type="button" data-act="kongsikod" aria-label="Kongsi kod">${icon('share')}</button></div>
          <form class="km-addf" id="kmAdd"><input id="kmKod" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Kod rakan, cth. 7KQ2MX" aria-label="Kod rakan"><button class="btn" type="submit">${icon('plus')}Tambah</button></form>
          ${p && p.keluar.length ? `<p class="muted small">Menunggu: ${p.keluar.map(r => `<span class="km-wait">${esc(r.nama)} <button class="link-btn" type="button" data-batal="${esc(r.uid)}">batal</button></span>`).join(', ')}</p>` : ''}
        </div>
        <div class="card km-friends">
          <h3>Rakan ${p ? `<span class="muted">(${p.rakan.length})</span>` : ''}</h3>
          ${!p ? '<div class="km-skel"><i></i><i></i></div>' : p.rakan.length ? p.rakan.map(r => `<div class="km-row">${avatar(r)}<div class="km-row-b"><b>${esc(r.nama)}${r.streak > 1 ? ` <span class="km-streak">${icon('flame')}${r.streak}</span>` : ''}</b>
              <small class="muted">${esc(uniNama(r.uni))} · ${r.lokasi ? `${icon('pin', 'ic xs')}${esc(lalu(r.lokasi.t))}` : 'lokasi tidak dikongsi'}</small></div>
              <button class="icon-btn plain" type="button" data-sembang="${esc(r.uid)}" aria-label="Sembang dengan ${esc(r.nama)}">${icon('chat')}</button>
              <button class="icon-btn plain" type="button" data-urus="${esc(r.uid)}" aria-label="Pilihan untuk ${esc(r.nama)}">${icon('dots')}</button></div>`).join('')
            : '<p class="muted">Belum ada rakan. Kongsi kod anda untuk bermula.</p>'}
        </div>
      </div>`;
  }

  async function loadPeta() {
    try { S.peta = await api('peta'); } catch (e) { if (!S.peta) toast(errMsg(e)); return; }
    if (S.tab === 'peta' && shown && S.me) repaintPeta();
  }

  // Peta 3D bersama (js/peta-gaya.js): MapLibre, jubin vektor OpenFreeMap, tema ikut laman
  async function ensureMap() {
    const el = $('#kmMap', root);
    if (!el) return;
    if (peta && peta.map.getContainer() === el) { peta.resize(); return; }
    if (peta) { peta.buang(); peta = null; penanda = []; fitted = false; }
    if (memuatPeta) return;
    memuatPeta = true;
    const sendiri = S.peta && S.peta.saya;
    let p = null;
    try {
      await loadScript('js/peta-gaya.js');
      p = await PetaGaya.cipta(el, { kunci: 'rakan', pusat: sendiri ? [sendiri.lat, sendiri.lng] : PUSAT, zum: sendiri ? 14 : 16 });
    } catch { p = null; } finally { memuatPeta = false; }
    // Bekas peta diganti semasa memuat (halaman dilukis semula): cipta semula pada bekas baharu
    if (!el.isConnected) { if (p) p.buang(); return ensureMap(); }
    if (!p) { el.innerHTML = '<p class="muted km-nomap">Peta tidak dapat dimuatkan.</p>'; return; }
    peta = p;
    setTimeout(() => peta && peta.resize(), 150);
    paintMarkers();
  }

  // Pin rakan: bulatan berwarna dengan inisial dan nama pertama, berdiri tegak walaupun peta dicondongkan
  function pin(p, me) {
    const el = document.createElement('div');
    el.className = 'km-pin-wrap';
    el.innerHTML = `<span class="km-pin ${me ? 'me' : ''}" style="--c:${esc(WARNA.includes(p.warna) ? p.warna : WARNA[0])}"><span>${esc(inisial(p.nama))}</span></span><span class="km-pin-name">${esc(me ? 'Anda' : p.nama.split(' ')[0])}</span>`;
    el.title = me ? 'Anda' : p.nama;
    return el;
  }
  function paintMarkers() {
    if (!peta || !S.peta) return;
    penanda.forEach(m => m.remove()); penanda = [];
    const pts = [], ML = peta.ML;
    for (const r of S.peta.rakan) if (r.lokasi) {
      const ll = [r.lokasi.lat, r.lokasi.lng]; pts.push(ll);
      const el = pin(r);
      el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', `${r.nama}: pilihan`);
      el.addEventListener('click', e => { e.stopPropagation(); urus(r.uid); });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); urus(r.uid); } });
      penanda.push(new ML.Marker({ element: el, anchor: 'bottom' }).setLngLat(peta.LL(ll)).addTo(peta.map));
    }
    const s = S.peta.saya;
    if (s) { const ll = [s.lat, s.lng]; pts.push(ll); const el = pin(S.me, true); el.classList.add('saya'); penanda.push(new ML.Marker({ element: el, anchor: 'bottom' }).setLngLat(peta.LL(ll)).addTo(peta.map)); }
    if (!fitted && pts.length) { fitted = true; peta.muat(pts, { top: 80, bottom: 96, left: 50, right: 70 }, 15); }
  }


  // Hantar lokasi semasa halaman Peta dibuka (setiap 60 saat, atau apabila bergerak > 30 m)
  function startGeo() {
    stopGeo();
    if (!S.me || S.me.privasi === 'tutup' || !navigator.geolocation) return;
    const kirim = () => navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const moved = !lastSent || Math.hypot(lat - lastSent.lat, (lng - lastSent.lng) * Math.cos(lat * Math.PI / 180)) * 111000 > 30;
      if (!moved && lastSent && Date.now() - lastSent.t < 120000) return;
      lastSent = { lat, lng, t: Date.now() };
      try {
        await api('lokasi', { lat, lng });
        if (S.peta) { S.peta.saya = { lat: Math.round(lat * 1e4) / 1e4, lng: Math.round(lng * 1e4) / 1e4, t: Date.now() / 1000 }; paintMarkers(); }
      } catch {}
    }, err => { if (err.code === 1) toast('Benarkan akses lokasi untuk muncul pada peta rakan.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
    kirim();
    geoT = setInterval(kirim, 60000);
  }
  function stopGeo() { if (geoT) clearInterval(geoT); geoT = null; }

  function urus(uid) {
    const r = S.peta && S.peta.rakan.find(x => x.uid === uid);
    if (!r) return;
    const d = dialog(`<div class="km-prof">${avatar(r, 'lg')}<h2>${esc(r.nama)}</h2><p class="muted">${esc(uniNama(r.uni))}${r.streak > 1 ? ` · <span class="km-streak">${icon('flame')}${r.streak} hari</span>` : ''}</p>
        <p class="small">${r.lokasi ? `${icon('pin', 'ic xs')}Dikemas kini ${esc(lalu(r.lokasi.t))}` : 'Lokasi tidak dikongsi dengan anda.'}</p></div>
      <div class="km-stack">
        <button class="btn" type="button" data-x="sembang">${icon('chat')}Sembang</button>
        ${r.lokasi ? `<button class="btn ghost" type="button" data-x="peta">${icon('pin')}Tunjuk pada peta</button><a class="btn ghost" href="https://www.google.com/maps/dir/?api=1&destination=${r.lokasi.lat},${r.lokasi.lng}" target="_blank" rel="noopener">${icon('compass')}Arah ke sini</a>` : ''}
        <button class="btn ghost" type="button" data-x="buang">${icon('x')}Buang rakan</button>
        <button class="btn ghost danger" type="button" data-x="sekat">${icon('lock')}Sekat dan lapor</button>
      </div>`);
    d.addEventListener('click', async e => {
      const x = e.target.closest('[data-x]'); if (!x) return;
      const a = x.dataset.x;
      if (a === 'sembang') { d.close(); sembang(uid); }
      if (a === 'peta') { d.close(); if (peta) peta.pandang([r.lokasi.lat, r.lokasi.lng], 16, true); $('#kmMap', root)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      if (a === 'buang' && confirm(`Buang ${r.nama} daripada senarai rakan?`)) { try { await api('buang', { uid }); d.close(); toast('Rakan dibuang.'); loadPeta(); } catch (er) { toast(errMsg(er)); } }
      if (a === 'sekat' && confirm(`Sekat ${r.nama}? Dia tidak akan dapat menghubungi anda atau melihat lokasi anda.`)) {
        try { await api('sekat', { uid }); await api('lapor', { uid, sebab: 'Disekat oleh pengguna' }); d.close(); toast('Pengguna disekat.'); loadPeta(); } catch (er) { toast(errMsg(er)); }
      }
    });
  }

  /* ---------- ACARA ---------- */
  function renderAcara() {
    const a = S.acara;
    body(`<div class="km-filter">
        <div class="segmented" role="group" aria-label="Jenis">${[['semua', 'Semua'], ['acara', 'Acara'], ['memo', 'Memo']].map(([k, n]) => `<button type="button" class="seg ${a.jenis === k ? 'active' : ''}" data-ajenis="${k}">${n}</button>`).join('')}</div>
        <label class="km-select">${icon('cap')}<select id="kmAUni" aria-label="Universiti">${uniOpts(a.uni, 'Semua universiti')}</select></label>
      </div>
      <div id="kmList" class="km-list"><div class="km-skel"><i></i><i></i><i></i></div></div>`);
    loadList();
  }

  function kadAcara(h) {
    const memo = h.jenis === 'memo';
    const t = !memo && h.tarikh ? new Date(h.tarikh.length > 10 ? h.tarikh : h.tarikh + 'T00:00') : null;
    const masa = t && h.tarikh.length > 10 ? t.toLocaleTimeString('ms-MY', { hour: 'numeric', minute: '2-digit' }) : '';
    return `<article class="card km-ev ${memo ? 'memo' : ''}">
      ${memo ? `<div class="km-date memo" aria-hidden="true">${icon('file')}</div>` : `<div class="km-date"><b>${t.getDate()}</b><span>${BULAN[t.getMonth()]}</span></div>`}
      <div class="km-ev-b">
        <div class="km-ev-top"><span class="km-tag ${memo ? 'memo' : ''}">${memo ? 'Memo' : 'Acara'}</span><span class="km-tag uni">${esc(uniNama(h.uni))}</span></div>
        <h3>${esc(h.tajuk)}</h3>
        ${!memo && (masa || h.tempat) ? `<p class="km-meta">${masa ? `${icon('clock', 'ic xs')}${esc(masa)}` : ''}${h.tempat ? ` ${icon('pin', 'ic xs')}${esc(h.tempat)}` : ''}</p>` : ''}
        ${h.teks ? `<p class="km-teks">${esc(h.teks)}</p>` : ''}
        <p class="km-by">${avatar(h.oleh, 'xs')}<span>${esc(h.oleh.nama)} · ${esc(lalu(h.t))}</span>
          <button class="icon-btn plain" type="button" data-hmenu="${h.id}" aria-label="Pilihan">${icon('dots')}</button></p>
      </div></article>`;
  }

  async function loadList() {
    const box = () => $('#kmList', root);
    const req = S.tab === 'acara'
      ? { bahagian: 'acara', jenis: S.acara.jenis === 'semua' ? '' : S.acara.jenis, uni: S.acara.uni }
      : { bahagian: 'servis', jenis: S.servis.jenis, kategori: S.servis.kategori, q: S.servis.q, saya: S.servis.mod === 'saya', tugasan: S.servis.mod === 'tugasan' };
    const tab = S.tab;
    try {
      const d = await api('senarai', req);
      if (S.tab !== tab || !box()) return;
      S.list = d.senarai;
      paintList();
    } catch (e) { if (box()) box().innerHTML = `<div class="card km-empty"><p>${esc(errMsg(e))}</p></div>`; }
  }

  function paintList() {
    const b = $('#kmList', root); if (!b) return;
    const L = S.list || [];
    if (S.tab === 'acara') {
      b.innerHTML = L.length ? L.map(kadAcara).join('') : `<div class="card km-empty">${icon('calendar')}<p><b>Tiada acara atau memo lagi.</b></p><p class="muted small">Jadilah yang pertama berkongsi program kampus anda.</p><button class="btn" type="button" data-act="baru">${icon('plus')}Hantar acara</button></div>`;
      return;
    }
    const m = S.servis.mod;
    b.innerHTML = L.length ? `<div class="km-sgrid">${L.map(kadServis).join('')}</div>`
      : `<div class="card km-empty">${icon('grid')}<p><b>${m === 'saya' ? 'Anda belum menyiarkan servis.' : m === 'tugasan' ? 'Tiada tugasan lagi.' : 'Tiada servis dalam kategori ini.'}</b></p>
        <p class="muted small">${m === 'tugasan' ? 'Servis yang anda tekan "Berminat", dan servis anda yang mendapat peminat, dipaparkan di sini.' : 'Tawarkan kemahiran anda atau minta bantuan daripada pelajar lain.'}</p>
        ${m !== 'tugasan' ? `<button class="btn" type="button" data-act="baru">${icon('plus')}Siarkan servis</button>` : ''}</div>`;
  }

  /* ---------- SERVIS ---------- */
  function renderServis() {
    const s = S.servis;
    body(`<div class="km-filter">
        <div class="segmented" role="group" aria-label="Paparan">${[['layari', 'Layari'], ['saya', 'Saya'], ['tugasan', 'Tugasan']].map(([k, n]) => `<button type="button" class="seg ${s.mod === k ? 'active' : ''}" data-smod="${k}">${n}</button>`).join('')}</div>
        <div class="km-under" role="group" aria-label="Jenis servis">${[['tawar', 'Tawaran'], ['minta', 'Permintaan']].map(([k, n]) => `<button type="button" class="${s.jenis === k ? 'on' : ''}" data-sjenis="${k}">${n}</button>`).join('')}</div>
      </div>
      ${s.mod === 'layari' ? `<label class="km-search">${icon('search')}<input id="kmQ" type="search" placeholder="Cari servis, cth. tuisyen kalkulus" value="${esc(s.q)}" aria-label="Cari servis"></label>
      <div class="chips km-cats">${[['', '🔥', 'Semua'], ...Object.entries(KAT).map(([k, [e, n]]) => [k, e, n])].map(([k, e, n]) => `<button type="button" class="chip ${s.kategori === k ? 'active' : ''}" data-kat="${k}"><span aria-hidden="true">${e}</span>${esc(n)}</button>`).join('')}</div>` : ''}
      <div id="kmList" class="km-list"><div class="km-sgrid km-skel-grid"><i></i><i></i><i></i><i></i></div></div>`);
    loadList();
  }

  function kadServis(h) {
    const [e, n] = KAT[h.kategori] || KAT.lain;
    return `<button type="button" class="km-scard ${h.status !== 'buka' ? 'tutup' : ''}" data-servis="${h.id}">
      <span class="km-simg">${h.gambar ? `<img src="${esc(API)}/gambar/${h.id}" alt="" loading="lazy">` : `<span class="km-sph" aria-hidden="true">${e}</span>`}
        <span class="km-price">${esc(rm(h.harga))}</span>${h.status !== 'buka' ? '<span class="km-closed">Selesai</span>' : ''}</span>
      <span class="km-sbody"><span class="km-skat">${e} ${esc(n)}</span><b>${esc(h.tajuk)}</b>
        <span class="km-by">${avatar(h.oleh, 'xs')}<span>${esc(h.oleh.nama)}</span></span>
        <small class="muted">${h.kampus ? esc(h.kampus) + ' · ' : ''}${esc(uniNama(h.uni))}${h.minat ? ` · ${h.minat} berminat` : ''}</small></span></button>`;
  }

  function lihatServis(id) {
    const h = (S.list || []).find(x => x.id === id); if (!h) return;
    const [e, n] = KAT[h.kategori] || KAT.lain;
    const d = dialog(`${h.gambar ? `<img class="km-dimg" src="${esc(API)}/gambar/${h.id}" alt="">` : `<div class="km-dimg ph" aria-hidden="true">${e}</div>`}
      <p class="km-skat">${h.jenis === 'minta' ? 'Permintaan' : 'Tawaran'} · ${e} ${esc(n)}</p>
      <h2>${esc(h.tajuk)}</h2>
      <p class="km-dprice">${esc(rm(h.harga))}${h.status !== 'buka' ? ' <span class="km-tag">Selesai</span>' : ''}</p>
      ${h.teks ? `<p class="km-teks">${esc(h.teks)}</p>` : ''}
      <p class="km-by">${avatar(h.oleh, 'sm')}<span><b>${esc(h.oleh.nama)}</b><br><small class="muted">${h.kampus ? esc(h.kampus) + ' · ' : ''}${esc(uniNama(h.uni))} · ${esc(lalu(h.t))}</small></span></p>
      <div class="km-stack">${h.milik ? `
        <button class="btn" type="button" data-x="peminat">${icon('user')}Peminat (${h.minat})</button>
        <button class="btn ghost" type="button" data-x="tutup">${icon('check')}${h.status === 'buka' ? 'Tandakan selesai' : 'Buka semula'}</button>
        <button class="btn ghost danger" type="button" data-x="padam">${icon('trash')}Padam</button>`
      : `<button class="btn" type="button" data-x="minat">${icon('chat')}${h.saya_minat ? 'Sembang' : h.jenis === 'minta' ? 'Saya boleh bantu' : 'Berminat'}</button>
        <button class="btn ghost" type="button" data-x="lapor">${icon('alert')}Lapor</button>`}</div>
      <p class="muted small">Berurusan dengan berhati-hati. Jumpa di tempat awam kampus dan jangan bayar penuh sebelum servis diterima.</p>`, 'km-sdialog');
    d.addEventListener('click', async ev => {
      const x = ev.target.closest('[data-x]'); if (!x) return;
      try {
        if (x.dataset.x === 'minat') { const r = await api('minat', { id }); d.close(); sembang(r.uid); h.saya_minat = true; }
        if (x.dataset.x === 'lapor') { d.close(); lapor({ id }); }
        if (x.dataset.x === 'tutup') { await api('tutup', { id }); d.close(); loadList(); }
        if (x.dataset.x === 'padam' && confirm('Padam servis ini?')) { await api('padam', { id }); d.close(); toast('Servis dipadam.'); loadList(); }
        if (x.dataset.x === 'peminat') {
          const r = await api('peminat', { id }); d.close();
          const p = dialog(`<h2>Peminat</h2>${r.senarai.length ? r.senarai.map(u => `<div class="km-row">${avatar(u)}<div class="km-row-b"><b>${esc(u.nama)}</b><small class="muted">${esc(uniNama(u.uni))}</small></div><button class="btn sm" type="button" data-sembang="${esc(u.uid)}">${icon('chat')}Sembang</button></div>`).join('') : '<p class="muted">Belum ada peminat.</p>'}`);
          p.addEventListener('click', e2 => { const s = e2.target.closest('[data-sembang]'); if (s) { p.close(); sembang(s.dataset.sembang); } });
        }
      } catch (er) { toast(errMsg(er)); }
    });
  }

  function hmenu(id) {
    const h = (S.list || []).find(x => x.id === id); if (!h) return;
    const d = dialog(`<h2>${esc(h.tajuk)}</h2><div class="km-stack">${h.milik ? `<button class="btn ghost danger" type="button" data-x="padam">${icon('trash')}Padam</button>` : `<button class="btn ghost" type="button" data-x="lapor">${icon('alert')}Lapor hantaran ini</button>`}</div>`);
    d.addEventListener('click', async e => {
      const x = e.target.closest('[data-x]'); if (!x) return;
      if (x.dataset.x === 'lapor') { d.close(); lapor({ id }); }
      if (x.dataset.x === 'padam') { try { await api('padam', { id }); d.close(); toast('Dipadam.'); loadList(); } catch (er) { toast(errMsg(er)); } }
    });
  }

  function lapor(target) {
    const d = dialog(`<h2>Lapor</h2><p class="muted small">Laporan dihantar kepada pemilik SiswaCap. Hantaran yang dilaporkan oleh 3 orang disembunyikan secara automatik.</p>
      <form id="kmLapor" class="km-form">${['Spam atau iklan palsu', 'Penipuan', 'Kandungan tidak sopan', 'Gangguan atau buli', 'Menjual tugasan atau barang terlarang', 'Lain-lain'].map((s, i) => `<label class="km-radio"><input type="radio" name="sebab" value="${esc(s)}" ${i ? '' : 'checked'}>${esc(s)}</label>`).join('')}
      <button class="btn" type="submit">${icon('alert')}Hantar laporan</button></form>`);
    $('#kmLapor', d).addEventListener('submit', async e => {
      e.preventDefault();
      try { await api('lapor', { ...target, sebab: new FormData(e.target).get('sebab') }); d.close(); toast('Terima kasih. Laporan dihantar.'); if (target.id != null) loadList(); } catch (er) { toast(errMsg(er)); }
    });
  }

  /* ---------- Hantaran baharu ---------- */
  function baru() {
    const acara = S.tab === 'acara';
    const esok = new Date(Date.now() + 864e5).toLocaleDateString('en-CA');
    const d = dialog(acara ? `<h2>Kongsi di kampus</h2>
      <form class="km-form" id="kmNew">
        <div class="segmented km-full" role="group">${[['acara', 'Acara'], ['memo', 'Memo']].map(([k, n], i) => `<label class="seg ${i ? '' : 'active'}"><input class="sr-only" type="radio" name="jenis" value="${k}" ${i ? '' : 'checked'}>${n}</label>`).join('')}</div>
        <label>Tajuk<input name="tajuk" required minlength="4" maxlength="80" placeholder="cth. Karnival Usahawan Siswa"></label>
        <div class="km-2" data-hanya="acara"><label>Tarikh<input name="tarikh" type="date" min="${new Date().toLocaleDateString('en-CA')}" value="${esok}"></label><label>Masa<input name="masa" type="time"></label></div>
        <label data-hanya="acara">Tempat<input name="tempat" maxlength="80" placeholder="cth. Dewan Agung Tuanku Canselor"></label>
        <label>Butiran<textarea name="teks" rows="4" maxlength="1000" placeholder="Apa, siapa yang boleh hadir, cara daftar"></textarea></label>
        <label>Universiti<select name="uni">${uniOpts(S.me.uni)}</select></label>
        <p class="error hidden" id="kmNewErr"></p>
        <button class="btn" type="submit">${icon('check')}Siarkan</button>
      </form>` : `<h2>Siarkan servis</h2>
      <form class="km-form" id="kmNew">
        <div class="segmented km-full" role="group">${[['tawar', 'Saya tawarkan'], ['minta', 'Saya perlukan']].map(([k, n]) => `<label class="seg ${S.servis.jenis === k ? 'active' : ''}"><input class="sr-only" type="radio" name="jenis" value="${k}" ${S.servis.jenis === k ? 'checked' : ''}>${n}</label>`).join('')}</div>
        <label class="km-photo" id="kmPhoto">${icon('camera')}<span>Tambah gambar (pilihan)</span><input type="file" accept="image/*" class="sr-only" id="kmImg"></label>
        <label>Tajuk<input name="tajuk" required minlength="4" maxlength="80" placeholder="cth. Tuisyen Kalkulus asas"></label>
        <div class="km-2"><label>Kategori<select name="kategori">${Object.entries(KAT).map(([k, [e, n]]) => `<option value="${k}" ${S.servis.kategori === k ? 'selected' : ''}>${e} ${esc(n)}</option>`).join('')}</select></label>
          <label>Harga (RM)<input name="harga" type="number" min="0" max="10000" step="0.5" inputmode="decimal" placeholder="Kosong = runding"></label></div>
        <div class="km-2"><label>Universiti<select name="uni">${uniOpts(S.me.uni)}</select></label><label>Kampus / lokasi<input name="kampus" maxlength="40" placeholder="cth. Shah Alam"></label></div>
        <label>Butiran<textarea name="teks" rows="4" maxlength="1000" placeholder="Apa yang termasuk, masa, cara berhubung"></textarea></label>
        <p class="muted small">Dilarang: menjual tugasan siap, barang terlarang, pinjaman wang atau penipuan. Akaun yang melanggar akan disekat.</p>
        <p class="error hidden" id="kmNewErr"></p>
        <button class="btn" type="submit">${icon('check')}Siarkan</button>
      </form>`, 'km-newd');
    const f = $('#kmNew', d);
    let gambar = null;
    const syncJenis = () => {
      const j = f.jenis.value;
      $$('.seg', f).forEach(l => l.classList.toggle('active', l.querySelector('input').checked));
      $$('[data-hanya]', f).forEach(el => el.classList.toggle('hidden', el.dataset.hanya !== j));
    };
    f.addEventListener('change', e => {
      if (e.target.name === 'jenis') syncJenis();
      if (e.target.id === 'kmImg' && e.target.files[0]) kecil(e.target.files[0]).then(u => { gambar = u; const ph = $('#kmPhoto', d); ph.style.backgroundImage = `url("${u}")`; ph.classList.add('has'); $('span', ph).textContent = 'Tukar gambar'; }).catch(() => toast('Gambar tidak dapat dibaca.'));
    });
    syncJenis();
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(f)), btn = $('button[type=submit]', f), er = $('#kmNewErr', d);
      if (v.jenis === 'acara' && !v.tarikh) { er.textContent = 'Pilih tarikh acara.'; er.classList.remove('hidden'); return; }
      const data = { ...v, ...(v.jenis === 'acara' ? { tarikh: v.masa ? `${v.tarikh}T${v.masa}` : v.tarikh } : {}), ...(gambar ? { gambar } : {}) };
      btn.disabled = true;
      try {
        await api('siar', data); d.close(); toast('Disiarkan.');
        if (S.tab === 'servis') { S.servis.jenis = v.jenis; S.servis.mod = 'layari'; S.servis.kategori = ''; renderServis(); }
        else { S.acara.uni = v.uni; S.acara.jenis = 'semua'; renderAcara(); }
      } catch (x) { er.textContent = errMsg(x); er.classList.remove('hidden'); btn.disabled = false; }
    });
  }

  // Kecilkan gambar dalam peranti (lebar maksimum 900 px, JPEG) supaya di bawah had pelayan
  function kecil(file) {
    return new Promise((ok, fail) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const sc = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        let q = 0.8, out = c.toDataURL('image/jpeg', q);
        while (out.length * 0.75 > 350 * 1024 && q > 0.35) { q -= 0.15; out = c.toDataURL('image/jpeg', q); }
        ok(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); fail(); };
      img.src = url;
    });
  }

  /* ---------- Sembang ---------- */
  function sembang(uid) {
    let last = 0, timer = null, busy = false;
    const d = dialog(`<div class="km-chat-head" id="kmCH"><span class="km-skel-line"></span></div>
      <div class="km-msgs" id="kmMsgs" aria-live="polite"></div>
      <form class="km-send" id="kmSend"><input id="kmTxt" maxlength="500" autocomplete="off" placeholder="Tulis mesej" aria-label="Mesej"><button class="icon-btn km-sendbtn" type="submit" aria-label="Hantar">${icon('chev')}</button></form>`, 'km-chat');
    const box = $('#kmMsgs', d);
    const add = list => {
      if (!list.length) return;
      const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      box.insertAdjacentHTML('beforeend', list.map(m => `<div class="km-msg ${m.saya ? 'me' : ''}"><p>${esc(m.teks)}</p><small>${esc(new Date(m.t * 1000).toLocaleTimeString('ms-MY', { hour: 'numeric', minute: '2-digit' }))}</small></div>`).join(''));
      last = list[list.length - 1].id;
      if (nearBottom || !timer) box.scrollTop = box.scrollHeight;
    };
    const tarik = async () => {
      if (busy) return; busy = true;
      try {
        const r = await api('sembang', { uid, selepas: last });
        if (!last) $('#kmCH', d).innerHTML = `${avatar(r.dengan, 'sm')}<b>${esc(r.dengan.nama)}</b>`;
        if (!last && !r.mesej.length) box.innerHTML = '<p class="muted km-first">Mulakan perbualan. Bersopan dan jangan kongsi maklumat sulit.</p>';
        else { $('.km-first', box)?.remove(); add(r.mesej); }
      } catch (e) { if (!last) { box.innerHTML = `<p class="muted km-first">${esc(errMsg(e))}</p>`; clearInterval(timer); } }
      busy = false;
    };
    tarik().then(() => { timer = setInterval(() => { if (!document.hidden) tarik(); }, 4000); });
    d.addEventListener('tutup', () => clearInterval(timer));
    $('#kmSend', d).addEventListener('submit', async e => {
      e.preventDefault();
      const i = $('#kmTxt', d), t = i.value.trim(); if (!t) return;
      i.value = '';
      try { await api('hantar', { uid, teks: t }); await tarik(); } catch (er) { toast(errMsg(er)); i.value = t; }
      i.focus();
    });
    setTimeout(() => $('#kmTxt', d)?.focus(), 50);
  }

  async function inbox() {
    const d = dialog(`<h2>Sembang</h2><div id="kmInbox"><div class="km-skel"><i></i><i></i></div></div>`);
    try {
      const r = await api('perbualan');
      $('#kmInbox', d).innerHTML = r.senarai.length ? r.senarai.map(c => `<button type="button" class="km-row km-conv" data-sembang="${esc(c.uid)}">${avatar(c)}<span class="km-row-b"><b>${esc(c.nama)}</b><small class="muted">${c.saya ? 'Anda: ' : ''}${esc(c.teks.slice(0, 60))}</small></span><small class="muted">${esc(lalu(c.t))}${c.baru ? '<i class="km-dot"></i>' : ''}</small></button>`).join('')
        : '<p class="muted">Belum ada perbualan. Buka profil rakan atau servis untuk mula bersembang.</p>';
    } catch (e) { $('#kmInbox', d).innerHTML = `<p class="muted">${esc(errMsg(e))}</p>`; }
    d.addEventListener('click', e => { const s = e.target.closest('[data-sembang]'); if (s) { d.close(); sembang(s.dataset.sembang); } });
  }

  /* ---------- Notifikasi ---------- */
  async function notif() {
    const d = dialog(`<h2>Notifikasi</h2><div id="kmNotif"><div class="km-skel"><i></i><i></i></div></div>`);
    const IC = { rakan: 'user', mesej: 'chat', minat: 'star', acara: 'calendar' };
    try {
      const r = await api('notif'); badge(0);
      $('#kmNotif', d).innerHTML = r.senarai.length ? r.senarai.map(n => `<button type="button" class="km-row km-nt ${n.baca ? '' : 'baru'}" data-nj="${esc(n.jenis)}" data-nr="${esc(n.rujuk)}"><span class="km-nic">${icon(IC[n.jenis] || 'bell')}</span><span class="km-row-b"><span>${esc(n.teks)}</span><small class="muted">${esc(lalu(n.t))}</small></span></button>`).join('')
        : `<p class="muted">Tiada notifikasi. Anda boleh memilih notifikasi yang diterima dalam Tetapan.</p>`;
    } catch (e) { $('#kmNotif', d).innerHTML = `<p class="muted">${esc(errMsg(e))}</p>`; }
    d.addEventListener('click', e => {
      const n = e.target.closest('[data-nj]'); if (!n) return;
      d.close();
      const j = n.dataset.nj;
      if (j === 'mesej' || j === 'minat') sembang(n.dataset.nr);
      else { S.tab = j === 'acara' ? 'acara' : 'peta'; store.set('km_tab', S.tab); if (j === 'acara') S.acara.uni = S.me.uni; render(); }
    });
  }

  /* ---------- Tetapan ---------- */
  async function tetapan(fokus) {
    const me = S.me;
    const rakan = (S.peta && S.peta.rakan) || [];
    const d = dialog(`<h2>Tetapan Komuniti</h2>
      <form class="km-form" id="kmSet">
        <h3>Profil</h3>
        <label>Nama paparan<input name="nama" maxlength="40" required minlength="2" value="${esc(me.nama)}"></label>
        <label>Universiti<select name="uni">${uniOpts(me.uni)}</select></label>
        <fieldset class="km-colors"><legend>Warna avatar</legend>${WARNA.map(w => `<label style="--c:${w}"><input class="sr-only" type="radio" name="warna" value="${w}" ${w === me.warna ? 'checked' : ''}><span aria-label="${w}"></span></label>`).join('')}</fieldset>
        <h3 id="kmPriv">Privasi lokasi</h3>
        <p class="muted small">Siapa boleh melihat lokasi anda pada peta. Lokasi hanya dihantar semasa halaman Peta dibuka, dibundarkan kira-kira 10 m, dan disembunyikan selepas 24 jam.</p>
        ${[['rakan', 'Semua rakan', 'Semua rakan yang anda terima.'], ['pilihan', 'Rakan pilihan', 'Hanya rakan yang anda tandakan di bawah.'], ['tutup', 'Mati', 'Tiada sesiapa melihat lokasi anda.']].map(([k, n, s]) => `<label class="km-opt"><input type="radio" name="privasi" value="${k}" ${me.privasi === k ? 'checked' : ''}><span><b>${n}</b><small class="muted">${s}</small></span></label>`).join('')}
        <div class="km-pick ${me.privasi === 'pilihan' ? '' : 'hidden'}" id="kmPick">${rakan.length ? rakan.map(r => `<label class="km-check"><input type="checkbox" name="pilihan" value="${esc(r.uid)}" ${me.pilihan.includes(r.uid) ? 'checked' : ''}>${avatar(r, 'xs')}${esc(r.nama)}</label>`).join('') : '<p class="muted small">Tiada rakan lagi.</p>'}</div>
        <h3>Notifikasi dalam app</h3>
        ${[['rakan', 'Permintaan rakan'], ['mesej', 'Mesej baharu'], ['minat', 'Peminat servis saya'], ['acara', 'Acara baharu di universiti saya']].map(([k, n]) => `<label class="km-switch"><span>${n}</span><input type="checkbox" role="switch" name="n_${k}" ${me.notif[k] ? 'checked' : ''}></label>`).join('')}
        <p class="error hidden" id="kmSetErr"></p>
        <button class="btn" type="submit">${icon('check')}Simpan</button>
      </form>
      <div class="km-danger">
        <button class="link-btn" type="button" data-x="sekat">Pengguna yang disekat</button>
        <button class="link-btn danger" type="button" data-x="padam">Padam semua data Komuniti saya</button>
      </div>`, 'km-setd');
    const f = $('#kmSet', d);
    f.addEventListener('change', e => { if (e.target.name === 'privasi') $('#kmPick', d).classList.toggle('hidden', e.target.value !== 'pilihan'); });
    if (fokus) setTimeout(() => $('#kmPriv', d).scrollIntoView({ block: 'start' }), 60);
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(f);
      const data = { nama: fd.get('nama'), uni: fd.get('uni'), warna: fd.get('warna'), privasi: fd.get('privasi'), pilihan: fd.getAll('pilihan'), notif: Object.fromEntries(['rakan', 'mesej', 'minat', 'acara'].map(k => [k, fd.get('n_' + k) === 'on'])) };
      try {
        const r = await api('tetapan', data); S.me = r.profil; d.close(); toast('Tetapan disimpan.');
        if (S.me.privasi === 'tutup') { stopGeo(); lastSent = null; if (S.peta) S.peta.saya = null; }
        render();
      } catch (x) { const er = $('#kmSetErr', d); er.textContent = errMsg(x); er.classList.remove('hidden'); }
    });
    d.addEventListener('click', async e => {
      const x = e.target.closest('[data-x]'); if (!x) return;
      if (x.dataset.x === 'padam') {
        if (!confirm('Padam profil, rakan, sembang, hantaran dan lokasi Komuniti anda? Tindakan ini tidak boleh dibatalkan.')) return;
        try { await api('padamSaya'); d.close(); S.me = null; S.peta = null; toast('Data Komuniti anda telah dipadam.'); gateAfterDelete(); } catch (er) { toast(errMsg(er)); }
      }
      if (x.dataset.x === 'sekat') {
        d.close();
        const b = dialog(`<h2>Disekat</h2><div id="kmBlk"><div class="km-skel"><i></i></div></div>`);
        try {
          const r = await api('disekat');
          $('#kmBlk', b).innerHTML = r.senarai.length ? r.senarai.map(u => `<div class="km-row">${avatar({ nama: u.nama })}<div class="km-row-b"><b>${esc(u.nama)}</b></div><button class="btn sm ghost" type="button" data-nyah="${esc(u.uid)}">Nyahsekat</button></div>`).join('') : '<p class="muted">Tiada pengguna disekat.</p>';
        } catch (er) { $('#kmBlk', b).innerHTML = `<p class="muted">${esc(errMsg(er))}</p>`; }
        b.addEventListener('click', async ev => { const n = ev.target.closest('[data-nyah]'); if (n) { try { await api('nyahsekat', { uid: n.dataset.nyah }); n.closest('.km-row').remove(); toast('Dinyahsekat.'); } catch (er) { toast(errMsg(er)); } } });
      }
    });
  }
  function gateAfterDelete() {
    stopTimers();
    root.innerHTML = `<div class="page-head"><p class="eyebrow">Kampus</p><h1 id="h-komuniti">Komuniti</h1></div><div class="card km-empty"><p>Data Komuniti anda telah dipadam.</p><button class="btn" type="button" data-act="ulang">Sertai semula</button></div>`;
  }

  /* ---------- Moderasi pemilik ---------- */
  async function moderasi() {
    const d = dialog(`<h2>Moderasi Komuniti</h2><div id="kmMod"><div class="km-skel"><i></i><i></i></div></div>`, 'km-modd');
    const paint = async () => {
      try {
        const r = await adminApi('adminLapor');
        $('#kmMod', d).innerHTML = `<p class="muted small">${r.stat.pengguna} pengguna · ${r.stat.hantaran} hantaran</p>
          <h3>Hantaran dilaporkan</h3>${r.hantaran.length ? r.hantaran.map(h => `<div class="km-modrow ${h.sembunyi ? 'hid' : ''}"><div><b>${esc(h.tajuk)}</b><small class="muted">${esc(h.jenis)} · ${esc(h.oleh.nama)} · ${h.lapor} laporan${h.sembunyi ? ' · disembunyikan' : ''}</small><small>${h.sebab.map(esc).join('; ')}</small></div>
            <div class="row-gap"><button class="btn sm ghost" type="button" data-m="adminPulih" data-id="${h.id}">Pulihkan</button><button class="btn sm ghost danger" type="button" data-m="adminPadam" data-id="${h.id}">Padam</button><button class="btn sm ghost danger" type="button" data-m="adminSekat" data-uid="${esc(h.pemilik)}">Sekat pengguna</button></div></div>`).join('') : '<p class="muted">Tiada laporan.</p>'}
          <h3>Pengguna dilaporkan</h3>${r.pengguna.length ? r.pengguna.map(u => `<div class="km-modrow"><div><b>${esc(u.nama || u.uid)}</b><small class="muted">${u.n} laporan${u.sekat ? ' · disekat' : ''}</small></div><button class="btn sm ghost ${u.sekat ? '' : 'danger'}" type="button" data-m="adminSekat" data-uid="${esc(u.uid)}" data-buka="${u.sekat ? 1 : ''}">${u.sekat ? 'Buka sekatan' : 'Sekat'}</button></div>`).join('') : '<p class="muted">Tiada laporan.</p>'}`;
      } catch (e) { $('#kmMod', d).innerHTML = `<p class="muted">${esc(errMsg(e))}</p>`; }
    };
    paint();
    d.addEventListener('click', async e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const op = b.dataset.m;
      if (op !== 'adminPulih' && !confirm('Teruskan?')) return;
      try { await adminApi(op, op === 'adminSekat' ? { uid: b.dataset.uid, sekat: !b.dataset.buka } : { id: +b.dataset.id }); toast('Selesai.'); paint(); } catch (er) { toast(errMsg(er)); }
    });
  }

  /* ---------- Peristiwa ---------- */
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]');
    if (t) { S.tab = t.dataset.tab; store.set('km_tab', S.tab); S.list = null; render(); return; }
    const a = e.target.closest('[data-act]');
    if (a) {
      const act = a.dataset.act;
      if (act === 'login') Akaun.open();
      else if (act === 'ulang') start();
      else if (act === 'notif') notif();
      else if (act === 'inbox') inbox();
      else if (act === 'tetapan') tetapan();
      else if (act === 'privasi') tetapan(true);
      else if (act === 'baru') baru();
      else if (act === 'moderasi') moderasi();
      else if (act === 'salinkod') navigator.clipboard?.writeText(S.me.kod).then(() => toast('Kod disalin.'), () => toast(S.me.kod));
      else if (act === 'kongsikod') {
        const url = `https://bijaklabur.my/#komuniti/kod/${S.me.kod}`;
        const text = `Jom jadi rakan saya di Komuniti SiswaCap. Tekan pautan ini, atau masukkan kod ${S.me.kod}.`;
        if (navigator.share) navigator.share({ text, url }).catch(() => {}); else navigator.clipboard?.writeText(`${text} ${url}`).then(() => toast('Pautan jemputan disalin.'));
      }
      return;
    }
    let x;
    if ((x = e.target.closest('[data-ajenis]'))) { S.acara.jenis = x.dataset.ajenis; renderAcara(); }
    else if ((x = e.target.closest('[data-smod]'))) { S.servis.mod = x.dataset.smod; renderServis(); }
    else if ((x = e.target.closest('[data-sjenis]'))) { S.servis.jenis = x.dataset.sjenis; renderServis(); }
    else if ((x = e.target.closest('[data-kat]'))) { S.servis.kategori = x.dataset.kat; renderServis(); }
    else if ((x = e.target.closest('[data-servis]'))) lihatServis(+x.dataset.servis);
    else if ((x = e.target.closest('[data-hmenu]'))) hmenu(+x.dataset.hmenu);
    else if ((x = e.target.closest('[data-sembang]'))) sembang(x.dataset.sembang);
    else if ((x = e.target.closest('[data-urus]'))) urus(x.dataset.urus);
    else if ((x = e.target.closest('[data-rakan]'))) {
      const r = S.peta.rakan.find(f => f.uid === x.dataset.rakan);
      if (r && r.lokasi && peta) peta.pandang([r.lokasi.lat, r.lokasi.lng], 16, true); else urus(x.dataset.rakan);
    }
    else if ((x = e.target.closest('[data-terima],[data-tolak]'))) {
      const uid = x.dataset.terima || x.dataset.tolak;
      api('jawab', { uid, terima: !!x.dataset.terima }).then(() => { toast(x.dataset.terima ? 'Kini anda berkawan.' : 'Permintaan ditolak.'); loadPeta(); }, er => toast(errMsg(er)));
    }
    else if ((x = e.target.closest('[data-batal]'))) api('batal', { uid: x.dataset.batal }).then(loadPeta, er => toast(errMsg(er)));
  });
  root.addEventListener('change', e => { if (e.target.id === 'kmAUni') { S.acara.uni = e.target.value; loadList(); } });
  let qT = null;
  root.addEventListener('input', e => { if (e.target.id === 'kmQ') { clearTimeout(qT); qT = setTimeout(() => { S.servis.q = e.target.value.trim(); loadList(); }, 350); } });
  root.addEventListener('submit', async e => {
    if (e.target.id !== 'kmAdd') return;
    e.preventDefault();
    const i = $('#kmKod', root), kod = i.value.trim();
    if (kod.length < 6) { toast('Kod rakan ada 6 aksara.'); return; }
    try { const r = await api('tambah', { kod }); i.value = ''; toast(r.status === 'rakan' ? `Kini anda berkawan dengan ${r.nama}.` : `Permintaan dihantar kepada ${r.nama}.`); loadPeta(); } catch (er) { toast(errMsg(er)); }
  });

  function stopTimers() { stopGeo(); if (pollT) clearInterval(pollT); pollT = null; }
  function startPoll() {
    if (pollT) clearInterval(pollT);
    pollT = setInterval(async () => {
      if (document.hidden || !shown || !S.me) return;
      try { badge((await api('ringkas')).belum); } catch {}
      if (S.tab === 'peta') loadPeta();
    }, 30000);
  }

  function show() {
    shown = true;
    bacaJemputan();
    const sub = (location.hash.split('/')[1] || '').toLowerCase();
    if (['peta', 'acara', 'servis'].includes(sub)) S.tab = sub;
    if (!S.me || !$('#kmBody', root)) start().then(startPoll); else { render(); startPoll(); prosesJemputan(); }
  }
  function hide() { shown = false; stopTimers(); }

  document.addEventListener('viewchange', e => { if (e.detail === 'komuniti') show(); else if (shown) hide(); });
  document.addEventListener('akaunchange', () => {
    const uid = login() ? Akaun.user.uid : null;
    if (uid === (S.me && S.me.uid)) return;
    S.me = null; S.peta = null; S.list = null;
    if (shown) start().then(startPoll); else root.innerHTML = '';
  });
  document.addEventListener('visibilitychange', () => { if (!shown) return; if (document.hidden) stopGeo(); else if (S.tab === 'peta' && S.me) startGeo(); });
  if (document.documentElement.dataset.view === 'komuniti') show();
})();
