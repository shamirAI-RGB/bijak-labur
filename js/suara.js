/* Bijak Labur: Suara. Bacakan kandungan halaman semasa (semua tab) dengan suara peranti.
   Pelayar: Web Speech API. App Android/iOS: plugin TextToSpeech asli. Teks Arab, Cina dan Tamil dibaca dengan suara bahasa itu jika ada. */
(function () {
  const NATIVE_TTS = plugin('TextToSpeech');
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  const btn = $('#sayBtn');
  if (!NATIVE_TTS && !synth) { btn.remove(); return; }

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

  /* ---------- Enjin suara ---------- */
  function voiceFor(lang) {
    const vs = synth.getVoices(), base = lang.split('-')[0];
    return vs.find(v => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()) || vs.find(v => v.lang.toLowerCase().startsWith(base)) || null;
  }
  // Bahasa tanpa suara pada peranti dilangkau (kecuali Melayu dan Inggeris, yang guna suara lalai)
  function canSpeak(lang) {
    if (NATIVE_TTS || !synth.getVoices().length) return true;
    return !!voiceFor(lang) || /^(ms|en)/.test(lang);
  }

  function say(text, lang) {
    if (NATIVE_TTS) return NATIVE_TTS.speak({ text, lang, rate, pitch: 1, volume: 1, category: 'playback' });
    return new Promise((res, rej) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = rate;
      const v = voiceFor(lang); if (v) try { u.voice = v; } catch {}
      u.onend = res;
      u.onerror = e => rej(e.error || 'error');
      synth.speak(u);
    });
  }
  function hushEngine() {
    if (NATIVE_TTS) NATIVE_TTS.stop().catch(() => {});
    else synth.cancel();
  }

  /* ---------- Main ---------- */
  async function run(t) {
    while (t === token && state === 'playing' && idx < queue.length) {
      const q = queue[idx];
      mark(q.el); paint();
      if (canSpeak(q.lang)) {
        try { await say(q.text, q.lang); }
        catch (e) {
          if (t !== token) return;
          // Dibatalkan oleh pembaca lain (cth. butang Dengar di Pustaka)
          if (/interrupt|cancel/i.test(String(e))) { stop(); return; }
        }
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

  btn.addEventListener('click', () => state === 'idle' ? start() : stop());
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-say]'); if (!b) return;
    const a = b.dataset.say;
    if (a === 'toggle') state === 'paused' ? resume() : pause();
    else if (a === 'stop') stop();
    else if (a === 'next') skip(1);
    else if (a === 'prev') skip(-1);
    else if (a === 'rate') {
      rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; store.set('sayRate', rate); paint();
      if (state === 'playing') { hushEngine(); run(++token); }
    }
  });
  // Tukar halaman: hentikan bacaan
  document.addEventListener('viewchange', () => { if (state !== 'idle') stop(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state !== 'idle') stop(); });
  if (synth && 'onvoiceschanged' in synth) synth.addEventListener('voiceschanged', () => {});
  window.addEventListener('pagehide', () => { if (state !== 'idle') stop(); });

  // Untuk ciri lain (cth. butang Dengar di Pustaka): bacakan teks tertentu
  function read(text, lang) {
    queue = pieces(tidy(text), BASE[lang] || lang || 'ms-MY').map(p => ({ ...p, el: null }));
    if (!queue.length) return;
    hushEngine(); idx = 0; state = 'playing'; paint(); run(++token);
  }
  window.Suara = { read, stop, get active() { return state !== 'idle'; } };
})();
