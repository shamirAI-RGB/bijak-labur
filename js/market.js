/* Pasaran: kripto masa nyata (Binance WebSocket) dan saham AS (widget TradingView) */
(function () {
  const REST = 'https://data-api.binance.vision/api/v3';
  const WS = 'wss://data-stream.binance.vision/stream?streams=';
  const GECKO_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', DOGE: 'dogecoin', ADA: 'cardano', LINK: 'chainlink', AVAX: 'avalanche-2', TRX: 'tron', DOT: 'polkadot', LTC: 'litecoin', SHIB: 'shiba-inu', TON: 'the-open-network', SUI: 'sui', PEPE: 'pepe' };
  const COLORS = { BTC: '#f7931a', ETH: '#627eea', SOL: '#9945ff', BNB: '#d9a40c', XRP: '#3a3f45', DOGE: '#b8962f', ADA: '#1f4fbf', LINK: '#2a5ada', AVAX: '#e84142', TRX: '#d8262f', DOT: '#e6007a', LTC: '#345d9d', TON: '#0098ea', SUI: '#4da2ff' };
  // Logo rasmi dalam icons/kripto (web3icons, MIT); simbol lain guna bulatan huruf
  const LOGOS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'LINK', 'AVAX', 'TRX', 'DOT', 'LTC', 'SHIB', 'TON', 'SUI', 'PEPE'];
  const NAMES = { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', BNB: 'BNB', XRP: 'XRP', DOGE: 'Dogecoin', ADA: 'Cardano', LINK: 'Chainlink', AVAX: 'Avalanche', TRX: 'Tron', DOT: 'Polkadot', LTC: 'Litecoin', SHIB: 'Shiba Inu', TON: 'Toncoin', SUI: 'Sui', PEPE: 'Pepe' };
  /* Status Syariah. Utama: senarai MPS SC (sc.com.my/digital-assets). Syiling yang tiada dalam senarai SC
     memaparkan pandangan Sharlife (sharlife.my/crypto-shariah) sahaja jika ia menilai Diragui atau Tidak patuh.
     Disemak pada SY_CHECKED; kemas kini apabila SC menambah aset baharu. */
  const SY_CHECKED = '3 Oktober 2026';
  const SY_SRC = {
    sc: ['Majlis Penasihat Syariah, Suruhanjaya Sekuriti Malaysia', 'https://www.sc.com.my/digital-assets'],
    sharlife: ['Sharlife (saringan kripto)', 'https://sharlife.my/crypto-shariah']
  };
  const SC_SAC = { BTC: 'mesyuarat MPS ke-234 (20 Julai 2020)', ETH: 'mesyuarat MPS ke-234 (20 Julai 2020)', XRP: 'mesyuarat MPS ke-234 (20 Julai 2020)', LTC: 'mesyuarat MPS ke-234 (20 Julai 2020)', BCH: 'mesyuarat MPS ke-247 (23 Ogos 2021)', SOL: 'mesyuarat MPS ke-264 (12 Januari 2023)', ADA: 'mesyuarat MPS ke-264 (12 Januari 2023)', LINK: 'mesyuarat MPS ke-265 (9 Februari 2023)', UNI: 'mesyuarat MPS ke-265 (9 Februari 2023)', MATIC: 'mesyuarat MPS ke-271 (10 Ogos 2023)', AVAX: 'mesyuarat MPS ke-271 (10 Ogos 2023)', DOT: 'mesyuarat MPS ke-279 (16 Mei 2024)', ATOM: 'mesyuarat MPS ke-279 (16 Mei 2024)', WLD: 'mesyuarat MPS ke-280 (11 Jun 2024)', XLM: 'mesyuarat MPS ke-286 (10 Disember 2024)' };
  const SHARLIFE = { DOGE: 'ragu', SHIB: 'ragu', PEPE: 'tidak' };
  const SY_LABEL = { patuh: 'Patuh Syariah', tidak: 'Tidak patuh', ragu: 'Diragui', belum: 'Belum disaring' };
  function syStatus(s) {
    if (SC_SAC[s]) return { k: 'patuh', why: `Diluluskan patuh Syariah oleh Majlis Penasihat Syariah SC, ${SC_SAC[s]}.`, src: SY_SRC.sc };
    if (SHARLIFE[s] === 'tidak') return { k: 'tidak', why: 'Tiada dalam senarai patuh Syariah MPS SC. Saringan Sharlife menilainya tidak patuh Syariah.', src: SY_SRC.sharlife };
    if (SHARLIFE[s] === 'ragu') return { k: 'ragu', why: 'Tiada dalam senarai patuh Syariah MPS SC. Saringan Sharlife meletakkannya dalam kategori kelabu (diragui).', src: SY_SRC.sharlife };
    return { k: 'belum', why: 'Belum diluluskan oleh Majlis Penasihat Syariah SC. Sejak 30 Mac 2026, DAX di Malaysia hanya boleh menawarkan kripto sebagai patuh Syariah selepas pengesahan MPS SC.', src: SY_SRC.sc };
  }
  window.SyariahKripto = s => Object.assign({ label: SY_LABEL[syStatus(s).k] }, syStatus(s));
  const syBadge = s => { const k = syStatus(s).k; return `<span class="sy sy-${k}">${SY_LABEL[k]}</span>`; };
  function paintSyariah() {
    const st = syStatus(chartSym), el = $('#syInfo');
    if (!el) return;
    el.innerHTML = `<div class="sy-head"><b>${esc(chartSym)}</b>${syBadge(chartSym)}</div>
      <p class="small">${esc(st.why)}</p>
      <p class="source">Sumber: <a href="${st.src[1]}" target="_blank" rel="noopener">${esc(st.src[0])}</a>, disemak ${SY_CHECKED}.</p>`;
  }
  const DEFAULT = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'LINK'];

  let syms = store.get('cryptoSyms', DEFAULT).filter(s => /^[A-Z0-9]{1,15}$/.test(s));
  if (!Array.isArray(syms) || !syms.length) syms = DEFAULT.slice();
  const data = {};
  let ws = null, wsRetry = 0, geckoTimer = null, reconnectTimer = null;
  let chartSym = syms[0], chartTf = '1h', chart = null, series = null, volSeries = null, klineWs = null;
  let alerts = store.get('alerts', []);
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmt = p => p == null || isNaN(p) ? '' : p >= 1 ? usd.format(p) : '$' + p.toPrecision(4);

  let cryptoState = [false, 'Menyambung'], homeSeg = store.get('homeSeg', 'crypto') === 'stock' ? 'stock' : 'crypto';
  function liveText(sel, on, text) { const el = $(sel); el.textContent = text; el.classList.toggle('on', on); }
  function setStatus(on, text) {
    cryptoState = [on, text];
    liveText('#cryptoStatus', on, text);
    if (homeSeg === 'crypto') liveText('#homeLive', on, text);
  }

  function rowHTML(s, prefix, removable) {
    const c = COLORS[s] || 'var(--brand)';
    return `<div class="qrow" role="button" tabindex="0" data-sym="${s}" id="${prefix}-${s}">
      ${LOGOS.includes(s) ? `<span class="coin logo"><img src="icons/kripto/${s.toLowerCase()}.svg" alt="" width="34" height="34" loading="lazy" decoding="async"></span>` : `<span class="coin" style="--c:${c}">${esc(s.slice(0, 1))}</span>`}
      <span style="min-width:0"><div class="q-sym">${esc(s)} ${syBadge(s)}</div><div class="q-name">${esc(NAMES[s] || s + '/USDT')}</div></span>
      <svg class="spark" viewBox="0 0 64 28" preserveAspectRatio="none" aria-hidden="true"></svg>
      <span class="q-right"><div class="q-price"><span class="skeleton"></span></div><div class="q-chg">&nbsp;</div></span>
      ${removable ? `<button class="q-del" data-del="${s}" aria-label="Buang ${s}">${icon('x')}</button>` : ''}
    </div>`;
  }
  function renderRows() {
    $('#cryptoTicker').innerHTML = syms.map(s => rowHTML(s, 'c', true)).join('');
    $('#homeTicker').innerHTML = syms.slice(0, 5).map(s => rowHTML(s, 'h', false)).join('');
    $('#alSym').innerHTML = syms.map(s => `<option>${esc(s)}</option>`).join('');
    markSelected();
    syms.forEach(s => paint(s));
  }
  function markSelected() { $$('#cryptoTicker .qrow').forEach(r => r.classList.toggle('sel', r.dataset.sym === chartSym)); paintSyariah(); }

  function paint(s, prev) {
    const d = data[s]; if (!d || d.price == null) return;
    ['c', 'h'].forEach(p => {
      const el = document.getElementById(p + '-' + s); if (!el) return;
      el.querySelector('.q-price').textContent = fmt(d.price);
      const ch = el.querySelector('.q-chg');
      ch.textContent = (d.chg >= 0 ? '+' : '') + d.chg.toFixed(2) + '%';
      ch.className = 'q-chg ' + (d.chg >= 0 ? 'up' : 'down');
      if (prev != null && prev !== d.price) {
        el.classList.remove('tick-up', 'tick-down'); void el.offsetWidth;
        el.classList.add(d.price > prev ? 'tick-up' : 'tick-down');
        clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('tick-up', 'tick-down'), 350);
      }
      if (d.spark && d.spark.length > 1) {
        const pts = d.spark.concat(d.price), mn = Math.min(...pts), mx = Math.max(...pts), r = mx - mn || 1;
        const path = pts.map((v, i) => `${(i / (pts.length - 1) * 64).toFixed(1)},${(26 - (v - mn) / r * 24).toFixed(1)}`).join(' ');
        el.querySelector('.spark').innerHTML = `<polyline points="${path}" fill="none" stroke="${d.chg >= 0 ? 'var(--up)' : 'var(--down)'}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
      }
    });
  }

  async function snapshot() {
    try {
      const q = encodeURIComponent(JSON.stringify(syms.map(s => s + 'USDT')));
      const r = await fetch(`${REST}/ticker/24hr?symbols=${q}`);
      if (!r.ok) throw new Error(r.status);
      (await r.json()).forEach(t => {
        const s = t.symbol.replace(/USDT$/, '');
        data[s] = Object.assign(data[s] || {}, { price: +t.lastPrice, chg: +t.priceChangePercent });
        paint(s);
      });
      syms.forEach(async s => {
        try {
          const k = await (await fetch(`${REST}/klines?symbol=${s}USDT&interval=1h&limit=24`)).json();
          if (Array.isArray(k)) { data[s] = data[s] || {}; data[s].spark = k.map(x => +x[4]); paint(s); }
        } catch {}
      });
      return true;
    } catch { return false; }
  }

  function connect() {
    clearTimeout(reconnectTimer);
    if (ws) { ws.onclose = null; ws.onerror = null; ws.close(); }
    ws = new WebSocket(WS + syms.map(s => s.toLowerCase() + 'usdt@miniTicker').join('/'));
    ws.onopen = () => { wsRetry = 0; setStatus(true, 'Masa nyata'); stopGecko(); };
    ws.onmessage = e => {
      const m = JSON.parse(e.data).data; if (!m) return;
      const s = m.s.replace(/USDT$/, ''), prev = data[s] && data[s].price;
      const price = +m.c, open = +m.o;
      data[s] = Object.assign(data[s] || {}, { price, chg: (price / open - 1) * 100 });
      paint(s, prev); checkAlerts(s, price);
    };
    ws.onclose = () => {
      setStatus(false, 'Menyambung semula');
      startGecko();
      reconnectTimer = setTimeout(connect, Math.min(30000, 2000 * 2 ** wsRetry++));
    };
    ws.onerror = () => ws.close();
  }

  async function gecko() {
    const ids = syms.map(s => GECKO_IDS[s]).filter(Boolean);
    if (!ids.length) return;
    try {
      const r = await (await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`)).json();
      syms.forEach(s => {
        const g = r[GECKO_IDS[s]]; if (!g) return;
        const prev = data[s] && data[s].price;
        data[s] = Object.assign(data[s] || {}, { price: g.usd, chg: g.usd_24h_change || 0 });
        paint(s, prev); checkAlerts(s, g.usd);
      });
      if (!ws || ws.readyState !== 1) setStatus(true, 'Setiap 30 saat');
    } catch { if (!ws || ws.readyState !== 1) setStatus(false, 'Luar talian'); }
  }
  function startGecko() { if (!geckoTimer) { gecko(); geckoTimer = setInterval(gecko, 30000); } }
  function stopGecko() { clearInterval(geckoTimer); geckoTimer = null; }

  /* Carta lilin */
  const TFS = { '15m': '15m', '1h': '1J', '4h': '4J', '1d': '1H', '1w': '1M' };
  function chartColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = n => cs.getPropertyValue(n).trim();
    return { text: g('--muted'), grid: g('--border'), up: g('--up'), down: g('--down') };
  }
  async function initChart() {
    try { await loadScript('js/vendor/lightweight-charts.js'); }
    catch { $('#cryptoChart').innerHTML = '<p class="muted center" style="padding:40px 0">Carta tidak dapat dimuatkan. Semak sambungan internet.</p>'; return; }
    const c = chartColors();
    chart = LightweightCharts.createChart($('#cryptoChart'), {
      autoSize: true, layout: { background: { color: 'transparent' }, textColor: c.text, fontFamily: getComputedStyle(document.body).fontFamily },
      grid: { vertLines: { visible: false }, horzLines: { color: c.grid } }, timeScale: { timeVisible: true, borderColor: c.grid }, rightPriceScale: { borderColor: c.grid },
      localization: { locale: 'en-GB' }, crosshair: { mode: 0 }, handleScale: { axisPressedMouseMove: false }
    });
    series = chart.addCandlestickSeries({ upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down, borderVisible: false });
    volSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol', lastValueVisible: false, priceLineVisible: false });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    loadChart();
  }
  const tz = () => -new Date().getTimezoneOffset() * 60;
  async function loadChart() {
    $('#chartTitle').textContent = `${chartSym}/USDT`;
    document.dispatchEvent(new CustomEvent('chartsym', { detail: chartSym }));
    if (!series) return;
    const c = chartColors();
    try {
      const k = await (await fetch(`${REST}/klines?symbol=${chartSym}USDT&interval=${chartTf}&limit=300`)).json();
      series.setData(k.map(x => ({ time: x[0] / 1000 + tz(), open: +x[1], high: +x[2], low: +x[3], close: +x[4] })));
      volSeries.setData(k.map(x => ({ time: x[0] / 1000 + tz(), value: +x[5], color: (+x[4] >= +x[1] ? c.up : c.down) + '40' })));
      chart.timeScale().fitContent();
    } catch { toast('Gagal memuat data carta.'); }
    if (klineWs) { klineWs.onmessage = null; klineWs.close(); }
    klineWs = new WebSocket(`wss://data-stream.binance.vision/ws/${chartSym.toLowerCase()}usdt@kline_${chartTf}`);
    klineWs.onmessage = e => {
      const k = JSON.parse(e.data).k;
      series.update({ time: k.t / 1000 + tz(), open: +k.o, high: +k.h, low: +k.l, close: +k.c });
      volSeries.update({ time: k.t / 1000 + tz(), value: +k.v, color: (+k.c >= +k.o ? c.up : c.down) + '40' });
    };
  }
  $('#tfTabs').innerHTML = Object.entries(TFS).map(([k, v]) => `<button class="seg ${k === chartTf ? 'active' : ''}" data-tf="${k}">${v}</button>`).join('');
  $('#tfTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tf]'); if (!b) return;
    chartTf = b.dataset.tf; $$('#tfTabs .seg').forEach(t => t.classList.toggle('active', t === b)); loadChart();
  });

  function onRow(e, home) {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      if (syms.length <= 1) return toast('Sekurang-kurangnya satu kripto diperlukan.');
      syms = syms.filter(s => s !== del.dataset.del); store.set('cryptoSyms', syms);
      if (chartSym === del.dataset.del) { chartSym = syms[0]; loadChart(); }
      renderRows(); connect(); return;
    }
    const r = e.target.closest('.qrow'); if (!r) return;
    if (home) { store.set('marketSeg', 'crypto'); chartSym = r.dataset.sym; location.hash = '#pasaran'; loadChart(); markSelected(); return; }
    chartSym = r.dataset.sym; markSelected(); loadChart();
    $('.chart-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('#cryptoTicker').addEventListener('click', e => onRow(e, false));
  $('#homeTicker').addEventListener('click', e => onRow(e, true));
  [$('#cryptoTicker'), $('#homeTicker')].forEach(el => el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('qrow')) { e.preventDefault(); e.target.click(); } }));
  $('#editList').addEventListener('click', () => {
    const on = $('#cryptoTicker').classList.toggle('editing');
    $('#editList').textContent = on ? 'Selesai' : 'Edit';
  });

  $('#addSymForm').addEventListener('submit', async e => {
    e.preventDefault();
    const s = $('#addSym').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/USDT$/, '');
    if (!s) return;
    if (syms.includes(s)) return toast(s + ' sudah ada dalam senarai.');
    try {
      const r = await fetch(`${REST}/ticker/price?symbol=${s}USDT`);
      if (!r.ok) throw 0;
      syms.push(s); store.set('cryptoSyms', syms); $('#addSym').value = '';
      renderRows(); await snapshot(); connect(); toast(s + ' ditambah');
    } catch { toast(`${s} tidak ditemui sebagai pasangan USDT.`); }
  });

  /* Amaran harga: percuma sehingga FREE_ALERTS amaran harga aktif. Premium: tanpa had, amaran naik/turun % dalam 24 jam,
     dan amaran apabila status Syariah kripto dalam senarai berubah. Disemak semasa app dibuka. */
  const FREE_ALERTS = 3;
  const isPro = () => typeof Premium !== 'undefined' && !!Premium.plan;
  const AL_TXT = { above: 'melebihi', below: 'di bawah', up: 'naik sekurang-kurangnya', down: 'turun sekurang-kurangnya' };
  const alVal = a => a.dir === 'up' || a.dir === 'down' ? a.price + '% dalam 24 jam' : fmt(a.price);
  function renderAlerts() {
    $('#alList').innerHTML = alerts.map((a, i) => `<div class="alert-item"><span><b>${esc(a.sym)}</b> ${AL_TXT[a.dir] || ''} <span class="num">${alVal(a)}</span></span><button class="btn sm ghost" data-ai="${i}">Buang</button></div>`).join('');
    const n = $('#alNote');
    if (n) n.textContent = isPro() ? 'Premium: amaran tanpa had, termasuk naik atau turun % dalam 24 jam.' : `Percuma: sehingga ${FREE_ALERTS} amaran harga. Premium: tanpa had, amaran naik atau turun %, dan amaran status Syariah.`;
  }
  function checkAlerts(s, p) {
    let changed = false;
    const chg = data[s] && data[s].chg;
    alerts = alerts.filter(a => {
      if (a.sym !== s) return true;
      const hit = a.dir === 'above' ? p >= a.price : a.dir === 'below' ? p <= a.price
        : chg == null ? false : a.dir === 'up' ? chg >= a.price : -chg >= a.price;
      if (hit) {
        if (a.dir === 'up' || a.dir === 'down') Notify.show(`${s} ${a.dir === 'up' ? 'naik' : 'turun'} ${Math.abs(chg).toFixed(1)}% dalam 24 jam`, `Harga semasa ${fmt(p)}`);
        else Notify.show(`${s} ${a.dir === 'above' ? 'melebihi' : 'jatuh di bawah'} ${fmt(a.price)}`, `Harga semasa ${fmt(p)}`);
        changed = true;
      }
      return !hit;
    });
    if (changed) { store.set('alerts', alerts); renderAlerts(); }
  }
  $('#alDir').addEventListener('change', () => { const pc = /up|down/.test($('#alDir').value); $('#alPrice').placeholder = pc ? 'Peratus (%)' : 'Harga (USD)'; });
  $('#alForm').addEventListener('submit', async e => {
    e.preventDefault();
    const price = parseFloat($('#alPrice').value), dir = $('#alDir').value, pc = dir === 'up' || dir === 'down';
    if (!(price > 0)) return toast(pc ? 'Masukkan peratus perubahan.' : 'Masukkan harga sasaran.');
    if (pc && !isPro()) return toast('Amaran naik atau turun % ialah ciri Premium.', 3500);
    if (!isPro() && alerts.length >= FREE_ALERTS) return toast(`Had percuma ${FREE_ALERTS} amaran. Buang satu amaran, atau naik taraf ke Premium untuk tanpa had.`, 4500);
    alerts.push({ sym: $('#alSym').value, dir, price });
    store.set('alerts', alerts); renderAlerts(); $('#alPrice').value = '';
    if (!Notify.granted()) await Notify.request();
    toast('Amaran ditambah');
  });
  $('#alList').addEventListener('click', e => {
    const b = e.target.closest('[data-ai]'); if (!b) return;
    alerts.splice(+b.dataset.ai, 1); store.set('alerts', alerts); renderAlerts();
  });
  // Amaran status Syariah (Premium): bandingkan status semasa dengan status yang terakhir dilihat
  function checkSyariah() {
    const last = store.get('syLast', {}), now = {}, berubah = [];
    syms.forEach(s => { now[s] = syStatus(s).k; if (last[s] && last[s] !== now[s]) berubah.push(s); });
    store.set('syLast', now);
    if (isPro()) berubah.forEach(s => Notify.show(`Status Syariah ${s} berubah`, `${SY_LABEL[last[s]]} kepada ${SY_LABEL[now[s]]}. ${syStatus(s).why}`));
  }
  document.addEventListener('premiumchange', () => { renderAlerts(); checkSyariah(); });

  /* Saham AS: widget TradingView */
  const STOCKS = [['NASDAQ:AAPL', 'Apple'], ['NASDAQ:NVDA', 'Nvidia'], ['NASDAQ:TSLA', 'Tesla'], ['NASDAQ:MSFT', 'Microsoft'], ['NASDAQ:GOOGL', 'Alphabet'],
    ['NASDAQ:AMZN', 'Amazon'], ['NASDAQ:META', 'Meta'], ['AMEX:SPY', 'S&P 500 ETF'], ['NASDAQ:QQQ', 'Nasdaq 100 ETF'], ['NASDAQ:FUTU', 'Futu']];
  const BURSA = [['MAYBANK', '1155', 'Malayan Banking'], ['PBBANK', '1295', 'Public Bank'], ['CIMB', '1023', 'CIMB Group'], ['TENAGA', '5347', 'Tenaga Nasional'],
    ['PCHEM', '5183', 'Petronas Chemicals'], ['IHH', '5225', 'IHH Healthcare'], ['GAMUDA', '5398', 'Gamuda'], ['YTLPOWR', '6742', 'YTL Power']];
  let stockSym = store.get('stockSym', 'NASDAQ:AAPL');
  if (/^MYX:/.test(stockSym)) stockSym = 'NASDAQ:AAPL';
  function tvWidget(el, name, cfg) {
    el.innerHTML = '<div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div></div>';
    const s = document.createElement('script');
    s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${name}.js`; s.async = true;
    s.textContent = JSON.stringify(Object.assign({ colorTheme: isDark() ? 'dark' : 'light', isTransparent: true, locale: 'en' }, cfg));
    el.firstChild.appendChild(s);
  }
  function loadStock() {
    tvWidget($('#tvStock'), 'advanced-chart', { symbol: stockSym, interval: 'D', timezone: 'Asia/Kuala_Lumpur', style: '1', allow_symbol_change: true, autosize: true, hide_side_toolbar: true, save_image: false, support_host: 'https://www.tradingview.com' });
  }
  function renderStockTabs() {
    $('#stockTabs').innerHTML = STOCKS.map(([s, n]) => `<button class="chip ${s === stockSym ? 'active' : ''}" data-s="${s}">${esc(n)}</button>`).join('');
  }
  $('#stockTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    stockSym = b.dataset.s; store.set('stockSym', stockSym); renderStockTabs(); loadStock();
  });
  $('#stockForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#stockSearch').value.trim().toUpperCase().replace(/\s+/g, '');
    if (!v) return;
    stockSym = v; store.set('stockSym', v); renderStockTabs(); loadStock();
  });
  $('#bursaList').innerHTML = BURSA.map(([t, code, n]) => `<a class="qrow" href="https://www.tradingview.com/symbols/MYX-${t}/" target="_blank" rel="noopener">
      <span class="coin" style="--c:var(--brand)">${esc(t.slice(0, 1))}</span>
      <span style="min-width:0"><div class="q-sym">${esc(t)} <span class="muted small num">${code}</span></div><div class="q-name">${esc(n)}</div></span>
      <span></span><span class="q-right muted">${icon('link')}</span></a>`).join('');
  let tvLoaded = false;
  function loadTV() {
    tvLoaded = true; renderStockTabs(); loadStock();
    tvWidget($('#tvMovers'), 'hotlists', { exchange: 'US', showChart: false, width: '100%', height: '100%', dateRange: '1D' });
  }

  /* Halaman utama: suis Kripto / Saham. Harga saham daripada pelayan nota (Yahoo Finance, cache 60 saat) */
  const STOCK_API = 'https://nota.bijaklabur.my/saham';
  const HOME_STOCKS = STOCKS.slice(0, 5).map(([tv, n]) => ({ tv, n, s: tv.split(':')[1], ex: tv.split(':')[0] }));
  const STOCK_LOGOS = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL'];   // icons/saham/*.svg
  const STOCK_COLORS = { AAPL: '#555', NVDA: '#76b900', TSLA: '#cc0000', MSFT: '#00a4ef', GOOGL: '#4285f4' };
  const stockData = store.get('homeStockQuotes', {});
  let stockTimer = null, stockOk = false;
  $('#homeStocks').innerHTML = HOME_STOCKS.map(({ tv, n, s, ex }) => `<div class="qrow" role="button" tabindex="0" data-tv="${esc(tv)}" id="hs-${esc(s)}">
      ${STOCK_LOGOS.includes(s) ? `<span class="coin logo"><img src="icons/saham/${s.toLowerCase()}.svg" alt="" width="34" height="34" loading="lazy" decoding="async"></span>` : `<span class="coin tk" style="--c:${STOCK_COLORS[s] || 'var(--brand)'}">${esc(s.slice(0, 4))}</span>`}
      <span style="min-width:0"><div class="q-sym">${esc(s)} <span class="sy sy-belum">${esc(ex)}</span></div><div class="q-name">${esc(n)}</div></span>
      <svg class="spark" viewBox="0 0 64 28" preserveAspectRatio="none" aria-hidden="true"></svg>
      <span class="q-right"><div class="q-price"><span class="skeleton"></span></div><div class="q-chg">&nbsp;</div></span>
    </div>`).join('');
  function paintStock(q) {
    const el = document.getElementById('hs-' + q.s); if (!el || !(q.price > 0)) return;
    el.querySelector('.q-price').textContent = fmt(q.price);
    const ch = el.querySelector('.q-chg'), up = q.chg >= 0;
    ch.textContent = (up ? '+' : '') + (+q.chg).toFixed(2) + '%';
    ch.className = 'q-chg ' + (up ? 'up' : 'down');
    if (Array.isArray(q.spark) && q.spark.length > 1) {
      const pts = q.spark.concat(q.price), mn = Math.min(...pts), mx = Math.max(...pts), r = mx - mn || 1;
      const path = pts.map((v, i) => `${(i / (pts.length - 1) * 64).toFixed(1)},${(26 - (v - mn) / r * 24).toFixed(1)}`).join(' ');
      el.querySelector('.spark').innerHTML = `<polyline points="${path}" fill="none" stroke="${up ? 'var(--up)' : 'var(--down)'}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    }
  }
  function stockStatus() {
    if (homeSeg !== 'stock') return;
    const t = Object.values(stockData).reduce((m, q) => Math.max(m, q.time || 0), 0);
    const open = t && Date.now() / 1000 - t < 20 * 60;
    liveText('#homeLive', stockOk && open, !stockOk ? (t ? 'Harga terakhir' : 'Menyambung') : open ? 'Masa nyata' : 'Pasaran tutup');
  }
  async function loadStocks() {
    try {
      const r = await fetch(`${STOCK_API}?s=${HOME_STOCKS.map(x => x.s).join(',')}`);
      if (!r.ok) throw 0;
      (await r.json()).quotes.forEach(q => { if (q && typeof q.s === 'string') { stockData[q.s] = q; paintStock(q); } });
      store.set('homeStockQuotes', stockData); stockOk = true;
    } catch {
      stockOk = false;
      HOME_STOCKS.forEach(({ s }) => { const el = !stockData[s] && document.getElementById('hs-' + s); if (el) el.querySelector('.q-price').textContent = '-'; });
    }
    stockStatus();
  }
  function showHomeSeg(seg) {
    homeSeg = seg; store.set('homeSeg', seg);
    $$('#homeSeg .seg').forEach(b => { const on = b.dataset.hseg === seg; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    $('#homeTicker').classList.toggle('hidden', seg !== 'crypto');
    $('#homeStocks').classList.toggle('hidden', seg !== 'stock');
    clearInterval(stockTimer); stockTimer = null;
    if (seg === 'stock') { stockStatus(); loadStocks(); stockTimer = setInterval(() => { if (!document.hidden) loadStocks(); }, 60000); }
    else liveText('#homeLive', cryptoState[0], cryptoState[1]);
  }
  Object.values(stockData).forEach(paintStock);
  $('#homeSeg').addEventListener('click', e => { const b = e.target.closest('[data-hseg]'); if (b) showHomeSeg(b.dataset.hseg); });
  $('#homeSeg').addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const next = homeSeg === 'crypto' ? 'stock' : 'crypto';
    showHomeSeg(next); $(`#homeSeg [data-hseg="${next}"]`).focus();
  });
  $('#homeMore').addEventListener('click', () => store.set('marketSeg', homeSeg));
  $('#homeStocks').addEventListener('click', e => {
    const r = e.target.closest('.qrow'); if (!r) return;
    stockSym = r.dataset.tv; store.set('stockSym', stockSym); store.set('marketSeg', 'stock');
    if (tvLoaded) { renderStockTabs(); loadStock(); }
    location.hash = '#pasaran';
  });
  $('#homeStocks').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('qrow')) { e.preventDefault(); e.target.click(); } });

  /* Kawalan Kripto/Saham */
  function showSeg(seg) {
    $$('.seg[data-seg]').forEach(b => { const on = b.dataset.seg === seg; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    $('#seg-crypto').classList.toggle('hidden', seg !== 'crypto');
    $('#seg-stock').classList.toggle('hidden', seg !== 'stock');
    store.set('marketSeg', seg);
    if (seg === 'stock' && !tvLoaded) loadTV();
    if (seg === 'crypto' && !chart) initChart();
  }
  $$('.seg[data-seg]').forEach(b => b.addEventListener('click', () => showSeg(b.dataset.seg)));

  document.addEventListener('viewchange', e => { if (e.detail === 'pasaran') showSeg(store.get('marketSeg', 'crypto')); });
  document.addEventListener('themechange', () => {
    if (tvLoaded) loadTV();
    if (chart) {
      const c = chartColors();
      chart.applyOptions({ layout: { textColor: c.text }, grid: { horzLines: { color: c.grid } }, timeScale: { borderColor: c.grid }, rightPriceScale: { borderColor: c.grid } });
      series.applyOptions({ upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down });
    }
  });

  renderRows(); renderAlerts(); showHomeSeg(homeSeg);
  snapshot().then(ok => { if (!ok) startGecko(); });
  connect();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (homeSeg === 'stock') loadStocks();
    if (!ws || ws.readyState > 1) connect();
    snapshot();
  });
})();
