/* SiswaCap: Sihat. Kalori daripada gambar makanan (Gemini), langkah harian (sensor gerakan + GPS),
   sasaran kalori (Mifflin-St Jeor) dan sejarah 7 hari. Semua log disimpan dalam peranti ini sahaja. */
(function () {
  const root = $('#view-sihat');
  if (!root) return;
  const API = (store.get('fiqh_api', '') || 'https://fiqh.bijaklabur.my').replace(/\/$/, '');
  const MEALS = [['sarapan', 'Sarapan'], ['tengahari', 'Makan tengah hari'], ['petang', 'Minum petang'], ['malam', 'Makan malam'], ['snek', 'Snek']];
  const AKTIF = [[1.2, 'Jarang bersenam'], [1.375, 'Ringan (1 hingga 3 hari seminggu)'], [1.55, 'Sederhana (3 hingga 5 hari)'], [1.725, 'Aktif (6 hingga 7 hari)']];

  const day = (d = new Date()) => d.toLocaleDateString('en-CA');
  let P = Object.assign({ jantina: 'l', umur: 21, tinggi: 165, berat: 60, aktif: 1.375, matlamat: 'kekal', sasaranLangkah: 8000 }, store.get('sihat_profil', {}));
  let L = store.get('sihat_log', {});
  const today = () => (L[day()] = L[day()] || { makan: [], langkah: 0, manual: 0, jarak: 0 });
  function save() {
    // Simpan 60 hari terakhir sahaja
    const keys = Object.keys(L).sort();
    keys.slice(0, Math.max(0, keys.length - 60)).forEach(k => delete L[k]);
    store.set('sihat_log', L);
  }
  const fmt = n => Math.round(n).toLocaleString('ms-MY');

  /* ---------- Pengiraan ---------- */
  function target() {
    const bmr = 10 * P.berat + 6.25 * P.tinggi - 5 * P.umur + (P.jantina === 'l' ? 5 : -161);
    const tdee = bmr * P.aktif;
    return { bmr, tdee, sasaran: Math.round(tdee + (P.matlamat === 'turun' ? -500 : P.matlamat === 'naik' ? 300 : 0)) };
  }
  const bmi = () => P.berat / Math.pow(P.tinggi / 100, 2);
  const bmiLabel = b => b < 18.5 ? 'Kurang berat badan' : b < 23 ? 'Normal (piawaian Asia)' : b < 27.5 ? 'Berlebihan berat badan' : 'Obes';
  const stride = () => P.tinggi * 0.415 / 100;                         // panjang langkah (m)
  // Langkah telefon (Health Connect / Apple Health) sudah merangkumi semua langkah hari itu, termasuk yang dijejak dalam app
  const steps = d => { const own = (d.langkah || 0) + (d.manual || 0); return d.telefon != null ? Math.max(d.telefon, own) : own; };
  const burned = d => steps(d) * 0.04 * (P.berat / 70);               // kcal anggaran daripada langkah
  const eaten = d => d.makan.reduce((t, m) => t + m.kalori, 0);
  const macro = (d, k) => d.makan.reduce((t, m) => t + (m[k] || 0), 0);
  const mealNow = () => { const h = new Date().getHours(); return h < 11 ? 'sarapan' : h < 15 ? 'tengahari' : h < 18 ? 'petang' : h < 22 ? 'malam' : 'snek'; };

  /* ---------- Gambar: kecilkan dalam peranti sebelum dihantar ---------- */
  async function shrink(file, max = 1024) {
    const bmp = await createImageBitmap(file).catch(() => null);
    let img = bmp;
    if (!img) { img = new Image(); img.src = URL.createObjectURL(file); await img.decode(); }
    const w = img.width, h = img.height, k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', 0.82);
    return { url, b64: url.split(',')[1] };
  }

  async function analyse(body) {
    let r;
    try { r = await fetch(API + '/kalori', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
    catch { throw new Error(navigator.onLine === false ? 'Tiada sambungan internet.' : 'Analisis kalori tidak dapat dihubungi.'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Analisis kalori tidak tersedia buat masa ini.');
    return d;
  }

  /* ---------- Langkah: sensor gerakan + GPS ---------- */
  const walk = { on: false, steps: 0, dist: 0, last: null, watch: null, motion: false, acc: null, lock: null, base: 9.8, s: 0, above: false, lastStep: 0 };
  // Pengesan langkah bebas kadar sampel: penapis berasaskan masa sebenar (dt), bukan bilangan bacaan
  function onMotion(e) {
    const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
    walk.motion = true;
    const m = Math.hypot(a.x, a.y, a.z), t = performance.now();
    const dt = Math.min(0.2, Math.max(0.001, (t - (walk.tPrev || t - 16)) / 1000)); walk.tPrev = t;
    walk.base += (m - walk.base) * (1 - Math.exp(-dt / 1.5));          // garis dasar graviti (~1.5 s)
    walk.s += ((m - walk.base) - walk.s) * (1 - Math.exp(-dt / 0.06)); // isyarat dilicinkan (~60 ms)
    if (t - walk.t0 < 1500) return;                                     // tunggu garis dasar stabil
    if (!walk.above && walk.s > 1.0 && t - walk.lastStep > 280) { walk.steps++; walk.lastStep = t; walk.above = true; paintWalk(); }
    if (walk.above && walk.s < 0.1) walk.above = false;
  }
  const hav = (a, b) => { const R = 6371000, r = x => x * Math.PI / 180, dLa = r(b.lat - a.lat), dLo = r(b.lon - a.lon);
    return 2 * R * Math.asin(Math.sqrt(Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2)); };
  function onPos(p) {
    const c = { lat: p.coords.latitude, lon: p.coords.longitude, t: p.timestamp }; walk.acc = p.coords.accuracy;
    if (walk.acc > 30) return paintWalk();
    if (walk.last) {
      const d = hav(walk.last, c), v = d / Math.max(1, (c.t - walk.last.t) / 1000);
      if (d < Math.max(3, walk.acc / 2)) return paintWalk();
      if (v < 3.5) walk.dist += d;                          // abaikan kenderaan (> 12 km/j)
    }
    walk.last = c; paintWalk();
  }
  const walkSteps = () => walk.motion && walk.steps > 0 ? walk.steps : Math.round(walk.dist / stride());
  async function startWalk() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try { await DeviceMotionEvent.requestPermission(); } catch {}
    }
    Object.assign(walk, { on: true, steps: 0, dist: 0, last: null, motion: false, acc: null, s: 0, above: false, t0: performance.now(), tPrev: 0, base: 9.8 });
    addEventListener('devicemotion', onMotion);
    if (navigator.geolocation) walk.watch = navigator.geolocation.watchPosition(onPos, () => { walk.acc = -1; paintWalk(); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    try { walk.lock = await navigator.wakeLock.request('screen'); } catch {}
    paintWalk();
  }
  function stopWalk() {
    removeEventListener('devicemotion', onMotion);
    if (walk.watch != null) navigator.geolocation.clearWatch(walk.watch);
    if (walk.lock) walk.lock.release().catch(() => {});
    const d = today(), n = walkSteps();
    d.langkah += n; d.jarak += walk.dist; save();
    Object.assign(walk, { on: false, watch: null, lock: null });
    toast(n ? `${fmt(n)} langkah disimpan` : 'Tiada langkah dikesan');
    render();
  }
  function paintWalk() {
    const box = $('#shWalk', root); if (!box) return;
    box.innerHTML = walk.on ? `<div class="sh-big num">${fmt(walkSteps())}</div><div class="muted small">langkah sesi ini · ${(walk.dist / 1000).toFixed(2)} km</div>
      <ul class="sh-sensors"><li class="${walk.motion ? 'ok' : ''}">Sensor gerakan: ${walk.motion ? 'aktif' : 'menunggu'}</li><li class="${walk.acc > 0 && walk.acc <= 30 ? 'ok' : ''}">GPS: ${walk.acc == null ? 'mencari isyarat' : walk.acc < 0 ? 'tiada kebenaran lokasi' : `ketepatan ${Math.round(walk.acc)} m`}</li></ul>` : '';
  }

  /* ---------- Paparan ---------- */
  let pending = null;   // hasil analisis sebelum disimpan: { foto, items, nota, yakin, kali: [] }
  const ring = (v, max, label, sub, color) => {
    const r = 42, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, max ? v / max : 0));
    return `<div class="sh-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" class="bg"/><circle cx="50" cy="50" r="${r}" class="fg" style="stroke:${color}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - f)).toFixed(1)}"/></svg><div><b class="num">${fmt(v)}</b><span>${label}</span></div><p class="muted small">${sub}</p></div>`;
  };
  function pendingHTML() {
    if (!pending) return '';
    if (pending.loading) return `<div class="sh-pend">${pending.foto ? `<img src="${pending.foto}" alt="">` : ''}<p class="muted"><span class="spinner"></span> Mengenal pasti makanan dan mengira kalori…</p></div>`;
    const tot = pending.items.reduce((t, i, n) => t + i.kalori * pending.kali[n], 0);
    return `<div class="sh-pend">${pending.foto ? `<img src="${pending.foto}" alt="Gambar makanan">` : ''}
      ${pending.items.length ? `<ul class="sh-items">${pending.items.map((i, n) => `<li><div><b>${esc(i.nama)}</b><span class="muted small">${esc(i.hidangan || '')} · ${fmt(i.berat_g * pending.kali[n])} g · P ${Math.round(i.protein_g * pending.kali[n])} g · K ${Math.round(i.karbohidrat_g * pending.kali[n])} g · L ${Math.round(i.lemak_g * pending.kali[n])} g</span></div>
        <div class="sh-qty"><button type="button" data-q="${n}" data-d="-0.5" aria-label="Kurangkan">−</button><span class="num">×${pending.kali[n]}</span><button type="button" data-q="${n}" data-d="0.5" aria-label="Tambah">+</button></div><b class="num">${fmt(i.kalori * pending.kali[n])}</b></li>`).join('')}</ul>
        <div class="row-between sh-tot"><span>Jumlah</span><b class="num">${fmt(tot)} kcal</b></div>` : ''}
      ${pending.nota ? `<p class="muted small">${esc(pending.nota)}${pending.yakin ? ` Keyakinan: ${esc(pending.yakin)}.` : ''}</p>` : ''}
      ${pending.items.length ? `<div class="inline-form"><select id="shMeal" aria-label="Waktu makan">${MEALS.map(([k, v]) => `<option value="${k}" ${k === mealNow() ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn" type="button" id="shSave">${icon('check')}Simpan ke log</button><button class="btn ghost" type="button" id="shCancel">Batal</button></div>` : `<button class="btn ghost" type="button" id="shCancel">Tutup</button>`}</div>`;
  }
  /* ---------- Langkah telefon: Health Connect (Android) / Apple Health (iOS), dalam app sahaja ----------
     Telefon mengira langkah sepanjang hari walaupun app ditutup; app membaca jumlah harian (baca sahaja). */
  const Health = plugin('Health');
  const hs = { on: store.get('sihat_health', false), busy: false, err: '', at: 0 };
  const healthName = () => Native && Native.getPlatform() === 'ios' ? 'Apple Health' : 'Health Connect';
  async function syncHealth(ask) {
    if (!Health || hs.busy || (!ask && Date.now() - hs.at < 60000)) return;
    hs.busy = true; hs.err = '';
    if (ask) paintHealth();
    try {
      const av = await Health.isAvailable();
      if (!av || !av.available) throw new Error(healthName() === 'Health Connect' ? 'Health Connect belum tersedia. Pasang "Health Connect" daripada Play Store (Android 13 dan lebih lama), kemudian cuba lagi.' : 'Apple Health tidak tersedia pada peranti ini.');
      if (ask) await Health.requestAuthorization({ read: ['steps'], write: [] });
      // Setiap hari ditanya berasingan dari tengah malam waktu tempatan, supaya langkah tidak tersasar hari
      let got = 0;
      for (let i = 6; i >= 0; i--) {
        const a = new Date(); a.setHours(0, 0, 0, 0); a.setDate(a.getDate() - i);
        const b = new Date(a); b.setDate(b.getDate() + 1);
        const r = await Health.queryAggregated({ dataType: 'steps', startDate: a.toISOString(), endDate: (i ? b : new Date()).toISOString(), bucket: 'day', aggregation: 'sum' });
        const n = Math.round((r.samples || []).reduce((t, s) => t + (+s.value || 0), 0));
        if (n > 0 || i === 0) { const k = day(a); const x = L[k] = L[k] || { makan: [], langkah: 0, manual: 0, jarak: 0 }; x.telefon = n; got += n; }
      }
      hs.on = true; hs.at = Date.now(); store.set('sihat_health', true); save();
      if (ask) toast(got ? `Langkah daripada ${healthName()} disegerakkan.` : `Tiada langkah dalam ${healthName()} lagi. Pastikan kebenaran "Langkah" diberikan.`, 4000);
    } catch (e) {
      hs.err = e && e.message && !/^\w+Error$/.test(e.message) ? e.message : `Tidak dapat membaca ${healthName()}.`;
    }
    hs.busy = false;
    if (!walk.on && root.offsetParent) render();
  }
  function healthBlock() {
    const d = today();
    return `<div class="sh-health" id="shHealth">${hs.on && d.telefon != null
      ? `<p><b class="num">${fmt(d.telefon)}</b> langkah hari ini daripada ${healthName()}${hs.at ? ` · dikemas kini ${new Date(hs.at).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
         <button class="link-btn" type="button" id="shHSync" ${hs.busy ? 'disabled' : ''}>${icon('refresh')}${hs.busy ? 'Menyegerak…' : 'Segerak sekarang'}</button>`
      : `<p class="muted small">Telefon anda mengira langkah sepanjang hari, walaupun app ditutup. Sambung ${healthName()} untuk memaparkannya di sini secara automatik (baca sahaja, data kekal dalam peranti).</p>
         <button class="btn ghost" type="button" id="shHSync" ${hs.busy ? 'disabled' : ''}>${icon('refresh')}${hs.busy ? 'Menyambung…' : `Sambung ${healthName()}`}</button>`}
      ${hs.err ? `<p class="error small">${esc(hs.err)}</p>` : ''}</div>`;
  }
  const healthHTML = () => Health ? `${healthBlock()}<p class="muted small">Atau masukkan jumlah secara manual:</p>`
    : `<p class="muted small">Laman web tidak boleh membaca kiraan langkah telefon semasa ditutup. Gunakan app SiswaCap (Android/iOS) untuk menyambung Health Connect atau Apple Health secara automatik, atau masukkan jumlah dari app kesihatan anda:</p>`;
  const paintHealth = () => { const e = $('#shHealth', root); if (e) e.outerHTML = healthBlock(); };

  function weekHTML() {
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
    const t = target().sasaran, rows = days.map(d => { const x = L[day(d)] || { makan: [], langkah: 0, manual: 0 }; return { d, k: eaten(x), s: steps(x) }; });
    const maxK = Math.max(t * 1.2, ...rows.map(r => r.k)), maxS = Math.max(P.sasaranLangkah * 1.2, ...rows.map(r => r.s));
    const wd = new Intl.DateTimeFormat('ms-MY', { weekday: 'short' });
    return `<div class="sh-week">${rows.map(r => `<div class="sh-col"><div class="sh-bars"><span class="k" style="height:${(r.k / maxK * 100).toFixed(1)}%" title="${fmt(r.k)} kcal"></span><span class="s" style="height:${(r.s / maxS * 100).toFixed(1)}%" title="${fmt(r.s)} langkah"></span></div><small>${wd.format(r.d)}</small></div>`).join('')}</div>
      <div class="sh-leg"><span><i class="k"></i>Kalori masuk</span><span><i class="s"></i>Langkah</span></div>`;
  }
  function render() {
    const d = today(), T = target(), k = eaten(d), b = burned(d), b2 = bmi();
    root.innerHTML = `<div class="page-head"><p class="eyebrow">Kesihatan</p><h1 id="h-sihat">Sihat</h1>
        <p class="lead">Ambil gambar makanan untuk kira kalori, kira langkah harian dengan GPS dan sensor telefon, dan pantau sasaran anda.</p></div>
      <div class="sh-grid">
        <div class="card sh-today">
          ${ring(k, T.sasaran, 'kcal masuk', `Sasaran ${fmt(T.sasaran)} · baki ${fmt(Math.max(0, T.sasaran - k + b))} (termasuk ${fmt(b)} dibakar)`, k > T.sasaran + b ? 'var(--down)' : 'var(--brand)')}
          ${ring(steps(d), P.sasaranLangkah, 'langkah', `Sasaran ${fmt(P.sasaranLangkah)} · ${(steps(d) * stride() / 1000).toFixed(1)} km`, 'var(--gold)')}
          <div class="sh-macro">${[['Protein', 'protein_g', 'var(--info)'], ['Karbohidrat', 'karbohidrat_g', 'var(--warn)'], ['Lemak', 'lemak_g', 'var(--purple)']].map(([n, key, c]) => `<div><span class="muted small">${n}</span><b class="num">${Math.round(macro(d, key))} g</b><i style="background:${c}"></i></div>`).join('')}</div>
        </div>

        <div class="card">
          <h2>Tambah makanan</h2>
          <div class="sh-add">
            <label class="btn">${icon('camera')}Ambil gambar<input type="file" id="shCam" accept="image/*" capture="environment" hidden></label>
            <label class="btn ghost">${icon('upload')}Pilih gambar<input type="file" id="shPick" accept="image/*" hidden></label>
          </div>
          <form class="inline-form" id="shText"><input id="shDesc" maxlength="300" placeholder="Atau taip, cth. 2 keping roti canai dan teh tarik"><button class="btn ghost" type="submit">${icon('search')}Kira</button></form>
          <p class="err" id="shErr"></p>
          <div id="shPending">${pendingHTML()}</div>
        </div>

        <div class="card">
          <h2>Makanan hari ini</h2>
          ${d.makan.length ? MEALS.filter(([m]) => d.makan.some(x => x.waktu === m)).map(([m, n]) => `<h4 class="sh-mh">${n}</h4><ul class="sh-log">${d.makan.filter(x => x.waktu === m).map(x => `<li><span>${esc(x.nama)}</span><b class="num">${fmt(x.kalori)}</b><button type="button" class="icon-btn plain" data-del="${x.id}" aria-label="Padam ${esc(x.nama)}">${icon('trash')}</button></li>`).join('')}</ul>`).join('') : '<p class="muted">Belum ada makanan direkodkan hari ini.</p>'}
        </div>

        <div class="card">
          <h2>Langkah</h2>
          <div id="shWalk"></div>
          <div class="actions">${walk.on ? `<button class="btn" type="button" id="shStop">${icon('check')}Berhenti dan simpan</button>` : `<button class="btn" type="button" id="shStart">${icon('pin')}Mula berjalan</button><a class="btn ghost" href="#jejak">${icon('compass')}Jejak dengan peta</a>`}</div>
          <p class="muted small">"Mula berjalan" mengira langkah dengan sensor gerakan dan GPS semasa halaman ini dibuka.</p>
          ${healthHTML()}
          <form class="inline-form" id="shManual"><input id="shMan" type="number" inputmode="numeric" min="0" max="100000" placeholder="Langkah dari app telefon" value="${d.manual || ''}"><button class="btn ghost" type="submit">Simpan</button></form>
        </div>

        <div class="card">
          <h2>7 hari terakhir</h2>
          ${weekHTML()}
        </div>

        <details class="card sh-prof" ${store.get('sihat_profil', null) ? '' : 'open'}>
          <summary><h2>Profil dan sasaran</h2><span class="muted small">BMI ${b2.toFixed(1)} · ${bmiLabel(b2)}</span></summary>
          <form id="shProf" class="form-grid">
            <div class="field"><label for="pJ">Jantina</label><select id="pJ"><option value="l" ${P.jantina === 'l' ? 'selected' : ''}>Lelaki</option><option value="p" ${P.jantina === 'p' ? 'selected' : ''}>Perempuan</option></select></div>
            <div class="field"><label for="pU">Umur</label><input id="pU" type="number" min="10" max="100" value="${P.umur}"></div>
            <div class="field"><label for="pT">Tinggi (cm)</label><input id="pT" type="number" min="100" max="230" value="${P.tinggi}"></div>
            <div class="field"><label for="pB">Berat (kg)</label><input id="pB" type="number" min="25" max="250" step="0.1" value="${P.berat}"></div>
            <div class="field"><label for="pA">Tahap aktiviti</label><select id="pA">${AKTIF.map(([v, n]) => `<option value="${v}" ${v === P.aktif ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
            <div class="field"><label for="pM">Matlamat</label><select id="pM"><option value="turun" ${P.matlamat === 'turun' ? 'selected' : ''}>Turunkan berat (−0.5 kg seminggu)</option><option value="kekal" ${P.matlamat === 'kekal' ? 'selected' : ''}>Kekalkan berat</option><option value="naik" ${P.matlamat === 'naik' ? 'selected' : ''}>Naikkan berat</option></select></div>
            <div class="field"><label for="pS">Sasaran langkah sehari</label><input id="pS" type="number" min="1000" max="40000" step="500" value="${P.sasaranLangkah}"></div>
            <div class="field"><span class="muted small">Kalori asas (BMR) ${fmt(T.bmr)} kcal · keperluan harian ${fmt(T.tdee)} kcal (formula Mifflin-St Jeor)</span><button class="btn" type="submit">Simpan profil</button></div>
          </form>
        </details>
      </div>
      <p class="note">${icon('alert')}<span>Kalori daripada gambar ialah anggaran AI dan boleh tersasar 10 hingga 30 peratus bergantung pada saiz hidangan dan cara masakan. Gambar tidak disimpan. Ini bukan nasihat perubatan; rujuk doktor atau pakar pemakanan untuk keperluan khusus.</span></p>`;
    paintWalk();
  }

  /* ---------- Peristiwa ---------- */
  async function fromImage(file) {
    if (!file) return;
    $('#shErr', root).textContent = '';
    try {
      const s = await shrink(file);
      pending = { loading: true, foto: s.url }; $('#shPending', root).innerHTML = pendingHTML();
      const r = await analyse({ image: s.b64, mime: 'image/jpeg' });
      pending = { foto: s.url, items: r.items, nota: r.nota, yakin: r.yakin, kali: r.items.map(() => 1) };
    } catch (e) { pending = null; $('#shErr', root).textContent = e.message; }
    $('#shPending', root).innerHTML = pendingHTML();
  }
  root.addEventListener('change', e => {
    if (e.target.id === 'shCam' || e.target.id === 'shPick') { const f = e.target.files[0]; e.target.value = ''; fromImage(f); }
  });
  root.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'shText') {
      const text = $('#shDesc', root).value.trim(); if (text.length < 3) return;
      $('#shErr', root).textContent = '';
      pending = { loading: true }; $('#shPending', root).innerHTML = pendingHTML();
      try { const r = await analyse({ text }); pending = { items: r.items, nota: r.nota, yakin: r.yakin, kali: r.items.map(() => 1) }; $('#shDesc', root).value = ''; }
      catch (x) { pending = null; $('#shErr', root).textContent = x.message; }
      $('#shPending', root).innerHTML = pendingHTML();
    } else if (f.id === 'shManual') {
      today().manual = Math.max(0, Math.min(100000, Math.round(+$('#shMan', root).value || 0))); save(); render(); toast('Langkah disimpan');
    } else if (f.id === 'shProf') {
      const v = id => +$('#' + id, root).value;
      P = { jantina: $('#pJ', root).value, umur: v('pU') || 21, tinggi: v('pT') || 165, berat: v('pB') || 60, aktif: v('pA') || 1.375, matlamat: $('#pM', root).value, sasaranLangkah: v('pS') || 8000 };
      store.set('sihat_profil', P); render(); toast('Profil disimpan');
    }
  });
  root.addEventListener('click', e => {
    const q = e.target.closest('[data-q]');
    if (q && pending) { const n = +q.dataset.q; pending.kali[n] = Math.max(0.5, Math.min(5, pending.kali[n] + +q.dataset.d)); $('#shPending', root).innerHTML = pendingHTML(); return; }
    const del = e.target.closest('[data-del]');
    if (del) { const d = today(); d.makan = d.makan.filter(x => x.id !== del.dataset.del); save(); render(); return; }
    const id = e.target.closest('button') && e.target.closest('button').id;
    if (id === 'shCancel') { pending = null; $('#shPending', root).innerHTML = ''; }
    if (id === 'shSave' && pending) {
      const d = today(), waktu = $('#shMeal', root).value;
      pending.items.forEach((i, n) => { const k = pending.kali[n]; d.makan.push({ id: Date.now().toString(36) + n, waktu, nama: i.nama + (k !== 1 ? ` ×${k}` : ''), kalori: Math.round(i.kalori * k), protein_g: i.protein_g * k, karbohidrat_g: i.karbohidrat_g * k, lemak_g: i.lemak_g * k }); });
      pending = null; save(); render(); toast('Disimpan ke log hari ini');
    }
    if (id === 'shStart') startWalk().then(render);
    if (id === 'shHSync') syncHealth(true);
    if (id === 'shStop') stopWalk();
  });
  // Muat semula log apabila halaman dibuka: Jejak Aktiviti boleh menambah langkah dan jarak
  document.addEventListener('viewchange', e => { if (e.detail === 'sihat' && !walk.on) { L = store.get('sihat_log', {}); render(); if (hs.on) syncHealth(false); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && hs.on && root.offsetParent) syncHealth(false); });
  render();
  window.Sihat = { target, _hav: hav };
})();
