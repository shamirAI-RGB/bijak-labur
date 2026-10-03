/* Bijak Labur: Pustaka Kanak-kanak. Rak buku 20 subjek, pembaca ebook 4 bahasa, kuiz bintang, bacaan suara.
   Percuma 3 hari dari kali pertama dibuka; selepas itu Bab 1 setiap subjek kekal percuma dan bab lain dibuka dengan pelan Pelajar atau Lengkap. */
(function () {
  const D = PustakaData.subjects;
  const BY = Object.fromEntries(D.map(s => [s.id, s]));
  const LANGS = [['ms', 'BM', 'ms-MY'], ['en', 'EN', 'en-GB'], ['zh', '中文', 'zh-CN'], ['ta', 'தமிழ்', 'ta-IN']];
  const LI = Object.fromEntries(LANGS.map((l, i) => [l[0], i]));
  const HTML_LANG = { ms: 'ms', en: 'en', zh: 'zh-Hans', ta: 'ta' };
  const FREE_DAYS = 3;
  const ZH_NUM = ['一', '二', '三', '四', '五', '六'];

  const U = {
    title: ['Pustaka Kanak-kanak', 'Kids Library', '儿童图书馆', 'குழந்தைகள் நூலகம்'],
    eyebrow: ['Untuk umur 4 hingga 12 tahun', 'For ages 4 to 12', '适合4至12岁儿童', '4 முதல் 12 வயது வரை'],
    lead: ['20 subjek mengikut kurikulum KPM (KSPK dan KSSR). Baca, dengar dan jawab kuiz untuk kumpul bintang.', '20 subjects following the KPM curriculum (KSPK and KSSR). Read, listen and answer quizzes to collect stars.', '20个科目，依据马来西亚教育部课程（KSPK和KSSR）。阅读、聆听、答题，收集星星。', 'கல்வி அமைச்சின் பாடத்திட்டப்படி (KSPK, KSSR) 20 பாடங்கள். வாசி, கேள், வினாடி வினாவுக்குப் பதில் சொல்லி நட்சத்திரங்களைச் சேகரி.'],
    all: ['Semua', 'All', '全部', 'அனைத்தும்'],
    shelf: ['Rak buku', 'Bookshelf', '书架', 'புத்தக அலமாரி'],
    chapter: ['Bab', 'Chapter', '第', 'அத்தியாயம்'],
    listen: ['Dengar', 'Listen', '听', 'கேள்'],
    stop: ['Berhenti', 'Stop', '停止', 'நிறுத்து'],
    next: ['Seterusnya', 'Next', '下一页', 'அடுத்து'],
    prev: ['Sebelum', 'Back', '上一页', 'முந்தைய'],
    quiz: ['Kuiz', 'Quiz', '小测验', 'வினாடி வினா'],
    right: ['Betul! Hebat!', 'Correct! Well done!', '答对了！真棒！', 'சரி! அருமை!'],
    wrong: ['Hampir! Cuba lagi.', 'Almost! Try again.', '差一点！再试一次。', 'கிட்டத்தட்ட! மீண்டும் முயல்.'],
    nextCh: ['Bab seterusnya', 'Next chapter', '下一章', 'அடுத்த அத்தியாயம்'],
    done: ['Habis! Kembali ke rak', 'Finished! Back to shelf', '读完了！回到书架', 'முடிந்தது! அலமாரிக்குத் திரும்பு'],
    again: ['Baca semula', 'Read again', '再读一次', 'மீண்டும் வாசி'],
    dskp: ['Rujukan kurikulum', 'Curriculum reference', '课程依据', 'பாடத்திட்டக் குறிப்பு'],
    note: ['Ringkasan pembelajaran ini disusun mengikut bidang dalam DSKP KPM dan bukan bahan rasmi KPM. Rujuk buku teks dan guru untuk huraian penuh.', 'These learning summaries follow the areas in the KPM DSKP documents. They are not official KPM material; see the textbook and teacher for full coverage.', '本学习摘要按教育部DSKP的学习领域编排，并非教育部官方教材。完整内容请参考课本和老师。', 'இச்சுருக்கங்கள் கல்வி அமைச்சின் DSKP பகுதிகளின்படி அமைந்தவை; அதிகாரபூர்வப் பாடநூல் அல்ல. முழு விவரத்திற்குப் பாடநூலையும் ஆசிரியரையும் நாடு.'],
    freeLeft: ['Percuma 3 hari: tinggal {t}. Semua bab dibuka.', 'Free for 3 days: {t} left. Every chapter is open.', '免费3天：还剩{t}，所有章节开放。', '3 நாள் இலவசம்: {t} மீதம். எல்லா அத்தியாயங்களும் திறந்துள்ளன.'],
    locked: ['Tempoh percuma tamat. Bab 1 setiap subjek kekal percuma. Buka semua bab dengan pelan Pelajar atau Lengkap.', 'The free period has ended. Chapter 1 of every subject stays free. Unlock every chapter with the Pelajar or Lengkap plan.', '免费期已结束。每科第1章继续免费，订阅 Pelajar 或 Lengkap 配套可解锁全部章节。', 'இலவசக் காலம் முடிந்தது. ஒவ்வொரு பாடத்தின் முதல் அத்தியாயம் இலவசம். Pelajar அல்லது Lengkap திட்டத்தில் அனைத்தையும் திற.'],
    premium: ['Premium aktif: semua bab dibuka.', 'Premium active: every chapter is open.', '高级版已启用：所有章节开放。', 'பிரீமியம் செயலில்: எல்லா அத்தியாயங்களும் திறந்துள்ளன.'],
    unlock: ['Buka semua bab', 'Unlock all chapters', '解锁全部章节', 'அனைத்தையும் திற'],
    lockedCh: ['Bab ini untuk Premium', 'This chapter is Premium', '本章为高级内容', 'இந்த அத்தியாயம் பிரீமியம்'],
    noVoice: ['Suara bahasa ini tiada pada peranti ini.', 'No voice for this language on this device.', '此设备没有这种语言的语音。', 'இந்தச் சாதனத்தில் இந்த மொழிக்குக் குரல் இல்லை.'],
    day: ['hari', 'd', '天', 'நாள்'], hour: ['jam', 'h', '小时', 'மணி'],
    stars: ['bintang', 'stars', '颗星', 'நட்சத்திரங்கள்'],
    lang: ['Bahasa', 'Language', '语言', 'மொழி'],
    age: ['Umur', 'Age', '年龄', 'வயது']
  };

  let lang = store.get('pustakaLang', 'ms');
  if (!(lang in LI)) lang = 'ms';
  let ageF = store.get('pustakaAge', 'all');
  const L = arr => Array.isArray(arr) ? arr[LI[lang]] ?? arr[0] : arr;
  const T = k => L(U[k]);
  const stars = () => store.get('pustakaStars', {});
  const ageText = ([a, b]) => [`${a}–${b} tahun`, `Ages ${a}–${b}`, `${a}–${b}岁`, `${a}–${b} வயது`][LI[lang]];
  function yearText(y) {
    if (y === 'P') return ['Prasekolah', 'Preschool', '学前', 'பாலர்'][LI[lang]];
    return [`Tahun ${y}`, `Year ${y}`, `${ZH_NUM[y - 1] || y}年级`, `ஆண்டு ${y}`][LI[lang]];
  }
  const chLabel = n => lang === 'zh' ? `第${n}章` : `${T('chapter')} ${n}`;

  /* ---------- Akses: 3 hari percuma, kemudian Premium ---------- */
  const now = () => Date.now() / 1000;
  function freeLeft() {
    const s = store.get('pustakaMula', null);
    return s ? Math.max(0, s + FREE_DAYS * 86400 - now()) : FREE_DAYS * 86400;
  }
  const premium = () => typeof Premium !== 'undefined' && Premium.has('pelajar');
  const open = (sid, i) => i === 0 || premium() || freeLeft() > 0;
  function leftText() {
    const hrs = Math.max(1, Math.ceil(freeLeft() / 3600)), d = Math.floor(hrs / 24), h = hrs % 24;
    return [d ? `${d} ${T('day')}` : '', h ? `${h} ${T('hour')}` : ''].filter(Boolean).join(' ');
  }

  /* ---------- Suara (Web Speech API) ---------- */
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let speaking = false;
  function voiceFor(code) {
    const vs = synth.getVoices(), base = code.split('-')[0];
    return vs.find(v => v.lang.replace('_', '-') === code) || vs.find(v => v.lang.toLowerCase().startsWith(base)) || null;
  }
  function speak(text, btn) {
    if (!synth) return;
    if (speaking) { synth.cancel(); return; }
    const code = LANGS[LI[lang]][2], v = voiceFor(code);
    if (!v && synth.getVoices().length) { toast(T('noVoice'), 3200); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = code; if (v) u.voice = v; u.rate = 0.9;
    const set = on => { speaking = on; if (btn && btn.isConnected) { btn.classList.toggle('on', on); btn.querySelector('span').textContent = T(on ? 'stop' : 'listen'); } };
    u.onstart = () => set(true); u.onend = u.onerror = () => set(false);
    synth.cancel(); synth.speak(u);
  }
  const hush = () => { if (synth && speaking) synth.cancel(); speaking = false; };

  /* ---------- Paparan ---------- */
  const root = $('#view-pustaka');
  const cover = (s, cls = '', title = '') => `<span class="pk-cover ${cls}" style="--a:${s.c[0]};--b:${s.c[1]}"><span class="pk-emo" aria-hidden="true">${s.e}</span>${title ? `<span class="pk-ctitle">${esc(title)}</span>` : ''}</span>`;
  const starRow = (got, total) => `<span class="pk-stars" aria-label="${got}/${total} ${T('stars')}">${Array.from({ length: total }, (_, i) => `<i class="${i < got ? 'on' : ''}">★</i>`).join('')}</span>`;
  const gotFor = s => s.ch.filter((_, i) => stars()[`${s.id}.${i}`]).length;

  function langBar() {
    return `<div class="pk-langs segmented" role="tablist" aria-label="${T('lang')}">${LANGS.map(([k, label]) =>
      `<button class="seg ${k === lang ? 'active' : ''}" data-pklang="${k}" role="tab" aria-selected="${k === lang}" lang="${HTML_LANG[k]}">${label}</button>`).join('')}</div>`;
  }

  function accessBanner() {
    if (premium()) return `<div class="pk-access ok">${icon('check')}<span>${T('premium')}</span></div>`;
    if (freeLeft() > 0) return `<div class="pk-access free">${icon('history')}<span>${T('freeLeft').replace('{t}', leftText())}</span></div>`;
    return `<div class="pk-access lock">${icon('lock')}<span>${T('locked')}</span><a class="btn sm" href="#premium">${T('unlock')}</a></div>`;
  }

  function hub() {
    const groups = [['all', T('all')], ['4-6', ageText([4, 6])], ['7-9', ageText([7, 9])], ['10-12', ageText([10, 12])]];
    const fit = s => { if (ageF === 'all') return true; const [a, b] = ageF.split('-').map(Number); return s.age[0] <= b && s.age[1] >= a; };
    const list = D.filter(fit);
    root.innerHTML = `
      <div class="page-head pk-head">
        <p class="eyebrow">${T('eyebrow')}</p>
        <h1 id="h-pustaka">${T('title')}</h1>
        <p class="lead">${T('lead')}</p>
      </div>
      ${langBar()}
      ${accessBanner()}
      <div class="chips pk-ages" role="tablist" aria-label="${T('age')}">${groups.map(([k, t]) => `<button class="chip ${k === ageF ? 'active' : ''}" data-pkage="${k}" role="tab" aria-selected="${k === ageF}">${t}</button>`).join('')}</div>
      <div class="pk-shelf">${list.map(s => `
        <a class="pk-book" href="#pustaka/${s.id}" style="--a:${s.c[0]};--b:${s.c[1]}">
          ${cover(s, '', L(s.n))}
          ${lang !== 'ms' ? `<span class="pk-bsub">${esc(s.n[0])}</span>` : ''}
          <span class="pk-bmeta"><span class="pk-age">${ageText(s.age)}</span>${starRow(gotFor(s), s.ch.length)}</span>
        </a>`).join('')}</div>
      <p class="note"><svg class="ic"><use href="#i-alert"/></svg><span>${T('note')}</span></p>`;
  }

  function subject(s) {
    root.innerHTML = `
      <div class="ib-head"><a class="ib-back" href="#pustaka" aria-label="${T('shelf')}">${icon('chev')}</a><h1>${esc(L(s.n))}</h1></div>
      ${langBar()}
      <div class="pk-hero" style="--a:${s.c[0]};--b:${s.c[1]}">
        ${cover(s, 'lg')}
        <div class="pk-hero-body">
          <span class="pk-age">${ageText(s.age)}</span>
          <p class="pk-dskp"><b>${T('dskp')}:</b> ${esc(s.dskp)}</p>
          ${starRow(gotFor(s), s.ch.length)}
        </div>
      </div>
      ${accessBanner()}
      <ol class="pk-chapters">${s.ch.map((c, i) => {
        const ok = open(s.id, i), got = stars()[`${s.id}.${i}`];
        return `<li><a class="pk-ch ${ok ? '' : 'locked'}" href="#pustaka/${s.id}/${i + 1}">
          <span class="pk-chn" style="--a:${s.c[0]};--b:${s.c[1]}">${i + 1}</span>
          <span class="pk-chb"><span class="pk-cht">${esc(L(c.t))}</span><span class="pk-chtag">${yearText(c.y)} · ${esc(L(c.b))}</span></span>
          ${ok ? (got ? '<span class="pk-star-on" aria-label="★">★</span>' : icon('chev', 'ic chev')) : icon('lock', 'ic pk-lock')}
        </a></li>`;
      }).join('')}</ol>`;
  }

  /* ---------- Pembaca ebook ---------- */
  let rd = null; // { s, ci, page }
  const shuffle = a => { const r = a.map((v, i) => [v, i]); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

  function reader(s, ci) {
    const c = s.ch[ci];
    if (!open(s.id, ci)) {
      root.innerHTML = `
        <div class="ib-head"><a class="ib-back" href="#pustaka/${s.id}" aria-label="${esc(L(s.n))}">${icon('chev')}</a><h1>${esc(L(c.t))}</h1></div>
        <div class="card pk-paywall">${cover(s, 'lg')}<h2>${T('lockedCh')}</h2><p class="muted">${T('locked')}</p><a class="btn" href="#premium">${T('unlock')}</a></div>`;
      return;
    }
    if (!store.get('pustakaMula', null)) store.set('pustakaMula', Math.floor(now()));
    rd = { s, ci, page: 0, order: shuffle(c.q[2]) };
    root.innerHTML = `
      <div class="ib-head"><a class="ib-back" href="#pustaka/${s.id}" aria-label="${esc(L(s.n))}">${icon('chev')}</a><h1>${esc(L(c.t))}</h1></div>
      ${langBar()}
      <article class="pk-reader" style="--a:${s.c[0]};--b:${s.c[1]}" aria-live="polite">
        <header class="pk-rhead"><span>${esc(L(s.n))} · ${chLabel(ci + 1)}</span><span>${yearText(c.y)}</span></header>
        <div class="pk-page" id="pkPage"></div>
        <footer class="pk-rfoot">
          <button class="btn ghost sm" id="pkPrev">${icon('chev', 'ic flip')}<span>${T('prev')}</span></button>
          <span class="pk-dots" id="pkDots"></span>
          <button class="btn sm" id="pkNext"><span>${T('next')}</span>${icon('chev')}</button>
        </footer>
      </article>`;
    paint();
    const pg = $('#pkPage');
    let x0 = null;
    pg.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    pg.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) turn(dx < 0 ? 1 : -1); });
  }

  function paint(dir = 0) {
    hush();
    const { s, ci, page } = rd, c = s.ch[ci], total = c.p.length + 1, pg = $('#pkPage');
    pg.className = 'pk-page' + (dir ? (dir > 0 ? ' in-r' : ' in-l') : '');
    const big = k => k ? `<div class="pk-big" dir="auto">${esc(L(k))}</div>` : '';
    if (page < c.p.length) {
      const [e, k, t, b] = c.p[page];
      pg.innerHTML = `
        <div class="pk-art"><span class="pk-blob"></span><span class="pk-emoji" aria-hidden="true">${e}</span></div>
        ${big(k)}
        <h2 class="pk-ptitle">${esc(L(t))}</h2>
        <p class="pk-pbody" dir="auto">${esc(L(b))}</p>
        ${synth ? `<button class="pk-say" id="pkSay">${icon('play')}<span>${T('listen')}</span></button>` : ''}`;
      const say = $('#pkSay');
      if (say) say.addEventListener('click', () => speak(`${L(t)}. ${L(b)}`, say));
    } else {
      const [k, q] = c.q, solved = !!stars()[`${s.id}.${ci}`];
      pg.innerHTML = `
        <div class="pk-quiz-tag">${icon('target')}<span>${T('quiz')}</span></div>
        ${k ? `<div class="pk-big pk-qk" dir="auto">${esc(k)}</div>` : ''}
        <h2 class="pk-ptitle">${esc(L(q))}</h2>
        <div class="pk-opts">${rd.order.map(([o, i]) => `<button class="pk-opt" data-pkopt="${i}" dir="auto">${esc(L(o))}</button>`).join('')}</div>
        <p class="pk-fb" id="pkFb" role="status"></p>
        <div class="pk-after ${solved ? '' : 'hidden'}" id="pkAfter">${afterBtns()}</div>`;
      if (solved) $$('.pk-opt', pg).forEach(b => { if (b.dataset.pkopt === '0') b.classList.add('right'); });
    }
    $('#pkDots').innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i === page ? 'on' : ''}${i === total - 1 ? ' q' : ''}"></i>`).join('');
    $('#pkPrev').disabled = page === 0;
    $('#pkNext').classList.toggle('hidden', page === total - 1);
  }

  function afterBtns() {
    const { s, ci } = rd, nx = ci + 1 < s.ch.length;
    return nx
      ? `<a class="btn" href="#pustaka/${s.id}/${ci + 2}">${T('nextCh')}${icon('chev')}</a>`
      : `<a class="btn" href="#pustaka">${T('done')}</a><button class="btn ghost" data-pkagain>${T('again')}</button>`;
  }

  function turn(d) {
    if (!rd) return;
    const total = rd.s.ch[rd.ci].p.length + 1, n = rd.page + d;
    if (n < 0 || n >= total) return;
    rd.page = n; paint(d);
  }

  function answer(btn) {
    const { s, ci } = rd, ok = btn.dataset.pkopt === '0', fb = $('#pkFb');
    if (ok) {
      $$('.pk-opt').forEach(b => { b.disabled = true; b.classList.toggle('right', b === btn); });
      fb.textContent = T('right'); fb.className = 'pk-fb good';
      const st = stars(); const first = !st[`${s.id}.${ci}`]; st[`${s.id}.${ci}`] = 1; store.set('pustakaStars', st);
      if (first) burst(btn);
      $('#pkAfter').classList.remove('hidden');
    } else {
      btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake', 'wrong');
      fb.textContent = T('wrong'); fb.className = 'pk-fb';
    }
  }

  function burst(el) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect(), wrap = document.createElement('div');
    wrap.className = 'pk-burst'; wrap.style.left = r.left + r.width / 2 + 'px'; wrap.style.top = r.top + r.height / 2 + 'px';
    wrap.innerHTML = Array.from({ length: 12 }, (_, i) => `<i style="--r:${i * 30}deg;--d:${60 + (i % 3) * 18}px">★</i>`).join('');
    document.body.appendChild(wrap); setTimeout(() => wrap.remove(), 900);
  }

  /* ---------- Laluan: #pustaka, #pustaka/<subjek>, #pustaka/<subjek>/<bab> ---------- */
  function show() {
    if (!root.classList.contains('active')) { hush(); return; }
    root.setAttribute('lang', HTML_LANG[lang]);
    const [, sid, n] = (location.hash || '').slice(1).split('/');
    const s = BY[sid];
    rd = null;
    if (!s) hub();
    else if (n && s.ch[+n - 1]) reader(s, +n - 1);
    else subject(s);
  }

  root.addEventListener('click', e => {
    const t = e.target; let b;
    if ((b = t.closest('[data-pklang]'))) {
      lang = b.dataset.pklang; store.set('pustakaLang', lang); root.setAttribute('lang', HTML_LANG[lang]);
      if (rd) { const keep = rd.page, ord = rd.order; reader(rd.s, rd.ci); rd.page = keep; rd.order = ord; paint(); } else show();
      return;
    }
    if ((b = t.closest('[data-pkage]'))) { ageF = b.dataset.pkage; store.set('pustakaAge', ageF); hub(); return; }
    if ((b = t.closest('#pkPrev'))) return turn(-1);
    if ((b = t.closest('#pkNext'))) return turn(1);
    if ((b = t.closest('[data-pkopt]'))) return answer(b);
    if ((b = t.closest('[data-pkagain]'))) { rd.page = 0; paint(-1); }
  });
  document.addEventListener('keydown', e => {
    if (!rd || !root.classList.contains('active') || /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') turn(1); else if (e.key === 'ArrowLeft') turn(-1);
  });
  document.addEventListener('viewchange', show);
  document.addEventListener('premiumchange', () => { if (root.classList.contains('active') && !rd) show(); });
})();
