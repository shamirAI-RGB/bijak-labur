/*
 * Carian teks penuh setiap muka surat: dokumen rasmi moden (PDF, FiqhData.MODEN), kitab muktabar
 * mazhab Syafie di Shamela (FiqhData.KITAB) dan artikel fatwa daripada laman web Jabatan Mufti (FiqhData.MUFTI). Nombor muka surat kitab ialah nombor halaman Shamela,
 * jadi pautan https://shamela.ws/book/ID/N membuka muka surat yang sama.
 *
 * Teks dan indeks dibina semasa pemasangan (scripts/muat-rujukan.mjs) ke dalam folder aset worker:
 *   rujukan/meta.json          { docs: { k: bilangan muka surat }, N: jumlah muka surat, avgdl }
 *   rujukan/i/<baldi>.json     (BUCKETS fail) { istilah: [[k, n, berat], ...] }  berat = bahagian BM25 bagi kekerapan dan panjang muka surat
 *   rujukan/p/<k>/<c>.json     teks muka surat c*PAGES+1 .. (c+1)*PAGES (PDF: n bermula dari 1, sama seperti #page=n;
 *                              kitab: halaman Shamela). Muka surat dikumpul supaya puluhan ribu halaman kitab kekal di bawah
 *                              had bilangan fail aset Cloudflare.
 *   rujukan/m/<k>/<c>.json     laman Mufti sahaja: [url, tajuk, tarikh] artikel bagi setiap muka surat dalam rujukan/p/<k>/<c>.json
 * Aset ini tidak dihidangkan terus kepada umum (run_worker_first); pelayan hanya memetik muka surat yang relevan.
 */
import '../../js/fiqh-data.js';

const D = globalThis.FiqhData;
export const MODEN = D.MODEN;
export const KITAB = Object.entries(D.KITAB).map(([k, b]) => ({ ...b, k, jenis: 'kitab', url: D.shamela(b.id) }));
// Laman web rasmi Jabatan Mufti negeri dan portal fatwa kebangsaan (FiqhData.MUFTI); setiap laman ialah satu "dokumen"
// yang muka suratnya ialah bahagian artikel fatwa, irsyad atau soal jawab (scripts/muat-mufti.mjs)
export const MUFTI = (D.MUFTI || []).map(m => ({ ...m, jenis: 'mufti', name: m.by, url: m.laman[0] }));
export const DOC = Object.fromEntries([...MODEN.map(d => [d.k, { ...d, jenis: 'dokumen' }]), ...KITAB.map(d => [d.k, d]), ...MUFTI.map(d => [d.k, d])]);
// Lebih banyak baldi = fail indeks yang lebih kecil, jadi setiap carian membaca lebih sedikit data (indeks membesar dengan artikel Mufti)
export const BUCKETS = 2048;
export const PAGES = 50;
export const chunkPath = (k, n) => `rujukan/p/${k}/${Math.floor((n - 1) / PAGES)}.json`;
// Maklumat artikel bagi setiap muka surat laman Mufti: [[url, tajuk, tarikh], ...] sejajar dengan rujukan/p/<k>/<c>.json
export const muftiPath = (k, n) => `rujukan/m/${k}/${Math.floor((n - 1) / PAGES)}.json`;
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
  const files = new Map(), post = Array.from({ length: BUCKETS }, () => ({})), meta = { docs: {}, N: 0, avgdl: 0 };
  const all = [];
  let total = 0;
  for (const [k, pages] of Object.entries(docs)) {
    meta.docs[k] = pages.length;
    for (let c = 0; c * PAGES < pages.length; c++) files.set(`rujukan/p/${k}/${c}.json`, JSON.stringify(pages.slice(c * PAGES, (c + 1) * PAGES).map(t => String(t || ''))));
    pages.forEach((text, i) => {
      const toks = tokens(text);
      if (!toks.length) return;
      total += toks.length; meta.N++;
      const tf = new Map();
      for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
      all.push([k, i + 1, toks.length, tf]);
    });
  }
  meta.avgdl = meta.N ? total / meta.N : 0;
  // Berat BM25 (tanpa idf) dikira semasa bina, supaya pelayan tidak perlu memuat panjang setiap muka surat
  for (const [k, n, len, tf] of all) {
    const norm = K1 * (1 - B + B * len / meta.avgdl);
    for (const [t, f] of tf) (post[bucket(t)][t] ||= []).push([k, n, +(f * (K1 + 1) / (f + norm)).toFixed(3)]);
  }
  files.set('rujukan/meta.json', JSON.stringify(meta));
  post.forEach((p, b) => files.set(`rujukan/i/${b}.json`, JSON.stringify(p)));
  return files;
}

/*
 * Artikel laman Mufti -> muka surat indeks. Artikel panjang dipecah kepada bahagian kira-kira SEG aksara di sempadan
 * perenggan, dan setiap bahagian bermula dengan tajuk artikel supaya carian dan model tahu konteksnya.
 * laman = { k: [[url, tajuk, tarikh, teks], ...] } -> { docs: { k: [teks muka surat] }, files: Map(rujukan/m/... -> JSON) }
 */
export const SEG = 3000;
export function potong(teks, max = SEG) {
  const out = [];
  let t = String(teks || '').trim();
  while (t.length > max) {
    let i = t.lastIndexOf('\n', max);
    if (i < max / 2) i = t.lastIndexOf('. ', max) + 1;
    if (i < max / 2) i = max;
    out.push(t.slice(0, i).trim());
    t = t.slice(i).trim();
  }
  if (t) out.push(t);
  return out;
}
/* PDF (muka surat dipisahkan dengan \f): muka surat pendek yang berturutan digabung; [teks, muka surat pertama] */
export function bahagianPdf(teks, max = SEG) {
  const out = [];
  let cur = '', mula = 0;
  const tolak = () => { if (cur) out.push([cur, mula]); cur = ''; };
  String(teks).split('\f').forEach((t, i) => {
    t = t.trim();
    if (!t) return;
    if (t.length > max) { tolak(); for (const b of potong(t, max)) out.push([b, i + 1]); return; }
    if (cur && cur.length + t.length + 1 > max) tolak();
    if (!cur) mula = i + 1;
    cur = cur ? `${cur}\n${t}` : t;
  });
  tolak();
  return out;
}
export function muftiDocs(laman) {
  const docs = {}, files = new Map();
  for (const [k, artikel] of Object.entries(laman)) {
    const pages = [], info = [], ada = new Set();
    for (const [url, tajuk, tarikh, teks] of artikel) {
      // Artikel yang sama di beberapa URL (cth. dengan dan tanpa parameter) diindeks sekali sahaja
      const cap = normText(String(teks).slice(0, 600));
      if (!url || !teks || ada.has(cap)) continue;
      ada.add(cap);
      // PDF: setiap bahagian memaut ke muka suratnya sendiri
      const bahagian = String(teks).includes('\f') ? bahagianPdf(teks).map(([b, n]) => [b, `${url}#page=${n}`]) : potong(teks).map(b => [b, url]);
      for (const [b, u] of bahagian) { pages.push(b.startsWith(tajuk) ? b : `${tajuk}\n${b}`); info.push([u, tajuk, tarikh || '']); }
    }
    if (!pages.length) continue;
    docs[k] = pages;
    for (let c = 0; c * PAGES < info.length; c++) files.set(`rujukan/m/${k}/${c}.json`, JSON.stringify(info.slice(c * PAGES, (c + 1) * PAGES)));
  }
  return { docs, files };
}

const asset = async (env, path) => {
  const r = await env.RUJUKAN.fetch(new Request(`https://aset/${path}`));
  return r.ok ? r : null;
};
const assetJson = async (env, path) => { const r = await asset(env, path); return r ? r.json() : null; };

/**
 * Cap kandungan (ETag) fail aset, atau '' jika tiada. Digunakan dalam kunci cache jawapan Tanya AI supaya jawapan lama
 * disegarkan apabila rujukan atau peta PDF berubah pada pemasangan baharu (cache Cloudflare tidak dikosongkan oleh pemasangan).
 */
export async function assetTag(env, path = 'rujukan/cetakan.json') {
  if (!env.RUJUKAN) return '';
  try {
    const r = await env.RUJUKAN.fetch(new Request(`https://aset/${path}`, { method: 'HEAD' }));
    return r.ok ? (r.headers.get('etag') || '').replace(/[^\w-]/g, '').slice(0, 40) : '';
  } catch { return ''; }
}

/** Teks satu muka surat, atau null */
export async function page(env, k, n) {
  if (!env.RUJUKAN || !DOC[k] || !(n >= 1)) return null;
  const list = await assetJson(env, chunkPath(k, n));
  const t = list && list[(n - 1) % PAGES];
  return typeof t === 'string' ? t : null;
}

/** Cari muka surat paling relevan (BM25). Memulangkan [{ id, k, n, skor, teks }] */
export async function search(env, query, limit = 6) {
  if (!env.RUJUKAN) return [];
  const meta = await assetJson(env, 'rujukan/meta.json');
  if (!meta || !meta.N) return [];
  const terms = [...new Set(tokens(query))].slice(0, 24);
  if (!terms.length) return [];
  const N = meta.N, byBucket = new Map();
  for (const t of terms) { const b = bucket(t); if (!byBucket.has(b)) byBucket.set(b, []); byBucket.get(b).push(t); }
  const idx = await Promise.all([...byBucket.keys()].map(b => assetJson(env, `rujukan/i/${b}.json`)));
  const score = new Map();
  [...byBucket.values()].forEach((ts, i) => {
    const p = idx[i] || {};
    for (const t of ts) {
      const list = p[t];
      if (!list) continue;
      const idf = Math.log(1 + (N - list.length + 0.5) / (list.length + 0.5));
      for (const [k, n, w] of list) {
        const id = `${k}:${n}`, s = idf * w;
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
  const moden = ranked.filter(x => jenisDoc(x.k) === 'dokumen'), muftiSemua = ranked.filter(x => jenisDoc(x.k) === 'mufti');
  // Dokumen moden dibandingkan juga dengan artikel Mufti (kedua-duanya teks Melayu/Inggeris): muka surat PDF yang jauh lebih
  // lemah daripada artikel Mufti terbaik (cth. hanya berkongsi istilah umum) tidak diberi kepada model
  const atasModen = Math.max(moden[0] ? moden[0].skor : 0, muftiSemua[0] ? muftiSemua[0].skor * 0.6 : 0);
  const pick = (list, n) => list.filter(x => x.skor >= atasModen * 0.4).slice(0, n);
  let kitab = ranked.filter(x => DOC[x.k] && DOC[x.k].jenis === 'kitab');
  // Halaman kitab yang mempunyai gambar muka surat cetakan yang disahkan (OCR) diutamakan sedikit; halaman lain tetap diberi
  // dan dipaparkan dengan teks halaman Shamela, dengan nota bahawa gambar cetakannya belum tersedia
  const cetak = kitab.length ? await muatCetakan(env) : null;
  if (cetak) kitab = kitab.map(x => adaGambar(cetak, x.k, x.n) ? { ...x, skor: x.skor * 1.15 } : x).sort((a, b) => b.skor - a.skor);
  // Kitab: utamakan kitab yang berbeza (cth. matan Syafie, syarah dan fiqh perbandingan) sebelum halaman kedua kitab yang sama
  const pelbagai = (list, n) => {
    const ok = list.filter(x => x.skor >= list[0].skor * 0.4), dulu = [], kemudian = [], ada = new Set();
    for (const x of ok) (ada.has(x.k) ? kemudian : (ada.add(x.k), dulu)).push(x);
    return [...dulu, ...kemudian].slice(0, n);
  };
  // Laman Mufti: artikel berbeza dahulu, dan negeri yang berbeza sebelum artikel kedua dari negeri yang sama.
  // Skor dibandingkan dengan dokumen moden (kedua-duanya teks Melayu), supaya artikel yang lemah kaitannya tidak diberi.
  const mufti = await pilihMufti(env, muftiSemua, moden[0] ? moden[0].skor : 0);
  const nk = kitab.length ? Math.min(mufti.length ? 3 : 4, Math.ceil(limit / 2)) : 0;
  const top = [...(moden.length ? pick(moden, limit - Math.min(nk, kitab.length) - mufti.length) : []), ...mufti, ...(kitab.length ? pelbagai(kitab, nk) : [])];
  const chunks = new Map(top.map(x => [chunkPath(x.k, x.n), null]));
  await Promise.all([...chunks.keys()].map(async p => chunks.set(p, await assetJson(env, p))));
  const texts = top.map(x => { const l = chunks.get(chunkPath(x.k, x.n)); const t = l && l[(x.n - 1) % PAGES]; return typeof t === 'string' ? t : null; });
  const adaModen = top.some(x => jenisDoc(x.k) === 'dokumen');
  const gambar = adaModen ? await assetJson(env, 'rujukan/gambar.json') : null;
  return top.map((x, i) => {
    const jenis = jenisDoc(x.k), isK = jenis === 'kitab', teks = texts[i] || '';
    if (jenis === 'mufti') return { id: `mufti:${x.k}:${x.n}`, k: x.k, n: x.n, skor: +x.skor.toFixed(2), teks, url: x.url, tajuk: x.tajuk, tarikh: x.tarikh };
    // Dokumen moden: gambar satu muka surat (rujukan/g/<k>/<n>.jpg) jika telah dijana semasa pemasangan
    const g = !isK && gambar && x.n <= (gambar[x.k] || 0);
    return { id: `${isK ? 'kitab' : 'pdf'}:${x.k}:${x.n}`, k: x.k, n: x.n, skor: +x.skor.toFixed(2), teks, ...(isK ? { cetak: cetakPdf(cetak && cetak[x.k], x.n) } : g ? { gambar: gambarPath(x.k, x.n) } : {}) };
  }).filter(x => x.teks);
}

const jenisDoc = k => DOC[k] ? DOC[k].jenis : '';
export const MUFTI_MAKS = 3;
/* Pilih paling banyak MUFTI_MAKS bahagian artikel Mufti: satu bahagian bagi setiap artikel, negeri berbeza didahulukan */
async function pilihMufti(env, list, skorModen) {
  if (!list.length) return [];
  const had = Math.max(list[0].skor, skorModen) * 0.4, calon = list.filter(x => x.skor >= had).slice(0, 12);
  const info = new Map(calon.map(x => [muftiPath(x.k, x.n), null]));
  await Promise.all([...info.keys()].map(async p => info.set(p, await assetJson(env, p))));
  const dulu = [], kemudian = [], url = new Set(), negeri = new Set();
  for (const x of calon) {
    // Satu bahagian bagi setiap artikel (bahagian PDF berbeza hanya berbeza #page)
    const a = (info.get(muftiPath(x.k, x.n)) || [])[(x.n - 1) % PAGES], asal = a && a[0].split('#')[0];
    if (!a || url.has(asal)) continue;
    url.add(asal);
    const y = { ...x, url: a[0], tajuk: a[1], tarikh: a[2] };
    (negeri.has(x.k) ? kemudian : (negeri.add(x.k), dulu)).push(y);
  }
  return [...dulu, ...kemudian].slice(0, MUFTI_MAKS);
}

/** Laluan pelayan bagi gambar satu muka surat dokumen moden (lihat /halaman dalam app.js) */
export const gambarPath = (k, n) => `/halaman/${k}/${n}.jpg`;
export const gambarAset = (k, n) => `rujukan/g/${k}/${n}.jpg`;

/** rujukan/cetakan.json (peta halaman Shamela -> muka surat cetakan), atau null jika tiada */
export const muatCetakan = env => env.RUJUKAN ? assetJson(env, 'rujukan/cetakan.json').catch(() => null) : Promise.resolve(null);
/** Halaman kitab ini mempunyai gambar muka surat cetakan yang disahkan */
export const adaGambar = (cetak, k, n) => !!(cetak && cetakPdf(cetak[k], n)?.gambar_url);

/** Pautan yang membuka PDF asal pada muka surat itu */
export const pageUrl = (k, n) => DOC[k].jenis === 'kitab' ? D.shamela(DOC[k].id, n) : DOC[k].jenis === 'mufti' ? DOC[k].url : `${DOC[k].url}#page=${n}`;

/*
 * Edisi cetakan dan PDF bergambar bagi setiap kitab (rujukan/cetakan.json, dibina oleh scripts/padan-pdf.mjs):
 *   { k: { penerbit, edisi, sumber, fail: [url PDF], peta: { halamanShamela: [indeksFail, mukaSuratPdf] },
 *          paparan: [{ gambar, lihat, off } atau null bagi setiap fail],
 *          info: [{ penerbit, edisi, sumber } bagi setiap fail] (hanya jika kitab menggunakan lebih daripada satu naskhah) } }
 * Peta dibina dengan OCR: setiap muka surat PDF dibaca dan dipadankan dengan teks halaman Shamela. Halaman yang tiada
 * dalam peta belum disahkan pada PDF. paparan: templat URL gambar satu muka surat dan halaman BookReader archive.org
 * ({n} = muka surat PDF + off), yang jauh lebih ringan daripada PDF penuh.
 */
export function cetakPdf(c, n) {
  if (!c) return null;
  const m = c.peta && c.peta[n], url = m && (c.fail || [])[m[0]];
  // Naskhah tambahan (jilid atau edisi lain) membawa penerbit dan edisinya sendiri dalam c.info[indeks fail]
  const fi = m && c.info && c.info[m[0]];
  const info = { penerbit: (fi || c).penerbit || '', edisi: (fi || c).edisi || '' };
  if (!url) return info;
  const v = (c.paparan || [])[m[0]], leaf = v && String(m[1] + (v.off || 0));
  const papar = v && v.gambar ? { gambar_url: v.gambar.replace('{n}', leaf), lihat_url: v.lihat.replace('{n}', leaf) } : {};
  return { ...info, pdf: m[1], pdf_url: `${url}#page=${m[1]}`, ...papar };
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

/* Blok teks untuk model: setiap muka surat dengan id pdf:k:n, kitab:k:n atau mufti:k:n */
export const PDF_MAX = 3500;
export const pagesText = hits => hits.map(h => {
  const d = DOC[h.k];
  if (d.jenis === 'mufti') return `[${h.id}] (laman rasmi Jabatan Mufti, negeri: ${d.negeri}) ${d.by}: "${h.tajuk}"${h.tarikh ? `, ${h.tarikh}` : ''}. ${h.url}\n${h.teks.slice(0, PDF_MAX)}`;
  return d.jenis === 'kitab'
    ? `[${h.id}] (kitab${d.banding ? ', perbandingan mazhab' : ', mazhab Syafie'}) ${d.name} (${d.ar}), ${d.by}. Halaman Shamela ${h.n}.\n${h.teks.slice(0, PDF_MAX)}`
    : `[${h.id}] (dokumen) ${d.name}, ${d.by}. Muka surat PDF ${h.n}.\n${h.teks.slice(0, PDF_MAX)}`;
}).join('\n\n');
