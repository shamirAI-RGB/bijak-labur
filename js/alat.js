/* SiswaCap: Alat Pelajar. Tujuh alat untuk pelajar universiti (#alat dan #alat/<alat>):
   Penyelidikan & Sitasi (APA 7 disahkan Crossref), Pek Peperiksaan, Penyemak Rubrik, Jurulatih Pembentangan,
   Ingat Aktif (dengan dek ulang kaji berjadual), Nota Kuliah AI dan Pembantu Penulisan Akademik.
   AI melalui pelayan worker-fiqh (/alat, /transkrip). Bahan, hasil dan dek disimpan dalam peranti ini sahaja. */
(function () {
  const root = $('#view-alat');
  if (!root) return;
  const API = (store.get('fiqh_api', '') || 'https://fiqh.bijaklabur.my').replace(/\/$/, '');
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const fmt = n => Number(n).toLocaleString('ms-MY');
  const kata = t => (String(t).trim().match(/\S+/g) || []).length;
  const P = () => typeof Premium !== 'undefined' ? Premium : null;
  const isPro = () => !!(P() && P().plan);
  const MAX_BAHAN = 120000;

  const ALAT = [
    { id: 'rujukan', ic: 'quote', nama: 'Penyelidikan & Sitasi', tag: 'Ubah kertas jurnal menjadi kajian yang tersusun.', pro: true,
      desc: 'Muat naik sehingga 10 kertas. Dapatkan rujukan APA 7 yang disahkan dengan Crossref, matriks sorotan literatur, tema, jurang kajian dan draf sorotan dengan petikan dalam teks.' },
    { id: 'pek', ic: 'layers', nama: 'Pek Peperiksaan', tag: 'Ulang kaji satu kuliah dalam satu duduk.',
      desc: 'Daripada slaid (PDF, PPTX) atau nota: ringkasan, konsep utama, 10 MCQ, soalan esei dengan skema markah, kad imbas, ramalan topik dan mod peperiksaan bermasa.' },
    { id: 'rubrik', ic: 'target', nama: 'Penyemak Rubrik', tag: 'Kesan markah yang hilang sebelum menghantar.',
      desc: 'Bandingkan draf dengan rubrik kriteria demi kriteria. Anggaran markah dengan julat, bukti daripada draf anda dan langkah untuk naik ke band seterusnya.' },
    { id: 'coach', ic: 'chat', nama: 'Jurulatih Pembentangan', tag: 'Masuk sesi soal jawab dengan yakin.',
      desc: 'Soalan yang paling mungkin ditanya pensyarah. Jawab dengan suara atau teks, kemudian dapatkan skor, kelajuan bercakap, kiraan "erm" dan jawapan contoh.' },
    { id: 'ingat', ic: 'refresh', nama: 'Ingat Aktif', tag: 'Ingat, bukan sekadar kenal.',
      desc: 'Uji diri dengan soalan pendek, isi tempat kosong dan MCQ. Titik lemah setiap topik dikesan dan dimasukkan ke dek ulang kaji berjadual.' },
    { id: 'kuliah', ic: 'volume', nama: 'Nota Kuliah AI', tag: 'Jangan terlepas satu kuliah pun.', pro: true,
      desc: 'Rakam kuliah secara langsung atau muat naik rakaman. Dapatkan transkrip, nota gaya Cornell, konsep penting, soalan yang mungkin keluar dan tarikh tugasan.' },
    { id: 'tulis', ic: 'type', nama: 'Penulisan Akademik', tag: 'Tingkatkan penulisan sebelum menghantar.', pro: true,
      desc: 'Baiki ayat, struktur dan nada akademik perenggan demi perenggan sambil mengekalkan maksud asal. Setiap perubahan diterangkan, dan petikan yang hilang ditanda.' }
  ];
  const byId = Object.fromEntries(ALAT.map(a => [a.id, a]));

  /* ---------- Keadaan ---------- */
  let bahan = load('alat_bahan', { tajuk: '', teks: '' });           // bahan kongsi antara alat
  const H = load('alat_hasil', {});                                   // hasil terakhir setiap alat
  let dek = load('alat_dek', []);                                     // dek ulang kaji (sistem Leitner)
  const S = { busy: '', err: '', tab: {} };
  const simpanHasil = (k, v) => { H[k] = v; if (!save('alat_hasil', H)) { delete H.rujukan; save('alat_hasil', H); } };
  const simpanBahan = () => save('alat_bahan', bahan);

  /* ---------- Panggilan pelayan ---------- */
  async function panggil(path, body, kuota) {
    const pr = P();
    if (pr && kuota && !pr.boleh(kuota)) return null;
    const r = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Alat Pelajar tidak tersedia buat masa ini.');
    if (pr && kuota) pr.catat(kuota);
    return d;
  }
  const mesejRalat = e => e && e.message && !/fetch|network|load failed/i.test(e.message) ? e.message : 'Tiada sambungan internet. Cuba lagi.';
  // Alat Premium: pengguna percuma mendapat 1 percubaan sehari (kuota 'alatpro')
  // Nota Kuliah: menjana nota guna kuota biasa; Transkrip HD (audio) guna 'alatpro'
  const kuotaFor = id => id === 'rujukan' || id === 'tulis' ? 'alatpro' : 'alat';

  async function jalan(id, body, path = '/alat') {
    if (S.busy) return null;
    S.busy = id; S.err = ''; render();
    let d = null;
    try { d = await panggil(path, body, kuotaFor(id)); }
    catch (e) { S.err = mesejRalat(e); }
    S.busy = ''; render();
    return d;
  }

  const salin = async (t, ok = 'Disalin.') => { try { await navigator.clipboard.writeText(t); toast(ok); } catch { toast('Tidak dapat menyalin. Pilih teks secara manual.'); } };
  function muatTurun(nama, isi, jenis = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([isi], { type: jenis + ';charset=utf-8' }));
    a.download = nama; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const csv = rows => '﻿' + rows.map(r => r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\r\n');

  /* ---------- Dek ulang kaji (Leitner: kotak 1 hingga 5) ---------- */
  const SELANG = [0, 1, 3, 7, 14, 30];
  const hariIni = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
  const tambahHari = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const perluUlang = () => dek.filter(k => k.due <= hariIni());
  function tambahDek(kad, asal) {
    const ada = new Set(dek.map(k => k.depan.toLowerCase()));
    let n = 0;
    for (const k of kad) {
      if (!k.depan || !k.belakang || ada.has(k.depan.toLowerCase())) continue;
      dek.push({ id: Math.random().toString(36).slice(2, 9), depan: k.depan, belakang: k.belakang, topik: k.topik || '', asal: asal || '', kotak: 1, due: hariIni() });
      ada.add(k.depan.toLowerCase()); n++;
    }
    if (dek.length > 600) dek = dek.slice(-600);
    save('alat_dek', dek);
    toast(n ? `${n} kad ditambah ke dek ulang kaji.` : 'Kad ini sudah ada dalam dek.');
  }
  function nilaiKad(id, ingat) {
    const k = dek.find(x => x.id === id); if (!k) return;
    k.kotak = ingat === 2 ? Math.min(5, k.kotak + 1) : ingat === 1 ? k.kotak : 1;
    k.due = tambahHari(hariIni(), ingat === 0 ? 0 : SELANG[k.kotak]);
    save('alat_dek', dek);
  }

  /* ---------- Komponen bahan (dikongsi) ---------- */
  function bukuSumber() { return load('buku_sumber', []).filter(s => s && s.teks); }
  function bahanHTML(label = 'Bahan: slaid, nota atau bab buku', ph = 'Tampal nota kuliah atau teks slaid di sini') {
    const bs = bukuSumber();
    return `<div class="field al-bahan">
      <div class="row-between"><label for="alBahan">${label}</label><span class="muted small" id="alBahanKira">${fmt(bahan.teks.length)} aksara</span></div>
      <textarea id="alBahan" rows="9" maxlength="${MAX_BAHAN}" placeholder="${esc(ph)}">${esc(bahan.teks)}</textarea>
      <div class="row-gap al-bahan-btn">
        <label class="btn ghost sm">${icon('upload')}Muat naik PDF, PPTX, DOCX<input type="file" id="alBahanFail" accept=".pdf,.pptx,.docx,.txt,.md" multiple hidden></label>
        ${bs.length ? `<select id="alBuku" aria-label="Guna sumber Buku Nota AI"><option value="">Guna sumber Buku Nota AI…</option>${bs.map((s, i) => `<option value="${i}">${esc(s.tajuk)}</option>`).join('')}<option value="semua">Semua sumber (${bs.length})</option></select>` : ''}
        ${bahan.teks ? `<button class="link-btn" type="button" data-act="kosong-bahan">Kosongkan</button>` : ''}
      </div>
      ${bahan.tajuk ? `<p class="muted small">Bahan semasa: ${esc(bahan.tajuk)}. Bahan ini dikongsi oleh semua alat.</p>` : ''}
    </div>`;
  }
  async function bacaFail(files, had = MAX_BAHAN) {
    const out = [];
    for (const f of files) {
      try {
        const t = (await fileText(f)).trim();
        if (t.length < 50) { toast(`${f.name}: tiada teks yang boleh dibaca (PDF imbasan tidak disokong).`, 4500); continue; }
        out.push({ tajuk: f.name.replace(/\.[^.]+$/, ''), teks: t.slice(0, had) });
      } catch { toast(`Gagal membaca ${f.name}.`); }
    }
    return out;
  }

  /* ---------- Paparan umum ---------- */
  const tunggu = (t = 'Sedang menganalisis…') => `<div class="bk-wait al-wait" role="status"><div class="st-spin" aria-hidden="true"></div><p>${esc(t)}</p><p class="muted small">Bahan panjang boleh mengambil masa sehingga satu minit.</p></div>`;
  const ralat = () => S.err ? `<p class="error" role="alert">${esc(S.err)}</p>` : '';
  const tabs = (id, list) => {
    const cur = S.tab[id] || list[0][0];
    return `<div class="segmented bk-tabs al-tabs" role="tablist">${list.map(([k, n]) => `<button role="tab" type="button" class="seg${cur === k ? ' active' : ''}" aria-selected="${cur === k}" data-tab="${id}:${k}">${n}</button>`).join('')}</div>`;
  };
  const tabIni = (id, def) => S.tab[id] || def;
  const proLabel = a => a.pro ? `<span class="al-pro">Premium</span>` : '';
  const kuotaNota = id => {
    const pr = P(); if (!pr || pr.plan) return '';
    const k = kuotaFor(id), b = pr.baki(k);
    if (id === 'kuliah') return `<p class="muted small al-kuota">Kapsyen langsung dan nota percuma (baki ${pr.baki('alat')} hari ini). Transkrip HD daripada audio ialah ciri Premium: ${pr.baki('alatpro') ? '1 percubaan percuma hari ini' : 'percubaan hari ini sudah digunakan'}. <a href="#premium">Lihat Premium</a></p>`;
    return `<p class="muted small al-kuota">${kuotaFor(id) === 'alatpro' ? `Alat Premium. Pengguna percuma: ${b ? '1 percubaan hari ini' : 'percubaan hari ini sudah digunakan'}. <a href="#premium">Lihat Premium</a>` : `Baki percuma hari ini: ${b} permintaan. Premium tanpa had.`}</p>`;
  };
  const butang = (act, teks, ic, kelas = 'btn') => `<button class="${kelas}" type="button" data-act="${act}" ${S.busy ? 'disabled' : ''}>${icon(ic)}${teks}</button>`;
  const senarai = (xs, kelas = '') => xs && xs.length ? `<ul class="${kelas}">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';

  function hubHTML() {
    const due = perluUlang().length;
    return `<div class="page-head"><p class="eyebrow">Pelajar</p><h1 id="h-alat">Alat Pelajar</h1>
        <p class="lead">Tujuh alat AI untuk tugasan, pembentangan dan peperiksaan. Setiap petikan, bukti dan rujukan disemak dengan bahan anda sendiri, jadi AI tidak boleh mereka-reka.</p></div>
      ${dek.length ? `<a class="card al-ulang" href="#alat/ingat">
          <span class="al-ulang-n num">${due}</span>
          <span><b>${due ? 'kad perlu diulang kaji hari ini' : 'Tiada kad perlu diulang hari ini'}</b><span class="muted small">Dek ulang kaji: ${dek.length} kad, ${dek.filter(k => k.kotak >= 4).length} sudah dikuasai</span></span>
          ${icon('chev', 'ic chev')}</a>` : ''}
      <div class="al-grid">${ALAT.map((a, i) => `<a class="card al-kad" href="#alat/${a.id}">
          <span class="al-no num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <span class="al-ic">${icon(a.ic)}</span>
          <h2>${a.nama}${proLabel(a)}</h2>
          <p class="al-tag">${a.tag}</p>
          <p class="muted">${a.desc}</p>
          <span class="al-cuba">Cuba ${icon('chev')}</span></a>`).join('')}</div>
      <h2 class="grid-title">Alat berkaitan</h2>
      <div class="al-lain">
        <a class="card shortcut" href="#semak"><span class="sc-ico">${icon('file')}</span><div class="sc-body"><div class="sc-title">Semak Kertas</div><div class="sc-sub">Peratus tulisan AI, plagiarisme dan pembetulan ayat</div></div>${icon('chev', 'ic chev')}</a>
        <a class="card shortcut" href="#buku"><span class="sc-ico">${icon('book')}</span><div class="sc-body"><div class="sc-title">Buku Nota AI</div><div class="sc-sub">Tanya soalan tentang nota anda dengan petikan yang disahkan</div></div>${icon('chev', 'ic chev')}</a>
        <a class="card shortcut" href="#jadual"><span class="sc-ico">${icon('calendar')}</span><div class="sc-body"><div class="sc-title">Jadual kelas UiTM</div><div class="sc-sub">Susun jadual kuliah dan skrin kunci</div></div>${icon('chev', 'ic chev')}</a>
      </div>
      <p class="note">${icon('alert')}<span>Alat ini membantu anda belajar dan menulis dengan lebih baik. Hasil AI ialah panduan dan boleh tersilap; semak dengan pensyarah dan bahan asal. Ikut dasar integriti akademik universiti anda: jangan hantar hasil AI sebagai kerja sendiri.</span></p>`;
  }

  function kepala(a) {
    return `<div class="page-head al-head"><a class="al-balik" href="#alat">${icon('chev')}<span>Semua alat</span></a>
      <div class="al-tajuk"><span class="al-ic">${icon(a.ic)}</span><div><h1 id="h-alat">${a.nama}${proLabel(a)}</h1><p class="lead">${a.tag}</p></div></div></div>`;
  }

  /* =========================================================
     1. Penyelidikan & Sitasi
     ========================================================= */
  let kertas = [];   // fail yang dimuat naik (sesi ini): { tajuk, teks }
  const R = () => H.rujukan;
  const metaApa = k => ({ jenis: k.jenis, pengarang: k.pengarang, tahun: k.tahun, tajuk: k.tajuk, sumber: k.sumber, jilid: k.jilid, isu: k.isu, halaman: k.halaman, penerbit: k.penerbit, doi: k.doi, url: k.url });
  const apaOf = k => APA.format(metaApa(k));
  const citeId = id => { const k = R() && R().kertas.find(x => x.id === id); return k ? apaOf(k).intext.slice(1, -1) : id; };

  // Sahkan atau lengkapkan metadata dengan Crossref (DOI, atau carian tajuk dengan padanan ketat)
  const CR_JENIS = { 'journal-article': 'jurnal', book: 'buku', 'book-chapter': 'bab', 'proceedings-article': 'prosiding', report: 'laporan', dissertation: 'tesis', 'posted-content': 'web' };
  const tok = t => new Set(String(t || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 2));
  const serupa = (a, b) => { const A = tok(a), Bs = tok(b); if (!A.size || !Bs.size) return 0; let n = 0; A.forEach(w => Bs.has(w) && n++); return n / Math.max(A.size, Bs.size); };
  // Crossref kadangkala memulangkan tanda HTML (<i>, <sub>) dan &amp; dalam tajuk dan nama jurnal
  const crTeks = s => String(s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  function dariCrossref(w) {
    const d = (w.issued && w.issued['date-parts'] && w.issued['date-parts'][0]) || [];
    return {
      jenis: CR_JENIS[w.type] || 'jurnal',
      pengarang: (w.author || []).map(a => a.family ? { akhir: crTeks(a.family), awal: crTeks(a.given) } : a.name ? { org: crTeks(a.name) } : null).filter(Boolean),
      tahun: d[0] ? String(d[0]) : '', tajuk: crTeks((w.title || [])[0]), sumber: crTeks((w['container-title'] || [])[0]),
      jilid: w.volume || '', isu: w.issue || '', halaman: w.page || '', penerbit: crTeks(w.publisher), doi: w.DOI || ''
    };
  }
  async function sahkanCrossref() {
    const h = R(); if (!h) return;
    await Promise.all(h.kertas.map(async k => {
      if (k.cr) return;
      try {
        let w = null;
        if (k.doi) {
          const r = await fetch('https://api.crossref.org/works/' + encodeURIComponent(k.doi));
          if (r.ok) w = (await r.json()).message;
          k.cr = w ? 'doi' : 'tiada';
        } else if (k.tajuk && k.tajuk.length > 15) {
          const r = await fetch('https://api.crossref.org/works?rows=3&select=DOI,title,author,issued,container-title,volume,issue,page,publisher,type&query.bibliographic=' + encodeURIComponent(k.tajuk));
          const items = r.ok ? (await r.json()).message.items || [] : [];
          w = items.find(it => serupa(crTeks((it.title || [])[0]), k.tajuk) >= 0.85) || null;
          k.cr = w ? 'tajuk' : 'tiada';
        } else k.cr = 'tiada';
        if (w) { k.asal = metaApa(k); Object.assign(k, Object.fromEntries(Object.entries(dariCrossref(w)).filter(([, v]) => v && (!Array.isArray(v) || v.length)))); }
      } catch { k.cr = ''; }
    }));
    // Analisis baharu mungkin sudah menggantikan hasil ini semasa menunggu Crossref: jangan timpa
    if (R() !== h) return;
    simpanHasil('rujukan', h);
    if (aktif() === 'rujukan') render();
  }

  function rujukanHTML() {
    const h = R(), had = isPro() ? 10 : 2;
    const borang = `<div class="card al-muat">
        <div class="row-between"><h2>Kertas penyelidikan anda</h2><span class="muted small">${kertas.length}/${had} fail</span></div>
        <label class="al-drop" id="alDrop"><input type="file" id="alKertas" accept=".pdf,.docx,.txt" multiple hidden>
          ${icon('upload')}<b>Ketik untuk muat naik atau lepaskan fail di sini</b><span class="muted small">Kertas jurnal atau artikel PDF · teks sahaja dibaca dalam peranti anda · paling banyak ${had} fail${isPro() ? '' : ' (Premium: 10)'}</span></label>
        ${kertas.length ? `<ul class="bk-list">${kertas.map((k, i) => `<li><span><b>${esc(k.tajuk)}</b><span class="muted small"> ${fmt(k.teks.length)} aksara</span></span><button class="icon-btn plain" type="button" data-buang-kertas="${i}" aria-label="Buang ${esc(k.tajuk)}">${icon('trash')}</button></li>`).join('')}</ul>` : ''}
        ${butang('analisis-kertas', 'Analisis kertas', 'search')}
        ${kuotaNota('rujukan')}
      </div>`;
    if (S.busy === 'rujukan') return borang + tunggu('Membaca kertas dan menyusun kajian…');
    if (!h) return borang + ralat() + `<div class="card al-contoh"><h2>Apa yang anda dapat</h2>${senarai(['Rujukan APA edisi ke-7 setiap kertas, disahkan dengan pangkalan data Crossref apabila DOI atau tajuk dijumpai', 'Petikan dalam teks seperti (Ahmad et al., 2021) dan senarai rujukan tersusun mengikut abjad', 'Matriks sorotan literatur: objektif, metodologi, sampel, dapatan dan batasan setiap kertas (muat turun CSV untuk Excel)', 'Tema merentas kertas, percanggahan dapatan, jurang kajian dan cadangan soalan kajian', 'Draf sorotan literatur yang menyintesis kertas, bukan sekadar meringkaskan', 'Petikan penting yang disahkan wujud dalam kertas asal'], 'al-ciri')}</div>`;
    const tab = tabIni('rujukan', 'kertas');
    const senaraiApa = APA.susun(h.kertas.map(metaApa)).map(m => APA.format(m));
    let isi = '';
    if (tab === 'kertas') isi = h.kertas.map(k => {
      const a = apaOf(k);
      const lencana = k.cr === 'doi' ? `<span class="al-lencana ok">${icon('check')}DOI disahkan Crossref</span>` : k.cr === 'tajuk' ? `<span class="al-lencana ok">${icon('check')}Dipadankan dengan Crossref</span>` : k.cr === 'tiada' ? `<span class="al-lencana">Diekstrak daripada PDF: semak butiran</span>` : '';
      return `<article class="card al-kertas">
        <div class="row-between"><span class="al-kid num">${k.id}</span>${lencana}</div>
        <p class="al-apa">${a.html}</p>
        <div class="row-gap"><button class="link-btn" type="button" data-salin-apa="${k.id}">${icon('copy')}Salin rujukan</button><button class="link-btn" type="button" data-salin-intext="${k.id}">${icon('quote')}Salin ${esc(a.intext)}</button></div>
        <dl class="al-dl">
          ${k.objektif ? `<dt>Objektif</dt><dd>${esc(k.objektif)}</dd>` : ''}${k.metodologi ? `<dt>Metodologi</dt><dd>${esc(k.metodologi)}</dd>` : ''}${k.sampel ? `<dt>Sampel</dt><dd>${esc(k.sampel)}</dd>` : ''}
          ${k.dapatan.length ? `<dt>Dapatan</dt><dd>${senarai(k.dapatan)}</dd>` : ''}${k.had.length ? `<dt>Batasan</dt><dd>${senarai(k.had)}</dd>` : ''}
        </dl>
        ${k.kata_kunci.length ? `<div class="kj-tags">${k.kata_kunci.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
        ${k.petikan.length ? `<details class="bk-cites"><summary>${k.petikan.length} petikan disahkan</summary>${k.petikan.map(p => `<blockquote class="bk-q"><p>“${esc(p)}”</p><cite>${esc(a.intext)}</cite></blockquote>`).join('')}</details>` : ''}
        <details class="al-sunting"><summary>Sunting butiran rujukan</summary><form class="form-grid" data-meta="${k.id}">
          ${[['tajuk', 'Tajuk'], ['sumber', 'Jurnal / buku / laman'], ['tahun', 'Tahun'], ['jilid', 'Jilid'], ['isu', 'Isu'], ['halaman', 'Halaman'], ['penerbit', 'Penerbit'], ['doi', 'DOI']].map(([f, l]) => `<div class="field"><label>${l}<input data-f="${f}" value="${esc(k[f] || '')}"></label></div>`).join('')}
          <div class="field"><label>Pengarang (satu baris setiap orang: Nama keluarga, Nama lain)<textarea data-f="pengarang" rows="3">${esc(k.pengarang.map(p => p.org || [p.akhir, p.awal].filter(Boolean).join(', ')).join('\n'))}</textarea></label></div>
          <div class="field"><label>Jenis<select data-f="jenis">${[['jurnal', 'Artikel jurnal'], ['buku', 'Buku'], ['bab', 'Bab dalam buku'], ['prosiding', 'Prosiding'], ['laporan', 'Laporan'], ['tesis', 'Tesis'], ['web', 'Laman web']].map(([v, l]) => `<option value="${v}" ${k.jenis === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
        </form></details>
      </article>`;
    }).join('');
    if (tab === 'matriks') isi = `<div class="card al-matriks-wrap"><div class="row-between"><h2>Matriks sorotan literatur</h2><button class="btn ghost sm" type="button" data-act="matriks-csv">${icon('download')}CSV untuk Excel</button></div>
      <div class="al-skrol"><table class="al-matriks"><thead><tr><th>Kajian</th><th>Objektif</th><th>Metodologi</th><th>Sampel</th><th>Dapatan utama</th><th>Batasan</th></tr></thead><tbody>
      ${h.kertas.map(k => `<tr><th scope="row">${esc(apaOf(k).intextNaratif)}</th><td>${esc(k.objektif)}</td><td>${esc(k.metodologi)}</td><td>${esc(k.sampel)}</td><td>${senarai(k.dapatan)}</td><td>${senarai(k.had)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
    if (tab === 'sintesis') isi = `<div class="card bk-out">
      ${h.tema.length ? `<h3>Tema</h3>${h.tema.map(t => `<div class="bk-topic"><b>${esc(t.nama)}</b><p>${esc(t.huraian)}</p><div class="kj-tags">${t.kertas.map(id => `<span>${esc(citeId(id))}</span>`).join('')}</div></div>`).join('')}` : ''}
      ${h.percanggahan.length ? `<h3>Percanggahan dan perbezaan dapatan</h3>${h.percanggahan.map(t => `<div class="bk-topic"><b>${esc(t.isu)}</b><p>${esc(t.huraian)}</p><div class="kj-tags">${t.kertas.map(id => `<span>${esc(citeId(id))}</span>`).join('')}</div></div>`).join('')}` : ''}
      ${h.jurang.length ? `<h3>Jurang kajian</h3>${senarai(h.jurang)}` : ''}
      ${h.soalan_kajian.length ? `<h3>Cadangan soalan kajian</h3>${senarai(h.soalan_kajian)}` : ''}</div>`;
    if (tab === 'sorotan') isi = `<div class="card bk-out"><div class="row-between"><h2>Draf sorotan literatur</h2><button class="btn ghost sm" type="button" data-act="salin-sorotan">${icon('copy')}Salin</button></div>
      ${h.sorotan.map(p => `<p>${esc(p)}</p>`).join('')}
      <p class="muted small">Draf ini titik permulaan. Tulis semula dengan suara anda sendiri, semak setiap dakwaan dengan kertas asal, dan semak di Semak Kertas sebelum menghantar.</p></div>`;
    if (tab === 'senarai') isi = `<div class="card"><div class="row-between"><h2>Rujukan</h2><div class="row-gap"><button class="btn ghost sm" type="button" data-act="salin-senarai">${icon('copy')}Salin semua</button><button class="btn ghost sm" type="button" data-act="bibtex">${icon('download')}BibTeX</button><button class="btn ghost sm" type="button" data-act="ris">${icon('download')}RIS (Mendeley, Zotero)</button></div></div>
      <ol class="al-senarai-apa">${senaraiApa.map(a => `<li>${a.html}</li>`).join('')}</ol>
      <p class="muted small">Format APA edisi ke-7. Tajuk dikekalkan seperti dalam kertas: tukar tajuk artikel kepada huruf besar ayat (sentence case) jika pensyarah meminta.</p></div>`;
    return borang + ralat() + `<div class="row-between al-hasil-kepala">${tabs('rujukan', [['kertas', 'Kertas'], ['matriks', 'Matriks'], ['sintesis', 'Sintesis'], ['sorotan', 'Sorotan'], ['senarai', 'Senarai rujukan']])}</div>${isi}`;
  }
  function bibtex(list) {
    return list.map((k, i) => {
      const kunci = ((k.pengarang[0] && (k.pengarang[0].akhir || k.pengarang[0].org) || 'tanpanama').replace(/[^A-Za-z]/g, '').toLowerCase() || 'rujukan') + (k.tahun || 'nd') + String.fromCharCode(97 + i % 26);
      const jenis = { jurnal: 'article', buku: 'book', bab: 'incollection', prosiding: 'inproceedings', laporan: 'techreport', tesis: 'phdthesis', web: 'misc' }[k.jenis] || 'article';
      const f = [['author', k.pengarang.map(p => p.org ? `{${p.org}}` : `${p.akhir}, ${p.awal}`).join(' and ')], ['title', k.tajuk], [jenis === 'article' ? 'journal' : 'booktitle', k.sumber], ['year', k.tahun], ['volume', k.jilid], ['number', k.isu], ['pages', (k.halaman || '').replace(/\s*[-–—]+\s*/g, '--')], ['publisher', k.penerbit], ['doi', k.doi], ['url', k.url]].filter(x => x[1]);
      return `@${jenis}{${kunci},\n${f.map(([a, b]) => `  ${a} = {${String(b).replace(/[{}]/g, '')}}`).join(',\n')}\n}`;
    }).join('\n\n');
  }
  function ris(list) {
    return list.map(k => {
      const ty = { jurnal: 'JOUR', buku: 'BOOK', bab: 'CHAP', prosiding: 'CPAPER', laporan: 'RPRT', tesis: 'THES', web: 'ELEC' }[k.jenis] || 'JOUR';
      const l = [['TY', ty], ...k.pengarang.map(p => ['AU', p.org || `${p.akhir}, ${p.awal}`]), ['TI', k.tajuk], ['T2', k.sumber], ['PY', k.tahun], ['VL', k.jilid], ['IS', k.isu], ['SP', (k.halaman || '').split(/[-–—]/)[0]], ['EP', (k.halaman || '').split(/[-–—]/)[1]], ['PB', k.penerbit], ['DO', k.doi], ['UR', k.url], ['ER', '']];
      return l.filter(x => x[0] === 'ER' || x[1]).map(([a, b]) => `${a}  - ${b || ''}`).join('\r\n');
    }).join('\r\n\r\n');
  }

  /* =========================================================
     2. Pek Peperiksaan
     ========================================================= */
  let pekJawab = {}, pekMasa = null;
  function pekHTML() {
    const h = H.pek;
    const borang = `<div class="card">${bahanHTML()}<div class="row-gap">${butang('jana-pek', h ? 'Jana semula pek' : 'Jana pek peperiksaan', 'layers')}</div>${kuotaNota('pek')}</div>`;
    if (S.busy === 'pek') return borang + tunggu('Menyediakan ringkasan, soalan dan kad imbas…');
    if (!h) return borang + ralat();
    const tab = tabIni('pek', 'ringkasan');
    let isi = '';
    if (tab === 'ringkasan') isi = `<div class="card bk-out"><h2>${esc(h.tajuk || 'Ringkasan')}</h2>${h.ringkasan.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('')}
      <h3>Konsep utama</h3>${h.konsep.map(k => `<div class="bk-topic al-konsep"><span class="al-titik" title="Kekerapan diuji" aria-label="Kepentingan ${k.penting} daripada 3">${'●'.repeat(k.penting)}${'○'.repeat(3 - k.penting)}</span><b>${esc(k.nama)}</b><p>${esc(k.huraian)}</p></div>`).join('')}</div>`;
    if (tab === 'mcq') {
      const jawab = Object.keys(pekJawab).length, betul = h.mcq.filter((q, i) => pekJawab[i] === q.jawapan).length;
      isi = `<div class="card"><div class="row-between"><h2>Soalan aneka pilihan</h2><div class="row-gap">${pekMasa ? `<span class="al-masa num" id="alMasa"></span>` : h.mcq.length ? `<button class="btn ghost sm" type="button" data-act="mod-masa">${icon('clock')}Mod peperiksaan (${h.mcq.length} min)</button>` : ''}${jawab ? `<button class="link-btn" type="button" data-act="ulang-mcq">Ulang</button>` : ''}</div></div>
        ${h.mcq.length ? '' : `<p class="muted">Tiada soalan aneka pilihan yang sah dalam pek ini. Tekan "Jana semula pek" untuk mencuba lagi.</p>`}
        ${jawab ? `<p class="bk-score">Skor: <b class="num">${betul}/${jawab}</b>${jawab === h.mcq.length ? ` (${Math.round(betul / h.mcq.length * 100)}%)` : ''}</p>` : ''}
        ${h.mcq.map((q, i) => { const a = pekJawab[i]; return `<div class="bk-mcq"><p><b>${i + 1}.</b> ${esc(q.soalan)} <span class="al-aras">${esc(q.aras)}</span></p><div class="bk-opts">${q.pilihan.map((p, j) => `<button type="button" class="bk-opt${a != null ? (j === q.jawapan ? ' ok' : j === a ? ' bad' : '') : ''}" data-mcq="${i}:${j}" ${a != null ? 'disabled' : ''}>${'ABCD'[j]}. ${esc(p)}</button>`).join('')}</div>${a != null ? `<p class="muted small">${esc(q.penerangan)}</p>` : ''}</div>`; }).join('')}</div>`;
    }
    if (tab === 'esei') isi = `<div class="card">${h.esei.map((e, i) => `<div class="al-esei"><p><b>Soalan ${i + 1}</b> <span class="muted">(${fmt(e.markah)} markah)</span></p><p>${esc(e.soalan)}</p>
        <details><summary>Lihat skema pemarkahan</summary><table class="al-skema"><tbody>${e.skema.map(s => `<tr><td>${esc(s.isi)}</td><td class="num">${fmt(s.markah)}</td></tr>`).join('')}</tbody></table>${e.tip ? `<p class="muted small"><b>Tip:</b> ${esc(e.tip)}</p>` : ''}</details></div>`).join('')}</div>`;
    if (tab === 'kad') isi = `<div class="card"><div class="row-between"><h2>Kad imbas</h2><div class="row-gap"><button class="btn ghost sm" type="button" data-act="dek-pek">${icon('plus')}Tambah ke dek ulang kaji</button><button class="btn ghost sm" type="button" data-act="anki">${icon('download')}Anki (CSV)</button></div></div>
        <p class="muted small">Ketik kad untuk melihat jawapan.</p><div class="bk-cards">${h.kad.map((k, i) => `<button type="button" class="bk-card" data-flip="${i}" aria-pressed="false">${esc(k.depan)}</button>`).join('')}</div></div>`;
    if (tab === 'ramalan') isi = `<div class="card bk-out"><h2>Topik paling mungkin keluar</h2>${h.ramalan.map((r, i) => `<div class="bk-topic"><b><span class="num">${i + 1}.</span> ${esc(r.topik)}</b><p>${esc(r.sebab)}</p></div>`).join('')}
        ${h.mnemonik.length ? `<h3>Mnemonik</h3>${h.mnemonik.map(m => `<div class="bk-topic"><b>${esc(m.mnemonik)}</b><p class="muted">${esc(m.untuk)}</p></div>`).join('')}` : ''}
        <p class="muted small">Ramalan berdasarkan penekanan dalam bahan anda, bukan kertas soalan sebenar.</p></div>`;
    return borang + ralat() + `<div class="row-between al-hasil-kepala">${tabs('pek', [['ringkasan', 'Ringkasan'], ['mcq', `MCQ (${h.mcq.length})`], ['esei', 'Esei + skema'], ['kad', 'Kad imbas'], ['ramalan', 'Ramalan']])}<button class="link-btn" type="button" data-act="salin-pek">${icon('copy')}Salin semua</button></div>${isi}`;
  }
  function pekTeks(h) {
    return [`${h.tajuk}\n\n${h.ringkasan}`, 'KONSEP UTAMA\n' + h.konsep.map(k => `- ${k.nama}: ${k.huraian}`).join('\n'),
      'MCQ\n' + h.mcq.map((q, i) => `${i + 1}. ${q.soalan}\n${q.pilihan.map((p, j) => `   ${'ABCD'[j]}. ${p}`).join('\n')}\n   Jawapan: ${'ABCD'[q.jawapan]}. ${q.penerangan}`).join('\n'),
      'ESEI\n' + h.esei.map((e, i) => `${i + 1}. ${e.soalan} (${e.markah} markah)\n${e.skema.map(s => `   - ${s.isi} [${s.markah}]`).join('\n')}`).join('\n'),
      'KAD IMBAS\n' + h.kad.map(k => `- ${k.depan} :: ${k.belakang}`).join('\n'),
      'RAMALAN TOPIK\n' + h.ramalan.map(r => `- ${r.topik}: ${r.sebab}`).join('\n')].join('\n\n');
  }
  let pemasa = null;
  function mulaPemasa() {
    clearInterval(pemasa);
    pemasa = setInterval(() => {
      const el = $('#alMasa'); if (!pekMasa) { clearInterval(pemasa); return; }
      const baki = Math.max(0, Math.round((pekMasa - Date.now()) / 1000));
      if (el) el.textContent = `${Math.floor(baki / 60)}:${String(baki % 60).padStart(2, '0')}`;
      if (!baki) { clearInterval(pemasa); pekMasa = null; toast('Masa tamat. Lihat skor anda.'); H.pek.mcq.forEach((q, i) => { if (pekJawab[i] == null) pekJawab[i] = -1; }); render(); }
    }, 500);
  }

  /* =========================================================
     3. Penyemak Rubrik
     ========================================================= */
  const TEMPLAT = {
    laporan: ['Laporan / penulisan akademik', `Pengenalan dan objektif (10 markah): Cemerlang 9-10 latar belakang jelas, objektif khusus dan boleh diukur; Baik 7-8; Sederhana 5-6; Lemah 0-4.
Kandungan dan perbincangan (30 markah): Cemerlang 26-30 hujah mendalam, disokong bukti dan contoh; Baik 20-25; Sederhana 14-19; Lemah 0-13.
Analisis kritis (20 markah): Cemerlang 17-20 membandingkan pandangan, menilai kekuatan dan kelemahan; Baik 13-16; Sederhana 9-12; Lemah 0-8.
Kesimpulan dan cadangan (10 markah): Cemerlang 9-10 merumus dapatan dan cadangan praktikal; Baik 7-8; Sederhana 5-6; Lemah 0-4.
Rujukan dan sitasi APA 7 (10 markah): Cemerlang 9-10 sekurang-kurangnya 8 sumber akademik, sitasi dalam teks dan senarai tepat; Baik 7-8; Sederhana 5-6; Lemah 0-4.
Organisasi, bahasa dan format (10 markah): Cemerlang 9-10 tersusun, tatabahasa tepat, format mengikut arahan; Baik 7-8; Sederhana 5-6; Lemah 0-4.`],
    refleksi: ['Esei refleksi', `Huraian pengalaman (20 markah): jelas dan khusus.
Refleksi dan analisis kendiri (30 markah): menghubungkan pengalaman dengan teori atau konsep kursus, mengenal pasti perasaan, andaian dan pembelajaran.
Aplikasi masa depan (20 markah): pelan tindakan konkrit.
Struktur dan bahasa (20 markah): aliran logik, bahasa tepat.
Rujukan (10 markah): sekurang-kurangnya 3 sumber dengan sitasi APA.`],
    kes: ['Kajian kes', `Pengenalan isu (10 markah).
Pengenalpastian masalah (20 markah): masalah utama dan punca disokong fakta kes.
Analisis menggunakan teori atau model (30 markah): contoh SWOT, PESTEL atau kerangka kursus.
Cadangan penyelesaian (25 markah): pelbagai alternatif, dinilai, dan cadangan terbaik dengan justifikasi.
Kesimpulan (5 markah).
Rujukan dan format (10 markah).`],
    proposal: ['Kertas cadangan penyelidikan', `Latar belakang dan pernyataan masalah (15 markah).
Objektif dan soalan kajian (10 markah): selari dengan masalah.
Sorotan literatur (25 markah): sintesis sekurang-kurangnya 10 kajian lepas, jurang kajian jelas.
Metodologi (25 markah): reka bentuk, sampel, instrumen, analisis data yang sesuai dan dijustifikasi.
Kepentingan kajian (10 markah).
Rujukan APA 7 dan format (15 markah).`]
  };
  let rb = load('alat_rubrik', { rubrik: '', arahan: '', draf: '' });
  const simpanRb = () => save('alat_rubrik', rb);
  function rubrikHTML() {
    const h = H.rubrik;
    const borang = `<form class="card al-rubrik-borang" id="alRbForm">
        <div class="field"><div class="row-between"><label for="alRubrik">Rubrik pemarkahan</label><select id="alTemplat" aria-label="Templat rubrik"><option value="">Templat…</option>${Object.entries(TEMPLAT).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
          <textarea id="alRubrik" rows="6" maxlength="15000" placeholder="Tampal rubrik daripada pensyarah, termasuk kriteria, markah dan band">${esc(rb.rubrik)}</textarea>
          <p class="muted small">Templat ialah rubrik umum gaya universiti Malaysia. Rubrik sebenar pensyarah anda sentiasa lebih tepat.</p></div>
        <div class="field"><label for="alArahan">Arahan tugasan (pilihan)</label><textarea id="alArahan" rows="2" maxlength="5000" placeholder="cth. Tulis laporan 1500 patah perkataan tentang...">${esc(rb.arahan)}</textarea></div>
        <div class="field"><div class="row-between"><label for="alDraf">Draf anda</label><label class="link-btn">${icon('upload')}PDF/DOCX<input type="file" id="alDrafFail" accept=".pdf,.docx,.txt" hidden></label></div>
          <textarea id="alDraf" rows="9" maxlength="60000" placeholder="Tampal draf tugasan anda">${esc(rb.draf)}</textarea><p class="muted small"><span id="alDrafKata">${fmt(kata(rb.draf))}</span> patah perkataan</p></div>
        <div class="row-gap">${butang('semak-rubrik', 'Semak dengan rubrik', 'target')}</div>${kuotaNota('rubrik')}
      </form>`;
    if (S.busy === 'rubrik') return borang + tunggu('Menilai draf kriteria demi kriteria…');
    if (!h) return borang + ralat();
    const pct = h.penuh ? Math.round(h.jumlah / h.penuh * 100) : 0;
    const warna = pct >= 75 ? 'var(--up)' : pct >= 50 ? 'var(--warn)' : 'var(--down)';
    return borang + ralat() + `<div class="card al-skor-kad">
        <div class="al-cincin" style="--p:${pct};--w:${warna}"><span class="num">${fmt(h.jumlah)}</span><small>daripada ${fmt(h.penuh)}</small></div>
        <div><h2>Anggaran markah: ${pct}%</h2><p>Julat munasabah <b class="num">${fmt(h.julat[0])} hingga ${fmt(h.julat[1])}</b> · keyakinan ${esc(h.keyakinan)}</p><p class="muted">${esc(h.ringkasan)}</p></div></div>
      ${h.keutamaan.length ? `<div class="card"><h2>Baiki ini dahulu</h2><ol class="al-utama">${h.keutamaan.map(k => `<li><span>${esc(k.tindakan)}</span>${k.markah_tambah ? `<b class="num">+${fmt(k.markah_tambah)}</b>` : ''}</li>`).join('')}</ol></div>` : ''}
      ${h.kriteria.map((k, ki) => { const p = k.markah_penuh ? k.markah / k.markah_penuh * 100 : 0; return `<div class="card al-kriteria">
        <div class="row-between"><h3>${esc(k.nama)}</h3><span class="num al-markah">${fmt(k.markah)}/${fmt(k.markah_penuh)}</span></div>
        <div class="kj-bar"><i style="width:${p}%;background:${p >= 75 ? 'var(--up)' : p >= 50 ? 'var(--warn)' : 'var(--down)'}"></i></div>
        ${k.tahap ? `<p class="al-band">Band: <b>${esc(k.tahap)}</b></p>` : ''}
        ${k.bukti.length ? k.bukti.map(b => `<blockquote class="bk-q"><p>“${esc(b)}”</p><cite>Bukti daripada draf anda</cite></blockquote>`).join('') : ''}
        ${k.kurang.length ? `<p class="al-sub">Yang kurang</p>${senarai(k.kurang)}` : ''}
        ${k.naik_tahap ? `<p class="al-naik">${icon('target')}<span>${esc(k.naik_tahap)}</span></p>` : ''}
        ${k.baiki.map((b, bi) => `<div class="kj-fix"><del>${esc(b.asal)}</del><ins>${esc(b.baru)}</ins><span class="muted small">${esc(b.sebab)}</span><button class="link-btn" type="button" data-rb-fix="${ki}:${bi}">Guna dalam draf</button></div>`).join('')}
      </div>`; }).join('')}
      <div class="row-gap al-seterus"><button class="btn ghost" type="button" data-act="ke-semak">${icon('file')}Semak AI% dan plagiarisme draf ini</button><button class="btn ghost" type="button" data-act="ke-tulis">${icon('type')}Baiki penulisan draf ini</button></div>`;
  }

  /* =========================================================
     4. Jurulatih Pembentangan
     ========================================================= */
  const ISI_KOSONG = /\b(erm+|err+|emm+|umm+|uh+|aa+h?|eh+|hmm+|macam|like|you know|basically|actually|kan|lah)\b/gi;
  let rakam = null;   // { qi, rec, mula, teks }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function coachHTML() {
    const h = H.coach;
    const borang = `<div class="card">${bahanHTML('Slaid atau skrip pembentangan', 'Tampal teks slaid atau skrip pembentangan anda')}
        <div class="row-gap">${butang('jana-coach', h ? 'Ramal soalan semula' : 'Ramal soalan pensyarah', 'chat')}</div>${kuotaNota('coach')}</div>`;
    if (S.busy === 'coach') return borang + tunggu('Meramal soalan pensyarah…');
    if (!h) return borang + ralat();
    const JENIS = { penjelasan: 'Penjelasan', kritikal: 'Kritikal', aplikasi: 'Aplikasi', metodologi: 'Metodologi', perangkap: 'Perangkap' };
    const purata = h.soalan.filter(q => q.nilai).map(q => q.nilai.skor);
    return borang + ralat() + `${purata.length ? `<div class="card al-coach-ringkas"><b class="num">${(purata.reduce((a, b) => a + b, 0) / purata.length).toFixed(1)}/10</b><span class="muted">purata skor bagi ${purata.length} daripada ${h.soalan.length} soalan dijawab</span></div>` : ''}
      ${h.soalan.map((q, i) => {
        const n = q.nilai, sedangRakam = rakam && rakam.qi === i;
        return `<div class="card al-soalan${n ? ' dijawab' : ''}">
          <div class="row-between"><span class="al-jenis j-${q.jenis}">${JENIS[q.jenis] || q.jenis}</span><span class="muted small num">S${i + 1}</span></div>
          <h3>${esc(q.soalan)}</h3>
          <details><summary>Kenapa ditanya dan petua menjawab</summary><p class="muted small">${esc(q.kenapa)}</p><p class="small"><b>Petua:</b> ${esc(q.petua)}</p></details>
          <div class="field"><label class="sr-only" for="alJwb${i}">Jawapan anda</label><textarea id="alJwb${i}" data-jwb="${i}" rows="3" maxlength="3000" placeholder="${SR ? 'Tekan mikrofon dan jawab dengan suara, atau taip jawapan' : 'Taip jawapan anda'}">${esc(q.jawapan || '')}</textarea></div>
          ${q.metrik ? `<p class="al-metrik small"><span>${q.metrik.saat}s</span><span>${q.metrik.pkpm} patah/minit ${q.metrik.pkpm < 110 ? '(perlahan)' : q.metrik.pkpm > 170 ? '(terlalu laju)' : '(sesuai)'}</span><span>${q.metrik.isi} kata pengisi${q.metrik.isi ? ': ' + esc(q.metrik.contoh) : ''}</span></p>` : ''}
          <div class="row-gap">${SR ? `<button class="btn ghost sm${sedangRakam ? ' rakam-on' : ''}" type="button" data-mic="${i}" aria-pressed="${sedangRakam}">${icon(sedangRakam ? 'pause' : 'volume')}${sedangRakam ? 'Berhenti' : 'Jawab dengan suara'}</button>` : ''}
            <button class="btn sm" type="button" data-nilai="${i}" ${S.busy ? 'disabled' : ''}>${S.busy === 'nilai' + i ? 'Menilai…' : 'Nilai jawapan'}</button></div>
          ${n ? `<div class="al-nilai"><div class="al-skor-kecil" style="--w:${n.skor >= 7 ? 'var(--up)' : n.skor >= 5 ? 'var(--warn)' : 'var(--down)'}"><b class="num">${n.skor}</b>/10</div>
            ${n.kekuatan.length ? `<p class="al-sub">Bagus</p>${senarai(n.kekuatan)}` : ''}${n.baiki.length ? `<p class="al-sub">Baiki</p>${senarai(n.baiki)}` : ''}
            ${n.jawapan_model ? `<details><summary>Jawapan contoh</summary><p>${esc(n.jawapan_model)}</p></details>` : ''}
            ${n.susulan ? `<p class="al-naik">${icon('chat')}<span>Soalan susulan pensyarah: <b>${esc(n.susulan)}</b> <button class="link-btn" type="button" data-susulan="${i}">Latih soalan ini</button></span></p>` : ''}</div>` : ''}
        </div>`; }).join('')}`;
  }
  function mulaRakam(i) {
    if (!SR) return;
    if (rakam) { berhentiRakam(); if (rakam && rakam.qi === i) return; }
    const rec = new SR();
    rec.lang = /[a-z]/i.test(H.coach.soalan[i].soalan) && !/\b(apakah|bagaimana|mengapa|kenapa|terangkan|huraikan)\b/i.test(H.coach.soalan[i].soalan) ? 'en-MY' : 'ms-MY';
    rec.continuous = true; rec.interimResults = true;
    const asas = (H.coach.soalan[i].jawapan || '').trim();
    rakam = { qi: i, rec, mula: Date.now(), akhir: '' };
    rec.onresult = e => {
      let fin = '', sem = '';
      for (let r = 0; r < e.results.length; r++) (e.results[r].isFinal ? (fin += e.results[r][0].transcript + ' ') : (sem += e.results[r][0].transcript));
      rakam.akhir = fin;
      const t = (asas ? asas + ' ' : '') + fin + sem;
      H.coach.soalan[i].jawapan = t.trim();
      const el = $(`#alJwb${i}`); if (el) el.value = t;
    };
    rec.onerror = e => { if (e.error === 'not-allowed') toast('Benarkan mikrofon untuk menjawab dengan suara.'); };
    rec.onend = () => { if (rakam && rakam.rec === rec) selesaiRakam(); };
    try { rec.start(); } catch { rakam = null; toast('Mikrofon tidak dapat dimulakan.'); return; }
    render();
  }
  function berhentiRakam() { if (rakam) try { rakam.rec.stop(); } catch { selesaiRakam(); } }
  function selesaiRakam() {
    if (!rakam) return;
    const { qi, mula, akhir } = rakam; rakam = null;
    const saat = Math.max(1, Math.round((Date.now() - mula) / 1000)), w = kata(akhir);
    const isi = akhir.match(ISI_KOSONG) || [];
    if (w) H.coach.soalan[qi].metrik = { saat, pkpm: Math.round(w / saat * 60), isi: isi.length, contoh: [...new Set(isi.map(x => x.toLowerCase()))].slice(0, 4).join(', ') };
    simpanHasil('coach', H.coach); render();
  }

  /* =========================================================
     5. Ingat Aktif + dek ulang kaji
     ========================================================= */
  let ig = null;      // sesi kuiz: { i, jwb: [], semak: {} }
  let ulang = null;   // sesi ulang kaji dek: { senarai: [id], i, buka }
  const normJ = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  function jarak(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 9;
    const d = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } }
    return d[b.length];
  }
  // Semakan dalam peranti untuk MCQ, betul/salah dan isi tempat kosong; jawapan pendek disemak AI
  function semakTempatan(q, j) {
    if (q.jenis === 'mcq' || q.jenis === 'betul_salah') return normJ(j) === normJ(q.jawapan) ? 'betul' : 'salah';
    if (q.jenis === 'isi_tempat') { const a = normJ(j), b = normJ(q.jawapan); return a && (a === b || jarak(a, b) <= Math.max(1, Math.floor(b.length / 6))) ? 'betul' : null; }
    return null;
  }
  function ingatHTML() {
    const h = H.ingat, due = perluUlang();
    const tab = tabIni('ingat', ulang ? 'dek' : 'uji');
    const tabBar = `<div class="row-between al-hasil-kepala">${tabs('ingat', [['uji', 'Uji diri'], ['dek', `Dek ulang kaji${due.length ? ` (${due.length})` : ''}`]])}</div>`;
    if (tab === 'dek') return tabBar + dekHTML();
    const borang = `<div class="card">${bahanHTML()}<div class="row-gap">${butang('jana-ingat', h ? 'Soalan baharu' : 'Jana soalan uji diri', 'refresh')}</div>${kuotaNota('ingat')}</div>`;
    if (S.busy === 'ingat') return tabBar + borang + tunggu('Menyediakan soalan…');
    if (!h) return tabBar + borang + ralat();
    if (!ig) ig = { i: 0, jwb: [], hasil: {} };
    const n = h.soalan.length;
    if (ig.i < n) {
      const q = h.soalan[ig.i];
      const pilih = q.jenis === 'mcq' || q.jenis === 'betul_salah';
      return tabBar + ralat() + `<div class="card al-uji">
        <div class="row-between"><span class="muted small">Soalan ${ig.i + 1} daripada ${n} · ${esc(q.topik)}</span><div class="al-kemajuan" aria-hidden="true"><i style="width:${ig.i / n * 100}%"></i></div></div>
        <h2>${esc(q.soalan)}</h2>
        ${pilih ? `<div class="bk-opts">${q.pilihan.map(p => `<button type="button" class="bk-opt" data-ig-pilih="${esc(p)}">${esc(p)}</button>`).join('')}</div>`
          : `<form id="alIgForm"><div class="field"><label class="sr-only" for="alIgJ">Jawapan</label><textarea id="alIgJ" rows="${q.jenis === 'isi_tempat' ? 1 : 3}" placeholder="${q.jenis === 'isi_tempat' ? 'Perkataan yang hilang' : 'Jawab dari ingatan, tanpa melihat nota'}"></textarea></div>
            <div class="row-gap"><button class="btn" type="submit">Seterusnya</button><button class="link-btn" type="button" data-ig-pilih="">Saya tidak tahu</button></div></form>`}
      </div>` + borang;
    }
    // Semua dijawab: papar keputusan
    const terbuka = h.soalan.map((q, i) => ({ q, i })).filter(({ q, i }) => !ig.hasil[i]);
    const selesai = !terbuka.length;
    const skor = x => x === 'betul' ? 1 : x === 'separa' ? 0.5 : 0;
    const topik = {};
    h.soalan.forEach((q, i) => { const r = ig.hasil[i]; if (!r) return; (topik[q.topik] = topik[q.topik] || []).push(skor(r.keputusan)); });
    const jumlah = h.soalan.reduce((t, q, i) => t + (ig.hasil[i] ? skor(ig.hasil[i].keputusan) : 0), 0);
    return tabBar + ralat() + `<div class="card al-keputusan">
        ${selesai ? `<div class="al-skor-kecil besar" style="--w:${jumlah / n >= .75 ? 'var(--up)' : jumlah / n >= .5 ? 'var(--warn)' : 'var(--down)'}"><b class="num">${fmt(jumlah)}</b>/${n}</div>` : `<p>${terbuka.length} jawapan pendek perlu disemak AI.</p><div class="row-gap">${butang('semak-ingat', S.busy === 'ingat_semak' ? 'Menyemak…' : 'Semak jawapan saya', 'check')}</div>`}
        ${Object.keys(topik).length ? `<h3>Kekuatan setiap topik</h3>${Object.entries(topik).sort((a, b) => a[1].reduce((x, y) => x + y, 0) / a[1].length - b[1].reduce((x, y) => x + y, 0) / b[1].length).map(([t, xs]) => { const p = Math.round(xs.reduce((a, b) => a + b, 0) / xs.length * 100); return `<div class="al-topik"><span>${esc(t)}</span><div class="kj-bar"><i style="width:${p}%;background:${p >= 75 ? 'var(--up)' : p >= 50 ? 'var(--warn)' : 'var(--down)'}"></i></div><b class="num">${p}%</b></div>`; }).join('')}` : ''}
        <div class="row-gap">${selesai ? `<button class="btn" type="button" data-act="ig-dek">${icon('plus')}Masukkan yang salah ke dek ulang kaji</button>` : ''}<button class="btn ghost" type="button" data-act="ig-ulang">Uji semula</button></div></div>
      <div class="card">${h.soalan.map((q, i) => { const r = ig.hasil[i]; return `<div class="al-jwb ${r ? 'k-' + r.keputusan : ''}"><p><b>${i + 1}.</b> ${esc(q.soalan)}</p><p class="small">Jawapan anda: ${esc(ig.jwb[i] || '(tiada)')}</p><p class="small">Jawapan: <b>${esc(q.jawapan)}</b>${r ? ` · <span class="al-k">${{ betul: 'Betul', separa: 'Separa betul', salah: 'Salah' }[r.keputusan]}</span>` : ''}</p>${r && r.maklum_balas ? `<p class="muted small">${esc(r.maklum_balas)}</p>` : `<p class="muted small">${esc(q.penerangan)}</p>`}</div>`; }).join('')}</div>`;
  }
  function dekHTML() {
    if (!dek.length) return `<div class="card bk-empty"><p>Dek ulang kaji anda masih kosong.</p><p class="muted">Tambah kad daripada Pek Peperiksaan, atau masukkan soalan yang salah selepas uji diri. Kad diulang pada hari ke-1, 3, 7, 14 dan 30 supaya kekal dalam ingatan jangka panjang.</p></div>`;
    const due = perluUlang();
    if (!ulang || !due.length && ulang.i >= ulang.senarai.length) {
      const kotak = [1, 2, 3, 4, 5].map(b => dek.filter(k => k.kotak === b).length);
      return `<div class="card al-dek"><h2>${due.length ? `${due.length} kad perlu diulang hari ini` : 'Semua kad hari ini selesai'}</h2>
        <div class="al-kotak">${kotak.map((n, i) => `<div><b class="num">${n}</b><span class="muted small">${['Baharu', '1 hari', '3 hari', '7 hari', 'Dikuasai'][i]}</span></div>`).join('')}</div>
        <div class="row-gap">${due.length ? `<button class="btn" type="button" data-act="mula-ulang">${icon('play')}Mula ulang kaji</button>` : ''}<button class="link-btn" type="button" data-act="kosong-dek">Kosongkan dek</button></div></div>`;
    }
    const k = dek.find(x => x.id === ulang.senarai[ulang.i]);
    if (!k) { ulang = null; return dekHTML(); }
    return `<div class="card al-ulangkad"><p class="muted small">Kad ${ulang.i + 1} daripada ${ulang.senarai.length}${k.asal ? ' · ' + esc(k.asal) : ''}</p>
      <div class="al-kad-depan">${esc(k.depan)}</div>
      ${ulang.buka ? `<div class="al-kad-belakang">${esc(k.belakang)}</div><div class="row-gap al-nilai-kad"><button class="btn ghost" type="button" data-ingat="0">Lupa</button><button class="btn ghost" type="button" data-ingat="1">Ingat sedikit</button><button class="btn" type="button" data-ingat="2">Ingat</button></div>`
        : `<button class="btn" type="button" data-act="buka-kad">Tunjuk jawapan</button>`}</div>`;
  }
  async function semakIngat() {
    const h = H.ingat; if (!h || !ig) return;
    const buka = h.soalan.map((q, i) => ({ q, i })).filter(({ i }) => !ig.hasil[i]);
    if (!buka.length) return;
    if (S.busy) return;
    S.busy = 'ingat_semak'; S.err = ''; render();
    try {
      const d = await panggil('/alat', { tugas: 'ingat_semak', teks: bahan.teks, jawapan: buka.map(({ q, i }) => ({ soalan: q.soalan, betul: q.jawapan, pengguna: ig.jwb[i] || '(tiada jawapan)' })) }, 'alat');
      if (d) d.hasil.forEach(r => { const x = buka[r.i]; if (x) ig.hasil[x.i] = r; });
      buka.forEach(({ i }) => { if (!ig.hasil[i]) ig.hasil[i] = { keputusan: (ig.jwb[i] || '').trim() ? 'separa' : 'salah', maklum_balas: '' }; });
    } catch (e) { S.err = mesejRalat(e); }
    S.busy = ''; render();
  }

  /* =========================================================
     6. Nota Kuliah AI
     ========================================================= */
  let kl = { transkrip: load('alat_transkrip', ''), lang: load('alat_kl_lang', 'ms-MY') };
  let lr = null;   // rakaman langsung { rec, media, chunks, mula, fin, kekal }
  let audioRakam = null;   // Blob rakaman terakhir
  const MAX_AUDIO = 14 * 1024 * 1024;
  function kuliahHTML() {
    const h = H.kuliah, sedang = !!lr;
    const masa = lr ? Math.round((Date.now() - lr.mula) / 1000) : 0;
    return `<div class="al-kl-grid">
      <div class="card al-kl-rakam">
        <h2>1. Dapatkan transkrip</h2>
        <div class="al-kl-pilihan">
          <div><h3>Rakam secara langsung</h3><p class="muted small">${SR ? 'Kapsyen langsung dalam pelayar, percuma. Letakkan telefon dekat dengan pensyarah.' : 'Pelayar ini tidak menyokong kapsyen langsung. Rakaman disimpan dan boleh ditranskrip dengan Transkrip HD.'}</p>
            <div class="row-gap"><select id="alKlLang" aria-label="Bahasa kuliah" ${sedang ? 'disabled' : ''}><option value="ms-MY" ${kl.lang === 'ms-MY' ? 'selected' : ''}>Bahasa Melayu</option><option value="en-MY" ${kl.lang === 'en-MY' ? 'selected' : ''}>English (Malaysia)</option></select>
              <button class="btn${sedang ? ' rakam-on' : ''}" type="button" data-act="${sedang ? 'henti-kuliah' : 'rakam-kuliah'}">${icon(sedang ? 'pause' : 'volume')}${sedang ? `Berhenti <span class="num" id="alKlMasa">${Math.floor(masa / 60)}:${String(masa % 60).padStart(2, '0')}</span>` : 'Mula rakam'}</button></div>
            ${audioRakam && !sedang ? `<p class="small">Rakaman ${(audioRakam.size / 1048576).toFixed(1)} MB sedia. <button class="link-btn" type="button" data-act="hd-rakaman">Transkrip HD${proLabel({ pro: true })}</button> · <button class="link-btn" type="button" data-act="simpan-audio">Simpan audio</button></p>` : ''}</div>
          <div><h3>Muat naik rakaman</h3><p class="muted small">MP3, M4A, WAV, OGG atau WEBM sehingga 14 MB (kira-kira 30 minit). Ditranskrip oleh AI, termasuk kuliah bercampur Melayu dan Inggeris.</p>
            <label class="btn ghost">${icon('upload')}Pilih fail audio${proLabel({ pro: true })}<input type="file" id="alKlAudio" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm" hidden></label></div>
        </div>
        ${S.busy === 'transkrip' ? tunggu('Mentranskrip rakaman… kuliah 30 minit boleh mengambil masa 1 hingga 2 minit.') : ''}
        <div class="field"><div class="row-between"><label for="alKlTeks">Transkrip</label><span class="muted small"><span id="alKlKata">${fmt(kata(kl.transkrip))}</span> patah perkataan</span></div>
          <textarea id="alKlTeks" rows="8" maxlength="${MAX_BAHAN}" placeholder="Transkrip muncul di sini semasa merakam. Anda juga boleh menampal transkrip daripada Teams, Zoom atau YouTube.">${esc(kl.transkrip)}</textarea></div>
        <div class="row-gap">${butang('jana-kuliah', 'Jana nota kuliah', 'file')}${kl.transkrip ? `<button class="link-btn" type="button" data-act="kl-buku">${icon('book')}Simpan ke Buku Nota AI</button><button class="link-btn" type="button" data-act="kl-kosong">Kosongkan</button>` : ''}</div>
        ${kuotaNota('kuliah')}
        <p class="muted small">Minta izin pensyarah sebelum merakam. Rakaman dan transkrip disimpan dalam peranti ini sahaja; audio dihantar ke pelayan hanya untuk Transkrip HD dan tidak disimpan.</p>
      </div>
      ${S.busy === 'kuliah' ? tunggu('Menyusun nota Cornell…') : ralat()}
      ${h && S.busy !== 'kuliah' ? kuliahHasil(h) : ''}
    </div>`;
  }
  function kuliahHasil(h) {
    return `<div class="card al-cornell"><div class="row-between"><h2>${esc(h.tajuk || 'Nota kuliah')}</h2><div class="row-gap"><button class="link-btn" type="button" data-act="salin-kuliah">${icon('copy')}Salin</button><button class="link-btn" type="button" data-act="kl-pek">${icon('layers')}Jadikan pek peperiksaan</button></div></div>
      <div class="al-cornell-grid"><aside><p class="al-sub">Isyarat</p>${senarai(h.isyarat)}</aside>
        <div>${h.nota.map(n => `<h3>${esc(n.tajuk)}</h3>${senarai(n.isi)}`).join('')}</div></div>
      <div class="al-cornell-rumus"><p class="al-sub">Rumusan</p><p>${esc(h.rumusan)}</p></div></div>
      ${h.konsep.length ? `<div class="card bk-out"><h2>Konsep yang perlu anda tahu</h2><dl class="bk-dl">${h.konsep.map(k => `<dt>${esc(k.nama)}</dt><dd>${esc(k.maksud)}</dd>`).join('')}</dl></div>` : ''}
      ${h.soalan_peperiksaan.length ? `<div class="card bk-out"><h2>Mungkin keluar peperiksaan</h2><ol>${h.soalan_peperiksaan.map(q => `<li>${esc(q)}</li>`).join('')}</ol></div>` : ''}
      ${h.tindakan.length ? `<div class="card bk-out"><h2>Tugasan dan pengumuman</h2><ul class="al-tindakan">${h.tindakan.map(t => `<li><span>${esc(t.perkara)}</span>${t.tarikh ? `<b>${esc(t.tarikh)}</b>` : ''}</li>`).join('')}</ul></div>` : ''}`;
  }
  async function rakamKuliah() {
    if (lr) return;
    let stream = null;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch { toast('Benarkan mikrofon untuk merakam kuliah.', 4000); return; }
    lr = { mula: Date.now(), chunks: [], kekal: kl.transkrip ? kl.transkrip.trim() + '\n\n' : '', fin: '', stream };
    if (window.MediaRecorder) {
      try {
        const jenis = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
        lr.media = new MediaRecorder(stream, jenis ? { mimeType: jenis, audioBitsPerSecond: 32000 } : undefined);
        lr.media.ondataavailable = e => e.data && e.data.size && lr && lr.chunks.push(e.data);
        lr.media.start(5000);
      } catch { lr.media = null; }
    }
    if (SR) {
      const mula = () => {
        if (!lr) return;
        const rec = new SR(); rec.lang = kl.lang; rec.continuous = true; rec.interimResults = true;
        rec.onresult = e => {
          let sem = '';
          for (let r = e.resultIndex; r < e.results.length; r++) {
            if (e.results[r].isFinal) lr.fin += e.results[r][0].transcript.trim() + ' ';
            else sem += e.results[r][0].transcript;
          }
          kl.transkrip = (lr.kekal + lr.fin + sem).trim();
          const el = $('#alKlTeks'); if (el) { el.value = kl.transkrip; el.scrollTop = el.scrollHeight; }
          const k = $('#alKlKata'); if (k) k.textContent = fmt(kata(kl.transkrip));
        };
        // Pelayar menamatkan pengecaman selepas senyap: mulakan semula selagi merakam
        rec.onend = () => { if (lr && lr.rec === rec) setTimeout(mula, 250); };
        rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { toast('Kapsyen langsung tidak dibenarkan. Rakaman audio diteruskan.'); lr && (lr.rec = null); } };
        lr.rec = rec;
        try { rec.start(); } catch {}
      };
      mula();
    }
    lr.tik = setInterval(() => { const el = $('#alKlMasa'); if (el && lr) { const s = Math.round((Date.now() - lr.mula) / 1000); el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; } }, 1000);
    try { navigator.wakeLock && (lr.kunci = await navigator.wakeLock.request('screen')); } catch {}
    render();
  }
  function hentiKuliah() {
    if (!lr) return;
    const x = lr; lr = null;
    clearInterval(x.tik);
    try { x.rec && x.rec.stop(); } catch {}
    try { x.kunci && x.kunci.release(); } catch {}
    const siap = () => { x.stream.getTracks().forEach(t => t.stop()); if (x.chunks.length) audioRakam = new Blob(x.chunks, { type: x.media.mimeType || 'audio/webm' }); save('alat_transkrip', kl.transkrip); render(); };
    if (x.media && x.media.state !== 'inactive') { x.media.onstop = siap; x.media.stop(); } else siap();
  }
  const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });
  async function transkripAudio(blob, nama) {
    if (blob.size > MAX_AUDIO) { toast('Fail terlalu besar (had 14 MB). Pendekkan atau mampatkan rakaman.', 4500); return; }
    if (S.busy) return;
    const pr = P(); if (pr && !pr.boleh('alatpro')) return;
    S.busy = 'transkrip'; S.err = ''; render();
    try {
      const mime = (blob.type || (/\.m4a$/i.test(nama) ? 'audio/mp4' : /\.mp3$/i.test(nama) ? 'audio/mpeg' : /\.wav$/i.test(nama) ? 'audio/wav' : 'audio/webm')).split(';')[0];
      const r = await fetch(API + '/transkrip', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ audio: await b64(blob), mime }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Transkrip tidak tersedia buat masa ini.');
      if (pr) pr.catat('alatpro');
      kl.transkrip = d.transkrip; save('alat_transkrip', kl.transkrip);
      toast('Transkrip siap. Tekan "Jana nota kuliah".');
    } catch (e) { S.err = mesejRalat(e); }
    S.busy = ''; render();
  }

  /* =========================================================
     7. Pembantu Penulisan Akademik
     ========================================================= */
  let tl = load('alat_tulis', { teks: '', mod: 'akademik' });
  const MODS = [['akademik', 'Nada akademik'], ['ringkas', 'Ringkaskan'], ['jelas', 'Jelaskan'], ['aliran', 'Aliran & kohesi']];
  // Perenggan dipisahkan oleh baris baharu. Teks PDF memecahkan setiap baris cetakan, jadi baris panjang yang tidak
  // berakhir dengan tanda baca penamat disambung dengan baris berikutnya. Baris asal dikekalkan supaya teksAkhir() dapat
  // mencari setiap perenggan dalam teks asal.
  const pecahPerenggan = t => {
    const out = []; let sambung = false;
    for (const baris of String(t).split('\n')) {
      const s = baris.trim();
      if (!s) { sambung = false; continue; }
      if (sambung) out[out.length - 1] += '\n' + baris; else out.push(baris);
      sambung = s.length >= 40 && !/[.!?:;)\]"”']$/.test(s);
    }
    return out.map(p => p.trim()).filter(p => p.length >= 20);
  };
  function metrik(t) {
    const ayat = String(t).split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => kata(s) >= 3);
    const w = kata(t), panjang = ayat.filter(s => kata(s) > 30).length;
    return { w, ayat: ayat.length, purata: ayat.length ? w / ayat.length : 0, panjang };
  }
  // Diff perkataan (LCS) untuk memaparkan perubahan
  function diff(a, b) {
    const A = a.split(/(\s+)/), Bw = b.split(/(\s+)/);
    if (A.length * Bw.length > 900000) return `<del>${esc(a)}</del> <ins>${esc(b)}</ins>`;
    const m = A.length, n = Bw.length, L = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = A[i] === Bw[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    let i = 0, j = 0, out = '';
    while (i < m && j < n) {
      if (A[i] === Bw[j]) { out += esc(A[i]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { out += /^\s+$/.test(A[i]) ? '' : `<del>${esc(A[i])}</del>`; i++; }
      else { out += /^\s+$/.test(Bw[j]) ? esc(Bw[j]) : `<ins>${esc(Bw[j])}</ins>`; j++; }
    }
    while (i < m) { if (!/^\s+$/.test(A[i])) out += `<del>${esc(A[i])}</del>`; i++; }
    while (j < n) { out += /^\s+$/.test(Bw[j]) ? esc(Bw[j]) : `<ins>${esc(Bw[j])}</ins>`; j++; }
    return out.replace(/<\/del><del>/g, ' ').replace(/<\/ins>(\s+)<ins>/g, '$1');
  }
  // Teks akhir: perenggan yang diterima diganti di tempatnya dalam teks asal, jadi tajuk dan baris pendek
  // (yang tidak dihantar untuk dibaiki) serta susunan baris kekal
  function teksAkhir(h) {
    const asal = h.asal != null ? h.asal : h.perenggan.join('\n\n');
    let out = '', dari = 0;
    h.perenggan.forEach((p, i) => {
      const j = asal.indexOf(p, dari);
      if (j < 0) return;
      out += asal.slice(dari, j) + (h.terima[i] && h.baru[i] ? h.baru[i].baru : p);
      dari = j + p.length;
    });
    return out + asal.slice(dari);
  }
  function tulisHTML() {
    const h = H.tulis, m0 = metrik(tl.teks);
    const borang = `<form class="card" id="alTlForm">
        <div class="field"><div class="row-between"><label for="alTl">Teks tugasan anda</label><label class="link-btn">${icon('upload')}DOCX/PDF<input type="file" id="alTlFail" accept=".docx,.pdf,.txt" hidden></label></div>
          <textarea id="alTl" rows="10" maxlength="20000" placeholder="Tampal perenggan tugasan anda (Bahasa Melayu atau Inggeris)">${esc(tl.teks)}</textarea>
          <p class="muted small al-metrik-tl" id="alTlMetrik">${fmt(m0.w)} patah perkataan · ${m0.ayat} ayat · purata ${m0.purata.toFixed(1)} patah/ayat · ${m0.panjang} ayat terlalu panjang</p></div>
        <div class="segmented bk-tabs" role="radiogroup" aria-label="Mod">${MODS.map(([k, n]) => `<button type="button" role="radio" class="seg${tl.mod === k ? ' active' : ''}" aria-checked="${tl.mod === k}" data-mod="${k}">${n}</button>`).join('')}</div>
        <div class="row-gap" style="margin-top:12px">${butang('jana-tulis', 'Baiki penulisan', 'type')}</div>${kuotaNota('tulis')}
      </form>`;
    if (S.busy === 'tulis') return borang + tunggu('Membaiki perenggan demi perenggan…');
    if (!h) return borang + ralat();
    const akhir = teksAkhir(h);
    const m1 = metrik(akhir);
    const ubah = h.perenggan.filter((p, i) => h.baru[i] && h.baru[i].baru !== p).length;
    return borang + ralat() + `<div class="card al-tl-ringkas">
        <div class="al-banding"><div><span class="muted small">Sebelum</span><b class="num">${m0.purata.toFixed(1)}</b><span class="small">patah/ayat</span><span class="small">${m0.panjang} ayat panjang</span></div>${icon('chev')}<div><span class="muted small">Selepas</span><b class="num">${m1.purata.toFixed(1)}</b><span class="small">patah/ayat</span><span class="small">${m1.panjang} ayat panjang</span></div></div>
        <div><p>${ubah} daripada ${h.perenggan.length} perenggan dicadangkan untuk diubah.</p>${h.nada ? `<p class="muted">${esc(h.nada)}</p>` : ''}
        <div class="row-gap"><button class="btn sm" type="button" data-act="tl-terima-semua">Terima semua</button><button class="btn ghost sm" type="button" data-act="tl-salin">${icon('copy')}Salin teks akhir</button><button class="btn ghost sm" type="button" data-act="tl-guna">Guna sebagai teks baharu</button></div></div></div>
      ${h.struktur.length ? `<div class="card"><h2>Struktur keseluruhan</h2>${senarai(h.struktur)}</div>` : ''}
      ${h.perenggan.map((p, i) => {
        const r = h.baru[i];
        if (!r || r.baru === p) return `<div class="card al-pr sama"><p class="muted small">Perenggan ${i + 1}: tiada perubahan diperlukan</p><p>${esc(p)}</p></div>`;
        return `<div class="card al-pr${h.terima[i] ? ' diterima' : ''}"><div class="row-between"><span class="muted small">Perenggan ${i + 1}</span><div class="row-gap">
            <button class="btn sm${h.terima[i] ? '' : ' ghost'}" type="button" data-tl="${i}:1" aria-pressed="${!!h.terima[i]}">${icon('check')}Terima</button><button class="btn ghost sm" type="button" data-tl="${i}:0" aria-pressed="${!h.terima[i]}">Kekalkan asal</button></div></div>
          <p class="al-diff">${diff(p, r.baru)}</p>
          ${r.sitasi_hilang.length ? `<p class="al-amaran small">${icon('alert')}<span>Petikan atau angka asal tiada dalam versi baharu: ${r.sitasi_hilang.map(esc).join(', ')}. Pastikan ia dikekalkan.</span></p>` : ''}
          ${r.perubahan.length ? `<div class="al-ubah">${r.perubahan.map(c => `<span><b>${esc(c.jenis)}</b> ${esc(c.sebab)}</span>`).join('')}</div>` : ''}</div>`;
      }).join('')}
      <div class="row-gap al-seterus"><button class="btn ghost" type="button" data-act="tl-semak">${icon('file')}Semak AI% dan plagiarisme teks akhir</button></div>`;
  }

  /* ---------- Penghala dalaman ---------- */
  function aktif() { const p = (location.hash || '').slice(1).split('/'); return p[0] === 'alat' && byId[p[1]] ? p[1] : ''; }
  const BADAN = { rujukan: rujukanHTML, pek: pekHTML, rubrik: rubrikHTML, coach: coachHTML, ingat: ingatHTML, kuliah: kuliahHTML, tulis: tulisHTML };
  function render() {
    const id = aktif();
    // Ralat milik alat yang sedang dibuka sahaja: dibersihkan apabila bertukar alat atau ke hab
    if (root.dataset.id !== id) S.err = '';
    if (!id) { root.innerHTML = hubHTML(); root.dataset.id = ''; return; }
    // Kekalkan kedudukan tatal apabila hasil dikemas kini
    const y = scrollY;
    root.innerHTML = kepala(byId[id]) + `<div class="al-badan">${BADAN[id]()}</div>`;
    if (root.dataset.id === id) window.scrollTo({ top: y }); else { root.dataset.id = id; }
    if (id === 'pek' && pekMasa) mulaPemasa();
  }
  const keHasil = () => { const el = $('.al-hasil-kepala, .al-skor-kad, .al-cornell, .al-tl-ringkas, .al-soalan, .al-uji', root); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  /* ---------- Tindakan ---------- */
  const perluBahan = (min = 150) => { if (bahan.teks.trim().length < min) { toast(`Tambah bahan dahulu (sekurang-kurangnya ${min} aksara).`); $('#alBahan')?.focus(); return true; } return false; };
  const tanpaRalat = d => d && !d.error;

  const ACT = {
    'kosong-bahan': () => { bahan = { tajuk: '', teks: '' }; simpanBahan(); render(); },
    'analisis-kertas': async () => {
      if (!kertas.length) { toast('Muat naik sekurang-kurangnya satu kertas.'); return; }
      const had = Math.floor(160000 / kertas.length);
      const d = await jalan('rujukan', { tugas: 'rujukan', kertas: kertas.map(k => ({ tajuk: k.tajuk, teks: k.teks.slice(0, Math.min(had, 30000)) })) });
      if (tanpaRalat(d)) { simpanHasil('rujukan', d); S.tab.rujukan = 'kertas'; render(); keHasil(); sahkanCrossref(); }
    },
    'matriks-csv': () => { const h = R(); muatTurun('matriks-sorotan-literatur.csv', csv([['Kajian', 'Rujukan APA 7', 'Objektif', 'Metodologi', 'Sampel', 'Dapatan', 'Batasan', 'Kata kunci'], ...h.kertas.map(k => [apaOf(k).intextNaratif, apaOf(k).teks, k.objektif, k.metodologi, k.sampel, k.dapatan.join('; '), k.had.join('; '), k.kata_kunci.join('; ')])]), 'text/csv'); },
    'salin-sorotan': () => salin(R().sorotan.join('\n\n'), 'Sorotan disalin.'),
    'salin-senarai': () => salin(APA.susun(R().kertas.map(metaApa)).map(m => APA.format(m).teks).join('\n\n'), 'Senarai rujukan disalin.'),
    bibtex: () => muatTurun('rujukan.bib', bibtex(R().kertas)),
    ris: () => muatTurun('rujukan.ris', ris(R().kertas), 'application/x-research-info-systems'),
    'jana-pek': async () => { if (perluBahan()) return; const d = await jalan('pek', { tugas: 'pek', teks: bahan.teks, tajuk: bahan.tajuk }); if (tanpaRalat(d)) { simpanHasil('pek', d); pekJawab = {}; pekMasa = null; S.tab.pek = 'ringkasan'; render(); keHasil(); } },
    'mod-masa': () => { pekJawab = {}; pekMasa = Date.now() + H.pek.mcq.length * 60000; render(); },
    'ulang-mcq': () => { pekJawab = {}; pekMasa = null; render(); },
    'salin-pek': () => salin(pekTeks(H.pek), 'Pek peperiksaan disalin.'),
    'dek-pek': () => tambahDek(H.pek.kad.map(k => ({ ...k, topik: H.pek.tajuk })), H.pek.tajuk || 'Pek peperiksaan'),
    anki: () => muatTurun('kad-imbas-anki.csv', csv(H.pek.kad.map(k => [k.depan, k.belakang])), 'text/csv'),
    'semak-rubrik': async () => {
      if (rb.rubrik.trim().length < 40) { toast('Tampal rubrik atau pilih templat.'); $('#alRubrik')?.focus(); return; }
      if (rb.draf.trim().length < 200) { toast('Tampal draf anda (sekurang-kurangnya 200 aksara).'); $('#alDraf')?.focus(); return; }
      const d = await jalan('rubrik', { tugas: 'rubrik', rubrik: rb.rubrik, arahan: rb.arahan, draf: rb.draf });
      if (tanpaRalat(d)) { simpanHasil('rubrik', d); render(); keHasil(); }
    },
    'ke-semak': () => { const el = $('#paper'); if (el) { el.value = rb.draf; el.dispatchEvent(new Event('input', { bubbles: true })); } location.hash = '#semak'; },
    'ke-tulis': () => { tl.teks = rb.draf; save('alat_tulis', tl); location.hash = '#alat/tulis'; },
    'jana-coach': async () => { if (perluBahan()) return; berhentiRakam(); const d = await jalan('coach', { tugas: 'coach_soalan', teks: bahan.teks, tajuk: bahan.tajuk }); if (tanpaRalat(d)) { simpanHasil('coach', d); render(); keHasil(); } },
    'jana-ingat': async () => { if (perluBahan()) return; const d = await jalan('ingat', { tugas: 'ingat_soalan', teks: bahan.teks }); if (tanpaRalat(d)) { simpanHasil('ingat', d); ig = null; render(); keHasil(); } },
    'semak-ingat': semakIngat,
    'ig-ulang': () => { ig = null; render(); },
    'ig-dek': () => { const h = H.ingat; tambahDek(h.soalan.filter((q, i) => ig.hasil[i] && ig.hasil[i].keputusan !== 'betul').map(q => ({ depan: q.soalan, belakang: q.jawapan + (q.penerangan ? ' · ' + q.penerangan : ''), topik: q.topik })), bahan.tajuk || 'Ingat Aktif'); render(); },
    'mula-ulang': () => { ulang = { senarai: perluUlang().map(k => k.id).sort(() => Math.random() - 0.5), i: 0, buka: false }; render(); },
    'buka-kad': () => { ulang.buka = true; render(); },
    'kosong-dek': () => { if (confirm('Buang semua kad dalam dek ulang kaji?')) { dek = []; save('alat_dek', dek); ulang = null; render(); } },
    'rakam-kuliah': rakamKuliah,
    'henti-kuliah': hentiKuliah,
    'hd-rakaman': () => audioRakam && transkripAudio(audioRakam, 'rakaman.webm'),
    'simpan-audio': () => { if (!audioRakam) return; const a = document.createElement('a'); a.href = URL.createObjectURL(audioRakam); a.download = `kuliah-${hariIni()}.${/mp4/.test(audioRakam.type) ? 'm4a' : 'webm'}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); },
    'jana-kuliah': async () => {
      if (kl.transkrip.trim().length < 200) { toast('Transkrip terlalu pendek (sekurang-kurangnya 200 aksara).'); return; }
      const d = await jalan('kuliah', { tugas: 'kuliah', teks: kl.transkrip });
      if (tanpaRalat(d)) { simpanHasil('kuliah', d); render(); keHasil(); }
    },
    'kl-kosong': () => { if (lr) hentiKuliah(); kl.transkrip = ''; audioRakam = null; save('alat_transkrip', ''); render(); },
    'kl-buku': () => {
      const src = load('buku_sumber', []);
      if (src.length >= 10) { toast('Buku Nota AI sudah ada 10 sumber. Buang satu dahulu.'); return; }
      src.push({ id: Math.random().toString(36).slice(2, 10), tajuk: (H.kuliah && H.kuliah.tajuk || 'Transkrip kuliah ' + hariIni()).slice(0, 120), teks: kl.transkrip.slice(0, 120000), on: true });
      if (save('buku_sumber', src)) toast('Disimpan ke Buku Nota AI.'); else toast('Storan peranti penuh.');
    },
    'kl-pek': () => { bahan = { tajuk: H.kuliah.tajuk || 'Kuliah', teks: kl.transkrip.slice(0, MAX_BAHAN) }; simpanBahan(); location.hash = '#alat/pek'; },
    'salin-kuliah': () => { const h = H.kuliah; salin([h.tajuk, '', 'ISYARAT', ...h.isyarat.map(x => '- ' + x), '', ...h.nota.flatMap(n => [n.tajuk.toUpperCase(), ...n.isi.map(x => '- ' + x), '']), 'RUMUSAN', h.rumusan, '', 'KONSEP', ...h.konsep.map(k => `- ${k.nama}: ${k.maksud}`), '', 'TUGASAN', ...h.tindakan.map(t => `- ${t.perkara}${t.tarikh ? ' (' + t.tarikh + ')' : ''}`)].join('\n'), 'Nota disalin.'); },
    'jana-tulis': async () => {
      const pr = pecahPerenggan(tl.teks);
      if (!pr.length) { toast('Tampal teks anda dahulu.'); $('#alTl')?.focus(); return; }
      if (pr.length > 30) { toast('Paling banyak 30 perenggan sekali semak. Semak bahagian demi bahagian.'); return; }
      const d = await jalan('tulis', { tugas: 'tulis', perenggan: pr, mod: tl.mod });
      if (tanpaRalat(d)) { const baru = {}; d.hasil.forEach(r => { baru[r.i] = r; }); simpanHasil('tulis', { asal: tl.teks, perenggan: pr, baru, terima: {}, struktur: d.struktur, nada: d.nada }); render(); keHasil(); }
    },
    'tl-terima-semua': () => { const h = H.tulis; h.perenggan.forEach((p, i) => { if (h.baru[i] && !h.baru[i].sitasi_hilang.length) h.terima[i] = true; }); simpanHasil('tulis', h); render(); if (h.perenggan.some((p, i) => h.baru[i] && h.baru[i].sitasi_hilang.length)) toast('Perenggan yang kehilangan petikan atau angka tidak diterima secara automatik. Semak dahulu.', 4500); },
    'tl-salin': () => { const h = H.tulis; salin(teksAkhir(h), 'Teks akhir disalin.'); },
    'tl-guna': () => { const h = H.tulis; tl.teks = teksAkhir(h); save('alat_tulis', tl); delete H.tulis; save('alat_hasil', H); render(); toast('Teks dikemas kini.'); },
    'tl-semak': () => { const h = H.tulis, el = $('#paper'); if (el) { el.value = teksAkhir(h); el.dispatchEvent(new Event('input', { bubbles: true })); } location.hash = '#semak'; }
  };

  root.addEventListener('click', async e => {
    const t = e.target;
    // Kad "kad perlu diulang kaji" di hab membuka tab dek, bukan tab uji diri
    if (t.closest('.al-ulang')) S.tab.ingat = 'dek';
    const act = t.closest('[data-act]'); if (act && ACT[act.dataset.act]) { ACT[act.dataset.act](); return; }
    const tb = t.closest('[data-tab]'); if (tb) { const [id, k] = tb.dataset.tab.split(':'); S.tab[id] = k; if (id === 'ingat' && k === 'uji') ulang = null; render(); return; }
    const bk = t.closest('[data-buang-kertas]'); if (bk) { kertas.splice(+bk.dataset.buangKertas, 1); render(); return; }
    const sa = t.closest('[data-salin-apa]'); if (sa) { salin(apaOf(R().kertas.find(k => k.id === sa.dataset.salinApa)).teks, 'Rujukan APA disalin.'); return; }
    const si = t.closest('[data-salin-intext]'); if (si) { salin(apaOf(R().kertas.find(k => k.id === si.dataset.salinIntext)).intext, 'Petikan dalam teks disalin.'); return; }
    const mq = t.closest('[data-mcq]'); if (mq) { const [i, j] = mq.dataset.mcq.split(':').map(Number); pekJawab[i] = j; if (pekMasa && Object.keys(pekJawab).length === H.pek.mcq.length) pekMasa = null; render(); return; }
    const fl = t.closest('[data-flip]');
    if (fl) { const k = H.pek.kad[+fl.dataset.flip], on = fl.classList.toggle('flip'); fl.textContent = on ? k.belakang : k.depan; fl.setAttribute('aria-pressed', on); return; }
    const fx = t.closest('[data-rb-fix]');
    if (fx) {
      const [ki, bi] = fx.dataset.rbFix.split(':').map(Number), b = H.rubrik.kriteria[ki].baiki[bi];
      // Ruang dan baris baharu dalam draf (cth. teks PDF) mungkin berbeza daripada ayat asal yang disemak pelayan
      const m = new RegExp(b.asal.trim().split(/\s+/).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+')).exec(rb.draf);
      if (!m) { toast('Ayat asal tidak dijumpai lagi dalam draf.'); return; }
      rb.draf = rb.draf.slice(0, m.index) + b.baru + rb.draf.slice(m.index + m[0].length); simpanRb();
      H.rubrik.kriteria[ki].baiki.splice(bi, 1); simpanHasil('rubrik', H.rubrik); render(); toast('Draf dikemas kini.'); return;
    }
    const mic = t.closest('[data-mic]'); if (mic) { const i = +mic.dataset.mic; if (rakam && rakam.qi === i) berhentiRakam(); else mulaRakam(i); return; }
    const nv = t.closest('[data-nilai]');
    if (nv) {
      const i = +nv.dataset.nilai, q = H.coach.soalan[i];
      if (rakam) berhentiRakam();
      if (!q.jawapan || q.jawapan.trim().length < 10) { toast('Jawab soalan dahulu.'); $(`#alJwb${i}`)?.focus(); return; }
      if (S.busy) return;
      S.busy = 'nilai' + i; S.err = ''; render();
      try { const d = await panggil('/alat', { tugas: 'coach_nilai', teks: bahan.teks, soalan: q.soalan, jawapan: q.jawapan }, 'alat'); if (d) { q.nilai = d; simpanHasil('coach', H.coach); } }
      catch (er) { S.err = mesejRalat(er); }
      S.busy = ''; render(); return;
    }
    const su = t.closest('[data-susulan]');
    if (su) { const i = +su.dataset.susulan, q = H.coach.soalan[i]; H.coach.soalan.splice(i + 1, 0, { soalan: q.nilai.susulan, jenis: 'kritikal', kenapa: 'Soalan susulan berdasarkan jawapan anda.', petua: 'Jawab terus, kemudian beri satu bukti atau contoh.' }); q.nilai.susulan = ''; simpanHasil('coach', H.coach); render(); return; }
    const ip = t.closest('[data-ig-pilih]'); if (ip) { jawabIngat(ip.dataset.igPilih); return; }
    const ing = t.closest('[data-ingat]'); if (ing) { nilaiKad(ulang.senarai[ulang.i], +ing.dataset.ingat); ulang.i++; ulang.buka = false; if (ulang.i >= ulang.senarai.length) { toast('Ulang kaji hari ini selesai.'); ulang = null; } render(); return; }
    const md = t.closest('[data-mod]'); if (md) { tl.mod = md.dataset.mod; save('alat_tulis', tl); $$('[data-mod]', root).forEach(b => { const on = b === md; b.classList.toggle('active', on); b.setAttribute('aria-checked', on); }); return; }
    const tq = t.closest('[data-tl]'); if (tq) { const [i, v] = tq.dataset.tl.split(':').map(Number); H.tulis.terima[i] = !!v; simpanHasil('tulis', H.tulis); render(); return; }
  });

  function jawabIngat(j) {
    const q = H.ingat.soalan[ig.i];
    ig.jwb[ig.i] = j;
    const r = semakTempatan(q, j);
    if (r) ig.hasil[ig.i] = { keputusan: r, maklum_balas: '' };
    else if (!String(j).trim()) ig.hasil[ig.i] = { keputusan: 'salah', maklum_balas: '' };
    ig.i++; render();
    if (ig.i >= H.ingat.soalan.length && H.ingat.soalan.some((x, i) => !ig.hasil[i])) semakIngat();
    else $('#alIgJ')?.focus();
  }

  root.addEventListener('submit', e => { e.preventDefault(); if (e.target.id === 'alIgForm') jawabIngat($('#alIgJ').value); });
  root.addEventListener('keydown', e => { if (e.target.id === 'alIgJ' && e.key === 'Enter' && !e.shiftKey && H.ingat.soalan[ig.i].jenis === 'isi_tempat') { e.preventDefault(); jawabIngat(e.target.value); } });

  root.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'alBahan') { bahan.teks = t.value; if (!t.value) bahan.tajuk = ''; simpanBahan(); const k = $('#alBahanKira'); if (k) k.textContent = fmt(t.value.length) + ' aksara'; }
    if (t.id === 'alRubrik') { rb.rubrik = t.value; simpanRb(); }
    if (t.id === 'alArahan') { rb.arahan = t.value; simpanRb(); }
    if (t.id === 'alDraf') { rb.draf = t.value; simpanRb(); const k = $('#alDrafKata'); if (k) k.textContent = fmt(kata(t.value)); }
    if (t.dataset.jwb != null && H.coach) { H.coach.soalan[+t.dataset.jwb].jawapan = t.value; simpanHasil('coach', H.coach); }
    if (t.id === 'alKlTeks') { kl.transkrip = t.value; save('alat_transkrip', t.value); const k = $('#alKlKata'); if (k) k.textContent = fmt(kata(t.value)); }
    if (t.id === 'alTl') { tl.teks = t.value; save('alat_tulis', tl); const m = metrik(t.value), el = $('#alTlMetrik'); if (el) el.textContent = `${fmt(m.w)} patah perkataan · ${m.ayat} ayat · purata ${m.purata.toFixed(1)} patah/ayat · ${m.panjang} ayat terlalu panjang`; }
  });

  root.addEventListener('change', async e => {
    const t = e.target;
    if (t.id === 'alBahanFail' && t.files.length) {
      const f = await bacaFail([...t.files]);
      if (f.length) { bahan = { tajuk: f.map(x => x.tajuk).join(', ').slice(0, 160), teks: f.map(x => f.length > 1 ? `${x.tajuk}\n${x.teks}` : x.teks).join('\n\n').slice(0, MAX_BAHAN) }; simpanBahan(); render(); toast('Bahan dimuatkan.'); }
    }
    if (t.id === 'alBuku' && t.value !== '') {
      const bs = bukuSumber(), pilih = t.value === 'semua' ? bs : [bs[+t.value]];
      bahan = { tajuk: pilih.map(s => s.tajuk).join(', ').slice(0, 160), teks: pilih.map(s => (pilih.length > 1 ? s.tajuk + '\n' : '') + s.teks).join('\n\n').slice(0, MAX_BAHAN) }; simpanBahan(); render();
    }
    if (t.id === 'alKertas' && t.files.length) await tambahKertas([...t.files]);
    if (t.id === 'alTemplat' && t.value) { if (!rb.rubrik.trim() || confirm('Ganti rubrik semasa dengan templat?')) { rb.rubrik = TEMPLAT[t.value][1]; simpanRb(); render(); } }
    if (t.id === 'alDrafFail' && t.files[0]) { const f = await bacaFail([t.files[0]], 60000); if (f[0]) { rb.draf = f[0].teks; simpanRb(); render(); } }
    if (t.id === 'alTlFail' && t.files[0]) { const f = await bacaFail([t.files[0]], 20000); if (f[0]) { tl.teks = f[0].teks; save('alat_tulis', tl); render(); } }
    if (t.id === 'alKlLang') { kl.lang = t.value; save('alat_kl_lang', t.value); }
    if (t.id === 'alKlAudio' && t.files[0]) transkripAudio(t.files[0], t.files[0].name);
    if (t.closest('[data-meta]')) {
      const f = t.closest('[data-meta]'), k = R().kertas.find(x => x.id === f.dataset.meta);
      const fld = t.dataset.f;
      if (fld === 'pengarang') k.pengarang = t.value.split('\n').map(s => s.trim()).filter(Boolean).map(s => s.includes(',') ? { akhir: s.split(',')[0].trim(), awal: s.split(',').slice(1).join(',').trim() } : / /.test(s) && !/\b(bin|binti|a\/l|a\/p)\b/i.test(s) && s.split(' ').length > 3 ? { org: s } : { akhir: s, awal: '' });
      else k[fld] = t.value.trim();
      simpanHasil('rujukan', R()); render();
    }
  });

  async function tambahKertas(files) {
    const had = isPro() ? 10 : 2;
    const baki = had - kertas.length;
    if (baki <= 0) { toast(isPro() ? 'Paling banyak 10 kertas.' : 'Pengguna percuma: 2 kertas. Premium: sehingga 10 kertas.', 4000); return; }
    if (files.length > baki) toast(`Hanya ${baki} fail pertama ditambah.`);
    const f = await bacaFail(files.slice(0, baki), 60000);
    kertas.push(...f); render();
  }
  // Seret dan lepas fail ke kotak muat naik
  root.addEventListener('dragover', e => { const d = e.target.closest('#alDrop'); if (d) { e.preventDefault(); d.classList.add('atas'); } });
  root.addEventListener('dragleave', e => { const d = e.target.closest('#alDrop'); if (d) d.classList.remove('atas'); });
  root.addEventListener('drop', e => { const d = e.target.closest('#alDrop'); if (d) { e.preventDefault(); d.classList.remove('atas'); tambahKertas([...e.dataTransfer.files]); } });

  document.addEventListener('viewchange', e => { if (e.detail === 'alat') { if (lr && aktif() !== 'kuliah') { /* rakaman diteruskan */ } render(); } else if (rakam) berhentiRakam(); });
  window.addEventListener('hashchange', () => { if ((location.hash || '').startsWith('#alat')) render(); });
  document.addEventListener('premiumchange', () => { if ((location.hash || '').startsWith('#alat')) render(); });
  window.addEventListener('beforeunload', e => { if (lr) { e.preventDefault(); e.returnValue = ''; } });
  if ((location.hash || '').startsWith('#alat')) render(); else root.innerHTML = hubHTML();
})();
