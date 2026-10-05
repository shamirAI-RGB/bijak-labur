/*
 * Padankan halaman Shamela setiap kitab (FiqhData.KITAB) dengan muka surat PDF bergambar edisi cetakan di archive.org.
 *
 * Untuk setiap calon PDF: beberapa muka surat sampel dibaca (lapisan teks PDF, atau OCR tesseract bahasa Arab),
 * kemudian dipadankan dengan teks semua halaman Shamela (.cache/shamela/<id>.json, dibina oleh muat-rujukan.mjs).
 * Jika kebanyakan sampel memberi beza yang sama (offset = muka surat PDF - halaman Shamela), fail itu diterima.
 * Edisi (penerbit, cetakan) diambil daripada kad buku Shamela, kerana halaman yang sepadan bermakna cetakan yang sama.
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
import { KITAB, tokens } from '../src/rujukan.js';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache'), OUT = join(ROOT, 'aset', 'rujukan'), TMP = join(tmpdir(), 'padan-pdf');
const VERSI = 1, SAMPEL = 14, MAX_MB = 350;
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
  if (!h) return {};
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
  return { meta: m?.metadata || {}, files: (asal.length ? asal : files).slice(0, 12).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })) };
}

async function muatTurun(url, file) {
  const r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(600000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(file));
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

/* Kalibrasi satu fail PDF: offset yang disokong oleh kebanyakan sampel */
async function kalibrasi(file, halaman) {
  const { stdout } = await run('pdfinfo', [file]);
  const np = +(stdout.match(/Pages:\s+(\d+)/) || [])[1] || 0;
  if (!np) throw new Error('pdfinfo: tiada bilangan muka surat');
  const sampel = [...new Set(Array.from({ length: SAMPEL }, (_, i) => Math.max(1, Math.round(np * (0.06 + 0.88 * i / (SAMPEL - 1))))))];
  const hasil = [];
  for (const p of sampel) {
    if (Date.now() > DEADLINE) break;
    let t = await bacaMukaSurat(file, p, false), cara = 'teks';
    let m = arab(t) > 150 ? padan(t, halaman) : null;
    if (!m || !m.n) { t = await bacaMukaSurat(file, p, true); cara = 'ocr'; m = padan(t, halaman); }
    hasil.push({ p, cara, ...(m || { n: 0, s: 0 }) });
  }
  const ok = hasil.filter(h => h.n), kira = {};
  for (const h of ok) kira[h.p - h.n] = (kira[h.p - h.n] || 0) + 1;
  const [off, n] = Object.entries(kira).sort((a, b) => b[1] - a[1])[0] || [0, 0];
  console.log(`    ${np} muka surat; sampel: ${hasil.map(h => h.n ? `${h.p}→${h.n}(${h.s},${h.cara})` : `${h.p}:x(${h.s}/${h.kedua ?? 0}${h.calon ? '~' + h.calon : ''})`).join(' ')}`);
  const offset = +off;
  return n >= 4 && n >= ok.length * 0.6 ? { offset, dari: Math.max(1, 1 - offset), hingga: Math.min(halaman.length, np - offset), padan: n, sampel: hasil.length } : null;
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
  let halaman;
  try { halaman = JSON.parse(await readFile(join(CACHE, 'shamela', `${b.id}.json`), 'utf8')).pages.map(setOf); }
  catch { console.log('  tiada teks Shamela dalam cache; langkau'); continue; }
  if (!c.penerbit) Object.assign(c, await kadBuku(b.id));
  console.log(`  kad: penerbit="${c.penerbit || '-'}" edisi="${c.edisi || '-'}" sama cetakan=${!!c.sama_cetakan}`);
  const liputan = x => (x?.pdf || []).reduce((s, f) => s + f.hingga - f.dari + 1, 0) / halaman.length;
  const calon = [...new Set([...(CALON[b.k] || []), ...await carian(b)])];
  for (const id of calon) {
    if (liputan(c) >= 0.8 || Date.now() > DEADLINE) break;
    if (c.cuba[id]) continue;
    console.log(`  calon ${id}`);
    const { meta, files } = await failPdf(id);
    console.log(`    "${meta.title || ''}" | ${meta.publisher || ''} | ${meta.date || ''} | ${files.length} PDF`);
    const pdf = [];
    for (const f of files) {
      if (Date.now() > DEADLINE) break;
      const url = `https://archive.org/download/${id}/${f.name.split('/').map(encodeURIComponent).join('/')}`, file = join(TMP, 'x.pdf');
      try {
        console.log(`   ${f.name} (${(f.size / 1e6).toFixed(1)} MB)`);
        await muatTurun(url, file);
        const k = await kalibrasi(file, halaman);
        if (k) { pdf.push({ url, ...k }); console.log(`    DITERIMA: offset ${k.offset}, halaman Shamela ${k.dari}-${k.hingga}, ${k.padan}/${k.sampel} sampel`); }
      } catch (e) { console.log(`    gagal: ${e.message}`); }
      await rm(file, { force: true });
    }
    if (Date.now() > DEADLINE && !pdf.length) break;  // jangan tandakan calon yang belum habis diperiksa
    c.cuba[id] = pdf.length;
    // Satu item sahaja bagi setiap kitab (satu edisi); ambil yang meliputi paling banyak halaman
    if (pdf.length && liputan({ pdf }) > liputan(c)) Object.assign(c, { sumber: `https://archive.org/details/${id}`, pdf_info: [meta.publisher, meta.date].filter(Boolean).join(', '), pdf });
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
const out = Object.fromEntries(Object.entries(cache.kitab).map(([k, c]) => [k, { penerbit: c.penerbit || '', edisi: c.edisi || '', sumber: c.sumber || '', pdf: (c.pdf || []).map(({ sampel, ...f }) => f) }]));
await writeFile(join(OUT, 'cetakan.json'), JSON.stringify(out));
console.log('\naset/rujukan/cetakan.json:', JSON.stringify(out).slice(0, 1500));
