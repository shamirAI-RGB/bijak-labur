/* Bijak Labur Premium: portfolio, simulator DCA, zakat pelaburan, penjana rujukan, laporan PDF */
(function () {
  const REST = 'https://data-api.binance.vision/api/v3';
  const rm = new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtRM = v => rm.format(v || 0).replace(/ /g, ' ');
  const pct = v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
  const sign = v => v >= 0 ? 'up' : 'down';
  const numIn = el => { const v = parseFloat(String(el.value).replace(/,/g, '')); return isFinite(v) ? v : NaN; };
  /* ---------- Kadar tukaran USD/MYR ---------- */
  const FX = {
    rate: store.get('fx', { v: 4.2, t: 0, live: false }),
    async get() {
      if (Date.now() - this.rate.t < 6 * 3600e3 && this.rate.live) return this.rate.v;
      try {
        const d = await (await fetch('https://open.er-api.com/v6/latest/USD')).json();
        if (d && d.rates && d.rates.MYR) { this.rate = { v: d.rates.MYR, t: Date.now(), live: true }; store.set('fx', this.rate); }
      } catch {}
      return this.rate.v;
    }
  };

  /* ---------- Senarai alat ---------- */
  const TOOLS = {};
  const ProTools = window.ProTools = {
    // meta: { name, plan, icon, desc, pitch, init, html (pilihan, untuk alat yang dibina dalam JS) }
    add(key, meta) {
      TOOLS[key] = meta;
      if (meta.html && !$('#tool-' + key)) $('#toolsBlock').insertAdjacentHTML('beforeend', `<div class="tool hidden" id="tool-${key}"><div class="tool-body">${meta.html}</div></div>`);
      if (meta.init) meta.init = once(meta.init);
    },
    show(key) { open(key); $('#toolsBlock').scrollIntoView({ block: 'start' }); },
    back() { if (!tool || !$('#view-premium').classList.contains('active')) return false; open(null); return true; },
    kit: null
  };
  let tool = null;
  const GROUPS = [['pelabur', 'Untuk pelabur'], ['pelajar', 'Untuk pelajar']];
  function renderGrid() {
    $('#toolGrid').innerHTML = GROUPS.map(([g, title]) => `<h2 class="grid-title">${title}</h2><div class="tools">${
      Object.entries(TOOLS).filter(([, m]) => m.plan === g).map(([k, m]) => `<button class="tool-card" data-tool="${k}">
        <span class="sc-ico">${icon(m.icon)}</span><span class="tc-body"><span class="tc-name">${m.name}${Premium.has(m.plan) ? '' : icon('lock', 'ic lock')}</span><span class="tc-desc">${m.desc}</span></span></button>`).join('')}</div>`).join('');
  }
  function open(key) {
    tool = key && TOOLS[key] ? key : null;
    $('#toolGrid').classList.toggle('hidden', !!tool);
    $('#toolHead').classList.toggle('hidden', !tool);
    Object.keys(TOOLS).forEach(k => $('#tool-' + k).classList.toggle('hidden', k !== tool));
    if (!tool) { renderGrid(); return; }
    const m = TOOLS[tool], ok = Premium.has(m.plan), el = $('#tool-' + tool);
    $('#toolTitle').textContent = m.name;
    el.querySelector('.tool-body').classList.toggle('hidden', !ok);
    let lock = el.querySelector('.locked');
    if (!ok && !lock) { lock = document.createElement('div'); lock.className = 'card locked'; el.prepend(lock); }
    if (lock) {
      lock.classList.toggle('hidden', ok);
      lock.innerHTML = `<span class="sc-ico">${icon('lock')}</span><div class="sc-body"><p class="sc-sub">${m.pitch}</p>
        <button class="btn sm" data-goplans>${Premium.native ? 'Lihat pelan' : 'Cuba percuma 1 hari atau langgan Premium'}</button></div>`;
    }
    if (ok) m.init();
  }
  $('#toolGrid').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) { open(b.dataset.tool); $('#toolsBlock').scrollIntoView({ block: 'start' }); } });
  $('#toolBack').addEventListener('click', () => open(null));
  $('#view-premium').addEventListener('click', e => { if (e.target.closest('[data-goplans]')) $('#plansBlock').scrollIntoView({ behavior: 'smooth' }); });
  function once(fn) { let done = false; return () => { if (!done) { done = true; fn(); } }; }

  /* ---------- Portfolio ---------- */
  let hold = store.get('portfolio', []);
  const prices = {};
  async function refreshPrices() {
    const cs = [...new Set(hold.filter(h => h.type === 'crypto').map(h => h.sym))];
    if (cs.length) {
      try {
        const q = encodeURIComponent(JSON.stringify(cs.map(s => s + 'USDT')));
        (await (await fetch(`${REST}/ticker/price?symbols=${q}`)).json()).forEach(t => prices[t.symbol.replace(/USDT$/, '')] = +t.price);
      } catch {}
    }
    await FX.get();
    renderPortfolio();
  }
  function valueOf(h, fx) {
    const toRM = h.cur === 'USD' ? fx : 1;
    const price = h.type === 'crypto' ? (prices[h.sym] != null ? prices[h.sym] : null) : h.price;
    const now = price == null ? null : price * h.qty * (h.type === 'crypto' ? fx : toRM);
    return { now, cost: h.cost * h.qty * toRM, price };
  }
  const money = (v, cur) => (cur === 'USD' ? '$' : 'RM') + (+v).toLocaleString('en-US', v >= 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 6 });
  function renderPortfolio() {
    const fx = FX.rate.v; let tot = 0, cost = 0;
    const rows = hold.map((h, i) => {
      const v = valueOf(h, fx); if (v.now != null) { tot += v.now; cost += v.cost; }
      const pl = v.now == null ? null : v.now - v.cost;
      const priceCell = h.type === 'stock'
        ? `<label class="pf-edit">Harga ${h.cur === 'USD' ? '$' : 'RM'}<input class="pf-price" data-i="${i}" type="number" step="any" inputmode="decimal" value="${+h.price || ''}" aria-label="Harga semasa ${esc(h.sym)}"></label>`
        : `<span>Harga ${v.price == null ? '<span class="skeleton"></span>' : money(v.price, 'USD')}</span>`;
      return `<div class="pf-row">
        <div class="pf-main"><b>${esc(h.sym)}</b><span class="muted small">${(+h.qty).toLocaleString('en-US', { maximumFractionDigits: 8 })} unit · kos ${money(h.cost, h.cur)}</span></div>
        <div class="pf-val num">${v.now == null ? '<span class="skeleton"></span>' : fmtRM(v.now)}${pl == null ? '' : `<div class="small ${sign(pl)}">${pl >= 0 ? '+' : '−'}${fmtRM(Math.abs(pl))} (${pct(v.cost ? pl / v.cost * 100 : 0)})</div>`}</div>
        <div class="pf-sub muted small">${h.type === 'crypto' ? 'Kripto' : 'Saham'} · ${priceCell}</div>
        <button class="icon-btn plain pf-del" data-del="${i}" aria-label="Buang ${esc(h.sym)}">${icon('x')}</button>
      </div>`;
    }).join('');
    const pl = tot - cost;
    $('#pfSummary').innerHTML = [
      [fmtRM(tot), 'Nilai semasa'], [`<span class="${sign(pl)}">${pl >= 0 ? '+' : '−'}${fmtRM(Math.abs(pl))}</span>`, `Untung/rugi${cost ? ` <span class="${sign(pl)}">${pct(pl / cost * 100)}</span>` : ''}`]
    ].map(([v, k]) => `<div class="stat"><div class="v num">${v}</div><div class="k">${k}</div></div>`).join('');
    $('#pfFx').textContent = `Ditukar pada USD/MYR ${fx.toFixed(4)}${FX.rate.live ? '' : ' (anggaran, tiada sambungan)'}.`;
    $('#pfTable').innerHTML = hold.length ? rows : '<p class="muted pf-empty">Belum ada pegangan. Tambah aset pertama anda di bawah.</p>';
    // Bar peruntukan
    const parts = hold.map(h => ({ sym: h.sym, v: valueOf(h, fx).now || 0 })).filter(p => p.v > 0);
    const PAL = ['var(--brand)', 'var(--gold)', 'var(--info)', 'var(--purple)', 'var(--down)', 'var(--up)', 'var(--warn)', 'var(--faint)'];
    $('#pfAlloc').innerHTML = tot ? `<div class="alloc">${parts.map((p, i) => `<span style="width:${p.v / tot * 100}%;background:${PAL[i % PAL.length]}"></span>`).join('')}</div>
      <div class="legend">${parts.map((p, i) => `<span style="--c:${PAL[i % PAL.length]}">${esc(p.sym)} ${(p.v / tot * 100).toFixed(1)}%</span>`).join('')}</div>` : '';
  }
  const initPortfolio = once(() => {
    $('#pfType').addEventListener('change', () => {
      const st = $('#pfType').value === 'stock';
      $('#pfPriceWrap').classList.toggle('hidden', !st);
      $('#pfCur').value = st ? 'MYR' : 'USD';
      $('#pfSym').placeholder = st ? 'Cth. MAYBANK atau AAPL' : 'Cth. BTC';
    });
    $('#pfForm').addEventListener('submit', e => {
      e.preventDefault();
      const type = $('#pfType').value, sym = $('#pfSym').value.trim().toUpperCase().replace(/[^A-Z0-9.:]/g, '');
      const qty = numIn($('#pfQty')), cost = numIn($('#pfCost')), cur = $('#pfCur').value;
      const price = type === 'stock' ? numIn($('#pfPrice')) : null;
      if (!sym || !(qty > 0) || !(cost >= 0) || (type === 'stock' && !(price >= 0))) return toast('Lengkapkan simbol, kuantiti, kos dan harga.');
      if (type === 'crypto' && cur !== 'USD') return toast('Harga kripto dalam USD. Masukkan kos dalam USD.');
      hold.push({ type, sym, qty, cost, cur, price: type === 'stock' ? price : undefined });
      store.set('portfolio', hold); e.target.reset(); $('#pfType').dispatchEvent(new Event('change'));
      refreshPrices();
    });
    $('#pfTable').addEventListener('click', e => {
      const d = e.target.closest('[data-del]'); if (!d) return;
      if (!confirm(`Buang ${hold[+d.dataset.del].sym} daripada portfolio?`)) return;
      hold.splice(+d.dataset.del, 1); store.set('portfolio', hold); renderPortfolio();
    });
    $('#pfTable').addEventListener('change', e => {
      const inp = e.target.closest('.pf-price'); if (!inp) return;
      const v = numIn(inp); if (!(v >= 0)) return;
      hold[+inp.dataset.i].price = v; store.set('portfolio', hold); renderPortfolio();
    });
    $('#pfType').dispatchEvent(new Event('change'));
    refreshPrices();
    setInterval(() => { if (tool === 'portfolio' && document.visibilityState === 'visible' && $('#view-premium').classList.contains('active')) refreshPrices(); }, 30000);
  });

  /* ---------- Simulator DCA ---------- */
  const DCA_COINS = { BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana', XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin', LINK: 'Chainlink' };
  let dcaChart = null, dcaVal = null, dcaInv = null;
  async function runDca(e) {
    if (e) e.preventDefault();
    const sym = $('#dcaSym').value, amt = numIn($('#dcaAmt')), start = $('#dcaStart').value;
    if (!(amt > 0) || !/^\d{4}-\d{2}$/.test(start)) return toast('Isi jumlah bulanan dan bulan mula.');
    const btn = $('#dcaGo'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Mengira';
    try {
      const [y, m] = start.split('-').map(Number), t0 = Date.UTC(y, m - 1, 1);
      const [k, tick, fx] = await Promise.all([
        fetch(`${REST}/klines?symbol=${sym}USDT&interval=1M&startTime=${t0}&limit=240`).then(r => r.json()),
        fetch(`${REST}/ticker/price?symbol=${sym}USDT`).then(r => r.json()), FX.get()]);
      if (!Array.isArray(k) || !k.length) throw new Error('Tiada data untuk tempoh ini.');
      const usdPerMonth = amt / fx, now = +tick.price;
      let units = 0, invested = 0; const pts = [];
      k.forEach(c => {
        units += usdPerMonth / +c[1]; invested += amt;
        pts.push({ time: Math.floor(c[0] / 1000), value: units * +c[4] * fx, inv: invested });
      });
      const value = units * now * fx, gain = value - invested;
      pts[pts.length - 1].value = value;
      const first = new Date(k[0][0]), late = first.getUTCFullYear() * 12 + first.getUTCMonth() > y * 12 + m - 1;
      $('#dcaOut').classList.remove('hidden');
      $('#dcaStats').innerHTML = [
        [fmtRM(invested), `Jumlah dilabur (${k.length} bulan)`], [fmtRM(value), 'Nilai hari ini'],
        [`<span class="${sign(gain)}">${pct(gain / invested * 100)}</span>`, 'Pulangan'], [`${units.toPrecision(6)} ${sym}`, 'Unit terkumpul']
      ].map(([v, kk]) => `<div class="stat"><div class="v num">${v}</div><div class="k">${kk}</div></div>`).join('');
      $('#dcaNote').textContent = (late ? `Data ${sym}/USDT bermula ${first.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' })}. ` : '')
        + `Belian pada harga pembukaan setiap bulan. Ringgit ditukar pada kadar semasa RM${fx.toFixed(2)} sedolar; caj dagangan dan perubahan kadar tukaran tidak dikira. Prestasi lalu tidak menjamin pulangan masa depan.`;
      await loadScript('js/vendor/lightweight-charts.js');
      const cs = getComputedStyle(document.documentElement), g = n => cs.getPropertyValue(n).trim();
      if (!dcaChart) {
        dcaChart = LightweightCharts.createChart($('#dcaChart'), {
          autoSize: true, layout: { background: { color: 'transparent' }, textColor: g('--muted'), fontFamily: getComputedStyle(document.body).fontFamily },
          grid: { vertLines: { visible: false }, horzLines: { color: g('--border') } }, rightPriceScale: { borderColor: g('--border'), scaleMargins: { top: 0.12, bottom: 0.02 } }, timeScale: { borderColor: g('--border') },
          localization: { locale: 'en-GB', priceFormatter: v => 'RM' + Math.round(v).toLocaleString('en-GB') }, handleScroll: false, handleScale: false
        });
        dcaVal = dcaChart.addAreaSeries({ lineColor: g('--brand'), topColor: g('--brand') + '40', bottomColor: g('--brand') + '00', lineWidth: 2, priceLineVisible: false });
        dcaInv = dcaChart.addLineSeries({ color: g('--faint'), lineWidth: 2, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
      }
      dcaVal.setData(pts.map(p => ({ time: p.time, value: p.value })));
      dcaInv.setData(pts.map(p => ({ time: p.time, value: p.inv })));
      dcaChart.timeScale().fitContent();
      store.set('dca', { sym, amt, start });
    } catch (err) { toast(err.message && /data/.test(err.message) ? err.message : 'Data harga tidak dapat dimuatkan. Semak sambungan internet.'); }
    btn.disabled = false; btn.textContent = 'Kira';
  }
  const initDca = once(() => {
    const s = store.get('dca', { sym: 'BTC', amt: 200, start: '2020-01' });
    $('#dcaSym').innerHTML = Object.entries(DCA_COINS).map(([k, v]) => `<option value="${k}">${v} (${k})</option>`).join('');
    $('#dcaSym').value = s.sym; $('#dcaAmt').value = s.amt; $('#dcaStart').value = s.start;
    const d = new Date(); $('#dcaStart').max = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    $('#dcaForm').addEventListener('submit', runDca);
    document.addEventListener('themechange', () => { if (dcaChart) { dcaChart.remove(); dcaChart = null; if (!$('#dcaOut').classList.contains('hidden')) runDca(); } });
  });

  /* ---------- Zakat ---------- */
  function calcZakat() {
    const g = id => { const v = numIn($(id)); return v > 0 ? v : 0; };
    const gold = g('#zkGold'), total = g('#zkCash') + g('#zkStock') + g('#zkCrypto') - g('#zkDebt');
    const nisab = gold * 85, haul = $('#zkHaul').checked;
    store.set('zakat', { gold: $('#zkGold').value });
    if (!gold) { $('#zkOut').innerHTML = '<p class="muted">Masukkan harga emas semasa segram untuk mengira nisab.</p>'; return; }
    const due = total >= nisab && haul;
    const msg = due ? 'Harta anda mencapai nisab dan cukup haul, jadi zakat wajib dikeluarkan.' : total < nisab ? 'Harta anda belum mencapai nisab. Tiada zakat wajib atas jumlah ini.' : 'Harta mencapai nisab tetapi belum cukup haul (setahun).';
    $('#zkOut').innerHTML = `<div class="zk-due"><span>Zakat perlu dibayar</span><b class="num ${due ? '' : 'muted'}">${fmtRM(due ? total * 0.025 : 0)}</b></div>
      <p class="small ${due ? '' : 'muted'}">${msg}</p>
      <dl class="zk-lines"><div><dt>Harta bersih dikira</dt><dd class="num">${fmtRM(Math.max(total, 0))}</dd></div><div><dt>Nisab (85 g emas)</dt><dd class="num">${fmtRM(nisab)}</dd></div><div><dt>Kadar</dt><dd>2.5%</dd></div></dl>`;
  }
  const initZakat = once(() => {
    $('#zkGold').value = store.get('zakat', {}).gold || '';
    $('#zkForm').addEventListener('input', calcZakat);
    $('#zkForm').addEventListener('submit', e => e.preventDefault());
    $('#zkFromPf').addEventListener('click', async () => {
      if (!hold.length) return toast('Portfolio anda masih kosong.');
      await refreshPrices();
      const fx = FX.rate.v; let st = 0, cr = 0;
      hold.forEach(h => { const v = valueOf(h, fx).now || 0; if (h.type === 'crypto') cr += v; else st += v; });
      $('#zkStock').value = st.toFixed(2); $('#zkCrypto').value = cr.toFixed(2); calcZakat();
    });
    calcZakat();
  });

  /* ---------- Penjana rujukan ---------- */
  let refs = store.get('refs', []);
  const MON_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON_MLA = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  function parseAuthors(s) {
    return s.split(/\n|;/).map(a => a.trim()).filter(Boolean).map(a => {
      if (a.includes(',')) { const [last, ...rest] = a.split(','); return { last: last.trim(), first: rest.join(' ').trim() }; }
      const parts = a.split(/\s+/); return parts.length === 1 ? { last: a, first: '' } : { last: parts.pop(), first: parts.join(' ') };
    });
  }
  const initials = (f, sp) => f.split(/[\s-]+/).filter(Boolean).map(n => n[0].toUpperCase() + '.').join(sp ? ' ' : '');
  const endDot = s => /[.?!]$/.test(s) ? s : s + '.';
  function authorsFor(style, list, org) {
    if (!list.length) return org || '';
    if (style === 'apa') {
      const n = list.map(a => a.first ? `${a.last}, ${initials(a.first, true)}` : a.last);
      if (n.length === 1) return n[0];
      if (n.length <= 20) return n.slice(0, -1).join(', ') + ', & ' + n[n.length - 1];
      return n.slice(0, 19).join(', ') + ', . . . ' + n[n.length - 1];
    }
    if (style === 'mla') {
      const a0 = list[0].first ? `${list[0].last}, ${list[0].first}` : list[0].last;
      if (list.length === 1) return a0;
      if (list.length === 2) return `${a0}, and ${[list[1].first, list[1].last].filter(Boolean).join(' ')}`;
      return `${a0}, et al`;
    }
    const n = list.map(a => a.first ? `${a.last}, ${initials(a.first, false)}` : a.last);
    return n.length === 1 ? n[0] : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
  }
  function cite(style, r) {
    const A = authorsFor(style, parseAuthors(r.authors), r.site), yr = r.year || 'n.d.', I = s => `<i>${esc(s)}</i>`;
    const doi = r.doi ? (/^https?:/.test(r.doi) ? r.doi : 'https://doi.org/' + r.doi.replace(/^doi:\s*/i, '')) : '';
    const link = doi || r.url || '';
    const acc = r.accessed ? new Date(r.accessed + 'T00:00:00') : null;
    const pp = r.pages ? r.pages.replace(/-/g, '–') : '';
    if (style === 'apa') {
      const head = A ? `${esc(endDot(A))} (${esc(yr)}). ` : '';
      if (r.type === 'book') return `${head}${I(endDot(r.title))} ${r.publisher ? esc(endDot(r.publisher)) : ''}${link ? ' ' + esc(link) : ''}`.trim();
      if (r.type === 'journal') return `${head}${esc(endDot(r.title))} ${I(r.container)}${r.volume ? ', ' + I(r.volume) : ''}${r.issue ? `(${esc(r.issue)})` : ''}${pp ? ', ' + esc(pp) : ''}.${link ? ' ' + esc(link) : ''}`;
      return `${head}${I(endDot(r.title))} ${r.site && A !== r.site ? esc(endDot(r.site)) + ' ' : ''}${esc(r.url || '')}`.trim();
    }
    if (style === 'mla') {
      const head = parseAuthors(r.authors).length ? esc(endDot(A)) + ' ' : '';
      if (r.type === 'book') return `${head}${I(endDot(r.title))} ${r.publisher ? esc(r.publisher) + ', ' : ''}${esc(yr)}.`;
      if (r.type === 'journal') return `${head}“${esc(endDot(r.title))}” ${I(r.container)}${r.volume ? ', vol. ' + esc(r.volume) : ''}${r.issue ? ', no. ' + esc(r.issue) : ''}, ${esc(yr)}${pp ? ', pp. ' + esc(pp) : ''}${link ? ', ' + esc(link.replace(/^https?:\/\//, '')) : ''}.`;
      return `${head}“${esc(endDot(r.title))}” ${r.site ? I(r.site) + ', ' : ''}${r.year ? esc(r.year) + ', ' : ''}${esc((r.url || '').replace(/^https?:\/\//, ''))}.${acc ? ` Accessed ${acc.getDate()} ${MON_MLA[acc.getMonth()]} ${acc.getFullYear()}.` : ''}`;
    }
    const head = A ? `${esc(A)} (${esc(yr)}) ` : '';
    if (r.type === 'book') return `${head}${I(endDot(r.title))} ${r.publisher ? esc(endDot(r.publisher)) : ''}`.trim();
    if (r.type === 'journal') return `${head}‘${esc(r.title)}’, ${I(r.container)}${r.volume ? ', ' + esc(r.volume) : ''}${r.issue ? `(${esc(r.issue)})` : ''}${pp ? ', pp. ' + esc(pp) : ''}.${doi ? ' doi: ' + esc(doi.replace(/^https:\/\/doi\.org\//, '')) + '.' : r.url ? ` Available at: ${esc(r.url)}` + (acc ? ` (Accessed: ${acc.getDate()} ${MON_EN[acc.getMonth()]} ${acc.getFullYear()}).` : '.') : ''}`;
    return `${head}${I(r.title)}. Available at: ${esc(r.url || '')}${acc ? ` (Accessed: ${acc.getDate()} ${MON_EN[acc.getMonth()]} ${acc.getFullYear()})` : ''}.`;
  }
  const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
  const readRef = () => {
    const r = { type: $('#rfType').value };
    ['authors', 'year', 'title', 'container', 'publisher', 'volume', 'issue', 'pages', 'url', 'doi', 'site', 'accessed'].forEach(k => { const el = $('#rf-' + k); r[k] = el ? el.value.trim() : ''; });
    return r;
  };
  function renderRefs() {
    const style = $('#rfStyle').value, r = readRef();
    $('#rfPreview').innerHTML = r.title ? cite(style, r) : '<span class="muted">Isi tajuk untuk melihat rujukan.</span>';
    const sorted = refs.map((x, i) => ({ html: cite(style, x), i })).sort((a, b) => plain(a.html).localeCompare(plain(b.html)));
    $('#rfList').innerHTML = sorted.length
      ? sorted.map(x => `<li><span>${x.html}</span><button class="icon-btn plain" data-rdel="${x.i}" aria-label="Buang rujukan">${icon('x')}</button></li>`).join('')
      : '<li class="muted">Rujukan yang anda simpan akan disenaraikan di sini mengikut abjad.</li>';
    $('#rfCopyAll').disabled = !refs.length;
    $('#rfListTitle').textContent = { apa: 'References', mla: 'Works Cited', harvard: 'Reference list' }[style];
  }
  async function copyRich(html) {
    try {
      if (window.ClipboardItem) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([plain(html.replace(/<\/p>/g, '</p>\n'))], { type: 'text/plain' }) })]);
      else await navigator.clipboard.writeText(plain(html));
      toast('Disalin. Format italik dikekalkan apabila ditampal dalam Word atau Google Docs.', 3500);
    } catch { toast('Tidak dapat menyalin.'); }
  }
  const initRujukan = once(() => {
    const FIELDS = { book: ['container', 'volume', 'issue', 'pages', 'doi', 'site', 'accessed'], journal: ['publisher', 'site', 'accessed'], web: ['container', 'publisher', 'volume', 'issue', 'pages', 'doi'] };
    const sync = () => {
      const t = $('#rfType').value;
      $$('#rfForm [data-f]').forEach(el => el.classList.toggle('hidden', FIELDS[t].includes(el.dataset.f)));
      renderRefs();
    };
    $('#rfStyle').value = store.get('refStyle', 'apa');
    $('#rfForm').addEventListener('input', renderRefs);
    $('#rfType').addEventListener('change', sync);
    $('#rfStyle').addEventListener('change', () => { store.set('refStyle', $('#rfStyle').value); renderRefs(); });
    $('#rfForm').addEventListener('submit', e => {
      e.preventDefault(); const r = readRef();
      if (!r.title) return toast('Tajuk diperlukan.');
      refs.push(r); store.set('refs', refs);
      $$('#rfForm input, #rfForm textarea').forEach(i => i.value = ''); renderRefs(); toast('Rujukan disimpan');
    });
    $('#rfCopy').addEventListener('click', () => { const r = readRef(); if (r.title) copyRich(cite($('#rfStyle').value, r)); });
    $('#rfCopyAll').addEventListener('click', () => {
      const s = $('#rfStyle').value;
      copyRich(refs.map(x => cite(s, x)).sort((a, b) => plain(a).localeCompare(plain(b))).map(h => `<p style="padding-left:36px;text-indent:-36px">${h}</p>`).join(''));
    });
    $('#rfList').addEventListener('click', e => { const d = e.target.closest('[data-rdel]'); if (d) { refs.splice(+d.dataset.rdel, 1); store.set('refs', refs); renderRefs(); } });
    sync();
  });

  ProTools.add('portfolio', { name: 'Portfolio', plan: 'pelabur', icon: 'wallet', init: initPortfolio, desc: 'Nilai dan untung rugi dalam Ringgit',
    pitch: 'Catat pegangan saham dan kripto anda. Nilai kripto dikemas kini secara langsung dan semuanya ditukar ke Ringgit, supaya anda nampak untung rugi sebenar.' });
  ProTools.add('dca', { name: 'Simulator DCA', plan: 'pelabur', icon: 'chart', init: initDca, desc: 'Labur tetap setiap bulan sejak 2017',
    pitch: 'Lihat apa yang berlaku jika anda melabur jumlah tetap setiap bulan, menggunakan harga bulanan sebenar sejak 2017.' });
  ProTools.add('zakat', { name: 'Zakat pelaburan', plan: 'pelabur', icon: 'moon', init: initZakat, desc: 'Saham, kripto dan simpanan',
    pitch: 'Kira zakat atas saham, kripto dan simpanan tunai berbanding nisab emas semasa.' });
  ProTools.add('rujukan', { name: 'Penjana rujukan', plan: 'pelajar', icon: 'quote', init: initRujukan, desc: 'APA 7, MLA 9 dan Harvard',
    pitch: 'Hasilkan rujukan APA 7, MLA 9 atau Harvard daripada butiran buku, jurnal atau laman web, kemudian salin senarai rujukan yang lengkap.' });
  // Pembina medan borang dan simpanan nilai borang untuk alat lain
  const field = (id, label, attrs = '', wide = false) => `<div class="field${wide ? ' wide' : ''}"><label for="${id}">${label}</label><input id="${id}" ${attrs || 'type="number" step="any" min="0" inputmode="decimal"'}></div>`;
  function persist(form, key, onChange) {
    const saved = store.get('t_' + key, {});
    $$('input, select, textarea', form).forEach(el => { if (el.id && saved[el.id] != null) el.type === 'checkbox' ? el.checked = saved[el.id] : el.value = saved[el.id]; });
    const save = () => { const o = {}; $$('input, select, textarea', form).forEach(el => { if (el.id && !el.dataset.nosave) o[el.id] = el.type === 'checkbox' ? el.checked : el.value; }); store.set('t_' + key, o); };
    form.addEventListener('input', () => { save(); onChange && onChange(); });
    form.addEventListener('change', () => { save(); onChange && onChange(); });
    form.addEventListener('submit', e => e.preventDefault());
    onChange && onChange();
  }
  ProTools.kit = { fmtRM, pct, sign, numIn, FX, once, REST, field, persist, portfolio: () => hold, valueOf, refreshPrices };

  /* ---------- Laporan PDF daripada penyemak kertas ---------- */
  $('#reportBtn').addEventListener('click', () => {
    if (!Premium.require('pelajar')) return;
    const r = window.CheckerReport && window.CheckerReport();
    if (!r) return toast('Jalankan semakan dahulu.');
    const when = new Intl.DateTimeFormat('ms-MY', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
    const g = (v, l) => `<div class="rp-g"><b>${v == null ? '–' : v + '%'}</b><span>${l}</span></div>`;
    $('#printArea').innerHTML = `<header class="rp-head"><img src="icons/icon.svg" width="34" height="34" alt=""><div><h1>Laporan semakan kertas kerja</h1><p>Bijak Labur · ${esc(when)}</p></div></header>
      <section class="rp-gauges">${g(r.ai, 'Anggaran AI')}${g(r.plag, 'Plagiarisme')}${g(r.plag == null ? null : 100 - r.plag, 'Keaslian')}${g(r.quality, 'Kualiti bahasa')}</section>
      <p class="rp-meta">${r.stats.map(([v, k]) => `${esc(k)}: <b>${esc(String(v))}</b>`).join(' · ')}</p>
      <h2>Isyarat tulisan AI</h2><table>${r.signals.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${Math.round(v * 100)}%</td></tr>`).join('')}</table>
      <h2>Cadangan pembetulan (${r.sugg.length})</h2>${r.sugg.length ? `<table><tr><th>Jenis</th><th>Asal</th><th>Cadangan</th><th>Sebab</th></tr>${r.sugg.map(s => `<tr><td>${esc(s.cat)}</td><td>${esc(s.from)}</td><td>${esc(s.to)}</td><td>${esc(s.why)}</td></tr>`).join('')}</table>` : '<p>Tiada isu bahasa ditemui.</p>'}
      <h2>Sumber yang sepadan</h2>${r.sources.length ? `<table>${r.sources.map(s => `<tr><td>${esc(s.name)}${s.url ? `<br><small>${esc(s.url)}</small>` : ''}</td><td class="num">${s.pct}%</td></tr>`).join('')}</table>` : `<p>${r.plag == null ? 'Semakan sumber tidak dijalankan.' : 'Tiada padanan ketara.'}</p>`}
      <h2>Teks yang disemak</h2><div class="rp-text">${esc(r.text).replace(/\n/g, '<br>')}</div>
      <p class="rp-foot">Peratus AI dan plagiarisme ialah anggaran berdasarkan ciri statistik teks dan carian sumber terbuka dan teks yang diberikan. Ia bukan bukti muktamad dan tidak setara dengan sistem semakan rasmi universiti.</p>`;
    document.title = 'Laporan semakan - Bijak Labur';
    document.body.classList.add('printing');
    setTimeout(() => { window.print(); document.title = 'Bijak Labur'; }, 60);
  });

  window.addEventListener('afterprint', () => document.body.classList.remove('printing'));

  function paint() {
    $('#reportBtn').querySelector('.lock').classList.toggle('hidden', Premium.has('pelajar'));
    $('#proWrap').classList.toggle('subscribed', !!Premium.plan);
    open(tool);
  }
  document.addEventListener('premiumchange', paint);
  document.addEventListener('viewchange', e => { if (e.detail === 'premium') paint(); });
})();
