/* Pasaran Live: kripto masa nyata (Binance WebSocket) + saham (widget TradingView) */
(function () {
  const REST = 'https://data-api.binance.vision/api/v3';
  const WS = 'wss://data-stream.binance.vision/stream?streams=';
  const GECKO_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', DOGE: 'dogecoin', ADA: 'cardano', LINK: 'chainlink', AVAX: 'avalanche-2', TRX: 'tron', DOT: 'polkadot', LTC: 'litecoin', SHIB: 'shiba-inu', TON: 'the-open-network', SUI: 'sui', PEPE: 'pepe' };
  const COLORS = { BTC: '#f7931a', ETH: '#627eea', SOL: '#14f195', BNB: '#f3ba2f', XRP: '#23292f', DOGE: '#c2a633', ADA: '#0033ad', LINK: '#2a5ada' };
  const NAMES = { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', BNB: 'BNB', XRP: 'XRP', DOGE: 'Dogecoin', ADA: 'Cardano', LINK: 'Chainlink' };

  let syms = store.get('cryptoSyms', ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'LINK']);
  const data = {};      // sym -> {price, open, chg, spark:[]}
  let ws = null, wsRetry = 0, geckoTimer = null;
  let chartSym = 'BTC', chartTf = '1h', chart = null, series = null, volSeries = null, klineWs = null;
  let alerts = store.get('alerts', []);

  const fmt = p => p == null ? '–' : '$' + (p >= 1000 ? p.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
    : p >= 1 ? p.toFixed(p >= 100 ? 2 : 3) : p.toPrecision(4));

  function setStatus(live, text) {
    ['#cryptoStatus', '#homeLive'].forEach(s => { const el = $(s); el.textContent = text; el.classList.toggle('off', !live); });
  }

  function cardHTML(s, compact) {
    const c = COLORS[s] || 'var(--brand)';
    return `<div class="card tick" data-sym="${s}" id="${compact ? 'h' : 'c'}-${s}">
      <div class="sym"><span style="width:22px;height:22px;border-radius:50%;background:${c};display:inline-grid;place-items:center;color:#fff;font-size:.7rem">${s[0]}</span>${s}<span class="muted small" style="font-weight:500">${NAMES[s] || ''}</span>
      ${compact ? '' : `<button class="muted" data-del="${s}" title="Buang" aria-label="Buang ${s}" style="margin-left:auto;background:none;border:0;cursor:pointer;color:var(--muted)">✕</button>`}</div>
      <div class="price mono">–</div><div class="chg mono">–</div><svg class="spark" viewBox="0 0 100 40" preserveAspectRatio="none"></svg></div>`;
  }
  function renderCards() {
    $('#cryptoTicker').innerHTML = syms.map(s => cardHTML(s)).join('');
    $('#homeTicker').innerHTML = syms.slice(0, 4).map(s => cardHTML(s, true)).join('');
    $('#alSym').innerHTML = syms.map(s => `<option>${s}</option>`).join('');
    syms.forEach(paint);
  }
  function paint(s, prev) {
    const d = data[s]; if (!d) return;
    ['c', 'h'].forEach(p => {
      const el = document.getElementById(p + '-' + s); if (!el) return;
      el.querySelector('.price').textContent = fmt(d.price);
      const ch = el.querySelector('.chg');
      ch.textContent = (d.chg >= 0 ? '▲ +' : '▼ ') + d.chg.toFixed(2) + '% (24j)';
      ch.className = 'chg mono ' + (d.chg >= 0 ? 'up' : 'down');
      if (prev != null && prev !== d.price) {
        el.classList.remove('flash-up', 'flash-down'); void el.offsetWidth;
        el.classList.add(d.price > prev ? 'flash-up' : 'flash-down');
      }
      if (d.spark && d.spark.length > 1) {
        const pts = d.spark.concat(d.price), mn = Math.min(...pts), mx = Math.max(...pts), r = mx - mn || 1;
        const path = pts.map((v, i) => `${(i / (pts.length - 1) * 100).toFixed(2)},${(38 - (v - mn) / r * 36).toFixed(2)}`).join(' ');
        const col = d.chg >= 0 ? 'var(--up)' : 'var(--down)';
        el.querySelector('.spark').innerHTML = `<polyline points="${path}" fill="none" stroke="${col}" stroke-width="1.8" vector-effect="non-scaling-stroke"/>`;
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
        data[s] = Object.assign(data[s] || {}, { price: +t.lastPrice, open: +t.openPrice, chg: +t.priceChangePercent });
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
    if (ws) { ws.onclose = null; ws.close(); }
    const streams = syms.map(s => s.toLowerCase() + 'usdt@miniTicker').join('/');
    ws = new WebSocket(WS + streams);
    ws.onopen = () => { wsRetry = 0; setStatus(true, 'LIVE · masa nyata'); stopGecko(); };
    ws.onmessage = e => {
      const m = JSON.parse(e.data).data; if (!m) return;
      const s = m.s.replace(/USDT$/, ''), prev = data[s] && data[s].price;
      const price = +m.c, open = +m.o;
      data[s] = Object.assign(data[s] || {}, { price, open, chg: (price / open - 1) * 100 });
      paint(s, prev); checkAlerts(s, price);
    };
    ws.onclose = () => {
      setStatus(false, 'Menyambung semula…');
      startGecko();
      setTimeout(connect, Math.min(30000, 2000 * 2 ** wsRetry++));
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
      if (!ws || ws.readyState !== 1) setStatus(true, 'Dikemas kini setiap 30s (CoinGecko)');
    } catch {}
  }
  function startGecko() { if (!geckoTimer) { gecko(); geckoTimer = setInterval(gecko, 30000); } }
  function stopGecko() { clearInterval(geckoTimer); geckoTimer = null; }

  /* Carta lilin kripto */
  const TFS = { '1m': '1 min', '15m': '15 min', '1h': '1 jam', '4h': '4 jam', '1d': '1 hari' };
  function chartColors() {
    const cs = getComputedStyle(document.documentElement);
    return { text: cs.getPropertyValue('--muted').trim(), grid: cs.getPropertyValue('--border').trim(), up: cs.getPropertyValue('--up').trim(), down: cs.getPropertyValue('--down').trim() };
  }
  async function initChart() {
    try { await loadScript('https://cdn.jsdelivr.net/npm/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js'); }
    catch { $('#cryptoChart').innerHTML = '<p class="muted" style="padding:20px">Carta tidak dapat dimuatkan.</p>'; return; }
    const c = chartColors(), el = $('#cryptoChart');
    chart = LightweightCharts.createChart(el, {
      autoSize: true, layout: { background: { color: 'transparent' }, textColor: c.text, fontFamily: 'Plus Jakarta Sans, system-ui' },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } }, timeScale: { timeVisible: true, borderColor: c.grid }, rightPriceScale: { borderColor: c.grid }
    });
    series = chart.addCandlestickSeries({ upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down, borderVisible: false });
    volSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    loadChart();
  }
  async function loadChart() {
    if (!series) return;
    $('#chartTitle').textContent = `${chartSym}/USDT · ${TFS[chartTf]}`;
    const c = chartColors();
    try {
      const k = await (await fetch(`${REST}/klines?symbol=${chartSym}USDT&interval=${chartTf}&limit=300`)).json();
      const tz = -new Date().getTimezoneOffset() * 60; // papar waktu tempatan
      series.setData(k.map(x => ({ time: x[0] / 1000 + tz, open: +x[1], high: +x[2], low: +x[3], close: +x[4] })));
      volSeries.setData(k.map(x => ({ time: x[0] / 1000 + tz, value: +x[5], color: (+x[4] >= +x[1] ? c.up : c.down) + '55' })));
      chart.timeScale().fitContent();
    } catch { toast('Gagal memuat data carta.'); }
    if (klineWs) { klineWs.onclose = null; klineWs.close(); }
    klineWs = new WebSocket(`wss://data-stream.binance.vision/ws/${chartSym.toLowerCase()}usdt@kline_${chartTf}`);
    klineWs.onmessage = e => {
      const k = JSON.parse(e.data).k, tz = -new Date().getTimezoneOffset() * 60;
      series.update({ time: k.t / 1000 + tz, open: +k.o, high: +k.h, low: +k.l, close: +k.c });
      volSeries.update({ time: k.t / 1000 + tz, value: +k.v, color: (+k.c >= +k.o ? c.up : c.down) + '55' });
    };
  }
  $('#tfTabs').innerHTML = Object.entries(TFS).map(([k, v]) => `<button class="tab ${k === chartTf ? 'active' : ''}" data-tf="${k}">${v}</button>`).join('');
  $('#tfTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tf]'); if (!b) return;
    chartTf = b.dataset.tf; $$('#tfTabs .tab').forEach(t => t.classList.toggle('active', t === b)); loadChart();
  });
  $('#cryptoTicker').addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation(); syms = syms.filter(s => s !== del.dataset.del); store.set('cryptoSyms', syms); renderCards(); connect(); return;
    }
    const t = e.target.closest('.tick'); if (!t) return;
    chartSym = t.dataset.sym; loadChart(); $('#cryptoChart').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('#homeTicker').addEventListener('click', e => { if (e.target.closest('.tick')) location.hash = '#pasaran'; });

  $('#addSymBtn').addEventListener('click', async () => {
    const s = $('#addSym').value.trim().toUpperCase().replace(/USDT$/, '');
    if (!s || syms.includes(s)) return;
    try {
      const r = await fetch(`${REST}/ticker/price?symbol=${s}USDT`);
      if (!r.ok) throw 0;
      syms.push(s); store.set('cryptoSyms', syms); $('#addSym').value = '';
      renderCards(); await snapshot(); connect(); toast(s + ' ditambah');
    } catch { toast('Simbol tidak dijumpai sebagai pasangan USDT.'); }
  });

  /* Amaran harga */
  function renderAlerts() {
    $('#alList').innerHTML = alerts.length ? alerts.map((a, i) => `<div class="alert-item"><span>${a.sym} ${a.dir === 'above' ? '≥' : '≤'} ${fmt(a.price)}</span><button class="btn sm ghost" data-ai="${i}">Buang</button></div>`).join('')
      : '<p class="muted small">Tiada amaran lagi.</p>';
  }
  function checkAlerts(s, p) {
    let changed = false;
    alerts = alerts.filter(a => {
      if (a.sym !== s) return true;
      const hit = a.dir === 'above' ? p >= a.price : p <= a.price;
      if (hit) { notify(`🔔 ${s} ${a.dir === 'above' ? 'melebihi' : 'di bawah'} ${fmt(a.price)}`, `Harga semasa ${fmt(p)}`); changed = true; }
      return !hit;
    });
    if (changed) { store.set('alerts', alerts); renderAlerts(); }
  }
  $('#alAdd').addEventListener('click', async () => {
    const price = parseFloat($('#alPrice').value); if (!price) return toast('Masukkan harga.');
    alerts.push({ sym: $('#alSym').value, dir: $('#alDir').value, price });
    store.set('alerts', alerts); renderAlerts(); $('#alPrice').value = '';
    if ('Notification' in window && Notification.permission === 'default') askNotify();
    toast('Amaran ditambah');
  });
  $('#alList').addEventListener('click', e => {
    const b = e.target.closest('[data-ai]'); if (!b) return;
    alerts.splice(+b.dataset.ai, 1); store.set('alerts', alerts); renderAlerts();
  });

  /* Saham: widget TradingView percuma */
  const STOCKS = [
    ['NASDAQ:AAPL', 'Apple'], ['NASDAQ:NVDA', 'Nvidia'], ['NASDAQ:TSLA', 'Tesla'], ['NASDAQ:MSFT', 'Microsoft'],
    ['NASDAQ:GOOGL', 'Google'], ['NASDAQ:AMZN', 'Amazon'], ['NASDAQ:META', 'Meta'], ['AMEX:SPY', 'S&P 500 ETF'],
    ['NASDAQ:FUTU', 'Futu (Moomoo)'], ['MYX:MAYBANK', 'Maybank'], ['MYX:PBBANK', 'Public Bank'], ['MYX:TENAGA', 'TNB'], ['MYX:CIMB', 'CIMB']
  ];
  let stockSym = store.get('stockSym', 'NASDAQ:AAPL');
  function tvWidget(el, name, cfg) {
    el.innerHTML = '<div class="tradingview-widget-container" style="height:100%;width:100%"><div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div></div>';
    const s = document.createElement('script');
    s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${name}.js`; s.async = true;
    s.textContent = JSON.stringify(Object.assign({ colorTheme: isDark() ? 'dark' : 'light', isTransparent: true, locale: 'en' }, cfg));
    el.firstChild.appendChild(s);
  }
  function loadStock() {
    tvWidget($('#tvStock'), 'advanced-chart', { symbol: stockSym, interval: 'D', timezone: 'Asia/Kuala_Lumpur', style: '1', allow_symbol_change: true, autosize: true, hide_side_toolbar: false, studies: ['STD;RSI', 'STD;MACD'] });
  }
  function renderStockTabs() {
    $('#stockTabs').innerHTML = STOCKS.map(([s, n]) => `<button class="tab ${s === stockSym ? 'active' : ''}" data-s="${s}">${n}</button>`).join('');
  }
  $('#stockTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    stockSym = b.dataset.s; store.set('stockSym', stockSym); renderStockTabs(); loadStock();
  });
  $('#stockGo').addEventListener('click', () => {
    const v = $('#stockSearch').value.trim().toUpperCase(); if (!v) return;
    stockSym = v; store.set('stockSym', v); renderStockTabs(); loadStock();
  });
  let tvLoaded = false;
  function loadTV() {
    tvLoaded = true; renderStockTabs(); loadStock();
    tvWidget($('#tvMovers'), 'hotlists', { exchange: 'US', showChart: true, width: '100%', height: '100%', dateRange: '1D' });
    tvWidget($('#tvNews'), 'timeline', { feedMode: 'market', market: 'stock', displayMode: 'regular', width: '100%', height: '100%' });
  }
  function loadTape() {
    const box = document.getElementById('homeTape') || (() => {
      const d = document.createElement('div'); d.id = 'homeTape'; d.className = 'card'; d.style.cssText = 'padding:0;overflow:hidden;margin-bottom:12px;height:78px';
      $('#homeTicker').before(d); return d;
    })();
    tvWidget(box, 'ticker-tape', { symbols: STOCKS.slice(0, 10).map(([s, n]) => ({ proName: s, title: n })), showSymbolLogo: true, displayMode: 'adaptive' });
  }

  document.addEventListener('viewchange', e => {
    if (e.detail === 'pasaran') { if (!tvLoaded) loadTV(); if (!chart) initChart(); }
  });
  document.addEventListener('themechange', () => {
    loadTape(); if (tvLoaded) loadTV();
    if (chart) { const c = chartColors(); chart.applyOptions({ layout: { textColor: c.text }, grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } } }); }
  });

  renderCards(); renderAlerts(); loadTape();
  snapshot().then(ok => { if (!ok) startGecko(); });
  connect();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (!ws || ws.readyState > 1)) connect(); });
})();
