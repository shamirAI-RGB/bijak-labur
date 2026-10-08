/* Bijak Labur Premium: pelan, percubaan 1 hari (web) atau 3 hari (kedai app), bayaran web (ToyyibPay) dan langganan app (Google Play / App Store).
   Premium terikat pada akaun dan peranti aktif (js/akaun.js). Tetamu tidak mendapat Premium. */
const Premium = (function () {
  // true selepas ToyyibPay disediakan pada pelayan. URL pelayan ditetapkan dalam js/akaun.js (API).
  const PAY_OPEN = false;
  const PAY_API = PAY_OPEN && Akaun.enabled;
  // Kunci awam untuk mengesahkan lesen web yang ditandatangani pelayan
  const PUBLIC_JWK = { kty: 'EC', crv: 'P-256', x: 'PopJd-wOskBgsjXRhkdKZwZDEXnwp4JMC3CiOeZNIJs', y: 'BElaqIRYXzSQ595i_PjTkwPSwL6lMCd9Ei2WCyWWdHY' };
  // Percubaan web: 1 hari (pelayan akaun). Kedai app: 3 hari, tempoh percubaan paling singkat yang dibenarkan Google Play.
  const TRIAL_DAYS = 1, STORE_TRIAL_DAYS = 3;

  // Satu pelan untuk dijual: Premium (kunci 'lengkap' dikekalkan supaya ID produk kedai dan lesen lama kekal sah).
  // Pelajar dan Pelabur ialah pelan lama: masih diiktiraf jika ada lesen, tetapi tidak lagi dijual.
  const PLANS = {
    pelajar: { name: 'Pelajar', m1: 5, y1: 39, old: true, feats: [] },
    pelabur: { name: 'Pelabur', m1: 12, y1: 89, old: true, feats: [] },
    lengkap: { name: 'Premium', m1: 6.9, y1: 49, blurb: 'Untuk pelajar dan pelabur. Semua ciri percuma kekal percuma.',
      feats: ['Semak Tugasan Pro: semakan AI dan plagiarisme tanpa had, laporan PDF', 'Amaran harga tanpa had, amaran naik atau turun %, dan amaran status Syariah',
        'Portfolio patuh Syariah: status setiap pegangan, tarikh haul zakat dan pembersihan dividen', 'Tanya AI Fiqh, Buku Nota AI dan Kerjaya AI tanpa had harian',
        'Alat pelajar: rujukan APA/MLA/Harvard, PNGK, muka depan, bandingkan draf', 'Alat pelabur: DCA, saiz posisi, jurnal, kos Bursa, dividen, matlamat, zakat'] }
  };
  const FOR_SALE = Object.keys(PLANS).filter(k => !PLANS[k].old);
  // Had harian percuma (dikira dalam peranti, waktu Malaysia). Premium tiada had.
  const KUOTA = { semak: [3, 'semakan tugasan'], tanya: [5, 'soalan Tanya AI'], buku: [10, 'permintaan Buku Nota AI'], kerja: [3, 'permintaan Kerjaya AI'] };
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
  const used = () => { const u = store.get('kuota', {}); return u.d === today() ? u : { d: today() }; };
  const rmFmt = v => 'RM' + (v % 1 ? v.toFixed(2) : v);
  const PERIOD = { m1: '30 hari', y1: 'setahun' };
  const PERIOD_STORE = { m1: 'bulan', y1: 'tahun' };

  /* Langganan app: ID produk yang perlu dicipta dalam Play Console dan App Store Connect */
  const PLATFORM = Native ? Native.getPlatform() : 'web';
  const IAP = plugin('NativePurchases');
  const IOS_ID = (p, per) => `bl.${p}.${per === 'y1' ? 'tahunan' : 'bulanan'}`;
  const ANDROID_ID = p => `bl_${p}`;
  const BASE_PLAN = { m1: 'bulanan', y1: 'tahunan' };
  const TRIAL_OFFER = 'percuma-3-hari';
  const isNative = !!Native;

  let lic = null;            // lesen akaun { p, x, e, b, u, d } untuk peranti ini
  let storePlans = [];       // langganan app aktif, cth. ['lengkap']
  let storeTrial = false;
  let products = {};         // products[plan][period] = { priceString, trial, ... }
  // Percuma semasa pelancaran: selagi bayaran belum dibuka (web: ToyyibPay, app: produk kedai),
  // semua alat Premium dibuka untuk semua orang tanpa akaun. Tukar ke false untuk mengunci semula.
  const LAUNCH_FREE = true;
  const launchFree = () => LAUNCH_FREE && (isNative ? Object.keys(products).length === 0 : !PAY_API);
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
      // Lesen mesti milik akaun yang log masuk dan peranti ini
      const u = Akaun.user;
      return PLANS[p.p] && p.x > now() && u && p.u === u.uid && p.d === Akaun.device ? p : null;
    } catch { return null; }
  }

  // Percubaan web kini sekali bagi setiap akaun (pelayan), bukan setiap peranti
  const validLic = () => lic && lic.x > now() && Akaun.active ? lic : null;
  const isTrialLic = () => !!(validLic() && lic.b === 'PERCUBAAN');

  const api = {
    available: true,
    native: isNative,
    get launch() { return launchFree(); },
    get plan() {
      if (launchFree()) return 'lengkap';
      if (!Akaun.active) return null;   // tetamu: tiada Premium
      if (isNative) {
        // Langganan kedai, atau lesen web yang dibeli pada akaun yang sama
        const sp = storePlans.includes('lengkap') || (storePlans.includes('pelajar') && storePlans.includes('pelabur')) ? 'lengkap' : storePlans[0] || null;
        return sp || (validLic() ? lic.p : null);
      }
      return validLic() ? lic.p : null;
    },
    get trialing() { return launchFree() ? false : isNative ? Akaun.active && storeTrial : isTrialLic(); },
    has(feature) { const p = this.plan; return !!p && (p === 'lengkap' || p === feature); },
    require(feature) {
      if (this.has(feature)) return true;
      toast(Akaun.active ? 'Ciri ini sebahagian daripada Bijak Labur Premium.' : 'Premium memerlukan akaun. Log masuk atau daftar dahulu.', 3200);
      location.hash = '#premium';
      return false;
    },
    // Had harian percuma: boleh(k) sebelum memanggil, catat(k) selepas berjaya
    baki(k) { return this.plan ? Infinity : Math.max(0, KUOTA[k][0] - (used()[k] || 0)); },
    boleh(k) {
      if (this.baki(k) > 0) return true;
      toast(`Had percuma ${KUOTA[k][0]} ${KUOTA[k][1]} sehari sudah dicapai. Cuba lagi esok, atau naik taraf ke Premium untuk tanpa had.`, 5000);
      return false;
    },
    catat(k) {
      if (this.plan) return;
      const u = used(); u[k] = (u[k] || 0) + 1; store.set('kuota', u);
      const left = KUOTA[k][0] - u[k];
      if (left <= 1) toast(left ? `Baki 1 ${KUOTA[k][1]} percuma hari ini.` : `Itu ${KUOTA[k][1]} percuma terakhir hari ini.`, 3500);
    },
    KUOTA,
    PLANS
  };

  function announce() { document.dispatchEvent(new CustomEvent('premiumchange')); render(); }

  /* ---------- Paparan ---------- */
  let period = 'y1';
  // Web: percubaan sentiasa ada, jadi Premium dipaparkan walaupun bayaran belum dibuka
  const salesOpen = () => isNative ? Object.keys(products).length > 0 : true;

  function statusHTML() {
    const p = api.plan; if (!p) return '';
    if (launchFree()) return `<span class="sc-ico">${icon('check')}</span><div class="sc-body"><div class="sc-title">Percuma semasa pelancaran</div><div class="sc-sub">Semua alat Premium dibuka untuk semua orang. Tiada akaun atau bayaran diperlukan buat masa ini.</div></div>`;
    let sub;
    if (isNative && !storePlans.length) sub = `Dibeli melalui laman web, sah hingga ${dateMs(lic.e || lic.x)}.`;
    else if (isNative) sub = storeTrial ? 'Dalam tempoh percubaan percuma. Urus atau batal dalam tetapan langganan.' : 'Langganan aktif. Urus atau batal dalam tetapan langganan.';
    else if (api.trialing) {
      const left = (lic.e || lic.x) - now(), d = Math.floor(left / 86400), h = Math.floor(left % 86400 / 3600);
      sub = `Percubaan percuma: tinggal ${d ? d + ' hari ' : ''}${h} jam. Pilih pelan di bawah untuk terus menggunakan alat ini.`;
    } else sub = `Sah hingga ${dateMs(lic.e || lic.x)}. Kod bil ${esc(lic.b || '')}`;
    return `<span class="sc-ico">${icon('check')}</span><div class="sc-body"><div class="sc-title">${api.trialing ? 'Percubaan Premium aktif' : `Pelan ${PLANS[p].name} aktif`}</div><div class="sc-sub">${sub}</div></div>`;
  }

  function priceHTML(k) {
    const pl = PLANS[k];
    if (isNative) {
      const pr = products[k] && products[k][period];
      if (!pr) return `<div class="plan-price"><span class="muted">Tidak tersedia</span></div><div class="plan-per">&nbsp;</div>`;
      return `<div class="plan-price"><span class="num">${esc(pr.priceString)}</span><span class="muted">/${PERIOD_STORE[period]}</span></div>
        <div class="plan-per">${pr.trial ? `Percuma ${STORE_TRIAL_DAYS} hari, kemudian ${esc(pr.priceString)} se${PERIOD_STORE[period]}` : 'Diperbaharui secara automatik, batal bila-bila masa'}</div>`;
    }
    const price = pl[period], saving = Math.round((1 - pl.y1 / (pl.m1 * 12)) * 100);
    return `<div class="plan-price"><span class="num">${rmFmt(price)}</span><span class="muted">/${PERIOD[period]}</span></div>
      <div class="plan-per">${period === 'y1' ? `RM${(price / 12).toFixed(2)} sebulan, jimat ${saving}%` : 'Bayar sekali, tiada caj automatik'}</div>`;
  }

  const LEAD = { normal: '', launch: 'Alat untuk melabur dengan lebih teratur dan menyiapkan tugasan dengan lebih kemas. Percuma untuk semua semasa pelancaran.' };
  function render() {
    const p = api.plan, open = salesOpen() || !!p, free = launchFree();
    $$('[data-premium-entry]').forEach(el => el.classList.toggle('hidden', !open));
    const lead = $('#view-premium .lead'), sub = $('[data-premium-sub]');
    if (lead) { LEAD.normal = LEAD.normal || lead.textContent; lead.textContent = free ? LEAD.launch : LEAD.normal; }
    if (sub) { sub.dataset.normal = sub.dataset.normal || sub.textContent; sub.textContent = free ? 'Semua alat Premium percuma semasa pelancaran' : sub.dataset.normal; }

    $('#proStatus').innerHTML = statusHTML();
    $('#proStatus').classList.toggle('hidden', !p);
    $('#plansBlock').classList.toggle('hidden', free || (p === 'lengkap' && !api.trialing && !isNative));
    $('#plansTitle').textContent = p && !api.trialing ? 'Naik taraf atau sambung' : 'Pilih pelan';

    // Kad akaun untuk tetamu, dan kad percubaan (sekali bagi setiap akaun)
    const guest = $('#proGuest');
    if (guest) {
      guest.classList.toggle('hidden', Akaun.active || free);
      $('#proGuestText').textContent = !Akaun.enabled ? 'Log masuk akan dibuka tidak lama lagi. Premium dan percubaan percuma 1 hari memerlukan akaun.'
        : Akaun.user ? 'Lengkapkan log masuk akaun anda untuk menggunakan Premium pada peranti ini.'
        : 'Log masuk atau daftar dengan Google atau e-mel. Tetamu boleh menggunakan semua ciri percuma, tetapi tidak Premium.';
      $('#proGuestGo').classList.toggle('hidden', !Akaun.enabled);
    }
    const canTrial = !isNative && Akaun.active && Akaun.info.trialUsed === false && !validLic();
    if ($('#trialCard')) $('#trialCard').classList.toggle('hidden', !canTrial);

    $('#periodSeg').innerHTML = Object.keys(PERIOD).map(k =>
      `<button class="seg ${k === period ? 'active' : ''}" data-period="${k}" role="tab" aria-selected="${k === period}">${k === 'y1' ? (isNative ? 'Tahunan' : 'Setahun') : (isNative ? 'Bulanan' : '30 hari')}</button>`).join('');
    $('#planGrid').innerHTML = FOR_SALE.map(k => [k, PLANS[k]]).map(([k, pl]) => {
      const cur = p === k && !api.trialing, pr = isNative && products[k] && products[k][period];
      const label = isNative ? (cur ? 'Langganan aktif' : pr && pr.trial ? `Cuba percuma ${STORE_TRIAL_DAYS} hari` : 'Langgan') : !PAY_API ? 'Bayaran dibuka tidak lama lagi' : !Akaun.active ? 'Log masuk untuk membeli' : (cur ? 'Sambung' : 'Langgan ' + pl.name);
      return `<article class="plan ${k === 'lengkap' ? 'featured' : ''}">
        <header><h3>${pl.name}</h3>${k === 'lengkap' ? '<span class="plan-tag">Satu pelan, semua ciri</span>' : ''}</header>
        <p class="muted small">${pl.blurb}</p>
        ${priceHTML(k)}
        <ul class="plan-feats">${pl.feats.map(f => `<li>${icon('check')}<span>${f}</span></li>`).join('')}</ul>
        <button class="btn ${k === 'lengkap' ? '' : 'ghost'} block" data-buy="${k}" ${(isNative ? (!pr || (cur && storePlans.includes(k))) : !PAY_API) ? 'disabled' : ''}>${label}</button>
      </article>`;
    }).join('');
    if (isNative) $('#storeTerms').innerHTML = storeTermsHTML();
  }

  function storeTermsHTML() {
    const store = PLATFORM === 'ios' ? 'Apple ID' : 'akaun Google Play';
    const eula = PLATFORM === 'ios' ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/' : 'terma-app.html';
    return `Bayaran dicaj kepada ${store} anda apabila pembelian disahkan, atau pada akhir tempoh percubaan percuma ${STORE_TRIAL_DAYS} hari jika ada. Langganan diperbaharui secara automatik pada harga yang sama melainkan dibatalkan sekurang-kurangnya 24 jam sebelum tempoh semasa tamat. Urus atau batal dalam tetapan langganan ${PLATFORM === 'ios' ? 'App Store' : 'Google Play'}. Percubaan percuma untuk pelanggan baharu sahaja. <a href="${eula}" target="_blank" rel="noopener">Terma penggunaan</a> · <a href="privacy.html">Dasar privasi</a>`;
  }

  /* ---------- Langganan app (Google Play / App Store) ---------- */
  async function loadProducts() {
    if (!IAP) return;
    try {
      const { isBillingSupported } = await IAP.isBillingSupported();
      if (!isBillingSupported) return;
      products = {};
      const plans = FOR_SALE;
      if (PLATFORM === 'ios') {
        const ids = plans.flatMap(p => ['m1', 'y1'].map(per => IOS_ID(p, per)));
        const { products: list } = await IAP.getProducts({ productIdentifiers: ids, productType: 'subs' });
        list.forEach(pr => {
          const m = pr.identifier.match(/^bl\.(\w+)\.(bulanan|tahunan)$/); if (!m) return;
          const per = m[2] === 'tahunan' ? 'y1' : 'm1';
          (products[m[1]] = products[m[1]] || {})[per] = { id: pr.identifier, priceString: pr.priceString, trial: !!(pr.introductoryPrice && pr.introductoryPrice.price === 0) };
        });
      } else {
        const { products: list } = await IAP.getProducts({ productIdentifiers: plans.map(ANDROID_ID), productType: 'subs' });
        list.forEach(pr => {
          const plan = String(pr.planIdentifier || '').replace(/^bl_/, ''), per = pr.identifier === BASE_PLAN.y1 ? 'y1' : pr.identifier === BASE_PLAN.m1 ? 'm1' : null;
          if (!PLANS[plan] || !per) return;
          const slot = (products[plan] = products[plan] || {}), cur = slot[per] || {};
          const isTrial = pr.offerId === TRIAL_OFFER;
          // Harga asas datang daripada tawaran asas; percubaan guna token tawaran percuma jika layak
          slot[per] = Object.assign(cur, { id: ANDROID_ID(plan), basePlan: pr.identifier },
            isTrial ? { trial: true, offerToken: pr.offerToken } : { priceString: pr.priceString, baseToken: pr.offerToken });
        });
        Object.values(products).forEach(s => Object.values(s).forEach(v => { if (!v.priceString) v.priceString = ''; }));
      }
    } catch (e) { console.warn('Produk kedai tidak dapat dimuatkan', e); }
  }

  async function refreshEntitlements() {
    if (!IAP) return;
    try {
      const { purchases } = await IAP.getPurchases({ productType: 'subs', onlyCurrentEntitlements: true });
      const active = purchases.filter(t => PLATFORM === 'ios'
        ? (t.isActive === true || (t.expirationDate && Date.parse(t.expirationDate) > Date.now())) && !t.revocationDate
        : String(t.purchaseState) === '1');
      storePlans = [...new Set(active.map(t => (String(t.productIdentifier).match(/(pelajar|pelabur|lengkap)/) || [])[1]).filter(Boolean))];
      storeTrial = active.some(t => t.isTrialPeriod);
    } catch (e) { console.warn('Langganan tidak dapat disemak', e); }
  }

  async function buyNative(plan) {
    if (!Akaun.active) { Akaun.open(); return; }
    const pr = products[plan] && products[plan][period]; if (!pr) return;
    const btn = $(`[data-buy="${plan}"]`); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Membuka';
    try {
      if (PLATFORM === 'ios') await IAP.purchaseProduct({ productIdentifier: pr.id, productType: 'subs' });
      else await IAP.purchaseProduct({ productIdentifier: pr.id, planIdentifier: pr.basePlan, offerToken: pr.offerToken || pr.baseToken, productType: 'subs' });
      await refreshEntitlements();
      announce();
      if (api.plan) toast(`Pelan ${PLANS[api.plan].name} aktif. Terima kasih!`, 4000);
    } catch (e) {
      if (!/cancel/i.test(String(e && (e.message || e.code)))) toast('Pembelian tidak selesai. Tiada caj dikenakan.', 4000);
      render();
    }
  }

  /* ---------- Pembayaran web ---------- */
  // Semua panggilan pembayaran membawa token akaun dan ID peranti
  const post = (path, body) => Akaun.call(path, body);

  function openCheckout(plan) {
    if (!PAY_API) return toast('Pembayaran belum dibuka. Sila cuba lagi kemudian.');
    if (!Akaun.active) { Akaun.open(); return; }
    const pl = PLANS[plan], dlg = $('#payDlg'), saved = store.get('payer', {});
    dlg.dataset.plan = plan;
    $('#payTitle').textContent = `Bijak Labur ${pl.name}, ${PERIOD[period]}`;
    $('#payAmount').textContent = `RM${pl[period].toFixed(2)}`;
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
      // Hanya halaman bayaran ToyyibPay yang sah
      if (!/^https:\/\/(dev\.)?toyyibpay\.com\//.test(d.url)) throw new Error('Alamat pembayaran tidak sah. Sila cuba lagi.');
      location.href = d.url;
    } catch (err) {
      $('#payErr').textContent = err.message;
      btn.disabled = false; btn.textContent = 'Teruskan ke pembayaran';
    }
  }

  async function claim(code, email, quiet) {
    if (!Akaun.active) { Akaun.open(); throw new Error('Log masuk dahulu untuk mengaktifkan Premium.'); }
    const d = await post('/claim', { billcode: code, email });
    const v = await verify(d.licence);
    if (!v) throw new Error('Lesen tidak dapat disahkan.');
    lic = v;
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
    if (!Akaun.active) { await Akaun.ready; }
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

  /* ---------- Peristiwa ---------- */
  $('#periodSeg').addEventListener('click', e => { const b = e.target.closest('[data-period]'); if (b) { period = b.dataset.period; render(); } });
  $('#planGrid').addEventListener('click', e => { const b = e.target.closest('[data-buy]'); if (b) isNative ? buyNative(b.dataset.buy) : openCheckout(b.dataset.buy); });
  $('#trialGo').addEventListener('click', async () => {
    if (!Akaun.active) { Akaun.open(); return; }
    const b = $('#trialGo'); b.disabled = true;
    try {
      const d = await Akaun.call('/akaun/percubaan');
      lic = await verify(d.licence);
      Akaun.info.trialUsed = true;
      announce();
      toast('Percubaan Premium aktif selama 1 hari (24 jam). Semua ciri Premium kini dibuka.', 4500);
      $('#toolsBlock').scrollIntoView({ behavior: 'smooth' });
    } catch (e) { toast(e.message, 4500); if (e.data && e.data.code === 'used') { Akaun.info.trialUsed = true; render(); } }
    b.disabled = false;
  });
  $('#proGuestGo').addEventListener('click', () => Akaun.open());
  if (isNative) {
    // Peraturan kedai app: tiada sebutan bayaran luar dalam app
    $$('[data-web-only]').forEach(el => el.remove());
    $('#storeRestore').addEventListener('click', async () => {
      try { await IAP.restorePurchases(); } catch {}
      await refreshEntitlements(); announce();
      toast(api.plan ? `Pelan ${PLANS[api.plan].name} dipulihkan.` : 'Tiada langganan aktif ditemui untuk akaun ini.', 4000);
    });
    $('#storeManage').addEventListener('click', () => IAP && IAP.manageSubscriptions().catch(() => toast('Buka tetapan langganan dalam kedai app.')));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshEntitlements().then(announce); });
  } else {
    $$('[data-native-only]').forEach(el => el.remove());
    $('#payForm').addEventListener('submit', submitCheckout);
    $('#payCancel').addEventListener('click', () => $('#payDlg').close());
    $('#restoreForm').addEventListener('submit', submitRestore);
    window.addEventListener('pageshow', () => { const b = $('#payGo'); b.disabled = false; b.textContent = 'Teruskan ke pembayaran'; });
  }
  // Kemas kini kiraan masa percubaan
  setInterval(() => { if (lic && !isNative) { if (!validLic()) { lic = null; announce(); } else $('#proStatus').innerHTML = statusHTML(); } }, 60000);

  // Lesen datang daripada pelayan akaun; sahkan semula setiap kali akaun berubah
  async function loadLicence() { lic = Akaun.licence ? await verify(Akaun.licence) : null; }
  document.addEventListener('akaunchange', () => loadLicence().then(announce));

  async function load() {
    // Lesen dan percubaan lama yang tidak terikat pada akaun tidak lagi digunakan
    store.set('trial', null); store.set('license', null);
    await Promise.all([isNative ? loadProducts() : null, isNative ? refreshEntitlements() : null, Akaun.ready.catch(() => {}).then(loadLicence)]);
  }
  api.ready = load().then(() => { announce(); if (!isNative) handleReturn(); });
  return api;
})();
