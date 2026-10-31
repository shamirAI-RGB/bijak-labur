/* SiswaCap: Akaun Demo (paper trading). Berdagang dengan wang maya pada harga pasaran sebenar supaya pelajar
   faham bagaimana untung dan rugi berlaku. Dua akaun berasingan: Saham Bursa (RM, harga pelayan nota daripada
   Yahoo Finance, lewat 15 minit) dan Kripto (US$, Binance). Semua data disimpan dalam pelayar sahaja (store 'demo').
   Kos dagangan ialah anggaran pendidikan, bukan kadar mana-mana broker. Label Syariah daripada js/market.js. */
(function () {
  const root = $('#view-demo');
  if (!root) return;

  const STOCK_API = 'https://nota.siswacap.my/saham';
  const REST = 'https://data-api.binance.vision/api/v3';
  const LOT = 100;   // 1 lot Bursa = 100 unit saham
  const PASARAN = {
    bursa: { nama: 'Saham Bursa', modal: 10000, mata: 'RM',
      aset: [['TENAGA', '5347', 'Tenaga Nasional'], ['PCHEM', '5183', 'Petronas Chemicals'], ['IHH', '5225', 'IHH Healthcare'], ['GAMUDA', '5398', 'Gamuda'],
        ['YTLPOWR', '6742', 'YTL Power'], ['MAYBANK', '1155', 'Malayan Banking'], ['PBBANK', '1295', 'Public Bank'], ['CIMB', '1023', 'CIMB Group']] },
    kripto: { nama: 'Kripto', modal: 1000, mata: 'US$',
      aset: [['BTC', 'BTCUSDT', 'Bitcoin'], ['ETH', 'ETHUSDT', 'Ethereum'], ['SOL', 'SOLUSDT', 'Solana'], ['XRP', 'XRPUSDT', 'XRP'],
        ['ADA', 'ADAUSDT', 'Cardano'], ['LINK', 'LINKUSDT', 'Chainlink'], ['BNB', 'BNBUSDT', 'BNB'], ['DOGE', 'DOGEUSDT', 'Dogecoin']] }
  };
  const SY_LABEL = { patuh: 'Patuh Syariah', tidak: 'Haram', ragu: 'Diragui', belum: 'Belum disaring' };

  /* ---------- Wang dan kos ---------- */
  const rm = v => 'RM' + Number(v).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usdF = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usd = v => 'US$' + usdF.format(v);
  const wang = (m, v) => m === 'bursa' ? rm(v) : usd(v);
  const tanda = (m, v) => (v > 0.004 ? '+' : v < -0.004 ? '−' : '') + wang(m, Math.abs(v));
  const harga = (m, p) => m === 'bursa' ? 'RM' + Number(p).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
    : p >= 1 ? usd(p) : 'US$' + Number(p).toPrecision(4);
  const unitTeks = (m, u) => m === 'bursa' ? `${(u / LOT).toLocaleString('ms-MY')} lot (${u.toLocaleString('ms-MY')} unit)` : `${+u.toFixed(6)} unit`;
  const pct = v => (v > 0.005 ? '+' : v < -0.005 ? '−' : '') + Math.abs(v).toFixed(2) + '%';
  const kelas = v => v > 0.004 ? 'up' : v < -0.004 ? 'down' : '';
  // Bursa: komisen anggaran 0.1% (min RM3) + SST 8% atas komisen + fi penjelasan 0.03% + duti setem RM1/RM1,000. Kripto: 0.1%.
  function kos(m, nilai) {
    if (!(nilai > 0)) return 0;
    if (m === 'kripto') return +(nilai * 0.001).toFixed(2);
    const kom = Math.max(nilai * 0.001, 3);
    return +(kom * 1.08 + Math.min(nilai * 0.0003, 1000) + Math.min(Math.ceil(nilai / 1000), 1000)).toFixed(2);
  }

  /* ---------- Keadaan ---------- */
  const baru = m => ({ modal: PASARAN[m].modal, tunai: PASARAN[m].modal, pegang: {}, sejarah: [] });
  function muat() {
    const d = store.get('demo', null);
    const ok = x => x && typeof x.tunai === 'number' && isFinite(x.tunai) && x.pegang && typeof x.pegang === 'object' && Array.isArray(x.sejarah);
    return { bursa: d && ok(d.bursa) ? d.bursa : baru('bursa'), kripto: d && ok(d.kripto) ? d.kripto : baru('kripto') };
  }
  let akaun = muat();
  let pasar = ['kripto', 'cfd'].includes(store.get('demoPasar', 'bursa')) ? store.get('demoPasar', 'bursa') : 'bursa';
  let panduan = !store.get('demoPanduanTutup', false);
  const simpan = () => store.set('demo', akaun);
  const andai = {};   // nilai gelangsar "Bagaimana jika" setiap pegangan (%)
  let sahReset = false;

  // Harga: { bursa: { TENAGA: { p, chg, t } }, kripto: { BTC: {...} } }
  const hargaKini = { bursa: {}, kripto: {} };
  const status = { bursa: '', kripto: '' };
  // Harga Bursa yang disimpan oleh halaman Pasaran (js/market.js) digunakan dahulu supaya demo boleh terus dimulakan
  const cacheBursa = store.get('bursaQuotes', {});
  PASARAN.bursa.aset.forEach(([s, code]) => { const q = cacheBursa[code + '.KL']; if (q && q.price > 0) hargaKini.bursa[s] = { p: +q.price, chg: +q.chg || 0, t: q.time || 0 }; });
  Object.assign(hargaKini.kripto, store.get('demoKripto', {}));

  const syariah = (m, s) => {
    const f = m === 'bursa' ? window.SyariahSaham : window.SyariahKripto;
    const st = f ? f(s) : { k: 'belum', why: '' };
    return { k: SY_LABEL[st.k] ? st.k : 'belum', why: st.why || '' };
  };
  const nama = (m, s) => (PASARAN[m].aset.find(a => a[0] === s) || [s, '', s])[2];

  /* ---------- Muat harga ---------- */
  async function muatBursa() {
    try {
      const r = await fetch(`${STOCK_API}?s=${PASARAN.bursa.aset.map(a => a[1] + '.KL').join(',')}`);
      if (!r.ok) throw 0;
      const j = await r.json();
      (j.quotes || []).forEach(q => {
        const a = q && PASARAN.bursa.aset.find(x => x[1] + '.KL' === q.s);
        if (a && q.price > 0) { hargaKini.bursa[a[0]] = { p: +q.price, chg: +q.chg || 0, t: q.time || 0 }; cacheBursa[q.s] = q; }
      });
      store.set('bursaQuotes', cacheBursa);
      status.bursa = 'ok';
    } catch { status.bursa = 'gagal'; }
  }
  async function muatKripto() {
    try {
      const syms = PASARAN.kripto.aset.map(a => a[1]);
      const r = await fetch(`${REST}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(syms))}`);
      if (!r.ok) throw 0;
      const j = await r.json();
      (Array.isArray(j) ? j : []).forEach(q => {
        const a = PASARAN.kripto.aset.find(x => x[1] === q.symbol);
        if (a && +q.lastPrice > 0) hargaKini.kripto[a[0]] = { p: +q.lastPrice, chg: +q.priceChangePercent || 0, t: Math.floor(Date.now() / 1000) };
      });
      store.set('demoKripto', hargaKini.kripto);
      status.kripto = 'ok';
    } catch { status.kripto = 'gagal'; }
  }
  const muatHarga = m => (m === 'bursa' ? muatBursa() : muatKripto()).then(() => { if (pasar === m) lukis(true); });

  // Waktu dagangan Bursa (waktu Malaysia): Isnin hingga Jumaat, 9:00 pagi hingga 12:30 tengah hari dan 2:30 hingga 5:00 petang
  function bursaBuka() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    const min = (+p.hour % 24) * 60 + +p.minute;
    return !['Sat', 'Sun'].includes(p.weekday) && ((min >= 540 && min < 750) || (min >= 870 && min < 1020));
  }
  function teksStatus(m) {
    const ada = Object.keys(hargaKini[m]).length;
    if (m === 'kripto') return status.kripto === 'gagal' ? (ada ? 'Harga terakhir yang disimpan. Harga semasa tidak dapat dimuatkan.' : 'Harga kripto tidak dapat dimuatkan. Semak sambungan internet.')
      : 'Pasaran kripto dibuka 24 jam. Harga dikemas kini setiap 15 saat (Binance).';
    if (status.bursa === 'gagal' && !ada) return 'Harga Bursa tidak dapat dimuatkan. Semak sambungan internet.';
    const buka = bursaBuka() ? 'Pasaran Bursa sedang dibuka.' : 'Pasaran Bursa ditutup sekarang (dibuka Isnin hingga Jumaat, 9:00 pagi hingga 5:00 petang), jadi demo menggunakan harga dagangan terakhir.';
    return `${buka} Harga lewat sekurang-kurangnya 15 minit (Yahoo Finance).${status.bursa === 'gagal' ? ' Harga semasa tidak dapat dimuatkan; harga terakhir yang disimpan digunakan.' : ''}`;
  }

  /* ---------- Kiraan akaun ---------- */
  function ringkas(m) {
    const a = akaun[m];
    let nilaiPegang = 0;
    for (const [s, h] of Object.entries(a.pegang)) { const q = hargaKini[m][s]; nilaiPegang += (q ? q.p : h.kos / h.unit) * h.unit; }
    const nilai = a.tunai + nilaiPegang;
    return { nilai, nilaiPegang, beza: nilai - a.modal, bezaPct: (nilai - a.modal) / a.modal * 100 };
  }
  function kedudukan(m, s) {
    const h = akaun[m].pegang[s], q = hargaKini[m][s];
    const purata = h.kos / h.unit, p = q ? q.p : purata;
    const nilai = p * h.unit, yuran = kos(m, nilai), bersih = nilai - yuran - h.kos;
    return { h, purata, p, nilai, yuran, bersih, bersihPct: bersih / h.kos * 100 };
  }

  /* ---------- Lukis halaman ---------- */
  function lukisPanduan(m) {
    if (!panduan) return `<button type="button" class="link-btn dm-buka-panduan" data-act="panduan">Cara guna akaun demo</button>`;
    // Contoh sebenar menggunakan kos yang sama dengan dagangan demo
    const contoh = m === 'bursa' ? { s: '1 lot (100 unit)', beli: 5, u: 100 } : { s: 'US$200 Bitcoin', beli: 200, u: 1 };
    const nb = contoh.beli * contoh.u, kb = kos(m, nb), naik = nb * 1.1, turun = nb * 0.9;
    const untung = naik - kos(m, naik) - (nb + kb), rugi = turun - kos(m, turun) - (nb + kb);
    return `<div class="card dm-panduan">
      <div class="dm-panduan-head"><h2>Cara guna dalam 3 langkah</h2><button type="button" class="icon-btn plain" data-act="tutup-panduan" aria-label="Tutup panduan">${icon('x')}</button></div>
      <ol class="dm-langkah">
        <li><b>Pilih aset.</b> Lihat harga semasa dan label Syariah dalam senarai di bawah.</li>
        <li><b>Tekan Beli.</b> Wang maya ditolak daripada tunai anda, termasuk kos dagangan.</li>
        <li><b>Pantau dan jual.</b> Jika harga naik melebihi harga beli anda, anda untung. Jika turun, anda rugi. Untung atau rugi hanya menjadi sebenar apabila anda menjual.</li>
      </ol>
      <div class="dm-contoh">
        <p class="dm-contoh-tajuk">Contoh: beli ${esc(contoh.s)} pada ${wang(m, nb)}</p>
        <div class="dm-contoh-grid">
          <div class="dm-contoh-kad up"><span>Harga naik 10%</span><b>${tanda(m, untung)}</b><small>Jual pada ${wang(m, naik)}, tolak kos beli dan jual</small></div>
          <div class="dm-contoh-kad down"><span>Harga turun 10%</span><b>${tanda(m, rugi)}</b><small>Jual pada ${wang(m, turun)}, tolak kos beli dan jual</small></div>
        </div>
        <p class="small muted">Perhatikan: kenaikan 10% tidak memberi untung penuh 10% kerana kos dagangan dibayar semasa membeli dan menjual.</p>
      </div>
    </div>`;
  }

  function lukisRingkasan(m) {
    const a = akaun[m], r = ringkas(m);
    const ayat = Math.abs(r.beza) < 0.005 ? `Anda bermula dengan ${wang(m, a.modal)} wang maya. Belum ada untung atau rugi.`
      : r.beza > 0 ? `Akaun anda kini bernilai ${wang(m, r.beza)} lebih daripada modal permulaan.`
      : `Akaun anda kini bernilai ${wang(m, -r.beza)} kurang daripada modal permulaan.`;
    return `<div class="card dm-ringkas">
      <p class="dm-label">Nilai akaun ${esc(PASARAN[m].nama)}</p>
      <p class="dm-nilai num">${wang(m, r.nilai)}</p>
      <p class="dm-beza num ${kelas(r.beza)}">${tanda(m, r.beza)} (${pct(r.bezaPct)}) berbanding modal</p>
      <p class="small dm-ayat">${esc(ayat)}</p>
      <div class="stat-row">
        <div class="stat"><div class="v num">${wang(m, a.tunai)}</div><div class="k">Tunai</div></div>
        <div class="stat"><div class="v num">${wang(m, r.nilaiPegang)}</div><div class="k">Nilai pegangan</div></div>
        <div class="stat"><div class="v num">${wang(m, a.modal)}</div><div class="k">Modal permulaan</div></div>
      </div>
    </div>`;
  }

  function lukisAset(m) {
    const baris = PASARAN[m].aset.map(([s]) => {
      const q = hargaKini[m][s], sy = syariah(m, s), held = akaun[m].pegang[s];
      return `<li class="dm-aset">
        <div class="dm-aset-nama"><b>${esc(s)}</b> <span class="sy sy-${sy.k}">${SY_LABEL[sy.k]}</span><span class="small muted">${esc(nama(m, s))}${held ? ' · dalam pegangan' : ''}</span></div>
        <div class="dm-aset-harga num">${q ? `<b>${harga(m, q.p)}</b><span class="small ${kelas(q.chg)}">${pct(q.chg)} hari ini</span>` : `<b class="muted">${status[m] ? 'Tiada harga' : 'Memuatkan'}</b>`}</div>
        <button type="button" class="btn sm" data-act="beli" data-s="${esc(s)}" ${q ? '' : 'disabled'} aria-label="Beli ${esc(s)}">Beli</button>
      </li>`;
    }).join('');
    return `<div class="block-head"><h2>Pilih aset</h2></div>
      <p class="small muted dm-status">${esc(teksStatus(m))}</p>
      <ul class="dm-senarai card flush">${baris}</ul>`;
  }

  function lukisPegangan(m) {
    const syms = Object.keys(akaun[m].pegang);
    if (!syms.length) return `<div class="block-head"><h2>Pegangan anda</h2></div>
      <div class="card dm-kosong"><p>Anda belum memiliki apa-apa aset. Pilih aset di atas dan tekan <b>Beli</b> untuk mula berlatih.</p></div>`;
    const kad = syms.map(s => {
      const k = kedudukan(m, s), j = andai[s] || 0;
      const pAndai = k.p * (1 + j / 100), nAndai = pAndai * k.h.unit, bAndai = nAndai - kos(m, nAndai) - k.h.kos;
      const ayat = k.bersih > 0.004
        ? `Anda membeli pada purata ${harga(m, k.purata)} dan harga sekarang ${harga(m, k.p)}. Jika anda jual sekarang, anda untung ${wang(m, k.bersih)} selepas kos jual. Untung ini masih "atas kertas" sehingga anda menjual.`
        : k.bersih < -0.004
          ? `Anda membeli pada purata ${harga(m, k.purata)} dan harga sekarang ${harga(m, k.p)}. Jika anda jual sekarang, anda rugi ${wang(m, -k.bersih)} termasuk kos jual. Rugi ini belum berlaku sehingga anda menjual; harga boleh naik semula atau terus turun.`
          : `Harga sekarang hampir sama dengan harga beli anda. Jika anda jual sekarang, anda hampir pulang modal.`;
      return `<article class="card dm-pegang" data-s="${esc(s)}">
        <div class="dm-pegang-head">
          <div><h3>${esc(s)} <span class="small muted">${esc(nama(m, s))}</span></h3><p class="small muted">${esc(unitTeks(m, k.h.unit))}</p></div>
          <div class="dm-pl num ${kelas(k.bersih)}"><b>${tanda(m, k.bersih)}</b><span class="small">${pct(k.bersihPct)}</span></div>
        </div>
        <dl class="dm-dl">
          <div><dt>Harga beli purata</dt><dd class="num">${harga(m, k.purata)}</dd></div>
          <div><dt>Harga sekarang</dt><dd class="num">${harga(m, k.p)}</dd></div>
          <div><dt>Modal dibayar</dt><dd class="num">${wang(m, k.h.kos)}</dd></div>
          <div><dt>Nilai sekarang</dt><dd class="num">${wang(m, k.nilai)}</dd></div>
        </dl>
        <p class="small dm-ayat">${esc(ayat)}</p>
        <div class="dm-andai">
          <label for="dmAndai-${esc(s)}">Bagaimana jika harga <b>${j > 0 ? 'naik' : j < 0 ? 'turun' : 'berubah'} ${Math.abs(j)}%</b>?</label>
          <input type="range" id="dmAndai-${esc(s)}" data-andai="${esc(s)}" min="-30" max="30" step="1" value="${j}">
          <p class="small num" data-andai-hasil="${esc(s)}">Harga ${harga(m, pAndai)}: ${bAndai >= 0 ? 'untung' : 'rugi'} <b class="${kelas(bAndai)}">${wang(m, Math.abs(bAndai))}</b> jika dijual.</p>
        </div>
        <div class="dm-butang">
          <button type="button" class="btn sm" data-act="beli" data-s="${esc(s)}">Beli lagi</button>
          <button type="button" class="btn sm ghost" data-act="jual" data-s="${esc(s)}">Jual</button>
        </div>
      </article>`;
    }).join('');
    return `<div class="block-head"><h2>Pegangan anda</h2></div>${kad}`;
  }

  function lukisSejarah(m) {
    const sj = akaun[m].sejarah;
    const realis = sj.filter(x => x.jenis === 'jual').reduce((t, x) => t + (x.untung || 0), 0);
    const baris = sj.slice(0, 30).map(x => {
      const tarikh = new Date(x.t).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `<li class="dm-sj">
        <span class="dm-sj-jenis ${x.jenis === 'beli' ? 'beli' : 'jual'}">${x.jenis === 'beli' ? 'Beli' : 'Jual'}</span>
        <div><b>${esc(x.s)}</b> <span class="small muted">${esc(unitTeks(m, x.unit))} pada ${harga(m, x.harga)}</span><div class="small muted">${esc(tarikh)} · kos dagangan ${wang(m, x.yuran)}</div></div>
        <div class="num dm-sj-kanan">${x.jenis === 'jual' ? `<b class="${kelas(x.untung)}">${tanda(m, x.untung)}</b><span class="small muted">untung/rugi sebenar</span>` : `<b>−${wang(m, x.jumlah)}</b><span class="small muted">dibayar</span>`}</div>
      </li>`;
    }).join('');
    return `<div class="block-head"><h2>Sejarah dagangan</h2></div>
      ${sj.length ? `<p class="small">Jumlah untung atau rugi sebenar daripada jualan: <b class="num ${kelas(realis)}">${tanda(m, realis)}</b></p>
        <ul class="dm-sejarah card flush">${baris}</ul>` : '<p class="small muted">Belum ada dagangan.</p>'}
      <div class="dm-reset">
        <button type="button" class="btn sm ghost" data-act="reset">${sahReset ? 'Tekan sekali lagi untuk set semula' : `Set semula akaun ${esc(PASARAN[m].nama)}`}</button>
        <span class="small muted">Tunai kembali ${wang(m, PASARAN[m].modal)}, pegangan dan sejarah dipadam.</span>
      </div>`;
  }

  function lukis(dariHarga) {
    // Jangan lukis semula ketika pengguna sedang menarik gelangsar (ia akan terlepas daripada jari)
    if (dariHarga && document.activeElement && document.activeElement.matches && document.activeElement.matches('#view-demo input[type="range"]')) return;
    const m = pasar;
    if (m === 'cfd') { lukisCfd(); return; }
    root.innerHTML = `${kepala(m)}
      ${lukisPanduan(m)}
      ${lukisRingkasan(m)}
      ${lukisPegangan(m)}
      ${lukisAset(m)}
      ${lukisSejarah(m)}
      <p class="note">${icon('alert')}<span>Akaun demo untuk pendidikan sahaja dan bukan nasihat kewangan. Wang dan dagangan adalah maya dan disimpan dalam pelayar ini sahaja. Kos dagangan ialah anggaran (Bursa: komisen 0.1% minimum RM3, SST, fi penjelasan dan duti setem; kripto: 0.1%); kadar sebenar berbeza mengikut broker. Dalam pasaran sebenar, harga boleh berubah sebelum pesanan anda dipenuhi.</span></p>`;
  }

  function kepala(m) {
    const tab = (k, l) => `<button role="tab" type="button" class="seg ${m === k ? 'active' : ''}" data-pasar="${k}" aria-selected="${m === k}">${l}</button>`;
    return `<div class="page-head with-aside">
        <div>
          <p class="eyebrow">Akaun demo</p>
          <h1 id="h-demo">Latihan dagangan</h1>
          <p class="lead">Beli dan jual dengan wang maya pada harga pasaran sebenar. Tiada wang sebenar terlibat, jadi anda boleh merasai sendiri bagaimana untung dan rugi berlaku tanpa risiko.</p>
        </div>
        <div class="segmented dm-tab" role="tablist" aria-label="Akaun demo">${tab('bursa', 'Saham Bursa')}${tab('kripto', 'Kripto')}${tab('cfd', 'CFD Emas')}</div>
      </div>`;
  }

  /* ================= CFD Emas (XAU/USD) =================
     Untuk merasai sendiri leverage, spread, swap, margin call dan stop out, kemudian memahami sebab ulama mengharamkannya.
     Harga emas dijejak melalui PAXG/USDT (token yang disandarkan 1 auns emas) di Binance. Main semula menggunakan
     lilin 1 jam sebenar bagi 7 hari lepas supaya pergerakan beberapa hari dirasai dalam seminit. */
  const CFD = { oz: 100, spread: 0.40, swap: { beli: 0.06, jual: 0.03 }, stopOut: 50, marginCall: 100, modal: 1000, lev: [1, 10, 100, 500] };
  const cfdBaru = () => ({ modal: CFD.modal, baki: CFD.modal, posisi: [], sejarah: [], stopOut: null });
  const cfdOk = x => x && typeof x.baki === 'number' && isFinite(x.baki) && Array.isArray(x.posisi) && Array.isArray(x.sejarah);
  let cfdLangsung = (d => cfdOk(d) ? d : cfdBaru())(store.get('demoCfd', null));
  let cfdHarga = (d => d && d.p > 0 ? d : null)(store.get('demoCfdHarga', null));
  let cfdStatus = '';
  let cfdLev = CFD.lev.includes(store.get('demoCfdLev', 100)) ? store.get('demoCfdLev', 100) : 100;
  let cfdLot = 0.1, cfdArah = 'beli';
  // Main semula: { lilin: [[masa, harga]], i, laju, jalan, akaun }
  let main = null, mainPemasa = null;
  const cfdAkaun = () => main ? main.akaun : cfdLangsung;
  const cfdMid = () => main ? main.lilin[main.i][1] : cfdHarga ? cfdHarga.p : null;
  const cfdKini = () => main ? main.lilin[main.i][0] : Date.now();
  const simpanCfd = () => { if (!main) store.set('demoCfd', cfdLangsung); };
  const bid = mid => mid - CFD.spread / 2, ask = mid => mid + CFD.spread / 2;
  const lotTeks = l => `${(+l).toFixed(2)} lot (${+(l * CFD.oz).toFixed(2)} auns)`;
  const tarikhPendek = t => new Date(t).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  function apung(pos, mid, kini) {
    const oz = pos.lot * CFD.oz, tutup = pos.arah === 'beli' ? bid(mid) : ask(mid);
    const pl = (pos.arah === 'beli' ? tutup - pos.buka : pos.buka - tutup) * oz;
    const hari = Math.max(0, Math.floor((kini - pos.t) / 864e5));
    const swap = -(pos.buka * oz) * CFD.swap[pos.arah] / 360 * hari;
    return { oz, tutup, pl, swap, hari, jumlah: pl + swap, pctMargin: (pl + swap) / pos.margin * 100 };
  }
  function cfdKira(ak, mid, kini) {
    let guna = 0, apg = 0;
    if (mid) ak.posisi.forEach(p => { guna += p.margin; apg += apung(p, mid, kini).jumlah; });
    const ekuiti = ak.baki + apg;
    return { guna, apg, ekuiti, bebas: ekuiti - guna, tahap: guna ? ekuiti / guna * 100 : null };
  }
  function tutupPosisi(ak, pos, mid, kini, sebab) {
    const a = apung(pos, mid, kini);
    ak.baki = +(ak.baki + a.jumlah).toFixed(2);
    ak.posisi = ak.posisi.filter(p => p !== pos);
    ak.sejarah.unshift({ t: kini, arah: pos.arah, lot: pos.lot, lev: pos.lev, buka: pos.buka, tutup: a.tutup, swap: +a.swap.toFixed(2), untung: +a.jumlah.toFixed(2), sebab });
    ak.sejarah = ak.sejarah.slice(0, 100);
    return a.jumlah;
  }
  // Stop out: ekuiti jatuh di bawah 50% margin, broker menutup semua posisi secara paksa
  function semakStopOut() {
    const ak = cfdAkaun(), mid = cfdMid(), kini = cfdKini();
    if (!mid || !ak.posisi.length) return false;
    const k = cfdKira(ak, mid, kini);
    if (k.tahap == null || k.tahap > CFD.stopOut) return false;
    const sebelum = ak.baki;
    let rugi = 0;
    ak.posisi.slice().forEach(p => { rugi += tutupPosisi(ak, p, mid, kini, 'stopout'); });
    let negatif = false;
    if (ak.baki < 0) { negatif = true; ak.baki = 0; }
    ak.stopOut = { t: kini, rugi: +rugi.toFixed(2), sebelum: +sebelum.toFixed(2), negatif };
    simpanCfd();
    return true;
  }

  function lukisCfdHarga() {
    const mid = cfdMid();
    if (!mid) return `<p class="dm-nilai">Memuatkan harga emas</p><p class="small muted">${cfdStatus === 'gagal' ? 'Harga emas tidak dapat dimuatkan. Semak sambungan internet, atau cuba Main semula.' : 'Sila tunggu sebentar.'}</p>`;
    const chg = main ? (mid / main.lilin[0][1] - 1) * 100 : cfdHarga.chg;
    const kawalan = main ? `<div class="dm-main">
        <div class="dm-main-bar" role="progressbar" aria-label="Kemajuan main semula" aria-valuemin="0" aria-valuemax="${main.lilin.length - 1}" aria-valuenow="${main.i}"><span class="dm-main-isi" data-w="${Math.round(main.i / (main.lilin.length - 1) * 100)}"></span></div>
        <p class="small num">${esc(tarikhPendek(main.lilin[main.i][0]))} · hari ${Math.floor((main.lilin[main.i][0] - main.lilin[0][0]) / 864e5) + 1} daripada 7</p>
        <div class="dm-butang">
          <button type="button" class="btn sm" data-act="main-jalan">${main.jalan ? 'Jeda' : main.i >= main.lilin.length - 1 ? 'Ulang' : 'Teruskan'}</button>
          <button type="button" class="btn sm ghost" data-act="main-laju">Laju ${main.laju}x</button>
          <button type="button" class="btn sm ghost" data-act="main-henti">Kembali ke harga langsung</button>
        </div>
      </div>` : '';
    return `<p class="dm-label">${main ? 'Main semula: harga emas sebenar 7 hari lepas' : 'Emas (XAU/USD), harga semasa'}</p>
      <p class="dm-nilai num">${usd(mid)}<span class="small ${kelas(chg)}"> ${pct(chg)}${main ? ' sejak mula' : ' hari ini'}</span></p>
      <div class="dm-bidask">
        <div><span>Harga jual (bid)</span><b class="num">${usd(bid(mid))}</b></div>
        <div><span>Harga beli (ask)</span><b class="num">${usd(ask(mid))}</b></div>
        <div><span>Spread</span><b class="num">${usd(CFD.spread)}</b></div>
      </div>
      <p class="small muted">Anda membeli pada harga ask yang lebih tinggi dan menjual pada harga bid yang lebih rendah. Beza ini (spread) ialah keuntungan broker, jadi setiap posisi bermula dengan rugi kecil.</p>
      ${kawalan}`;
  }

  function lukisCfdAkaun() {
    const ak = cfdAkaun(), mid = cfdMid(), k = cfdKira(ak, mid, cfdKini());
    const tahap = k.tahap;
    const amaran = tahap == null ? '' : tahap <= CFD.marginCall
      ? `<p class="dm-amaran sy-tidak"><b>Margin call.</b> Ekuiti anda kurang daripada margin yang digunakan. Jika tahap margin jatuh ke ${CFD.stopOut}%, broker akan menutup semua posisi anda secara paksa.</p>`
      : tahap < 200 ? `<p class="dm-amaran sy-ragu">Tahap margin anda rendah. Pergerakan kecil lagi boleh mencetuskan margin call.</p>` : '';
    const so = ak.stopOut ? `<div class="dm-stopout" role="alert">
        <h3>Stop out: broker telah menutup semua posisi anda</h3>
        <p>Ekuiti anda jatuh ke ${CFD.stopOut}% daripada margin, jadi posisi ditutup secara paksa pada harga semasa. Anda rugi <b class="num">${usd(Math.abs(ak.stopOut.rugi))}</b> dan baki tinggal <b class="num">${usd(ak.baki)}</b>.</p>
        ${ak.stopOut.negatif ? '<p class="small">Kerugian melebihi baki anda. Dalam demo ini baki dihadkan pada US$0, tetapi tidak semua broker memberi perlindungan baki negatif; ada yang boleh menuntut hutang daripada anda.</p>' : ''}
        <p class="small">Inilah beza paling besar dengan saham: pemilik saham tidak dipaksa menjual apabila harga jatuh, dan rugi maksimumnya hanya wang yang dibayar. Dalam CFD berleverage, pergerakan kecil sudah cukup untuk menghapuskan wang anda.</p>
        <button type="button" class="btn sm ghost" data-act="cfd-faham">Saya faham</button>
      </div>` : '';
    return `${so}
      <p class="dm-label">${main ? 'Akaun main semula' : 'Akaun CFD demo'}</p>
      <p class="dm-nilai num">${usd(k.ekuiti)}</p>
      <p class="dm-beza num ${kelas(k.ekuiti - ak.modal)}">${tanda('kripto', k.ekuiti - ak.modal)} (${pct((k.ekuiti - ak.modal) / ak.modal * 100)}) berbanding modal ${usd(ak.modal)}</p>
      <div class="stat-row four">
        <div class="stat"><div class="v num">${usd(ak.baki)}</div><div class="k">Baki (tanpa posisi terbuka)</div></div>
        <div class="stat"><div class="v num ${kelas(k.apg)}">${tanda('kripto', k.apg)}</div><div class="k">Untung/rugi terapung</div></div>
        <div class="stat"><div class="v num">${usd(k.guna)}</div><div class="k">Margin digunakan</div></div>
        <div class="stat"><div class="v num ${tahap != null && tahap < 200 ? 'down' : ''}">${tahap == null ? 'Tiada' : Math.max(0, tahap).toFixed(0) + '%'}</div><div class="k">Tahap margin (stop out pada ${CFD.stopOut}%)</div></div>
      </div>
      ${amaran}`;
  }

  function lukisCfdKira() {
    const ak = cfdAkaun(), mid = cfdMid();
    if (!mid) return '';
    const k = cfdKira(ak, mid, cfdKini());
    const L = cfdLot, oz = L * CFD.oz, harga1 = cfdArah === 'beli' ? ask(mid) : bid(mid);
    if (!(L >= 0.01)) return '<p class="small down">Saiz minimum 0.01 lot (1 auns).</p>';
    const nilai = harga1 * oz, margin = nilai / cfdLev, spreadKos = CFD.spread * oz;
    const gerak1 = nilai * 0.01;
    const bolehRugi = k.ekuiti - CFD.stopOut / 100 * (k.guna + margin) - spreadKos;
    const gerakSO = bolehRugi / nilai * 100;
    const swapHari = nilai * CFD.swap[cfdArah] / 360;
    const cukup = margin <= k.bebas && bolehRugi > 0;
    return `<dl class="dm-dl">
        <div><dt>Nilai emas yang dikawal</dt><dd class="num">${usd(nilai)}</dd></div>
        <div><dt>Margin (wang anda yang dikunci)</dt><dd class="num">${usd(margin)}</dd></div>
        <div><dt>Dipinjamkan broker (leverage)</dt><dd class="num">${usd(nilai - margin)}</dd></div>
        <div><dt>Kos spread serta-merta</dt><dd class="num down">−${usd(spreadKos)}</dd></div>
        <div><dt>Swap setiap malam (faedah)</dt><dd class="num down">−${usd(swapHari)}</dd></div>
      </dl>
      <div class="dm-kesan">
        <p>Jika emas bergerak <b>1%</b> ${cfdArah === 'beli' ? 'naik' : 'turun'}, anda untung <b class="up num">${usd(gerak1)}</b>. Jika bergerak 1% menentang anda, anda rugi <b class="down num">${usd(gerak1)}</b>, iaitu <b>${cfdLev}%</b> daripada margin anda.</p>
        <p>${bolehRugi > 0 ? `Emas hanya perlu bergerak <b class="num">${gerakSO.toFixed(2)}%</b> menentang anda sebelum broker menutup posisi secara paksa (stop out).` : 'Margin anda tidak cukup untuk membuka posisi sebesar ini.'}</p>
        ${cfdLev === 1 ? '<p class="small muted">Tanpa leverage (1:1), anda membayar nilai penuh. Rugi 1% hanya 1% daripada wang anda, sama seperti memiliki aset, tetapi anda masih tidak memiliki emas itu.</p>' : ''}
      </div>
      <button type="button" class="btn block ${cfdArah === 'jual' ? 'dm-jual' : ''}" data-act="cfd-buka" ${cukup ? '' : 'disabled'}>${cfdArah === 'beli' ? 'Buka posisi Beli (jangka harga naik)' : 'Buka posisi Jual (jangka harga turun)'}</button>
      ${!cukup && bolehRugi > 0 ? `<p class="small down">Margin bebas tidak mencukupi (${usd(Math.max(0, k.bebas))}). Kecilkan lot atau naikkan leverage.</p>` : ''}`;
  }

  function lukisCfdPosisi() {
    const ak = cfdAkaun(), mid = cfdMid(), kini = cfdKini();
    if (!ak.posisi.length) return '<div class="card dm-kosong"><p>Tiada posisi terbuka. Pilih arah, saiz dan leverage di atas, kemudian buka posisi dan perhatikan untung atau rugi berubah.</p></div>';
    return ak.posisi.map(p => {
      const a = mid ? apung(p, mid, kini) : null;
      const ayat = !a ? '' : a.jumlah >= 0
        ? `Harga bergerak ${p.arah === 'beli' ? 'naik' : 'turun'} memihak kepada anda. Untung ${usd(a.jumlah)} ialah ${a.pctMargin.toFixed(0)}% daripada margin ${usd(p.margin)}, walaupun harga emas hanya berubah ${Math.abs((mid / p.buka - 1) * 100).toFixed(2)}%. Leverage membesarkan untung.`
        : `Rugi ${usd(-a.jumlah)} ialah ${(-a.pctMargin).toFixed(0)}% daripada margin ${usd(p.margin)}, walaupun harga emas hanya berubah ${Math.abs((mid / p.buka - 1) * 100).toFixed(2)}%. Leverage membesarkan rugi dengan kadar yang sama.`;
      return `<article class="card dm-pegang">
        <div class="dm-pegang-head">
          <div><h3><span class="dm-sj-jenis ${p.arah === 'beli' ? 'beli' : 'jual'}">${p.arah === 'beli' ? 'Beli' : 'Jual'}</span> XAU/USD <span class="small muted">1:${p.lev}</span></h3><p class="small muted">${esc(lotTeks(p.lot))}, dibuka pada ${usd(p.buka)}</p></div>
          ${a ? `<div class="dm-pl num ${kelas(a.jumlah)}"><b>${tanda('kripto', a.jumlah)}</b><span class="small">${pct(a.pctMargin)} margin</span></div>` : ''}
        </div>
        ${a ? `<dl class="dm-dl">
          <div><dt>Harga tutup sekarang</dt><dd class="num">${usd(a.tutup)}</dd></div>
          <div><dt>Margin dikunci</dt><dd class="num">${usd(p.margin)}</dd></div>
          <div><dt>Swap (${a.hari} malam)</dt><dd class="num ${a.swap < 0 ? 'down' : ''}">${a.swap < 0 ? '−' : ''}${usd(Math.abs(a.swap))}</dd></div>
        </dl>
        <p class="small dm-ayat">${esc(ayat)}</p>` : ''}
        <div class="dm-butang"><button type="button" class="btn sm ghost" data-act="cfd-tutup" data-id="${esc(p.id)}">Tutup posisi</button></div>
      </article>`;
    }).join('');
  }

  function lukisCfdSejarah() {
    const sj = cfdAkaun().sejarah;
    if (!sj.length) return '<p class="small muted">Belum ada posisi ditutup.</p>';
    return `<ul class="dm-sejarah card flush">${sj.slice(0, 30).map(x => `<li class="dm-sj">
        <span class="dm-sj-jenis ${x.arah === 'beli' ? 'beli' : 'jual'}">${x.arah === 'beli' ? 'Beli' : 'Jual'}</span>
        <div><b>XAU/USD 1:${x.lev}</b> <span class="small muted">${esc(lotTeks(x.lot))}, ${usd(x.buka)} ke ${usd(x.tutup)}</span><div class="small muted">${esc(tarikhPendek(x.t))}${x.sebab === 'stopout' ? ' · <b class="down">ditutup paksa (stop out)</b>' : ''}${x.swap ? ` · swap ${usd(Math.abs(x.swap))}` : ''}</div></div>
        <div class="num dm-sj-kanan"><b class="${kelas(x.untung)}">${tanda('kripto', x.untung)}</b></div>
      </li>`).join('')}</ul>`;
  }

  const SEBAB_HARAM = [
    ['Riba melalui swap', 'Swap yang anda lihat ditolak setiap malam ialah faedah ke atas wang yang dipinjamkan broker untuk leverage. Faedah ke atas pinjaman ialah riba.', 'Muzakarah kali ke-98: "riba melalui pengenaan rollover interest". Al-Baqarah 2:275: "Allah menghalalkan jual beli dan mengharamkan riba."'],
    ['Pinjaman bersyarat jual beli (leverage)', 'Dengan margin kecil, broker "meminjamkan" baki nilai kontrak, tetapi hanya jika anda berdagang dengannya dan membayar spread. Pinjaman yang disyaratkan bersama jual beli dan membawa manfaat kepada pemberi pinjaman dilarang.', 'Muzakarah kali ke-98: "pensyaratan jual beli dalam pemberian hutang melalui leverage".'],
    ['Emas tidak pernah diserahkan (tiada qabd)', 'Anda "membeli emas" tetapi tidak pernah menerima atau memiliki walau satu gram. Emas ialah barang ribawi: pertukarannya mesti serta-merta dan berlaku serah terima.', 'Hadis riwayat Muslim (1587), daripada Ubadah bin al-Samit: "Emas dengan emas ... mesti sama dan secara tunai (tangan ke tangan)." Parameter Pelaburan Emas, Muzakarah kali ke-96.'],
    ['Menjual yang tiada dalam milik', 'Posisi Jual membolehkan anda "menjual" emas yang anda tidak miliki untuk mendapat untung apabila harga turun.', 'Hadis riwayat Abu Daud (3503), daripada Hakim bin Hizam: "Jangan jual apa yang tiada dalam milikmu."'],
    ['Spekulasi yang menyerupai judi (maisir dan gharar)', 'Tiada barang atau perniagaan sebenar bertukar tangan. Anda hanya bertaruh sama ada harga naik atau turun dengan broker; untung seorang ialah rugi pihak lain, dan leverage menjadikannya pertaruhan besar.', 'Muzakarah kali ke-98: "spekulasi yang melibatkan perjudian". Al-Maidah 5:90 tentang judi; hadis riwayat Muslim (1513) melarang jual beli gharar.']
  ];
  function lukisCfdIlmu() {
    return `<div class="card dm-ilmu">
        <h2>Saham (spot) berbanding CFD</h2>
        <div class="dm-banding">
          <div><h3>Saham atau emas fizikal</h3><ul>
            <li>Anda <b>memiliki</b> unit saham atau emas sebenar.</li>
            <li>Bayar nilai penuh dengan wang sendiri, tiada pinjaman.</li>
            <li>Rugi maksimum ialah wang yang dibayar. Tiada sesiapa memaksa anda menjual.</li>
            <li>Boleh disimpan bertahun-tahun tanpa caj faedah.</li>
          </ul></div>
          <div><h3>CFD dan forex runcit</h3><ul>
            <li>Anda <b>tidak memiliki</b> apa-apa. Yang didagang hanya beza harga dengan broker.</li>
            <li>Margin kecil, selebihnya "dipinjamkan" broker (leverage).</li>
            <li>Pergerakan kecil boleh menghapuskan margin, dan broker menutup posisi secara paksa (stop out).</li>
            <li>Swap (faedah) dikenakan setiap malam posisi dibuka.</li>
          </ul></div>
        </div>
      </div>
      <div class="card dm-ilmu">
        <h2>Kenapa ulama mengharamkannya</h2>
        <p class="small">Muzakarah Jawatankuasa Fatwa Majlis Kebangsaan kali ke-98 (13 hingga 15 Februari 2012) memutuskan dagangan forex oleh individu secara lani melalui platform elektronik adalah <b>haram</b>. Setiap sebabnya boleh anda lihat sendiri dalam simulator di atas:</p>
        <ol class="dm-sebab">${SEBAB_HARAM.map(([t, apa, dalil]) => `<li><b>${esc(t)}</b><p class="small">${esc(apa)}</p><p class="small muted">${esc(dalil)}</p></li>`).join('')}</ol>
        <p class="small">Kami belum menemui fatwa rasmi Malaysia yang menyebut "CFD" secara khusus. Hukum CFD emas disimpulkan daripada sebab-sebab fatwa forex di atas, kerana kesemuanya wujud dalam CFD. Pelaburan emas yang <b>harus</b> ialah membeli emas fizikal atau akaun emas yang memenuhi Parameter Pelaburan Emas (kali ke-96): serta-merta, dibayar penuh, emas wujud dan diserahkan.</p>
        <p class="source">Sumber: <a href="https://emusykil.muftiselangor.gov.my/index.php/site/jawapan?id=3420" target="_blank" rel="noopener">Muzakarah kali ke-98, dipetik Jabatan Mufti Negeri Selangor</a> · <a href="https://www.maybank.com/islamic/en/coe/fatwa/others/gold_investment_parameters.page" target="_blank" rel="noopener">Parameter Pelaburan Emas, Muzakarah kali ke-96 (Maybank Islamic)</a></p>
        <div class="dm-butang"><a class="btn sm ghost" href="#ibadah/fiqh/muamalat/cfd">Hukum CFD dalam Fiqh</a><a class="btn sm ghost" href="#ibadah/fiqh/muamalat/leverage">Hukum leverage</a><a class="btn sm ghost" href="#ibadah/fiqh/muamalat/emas">Pelaburan emas yang harus</a></div>
      </div>`;
  }

  function lukisCfd() {
    const lev = CFD.lev.map(v => `<button type="button" class="chip ${v === cfdLev ? 'active' : ''}" data-lev="${v}" aria-pressed="${v === cfdLev}">1:${v}</button>`).join('');
    root.innerHTML = `${kepala('cfd')}
      <div class="dm-amaran sy-tidak dm-cfd-intro"><b>CFD dan forex runcit adalah haram menurut Muzakarah Fatwa Kebangsaan.</b> Simulator ini disediakan supaya anda merasai sendiri kenapa ia berbahaya dan memahami sebab-sebab ulama mengharamkannya, bukan untuk menggalakkan dagangan sebenar.</div>
      <div class="segmented small dm-mod" role="tablist" aria-label="Mod harga">
        <button role="tab" type="button" class="seg ${main ? '' : 'active'}" data-act="mod-langsung" aria-selected="${!main}">Harga langsung</button>
        <button role="tab" type="button" class="seg ${main ? 'active' : ''}" data-act="mod-main" aria-selected="${!!main}">Main semula 7 hari</button>
      </div>
      ${main ? '' : '<p class="small muted">Harga emas bergerak perlahan dari minit ke minit. Cuba <b>Main semula 7 hari</b> untuk merasai pergerakan sebenar beberapa hari dalam masa kira-kira seminit, termasuk caj swap setiap malam.</p>'}
      <div class="card" id="dmCfdHarga">${lukisCfdHarga()}</div>
      <div class="card dm-ringkas" id="dmCfdAkaun">${lukisCfdAkaun()}</div>
      <div class="card dm-pesanan">
        <h2>Buka posisi</h2>
        <div class="segmented dm-arah" role="group" aria-label="Arah">
          <button type="button" class="seg ${cfdArah === 'beli' ? 'active' : ''}" data-arah="beli" aria-pressed="${cfdArah === 'beli'}">Beli (harga naik)</button>
          <button type="button" class="seg ${cfdArah === 'jual' ? 'active' : ''}" data-arah="jual" aria-pressed="${cfdArah === 'jual'}">Jual (harga turun)</button>
        </div>
        <div class="field"><label for="dmLot">Saiz (lot). 1 lot = 100 auns emas</label><input id="dmLot" type="number" inputmode="decimal" min="0.01" step="0.01" value="${cfdLot}"></div>
        <div class="dm-pantas">${[0.01, 0.1, 0.5, 1].map(v => `<button type="button" class="chip" data-lot="${v}">${v} lot</button>`).join('')}</div>
        <p class="dm-label">Leverage</p>
        <div class="dm-pantas" role="group" aria-label="Leverage">${lev}</div>
        <p class="small muted">Leverage 1:${cfdLev} bermaksud setiap US$1 wang anda mengawal US$${cfdLev} emas.</p>
        <div id="dmCfdKira" aria-live="polite">${lukisCfdKira()}</div>
      </div>
      <div class="block-head"><h2>Posisi terbuka</h2></div>
      <div id="dmCfdPosisi">${lukisCfdPosisi()}</div>
      ${lukisCfdIlmu()}
      <div class="block-head"><h2>Sejarah posisi</h2></div>
      <div id="dmCfdSejarah">${lukisCfdSejarah()}</div>
      <div class="dm-reset">
        <button type="button" class="btn sm ghost" data-act="reset">${sahReset ? 'Tekan sekali lagi untuk set semula' : 'Set semula akaun CFD'}</button>
        <span class="small muted">Baki kembali ${usd(CFD.modal)}, posisi dan sejarah dipadam.</span>
      </div>
      <p class="note">${icon('alert')}<span>Simulator pendidikan sahaja. Harga emas dijejak melalui PAXG/USDT (Binance), token yang disandarkan 1 auns emas, jadi ia hampir sama tetapi tidak tepat sama dengan XAU/USD broker. Spread US$0.40 seauns, swap anggaran 6% setahun (Beli) dan 3% setahun (Jual), stop out pada tahap margin 50%; syarat sebenar berbeza mengikut broker.</span></p>`;
    pasangBar();
  }
  // Lebar bar kemajuan ditetapkan melalui CSSOM (CSP tidak membenarkan gaya sebaris dalam HTML statik)
  const pasangBar = () => $$('.dm-main-isi', root).forEach(el => { el.style.width = el.dataset.w + '%'; });
  // Kemas kini bahagian yang bergantung pada harga sahaja, supaya input saiz lot tidak hilang fokus
  function lukisCfdDinamik() {
    if (pasar !== 'cfd' || !$('#dmCfdHarga', root)) return;
    const stop = semakStopOut();
    $('#dmCfdHarga', root).innerHTML = lukisCfdHarga();
    $('#dmCfdAkaun', root).innerHTML = lukisCfdAkaun();
    $('#dmCfdKira', root).innerHTML = lukisCfdKira();
    $('#dmCfdPosisi', root).innerHTML = lukisCfdPosisi();
    $('#dmCfdSejarah', root).innerHTML = lukisCfdSejarah();
    pasangBar();
    if (stop) { if (main) { main.jalan = false; clearInterval(mainPemasa); $('#dmCfdHarga', root).innerHTML = lukisCfdHarga(); } $('#dmCfdAkaun', root).scrollIntoView({ block: 'center' }); }
  }
  async function muatCfd() {
    try {
      const r = await fetch(`${REST}/ticker/24hr?symbol=PAXGUSDT`);
      if (!r.ok) throw 0;
      const q = await r.json();
      if (!(+q.lastPrice > 0)) throw 0;
      cfdHarga = { p: +q.lastPrice, chg: +q.priceChangePercent || 0, t: Date.now() };
      store.set('demoCfdHarga', cfdHarga); cfdStatus = 'ok';
    } catch { cfdStatus = 'gagal'; }
    if (!main) lukisCfdDinamik();
  }
  async function mulaMain() {
    try {
      const r = await fetch(`${REST}/klines?symbol=PAXGUSDT&interval=1h&limit=168`);
      if (!r.ok) throw 0;
      const lilin = (await r.json()).map(k => [+k[0], +k[4]]).filter(k => k[1] > 0);
      if (lilin.length < 24) throw 0;
      main = { lilin, i: 0, laju: 1, jalan: true, akaun: cfdBaru() };
      lukisCfd(); jalankanMain();
      toast('Main semula bermula dengan US$1,000 wang maya. Buka posisi dan perhatikan apa yang berlaku.', 4000);
    } catch { toast('Data harga emas 7 hari lepas tidak dapat dimuatkan. Semak sambungan internet.'); }
  }
  function jalankanMain() {
    clearInterval(mainPemasa);
    if (!main || !main.jalan) return;
    mainPemasa = setInterval(() => {
      if (!main || document.hidden) return;
      if (main.i >= main.lilin.length - 1) {
        main.jalan = false; clearInterval(mainPemasa);
        const k = cfdKira(main.akaun, cfdMid(), cfdKini());
        toast(`Main semula tamat. Ekuiti akhir ${usd(k.ekuiti)} daripada modal ${usd(main.akaun.modal)}.`, 5000);
        lukisCfdDinamik(); return;
      }
      main.i++;
      lukisCfdDinamik();
    }, 450 / main.laju);
  }
  function hentiMain() { clearInterval(mainPemasa); mainPemasa = null; main = null; }

  root.addEventListener('click', e => {
    if (pasar !== 'cfd') return;
    const lv = e.target.closest('[data-lev]');
    if (lv) { cfdLev = +lv.dataset.lev; store.set('demoCfdLev', cfdLev); lukisCfd(); return; }
    const ar = e.target.closest('[data-arah]');
    if (ar) { cfdArah = ar.dataset.arah; lukisCfd(); return; }
    const lt = e.target.closest('[data-lot]');
    if (lt) { cfdLot = +lt.dataset.lot; $('#dmLot', root).value = cfdLot; $('#dmCfdKira', root).innerHTML = lukisCfdKira(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const ak = cfdAkaun(), mid = cfdMid(), kini = cfdKini();
    switch (b.dataset.act) {
      case 'cfd-buka': {
        if (!mid) return;
        const harga1 = cfdArah === 'beli' ? ask(mid) : bid(mid), oz = cfdLot * CFD.oz, margin = harga1 * oz / cfdLev;
        ak.posisi.push({ id: Math.random().toString(36).slice(2, 10), arah: cfdArah, lot: cfdLot, lev: cfdLev, buka: harga1, margin: +margin.toFixed(2), t: kini });
        ak.stopOut = null; simpanCfd(); lukisCfdDinamik();
        toast(`Posisi ${cfdArah === 'beli' ? 'Beli' : 'Jual'} dibuka. Perhatikan: anda terus rugi ${usd(CFD.spread * oz)} kerana spread.`, 4000);
        break;
      }
      case 'cfd-tutup': {
        const p = ak.posisi.find(x => x.id === b.dataset.id);
        if (!p || !mid) return;
        const u = tutupPosisi(ak, p, mid, kini, 'tutup');
        simpanCfd(); lukisCfdDinamik();
        toast(`Posisi ditutup. ${u >= 0 ? 'Untung' : 'Rugi'} sebenar ${usd(Math.abs(u))} (${pct(u / p.margin * 100)} daripada margin).`, 4000);
        break;
      }
      case 'cfd-faham': ak.stopOut = null; simpanCfd(); lukisCfdDinamik(); break;
      case 'mod-main': if (!main) mulaMain(); break;
      case 'mod-langsung': case 'main-henti': if (main) { hentiMain(); lukisCfd(); } break;
      case 'main-jalan':
        if (main.i >= main.lilin.length - 1) { main.i = 0; main.akaun = cfdBaru(); }
        main.jalan = !main.jalan; jalankanMain(); lukisCfdDinamik(); break;
      case 'main-laju': main.laju = main.laju === 1 ? 4 : main.laju === 4 ? 10 : 1; jalankanMain(); lukisCfdDinamik(); break;
    }
  });
  root.addEventListener('input', e => {
    if (pasar !== 'cfd' || e.target.id !== 'dmLot') return;
    cfdLot = Math.round(parseFloat(e.target.value) * 100) / 100 || 0;
    $('#dmCfdKira', root).innerHTML = lukisCfdKira();
  });

  /* ---------- Dialog dagangan ---------- */
  function dagang(m, s, jenis) {
    const q = hargaKini[m][s];
    if (!q) { toast('Harga belum dimuatkan. Cuba sebentar lagi.'); return; }
    const p = q.p, sy = syariah(m, s), a = akaun[m], held = a.pegang[s];
    const beli = jenis === 'beli';
    const d = document.createElement('dialog');
    d.className = 'dm-dialog';
    const bursa = m === 'bursa';
    // Kuantiti: Bursa dalam lot; kripto dalam US$
    const maksBeliLot = () => { let n = Math.floor(a.tunai / (p * LOT)); while (n > 0 && n * p * LOT + kos(m, n * p * LOT) > a.tunai + 1e-9) n--; return n; };
    const maksJualLot = () => held ? Math.floor(held.unit / LOT) : 0;
    const maksBeliUsd = () => Math.max(0, Math.floor(a.tunai / 1.001 * 100) / 100);
    const maksJualUsd = () => held ? Math.floor(held.unit * p * 100) / 100 : 0;
    const awal = bursa ? Math.min(1, beli ? maksBeliLot() : maksJualLot()) : beli ? Math.min(100, maksBeliUsd()) : maksJualUsd();
    const pantas = bursa
      ? [['1 lot', 1], ['5 lot', 5], ['Maksimum', 'max']]
      : beli ? [['25%', 0.25], ['50%', 0.5], ['Semua tunai', 1]] : [['25%', 0.25], ['50%', 0.5], ['Jual semua', 1]];
    const amaran = sy.k === 'tidak' || sy.k === 'ragu'
      ? `<div class="dm-amaran sy-${sy.k}"><b>${esc(s)} dilabel ${SY_LABEL[sy.k]}.</b> ${esc(sy.why)} Anda boleh berlatih di sini, tetapi untuk pelaburan sebenar pilih aset yang patuh Syariah.</div>` : '';
    d.innerHTML = `<button class="icon-btn plain dm-x" type="button" data-close aria-label="Tutup">${icon('x')}</button>
      <h2>${beli ? 'Beli' : 'Jual'} ${esc(s)}</h2>
      <p class="small muted">${esc(nama(m, s))} · harga ${harga(m, p)} <span class="sy sy-${sy.k}">${SY_LABEL[sy.k]}</span></p>
      ${amaran}
      <div class="field">
        <label for="dmQty">${bursa ? 'Bilangan lot (1 lot = 100 unit)' : `Jumlah ${beli ? 'dibeli' : 'dijual'} (US$)`}</label>
        <input id="dmQty" type="number" inputmode="${bursa ? 'numeric' : 'decimal'}" min="${bursa ? 1 : 1}" step="${bursa ? 1 : 'any'}" value="${awal || ''}">
      </div>
      <div class="dm-pantas">${pantas.map(([l, v]) => `<button type="button" class="chip" data-pantas="${v}">${l}</button>`).join('')}</div>
      <div class="dm-kira" aria-live="polite"></div>
      <div class="dm-dialog-butang">
        <button type="button" class="btn ghost" data-close>Batal</button>
        <button type="button" class="btn ${beli ? '' : 'dm-jual'}" id="dmSah">${beli ? 'Sahkan beli' : 'Sahkan jual'}</button>
      </div>`;
    document.body.appendChild(d);
    const qty = $('#dmQty', d), kira = $('.dm-kira', d), sah = $('#dmSah', d);
    let pesanan = null;
    function kemas() {
      const v = parseFloat(qty.value);
      pesanan = null; sah.disabled = true;
      if (!(v > 0)) { kira.innerHTML = `<p class="small muted">Masukkan ${bursa ? 'bilangan lot' : 'jumlah'}.</p>`; return; }
      let unit;
      if (bursa) {
        if (!Number.isInteger(v)) { kira.innerHTML = '<p class="small down">Saham Bursa dibeli dan dijual dalam lot penuh (nombor bulat).</p>'; return; }
        unit = v * LOT;
      } else {
        if (v < 1) { kira.innerHTML = '<p class="small down">Jumlah minimum US$1.</p>'; return; }
        unit = !beli && held && v >= maksJualUsd() - 0.005 ? held.unit : v / p;
      }
      const nilai = unit * p, yuran = kos(m, nilai);
      if (beli) {
        const jumlah = nilai + yuran;
        if (jumlah > a.tunai + 1e-9) { kira.innerHTML = `<p class="small down">Tunai tidak mencukupi. Anda perlukan ${wang(m, jumlah)} tetapi tunai anda ${wang(m, a.tunai)}.</p>`; return; }
        kira.innerHTML = `<dl class="dm-dl">
          <div><dt>Nilai ${esc(unitTeks(m, unit))}</dt><dd class="num">${wang(m, nilai)}</dd></div>
          <div><dt>Kos dagangan (anggaran)</dt><dd class="num">${wang(m, yuran)}</dd></div>
          <div class="dm-jumlah"><dt>Jumlah dibayar</dt><dd class="num">${wang(m, jumlah)}</dd></div>
          <div><dt>Tunai selepas ini</dt><dd class="num">${wang(m, a.tunai - jumlah)}</dd></div>
        </dl>
        <p class="small dm-ayat">Untuk untung, harga perlu naik melebihi kira-kira <b>${harga(m, (jumlah + kos(m, jumlah)) / unit)}</b> sebelum anda jual, supaya kos beli dan jual tertutup.</p>`;
        pesanan = { unit, nilai, yuran, jumlah };
      } else {
        if (!held || unit > held.unit + 1e-9) { kira.innerHTML = `<p class="small down">Anda hanya memiliki ${esc(held ? unitTeks(m, held.unit) : '0 unit')}.</p>`; return; }
        const terima = nilai - yuran, modal = held.kos * (unit / held.unit), untung = terima - modal;
        kira.innerHTML = `<dl class="dm-dl">
          <div><dt>Nilai ${esc(unitTeks(m, unit))}</dt><dd class="num">${wang(m, nilai)}</dd></div>
          <div><dt>Kos dagangan (anggaran)</dt><dd class="num">${wang(m, yuran)}</dd></div>
          <div class="dm-jumlah"><dt>Jumlah diterima</dt><dd class="num">${wang(m, terima)}</dd></div>
          <div><dt>Modal asal bahagian ini</dt><dd class="num">${wang(m, modal)}</dd></div>
        </dl>
        <p class="dm-hasil ${kelas(untung)}">${untung >= 0 ? 'Anda akan untung' : 'Anda akan rugi'} <b class="num">${wang(m, Math.abs(untung))}</b></p>
        <p class="small dm-ayat">${untung >= 0 ? 'Harga jual lebih tinggi daripada harga beli anda (selepas kos), jadi jualan ini menjadikan untung atas kertas sebagai untung sebenar.' : 'Harga jual lebih rendah daripada harga beli anda (selepas kos), jadi jualan ini menjadikan rugi atas kertas sebagai rugi sebenar.'}</p>`;
        pesanan = { unit, nilai, yuran, terima, modal, untung };
      }
      sah.disabled = false;
    }
    d.addEventListener('click', e => {
      if (e.target === d || e.target.closest('[data-close]')) { d.close(); return; }
      const b = e.target.closest('[data-pantas]');
      if (!b) return;
      const v = b.dataset.pantas;
      if (bursa) qty.value = v === 'max' ? (beli ? maksBeliLot() : maksJualLot()) : v;
      else qty.value = (beli ? Math.floor(maksBeliUsd() * +v * 100) / 100 : +v === 1 ? maksJualUsd() : Math.floor(maksJualUsd() * +v * 100) / 100) || '';
      kemas();
    });
    qty.addEventListener('input', kemas);
    sah.addEventListener('click', () => {
      if (!pesanan) return;
      const t = Date.now();
      if (beli) {
        a.tunai = +(a.tunai - pesanan.jumlah).toFixed(2);
        const h = a.pegang[s] || { unit: 0, kos: 0 };
        a.pegang[s] = { unit: +(h.unit + pesanan.unit).toFixed(8), kos: +(h.kos + pesanan.jumlah).toFixed(4) };
        a.sejarah.unshift({ t, jenis: 'beli', s, unit: pesanan.unit, harga: p, yuran: pesanan.yuran, jumlah: pesanan.jumlah });
        toast(`Dibeli: ${unitTeks(m, pesanan.unit)} ${s} pada ${harga(m, p)}. Lihat untung atau rugi dalam Pegangan anda.`, 4000);
      } else {
        a.tunai = +(a.tunai + pesanan.terima).toFixed(2);
        const baki = held.unit - pesanan.unit;
        if (baki < 1e-8) { delete a.pegang[s]; delete andai[s]; }
        else a.pegang[s] = { unit: +baki.toFixed(8), kos: +(held.kos - pesanan.modal).toFixed(4) };
        a.sejarah.unshift({ t, jenis: 'jual', s, unit: pesanan.unit, harga: p, yuran: pesanan.yuran, jumlah: pesanan.terima, untung: +pesanan.untung.toFixed(2) });
        toast(`Dijual: ${s}. ${pesanan.untung >= 0 ? 'Untung' : 'Rugi'} sebenar ${wang(m, Math.abs(pesanan.untung))}.`, 4000);
      }
      a.sejarah = a.sejarah.slice(0, 100);
      simpan(); d.close(); lukis();
    });
    d.addEventListener('close', () => d.remove());
    d.showModal();
    kemas();
    qty.focus();
  }

  /* ---------- Peristiwa ---------- */
  root.addEventListener('click', e => {
    const tab = e.target.closest('[data-pasar]');
    if (tab) { if (main) hentiMain(); pasar = tab.dataset.pasar; store.set('demoPasar', pasar); sahReset = false; lukis(); mulaHarga(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if ((act === 'beli' || act === 'jual') && pasar !== 'cfd') dagang(pasar, b.dataset.s, act);
    else if (act === 'tutup-panduan') { panduan = false; store.set('demoPanduanTutup', true); lukis(); }
    else if (act === 'panduan') { panduan = true; store.set('demoPanduanTutup', false); lukis(); }
    else if (act === 'reset') {
      if (!sahReset) { sahReset = true; lukis(); return; }
      sahReset = false;
      if (pasar === 'cfd') { if (main) hentiMain(); cfdLangsung = cfdBaru(); simpanCfd(); lukis(); toast('Akaun CFD telah diset semula.'); return; }
      akaun[pasar] = baru(pasar); Object.keys(andai).forEach(k => delete andai[k]);
      simpan(); lukis(); toast(`Akaun ${PASARAN[pasar].nama} telah diset semula.`);
    }
  });
  // Gelangsar "Bagaimana jika": kemas kini teks sahaja supaya gelangsar tidak dilukis semula semasa ditarik
  root.addEventListener('input', e => {
    const s = e.target.dataset && e.target.dataset.andai;
    if (!s || !akaun[pasar].pegang[s]) return;
    const j = +e.target.value; andai[s] = j;
    const k = kedudukan(pasar, s), pA = k.p * (1 + j / 100), nA = pA * k.h.unit, bA = nA - kos(pasar, nA) - k.h.kos;
    const lbl = root.querySelector(`label[for="dmAndai-${CSS.escape(s)}"] b`);
    if (lbl) lbl.textContent = `${j > 0 ? 'naik' : j < 0 ? 'turun' : 'berubah'} ${Math.abs(j)}%`;
    const out = root.querySelector(`[data-andai-hasil="${CSS.escape(s)}"]`);
    if (out) out.innerHTML = `Harga ${harga(pasar, pA)}: ${bA >= 0 ? 'untung' : 'rugi'} <b class="${kelas(bA)}">${wang(pasar, Math.abs(bA))}</b> jika dijual.`;
  });

  // Harga dimuat semula hanya semasa halaman ini dibuka: kripto setiap 15 saat, Bursa setiap 60 saat
  let pemasa = null;
  function mulaHarga() {
    clearInterval(pemasa); pemasa = null;
    if (document.documentElement.dataset.view !== 'demo') return;
    if (pasar === 'cfd') { muatCfd(); pemasa = setInterval(() => { if (!document.hidden && !main) muatCfd(); }, 10000); return; }
    muatHarga(pasar);
    pemasa = setInterval(() => { if (!document.hidden) muatHarga(pasar); }, pasar === 'kripto' ? 15000 : 60000);
  }
  document.addEventListener('viewchange', e => { if (e.detail === 'demo') { sahReset = false; lukis(); mulaHarga(); } else { clearInterval(pemasa); pemasa = null; if (main) { main.jalan = false; clearInterval(mainPemasa); } } });
  lukis();
  mulaHarga();
})();
