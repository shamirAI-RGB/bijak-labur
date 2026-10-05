/* Bijak Labur: Semak Kertas, matriks tindakan dan laporan audit
   Selepas semakan selesai, hasil semua modul (AI, plagiarisme, rujukan, rubrik, struktur hujah, NC industri, bahasa)
   disusun menjadi jadual "Tindakan seterusnya" (Kritikal, Sederhana, Lulus) dan laporan Markdown lima fasa yang boleh
   dimuat turun. Tiada panggilan pelayan tambahan: semuanya dibina daripada window.CheckerReport(). */
(function () {
  const card = $('#auditCard');
  if (!card) return;
  const CRIT = [['struktur', 'Struktur'], ['hujah', 'Hujah dan analisis'], ['bukti', 'Bukti dan contoh'], ['bahasa', 'Bahasa'], ['rujukan', 'Rujukan dan sitasi']];
  const UITM = [[80, 'A'], [75, 'A-'], [70, 'B+'], [65, 'B'], [60, 'B-'], [55, 'C+'], [50, 'C'], [47, 'C-'], [44, 'D+'], [40, 'D'], [30, 'E'], [0, 'F']];
  const gradeUitm = n => UITM.find(([m]) => n >= m)[1];
  const SI = () => window.SemakIndustri;
  const short = (s, n = 90) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const dot = s => String(s || '').trim().replace(/[.\s]+$/, '');

  /** Markah dan gred utama: rubrik universiti (audit lanjutan) jika ada, jika tidak ulasan pakar */
  function headline(r) {
    if (r.audit) return { skor: r.audit.jumlah, gred: SI().gred(r.audit.jumlah), skala: 'anggaran skala A+ hingga F' };
    if (r.expert) return { skor: r.expert.jumlah, gred: gradeUitm(r.expert.jumlah), skala: 'anggaran skala UiTM' };
    return null;
  }

  /** Bahagikan semua dapatan kepada tiga tahap */
  function matrix(r) {
    const K = [], S = [], L = [];
    const x = r.expert, f = r.refs, a = r.audit;
    const pending = r.sugg.filter(s => !/\(diterima\)$/.test(s.to));
    const nCat = name => pending.filter(s => s.cat === name).length;

    // Rujukan
    if (f && !f.found) K.push(['Rujukan', 'Tiada senarai rujukan dikesan. Tambah tajuk "Rujukan" dan senaraikan semua sumber di hujung teks.']);
    if (f && f.found) {
      const bad = f.items.filter(i => i.status === 'tiada'), near = f.items.filter(i => i.status === 'mungkin');
      bad.forEach(i => K.push(['Rujukan', `[⚠ AMARAN MERAH] Tidak dijumpai dalam pangkalan DOI, disyaki palsu: "${short(i.ref)}". Sahkan sumber asal atau gantikan.`]));
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
    // Audit lanjutan: rubrik universiti, struktur hujah, NC industri
    if (a) {
      SI().RUBRIK.forEach(([k, n]) => {
        const m = a.rubrik[k]; if (!m || !m.ada) return;
        (m.skor < 10 ? K : m.skor < 15 ? S : L).push(['Rubrik', `${n} ${m.skor}/20${m.ulasan ? ': ' + m.ulasan : ''}`]);
      });
      a.hujah.forEach(h => (h.tahap === 'tinggi' ? K : S).push([SI().HUJAH[h.jenis] || 'Hujah', `${h.bahagian}: ${dot(h.isu)}. ${h.cadangan}`]));
      a.nc.forEach(n => (n.tahap === 'major' ? K : S).push([n.kod, `${n.titik}: ${dot(n.cadangan)}.`]));
      if (a.industri && !a.nc.length) L.push(['Pematuhan', 'Tiada NC ditemui dalam prosedur dan parameter industri.']);
      if (!a.hujah.length) L.push(['Hujah', 'Tiada kelompongan hujah yang ketara.']);
    }
    // Bahasa
    const eg = nCat('Ejaan') + nCat('Tatabahasa');
    if (eg) K.push(['Bahasa', `Betulkan ${eg} kesalahan ejaan dan tatabahasa dalam senarai cadangan.`]);
    const gy = nCat('Gaya / bunyi AI'), kj = nCat('Kejelasan'), tb = nCat('Tanda baca'), lr = nCat('Laras akademik');
    if (lr) S.push(['Laras', `${lr} ayat perlu laras yang lebih akademik.`]);
    if (tb) S.push(['Tanda baca', `${tb} isu tanda baca dan jarak.`]);
    if (kj) S.push(['Kejelasan', `${kj} ayat terlalu panjang atau kurang jelas.`]);
    if (gy) S.push(['Gaya', `${gy} frasa klise atau penanda wacana berlebihan.`]);
    if (!eg) L.push(['Bahasa', 'Tiada kesalahan ejaan atau tatabahasa yang belum dibetulkan.']);
    // Ulasan pakar (rubrik umum)
    if (x) {
      CRIT.forEach(([k, n]) => {
        const m = x.markah[k]; if (!m) return;
        if (a && (k === 'struktur' || k === 'hujah')) return;   // sudah diliputi oleh rubrik universiti dan audit hujah
        const t = `${n} ${m.skor}/10${m.ulasan ? ': ' + m.ulasan : ''}`;
        (m.skor < 5 ? K : m.skor < 7.5 ? S : L).push(['Ulasan pakar', t]);
      });
      x.penambahbaikan.forEach(p => (x.jumlah < 50 ? K : S).push(['Isi', `${dot(p.isu)}. ${p.cadangan}`]));
      x.kekuatan.forEach(k => L.push(['Kekuatan', k]));
    }
    return { K, S, L };
  }

  const COLS = [['K', 'Kritikal', 'Mesti baiki sekarang', 'down'], ['S', 'Sederhana', 'Penambahbaikan gaya bahasa', 'warn'], ['L', 'Lulus', 'Sudah memenuhi standard', 'up']];

  function render() {
    const r = window.CheckerReport && window.CheckerReport();
    if (!r) return;
    const m = matrix(r), h = headline(r);
    $('#auditBox').innerHTML = `${h ? `<p class="audit-score"><b class="num">${h.skor}%</b> <span class="rf-chip ${h.skor >= 60 ? 'up' : h.skor >= 45 ? 'warn' : 'down'}">Gred ${h.gred}</span> <span class="muted small">${h.skala}</span></p>` : ''}
      <div class="audit-grid">${COLS.map(([k, name, sub, c]) => `<div class="audit-col"><div class="audit-h"><span class="rf-chip ${c}">${name} <span class="num">${m[k].length}</span></span><span class="muted small">${sub}</span></div>
        ${m[k].length ? `<ul>${m[k].slice(0, 12).map(([t, s]) => `<li><b>${esc(t)}</b> ${esc(s)}</li>`).join('')}</ul>${m[k].length > 12 ? `<p class="muted small">+${m[k].length - 12} lagi dalam laporan</p>` : ''}` : '<p class="muted small">Tiada.</p>'}</div>`).join('')}</div>`;
    card.classList.remove('hidden');
  }

  /* ---------- Laporan Markdown ---------- */
  const cell = s => String(s == null ? '' : s).replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
  const code = s => '`' + String(s || '').replace(/\s+/g, ' ').replace(/`/g, "'").trim() + '`';
  const REF = { sah: '✅ Disahkan', mungkin: '🟡 Hampir sepadan', tiada: '🔴 [⚠ AMARAN MERAH] Tidak dijumpai, disyaki palsu', laman: 'ℹ️ Laman web', ralat: '❔ Tidak dapat disemak' };
  const TAHAP = { tinggi: '🔴 Tinggi', sederhana: '🟡 Sederhana', rendah: '🟢 Rendah' };

  function markdown(r) {
    const m = matrix(r), x = r.expert, f = r.refs, a = r.audit, h = headline(r), L = [];
    const tarikh = new Date().toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' });
    L.push('# Laporan Audit Akademik', '', `> Dijana oleh Bijak Labur (bijaklabur.my) pada ${tarikh}. Peratus AI dan plagiarisme ialah anggaran berdasarkan ciri teks dan carian sumber terbuka, bukan keputusan Turnitin atau sistem rasmi universiti. Markah, NC dan ulasan dijana oleh AI sebagai panduan pembelajaran.`, '');
    if (a && (a.profil || a.bidang)) L.push(`**Pemeriksa:** ${a.profil || 'Pemeriksa universiti'}${a.bidang ? ` · **Bidang:** ${a.bidang}` : ''}${a.soalan ? `  \n**Soalan utama dikesan:** ${a.soalan}` : ''}`, '');
    L.push('| Petunjuk | Nilai |', '|---|---|');
    L.push(`| Anggaran AI | ${r.ai >= 55 ? '⚠️ ' : ''}${r.ai}% |`, `| Anggaran plagiarisme | ${r.plag == null ? 'Tiada sumber disemak' : (r.plag >= 25 ? '⚠️ ' : '') + r.plag + '%'} |`, `| Kualiti bahasa | ${r.quality}% |`);
    if (h) L.push(`| Unjuran markah | **${h.skor}% · Gred ${h.gred}** (${h.skala}) |`);
    if (a && a.industri) L.push(`| NC industri | ${a.nc.filter(n => n.tahap === 'major').length} major, ${a.nc.filter(n => n.tahap === 'minor').length} minor |`);
    L.push('');

    /* FASA 1 */
    L.push('## Fasa 1: Forensik akademik dan sitasi', '', '### Ketulenan dan AI', '', '| Isyarat tulisan AI | Tahap |', '|---|---|');
    r.signals.forEach(([k, v]) => L.push(`| ${cell(k)} | ${Math.round(v * 100)}% |`));
    L.push('');
    const klise = [...new Set(r.sugg.filter(s => s.cat === 'Gaya / bunyi AI').map(s => s.from.replace(/,$/, '').trim().toLowerCase()))];
    if (klise.length) L.push('**Frasa klise AI dikesan:** ' + klise.slice(0, 30).map(code).join(', '), '');
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
    L.push('### Audit rujukan dan sitasi', '');
    if (!f) L.push('Semakan rujukan tidak dijalankan.');
    else if (!f.found) L.push('🔴 [⚠ AMARAN MERAH] Tiada bahagian "Rujukan" atau "References" dikesan.');
    else {
      L.push('| # | Rujukan | Status | Pautan |', '|---|---|---|---|');
      f.items.forEach((i, n) => L.push(`| ${n + 1} | ${cell(short(i.ref, 160))} | ${REF[i.status] || i.status} | ${i.url ? `[${cell(i.via || 'Buka')}](${i.url})` : ''} |`));
      L.push('', 'Status disemak secara langsung dengan Crossref (DOI) dan OpenAlex, bukan simulasi. "Tidak dijumpai" bermaksud rujukan itu mungkin direka; buku dan terbitan tempatan mungkin tiada dalam pangkalan ini.');
      if (f.missing.length) L.push('', '**🔴 Disitasi dalam teks tetapi tiada dalam senarai rujukan:**', ...f.missing.map(q => `- ${q}`));
      if (f.unused.length) L.push('', '**🟡 Dalam senarai rujukan tetapi tidak disitasi:**', ...f.unused.map(q => `- ${short(q, 160)}`));
    }
    L.push('', '### Penilaian rubrik universiti', '');
    if (a) {
      L.push(`**Unjuran gred: ${SI().gred(a.jumlah)} (${a.jumlah}%)**, anggaran skala A+ hingga F.`, '', '| Kriteria | Markah | Ulasan |', '|---|---|---|');
      SI().RUBRIK.forEach(([k, n]) => { const c = a.rubrik[k] || {}; L.push(`| ${n} | ${c.ada ? c.skor + '/20' : 'Tidak berkaitan'} | ${cell(c.ulasan)} |`); });
      L.push('');
    }
    if (x) {
      L.push(`**Ulasan pakar (rubrik umum): ${x.jumlah}% · Gred ${gradeUitm(x.jumlah)}** (anggaran skala UiTM)`, '', x.ringkasan, '', '| Kriteria | Markah | Ulasan |', '|---|---|---|');
      CRIT.forEach(([k, n]) => { const c = x.markah[k] || {}; L.push(`| ${n} | ${c.skor}/10 | ${cell(c.ulasan)} |`); });
      L.push('');
      if (x.kekuatan.length) L.push('**Kekuatan**', '', ...x.kekuatan.map(k => `- ${k}`), '');
      if (x.penambahbaikan.length) {
        L.push('**Penambahbaikan isi**', '');
        x.penambahbaikan.forEach(p => L.push(`- **${p.isu}**${p.petikan ? ` ${code(p.petikan)}` : ''}: ${p.cadangan}`));
        L.push('');
      }
    }
    if (!a && !x) L.push('Rubrik tidak dinilai. Tanda pilihan "Audit lanjutan" atau "Ulasan pakar AI" dan semak semula.', '');

    /* FASA 2 */
    L.push('## Fasa 2: Audit struktur logik dan kelompongan hujah', '');
    if (!a) L.push('Audit lanjutan tidak dijalankan.', '');
    else {
      if (a.hujah.length) {
        L.push('| Bahagian/Perenggan | Isu Struktur Hujah | Kesan Kepada Markah | Cadangan Penambahbaikan (Actionable Advice) |', '|---|---|---|---|');
        a.hujah.forEach(h => L.push(`| ${cell(h.bahagian)}${h.petikan ? '<br>' + code(short(h.petikan, 160)) : ''} | ${TAHAP[h.tahap]} · **${SI().HUJAH[h.jenis]}**: ${cell(h.isu)} | ${cell(h.kesan)} | ${cell(h.cadangan)} |`));
      } else L.push('Tiada kelompongan hujah yang ketara ditemui.');
      L.push('');
      if (a.industri) {
        L.push('### Audit pematuhan standard dan kawalan kritikal (industri)', '');
        if (a.nc.length) {
          L.push('| Bahagian/Perenggan | Titik Kawalan/Risiko | Kod NC | Huraian Pelanggaran Standard | Cadangan Penambahbaikan (Untuk Markah Penuh) |', '|---|---|---|---|---|');
          a.nc.forEach(n => L.push(`| ${cell(n.bahagian)}${n.petikan ? '<br>' + code(short(n.petikan, 160)) : ''} | ${cell(n.titik)} | ${n.tahap === 'major' ? '🔴' : '🟡'} **${n.kod}** (${n.tahap}) | ${n.standard ? `**${cell(n.standard)}**: ` : ''}${cell(n.huraian)} | ${cell(n.cadangan)} |`));
          L.push('', 'Penilaian AI sebagai panduan pembelajaran, bukan audit pensijilan rasmi. Sahkan nombor klausa dengan dokumen standard rasmi.');
        } else L.push('Tiada NC ditemui dalam prosedur dan parameter yang dibincangkan.');
        L.push('');
      }
    }

    /* FASA 3 */
    L.push('## Fasa 3: Visualisasi peta konsep (Mermaid)', '');
    const pm = a ? SI().mermaidPeta(a.peta) : '', am = a ? SI().mermaidAliran(a.aliran) : '', fm = a ? SI().mermaidPelan(a.fasiliti) : '';
    if (pm) L.push('### Peta konsep', '', '```mermaid', pm, '```', '');
    if (am) L.push(`### Carta alir${a.aliran.tajuk ? ': ' + a.aliran.tajuk : ''}`, '', '```mermaid', am, '```', '');
    if (fm) L.push(`### Pelan lantai lot kedai ${a.fasiliti.lebar} x ${a.fasiliti.panjang} kaki`, '', 'Garisan putus-putus menegak (`-.->`) ialah aliran bahan mentah satu hala dari pintu masuk ke pintu keluar.', '', '```mermaid', fm, '```', '');
    if (!pm && !am && !fm) L.push('Audit lanjutan tidak dijalankan.', '');
    else L.push('Tampal kod di atas ke mermaid.live, Notion, Obsidian atau GitHub untuk melihat rajahnya.', '');

    /* FASA 4 */
    L.push('## Fasa 4: Pembedahan linguistik (laras akademik)', '', 'Tiada ayat diubah secara automatik. Setiap cadangan perlu diterima satu demi satu.', '');
    if (r.sugg.length) {
      L.push('| # | Jenis | Ayat asal | Pembetulan | Mengapa diubah |', '|---|---|---|---|---|');
      const order = s => s.cat === 'Laras akademik' ? 0 : 1;
      [...r.sugg].sort((p, q) => order(p) - order(q)).slice(0, 120).forEach((s, i) => L.push(`| ${i + 1} | ${cell(s.cat)} | ${code(short(s.from, 160))} | ${code(short(s.to, 160))} | ${cell(s.why)} |`));
      if (r.sugg.length > 120) L.push('', `+${r.sugg.length - 120} cadangan lagi dalam aplikasi.`);
    } else L.push('Tiada isu bahasa ditemui.');
    L.push('');

    /* FASA 5 */
    L.push('## Fasa 5: Skrip Python anotasi PDF (PyMuPDF)', '');
    if (SI()) {
      const n = SI().pdfIssues(r).length;
      L.push(`Skrip ini menyerlah ${n} isu (hujah${a && a.industri ? ', NC' : ''} dan bahasa) dengan warna merah dan menyuntik nota komen terus ke dalam PDF tugasan asal. Simpan sebagai \`anotasi_semakan.py\`, kemudian jalankan:`, '', '```bash', 'pip install pymupdf', 'python anotasi_semakan.py tugasan.pdf', '```', '', '```python', SI().python(r).trimEnd(), '```', '');
    }

    /* Tindakan */
    L.push('## Tindakan seterusnya', '', '| Tahap | Perkara | Tindakan |', '|---|---|---|');
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
