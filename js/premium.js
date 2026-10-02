/* Bijak Labur Premium: pelan, pembayaran (ToyyibPay melalui pelayan sendiri) dan lesen */
const Premium = (function () {
  // URL pelayan pembayaran (Cloudflare Worker). Kosong = jualan belum dibuka.
  const PAY_API = '';
  // Kunci awam untuk mengesahkan lesen yang ditandatangani pelayan
  const PUBLIC_JWK = { kty: 'EC', crv: 'P-256', x: 'PopJd-wOskBgsjXRhkdKZwZDEXnwp4JMC3CiOeZNIJs', y: 'BElaqIRYXzSQ595i_PjTkwPSwL6lMCd9Ei2WCyWWdHY' };

  const PLANS = {
    pelajar: { name: 'Pelajar', m1: 5, y1: 39, blurb: 'Untuk pelajar yang menghantar tugasan.',
      feats: ['Laporan semakan PDF untuk dihantar bersama tugasan', 'Penjana rujukan APA 7, MLA 9 dan Harvard', 'Senarai rujukan tersusun mengikut abjad'] },
    pelabur: { name: 'Pelabur', m1: 12, y1: 89, blurb: 'Untuk yang sudah mula melabur.',
      feats: ['Portfolio saham dan kripto dalam Ringgit', 'Simulator DCA dengan harga sebenar sejak 2017', 'Kalkulator zakat saham dan kripto'] },
    lengkap: { name: 'Lengkap', m1: 15, y1: 109, blurb: 'Semua alat Pelajar dan Pelabur.',
      feats: ['Semua ciri pelan Pelajar', 'Semua ciri pelan Pelabur', 'Ciri Premium baharu tanpa caj tambahan'] }
  };
  const PERIOD = { m1: '30 hari', y1: 'setahun' };

  let lic = null; // { p, x, b }
  const available = !Native;
  const now = () => Date.now() / 1000;
  const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const dateMs = sec => new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(sec * 1000));

  async function verify(token) {
    try {
      const [body, sig] = String(token).split('.');
      const key = await crypto.subtle.importKey('jwk', PUBLIC_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, unb64(sig), new TextEncoder().encode(body));
      if (!ok) return null;
      const p = JSON.parse(new TextDecoder().decode(unb64(body)));
      return PLANS[p.p] && p.x > now() ? p : null;
    } catch { return null; }
  }

  const api = {
    available,
    get plan() { return lic && lic.x > now() ? lic.p : null; },
    has(feature) { const p = this.plan; return !!p && (p === 'lengkap' || p === feature); },
    // Untuk butang ciri: benarkan jika ada, jika tidak bawa ke halaman Premium
    require(feature) {
      if (this.has(feature)) return true;
      toast(`Ciri ini sebahagian daripada pelan ${PLANS[feature].name}.`, 3200);
      location.hash = '#premium';
      return false;
    }
  };

  function announce() { document.dispatchEvent(new CustomEvent('premiumchange')); render(); }

  async function load() {
    const t = store.get('license', null);
    lic = t ? await verify(t) : null;
    if (t && !lic) store.set('license', null);
  }

  /* ---------- Paparan ---------- */
  let period = 'y1';
  function render() {
    const open = available && (PAY_API || api.plan);
    $$('[data-premium-entry]').forEach(el => el.classList.toggle('hidden', !open));
    if (!available) return;

    const p = api.plan;
    $('#proStatus').innerHTML = p
      ? `<span class="sc-ico">${icon('check')}</span><div class="sc-body"><div class="sc-title">Pelan ${PLANS[p].name} aktif</div><div class="sc-sub">Sah hingga ${dateMs(lic.x)}. Kod bil ${esc(lic.b)}</div></div>`
      : '';
    $('#proStatus').classList.toggle('hidden', !p);
    $('#plansBlock').classList.toggle('hidden', !!p && p === 'lengkap');
    $('#plansTitle').textContent = p ? 'Naik taraf atau sambung' : 'Pilih pelan';

    const saving = k => Math.round((1 - PLANS[k].y1 / (PLANS[k].m1 * 12)) * 100);
    $('#periodSeg').innerHTML = Object.entries(PERIOD).map(([k, v]) =>
      `<button class="seg ${k === period ? 'active' : ''}" data-period="${k}" role="tab" aria-selected="${k === period}">${k === 'y1' ? 'Setahun' : '30 hari'}</button>`).join('');
    $('#planGrid').innerHTML = Object.entries(PLANS).map(([k, pl]) => {
      const price = pl[period], cur = p === k;
      const per = period === 'y1' ? `<div class="plan-per">RM${(price / 12).toFixed(2)} sebulan, jimat ${saving(k)}%</div>` : `<div class="plan-per">Bayar sekali, tiada caj automatik</div>`;
      return `<article class="plan ${k === 'lengkap' ? 'featured' : ''}">
        <header><h3>${pl.name}</h3>${k === 'lengkap' ? '<span class="plan-tag">Paling berbaloi</span>' : ''}</header>
        <p class="muted small">${pl.blurb}</p>
        <div class="plan-price"><span class="num">RM${price}</span><span class="muted">/${PERIOD[period]}</span></div>${per}
        <ul class="plan-feats">${pl.feats.map(f => `<li>${icon('check')}<span>${f}</span></li>`).join('')}</ul>
        <button class="btn ${k === 'lengkap' ? '' : 'ghost'} block" data-buy="${k}">${cur ? 'Sambung' : 'Pilih ' + pl.name}</button>
      </article>`;
    }).join('');
  }

  /* ---------- Pembayaran ---------- */
  async function post(path, body) {
    const r = await fetch(PAY_API.replace(/\/$/, '') + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.error || 'Ralat pelayan pembayaran.'); e.data = d; throw e; }
    return d;
  }

  function openCheckout(plan) {
    if (!PAY_API) return toast('Pembayaran belum dibuka. Sila cuba lagi kemudian.');
    const pl = PLANS[plan], dlg = $('#payDlg'), saved = store.get('payer', {});
    dlg.dataset.plan = plan;
    $('#payTitle').textContent = `Pelan ${pl.name}, ${PERIOD[period]}`;
    $('#payAmount').textContent = `RM${pl[period]}.00`;
    $('#payName').value = saved.name || ''; $('#payEmail').value = saved.email || ''; $('#payPhone').value = saved.phone || '';
    $('#payErr').textContent = '';
    dlg.showModal();
  }

  async function submitCheckout(e) {
    e.preventDefault();
    const dlg = $('#payDlg'), btn = $('#payGo');
    const body = { plan: dlg.dataset.plan, period, name: $('#payName').value.trim(), email: $('#payEmail').value.trim(), phone: $('#payPhone').value.trim() };
    store.set('payer', { name: body.name, email: body.email, phone: body.phone });
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyediakan bil';
    try {
      const d = await post('/checkout', body);
      store.set('pendingBill', { code: d.billcode, email: body.email });
      location.href = d.url;
    } catch (err) {
      $('#payErr').textContent = err.message;
      btn.disabled = false; btn.textContent = 'Teruskan ke pembayaran';
    }
  }

  async function claim(code, email, quiet) {
    const d = await post('/claim', { billcode: code, email });
    const v = await verify(d.token);
    if (!v) throw new Error('Lesen tidak dapat disahkan.');
    // Simpan lesen yang paling lama tamat
    if (!lic || v.x >= lic.x || v.p === 'lengkap') { lic = v; store.set('license', d.token); }
    store.set('pendingBill', null);
    announce();
    if (!quiet) toast(`Pelan ${PLANS[v.p].name} aktif hingga ${dateMs(v.x)}.`, 4500);
    return v;
  }

  // Pembeli kembali dari ToyyibPay: ?bill=KOD&status=1#premium
  async function handleReturn() {
    const q = new URLSearchParams(location.search), code = q.get('bill');
    if (!code) return;
    history.replaceState(null, '', location.pathname + location.hash);
    const pend = store.get('pendingBill', null), email = pend && pend.code === code ? pend.email : (store.get('payer', {}).email || '');
    if (q.get('status') !== '1') { toast('Pembayaran tidak selesai. Tiada caj dikenakan.', 4500); return; }
    if (!email) { $('#restoreCode').value = code; $('#restore').open = true; toast('Masukkan e-mel pembayaran untuk mengaktifkan Premium.', 4500); return; }
    toast('Mengesahkan pembayaran…', 8000);
    for (let i = 0; i < 4; i++) {
      try { await claim(code, email); return; }
      catch (err) {
        if (!(err.data && err.data.pending) || i === 3) { toast(err.message, 6000); $('#restoreCode').value = code; $('#restoreEmail').value = email; $('#restore').open = true; return; }
        await new Promise(r => setTimeout(r, 4000));
      }
    }
  }

  async function submitRestore(e) {
    e.preventDefault();
    if (!PAY_API) return toast('Pembayaran belum dibuka.');
    const btn = $('#restoreGo'); btn.disabled = true;
    try { await claim($('#restoreCode').value, $('#restoreEmail').value.trim()); $('#restore').open = false; }
    catch (err) { toast(err.message, 5000); }
    btn.disabled = false;
  }

  if (available) {
    $('#periodSeg').addEventListener('click', e => { const b = e.target.closest('[data-period]'); if (b) { period = b.dataset.period; render(); } });
    $('#planGrid').addEventListener('click', e => { const b = e.target.closest('[data-buy]'); if (b) openCheckout(b.dataset.buy); });
    $('#payForm').addEventListener('submit', submitCheckout);
    $('#payCancel').addEventListener('click', () => $('#payDlg').close());
    $('#restoreForm').addEventListener('submit', submitRestore);
    window.addEventListener('pageshow', () => { const b = $('#payGo'); b.disabled = false; b.textContent = 'Teruskan ke pembayaran'; });
  }

  // Dalam app kedai (Android/iOS) Premium tidak dijual: peraturan Apple dan Google
  if (!available) $$('[data-premium-entry], #view-premium').forEach(el => el.remove());

  api.ready = load().then(() => { announce(); if (available) handleReturn(); });
  api.PLANS = PLANS;
  return api;
})();
