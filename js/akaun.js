/* Bijak Labur: akaun pengguna (Firebase Authentication) dan had satu akaun untuk satu peranti */
const Akaun = (function () {
  // Isi daripada Firebase Console > Tetapan projek > Apl anda (web). Nilai ini memang awam.
  // Selagi kosong, laman berjalan dalam mod tetamu sahaja dan butang akaun menunjukkan "akan dibuka".
  const FIREBASE = { apiKey: '', authDomain: '', projectId: '', appId: '' };
  // URL pelayan Premium (Cloudflare Worker), cth. https://bijak-labur-premium.NAMA.workers.dev
  const API = '';
  const enabled = !!(FIREBASE.apiKey && FIREBASE.projectId && API);
  // Kaedah yang dihidupkan dalam Firebase > Authentication > Sign-in method (e-mel sentiasa ada)
  const METHODS = { google: true, facebook: true, phone: true };
  // Google dan Facebook menyekat log masuk dalam WebView app; dalam app guna e-mel atau telefon
  const SOCIAL = !Native;
  const PW_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  // ID peranti rawak yang kekal dalam peranti ini
  let device = store.get('device', null);
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(device || '')) {
    device = (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('').replace(/^(.{8})(.{4})(.{4})(.{4})/, '$1-$2-$3-$4-'));
    store.set('device', device);
  }
  const label = (() => {
    const ua = navigator.userAgent;
    const os = /iphone/i.test(ua) ? 'iPhone' : /ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : /linux/i.test(ua) ? 'Linux' : 'peranti';
    const br = Native ? 'App Bijak Labur' : /edg\//i.test(ua) ? 'Edge' : /samsungbrowser/i.test(ua) ? 'Samsung Internet' : /firefox|fxios/i.test(ua) ? 'Firefox' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : 'Pelayar';
    return `${br}, ${os}`;
  })();

  let auth = null, user = null, state = enabled ? 'loading' : 'off', info = {}, pendingCred = null, confirmation = null, verifier = null;
  let licence = store.get('akaun_lesen', null);   // { uid, token } lesen bertandatangan untuk peranti ini

  const api = {
    enabled, device, social: SOCIAL,
    get user() { return user ? { uid: user.uid, name: user.displayName || '', email: user.email || '', phone: user.phoneNumber || '' } : null; },
    get state() { return state; },
    get active() { return state === 'active'; },
    get licence() { return user && licence && licence.uid === user.uid ? licence.token : null; },
    get info() { return info; },
    call, open, signOut, sync
  };

  function announce() { paintButton(); document.dispatchEvent(new CustomEvent('akaunchange')); if (dlg.open) renderPane(); }
  function setState(s, extra) { state = s; if (extra) info = { ...info, ...extra }; announce(); }

  /* ---------- Pelayan ---------- */
  async function call(path, body = {}, retry = true) {
    if (!enabled || !user) throw Object.assign(new Error('Sila log masuk dahulu.'), { status: 401 });
    const token = await user.getIdToken();
    const r = await fetch(API.replace(/\/$/, '') + path, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ device, ...body })
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && retry) { await user.getIdToken(true); return call(path, body, false); }
    if (!r.ok) throw Object.assign(new Error(d.error || 'Ralat pelayan akaun.'), { status: r.status, data: d });
    if ('licence' in d) saveLicence(d.licence);
    return d;
  }
  function saveLicence(token) { licence = token && user ? { uid: user.uid, token } : null; store.set('akaun_lesen', licence); }

  const boundTo = () => store.get('akaun_terikat', null);

  // Sahkan peranti ini dengan pelayan. takeover = pindahkan akaun ke peranti ini
  async function sync(takeover = false, quiet = true) {
    if (!user) return;
    if (!user.providerData.some(p => p.providerId === 'password')) { setState('password'); open(); return; }
    try {
      const d = await call('/akaun/sesi', { label, takeover });
      const fresh = state !== 'active';
      store.set('akaun_terikat', user.uid);
      setState('active', { trialUsed: d.trialUsed, plan: d.plan, exp: d.exp, switchesLeft: d.switchesLeft });
      if (takeover) { toast('Akaun kini aktif pada peranti ini. Peranti lain telah dilog keluar.', 4500); close(); }
      else if (fresh && dlg.open) { close(); toast('Log masuk berjaya. Akaun anda aktif pada peranti ini.', 3500); }
    } catch (e) {
      const d = e.data || {};
      if (e.status === 409 && d.code === 'device') {
        if (boundTo() === user.uid) {
          // Akaun telah dipindahkan ke peranti lain: log keluar di sini
          await signOut(false);
          toast('Akaun anda kini digunakan pada peranti lain, jadi peranti ini telah dilog keluar.', 6000);
          return;
        }
        setState('conflict', { other: d.other, switchesLeft: d.switchesLeft }); open();
      } else if (e.status === 429) { setState('limit', { next: d.next }); open(); }
      else if (e.status === 403 && d.code === 'password') { setState('password'); open(); }
      else if (!e.status && boundTo() === user.uid) setState('active');   // luar talian: guna lesen tersimpan
      else { setState('error', { error: e.status ? e.message : 'Tiada sambungan ke pelayan akaun. Cuba lagi sebentar.' }); if (!quiet) open(); }
    }
  }

  async function signOut(release = true) {
    if (release && user && boundTo() === user.uid) { try { await call('/akaun/keluar'); } catch {} }
    store.set('akaun_terikat', null); saveLicence(null); info = {};
    if (auth) await auth.signOut().catch(() => {});
  }

  /* ---------- Firebase ---------- */
  async function init() {
    if (!enabled) { announce(); return; }
    try {
      await loadScript('js/vendor/firebase-app-compat.js');
      await loadScript('js/vendor/firebase-auth-compat.js');
      firebase.initializeApp(FIREBASE);
      auth = firebase.auth();
      auth.languageCode = 'ms';
      if (SOCIAL) auth.getRedirectResult().then(r => r && r.user && afterSignIn()).catch(authError);
      await new Promise(res => {
        let first = true;
        auth.onAuthStateChanged(async u => {
          user = u;
          if (!u) { setState('guest'); }
          else { if (state !== 'active') setState('loading'); await sync(); }
          if (first) { first = false; res(); }
        });
      });
    } catch (e) { console.warn('Akaun tidak dapat dimuatkan', e); setState('error', { error: 'Log masuk tidak dapat dimuatkan. Semak sambungan internet.' }); }
  }

  // Selepas log masuk dengan Google atau Facebook, pautkan kaedah lama yang tertangguh
  async function afterSignIn() {
    if (pendingCred && auth.currentUser) { try { await auth.currentUser.linkWithCredential(pendingCred); } catch {} pendingCred = null; }
  }

  const MSG = {
    'auth/invalid-email': 'E-mel tidak sah.',
    'auth/user-disabled': 'Akaun ini telah disekat.',
    'auth/user-not-found': 'E-mel atau kata laluan salah.',
    'auth/wrong-password': 'E-mel atau kata laluan salah.',
    'auth/invalid-credential': 'E-mel atau kata laluan salah.',
    'auth/invalid-login-credentials': 'E-mel atau kata laluan salah.',
    'auth/email-already-in-use': 'E-mel ini sudah didaftarkan. Log masuk dengan e-mel ini, atau guna e-mel lain.',
    'auth/credential-already-in-use': 'Kaedah ini sudah dipautkan kepada akaun lain.',
    'auth/weak-password': 'Kata laluan terlalu lemah.',
    'auth/too-many-requests': 'Terlalu banyak cubaan. Cuba lagi selepas beberapa minit.',
    'auth/network-request-failed': 'Tiada sambungan internet.',
    'auth/popup-closed-by-user': '',
    'auth/cancelled-popup-request': '',
    'auth/invalid-phone-number': 'Nombor telefon tidak sah.',
    'auth/invalid-verification-code': 'Kod pengesahan salah.',
    'auth/code-expired': 'Kod pengesahan telah tamat. Minta kod baharu.',
    'auth/missing-verification-code': 'Masukkan kod 6 digit.',
    'auth/quota-exceeded': 'Had SMS harian telah dicapai. Cuba kaedah lain atau esok.',
    'auth/requires-recent-login': 'Sila log masuk semula, kemudian tetapkan kata laluan.',
    'auth/unauthorized-domain': 'Domain ini belum dibenarkan dalam Firebase.',
    'auth/operation-not-allowed': 'Kaedah log masuk ini belum dihidupkan.'
  };
  function authError(e) {
    if (!e) return;
    if (e.code === 'auth/account-exists-with-different-credential') {
      pendingCred = e.credential;
      showErr('E-mel ini sudah didaftarkan dengan kaedah lain. Log masuk dengan kaedah asal; kaedah ini akan dipautkan selepas itu.');
      return;
    }
    const m = MSG[e.code];
    if (m !== '') showErr(m || (e.message || 'Log masuk gagal.').replace(/^Firebase:\s*/, ''));
  }

  async function social(kind) {
    const P = kind === 'google' ? new firebase.auth.GoogleAuthProvider() : new firebase.auth.FacebookAuthProvider();
    if (kind === 'facebook') P.addScope('email');
    if (kind === 'google') P.setCustomParameters({ prompt: 'select_account' });
    try { await auth.signInWithPopup(P); await afterSignIn(); }
    catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return auth.signInWithRedirect(P).catch(authError);
      authError(e);
    }
  }

  // 012-345 6789 -> +60123456789
  const e164 = s => { let d = String(s).replace(/[^\d+]/g, ''); if (d.startsWith('+')) return d; d = d.replace(/^00/, ''); if (d.startsWith('60')) return '+' + d; if (d.startsWith('0')) return '+6' + d; return '+60' + d; };

  /* ---------- Paparan ---------- */
  const btn = $('#akaunBtn');
  function paintButton() {
    if (!btn) return;
    const u = api.user;
    const initial = u && (u.name || u.email || u.phone || '?').trim().charAt(0).toUpperCase();
    btn.innerHTML = u && state === 'active' ? `<span class="ak-avatar" aria-hidden="true">${esc(initial)}</span>` : icon('user');
    const lbl = u && state === 'active' ? `Akaun: ${u.name || u.email || u.phone}` : 'Log masuk atau daftar';
    btn.setAttribute('aria-label', lbl); btn.title = lbl;
    btn.classList.toggle('needs', !!u && state !== 'active' && state !== 'loading');
  }

  const dlg = document.createElement('dialog');
  dlg.id = 'akaunDlg'; dlg.className = 'ak-dlg'; dlg.setAttribute('aria-labelledby', 'akTitle');
  document.body.appendChild(dlg);
  let pane = 'pilih', emailMode = 'masuk';

  const GOOGLE = '<svg class="ak-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"/></svg>';
  const FB = '<svg class="ak-logo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path fill="#fff" d="M16.7 15.5 17.2 12h-3.4V9.8c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.2-2.7-.2c-2.8 0-4.6 1.7-4.6 4.7V12H7v3.5h3v8.4a12 12 0 0 0 3.8 0v-8.4h2.9Z"/></svg>';
  const pwHint = '<p class="muted small">Sekurang-kurangnya 8 aksara, dengan huruf dan nombor.</p>';
  const dateMs = sec => new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(sec * 1000));

  function paneFor() {
    if (!enabled) return 'tutup';
    if (!user) return ['pilih', 'emel', 'telefon', 'kod', 'lupa'].includes(pane) ? pane : 'pilih';
    return { password: 'katalaluan', conflict: 'peranti', limit: 'had', error: 'ralat', loading: 'memuat' }[state] || 'profil';
  }

  function renderPane() {
    const p = paneFor(), u = api.user;
    // reCAPTCHA terikat pada elemen lama; cipta semula selepas setiap paparan
    if (verifier) { try { verifier.clear(); } catch {} verifier = null; }
    let h = '';
    if (p === 'tutup') h = `<h2 id="akTitle">Akaun akan dibuka tidak lama lagi</h2><p class="muted">Buat masa ini semua ciri percuma boleh digunakan sebagai tetamu. Log masuk dengan Google, Facebook atau nombor telefon akan dibuka tidak lama lagi.</p>${footer(true)}`;
    else if (p === 'pilih') h = `<p class="eyebrow">Akaun Bijak Labur</p><h2 id="akTitle">Log masuk atau daftar</h2>
      <p class="muted small">Satu akaun untuk satu peranti. Akaun diperlukan untuk Premium.</p>
      <div class="ak-list">
        ${SOCIAL && METHODS.google ? `<button type="button" class="btn ghost block ak-prov" data-ak="google">${GOOGLE}Teruskan dengan Google</button>` : ''}
        ${SOCIAL && METHODS.facebook ? `<button type="button" class="btn ghost block ak-prov" data-ak="facebook">${FB}Teruskan dengan Facebook</button>` : ''}
        ${METHODS.phone ? `<button type="button" class="btn ghost block ak-prov" data-ak-pane="telefon">${icon('phone')}Teruskan dengan nombor telefon</button>` : ''}
        <button type="button" class="btn ghost block ak-prov" data-ak-pane="emel">${icon('mail')}Teruskan dengan e-mel</button>
      </div>
      <p class="err" id="akErr" role="alert"></p>
      <div class="ak-guest"><button type="button" class="link-btn" data-ak-close>Guna sebagai tetamu</button><span class="muted small">Semua ciri percuma, tanpa Premium.</span></div>
      <p class="muted small ak-fine">Dengan meneruskan, anda bersetuju dengan <a href="terma.html">Terma</a> dan <a href="privacy.html">Dasar privasi</a>.</p>`;
    else if (p === 'emel') h = `<button type="button" class="link-btn back" data-ak-pane="pilih">${icon('chev')}Kaedah lain</button>
      <h2 id="akTitle">${emailMode === 'daftar' ? 'Daftar dengan e-mel' : 'Log masuk dengan e-mel'}</h2>
      <form id="akEmailForm" autocomplete="on">
        ${emailMode === 'daftar' ? '<div class="field"><label for="akName">Nama</label><input id="akName" autocomplete="name" maxlength="60" required></div>' : ''}
        <div class="field"><label for="akEmail">E-mel</label><input id="akEmail" type="email" autocomplete="email" required maxlength="100"></div>
        <div class="field"><label for="akPw">Kata laluan</label><input id="akPw" type="password" autocomplete="${emailMode === 'daftar' ? 'new-password' : 'current-password'}" required minlength="${emailMode === 'daftar' ? 8 : 6}"></div>
        ${emailMode === 'daftar' ? pwHint : ''}
        <p class="err" id="akErr" role="alert"></p>
        <button class="btn block" type="submit" id="akGo">${emailMode === 'daftar' ? 'Daftar' : 'Log masuk'}</button>
      </form>
      <div class="ak-row">${emailMode === 'daftar' ? '<span class="muted small">Sudah ada akaun?</span><button type="button" class="link-btn" data-ak-mode="masuk">Log masuk</button>' : '<span class="muted small">Belum ada akaun?</span><button type="button" class="link-btn" data-ak-mode="daftar">Daftar</button><button type="button" class="link-btn" data-ak-pane="lupa">Lupa kata laluan</button>'}</div>`;
    else if (p === 'lupa') h = `<button type="button" class="link-btn back" data-ak-pane="emel">${icon('chev')}Kembali</button>
      <h2 id="akTitle">Tetapkan semula kata laluan</h2>
      <form id="akResetForm"><div class="field"><label for="akEmail">E-mel akaun</label><input id="akEmail" type="email" autocomplete="email" required></div>
      <p class="err" id="akErr" role="alert"></p><button class="btn block" type="submit" id="akGo">Hantar pautan</button></form>`;
    else if (p === 'telefon') h = `<button type="button" class="link-btn back" data-ak-pane="pilih">${icon('chev')}Kaedah lain</button>
      <h2 id="akTitle">Nombor telefon</h2>
      <form id="akPhoneForm"><div class="field"><label for="akPhone">Nombor telefon bimbit</label><input id="akPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="012 345 6789" required></div>
      <p class="muted small">Kami akan menghantar kod 6 digit melalui SMS. Selepas itu anda perlu menetapkan e-mel dan kata laluan.</p>
      <p class="err" id="akErr" role="alert"></p><button class="btn block" type="submit" id="akGo">Hantar kod</button><div id="akCaptcha"></div></form>`;
    else if (p === 'kod') h = `<button type="button" class="link-btn back" data-ak-pane="telefon">${icon('chev')}Tukar nombor</button>
      <h2 id="akTitle">Masukkan kod SMS</h2>
      <form id="akCodeForm"><div class="field"><label for="akCode">Kod 6 digit</label><input id="akCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" required></div>
      <p class="err" id="akErr" role="alert"></p><button class="btn block" type="submit" id="akGo">Sahkan</button></form>`;
    else if (p === 'katalaluan') h = `<p class="eyebrow">Langkah terakhir</p><h2 id="akTitle">Tetapkan kata laluan</h2>
      <p class="muted small">Setiap akaun Bijak Labur wajib ada kata laluan. Anda boleh log masuk dengan ${u.phone && !u.email ? 'nombor telefon' : 'kaedah tadi'} atau dengan e-mel dan kata laluan ini.</p>
      <form id="akSetPwForm" autocomplete="on">
        <div class="field"><label for="akEmail">E-mel</label><input id="akEmail" type="email" autocomplete="email" required maxlength="100" value="${esc(u.email)}" ${u.email ? 'readonly' : ''}></div>
        <div class="field"><label for="akPw">Kata laluan baharu</label><input id="akPw" type="password" autocomplete="new-password" required minlength="8"></div>
        <div class="field"><label for="akPw2">Ulang kata laluan</label><input id="akPw2" type="password" autocomplete="new-password" required minlength="8"></div>
        ${pwHint}
        <p class="err" id="akErr" role="alert"></p>
        <button class="btn block" type="submit" id="akGo">Simpan kata laluan</button>
      </form>
      <div class="ak-row"><button type="button" class="link-btn" data-ak-out>Log keluar</button></div>`;
    else if (p === 'peranti') {
      const o = info.other || {}, left = info.switchesLeft;
      h = `<p class="eyebrow">Satu akaun, satu peranti</p><h2 id="akTitle">Akaun ini aktif pada peranti lain</h2>
      <div class="card ak-dev">${icon('phone')}<div><b>${esc(o.label || 'Peranti lain')}</b><div class="muted small">${o.since ? 'Sejak ' + dateMs(o.since) : ''}</div></div></div>
      <p class="muted small">Jika anda teruskan di sini, peranti tersebut akan dilog keluar dan Premium berpindah ke peranti ini.${left != null ? ` Anda boleh menukar peranti ${left} kali lagi dalam 30 hari.` : ''}</p>
      <p class="err" id="akErr" role="alert"></p>
      <div class="actions end"><button type="button" class="btn ghost" data-ak-out>Log keluar</button><button type="button" class="btn" id="akTake">Guna di peranti ini</button></div>`;
    }
    else if (p === 'had') h = `<h2 id="akTitle">Had tukar peranti dicapai</h2>
      <p class="muted">Untuk melindungi akaun daripada dikongsi, akaun hanya boleh bertukar peranti beberapa kali dalam 30 hari.${info.next ? ` Anda boleh menukar peranti semula pada ${dateMs(info.next)}.` : ''} Teruskan menggunakan peranti asal anda, atau log keluar di sini.</p>
      <div class="actions end"><button type="button" class="btn ghost" data-ak-out>Log keluar</button><button type="button" class="btn" data-ak-close>Tutup</button></div>`;
    else if (p === 'ralat') h = `<h2 id="akTitle">Akaun tidak dapat disahkan</h2><p class="muted">${esc(info.error || 'Cuba lagi sebentar.')}</p>
      <div class="actions end"><button type="button" class="btn ghost" data-ak-out>Log keluar</button><button type="button" class="btn" id="akRetry">Cuba lagi</button></div>`;
    else if (p === 'memuat') h = `<h2 id="akTitle">Mengesahkan akaun</h2><p class="muted"><span class="spinner"></span> Sebentar…</p>`;
    else if (p === 'profil') {
      const prov = user.providerData.map(x => ({ 'google.com': 'Google', 'facebook.com': 'Facebook', phone: 'Telefon', password: 'E-mel dan kata laluan' }[x.providerId])).filter(Boolean);
      const plan = typeof Premium !== 'undefined' && Premium.plan;
      h = `<p class="eyebrow">Akaun Bijak Labur</p><h2 id="akTitle">${esc(u.name || 'Akaun anda')}</h2>
      <dl class="ak-dl">
        ${u.email ? `<dt>E-mel</dt><dd>${esc(u.email)}</dd>` : ''}
        ${u.phone ? `<dt>Telefon</dt><dd>${esc(u.phone)}</dd>` : ''}
        <dt>Log masuk dengan</dt><dd>${esc(prov.join(', '))}</dd>
        <dt>Peranti aktif</dt><dd>${esc(label)} (peranti ini)</dd>
        <dt>Premium</dt><dd>${plan ? esc(Premium.PLANS[plan].name) + (Premium.trialing ? ' (percubaan)' : '') : 'Tiada'}</dd>
      </dl>
      <p class="muted small">Satu akaun untuk satu peranti. Log keluar dahulu sebelum menggunakan akaun ini pada peranti lain.</p>
      <div class="actions end"><button type="button" class="btn ghost" data-ak-out>Log keluar</button><a class="btn" href="#premium" data-ak-close>Premium</a></div>`;
    }
    dlg.innerHTML = `<button type="button" class="icon-btn ak-x" data-ak-close aria-label="Tutup">${icon('x')}</button>${h}`;
  }
  function footer() { return '<div class="actions end"><button type="button" class="btn" data-ak-close>Tutup</button></div>'; }

  function showErr(m) { const el = $('#akErr', dlg); if (el) el.textContent = m || ''; else if (m) toast(m, 5000); }
  function busy(on, text) { const b = $('#akGo', dlg) || $('#akTake', dlg); if (!b) return; b.disabled = on; if (on) { b.dataset.t = b.textContent; b.innerHTML = `<span class="spinner"></span> ${text || 'Sebentar'}`; } else if (b.dataset.t) b.textContent = b.dataset.t; }

  function open(p) { if (p) pane = p; renderPane(); if (!dlg.open) dlg.showModal(); }
  function close() { if (dlg.open) dlg.close(); }

  dlg.addEventListener('click', async e => {
    const t = e.target.closest('button, a'); if (!t) { if (e.target === dlg) close(); return; }
    if (t.hasAttribute('data-ak-close')) { close(); return; }
    if (t.dataset.akPane) { pane = t.dataset.akPane; renderPane(); const f = $('input', dlg); if (f) f.focus(); return; }
    if (t.dataset.akMode) { emailMode = t.dataset.akMode; renderPane(); return; }
    if (t.dataset.ak) { showErr(''); await social(t.dataset.ak); return; }
    if (t.hasAttribute('data-ak-out')) { await signOut(); pane = 'pilih'; close(); toast('Anda telah log keluar.'); return; }
    if (t.id === 'akTake') { busy(true, 'Memindahkan'); await sync(true, false); busy(false); return; }
    if (t.id === 'akRetry') { setState('loading'); await sync(false, false); }
  });

  dlg.addEventListener('submit', async e => {
    e.preventDefault(); showErr('');
    const f = e.target, v = id => ($('#' + id, dlg) || {}).value || '';
    try {
      if (f.id === 'akEmailForm') {
        busy(true);
        const email = v('akEmail').trim(), pw = v('akPw');
        if (emailMode === 'daftar') {
          if (!PW_RULE.test(pw)) { busy(false); return showErr('Kata laluan perlu sekurang-kurangnya 8 aksara, dengan huruf dan nombor.'); }
          const c = await auth.createUserWithEmailAndPassword(email, pw);
          await c.user.updateProfile({ displayName: v('akName').trim().slice(0, 60) });
          c.user.sendEmailVerification().catch(() => {});
          paintButton();
        } else await auth.signInWithEmailAndPassword(email, pw);
        await afterSignIn();
      } else if (f.id === 'akResetForm') {
        busy(true);
        await auth.sendPasswordResetEmail(v('akEmail').trim());
        busy(false); showErr(''); toast('Pautan tetapan semula telah dihantar ke e-mel anda.', 5000); pane = 'emel'; renderPane();
      } else if (f.id === 'akPhoneForm') {
        busy(true, 'Menghantar');
        if (!verifier) verifier = new firebase.auth.RecaptchaVerifier($('#akCaptcha', dlg), { size: 'invisible' });
        confirmation = await auth.signInWithPhoneNumber(e164(v('akPhone')), verifier);
        pane = 'kod'; renderPane(); $('#akCode', dlg).focus();
      } else if (f.id === 'akCodeForm') {
        busy(true, 'Mengesahkan');
        await confirmation.confirm(v('akCode').trim());
        await afterSignIn();
      } else if (f.id === 'akSetPwForm') {
        const email = v('akEmail').trim(), pw = v('akPw');
        if (!PW_RULE.test(pw)) return showErr('Kata laluan perlu sekurang-kurangnya 8 aksara, dengan huruf dan nombor.');
        if (pw !== v('akPw2')) return showErr('Kata laluan tidak sama.');
        busy(true, 'Menyimpan');
        await user.linkWithCredential(firebase.auth.EmailAuthProvider.credential(email, pw));
        await user.getIdToken(true);
        setState('loading'); await sync(false, false);
        if (state === 'active') toast('Kata laluan disimpan. Akaun anda sedia.', 4000);
      }
    } catch (err) {
      busy(false);
      if (verifier && f.id === 'akPhoneForm') { try { verifier.clear(); } catch {} verifier = null; }
      authError(err);
    }
  });

  if (btn) btn.addEventListener('click', () => open());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && user && state === 'active') sync(); });
  setInterval(() => { if (user && state === 'active' && navigator.onLine !== false) sync(); }, 10 * 60 * 1000);
  // Pautan seperti href="#akaun" (cth. dari menu tetapan) membuka tetingkap akaun
  document.addEventListener('click', e => { const a = e.target.closest('[data-akaun-open]'); if (a) { e.preventDefault(); open(); } });

  paintButton();
  api.ready = init();
  return api;
})();
