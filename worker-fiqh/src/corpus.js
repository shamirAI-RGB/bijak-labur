/*
 * Korpus rujukan Tanya AI: dibina daripada js/fiqh-data.js, iaitu rujukan yang telah dibuka dan disemak
 * satu persatu untuk bahagian Fiqh. Pelayan dan laman menggunakan fail yang sama, jadi tiada salinan kedua.
 */
import '../../js/fiqh-data.js';

const D = globalThis.FiqhData;
export const SITE = 'https://bijaklabur.my/';

/* Setiap sumber: id tetap, jenis, tajuk, url, teks (yang boleh dipetik). */
export function buildCorpus() {
  const out = [];
  for (const [k, kb] of Object.entries(D.KITAB)) {
    out.push({ id: `kitab:${k}`, jenis: 'kitab', tajuk: kb.name, ar: kb.ar, url: D.shamela(kb.id), buku: D.shamela(kb.id),
      teks: `${kb.name} (${kb.ar}) oleh ${kb.by}. Tahap: ${kb.lvl}. Kitab muktabar mazhab Syafie di Al-Maktabah al-Shamela.` });
  }
  for (const b of D.BAB) {
    for (const [k, p, ch] of b.kitab) {
      const kb = D.KITAB[k];
      if (out.some(s => s.id === `kitab:${k}:${p}`)) continue;
      out.push({ id: `kitab:${k}:${p}`, jenis: 'kitab', tajuk: `${kb.name}, ${ch}`, ar: ch, url: D.shamela(kb.id, p), buku: D.shamela(kb.id), shamela: String(p),
        teks: `Bab ${b.name} (${ch}) dalam ${kb.name} bermula di muka surat Shamela ${p}: ${D.shamela(kb.id, p)}` });
    }
  }
  for (const [k, h] of Object.entries(D.H)) {
    out.push({ id: `hadis:${k}`, jenis: 'hadis', tajuk: `${D.KOLEKSI[h.c]} ${h.n.replace(/[a-z]$/, '')}`, url: `https://sunnah.com/${h.c}:${h.n}`,
      teks: `${D.KOLEKSI[h.c]} ${h.n}, riwayat ${h.by}. Isi ringkas: ${h.isi}` });
  }
  for (const [k, f] of Object.entries(D.F)) {
    out.push({ id: `fatwa:${k}`, jenis: 'fatwa', tajuk: f.t, oleh: f.by, url: f.url, teks: `${f.by}. ${f.t}. Ringkasan keputusan: ${f.petik}` });
  }
  const BAB = Object.fromEntries(D.BAB.map(b => [b.k, b]));
  for (const m of D.MASALAH) {
    const refs = [
      ...(m.q || []).map(r => `quran:${r}`),
      ...(m.h || []).map(h => `hadis:${h}`),
      ...(m.f || []).map(f => `fatwa:${f}`),
      ...BAB[m.bab].kitab.map(([k, p]) => `kitab:${k}:${p}`)
    ];
    out.push({ id: `masalah:${m.bab}/${m.k}`, jenis: 'bijaklabur', tajuk: m.t, url: `${SITE}#ibadah/fiqh/${m.bab}/${m.k}`,
      teks: [`${m.t}. Hukum: ${D.HUKUM[m.hukum][0]}.`, m.ringkas, m.langkah ? 'Langkah: ' + m.langkah.join('; ') + '.' : '', m.nota || '', `Rujukan disemak: ${refs.join(', ')}`].filter(Boolean).join(' ') });
  }
  return out;
}

export const CORPUS = buildCorpus();
export const BY_ID = new Map(CORPUS.map(s => [s.id, s]));

/* Teks korpus untuk model: satu sumber setiap baris supaya id dan url jelas */
export const CORPUS_TEXT = CORPUS.map(s => `[${s.id}] (${s.jenis}) ${s.tajuk}\nURL: ${s.url}\n${s.teks}`).join('\n\n');
