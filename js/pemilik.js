/* Bijak Labur: Mod Pemilik. Pemilik log masuk dengan kunci pemilik (sama seperti Kedai Nota) dan boleh:
   1. Menyunting teks laman secara langsung (tajuk, penerangan, kad halaman utama, nota, kaki laman) di semua
      halaman. Perubahan disimpan di pelayan nota (/admin/kandungan) dan dipaparkan kepada semua pengguna laman
      dan app tanpa terbitan baharu.
   2. Mengurus 4 ruang iklan halaman utama (gambar, tajuk, teks, pautan, tempoh, kiraan klik).
   Pintu masuk dipaparkan dalam app; di laman web, hanya selepas kunci pemilik disimpan dalam peranti itu
   (contohnya melalui Kedai Nota). Teks dipaparkan dengan textContent sahaja (tiada HTML). */
(function () {
  const API = (store.get('nota_api', '') || 'https://nota.bijaklabur.my').replace(/\/$/, '');
  const key = () => store.get('nota_key', '');
  let teks = store.get('kandungan_cache', {}) || {};
  let editing = false;
  const pending = {};

  /* ---------- Kunci untuk setiap teks yang boleh disunting ---------- */
  const slug = s => String(s || '').toLowerCase().replace(/^#/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'x';
  const textOnly = el => el.children.length === 0;            // elemen dengan pautan atau ikon tidak disentuh
  function assignKeys(scope) {
    const views = scope.matches && scope.matches('.view') ? [scope] : $$('.view', scope);
    if (scope.closest) { const v = scope.closest('.view'); if (v && !views.includes(v)) views.push(v); }
    for (const v of views) {
      const view = v.id.replace(/^view-/, '');
      // Elemen ber-id biasanya dikemas kini oleh skrip (cth. ucapan, kiraan), kecuali tajuk aria "h-..."
      const set = (el, k) => { if (el && !el.dataset.edit && (!el.id || /^h-/.test(el.id)) && textOnly(el)) el.dataset.edit = `${view}.${k}`; };
      set($('.page-head h1', v), 'judul');
      set($('.page-head .lead', v), 'lead');
      set($('.page-head .eyebrow', v), 'label');
      $$('.card.shortcut', v).forEach(c => { const h = slug(c.getAttribute('href')); set($('.sc-title', c), `kad.${h}.tajuk`); if (!$('.sc-sub', c)?.hasAttribute('data-premium-sub')) set($('.sc-sub', c), `kad.${h}.sub`); });
      $$('.block-head h2, .card > h2', v).forEach((el, i) => set(el, el.id ? el.id : `h2.${i}`));
      $$('.note > span', v).forEach((el, i) => set(el, `nota.${i}`));
    }
    if (scope === document) $$('.site-footer p').forEach((el, i) => { if (!el.dataset.edit && textOnly(el)) el.dataset.edit = `kaki.${i}`; });
  }

  /* ---------- Gunakan teks yang diubah oleh pemilik ---------- */
  function apply(scope = document) {
    for (const el of $$('[data-edit]', scope)) {
      if (editing && el === document.activeElement) continue;
      const k = el.dataset.edit, v = teks[k];
      if (!('asal' in el.dataset)) el.dataset.asal = el.textContent;
      const want = v != null ? v : el.dataset.asal;
      if (el.textContent !== want) el.textContent = want;
      if (editing) makeEditable(el);
    }
  }
  async function loadText() {
    try {
      const r = await fetch(API + '/kandungan');
      if (!r.ok) return;
      teks = (await r.json()).teks || {}; store.set('kandungan_cache', teks); apply();
    } catch {}
  }
  const mo = new MutationObserver(list => {
    for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) { assignKeys(n); apply(n.matches('[data-edit]') ? n.parentNode : n); }
  });

  /* ---------- Panggilan pemilik ---------- */
  async function api(path, opt = {}) {
    const r = await fetch(API + path, { ...opt, headers: { Authorization: 'Bearer ' + key(), ...(opt.headers || {}) } });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { store.set('nota_key', ''); paintEntry(); throw new Error('Kunci pemilik tidak sah. Sila log masuk semula.'); }
    if (!r.ok) throw new Error(d.error || 'Ralat pelayan. Cuba lagi.');
    return d;
  }

  /* ---------- Dialog ---------- */
  function dialog(html, onBind) {
    const d = document.createElement('dialog');
    d.className = 'nt-dialog pm-dialog';
    d.innerHTML = `<button class="icon-btn plain nt-x" data-close aria-label="Tutup">${icon('x')}</button>${html}`;
    document.body.appendChild(d);
    d.addEventListener('close', () => d.remove());
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.showModal();
    if (onBind) onBind(d);
    return d;
  }

  function loginDialog(then) {
    dialog(`<h2>Mod Pemilik</h2><p class="muted small">Masukkan kunci pemilik Bijak Labur (sama seperti Kedai Nota).</p>
      <form id="pmLogin"><div class="field"><label for="pmKey">Kunci pemilik</label><input id="pmKey" type="password" autocomplete="current-password" required minlength="12"></div>
      <p class="error small hidden" id="pmErr"></p><button class="btn block" type="submit">Log masuk</button></form>`, d => {
      $('#pmKey', d).focus();
      $('#pmLogin', d).addEventListener('submit', async e => {
        e.preventDefault();
        const btn = $('button[type=submit]', d); btn.disabled = true;
        store.set('nota_key', $('#pmKey', d).value.trim());
        try { await api('/admin/check'); d.close(); toast('Log masuk sebagai pemilik.'); paintEntry(); then && then(); }
        catch (err) { store.set('nota_key', ''); const el = $('#pmErr', d); el.textContent = /Kunci/.test(err.message) ? 'Kunci pemilik salah.' : err.message; el.classList.remove('hidden'); btn.disabled = false; }
      });
    });
  }

  function panel() {
    if (!key()) return loginDialog(panel);
    dialog(`<h2>Mod Pemilik</h2><p class="muted small">Perubahan dipaparkan kepada semua pengguna laman dan app dalam masa kira-kira seminit, tanpa terbitan app baharu.</p>
      <div class="pm-menu">
        <button class="km-item" type="button" data-pm="sunting">${icon('type')}<span><b>Sunting teks laman</b><small class="muted">Klik pada tajuk, penerangan atau kad di mana-mana halaman untuk mengubahnya</small></span></button>
        <button class="km-item" type="button" data-pm="iklan">${icon('star')}<span><b>Urus iklan (4 ruang)</b><small class="muted">Gambar, tajuk, pautan, tempoh dan kiraan klik</small></span></button>
        <a class="km-item" href="#nota" data-close>${icon('bookmark')}<span><b>Kedai nota</b><small class="muted">Tambah nota, QR bayaran dan WhatsApp</small></span></a>
        <a class="km-item" href="pejabat-agen.html">${icon('grid')}<span><b>Pejabat AI Agent</b><small class="muted">8 agen animasi dan status langsung, hanya untuk pemilik</small></span></a>
        <button class="km-item" type="button" data-pm="reset">${icon('refresh')}<span><b>Kembalikan semua teks asal</b><small class="muted">Buang semua perubahan teks</small></span></button>
        <button class="km-item" type="button" data-pm="keluar">${icon('door')}<span><b>Log keluar pemilik</b><small class="muted">Kunci dibuang daripada peranti ini</small></span></button>
      </div>`, d => d.addEventListener('click', async e => {
        const b = e.target.closest('[data-pm]'); if (!b) return;
        const act = b.dataset.pm;
        if (act === 'sunting') { d.close(); startEdit(); }
        if (act === 'iklan') { d.close(); adsDialog(); }
        if (act === 'keluar') { store.set('nota_key', ''); d.close(); stopEdit(true); paintEntry(); toast('Log keluar daripada Mod Pemilik.'); }
        if (act === 'reset' && confirm('Kembalikan semua teks laman kepada asal? Tindakan ini tidak boleh dibatalkan.')) {
          try { const patch = Object.fromEntries(Object.keys(teks).map(k => [k, null])); const r = await api('/admin/kandungan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teks: patch }) }); teks = r.teks; store.set('kandungan_cache', teks); apply(); toast('Semua teks dikembalikan kepada asal.'); }
          catch (err) { toast(err.message); }
        }
      }));
  }

  /* ---------- Sunting teks secara langsung ---------- */
  function makeEditable(el) { if (!el.isContentEditable) { try { el.contentEditable = 'plaintext-only'; } catch {} if (!el.isContentEditable) el.contentEditable = 'true'; el.spellcheck = true; } }
  function startEdit() {
    editing = true;
    document.documentElement.classList.add('pm-editing');
    assignKeys(document); apply();
    if (!$('#pmBar')) {
      const bar = document.createElement('div');
      bar.id = 'pmBar'; bar.className = 'pm-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Mod sunting');
      bar.innerHTML = `<span><b>Mod sunting</b> <span class="muted small" id="pmCount">Klik teks bergaris untuk ubah</span></span>
        <button class="btn ghost sm" type="button" data-pmb="batal">Batal</button><button class="btn sm" type="button" data-pmb="simpan">${icon('check')}Simpan</button>`;
      document.body.appendChild(bar);
      bar.addEventListener('click', e => { const b = e.target.closest('[data-pmb]'); if (!b) return; b.dataset.pmb === 'simpan' ? save() : stopEdit(true); });
    }
    toast('Mod sunting: klik pada teks bergaris untuk mengubahnya, kemudian tekan Simpan.', 4500);
  }
  function stopEdit(discard) {
    editing = false;
    document.documentElement.classList.remove('pm-editing');
    $$('[data-edit][contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    if (discard) for (const k of Object.keys(pending)) delete pending[k];
    $('#pmBar')?.remove();
    apply();
  }
  const count = () => { const n = Object.keys(pending).length, c = $('#pmCount'); if (c) c.textContent = n ? `${n} perubahan belum disimpan` : 'Klik teks bergaris untuk ubah'; };
  document.addEventListener('input', e => {
    const el = e.target.closest && e.target.closest('[data-edit]');
    if (!editing || !el) return;
    const v = el.textContent.replace(/\s+/g, ' ').trim();
    pending[el.dataset.edit] = v === (el.dataset.asal || '').replace(/\s+/g, ' ').trim() ? null : v;
    count();
  });
  // Semasa menyunting: jangan ikut pautan kad dan elakkan baris baharu
  document.addEventListener('click', e => { const a = editing && e.target.closest('a'); if (a && a.querySelector('[data-edit]')) e.preventDefault(); }, true);
  document.addEventListener('keydown', e => { if (editing && e.key === 'Enter' && e.target.closest && e.target.closest('[data-edit]')) { e.preventDefault(); e.target.blur(); } });
  async function save() {
    if (!Object.keys(pending).length) { stopEdit(); return; }
    try {
      const r = await api('/admin/kandungan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teks: pending }) });
      teks = r.teks; store.set('kandungan_cache', teks);
      const n = Object.keys(pending).length; stopEdit(true);
      toast(`${n} perubahan disimpan dan kini dipaparkan kepada semua pengguna.`, 4000);
    } catch (err) { toast(err.message, 4000); }
  }

  /* ---------- Urus iklan ---------- */
  async function adsDialog() {
    let slots;
    try { slots = (await api('/admin/iklan')).slots; } catch (err) { toast(err.message); return; }
    const form = s => `<form class="pm-ad" data-slot="${s.slot}">
        <div class="row-between"><h3>Ruang ${s.slot} ${s.live ? '<span class="pm-live">Sedang dipaparkan</span>' : s.tajuk ? '<span class="muted small">Tidak dipaparkan</span>' : '<span class="muted small">Kosong</span>'}</h3>
          <span class="muted small">Klik: ${s.klik.bulanIni} bulan ini · ${s.klik.bulanLepas} bulan lepas</span></div>
        ${s.gambar ? `<img class="pm-img" src="${esc(API + s.gambar)}" alt="">` : ''}
        <div class="field"><label>Tajuk</label><input name="tajuk" maxlength="60" value="${esc(s.tajuk || '')}"></div>
        <div class="field"><label>Teks ringkas</label><input name="teks" maxlength="160" value="${esc(s.teks || '')}"></div>
        <div class="field"><label>Nama pengiklan</label><input name="nama" maxlength="60" value="${esc(s.nama || '')}"></div>
        <div class="field"><label>Pautan (https://...)</label><input name="url" type="url" maxlength="500" placeholder="https://" value="${esc(s.url || '')}"></div>
        <div class="pm-two"><div class="field"><label>Mula</label><input name="mula" type="date" value="${esc(s.mula || '')}"></div><div class="field"><label>Tamat</label><input name="tamat" type="date" value="${esc(s.tamat || '')}"></div></div>
        <div class="field"><label>Gambar (PNG/JPG/WebP, nisbah 16:9, had 2 MB)</label><input name="gambar" type="file" accept="image/png,image/jpeg,image/webp"></div>
        ${s.gambar ? '<label class="bk-on"><input type="checkbox" name="buangGambar" value="1"><span class="small">Buang gambar</span></label>' : ''}
        <label class="bk-on"><input type="checkbox" name="aktif" ${s.aktif ? 'checked' : ''}><span class="small">Paparkan iklan ini</span></label>
        <div class="row-gap"><button class="btn sm" type="submit">${icon('check')}Simpan ruang ${s.slot}</button>${s.tajuk ? `<button class="link-btn" type="button" data-kosong="${s.slot}">${icon('trash')}Kosongkan</button>` : ''}</div>
      </form>`;
    dialog(`<h2>Urus iklan</h2><p class="muted small">4 ruang di halaman utama. Iklan dilabel "Iklan" dan klik dikira tanpa menjejak pengguna. Pastikan iklan halal, benar dan tidak mengelirukan.</p>${slots.map(form).join('')}`, d => {
      d.addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target, btn = $('button[type=submit]', f); btn.disabled = true;
        const fd = new FormData(f);
        if (fd.get('aktif')) fd.set('aktif', '1');
        if (!(fd.get('gambar') && fd.get('gambar').size)) fd.delete('gambar');
        try { const r = await api(`/admin/iklan/${f.dataset.slot}`, { method: 'PUT', body: fd }); toast(r.live ? `Ruang ${f.dataset.slot} disimpan dan dipaparkan.` : `Ruang ${f.dataset.slot} disimpan (tidak dipaparkan).`); window.Iklan && Iklan.reload(); d.close(); adsDialog(); }
        catch (err) { toast(err.message, 4000); btn.disabled = false; }
      });
      d.addEventListener('click', async e => {
        const k = e.target.closest('[data-kosong]'); if (!k || !confirm(`Kosongkan ruang ${k.dataset.kosong}?`)) return;
        try { await api(`/admin/iklan/${k.dataset.kosong}`, { method: 'DELETE' }); toast(`Ruang ${k.dataset.kosong} dikosongkan.`); window.Iklan && Iklan.reload(); d.close(); adsDialog(); }
        catch (err) { toast(err.message); }
      });
    });
  }

  /* ---------- Pintu masuk dalam menu ---------- */
  function paintEntry() {
    const b = $('#kmOwner'); if (!b) return;
    b.classList.toggle('hidden', !(Native || key()));
    const t = $('span', b); if (t) t.textContent = key() ? 'Mod Pemilik' : 'Log masuk pemilik';
  }
  $('#kmOwner')?.addEventListener('click', () => { window.Menu && Menu.close(); panel(); });
  paintEntry();

  assignKeys(document); apply();
  mo.observe(document.body, { childList: true, subtree: true });
  loadText();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !editing) loadText(); });
  window.Pemilik = { panel, startEdit };
})();
