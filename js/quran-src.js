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
  async function get(u, ms = 9000) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(u, { signal: ctl.signal });
      if (r.status === 404) throw new NotFound('404');
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }
  const aq = async path => { const j = await get(AQ + path); if (j.code !== 200) throw new Error(j.status); return j.data; };
  async function first(...tries) {
    let err;
    for (const f of tries) { try { return await f(); } catch (e) { if (e instanceof NotFound) throw e; err = e; } }
    throw err;
  }
  const strip = t => t.replace(/^﻿/, '');
  const memo = {};
  const once = (k, f) => memo[k] || (memo[k] = f().catch(e => { delete memo[k]; throw e; }));

  /* Senarai 114 surah */
  const list = () => once('list', () => first(
    async () => (await aq('/surah')).map(s => ({ n: s.number, ar: s.name, en: s.englishName, tr: s.englishNameTranslation, c: s.numberOfAyahs, t: s.revelationType === 'Meccan' ? 'Makkiyah' : 'Madaniyah' })),
    async () => (await get(`${QC}/chapters?language=ms`)).chapters.map(s => ({ n: s.id, ar: 'سُورَةُ ' + s.name_arabic, en: s.name_simple, tr: s.translated_name ? s.translated_name.name : '', c: s.verses_count, t: s.revelation_place === 'makkah' ? 'Makkiyah' : 'Madaniyah' }))
  ));

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
  const surah = n => once('s' + n, () => first(
    async () => {
      const [ar, ms] = await aq(`/surah/${n}/editions/quran-uthmani,ms.basmeih`);
      return ar.ayahs.map((a, i) => {
        let t = strip(a.text);
        if (i === 0 && n !== 1 && n !== 9 && t.startsWith(BASMALAH)) t = t.slice(BASMALAH.length).trim();
        return { k: a.numberInSurah, g: a.number, ar: t, ms: ms.ayahs[i] ? ms.ayahs[i].text : '' };
      });
    },
    async () => (await qcVerses(`by_chapter/${n}`)).map(v => ({ k: v.verse_number, g: v.id, ar: v.text_uthmani, ms: cleanTr(v.translations && v.translations[0] && v.translations[0].text) }))
  ));
  const cleanTr = t => (t || '').replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').trim();

  /* Satu ayat, cth. "2:275" */
  const ayah = ref => once('a' + ref, () => first(
    async () => {
      const [ar, ms] = await aq(`/ayah/${ref}/editions/quran-uthmani,ms.basmeih`);
      return { ar: strip(ar.text), ms: ms.text, surah: ar.surah.englishName, s: ar.surah.number, a: ar.numberInSurah };
    },
    async () => {
      const v = (await get(`${QC}/verses/by_key/${ref}?translations=${QC_MS}&fields=text_uthmani`)).verse;
      const [s, a] = v.verse_key.split(':').map(Number), L = await list().catch(() => null);
      return { ar: v.text_uthmani, ms: cleanTr(v.translations && v.translations[0] && v.translations[0].text), surah: L ? L[s - 1].en : 'Surah ' + s, s, a };
    }
  ));

  /* Carian perkataan dalam terjemahan Melayu: [{ s, a, surah, text }] */
  const search = w => once('q' + w.toLowerCase(), async () => {
    try {
      return await first(
        async () => (await aq(`/search/${encodeURIComponent(w)}/all/ms.basmeih`)).matches.map(m => ({ s: m.surah.number, a: m.numberInSurah, surah: m.surah.englishName, text: m.text })),
        async () => {
          const out = [], L = await list().catch(() => null);
          for (let page = 1; page <= 4; page++) {
            const j = (await get(`${QC}/search?q=${encodeURIComponent(w)}&language=ms&size=50&page=${page}`)).search;
            for (const r of j.results || []) {
              const tr = (r.translations || []).find(x => x.resource_id === QC_MS);
              if (!tr) continue;
              const [s, a] = r.verse_key.split(':').map(Number);
              out.push({ s, a, surah: L ? L[s - 1].en : 'Surah ' + s, text: cleanTr(tr.text) });
            }
            if (!j.total_pages || page >= j.total_pages) break;
          }
          return out;
        });
    } catch (e) { if (e instanceof NotFound) return []; throw e; }
  });

  window.QuranSrc = { list, surah, ayah, search, BASMALAH, web: (s, a) => `https://quran.com/${s}${a ? '/' + a : ''}` };
})();
