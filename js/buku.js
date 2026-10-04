/* Bijak Labur: Buku Nota AI (gaya Open Notebook / NotebookLM).
   Tambah sumber (teks, PDF, DOCX), kemudian tanya soalan dengan petikan yang disahkan, ringkasan, panduan belajar,
   kuiz, kad imbas dan podcast dua hos yang dibacakan dengan suara HD. Sumber disimpan dalam peranti ini sahaja. */
(function () {
  const root = $('#view-buku');
  if (!root) return;
  const API = (store.get('fiqh_api', '') || 'https://fiqh.bijaklabur.my').replace(/\/$/, '');
  const TTS = 'https://bijak-labur-premium.khanz-amir.workers.dev/tts';
  const MAX_TOTAL = 120000, MAX_SUMBER = 10;
  const TABS = [['tanya', 'Tanya'], ['ringkasan', 'Ringkasan'], ['panduan', 'Panduan belajar'], ['kuiz', 'Kuiz'], ['kad', 'Kad imbas'], ['podcast', 'Podcast']];

  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  let src = load('buku_sumber', []);
  let S = { tab: 'tanya', bahasa: load('buku_bahasa', 'ms'), busy: '', err: '', adding: false, chat: [], hasil: {}, kuiz: {}, flip: new Set(), play: null };

  const active = () => src.filter(s => s.on !== false);
  const total = () => active().reduce((t, s) => t + s.teks.length, 0);
  const fmt = n => n.toLocaleString('ms-MY');
  const id = () => Math.random().toString(36).slice(2, 10);
  const persist = () => { if (!save('buku_sumber', src)) toast('Storan peranti penuh. Buang sumber yang tidak diperlukan.'); };
  const label = sid => { const i = +String(sid).slice(1) - 1, s = active()[i]; return s ? s.tajuk : sid; };

  /* ---------- Sumber ---------- */
  function sumberHTML() {
    return `<div class="card bk-src"><div class="row-between"><h2>Sumber</h2><span class="muted small">${active().length}/${MAX_SUMBER} · ${fmt(total())} aksara</span></div>
      ${src.length ? `<ul class="bk-list">${src.map(s => `<li>
          <label class="bk-on"><input type="checkbox" data-on="${s.id}" ${s.on !== false ? 'checked' : ''}><span><b>${esc(s.tajuk)}</b><span class="muted small">${fmt(s.teks.length)} aksara</span></span></label>
          <button class="icon-btn plain" type="button" data-del="${s.id}" aria-label="Buang ${esc(s.tajuk)}">${icon('trash')}</button></li>`).join('')}</ul>`
        : `<p class="muted">Tambah nota kuliah, bab buku, artikel atau slaid. AI hanya menjawab berdasarkan sumber anda.</p>`}
      ${S.adding ? `<form class="bk-add" id="bkAdd">
          <div class="field"><label for="bkT">Tajuk</label><input id="bkT" maxlength="120" placeholder="cth. Bab 3: Pengurusan Kewangan"></div>
          <div class="field"><label for="bkX">Teks</label><textarea id="bkX" rows="7" required placeholder="Tampal teks di sini"></textarea></div>
          <div class="row-gap"><button class="btn" type="submit">${icon('plus')}Tambah</button><button class="btn ghost" type="button" data-act="batal">Batal</button></div></form>`
        : `<div class="row-gap bk-btns"><button class="btn ghost" type="button" data-act="tampal">${icon('plus')}Tampal teks</button>
          <label class="btn ghost">${icon('upload')}Muat naik fail<input type="file" id="bkFile" accept=".pdf,.docx,.txt,.md" multiple hidden></label></div>`}
      <p class="muted small">PDF, DOCX atau TXT. Had ${MAX_SUMBER} sumber dan ${fmt(MAX_TOTAL)} aksara. Disimpan dalam peranti ini sahaja.</p></div>`;
  }

  async function addFiles(files) {
    for (const f of files) {
      if (src.length >= MAX_SUMBER) { toast(`Paling banyak ${MAX_SUMBER} sumber.`); break; }
      try {
        const teks = (await fileText(f)).slice(0, MAX_TOTAL);
        if (teks.length < 50) { toast(`${f.name}: tiada teks yang boleh dibaca (PDF imbasan tidak disokong).`, 4000); continue; }
        src.push({ id: id(), tajuk: f.name.replace(/\.[^.]+$/, '').slice(0, 120), teks, on: true });
        toast(`Ditambah: ${f.name}`);
      } catch { toast(`Gagal membaca ${f.name}.`); }
    }
    persist(); render();
  }

  /* ---------- Hasil setiap tugas ---------- */
  const cite = p => `<blockquote class="bk-q"><p>“${esc(p.teks)}”</p><cite>${esc(label(p.sumber))}</cite></blockquote>`;

  function tanyaHTML() {
    return `<div class="bk-chat">${S.chat.length ? S.chat.map(m => m.q ? `<div class="bk-me">${esc(m.q)}</div>` : `<div class="bk-ai">
        ${m.err ? `<p class="error">${esc(m.err)}</p>` : `${m.tiada_dalam_sumber ? `<p class="bk-tag">Tiada dalam sumber</p>` : ''}${m.jawapan.map(p => `<p>${esc(p)}</p>`).join('')}
        ${m.petikan.length ? `<details class="bk-cites"><summary>${m.petikan.length} petikan daripada sumber</summary>${m.petikan.map(cite).join('')}</details>` : ''}`}</div>`).join('')
        : `<p class="muted">Tanya apa sahaja tentang sumber anda. Contoh: "Terangkan konsep utama bab ini dengan contoh mudah."</p>`}
      ${S.busy === 'tanya' ? `<div class="bk-ai bk-wait" role="status">Membaca sumber…</div>` : ''}</div>
      <form class="bk-ask" id="bkAsk"><input id="bkQ" maxlength="500" placeholder="Tanya tentang sumber anda" aria-label="Soalan" ${S.busy ? 'disabled' : ''}>
        <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>${icon('chat')}Tanya</button></form>`;
  }

  function hasilHTML(t) {
    const h = S.hasil[t];
    const go = `<button class="btn" type="button" data-jana="${t}" ${S.busy ? 'disabled' : ''}>${icon(h ? 'refresh' : 'star')}${S.busy === t ? 'Menjana…' : h ? 'Jana semula' : 'Jana ' + TABS.find(x => x[0] === t)[1].toLowerCase()}</button>`;
    if (S.busy === t) return `<div class="bk-wait" role="status"><div class="st-spin" aria-hidden="true"></div><p>Membaca ${active().length} sumber…</p></div>`;
    if (!h) return `<div class="bk-empty"><p class="muted">${{ ringkasan: 'Ringkasan dan perkara utama daripada semua sumber, dengan petikan.', panduan: 'Topik, istilah penting dan soalan kajian untuk ulang kaji.', kuiz: '8 soalan aneka pilihan dengan penerangan jawapan.', kad: '12 kad imbas untuk menghafal istilah dan konsep.', podcast: 'Dua hos, Aina dan Hakim, berbual tentang sumber anda. Dengar dengan suara HD.' }[t]}</p>${go}</div>`;
    let body = '';
    if (t === 'ringkasan') body = `<p>${esc(h.ringkasan)}</p><h3>Perkara utama</h3><ul>${h.perkara_utama.map(p => `<li>${esc(p)}</li>`).join('')}</ul>${h.petikan.length ? `<h3>Petikan penting</h3>${h.petikan.map(cite).join('')}` : ''}`;
    if (t === 'panduan') body = `<h3>${esc(h.tajuk)}</h3>${h.topik.map(x => `<div class="bk-topic"><b>${esc(x.nama)}</b><p>${esc(x.penerangan)}</p></div>`).join('')}
      ${h.istilah.length ? `<h3>Istilah</h3><dl class="bk-dl">${h.istilah.map(x => `<dt>${esc(x.istilah)}</dt><dd>${esc(x.maksud)}</dd>`).join('')}</dl>` : ''}
      ${h.soalan_kajian.length ? `<h3>Soalan kajian</h3><ol>${h.soalan_kajian.map(q => `<li>${esc(q)}</li>`).join('')}</ol>` : ''}`;
    if (t === 'kuiz') {
      const ans = S.kuiz, done = Object.keys(ans).length, betul = h.soalan.filter((q, i) => ans[i] === q.jawapan).length;
      body = `${done === h.soalan.length ? `<p class="bk-score">Markah: <b>${betul}/${h.soalan.length}</b></p>` : ''}${h.soalan.map((q, i) => `<div class="bk-mcq"><p><b>${i + 1}. ${esc(q.soalan)}</b></p>
        <div class="bk-opts">${q.pilihan.map((p, j) => { const pick = ans[i]; const cls = pick == null ? '' : j === q.jawapan ? ' ok' : j === pick ? ' bad' : ''; return `<button type="button" class="bk-opt${cls}" data-q="${i}" data-a="${j}" ${pick != null ? 'disabled' : ''}>${'ABCD'[j]}. ${esc(p)}</button>`; }).join('')}</div>
        ${ans[i] != null ? `<p class="muted small">${ans[i] === q.jawapan ? '✓ Betul. ' : '✗ Kurang tepat. '}${esc(q.penerangan)}</p>` : ''}</div>`).join('')}
        ${done ? `<button class="link-btn" type="button" data-act="ulangkuiz">Cuba semula</button>` : ''}`;
    }
    if (t === 'kad') body = `<p class="muted small">Tekan kad untuk melihat jawapan.</p><div class="bk-cards">${h.kad.map((k, i) => `<button type="button" class="bk-card${S.flip.has(i) ? ' flip' : ''}" data-flip="${i}" aria-pressed="${S.flip.has(i)}"><span>${esc(S.flip.has(i) ? k.belakang : k.depan)}</span></button>`).join('')}</div>`;
    if (t === 'podcast') body = `<h3>${esc(h.tajuk)}</h3><div class="row-gap"><button class="btn" type="button" data-act="${S.play ? 'henti' : 'main'}">${icon(S.play ? 'pause' : 'play')}${S.play ? 'Henti' : 'Main podcast'}</button>
        <button class="btn ghost" type="button" data-act="skrip">${icon('download')}Skrip</button></div>
        <ol class="bk-pod">${h.baris.map((b, i) => `<li class="${b.penutur === 'A' ? 'a' : 'b'}${S.play && S.play.i === i ? ' now' : ''}"><b>${b.penutur === 'A' ? 'Aina' : 'Hakim'}</b><span>${esc(b.teks)}</span></li>`).join('')}</ol>`;
    return `<div class="bk-out">${body}</div><div class="bk-foot">${h.penghala ? '<span class="muted small">Dijawab oleh model sandaran kerana Gemini sibuk.</span>' : ''}${go}</div>`;
  }

  function render() {
    root.innerHTML = `<div class="page-head"><p class="eyebrow">Belajar dengan AI</p><h1 id="h-buku">Buku Nota AI</h1>
        <p class="lead">Muat naik nota kuliah atau bab buku, kemudian tanya soalan, buat ringkasan, kuiz, kad imbas dan podcast. Diilhamkan oleh Open Notebook: AI hanya menjawab daripada sumber anda, dengan petikan yang disahkan.</p></div>
      <div class="bk-grid">${sumberHTML()}
        <div class="card bk-studio">
          <div class="row-between bk-head"><div class="segmented bk-tabs" role="tablist">${TABS.map(([k, n]) => `<button role="tab" class="seg${S.tab === k ? ' active' : ''}" aria-selected="${S.tab === k}" data-tab="${k}">${n}</button>`).join('')}</div>
            <select id="bkLang" aria-label="Bahasa jawapan"><option value="ms" ${S.bahasa === 'ms' ? 'selected' : ''}>BM</option><option value="en" ${S.bahasa === 'en' ? 'selected' : ''}>EN</option></select></div>
          ${!active().length ? `<div class="bk-empty"><p class="muted">Tambah sekurang-kurangnya satu sumber untuk bermula.</p></div>` : S.tab === 'tanya' ? tanyaHTML() : hasilHTML(S.tab)}
          ${S.err ? `<p class="error">${esc(S.err)}</p>` : ''}
        </div></div>
      <p class="note">${icon('alert')}<span>AI boleh tersilap walaupun berpandukan sumber. Semak petikan sebelum menggunakan jawapan dalam tugasan. Teks sumber dihantar kepada Google (Gemini) untuk diproses dan tidak disimpan di pelayan Bijak Labur. Jangan muat naik dokumen sulit atau maklumat peribadi.</span></p>`;
    const chat = $('.bk-chat', root); if (chat) chat.scrollTop = chat.scrollHeight;
  }

  async function call(tugas, soalan) {
    const r = await fetch(API + '/buku', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tugas, soalan, bahasa: S.bahasa, sumber: active().map(s => ({ tajuk: s.tajuk, teks: s.teks })) }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Buku Nota AI tidak tersedia buat masa ini.');
    return d;
  }
  const netErr = e => e.message && !/fetch|network/i.test(e.message) ? e.message : 'Tiada sambungan internet. Cuba lagi.';

  async function jana(t) {
    if (S.busy) return;
    if (total() > MAX_TOTAL) { toast(`Jumlah sumber melebihi ${fmt(MAX_TOTAL)} aksara. Nyahtanda sebahagian sumber.`, 4000); return; }
    stopPod(); Object.assign(S, { busy: t, err: '' }); render();
    try { S.hasil[t] = await call(t); if (t === 'kuiz') S.kuiz = {}; if (t === 'kad') S.flip = new Set(); }
    catch (e) { S.err = netErr(e); }
    S.busy = ''; render();
  }

  async function tanya(q) {
    if (S.busy || q.length < 3) return;
    S.chat.push({ q }); Object.assign(S, { busy: 'tanya', err: '' }); render();
    try { const d = await call('tanya', q); S.chat.push({ jawapan: d.jawapan || [], petikan: d.petikan || [], tiada_dalam_sumber: d.tiada_dalam_sumber }); }
    catch (e) { S.chat.push({ err: netErr(e), jawapan: [], petikan: [] }); }
    S.busy = ''; render(); const i = $('#bkQ', root); if (i) i.focus();
  }

  /* ---------- Podcast: suara HD bergilir (Aina perempuan, Hakim lelaki) ---------- */
  const audio = new Audio();
  const lineUrl = (b, rate = 1) => `${TTS}?v=${S.bahasa === 'en' ? 'en' : 'ms'}-${b.penutur === 'A' ? 'f' : 'm'}&r=${rate}&t=${encodeURIComponent(b.teks.slice(0, 300))}`;
  const fetched = new Map();
  const blobFor = b => {
    const u = lineUrl(b);
    if (!fetched.has(u)) fetched.set(u, fetch(u).then(r => { if (!r.ok) throw new Error('tts'); return r.blob(); }).then(x => URL.createObjectURL(x)));
    return fetched.get(u);
  };
  function speakFallback(b) {
    return new Promise(res => {
      if (!window.speechSynthesis) return res();
      const u = new SpeechSynthesisUtterance(b.teks); u.lang = S.bahasa === 'en' ? 'en-GB' : 'ms-MY'; u.onend = u.onerror = res; speechSynthesis.speak(u);
    });
  }
  async function playPod() {
    const h = S.hasil.podcast; if (!h || !h.baris.length) return;
    const token = {}; S.play = Object.assign(token, { i: 0 }); render();
    for (let i = 0; i < h.baris.length && S.play === token; i++) {
      token.i = i; render();
      $('.bk-pod .now', root)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (h.baris[i + 1]) blobFor(h.baris[i + 1]).catch(() => {});
      try {
        audio.src = await blobFor(h.baris[i]);
        if (S.play !== token) break;
        await audio.play();
        await new Promise(res => { audio.onended = res; audio.onerror = res; token.stop = res; });
      } catch { if (S.play === token) await speakFallback(h.baris[i]); }
    }
    if (S.play === token) { S.play = null; render(); }
  }
  function stopPod() { if (!S.play) return; const s = S.play.stop; S.play = null; audio.pause(); window.speechSynthesis && speechSynthesis.cancel(); s && s(); }

  /* ---------- Peristiwa ---------- */
  root.addEventListener('change', e => {
    if (e.target.id === 'bkFile' && e.target.files.length) addFiles([...e.target.files]);
    if (e.target.dataset.on) { const s = src.find(x => x.id === e.target.dataset.on); if (s) { s.on = e.target.checked; persist(); render(); } }
    if (e.target.id === 'bkLang') { S.bahasa = e.target.value; save('buku_bahasa', S.bahasa); }
  });
  root.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'bkAdd') {
      const teks = $('#bkX', root).value.trim();
      if (teks.length < 50) { toast('Teks terlalu pendek (sekurang-kurangnya 50 aksara).'); return; }
      if (src.length >= MAX_SUMBER) { toast(`Paling banyak ${MAX_SUMBER} sumber.`); return; }
      src.push({ id: id(), tajuk: $('#bkT', root).value.trim() || `Sumber ${src.length + 1}`, teks: teks.slice(0, MAX_TOTAL), on: true });
      S.adding = false; persist(); render();
    }
    if (e.target.id === 'bkAsk') tanya($('#bkQ', root).value.trim());
  });
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]'); if (t) { stopPod(); S.tab = t.dataset.tab; S.err = ''; render(); return; }
    const j = e.target.closest('[data-jana]'); if (j) { jana(j.dataset.jana); return; }
    const d = e.target.closest('[data-del]');
    if (d) { const s = src.find(x => x.id === d.dataset.del); if (s && confirm(`Buang sumber "${s.tajuk}"?`)) { src = src.filter(x => x !== s); persist(); render(); } return; }
    const o = e.target.closest('[data-q]'); if (o) { S.kuiz[o.dataset.q] = +o.dataset.a; render(); return; }
    const f = e.target.closest('[data-flip]'); if (f) { const i = +f.dataset.flip; S.flip.has(i) ? S.flip.delete(i) : S.flip.add(i); render(); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'tampal') { S.adding = true; render(); $('#bkT', root).focus(); }
    if (act === 'batal') { S.adding = false; render(); }
    if (act === 'ulangkuiz') { S.kuiz = {}; render(); }
    if (act === 'main') playPod();
    if (act === 'henti') { stopPod(); render(); }
    if (act === 'skrip') {
      const h = S.hasil.podcast, txt = `${h.tajuk}\n\n${h.baris.map(b => `${b.penutur === 'A' ? 'Aina' : 'Hakim'}: ${b.teks}`).join('\n\n')}\n`;
      const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
      Object.assign(document.createElement('a'), { href: url, download: 'podcast-bijak-labur.txt' }).click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  });
  document.addEventListener('viewchange', e => { if (e.detail === 'buku') { if (!S.busy) render(); } else stopPod(); });
  render();
})();
