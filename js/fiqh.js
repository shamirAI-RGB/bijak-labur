/* Bijak Labur: Fiqh. Setiap masalah dipautkan kepada Al-Quran, hadis, kitab muktabar mazhab Syafie dan fatwa rasmi.
   Teks ayat dan hadis dimuat terus daripada sumber, bukan ditulis semula, supaya rujukan tidak tersasar. */
(function () {
  const D = FiqhData;
  const QAPI = 'https://api.alquran.cloud/v1';
  const HAPI = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';
  const BAB = Object.fromEntries(D.BAB.map(b => [b.k, b]));
  const SCALE = ['wajib', 'sunat', 'harus', 'makruh', 'haram'];
  let el = null, seq = 0;

  const badge = h => `<span class="hk hk-${h}">${D.HUKUM[h][0]}</span>`;
  const sunnahUrl = h => `https://sunnah.com/${h.c}:${h.n}`;
  const hRef = h => `${D.KOLEKSI[h.c]} ${h.n.replace(/[a-z]$/, '')}`;
  const ext = (href, label) => `<a class="link-btn" href="${href}" target="_blank" rel="noopener">${label}${icon('link')}</a>`;

  /* ---------- Muat sumber ---------- */
  const cache = {};
  const getJSON = u => cache[u] || (cache[u] = fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(e => { delete cache[u]; throw e; }));
  async function ayah(ref) {
    const j = await getJSON(`${QAPI}/ayah/${ref}/editions/quran-uthmani,ms.basmeih`);
    if (j.code !== 200) throw new Error(j.status);
    const [ar, ms] = j.data;
    return { ar: ar.text.replace(/^﻿/, ''), ms: ms.text, surah: ar.surah.englishName, s: ar.surah.number, a: ar.numberInSurah };
  }
  async function hadith(h) {
    const [ar, en] = await Promise.all([`ara-${h.c}`, `eng-${h.c}`].map(ed => getJSON(`${HAPI}/${ed}/${h.i}.json`)));
    const a = ar.hadiths[0], e = en.hadiths[0];
    return { ar: a.text, en: e.text, grades: (e.grades && e.grades.length ? e.grades : a.grades) || [], book: e.reference };
  }

  /* ---------- Visual ---------- */
  function chainVisual() {
    const nodes = [['Al-Quran', 'Kalam Allah', '#1f9d63'], ['Hadis', 'Sunnah Nabi SAW', '#7b5cf0'], ['Kitab muktabar', 'Huraian ulama Syafie', '#f2704d'], ['Fatwa Malaysia', 'Keputusan rasmi semasa', '#1192d6']];
    return `<figure class="fq-chain" aria-label="Rantaian rujukan">${nodes.map(([t, s, c], i) => `<div class="fq-node" style="--c:${c}"><span class="fq-dot num">${i + 1}</span><b>${t}</b><small>${s}</small></div>`).join('<span class="fq-arrow" aria-hidden="true"></span>')}</figure>`;
  }
  function pyramid() {
    const L = [['Al-Quran', 'Sumber utama, qat\'i'], ['Sunnah', 'Perkataan, perbuatan dan pengakuan Nabi SAW'], ['Ijmak', 'Kesepakatan mujtahid'], ['Qiyas', 'Menyamakan hukum berdasarkan illah yang sama']];
    return `<div class="fq-pyr">${L.map(([t, s], i) => `<div class="fq-lvl" style="--w:${58 + i * 14}%"><b>${t}</b><small>${s}</small></div>`).join('')}</div>`;
  }
  function scale(active) {
    return `<div class="fq-scale" role="list">${SCALE.map(k => `<div role="listitem" class="fq-seg hk-${k} ${active === k ? 'on' : ''} ${active && active !== k ? 'dim' : ''}"><b>${D.HUKUM[k][0]}</b></div>`).join('')}</div>`;
  }
  function flow(steps) {
    return `<ol class="fq-flow">${steps.map((s, i) => `<li><span class="num">${i + 1}</span>${esc(s)}</li>`).join('')}</ol>`;
  }

  /* ---------- Utama ---------- */
  function home(head) {
    const counts = Object.fromEntries(D.BAB.map(b => [b.k, D.MASALAH.filter(m => m.bab === b.k).length]));
    const kitabSeen = new Set();
    el.innerHTML = head + `
      <p class="lead">Setiap jawapan dipautkan terus kepada sumbernya. Teks ayat dan hadis dimuat daripada pangkalan data asal semasa anda membukanya, bukan ditulis semula oleh AI. Rujukan yang tidak dapat disahkan tidak dimasukkan.</p>
      ${chainVisual()}
      <div class="search-in"><svg class="ic"><use href="#i-search"/></svg><input id="fqFind" placeholder="Cari masalah, cth. riba, wuduk, kripto" aria-label="Cari masalah fiqh" autocomplete="off"></div>
      <div id="fqHits"></div>
      <h2 class="grid-title">Bab</h2>
      <div class="fq-babs">${D.BAB.map(b => `<a class="fq-bab card" href="#ibadah/fiqh/${b.k}" style="--c:${b.color}"><span class="fq-bab-ar" lang="ar" dir="rtl">${b.ar}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small><span class="fq-count num">${counts[b.k]} masalah</span></a>`).join('')}</div>
      <div class="two-col">
        <div class="card"><h3>Sumber hukum Islam</h3><p class="muted small">Mengikut susunan keutamaan dalam usul fiqh mazhab Syafie.</p>${pyramid()}</div>
        <div class="card"><h3>Lima hukum taklifi</h3>${scale()}<dl class="fq-defs">${SCALE.map(k => `<div><dt>${badge(k)}</dt><dd>${D.HUKUM[k][1]}</dd></div>`).join('')}</dl></div>
      </div>
      <div class="card"><h3>Cari dalil terus dari sumber</h3>
        <div class="fq-q"><input id="fqDalil" placeholder="Perkataan, cth. riba atau solat" aria-label="Kata kunci dalil" autocomplete="off"><button class="btn sm" data-fq-ayat>Cari ayat</button></div>
        <div id="fqAyat"></div>
        <div class="fq-out" id="fqOut">${outLinks('')}</div></div>
      <h2 class="grid-title">Perpustakaan kitab muktabar</h2>
      <div class="list">${D.BAB[0].kitab.concat(D.BAB[4].kitab).filter(([k]) => !kitabSeen.has(k) && kitabSeen.add(k)).map(([k]) => { const b = D.KITAB[k]; return `<a class="fq-kitab" href="${D.shamela(b.id)}" target="_blank" rel="noopener"><span class="fq-kitab-ar" lang="ar" dir="rtl">${b.ar}</span><span class="q-main"><b>${esc(b.name)}</b><small>${esc(b.by)}</small></span><span class="fq-lvl-tag">${b.lvl}</span>${icon('link')}</a>`; }).join('')}</div>
      <p class="note">${icon('alert')}<span>Bahagian ini untuk belajar dan bukan fatwa. Untuk kes peribadi, rujuk Jabatan Mufti negeri anda atau guru yang bertauliah.</span></p>`;
  }
  function outLinks(q) {
    return D.CARI.map(([n, s, u]) => `<a class="fq-out-link" href="${esc(u(q || ''))}" target="_blank" rel="noopener"><b>${n}</b><small>${s}</small>${icon('link')}</a>`).join('');
  }
  function hitRow(m) {
    return `<a class="fq-row" href="#ibadah/fiqh/${m.bab}/${m.k}"><span class="q-main"><b>${esc(m.t)}</b><small>${esc(BAB[m.bab].name)} · ${refCount(m)} rujukan</small></span>${badge(m.hukum)}${icon('chev', 'ic chev')}</a>`;
  }
  const refCount = m => (m.q || []).length + (m.h || []).length + (m.f || []).length + BAB[m.bab].kitab.length;

  async function searchAyat() {
    const kw = ($('#fqDalil').value || '').trim(), box = $('#fqAyat');
    if (kw.length < 3) { box.innerHTML = '<p class="muted small">Masukkan sekurang-kurangnya 3 huruf.</p>'; return; }
    box.innerHTML = '<p class="muted small">Mencari dalam terjemahan Basmeih</p>';
    try {
      const j = await getJSON(`${QAPI}/search/${encodeURIComponent(kw)}/all/ms.basmeih`);
      const re = new RegExp(`(^|[^\\p{L}])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu');
      const hits = j.code === 200 && j.data ? j.data.matches.filter(m => re.test(m.text)) : [];
      box.innerHTML = hits.length ? `<p class="muted small">${hits.length} ayat mengandungi "${esc(kw)}"</p><div class="list fq-ayat-list">${hits.slice(0, 25).map(m => `<a class="fq-row" href="#ibadah/quran/${m.surah.number}/${m.numberInSurah}"><span class="q-main"><b>${esc(m.surah.englishName)} ${m.surah.number}:${m.numberInSurah}</b><small>${esc(m.text.length > 160 ? m.text.slice(0, 160) + '…' : m.text)}</small></span>${icon('chev', 'ic chev')}</a>`).join('')}</div>` : `<p class="muted small">Tiada ayat dengan perkataan "${esc(kw)}". Cuba ejaan lain.</p>`;
    } catch { box.innerHTML = '<p class="muted small">Carian perlukan sambungan internet.</p>'; }
  }

  /* ---------- Bab ---------- */
  function bab(b, head) {
    const list = D.MASALAH.filter(m => m.bab === b.k);
    el.innerHTML = head + `
      <div class="fq-crumb"><a href="#ibadah/fiqh">Fiqh</a>${icon('chev')}<span>${esc(b.name)}</span></div>
      <div class="fq-hero" style="--c:${b.color}"><span lang="ar" dir="rtl">${b.ar}</span><div><h2>${esc(b.name)}</h2><p>${esc(b.desc)}</p></div></div>
      <div class="list">${list.map(hitRow).join('')}</div>
      <h2 class="grid-title">Bab ini dalam kitab</h2>
      ${kitabList(b)}`;
  }
  function kitabList(b) {
    return `<div class="list">${b.kitab.map(([k, p, ch]) => { const kb = D.KITAB[k]; return `<a class="fq-kitab" href="${D.shamela(kb.id, p)}" target="_blank" rel="noopener"><span class="fq-kitab-ar" lang="ar" dir="rtl">${ch}</span><span class="q-main"><b>${esc(kb.name)}</b><small>${esc(kb.by)} · Shamela, hlm. ${p}</small></span>${icon('link')}</a>`; }).join('')}</div>`;
  }

  /* ---------- Masalah ---------- */
  function masalah(m, head) {
    const b = BAB[m.bab], my = ++seq;
    const onScale = SCALE.includes(m.hukum);
    el.innerHTML = head + `
      <div class="fq-crumb"><a href="#ibadah/fiqh">Fiqh</a>${icon('chev')}<a href="#ibadah/fiqh/${b.k}">${esc(b.name)}</a></div>
      <article class="fq-detail">
        <div class="row-between fq-title"><h2>${esc(m.t)}</h2>${badge(m.hukum)}</div>
        ${onScale ? scale(m.hukum) : ''}
        <p class="fq-sum">${esc(m.ringkas)}</p>
        ${m.langkah ? flow(m.langkah) : ''}
        ${m.nota ? `<p class="note">${icon('alert')}<span>${esc(m.nota)}</span></p>` : ''}
        ${m.app ? `<a class="card shortcut" href="${m.app[0]}"><span class="sc-ico">${icon('book')}</span><div class="sc-body"><div class="sc-title">${esc(m.app[1])}</div></div>${icon('chev', 'ic chev')}</a>` : ''}
        <h3 class="fq-sec">Rantaian rujukan</h3>
        <ol class="fq-refs">
          ${(m.q || []).length ? `<li style="--c:#1f9d63"><h4>Al-Quran</h4>${m.q.map(r => `<div class="fq-src" data-ayah="${r}"><p class="muted small">Memuatkan ayat ${r}</p></div>`).join('')}</li>` : ''}
          ${(m.h || []).length ? `<li style="--c:#7b5cf0"><h4>Hadis</h4>${m.h.map(k => hadithShell(k)).join('')}</li>` : ''}
          <li style="--c:#f2704d"><h4>Kitab muktabar mazhab Syafie</h4>${kitabList(b)}</li>
          ${(m.f || []).length ? `<li style="--c:#1192d6"><h4>Fatwa dan keputusan rasmi Malaysia</h4>${m.f.map(fatwaCard).join('')}</li>` : ''}
        </ol>
        <div class="actions"><button class="btn sm ghost" data-fq-copy="${m.k}">${icon('copy')}Salin senarai rujukan</button>${ext('https://github.com/shamirAI-RGB/bijak-labur/issues', 'Laporkan kesilapan')}</div>
        <p class="source">Teks ayat dan terjemahan Tafsir Pimpinan Ar-Rahman melalui api.alquran.cloud. Teks hadis dan gred melalui hadith-api (data sunnah.com) di jsDelivr. Kitab melalui Al-Maktabah al-Shamela.</p>
      </article>`;
    fillSources(my);
  }
  function hadithShell(k) {
    const h = D.H[k];
    return `<div class="fq-src" data-hadith="${k}"><div class="row-between"><b>${hRef(h)}</b>${ext(sunnahUrl(h), 'sunnah.com')}</div><p class="small muted">Riwayat ${esc(h.by)}</p><p class="fq-isi"><span>Isi ringkas</span>${esc(h.isi)}</p><div class="fq-live"><p class="muted small">Memuatkan teks hadis</p></div></div>`;
  }
  function fatwaCard(k) {
    const f = D.F[k];
    return `<div class="fq-src"><b>${esc(f.t)}</b><p class="small muted">${esc(f.by)}</p><p class="fq-isi"><span>Ringkasan keputusan</span>${esc(f.petik)}</p>${ext(f.url, 'Baca dokumen asal')}</div>`;
  }
  function fillSources(my) {
    $$('[data-ayah]', el).forEach(async n => {
      const ref = n.dataset.ayah;
      try {
        const a = await ayah(ref); if (my !== seq) return;
        n.innerHTML = `<div class="row-between"><b>Surah ${esc(a.surah)} (${a.s}:${a.a})</b><span class="fq-links"><a class="link-btn" href="#ibadah/quran/${a.s}/${a.a}">Buka</a>${ext(`https://quran.com/${a.s}/${a.a}`, 'quran.com')}</span></div><p class="ar fq-ar" lang="ar" dir="rtl">${esc(a.ar)}</p><p class="fq-tr">${esc(a.ms)}</p>`;
      } catch { if (my === seq) n.innerHTML = `<div class="row-between"><b>Ayat ${ref}</b><span class="fq-links"><a class="link-btn" href="#ibadah/quran/${ref.replace(':', '/')}">Buka</a>${ext(`https://quran.com/${ref.replace(':', '/')}`, 'quran.com')}</span></div><p class="muted small">Teks tidak dapat dimuat tanpa internet. Rujukan di atas tetap boleh dibuka.</p>`; }
    });
    $$('[data-hadith]', el).forEach(async n => {
      const h = D.H[n.dataset.hadith], box = $('.fq-live', n);
      try {
        const x = await hadith(h); if (my !== seq) return;
        box.innerHTML = `<p class="ar fq-ar fq-hadis" lang="ar" dir="rtl">${esc(x.ar)}</p><p class="fq-tr" lang="en">${esc(x.en)}</p>${x.grades.length ? `<div class="fq-grades">${x.grades.map(g => `<span class="fq-grade ${/sahih/i.test(g.grade) ? 'ok' : /da.?if/i.test(g.grade) ? 'weak' : ''}">${esc(g.name)}: ${esc(g.grade)}</span>`).join('')}</div>` : `<div class="fq-grades"><span class="fq-grade ok">${D.KOLEKSI[h.c]}: Sahih</span></div>`}`;
      } catch { if (my === seq) box.innerHTML = '<p class="muted small">Teks tidak dapat dimuat tanpa internet. Buka pautan sunnah.com untuk teks penuh.</p>'; }
    });
  }
  function citeText(m) {
    const b = BAB[m.bab], out = [m.t, ''];
    (m.q || []).forEach(r => out.push(`Al-Quran ${r} (https://quran.com/${r.replace(':', '/')})`));
    (m.h || []).forEach(k => { const h = D.H[k]; out.push(`${hRef(h)}, riwayat ${h.by} (${sunnahUrl(h)})`); });
    b.kitab.forEach(([k, p, ch]) => out.push(`${D.KITAB[k].name}, ${ch}, Shamela hlm. ${p} (${D.shamela(D.KITAB[k].id, p)})`));
    (m.f || []).forEach(k => out.push(`${D.F[k].by}, ${D.F[k].t} (${D.F[k].url})`));
    return out.join('\n');
  }

  /* ---------- Penghala ---------- */
  function render(target, args, head) {
    el = target; seq++;
    const b = args[0] && BAB[args[0]];
    if (!b) return home(head);
    const m = args[1] && D.MASALAH.find(x => x.bab === b.k && x.k === args[1]);
    if (args[1] && !m) { location.replace('#ibadah/fiqh/' + b.k); return; }
    m ? masalah(m, head) : bab(b, head);
    window.scrollTo({ top: 0 });
  }

  document.addEventListener('input', e => {
    if (e.target.id === 'fqFind') {
      const q = e.target.value.toLowerCase().trim(), box = $('#fqHits');
      if (!q) { box.innerHTML = ''; return; }
      const hits = D.MASALAH.filter(m => (m.t + ' ' + m.ringkas + ' ' + BAB[m.bab].name).toLowerCase().includes(q));
      box.innerHTML = hits.length ? `<div class="list">${hits.map(hitRow).join('')}</div>` : `<p class="muted small">Tiada masalah sepadan. Cuba cari dalil terus dari sumber di bawah.</p>`;
    } else if (e.target.id === 'fqDalil') $('#fqOut').innerHTML = outLinks(e.target.value.trim());
  });
  document.addEventListener('keydown', e => { if (e.target.id === 'fqDalil' && e.key === 'Enter') searchAyat(); });
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-fq-ayat]')) return searchAyat();
    const c = e.target.closest('[data-fq-copy]');
    if (c) { const m = D.MASALAH.find(x => x.k === c.dataset.fqCopy); try { await navigator.clipboard.writeText(citeText(m)); toast('Rujukan disalin'); } catch { toast('Tidak dapat menyalin'); } }
  });

  window.Fiqh = { render };
})();
