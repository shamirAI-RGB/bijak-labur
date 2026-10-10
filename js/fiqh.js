/* SiswaCap: Fiqh. Setiap masalah dipautkan kepada Al-Quran, hadis, kitab muktabar mazhab Syafie dan fatwa rasmi.
   Teks ayat dan hadis dimuat terus daripada sumber, bukan ditulis semula, supaya rujukan tidak tersasar. */
(function () {
  const D = FiqhData;
  const HAPI = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';
  // Pelayan Tanya AI (worker-fiqh). Boleh ditukar untuk ujian: store.set('fiqh_api', 'https://...workers.dev')
  const AI_API = (store.get('fiqh_api', '') || 'https://fiqh.bijaklabur.my').replace(/\/$/, '');
  const BAB = Object.fromEntries(D.BAB.map(b => [b.k, b]));
  const SCALE = ['wajib', 'sunat', 'harus', 'makruh', 'haram'];
  let el = null, seq = 0;

  const badge = h => `<span class="hk hk-${h}">${D.HUKUM[h][0]}</span>`;
  const sunnahUrl = h => `https://sunnah.com/${h.c}:${h.n}`;
  const hRef = h => `${D.KOLEKSI[h.c]} ${h.n.replace(/[a-z]$/, '')}`;
  const ext = (href, label) => /^https:\/\//.test(href) ? `<a class="link-btn" href="${esc(href)}" target="_blank" rel="noopener">${label}${icon('link')}</a>` : '';
  // Muka surat yang dipetik sahaja, bukan PDF penuh yang berat:
  //  1. Kitab: gambar satu muka surat cetakan dari archive.org (jika telah dipadankan dengan OCR)
  //  2. Dokumen rasmi: gambar satu muka surat yang dijana oleh pelayan Tanya AI
  //  3. Jika tiada gambar: teks muka surat itu (halaman Shamela atau muka surat PDF)
  const pageImg = (src, alt) => `<img class="fq-page-img" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  // Gambar satu muka surat dokumen rasmi di pelayan Tanya AI (bukan PDF penuh)
  const gambarDok = s => s.jenis !== 'kitab' && /^\/halaman\/[a-z]{2,12}\/\d{1,4}\.jpg$/.test(s.gambar || '') ? AI_API + s.gambar : '';
  const cetakPage = s => {
    const kitab = s.jenis === 'kitab', mufti = !!s.negeri;
    const img = kitab && /^https:\/\/(iiif\.)?archive\.org\//.test(s.gambar_url || '') ? s.gambar_url
      : gambarDok(s);
    const label = kitab ? (img ? `Muka surat ${esc(s.pdf)} dalam cetakan` : `Teks digital Shamela, halaman ${esc(s.shamela)} (gambar cetakan belum tersedia)`)
      : mufti ? 'Teks artikel yang dipetik' : `Muka surat ${esc(s.pdf)}`;
    const teks = s.teks_halaman ? `<div class="fq-page-teks${isAr(s.teks_halaman) ? ' ar' : ''}"${isAr(s.teks_halaman) ? ' lang="ar" dir="rtl"' : ''}>${esc(s.teks_halaman)}</div>` : '';
    if (!img && !teks) return s.pdf_url ? `<p class="small">${ext(s.pdf_url, `Buka PDF cetakan, muka surat ${esc(s.pdf)}`)}</p>` : '';
    const links = [kitab && img && ext(s.lihat_url, 'Buka di archive.org'), !mufti && ext(s.pdf_url || (!kitab && s.url), 'PDF penuh')].filter(Boolean).join('');
    // Artikel Mufti boleh panjang: teksnya dilipat, petikan tepat tetap dipaparkan di bawah
    return `<details class="fq-cetak"${mufti ? '' : ' open'}><summary>${icon('book')}${label}</summary>
      ${img ? pageImg(img, `${label}, ${s.tajuk}`) : teks}
      ${links ? `<p class="small fq-links">${links}</p>` : ''}</details>`;
  };

  /* ---------- Muat sumber ---------- */
  const cache = {};
  const getJSON = u => cache[u] || (cache[u] = fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(e => { delete cache[u]; throw e; }));
  const ayah = ref => QuranSrc.ayah(ref);
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
    el.innerHTML = head + `
      <p class="lead">Setiap jawapan dipautkan terus kepada sumbernya. Teks ayat dan hadis dimuat daripada pangkalan data asal semasa anda membukanya, bukan ditulis semula oleh AI. Rujukan yang tidak dapat disahkan tidak dimasukkan.</p>
      ${chainVisual()}
      <a class="card fq-ai-cta" href="#ibadah/fiqh/tanya"><span class="fq-ai-ico">${icon('quote')}</span><span class="q-main"><b>Tanya AI berasaskan rujukan</b><small>Jawapan hanya daripada kitab muktabar, Al-Quran, hadis, fatwa dan keputusan rasmi moden, dengan pautan ke muka surat sumber.</small></span>${icon('chev', 'ic chev')}</a>
      <div class="search-in"><svg class="ic"><use href="#i-search"/></svg><input id="fqFind" placeholder="Cari masalah, cth. riba, forex, CFD, kripto" aria-label="Cari masalah fiqh" autocomplete="off"></div>
      <div id="fqHits"></div>
      <h2 class="grid-title">Bab</h2>
      <div class="fq-babs">${D.BAB.map(b => `<a class="fq-bab card" href="#ibadah/fiqh/${b.k}" style="--c:${b.color}"><span class="fq-bab-ar" lang="ar" dir="rtl">${b.ar}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small><span class="fq-count num">${counts[b.k]} masalah</span></a>`).join('')}</div>
      <div class="two-col">
        <div class="card"><h3>Sumber hukum Islam</h3><p class="muted small">Mengikut susunan keutamaan dalam usul fiqh mazhab Syafie.</p>${pyramid()}</div>
        <div class="card"><h3>Lima hukum taklifi</h3>${scale()}<dl class="fq-defs">${SCALE.map(k => `<div><dt>${badge(k)}</dt><dd>${D.HUKUM[k][1]}</dd></div>`).join('')}</dl></div>
      </div>
      <div class="card"><h3>Cari dalil terus dari sumber</h3>
        <div class="fq-q"><input id="fqDalil" placeholder="Perkataan, cth. riba, forex atau solat" aria-label="Kata kunci dalil" autocomplete="off"><button class="btn sm" data-fq-ayat>Cari dalil</button></div>
        <div id="fqAyat"></div>
        <div class="fq-out" id="fqOut">${outLinks('')}</div></div>
      <h2 class="grid-title">Perpustakaan kitab muktabar</h2>
      <div class="list">${Object.keys(D.KITAB).map(k => { const b = D.KITAB[k]; return `<a class="fq-kitab" href="${D.shamela(b.id)}" target="_blank" rel="noopener"><span class="fq-kitab-ar" lang="ar" dir="rtl">${b.ar}</span><span class="q-main"><b>${esc(b.name)}</b><small>${esc(b.by)}</small></span><span class="fq-lvl-tag">${b.lvl}</span>${icon('link')}</a>`; }).join('')}</div>
      <h2 class="grid-title">Rujukan rasmi moden</h2>
      <p class="muted small">Himpunan keputusan rasmi untuk isu semasa seperti kewangan Islam, pelaburan, perubatan dan teknologi. Tanya AI mencari dalam teks dokumen ini dan memaut terus ke muka surat PDF yang dipetik.</p>
      <div class="list">${D.MODEN.map(m => `<a class="fq-kitab" href="${esc(m.url)}" target="_blank" rel="noopener"><span class="fq-kitab-ar fq-pdf">PDF</span><span class="q-main"><b>${esc(m.name)}</b><small>${esc(m.by)}, ${m.tahun} · ${esc(m.skop)}</small></span><span class="fq-lvl-tag">${m.bahasa === 'ms' ? 'BM' : 'EN'}</span>${icon('link')}</a>`).join('')}</div>
      <h2 class="grid-title">Laman Jabatan Mufti</h2>
      <p class="muted small">Fatwa, irsyad dan soal jawab hukum daripada laman web rasmi Jabatan Mufti setiap negeri dan portal fatwa kebangsaan, dikemas kini setiap hari supaya isu yang baru timbul turut dirujuk. Tanya AI menyebut negeri yang mengeluarkannya dan memaut terus ke halaman asal.</p>
      <div class="list">${(D.MUFTI || []).map(m => `<a class="fq-kitab" href="${esc(m.laman[0])}" target="_blank" rel="noopener"><span class="fq-kitab-ar fq-pdf">Fatwa</span><span class="q-main"><b>${esc(m.by)}</b><small>${esc(m.negeri)}</small></span>${icon('link')}</a>`).join('')}</div>
      <p class="note">${icon('alert')}<span>Bahagian ini untuk belajar dan bukan fatwa. Untuk kes peribadi, rujuk Jabatan Mufti negeri anda atau guru yang bertauliah.</span></p>`;
  }
  function outLinks(q) {
    return D.CARI.map(([n, s, u]) => `<a class="fq-out-link" href="${esc(u(q || ''))}" target="_blank" rel="noopener"><b>${n}</b><small>${s}</small>${icon('link')}</a>`).join('');
  }
  function hitRow(m) {
    return `<a class="fq-row" href="#ibadah/fiqh/${m.bab}/${m.k}"><span class="q-main"><b>${esc(m.t)}</b><small>${esc(BAB[m.bab].name)} · ${refCount(m)} rujukan</small></span>${badge(m.hukum)}${icon('chev', 'ic chev')}</a>`;
  }
  const refCount = m => (m.q || []).length + (m.h || []).length + (m.f || []).length + BAB[m.bab].kitab.length;

  // Carian ayat (sumber utama dan sandaran dalam js/quran-src.js); tiada padanan = senarai kosong
  const quranFind = w => QuranSrc.search(w).then(ms => ms.map(m => ({ surah: { number: m.s, englishName: m.surah }, numberInSurah: m.a, text: m.text })));
  const wordRe = w => new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu');
  const findMasalah = q => { q = q.toLowerCase(); return D.MASALAH.filter(m => (m.t + ' ' + (m.alias || '') + ' ' + m.ringkas + ' ' + BAB[m.bab].name).toLowerCase().includes(q)); };

  async function searchAyat() {
    const kw = ($('#fqDalil').value || '').trim(), box = $('#fqAyat');
    if (kw.length < 2) { box.innerHTML = '<p class="muted small">Masukkan sekurang-kurangnya 2 huruf.</p>'; return; }
    const rel = findMasalah(kw);
    const mapped = [...new Set(D.ISTILAH.filter(([re]) => re.test(kw)).flatMap(([, w]) => w))].filter(w => w.toLowerCase() !== kw.toLowerCase());
    const relHtml = rel.length ? `<p class="muted small">Masalah fiqh berkaitan "${esc(kw)}" dengan dalil dan fatwa:</p><div class="list">${rel.slice(0, 6).map(hitRow).join('')}</div>` : '';
    box.innerHTML = relHtml + '<p class="muted small">Mencari dalam terjemahan Basmeih</p>';
    const words = [kw, ...mapped];
    let res;
    try { res = await Promise.all(words.map(w => quranFind(w).then(ms => ms.filter(m => wordRe(w).test(m.text)).map(m => ({ ...m, w }))))); }
    catch { box.innerHTML = relHtml + '<p class="muted small">Carian ayat perlukan sambungan internet.</p>'; return; }
    const seen = new Set(), hits = res.flat().filter(m => { const k = m.surah.number + ':' + m.numberInSurah; return !seen.has(k) && seen.add(k); });
    const direct = res[0].length;
    const intro = direct ? `${direct} ayat mengandungi "${esc(kw)}"` + (mapped.length ? `, dan ayat tentang ${mapped.map(w => `"${esc(w)}"`).join(', ')}` : '')
      : mapped.length ? `Perkataan "${esc(kw)}" tiada dalam Al-Quran kerana ia istilah moden. Hukumnya diambil daripada ayat tentang ${mapped.map(w => `"${esc(w)}"`).join(' dan ')}:` : '';
    box.innerHTML = relHtml + (hits.length ? `<p class="muted small">${intro}</p><div class="list fq-ayat-list">${hits.slice(0, 25).map(m => `<a class="fq-row" href="#ibadah/quran/${m.surah.number}/${m.numberInSurah}"><span class="q-main"><b>${esc(m.surah.englishName)} ${m.surah.number}:${m.numberInSurah}${m.w !== kw ? ` <span class="fq-w">${esc(m.w)}</span>` : ''}</b><small>${esc(m.text.length > 160 ? m.text.slice(0, 160) + '…' : m.text)}</small></span>${icon('chev', 'ic chev')}</a>`).join('')}</div>`
      : `<p class="muted small">Tiada ayat dengan perkataan "${esc(kw)}" dalam terjemahan Basmeih.${rel.length ? ' Lihat masalah berkaitan di atas.' : ' Cuba perkataan asas seperti riba, judi atau hutang, atau gunakan pautan sumber di bawah.'}</p>`);
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
        <p class="source">Teks ayat dan terjemahan Tafsir Pimpinan Ar-Rahman melalui api.alquran.cloud (sandaran: Quran.com). Teks hadis dan gred melalui hadith-api (data sunnah.com) di jsDelivr. Kitab melalui Al-Maktabah al-Shamela.</p>
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
      if (!/^\d{1,3}:\d{1,3}$/.test(ref)) return;
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

  /* ---------- Tanya AI ---------- */
  const CONTOH = ['Apakah hukum trading forex secara individu?', 'Bolehkah solat jamak dan qasar jika pulang hari?', 'Adakah saham perlu dizakatkan?', 'Apakah rukun wuduk dalam mazhab Syafie?'];
  const JENIS = { kitab: ['Kitab muktabar', '#f2704d'], quran: ['Al-Quran', '#1f9d63'], hadis: ['Hadis', '#7b5cf0'], fatwa: ['Fatwa', '#1192d6'], dokumen: ['Rujukan rasmi moden', '#0f8b8d'], bijaklabur: ['Rujukan SiswaCap', '#c9853a'], lain: ['Sumber rasmi', '#66718f'] };
  const isAr = t => /[\u0600-\u06FF]/.test(t);
  let asking = false;

  function tanya(head) {
    el.innerHTML = head + `
      <div class="fq-crumb"><a href="#ibadah/fiqh">Fiqh</a>${icon('chev')}<span>Tanya AI</span></div>
      <div class="fq-hero" style="--c:#c9853a"><span lang="ar" dir="rtl">اسأل</span><div><h2>Tanya AI berasaskan rujukan</h2><p>Setiap jawapan mesti bersandarkan sumber yang boleh anda buka sendiri.</p></div></div>
      <ol class="fq-flow fq-ai-rules">
        <li><span class="num">1</span>AI hanya boleh memetik ${Object.keys(D.KITAB).length} kitab muktabar (Shamela; mazhab Syafie dan perbandingan mazhab), Al-Quran, hadis, fatwa rasmi Malaysia, ${D.MODEN.length} dokumen keputusan rasmi moden untuk isu semasa, dan fatwa serta irsyad terkini daripada laman web rasmi Jabatan Mufti setiap negeri dan portal e-SMAF.</li>
        <li><span class="num">2</span>Setiap petikan disemak dengan teks halaman sumber. Petikan yang tidak sepadan dibuang. Petikan kitab dipaparkan bersama gambar muka surat cetakannya, atau teks digital halaman itu daripada Shamela jika gambarnya belum tersedia.</li>
        <li><span class="num">3</span>Jika tiada sumber yang sah, AI menjawab "tidak pasti" dan meminta anda merujuk mufti.</li>
      </ol>
      <div class="card">
        <label for="fqAsk" class="small muted">Soalan anda</label>
        <textarea id="fqAsk" rows="3" maxlength="500" placeholder="Cth. Apakah hukum menggunakan leverage dalam trading saham?"></textarea>
        <div class="chips fq-ai-eg">${CONTOH.map(q => `<button class="chip" data-fq-eg="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <button class="btn" data-fq-ask>${icon('search')}Tanya</button>
      </div>
      <div id="fqAns" aria-live="polite"></div>
      <p class="note">${icon('alert')}<span>Tanya AI membantu mencari dan menyusun rujukan. Ia bukan mufti dan jawapannya bukan fatwa. AI boleh tersilap memahami teks, jadi bukalah muka surat sumber untuk menyemak. Untuk kes peribadi, rujuk Jabatan Mufti negeri anda atau guru yang bertauliah.</span></p>`;
  }

  async function ask() {
    const q = ($('#fqAsk').value || '').replace(/\s+/g, ' ').trim(), box = $('#fqAns');
    if (asking) return;
    if (q.length < 5) { box.innerHTML = '<p class="muted small">Tulis soalan sekurang-kurangnya 5 huruf.</p>'; return; }
    if (!(typeof Premium === 'undefined' || Premium.boleh('tanya'))) return;
    asking = true;
    const btn = $('[data-fq-ask]'); if (btn) btn.disabled = true;
    box.innerHTML = `<div class="card fq-ai-wait"><span class="fq-ai-spin" aria-hidden="true"></span><div><b>Mencari dalam kitab, fatwa dan dokumen rasmi</b><p class="muted small">AI sedang membuka muka surat sumber dan menyemak petikan. Ini mungkin mengambil masa sehingga satu minit.</p></div></div>`;
    const my = seq;
    try {
      const r = await fetch(AI_API + '/tanya', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q }) });
      const d = await r.json().catch(() => ({}));
      if (my !== seq) return;
      if (!r.ok) throw new Error(d.error || (r.status === 503 ? 'Tanya AI belum diaktifkan.' : 'Tanya AI tidak tersedia buat masa ini.'));
      answer(d, q);
      if (typeof Premium !== 'undefined') Premium.catat('tanya');
    } catch (e) {
      if (my === seq) box.innerHTML = `<p class="note">${icon('alert')}<span>${esc(e.message && !/fetch|network|load/i.test(e.message) ? e.message : 'Tidak dapat menghubungi Tanya AI. Semak sambungan internet anda.')}</span></p>`;
    } finally { asking = false; if (btn) btn.disabled = false; }
  }

  function answer(d, q) {
    const box = $('#fqAns'), src = d.sumber || [], verified = src.filter(s => s.disahkan).length;
    const head = d.status === 'jawab' ? `<span class="fq-ai-st ok">${icon('check')}${src.length} rujukan${verified ? `, ${verified} petikan disemak` : ''}</span>`
      : d.status === 'luar_skop' ? '<span class="fq-ai-st">Luar skop</span>' : `<span class="fq-ai-st warn">${icon('alert')}Tidak pasti</span>`;
    box.innerHTML = `<article class="fq-detail fq-ai-ans">
      <div class="row-between"><p class="small muted fq-ai-q">${esc(q)}</p>${head}</div>
      <p class="fq-sum">${esc(d.ringkasan || '')}</p>
      ${(d.huraian || []).map(p => `<p>${esc(p)}</p>`).join('')}
      ${d.khilaf ? `<div class="fq-ai-khilaf"><b>Perbezaan pendapat</b><p>${esc(d.khilaf)}</p></div>` : ''}
      ${d.nasihat ? `<p class="note">${icon('alert')}<span>${esc(d.nasihat)}</span></p>` : ''}
      ${d.nota_pdf ? `<p class="note">${icon('alert')}<span>${esc(d.nota_pdf)}</span></p>` : ''}
      ${src.length ? `<h3 class="fq-sec">Rujukan</h3><div>${src.map(sourceCard).join('')}</div>` : ''}
      <div class="actions"><button class="btn sm ghost" data-fq-copyai>${icon('copy')}Salin jawapan dan rujukan</button>${ext('https://github.com/shamirAI-RGB/bijak-labur/issues', 'Laporkan kesilapan')}</div>
    </article>`;
    box._ans = { d, q };
    fillSources(seq);
  }

  function sourceCard(s) {
    const [jenis, c] = JENIS[s.jenis] || JENIS.lain;
    // Artikel laman Jabatan Mufti: negeri yang mengeluarkannya, jabatan dan tarikh terbit
    const label = s.negeri ? `${jenis} · ${esc(s.negeri)}` : jenis;
    const page = s.shamela ? `Shamela, muka surat ${esc(s.shamela)}` : s.pdf ? `${s.oleh ? esc(s.oleh) + ' · ' : ''}PDF, muka surat ${esc(s.pdf)}` : s.negeri && s.oleh ? esc(s.oleh) : '';
    const printed = [s.jilid && `juz ${esc(s.jilid)}`, s.halaman && `hlm. ${esc(s.halaman)}`].filter(Boolean).join(', ');
    if (s.jenis === 'quran') return `<div class="fq-src fq-ai-src" style="--c:${c}" data-ayah="${esc(s.ref)}"><p class="muted small">Memuatkan ayat ${esc(s.ref)}</p></div>`;
    const hk = s.id && s.id.startsWith('hadis:') && D.H[s.id.slice(6)] ? s.id.slice(6) : '';
    const live = hk ? `<p class="fq-isi"><span>Isi ringkas</span>${esc(D.H[hk].isi)}</p><div class="fq-live"><p class="muted small">Memuatkan teks hadis</p></div>` : '';
    return `<div class="fq-src fq-ai-src" style="--c:${c}"${hk ? ` data-hadith="${hk}"` : ''}>
      <div class="row-between"><span class="fq-ai-kind">${label}</span>${ext(gambarDok(s) || s.url, s.jenis === 'kitab' || s.pdf ? 'Buka muka surat' : s.negeri ? 'Buka laman Mufti' : 'Buka sumber')}</div>
      <b>${esc(s.tajuk)}</b>${page || printed ? `<p class="small muted">${[page, printed].filter(Boolean).join(' · ')}</p>` : ''}
      ${s.penerbit || s.edisi ? `<p class="small muted">Cetakan: ${esc([s.penerbit, s.edisi && (s.penerbit ? 'cetakan ' + s.edisi : s.edisi), s.tahun].filter(Boolean).join(', '))}</p>` : ''}
      ${cetakPage(s)}
      ${s.petikan ? `<blockquote class="${isAr(s.petikan) ? 'ar fq-ar' : 'fq-tr'}"${isAr(s.petikan) ? ' lang="ar" dir="rtl"' : ''}>${esc(s.petikan)}</blockquote>` : ''}
      ${s.maksud ? `<p class="fq-tr">${esc(s.maksud)}</p>` : ''}
      ${s.untuk ? `<p class="small muted">Menyokong: ${esc(s.untuk)}</p>` : ''}
      ${live}
      <div class="fq-grades">${s.petikan ? `<span class="fq-grade ok">${icon('check')}Petikan sepadan dengan teks sumber</span>` : `<span class="fq-grade">Buka pautan untuk membaca teks penuh</span>`}</div>
    </div>`;
  }

  function aiCite({ d, q }) {
    const out = [`Soalan: ${q}`, '', d.ringkasan || '', ...(d.huraian || []), d.khilaf ? 'Perbezaan pendapat: ' + d.khilaf : '', '', 'Rujukan:'];
    (d.sumber || []).forEach(s => out.push(`- ${s.tajuk}${s.negeri && s.oleh ? `, ${s.oleh}` : ''}${s.shamela ? `, Shamela hlm. ${s.shamela}` : ''}${s.penerbit || s.edisi ? `, cetakan ${[s.penerbit, s.edisi, s.tahun].filter(Boolean).join(', ')}` : ''}${s.pdf ? `, PDF hlm. ${s.pdf}${s.pdf_url ? ` (${s.pdf_url})` : ''}` : ''}${s.halaman ? `, hlm. ${s.halaman}` : ''} (${s.url})${s.petikan ? `\n  "${s.petikan}"` : ''}`));
    if (d.nota_pdf) out.push('', d.nota_pdf);
    out.push('', 'Dijana oleh Tanya AI SiswaCap. Bukan fatwa; semak sumber asal.');
    return out.filter((l, i, a) => l || a[i - 1]).join('\n');
  }

  /* ---------- Penghala ---------- */
  function render(target, args, head) {
    el = target; seq++;
    if (args[0] === 'tanya') { tanya(head); window.scrollTo({ top: 0 }); return; }
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
      const hits = findMasalah(q);
      box.innerHTML = hits.length ? `<div class="list">${hits.map(hitRow).join('')}</div>` : `<p class="muted small">Tiada masalah sepadan. Cuba cari dalil terus dari sumber di bawah.</p>`;
    } else if (e.target.id === 'fqDalil') $('#fqOut').innerHTML = outLinks(e.target.value.trim());
  });
  // Gambar muka surat yang gagal dimuat: paparkan mesej dan kekalkan pautan
  document.addEventListener('error', e => {
    const img = e.target;
    if (img && img.classList && img.classList.contains('fq-page-img') && img.isConnected) img.outerHTML = '<p class="muted small">Gambar muka surat tidak dapat dimuat. Cuba pautan di bawah.</p>';
  }, true);
  document.addEventListener('keydown', e => {
    if (e.target.id === 'fqDalil' && e.key === 'Enter') searchAyat();
    if (e.target.id === 'fqAsk' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); }
  });
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-fq-ayat]')) return searchAyat();
    if (e.target.closest('[data-fq-ask]')) return ask();
    const eg = e.target.closest('[data-fq-eg]');
    if (eg) { $('#fqAsk').value = eg.dataset.fqEg; return ask(); }
    if (e.target.closest('[data-fq-copyai]')) { try { await navigator.clipboard.writeText(aiCite($('#fqAns')._ans)); toast('Jawapan disalin'); } catch { toast('Tidak dapat menyalin'); } return; }
    const c = e.target.closest('[data-fq-copy]');
    if (c) { const m = D.MASALAH.find(x => x.k === c.dataset.fqCopy); try { await navigator.clipboard.writeText(citeText(m)); toast('Rujukan disalin'); } catch { toast('Tidak dapat menyalin'); } }
  });

  window.Fiqh = { render };
})();
