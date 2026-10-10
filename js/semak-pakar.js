/* SiswaCap: Semak Kertas peringkat pakar
   1. Ulasan pakar (AI melalui worker-fiqh /semak): markah rubrik, kekuatan, penambahbaikan
      dan pembetulan bahasa (BM baku DBP, bukan Bahasa Indonesia) yang boleh diterima satu demi satu.
   2. Pemeriksa rujukan: setiap rujukan disahkan dengan Crossref dan OpenAlex (mengesan rujukan rekaan),
      dan sitasi dalam teks dipadankan dengan senarai rujukan. */
(function () {
  const API = (store.get('fiqh_api', '') || 'https://fiqh.bijaklabur.my').replace(/\/$/, '');
  const CRIT = [['struktur', 'Struktur'], ['hujah', 'Hujah dan analisis'], ['bukti', 'Bukti dan contoh'], ['bahasa', 'Bahasa'], ['rujukan', 'Rujukan dan sitasi']];

  /* ---------- 1. Ulasan pakar ---------- */
  async function expert(text, lang) {
    let r;
    try { r = await fetch(API + '/semak', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 60000), lang }) }); }
    catch { throw new Error(navigator.onLine === false ? 'Tiada sambungan internet.' : 'Ulasan pakar tidak dapat dihubungi.'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Ulasan pakar tidak tersedia buat masa ini.');
    return d;
  }

  /** Pembetulan pakar -> cadangan dalam format penyemak ({ start, end, orig, rep, cat, msg }) */
  function toSuggestions(text, list) {
    const out = [], used = new Set();
    // Padan sebagai perkataan penuh sahaja, dan hanya jika frasa itu unik dalam teks
    const isL = c => !!c && /[\p{L}\p{N}]/u.test(c);
    for (const p of list || []) {
      const hits = [];
      for (let i = text.indexOf(p.asal); i >= 0; i = text.indexOf(p.asal, i + 1))
        if (!isL(text[i - 1]) && !isL(text[i + p.asal.length])) hits.push(i);
      if (hits.length !== 1 || used.has(hits[0])) continue;
      const i = hits[0];
      used.add(i);
      out.push({ start: i, end: i + p.asal.length, orig: p.asal, rep: p.baru, cat: p.jenis, msg: p.sebab + ' (ulasan pakar)', src: 'ai' });
    }
    return out;
  }

  /* ---------- 2. Pemeriksa rujukan ---------- */
  const HEAD = /^\s*(?:\d+[.)]?\s*)?(rujukan|senarai rujukan|bibliografi|references?|bibliography|reference list|works cited)\s*:?\s*$/im;
  const YEAR = /\b(19[5-9]\d|20[0-4]\d)[a-z]?\b/;
  const DOI = /\b10\.\d{4,9}\/[-._;()/:a-z0-9<>]+/i;
  const tokens = s => (String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]{3,}/g) || []);
  const STOP = new Set('the and for with from that this into using use study analysis kajian dan yang dalam untuk dengan terhadap pada journal vol pp doi http https www org com'.split(' '));

  function split(text) {
    const m = HEAD.exec(text);
    if (!m) return { body: text, refs: [] };
    const body = text.slice(0, m.index), tail = text.slice(m.index + m[0].length);
    // Satu rujukan bagi setiap baris atau perenggan; gabung baris sambungan (bermula huruf kecil atau tanpa tahun)
    const lines = tail.split(/\n+/).map(l => l.trim()).filter(Boolean), refs = [];
    for (const l of lines) {
      const starts = /^(\[\d+\]|\d+\.\s|[A-ZÀ-ɏ][\p{L}'’-]+,|[A-Z]{2,})/u.test(l);
      if (refs.length && !starts && !YEAR.test(l.slice(0, 80))) refs[refs.length - 1] += ' ' + l;
      else refs.push(l);
    }
    return { body, refs: refs.filter(r => r.length > 20 && (YEAR.test(r) || DOI.test(r))).slice(0, 40) };
  }

  const firstAuthor = r => { const m = r.replace(/^(\[\d+\]|\d+\.)\s*/, '').match(/^([\p{L}'’-]+)/u); return m ? m[1].toLowerCase() : ''; };
  const yearOf = r => (r.match(YEAR) || [])[1] || '';

  async function getJSON(u, ms = 12000) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(u, { signal: ctl.signal }); if (r.status === 404) return null; if (!r.ok) throw new Error(r.status); return await r.json(); }
    finally { clearTimeout(t); }
  }
  // Seberapa banyak perkataan tajuk yang dijumpai ada dalam rujukan pelajar
  function overlap(title, ref) {
    const t = tokens(title).filter(w => !STOP.has(w)), r = new Set(tokens(ref));
    if (t.length < 2) return 0;
    return t.filter(w => r.has(w)).length / t.length;
  }

  async function verifyRef(ref) {
    const year = yearOf(ref), doi = (ref.match(DOI) || [])[0];
    if (doi) {
      const d = doi.replace(/[.,;)\]]+$/, '');
      try {
        const j = await getJSON(`https://api.crossref.org/works/${encodeURIComponent(d)}`);
        if (j && j.message) return { ref, status: 'sah', title: (j.message.title || [''])[0], url: 'https://doi.org/' + d, via: 'DOI' };
        return { ref, status: 'tiada', note: 'DOI ini tidak wujud dalam pangkalan DOI. Semak semula nombor DOI.' };
      } catch { return { ref, status: 'ralat' }; }
    }
    const q = encodeURIComponent(ref.replace(/https?:\/\/\S+/g, '').slice(0, 300));
    const cands = [];
    try {
      const j = await getJSON(`https://api.crossref.org/works?query.bibliographic=${q}&rows=3&select=DOI,title,issued`);
      for (const it of (j && j.message && j.message.items) || []) cands.push({ title: (it.title || [''])[0], year: String(((it.issued || {})['date-parts'] || [[]])[0][0] || ''), url: it.DOI ? 'https://doi.org/' + it.DOI : '', via: 'Pangkalan DOI' });
    } catch {}
    try {
      const j = await getJSON(`https://api.openalex.org/works?search=${q}&per-page=3&select=title,publication_year,doi,id`);
      for (const it of (j && j.results) || []) cands.push({ title: it.title || '', year: String(it.publication_year || ''), url: it.doi || it.id || '', via: 'Pangkalan akademik' });
    } catch {}
    let best = null, score = 0;
    for (const c of cands) { const s = overlap(c.title, ref) - (year && c.year && Math.abs(+c.year - +year) > 1 ? 0.25 : 0); if (s > score) { score = s; best = c; } }
    if (best && score >= 0.85) return { ref, status: 'sah', title: best.title, url: best.url, via: best.via };
    if (best && score >= 0.55) return { ref, status: 'mungkin', title: best.title, url: best.url, via: best.via };
    if (/https?:\/\//.test(ref)) return { ref, status: 'laman', note: 'Rujukan laman web: buka pautan untuk memastikan ia masih wujud.' };
    return { ref, status: 'tiada', note: 'Tidak dijumpai dalam pangkalan akademik. Buku, laporan dan terbitan tempatan mungkin tiada dalam pangkalan ini, tetapi pastikan rujukan ini benar-benar wujud.' };
  }

  /** Sitasi dalam teks: (Ahmad, 2020), (Lee et al., 2019; Tan & Lim, 2021), Ahmad (2020) */
  function citations(body) {
    const out = [];
    for (const m of body.matchAll(/\(([^()]{3,200}?\b(?:19|20)\d{2}[a-z]?[^()]*)\)/g)) {
      for (const part of m[1].split(';')) {
        const a = part.match(/([\p{Lu}][\p{L}'’-]+)[^,;]*?,?\s*((?:19|20)\d{2})/u);
        if (a) out.push({ author: a[1].toLowerCase(), year: a[2], label: part.trim() });
      }
    }
    for (const m of body.matchAll(/\b([\p{Lu}][\p{L}'’-]+)(?:\s+et al\.|\s+(?:&|and|dan)\s+[\p{Lu}][\p{L}'’-]+)?\s+\(((?:19|20)\d{2})[a-z]?\)/gu))
      out.push({ author: m[1].toLowerCase(), year: m[2], label: m[0] });
    const seen = new Set();
    return out.filter(c => { const k = c.author + c.year; if (seen.has(k)) return false; seen.add(k); return true; });
  }

  async function references(text, onProgress) {
    const { body, refs } = split(text);
    if (!refs.length) return { found: false, items: [], missing: [], unused: [] };
    const items = new Array(refs.length);
    let next = 0, done = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < refs.length) { const i = next++; items[i] = await verifyRef(refs[i]); onProgress && onProgress(++done, refs.length); }
    }));
    const cites = citations(body), keys = refs.map(r => ({ a: firstAuthor(r), y: yearOf(r) }));
    const missing = cites.filter(c => !keys.some(k => k.a === c.author && k.y === c.year)).map(c => c.label);
    const unused = refs.filter((r, i) => keys[i].a && !cites.some(c => c.author === keys[i].a && c.year === keys[i].y));
    return { found: true, items, cites: cites.length, missing, unused };
  }

  /* ---------- Paparan ---------- */
  // Skala gred UiTM
  const GRADES = [[80, 'A'], [75, 'A-'], [70, 'B+'], [65, 'B'], [60, 'B-'], [55, 'C+'], [50, 'C'], [47, 'C-'], [44, 'D+'], [40, 'D'], [30, 'E'], [0, 'F']];
  const grade = n => GRADES.find(([m]) => n >= m)[1];
  function expertHTML(x) {
    if (!x) return '';
    if (x.error) return `<p class="note">${icon('alert')}<span>${esc(x.error)}</span></p>`;
    return `<div class="xp-head"><div class="xp-score"><b class="num">${x.jumlah}</b><span>/100</span></div><div><div class="xp-grade">Gred anggaran ${grade(x.jumlah)} (skala UiTM)</div><p class="muted small">${esc(x.ringkasan)}</p></div></div>
      <div class="xp-crit">${CRIT.map(([k, n]) => { const m = x.markah[k] || { skor: 0, ulasan: '' }; return `<div class="xp-row"><div class="row-between"><b>${n}</b><span class="num">${m.skor}/10</span></div><div class="track"><div style="width:${m.skor * 10}%"></div></div>${m.ulasan ? `<p class="muted small">${esc(m.ulasan)}</p>` : ''}</div>`; }).join('')}</div>
      ${x.kekuatan.length ? `<h4>Kekuatan</h4><ul class="xp-list good">${x.kekuatan.map(k => `<li>${icon('check')}<span>${esc(k)}</span></li>`).join('')}</ul>` : ''}
      ${x.penambahbaikan.length ? `<h4>Penambahbaikan</h4><ol class="xp-list">${x.penambahbaikan.map(p => `<li><b>${esc(p.isu)}</b>${p.petikan ? `<blockquote>${esc(p.petikan)}</blockquote>` : ''}<span>${esc(p.cadangan)}</span></li>`).join('')}</ol>` : ''}
      <p class="muted small">${x.pembetulan.length} pembetulan bahasa daripada ulasan pakar dimasukkan ke dalam senarai cadangan di bawah. Markah dan ulasan dijana oleh AI sebagai panduan, bukan markah rasmi pensyarah.</p>`;
  }
  const CHIP = { sah: ['Disahkan', 'up'], mungkin: ['Hampir sepadan', 'warn'], tiada: ['⚠ AMARAN MERAH', 'down'], laman: ['Laman web', 'info'], ralat: ['Tidak dapat disemak', 'muted'] };
  function refsHTML(r) {
    if (!r) return '';
    const web = u => /^https?:\/\//i.test(u || '');
    if (!r.found) return '<p class="muted small">Tiada bahagian "Rujukan" atau "References" dikesan. Letakkan senarai rujukan di hujung teks di bawah tajuk Rujukan untuk disemak.</p>';
    const n = k => r.items.filter(i => i.status === k).length;
    return `<div class="rf-sum"><span class="rf-chip up">${n('sah')} disahkan</span><span class="rf-chip warn">${n('mungkin')} hampir sepadan</span><span class="rf-chip down">${n('tiada')} tidak dijumpai</span>${n('laman') ? `<span class="rf-chip info">${n('laman')} laman web</span>` : ''}</div>
      <ol class="rf-list">${r.items.map(i => { const [l, c] = CHIP[i.status]; return `<li><span class="rf-chip ${c}">${l}</span><span class="rf-ref">${esc(i.ref)}</span>${i.title && i.status !== 'sah' ? `<span class="muted small">Paling hampir: ${web(i.url) ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title)}</a>` : esc(i.title)}</span>` : web(i.url) ? `<a class="small" href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.via || 'Buka')}</a>` : ''}${i.note ? `<span class="muted small">${esc(i.note)}</span>` : ''}</li>`; }).join('')}</ol>
      ${r.missing.length ? `<h4>Disitasi dalam teks tetapi tiada dalam senarai rujukan</h4><ul class="rf-plain">${r.missing.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
      ${r.unused.length ? `<h4>Dalam senarai rujukan tetapi tidak disitasi dalam teks</h4><ul class="rf-plain">${r.unused.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
      ${!r.missing.length && !r.unused.length && r.cites ? `<p class="muted small">${icon('check')} Semua ${r.cites} sitasi dalam teks sepadan dengan senarai rujukan.</p>` : ''}`;
  }
  function render(state) {
    const xb = $('#expertBox'), rb = $('#refBox');
    if (xb) { xb.closest('.card').classList.toggle('hidden', !state.expert); xb.innerHTML = expertHTML(state.expert); }
    if (rb) { rb.closest('.card').classList.toggle('hidden', !state.refs); rb.innerHTML = refsHTML(state.refs); }
  }

  window.SemakPakar = { expert, toSuggestions, references, render, _split: split, _citations: citations, _overlap: overlap };
})();
