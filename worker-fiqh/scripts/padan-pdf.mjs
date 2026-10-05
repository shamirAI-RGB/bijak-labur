/*
 * Padankan halaman Shamela setiap kitab (FiqhData.KITAB) dengan muka surat PDF bergambar edisi cetakan di archive.org.
 *
 * Untuk setiap calon PDF: beberapa muka surat sampel dibaca (lapisan teks PDF, atau OCR tesseract bahasa Arab),
 * kemudian dipadankan dengan teks semua halaman Shamela (.cache/shamela/<id>.json, dibina oleh muat-rujukan.mjs).
 * Halaman Shamela tidak selalu sama satu-satu dengan halaman cetakan, jadi beza dikira terhadap juz dan nombor halaman
 * cetakan yang tertera pada halaman Shamela: offset = muka surat PDF - halaman cetakan. Jika kebanyakan sampel bagi
 * satu juz memberi offset yang sama, fail itu diterima bagi juz itu.
 * Edisi (penerbit, cetakan) diambil daripada kad buku Shamela, atau tajuk item archive.org jika ia menyebut cetakannya.
 *
 * Hasil: aset/rujukan/cetakan.json (lihat cetakPdf dalam src/rujukan.js), disimpan juga dalam .cache/cetakan.json.
 * Memerlukan poppler-utils (pdfinfo, pdftotext, pdftoppm) dan tesseract-ocr-ara. Kitab yang tiada PDF sepadan
 * dilangkau; Tanya AI kemudian memaparkan nota bahawa muka surat PDF belum disahkan.
 */
import { mkdir, writeFile, readFile, rm, appendFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { KITAB, tokens, cetakan } from '../src/rujukan.js';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache'), OUT = join(ROOT, 'aset', 'rujukan'), TMP = join(tmpdir(), 'padan-pdf');
const VERSI = 2, SAMPEL = 20, MAX_MB = 350;
const DEADLINE = Date.now() + (+process.env.PADAN_MINIT || 22) * 60000;
const UA = 'Mozilla/5.0 (BijakLabur rujukan; +https://bijaklabur.my)';
const summary = s => process.env.GITHUB_STEP_SUMMARY ? appendFile(process.env.GITHUB_STEP_SUMMARY, s + '\n') : null;

// Calon item archive.org yang ditemui secara manual (edisi yang sama dengan Shamela didahulukan); hasil carian ditambah selepasnya
const CALON = {
  abisyuja: ['ghayahtaqrib', 'MatnAbiChedja3', 'citamujahid88_gmail_20160908_1509'],
  fathqarib: ['fath-al-qarib-ibn-hazm', 'Fath_alqarib_almujib_fi_sharah_alfaz_altaqrib', '20191110'],
  minhaj: ['mnhjtalbieen02', 'MinhajulTalibeen', 'MinhajTalibinNawawi', '1_20190917_20190917_0613', '20200826_20200826_2343'],
  manhaji: ['Encycloped405', 'm_1_137', 'fmhji3', 'fmhji']
};

// Maklumat kad buku Shamela yang telah disemak (digunakan jika kad tidak dapat dimuat, cth. disekat Cloudflare)
const KAD = {
  fathqarib: { penerbit: 'الجفان والجابي، دار ابن حزم، بيروت', edisi: 'الأولى، 1425 هـ - 2005 م' },
  minhaj: { penerbit: 'دار الفكر', edisi: 'الأولى، 1425 هـ - 2005 م' },
  manhaji: { penerbit: 'دار القلم، دمشق', edisi: 'الرابعة، 1413 هـ - 1992 م' }
};

async function get(url, json) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'ar,en' }, signal: AbortSignal.timeout(60000) });
      if (r.status === 404 || r.status === 403) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return json ? await r.json() : await r.text();
    } catch (e) {
      if (i === 2) { console.log(`  ${url}: ${e.message}`); return null; }
      await new Promise(z => setTimeout(z, 3000 * (i + 1)));
    }
  }
}

/* Kad buku Shamela: "الناشر: ... الطبعة: ... عدد الأجزاء: ..." */
const DIGIT = s => s.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660);
async function kadBuku(id) {
  const h = await get(`https://shamela.ws/book/${id}`);
  if (!h) { console.log('  kad buku Shamela tidak dapat dimuat'); return {}; }
  const t = h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const f = re => (t.match(re) || [])[1]?.trim().replace(/[\s،,]+$/, '') || '';
  const NEXT = '(?=\\s*(?:الطبعة|عدد الأجزاء|عدد الصفحات|ترقيم|أعده|\\[|المحقق|تحقيق|$))';
  return {
    penerbit: DIGIT(f(new RegExp(`الناشر\\s*:\\s*(.{3,150}?)${NEXT}`))),
    edisi: DIGIT(f(new RegExp(`الطبعة\\s*:\\s*(.{3,80}?)(?=\\s*(?:عدد|ترقيم|\\[|الناشر|$))`))),
    sama_cetakan: /ترقيم الكتاب موافق للمطبوع/.test(t)
  };
}

async function carian(b) {
  const q = encodeURIComponent(`title:(${b.ar}) AND mediatype:texts`);
  const r = await get(`https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&rows=8&output=json`, true);
  return (r?.response?.docs || []).map(d => d.identifier);
}

/* Fail PDF dalam item: utamakan fail asal (bukan terbitan archive.org) */
async function failPdf(id) {
  const m = await get(`https://archive.org/metadata/${id}`, true);
  const files = (m?.files || []).filter(f => /\.pdf$/i.test(f.name) && +f.size > 0 && +f.size < MAX_MB * 1e6);
  const asal = files.filter(f => f.source === 'original');
  const servers = [m?.d1, m?.d2].filter(Boolean).map(d => `https://${d}${m.dir}`);
  return { meta: m?.metadata || {}, servers, files: (asal.length ? asal : files).slice(0, 12).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })) };
}

// Pautan archive.org/download melencong ke pelayan data; jika gagal, cuba pelayan data terus (d1, d2)
async function muatTurun(urls, file) {
  let err;
  for (const url of urls) {
    for (let i = 0; i < 2; i++) {
      try {
        const r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(600000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        await pipeline(Readable.fromWeb(r.body), createWriteStream(file));
        return;
      } catch (e) { err = e; console.log(`    ${url.slice(0, 60)}...: ${e.message}${e.cause ? ' (' + (e.cause.code || e.cause.message) + ')' : ''}`); await new Promise(z => setTimeout(z, 4000)); }
    }
  }
  throw err;
}

const arab = s => (s.match(/[ء-ي]/g) || []).length;
async function bacaMukaSurat(file, p, ocr) {
  if (!ocr) {
    const { stdout } = await run('pdftotext', ['-f', p, '-l', p, '-enc', 'UTF-8', file, '-'], { maxBuffer: 1 << 24 }).catch(() => ({ stdout: '' }));
    return stdout;
  }
  const png = join(TMP, `p${p}`);
  await run('pdftoppm', ['-f', p, '-l', p, '-r', '200', '-gray', '-png', '-singlefile', file, png]);
  const { stdout } = await run('tesseract', [png + '.png', '-', '-l', 'ara', '--psm', '6'], { maxBuffer: 1 << 24 }).catch(e => ({ stdout: '' }));
  await rm(png + '.png', { force: true });
  return stdout;
}

/* Padanan set token (kosinus): halaman Shamela terbaik dan kedua terbaik bagi teks satu muka surat PDF */
const setOf = s => new Set(tokens(s).filter(t => t.length >= 3));
function padan(teks, halaman) {
  const A = setOf(teks);
  if (A.size < 15) return null;
  let best = { n: 0, s: 0 }, second = 0;
  halaman.forEach((S, i) => {
    if (S.size < 10) return;
    let c = 0; for (const t of A) if (S.has(t)) c++;
    const s = c / Math.sqrt(A.size * S.size);
    if (s > best.s) { second = best.s; best = { n: i + 1, s }; } else if (s > second) second = s;
  });
  return best.s >= 0.22 && best.s >= second * 1.35 ? { n: best.n, s: +best.s.toFixed(2), kedua: +second.toFixed(2) } : { n: 0, s: +best.s.toFixed(2), kedua: +second.toFixed(2), calon: best.n };
}

/* Kalibrasi satu fail PDF: offset (muka surat PDF - halaman cetakan) bagi setiap juz, yang disokong oleh kebanyakan sampel */
async function kalibrasi(file, halaman, cetak) {
  const { stdout } = await run('pdfinfo', [file]);
  const np = +(stdout.match(/Pages:\s+(\d+)/) || [])[1] || 0;
  if (!np) throw new Error('pdfinfo: tiada bilangan muka surat');
  const sampel = [...new Set(Array.from({ length: SAMPEL }, (_, i) => Math.max(1, Math.round(np * (0.04 + 0.92 * i / (SAMPEL - 1))))))];
  const hasil = [];
  for (const p of sampel) {
    if (Date.now() > DEADLINE) break;
    let t = await bacaMukaSurat(file, p, false), cara = 'teks';
    let m = arab(t) > 150 ? padan(t, halaman) : null;
    if (!m || !m.n) { t = await bacaMukaSurat(file, p, true); cara = 'ocr'; m = padan(t, halaman); }
    hasil.push({ p, cara, ...(m || { n: 0, s: 0 }), ...(m && m.n ? cetak[m.n - 1] : {}) });
  }
  console.log(`    ${np} muka surat; sampel (PDF→Shamela[juz/cetakan]): ${hasil.map(h => h.n ? `${h.p}→${h.n}[${h.j}/${h.h}](${h.s})` : `${h.p}:x(${h.s}/${h.kedua ?? 0})`).join(' ')}`);
  const ok = hasil.filter(h => h.n), juz = {};
  for (const h of ok) (juz[h.j] ||= []).push(h.p - h.h);
  const out = [];
  for (const [j, offs] of Object.entries(juz)) {
    const kira = {};
    for (const o of offs) kira[o] = (kira[o] || 0) + 1;
    const [off, n] = Object.entries(kira).sort((a, b) => b[1] - a[1])[0];
    if (n < 3 || n < offs.length * 0.6) { console.log(`    juz ${j || '-'}: offset tidak konsisten (${offs.join(',')})`); continue; }
    const offset = +off, hs = cetak.filter(c => c.j === j).map(c => c.h);
    const dari = Math.max(Math.min(...hs), 1 - offset), hingga = Math.min(Math.max(...hs), np - offset);
    if (hingga >= dari) out.push({ jilid: j, offset, dari, hingga, padan: n });
  }
  return out;
}

/* ---------- utama ---------- */
let cache = {};
try { cache = JSON.parse(await readFile(join(CACHE, 'cetakan.json'), 'utf8')); } catch {}
if (cache.versi !== VERSI) cache = { versi: VERSI, kitab: {} };
await mkdir(TMP, { recursive: true });
await summary('### PDF cetakan kitab (padanan OCR)\n\n| Kitab | Penerbit | Edisi | PDF | Halaman Shamela diliputi |\n|---|---|---|---|---|');

for (const b of KITAB) {
  console.log(`\n=== ${b.k} (Shamela ${b.id})`);
  const c = cache.kitab[b.k] ||= { cuba: {} };
  let halaman, cetak;
  try {
    const pages = JSON.parse(await readFile(join(CACHE, 'shamela', `${b.id}.json`), 'utf8')).pages;
    halaman = pages.map(setOf);
    // Juz dan halaman cetakan bagi setiap halaman Shamela (nombor halaman Shamela jika tiada tanda cetakan)
    cetak = pages.map((t, i) => { const c = cetakan(t); return c.halaman ? { j: String(c.jilid || ''), h: +c.halaman } : { j: '', h: i + 1 }; });
    const bertanda = pages.filter(t => cetakan(t).halaman).length;
    console.log(`  ${bertanda}/${pages.length} halaman Shamela bertanda halaman cetakan; juz: ${[...new Set(cetak.map(c => c.j))].join(',')}; hujung halaman 10: ${(pages[9] || '').slice(-80).replace(/\n/g, ' ')}`);
  } catch { console.log('  tiada teks Shamela dalam cache; langkau'); continue; }
  if (!c.penerbit) Object.assign(c, await kadBuku(b.id));
  if (!c.penerbit && KAD[b.k]) Object.assign(c, KAD[b.k]);
  console.log(`  kad: penerbit="${c.penerbit || '-'}" edisi="${c.edisi || '-'}" sama cetakan=${!!c.sama_cetakan}`);
  const liputan = x => cetak.filter(c => (x?.pdf || []).some(f => (!f.jilid || f.jilid === c.j) && c.h >= f.dari && c.h <= f.hingga)).length / cetak.length;
  const seen = new Set();
  const calon = [...new Set([...(CALON[b.k] || []), ...await carian(b)])];
  for (const id of calon) {
    if (liputan(c) >= 0.8 || Date.now() > DEADLINE) break;
    if (id in c.cuba) continue;
    console.log(`  calon ${id}`);
    const { meta, files, servers } = await failPdf(id);
    console.log(`    "${meta.title || ''}" | ${meta.publisher || ''} | ${meta.date || ''} | ${files.length} PDF`);
    const pdf = [];
    for (const f of files) {
      if (Date.now() > DEADLINE) break;
      if (f.md5 && seen.has(f.md5)) { console.log(`   ${f.name}: sama dengan fail yang telah diperiksa`); continue; }
      seen.add(f.md5);
      const nama = f.name.split('/').map(encodeURIComponent).join('/'), url = `https://archive.org/download/${id}/${nama}`, file = join(TMP, 'x.pdf');
      try {
        console.log(`   ${f.name} (${(f.size / 1e6).toFixed(1)} MB)`);
        await muatTurun([url, ...servers.map(s => `${s}/${nama}`)], file);
        for (const k of await kalibrasi(file, halaman, cetak)) {
          pdf.push({ url, ...k });
          console.log(`    DITERIMA: juz ${k.jilid || '-'}, halaman cetakan ${k.dari}-${k.hingga}, offset ${k.offset}, ${k.padan} sampel sepadan`);
        }
      } catch (e) { console.log(`    gagal: ${e.message}`); }
      await rm(file, { force: true });
    }
    if (Date.now() > DEADLINE && !pdf.length) break;  // jangan tandakan calon yang belum habis diperiksa
    c.cuba[id] = pdf.length;
    // Satu item sahaja bagi setiap kitab (satu edisi); ambil yang meliputi paling banyak halaman
    if (pdf.length && liputan({ pdf }) > liputan(c)) {
      // Jika tajuk item menyebut cetakannya (cth. "الطبعة الثالثة عشر"), itulah edisi PDF yang dipaparkan
      const judul = String(meta.title || ''), ed = (judul.match(/الطبعة\s+[^)\-|]+/) || [])[0];
      Object.assign(c, { sumber: `https://archive.org/details/${id}`, judul_pdf: judul, pdf, ...(ed ? { edisi: ed.trim() } : {}) });
    }
    await mkdir(CACHE, { recursive: true });
    await writeFile(join(CACHE, 'cetakan.json'), JSON.stringify(cache));
  }
  const pct = Math.round(liputan(c) * 100);
  console.log(`  hasil: ${c.pdf?.length || 0} fail PDF, ${pct}% halaman Shamela diliputi`);
  await summary(`| ${b.name} | ${c.penerbit || '-'} | ${c.edisi || '-'} | ${c.sumber || 'tiada padanan'} | ${pct}% |`);
}

await mkdir(CACHE, { recursive: true });
await writeFile(join(CACHE, 'cetakan.json'), JSON.stringify(cache));
await mkdir(OUT, { recursive: true });
const out = Object.fromEntries(Object.entries(cache.kitab).map(([k, c]) => [k, { penerbit: c.penerbit || '', edisi: c.edisi || '', sumber: c.sumber || '', pdf: c.pdf || [] }]));
await writeFile(join(OUT, 'cetakan.json'), JSON.stringify(out));
console.log('\naset/rujukan/cetakan.json:', JSON.stringify(out).slice(0, 1500));
