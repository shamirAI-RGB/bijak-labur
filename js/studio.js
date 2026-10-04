/* Bijak Labur: Studio Gambar AI. Model FLUX (sama seperti yang dijalankan dalam ComfyUI) di pelayan Bijak Labur.
   Penerangan Bahasa Melayu ditukar kepada prompt terperinci dan disemak keselamatannya sebelum gambar dijana.
   Galeri disimpan dalam peranti ini sahaja. */
(function () {
  const root = $('#view-studio');
  if (!root) return;
  const API = (store.get('fiqh_api', '') || 'https://fiqh.bijaklabur.my').replace(/\/$/, '');
  const GAYA = [['realistik', 'Realistik'], ['ilustrasi', 'Ilustrasi'], ['anime', 'Anime'], ['catair', 'Cat air'], ['3d', '3D'], ['poster', 'Poster'], ['batik', 'Batik']];
  const IDEA = [
    'Kucing oren comel makan nasi lemak atas daun pisang',
    'Rumah kampung tradisional Melayu waktu matahari terbit, sawah padi',
    'Menara Berkembar Petronas pada waktu malam dengan bunga api',
    'Pelajar universiti belajar di perpustakaan moden, suasana tenang',
    'Gerai teh tarik di tepi jalan Kuala Lumpur pada waktu hujan',
    'Hutan hujan Malaysia dengan burung enggang dan air terjun',
    'Logo kedai kopi ringkas dengan cawan dan biji kopi'
  ];
  const KEY = 'studio_galeri', MAX_KEEP = 8;

  let S = { prompt: '', gaya: 'realistik', busy: false, t0: 0, err: '', cur: null, timer: null };
  let galeri = [];
  try { galeri = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(galeri)) galeri = []; } catch { galeri = []; }

  function keep(item) {
    galeri = [item, ...galeri.filter(g => g.id !== item.id)].slice(0, MAX_KEEP);
    // Kuota storan pelayar terhad: buang gambar paling lama sehingga muat
    for (let n = galeri.length; n > 0; n--) {
      try { localStorage.setItem(KEY, JSON.stringify(galeri.slice(0, n))); galeri = galeri.slice(0, n); return; } catch {}
    }
  }
  const src = g => `data:${g.mime || 'image/jpeg'};base64,${g.image}`;
  const label = k => (GAYA.find(([v]) => v === k) || [k, k])[1];

  function resultHTML() {
    if (S.busy) {
      const s = Math.floor((Date.now() - S.t0) / 1000);
      return `<div class="st-stage st-wait" role="status"><div class="st-spin" aria-hidden="true"></div><p><b>Menjana gambar…</b><br><span class="muted small">${s < 4 ? 'Menyediakan prompt' : 'FLUX sedang melukis'} · ${s} s</span></p></div>`;
    }
    if (S.err) return `<div class="st-stage st-empty"><p class="error">${esc(S.err)}</p></div>`;
    const g = S.cur;
    if (!g) return `<div class="st-stage st-empty">${icon('camera')}<p class="muted">Gambar anda akan dipaparkan di sini.</p></div>`;
    return `<figure class="st-stage st-out"><img src="${src(g)}" alt="${esc(g.prompt)}" width="1024" height="1024">
        <figcaption>
          <div class="st-actions">
            <a class="btn" href="${src(g)}" download="bijak-labur-${g.seed}.jpg">${icon('download')}Muat turun</a>
            <button class="btn ghost" type="button" data-act="variasi">${icon('refresh')}Variasi lain</button>
            ${navigator.share ? `<button class="btn ghost" type="button" data-act="kongsi">${icon('share')}Kongsi</button>` : ''}
          </div>
          <details class="st-prompt"><summary>Prompt yang digunakan (${esc(label(g.gaya))} · seed ${g.seed})</summary><p>${esc(g.prompt_en || g.prompt)}</p></details>
        </figcaption></figure>`;
  }

  function render() {
    root.innerHTML = `<div class="page-head"><p class="eyebrow">Kreatif</p><h1 id="h-studio">Studio Gambar AI</h1>
        <p class="lead">Terangkan gambar dalam Bahasa Melayu dan AI melukisnya dalam beberapa saat. Dikuasakan oleh FLUX, model sumber terbuka yang sama digunakan dalam ComfyUI.</p></div>
      <div class="st-grid">
        <form class="card st-form" id="stForm">
          <div class="field"><label for="stPrompt">Apa yang anda mahu lukis?</label>
            <textarea id="stPrompt" rows="4" maxlength="400" placeholder="Contoh: kucing oren comel makan nasi lemak atas daun pisang" required>${esc(S.prompt)}</textarea>
            <span class="muted small st-count" id="stCount">${S.prompt.length}/400</span></div>
          <p class="st-lbl">Gaya</p>
          <div class="st-gaya" role="radiogroup" aria-label="Gaya gambar">${GAYA.map(([v, n]) => `<button type="button" class="chip${S.gaya === v ? ' active' : ''}" role="radio" aria-checked="${S.gaya === v}" data-gaya="${v}">${n}</button>`).join('')}</div>
          <button class="btn st-go" type="submit" ${S.busy ? 'disabled' : ''}>${icon('star')}${S.busy ? 'Menjana…' : 'Jana gambar'}</button>
          <p class="st-lbl">Idea</p>
          <div class="st-idea">${IDEA.map(t => `<button type="button" class="link-btn" data-idea="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        </form>
        <div class="card st-res" id="stRes" aria-live="polite">${resultHTML()}</div>
      </div>
      ${galeri.length ? `<div class="card"><div class="row-between"><h2>Galeri anda</h2><button class="link-btn" type="button" data-act="padam">${icon('trash')}Padam semua</button></div>
        <div class="st-gal">${galeri.map(g => `<button type="button" class="st-thumb" data-id="${esc(g.id)}" aria-label="Buka: ${esc(g.prompt)}"><img src="${src(g)}" alt="" loading="lazy" width="160" height="160"></button>`).join('')}</div>
        <p class="muted small">Disimpan dalam peranti ini sahaja (${galeri.length} gambar terkini).</p></div>` : ''}
      <p class="note">${icon('alert')}<span>Gambar dijana oleh AI dan mungkin tidak tepat. Permintaan kandungan lucah, ganas, kebencian, orang sebenar yang dikenali, dokumen palsu atau gambaran para nabi akan ditolak. Penerangan anda dihantar kepada Google (Gemini) dan Cloudflare (FLUX) untuk menjana gambar, dan tidak disimpan di pelayan Bijak Labur. Jangan gunakan gambar AI untuk menipu atau menyamar.</span></p>`;
  }
  const paintResult = () => { const r = $('#stRes', root); if (r) r.innerHTML = resultHTML(); };

  async function jana(seed) {
    if (S.busy) return;
    const prompt = S.prompt.replace(/\s+/g, ' ').trim();
    if (prompt.length < 3) { toast('Terangkan gambar yang anda mahu dahulu.'); $('#stPrompt', root).focus(); return; }
    Object.assign(S, { busy: true, err: '', t0: Date.now() });
    render();
    const show = () => { const r = $('#stRes', root); if (r && innerWidth < 900) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    show();
    S.timer = setInterval(paintResult, 1000);
    try {
      const r = await fetch(API + '/gambar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, gaya: S.gaya, ...(seed ? { seed } : {}) }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.image) throw new Error(d.error || 'Studio gambar tidak tersedia buat masa ini.');
      S.cur = { id: `${Date.now()}`, prompt, gaya: S.gaya, seed: d.seed, image: d.image, mime: d.mime, prompt_en: d.prompt_en };
      keep(S.cur);
    } catch (e) {
      S.err = e.message && !/fetch|network/i.test(e.message) ? e.message : 'Tiada sambungan internet. Cuba lagi.';
    }
    clearInterval(S.timer);
    S.busy = false;
    if (location.hash.replace('#', '').split('/')[0] === 'studio') { render(); show(); }
  }

  root.addEventListener('input', e => {
    if (e.target.id === 'stPrompt') { S.prompt = e.target.value; const c = $('#stCount', root); if (c) c.textContent = `${S.prompt.length}/400`; }
  });
  root.addEventListener('submit', e => { if (e.target.id === 'stForm') { e.preventDefault(); jana(); } });
  root.addEventListener('click', async e => {
    const g = e.target.closest('[data-gaya]');
    if (g) { S.gaya = g.dataset.gaya; $$('[data-gaya]', root).forEach(b => { const on = b === g; b.classList.toggle('active', on); b.setAttribute('aria-checked', on); }); return; }
    const idea = e.target.closest('[data-idea]');
    if (idea) { S.prompt = idea.dataset.idea; const t = $('#stPrompt', root); t.value = S.prompt; $('#stCount', root).textContent = `${S.prompt.length}/400`; t.focus(); return; }
    const th = e.target.closest('.st-thumb');
    if (th) {
      const item = galeri.find(x => x.id === th.dataset.id);
      if (item) { Object.assign(S, { cur: item, err: '', prompt: item.prompt, gaya: item.gaya }); render(); $('#stRes', root).scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'variasi' && S.cur) { S.prompt = S.cur.prompt; S.gaya = S.cur.gaya; jana(); }
    if (act.dataset.act === 'padam' && confirm('Padam semua gambar dalam galeri peranti ini?')) {
      galeri = []; try { localStorage.removeItem(KEY); } catch {} render();
    }
    if (act.dataset.act === 'kongsi' && S.cur) {
      try {
        const bin = atob(S.cur.image), buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        const blob = new Blob([buf], { type: S.cur.mime || 'image/jpeg' });
        const file = new File([blob], `bijak-labur-${S.cur.seed}.jpg`, { type: blob.type });
        await navigator.share({ files: [file], title: 'Gambar AI daripada Bijak Labur', text: S.cur.prompt });
      } catch (err) { if (err && err.name !== 'AbortError') toast('Gambar tidak dapat dikongsi pada peranti ini.'); }
    }
  });
  document.addEventListener('viewchange', e => { if (e.detail === 'studio' && !S.busy) render(); });
  render();
})();
