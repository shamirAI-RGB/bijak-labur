/* Pasaran > Saham: kalkulator saringan Syariah saham mengikut kaedah Majlis Penasihat Syariah (MPS)
   Suruhanjaya Sekuriti Malaysia (berkuat kuasa November 2013). Idea daripada OpenBB (nisbah hutang
   patuh Syariah), tetapi angka dimasukkan sendiri daripada laporan tahunan, jadi tiada pelayan atau API. */
(function () {
  const root = $('#saringan');
  if (!root) return;
  const SC_LIST = 'https://www.sc.com.my/development/icm/shariah/list-of-shariah-compliant-securities-by-the-shariah-advisory-council';
  const F = [
    ['rev', 'Jumlah hasil kumpulan'], ['pbt', 'Untung sebelum cukai kumpulan'],
    ['r5', 'Hasil daripada aktiviti 5%'], ['p5', 'Untung daripada aktiviti 5%'],
    ['r20', 'Hasil daripada aktiviti 20%'], ['p20', 'Untung daripada aktiviti 20%'],
    ['ta', 'Jumlah aset'], ['cash', 'Tunai dalam akaun dan instrumen konvensional'], ['debt', 'Hutang berfaedah (konvensional)']
  ];
  // Angka rekaan untuk latihan (RM juta), bukan syarikat sebenar
  const CONTOH = {
    ladang: ['Syarikat perladangan', { rev: 2000, pbt: 300, r5: 8, p5: 8, r20: 0, p20: 0, ta: 5000, cash: 600, debt: 900 }],
    hotel: ['Kumpulan hotel', { rev: 1000, pbt: 120, r5: 30, p5: 9, r20: 0, p20: 0, ta: 2500, cash: 200, debt: 500 }],
    konglo: ['Konglomerat berhutang', { rev: 5000, pbt: 400, r5: 50, p5: 15, r20: 300, p20: 60, ta: 10000, cash: 1500, debt: 4200 }]
  };
  const A5 = ['Perbankan dan pinjaman konvensional', 'Insurans konvensional', 'Perjudian', 'Arak dan aktiviti berkaitan arak', 'Babi dan aktiviti berkaitan babi', 'Makanan dan minuman tidak halal', 'Hiburan tidak patuh Syariah', 'Tembakau dan aktiviti berkaitan tembakau', 'Pendapatan faedah daripada akaun dan instrumen konvensional', 'Dividen daripada pelaburan tidak patuh Syariah'];
  const A20 = ['Perdagangan saham', 'Perniagaan pembrokeran saham', 'Sewa yang diterima daripada aktiviti tidak patuh Syariah'];

  let v = store.get('saringan', {});
  root.innerHTML = `
    <h3>Saringan Syariah saham</h3>
    <p class="small muted">Uji sendiri sama ada sesebuah syarikat lulus penanda aras kuantitatif MPS Suruhanjaya Sekuriti. Ambil angka daripada laporan tahunan terkini (unit sama, cth. RM juta).</p>
    <details class="ob-help"><summary>Lihat rajah aliran saringan</summary><figure class="rajah"><img src="images/rajah/saringan-syariah.svg" alt="Rajah aliran saringan Syariah: aktiviti perniagaan 5% dan 20%, kemudian nisbah tunai dan hutang di bawah 33%, kemudian penilaian kualitatif" loading="lazy" decoding="async"></figure></details>
    <div class="chips" id="sgContoh"><span class="small muted">Cuba contoh:</span>${Object.entries(CONTOH).map(([k, [n]]) => `<button type="button" class="chip" data-contoh="${k}">${esc(n)}</button>`).join('')}<button type="button" class="chip" data-contoh="">Kosongkan</button></div>
    <div class="sg-form">
      <fieldset><legend>1. Aktiviti perniagaan</legend>${F.slice(0, 6).map(field).join('')}</fieldset>
      <fieldset><legend>2. Kedudukan kewangan</legend>${F.slice(6).map(field).join('')}
        <label class="sg-check"><input type="checkbox" id="sgImej" ${v.imej === false ? '' : 'checked'}> Imej awam syarikat baik dan aktiviti terasnya penting untuk maslahah umat</label></fieldset>
    </div>
    <div id="sgOut" aria-live="polite"></div>
    <details class="ob-help"><summary>Apakah aktiviti 5% dan 20%?</summary>
      <p class="small"><b>Penanda aras 5%:</b> ${A5.map(esc).join('; ')}.</p>
      <p class="small"><b>Penanda aras 20%:</b> ${A20.map(esc).join('; ')}.</p>
      <p class="small">Sumbangan setiap kumpulan aktiviti dibandingkan dengan hasil dan untung sebelum cukai kumpulan. Tunai dan hutang hanya mengira akaun serta pinjaman konvensional; akaun dan pembiayaan Islam tidak dikira.</p>
    </details>
    <p class="source">Kaedah saringan MPS SC (November 2013). Senarai rasmi saham patuh Syariah diterbitkan dua kali setahun, pada bulan Mei dan November: <a href="${SC_LIST}" target="_blank" rel="noopener">senarai sekuriti patuh Syariah SC</a>. Alat ini untuk pembelajaran dan bukan keputusan rasmi.</p>`;

  function field([k, n]) {
    return `<div class="field"><label for="sg-${k}">${esc(n)}</label><input id="sg-${k}" data-sg="${k}" type="number" min="0" step="any" inputmode="decimal" value="${v[k] ?? ''}"></div>`;
  }

  const pct = (a, b) => b > 0 ? a / b * 100 : null;
  function test(name, val, limit) {
    if (val == null) return `<div class="sg-test"><div class="sg-tl"><span>${esc(name)}</span><span class="muted small">Isi angka</span></div></div>`;
    const ok = val < limit, w = Math.min(100, val / (limit * 2) * 100);
    return `<div class="sg-test ${ok ? 'ok' : 'bad'}"><div class="sg-tl"><span>${esc(name)}</span><b class="num">${val.toFixed(2)}%</b></div>
      <div class="sg-bar"><span style="width:${w.toFixed(1)}%"></span><i style="left:50%" title="Had ${limit}%"></i></div>
      <div class="small muted">Had ${limit}%: ${ok ? 'lulus' : 'melebihi had'}</div></div>`;
  }
  function calc() {
    const n = k => { const x = parseFloat(v[k]); return isFinite(x) ? x : 0; };
    const has = k => v[k] !== '' && v[k] != null;
    const rows = [
      ['Aktiviti 5% berbanding hasil', has('rev') ? pct(n('r5'), n('rev')) : null, 5],
      ['Aktiviti 5% berbanding untung', has('pbt') && n('pbt') > 0 ? pct(n('p5'), n('pbt')) : null, 5],
      ['Aktiviti 20% berbanding hasil', has('rev') ? pct(n('r20'), n('rev')) : null, 20],
      ['Aktiviti 20% berbanding untung', has('pbt') && n('pbt') > 0 ? pct(n('p20'), n('pbt')) : null, 20],
      ['Tunai konvensional / jumlah aset', has('ta') ? pct(n('cash'), n('ta')) : null, 33],
      ['Hutang berfaedah / jumlah aset', has('ta') ? pct(n('debt'), n('ta')) : null, 33]
    ];
    const done = rows.every(r => r[1] != null), pass = done && rows.every(r => r[1] < r[2]);
    const imej = $('#sgImej').checked, need20 = n('r20') > 0 || n('p20') > 0;
    let verdict;
    if (!done) verdict = `<div class="sg-verdict"><b>Isi semua angka</b><span class="small muted">${has('pbt') && n('pbt') <= 0 ? 'Syarikat rugi: ujian untung tidak dapat dikira, jadi gunakan ujian hasil sahaja dan rujuk senarai rasmi.' : 'Keputusan dipaparkan selepas semua ujian boleh dikira.'}</span></div>`;
    else if (!pass) verdict = `<div class="sg-verdict bad"><b>Tidak lulus saringan kuantitatif</b><span class="small">Sekurang-kurangnya satu nisbah melebihi had, jadi saham ini dijangka tidak patuh Syariah.</span></div>`;
    else if (need20 && !imej) verdict = `<div class="sg-verdict warn"><b>Lulus nombor, gagal penilaian kualitatif</b><span class="small">Syarikat dengan aktiviti 20% juga perlu imej awam yang baik. MPS menimbang perkara ini sebelum memutuskan.</span></div>`;
    else verdict = `<div class="sg-verdict ok"><b>Lulus saringan kuantitatif</b><span class="small">Semua nisbah di bawah had. Status sebenar tetap ditentukan oleh MPS SC dalam senarai rasmi.</span></div>`;
    $('#sgOut').innerHTML = verdict + `<div class="sg-tests">${rows.map(r => test(...r)).join('')}</div>`;
  }

  root.addEventListener('input', e => {
    const k = e.target.dataset.sg;
    if (k) v[k] = e.target.value;
    if (e.target.id === 'sgImej') v.imej = e.target.checked;
    store.set('saringan', v); calc();
  });
  root.addEventListener('change', e => { if (e.target.id === 'sgImej') { v.imej = e.target.checked; store.set('saringan', v); calc(); } });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-contoh]'); if (!b) return;
    const c = CONTOH[b.dataset.contoh];
    v = c ? { ...c[1], imej: true } : {};
    F.forEach(([k]) => { $('#sg-' + k).value = v[k] ?? ''; });
    $('#sgImej').checked = v.imej !== false;
    store.set('saringan', v); calc();
  });
  calc();
})();
