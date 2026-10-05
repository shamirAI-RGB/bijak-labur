/*
 * Carian teks penuh setiap muka surat: dokumen rasmi moden (PDF, FiqhData.MODEN) dan kitab muktabar
 * mazhab Syafie di Shamela (FiqhData.KITAB). Nombor muka surat kitab ialah nombor halaman Shamela,
 * jadi pautan https://shamela.ws/book/ID/N membuka muka surat yang sama.
 *
 * Teks dan indeks dibina semasa pemasangan (scripts/muat-rujukan.mjs) ke dalam folder aset worker:
 *   rujukan/meta.json          { docs: { k: bilangan muka surat }, avgdl, dl: { "k:n": panjang } }
 *   rujukan/i/<baldi>.json     { istilah: [[k, n, kekerapan], ...] }
 *   rujukan/p/<k>/<n>.txt      teks muka surat n (PDF: n bermula dari 1, sama seperti #page=n; kitab: halaman Shamela)
 * Aset ini tidak dihidangkan terus kepada umum (run_worker_first); pelayan hanya memetik muka surat yang relevan.
 */
import '../../js/fiqh-data.js';

const D = globalThis.FiqhData;
export const MODEN = D.MODEN;
export const KITAB = Object.entries(D.KITAB).map(([k, b]) => ({ ...b, k, jenis: 'kitab', url: D.shamela(b.id) }));
export const DOC = Object.fromEntries([...MODEN.map(d => [d.k, { ...d, jenis: 'dokumen' }]), ...KITAB.map(d => [d.k, d])]);
export const BUCKETS = 64;
const K1 = 1.2, B = 0.75;

const STOP = new Set(('dan yang untuk dengan dalam ini itu atau pada oleh dari daripada kepada ialah adalah tidak boleh akan juga bagi telah serta jika maka secara tersebut sebagai iaitu lebih kerana hendaklah ' +
  'the and for with that this are was were from which shall such any not have has been its their there other may also into upon its than then them they '
  ).split(/\s+/).filter(Boolean));

// Sama seperti norm() dalam index.js: buang harakat dan tanda baca supaya carian Arab, Melayu dan Inggeris konsisten
export const normText = s => String(s || '').normalize('NFKC')
  .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Arab: buang awalan "al" (dan wa/bi/fa/ka + al, li + l) serta seragamkan ta marbutah, supaya الربا, والربا dan ربا sepadan
const AR = /[\u0600-\u06FF]/;
const stem = t => !AR.test(t) ? t : t.replace(/ة/g, 'ه').replace(/^(?:[وفبك]?ال|لل)(?=..)/, '');
export const tokens = s => normText(s).split(' ').map(stem).filter(t => (AR.test(t) ? t.length >= 2 : t.length >= 3) && t.length <= 30 && !STOP.has(t));

export function bucket(t) {
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h % BUCKETS;
}

/** docs = { k: [teks muka surat 1, teks muka surat 2, ...] } -> Map(laluan aset -> kandungan) */
export function buildIndex(docs) {
  const files = new Map(), post = Array.from({ length: BUCKETS }, () => ({})), dl = {}, meta = { docs: {}, avgdl: 0, dl };
  let total = 0, count = 0;
  for (const [k, pages] of Object.entries(docs)) {
    meta.docs[k] = pages.length;
    pages.forEach((text, i) => {
      const n = i + 1, toks = tokens(text);
      files.set(`rujukan/p/${k}/${n}.txt`, String(text || ''));
      dl[`${k}:${n}`] = toks.length; total += toks.length; count++;
      const tf = new Map();
      for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
      for (const [t, f] of tf) (post[bucket(t)][t] ||= []).push([k, n, f]);
    });
  }
  meta.avgdl = count ? total / count : 0;
  files.set('rujukan/meta.json', JSON.stringify(meta));
  post.forEach((p, b) => files.set(`rujukan/i/${b}.json`, JSON.stringify(p)));
  return files;
}

const asset = async (env, path) => {
  const r = await env.RUJUKAN.fetch(new Request(`https://aset/${path}`));
  return r.ok ? r : null;
};
const assetJson = async (env, path) => { const r = await asset(env, path); return r ? r.json() : null; };

/** Teks satu muka surat, atau null */
export async function page(env, k, n) {
  if (!env.RUJUKAN || !DOC[k] || !(n >= 1)) return null;
  const r = await asset(env, `rujukan/p/${k}/${n}.txt`);
  return r ? r.text() : null;
}

/** Cari muka surat paling relevan (BM25). Memulangkan [{ id, k, n, skor, teks }] */
export async function search(env, query, limit = 6) {
  if (!env.RUJUKAN) return [];
  const meta = await assetJson(env, 'rujukan/meta.json');
  if (!meta || !meta.avgdl) return [];
  const terms = [...new Set(tokens(query))].slice(0, 24);
  if (!terms.length) return [];
  const N = Object.keys(meta.dl).length, byBucket = new Map();
  for (const t of terms) { const b = bucket(t); if (!byBucket.has(b)) byBucket.set(b, []); byBucket.get(b).push(t); }
  const idx = await Promise.all([...byBucket.keys()].map(b => assetJson(env, `rujukan/i/${b}.json`)));
  const score = new Map();
  [...byBucket.values()].forEach((ts, i) => {
    const p = idx[i] || {};
    for (const t of ts) {
      const list = p[t];
      if (!list) continue;
      const idf = Math.log(1 + (N - list.length + 0.5) / (list.length + 0.5));
      for (const [k, n, f] of list) {
        const id = `${k}:${n}`, len = meta.dl[id] || meta.avgdl;
        const s = idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * len / meta.avgdl));
        const cur = score.get(id) || { k, n, skor: 0, padan: 0 };
        cur.skor += s; cur.padan++;
        score.set(id, cur);
      }
    }
  });
  // Utamakan muka surat yang mengandungi lebih banyak istilah berbeza
  // Buang muka surat yang hanya berkongsi istilah umum (cth. "hukum") dengan soalan
  const ranked = [...score.values()].map(x => ({ ...x, skor: x.skor * (1 + 0.3 * (x.padan - 1)) })).sort((a, b) => b.skor - a.skor);
  // Kitab Arab dan dokumen moden disaring berasingan (skor teks Melayu lebih tinggi daripada teks Arab), supaya kedua-duanya diberi kepada model
  const pick = (list, n) => list.filter(x => x.skor >= list[0].skor * 0.4).slice(0, n);
  const kitab = ranked.filter(x => DOC[x.k] && DOC[x.k].jenis === 'kitab'), moden = ranked.filter(x => !(DOC[x.k] && DOC[x.k].jenis === 'kitab'));
  const nk = kitab.length ? Math.min(3, Math.ceil(limit / 2)) : 0;
  const top = [...(moden.length ? pick(moden, limit - Math.min(nk, kitab.length)) : []), ...(kitab.length ? pick(kitab, nk) : [])];
  const [texts, cetak] = await Promise.all([Promise.all(top.map(x => page(env, x.k, x.n))), nk ? assetJson(env, 'rujukan/cetakan.json') : null]);
  return top.map((x, i) => {
    const isK = DOC[x.k] && DOC[x.k].jenis === 'kitab', teks = texts[i] || '';
    return { id: `${isK ? 'kitab' : 'pdf'}:${x.k}:${x.n}`, k: x.k, n: x.n, skor: +x.skor.toFixed(2), teks, ...(isK ? { cetak: cetakPdf(cetak && cetak[x.k], x.n, teks) } : {}) };
  }).filter(x => x.teks);
}

/** Pautan yang membuka PDF asal pada muka surat itu */
export const pageUrl = (k, n) => DOC[k].jenis === 'kitab' ? D.shamela(DOC[k].id, n) : `${DOC[k].url}#page=${n}`;

/*
 * Edisi cetakan dan PDF bergambar bagi setiap kitab (rujukan/cetakan.json, dibina oleh scripts/padan-pdf.mjs):
 *   { k: { penerbit, edisi, sumber, pdf: [{ url, jilid, offset, dari, hingga, padan }] } }
 * Halaman Shamela tidak selalu sama satu-satu dengan halaman cetakan, jadi pemetaan menggunakan juz dan nombor halaman
 * cetakan yang tertera pada halaman Shamela ("[الجزء: 1 ¦ الصفحة: 142]"; jika tiada, nombor halaman Shamela).
 * Fail PDF itu meliputi halaman cetakan dari..hingga bagi juz itu; muka surat PDF = halaman cetakan + offset.
 * offset dikira dengan OCR: muka surat PDF dibaca dan dipadankan dengan teks Shamela (padan = bilangan sampel yang sepadan).
 */
export function cetakPdf(c, n, teks) {
  if (!c) return null;
  const info = { penerbit: c.penerbit || '', edisi: c.edisi || '' }, ct = cetakan(teks);
  const h = +ct.halaman || +n, j = ct.halaman ? String(ct.jilid || '') : '';
  const f = (c.pdf || []).find(x => (!x.jilid || String(x.jilid) === j) && h >= x.dari && h <= x.hingga);
  return f ? { ...info, pdf: h + f.offset, pdf_url: `${f.url}#page=${h + f.offset}` } : info;
}

/* Juz dan halaman cetakan yang tertera pada halaman Shamela, cth. "[الجزء: 1 ¦ الصفحة: 142]" */
const DIGIT = s => String(s).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660);
export function cetakan(teks) {
  const m = String(teks || '').match(/الجزء\s*:\s*([٠-٩\d]+)\s*¦?\s*الصفحة\s*:\s*([٠-٩\d]+)/) || String(teks || '').match(/()الصفحة\s*:\s*([٠-٩\d]+)/);
  return m ? { jilid: m[1] ? DIGIT(m[1]) : '', halaman: DIGIT(m[2]) } : { jilid: '', halaman: '' };
}

/* Dua dokumen moden dalam Bahasa Inggeris dan kitab dalam Bahasa Arab: tambah istilah Inggeris dan Arab bagi soalan dalam Bahasa Melayu */
const GLOSARI = {
  riba: 'usury interest', faedah: 'interest riba', bunga: 'interest riba', pinjaman: 'loan qard', hutang: 'debt dayn',
  saham: 'shares stock equity securities', pelaburan: 'investment', pelabur: 'investor investment', dagang: 'trading trade', dagangan: 'trading',
  kripto: 'cryptocurrency digital currency bitcoin', bitcoin: 'cryptocurrency digital currency', mata: 'currency', wang: 'money currency', matawang: 'currency',
  forex: 'foreign exchange currency sarf', tukaran: 'exchange sarf', emas: 'gold', perak: 'silver', insurans: 'insurance takaful', takaful: 'insurance tabarru',
  jual: 'sale bay', beli: 'sale purchase', jualbeli: 'sale contract', sewa: 'lease ijarah rent', ansuran: 'instalment deferred payment', tangguh: 'deferred',
  denda: 'penalty late payment', gadai: 'pawn rahn collateral', cagaran: 'collateral rahn', syarikat: 'company partnership', perkongsian: 'partnership musharakah',
  untung: 'profit', keuntungan: 'profit', rugi: 'loss', zakat: 'zakah', wakaf: 'waqf endowment', sukuk: 'bonds sukuk', bon: 'bonds sukuk', opsyen: 'options derivatives',
  hadapan: 'futures forward', niaga: 'trade business', perjudian: 'gambling maysir', judi: 'gambling maysir', spekulasi: 'speculation gharar', gharar: 'uncertainty',
  perubatan: 'medical medicine', ubat: 'medicine drugs', organ: 'organ transplant', derma: 'donation', pemindahan: 'transplant', rawatan: 'treatment medical',
  bayi: 'baby infant', tabung: 'fund', uji: 'test', kahwin: 'marriage', nikah: 'marriage', cerai: 'divorce', talak: 'divorce', wanita: 'women', haid: 'menstruation',
  kad: 'card', kredit: 'credit card', bank: 'banking bank', perbankan: 'banking', akaun: 'account deposit', simpanan: 'deposit savings', dividen: 'dividend',
  hibah: 'gift hibah', komisen: 'commission fee', upah: 'wage fee ujrah', yuran: 'fee', mudarabah: 'profit sharing', musyarakah: 'musharakah partnership',
  murabahah: 'murabahah cost plus', tawarruq: 'tawarruq commodity', inah: 'inah', wadiah: 'wadiah safekeeping', ejen: 'agent agency wakalah', wakalah: 'agency agent',
  halal: 'permissible lawful', haram: 'prohibited unlawful', hukum: 'ruling', makanan: 'food', daging: 'meat', sembelihan: 'slaughter', alkohol: 'alcohol',
  vaksin: 'vaccine', gelatin: 'gelatin', rokok: 'smoking tobacco', vape: 'smoking', internet: 'internet', talian: 'online electronic', melabur: 'investment invest', labur: 'investment'
};
// Istilah fiqh dalam kitab Arab
const ARAB = {
  riba: 'ربا', faedah: 'ربا', bunga: 'ربا', pinjaman: 'قرض', hutang: 'دين قرض', jual: 'بيع', beli: 'بيع شراء', jualbeli: 'بيع', emas: 'ذهب', perak: 'فضة',
  tukaran: 'صرف', forex: 'صرف', mata: 'نقد', wang: 'دراهم دنانير نقد', sewa: 'إجارة', upah: 'إجارة أجرة', gadai: 'رهن', cagaran: 'رهن', syarikat: 'شركة', perkongsian: 'شركة',
  mudarabah: 'قراض مضاربة', untung: 'ربح', keuntungan: 'ربح', ansuran: 'أجل', tangguh: 'أجل', hibah: 'هبة', hadiah: 'هبة هدية', wakaf: 'وقف', wasiat: 'وصية', ejen: 'وكالة',
  wakalah: 'وكالة', judi: 'قمار ميسر', perjudian: 'قمار', gharar: 'غرر', zakat: 'زكاة', nisab: 'نصاب', fitrah: 'فطر', haul: 'حول', perniagaan: 'تجارة', niaga: 'تجارة',
  solat: 'صلاة', sembahyang: 'صلاة', jemaah: 'جماعة', jumaat: 'جمعة', musafir: 'سفر مسافر', jamak: 'جمع', qasar: 'قصر', qada: 'قضاء', azan: 'أذان', imam: 'إمام', makmum: 'مأموم',
  wuduk: 'وضوء', mandi: 'غسل', junub: 'جنابة', tayammum: 'تيمم', najis: 'نجاسة نجس', haid: 'حيض', nifas: 'نفاس', air: 'ماء', kiblat: 'قبلة', aurat: 'عورة',
  puasa: 'صوم صيام', sahur: 'سحور', fidyah: 'فدية', kafarah: 'كفارة', iktikaf: 'اعتكاف', haji: 'حج', umrah: 'عمرة', korban: 'أضحية', akikah: 'عقيقة',
  nikah: 'نكاح', kahwin: 'نكاح', wali: 'ولي', mahar: 'صداق مهر', talak: 'طلاق', cerai: 'طلاق', idah: 'عدة', rujuk: 'رجعة', nafkah: 'نفقة', susuan: 'رضاع',
  faraid: 'فرائض ميراث', pusaka: 'ميراث', waris: 'ميراث وارث', nazar: 'نذر', sumpah: 'يمين', makanan: 'أطعمة', sembelihan: 'ذبائح ذكاة', arak: 'خمر', alkohol: 'خمر مسكر',
  mayat: 'ميت جنازة', jenazah: 'جنازة', kubur: 'قبر', doa: 'دعاء', niat: 'نية', saham: 'شركة', insurans: 'غرر', denda: 'غرامة', curi: 'سرقة', zina: 'زنا'
};
export function expand(q) {
  const extra = [];
  for (const t of normText(q).split(' ')) { if (GLOSARI[t]) extra.push(GLOSARI[t]); if (ARAB[t]) extra.push(ARAB[t]); }
  return extra.length ? `${q} ${extra.join(' ')}` : q;
}

/* Blok teks untuk model: setiap muka surat dengan id pdf:k:n atau kitab:k:n */
export const PDF_MAX = 3500;
export const pagesText = hits => hits.map(h => {
  const d = DOC[h.k];
  return d.jenis === 'kitab'
    ? `[${h.id}] (kitab) ${d.name} (${d.ar}), ${d.by}. Halaman Shamela ${h.n}.\n${h.teks.slice(0, PDF_MAX)}`
    : `[${h.id}] (dokumen) ${d.name}, ${d.by}. Muka surat PDF ${h.n}.\n${h.teks.slice(0, PDF_MAX)}`;
}).join('\n\n');
