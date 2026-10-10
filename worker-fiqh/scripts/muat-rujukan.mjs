/*
 * Muat turun PDF rujukan rasmi moden (FiqhData.MODEN) dan teks kitab muktabar dari Shamela (FiqhData.KITAB),
 * ambil teks setiap muka surat, tambah artikel laman Jabatan Mufti (dimuat oleh scripts/muat-mufti.mjs ke .cache/mufti),
 * dan bina indeks carian ke dalam folder aset/ untuk worker.
 * Dijalankan dalam GitHub Actions sebelum pemasangan; teks tidak disimpan dalam repo.
 * Teks Shamela disimpan dalam .cache/ (actions/cache) supaya setiap halaman hanya dimuat turun sekali.
 * Dokumen yang gagal dimuat turun dilangkau supaya pemasangan tetap berjalan.
 */
import { mkdir, writeFile, readFile, rm, appendFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { MODEN, KITAB, MUFTI, buildIndex, muftiDocs, search, expand, normText } from '../src/rujukan.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), OUT = join(ROOT, 'aset'), CACHE = join(ROOT, '.cache', 'shamela');
const UA = 'Mozilla/5.0 (SiswaCap rujukan; +https://siswacap.my)';
// Had masa muat turun Shamela bagi satu larian; baki halaman diambil pada larian seterusnya (cache)
const DEADLINE = Date.now() + (+process.env.RUJUKAN_MINIT || 24) * 60000;
const summary = s => process.env.GITHUB_STEP_SUMMARY ? appendFile(process.env.GITHUB_STEP_SUMMARY, s + '\n') : null;

async function download(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(120000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = new Uint8Array(await r.arrayBuffer());
      if (String.fromCharCode(...buf.slice(0, 5)) !== '%PDF-') throw new Error(`bukan PDF (${r.headers.get('content-type')})`);
      return buf;
    } catch (e) {
      console.log(`  cubaan ${i + 1}: ${e.message}`);
      if (i === 2) throw e;
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    }
  }
}

async function extract(buf) {
  const task = getDocument({ data: buf, useSystemFonts: true, isEvalSupported: false, verbosity: 0 }), pdf = await task.promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const p = await pdf.getPage(n), tc = await p.getTextContent();
    pages.push(tc.items.map(it => (it.str || '') + (it.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim());
    p.cleanup();
  }
  await task.destroy();
  return pages;
}

/* ---------- Shamela ---------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', '#39': "'" };
const htmlText = h => h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m)
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

// Teks halaman: kandungan div "nass" (matan dan hamisy). Jika struktur berubah, gunakan bahagian yang paling banyak huruf Arab.
function shamelaText(html) {
  const i = html.search(/class="[^"]*\bnass\b/);
  if (i >= 0) {
    const start = html.indexOf('>', i) + 1;
    const ends = [html.indexOf('<footer', start), html.indexOf('id="fld_goto_bottom"', start), html.indexOf('class="text-center', start)].filter(x => x > 0);
    const end = ends.length ? html.lastIndexOf('<', Math.min(...ends)) : html.length;
    return htmlText(html.slice(start, end));
  }
  return '';
}

async function get(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'ar,en' }, signal: AbortSignal.timeout(30000) });
      if (r.status === 404) return null;
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
      if (!r.ok) return { status: r.status, html: '' };
      return { status: 200, html: await r.text(), url: r.url };
    } catch (e) {
      if (i === 3) return { status: 0, html: '', error: e.message };
      await new Promise(z => setTimeout(z, 2000 * (i + 1)));
    }
  }
}

async function shamelaBook(b) {
  const file = join(CACHE, `${b.id}.json`);
  let pages = null, tried = [];
  try { const c = JSON.parse(await readFile(file, 'utf8')); pages = c.pages; tried = c.tried || []; } catch {}
  if (!pages) {
    // Sesetengah buku tiada halaman 1; halaman utama buku juga mengandungi pautan ke halaman-halamannya
    let first = await get(`https://shamela.ws/book/${b.id}/1`);
    if (!first || first.status !== 200) {
      console.log(`  halaman 1: ${first ? first.status + ' ' + (first.error || '') : '404'}; cuba halaman utama buku`);
      first = await get(`https://shamela.ws/book/${b.id}`);
      if (!first || first.status !== 200) throw new Error(`halaman utama: ${first ? first.status + ' ' + (first.error || '') : '404'}`);
      first.html = first.html.replace(/class="[^"]*\bnass\b/g, 'class="x');
    }
    // Pastikan ID Shamela ialah kitab yang dimaksudkan: tajuk halaman mesti mengandungi tajuk Arab kitab (dua kata pertama)
    const tajuk = htmlText((first.html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const kunci = normText(b.ar).split(' ').slice(0, 2).join(' ');
    console.log(`  tajuk Shamela: ${tajuk}`);
    if (!normText(tajuk).includes(kunci)) throw new Error(`tajuk tidak sepadan (dijumpai: ${tajuk.slice(0, 120)})`);
    // Butang halaman terakhir dalam navigasi
    const nums = [...first.html.matchAll(new RegExp(`/book/${b.id}/(\\d+)`, 'g'))].map(m => +m[1]);
    const last = Math.min(Math.max(1, ...nums), 10000);
    pages = new Array(last).fill('');
    pages[0] = shamelaText(first.html);
    console.log(`  halaman terakhir dijangka: ${last}; contoh halaman 1: ${pages[0].slice(0, 160).replace(/\n/g, ' ')}`);
  }
  // Ambil halaman yang belum ada sahaja (larian sebelum ini mungkin terhenti separuh jalan); halaman 404 tidak dicuba lagi
  const skip = new Set(tried), todo = pages.map((t, i) => i + 1).filter(n => !pages[n - 1] && !skip.has(n));
  console.log(`  ${pages.length - todo.length} halaman daripada cache, ${todo.length} perlu dimuat turun`);
  const save = async () => { await mkdir(CACHE, { recursive: true }); await writeFile(file, JSON.stringify({ id: b.id, pages, tried: [...skip] })); };
  let fail = 0, done = 0;
  const worker = async () => {
    while (todo.length && Date.now() < DEADLINE) {
      const n = todo.shift(), r = await get(`https://shamela.ws/book/${b.id}/${n}`);
      if (r && r.status === 200) pages[n - 1] = shamelaText(r.html) || ' ';
      else if (!r) skip.add(n);
      else fail++;
      if (++done % 200 === 0) { await save(); console.log(`  ${done} halaman...`); }
      await new Promise(z => setTimeout(z, 150));
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  await save();
  console.log(`  ${pages.filter(t => t.trim().length > 20).length}/${pages.length} halaman bertext, ${fail} gagal${todo.length ? `, ${todo.length} ditangguhkan ke larian seterusnya` : ''}`);
  return pages.map(t => t.trim());
}

const docs = {};
await summary('### Rujukan rasmi moden (PDF)\n\n| Dokumen | Muka surat | Bertext | Contoh |\n|---|---|---|---|');
for (const d of MODEN) {
  console.log(`${d.k}: ${d.url}`);
  try {
    const pages = await extract(await download(d.url));
    const withText = pages.filter(t => t.length > 40).length;
    docs[d.k] = pages;
    const sample = (pages.find(t => t.length > 200) || pages.find(t => t.length > 40) || '').slice(0, 140).replace(/[|\n]/g, ' ');
    console.log(`  ${pages.length} muka surat, ${withText} bertext. Contoh: ${sample}`);
    await summary(`| ${d.name} | ${pages.length} | ${withText} | ${sample} |`);
  } catch (e) {
    console.log(`  GAGAL: ${e.message}`);
    await summary(`| ${d.name} | gagal | - | ${e.message} |`);
  }
}

for (const b of KITAB) {
  console.log(`${b.k}: https://shamela.ws/book/${b.id}`);
  try {
    const pages = await shamelaBook(b);
    const withText = pages.filter(t => t.length > 20).length;
    if (!withText) throw new Error('tiada teks');
    docs[b.k] = pages;
    const sample = (pages.find(t => t.length > 200) || '').slice(0, 140).replace(/[|\n]/g, ' ');
    await summary(`| ${b.name} (Shamela) | ${pages.length} | ${withText} | ${sample} |`);
  } catch (e) {
    console.log(`  GAGAL: ${e.message}`);
    await summary(`| ${b.name} (Shamela) | gagal | - | ${e.message} |`);
  }
}

// Laman Jabatan Mufti: artikel fatwa, irsyad dan soal jawab yang telah dimuat turun (scripts/muat-mufti.mjs)
const laman = {};
for (const m of MUFTI) {
  try { laman[m.k] = JSON.parse(await readFile(join(ROOT, '.cache', 'mufti', `${m.k}.json`), 'utf8')).artikel || []; }
  catch { laman[m.k] = []; }
}
const mufti = muftiDocs(laman);
Object.assign(docs, mufti.docs);
await summary('\n### Laman Jabatan Mufti dalam indeks\n\n| Negeri | Laman | Artikel | Muka surat indeks | Tarikh terkini |\n|---|---|---|---|---|');
for (const m of MUFTI) {
  const a = laman[m.k], terkini = a.map(x => x[2]).filter(Boolean).sort().pop() || '-';
  console.log(`mufti ${m.k}: ${a.length} artikel, ${(mufti.docs[m.k] || []).length} muka surat, terkini ${terkini}`);
  await summary(`| ${m.negeri} | ${m.laman[0]} | ${a.length} | ${(mufti.docs[m.k] || []).length} | ${terkini} |`);
}

await rm(OUT, { recursive: true, force: true });
const files = buildIndex(docs);
for (const [path, content] of mufti.files) files.set(path, content);
let bytes = 0;
for (const [path, content] of files) {
  const f = join(OUT, path);
  await mkdir(dirname(f), { recursive: true });
  await writeFile(f, content);
  bytes += Buffer.byteLength(content);
}
const besar = [...files].filter(([p]) => p.startsWith('rujukan/i/')).map(([p, c]) => [p, Buffer.byteLength(c)]).sort((a, b) => b[1] - a[1]);
console.log(`Aset ditulis: ${files.size} fail, ${(bytes / 1048576).toFixed(1)} MB; baldi indeks terbesar ${besar[0] && besar[0][0]} ${besar[0] && (besar[0][1] / 1048576).toFixed(2)} MB, purata ${(besar.reduce((n, x) => n + x[1], 0) / Math.max(1, besar.length) / 1048576).toFixed(2)} MB`);
const ok = Object.keys(docs).length;
if (!ok) console.log('Tiada dokumen berjaya dimuat; Tanya AI berjalan tanpa rujukan PDF.');

// Contoh carian sebenar, supaya kualiti padanan boleh dilihat dalam log
const env = { RUJUKAN: { fetch: async req => { const p = new URL(req.url).pathname.slice(1); return files.has(p) ? new Response(files.get(p)) : new Response('', { status: 404 }); } } };
for (const q of ['Hukum jual beli emas secara ansuran', 'Adakah sah solat jika terkena najis?', 'Apakah hukum melabur dalam mata wang kripto seperti Bitcoin?', 'Adakah insurans konvensional halal?', 'Hukum kad kredit dan caj bayaran lewat', 'Hukum pemindahan organ', 'Bolehkah melabur dalam saham syarikat yang ada sedikit aktiviti tidak patuh syariah?', 'Apakah hukum menghisap vape?', 'Hukum menggunakan kecerdasan buatan (AI) untuk menyiapkan tugasan']) {
  const hits = await search(env, expand(q), 6, q);
  console.log(`Carian: ${q}`);
  for (const h of hits) console.log(`  ${h.id} (${h.skor}): ${h.teks.replace(/\s+/g, ' ').slice(0, 150)}`);
}
