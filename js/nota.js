/* Bijak Labur: kedai nota IC220. Orang awam melihat senarai, pratonton dan harga; pembelian melalui QR dan WhatsApp.
   Pemilik log masuk dengan kunci pemilik untuk menambah, menyunting dan memadam nota bila-bila masa.
   Fail penuh hanya boleh dimuat turun oleh pemilik atau melalui pautan pembeli yang dijana pemilik. */
(function () {
  const root = $('#view-nota');
  if (!root) return;
  const API = (store.get('nota_api', '') || 'https://nota.bijaklabur.my').replace(/\/$/, '');
  const DEFAULTS = {
    wa: [{ no: '60102546720', label: 'WhatsApp 1' }, { no: '60176040973', label: 'WhatsApp 2' }],
    msg: 'Hi saya berminat nak beli nota untuk belajar',
    payNote: 'Imbas kod QR untuk bayar, kemudian hantar resit melalui WhatsApp. Nota akan dihantar kepada anda.',
    qr: ''
  };
  let S = { notes: null, settings: { ...DEFAULTS }, error: '', q: '', key: store.get('nota_key', ''), tab: 'tambah', loaded: false };
  const cached = store.get('nota_cache', null);
  if (cached) Object.assign(S, { notes: cached.notes, settings: { ...DEFAULTS, ...cached.settings } });

  /* ---------- Utiliti ---------- */
  const rm = n => 'RM ' + Number(n || 0).toFixed(2);
  const size = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const phone = no => { const d = String(no).replace(/^60/, '0'); return d.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2 $3'); };
  const waLink = (no, text) => `https://wa.me/${no}?text=${encodeURIComponent(text)}`;
  const img = path => path ? API + path : '';
  const owner = () => !!S.key;

  async function api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (S.key && path.startsWith('/admin')) headers.Authorization = 'Bearer ' + S.key;
    if (opts.json !== undefined) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(opts.json); }
    const r = await fetch(API + path, { method: opts.method || 'GET', headers, body: opts.body, cache: 'no-store' });
    if (opts.raw) { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Gagal (' + r.status + ')'); return r; }
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && path.startsWith('/admin')) { logout(); throw new Error('Kunci pemilik tidak sah. Sila log masuk semula.'); }
    if (!r.ok) throw new Error(j.error || 'Gagal (' + r.status + ')');
    return j;
  }

  async function load() {
    try {
      const j = await api(owner() ? '/admin/notes' : '/notes');
      S.notes = j.notes; S.settings = { ...DEFAULTS, ...j.settings }; S.error = '';
      if (!owner()) store.set('nota_cache', { notes: j.notes, settings: j.settings });
    } catch (e) {
      S.error = navigator.onLine === false ? 'Anda di luar talian.' : 'Senarai nota belum dapat dimuatkan. ' + e.message;
      if (!S.notes) S.notes = [];
    }
    S.loaded = true;
    render();
  }

  function logout() { S.key = ''; store.set('nota_key', ''); }

  /* ---------- Paparan ---------- */
  function render() {
    const notes = (S.notes || []).filter(n => !S.q || (n.title + ' ' + n.code + ' ' + (n.desc || '')).toLowerCase().includes(S.q.toLowerCase()));
    root.innerHTML = `
      <div class="page-head with-aside">
        <div>
          <p class="eyebrow">Untuk pelajar IC220, UiTM</p>
          <h1 id="h-nota">Nota IC220</h1>
          <p class="lead">Nota Ijazah Sarjana Muda Pengurusan Industri Halal yang disusun oleh pengasas Bijak Labur. Lihat pratonton dan harga, bayar melalui QR, dan terima nota melalui WhatsApp.</p>
        </div>
        ${owner() ? `<div class="nt-head-acts"><span class="nt-badge">${icon('lock')}Mod pemilik</span><button class="btn sm ghost" data-act="logout">Log keluar</button></div>` : ''}
      </div>
      ${owner() ? adminHTML() : ''}
      ${buyHTML()}
      ${S.error ? `<p class="nt-msg">${icon('alert')}<span>${esc(S.error)}</span></p>` : ''}
      <div class="block-head"><h2>Senarai nota</h2>${(S.notes || []).length > 4 ? `<input type="search" class="nt-search" id="ntSearch" placeholder="Cari kod atau tajuk" value="${esc(S.q)}" aria-label="Cari nota">` : ''}</div>
      ${!S.loaded && !S.notes ? '<div class="nt-grid">' + '<div class="card nt-card nt-skel"></div>'.repeat(3) + '</div>'
        : notes.length ? `<div class="nt-grid">${notes.map(cardHTML).join('')}</div>`
        : `<div class="card nt-empty">${icon('book')}<p>${S.q ? 'Tiada nota sepadan dengan carian.' : owner() ? 'Belum ada nota. Tambah nota pertama anda di ruang pemilik di atas.' : 'Nota baharu akan dimuat naik tidak lama lagi. Hubungi kami melalui WhatsApp untuk bertanya.'}</p></div>`}
      ${owner() ? '' : `<p class="nt-owner-link"><button type="button" class="link-btn" data-act="login">${icon('lock')}Ruang pemilik</button></p>`}`;
    bind();
  }

  function buyHTML(note) {
    const s = S.settings, text = note ? `${s.msg}\n\nNota: ${note.code ? note.code + ' · ' : ''}${note.title} (${rm(note.price)})` : s.msg;
    return `<div class="card nt-buy${note ? ' in-dialog' : ''}">
      <div class="nt-buy-b">
        ${note ? '' : '<h2>Cara membeli</h2>'}
        <ol class="nt-steps">
          <li><span><b>Pilih nota</b> dan semak pratonton serta harganya.</span></li>
          <li><span><b>Bayar</b> dengan mengimbas kod QR${s.qr ? '' : ' (kod QR akan dipaparkan di sini)'}.</span></li>
          <li><span><b>Hantar resit</b> melalui WhatsApp, dan nota akan dihantar kepada anda.</span></li>
        </ol>
        ${s.payNote ? `<p class="nt-paynote">${esc(s.payNote)}</p>` : ''}
        <div class="nt-wa">${s.wa.map(w => `<a class="btn nt-wa-btn" href="${esc(waLink(w.no, text))}" target="_blank" rel="noopener">${icon('chat')}<span>${esc(w.label)}<small>${esc(phone(w.no))}</small></span></a>`).join('')}</div>
      </div>
      ${s.qr ? `<figure class="nt-qr"><img src="${esc(img(s.qr))}" alt="Kod QR pembayaran" loading="lazy"><figcaption>Imbas untuk bayar</figcaption></figure>` : ''}
    </div>`;
  }

  function cardHTML(n) {
    return `<article class="card nt-card${n.hidden ? ' is-hidden' : ''}" data-id="${esc(n.id)}">
      <div class="nt-cover">${n.preview ? `<img src="${esc(img(n.preview))}" alt="Pratonton ${esc(n.title)}" loading="lazy">` : `<div class="nt-ph"><b>${esc(n.code || 'IC220')}</b><span>${esc((n.ext || 'pdf').toUpperCase())}</span></div>`}
        ${n.code ? `<span class="nt-code">${esc(n.code)}</span>` : ''}${n.hidden ? '<span class="nt-code nt-hid">Tersembunyi</span>' : ''}</div>
      <div class="nt-body">
        <h3>${esc(n.title)}</h3>
        ${n.desc ? `<p class="nt-desc">${esc(n.desc)}</p>` : ''}
        <p class="nt-meta">${[n.pages ? n.pages + ' muka surat' : '', (n.ext || '').toUpperCase(), n.size ? size(n.size) : ''].filter(Boolean).map(esc).join(' · ')}</p>
        <div class="nt-foot"><span class="nt-price num">${n.price ? rm(n.price) : 'Percuma'}</span><button class="btn sm" data-act="buy">${icon('chat')}Beli</button></div>
        ${owner() ? `<div class="nt-admin-acts">
          <button class="btn sm ghost" data-act="edit">${icon('sliders')}Sunting</button>
          <button class="btn sm ghost" data-act="link">${icon('link')}Pautan pembeli</button>
          <button class="btn sm ghost" data-act="dl">${icon('download')}Muat turun</button>
          <button class="btn sm ghost" data-act="toggle">${n.hidden ? 'Paparkan' : 'Sembunyikan'}</button>
          <button class="btn sm ghost nt-danger" data-act="del">${icon('trash')}Padam</button>
        </div>` : ''}
      </div>
    </article>`;
  }

  function adminHTML() {
    const s = S.settings, wa = [...s.wa, { no: '', label: '' }, { no: '', label: '' }].slice(0, Math.max(2, Math.min(4, s.wa.length + 1)));
    return `<section class="card nt-admin" aria-label="Ruang pemilik">
      <div class="nt-admin-top"><h2>Ruang pemilik</h2>
        <div class="segmented small" role="tablist" aria-label="Ruang pemilik">
          ${[['tambah', 'Tambah nota'], ['kedai', 'Tetapan kedai'], ['kunci', 'Kunci']].map(([k, t]) => `<button role="tab" class="seg${S.tab === k ? ' active' : ''}" data-tab="${k}" aria-selected="${S.tab === k}">${t}</button>`).join('')}
        </div></div>
      ${S.tab === 'tambah' ? `<form id="ntAdd" class="nt-form">
        <label class="nt-drop" id="ntDrop">${icon('upload')}<span id="ntDropT"><b>Pilih fail nota</b> atau seret ke sini<small>PDF, Word, PowerPoint, Excel, ZIP atau gambar. Had 24 MB.</small></span>
          <input type="file" id="ntFile" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg" required></label>
        <div class="nt-form-grid">
          <div class="nt-prev-wrap"><div class="nt-prev" id="ntPrev"><span>Pratonton</span></div>
            <label class="link-btn nt-cover-btn">Tukar gambar pratonton<input type="file" id="ntCover" accept="image/png,image/jpeg,image/webp" hidden></label></div>
          <div>
            <div class="field"><label for="ntTitle">Tajuk</label><input id="ntTitle" required maxlength="120" placeholder="cth. Nota Pengenalan Industri Halal Bab 1 hingga 5"></div>
            <div class="nt-row">
              <div class="field"><label for="ntCode">Kod kursus</label><input id="ntCode" maxlength="20" placeholder="cth. HIM101"></div>
              <div class="field"><label for="ntPrice">Harga (RM)</label><input id="ntPrice" inputmode="decimal" placeholder="0.00" required></div>
              <div class="field"><label for="ntPages">Muka surat</label><input id="ntPages" inputmode="numeric" placeholder="Auto"></div>
            </div>
            <div class="field"><label for="ntDesc">Penerangan (pilihan)</label><textarea id="ntDesc" rows="3" maxlength="1000" placeholder="Apa yang ada dalam nota ini"></textarea></div>
            <label class="check"><input type="checkbox" id="ntHidden"><span>Simpan sebagai tersembunyi dahulu (orang awam tidak nampak)</span></label>
            <button class="btn" type="submit" id="ntSubmit">${icon('upload')}Muat naik nota</button>
            <div class="nt-progress hidden" id="ntProg"><span></span></div>
          </div>
        </div>
      </form>` : ''}
      ${S.tab === 'kedai' ? `<form id="ntShop" class="nt-form">
        <div class="nt-shop-grid">
          <div>
            <h3>Nombor WhatsApp</h3>
            ${wa.map((w, i) => `<div class="nt-row nt-wa-row"><div class="field"><label for="ntWaNo${i}">Nombor ${i + 1}</label><input id="ntWaNo${i}" data-wa-no inputmode="tel" value="${esc(w.no ? phone(w.no) : '')}" placeholder="01x-xxx xxxx"></div>
              <div class="field"><label for="ntWaL${i}">Label butang</label><input id="ntWaL${i}" data-wa-label maxlength="40" value="${esc(w.label)}" placeholder="WhatsApp ${i + 1}"></div></div>`).join('')}
            <div class="field"><label for="ntMsg">Mesej WhatsApp</label><textarea id="ntMsg" rows="2" maxlength="300">${esc(s.msg)}</textarea></div>
            <div class="field"><label for="ntPay">Arahan pembayaran</label><textarea id="ntPay" rows="2" maxlength="500">${esc(s.payNote)}</textarea></div>
            <button class="btn" type="submit">${icon('check')}Simpan tetapan</button>
          </div>
          <div class="nt-qr-edit">
            <h3>Kod QR pembayaran</h3>
            <div class="nt-qr-box">${s.qr ? `<img src="${esc(img(s.qr))}" alt="Kod QR semasa">` : '<span>Belum ada kod QR</span>'}</div>
            <label class="btn sm ghost">${icon('upload')}${s.qr ? 'Tukar QR' : 'Muat naik QR'}<input type="file" id="ntQr" accept="image/png,image/jpeg,image/webp" hidden></label>
            ${s.qr ? `<button type="button" class="btn sm ghost nt-danger" data-act="qr-del">${icon('trash')}Buang QR</button>` : ''}
            <p class="nt-hint">Gunakan gambar QR DuitNow atau QR bank anda (PNG atau JPG, had 2 MB).</p>
          </div>
        </div>
      </form>` : ''}
      ${S.tab === 'kunci' ? `<form id="ntKey" class="nt-form nt-key">
        <p class="nt-hint">Kunci pemilik ialah kata laluan ruang ini. Simpan di tempat selamat dan jangan kongsikan. Selepas ditukar, peranti lain perlu log masuk semula dengan kunci baharu.</p>
        <div class="field"><label for="ntNewKey">Kunci baharu (sekurang-kurangnya 12 aksara)</label><input id="ntNewKey" type="password" minlength="12" autocomplete="new-password" required></div>
        <div class="field"><label for="ntNewKey2">Ulang kunci baharu</label><input id="ntNewKey2" type="password" minlength="12" autocomplete="new-password" required></div>
        <button class="btn" type="submit">${icon('lock')}Tukar kunci</button>
      </form>` : ''}
    </section>`;
  }

  /* ---------- Dialog ---------- */
  function dialog(html, onBind) {
    const d = document.createElement('dialog');
    d.className = 'nt-dialog';
    d.innerHTML = `<button class="icon-btn plain nt-x" data-close aria-label="Tutup">${icon('x')}</button>${html}`;
    document.body.appendChild(d);
    d.addEventListener('close', () => d.remove());
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.showModal();
    if (onBind) onBind(d);
    return d;
  }

  function buyDialog(n) {
    dialog(`<h2>${esc(n.title)}</h2>
      <p class="nt-meta">${esc([n.code, n.pages ? n.pages + ' muka surat' : ''].filter(Boolean).join(' · '))}</p>
      <p class="nt-price big num">${n.price ? rm(n.price) : 'Percuma'}</p>
      ${buyHTML(n)}`);
  }

  function loginDialog() {
    dialog(`<h2>Ruang pemilik</h2>
      <form id="ntLogin"><div class="field"><label for="ntLoginKey">Kunci pemilik</label><input id="ntLoginKey" type="password" autocomplete="current-password" required></div>
      <p class="nt-err hidden" id="ntLoginErr"></p>
      <button class="btn block" type="submit">Log masuk</button></form>`, d => {
      $('#ntLoginKey', d).focus();
      $('#ntLogin', d).addEventListener('submit', async e => {
        e.preventDefault();
        const btn = $('button[type=submit]', d); btn.disabled = true;
        S.key = $('#ntLoginKey', d).value.trim();
        try {
          await api('/admin/check');
          store.set('nota_key', S.key);
          d.close(); toast('Log masuk sebagai pemilik.'); load();
        } catch (err) {
          S.key = '';
          const el = $('#ntLoginErr', d); el.textContent = err.message.includes('Kunci') ? 'Kunci pemilik salah.' : err.message; el.classList.remove('hidden');
          btn.disabled = false;
        }
      });
    });
  }

  function editDialog(n) {
    dialog(`<h2>Sunting nota</h2>
      <form id="ntEdit">
        <div class="field"><label for="neTitle">Tajuk</label><input id="neTitle" required maxlength="120" value="${esc(n.title)}"></div>
        <div class="nt-row">
          <div class="field"><label for="neCode">Kod kursus</label><input id="neCode" maxlength="20" value="${esc(n.code || '')}"></div>
          <div class="field"><label for="nePrice">Harga (RM)</label><input id="nePrice" inputmode="decimal" value="${esc(String(n.price || 0))}"></div>
          <div class="field"><label for="nePages">Muka surat</label><input id="nePages" inputmode="numeric" value="${esc(String(n.pages || ''))}"></div>
        </div>
        <div class="field"><label for="neDesc">Penerangan</label><textarea id="neDesc" rows="3" maxlength="1000">${esc(n.desc || '')}</textarea></div>
        <button class="btn block" type="submit">Simpan</button>
      </form>`, d => {
      $('#ntEdit', d).addEventListener('submit', async e => {
        e.preventDefault();
        try {
          await api('/admin/notes/' + n.id, { method: 'PATCH', json: { title: $('#neTitle', d).value, code: $('#neCode', d).value, price: $('#nePrice', d).value, pages: $('#nePages', d).value, desc: $('#neDesc', d).value } });
          d.close(); toast('Nota dikemas kini.'); load();
        } catch (err) { toast(err.message, 4000); }
      });
    });
  }

  async function linkDialog(n) {
    let j;
    try { j = await api(`/admin/notes/${n.id}/link`, { method: 'POST' }); } catch (e) { toast(e.message, 4000); return; }
    const exp = new Date(j.expires).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });
    const text = `Terima kasih kerana membeli nota "${n.title}" daripada Bijak Labur. Muat turun di sini (sah hingga ${exp}):\n${j.url}`;
    dialog(`<h2>Pautan untuk pembeli</h2>
      <p class="nt-hint">Hantar pautan ini kepada pembeli selepas bayaran diterima. Pautan sah hingga <b>${esc(exp)}</b> dan hanya memuat turun nota ini.</p>
      <input readonly value="${esc(j.url)}" id="ntLinkUrl" aria-label="Pautan muat turun">
      <div class="nt-wa nt-mt">
        <button class="btn ghost" data-act="copy">${icon('copy')}Salin pautan</button>
        <a class="btn" href="${esc('https://wa.me/?text=' + encodeURIComponent(text))}" target="_blank" rel="noopener">${icon('chat')}Hantar di WhatsApp</a>
      </div>`, d => {
      $('[data-act=copy]', d).addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(j.url); toast('Pautan disalin.'); } catch { $('#ntLinkUrl', d).select(); document.execCommand('copy'); toast('Pautan disalin.'); }
      });
    });
  }

  /* ---------- Pratonton PDF (halaman pertama, dalam pelayar) ---------- */
  let draft = { preview: null, custom: false };
  async function pdfPreview(file) {
    await loadScript('js/vendor/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await pdf.getPage(1);
    const vp0 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: 720 / vp0.width });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
    return { blob, pages: pdf.numPages };
  }
  function showPreview(blob) {
    const box = $('#ntPrev'); if (!box) return;
    box.innerHTML = blob ? `<img src="${URL.createObjectURL(blob)}" alt="Pratonton">` : '<span>Tiada pratonton</span>';
  }
  async function pickFile(file) {
    if (!file) return;
    if (file.size > 24 * 1024 * 1024) { toast('Fail terlalu besar. Had ialah 24 MB.', 4000); $('#ntFile').value = ''; return; }
    $('#ntDropT').innerHTML = `<b>${esc(file.name)}</b><small>${size(file.size)}</small>`;
    if (!$('#ntTitle').value) $('#ntTitle').value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    const code = file.name.match(/\b([A-Z]{3}\d{3})\b/i);
    if (code && !$('#ntCode').value) $('#ntCode').value = code[1].toUpperCase();
    if (draft.custom) return;
    if (/\.pdf$/i.test(file.name)) {
      $('#ntPrev').innerHTML = '<span>Menjana pratonton</span>';
      try { const r = await pdfPreview(file); draft.preview = r.blob; if (!$('#ntPages').value) $('#ntPages').value = r.pages; showPreview(r.blob); }
      catch { draft.preview = null; showPreview(null); }
    } else if (/^image\//.test(file.type) && file.size < 2 * 1024 * 1024) { draft.preview = file; showPreview(file); }
    else { draft.preview = null; showPreview(null); }
  }

  function upload(form) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('POST', API + '/admin/notes');
      x.setRequestHeader('Authorization', 'Bearer ' + S.key);
      const bar = $('#ntProg'); bar.classList.remove('hidden');
      x.upload.onprogress = e => { if (e.lengthComputable) bar.firstElementChild.style.width = (e.loaded / e.total * 100).toFixed(0) + '%'; };
      x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch {} if (x.status === 401) logout(); x.status < 300 ? resolve(j) : reject(new Error(j.error || 'Gagal (' + x.status + ')')); };
      x.onerror = () => reject(new Error('Sambungan terputus. Cuba lagi.'));
      x.send(form);
    });
  }

  /* ---------- Peristiwa ---------- */
  function bind() {
    const search = $('#ntSearch');
    if (search) search.addEventListener('input', () => { S.q = search.value; const pos = search.selectionStart; render(); const s2 = $('#ntSearch'); s2.focus(); s2.setSelectionRange(pos, pos); });

    root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; render(); }));

    const add = $('#ntAdd');
    if (add) {
      draft = { preview: null, custom: false };
      const fi = $('#ntFile'), drop = $('#ntDrop');
      fi.addEventListener('change', () => pickFile(fi.files[0]));
      ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('over')));
      drop.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files[0]) { fi.files = e.dataTransfer.files; pickFile(fi.files[0]); } });
      $('#ntCover').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; if (f.size > 2 * 1024 * 1024) { toast('Gambar terlalu besar (had 2 MB).'); return; } draft = { preview: f, custom: true }; showPreview(f); });
      add.addEventListener('submit', async e => {
        e.preventDefault();
        const file = fi.files[0];
        if (!file) { toast('Pilih fail nota dahulu.'); return; }
        const fd = new FormData();
        fd.set('title', $('#ntTitle').value); fd.set('code', $('#ntCode').value); fd.set('price', $('#ntPrice').value);
        fd.set('pages', $('#ntPages').value); fd.set('desc', $('#ntDesc').value); fd.set('hidden', $('#ntHidden').checked ? '1' : '');
        fd.set('file', file, file.name);
        if (draft.preview) fd.set('preview', draft.preview, 'pratonton.' + ((draft.preview.type || '').split('/')[1] || 'jpg'));
        const btn = $('#ntSubmit'); btn.disabled = true;
        try { await upload(fd); toast('Nota dimuat naik.'); load(); }
        catch (err) { toast(err.message, 4500); btn.disabled = false; $('#ntProg').classList.add('hidden'); }
      });
    }

    const shop = $('#ntShop');
    if (shop) {
      shop.addEventListener('submit', async e => {
        e.preventDefault();
        const nos = $$('[data-wa-no]', shop).map(i => i.value), labels = $$('[data-wa-label]', shop).map(i => i.value);
        try {
          const j = await api('/admin/settings', { method: 'PUT', json: { wa: nos.map((no, i) => ({ no, label: labels[i] })).filter(w => w.no.trim()), msg: $('#ntMsg').value, payNote: $('#ntPay').value } });
          S.settings = { ...S.settings, ...j.settings }; toast('Tetapan disimpan.'); render();
        } catch (err) { toast(err.message, 4000); }
      });
      $('#ntQr').addEventListener('change', async e => {
        const f = e.target.files[0]; if (!f) return;
        if (f.size > 2 * 1024 * 1024) { toast('Gambar terlalu besar (had 2 MB).'); return; }
        try { const j = await api('/admin/qr', { method: 'PUT', body: f, headers: { 'Content-Type': f.type } }); S.settings.qr = j.qr; toast('Kod QR dikemas kini.'); render(); }
        catch (err) { toast(err.message, 4000); }
      });
    }

    const keyForm = $('#ntKey');
    if (keyForm) keyForm.addEventListener('submit', async e => {
      e.preventDefault();
      const k = $('#ntNewKey').value.trim();
      if (k !== $('#ntNewKey2').value.trim()) { toast('Kedua-dua kunci tidak sama.'); return; }
      try { await api('/admin/key', { method: 'POST', json: { key: k } }); S.key = k; store.set('nota_key', k); toast('Kunci pemilik ditukar.'); S.tab = 'tambah'; render(); }
      catch (err) { toast(err.message, 4000); }
    });

    root.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', async e => {
      const act = b.dataset.act, card = b.closest('.nt-card'), n = card && (S.notes || []).find(x => x.id === card.dataset.id);
      if (act === 'login') return loginDialog();
      if (act === 'logout') { logout(); toast('Log keluar.'); return load(); }
      if (act === 'qr-del') { e.preventDefault(); if (!confirm('Buang kod QR pembayaran?')) return; try { await api('/admin/qr', { method: 'DELETE' }); S.settings.qr = ''; render(); } catch (err) { toast(err.message, 4000); } return; }
      if (!n) return;
      if (act === 'buy') return buyDialog(n);
      if (act === 'edit') return editDialog(n);
      if (act === 'link') return linkDialog(n);
      if (act === 'toggle') { try { await api('/admin/notes/' + n.id, { method: 'PATCH', json: { title: n.title, hidden: !n.hidden } }); toast(n.hidden ? 'Nota dipaparkan kepada umum.' : 'Nota disembunyikan.'); load(); } catch (err) { toast(err.message, 4000); } return; }
      if (act === 'del') {
        if (!confirm(`Padam "${n.title}"? Fail dan pratontonnya akan dibuang terus.`)) return;
        try { await api('/admin/notes/' + n.id, { method: 'DELETE' }); toast('Nota dipadam.'); load(); } catch (err) { toast(err.message, 4000); }
        return;
      }
      if (act === 'dl') {
        try {
          const r = await api(`/admin/notes/${n.id}/file`, { raw: true, headers: { Authorization: 'Bearer ' + S.key } });
          const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = n.name || n.title; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 30000);
        } catch (err) { toast(err.message, 4000); }
      }
    }));
  }

  let started = false;
  document.addEventListener('viewchange', e => {
    if (e.detail !== 'nota') return;
    if (!started) { started = true; render(); }
    load();
  });
})();
