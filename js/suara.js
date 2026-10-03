/* Bijak Labur: Suara. Bacakan kandungan halaman semasa (semua tab) dengan suara peranti.
   Pelayar: Web Speech API. App Android/iOS: plugin TextToSpeech asli. Teks Arab, Cina dan Tamil dibaca dengan suara bahasa itu jika ada. */
(function () {
  const NATIVE_TTS = plugin('TextToSpeech');
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  const btn = $('#sayBtn');
  // Suara HD: alamat pelayan Bijak Labur (Cloudflare Worker) dengan laluan /tts. Kosong = guna suara peranti sahaja.
  const HD_API = '';
  if (!NATIVE_TTS && !synth && !HD_API) { btn.remove(); return; }

  const BASE = { ms: 'ms-MY', en: 'en-GB', 'zh-Hans': 'zh-CN', zh: 'zh-CN', ta: 'ta-IN', ar: 'ar-SA' };
  const SCRIPTS = [[/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/, 'ar-SA'], [/[㐀-鿿　-〿＀-￯]/, 'zh-CN'], [/[஀-௿]/, 'ta-IN']];
  const SKIP = 'button, nav, select, option, input, textarea, svg, script, style, audio, video, canvas, iframe, [aria-hidden="true"], .hidden, [hidden], .tts-skip, .skip-link';
  const RATES = [0.8, 1, 1.2];

  let queue = [], idx = 0, state = 'idle', token = 0, rate = store.get('sayRate', 1), lastEl = null;
  if (!RATES.includes(rate)) rate = 1;

  /* ---------- Kumpul teks halaman ---------- */
  const blockCache = new Map();
  function blockOf(el, root) {
    for (let e = el; e && e !== root; e = e.parentElement) {
      if (blockCache.has(e)) return blockCache.get(e);
      const d = getComputedStyle(e).display;
      if (!/^inline/.test(d) || e.matches('li, td, th, h1, h2, h3, h4, p')) { blockCache.set(e, e); return e; }
    }
    return root;
  }
  const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

  function collect(root) {
    blockCache.clear();
    const groups = [], byEl = new Map();
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || !n.nodeValue.trim() || p.closest(SKIP) || !visible(p)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    for (let n; (n = tw.nextNode());) {
      const b = blockOf(n.parentElement, root);
      let g = byEl.get(b);
      if (!g) { g = { el: b, text: '' }; byEl.set(b, g); groups.push(g); }
      g.text += ' ' + n.nodeValue;
    }
    return groups.map(g => ({ el: g.el, text: tidy(g.text), lang: baseLang(g.el) })).filter(g => /[\p{L}\p{N}]/u.test(g.text));
  }
  const tidy = t => t.replace(/\s+/g, ' ').replace(/\s([.,!?:;])/g, '$1').trim();
  function baseLang(el) {
    const l = (el.closest('[lang]') || document.documentElement).getAttribute('lang') || 'ms';
    return BASE[l] || BASE[l.split('-')[0]] || 'ms-MY';
  }

  /* Pecah ikut tulisan (Arab/Cina/Tamil/Latin) dan ayat supaya setiap bahagian guna suara yang betul */
  function pieces(text, base) {
    const out = [];
    let cur = '', curLang = null;
    for (const ch of text) {
      const hit = SCRIPTS.find(([re]) => re.test(ch));
      const lang = hit ? hit[1] : /[\p{L}\p{N}]/u.test(ch) ? base : null;
      if (lang && curLang && lang !== curLang) { out.push([cur, curLang]); cur = ''; }
      if (lang) curLang = lang;
      cur += ch;
    }
    if (cur.trim()) out.push([cur, curLang || base]);
    return out.flatMap(([t, l]) => sentences(t).map(s => ({ text: s, lang: l })));
  }
  function sentences(t) {
    const parts = t.match(/[^.!?。！？]+[.!?。！？]*\s*/g) || [t], out = [];
    let buf = '';
    for (const p of parts) {
      if ((buf + p).length > 220 && buf) { out.push(buf.trim()); buf = ''; }
      buf += p;
    }
    if (buf.trim()) out.push(buf.trim());
    return out.filter(s => /[\p{L}\p{N}]/u.test(s));
  }

  /* ---------- Enjin suara: setiap bahasa ada senarai ganti (cth. Melayu → Indonesia) ---------- */
  const LANGS = [
    { k: 'ms', name: 'Bahasa Melayu', chain: ['ms-MY', 'ms', 'id-ID', 'id', 'in-ID'], sample: 'Selamat datang ke Bijak Labur. Mari belajar melabur dengan bijak.', soft: true },
    { k: 'en', name: 'English', chain: ['en-GB', 'en-MY', 'en-US', 'en-AU', 'en-IN', 'en'], sample: 'Welcome to Bijak Labur. Let us learn to invest wisely.', soft: true },
    { k: 'zh', name: '中文 (华语)', chain: ['zh-CN', 'cmn-CN', 'zh-SG', 'cmn-Hans-CN', 'zh-TW', 'cmn-TW', 'zh-HK', 'yue-HK', 'zh'], sample: '欢迎来到 Bijak Labur。我们一起学习投资。' },
    { k: 'ta', name: 'தமிழ்', chain: ['ta-IN', 'ta-MY', 'ta-SG', 'ta-LK', 'ta'], sample: 'பிஜாக் லாபூருக்கு வரவேற்கிறோம். முதலீடு செய்யக் கற்போம்.' },
    { k: 'ar', name: 'العربية', chain: ['ar-SA', 'ar-001', 'ar-AE', 'ar-EG', 'ar-XA', 'ar'], sample: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ' }
  ];
  const LK = Object.fromEntries(LANGS.map(l => [l.k, l]));
  const keyOf = lang => { const b = String(lang).toLowerCase().replace('_', '-').split('-')[0]; return { id: 'ms', in: 'ms', cmn: 'zh', yue: 'zh' }[b] || b; };
  const norm = l => String(l).toLowerCase().replace('_', '-');

  let dlg = null;
  let voices = [];          // [{ name, lang, i }] i = indeks untuk plugin asli
  let nativeLangs = null;
  async function loadVoices() {
    if (NATIVE_TTS) {
      try { voices = ((await NATIVE_TTS.getSupportedVoices()).voices || []).map((v, i) => ({ name: v.name, lang: v.lang, i })); } catch { voices = []; }
      try { nativeLangs = ((await NATIVE_TTS.getSupportedLanguages()).languages || []).map(norm); } catch { nativeLangs = null; }
    } else voices = synth.getVoices().map(v => ({ name: v.name, lang: v.lang, v }));
    if (dlg && dlg.open) renderDlg();
  }
  loadVoices();
  if (synth && !NATIVE_TTS && 'onvoiceschanged' in synth) synth.addEventListener('voiceschanged', loadVoices);

  const chosen = () => store.get('sayVoice', {});
  const voicesFor = k => voices.filter(v => keyOf(v.lang) === k);
  // Pilih suara: pilihan pengguna, kemudian ikut turutan senarai ganti
  // Utamakan suara berkualiti (Natural/Neural, Enhanced/Premium, Google) dan elak suara robot atau suara hiburan
  function quality(v) {
    const n = v.name || '';
    let q = 0;
    if (/natural|neural|online/i.test(n)) q += 6;
    if (/premium|enhanced|\(plus\)|wavenet|studio/i.test(n)) q += 5;
    if (/google/i.test(n)) q += 3;
    if (/microsoft/i.test(n)) q += 1;
    if (/espeak|compact|eloquence|novelty|bad news|bells|bubbles|cellos|jester|organ|trinoids|whisper|zarvox|albert|fred|hysterical|superstar|wobble|boing|bahh|junior|ralph/i.test(n)) q -= 8;
    return q;
  }
  const best = list => list.length ? list.slice().sort((a, b) => quality(b) - quality(a))[0] : null;
  function resolve(lang) {
    const k = keyOf(lang), L = LK[k];
    if (!L) return { lang };
    const list = voicesFor(k), pick = chosen()[k];
    let v = pick && list.find(x => x.name === pick);
    if (!v) for (const c of L.chain) { v = best(list.filter(x => norm(x.lang) === norm(c))); if (v) break; }
    if (!v) v = best(list);
    if (v) return { lang: v.lang.replace('_', '-'), voice: v };
    if (nativeLangs) { const c = L.chain.find(c => nativeLangs.includes(norm(c))); if (c) return { lang: c }; }
    return null;
  }
  // Tiada suara: Melayu dan Inggeris masih guna suara lalai; bahasa lain dilangkau dengan makluman
  const warned = new Set();
  function plan(lang) {
    const r = resolve(lang);
    if (r) return r;
    const k = keyOf(lang), L = LK[k];
    if (!voices.length && !NATIVE_TTS) return { lang };
    if (L && L.soft) return { lang: L.chain[0] };
    if (L && !warned.has(k)) { warned.add(k); toast(`Suara ${L.name} tiada pada peranti ini. Buka Tetapan suara untuk memasangnya.`, 4500); }
    return null;
  }

  /* ---------- Suara HD (neural, melalui pelayan) ---------- */
  const HD_OK = !!HD_API;
  const hdOn = () => HD_OK && store.get('sayHD', true) && navigator.onLine !== false && !hdDown;
  const hdGender = () => store.get('sayHDg', 'f');
  let hdDown = false, hdPending = new Map();
  const audio = new Audio();
  audio.preload = 'auto';
  // iOS: buka kunci audio dalam sentuhan pengguna supaya bahagian seterusnya boleh dimainkan
  function unlockAudio() {
    if (!HD_OK || audio.dataset.ok) return;
    audio.dataset.ok = '1';
    audio.src = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRBqpAAAAAAD/+xDEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7EMQpg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    audio.play().catch(() => {});
  }
  const hdUrl = (text, k) => `${HD_API.replace(/\/$/, '')}/tts?v=${k}-${hdGender()}&r=${rate}&t=${encodeURIComponent(text)}`;
  function hdFetch(text, k) {
    const u = hdUrl(text, k);
    if (!hdPending.has(u)) {
      const p = fetch(u).then(async r => {
        if (!r.ok) { const e = await r.json().catch(() => ({})); throw Object.assign(new Error(e.error || 'HD'), { status: r.status }); }
        return URL.createObjectURL(await r.blob());
      });
      p.catch(() => hdPending.delete(u));
      hdPending.set(u, p);
      if (hdPending.size > 24) { const [old, op] = hdPending.entries().next().value; hdPending.delete(old); op.then(URL.revokeObjectURL, () => {}); }
    }
    return hdPending.get(u);
  }
  const hdKey = lang => { const k = keyOf(lang); return LK[k] ? k : null; };
  function prefetch(q) { if (q && hdOn() && hdKey(q.lang)) hdFetch(q.text, hdKey(q.lang)).catch(() => {}); }
  async function sayHD(text, k) {
    const src = await hdFetch(text, k);
    return new Promise((res, rej) => {
      audio.onended = () => res();
      audio.onerror = () => rej('error');
      audio.onpause = () => { if (!audio.ended) rej('interrupted-hd'); };
      audio.src = src;
      audio.play().catch(rej);
    });
  }

  async function say(text, lang) {
    const k = hdKey(lang);
    if (k && hdOn()) {
      try { return await sayHD(text, k); }
      catch (e) {
        if (String(e) === 'interrupted-hd') throw e;
        // Pelayan tiada atau kuota habis: guna suara peranti untuk baki sesi ini
        if (e && e.status) { hdDown = true; toast(e.status === 429 ? 'Kuota Suara HD bulan ini habis. Guna suara peranti.' : 'Suara HD tidak tersedia. Guna suara peranti.', 3500); }
      }
    }
    return sayDevice(text, lang);
  }
  function sayDevice(text, lang) {
    if (!NATIVE_TTS && !synth) return Promise.resolve('skip');
    const r = plan(lang);
    if (!r) return Promise.resolve('skip');
    if (NATIVE_TTS) return NATIVE_TTS.speak(Object.assign({ text, lang: r.lang, rate, pitch: 1, volume: 1, category: 'playback' }, r.voice ? { voice: r.voice.i } : {}));
    return new Promise((res, rej) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = r.lang; u.rate = rate;
      if (r.voice && r.voice.v) try { u.voice = r.voice.v; } catch {}
      u.onend = res;
      u.onerror = e => rej(e.error || 'error');
      synth.speak(u);
    });
  }
  function hushEngine() {
    if (HD_OK && !audio.paused) { audio.onpause = null; audio.pause(); }
    if (NATIVE_TTS) NATIVE_TTS.stop().catch(() => {});
    else if (synth) synth.cancel();
  }

  /* ---------- Main ---------- */
  async function run(t) {
    while (t === token && state === 'playing' && idx < queue.length) {
      const q = queue[idx];
      mark(q.el); paint(); prefetch(queue[idx + 1]);
      try { await say(q.text, q.lang); }
      catch (e) {
        if (t !== token) return;
        // Dibatalkan oleh pembaca lain (cth. butang Dengar di Pustaka)
        if (/interrupt|cancel/i.test(String(e))) { if (String(e) === 'interrupted-hd') { pause(); return; } stop(); return; }
      }
      if (t !== token) return;
      idx++;
    }
    if (t === token && state === 'playing') stop();
  }

  function start() {
    const sel = String(getSelection && getSelection()).trim();
    const view = $('.view.active') || $('#main');
    if (sel.length > 2) {
      const el = getSelection().anchorNode && getSelection().anchorNode.parentElement;
      queue = pieces(tidy(sel), baseLang(el || view)).map(p => ({ ...p, el: null }));
    } else {
      queue = collect(view).flatMap(g => pieces(g.text, g.lang).map(p => ({ ...p, el: g.el })));
    }
    if (!queue.length) { toast('Tiada teks untuk dibaca di halaman ini.'); return; }
    if (synth && !NATIVE_TTS) synth.cancel();
    idx = 0; state = 'playing'; paint(); run(++token);
  }
  function pause() { state = 'paused'; token++; hushEngine(); paint(); }
  function resume() { state = 'playing'; paint(); run(++token); }
  function stop() { state = 'idle'; token++; hushEngine(); mark(null); queue = []; paint(); }
  function skip(d) {
    if (state === 'idle') return;
    const cur = queue[idx] && queue[idx].el;
    let n = idx;
    // Langkau ke blok seterusnya/sebelumnya, bukan sekadar ayat
    if (d > 0) { while (n < queue.length && queue[n].el === cur && cur) n++; if (!cur) n++; }
    else { while (n > 0 && queue[n - 1].el === cur && cur) n--; n = Math.max(0, n - 1); const p = queue[n] && queue[n].el; while (n > 0 && p && queue[n - 1].el === p) n--; }
    idx = Math.min(Math.max(0, n), queue.length);
    hushEngine();
    if (state === 'playing') run(++token); else paint();
  }

  function mark(el) {
    if (lastEl === el) return;
    if (lastEl) lastEl.classList.remove('tts-now');
    lastEl = el;
    if (!el) return;
    el.classList.add('tts-now');
    const r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 140) el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  /* ---------- Kawalan ---------- */
  const bar = document.createElement('div');
  bar.className = 'say-bar hidden'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Kawalan suara');
  bar.innerHTML = `
    <button class="say-c" data-say="prev" aria-label="Bahagian sebelum"><svg class="ic flip"><use href="#i-chev"/></svg></button>
    <button class="say-c main" data-say="toggle" aria-label="Jeda"><svg class="ic"><use href="#i-pause"/></svg></button>
    <button class="say-c" data-say="next" aria-label="Bahagian seterusnya"><svg class="ic"><use href="#i-chev"/></svg></button>
    <span class="say-txt" aria-live="polite">Membaca</span>
    <button class="say-rate" data-say="rate" aria-label="Kelajuan bacaan"></button>
    <button class="say-c" data-say="settings" aria-label="Tetapan suara"><svg class="ic"><use href="#i-sliders"/></svg></button>
    <button class="say-c" data-say="stop" aria-label="Berhenti"><svg class="ic"><use href="#i-x"/></svg></button>`;
  document.body.appendChild(bar);

  function paint() {
    const on = state !== 'idle';
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on);
    btn.setAttribute('aria-label', on ? 'Hentikan bacaan suara' : 'Bacakan halaman ini');
    bar.classList.toggle('hidden', !on);
    document.body.classList.toggle('saying', on);
    const t = $('[data-say="toggle"]', bar);
    t.setAttribute('aria-label', state === 'paused' ? 'Sambung' : 'Jeda');
    $('use', t).setAttribute('href', state === 'paused' ? '#i-play' : '#i-pause');
    $('.say-txt', bar).textContent = state === 'paused' ? 'Dijeda' : `Membaca ${Math.min(idx + 1, queue.length)}/${queue.length}`;
    $('.say-rate', bar).textContent = rate + '×';
  }

  btn.addEventListener('click', () => { unlockAudio(); state === 'idle' ? start() : stop(); });
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-say]'); if (!b) return;
    const a = b.dataset.say;
    if (a === 'toggle') state === 'paused' ? resume() : pause();
    else if (a === 'stop') stop();
    else if (a === 'next') skip(1);
    else if (a === 'prev') skip(-1);
    else if (a === 'settings') openDlg();
    else if (a === 'rate') {
      rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; store.set('sayRate', rate); paint();
      if (state === 'playing') { hushEngine(); run(++token); }
    }
  });
  // Tukar halaman: hentikan bacaan
  document.addEventListener('viewchange', () => { if (state !== 'idle') stop(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state !== 'idle') stop(); });
  window.addEventListener('pagehide', () => { if (state !== 'idle') stop(); });

  /* ---------- Tetapan suara: pilih suara setiap bahasa, cuba, dan cara memasang ---------- */
  const UA = navigator.userAgent;
  const OS = Native ? Native.getPlatform() : /android/i.test(UA) ? 'android' : /iphone|ipad|ipod/i.test(UA) || (/macintosh/i.test(UA) && navigator.maxTouchPoints > 1) ? 'ios' : /windows/i.test(UA) ? 'windows' : /macintosh/i.test(UA) ? 'mac' : 'other';
  const HELP = {
    android: 'Android: buka Tetapan, kemudian Sistem, Bahasa & input, Output teks-ke-pertuturan. Pilih enjin Speech Services by Google, tekan ikon tetapan dan Pasang data suara. Muat turun Bahasa Melayu (atau Indonesia), Cina (Mandarin), Tamil dan Arab.',
    ios: 'iPhone dan iPad: buka Tetapan, kemudian Kebolehcapaian, Kandungan Dituturkan, Suara. Pilih bahasa (Melayu, Cina, Tamil, Arab) dan muat turun suara yang tersedia. Kemudian buka semula Bijak Labur.',
    windows: 'Windows: buka Tetapan, kemudian Masa & bahasa, Pertuturan, Tambah suara. Pilih bahasa yang anda perlukan. Chrome dan Edge juga ada suara dalam talian.',
    mac: 'Mac: buka Tetapan Sistem, kemudian Kebolehcapaian, Kandungan Dituturkan, Suara Sistem, Urus Suara. Tandakan bahasa yang anda perlukan.',
    other: 'Pasang suara bahasa itu dalam tetapan teks-ke-pertuturan peranti anda, kemudian buka semula laman ini.'
  };
  const LBL = { ms: 'ms', en: 'en', zh: 'zh-Hans', ta: 'ta', ar: 'ar' };

  function renderDlg() {
    const pick = chosen();
    dlg.innerHTML = `
      <h2 id="sayDlgT">Tetapan suara</h2>
      <p class="muted small">Suara datang daripada peranti anda. Pilih suara bagi setiap bahasa dan tekan Cuba untuk mendengar.</p>
      <div class="say-langs">${LANGS.map(L => {
        const list = voicesFor(L.k), r = resolve(L.k), ok = !!r || L.soft || (!voices.length && !NATIVE_TTS);
        const tag = r && r.voice ? `${esc(r.voice.name)}${/^(id|in)/i.test(r.voice.lang) && !/indonesia/i.test(r.voice.name) ? ' (Indonesia)' : ''}` : ok ? 'Suara lalai peranti' : hdOn() ? 'Suara HD' : 'Tiada suara';
        return `<div class="say-lang">
          <div class="say-lh"><b lang="${LBL[L.k]}">${L.name}</b><span class="say-pill ${r || (!ok && hdOn()) ? 'ok' : ok ? 'mid' : 'no'}">${tag}</span></div>
          <div class="say-lr">${list.length > 1 ? `<select data-sayvoice="${L.k}" aria-label="Suara ${L.name}"><option value="">Automatik</option>${list.map(v => `<option value="${esc(v.name)}" ${v.name === pick[L.k] ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select>` : `<span class="muted small">${list.length ? 'Satu suara tersedia.' : ok ? 'Guna suara lalai peranti.' : hdOn() ? 'Guna Suara HD dalam talian.' : 'Pasang suara bahasa ini. Lihat cara di bawah.'}</span>`}
          <button type="button" class="btn sm ghost" data-saytest="${L.k}"><svg class="ic"><use href="#i-play"/></svg>Cuba</button></div>
        </div>`;
      }).join('')}</div>
      ${HD_OK ? `<div class="say-hd">
        <div><b>Suara HD</b><p class="muted small">Suara neural yang lebih semula jadi untuk semua 5 bahasa, termasuk Tamil Malaysia. Perlu internet.</p></div>
        <div class="say-hd-row"><span class="segmented small">${[['1', 'Hidup'], ['0', 'Mati']].map(([v, t]) => `<button type="button" class="seg ${String(+store.get('sayHD', true)) === v ? 'active' : ''}" data-sayhd="${v}">${t}</button>`).join('')}</span>
        <span class="segmented small">${[['f', 'Perempuan'], ['m', 'Lelaki']].map(([v, t]) => `<button type="button" class="seg ${hdGender() === v ? 'active' : ''}" data-sayhdg="${v}">${t}</button>`).join('')}</span></div>
      </div>` : ''}
      <div class="say-rate-row"><span>Kelajuan</span>${RATES.map(r => `<button type="button" class="chip ${r === rate ? 'active' : ''}" data-sayrate="${r}">${r}×</button>`).join('')}</div>
      <details class="say-help" ${LANGS.some(L => !L.soft && !resolve(L.k)) && voices.length ? 'open' : ''}><summary>Tiada suara untuk sesuatu bahasa?</summary><p class="small">${HELP[OS] || HELP.other}</p>
        ${NATIVE_TTS && OS === 'android' ? '<button type="button" class="btn sm" data-sayinstall>Buka pemasangan suara</button>' : ''}</details>
      <form method="dialog"><button class="btn block">Selesai</button></form>`;
  }
  function openDlg() {
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'say-dlg'; dlg.setAttribute('aria-labelledby', 'sayDlgT');
      document.body.appendChild(dlg);
      dlg.addEventListener('click', e => {
        let b;
        if ((b = e.target.closest('[data-saytest]'))) { unlockAudio(); const L = LK[b.dataset.saytest]; warned.delete(L.k); read(L.sample, L.chain[0]); }
        else if ((b = e.target.closest('[data-sayhd]'))) { store.set('sayHD', b.dataset.sayhd === '1'); hdDown = false; renderDlg(); }
        else if ((b = e.target.closest('[data-sayhdg]'))) { store.set('sayHDg', b.dataset.sayhdg); renderDlg(); }
        else if ((b = e.target.closest('[data-sayrate]'))) { rate = +b.dataset.sayrate; store.set('sayRate', rate); renderDlg(); paint(); }
        else if (e.target.closest('[data-sayinstall]')) NATIVE_TTS.openInstall().catch(() => toast('Buka Tetapan, kemudian cari Output teks-ke-pertuturan.', 4000));
      });
      dlg.addEventListener('change', e => {
        const sel = e.target.closest('[data-sayvoice]'); if (!sel) return;
        const c = chosen(); if (sel.value) c[sel.dataset.sayvoice] = sel.value; else delete c[sel.dataset.sayvoice];
        store.set('sayVoice', c); renderDlg();
      });
      dlg.addEventListener('close', () => { if (state !== 'idle' && !queue.some(q => q.el)) stop(); });
    }
    renderDlg(); dlg.showModal(); loadVoices();
  }
  $$('[data-say-settings]').forEach(b => b.addEventListener('click', openDlg));

  // Untuk ciri lain (cth. butang Dengar di Pustaka): bacakan teks tertentu
  function read(text, lang) {
    queue = pieces(tidy(text), BASE[lang] || lang || 'ms-MY').map(p => ({ ...p, el: null }));
    if (!queue.length) return;
    hushEngine(); idx = 0; state = 'playing'; paint(); run(++token);
  }
  window.Suara = { read, stop, settings: openDlg, get active() { return state !== 'idle'; } };
})();
