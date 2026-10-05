/* Bijak Labur: Semak Kertas, matriks tindakan dan laporan audit
   Selepas semakan selesai, hasil semua modul (AI, plagiarisme, ulasan pakar, bahasa, rujukan) disusun menjadi
   jadual "Tindakan seterusnya" (Kritikal, Sederhana, Lulus) dan boleh dimuat turun sebagai laporan Markdown.
   Tiada panggilan pelayan tambahan: semuanya dibina daripada window.CheckerReport(). */
(function () {
  const card = $('#auditCard');
  if (!card) return;
  const CRIT = [['struktur', 'Struktur'], ['hujah', 'Hujah dan analisis'], ['bukti', 'Bukti dan contoh'], ['bahasa', 'Bahasa'], ['rujukan', 'Rujukan dan sitasi']];
  const GRADES = [[80, 'A'], [75, 'A-'], [70, 'B+'], [65, 'B'], [60, 'B-'], [55, 'C+'], [50, 'C'], [47, 'C-'], [44, 'D+'], [40, 'D'], [30, 'E'], [0, 'F']];
  const grade = n => GRADES.find(([m]) => n >= m)[1];
  const short = (s, n = 90) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  /** Bahagikan semua dapatan kepada tiga tahap */
  function matrix(r) {
    const K = [], S = [], L = [];
    const x = r.expert, f = r.refs;
    const pending = r.sugg.filter(s => !/\(diterima\)$/.test(s.to));
    const nCat = name => pending.filter(s => s.cat === name).length;

    // Rujukan
    if (f && !f.found) K.push(['Rujukan', 'Tiada senarai rujukan dikesan. Tambah tajuk "Rujukan" dan senaraikan semua sumber di hujung teks.']);
    if (f && f.found) {
      const bad = f.items.filter(i => i.status === 'tiada'), near = f.items.filter(i => i.status === 'mungkin');
      bad.forEach(i => K.push(['Rujukan', `Rujukan tidak dijumpai dalam pangkalan DOI (mungkin rekaan): "${short(i.ref)}". Sahkan sumber asal atau gantikan.`]));
      f.missing.forEach(m => K.push(['Sitasi', `"${short(m, 60)}" disitasi dalam teks tetapi tiada dalam senarai rujukan.`]));
      near.forEach(i => S.push(['Rujukan', `Butiran rujukan tidak tepat sepadan: "${short(i.ref)}". Semak tajuk, tahun dan pengarang.`]));
      f.unused.forEach(m => S.push(['Sitasi', `Rujukan tidak disitasi dalam teks: "${short(m)}". Sitasi atau buang.`]));
      if (f.items.length && !bad.length && !near.length) L.push(['Rujukan', `Semua ${f.items.length} rujukan disahkan wujud.`]);
      if (f.cites && !f.missing.length && !f.unused.length) L.push(['Sitasi', `Semua ${f.cites} sitasi dalam teks sepadan dengan senarai rujukan.`]);
    }
    // Plagiarisme
    if (r.plag != null) {
      if (r.plag >= 25) K.push(['Plagiarisme', `⚠️ ${r.plag}% teks sepadan dengan sumber. Parafrasa dengan ayat sendiri dan letakkan sitasi.`]);
      else if (r.plag >= 10) S.push(['Plagiarisme', `${r.plag}% teks sepadan dengan sumber. Semak petikan yang diserlahkan dan pastikan semuanya disitasi.`]);
      else L.push(['Keaslian', `Padanan sumber rendah (${r.plag}%).`]);
    }
    // Anggaran AI
    if (r.ai >= 55) K.push(['Gaya AI', `Anggaran ciri tulisan AI tinggi (${r.ai}%). Tulis semula bahagian yang ditanda dalam Peta AI dengan suara sendiri.`]);
    else if (r.ai >= 25) S.push(['Gaya AI', `Anggaran ciri tulisan AI sederhana (${r.ai}%). Kurangkan frasa klise dan kata peralihan berulang.`]);
    else L.push(['Gaya AI', `Ciri tulisan AI rendah (${r.ai}%).`]);
    // Bahasa
    const eg = nCat('Ejaan') + nCat('Tatabahasa');
    if (eg) K.push(['Bahasa', `Betulkan ${eg} kesalahan ejaan dan tatabahasa dalam senarai cadangan.`]);
    const gy = nCat('Gaya / bunyi AI'), kj = nCat('Kejelasan'), tb = nCat('Tanda baca');
    if (tb) S.push(['Tanda baca', `${tb} isu tanda baca dan jarak.`]);
    if (kj) S.push(['Kejelasan', `${kj} ayat terlalu panjang atau kurang jelas.`]);
    if (gy) S.push(['Gaya', `${gy} frasa klise atau penanda wacana berlebihan.`]);
    if (!eg) L.push(['Bahasa', 'Tiada kesalahan ejaan atau tatabahasa yang belum dibetulkan.']);
    // Rubrik pakar
    if (x) {
      CRIT.forEach(([k, n]) => {
        const m = x.markah[k]; if (!m) return;
        const t = `${n} ${m.skor}/10${m.ulasan ? ': ' + m.ulasan : ''}`;
        (m.skor < 5 ? K : m.skor < 7.5 ? S : L).push(['Rubrik', t]);
      });
      x.penambahbaikan.forEach(p => (x.jumlah < 50 ? K : S).push(['Isi', `${p.isu.replace(/[.\s]+$/, '')}. ${p.cadangan}`]));
      x.kekuatan.forEach(k => L.push(['Kekuatan', k]));
    }
    return { K, S, L };
  }

  const COLS = [['K', 'Kritikal', 'Mesti baiki sekarang', 'down'], ['S', 'Sederhana', 'Penambahbaikan gaya bahasa', 'warn'], ['L', 'Lulus', 'Sudah memenuhi standard', 'up']];

  function render() {
    const r = window.CheckerReport && window.CheckerReport();
    if (!r) return;
    const m = matrix(r), x = r.expert;
    $('#auditBox').innerHTML = `${x ? `<p class="audit-score"><b class="num">${x.jumlah}%</b> <span class="rf-chip ${x.jumlah >= 60 ? 'up' : x.jumlah >= 45 ? 'warn' : 'down'}">Gred ${grade(x.jumlah)}</span> <span class="muted small">anggaran skala UiTM</span></p>` : ''}
      <div class="audit-grid">${COLS.map(([k, name, sub, c]) => `<div class="audit-col"><div class="audit-h"><span class="rf-chip ${c}">${name} <span class="num">${m[k].length}</span></span><span class="muted small">${sub}</span></div>
        ${m[k].length ? `<ul>${m[k].slice(0, 12).map(([t, s]) => `<li><b>${esc(t)}</b> ${esc(s)}</li>`).join('')}</ul>${m[k].length > 12 ? `<p class="muted small">+${m[k].length - 12} lagi dalam laporan</p>` : ''}` : '<p class="muted small">Tiada.</p>'}</div>`).join('')}</div>`;
    card.classList.remove('hidden');
  }

  /* ---------- Laporan Markdown ---------- */
  const cell = s => String(s == null ? '' : s).replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
  const code = s => '`' + String(s || '').replace(/\s+/g, ' ').replace(/`/g, "'").trim() + '`';
  const REF = { sah: '✅ Disahkan', mungkin: '🟡 Hampir sepadan', tiada: '⚠️ Tidak dijumpai', laman: 'ℹ️ Laman web', ralat: '❔ Tidak dapat disemak' };

  function markdown(r) {
    const m = matrix(r), x = r.expert, f = r.refs, L = [];
    const tarikh = new Date().toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' });
    L.push('# Laporan Audit Akademik', '', `> Dijana oleh Bijak Labur (bijaklabur.my) pada ${tarikh}. Peratus AI dan plagiarisme ialah anggaran berdasarkan ciri teks dan carian sumber terbuka, bukan keputusan sistem rasmi universiti. Markah dijana oleh AI sebagai panduan.`, '');
    L.push('| Petunjuk | Nilai |', '|---|---|');
    L.push(`| Anggaran AI | ${r.ai}% |`, `| Anggaran plagiarisme | ${r.plag == null ? 'Tiada sumber disemak' : r.plag + '%'} |`, `| Kualiti bahasa | ${r.quality}% |`);
    if (x) L.push(`| Markah anggaran | ${x.jumlah}% (Gred ${grade(x.jumlah)}) |`);
    L.push('');

    L.push('## 1. Analisis ketulenan dan forensik AI', '', '| Isyarat tulisan AI | Tahap |', '|---|---|');
    r.signals.forEach(([k, v]) => L.push(`| ${cell(k)} | ${Math.round(v * 100)}% |`));
    L.push('');
    if (r.sources.length) {
      L.push('| Sumber sepadan | Padanan |', '|---|---|');
      r.sources.slice(0, 10).forEach(s => L.push(`| ${s.url ? `[${cell(s.name)}](${s.url})` : cell(s.name)} | ${s.pct >= 10 ? '⚠️ ' : ''}${s.pct}% |`));
      L.push('');
    }
    if (r.matches && r.matches.length) {
      L.push('**Petikan yang sepadan dengan sumber:**', '');
      r.matches.slice(0, 20).forEach(q => L.push(`- ⚠️ ${q.type === 'tepat' ? 'Disalin tepat' : `Parafrasa (${q.sim}% sama)`} daripada ${q.src}: ${code(short(q.text, 220))}`));
      L.push('');
    }

    L.push('## 2. Penilaian rubrik dan markah', '');
    if (x) {
      L.push(`**Markah: ${x.jumlah}% · Gred ${grade(x.jumlah)}** (anggaran skala UiTM)`, '', x.ringkasan, '', '| Kriteria | Markah | Ulasan |', '|---|---|---|');
      CRIT.forEach(([k, n]) => { const c = x.markah[k] || {}; L.push(`| ${n} | ${c.skor}/10 | ${cell(c.ulasan)} |`); });
      L.push('');
      if (x.kekuatan.length) L.push('**Kekuatan**', '', ...x.kekuatan.map(k => `- ${k}`), '');
      if (x.penambahbaikan.length) {
        L.push('**Penambahbaikan**', '');
        x.penambahbaikan.forEach(p => L.push(`- **${p.isu}**${p.petikan ? ` ${code(p.petikan)}` : ''}: ${p.cadangan}`));
        L.push('');
      }
    } else L.push('Ulasan pakar tidak dijalankan atau tidak tersedia. Tanda pilihan "Ulasan pakar AI" dan semak semula.', '');

    L.push('## 3. Pembetulan tatabahasa', '');
    if (r.sugg.length) {
      L.push('| # | Jenis | Asal | Pembetulan | Sebab |', '|---|---|---|---|---|');
      r.sugg.slice(0, 120).forEach((s, i) => L.push(`| ${i + 1} | ${cell(s.cat)} | ${code(short(s.from, 120))} | ${code(short(s.to, 120))} | ${cell(s.why)} |`));
      if (r.sugg.length > 120) L.push('', `+${r.sugg.length - 120} cadangan lagi dalam aplikasi.`);
    } else L.push('Tiada isu bahasa ditemui.');
    L.push('');

    L.push('## 4. Audit rujukan dan sitasi', '');
    if (!f) L.push('Semakan rujukan tidak dijalankan.');
    else if (!f.found) L.push('⚠️ Tiada bahagian "Rujukan" atau "References" dikesan.');
    else {
      L.push('| # | Rujukan | Status | Pautan |', '|---|---|---|---|');
      f.items.forEach((i, n) => L.push(`| ${n + 1} | ${cell(short(i.ref, 160))} | ${REF[i.status] || i.status} | ${i.url ? `[${cell(i.via || 'Buka')}](${i.url})` : ''} |`));
      L.push('', 'Status disemak secara langsung dengan Crossref (DOI) dan OpenAlex. "Tidak dijumpai" bermaksud rujukan itu mungkin direka; buku dan terbitan tempatan mungkin tiada dalam pangkalan ini.');
      if (f.missing.length) L.push('', '**⚠️ Disitasi dalam teks tetapi tiada dalam senarai rujukan:**', ...f.missing.map(q => `- ${q}`));
      if (f.unused.length) L.push('', '**Dalam senarai rujukan tetapi tidak disitasi:**', ...f.unused.map(q => `- ${short(q, 160)}`));
    }
    L.push('');

    L.push('## 5. Tindakan seterusnya', '', '| Tahap | Perkara | Tindakan |', '|---|---|---|');
    COLS.forEach(([k, name]) => m[k].forEach(([t, s]) => L.push(`| ${k === 'K' ? '🔴' : k === 'S' ? '🟡' : '🟢'} ${name} | ${cell(t)} | ${cell(s)} |`)));
    L.push('');
    return L.join('\n');
  }

  $('#auditDl').addEventListener('click', () => {
    const r = window.CheckerReport && window.CheckerReport();
    if (!r) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([markdown(r)], { type: 'text/markdown;charset=utf-8' }));
    a.download = 'laporan-audit-akademik.md'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#auditCopy').addEventListener('click', async () => {
    const r = window.CheckerReport && window.CheckerReport();
    if (!r) return;
    try { await navigator.clipboard.writeText(markdown(r)); toast('Laporan disalin'); } catch { toast('Tidak dapat menyalin.'); }
  });
  document.addEventListener('checkdone', render);
  // Kemas kini matriks apabila pembetulan diterima atau ditolak
  $('#suggList').addEventListener('click', () => setTimeout(render, 0));
  $('#applyAll').addEventListener('click', () => setTimeout(render, 0));

  window.SemakAudit = { matrix, markdown };
})();
