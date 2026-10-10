/* Audit Halal: senarai semak audit dalaman halal dan log ketakakuran (NCR) untuk pelajar
   Pengurusan Industri Halal. Idea daripada modul Kualiti ERPNext, dibina sendiri; data dalam peranti sahaja. */
(function () {
  const root = $('#view-halal');
  if (!root) return;
  const SEMAK = [
    ['urus', 'Pengurusan dan dokumentasi', [
      'Sistem pengurusan halal syarikat didokumenkan dan dipatuhi',
      'Jawatankuasa Halal Dalaman ditubuhkan dan bermesyuarat secara berkala',
      'Eksekutif Halal atau Penyelia Halal Muslim dilantik mengikut saiz syarikat',
      'Sekurang-kurangnya dua pekerja Muslim warganegara di bahagian pengendalian atau pengeluaran',
      'Pekerja menerima latihan kesedaran halal dan rekod latihan disimpan',
      'Audit dalaman halal dijalankan secara berkala dan laporannya disimpan',
      'Prosedur penarikan balik produk dan pengendalian aduan tersedia'
    ]],
    ['bahan', 'Bahan mentah dan pembekal', [
      'Setiap bahan mempunyai sijil halal sah daripada JAKIM, JAIN atau badan asing yang diiktiraf JAKIM',
      'Senarai bahan dan pembekal yang diluluskan dikemas kini',
      'Tarikh tamat sijil halal bahan dipantau sebelum tamat tempoh',
      'Tiada bahan daripada khinzir, arak atau najis dalam formulasi',
      'Bahan baharu dinilai status halalnya sebelum digunakan'
    ]],
    ['proses', 'Premis dan pemprosesan', [
      'Aliran pengeluaran halal diasingkan sepenuhnya daripada produk tidak halal',
      'Peralatan dan permukaan bebas najis dan dibersihkan mengikut jadual',
      'Kawalan makhluk perosak dijalankan dan rekodnya disimpan',
      'Amalan pengilangan baik (GMP) dan kebersihan (GHP) dipatuhi',
      'Bekalan air bersih dan sistem saliran dalam keadaan baik',
      'Haiwan peliharaan tidak dibenarkan di kawasan premis'
    ]],
    ['simpan', 'Penyimpanan, pengangkutan dan rantaian sejuk', [
      'Bahan dan produk halal disimpan terasing dan dilabel dengan jelas',
      'Kenderaan pengangkutan khusus untuk produk halal atau dibersihkan secara samak jika perlu',
      'Suhu bilik sejuk dan penghantaran dipantau serta direkod',
      'Penjejakan kelompok (batch) dari bahan mentah hingga produk siap boleh dibuat'
    ]],
    ['label', 'Pembungkusan, pelabelan dan pekerja', [
      'Bahan pembungkusan bebas najis dan tidak memudaratkan',
      'Logo halal Malaysia digunakan hanya pada produk yang disijilkan',
      'Label produk tepat: nama, ramuan, tarikh dan pengeluar',
      'Pekerja memakai pakaian bersih dan mematuhi kebersihan diri',
      'Tandas dan kemudahan pekerja terpisah daripada kawasan pengeluaran'
    ]]
  ];
  const ST = { y: 'Patuh', n: 'Tidak patuh', na: 'Tidak berkaitan' };
  const NCR_ST = { buka: 'Terbuka', tindakan: 'Dalam tindakan', tutup: 'Ditutup' };
  // Senarai semak penuh mengikut skim pensijilan (MPPHM 2020 s. 4). Data dalam data/audit-halal/<skim>.json
  const SKIM = [
    ['ringkas', 'Ringkas (latihan asas, 27 item)'],
    ['premis-makanan', 'Premis Makanan (270 item)'],
    ['produk-makanan', 'Produk Makanan dan Minuman (695 item)'],
    ['kosmetik', 'Kosmetik (231 item)'],
    ['farmaseutikal', 'Farmaseutikal (217 item)'],
    ['barang-gunaan', 'Barang Gunaan (214 item)'],
    ['logistik', 'Perkhidmatan Logistik (210 item)'],
    ['rumah-sembelihan', 'Rumah Sembelihan (234 item)'],
    ['oem', 'Pengilangan Kontrak / OEM (228 item)'],
    ['peranti-perubatan', 'Peranti Perubatan (212 item)']
  ];
  const data = {}, buka = {};
  let d = store.get('halalAudit', { syarikat: '', tarikh: '', jawab: {}, ncr: [] });
  if (!d.skim) d.skim = 'ringkas';

  // Kumpulan semasa dalam bentuk seragam: [kumpulan, nama, [[teks, rujukan]], lead]
  function kumpulan() {
    if (d.skim === 'ringkas') return SEMAK.map(([g, name, items]) => [g, name, items.map(t => [t, '']), '']);
    const j = data[d.skim];
    return j ? j.bahagian.map(b => [d.skim + ':' + b.kod, 'Bahagian ' + b.kod + ': ' + b.tajuk, b.item, b.lead]) : [];
  }
  function muat(k) {
    if (k === 'ringkas' || data[k]) return render();
    // Rangka halaman dipaparkan dahulu ("Memuatkan senarai semak..."), supaya pemilih skim kekal boleh digunakan
    // walaupun skim yang disimpan tidak dapat dimuat (cth. luar talian semasa laman dibuka)
    render();
    fetch('data/audit-halal/' + k + '.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(j => { data[k] = j; render(); })
      .catch(() => { const l = root.querySelector('#hlList'); if (l) l.innerHTML = '<p class="muted small">Senarai semak tidak dapat dimuatkan. Semak sambungan internet dan cuba lagi.</p>'; });
  }

  function render() {
    const G = kumpulan(), j = d.skim === 'ringkas' ? null : data[d.skim];
    const all = G.flatMap(([g, , items]) => items.map((_, i) => `${g}${i}`));
    const ans = all.map(k => d.jawab[k]).filter(Boolean), app = ans.filter(a => a !== 'na'), yes = app.filter(a => a === 'y').length;
    const score = app.length ? Math.round(yes / app.length * 100) : 0, open = d.ncr.filter(n => n.st !== 'tutup');
    if (!buka[d.skim] && G.length) { const g = G.find(([g, , items]) => items.some((_, i) => !d.jawab[g + i])); buka[d.skim] = new Set(g ? [g[0]] : []); }
    root.innerHTML = `
      <div class="page-head"><p class="eyebrow">Pengurusan Industri Halal</p><h1 id="h-halal">Audit Halal</h1>
        <p class="lead">Senarai semak audit dalaman dan log ketakakuran (NCR) untuk latihan amali. Semua data disimpan dalam peranti ini sahaja.</p></div>
      <div class="card ah-meta">
        <div class="field"><label for="hlSkim">Skim pensijilan</label><select id="hlSkim">${SKIM.map(([k, n]) => `<option value="${k}" ${d.skim === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
        <div class="form-grid"><div class="field"><label for="hlCo">Nama syarikat atau premis</label><input id="hlCo" maxlength="80" value="${esc(d.syarikat)}" placeholder="cth. Kilang Roti Contoh Sdn Bhd"></div>
        <div class="field"><label for="hlDate">Tarikh audit</label><input id="hlDate" type="date" value="${esc(d.tarikh)}"></div></div>
        <div class="stat-row four">
          <div class="stat"><div class="v num">${score}%</div><div class="k">Skor patuh</div></div>
          <div class="stat"><div class="v num">${ans.length}/${all.length}</div><div class="k">Item disemak</div></div>
          <div class="stat"><div class="v num">${open.filter(n => n.kat === 'major').length}</div><div class="k">NCR major terbuka</div></div>
          <div class="stat"><div class="v num">${open.length}</div><div class="k">Jumlah NCR terbuka</div></div>
        </div>
        <div class="actions"><button class="btn sm ghost" id="hlPrint">${icon('file')}Cetak atau simpan PDF</button>${j ? `<a class="btn sm ghost" href="data/audit-halal/senarai-semak-${d.skim}.xlsx" download>Muat turun Excel</a><a class="btn sm ghost" href="data/audit-halal/senarai-semak-${d.skim}.pdf" target="_blank" rel="noopener">PDF kosong</a>` : ''}<button class="btn sm ghost danger" id="hlReset">Mula audit baharu</button></div>
      </div>
      ${j ? `<p class="small">${esc(j.intro)}</p><p class="small muted">Rujukan bertanda * bermaksud hanya tajuk klausa disahkan daripada pratonton rasmi Jabatan Standard Malaysia; isinya diringkaskan.${d.skim === 'produk-makanan' ? ' "(saranan)" bermaksud klausa cadangan ("should"), bukan kewajipan ("shall").' : ''}</p>` : ''}

      <div class="block-head"><h2>Senarai semak</h2></div>
      <div id="hlList">${d.skim !== 'ringkas' && !j ? '<p class="muted small">Memuatkan senarai semak...</p>' : G.map(([g, name, items, lead]) => {
        const done = items.filter((_, i) => d.jawab[g + i]).length;
        return `<details class="card ah-grp" data-grp="${esc(g)}" ${buka[d.skim].has(g) ? 'open' : ''}><summary><b>${esc(name)}</b><span class="muted small">${done}/${items.length}</span></summary>
          ${lead ? `<p class="small muted ah-lead">${esc(lead)}</p>` : ''}
          ${items.map(([t, ref], i) => { const k = g + i, a = d.jawab[k], no = j ? g.split(':')[1] + (i + 1) + '. ' : ''; return `<div class="ah-item ${a ? 'ah-' + a : ''}"><p>${esc(no + t)}${ref ? `<span class="ah-ref">${esc(ref)}</span>` : ''}</p>
            <div class="segmented small" role="group" aria-label="Status">${Object.entries(ST).map(([s, n]) => `<button type="button" class="seg ${a === s ? 'active' : ''}" data-hl="${esc(k)}" data-st="${s}" aria-pressed="${a === s}">${n}</button>`).join('')}</div></div>`; }).join('')}
        </details>`;
      }).join('')}</div>
      ${j ? `<details class="card ah-grp"><summary><b>Rujukan yang digunakan</b><span class="muted small">${j.rujukan.length}</span></summary>
        <div class="list">${j.rujukan.map(r => `<div class="ah-rj"><p class="small"><b>${esc(r.ringkas)}</b>: ${r.url && /^https?:\/\//.test(r.url) ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.penuh)}</a>` : esc(r.penuh)}</p><p class="small muted">${esc(r.status)}</p></div>`).join('')}</div></details>` : ''}

      <div class="block-head"><h2>Log ketakakuran (NCR)</h2><button type="button" class="link-btn" id="hlAddNcr">Tambah NCR</button></div>
      <form class="card ah-ncr-form hidden" id="hlNcrForm" autocomplete="off">
        <div class="field"><label for="ncTemuan">Penemuan</label><textarea id="ncTemuan" rows="2" maxlength="400" required></textarea></div>
        <div class="form-grid">
          <div class="field"><label for="ncKat">Kategori</label><select id="ncKat"><option value="minor">Minor</option><option value="major">Major</option></select></div>
          <div class="field"><label for="ncPic">Pegawai bertanggungjawab</label><input id="ncPic" maxlength="60"></div>
          <div class="field"><label for="ncDue">Tarikh akhir</label><input id="ncDue" type="date"></div>
        </div>
        <div class="field"><label for="ncPunca">Punca</label><textarea id="ncPunca" rows="2" maxlength="400" placeholder="Tanya 'mengapa' sehingga jumpa punca sebenar"></textarea></div>
        <div class="field"><label for="ncTindakan">Tindakan pembetulan</label><textarea id="ncTindakan" rows="2" maxlength="400"></textarea></div>
        <div class="actions"><button class="btn sm" type="submit">Simpan NCR</button><button class="btn sm ghost" type="button" id="ncCancel">Batal</button></div>
      </form>
      <div class="list ah-ncr">${d.ncr.length ? d.ncr.map((n, i) => `<div class="ah-ncr-row ${n.st}">
          <div class="ah-ncr-top"><b>NCR ${String(i + 1).padStart(2, '0')}</b><span class="ah-kat ${n.kat}">${n.kat === 'major' ? 'Major' : 'Minor'}</span>
            <select data-ncr-st="${i}" aria-label="Status NCR ${i + 1}">${Object.entries(NCR_ST).map(([s, t]) => `<option value="${s}" ${n.st === s ? 'selected' : ''}>${t}</option>`).join('')}</select>
            <button type="button" class="q-del" data-ncr-del="${i}" aria-label="Padam NCR ${i + 1}">${icon('x')}</button></div>
          <p>${esc(n.temuan)}</p>
          ${n.punca ? `<p class="small"><b>Punca:</b> ${esc(n.punca)}</p>` : ''}${n.tindakan ? `<p class="small"><b>Tindakan:</b> ${esc(n.tindakan)}</p>` : ''}
          <p class="small muted">${n.pic ? esc(n.pic) + ' · ' : ''}${n.due ? 'Tarikh akhir ' + esc(n.due) : 'Tiada tarikh akhir'}${n.due && n.st !== 'tutup' && n.due < new Date().toLocaleDateString('en-CA') ? ' · <b class="ah-late">Lewat</b>' : ''}</p>
        </div>`).join('') : '<p class="muted small ah-empty">Belum ada NCR. Item bertanda "Tidak patuh" boleh terus direkod sebagai NCR.</p>'}</div>

      <div class="block-head"><h2>Rajah aliran</h2></div>
      <div class="two-col">
        <figure class="card rajah"><figcaption>Proses pensijilan halal Malaysia</figcaption><img src="images/rajah/pensijilan-halal.svg" alt="Rajah aliran pensijilan halal: sediakan dokumen, mohon melalui MYeHALAL, bayar fi, semakan dokumen, audit premis, Panel Pengesahan Halal, sijil dikeluarkan, kemudian pemantauan dan pembaharuan" loading="lazy" decoding="async"></figure>
        <figure class="card rajah"><figcaption>Kitaran tindakan NCR</figcaption><img src="images/rajah/aliran-ncr.svg" alt="Rajah kitaran NCR: penemuan audit, rekod NCR, analisis punca, tindakan pembetulan, semak keberkesanan, tutup NCR dan tindakan pencegahan" loading="lazy" decoding="async"></figure>
      </div>
      <p class="source">Senarai semak ringkas disusun berdasarkan MS 1500:2019 dan Manual Prosedur Pensijilan Halal Malaysia (Domestik) 2020. Senarai semak penuh setiap skim merujuk MPPHM 2020, MHMS 2020, standard MS bagi skim itu dan undang-undang berkaitan, dengan rujukan bagi setiap item. Semuanya untuk tujuan pembelajaran. Ia bukan pengganti audit rasmi JAKIM atau JAIN. Rujuk <a href="https://myehalal.halal.gov.my" target="_blank" rel="noopener">MYeHALAL</a> untuk keperluan terkini.</p>`;
  }
  const save = () => store.set('halalAudit', d);

  function ncrForm(text) {
    const f = $('#hlNcrForm');
    f.classList.remove('hidden'); f.reset();
    if (text) $('#ncTemuan').value = text;
    $('#ncTemuan').focus();
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  root.addEventListener('click', e => {
    const t = e.target; let b;
    if ((b = t.closest('[data-hl]'))) {
      const k = b.dataset.hl, s = b.dataset.st;
      d.jawab[k] = d.jawab[k] === s ? undefined : s; save();
      const grp = kumpulan().find(([g]) => k.startsWith(g) && /^\d+$/.test(k.slice(g.length))), text = grp ? grp[2][+k.slice(grp[0].length)][0] : '';
      render();
      if (d.jawab[k] === 'n' && !d.ncr.some(n => n.item === k)) { ncrForm(text + ': '); $('#hlNcrForm').dataset.item = k; }
      return;
    }
    if (t.closest('#hlAddNcr')) { $('#hlNcrForm').dataset.item = ''; return ncrForm(''); }
    if (t.closest('#ncCancel')) return $('#hlNcrForm').classList.add('hidden');
    if ((b = t.closest('[data-ncr-del]'))) { if (!confirm('Padam NCR ini?')) return; d.ncr.splice(+b.dataset.ncrDel, 1); save(); return render(); }
    if (t.closest('#hlPrint')) return window.print();
    if (t.closest('#hlReset')) { if (!confirm('Padam senarai semak dan NCR audit ini?')) return; d = { syarikat: '', tarikh: '', jawab: {}, ncr: [], skim: d.skim }; delete buka[d.skim]; save(); return render(); }
  });
  root.addEventListener('submit', e => {
    if (e.target.id !== 'hlNcrForm') return;
    e.preventDefault();
    const v = id => $('#' + id).value.trim();
    d.ncr.push({ temuan: v('ncTemuan'), kat: v('ncKat'), pic: v('ncPic'), due: v('ncDue'), punca: v('ncPunca'), tindakan: v('ncTindakan'), st: 'buka', item: e.target.dataset.item || '' });
    save(); render(); toast('NCR disimpan');
  });
  root.addEventListener('input', e => {
    if (e.target.id === 'hlCo') { d.syarikat = e.target.value; save(); }
    if (e.target.id === 'hlDate') { d.tarikh = e.target.value; save(); }
  });
  root.addEventListener('toggle', e => {
    const g = e.target.dataset && e.target.dataset.grp;
    if (g && buka[d.skim]) e.target.open ? buka[d.skim].add(g) : buka[d.skim].delete(g);
  }, true);
  root.addEventListener('change', e => {
    if (e.target.id === 'hlSkim') { d.skim = e.target.value; save(); return muat(d.skim); }
    if (e.target.id === 'hlDate') { d.tarikh = e.target.value; save(); }
    if (e.target.dataset.ncrSt != null) { d.ncr[+e.target.dataset.ncrSt].st = e.target.value; save(); render(); }
  });
  muat(d.skim);
})();
