/* Pasaran: buku pesanan kripto secara langsung (idea daripada cryptofeed, tanpa pustaka).
   Data pasaran Spot awam Binance: gambaran awal melalui REST, kemudian aliran WebSocket depth20.
   Sambungan hanya dibuka semasa kad kelihatan, dan ditutup apabila pengguna beralih halaman. */
(function () {
  const REST = 'https://data-api.binance.vision/api/v3';
  const WSS = 'wss://data-stream.binance.vision/ws/';
  const ROWS = 10;
  const card = $('#obCard');
  if (!card) return;
  let sym = (store.get('cryptoSyms', ['BTC'])[0] || 'BTC'), ws = null, visible = false, retry = 0, retryTimer = null, last = 0;

  const dec = p => p >= 1000 ? 2 : p >= 1 ? 3 : p >= 0.01 ? 5 : 8;
  const fP = (p, d) => p.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fQ = q => q >= 1000 ? q.toLocaleString('en-US', { maximumFractionDigits: 0 }) : q.toLocaleString('en-US', { maximumFractionDigits: 4 });

  function status(on, text) { const el = $('#obStatus'); el.textContent = text; el.classList.toggle('on', on); }

  function paint(bids, asks) {
    bids = bids.slice(0, ROWS).map(([p, q]) => [+p, +q]);
    asks = asks.slice(0, ROWS).map(([p, q]) => [+p, +q]);
    if (!bids.length || !asks.length) return;
    const d = dec(bids[0][0]);
    // Kumulatif untuk bar kedalaman
    let cb = 0, ca = 0;
    const cumB = bids.map(([, q]) => (cb += q)), cumA = asks.map(([, q]) => (ca += q)), max = Math.max(cb, ca);
    const row = (side, [p, q], cum) => `<div class="ob-row ${side}"><span class="ob-bar" style="width:${(cum / max * 100).toFixed(1)}%"></span><span class="num">${fP(p, d)}</span><span class="num">${fQ(q)}</span></div>`;
    $('#obBids').innerHTML = bids.map((b, i) => row('bid', b, cumB[i])).join('');
    $('#obAsks').innerHTML = asks.map((a, i) => row('ask', a, cumA[i])).join('');
    const spread = asks[0][0] - bids[0][0], mid = (asks[0][0] + bids[0][0]) / 2;
    const buy = cb / (cb + ca) * 100;
    $('#obSpread').textContent = `${fP(spread, d)} (${(spread / mid * 100).toFixed(3)}%)`;
    $('#obMid').textContent = fP(mid, d);
    $('#obPress').style.width = buy.toFixed(1) + '%';
    $('#obPressTxt').textContent = `Beli ${buy.toFixed(0)}% · Jual ${(100 - buy).toFixed(0)}%`;
  }

  async function snapshot() {
    try {
      const r = await fetch(`${REST}/depth?symbol=${sym}USDT&limit=${ROWS}`);
      if (!r.ok) throw 0;
      const j = await r.json();
      paint(j.bids, j.asks);
    } catch { status(false, 'Tiada data'); }
  }

  function close() {
    clearTimeout(retryTimer);
    if (ws) { ws.onclose = ws.onmessage = null; ws.close(); ws = null; }
  }
  function open() {
    close();
    if (!visible || document.hidden) return;
    status(false, 'Menyambung');
    snapshot();
    ws = new WebSocket(`${WSS}${sym.toLowerCase()}usdt@depth20@1000ms`);
    ws.onopen = () => { retry = 0; status(true, 'Langsung'); };
    ws.onmessage = e => {
      const now = Date.now();
      if (now - last < 900) return; // cukup sekali sesaat untuk mata
      last = now;
      const j = JSON.parse(e.data);
      paint(j.bids || [], j.asks || []);
    };
    ws.onclose = () => {
      status(false, 'Terputus');
      if (!visible) return;
      retryTimer = setTimeout(open, Math.min(30000, 2000 * 2 ** retry++));
    };
  }

  function setSym(s) {
    if (!s || s === sym) return;
    sym = s;
    $('#obTitle').textContent = `${sym}/USDT`;
    $('#obBids').innerHTML = $('#obAsks').innerHTML = '';
    if (visible) open();
  }

  $('#obTitle').textContent = `${sym}/USDT`;
  document.addEventListener('chartsym', e => setSym(e.detail));
  new IntersectionObserver(es => {
    const v = es.some(x => x.isIntersecting);
    if (v === visible) return;
    visible = v;
    v ? open() : close();
  }).observe(card);
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); else if (visible) open(); });
})();
