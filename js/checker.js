/* Penyemak Kertas Kerja: anggaran AI %, plagiarisme %, dan cadangan pembetulan bervisual */
(function () {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
  const words = t => t.match(WORD_RE) || [];

  const CATS = {
    ejaan: { name: 'Ejaan', c: 'var(--down)' },
    tatabahasa: { name: 'Tatabahasa', c: 'var(--warn)' },
    tandabaca: { name: 'Tanda baca', c: 'var(--info)' },
    gaya: { name: 'Gaya / bunyi AI', c: 'var(--purple)' },
    kejelasan: { name: 'Kejelasan', c: 'var(--brand)' }
  };

  /* ---------- Pengesanan bahasa ---------- */
  const MS_W = new Set('yang dan di ini untuk dengan adalah dalam tidak kepada pada akan ke dari daripada itu oleh juga ialah merupakan bagi serta kerana boleh telah sebagai mereka kita saya lebih banyak'.split(' '));
  const EN_W = new Set('the and of to is in that it for with as are this was be by on not or from have has which an they their can will'.split(' '));
  function detectLang(t) {
    let m = 0, e = 0;
    words(t.toLowerCase()).slice(0, 600).forEach(w => { if (MS_W.has(w)) m++; if (EN_W.has(w)) e++; });
    return m >= e ? 'ms' : 'en';
  }

  /* ---------- Senarai rujukan ---------- */
  const AI_PHRASES = {
    en: [['delve into', 'explore'], ['delves into', 'explores'], ["in today's fast-paced world", 'today'], ["in today's digital age", 'today'], ['it is important to note that', ''], ['it is worth noting that', ''],
      ['plays a crucial role', 'matters'], ['plays a pivotal role', 'matters'], ['plays a vital role', 'matters'], ['a testament to', 'proof of'], ['navigate the complexities of', 'handle'], ['in the realm of', 'in'],
      ['ever-evolving', 'changing'], ['rich tapestry', 'mix'], ['tapestry', 'mix'], ['multifaceted', 'complex'], ['underscores', 'shows'], ['underscore', 'show'], ['leverage', 'use'], ['leveraging', 'using'],
      ['utilize', 'use'], ['utilizing', 'using'], ['seamless', 'smooth'], ['seamlessly', 'smoothly'], ['holistic', 'whole'], ['furthermore', null], ['moreover', null], ['additionally', null],
      ['in conclusion', null], ['in summary', null], ['foster', 'build'], ['fostering', 'building'], ['robust', 'strong'], ['comprehensive', 'full'], ['pivotal', 'key'], ['landscape', 'field'],
      ['harness the power of', 'use'], ['unlock the potential', 'make the most'], ['a myriad of', 'many'], ['plethora of', 'many'], ['showcasing', 'showing'], ['paramount', 'very important'], ['nuanced', 'subtle'], ['embark on', 'start'],
      // Daripada senarai antislop-sampler oleh Sam Paech (Apache-2.0): github.com/sam-paech/antislop-sampler
      ['symphony', null, 1], ['kaleidoscope', null, 1], ['delving', 'exploring', 1], ['delved', 'explored', 1], ['weaving', null, 1], ['weave', null, 1], ['bustling', 'busy', 1], ['labyrinthine', 'complex', 1], ['labyrinth', 'maze', 1], ['transcended', 'went beyond', 1], ['camaraderie', 'friendship', 1], ['palpable', 'clear', 1], ['cacophony', 'noise', 1], ['meticulously', 'carefully', 1], ['meticulous', 'careful', 1], ['navigating', 'handling', 1], ['complexities', 'difficulties', 1], ['realm', 'area', 1], ['dive into', 'look at', 1], ['tailored', 'suited', 1], ['underpins', 'supports', 1], ['everchanging', 'changing', 1], ['embarked on', 'started', 1], ['embark', 'start', 1], ['journey', null, 1], ['game changer', 'big change', 1], ['designed to enhance', 'meant to improve', 1], ['it is advisable to', 'you should', 1], ['daunting', 'hard', 1], ['when it comes to', null, 1], ['unlock the secrets', 'learn', 1], ['unveil the secrets', 'reveal', 1], ['elevate', 'improve', 1], ['unleash', 'release', 1], ['cutting-edge', 'new', 1], ['harness', 'use', 1], ["it's important to note that", '', 1], ['vibrant', 'lively', 1], ['crucial', 'important', 1], ["it's essential to", 'you must', 1], ['vital', 'important', 1], ['as previously mentioned', '', 1], ["it's worth noting that", '', 1], ['to summarize', null, 1], ['to put it simply', null, 1], ["in today's digital era", 'today', 1], ['reverberate', 'echo', 1], ['revolutionize', 'change', 1], ['enigma', 'mystery', 1], ['indelible', 'lasting', 1], ['newfound', 'new', 1], ['amidst', 'amid', 1], ['intricacies', 'details', 1], ['intricate', 'complex', 1], ['unwavering', 'steady', 1], ['advancements', 'advances', 1], ['insurmountable', 'very hard', 1], ['transformative', null, 1], ['resilience', null, 1], ['interconnectedness', 'links', 1], ['nuances', 'details', 1], ['fostered', 'built', 1], ['underscored', 'showed', 1], ['resonated', 'struck a chord', 1], ['captivating', 'gripping', 1], ['serendipity', 'luck', 1]],
    ms: [['dalam era globalisasi ini', 'kini'], ['dalam dunia yang serba moden ini', 'kini'], ['dalam era digital ini', 'kini'], ['tidak dapat dinafikan bahawa', ''], ['tidak dapat dinafikan', ''],
      ['memainkan peranan yang amat penting', 'penting'], ['memainkan peranan yang penting', 'penting'], ['memainkan peranan penting', 'penting'], ['secara keseluruhannya', null],
      ['kesimpulannya', null], ['tambahan pula', null], ['selain itu', null], ['di samping itu', null], ['lanskap', 'bidang'], ['holistik', 'menyeluruh'], ['komprehensif', 'lengkap'],
      ['memperkasakan', 'menguatkan'], ['mempertingkatkan', 'meningkatkan'], ['pemangkin', 'pendorong'], ['secara signifikan', 'dengan ketara'], ['signifikan', 'ketara'], ['pelbagai cabaran', 'cabaran'],
      ['adalah amat penting untuk', 'perlu'], ['dengan kata lain', null], ['justeru itu', 'justeru'], ['sesungguhnya', null], ['aspek', null], ['mengoptimumkan', 'memaksimumkan']]
  };
  const TRANSITIONS = {
    en: 'furthermore moreover additionally however therefore consequently thus overall ultimately in conclusion in summary firstly secondly lastly notably importantly'.split(' '),
    ms: 'selain tambahan oleh justeru kesimpulannya secara di namun walau seterusnya pertama kedua akhir sehubungan dengan'.split(' ')
  };
  const PERSONAL = {
    en: /\b(i|i'm|i've|me|my|mine|we're|don't|can't|won't|isn't|didn't|it's|lol|honestly|kinda|gonna|wanna)\b|[!?]/gi,
    ms: /\b(saya|aku|ku|kami|rasanya|agaknya|je|jer|tak|kot|lah|eh|dah|nak|sangat-sangat)\b|[!?]/gi
  };

  const SPELL = {
    en: { recieve: 'receive', seperate: 'separate', definately: 'definitely', occured: 'occurred', untill: 'until', wich: 'which', thier: 'their', alot: 'a lot', becuase: 'because', accomodate: 'accommodate',
      goverment: 'government', enviroment: 'environment', begining: 'beginning', beleive: 'believe', existance: 'existence', independant: 'independent', occurence: 'occurrence', publically: 'publicly',
      tommorow: 'tomorrow', truely: 'truly', wierd: 'weird', arguement: 'argument', buisness: 'business', calender: 'calendar', commited: 'committed', concious: 'conscious', embarass: 'embarrass',
      foriegn: 'foreign', grammer: 'grammar', neccessary: 'necessary', noticable: 'noticeable', refered: 'referred', succesful: 'successful', successfull: 'successful', tounge: 'tongue',
      irregardless: 'regardless', acheive: 'achieve', adress: 'address', basicly: 'basically', comming: 'coming', completly: 'completely', diffrent: 'different', finaly: 'finally', freind: 'friend', knowlege: 'knowledge',
      libary: 'library', occassion: 'occasion', persue: 'pursue', posession: 'possession', reccomend: 'recommend', sucess: 'success', techonology: 'technology', togather: 'together' },
    ms: { mengunakan: 'menggunakan', pengunaan: 'penggunaan', digunakkan: 'digunakan', merbahaya: 'berbahaya', samada: 'sama ada', walaubagaimanapun: 'walau bagaimanapun', ianya: 'ia', kebanyakkan: 'kebanyakan',
      sekaligus: 'sekali gus', mempunya: 'mempunyai', kerna: 'kerana', keranan: 'kerana', perbezaaan: 'perbezaan', pembelajaraan: 'pembelajaran', diantara: 'di antara', disamping: 'di samping', diatas: 'di atas',
      dibawah: 'di bawah', didalam: 'di dalam', disini: 'di sini', disana: 'di sana', diluar: 'di luar', dirumah: 'di rumah', disekolah: 'di sekolah', dimana: 'di mana', disebalik: 'di sebalik', dihadapan: 'di hadapan',
      keatas: 'ke atas', kebawah: 'ke bawah', kedalam: 'ke dalam', kesana: 'ke sana', kesini: 'ke sini', kerumah: 'ke rumah', kesekolah: 'ke sekolah', kehadapan: 'ke hadapan',
      yg: 'yang', dgn: 'dengan', utk: 'untuk', dlm: 'dalam', sbb: 'sebab', tdk: 'tidak', krn: 'kerana', kpd: 'kepada', spt: 'seperti', sbg: 'sebagai', drpd: 'daripada', mcm: 'macam', blh: 'boleh', sy: 'saya',
      menyebapkan: 'menyebabkan', berkesanan: 'berkesan', mengalakkan: 'menggalakkan', pengalakkan: 'penggalakan', mengangu: 'mengganggu', mengangap: 'menganggap', menyelasaikan: 'menyelesaikan',
      teknoloji: 'teknologi', konklusinya: 'kesimpulannya', infomasi: 'maklumat' }
  };
  const WORDY = {
    en: [['in order to', 'to'], ['due to the fact that', 'because'], ['at this point in time', 'now'], ['a large number of', 'many'], ['in spite of the fact that', 'although'], ['for the purpose of', 'for'],
      ['in the event that', 'if'], ['has the ability to', 'can'], ['could of', 'could have'], ['should of', 'should have'], ['would of', 'would have'], ['each and every', 'every']],
    ms: [['adalah merupakan', 'merupakan'], ['terdiri dari', 'terdiri daripada'], ['berbeza dari', 'berbeza daripada'], ['berlainan dari', 'berlainan daripada'], ['berasal daripada', 'berasal dari'],
      ['bagi tujuan untuk', 'untuk'], ['demi untuk', 'demi'], ['agar supaya', 'agar'], ['amat sangat', 'amat'], ['sangat amat', 'amat'], ['para hadirin sekalian', 'hadirin sekalian'], ['di dalam masa', 'dalam masa']]
  };

  /* ---------- Bantuan teks ---------- */
  function sentences(text) {
    const out = []; const re = /[^.!?\n]+(?:[.!?]+["'”’)\]]*|\n|$)/g; let m;
    while ((m = re.exec(text))) {
      const raw = m[0]; const lead = raw.length - raw.trimStart().length; const s = raw.trim();
      if (s && words(s).length) out.push({ text: s, start: m.index + lead, end: m.index + lead + s.length });
      if (m[0].length === 0) re.lastIndex++;
    }
    return out;
  }
  const norm = w => w.toLowerCase().replace(/[’']/g, '');
  function shingles(t, n = 5) {
    const w = words(t).map(norm), s = new Set();
    for (let i = 0; i + n <= w.length; i++) s.add(w.slice(i, i + n).join(' '));
    return s;
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const cv = a => { const m = mean(a); return m ? Math.sqrt(mean(a.map(x => (x - m) ** 2))) / m : 0; };
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matchCase = (orig, rep) => (orig[0] && orig[0] === orig[0].toUpperCase() && rep) ? rep[0].toUpperCase() + rep.slice(1) : rep;

  /* ---------- Cadangan pembetulan tempatan ---------- */
  function localSuggestions(text, lang) {
    const out = [];
    const add = (start, end, rep, cat, msg) => out.push({ start, end, orig: text.slice(start, end), rep, cat, msg, src: 'local' });
    let m;

    const sp = SPELL[lang];
    const re = new RegExp(WORD_RE.source, 'gu');
    while ((m = re.exec(text))) {
      const w = m[0], lw = w.toLowerCase();
      if (sp[lw]) add(m.index, m.index + w.length, matchCase(w, sp[lw]), 'ejaan', lang === 'ms' ? 'Ejaan atau singkatan tidak baku.' : 'Possible spelling mistake.');
      const red = lw.match(/^(\p{L}{2,})2$/u);
      if (red) add(m.index, m.index + w.length, matchCase(w, red[1] + '-' + red[1].toLowerCase()), 'ejaan', 'Kata ganda perlu ditulis penuh dengan tanda sempang.');
    }
    const repRe = /\b(\p{L}+)(\s+)\1\b/giu;
    while ((m = repRe.exec(text))) {
      if (lang === 'ms' && !MS_W.has(m[1].toLowerCase())) { add(m.index, m.index + m[0].length, m[1] + '-' + m[1].toLowerCase(), 'ejaan', 'Kata ganda perlu ditulis dengan tanda sempang.'); continue; }
      add(m.index, m.index + m[0].length, m[1], 'tatabahasa', lang === 'ms' ? 'Perkataan berulang.' : 'Repeated word.');
    }
    for (const [a, b] of WORDY[lang]) {
      const r = new RegExp(`\\b${escRe(a)}\\b`, 'gi');
      while ((m = r.exec(text))) add(m.index, m.index + m[0].length, matchCase(m[0], b), 'tatabahasa', lang === 'ms' ? 'Penggunaan kata yang lebih tepat.' : 'Wordy or incorrect phrase.');
    }
    if (lang === 'ms') {
      const pv = /\bdi (\p{L}{3,}(?:kan|i))\b/giu;
      while ((m = pv.exec(text))) {
        if (/^\p{Lu}/u.test(m[1]) || /^(pekan|tepi|kaki|pagi|sisi|kanan|kiri|bukan|sini|hari|bumi|negeri|tali|kali|jalan|sungai|kedai|pantai|hati|diri|padi|tani|pasti)$/i.test(m[1])) continue;
        add(m.index, m.index + m[0].length, 'di' + m[1], 'tatabahasa', '"di" sebagai imbuhan kata kerja pasif mesti dirapatkan.');
      }
      const pl = /\b(semua|banyak|pelbagai|beberapa|segala|para|kebanyakan|sesetengah|setiap) (\p{L}+)-\2\b/giu;
      while ((m = pl.exec(text))) add(m.index, m.index + m[0].length, m[1] + ' ' + m[2], 'tatabahasa', 'Penanda jamak tidak perlu diikuti kata ganda.');
      const cmp = /\b(lebih \p{L}+) dari\b/giu;
      while ((m = cmp.exec(text))) add(m.index, m.index + m[0].length, m[1] + ' daripada', 'tatabahasa', 'Gunakan "daripada" untuk perbandingan.');
    }
    if (lang === 'en') {
      const ii = /(^|\s)i(?=[\s,.'’])/g;
      while ((m = ii.exec(text))) add(m.index + m[1].length, m.index + m[1].length + 1, 'I', 'ejaan', 'The pronoun "I" is always capitalised.');
    }
    for (const [a, b, slop] of AI_PHRASES[lang]) {
      const r = new RegExp(`\\b${escRe(a)}\\b,?`, 'gi');
      while ((m = r.exec(text))) {
        let rep = b === null ? null : matchCase(m[0], b);
        if (rep && m[0].endsWith(',')) rep += ',';
        const msg = slop ? 'Word heavily overused by AI models (antislop list). Prefer plainer, more specific wording.' : b === null ? (lang === 'ms' ? 'Penanda wacana ini sangat kerap dalam tulisan AI. Pelbagaikan atau gugurkan jika tidak perlu.' : 'Overused transition typical of AI text. Vary it or drop it.')
          : (lang === 'ms' ? 'Frasa klise yang kerap muncul dalam tulisan AI. Gunakan ayat sendiri yang lebih spesifik.' : 'Cliché often seen in AI-written text. Be more specific.');
        add(m.index, m.index + m[0].length, rep, 'gaya', msg);
      }
    }
    const dbl = / {2,}/g; while ((m = dbl.exec(text))) add(m.index, m.index + m[0].length, ' ', 'tandabaca', 'Ruang berganda.');
    const bp = /\s+([,.;:!?])/g; while ((m = bp.exec(text))) add(m.index, m.index + m[0].length, m[1], 'tandabaca', 'Tiada ruang sebelum tanda baca.');
    const ap = /([,;:])(?=\p{L})/gu; while ((m = ap.exec(text))) add(m.index, m.index + 1, m[1] + ' ', 'tandabaca', 'Perlu ruang selepas tanda baca.');
    const ap2 = /(\p{Ll}{3,})\.(?=\p{Lu}\p{Ll})/gu; while ((m = ap2.exec(text))) add(m.index + m[1].length, m.index + m[1].length + 1, '. ', 'tandabaca', 'Perlu ruang selepas noktah.');
    const pp = /([!?.,])\1+/g; while ((m = pp.exec(text))) if (m[1] !== '.' || m[0].length !== 3) add(m.index, m.index + m[0].length, m[1], 'tandabaca', 'Tanda baca berulang.');
    sentences(text).forEach(s => {
      const c = text[s.start];
      if (/\p{Ll}/u.test(c)) add(s.start, s.start + 1, c.toUpperCase(), 'ejaan', lang === 'ms' ? 'Ayat perlu bermula dengan huruf besar.' : 'Sentence should start with a capital letter.');
      const n = words(s.text).length;
      if (n > 40) add(s.start, s.end, null, 'kejelasan', (lang === 'ms' ? `Ayat terlalu panjang (${n} patah perkataan). Pecahkan kepada 2 atau 3 ayat.` : `Very long sentence (${n} words). Consider splitting it.`));
      if (lang === 'ms' && /\b\p{L}+ di mana\b/iu.test(s.text) && !/^di mana/i.test(s.text) && !/\?$/.test(s.text)) {
        const i = s.text.search(/\bdi mana\b/i);
        add(s.start + i, s.start + i + 7, null, 'kejelasan', '"di mana" sebagai kata hubung relatif ialah pengaruh bahasa Inggeris. Cuba guna "yang", "tempat" atau pecahkan ayat.');
      }
    });
    return out;
  }

  /* ---------- LanguageTool (percuma, untuk BI) ---------- */
  async function languageTool(text, lang) {
    if (lang !== 'en') return [];
    const body = new URLSearchParams({ text: text.slice(0, 18000), language: 'en-US', level: 'default' });
    const r = await fetch('https://api.languagetool.org/v2/check', { method: 'POST', body });
    if (!r.ok) throw new Error('LT ' + r.status);
    const j = await r.json();
    return j.matches.map(mt => {
      const t = (mt.rule.issueType || '').toLowerCase(), cid = mt.rule.category && mt.rule.category.id || '';
      const cat = t === 'misspelling' || cid === 'TYPOS' ? 'ejaan' : cid === 'PUNCTUATION' || cid === 'TYPOGRAPHY' ? 'tandabaca' : t === 'style' || cid === 'STYLE' || cid === 'REDUNDANCY' ? 'kejelasan' : 'tatabahasa';
      return { start: mt.offset, end: mt.offset + mt.length, orig: text.substr(mt.offset, mt.length), rep: mt.replacements[0] ? mt.replacements[0].value : null, cat, msg: mt.message, src: 'LanguageTool' };
    });
  }

  function dedupe(list) {
    list.sort((a, b) => a.start - b.start || (b.rep != null) - (a.rep != null));
    const out = []; let lastEnd = -1;
    for (const s of list) {
      if (s.rep === null && s.cat === 'kejelasan') { out.push(s); continue; } // nota peringkat ayat tidak menyekat yang lain
      if (s.start < lastEnd) continue;
      if (s.rep !== null && s.rep === s.orig) continue;
      out.push(s); lastEnd = s.end;
    }
    return out.map((s, i) => Object.assign(s, { id: i }));
  }

  /* ---------- Anggaran AI ---------- */
  function aiAnalysis(text, lang, sents, spellErrs) {
    const ws = words(text), n = ws.length || 1;
    const lens = sents.map(s => words(s.text).length).filter(x => x >= 3);
    const burst = clamp((0.62 - cv(lens)) / 0.38);
    const lower = text.toLowerCase();
    let phraseHits = 0;
    AI_PHRASES[lang].forEach(([p, , slop]) => { const mm = lower.match(new RegExp(`\\b${escRe(p)}\\b`, 'g')); if (mm) phraseHits += mm.length * (slop ? 0.5 : 1); });
    const phrase = clamp((phraseHits / n * 100) / 1.6);
    const tr = TRANSITIONS[lang];
    const startsT = sents.filter(s => tr.includes(norm(words(s.text)[0] || ''))).length;
    const trans = clamp((startsT / (sents.length || 1)) / 0.35);
    const pers = (text.match(PERSONAL[lang]) || []).length;
    const imper = 1 - clamp((pers / n * 100) / 2.2);
    const clean = 1 - clamp((spellErrs / n * 100) / 1.2);
    const paras = text.split(/\n\s*\n/).map(p => words(p).length).filter(x => x > 15);
    const para = paras.length >= 3 ? clamp((0.55 - cv(paras)) / 0.4) : 0.5;
    const longW = ws.filter(w => w.length >= (lang === 'ms' ? 11 : 9)).length / n;
    const vocab = clamp((longW - (lang === 'ms' ? 0.06 : 0.1)) / 0.12);
    const signals = [
      ['Keseragaman panjang ayat', burst, 0.24], ['Frasa klise AI', phrase, 0.24], ['Ayat bermula kata peralihan', trans, 0.12],
      ['Nada impersonal / formal', imper, 0.14], ['Tiada kesilapan kecil manusia', clean, 0.1], ['Perenggan seragam', para, 0.08], ['Kosa kata panjang & formal', vocab, 0.08]
    ];
    const raw = signals.reduce((a, [, v, w]) => a + v * w, 0);
    const pct = Math.round(100 / (1 + Math.exp(-(raw - 0.5) * 9)));
    const m = mean(lens), sd = m * cv(lens);
    const perSent = sents.map(s => {
      const sl = s.text.toLowerCase(), wc = words(s.text).length;
      let sc = raw * 0.45;
      if (AI_PHRASES[lang].some(([p]) => sl.includes(p))) sc += 0.35;
      if (tr.includes(norm(words(s.text)[0] || ''))) sc += 0.15;
      if (sd && Math.abs(wc - m) < sd * 0.5) sc += 0.1;
      if (PERSONAL[lang].test(s.text)) sc -= 0.25;
      PERSONAL[lang].lastIndex = 0;
      return clamp(sc);
    });
    return { pct, signals, perSent, confident: n >= 80 };
  }

  /* ---------- Plagiarisme ---------- */
  const STOP = new Set(('yang dan di ini untuk dengan adalah dalam tidak kepada pada akan ke dari daripada itu oleh juga ialah merupakan bagi serta kerana boleh telah sebagai mereka kita saya lebih banyak atau ada satu ia ' +
    'the and of to is in that it for with as are this was be by on not or from have has which an they their can will a its were been also more than such into these other').split(' '));
  function toks(t) { const out = []; const re = new RegExp(WORD_RE.source, 'gu'); let m; while ((m = re.exec(t))) out.push({ w: norm(m[0]), s: m.index, e: m.index + m[0].length }); return out; }
  const pickSpread = (arr, n) => arr.length <= n ? arr : Array.from({ length: n }, (_, i) => arr[Math.floor(i * arr.length / n)]);
  async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error(r.status); return r.json(); }

  // Wikipedia (bahasa kertas kerja)
  async function wikiSources(sents, lang, onProgress) {
    const wiki = lang === 'ms' ? 'ms' : 'en';
    const cands = pickSpread(sents.filter(s => words(s.text).length >= 8), 12);
    const titles = new Map();
    await Promise.all(cands.map(async s => {
      const q = words(s.text).slice(0, 14).join(' ');
      try {
        const j = await getJSON(`https://${wiki}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=3&format=json&origin=*`);
        (j.query && j.query.search || []).forEach((r, i) => titles.set(r.title, (titles.get(r.title) || 0) + 3 - i));
      } catch {}
      onProgress();
    }));
    const top = [...titles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
    const pages = await Promise.all(top.map(async t => {
      try {
        const j = await getJSON(`https://${wiki}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(t)}&format=json&origin=*`);
        const p = Object.values(j.query.pages)[0];
        return { name: 'Wikipedia: ' + p.title, kind: 'Wikipedia', url: `https://${wiki}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`, text: p.extract || '' };
      } catch { return null; }
    }));
    return pages.filter(p => p && p.text);
  }

  // Artikel akademik dari beberapa pangkalan data terbuka. Setiap pangkalan dicari dengan ayat terpilih,
  // hasilnya digabung dan diduplikasi mengikut DOI atau tajuk (teks paling panjang disimpan).
  const keyQ = (s, n) => words(s.text).filter(w => !STOP.has(norm(w))).slice(0, n).join(' ');
  const plain = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  const article = (db, title, year, url, doi, text) => ({ name: `Artikel: ${plain(title)}${year ? ` (${year})` : ''}`, kind: `Artikel akademik · ${db}`, url, doi: doi ? String(doi).toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '') : '', text: plain(text) });
  async function searchEach(sents, n, qWords, tick, fn) {
    const out = [];
    await Promise.all(pickSpread(sents.filter(s => words(s.text).length >= 10), n).map(async s => {
      try { out.push(...(await fn(encodeURIComponent(keyQ(s, qWords)))).filter(Boolean)); } catch {}
      tick();
    }));
    return out;
  }
  // OpenAlex: abstrak jurnal, prosiding dan tesis (lebih 250 juta rekod)
  const openAlex = (sents, tick) => searchEach(sents, 6, 12, tick, async q => {
    const j = await getJSON(`https://api.openalex.org/works?search=${q}&per_page=3&select=id,display_name,doi,publication_year,abstract_inverted_index`);
    return (j.results || []).filter(w => w.abstract_inverted_index).map(w => {
      const pos = []; Object.entries(w.abstract_inverted_index).forEach(([word, idx]) => idx.forEach(i => { pos[i] = word; }));
      return article('OpenAlex', w.display_name, w.publication_year, w.doi || w.id, w.doi, pos.filter(Boolean).join(' '));
    });
  });
  // Crossref: metadata rasmi DOI daripada penerbit, termasuk abstrak jika penerbit menyediakannya
  const crossref = (sents, tick) => searchEach(sents, 5, 12, tick, async q => {
    const j = await getJSON(`https://api.crossref.org/works?query=${q}&rows=4&select=DOI,title,abstract,published,URL`);
    return (j.message && j.message.items || []).filter(w => w.abstract).map(w =>
      article('Crossref', (w.title || [''])[0], w.published && w.published['date-parts'] && w.published['date-parts'][0][0], w.URL || `https://doi.org/${w.DOI}`, w.DOI, w.abstract));
  });
  // Semantic Scholar: abstrak merentas semua bidang (had kadar ketat, jadi sedikit carian sahaja)
  const semScholar = (sents, tick) => searchEach(sents, 3, 10, tick, async q => {
    const j = await getJSON(`https://api.semanticscholar.org/graph/v1/paper/search?query=${q}&limit=4&fields=title,abstract,year,url,externalIds`);
    return (j.data || []).filter(w => w.abstract).map(w => article('Semantic Scholar', w.title, w.year, w.url, w.externalIds && w.externalIds.DOI, w.abstract));
  });
  // DOAJ: jurnal akses terbuka, termasuk banyak jurnal universiti Malaysia
  const doaj = (sents, tick) => searchEach(sents, 4, 8, tick, async q => {
    const j = await getJSON(`https://doaj.org/api/search/articles/${q}?pageSize=4`);
    return (j.results || []).map(r => r.bibjson || {}).filter(b => b.abstract).map(b => {
      const doi = (b.identifier || []).find(x => /doi/i.test(x.type));
      return article('DOAJ', b.title, b.year, (b.link || [])[0] && b.link[0].url || (doi && `https://doi.org/${doi.id}`), doi && doi.id, b.abstract);
    });
  });
  // Europe PMC: sains hayat dan kesihatan; teks penuh dimuat turun untuk artikel akses terbuka
  async function europePmc(sents, tick) {
    const hits = await searchEach(sents, 4, 6, tick, async q => {
      const j = await getJSON(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${q}&format=json&resultType=core&pageSize=3`);
      return (j.resultList && j.resultList.result || []).filter(w => w.abstractText).map(w => Object.assign(
        article('Europe PMC', w.title, w.pubYear, w.doi ? `https://doi.org/${w.doi}` : `https://europepmc.org/article/${w.source}/${w.id}`, w.doi, w.abstractText),
        { pmcid: w.isOpenAccess === 'Y' && w.pmcid }));
    });
    await Promise.all(hits.filter(h => h.pmcid).slice(0, 3).map(async h => {
      try {
        const r = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/${encodeURIComponent(h.pmcid)}/fullTextXML`);
        if (!r.ok) return;
        const body = new DOMParser().parseFromString(await r.text(), 'text/xml').querySelector('body');
        if (body) { h.text = (h.text + ' ' + body.textContent).replace(/\s+/g, ' ').trim(); h.kind += ' (teks penuh)'; }
      } catch {}
    }));
    return hits;
  }
  async function paperSources(sents, tick) {
    const all = (await Promise.all([openAlex, crossref, semScholar, doaj, europePmc].map(f => f(sents, tick).catch(() => [])))).flat();
    const best = new Map();
    all.filter(w => words(w.text).length >= 30).forEach(w => {
      const k = w.doi || norm(w.name).replace(/[^\p{L}\p{N}]+/gu, '');
      const prev = best.get(k);
      if (!prev || w.text.length > prev.text.length) best.set(k, w);
    });
    return [...best.values()];
  }

  // Padanan tepat (rentetan 5 perkataan atau lebih) dan parafrasa hampir sama (ayat berkongsi ≥60% kata isi)
  function plagiarism(text, sents, sources) {
    const N = 5, dt = toks(text), nW = dt.length || 1;
    const owner = new Array(dt.length).fill(-1);   // sumber pertama yang menuntut setiap perkataan
    const content = ws => ws.filter(w => w.length > 3 && !STOP.has(w));
    const perSource = sources.map((src, si) => {
      const st = toks(src.text), gram = new Map();
      for (let j = 0; j + N <= st.length; j++) { const k = st.slice(j, j + N).map(x => x.w).join(' '); const l = gram.get(k); l ? l.length < 6 && l.push(j) : gram.set(k, [j]); }
      const covered = new Set(), matches = [];
      for (let i = 0; i + N <= dt.length;) {
        const starts = gram.get(dt.slice(i, i + N).map(x => x.w).join(' '));
        if (!starts) { i++; continue; }
        let best = 0, bj = 0;
        starts.forEach(j => { let k = 0; while (i + k < dt.length && j + k < st.length && dt[i + k].w === st[j + k].w) k++; if (k > best) { best = k; bj = j; } });
        for (let k = 0; k < best; k++) covered.add(i + k);
        matches.push({ type: 'tepat', di: i, dl: best, ds: dt[i].s, de: dt[i + best - 1].e, ss: st[bj].s, se: st[bj + best - 1].e, src: src.text });
        i += best;
      }
      // Parafrasa: ayat yang belum dipadankan tepat
      const srcSents = sentences(src.text).map(x => ({ ...x, set: new Set(content(words(x.text).map(norm))) })).filter(x => x.set.size >= 4);
      sents.forEach(s => {
        const ti = dt.findIndex(t => t.s >= s.start), idx = []; for (let k = ti; k >= 0 && k < dt.length && dt[k].e <= s.end; k++) idx.push(k);
        if (idx.length < 8 || idx.filter(k => covered.has(k)).length > idx.length / 2) return;
        const A = new Set(content(idx.map(k => dt[k].w))); if (A.size < 4) return;
        let best = 0, bs = null;
        srcSents.forEach(x => { let c = 0; A.forEach(w => { if (x.set.has(w)) c++; }); const r = c / A.size; if (r > best) { best = r; bs = x; } });
        if (best >= 0.6) {
          // Padanan tepat kecil dalam ayat ini diserap ke dalam padanan parafrasa
          for (let q = matches.length - 1; q >= 0; q--) if (matches[q].ds >= s.start && matches[q].de <= s.end) matches.splice(q, 1);
          idx.forEach(k => covered.add(k)); matches.push({ type: 'parafrasa', di: idx[0], dl: idx.length, ds: s.start, de: s.end, ss: bs.start, se: bs.end, src: src.text, sim: Math.round(best * 100), shared: [...A].filter(w => bs.set.has(w)) }); }
      });
      covered.forEach(k => { if (owner[k] < 0) owner[k] = si; });
      matches.sort((a, b) => a.ds - b.ds);
      return { name: src.name, kind: src.kind || 'Sumber anda', url: src.url, words: covered.size, pct: Math.round(covered.size / nW * 100), matches, si };
    });
    const ranked = perSource.filter(s => s.words > 0).sort((a, b) => b.words - a.words);
    ranked.forEach((s, r) => { s.rank = r + 1; });
    const rankOf = si => (perSource[si] && perSource[si].rank) || 0;
    const total = owner.filter(o => o >= 0).length;
    // Tanda peringkat ayat untuk pita AI/eksport lama
    const perSent = sents.map(s => {
      const idx = dt.map((t, k) => k).filter(k => dt[k].s >= s.start && dt[k].e <= s.end);
      const hit = idx.filter(k => owner[k] >= 0);
      return { frac: idx.length ? hit.length / idx.length : 0, src: hit.length ? perSource[owner[hit[0]]].name : null };
    });
    return { pct: Math.round(total / nW * 100), perSource: ranked, perSent, owner, toks: dt, rankOf, nSearched: sources.length };
  }

  /* ---------- Paparan ---------- */
  function gauge(pct, label, color, sub) {
    const r = 54, c = 2 * Math.PI * r, off = pct == null ? c : c * (1 - pct / 100);
    return `<div class="gauge"><svg viewBox="0 0 140 140" role="img" aria-label="${label} ${pct}%">
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="10"/>
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 70 70)" style="transition:stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)" data-off="${off}"/>
      <text x="70" y="79" text-anchor="middle" font-size="27" font-weight="700" fill="currentColor" style="font-variant-numeric:tabular-nums">${pct == null ? '–' : pct + '%'}</text></svg>
      <div class="lbl">${label}</div><div class="sub">${sub}</div></div>`;
  }

  const state = { text: '', orig: '', lang: 'ms', sugg: [], sents: [], ai: null, plag: null, view: 'fix' };

  function renderAnnotated() {
    const box = $('#annotated');
    const L = $('#legend');
    if (state.view === 'fix') {
      L.innerHTML = Object.values(CATS).map(c => `<span style="--c:${c.c}">${c.name}</span>`).join('');
      const t = state.text, inline = state.sugg.filter(s => !(s.rep === null && s.cat === 'kejelasan'));
      let html = '', pos = 0;
      inline.forEach(s => {
        if (s.start < pos) return;
        html += esc(t.slice(pos, s.start));
        if (s.applied && s.start === s.end) return;
        const cls = s.applied ? 'fix applied' : 'fix';
        html += `<mark class="${cls}" data-id="${s.id}" style="--c:${CATS[s.cat].c}" title="${esc(s.msg)}">${esc(t.slice(s.start, s.end)) || '&nbsp;'}</mark>`;
        pos = s.end;
      });
      html += esc(t.slice(pos));
      box.innerHTML = html.replace(/\n/g, '<br>');
    } else if (state.view === 'ai') {
      L.innerHTML = `<span style="--c:color-mix(in srgb,var(--purple) 15%,transparent)">Rendah</span><span style="--c:color-mix(in srgb,var(--purple) 40%,transparent)">Sederhana</span><span style="--c:color-mix(in srgb,var(--purple) 65%,transparent)">Tinggi kemungkinan AI</span>`;
      box.innerHTML = paintSents((s, i) => { const v = state.ai.perSent[i]; return v > 0.25 ? `<span class="s-ai" style="--a:${Math.round(8 + v * 60)}%" title="Anggaran AI ayat ini: ${Math.round(v * 100)}%">` : null; });
    } else {
      L.innerHTML = `<span style="--c:color-mix(in srgb,var(--down) 30%,transparent)">Sama dengan sumber (nombor = sumber dalam senarai)</span>`;
      const p = state.plag, t = state.orig, T = p.toks; let html = '', pos = 0;
      for (let k = 0; k < T.length;) {
        const o = p.owner[k]; if (o < 0) { k++; continue; }
        let e = k; while (e + 1 < T.length && p.owner[e + 1] === o) e++;
        const r = p.rankOf(o), src = p.perSource.find(x => x.rank === r);
        html += esc(t.slice(pos, T[k].s)) + `<span class="s-plag" data-rank="${r}" title="Sama dengan: ${esc(src ? src.name : '')}">${esc(t.slice(T[k].s, T[e].e))}<sup>${r}</sup></span>`;
        pos = T[e].e; k = e + 1;
      }
      box.innerHTML = (html + esc(t.slice(pos))).replace(/\n/g, '<br>');
    }
  }
  function paintSents(open) {
    const t = state.orig; let html = '', pos = 0;
    state.sents.forEach((s, i) => {
      html += esc(t.slice(pos, s.start));
      const o = open(s, i);
      html += o ? o + esc(t.slice(s.start, s.end)) + '</span>' : esc(t.slice(s.start, s.end));
      pos = s.end;
    });
    return (html + esc(t.slice(pos))).replace(/\n/g, '<br>');
  }

  const vis = t => t.replace(/^ +| +$/g, m => '␣'.repeat(m.length));
  function renderSugg() {
    const pending = state.sugg.filter(s => !s.applied && !s.dismissed);
    $('#suggCount').textContent = pending.length;
    if (!state.sugg.length) { $('#suggList').innerHTML = '<p class="muted">Tiada isu bahasa ditemui.</p>'; return; }
    $('#suggList').innerHTML = state.sugg.map(s => {
      const c = CATS[s.cat];
      const diff = s.rep === null ? `<div class="diff"><i class="muted">“${esc(s.orig.length > 90 ? s.orig.slice(0, 90) + '…' : s.orig)}”</i></div>`
        : `<div class="diff"><del>${esc(vis(s.orig)) || '␣'}</del> → <ins>${esc(vis(s.rep)) || '(buang)'}</ins></div>`;
      const acts = s.applied ? 'Diterima' : s.dismissed ? 'Diabaikan'
        : `${s.rep !== null ? `<button class="btn sm" data-apply="${s.id}">Terima</button>` : ''}<button class="btn sm ghost" data-dismiss="${s.id}">Abaikan</button>`;
      return `<div class="sugg ${s.applied || s.dismissed ? 'done' : ''}" id="sg-${s.id}" style="--c:${c.c}"><div class="cat">${c.name}${s.src === 'LanguageTool' ? ' · LT' : ''}</div>${diff}<div class="why">${esc(s.msg)}</div><div class="acts">${acts}</div></div>`;
    }).join('');
  }

  function applySugg(id) {
    const s = state.sugg.find(x => x.id === id);
    if (!s || s.applied || s.rep === null) return;
    let rest = state.text.slice(s.end);
    if (s.rep === '') { // buang frasa di awal ayat: besarkan huruf seterusnya
      rest = rest.replace(/^\s+/, '');
      const before = state.text.slice(0, s.start).trimEnd();
      if ((!before || /[.!?]$/.test(before)) && rest) rest = rest[0].toUpperCase() + rest.slice(1);
    }
    const delta = s.rep.length + rest.length - (state.text.length - s.start);
    state.text = state.text.slice(0, s.start) + s.rep + rest;
    const oldEnd = s.end;
    s.end = s.start + s.rep.length; s.applied = true;
    state.sugg.forEach(x => {
      if (x === s) return;
      if (x.start >= oldEnd) { x.start += delta; x.end += delta; }
      else if (x.end > s.start && x.start < oldEnd && !x.applied && x.cat !== 'kejelasan') x.dismissed = true;
      else if (x.cat === 'kejelasan' && x.end >= oldEnd) x.end += delta;
    });
  }

  function renderStats(text, sents) {
    const ws = words(text), uniq = new Set(ws.map(norm));
    const avgS = sents.length ? ws.length / sents.length : 0;
    const read = Math.max(1, Math.round(ws.length / 200));
    const items = [[ws.length.toLocaleString(), 'Patah perkataan'], [sents.length, 'Ayat'], [avgS.toFixed(1), 'Purata perkataan/ayat'],
      [Math.round(uniq.size / (ws.length || 1) * 100) + '%', 'Kepelbagaian kosa kata'], [read + ' min', 'Masa membaca'], [state.lang === 'ms' ? 'Bahasa Melayu' : 'English', 'Bahasa']];
    state.statItems = items;
    $('#stats').innerHTML = items.map(([v, k]) => `<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');
  }


  // Senarai sumber: peratus setiap sumber dan petikan yang sama, sebelah-menyebelah
  function snippet(src, ss, se, shared, ctx = 70) {
    const a = ctx ? Math.max(0, src.lastIndexOf(' ', Math.max(0, ss - ctx))) : ss, b = ctx ? src.indexOf(' ', Math.min(src.length, se + ctx)) : se;
    const mid = shared ? esc(src.slice(ss, se)).replace(new RegExp(`\\b(${shared.map(escRe).join('|')})\\b`, 'giu'), '<mark>$1</mark>') : `<mark>${esc(src.slice(ss, se))}</mark>`;
    if (!ctx) return mid;
    return (a > 0 ? '… ' : '') + esc(src.slice(a, ss)) + mid + esc(src.slice(se, b < 0 ? src.length : b)) + (b > 0 && b < src.length ? ' …' : '');
  }
  function renderSources() {
    const p = state.plag, t = state.orig;
    if (!p.perSource.length) {
      $('#sourceList').innerHTML = `<p class="muted small">${p.checked ? `Tiada padanan ketara ditemui dalam ${p.nSearched} sumber yang disemak.` : 'Aktifkan carian dalam talian atau tampal teks sumber untuk semakan plagiarisme.'} Nota: semakan ini meliputi Wikipedia, abstrak artikel akademik (OpenAlex) dan teks yang anda tampal, bukan pangkalan data tertutup seperti Turnitin.</p>`;
      return;
    }
    $('#sourceList').innerHTML = `<p class="muted small src-sum">${p.perSource.length} daripada ${p.nSearched} sumber yang disemak mempunyai teks yang sama. Klik sumber untuk melihat petikan sebelah-menyebelah.</p>` + p.perSource.map(s => {
      const ex = s.matches.filter(m => m.type === 'tepat').length, pa = s.matches.length - ex;
      return `<details class="src">
        <summary><span class="src-rank">${s.rank}</span><span class="src-main"><span class="src-name">${esc(s.name)}</span><span class="muted small">${esc(s.kind)} · ${ex} petikan sama${pa ? ` · ${pa} parafrasa hampir sama` : ''}</span></span><span class="src-pct num">${s.pct}%</span></summary>
        <div class="src-bar"><div style="width:${Math.max(2, s.pct)}%"></div></div>
        ${s.url ? `<a class="small" href="${esc(s.url)}" target="_blank" rel="noopener">Buka sumber</a>` : ''}
        <div class="cmp-list">${s.matches.slice(0, 25).map(m => `<div class="cmp">
          <div><div class="cmp-k">Kertas anda${m.type === 'parafrasa' ? ` · parafrasa ${m.sim}% sama` : ` · ${m.dl} perkataan sama`}</div><p>${m.type === 'parafrasa' ? snippet(t, m.ds, m.de, m.shared, 0) : `<mark>${esc(t.slice(m.ds, m.de))}</mark>`}</p></div>
          <div><div class="cmp-k">Sumber</div><p>${snippet(m.src, m.ss, m.se, m.type === 'parafrasa' ? m.shared : null)}</p></div>
        </div>`).join('')}${s.matches.length > 25 ? `<p class="muted small">+${s.matches.length - 25} padanan lagi</p>` : ''}</div>
      </details>`;
    }).join('');
  }

  function renderAll() {
    const a = state.ai, p = state.plag;
    const nIssues = state.sugg.filter(s => s.cat !== 'gaya').length, n = words(state.orig).length || 1;
    const quality = Math.round(clamp(1 - (nIssues / n * 100) / 16) * 100);
    state.quality = quality;
    const aiSub = !a.confident ? 'Teks pendek: keyakinan rendah' : a.pct < 25 ? 'Kemungkinan besar tulisan manusia' : a.pct < 55 ? 'Bercampur / tidak pasti' : 'Banyak ciri tulisan AI';
    const plSub = p.checked ? (p.pct < 10 ? 'Rendah' : p.pct < 25 ? 'Sederhana: semak petikan' : 'Tinggi: perlu rujukan/parafrasa') : 'Tiada sumber disemak';
    $('#gauges').innerHTML = gauge(a.pct, 'Anggaran AI', 'var(--purple)', aiSub) + gauge(p.checked ? p.pct : null, 'Plagiarisme', 'var(--down)', plSub)
      + gauge(p.checked ? 100 - p.pct : null, 'Keaslian', 'var(--up)', 'Teks yang tidak sepadan sumber') + gauge(quality, 'Kualiti bahasa', 'var(--brand)', `${nIssues} isu bahasa ditemui`);
    requestAnimationFrame(() => setTimeout(() => $$('#gauges circle[data-off]').forEach(c => c.style.strokeDashoffset = c.dataset.off), 30));
    $('#aiBars').innerHTML = a.signals.map(([k, v]) => `<div class="bar"><span>${k}</span><div class="track"><div style="width:${Math.round(v * 100)}%;background:${v > .6 ? 'var(--purple)' : v > .35 ? 'var(--warn)' : 'var(--up)'}"></div></div><span class="mono">${Math.round(v * 100)}%</span></div>`).join('')
      + '<p class="muted small" style="margin-top:8px">Bar lebih panjang = lebih menyerupai corak tulisan AI.</p>';
    renderSources();
    renderStats(state.orig, state.sents); renderSugg(); renderAnnotated();
  }

  $('#viewTabs').innerHTML = [['fix', 'Pembetulan'], ['ai', 'Peta AI'], ['plag', 'Plagiarisme']].map(([k, v]) => `<button class="seg ${k === 'fix' ? 'active' : ''}" data-v="${k}">${v}</button>`).join('');
  $('#viewTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    state.view = b.dataset.v; $$('#viewTabs .seg').forEach(t => t.classList.toggle('active', t === b)); renderAnnotated();
  });
  const focusSugg = id => {
    $$('.sugg.focus, mark.fix.focus').forEach(x => x.classList.remove('focus'));
    const card = $('#sg-' + id), mk = $(`mark[data-id="${id}"]`);
    if (card) { card.classList.add('focus'); card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    if (mk) mk.classList.add('focus');
  };
  $('#annotated').addEventListener('click', e => { const m = e.target.closest('mark.fix'); if (m) focusSugg(+m.dataset.id); });
  $('#suggList').addEventListener('click', e => {
    const a = e.target.closest('[data-apply]'), d = e.target.closest('[data-dismiss]');
    if (a) { applySugg(+a.dataset.apply); renderSugg(); if (state.view !== 'fix') $('#viewTabs [data-v="fix"]').click(); else renderAnnotated(); }
    if (d) { const s = state.sugg.find(x => x.id === +d.dataset.dismiss); s.dismissed = true; renderSugg(); renderAnnotated(); }
    const card = e.target.closest('.sugg'); if (card && !a && !d) focusSugg(+card.id.slice(3));
  });
  $('#applyAll').addEventListener('click', () => {
    [...state.sugg].sort((x, y) => y.start - x.start).forEach(s => { if (!s.dismissed && s.rep !== null) applySugg(s.id); });
    renderSugg(); state.view = 'fix'; $$('#viewTabs .seg').forEach(t => t.classList.toggle('active', t.dataset.v === 'fix')); renderAnnotated();
    toast('Semua pembetulan diterima');
  });
  $('#copyFixed').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(state.text); toast('Teks disalin'); } catch { toast('Tidak dapat menyalin.'); }
  });
  $('#dlFixed').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([state.text], { type: 'text/plain;charset=utf-8' }));
    a.download = 'kertas-kerja-dibetulkan.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // Ringkasan untuk laporan PDF (Premium)
  window.CheckerReport = () => state.ai && {
    ai: state.ai.pct, plag: state.plag.checked ? state.plag.pct : null, quality: state.quality, text: state.text,
    stats: state.statItems || [], signals: state.ai.signals, sources: state.plag.perSource.map(s => ({ name: s.name, url: s.url, pct: s.pct })),
    sugg: state.sugg.filter(s => !s.dismissed).map(s => ({ cat: CATS[s.cat].name, from: s.orig, to: s.rep === null ? '(semak semula ayat)' : s.applied ? s.rep + ' (diterima)' : s.rep || '(buang)', why: s.msg }))
  };

  async function run() {
    const text = $('#paper').value.replace(/\r\n/g, '\n').trim();
    if (words(text).length < 20) return toast('Sila masukkan sekurang-kurangnya 20 patah perkataan.');
    const btn = $('#checkBtn'); btn.disabled = true;
    const prog = m => btn.innerHTML = `<span class="spinner"></span> ${m}`;
    prog('Menganalisis…');
    try {
      const lang = $('#lang').value === 'auto' ? detectLang(text) : $('#lang').value;
      Object.assign(state, { text, orig: text, lang, sents: sentences(text) });
      let sugg = localSuggestions(text, lang);
      if ($('#optLT').checked && lang === 'en') {
        prog('Menyemak tatabahasa…');
        try { sugg = sugg.concat(await languageTool(text, lang)); } catch { toast('Semakan LanguageTool tidak tersedia; guna semakan asas.'); }
      }
      state.sugg = dedupe(sugg);
      const spellErrs = state.sugg.filter(s => s.cat === 'ejaan' || s.cat === 'tandabaca').length;
      state.ai = aiAnalysis(text, lang, state.sents, spellErrs);
      const sources = $('#sources').value.split(/\n-{3,}\n/).map((t, i) => ({ name: `Sumber anda #${i + 1}`, text: t.trim() })).filter(s => words(s.text).length >= 5);
      if ($('#optWeb').checked) {
        let done = 0; const tick = () => prog(`Mencari dalam 6 pangkalan sumber… ${++done} carian`);
        prog('Mencari sumber…');
        const [w, a] = await Promise.all([wikiSources(state.sents, lang, tick).catch(() => []), paperSources(state.sents, tick).catch(() => [])]);
        sources.push(...w, ...a);
      }
      state.plag = Object.assign(plagiarism(text, state.sents, sources), { checked: sources.length > 0 });
      state.view = 'fix'; $$('#viewTabs .seg').forEach(t => t.classList.toggle('active', t.dataset.v === 'fix'));
      $('#results').classList.remove('hidden'); renderAll();
      document.dispatchEvent(new CustomEvent('checkdone'));
      $('#results').scrollIntoView({ behavior: 'smooth' });
    } catch (e) { console.error(e); toast('Ralat semasa menganalisis.'); }
    btn.disabled = false; btn.textContent = 'Semak sekarang';
  }
  $('#checkBtn').addEventListener('click', run);

  /* ---------- Input fail ---------- */
  const wc = () => { $('#wc').textContent = words($('#paper').value).length + ' patah perkataan'; };
  $('#paper').addEventListener('input', wc);
  async function readFile(f) {
    const name = f.name.toLowerCase();
    try {
      if (name.endsWith('.docx')) {
        await loadScript('js/vendor/mammoth.min.js');
        const r = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() });
        $('#paper').value = r.value.replace(/\n{3,}/g, '\n\n').trim();
      } else if (name.endsWith('.pdf')) {
        await loadScript('js/vendor/pdf.min.js');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer(), isEvalSupported: false }).promise; let out = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const c = await (await pdf.getPage(i)).getTextContent();
          out.push(c.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join(''));
        }
        $('#paper').value = out.join('\n\n').replace(/[ \t]+/g, ' ').trim();
      } else { $('#paper').value = await f.text(); }
      wc(); toast('Fail dimuatkan: ' + f.name);
    } catch (e) { toast('Gagal membaca fail. Cuba tampal teks secara manual.'); }
  }
  const drop = $('#drop');
  drop.addEventListener('click', () => $('#fileIn').click());
  $('#fileIn').addEventListener('change', e => e.target.files[0] && readFile(e.target.files[0]));
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => e.dataTransfer.files[0] && readFile(e.dataTransfer.files[0]));

  $('#sampleBtn').addEventListener('click', () => {
    $('#paper').value = `Dalam era globalisasi ini, teknologi digital memainkan peranan yang amat penting dalam kehidupan pelajar. Tidak dapat dinafikan bahawa penggunaan internet telah mengubah cara pelajar belajar dan berkomunikasi. Selain itu, platform pembelajaran dalam talian menyediakan akses kepada pelbagai maklumat secara komprehensif.

saya sendiri mengunakan telefon pintar setiap hari utk membuat ulangkaji. Kadang2 saya rasa ianya sangat membantu , tetapi kadang-kadang ia juga mengganggu tumpuan saya!! Kebanyakkan rakan saya juga berpendapat yang sama.

Tambahan pula, para pelajar-pelajar perlu bijak mengurus masa supaya tidak terlalu bergantung kepada gajet. Ibu bapa dan guru perlu memantau aktiviti dalam talian anak-anak mereka samada di rumah atau disekolah. Masalah ini di selesaikan jika semua pihak bekerjasama.

Kesimpulannya, teknologi digital adalah merupakan pemangkin kepada pembelajaran yang holistik jika digunakan dengan betul dan berhemah.`;
    $('#lang').value = 'auto'; wc();
  });
})();
