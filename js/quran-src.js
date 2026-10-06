/* Sumber teks Al-Quran dengan sandaran.
   Utama: api.alquran.cloud (Uthmani + Tafsir Pimpinan Ar-Rahman, Basmeih).
   Sandaran: api.quran.com v4 (Quran.com, teks Uthmani + terjemahan Basmeih id 39).
   Setiap sumber diberi had masa; jika satu gagal, sumber kedua dicuba. */
(function () {
  const AQ = 'https://api.alquran.cloud/v1';
  const QC = 'https://api.quran.com/api/v4';
  const QC_MS = 39; // Abdullah Muhammad Basmeih di Quran.com
  const BASMALAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

  // Ralat 404 bermaksud "tiada data" (cth. carian tanpa padanan), bukan masalah rangkaian
  class NotFound extends Error {}
  // Had masa hanya untuk menunggu pelayan menjawab. Muat turun isi (surah panjang
  // seperti Al-Baqarah) tidak dipotong walaupun rangkaian perlahan.
  async function get(u, ms = 15000) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
    let r;
    try { r = await fetch(u, { signal: ctl.signal }); } finally { clearTimeout(t); }
    if (r.status === 404) throw new NotFound('404');
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }
  const aq = async path => { const j = await get(AQ + path); if (j.code !== 200) throw new Error(j.status); return j.data; };
  async function first(...tries) {
    let err;
    for (const f of tries) { try { return await f(); } catch (e) { if (e instanceof NotFound) throw e; err = e; } }
    throw err;
  }
  const strip = t => t.replace(/^﻿/, '');

  // Kemaskan tanda Uthmani supaya terletak betul tanpa bergantung pada ciri khas fon
  // (Safari/iPhone tidak menjalankan semua peraturan Amiri Quran, lalu tanda bertindih).
  // - Tanwin bertingkat: Tanzil menulis tanwin + mim kecil (U+06ED), Quran.com menulis
  //   U+0657/065E/0656. Kedua-duanya ditukar ke kod Unicode rasmi U+08F0-08F2.
  // - Iqlab (tanwin sebelum ب): satu baris + mim kecil, seperti Mushaf Madinah.
  // - Tanda waqaf (ۖ ۗ ۚ ج ...) dilekatkan pada huruf akhir kalimah sebelumnya. Sebelum
  //   ini ia berdiri di atas ruang kosong, terapung dan boleh jatuh ke awal baris baharu.
  // - Alif kecil (ٰ) tidak lagi ditindih baris atas; alif kecil + mad diletak atas tatwil
  //   (هَـٰٓؤُلَآءِ, ٱلۡمَلَـٰٓئِكَةِ) supaya tidak bertimbun pada satu huruf.
  const OPEN = { '\u064B': '\u08F0', '\u064C': '\u08F1', '\u064D': '\u08F2', '\u0657': '\u08F0', '\u065E': '\u08F1', '\u0656': '\u08F2' };
  const IQLAB = { '\u064B': '\u064E\u06E2', '\u064C': '\u064F\u06E2', '\u064D': '\u0650\u06ED' };
  const JOIN = '\u0628\u062A-\u062E\u0633-\u063A\u0641-\u0647\u064A\u0626';
  const tidy = t => String(t || '')
    .replace(/([\u064B-\u064D])[\u06E2\u06ED](?=[\u0627\u0649\u06DF\u06E5\u06E6]*\s*(?:[\u06D6-\u06DB]\s*)?\u0628)/g, (m, h) => IQLAB[h])
    .replace(/([\u064B-\u064D])\u06ED/g, (m, h) => OPEN[h])
    .replace(/[\u0657\u065E\u0656]/g, c => OPEN[c])
    .replace(/\s+(?=[\u06D6-\u06DB])/g, '')
    .replace(new RegExp(`([${JOIN}]\u064E)(\u0670\u0653)`, 'g'), '$1\u0640$2')
    .replace(/\u064E(?=\u0670)/g, '');

  // Bismillah hanya dipaparkan sebagai kepala surah (tengah atas), bukan dalam ayat 1,
  // kecuali Al-Fatihah (Bismillah ialah ayat 1) dan At-Taubah (tiada Bismillah).
  // Teks dibandingkan tanpa harakat kerana sumber berbeza menulis tanda baris secara berbeza.
  const skel = w => w.normalize('NFC').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08F0-\u08F2\u0640\uFEFF\u200B-\u200F]/g, '').replace(/[ٱأإآ]/g, 'ا');
  const BASM_SK = BASMALAH.split(/\s+/).map(skel).join(' ');
  const MS_BASM = /^\s*Dengan nama Allah,?\s*Yang Maha Pemurah,?\s*lagi Maha Mengasihani\.?\s*/i;
  function dropBasmalah(n, a) {
    if (n === 1 || n === 9 || a.k !== 1) return a;
    const w = String(a.ar).trim().split(/\s+/);
    const ar = w.length > 4 && w.slice(0, 4).map(skel).join(' ') === BASM_SK ? w.slice(4).join(' ') : a.ar;
    const ms = String(a.ms || '').replace(MS_BASM, '');
    return { ...a, ar, ms: ms ? ms.charAt(0).toUpperCase() + ms.slice(1) : ms };
  }
  const memo = {};
  // Simpanan dalam peranti: senarai surah + 10 surah terakhir dibaca, supaya
  // surah yang pernah dibuka tetap boleh dibaca walaupun sumber gagal atau tiada internet
  const LS = 'bl_quran_';
  const load = k => { try { return JSON.parse(localStorage.getItem(LS + k)); } catch { return null; } };
  function save(k, v) {
    const idx = (load('idx') || []).filter(x => x !== k), data = JSON.stringify(v);
    if (k !== 'list') idx.push(k);
    for (;;) {
      while (idx.length > 10) localStorage.removeItem(LS + idx.shift());
      try { localStorage.setItem(LS + k, data); localStorage.setItem(LS + 'idx', JSON.stringify(idx)); return; }
      catch { if (idx.length < 2) return; localStorage.removeItem(LS + idx.shift()); } // storan penuh: buang yang paling lama
    }
  }
  const kept = (k, f) => async () => { const c = load(k); if (c && c.length) return c; const v = await f(); save(k, v); return v; };
  const once = (k, f) => memo[k] || (memo[k] = f().catch(e => { delete memo[k]; throw e; }));

  /* Ejaan rumi nama surah yang lazim di Malaysia (JAKIM), menggantikan ejaan Inggeris
     daripada API (cth. Al-Faatiha jadi Al-Fatihah, Al-Muminoon jadi Al-Mu'minun) */
  const NAMA = "Al-Fatihah|Al-Baqarah|Ali 'Imran|An-Nisa'|Al-Ma'idah|Al-An'am|Al-A'raf|Al-Anfal|At-Taubah|Yunus|Hud|Yusuf|Ar-Ra'd|Ibrahim|Al-Hijr|An-Nahl|Al-Isra'|Al-Kahf|Maryam|Taha|Al-Anbiya'|Al-Hajj|Al-Mu'minun|An-Nur|Al-Furqan|Asy-Syu'ara'|An-Naml|Al-Qasas|Al-'Ankabut|Ar-Rum|Luqman|As-Sajdah|Al-Ahzab|Saba'|Fatir|Yasin|As-Saffat|Sad|Az-Zumar|Ghafir|Fussilat|Asy-Syura|Az-Zukhruf|Ad-Dukhan|Al-Jathiyah|Al-Ahqaf|Muhammad|Al-Fath|Al-Hujurat|Qaf|Az-Zariyat|At-Tur|An-Najm|Al-Qamar|Ar-Rahman|Al-Waqi'ah|Al-Hadid|Al-Mujadalah|Al-Hasyr|Al-Mumtahanah|As-Saff|Al-Jumu'ah|Al-Munafiqun|At-Taghabun|At-Talaq|At-Tahrim|Al-Mulk|Al-Qalam|Al-Haqqah|Al-Ma'arij|Nuh|Al-Jin|Al-Muzzammil|Al-Muddaththir|Al-Qiyamah|Al-Insan|Al-Mursalat|An-Naba'|An-Nazi'at|'Abasa|At-Takwir|Al-Infitar|Al-Mutaffifin|Al-Insyiqaq|Al-Buruj|At-Tariq|Al-A'la|Al-Ghasyiyah|Al-Fajr|Al-Balad|Asy-Syams|Al-Lail|Ad-Duha|Asy-Syarh|At-Tin|Al-'Alaq|Al-Qadr|Al-Bayyinah|Az-Zalzalah|Al-'Adiyat|Al-Qari'ah|At-Takathur|Al-'Asr|Al-Humazah|Al-Fil|Quraisy|Al-Ma'un|Al-Kauthar|Al-Kafirun|An-Nasr|Al-Masad|Al-Ikhlas|Al-Falaq|An-Nas".split('|');
  const nama = (n, alt) => NAMA[n - 1] || alt || 'Surah ' + n;
  // Ejaan lain yang biasa ditaip dalam carian
  const CARI = { 9: 'Taubat', 18: 'Kahfi', 23: 'Mukminun', 63: 'Munafikun', 106: 'Quraish' };

  /* Senarai 114 surah */
  const list = () => once('list', kept('list', () => first(
    async () => (await aq('/surah')).map(s => ({ n: s.number, ar: s.name, en: s.englishName, tr: s.englishNameTranslation, c: s.numberOfAyahs, t: s.revelationType === 'Meccan' ? 'Makkiyah' : 'Madaniyah' })),
    async () => (await get(`${QC}/chapters?language=ms`)).chapters.map(s => ({ n: s.id, ar: 'سُورَةُ ' + s.name_arabic, en: s.name_simple, tr: s.translated_name ? s.translated_name.name : '', c: s.verses_count, t: s.revelation_place === 'makkah' ? 'Makkiyah' : 'Madaniyah' }))
  ))).then(L => L.map(x => ({ ...x, en: nama(x.n, x.en), alt: x.alt || x.en + ' ' + (CARI[x.n] || '') })));

  /* Satu surah: [{ k: no. ayat, g: no. global, ar, ms }] */
  async function qcVerses(path) {
    const out = [];
    for (let page = 1; page < 20; page++) {
      const j = await get(`${QC}/verses/${path}?translations=${QC_MS}&fields=text_uthmani&per_page=50&page=${page}`);
      out.push(...j.verses);
      if (!j.pagination || !j.pagination.next_page) break;
    }
    return out;
  }
  const aqAyahs = (n, ar, ms) => ar.ayahs.map((a, i) => ({ k: a.numberInSurah, g: a.number, ar: strip(a.text), ms: ms.ayahs[i] ? ms.ayahs[i].text : '' }));
  // Kunci "s2-" supaya surah lama dalam storan (dengan Bismillah dalam ayat 1) dibaca semula
  const surah = n => once('s' + n, async () => (await kept('s2-' + n, () => first(
    async () => { const [ar, ms] = await aq(`/surah/${n}/editions/quran-uthmani,ms.basmeih`); return aqAyahs(n, ar, ms); },
    async () => (await qcVerses(`by_chapter/${n}`)).map(v => ({ k: v.verse_number, g: v.id, ar: v.text_uthmani, ms: cleanTr(v.translations && v.translations[0] && v.translations[0].text) })),
    // Sandaran ketiga: dua permintaan kecil berasingan ke alquran.cloud
    async () => { const [ar, ms] = await Promise.all([aq(`/surah/${n}/quran-uthmani`), aq(`/surah/${n}/ms.basmeih`)]); return aqAyahs(n, ar, ms); }
  ))()).map(a => { const d = dropBasmalah(n, a); return { ...d, ar: tidy(d.ar) }; }));
  const cleanTr = t => (t || '').replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').trim();

  /* Satu ayat, cth. "2:275" */
  const ayah = ref => once('a' + ref, () => first(
    async () => {
      const [ar, ms] = await aq(`/ayah/${ref}/editions/quran-uthmani,ms.basmeih`);
      const d = dropBasmalah(ar.surah.number, { k: ar.numberInSurah, ar: strip(ar.text), ms: ms.text });
      return { ar: tidy(d.ar), ms: d.ms, surah: nama(ar.surah.number, ar.surah.englishName), s: ar.surah.number, a: ar.numberInSurah };
    },
    async () => {
      const v = (await get(`${QC}/verses/by_key/${ref}?translations=${QC_MS}&fields=text_uthmani`)).verse;
      const [s, a] = v.verse_key.split(':').map(Number);
      return { ar: tidy(v.text_uthmani), ms: cleanTr(v.translations && v.translations[0] && v.translations[0].text), surah: nama(s), s, a };
    }
  ));

  /* Carian perkataan dalam terjemahan Melayu: [{ s, a, surah, text }] */
  const search = w => once('q' + w.toLowerCase(), async () => {
    try {
      return await first(
        async () => (await aq(`/search/${encodeURIComponent(w)}/all/ms.basmeih`)).matches.map(m => ({ s: m.surah.number, a: m.numberInSurah, surah: nama(m.surah.number, m.surah.englishName), text: m.text })),
        async () => {
          const out = [];
          for (let page = 1; page <= 4; page++) {
            const j = (await get(`${QC}/search?q=${encodeURIComponent(w)}&language=ms&size=50&page=${page}`)).search;
            for (const r of j.results || []) {
              const tr = (r.translations || []).find(x => x.resource_id === QC_MS);
              if (!tr) continue;
              const [s, a] = r.verse_key.split(':').map(Number);
              out.push({ s, a, surah: nama(s), text: cleanTr(tr.text) });
            }
            if (!j.total_pages || page >= j.total_pages) break;
          }
          return out;
        });
    } catch (e) { if (e instanceof NotFound) return []; throw e; }
  });

  window.QuranSrc = { list, nama, cari: n => CARI[n] || '', surah, ayah, search, BASMALAH, dropBasmalah, tidy, web: (s, a) => `https://quran.com/${s}${a ? '/' + a : ''}` };
})();
