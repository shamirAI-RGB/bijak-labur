/* Bijak Labur Premium: alat pelabur (saiz posisi, jurnal, kos Bursa, dividen, matlamat, perbandingan simpanan) */
(function () {
  const { fmtRM, pct, sign, numIn, field, persist } = ProTools.kit;
  const v = id => { const n = numIn($('#' + id)); return isFinite(n) ? n : 0; };
  const out = (k, val, cls = '') => `<div class="stat"><div class="v num ${cls}">${val}</div><div class="k">${k}</div></div>`;
  const rmShort = n => 'RM' + (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + 'j' : Math.round(n).toLocaleString('en-US'));

  // Carta bar SVG ringkas, ikut warna tema
  function bars(items, fmt) {
    const max = Math.max(...items.map(i => i.v), 1), w = 100 / items.length;
    return `<svg class="mini-bars" viewBox="0 0 100 60" preserveAspectRatio="none" role="img" aria-label="Carta">${items.map((it, i) =>
      `<rect x="${i * w + w * 0.18}" y="${58 - it.v / max * 54}" width="${w * 0.64}" height="${Math.max(it.v / max * 54, 0.5)}" rx="0.8" fill="${it.c || 'var(--brand)'}"><title>${it.l}: ${fmt(it.v)}</title></rect>`).join('')}</svg>
      <div class="mini-axis">${items.map(it => `<span>${it.l}</span>`).join('')}</div>`;
  }

  /* ---------- 1. Saiz posisi dan risiko ---------- */
  ProTools.add('posisi', {
    name: 'Saiz posisi dan risiko', plan: 'pelabur', icon: 'shield', desc: 'Berapa unit patut dibeli',
    pitch: 'Tetapkan berapa peratus modal yang sanggup anda rugi, dan alat ini mengira bilangan unit yang selamat dibeli berdasarkan paras stop loss anda.',
    html: `<div class="card"><form id="psForm" class="form-grid">
      ${field('psCap', 'Modal akaun (RM)')}${field('psRisk', 'Risiko setiap dagangan (%)', 'type="number" step="0.1" min="0" max="100" inputmode="decimal" placeholder="1"')}
      ${field('psEntry', 'Harga masuk')}${field('psStop', 'Harga stop loss')}${field('psTarget', 'Harga sasaran (pilihan)')}
      <label class="check"><input type="checkbox" id="psLot" checked><span>Bundarkan ke lot Bursa (100 unit)</span></label>
    </form></div><div class="card" id="psOut" aria-live="polite"></div>
    <p class="source">Peraturan biasa: jangan risiko lebih 1 hingga 2% modal bagi setiap dagangan. Harga boleh melepasi stop loss ketika pasaran bergerak laju.</p>`,
    init() {
      persist($('#psForm'), 'posisi', () => {
        const cap = v('psCap'), riskPct = v('psRisk') || 1, entry = v('psEntry'), stop = v('psStop'), target = v('psTarget');
        if (!cap || !entry || !stop) { $('#psOut').innerHTML = '<p class="muted">Isi modal, harga masuk dan stop loss.</p>'; return; }
        if (stop === entry) { $('#psOut').innerHTML = '<p class="down">Stop loss mesti berbeza daripada harga masuk.</p>'; return; }
        const long = stop < entry, perUnit = Math.abs(entry - stop), riskAmt = cap * riskPct / 100;
        let units = Math.floor(riskAmt / perUnit);
        if ($('#psLot').checked) units = Math.floor(units / 100) * 100;
        const posVal = units * entry, rr = target ? Math.abs(target - entry) / perUnit : null;
        const capLimited = posVal > cap;
        $('#psOut').innerHTML = `<div class="stat-row">${out('Unit dibeli', units.toLocaleString('en-US'))}${out('Nilai posisi', fmtRM(posVal))}${out('Risiko maksimum', fmtRM(units * perUnit), 'down')}</div>
          <dl class="zk-lines"><div><dt>Arah</dt><dd>${long ? 'Beli (long)' : 'Jual (short)'}</dd></div>
          <div><dt>Risiko seunit</dt><dd class="num">${fmtRM(perUnit)} (${(perUnit / entry * 100).toFixed(2)}%)</dd></div>
          <div><dt>Bahagian modal digunakan</dt><dd class="num">${(posVal / cap * 100).toFixed(1)}%</dd></div>
          ${rr != null ? `<div><dt>Nisbah ganjaran:risiko</dt><dd class="num ${rr >= 2 ? 'up' : rr < 1 ? 'down' : ''}">1 : ${rr.toFixed(2)}</dd></div><div><dt>Untung jika capai sasaran</dt><dd class="num up">${fmtRM(units * Math.abs(target - entry))}</dd></div>` : ''}</dl>
          ${units === 0 ? '<p class="small down" style="margin-top:10px">Risiko seunit terlalu besar untuk modal ini. Kecilkan jarak stop loss atau tambah modal.</p>' : ''}
          ${capLimited ? '<p class="small warn-t" style="margin-top:10px">Nilai posisi melebihi modal. Anda memerlukan margin, atau kurangkan unit.</p>' : ''}
          ${rr != null && rr < 1.5 ? '<p class="small muted" style="margin-top:10px">Nisbah di bawah 1:1.5 bermakna anda perlu menang lebih kerap untuk untung.</p>' : ''}`;
      });
    }
  });

  /* ---------- 2. Jurnal dagangan ---------- */
  let trades = store.get('journal', []);
  ProTools.add('jurnal', {
    name: 'Jurnal dagangan', plan: 'pelabur', icon: 'book', desc: 'Kadar menang dan disiplin',
    pitch: 'Rekod setiap dagangan dan lihat kadar menang, purata untung dan rugi, faktor keuntungan serta lengkung ekuiti anda. Eksport ke CSV bila-bila masa.',
    html: `<div class="stat-row four" id="jnStats"></div><div class="card chart-card" id="jnCurveCard"><h3>Lengkung ekuiti</h3><div id="jnCurve"></div></div>
    <div class="card"><h3>Rekod dagangan</h3><form id="jnForm" class="form-grid">
      ${field('jnDate', 'Tarikh', 'type="date"')}${field('jnSym', 'Simbol', 'maxlength="20" autocapitalize="characters"')}
      <div class="field"><label for="jnSide">Arah</label><select id="jnSide"><option value="long">Beli dahulu</option><option value="short">Jual dahulu</option></select></div>
      ${field('jnQty', 'Unit')}${field('jnIn', 'Harga masuk')}${field('jnOut', 'Harga keluar')}${field('jnFee', 'Jumlah caj (RM)')}
      <div class="field wide"><label for="jnNote">Nota (strategi, emosi, pengajaran)</label><input id="jnNote" maxlength="200"></div>
      <button class="btn" type="submit">${icon('plus')}Simpan</button></form></div>
    <div class="row-between"><h3>Sejarah</h3><button class="btn sm ghost" id="jnCsv" type="button">${icon('download')}CSV</button></div>
    <div class="list" id="jnList"></div>`,
    init() {
      const render = () => {
        const done = trades.map(t => ({ ...t, pl: (t.side === 'short' ? t.inP - t.outP : t.outP - t.inP) * t.qty - (t.fee || 0) }));
        const wins = done.filter(t => t.pl > 0), losses = done.filter(t => t.pl <= 0), net = done.reduce((a, t) => a + t.pl, 0);
        const gw = wins.reduce((a, t) => a + t.pl, 0), gl = -losses.reduce((a, t) => a + t.pl, 0);
        $('#jnStats').innerHTML = out('Untung bersih', `${net >= 0 ? '+' : '−'}${fmtRM(Math.abs(net))}`, sign(net))
          + out(`Kadar menang (${done.length} dagangan)`, done.length ? Math.round(wins.length / done.length * 100) + '%' : '–')
          + out('Purata untung / rugi', done.length ? `${wins.length ? rmShort(gw / wins.length) : '–'} / ${losses.length ? rmShort(gl / losses.length) : '–'}` : '–')
          + out('Faktor keuntungan', gl ? (gw / gl).toFixed(2) : wins.length ? '∞' : '–');
        const sorted = done.slice().sort((a, b) => a.date.localeCompare(b.date));
        let eq = 0; const pts = sorted.map(t => (eq += t.pl));
        $('#jnCurveCard').classList.toggle('hidden', pts.length < 2);
        if (pts.length >= 2) {
          const all = [0, ...pts], mn = Math.min(...all), mx = Math.max(...all), r = mx - mn || 1;
          const path = all.map((p, i) => `${(i / (all.length - 1) * 100).toFixed(2)},${(56 - (p - mn) / r * 52).toFixed(2)}`).join(' ');
          const zero = 56 - (0 - mn) / r * 52;
          $('#jnCurve').innerHTML = `<svg class="curve" viewBox="0 0 100 60" preserveAspectRatio="none"><line x1="0" x2="100" y1="${zero}" y2="${zero}" stroke="var(--border)" stroke-width="0.6" vector-effect="non-scaling-stroke"/><polyline points="${path}" fill="none" stroke="${net >= 0 ? 'var(--up)' : 'var(--down)'}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
        }
        $('#jnList').innerHTML = done.length ? done.map((t, i) => ({ t, i })).sort((a, b) => b.t.date.localeCompare(a.t.date)).map(({ t, i }) => `<div class="pf-row">
          <div class="pf-main"><b>${esc(t.sym)}</b><span class="muted small">${esc(t.date)} · ${t.side === 'short' ? 'Jual dahulu' : 'Beli'} ${t.qty.toLocaleString('en-US')} unit · ${t.inP} → ${t.outP}</span></div>
          <div class="pf-val num ${sign(t.pl)}">${t.pl >= 0 ? '+' : '−'}${fmtRM(Math.abs(t.pl))}</div>
          ${t.note ? `<div class="pf-sub muted small">${esc(t.note)}</div>` : ''}
          <button class="icon-btn plain pf-del" data-jdel="${i}" aria-label="Buang">${icon('x')}</button></div>`).join('')
          : '<p class="muted pf-empty">Belum ada dagangan direkod.</p>';
        $('#jnCsv').disabled = !done.length;
      };
      $('#jnDate').value = new Date().toISOString().slice(0, 10);
      $('#jnForm').addEventListener('submit', e => {
        e.preventDefault();
        const t = { date: $('#jnDate').value, sym: $('#jnSym').value.trim().toUpperCase(), side: $('#jnSide').value, qty: v('jnQty'), inP: v('jnIn'), outP: v('jnOut'), fee: v('jnFee'), note: $('#jnNote').value.trim() };
        if (!t.date || !t.sym || !t.qty || !t.inP || !t.outP) return toast('Lengkapkan tarikh, simbol, unit dan harga.');
        trades.push(t); store.set('journal', trades);
        ['jnSym', 'jnQty', 'jnIn', 'jnOut', 'jnFee', 'jnNote'].forEach(id => $('#' + id).value = '');
        render(); toast('Dagangan direkod');
      });
      $('#jnList').addEventListener('click', e => {
        const d = e.target.closest('[data-jdel]'); if (!d || !confirm('Buang rekod ini?')) return;
        trades.splice(+d.dataset.jdel, 1); store.set('journal', trades); render();
      });
      $('#jnCsv').addEventListener('click', () => {
        const q = s => `"${String(s).replace(/"/g, '""')}"`;
        const csv = ['Tarikh,Simbol,Arah,Unit,Masuk,Keluar,Caj,Untung,Nota'].concat(trades.map(t =>
          [t.date, t.sym, t.side, t.qty, t.inP, t.outP, t.fee || 0, ((t.side === 'short' ? t.inP - t.outP : t.outP - t.inP) * t.qty - (t.fee || 0)).toFixed(2), q(t.note || '')].join(','))).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'jurnal-dagangan.csv'; a.click();
      });
      render();
    }
  });

  /* ---------- 3. Kos dagangan Bursa ---------- */
  function bursaFees(value, rate, minBro, sst) {
    const bro = value ? Math.max(value * rate / 100, minBro) : 0;
    const tax = sst ? bro * 0.08 : 0;
    const clearing = Math.min(value * 0.0003, 1000);
    const stamp = Math.min(Math.ceil(value / 1000), 1000);
    return { bro, tax, clearing, stamp, total: bro + tax + clearing + stamp };
  }
  ProTools.add('kos', {
    name: 'Kos dagangan Bursa', plan: 'pelabur', icon: 'receipt', desc: 'Caj sebenar dan harga pulang modal',
    pitch: 'Kira komisen, SST, fi penjelasan dan duti setem bagi beli dan jual saham Bursa, serta harga jual minimum untuk pulang modal.',
    html: `<div class="card"><form id="ksForm" class="form-grid">
      ${field('ksUnits', 'Unit (100 unit = 1 lot)')}${field('ksBuy', 'Harga beli (RM)')}${field('ksSell', 'Harga jual (RM, pilihan)')}
      ${field('ksRate', 'Kadar komisen broker (%)', 'type="number" step="any" min="0" inputmode="decimal" placeholder="Rujuk broker anda"')}${field('ksMin', 'Komisen minimum (RM)')}
      <label class="check"><input type="checkbox" id="ksSst" checked><span>SST 8% atas komisen</span></label>
    </form></div><div class="two-col"><div class="card" id="ksBuyOut"></div><div class="card" id="ksSellOut"></div></div>
    <p class="source">Duti setem RM1 bagi setiap RM1,000 (maksimum RM1,000) dan fi penjelasan 0.03% (maksimum RM1,000) mengikut kadar Bursa Malaysia. Komisen berbeza antara broker; sahkan dengan nota kontrak anda.</p>`,
    init() {
      persist($('#ksForm'), 'kos', () => {
        const u = v('ksUnits'), b = v('ksBuy'), s = v('ksSell'), rate = v('ksRate'), mn = v('ksMin'), sst = $('#ksSst').checked;
        const lines = f => `<dl class="zk-lines"><div><dt>Komisen</dt><dd class="num">${fmtRM(f.bro)}</dd></div>${sst ? `<div><dt>SST 8%</dt><dd class="num">${fmtRM(f.tax)}</dd></div>` : ''}
          <div><dt>Fi penjelasan</dt><dd class="num">${fmtRM(f.clearing)}</dd></div><div><dt>Duti setem</dt><dd class="num">${fmtRM(f.stamp)}</dd></div><div><dt><b>Jumlah caj</b></dt><dd class="num"><b>${fmtRM(f.total)}</b></dd></div></dl>`;
        if (!u || !b) { $('#ksBuyOut').innerHTML = '<p class="muted">Isi unit dan harga beli.</p>'; $('#ksSellOut').innerHTML = ''; return; }
        const bv = u * b, fb = bursaFees(bv, rate, mn, sst), cost = bv + fb.total;
        // Harga pulang modal: cari harga jual terkecil (gandaan 0.005) yang menutup kos
        let be = b; for (let i = 0; i < 4000; i++) { const sv = u * be; if (sv - bursaFees(sv, rate, mn, sst).total >= cost) break; be = +(be + 0.005).toFixed(3); }
        $('#ksBuyOut').innerHTML = `<h3>Beli</h3><div class="calc-out">${fmtRM(cost)}</div><p class="muted small">Nilai saham ${fmtRM(bv)} + caj</p>${lines(fb)}
          <p class="small" style="margin-top:10px">Harga jual pulang modal: <b class="num">RM${be.toFixed(3)}</b> (${pct((be / b - 1) * 100)})</p>`;
        if (!s) { $('#ksSellOut').innerHTML = '<h3>Jual</h3><p class="muted">Isi harga jual untuk melihat untung bersih.</p>'; return; }
        const sv = u * s, fs = bursaFees(sv, rate, mn, sst), net = sv - fs.total - cost;
        $('#ksSellOut').innerHTML = `<h3>Jual</h3><div class="calc-out ${sign(net)}">${net >= 0 ? '+' : '−'}${fmtRM(Math.abs(net))}</div><p class="muted small">Untung bersih selepas semua caj (${pct(net / cost * 100)})</p>${lines(fs)}`;
      });
    }
  });

  /* ---------- 4. Dividen dan DRIP ---------- */
  ProTools.add('dividen', {
    name: 'Dividen dan DRIP', plan: 'pelabur', icon: 'coins', desc: 'Pendapatan pasif dari tahun ke tahun',
    pitch: 'Unjurkan dividen tahunan dan pendapatan pasif bulanan anda, dengan atau tanpa melabur semula dividen (DRIP).',
    html: `<div class="card"><form id="dvForm" class="form-grid">
      ${field('dvStart', 'Pelaburan awal (RM)')}${field('dvMonthly', 'Tambahan sebulan (RM)')}${field('dvYield', 'Hasil dividen (% setahun)')}
      ${field('dvGrowth', 'Pertumbuhan dividen (% setahun)')}${field('dvPrice', 'Kenaikan harga saham (% setahun)')}${field('dvYears', 'Tempoh (tahun)', 'type="number" min="1" max="50" step="1" inputmode="numeric"')}
      <label class="check"><input type="checkbox" id="dvDrip" checked><span>Labur semula dividen (DRIP)</span></label>
    </form></div><div class="stat-row four" id="dvStats"></div><div class="card"><h3>Dividen diterima setiap tahun</h3><div id="dvChart"></div></div>
    <p class="source">Unjuran mudah dengan kadar tetap. Dividen sebenar boleh dipotong atau dihentikan, dan harga saham boleh jatuh.</p>`,
    init() {
      const f = $('#dvForm');
      if (!store.get('t_dividen', null)) { $('#dvStart').value = 10000; $('#dvMonthly').value = 300; $('#dvYield').value = 5; $('#dvGrowth').value = 3; $('#dvPrice').value = 3; $('#dvYears').value = 15; }
      persist(f, 'dividen', () => {
        const yrs = Math.min(Math.max(Math.round(v('dvYears')), 1), 50), y = v('dvYield') / 100, g = v('dvGrowth') / 100, pg = v('dvPrice') / 100, drip = $('#dvDrip').checked;
        let value = v('dvStart'), contrib = value, cumDiv = 0, yieldNow = y; const rows = [];
        for (let i = 1; i <= yrs; i++) {
          let divYear = 0;
          for (let m = 0; m < 12; m++) {
            value += v('dvMonthly'); contrib += v('dvMonthly');
            const d = value * yieldNow / 12; divYear += d;
            if (drip) value += d;
            value *= Math.pow(1 + pg, 1 / 12);
          }
          cumDiv += divYear; rows.push({ l: String(i), v: divYear });
          yieldNow = yieldNow * (1 + g) / (1 + pg); // hasil berubah apabila dividen dan harga tumbuh berbeza
        }
        const last = rows[rows.length - 1].v;
        $('#dvStats').innerHTML = out('Nilai portfolio akhir', fmtRM(value)) + out('Jumlah modal disumbang', fmtRM(contrib)) + out('Jumlah dividen diterima', fmtRM(cumDiv), 'up') + out(`Pendapatan pasif sebulan (tahun ${yrs})`, fmtRM(last / 12), 'up');
        $('#dvChart').innerHTML = bars(rows, rmShort);
      });
    }
  });

  /* ---------- 5. Perancang matlamat ---------- */
  ProTools.add('matlamat', {
    name: 'Perancang matlamat', plan: 'pelabur', icon: 'target', desc: 'Rumah, kahwin, haji, pencen',
    pitch: 'Tetapkan matlamat seperti deposit rumah, kahwin, haji atau dana kecemasan, dan ketahui berapa perlu disimpan setiap bulan.',
    html: `<div class="card"><form id="mtForm" class="form-grid">
      <div class="field"><label for="mtName">Matlamat</label><select id="mtName"><option>Deposit rumah</option><option>Majlis perkahwinan</option><option>Haji atau umrah</option><option>Dana kecemasan</option><option>Pendidikan anak</option><option>Pencen awal</option><option>Lain-lain</option></select></div>
      ${field('mtTarget', 'Jumlah diperlukan hari ini (RM)')}${field('mtYears', 'Dalam tempoh (tahun)', 'type="number" min="0.5" step="0.5" inputmode="decimal"')}
      ${field('mtHave', 'Simpanan sedia ada (RM)')}${field('mtReturn', 'Pulangan jangkaan (% setahun)')}${field('mtInfl', 'Inflasi (% setahun)')}
    </form></div><div class="card" id="mtOut" aria-live="polite"></div>`,
    init() {
      if (!store.get('t_matlamat', null)) { $('#mtTarget').value = 50000; $('#mtYears').value = 5; $('#mtHave').value = 5000; $('#mtReturn').value = 5; $('#mtInfl').value = 2.5; }
      persist($('#mtForm'), 'matlamat', () => {
        const yrs = v('mtYears'), n = Math.round(yrs * 12), r = v('mtReturn') / 100 / 12, pv = v('mtHave');
        if (!v('mtTarget') || !n) { $('#mtOut').innerHTML = '<p class="muted">Isi jumlah dan tempoh.</p>'; return; }
        const fv = v('mtTarget') * Math.pow(1 + v('mtInfl') / 100, yrs);
        const grownPv = pv * Math.pow(1 + r, n);
        const pmt = Math.max(0, r ? (fv - grownPv) * r / (Math.pow(1 + r, n) - 1) : (fv - pv) / n);
        const paid = pmt * n, growth = Math.max(fv - paid - pv, 0);
        $('#mtOut').innerHTML = `<div class="zk-due"><span>Simpan setiap bulan</span><b class="num">${fmtRM(pmt)}</b></div>
          <p class="small muted">${pmt === 0 ? 'Simpanan sedia ada sudah mencukupi jika pulangan seperti dijangka.' : `Selama ${n} bulan untuk ${esc($('#mtName').value.toLowerCase())}.`}</p>
          <div class="stack-bar"><span style="flex:${pv};background:var(--gold)"></span><span style="flex:${paid};background:var(--brand)"></span><span style="flex:${growth};background:var(--up)"></span></div>
          <div class="legend"><span style="--c:var(--gold)">Sedia ada ${rmShort(pv)}</span><span style="--c:var(--brand)">Simpanan baharu ${rmShort(paid)}</span><span style="--c:var(--up)">Pulangan ${rmShort(growth)}</span></div>
          <dl class="zk-lines"><div><dt>Sasaran selepas inflasi</dt><dd class="num">${fmtRM(fv)}</dd></div><div><dt>Simpanan harian setara</dt><dd class="num">${fmtRM(pmt * 12 / 365)}</dd></div></dl>`;
      });
    }
  });

  /* ---------- 6. Bandingkan ASB, KWSP, FD dan emas ---------- */
  const INSTR = [['ASB', 'bdASB', 5.75, 'var(--brand)'], ['KWSP', 'bdEPF', 6.3, 'var(--info)'], ['Simpanan tetap', 'bdFD', 2.6, 'var(--faint)'], ['Emas', 'bdGold', 5, 'var(--gold)'], ['Indeks saham', 'bdEq', 7, 'var(--purple)']];
  ProTools.add('banding', {
    name: 'Bandingkan simpanan', plan: 'pelabur', icon: 'bars', desc: 'ASB, KWSP, FD, emas dan saham',
    pitch: 'Bandingkan pertumbuhan wang anda dalam ASB, KWSP, simpanan tetap, emas dan dana indeks saham dengan kadar yang anda tetapkan sendiri.',
    html: `<div class="card"><form id="bdForm">
      <div class="form-grid">${field('bdStart', 'Jumlah awal (RM)')}${field('bdMonthly', 'Simpanan sebulan (RM)')}${field('bdYears', 'Tempoh (tahun)', 'type="number" min="1" max="50" step="1" inputmode="numeric"')}</div>
      <h3 style="margin-top:6px">Kadar pulangan andaian (% setahun)</h3>
      <div class="form-grid">${INSTR.map(([n, id]) => field(id, n, 'type="number" step="0.05" inputmode="decimal"')).join('')}</div>
    </form></div><div class="card"><div id="bdChart"></div><dl class="zk-lines" id="bdList"></dl></div>
    <p class="source">Kadar asal ialah anggaran: dividen ASB 2024 5.75 sen, dividen KWSP konvensional 2024 6.30%, simpanan tetap sekitar 2.6%, purata jangka panjang emas dan indeks saham. Pulangan masa depan tidak dijamin, dan emas serta saham boleh rugi.</p>`,
    init() {
      if (!store.get('t_banding', null)) { $('#bdStart').value = 5000; $('#bdMonthly').value = 200; $('#bdYears').value = 10; INSTR.forEach(([, id, r]) => $('#' + id).value = r); }
      persist($('#bdForm'), 'banding', () => {
        const yrs = Math.min(Math.max(Math.round(v('bdYears')), 1), 50), n = yrs * 12, s0 = v('bdStart'), m = v('bdMonthly');
        const res = INSTR.map(([name, id, , c]) => { const r = v(id) / 100 / 12; let val = s0; for (let i = 0; i < n; i++) val = val * (1 + r) + m; return { l: name, v: val, c }; });
        const paid = s0 + m * n;
        $('#bdChart').innerHTML = bars(res, rmShort);
        $('#bdList').innerHTML = `<div><dt>Modal disimpan</dt><dd class="num">${fmtRM(paid)}</dd></div>` + res.slice().sort((a, b) => b.v - a.v).map(r =>
          `<div><dt><span class="dot-c" style="background:${r.c}"></span>${r.l}</dt><dd class="num">${fmtRM(r.v)} <span class="small ${sign(r.v - paid)}">${pct((r.v / paid - 1) * 100)}</span></dd></div>`).join('');
      });
    }
  });
})();
