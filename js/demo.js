/* SiswaCap: Akaun Demo (paper trading). Berdagang dengan wang maya (wang atas kertas) pada harga pasaran sebenar
   supaya pelajar faham bagaimana untung dan rugi berlaku. Semua akaun dalam RM dan modal latihan dipilih sendiri.
   - Saham Bursa: harga pelayan nota (Yahoo Finance, lewat 15 minit), lot 100 unit.
   - Kripto: harga Binance dalam US$, ditukar ke RM pada kadar open.er-api.com.
   - CFD: Emas, Bitcoin, Ethereum, Forex (EUR/USD, GBP/USD, USD/JPY) dan saham AS, dengan leverage, spread, swap,
     margin call, stop out dan main semula harga sebenar. Disediakan untuk memahami sebab ulama mengharamkannya.
   Carta lilin (lightweight-charts) dalam setiap tab, dan stop loss / take profit untuk pegangan dan posisi.
   Semua data disimpan dalam pelayar sahaja. Kos dagangan ialah anggaran pendidikan. Label Syariah daripada js/market.js. */
(function () {
  const root = $('#view-demo');
  if (!root) return;

  const NOTA = 'https://nota.siswacap.my';
  const REST = 'https://data-api.binance.vision/api/v3';
  const KADAR_API = 'https://open.er-api.com/v6/latest/USD';
  const LOT = 100;   // 1 lot Bursa = 100 unit saham
  const PASARAN = {
    bursa: { nama: 'Saham Bursa', modal: 10000,
      aset: [['TENAGA', '5347', 'Tenaga Nasional'], ['PCHEM', '5183', 'Petronas Chemicals'], ['IHH', '5225', 'IHH Healthcare'], ['GAMUDA', '5398', 'Gamuda'],
        ['YTLPOWR', '6742', 'YTL Power'], ['MAYBANK', '1155', 'Malayan Banking'], ['PBBANK', '1295', 'Public Bank'], ['CIMB', '1023', 'CIMB Group']] },
    kripto: { nama: 'Kripto', modal: 1000,
      aset: [['BTC', 'BTCUSDT', 'Bitcoin'], ['ETH', 'ETHUSDT', 'Ethereum'], ['SOL', 'SOLUSDT', 'Solana'], ['XRP', 'XRPUSDT', 'XRP'],
        ['ADA', 'ADAUSDT', 'Cardano'], ['LINK', 'LINKUSDT', 'Chainlink'], ['BNB', 'BNBUSDT', 'BNB'], ['DOGE', 'DOGEUSDT', 'Dogecoin']] }
  };
  /* Instrumen CFD. saiz = unit bagi 1 lot; spread dalam harga; swap = kadar faedah setahun [Beli, Jual]; kuot JPY untuk USD/JPY.
     src b = Binance (24 jam), y = pelayan nota (Yahoo Finance). Leverage maksimum mengikut kelas aset seperti broker biasa. */
  const CFD_INS = [
    { k: 'XAU', label: 'XAU/USD', nama: 'Emas', kump: 'Komoditi', src: 'b', sym: 'PAXGUSDT', saiz: 100, unit: 'auns emas', spread: 0.40, dp: 2, lev: [1, 10, 100, 500], swap: [0.06, 0.03] },
    { k: 'BTC', label: 'BTC/USD', nama: 'Bitcoin', kump: 'Kripto', src: 'b', sym: 'BTCUSDT', saiz: 1, unit: 'BTC', spread: 30, dp: 2, lev: [1, 2, 10, 100], swap: [0.18, 0.18] },
    { k: 'ETH', label: 'ETH/USD', nama: 'Ethereum', kump: 'Kripto', src: 'b', sym: 'ETHUSDT', saiz: 1, unit: 'ETH', spread: 2, dp: 2, lev: [1, 2, 10, 100], swap: [0.18, 0.18] },
    { k: 'EURUSD', label: 'EUR/USD', nama: 'Euro / Dolar AS', kump: 'Forex', src: 'y', sym: 'EURUSD=X', saiz: 100000, unit: 'EUR', spread: 0.00012, dp: 5, lev: [1, 10, 100, 500], swap: [0.03, 0.01] },
    { k: 'GBPUSD', label: 'GBP/USD', nama: 'Paun / Dolar AS', kump: 'Forex', src: 'y', sym: 'GBPUSD=X', saiz: 100000, unit: 'GBP', spread: 0.00018, dp: 5, lev: [1, 10, 100, 500], swap: [0.03, 0.01] },
    { k: 'USDJPY', label: 'USD/JPY', nama: 'Dolar AS / Yen', kump: 'Forex', src: 'y', sym: 'JPY=X', saiz: 100000, unit: 'USD', spread: 0.015, dp: 3, kuot: 'JPY', lev: [1, 10, 100, 500], swap: [0.01, 0.04] },
    { k: 'AAPL', label: 'AAPL', nama: 'Apple', kump: 'Saham AS', src: 'y', sym: 'AAPL', saiz: 100, unit: 'unit saham', spread: 0.10, dp: 2, lev: [1, 5, 20], swap: [0.07, 0.03] },
    { k: 'TSLA', label: 'TSLA', nama: 'Tesla', kump: 'Saham AS', src: 'y', sym: 'TSLA', saiz: 100, unit: 'unit saham', spread: 0.20, dp: 2, lev: [1, 5, 20], swap: [0.07, 0.03] }
  ];
  const INS = Object.fromEntries(CFD_INS.map(i => [i.k, i]));
  const SY_LABEL = { patuh: 'Patuh Syariah', tidak: 'Haram', ragu: 'Diragui', belum: 'Belum disaring' };
  const MODAL_PILIHAN = [50, 100, 500, 1000, 5000, 10000];
  const JULAT = [['1d', '1 hari'], ['5d', '5 hari'], ['3mo', '3 bulan']];

  /* ---------- Format dan kos ---------- */
  const rm = v => 'RM' + Number(v).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usdF = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usd = v => 'US$' + usdF.format(v);
  const tanda = v => (v > 0.004 ? '+' : v < -0.004 ? '−' : '') + rm(Math.abs(v));
  const pct = v => (v > 0.005 ? '+' : v < -0.005 ? '−' : '') + Math.abs(v).toFixed(2) + '%';
  const kelas = v => v > 0.004 ? 'up' : v < -0.004 ? 'down' : '';
  // Harga asal aset: Bursa dalam RM, kripto dalam US$, CFD mengikut instrumen (US$ atau ¥)
  const hargaSpot = (m, p) => m === 'bursa' ? 'RM' + Number(p).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
    : p >= 1 ? usd(p) : 'US$' + Number(p).toPrecision(4);
  const hargaIns = (ins, p) => (ins.kuot === 'JPY' ? '¥' : ins.kump === 'Forex' ? '' : 'US$') + Number(p).toLocaleString('en-US', { minimumFractionDigits: ins.dp, maximumFractionDigits: ins.dp });
  const unitTeks = (m, u, s) => m === 'bursa' ? `${(u / LOT).toLocaleString('ms-MY')} lot (${u.toLocaleString('ms-MY')} unit)` : `${+u.toFixed(6)} ${s || 'unit'}`;
  const lotTeks = (ins, l) => `${(+l).toFixed(2)} lot (${(+(l * ins.saiz).toFixed(2)).toLocaleString('en-US')} ${ins.unit})`;
  const tarikhPendek = t => new Date(t).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  // Kos dagangan (RM). Bursa: komisen 0.1% (min RM3) + SST 8% + fi penjelasan 0.03% + duti setem RM1/RM1,000. Kripto: 0.1%.
  function kos(m, nilai) {
    if (!(nilai > 0)) return 0;
    if (m === 'kripto') return +(nilai * 0.001).toFixed(2);
    const kom = Math.max(nilai * 0.001, 3);
    return +(kom * 1.08 + Math.min(nilai * 0.0003, 1000) + Math.min(Math.ceil(nilai / 1000), 1000)).toFixed(2);
  }

  /* ---------- Kadar tukaran US$ ke RM ---------- */
  let kadar = (d => d && d.r > 0 ? d : null)(store.get('demoKadar', null));
  const kd = () => kadar ? kadar.r : null;
  async function muatKadar() {
    if (kadar && Date.now() - kadar.t < 6 * 3600e3) return;
    try {
      const r = await fetch(KADAR_API);
      const j = r.ok ? await r.json() : null;
      const v = j && j.rates && +j.rates.MYR;
      if (v > 0) { kadar = { r: v, t: Date.now() }; store.set('demoKadar', kadar); }
    } catch {}
  }

  /* ---------- Keadaan ---------- */
  const modalPilih = Object.assign({ bursa: 10000, kripto: 1000, cfd: 1000 }, store.get('demoModal', {}));
  const baru = m => ({ v: 2, modal: modalPilih[m], tunai: modalPilih[m], pegang: {}, sejarah: [] });
  function muat() {
    const d = store.get('demo', null);
    const ok = x => x && typeof x.tunai === 'number' && isFinite(x.tunai) && x.pegang && typeof x.pegang === 'object' && Array.isArray(x.sejarah);
    // Akaun kripto versi pertama dalam US$: dimulakan semula dalam RM. Pegangan Bursa lama tiada harga beli purata (hb).
    const b = d && ok(d.bursa) ? d.bursa : baru('bursa');
    Object.values(b.pegang).forEach(h => { if (!(h.hb > 0)) h.hb = h.kos / h.unit; });
    return { bursa: b, kripto: d && ok(d.kripto) && d.kripto.v === 2 ? d.kripto : baru('kripto') };
  }
  let akaun = muat();
  let pasar = ['kripto', 'cfd'].includes(store.get('demoPasar', 'bursa')) ? store.get('demoPasar', 'bursa') : 'bursa';
  let panduan = !store.get('demoPanduanTutup', false);
  const simpan = () => store.set('demo', akaun);
  const andai = {};   // nilai gelangsar "Bagaimana jika" setiap pegangan (%)
  let sahReset = false, bukaModal = false;
  const pilih = { bursa: 'TENAGA', kripto: 'BTC' };   // aset dalam carta
  let julat = store.get('demoJulat', '5d');
  if (!JULAT.some(j => j[0] === julat)) julat = '5d';

  const hargaKini = { bursa: {}, kripto: {} };
  const status = { bursa: '', kripto: '', cfd: '' };
  const cacheBursa = store.get('bursaQuotes', {});
  PASARAN.bursa.aset.forEach(([s, code]) => { const q = cacheBursa[code + '.KL']; if (q && q.price > 0) hargaKini.bursa[s] = { p: +q.price, chg: +q.chg || 0, t: q.time || 0 }; });
  Object.assign(hargaKini.kripto, store.get('demoKripto', {}));

  const syariah = (m, s) => {
    const f = m === 'bursa' ? window.SyariahSaham : window.SyariahKripto;
    const st = f ? f(s) : { k: 'belum', why: '' };
    return { k: SY_LABEL[st.k] ? st.k : 'belum', why: st.why || '' };
  };
  const nama = (m, s) => (PASARAN[m].aset.find(a => a[0] === s) || [s, '', s])[2];
  // Harga dalam RM bagi satu unit (kripto ditukar daripada US$)
  const pRM = (m, p) => m === 'bursa' ? p : kd() ? p * kd() : null;

  /* ---------- Muat harga ---------- */
  async function muatBursa() {
    try {
      const r = await fetch(`${NOTA}/saham?s=${PASARAN.bursa.aset.map(a => a[1] + '.KL').join(',')}`);
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

  // Waktu dagangan Bursa (waktu Malaysia): Isnin hingga Jumaat, 9:00 pagi hingga 12:30 tengah hari dan 2:30 hingga 5:00 petang
  function bursaBuka() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    const min = (+p.hour % 24) * 60 + +p.minute;
    return !['Sat', 'Sun'].includes(p.weekday) && ((min >= 540 && min < 750) || (min >= 870 && min < 1020));
  }
  const teksKadar = () => kd() ? `Kadar tukaran: US$1 = RM${kd().toFixed(4)} (open.er-api.com, dikemas kini setiap hari).` : 'Kadar tukaran US$ ke RM sedang dimuatkan.';
  function teksStatus(m) {
    const ada = Object.keys(hargaKini[m]).length;
    if (m === 'kripto') return (status.kripto === 'gagal' ? (ada ? 'Harga terakhir yang disimpan. Harga semasa tidak dapat dimuatkan. ' : 'Harga kripto tidak dapat dimuatkan. Semak sambungan internet. ')
      : 'Pasaran kripto dibuka 24 jam. Harga dikemas kini setiap 15 saat (Binance). ') + teksKadar();
    if (status.bursa === 'gagal' && !ada) return 'Harga Bursa tidak dapat dimuatkan. Semak sambungan internet.';
    const buka = bursaBuka() ? 'Pasaran Bursa sedang dibuka.' : 'Pasaran Bursa ditutup sekarang (dibuka Isnin hingga Jumaat, 9:00 pagi hingga 5:00 petang), jadi demo menggunakan harga dagangan terakhir.';
    return `${buka} Harga lewat sekurang-kurangnya 15 minit (Yahoo Finance).${status.bursa === 'gagal' ? ' Harga semasa tidak dapat dimuatkan; harga terakhir yang disimpan digunakan.' : ''}`;
  }

  /* ---------- Carta lilin ---------- */
  const lilinCache = {};   // kunci -> { t, lilin: [[saat, o, h, l, c]] }
  async function ambilLilin(src, sym, j) {
    const kunci = `${src}:${sym}:${j}`, c = lilinCache[kunci];
    if (c && Date.now() - c.t < 60000) return c.lilin;
    let lilin = [];
    if (src === 'b') {
      const [iv, n] = { '1d': ['15m', 96], '5d': ['1h', 120], '3mo': ['1d', 90] }[j];
      const r = await fetch(`${REST}/klines?symbol=${sym}&interval=${iv}&limit=${n}`);
      if (!r.ok) throw new Error('carta');
      lilin = (await r.json()).map(k => [Math.floor(k[0] / 1000), +k[1], +k[2], +k[3], +k[4]]);
    } else {
      const r = await fetch(`${NOTA}/carta?s=${sym}&r=${j}`);
      if (!r.ok) throw new Error('carta');
      lilin = ((await r.json()).lilin || []).map(k => k.map(Number));
    }
    lilin = lilin.filter(k => k.length === 5 && k.every(v => isFinite(v)) && k[4] > 0).sort((a, b) => a[0] - b[0]);
    lilinCache[kunci] = { t: Date.now(), lilin };
    return lilin;
  }
  const KL = 8 * 3600;   // carta dipaparkan dalam waktu Malaysia
  const titik = k => ({ time: k[0] + KL, open: k[1], high: k[2], low: k[3], close: k[4] });
  let carta = null;   // { chart, siri, el, kunci, lilin, garis: [] }
  function warnaCarta() {
    const cs = getComputedStyle(document.documentElement), g = n => cs.getPropertyValue(n).trim();
    return { text: g('--muted'), grid: g('--border'), up: g('--up'), down: g('--down'), info: g('--info'), gold: g('--gold') };
  }
  function buangCarta() { if (carta) { try { carta.chart.remove(); } catch {} carta = null; } }
  // Pasang carta dalam #dmCarta untuk sumber yang diberi. Lilin awal boleh dihadkan (main semula).
  async function pasangCarta(src, sym, j, opsyen = {}) {
    const el = $('#dmCarta', root);
    if (!el) return;
    const kunci = opsyen.kunci || `${src}:${sym}:${j}`;
    try { await loadScript('js/vendor/lightweight-charts.js'); }
    catch { el.innerHTML = '<p class="muted small dm-carta-msg">Carta tidak dapat dimuatkan. Semak sambungan internet.</p>'; return; }
    if (!el.isConnected) return;
    if (!carta || carta.el !== el) {
      buangCarta();
      el.innerHTML = '';
      const c = warnaCarta();
      const chart = LightweightCharts.createChart(el, {
        autoSize: true, layout: { background: { color: 'transparent' }, textColor: c.text, fontFamily: getComputedStyle(document.body).fontFamily },
        grid: { vertLines: { visible: false }, horzLines: { color: c.grid } }, timeScale: { timeVisible: true, borderColor: c.grid }, rightPriceScale: { borderColor: c.grid },
        localization: { locale: 'en-GB' }, crosshair: { mode: 0 }, handleScale: { axisPressedMouseMove: false }
      });
      const siri = chart.addCandlestickSeries({ upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down, borderVisible: false });
      carta = { chart, siri, el, kunci: '', lilin: [], garis: [] };
    }
    carta.kunci = kunci;
    let lilin = opsyen.lilin;
    if (!lilin) {
      try { lilin = await ambilLilin(src, sym, j); }
      catch { if (carta && carta.kunci === kunci) { carta.siri.setData([]); } $('#dmCartaMsg', root) && ($('#dmCartaMsg', root).textContent = 'Data carta tidak dapat dimuatkan sekarang.'); return; }
    }
    if (!carta || carta.kunci !== kunci) return;   // pengguna sudah memilih aset lain
    carta.lilin = lilin.slice();
    if (opsyen.dp != null) carta.siri.applyOptions({ priceFormat: { type: 'price', precision: opsyen.dp, minMove: Math.pow(10, -opsyen.dp) } });
    carta.siri.setData(carta.lilin.map(titik));
    carta.chart.timeScale().fitContent();
    const msg = $('#dmCartaMsg', root);
    if (msg) msg.textContent = lilin.length ? '' : 'Tiada data carta untuk julat ini.';
    if (opsyen.garis) garisCarta(opsyen.garis);
  }
  // Harga terkini mengemas kini lilin terakhir (atau menambah lilin baharu dalam main semula)
  function kemasCarta(p, masa) {
    if (!carta || !carta.lilin.length || !(p > 0)) return;
    const akhir = carta.lilin[carta.lilin.length - 1];
    if (masa && masa > akhir[0]) { const k = [masa, akhir[4], Math.max(akhir[4], p), Math.min(akhir[4], p), p]; carta.lilin.push(k); carta.siri.update(titik(k)); return; }
    akhir[2] = Math.max(akhir[2], p); akhir[3] = Math.min(akhir[3], p); akhir[4] = p;
    carta.siri.update(titik(akhir));
  }
  // Garis mendatar: harga beli, stop loss dan take profit
  function garisCarta(senarai) {
    if (!carta) return;
    carta.garis.forEach(g => { try { carta.siri.removePriceLine(g); } catch {} });
    const c = warnaCarta(), warna = { beli: c.info, sl: c.down, tp: c.up };
    carta.garis = senarai.filter(g => g.harga > 0).map(g => carta.siri.createPriceLine({ price: g.harga, color: warna[g.jenis] || c.text, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: g.tajuk }));
  }
  const htmlCarta = (tajuk, nota) => `<div class="card dm-carta-kad">
      <div class="dm-carta-head"><h2 id="dmCartaTajuk">${tajuk}</h2>
        <div class="segmented small" role="group" aria-label="Julat carta">${JULAT.map(([k, l]) => `<button type="button" class="seg ${k === julat ? 'active' : ''}" data-julat="${k}" aria-pressed="${k === julat}">${l}</button>`).join('')}</div>
      </div>
      <div id="dmCarta" class="dm-carta" role="img" aria-label="Carta harga ${esc(tajuk.replace(/<[^>]+>/g, ''))}"></div>
      <p class="small muted" id="dmCartaMsg"></p>
      ${nota ? `<p class="small muted">${nota}</p>` : ''}
    </div>`;

  /* ---------- Kiraan akaun spot ---------- */
  function ringkas(m) {
    const a = akaun[m];
    let nilaiPegang = 0;
    for (const [s, h] of Object.entries(a.pegang)) { const q = hargaKini[m][s], v = q && pRM(m, q.p); nilaiPegang += v ? v * h.unit : h.kos; }
    const nilai = a.tunai + nilaiPegang;
    return { nilai, nilaiPegang, beza: nilai - a.modal, bezaPct: (nilai - a.modal) / a.modal * 100 };
  }
  function kedudukan(m, s) {
    const h = akaun[m].pegang[s], q = hargaKini[m][s];
    const p = q ? q.p : h.hb, v = pRM(m, p);
    const nilai = v ? v * h.unit : h.kos, yuran = kos(m, nilai), bersih = nilai - yuran - h.kos;
    return { h, purata: h.hb, p, nilai, yuran, bersih, bersihPct: bersih / h.kos * 100 };
  }

  /* ---------- Lukis halaman ---------- */
  function kepala(m) {
    const tab = (k, l) => `<button role="tab" type="button" class="seg ${m === k ? 'active' : ''}" data-pasar="${k}" aria-selected="${m === k}">${l}</button>`;
    return `<div class="page-head with-aside">
        <div>
          <p class="eyebrow">Akaun demo</p>
          <h1 id="h-demo">Latihan dagangan</h1>
          <p class="lead">Beli dan jual dengan wang atas kertas pada harga pasaran sebenar. Pilih sendiri modal latihan anda, contohnya RM50 atau RM100. Tiada wang sebenar terlibat, jadi anda boleh merasai sendiri bagaimana untung dan rugi berlaku tanpa risiko.</p>
        </div>
        <div class="segmented dm-tab" role="tablist" aria-label="Akaun demo">${tab('bursa', 'Saham Bursa')}${tab('kripto', 'Kripto')}${tab('cfd', 'CFD')}</div>
      </div>`;
  }
  // Pemilih modal latihan: dipaparkan sehingga pengguna memilih, kemudian melalui butang "Tukar modal"
  function lukisModal(m) {
    const a = m === 'cfd' ? cfdLangsung : akaun[m];
    const dipilih = store.get('demoModalDipilih', {})[m];
    if (dipilih && !bukaModal) return '';
    return `<div class="card dm-modal">
      <h2>${dipilih ? 'Tukar modal latihan' : 'Berapa modal latihan anda?'}</h2>
      <p class="small">Ini wang atas kertas sahaja, bukan wang sebenar. Pilih jumlah yang hampir dengan wang yang anda mungkin labur nanti supaya latihan lebih realistik.${dipilih ? ' Menukar modal akan memulakan semula akaun ini.' : ''}</p>
      <div class="dm-pantas" role="group" aria-label="Modal latihan">${MODAL_PILIHAN.map(v => `<button type="button" class="chip ${v === a.modal ? 'active' : ''}" data-modal="${v}">${rm(v).replace('.00', '')}</button>`).join('')}</div>
      <div class="dm-modal-form">
        <label class="sr-only" for="dmModalLain">Modal lain (RM)</label>
        <input id="dmModalLain" type="number" inputmode="decimal" min="10" max="1000000" step="any" placeholder="Jumlah lain, cth. 250">
        <button type="button" class="btn sm" data-act="modal-lain">Guna</button>
        ${dipilih ? '<button type="button" class="btn sm ghost" data-act="modal-tutup">Batal</button>' : ''}
      </div>
      ${m === 'bursa' ? '<p class="small muted">Saham Bursa dibeli dalam lot (100 unit). Dengan modal kecil, anda mungkin hanya mampu membeli saham berharga rendah, sama seperti dalam akaun sebenar.</p>' : ''}
    </div>`;
  }
  function tetapModal(m, v) {
    v = Math.round(v * 100) / 100;
    if (!(v >= 10 && v <= 1000000)) { toast('Modal latihan mestilah antara RM10 dan RM1,000,000.'); return; }
    modalPilih[m] = v; store.set('demoModal', modalPilih);
    store.set('demoModalDipilih', Object.assign(store.get('demoModalDipilih', {}), { [m]: true }));
    bukaModal = false;
    if (m === 'cfd') { if (main) hentiMain(); cfdLangsung = cfdBaru(); simpanCfd(); }
    else { akaun[m] = baru(m); Object.keys(andai).forEach(k => delete andai[k]); simpan(); }
    lukis(); toast(`Akaun ${m === 'cfd' ? 'CFD' : PASARAN[m].nama} dimulakan dengan modal ${rm(v)} wang atas kertas.`);
  }

  function lukisPanduan(m) {
    if (!panduan) return `<button type="button" class="link-btn dm-buka-panduan" data-act="panduan">Cara guna akaun demo</button>`;
    // Contoh sebenar menggunakan kos yang sama dengan dagangan demo
    const contoh = m === 'bursa' ? { s: '1 lot (100 unit) pada RM5.00', nb: 500 } : { s: 'Bitcoin bernilai RM200', nb: 200 };
    const nb = contoh.nb, kb = kos(m, nb), naik = nb * 1.1, turun = nb * 0.9;
    const untung = naik - kos(m, naik) - (nb + kb), rugi = turun - kos(m, turun) - (nb + kb);
    return `<div class="card dm-panduan">
      <div class="dm-panduan-head"><h2>Cara guna dalam 3 langkah</h2><button type="button" class="icon-btn plain" data-act="tutup-panduan" aria-label="Tutup panduan">${icon('x')}</button></div>
      <ol class="dm-langkah">
        <li><b>Pilih aset.</b> Lihat carta, harga semasa dan label Syariah dalam senarai di bawah.</li>
        <li><b>Tekan Beli.</b> Wang atas kertas ditolak daripada tunai anda, termasuk kos dagangan.</li>
        <li><b>Pantau dan jual.</b> Jika harga naik melebihi harga beli anda, anda untung. Jika turun, anda rugi. Tetapkan <b>stop loss</b> supaya rugi tidak membesar, dan <b>take profit</b> untuk menjual secara automatik apabila sasaran untung dicapai.</li>
      </ol>
      <div class="dm-contoh">
        <p class="dm-contoh-tajuk">Contoh: beli ${esc(contoh.s)} (${rm(nb)})</p>
        <div class="dm-contoh-grid">
          <div class="dm-contoh-kad up"><span>Harga naik 10%</span><b>${tanda(untung)}</b><small>Jual pada ${rm(naik)}, tolak kos beli dan jual</small></div>
          <div class="dm-contoh-kad down"><span>Harga turun 10%</span><b>${tanda(rugi)}</b><small>Jual pada ${rm(turun)}, tolak kos beli dan jual</small></div>
        </div>
        <p class="small muted">Perhatikan: kenaikan 10% tidak memberi untung penuh 10% kerana kos dagangan dibayar semasa membeli dan menjual.</p>
      </div>
    </div>`;
  }

  function lukisRingkasan(m) {
    const a = akaun[m], r = ringkas(m);
    const ayat = Math.abs(r.beza) < 0.005 ? `Anda bermula dengan ${rm(a.modal)} wang atas kertas. Belum ada untung atau rugi.`
      : r.beza > 0 ? `Akaun anda kini bernilai ${rm(r.beza)} lebih daripada modal permulaan.`
      : `Akaun anda kini bernilai ${rm(-r.beza)} kurang daripada modal permulaan.`;
    return `<p class="dm-label">Nilai akaun ${esc(PASARAN[m].nama)}</p>
      <p class="dm-nilai num">${rm(r.nilai)}</p>
      <p class="dm-beza num ${kelas(r.beza)}">${tanda(r.beza)} (${pct(r.bezaPct)}) berbanding modal</p>
      <p class="small dm-ayat">${esc(ayat)}</p>
      <div class="dm-stats">
        <div class="dm-stat"><div class="v num">${rm(a.tunai)}</div><div class="k">Tunai</div></div>
        <div class="dm-stat"><div class="v num">${rm(r.nilaiPegang)}</div><div class="k">Nilai pegangan</div></div>
        <div class="dm-stat"><div class="v num">${rm(a.modal)}</div><div class="k">Modal latihan</div></div>
      </div>
      <button type="button" class="link-btn dm-tukar-modal" data-act="modal-buka">Tukar modal latihan</button>`;
  }

  function lukisAset(m) {
    return PASARAN[m].aset.map(([s]) => {
      const q = hargaKini[m][s], sy = syariah(m, s), held = akaun[m].pegang[s], v = q && pRM(m, q.p);
      return `<li class="dm-aset ${pilih[m] === s ? 'dipilih' : ''}">
        <button type="button" class="dm-aset-nama" data-pilih="${esc(s)}" aria-pressed="${pilih[m] === s}" aria-label="Papar carta ${esc(s)}"><b>${esc(s)}</b> <span class="sy sy-${sy.k}">${SY_LABEL[sy.k]}</span><span class="small muted">${esc(nama(m, s))}${held ? ' · dalam pegangan' : ''}</span></button>
        <div class="dm-aset-harga num">${q ? `<b>${hargaSpot(m, q.p)}</b><span class="small ${kelas(q.chg)}">${pct(q.chg)} hari ini</span>${m === 'kripto' && v ? `<span class="small muted">≈ ${rm(v)}</span>` : ''}` : `<b class="muted">${status[m] ? 'Tiada harga' : 'Memuatkan'}</b>`}</div>
        <button type="button" class="btn sm" data-act="beli" data-s="${esc(s)}" ${v ? '' : 'disabled'} aria-label="Beli ${esc(s)}">Beli</button>
      </li>`;
    }).join('');
  }

  function lukisSlTp(m, s, h) {
    const nyata = (h.sl || h.tp) ? `<p class="small">Aktif: ${h.sl ? `stop loss <b class="down">${hargaSpot(m, h.sl)}</b>` : ''}${h.sl && h.tp ? ', ' : ''}${h.tp ? `take profit <b class="up">${hargaSpot(m, h.tp)}</b>` : ''}. Pegangan ini dijual secara automatik apabila harga mencapai paras itu.</p>` : '';
    return `<details class="dm-sltp" ${h.sl || h.tp ? 'open' : ''}>
      <summary>Stop loss dan take profit</summary>
      ${nyata}
      <div class="dm-sltp-grid">
        <div class="field"><label for="dmSl-${esc(s)}">Stop loss (jual jika harga jatuh ke)</label><input id="dmSl-${esc(s)}" data-sl="${esc(s)}" type="number" inputmode="decimal" step="any" min="0" value="${h.sl || ''}" placeholder="Tiada"></div>
        <div class="field"><label for="dmTp-${esc(s)}">Take profit (jual jika harga naik ke)</label><input id="dmTp-${esc(s)}" data-tp="${esc(s)}" type="number" inputmode="decimal" step="any" min="0" value="${h.tp || ''}" placeholder="Tiada"></div>
      </div>
      <div class="dm-pantas">
        <button type="button" class="chip" data-sltp="sl" data-pct="-5" data-s="${esc(s)}">SL −5%</button><button type="button" class="chip" data-sltp="sl" data-pct="-10" data-s="${esc(s)}">SL −10%</button>
        <button type="button" class="chip" data-sltp="tp" data-pct="10" data-s="${esc(s)}">TP +10%</button><button type="button" class="chip" data-sltp="tp" data-pct="20" data-s="${esc(s)}">TP +20%</button>
      </div>
      <div class="dm-butang"><button type="button" class="btn sm" data-act="sltp-simpan" data-s="${esc(s)}">Simpan</button>${h.sl || h.tp ? `<button type="button" class="btn sm ghost" data-act="sltp-padam" data-s="${esc(s)}">Padam</button>` : ''}</div>
      <p class="small muted">Stop loss menghadkan rugi: jika harga jatuh, pegangan dijual sebelum rugi menjadi lebih besar. Take profit mengunci untung apabila sasaran dicapai. Dalam pasaran sebenar, harga boleh melompat melepasi paras ini (slippage), jadi harga jualan mungkin berbeza sedikit.</p>
    </details>`;
  }

  function lukisPegangan(m) {
    const syms = Object.keys(akaun[m].pegang);
    if (!syms.length) return `<div class="card dm-kosong"><p>Anda belum memiliki apa-apa aset. Pilih aset di bawah dan tekan <b>Beli</b> untuk mula berlatih.</p></div>`;
    return syms.map(s => {
      const k = kedudukan(m, s), j = andai[s] || 0;
      const v = pRM(m, k.p * (1 + j / 100)), nAndai = v ? v * k.h.unit : k.nilai, bAndai = nAndai - kos(m, nAndai) - k.h.kos;
      const ayat = k.bersih > 0.004
        ? `Anda membeli pada purata ${hargaSpot(m, k.purata)} dan harga sekarang ${hargaSpot(m, k.p)}. Jika anda jual sekarang, anda untung ${rm(k.bersih)} selepas kos jual. Untung ini masih "atas kertas" sehingga anda menjual.`
        : k.bersih < -0.004
          ? `Anda membeli pada purata ${hargaSpot(m, k.purata)} dan harga sekarang ${hargaSpot(m, k.p)}. Jika anda jual sekarang, anda rugi ${rm(-k.bersih)} termasuk kos jual. Rugi ini belum berlaku sehingga anda menjual; harga boleh naik semula atau terus turun.`
          : `Harga sekarang hampir sama dengan harga beli anda. Jika anda jual sekarang, anda hampir pulang modal.`;
      return `<article class="card dm-pegang" data-s="${esc(s)}">
        <div class="dm-pegang-head">
          <div><h3>${esc(s)} <span class="small muted">${esc(nama(m, s))}</span></h3><p class="small muted">${esc(unitTeks(m, k.h.unit, s))}</p></div>
          <div class="dm-pl num ${kelas(k.bersih)}"><b>${tanda(k.bersih)}</b><span class="small">${pct(k.bersihPct)}</span></div>
        </div>
        <dl class="dm-dl">
          <div><dt>Harga beli purata</dt><dd class="num">${hargaSpot(m, k.purata)}</dd></div>
          <div><dt>Harga sekarang</dt><dd class="num">${hargaSpot(m, k.p)}</dd></div>
          <div><dt>Modal dibayar</dt><dd class="num">${rm(k.h.kos)}</dd></div>
          <div><dt>Nilai sekarang</dt><dd class="num">${rm(k.nilai)}</dd></div>
        </dl>
        <p class="small dm-ayat">${esc(ayat)}</p>
        <div class="dm-andai">
          <label for="dmAndai-${esc(s)}">Bagaimana jika harga <b>${j > 0 ? 'naik' : j < 0 ? 'turun' : 'berubah'} ${Math.abs(j)}%</b>?</label>
          <input type="range" id="dmAndai-${esc(s)}" data-andai="${esc(s)}" min="-30" max="30" step="1" value="${j}">
          <p class="small num" data-andai-hasil="${esc(s)}">Harga ${hargaSpot(m, k.p * (1 + j / 100))}: ${bAndai >= 0 ? 'untung' : 'rugi'} <b class="${kelas(bAndai)}">${rm(Math.abs(bAndai))}</b> jika dijual.</p>
        </div>
        ${lukisSlTp(m, s, k.h)}
        <div class="dm-butang">
          <button type="button" class="btn sm" data-act="beli" data-s="${esc(s)}">Beli lagi</button>
          <button type="button" class="btn sm ghost" data-act="jual" data-s="${esc(s)}">Jual</button>
        </div>
      </article>`;
    }).join('');
  }

  const SEBAB = { sl: 'stop loss', tp: 'take profit' };
  function lukisSejarah(m) {
    const sj = akaun[m].sejarah;
    const realis = sj.filter(x => x.jenis === 'jual').reduce((t, x) => t + (x.untung || 0), 0);
    if (!sj.length) return '<p class="small muted">Belum ada dagangan.</p>';
    return `<p class="small">Jumlah untung atau rugi sebenar daripada jualan: <b class="num ${kelas(realis)}">${tanda(realis)}</b></p>
      <ul class="dm-sejarah card flush">${sj.slice(0, 30).map(x => {
        const tarikh = new Date(x.t).toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        return `<li class="dm-sj">
          <span class="dm-sj-jenis ${x.jenis === 'beli' ? 'beli' : 'jual'}">${x.jenis === 'beli' ? 'Beli' : 'Jual'}</span>
          <div><b>${esc(x.s)}</b> <span class="small muted">${esc(unitTeks(m, x.unit, x.s))} pada ${hargaSpot(m, x.harga)}</span><div class="small muted">${esc(tarikh)} · kos dagangan ${rm(x.yuran)}${SEBAB[x.sebab] ? ` · <b>${SEBAB[x.sebab]}</b>` : ''}</div></div>
          <div class="num dm-sj-kanan">${x.jenis === 'jual' ? `<b class="${kelas(x.untung)}">${tanda(x.untung)}</b><span class="small muted">untung/rugi sebenar</span>` : `<b>−${rm(x.jumlah)}</b><span class="small muted">dibayar</span>`}</div>
        </li>`;
      }).join('')}</ul>`;
  }

  // Leverage juga wujud dalam saham dan kripto: diterangkan supaya pelajar faham kenapa ia mengubah hukum
  function lukisLeverageSpot(m) {
    return `<div class="card dm-ilmu dm-lev-spot">
      <h2>${m === 'bursa' ? 'Saham' : 'Kripto'} pun boleh diberi leverage</h2>
      <p class="small">Akaun demo ini ialah dagangan <b>spot</b>: anda membayar penuh dengan wang sendiri dan memiliki ${m === 'bursa' ? 'unit saham' : 'syiling'} itu. Tetapi ada pihak yang menawarkan ${m === 'bursa' ? 'saham' : 'kripto'} dengan leverage:</p>
      <ul class="small dm-senarai-titik">
        ${m === 'bursa'
          ? '<li><b>Akaun margin saham:</b> broker meminjamkan wang supaya anda boleh membeli lebih banyak saham, dan mengenakan faedah atas pinjaman itu. Jika harga jatuh, anda menerima margin call dan saham dijual secara paksa.</li><li><b>CFD saham:</b> anda hanya bertaruh pada beza harga tanpa memiliki saham, dengan leverage dan swap setiap malam.</li>'
          : '<li><b>Dagangan margin kripto:</b> bursa kripto meminjamkan dana untuk membeli lebih banyak syiling, dengan caj faedah.</li><li><b>Niaga hadapan kekal (perpetual futures) dan CFD kripto:</b> leverage hingga 1:100 atau lebih, tanpa memiliki syiling, dengan caj pembiayaan (funding fee) berkala. Posisi ditutup paksa (likuidasi) apabila margin habis.</li>'}
      </ul>
      <p class="small"><b>Kenapa ini menjadikannya haram?</b> Walaupun ${m === 'bursa' ? 'saham itu patuh Syariah' : 'syiling itu diluluskan Syariah'}, leverage konvensional ialah pinjaman berfaedah (riba), dan pinjaman itu disyaratkan bersama jual beli. Muzakarah Jawatankuasa Fatwa Kebangsaan kali ke-98 menyebut "pensyaratan jual beli dalam pemberian hutang melalui leverage" sebagai salah satu sebab pengharaman. Jika aset tidak dimiliki (CFD dan niaga hadapan), wujud juga unsur menjual yang tiada dalam milik dan spekulasi. Pembiayaan margin Islam yang menggunakan akad Syariah ialah pilihan berbeza dan perlu disemak akadnya.</p>
      <div class="dm-butang"><button type="button" class="btn sm" data-pasar="cfd">Rasai sendiri kesan leverage dalam tab CFD</button><a class="btn sm ghost" href="#ibadah/fiqh/muamalat/leverage">Hukum leverage dalam Fiqh</a></div>
    </div>`;
  }

  function lukisSpot(m) {
    const a = akaun[m], s = pilih[m];
    root.innerHTML = `${kepala(m)}
      ${lukisModal(m)}
      ${lukisPanduan(m)}
      <div class="card dm-ringkas" id="dmRingkas">${lukisRingkasan(m)}</div>
      ${htmlCarta(`${esc(s)} <span class="small muted">${esc(nama(m, s))}</span>`, m === 'kripto' ? 'Harga carta dalam US$ (Binance).' : 'Harga carta dalam RM, lewat 15 minit (Yahoo Finance).')}
      <div class="block-head"><h2>Pegangan anda</h2></div>
      <div id="dmPegang">${lukisPegangan(m)}</div>
      <div class="block-head"><h2>Pilih aset</h2></div>
      <p class="small muted dm-status" id="dmStatus">${esc(teksStatus(m))}</p>
      <ul class="dm-senarai card flush" id="dmAset">${lukisAset(m)}</ul>
      ${lukisLeverageSpot(m)}
      <div class="block-head"><h2>Sejarah dagangan</h2></div>
      <div id="dmSejarah">${lukisSejarah(m)}</div>
      <div class="dm-reset">
        <button type="button" class="btn sm ghost" data-act="reset">${sahReset ? 'Tekan sekali lagi untuk set semula' : `Set semula akaun ${esc(PASARAN[m].nama)}`}</button>
        <span class="small muted">Tunai kembali ${rm(a.modal)}, pegangan dan sejarah dipadam.</span>
      </div>
      <p class="note">${icon('alert')}<span>Akaun demo untuk pendidikan sahaja dan bukan nasihat kewangan. Wang dan dagangan adalah maya dan disimpan dalam pelayar ini sahaja. Kos dagangan ialah anggaran (Bursa: komisen 0.1% minimum RM3, SST, fi penjelasan dan duti setem; kripto: 0.1%); kadar sebenar berbeza mengikut broker. Dalam pasaran sebenar, harga boleh berubah sebelum pesanan anda dipenuhi.</span></p>`;
    pasangCartaSpot(m);
  }
  function garisSpot(m) {
    const h = akaun[m].pegang[pilih[m]];
    return h ? [{ jenis: 'beli', harga: h.hb, tajuk: 'Harga beli' }, { jenis: 'sl', harga: h.sl, tajuk: 'Stop loss' }, { jenis: 'tp', harga: h.tp, tajuk: 'Take profit' }] : [];
  }
  function pasangCartaSpot(m) {
    const s = pilih[m];
    const src = m === 'bursa' ? 'y' : 'b', sym = m === 'bursa' ? PASARAN.bursa.aset.find(a => a[0] === s)[1] + '.KL' : PASARAN.kripto.aset.find(a => a[0] === s)[1];
    const p = hargaKini[m][s];
    pasangCarta(src, sym, julat, { garis: garisSpot(m), dp: m === 'bursa' ? 3 : p && p.p < 1 ? 5 : 2 }).then(() => { if (p && pasar === m && pilih[m] === s) kemasCarta(p.p); });
  }
  // Kemas kini bahagian yang bergantung pada harga sahaja; input yang sedang diisi tidak diganggu
  function lukisSpotDinamik(m) {
    if (pasar !== m || !$('#dmRingkas', root)) return;
    $('#dmRingkas', root).innerHTML = lukisRingkasan(m);
    $('#dmStatus', root).textContent = teksStatus(m);
    $('#dmAset', root).innerHTML = lukisAset(m);
    $('#dmSejarah', root).innerHTML = lukisSejarah(m);
    const pg = $('#dmPegang', root), aktif = document.activeElement;
    if (!(aktif && pg.contains(aktif) && aktif.matches('input'))) {
      const buka = $$('details.dm-sltp', pg).filter(d => d.open).map(d => d.closest('[data-s]').dataset.s);
      pg.innerHTML = lukisPegangan(m);
      buka.forEach(s => { const d = pg.querySelector(`[data-s="${CSS.escape(s)}"] details.dm-sltp`); if (d) d.open = true; });
    }
    const q = hargaKini[m][pilih[m]];
    if (q) kemasCarta(q.p);
    garisCarta(garisSpot(m));
  }

  /* ---------- Stop loss / take profit spot ---------- */
  function jualSpot(m, s, unit, sebab) {
    const a = akaun[m], held = a.pegang[s], q = hargaKini[m][s], v = q && pRM(m, q.p);
    if (!held || !v) return null;
    unit = Math.min(unit, held.unit);
    const nilai = unit * v, yuran = kos(m, nilai), terima = nilai - yuran, modal = held.kos * (unit / held.unit), untung = terima - modal;
    a.tunai = +(a.tunai + terima).toFixed(2);
    const baki = held.unit - unit;
    if (baki < 1e-8) { delete a.pegang[s]; delete andai[s]; }
    else a.pegang[s] = Object.assign({}, held, { unit: +baki.toFixed(8), kos: +(held.kos - modal).toFixed(4) });
    a.sejarah.unshift({ t: Date.now(), jenis: 'jual', s, unit, harga: q.p, yuran, jumlah: +terima.toFixed(2), untung: +untung.toFixed(2), sebab });
    a.sejarah = a.sejarah.slice(0, 100);
    simpan();
    return untung;
  }
  function semakSlTp(m) {
    for (const [s, h] of Object.entries(akaun[m].pegang)) {
      const q = hargaKini[m][s];
      if (!q) continue;
      const kena = h.sl && q.p <= h.sl ? 'sl' : h.tp && q.p >= h.tp ? 'tp' : null;
      if (!kena) continue;
      const u = jualSpot(m, s, h.unit, kena);
      if (u != null) toast(`${kena === 'sl' ? 'Stop loss' : 'Take profit'} dicetuskan: ${s} dijual pada ${hargaSpot(m, q.p)}. ${u >= 0 ? 'Untung' : 'Rugi'} sebenar ${rm(Math.abs(u))}.`, 5000);
    }
  }
  const muatHarga = m => Promise.all([m === 'bursa' ? muatBursa() : muatKripto(), m === 'kripto' ? muatKadar() : null]).then(() => {
    semakSlTp(m);
    if (pasar === m) lukisSpotDinamik(m);
  });

  /* ================= CFD =================
     Satu akaun CFD (dalam RM) untuk semua instrumen, seperti akaun broker. Harga Binance (emas melalui PAXG, kripto)
     dan Yahoo Finance melalui pelayan nota (forex, saham AS). Main semula memainkan lilin 1 jam sebenar 5 hari lepas. */
  const CFD = { stopOut: 50, marginCall: 100 };
  const cfdBaru = () => ({ v: 2, modal: modalPilih.cfd, baki: modalPilih.cfd, posisi: [], sejarah: [], stopOut: null });
  const cfdOk = x => x && x.v === 2 && typeof x.baki === 'number' && isFinite(x.baki) && Array.isArray(x.posisi) && Array.isArray(x.sejarah);
  let cfdLangsung = (d => cfdOk(d) ? d : cfdBaru())(store.get('demoCfd2', null));
  const cfdHarga = Object.assign({}, store.get('demoCfdHarga2', {}));
  let cfdIns = INS[store.get('demoCfdIns', 'XAU')] ? store.get('demoCfdIns', 'XAU') : 'XAU';
  let cfdLev = 100, cfdLot = 0.1, cfdArah = 'beli', cfdSl = '', cfdTp = '';
  const levSah = () => { const L = INS[cfdIns].lev; if (!L.includes(cfdLev)) cfdLev = L.includes(100) ? 100 : L[L.length - 1]; };
  levSah();
  let main = null, mainPemasa = null;   // { ins, lilin, i, laju, jalan, akaun }
  const cfdAkaun = () => main ? main.akaun : cfdLangsung;
  const cfdMid = k => main && main.ins === k ? main.lilin[main.i][4] : main ? null : cfdHarga[k] ? cfdHarga[k].p : null;
  const cfdKini = () => main ? main.lilin[main.i][0] * 1000 : Date.now();
  const simpanCfd = () => { if (!main) store.set('demoCfd2', cfdLangsung); };
  const bid = (ins, mid) => mid - ins.spread / 2, ask = (ins, mid) => mid + ins.spread / 2;
  // Nilai kontrak dalam US$; untung/rugi dalam mata wang sebut harga ditukar ke US$ (USD/JPY dibahagi harga)
  const nilaiUsd = (ins, p, lot) => ins.kuot === 'JPY' ? lot * ins.saiz : lot * ins.saiz * p;
  const keUsd = (ins, v, p) => ins.kuot === 'JPY' ? v / p : v;

  function apung(pos, kini) {
    const ins = INS[pos.ins], mid = cfdMid(pos.ins), K = kd();
    if (!mid || !K) return null;
    const tutup = pos.arah === 'beli' ? bid(ins, mid) : ask(ins, mid);
    const pl = keUsd(ins, (pos.arah === 'beli' ? tutup - pos.buka : pos.buka - tutup) * pos.lot * ins.saiz, tutup) * K;
    const hari = Math.max(0, Math.floor((kini - pos.t) / 864e5));
    const swap = -nilaiUsd(ins, pos.buka, pos.lot) * ins.swap[pos.arah === 'beli' ? 0 : 1] / 360 * hari * K;
    return { ins, mid, tutup, pl, swap, hari, jumlah: pl + swap, pctMargin: (pl + swap) / pos.margin * 100 };
  }
  function cfdKira(ak, kini) {
    let guna = 0, apg = 0;
    ak.posisi.forEach(p => { guna += p.margin; const a = apung(p, kini); if (a) apg += a.jumlah; });
    const ekuiti = ak.baki + apg;
    return { guna, apg, ekuiti, bebas: ekuiti - guna, tahap: guna ? ekuiti / guna * 100 : null };
  }
  function tutupPosisi(ak, pos, kini, sebab) {
    const a = apung(pos, kini);
    if (!a) return 0;
    ak.baki = +(ak.baki + a.jumlah).toFixed(2);
    ak.posisi = ak.posisi.filter(p => p !== pos);
    ak.sejarah.unshift({ t: kini, ins: pos.ins, arah: pos.arah, lot: pos.lot, lev: pos.lev, buka: pos.buka, tutup: a.tutup, swap: +a.swap.toFixed(2), untung: +a.jumlah.toFixed(2), sebab });
    ak.sejarah = ak.sejarah.slice(0, 100);
    return a.jumlah;
  }
  // Stop loss / take profit posisi, kemudian stop out jika ekuiti jatuh di bawah 50% margin
  function semakCfd() {
    const ak = cfdAkaun(), kini = cfdKini(), mesej = [];
    ak.posisi.slice().forEach(p => {
      const ins = INS[p.ins], mid = cfdMid(p.ins);
      if (!mid) return;
      const harga1 = p.arah === 'beli' ? bid(ins, mid) : ask(ins, mid);
      const kena = p.sl && (p.arah === 'beli' ? harga1 <= p.sl : harga1 >= p.sl) ? 'sl' : p.tp && (p.arah === 'beli' ? harga1 >= p.tp : harga1 <= p.tp) ? 'tp' : null;
      if (kena) { const u = tutupPosisi(ak, p, kini, kena); mesej.push(`${kena === 'sl' ? 'Stop loss' : 'Take profit'} ${ins.label}: ${u >= 0 ? 'untung' : 'rugi'} ${rm(Math.abs(u))}`); }
    });
    if (mesej.length) { simpanCfd(); toast(mesej.join('. ') + '.', 5000); }
    if (!ak.posisi.length) return false;
    const k = cfdKira(ak, kini);
    if (k.tahap == null || k.tahap > CFD.stopOut) return false;
    const sebelum = ak.baki;
    let rugi = 0;
    ak.posisi.slice().forEach(p => { rugi += tutupPosisi(ak, p, kini, 'stopout'); });
    let negatif = false;
    if (ak.baki < 0) { negatif = true; ak.baki = 0; }
    ak.stopOut = { t: kini, rugi: +rugi.toFixed(2), sebelum: +sebelum.toFixed(2), negatif };
    simpanCfd();
    return true;
  }

  function lukisCfdPilih() {
    const kump = [...new Set(CFD_INS.map(i => i.kump))];
    return kump.map(g => `<div class="dm-ins-kump"><span class="dm-label">${g === 'Forex' ? 'Forex (CFD mata wang)' : g === 'Saham AS' ? 'CFD saham AS' : g === 'Kripto' ? 'CFD kripto' : 'CFD komoditi'}</span>
      <div class="dm-pantas">${CFD_INS.filter(i => i.kump === g).map(i => `<button type="button" class="chip ${i.k === cfdIns ? 'active' : ''}" data-ins="${i.k}" aria-pressed="${i.k === cfdIns}" ${main && main.ins !== i.k ? 'disabled' : ''}>${esc(i.label)}<span class="sr-only"> ${esc(i.nama)}</span></button>`).join('')}</div></div>`).join('');
  }

  function lukisCfdHarga() {
    const ins = INS[cfdIns], mid = cfdMid(cfdIns);
    if (!mid) return `<p class="dm-label">${esc(ins.nama)} (${esc(ins.label)})</p><p class="dm-nilai">Memuatkan harga</p><p class="small muted">${status.cfd === 'gagal' ? 'Harga tidak dapat dimuatkan. Semak sambungan internet, atau cuba Main semula.' : 'Sila tunggu sebentar.'}</p>`;
    const chg = main ? (mid / main.lilin[main.i0][4] - 1) * 100 : cfdHarga[cfdIns].chg;
    const hari = main ? Math.round((main.lilin[main.lilin.length - 1][0] - main.lilin[main.i0][0]) / 86400) || 1 : 0;
    const kawalan = main ? `<div class="dm-main">
        <div class="dm-main-bar" role="progressbar" aria-label="Kemajuan main semula" aria-valuemin="0" aria-valuemax="${main.lilin.length - 1 - main.i0}" aria-valuenow="${main.i - main.i0}"><span class="dm-main-isi" data-w="${Math.round((main.i - main.i0) / (main.lilin.length - 1 - main.i0) * 100)}"></span></div>
        <p class="small num">${esc(tarikhPendek(main.lilin[main.i][0] * 1000))} · hari ${Math.min(hari, Math.floor((main.lilin[main.i][0] - main.lilin[main.i0][0]) / 86400) + 1)} daripada ${hari}</p>
        <div class="dm-butang">
          <button type="button" class="btn sm" data-act="main-jalan">${main.jalan ? 'Jeda' : main.i >= main.lilin.length - 1 ? 'Ulang' : 'Teruskan'}</button>
          <button type="button" class="btn sm ghost" data-act="main-laju">Laju ${main.laju}x</button>
          <button type="button" class="btn sm ghost" data-act="main-henti">Kembali ke harga langsung</button>
        </div>
      </div>` : '';
    return `<p class="dm-label">${main ? `Main semula: harga sebenar ${esc(ins.label)}` : `${esc(ins.nama)} (${esc(ins.label)}), harga semasa`}</p>
      <p class="dm-nilai num">${hargaIns(ins, mid)}<span class="small ${kelas(chg)}"> ${pct(chg)}${main ? ' sejak mula' : ' hari ini'}</span></p>
      <div class="dm-bidask">
        <div><span>Harga jual (bid)</span><b class="num">${hargaIns(ins, bid(ins, mid))}</b></div>
        <div><span>Harga beli (ask)</span><b class="num">${hargaIns(ins, ask(ins, mid))}</b></div>
        <div><span>Spread</span><b class="num">${hargaIns(ins, ins.spread)}</b></div>
      </div>
      <p class="small muted">Anda membeli pada harga ask yang lebih tinggi dan menjual pada harga bid yang lebih rendah. Beza ini (spread) ialah keuntungan broker, jadi setiap posisi bermula dengan rugi kecil.${ins.kump === 'Forex' ? ' Harga forex disebut dalam mata wang kedua pasangan itu.' : ''}</p>
      ${kawalan}`;
  }

  function lukisCfdAkaun() {
    const ak = cfdAkaun(), k = cfdKira(ak, cfdKini());
    const tahap = k.tahap;
    const amaran = tahap == null ? '' : tahap <= CFD.marginCall
      ? `<p class="dm-amaran sy-tidak"><b>Margin call.</b> Ekuiti anda kurang daripada margin yang digunakan. Jika tahap margin jatuh ke ${CFD.stopOut}%, broker akan menutup semua posisi anda secara paksa.</p>`
      : tahap < 200 ? `<p class="dm-amaran sy-ragu">Tahap margin anda rendah. Pergerakan kecil lagi boleh mencetuskan margin call.</p>` : '';
    const so = ak.stopOut ? `<div class="dm-stopout" role="alert">
        <h3>Stop out: broker telah menutup semua posisi anda</h3>
        <p>Ekuiti anda jatuh ke ${CFD.stopOut}% daripada margin, jadi posisi ditutup secara paksa pada harga semasa. Anda rugi <b class="num">${rm(Math.abs(ak.stopOut.rugi))}</b> dan baki tinggal <b class="num">${rm(ak.baki)}</b>.</p>
        ${ak.stopOut.negatif ? '<p class="small">Kerugian melebihi baki anda. Dalam demo ini baki dihadkan pada RM0, tetapi tidak semua broker memberi perlindungan baki negatif; ada yang boleh menuntut hutang daripada anda.</p>' : ''}
        <p class="small">Inilah beza paling besar dengan saham: pemilik saham tidak dipaksa menjual apabila harga jatuh, dan rugi maksimumnya hanya wang yang dibayar. Dalam CFD berleverage, pergerakan kecil sudah cukup untuk menghapuskan wang anda.</p>
        <button type="button" class="btn sm ghost" data-act="cfd-faham">Saya faham</button>
      </div>` : '';
    return `${so}
      <p class="dm-label">${main ? 'Akaun main semula' : 'Akaun CFD demo'}</p>
      <p class="dm-nilai num">${rm(k.ekuiti)}</p>
      <p class="dm-beza num ${kelas(k.ekuiti - ak.modal)}">${tanda(k.ekuiti - ak.modal)} (${pct((k.ekuiti - ak.modal) / ak.modal * 100)}) berbanding modal ${rm(ak.modal)}</p>
      <div class="dm-stats dm-stats-4">
        <div class="dm-stat"><div class="v num">${rm(ak.baki)}</div><div class="k">Baki (tanpa posisi terbuka)</div></div>
        <div class="dm-stat"><div class="v num ${kelas(k.apg)}">${tanda(k.apg)}</div><div class="k">Untung/rugi terapung</div></div>
        <div class="dm-stat"><div class="v num">${rm(k.guna)}</div><div class="k">Margin digunakan</div></div>
        <div class="dm-stat"><div class="v num ${tahap != null && tahap < 200 ? 'down' : ''}">${tahap == null ? 'Tiada' : Math.max(0, tahap).toFixed(0) + '%'}</div><div class="k">Tahap margin (stop out pada ${CFD.stopOut}%)</div></div>
      </div>
      ${amaran}
      ${main ? '' : '<button type="button" class="link-btn dm-tukar-modal" data-act="modal-buka">Tukar modal latihan</button>'}`;
  }

  // Semakan SL/TP pesanan baharu; pulangkan teks ralat atau ''
  function salahSlTp(ins, arah, mid, sl, tp) {
    const b = bid(ins, mid), a = ask(ins, mid);
    if (sl && (arah === 'beli' ? sl >= b : sl <= a)) return `Stop loss untuk posisi ${arah === 'beli' ? 'Beli mesti di bawah harga bid' : 'Jual mesti di atas harga ask'} sekarang.`;
    if (tp && (arah === 'beli' ? tp <= a : tp >= b)) return `Take profit untuk posisi ${arah === 'beli' ? 'Beli mesti di atas harga ask' : 'Jual mesti di bawah harga bid'} sekarang.`;
    return '';
  }
  function lukisCfdKira() {
    const ins = INS[cfdIns], ak = cfdAkaun(), mid = cfdMid(cfdIns), K = kd();
    if (!mid) return '';
    if (!K) return '<p class="small muted">Kadar tukaran US$ ke RM sedang dimuatkan.</p>';
    const k = cfdKira(ak, cfdKini());
    const L = cfdLot, harga1 = cfdArah === 'beli' ? ask(ins, mid) : bid(ins, mid);
    if (!(L >= 0.01)) return '<p class="small down">Saiz minimum 0.01 lot.</p>';
    const nilai = nilaiUsd(ins, harga1, L) * K, margin = nilai / cfdLev, spreadKos = keUsd(ins, ins.spread * L * ins.saiz, harga1) * K;
    const gerak1 = nilai * 0.01;
    const bolehRugi = k.ekuiti - CFD.stopOut / 100 * (k.guna + margin) - spreadKos;
    const gerakSO = bolehRugi / nilai * 100;
    const swapHari = nilai * ins.swap[cfdArah === 'beli' ? 0 : 1] / 360;
    const sl = +cfdSl || 0, tp = +cfdTp || 0, salah = salahSlTp(ins, cfdArah, mid, sl, tp);
    const rugiSl = sl ? keUsd(ins, Math.abs(harga1 - sl) * L * ins.saiz, sl) * K : 0, untungTp = tp ? keUsd(ins, Math.abs(tp - harga1) * L * ins.saiz, tp) * K : 0;
    const cukup = margin <= k.bebas && bolehRugi > 0 && !salah;
    return `<dl class="dm-dl">
        <div><dt>Nilai kontrak yang dikawal</dt><dd class="num">${rm(nilai)}</dd></div>
        <div><dt>Margin (wang anda yang dikunci)</dt><dd class="num">${rm(margin)}</dd></div>
        <div><dt>Dipinjamkan broker (leverage)</dt><dd class="num">${rm(nilai - margin)}</dd></div>
        <div><dt>Kos spread serta-merta</dt><dd class="num down">−${rm(spreadKos)}</dd></div>
        <div><dt>Swap setiap malam (faedah)</dt><dd class="num down">−${rm(swapHari)}</dd></div>
      </dl>
      <div class="dm-kesan">
        <p>Jika harga bergerak <b>1%</b> ${cfdArah === 'beli' ? 'naik' : 'turun'}, anda untung <b class="up num">${rm(gerak1)}</b>. Jika bergerak 1% menentang anda, anda rugi <b class="down num">${rm(gerak1)}</b>, iaitu <b>${cfdLev}%</b> daripada margin anda.</p>
        <p>${bolehRugi > 0 ? `Harga hanya perlu bergerak <b class="num">${gerakSO.toFixed(2)}%</b> menentang anda sebelum broker menutup posisi secara paksa (stop out).` : 'Modal anda tidak cukup untuk membuka posisi sebesar ini.'}</p>
        ${sl && !salah ? `<p>Stop loss pada ${hargaIns(ins, sl)}: rugi dihadkan kira-kira <b class="down num">${rm(rugiSl + spreadKos)}</b>${sl && rugiSl + spreadKos > bolehRugi ? ', tetapi stop out akan berlaku dahulu' : ''}.</p>` : ''}
        ${tp && !salah ? `<p>Take profit pada ${hargaIns(ins, tp)}: untung kira-kira <b class="up num">${rm(Math.max(0, untungTp - spreadKos))}</b>.</p>` : ''}
        ${cfdLev === 1 ? '<p class="small muted">Tanpa leverage (1:1), anda membayar nilai penuh. Rugi 1% hanya 1% daripada wang anda, sama seperti memiliki aset, tetapi anda masih tidak memiliki aset itu.</p>' : ''}
      </div>
      ${salah ? `<p class="small down">${esc(salah)}</p>` : ''}
      <button type="button" class="btn block ${cfdArah === 'jual' ? 'dm-jual' : ''}" data-act="cfd-buka" ${cukup ? '' : 'disabled'}>${cfdArah === 'beli' ? 'Buka posisi Beli (jangka harga naik)' : 'Buka posisi Jual (jangka harga turun)'}</button>
      ${!cukup && !salah && bolehRugi > 0 ? `<p class="small down">Margin bebas tidak mencukupi (${rm(Math.max(0, k.bebas))}). Kecilkan lot atau naikkan leverage.</p>` : ''}`;
  }

  function lukisCfdPosisi() {
    const ak = cfdAkaun(), kini = cfdKini();
    if (!ak.posisi.length) return '<div class="card dm-kosong"><p>Tiada posisi terbuka. Pilih instrumen, arah, saiz dan leverage di atas, kemudian buka posisi dan perhatikan untung atau rugi berubah.</p></div>';
    return ak.posisi.map(p => {
      const ins = INS[p.ins], a = apung(p, kini);
      const ayat = !a ? '' : a.jumlah >= 0
        ? `Harga bergerak ${p.arah === 'beli' ? 'naik' : 'turun'} memihak kepada anda. Untung ${rm(a.jumlah)} ialah ${a.pctMargin.toFixed(0)}% daripada margin ${rm(p.margin)}, walaupun harga hanya berubah ${Math.abs((a.mid / p.buka - 1) * 100).toFixed(2)}%. Leverage membesarkan untung.`
        : `Rugi ${rm(-a.jumlah)} ialah ${(-a.pctMargin).toFixed(0)}% daripada margin ${rm(p.margin)}, walaupun harga hanya berubah ${Math.abs((a.mid / p.buka - 1) * 100).toFixed(2)}%. Leverage membesarkan rugi dengan kadar yang sama.`;
      return `<article class="card dm-pegang" data-pos="${esc(p.id)}">
        <div class="dm-pegang-head">
          <div><h3><span class="dm-sj-jenis ${p.arah === 'beli' ? 'beli' : 'jual'}">${p.arah === 'beli' ? 'Beli' : 'Jual'}</span> ${esc(ins.label)} <span class="small muted">1:${p.lev}</span></h3><p class="small muted">${esc(lotTeks(ins, p.lot))}, dibuka pada ${hargaIns(ins, p.buka)}</p></div>
          ${a ? `<div class="dm-pl num ${kelas(a.jumlah)}"><b>${tanda(a.jumlah)}</b><span class="small">${pct(a.pctMargin)} margin</span></div>` : ''}
        </div>
        ${a ? `<dl class="dm-dl">
          <div><dt>Harga tutup sekarang</dt><dd class="num">${hargaIns(ins, a.tutup)}</dd></div>
          <div><dt>Margin dikunci</dt><dd class="num">${rm(p.margin)}</dd></div>
          <div><dt>Swap (${a.hari} malam)</dt><dd class="num ${a.swap < 0 ? 'down' : ''}">${a.swap < 0 ? '−' : ''}${rm(Math.abs(a.swap))}</dd></div>
          <div><dt>Stop loss / take profit</dt><dd class="num">${p.sl ? hargaIns(ins, p.sl) : 'Tiada'} / ${p.tp ? hargaIns(ins, p.tp) : 'Tiada'}</dd></div>
        </dl>
        <p class="small dm-ayat">${esc(ayat)}</p>` : ''}
        <details class="dm-sltp">
          <summary>Ubah stop loss dan take profit</summary>
          <div class="dm-sltp-grid">
            <div class="field"><label for="dmPSl-${esc(p.id)}">Stop loss</label><input id="dmPSl-${esc(p.id)}" data-psl="${esc(p.id)}" type="number" inputmode="decimal" step="any" min="0" value="${p.sl || ''}" placeholder="Tiada"></div>
            <div class="field"><label for="dmPTp-${esc(p.id)}">Take profit</label><input id="dmPTp-${esc(p.id)}" data-ptp="${esc(p.id)}" type="number" inputmode="decimal" step="any" min="0" value="${p.tp || ''}" placeholder="Tiada"></div>
          </div>
          <div class="dm-butang"><button type="button" class="btn sm" data-act="pos-sltp" data-id="${esc(p.id)}">Simpan</button></div>
        </details>
        <div class="dm-butang"><button type="button" class="btn sm ghost" data-act="cfd-tutup" data-id="${esc(p.id)}">Tutup posisi</button></div>
      </article>`;
    }).join('');
  }

  function lukisCfdSejarah() {
    const sj = cfdAkaun().sejarah;
    if (!sj.length) return '<p class="small muted">Belum ada posisi ditutup.</p>';
    const SB = { stopout: '<b class="down">ditutup paksa (stop out)</b>', sl: '<b>stop loss</b>', tp: '<b>take profit</b>' };
    return `<ul class="dm-sejarah card flush">${sj.slice(0, 30).map(x => { const ins = INS[x.ins] || INS.XAU; return `<li class="dm-sj">
        <span class="dm-sj-jenis ${x.arah === 'beli' ? 'beli' : 'jual'}">${x.arah === 'beli' ? 'Beli' : 'Jual'}</span>
        <div><b>${esc(ins.label)} 1:${x.lev}</b> <span class="small muted">${esc(lotTeks(ins, x.lot))}, ${hargaIns(ins, x.buka)} ke ${hargaIns(ins, x.tutup)}</span><div class="small muted">${esc(tarikhPendek(x.t))}${SB[x.sebab] ? ' · ' + SB[x.sebab] : ''}${x.swap ? ` · swap ${rm(Math.abs(x.swap))}` : ''}</div></div>
        <div class="num dm-sj-kanan"><b class="${kelas(x.untung)}">${tanda(x.untung)}</b></div>
      </li>`; }).join('')}</ul>`;
  }

  const SEBAB_HARAM = [
    ['Riba melalui swap', 'Swap yang ditolak setiap malam ialah faedah ke atas wang yang dipinjamkan broker untuk leverage. Faedah ke atas pinjaman ialah riba.', 'Muzakarah kali ke-98: "riba melalui pengenaan rollover interest". Al-Baqarah 2:275: "Allah menghalalkan jual beli dan mengharamkan riba."'],
    ['Pinjaman bersyarat jual beli (leverage)', 'Dengan margin kecil, broker "meminjamkan" baki nilai kontrak, tetapi hanya jika anda berdagang dengannya dan membayar spread. Pinjaman yang disyaratkan bersama jual beli dan membawa manfaat kepada pemberi pinjaman dilarang.', 'Muzakarah kali ke-98: "pensyaratan jual beli dalam pemberian hutang melalui leverage".'],
    ['Tiada serah terima (qabd) bagi emas dan mata wang', 'Anda "membeli emas" atau "membeli Euro" tetapi tidak pernah menerima atau memiliki apa-apa. Emas dan mata wang ialah barang ribawi: pertukarannya mesti serta-merta dan berlaku serah terima.', 'Hadis riwayat Muslim (1587), daripada Ubadah bin al-Samit: "Emas dengan emas ... mesti sama dan secara tunai (tangan ke tangan)." Muzakarah kali ke-98: "qabd (penerimaan) yang tidak jelas ketika transaksi pertukaran". Parameter Pelaburan Emas, Muzakarah kali ke-96.'],
    ['Menjual yang tiada dalam milik', 'Posisi Jual membolehkan anda "menjual" emas, mata wang, kripto atau saham yang anda tidak miliki untuk mendapat untung apabila harga turun.', 'Hadis riwayat Abu Daud (3503), daripada Hakim bin Hizam: "Jangan jual apa yang tiada dalam milikmu."'],
    ['Spekulasi yang menyerupai judi (maisir dan gharar)', 'Tiada barang atau perniagaan sebenar bertukar tangan. Anda hanya bertaruh sama ada harga naik atau turun dengan broker; untung seorang ialah rugi pihak lain, dan leverage menjadikannya pertaruhan besar.', 'Muzakarah kali ke-98: "spekulasi yang melibatkan perjudian". Al-Maidah 5:90 tentang judi; hadis riwayat Muslim (1513) melarang jual beli gharar.']
  ];
  function lukisCfdIlmu() {
    return `<div class="card dm-ilmu">
        <h2>Saham dan kripto (spot) berbanding CFD</h2>
        <div class="dm-banding">
          <div><h3>Saham, kripto atau emas fizikal (spot)</h3><ul>
            <li>Anda <b>memiliki</b> unit saham, syiling atau emas sebenar.</li>
            <li>Bayar nilai penuh dengan wang sendiri, tiada pinjaman.</li>
            <li>Rugi maksimum ialah wang yang dibayar. Tiada sesiapa memaksa anda menjual.</li>
            <li>Boleh disimpan bertahun-tahun tanpa caj faedah.</li>
          </ul></div>
          <div><h3>CFD, forex runcit dan dagangan berleverage</h3><ul>
            <li>Anda <b>tidak memiliki</b> apa-apa. Yang didagang hanya beza harga dengan broker.</li>
            <li>Margin kecil, selebihnya "dipinjamkan" broker (leverage).</li>
            <li>Pergerakan kecil boleh menghapuskan margin, dan broker menutup posisi secara paksa (stop out).</li>
            <li>Swap (faedah) dikenakan setiap malam posisi dibuka.</li>
          </ul></div>
        </div>
        <p class="small">Forex runcit ialah CFD ke atas pasangan mata wang. Saham dan kripto juga ditawarkan sebagai CFD, akaun margin atau niaga hadapan berleverage oleh sesetengah pihak. Apabila leverage berasaskan pinjaman berfaedah dimasukkan, hukumnya berubah walaupun asetnya patuh Syariah.</p>
      </div>
      <div class="card dm-ilmu">
        <h2>Kenapa ulama mengharamkannya</h2>
        <p class="small">Muzakarah Jawatankuasa Fatwa Majlis Kebangsaan kali ke-98 (13 hingga 15 Februari 2012) memutuskan dagangan forex oleh individu secara lani melalui platform elektronik adalah <b>haram</b>. Setiap sebabnya boleh anda lihat sendiri dalam simulator di atas:</p>
        <ol class="dm-sebab">${SEBAB_HARAM.map(([t, apa, dalil]) => `<li><b>${esc(t)}</b><p class="small">${esc(apa)}</p><p class="small muted">${esc(dalil)}</p></li>`).join('')}</ol>
        <p class="small">Kami belum menemui fatwa rasmi Malaysia yang menyebut "CFD" secara khusus. Hukum CFD emas, kripto dan saham disimpulkan daripada sebab-sebab fatwa forex di atas, kerana kesemuanya wujud dalam CFD. Pelaburan emas yang <b>harus</b> ialah membeli emas fizikal atau akaun emas yang memenuhi Parameter Pelaburan Emas (kali ke-96): serta-merta, dibayar penuh, emas wujud dan diserahkan.</p>
        <p class="source">Sumber: <a href="https://emusykil.muftiselangor.gov.my/index.php/site/jawapan?id=3420" target="_blank" rel="noopener">Muzakarah kali ke-98, dipetik Jabatan Mufti Negeri Selangor</a> · <a href="https://www.maybank.com/islamic/en/coe/fatwa/others/gold_investment_parameters.page" target="_blank" rel="noopener">Parameter Pelaburan Emas, Muzakarah kali ke-96 (Maybank Islamic)</a></p>
        <div class="dm-butang"><a class="btn sm ghost" href="#ibadah/fiqh/muamalat/cfd">Hukum CFD dalam Fiqh</a><a class="btn sm ghost" href="#ibadah/fiqh/muamalat/forex">Hukum forex</a><a class="btn sm ghost" href="#ibadah/fiqh/muamalat/leverage">Hukum leverage</a><a class="btn sm ghost" href="#ibadah/fiqh/muamalat/emas">Pelaburan emas yang harus</a></div>
      </div>`;
  }

  function lukisCfdPesanan() {
    const ins = INS[cfdIns], mid = cfdMid(cfdIns);
    const lev = ins.lev.map(v => `<button type="button" class="chip ${v === cfdLev ? 'active' : ''}" data-lev="${v}" aria-pressed="${v === cfdLev}">1:${v}</button>`).join('');
    const pc = ins.kump === 'Forex' ? [0.25, 0.5] : [1, 2];
    const sltpChip = (j, d) => `<button type="button" class="chip" data-csltp="${j}" data-pct="${d}" ${mid ? '' : 'disabled'}>${j.toUpperCase()} ${d}%</button>`;
    return `<h2>Buka posisi ${esc(ins.label)}</h2>
      <div class="segmented dm-arah" role="group" aria-label="Arah">
        <button type="button" class="seg ${cfdArah === 'beli' ? 'active' : ''}" data-arah="beli" aria-pressed="${cfdArah === 'beli'}">Beli (harga naik)</button>
        <button type="button" class="seg ${cfdArah === 'jual' ? 'active' : ''}" data-arah="jual" aria-pressed="${cfdArah === 'jual'}">Jual (harga turun)</button>
      </div>
      <div class="field"><label for="dmLot">Saiz (lot). 1 lot = ${ins.saiz.toLocaleString('en-US')} ${esc(ins.unit)}</label><input id="dmLot" type="number" inputmode="decimal" min="0.01" step="0.01" value="${cfdLot}"></div>
      <div class="dm-pantas">${[0.01, 0.1, 0.5, 1].map(v => `<button type="button" class="chip" data-lot="${v}">${v} lot</button>`).join('')}</div>
      <p class="dm-label">Leverage (maksimum 1:${ins.lev[ins.lev.length - 1]} untuk ${esc(ins.kump.toLowerCase())})</p>
      <div class="dm-pantas" role="group" aria-label="Leverage">${lev}</div>
      <p class="small muted">Leverage 1:${cfdLev} bermaksud setiap RM1 wang anda mengawal RM${cfdLev} nilai ${esc(ins.label)}.</p>
      <div class="dm-sltp-grid">
        <div class="field"><label for="dmCSl">Stop loss (pilihan)</label><input id="dmCSl" type="number" inputmode="decimal" step="any" min="0" value="${cfdSl}" placeholder="Tiada"></div>
        <div class="field"><label for="dmCTp">Take profit (pilihan)</label><input id="dmCTp" type="number" inputmode="decimal" step="any" min="0" value="${cfdTp}" placeholder="Tiada"></div>
      </div>
      <div class="dm-pantas">${sltpChip('sl', pc[0])}${sltpChip('sl', pc[1])}${sltpChip('tp', pc[0] * 2)}${sltpChip('tp', pc[1] * 2)}</div>
      <p class="small muted">Stop loss menutup posisi secara automatik apabila rugi mencapai paras yang anda tetapkan. Take profit menutupnya apabila sasaran untung dicapai. Peratus dikira daripada harga semasa.</p>
      <div id="dmCfdKira" aria-live="polite">${lukisCfdKira()}</div>`;
  }

  function lukisCfd() {
    const ins = INS[cfdIns];
    root.innerHTML = `${kepala('cfd')}
      <div class="dm-amaran sy-tidak dm-cfd-intro"><b>CFD dan forex runcit adalah haram menurut Muzakarah Fatwa Kebangsaan.</b> Simulator ini disediakan supaya anda merasai sendiri kenapa ia berbahaya dan memahami sebab-sebab ulama mengharamkannya, bukan untuk menggalakkan dagangan sebenar.</div>
      ${lukisModal('cfd')}
      <div class="card dm-ins" id="dmCfdPilih">${lukisCfdPilih()}</div>
      <div class="segmented small dm-mod" role="tablist" aria-label="Mod harga">
        <button role="tab" type="button" class="seg ${main ? '' : 'active'}" data-act="mod-langsung" aria-selected="${!main}">Harga langsung</button>
        <button role="tab" type="button" class="seg ${main ? 'active' : ''}" data-act="mod-main" aria-selected="${!!main}">Main semula beberapa hari</button>
      </div>
      ${main ? '' : `<p class="small muted">Harga bergerak perlahan dari minit ke minit. Cuba <b>Main semula</b> untuk merasai pergerakan sebenar ${esc(ins.label)} beberapa hari dalam masa kira-kira seminit, termasuk caj swap setiap malam.</p>`}
      <div class="card" id="dmCfdHarga">${lukisCfdHarga()}</div>
      ${main ? `<div class="card dm-carta-kad"><div class="dm-carta-head"><h2>${esc(ins.label)}, main semula</h2></div><div id="dmCarta" class="dm-carta" role="img" aria-label="Carta main semula ${esc(ins.label)}"></div><p class="small muted" id="dmCartaMsg"></p></div>`
        : htmlCarta(`${esc(ins.label)} <span class="small muted">${esc(ins.nama)}</span>`, ins.src === 'b' ? `Harga Binance${ins.k === 'XAU' ? ' (PAXG, token yang disandarkan 1 auns emas)' : ''}.` : 'Harga Yahoo Finance melalui pelayan SiswaCap.')}
      <div class="card dm-ringkas" id="dmCfdAkaun">${lukisCfdAkaun()}</div>
      <div class="card dm-pesanan" id="dmCfdPesanan">${lukisCfdPesanan()}</div>
      <div class="block-head"><h2>Posisi terbuka</h2></div>
      <div id="dmCfdPosisi">${lukisCfdPosisi()}</div>
      ${lukisCfdIlmu()}
      <div class="block-head"><h2>Sejarah posisi</h2></div>
      <div id="dmCfdSejarah">${lukisCfdSejarah()}</div>
      <div class="dm-reset">
        <button type="button" class="btn sm ghost" data-act="reset">${sahReset ? 'Tekan sekali lagi untuk set semula' : 'Set semula akaun CFD'}</button>
        <span class="small muted">Baki kembali ${rm(cfdLangsung.modal)}, posisi dan sejarah dipadam.</span>
      </div>
      <p class="note">${icon('alert')}<span>Simulator pendidikan sahaja. Harga emas dijejak melalui PAXG/USDT (Binance), token yang disandarkan 1 auns emas, jadi ia hampir sama tetapi tidak tepat sama dengan XAU/USD broker. Harga forex dan saham AS daripada Yahoo Finance. Spread, swap dan leverage maksimum ialah anggaran; stop out pada tahap margin 50%. ${esc(teksKadar())}</span></p>`;
    pasangBar();
    pasangCartaCfd();
  }
  function garisCfd() {
    return cfdAkaun().posisi.filter(p => p.ins === cfdIns).flatMap(p => [{ jenis: 'beli', harga: p.buka, tajuk: p.arah === 'beli' ? 'Beli' : 'Jual' }, { jenis: 'sl', harga: p.sl, tajuk: 'SL' }, { jenis: 'tp', harga: p.tp, tajuk: 'TP' }]);
  }
  function pasangCartaCfd() {
    const ins = INS[cfdIns];
    if (main) { pasangCarta(null, null, null, { kunci: 'main:' + ins.k, lilin: main.lilin.slice(0, main.i + 1), garis: garisCfd(), dp: ins.dp }); return; }
    pasangCarta(ins.src, ins.sym, julat, { garis: garisCfd(), dp: ins.dp }).then(() => { const m = cfdMid(ins.k); if (m && pasar === 'cfd' && cfdIns === ins.k && !main) kemasCarta(m); });
  }
  const pasangBar = () => $$('.dm-main-isi', root).forEach(el => { el.style.width = el.dataset.w + '%'; });
  // Kemas kini bahagian yang bergantung pada harga sahaja, supaya input tidak hilang fokus
  function lukisCfdDinamik() {
    if (pasar !== 'cfd' || !$('#dmCfdHarga', root)) return;
    const stop = semakCfd(), aktif = document.activeElement;
    const sibuk = el => aktif && el && el.contains(aktif) && aktif.matches('input');
    $('#dmCfdHarga', root).innerHTML = lukisCfdHarga();
    $('#dmCfdAkaun', root).innerHTML = lukisCfdAkaun();
    $('#dmCfdKira', root).innerHTML = lukisCfdKira();
    const pos = $('#dmCfdPosisi', root);
    if (!sibuk(pos)) {
      const buka = $$('details.dm-sltp', pos).filter(d => d.open).map(d => d.closest('[data-pos]').dataset.pos);
      pos.innerHTML = lukisCfdPosisi();
      buka.forEach(id => { const d = pos.querySelector(`[data-pos="${CSS.escape(id)}"] details.dm-sltp`); if (d) d.open = true; });
    }
    $('#dmCfdSejarah', root).innerHTML = lukisCfdSejarah();
    $$('[data-csltp]', root).forEach(b => { b.disabled = !cfdMid(cfdIns); });
    pasangBar();
    const m = cfdMid(cfdIns);
    if (m) kemasCarta(m, main ? main.lilin[main.i][0] : 0);
    garisCarta(garisCfd());
    if (stop) { if (main) { main.jalan = false; clearInterval(mainPemasa); $('#dmCfdHarga', root).innerHTML = lukisCfdHarga(); } $('#dmCfdAkaun', root).scrollIntoView({ block: 'center' }); }
  }
  async function muatCfd() {
    const b = CFD_INS.filter(i => i.src === 'b'), y = CFD_INS.filter(i => i.src === 'y');
    let ok = 0;
    await Promise.all([
      muatKadar(),
      fetch(`${REST}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(b.map(i => i.sym)))}`).then(r => r.ok ? r.json() : null).then(j => {
        (Array.isArray(j) ? j : []).forEach(q => { const i = b.find(x => x.sym === q.symbol); if (i && +q.lastPrice > 0) { cfdHarga[i.k] = { p: +q.lastPrice, chg: +q.priceChangePercent || 0, t: Date.now() }; ok++; } });
      }).catch(() => {}),
      fetch(`${NOTA}/saham?s=${y.map(i => i.sym).join(',')}`).then(r => r.ok ? r.json() : null).then(j => {
        ((j && j.quotes) || []).forEach(q => { const i = y.find(x => x.sym === q.s); if (i && q.price > 0) { cfdHarga[i.k] = { p: +q.price, chg: +q.chg || 0, t: Date.now() }; ok++; } });
      }).catch(() => {})
    ]);
    status.cfd = ok ? 'ok' : 'gagal';
    store.set('demoCfdHarga2', cfdHarga);
    if (!main) lukisCfdDinamik();
  }
  async function mulaMain() {
    const ins = INS[cfdIns];
    if (!kd()) { toast('Kadar tukaran US$ ke RM belum dimuatkan. Cuba sebentar lagi.'); return; }
    try {
      const lilin = await ambilLilin(ins.src, ins.sym, '5d');
      if (lilin.length < 24) throw 0;
      // Hari pertama dipaparkan sebagai sejarah; main semula bermula selepasnya
      const i0 = Math.min(24, Math.floor(lilin.length / 4));
      main = { ins: ins.k, lilin, i0, i: i0, laju: 1, jalan: true, akaun: cfdBaru() };
      lukisCfd(); jalankanMain();
      toast(`Main semula ${ins.label} bermula dengan ${rm(main.akaun.modal)} wang atas kertas. Buka posisi dan perhatikan apa yang berlaku.`, 4000);
    } catch { toast(`Data harga ${ins.label} beberapa hari lepas tidak dapat dimuatkan. Semak sambungan internet.`); }
  }
  function jalankanMain() {
    clearInterval(mainPemasa);
    if (!main || !main.jalan) return;
    mainPemasa = setInterval(() => {
      if (!main || document.hidden) return;
      if (main.i >= main.lilin.length - 1) {
        main.jalan = false; clearInterval(mainPemasa);
        const k = cfdKira(main.akaun, cfdKini());
        toast(`Main semula tamat. Ekuiti akhir ${rm(k.ekuiti)} daripada modal ${rm(main.akaun.modal)}.`, 5000);
        lukisCfdDinamik(); return;
      }
      main.i++;
      if (carta) { const k = main.lilin[main.i]; carta.lilin.push(k.slice()); carta.siri.update(titik(k)); carta.chart.timeScale().fitContent(); }
      lukisCfdDinamik();
    }, 450 / main.laju);
  }
  function hentiMain() { clearInterval(mainPemasa); mainPemasa = null; main = null; }

  /* ---------- Dialog dagangan spot ---------- */
  function dagang(m, s, jenis) {
    const q = hargaKini[m][s];
    const v = q && pRM(m, q.p);
    if (!v) { toast(q ? 'Kadar tukaran belum dimuatkan. Cuba sebentar lagi.' : 'Harga belum dimuatkan. Cuba sebentar lagi.'); return; }
    const p = q.p, sy = syariah(m, s), a = akaun[m], held = a.pegang[s];
    const beli = jenis === 'beli', bursa = m === 'bursa';
    const d = document.createElement('dialog');
    d.className = 'dm-dialog';
    // Kuantiti: Bursa dalam lot; kripto dalam RM
    const maksBeliLot = () => { let n = Math.floor(a.tunai / (v * LOT)); while (n > 0 && n * v * LOT + kos(m, n * v * LOT) > a.tunai + 1e-9) n--; return n; };
    const maksJualLot = () => held ? Math.floor(held.unit / LOT) : 0;
    const maksBeliRm = () => Math.max(0, Math.floor(a.tunai / 1.001 * 100) / 100);
    const maksJualRm = () => held ? Math.floor(held.unit * v * 100) / 100 : 0;
    const awal = bursa ? Math.min(1, beli ? maksBeliLot() : maksJualLot()) : beli ? Math.min(100, maksBeliRm()) : maksJualRm();
    const pantas = bursa
      ? [['1 lot', 1], ['5 lot', 5], ['Maksimum', 'max']]
      : beli ? [['25%', 0.25], ['50%', 0.5], ['Semua tunai', 1]] : [['25%', 0.25], ['50%', 0.5], ['Jual semua', 1]];
    const amaran = sy.k === 'tidak' || sy.k === 'ragu'
      ? `<div class="dm-amaran sy-${sy.k}"><b>${esc(s)} dilabel ${SY_LABEL[sy.k]}.</b> ${esc(sy.why)} Anda boleh berlatih di sini, tetapi untuk pelaburan sebenar pilih aset yang patuh Syariah.</div>` : '';
    const lotMahal = bursa && beli && maksBeliLot() === 0
      ? `<p class="small dm-ayat">1 lot ${esc(s)} berharga kira-kira ${rm(v * LOT + kos(m, v * LOT))} termasuk kos, lebih daripada tunai anda ${rm(a.tunai)}. Pilih saham berharga lebih rendah atau tukar modal latihan.</p>` : '';
    d.innerHTML = `<button class="icon-btn plain dm-x" type="button" data-close aria-label="Tutup">${icon('x')}</button>
      <h2>${beli ? 'Beli' : 'Jual'} ${esc(s)}</h2>
      <p class="small muted">${esc(nama(m, s))} · harga ${hargaSpot(m, p)}${m === 'kripto' ? ` (≈ ${rm(v)})` : ''} <span class="sy sy-${sy.k}">${SY_LABEL[sy.k]}</span></p>
      ${amaran}${lotMahal}
      <div class="field">
        <label for="dmQty">${bursa ? 'Bilangan lot (1 lot = 100 unit)' : `Jumlah ${beli ? 'dibeli' : 'dijual'} (RM)`}</label>
        <input id="dmQty" type="number" inputmode="${bursa ? 'numeric' : 'decimal'}" min="1" step="${bursa ? 1 : 'any'}" value="${awal || ''}">
      </div>
      <div class="dm-pantas">${pantas.map(([l, x]) => `<button type="button" class="chip" data-pantas="${x}">${l}</button>`).join('')}</div>
      <div class="dm-kira" aria-live="polite"></div>
      <div class="dm-dialog-butang">
        <button type="button" class="btn ghost" data-close>Batal</button>
        <button type="button" class="btn ${beli ? '' : 'dm-jual'}" id="dmSah">${beli ? 'Sahkan beli' : 'Sahkan jual'}</button>
      </div>`;
    document.body.appendChild(d);
    const qty = $('#dmQty', d), kira = $('.dm-kira', d), sah = $('#dmSah', d);
    let pesanan = null;
    function kemas() {
      const n = parseFloat(qty.value);
      pesanan = null; sah.disabled = true;
      if (!(n > 0)) { kira.innerHTML = `<p class="small muted">Masukkan ${bursa ? 'bilangan lot' : 'jumlah'}.</p>`; return; }
      let unit;
      if (bursa) {
        if (!Number.isInteger(n)) { kira.innerHTML = '<p class="small down">Saham Bursa dibeli dan dijual dalam lot penuh (nombor bulat).</p>'; return; }
        unit = n * LOT;
      } else {
        if (n < 1) { kira.innerHTML = '<p class="small down">Jumlah minimum RM1.</p>'; return; }
        unit = !beli && held && n >= maksJualRm() - 0.005 ? held.unit : n / v;
      }
      const nilai = unit * v, yuran = kos(m, nilai);
      const u = unitTeks(m, unit, s);
      if (beli) {
        const jumlah = nilai + yuran;
        if (jumlah > a.tunai + 1e-9) { kira.innerHTML = `<p class="small down">Tunai tidak mencukupi. Anda perlukan ${rm(jumlah)} tetapi tunai anda ${rm(a.tunai)}.</p>`; return; }
        kira.innerHTML = `<dl class="dm-dl">
          <div><dt>Nilai ${esc(u)}</dt><dd class="num">${rm(nilai)}</dd></div>
          <div><dt>Kos dagangan (anggaran)</dt><dd class="num">${rm(yuran)}</dd></div>
          <div class="dm-jumlah"><dt>Jumlah dibayar</dt><dd class="num">${rm(jumlah)}</dd></div>
          <div><dt>Tunai selepas ini</dt><dd class="num">${rm(a.tunai - jumlah)}</dd></div>
        </dl>
        <p class="small dm-ayat">Untuk untung, harga perlu naik melebihi kira-kira <b>${hargaSpot(m, p * (jumlah + kos(m, jumlah)) / nilai)}</b> sebelum anda jual, supaya kos beli dan jual tertutup.</p>`;
        pesanan = { unit, nilai, yuran, jumlah };
      } else {
        if (!held || unit > held.unit + 1e-9) { kira.innerHTML = `<p class="small down">Anda hanya memiliki ${esc(held ? unitTeks(m, held.unit, s) : '0 unit')}.</p>`; return; }
        const terima = nilai - yuran, modal = held.kos * (unit / held.unit), untung = terima - modal;
        kira.innerHTML = `<dl class="dm-dl">
          <div><dt>Nilai ${esc(u)}</dt><dd class="num">${rm(nilai)}</dd></div>
          <div><dt>Kos dagangan (anggaran)</dt><dd class="num">${rm(yuran)}</dd></div>
          <div class="dm-jumlah"><dt>Jumlah diterima</dt><dd class="num">${rm(terima)}</dd></div>
          <div><dt>Modal asal bahagian ini</dt><dd class="num">${rm(modal)}</dd></div>
        </dl>
        <p class="dm-hasil ${kelas(untung)}">${untung >= 0 ? 'Anda akan untung' : 'Anda akan rugi'} <b class="num">${rm(Math.abs(untung))}</b></p>
        <p class="small dm-ayat">${untung >= 0 ? 'Harga jual lebih tinggi daripada harga beli anda (selepas kos), jadi jualan ini menjadikan untung atas kertas sebagai untung sebenar.' : 'Harga jual lebih rendah daripada harga beli anda (selepas kos), jadi jualan ini menjadikan rugi atas kertas sebagai rugi sebenar.'}</p>`;
        pesanan = { unit, untung };
      }
      sah.disabled = false;
    }
    d.addEventListener('click', e => {
      if (e.target === d || e.target.closest('[data-close]')) { d.close(); return; }
      const b = e.target.closest('[data-pantas]');
      if (!b) return;
      const x = b.dataset.pantas;
      if (bursa) qty.value = x === 'max' ? (beli ? maksBeliLot() : maksJualLot()) : x;
      else qty.value = (beli ? Math.floor(maksBeliRm() * +x * 100) / 100 : +x === 1 ? maksJualRm() : Math.floor(maksJualRm() * +x * 100) / 100) || '';
      kemas();
    });
    qty.addEventListener('input', kemas);
    sah.addEventListener('click', () => {
      if (!pesanan) return;
      if (beli) {
        a.tunai = +(a.tunai - pesanan.jumlah).toFixed(2);
        const h = a.pegang[s] || { unit: 0, kos: 0, hb: p };
        const unit = +(h.unit + pesanan.unit).toFixed(8);
        a.pegang[s] = Object.assign({}, h, { unit, kos: +(h.kos + pesanan.jumlah).toFixed(4), hb: (h.hb * h.unit + p * pesanan.unit) / unit });
        a.sejarah.unshift({ t: Date.now(), jenis: 'beli', s, unit: pesanan.unit, harga: p, yuran: pesanan.yuran, jumlah: pesanan.jumlah });
        a.sejarah = a.sejarah.slice(0, 100);
        simpan();
        pilih[m] = s;
        toast(`Dibeli: ${unitTeks(m, pesanan.unit, s)} ${s} pada ${hargaSpot(m, p)}. Lihat untung atau rugi dalam Pegangan anda.`, 4000);
      } else {
        const u = jualSpot(m, s, pesanan.unit, 'jual');
        toast(`Dijual: ${s}. ${u >= 0 ? 'Untung' : 'Rugi'} sebenar ${rm(Math.abs(u))}.`, 4000);
      }
      d.close(); lukis();
    });
    d.addEventListener('close', () => d.remove());
    d.showModal();
    kemas();
    qty.focus();
  }

  /* ---------- Lukis dan peristiwa ---------- */
  function lukis() {
    buangCarta();
    if (pasar === 'cfd') lukisCfd(); else lukisSpot(pasar);
  }
  const nombor = el => { const v = parseFloat(el && el.value); return v > 0 ? v : 0; };

  root.addEventListener('click', e => {
    const tab = e.target.closest('[data-pasar]');
    if (tab) { if (main) hentiMain(); pasar = tab.dataset.pasar; store.set('demoPasar', pasar); sahReset = false; bukaModal = false; lukis(); mulaHarga(); root.scrollIntoView({ block: 'start' }); return; }
    const md = e.target.closest('[data-modal]');
    if (md) { tetapModal(pasar, +md.dataset.modal); return; }
    const jl = e.target.closest('[data-julat]');
    if (jl) { julat = jl.dataset.julat; store.set('demoJulat', julat); $$('[data-julat]', root).forEach(b => { const on = b === jl; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); }); pasar === 'cfd' ? pasangCartaCfd() : pasangCartaSpot(pasar); return; }
    const pl = e.target.closest('[data-pilih]');
    if (pl && pasar !== 'cfd') {
      pilih[pasar] = pl.dataset.pilih;
      $('#dmCartaTajuk', root).innerHTML = `${esc(pilih[pasar])} <span class="small muted">${esc(nama(pasar, pilih[pasar]))}</span>`;
      $('#dmAset', root).innerHTML = lukisAset(pasar);
      pasangCartaSpot(pasar);
      return;
    }
    const st = e.target.closest('[data-sltp]');
    if (st) {
      const s = st.dataset.s, q = hargaKini[pasar][s];
      const inp = $(`#dm${st.dataset.sltp === 'sl' ? 'Sl' : 'Tp'}-${CSS.escape(s)}`, root);
      if (q && inp) inp.value = +(q.p * (1 + st.dataset.pct / 100)).toPrecision(6);
      return;
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'beli' || act === 'jual') { if (pasar !== 'cfd') dagang(pasar, b.dataset.s, act); return; }
    if (act === 'tutup-panduan') { panduan = false; store.set('demoPanduanTutup', true); lukis(); return; }
    if (act === 'panduan') { panduan = true; store.set('demoPanduanTutup', false); lukis(); return; }
    if (act === 'modal-buka') { bukaModal = true; lukis(); $('.dm-modal', root).scrollIntoView({ block: 'center' }); return; }
    if (act === 'modal-tutup') { bukaModal = false; lukis(); return; }
    if (act === 'modal-lain') { tetapModal(pasar, nombor($('#dmModalLain', root))); return; }
    if (act === 'sltp-simpan' || act === 'sltp-padam') {
      const s = b.dataset.s, h = akaun[pasar].pegang[s], q = hargaKini[pasar][s];
      if (!h) return;
      if (act === 'sltp-padam') { delete h.sl; delete h.tp; simpan(); lukisSpotDinamik(pasar); toast('Stop loss dan take profit dipadam.'); return; }
      const sl = nombor($(`#dmSl-${CSS.escape(s)}`, root)), tp = nombor($(`#dmTp-${CSS.escape(s)}`, root));
      if (q && sl && sl >= q.p) { toast('Stop loss mesti di bawah harga semasa.'); return; }
      if (q && tp && tp <= q.p) { toast('Take profit mesti di atas harga semasa.'); return; }
      if (sl) h.sl = sl; else delete h.sl;
      if (tp) h.tp = tp; else delete h.tp;
      simpan(); document.activeElement && document.activeElement.blur(); lukisSpotDinamik(pasar);
      toast(sl || tp ? `Disimpan. ${s} akan dijual secara automatik ${sl ? `jika harga jatuh ke ${hargaSpot(pasar, sl)}` : ''}${sl && tp ? ' atau ' : ''}${tp ? `jika harga naik ke ${hargaSpot(pasar, tp)}` : ''}.` : 'Stop loss dan take profit dipadam.', 4000);
      return;
    }
    if (act === 'reset') {
      if (!sahReset) { sahReset = true; lukis(); return; }
      sahReset = false;
      if (pasar === 'cfd') { if (main) hentiMain(); cfdLangsung = cfdBaru(); simpanCfd(); lukis(); toast('Akaun CFD telah diset semula.'); return; }
      akaun[pasar] = baru(pasar); Object.keys(andai).forEach(k => delete andai[k]);
      simpan(); lukis(); toast(`Akaun ${PASARAN[pasar].nama} telah diset semula.`);
    }
  });

  // Peristiwa khusus CFD
  root.addEventListener('click', e => {
    if (pasar !== 'cfd') return;
    const ins = e.target.closest('[data-ins]');
    if (ins && !main) { cfdIns = ins.dataset.ins; store.set('demoCfdIns', cfdIns); levSah(); cfdSl = cfdTp = ''; buangCarta(); lukisCfd(); return; }
    const lv = e.target.closest('[data-lev]');
    if (lv) { cfdLev = +lv.dataset.lev; $('#dmCfdPesanan', root).innerHTML = lukisCfdPesanan(); return; }
    const ar = e.target.closest('[data-arah]');
    if (ar) { cfdArah = ar.dataset.arah; cfdSl = cfdTp = ''; $('#dmCfdPesanan', root).innerHTML = lukisCfdPesanan(); return; }
    const lt = e.target.closest('[data-lot]');
    if (lt) { cfdLot = +lt.dataset.lot; $('#dmLot', root).value = cfdLot; $('#dmCfdKira', root).innerHTML = lukisCfdKira(); return; }
    const cs = e.target.closest('[data-csltp]');
    if (cs) {
      const i = INS[cfdIns], mid = cfdMid(cfdIns);
      if (!mid) return;
      const d = +cs.dataset.pct / 100, naik = (cs.dataset.csltp === 'tp') === (cfdArah === 'beli');
      const v = +(mid * (1 + (naik ? d : -d))).toFixed(i.dp);
      if (cs.dataset.csltp === 'sl') { cfdSl = String(v); $('#dmCSl', root).value = v; } else { cfdTp = String(v); $('#dmCTp', root).value = v; }
      $('#dmCfdKira', root).innerHTML = lukisCfdKira();
      return;
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const ak = cfdAkaun(), kini = cfdKini();
    switch (b.dataset.act) {
      case 'cfd-buka': {
        const i = INS[cfdIns], mid = cfdMid(cfdIns), K = kd();
        if (!mid || !K) return;
        const harga1 = cfdArah === 'beli' ? ask(i, mid) : bid(i, mid), sl = +cfdSl || 0, tp = +cfdTp || 0;
        if (salahSlTp(i, cfdArah, mid, sl, tp)) return;
        const margin = nilaiUsd(i, harga1, cfdLot) * K / cfdLev;
        ak.posisi.push({ id: Math.random().toString(36).slice(2, 10), ins: i.k, arah: cfdArah, lot: cfdLot, lev: cfdLev, buka: harga1, margin: +margin.toFixed(2), t: kini, sl: sl || undefined, tp: tp || undefined });
        ak.stopOut = null; simpanCfd(); cfdSl = cfdTp = '';
        $('#dmCfdPesanan', root).innerHTML = lukisCfdPesanan();
        lukisCfdDinamik();
        toast(`Posisi ${cfdArah === 'beli' ? 'Beli' : 'Jual'} ${i.label} dibuka. Perhatikan: anda terus rugi ${rm(keUsd(i, i.spread * cfdLot * i.saiz, harga1) * K)} kerana spread.`, 4000);
        break;
      }
      case 'cfd-tutup': {
        const p = ak.posisi.find(x => x.id === b.dataset.id);
        if (!p || !cfdMid(p.ins) || !kd()) return;
        const u = tutupPosisi(ak, p, kini, 'tutup');
        simpanCfd(); lukisCfdDinamik();
        toast(`Posisi ditutup. ${u >= 0 ? 'Untung' : 'Rugi'} sebenar ${rm(Math.abs(u))} (${pct(u / p.margin * 100)} daripada margin).`, 4000);
        break;
      }
      case 'pos-sltp': {
        const p = ak.posisi.find(x => x.id === b.dataset.id), mid = p && cfdMid(p.ins);
        if (!p || !mid) return;
        const sl = nombor($(`#dmPSl-${CSS.escape(p.id)}`, root)), tp = nombor($(`#dmPTp-${CSS.escape(p.id)}`, root));
        const salah = salahSlTp(INS[p.ins], p.arah, mid, sl, tp);
        if (salah) { toast(salah); return; }
        p.sl = sl || undefined; p.tp = tp || undefined;
        simpanCfd(); document.activeElement && document.activeElement.blur(); lukisCfdDinamik();
        toast('Stop loss dan take profit posisi dikemas kini.');
        break;
      }
      case 'cfd-faham': ak.stopOut = null; simpanCfd(); lukisCfdDinamik(); break;
      case 'mod-main': if (!main) mulaMain(); break;
      case 'mod-langsung': case 'main-henti': if (main) { hentiMain(); lukis(); } break;
      case 'main-jalan':
        if (main.i >= main.lilin.length - 1) { main.i = main.i0; main.akaun = cfdBaru(); lukis(); }
        main.jalan = !main.jalan; jalankanMain(); lukisCfdDinamik(); break;
      case 'main-laju': main.laju = main.laju === 1 ? 4 : main.laju === 4 ? 10 : 1; jalankanMain(); lukisCfdDinamik(); break;
    }
  });

  root.addEventListener('input', e => {
    const t = e.target;
    if (pasar === 'cfd') {
      if (t.id === 'dmLot') cfdLot = Math.round(parseFloat(t.value) * 100) / 100 || 0;
      else if (t.id === 'dmCSl') cfdSl = t.value;
      else if (t.id === 'dmCTp') cfdTp = t.value;
      else return;
      $('#dmCfdKira', root).innerHTML = lukisCfdKira();
      return;
    }
    // Gelangsar "Bagaimana jika": kemas kini teks sahaja supaya gelangsar tidak dilukis semula semasa ditarik
    const s = t.dataset && t.dataset.andai;
    if (!s || !akaun[pasar].pegang[s]) return;
    const j = +t.value; andai[s] = j;
    const k = kedudukan(pasar, s), pA = k.p * (1 + j / 100), v = pRM(pasar, pA), nA = v ? v * k.h.unit : k.nilai, bA = nA - kos(pasar, nA) - k.h.kos;
    const lbl = root.querySelector(`label[for="dmAndai-${CSS.escape(s)}"] b`);
    if (lbl) lbl.textContent = `${j > 0 ? 'naik' : j < 0 ? 'turun' : 'berubah'} ${Math.abs(j)}%`;
    const out = root.querySelector(`[data-andai-hasil="${CSS.escape(s)}"]`);
    if (out) out.innerHTML = `Harga ${hargaSpot(pasar, pA)}: ${bA >= 0 ? 'untung' : 'rugi'} <b class="${kelas(bA)}">${rm(Math.abs(bA))}</b> jika dijual.`;
  });

  // Harga dimuat semula hanya semasa halaman ini dibuka: kripto setiap 15 saat, CFD 10 saat, Bursa 60 saat
  let pemasa = null;
  function mulaHarga() {
    clearInterval(pemasa); pemasa = null;
    if (document.documentElement.dataset.view !== 'demo') return;
    if (pasar === 'cfd') { muatCfd(); pemasa = setInterval(() => { if (!document.hidden && !main) muatCfd(); }, 10000); return; }
    const m = pasar;
    muatHarga(m);
    pemasa = setInterval(() => { if (!document.hidden) muatHarga(m); }, m === 'kripto' ? 15000 : 60000);
  }
  document.addEventListener('viewchange', e => {
    if (e.detail === 'demo') { sahReset = false; lukis(); mulaHarga(); }
    else { clearInterval(pemasa); pemasa = null; if (main) { main.jalan = false; clearInterval(mainPemasa); } buangCarta(); }
  });
  document.addEventListener('themechange', () => { if (document.documentElement.dataset.view === 'demo' && !main) lukis(); });
  // Dilukis hanya apabila halaman ini dibuka (laman lain tidak menanggung kos, dan tiada elemen bertindih dalam halaman tersembunyi)
  if (document.documentElement.dataset.view === 'demo') { lukis(); mulaHarga(); }
})();
