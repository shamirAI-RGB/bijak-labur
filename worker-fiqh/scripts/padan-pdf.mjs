/*
 * Padankan setiap halaman Shamela kitab (FiqhData.KITAB) dengan muka surat PDF bergambar edisi cetakan di archive.org.
 *
 * Halaman Shamela tidak sama satu-satu dengan muka surat cetakan (sesetengah halaman dipecah atau digabung, jadi beza
 * berubah sepanjang kitab). Oleh itu setiap muka surat PDF dibaca (lapisan teks PDF, atau OCR tesseract bahasa Arab)
 * dan dipadankan dengan teks semua halaman Shamela (.cache/shamela/<id>.json, dibina oleh muat-rujukan.mjs):
 *   1. Sampel: beberapa muka surat dibaca dahulu. Fail diterima jika kebanyakan sampel sepadan dan tertib halamannya menaik
 *      (bermakna PDF itu kitab yang sama, bukan syarah atau kitab lain).
 *   2. Penuh: semua muka surat fail yang diterima dibaca (hasil disimpan dalam .cache/cetakan.json supaya larian
 *      seterusnya menyambung), dan setiap halaman Shamela dipetakan ke muka surat PDF yang mengandungi teksnya (peta.mjs).
 * Halaman yang tidak dapat dipadankan dibiarkan tanpa muka surat PDF; Tanya AI kemudian memaparkan nota bahawa muka surat
 * PDF belum disahkan.
 *
 * Hasil: aset/rujukan/cetakan.json (lihat cetakPdf dalam src/rujukan.js).
 * Memerlukan poppler-utils (pdfinfo, pdftotext, pdftoppm) dan tesseract-ocr-ara.
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
import { bina } from './peta.mjs';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.cache'), OUT = join(ROOT, 'aset', 'rujukan'), TMP = join(tmpdir(), 'padan-pdf');
const VERSI = 4, SAMPEL = 12, SELARI = 4, MAX_MB = 350;
const DEADLINE = Date.now() + (+process.env.PADAN_MINIT || 24) * 60000;
const UA = 'Mozilla/5.0 (BijakLabur rujukan; +https://bijaklabur.my)';
const summary = s => process.env.GITHUB_STEP_SUMMARY ? appendFile(process.env.GITHUB_STEP_SUMMARY, s + '\n') : null;
const masa = () => Date.now() < DEADLINE;

// Calon item archive.org yang ditemui secara manual didahulukan; hasil carian archive.org ditambah selepasnya
const CALON = {
  abisyuja: ['ghayahtaqrib', 'MatnAbiChedja3', 'citamujahid88_gmail_20160908_1509'],
  fathqarib: ['fath-al-qarib-ibn-hazm', 'Fath_alqarib_almujib_fi_sharah_alfaz_altaqrib'],
  minhaj: ['MinhajTalibinNawawi', 'mnhjtalbieen02', 'MinhajulTalibeen'],
  manhaji: ['fmhji', 'Encycloped405', '1_20240927_20240927_1217']
};
// Penerbit dan edisi setiap item (daripada tajuk item, atau kad buku Shamela bagi edisi yang sama).
// Item lain dipaparkan dengan penerbit dalam metadata archive.org (jika ada) dan tajuk item sebagai edisi.
const EDISI = {
  'fath-al-qarib-ibn-hazm': { penerbit: 'الجفان والجابي، دار ابن حزم، بيروت', edisi: 'الأولى، 1425 هـ - 2005 م' },
  ghayahtaqrib: { penerbit: 'دار ابن حزم', edisi: 'تحقيق ماجد الحموي' },
  fmhji: { penerbit: 'دار القلم، دمشق', edisi: 'الثالثة عشرة' },
  Encycloped405: { penerbit: 'دار القلم، دمشق', edisi: '' },
  '1_20240927_20240927_1217': { penerbit: 'دار القلم، دمشق', edisi: '' }
};

async function get(url, json) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60000) });
      if (r.status === 404 || r.status === 403) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return json ? await r.json() : await r.text();
    } catch (e) {
      if (i === 2) { console.log(`  ${url}: ${e.message}`); return null; }
      await new Promise(z => setTimeout(z, 3000 * (i + 1)));
    }
  }
}

async function carian(b) {
  // Tajuk penuh dahulu, kemudian dua kata pertama tajuk (item berjilid sering bertajuk "المجموع شرح المهذب ج3" dan seumpamanya)
  const pendek = b.ar.split(/\s+/).slice(0, 2).join(' ');
  const ids = [];
  for (const t of [`title:(${b.ar})`, `title:("${pendek}")`]) {
    const r = await get(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(`${t} AND mediatype:texts`)}&fl[]=identifier&rows=25&output=json`, true);
    ids.push(...(r?.response?.docs || []).map(d => d.identifier));
  }
  return [...new Set(ids)];
}

/* Fail PDF dalam item: utamakan fail asal (bukan terbitan archive.org) */
async function failPdf(id) {
  const m = await get(`https://archive.org/metadata/${id}`, true);
  const files = (m?.files || []).filter(f => /\.pdf$/i.test(f.name) && +f.size > 0 && +f.size < MAX_MB * 1e6);
  const asal = files.filter(f => f.source === 'original');
  const servers = [m?.d1, m?.d2].filter(Boolean).map(d => `https://${d}${m.dir}`);
  // Buku yang boleh dipaparkan satu muka surat demi satu oleh archive.org (terbitan _jp2), dinamakan mengikut fail asalnya
  const buku = (m?.files || []).map(f => f.name.match(/^(.+)_jp2\.(zip|tar)$/)).filter(Boolean).map(x => x[1]);
  return { meta: m?.metadata || {}, servers, buku, files: (asal.length ? asal : files).slice(0, 12).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })) };
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
async function baca(file, p, ocr) {
  if (!ocr) {
    const { stdout } = await run('pdftotext', ['-f', p, '-l', p, '-enc', 'UTF-8', file, '-'], { maxBuffer: 1 << 24 }).catch(() => ({ stdout: '' }));
    return stdout;
  }
  const png = join(TMP, `p${p}`);
  await run('pdftoppm', ['-f', p, '-l', p, '-r', '200', '-gray', '-png', '-singlefile', file, png]).catch(() => {});
  // Satu bebenang bagi setiap proses tesseract: beberapa proses serentak dengan OpenMP berbilang bebenang menjadi sangat perlahan
  const { stdout } = await run('tesseract', [png + '.png', '-', '-l', 'ara', '--psm', '6'], { maxBuffer: 1 << 24, env: { ...process.env, OMP_THREAD_LIMIT: '1' } }).catch(() => ({ stdout: '' }));
  await rm(png + '.png', { force: true });
  return stdout;
}

/* Padanan set token (kosinus): halaman Shamela terbaik bagi teks satu muka surat PDF, jika jelas lebih baik daripada yang kedua */
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
  return best.s >= 0.22 && best.s >= second * 1.35 ? { n: best.n, s: +best.s.toFixed(2) } : null;
}
async function padanMukaSurat(file, p, halaman) {
  const t = await baca(file, p, false);
  return (arab(t) > 150 && padan(t, halaman)) || padan(await baca(file, p, true), halaman);
}

async function selari(items, fn) {
  const q = [...items];
  await Promise.all(Array.from({ length: SELARI }, async () => { while (q.length && masa()) await fn(q.shift()); }));
}

/*
 * Langkah 1: sampel. Diterima jika sekurang-kurangnya 4 sampel (35%) sepadan dan halaman Shamela menaik mengikut muka surat
 * PDF. Edisi bertahqiq mempunyai banyak muka surat mukadimah, nota kaki dan indeks yang tidak sepadan, manakala syarah
 * (yang mengandungi matan) jarang mencapai ambang padanan kerana teks matan bercampur dengan huraian.
 */
async function semakSampel(file, np, halaman) {
  const ps = [...new Set(Array.from({ length: SAMPEL }, (_, i) => Math.max(1, Math.round(np * (0.05 + 0.9 * i / (SAMPEL - 1))))))];
  const hasil = [];
  await selari(ps, async p => { const m = await padanMukaSurat(file, p, halaman); hasil.push({ p, n: m?.n || 0, s: m?.s || 0 }); });
  hasil.sort((a, b) => a.p - b.p);
  const ok = hasil.filter(h => h.n);
  let naik = 0;
  for (let i = 1; i < ok.length; i++) if (ok[i].n >= ok[i - 1].n) naik++;
  console.log(`    ${np} muka surat; sampel (PDF→Shamela): ${hasil.map(h => h.n ? `${h.p}→${h.n}(${h.s})` : `${h.p}:x`).join(' ')}`);
  return ok.length >= Math.max(4, hasil.length * 0.35) && naik >= (ok.length - 1) * 0.85;
}

/* Langkah 2: baca semua muka surat yang belum dibaca */
async function bacaPenuh(file, np, halaman, ocr) {
  const todo = [];
  for (let p = 1; p <= np; p++) if (!(p in ocr)) todo.push(p);
  let n = 0;
  await selari(todo, async p => {
    const m = await padanMukaSurat(file, p, halaman);
    ocr[p] = m ? [m.n, m.s] : 0;
    if (++n % 100 === 0) console.log(`    ${n}/${todo.length} muka surat dibaca`);
  });
  return Object.keys(ocr).length >= np;
}

/*
 * Paparan ringan: gambar satu muka surat daripada archive.org (puluhan hingga ratusan KB) dan halaman BookReader pada muka
 * surat itu, sebagai ganti PDF penuh (beberapa hingga puluhan MB) yang lambat dibuka, terutamanya di telefon. Indeks muka surat
 * archive.org (n0 biasanya muka surat pertama PDF) disahkan dengan OCR: gambar bagi muka surat PDF yang telah dipadankan
 * dibaca, dan mesti sepadan dengan halaman Shamela yang sama. Bentuk gambar pertama yang lulus mengikut keutamaan dipilih:
 * lebar 800 piksel (kira-kira 50 hingga 300 KB) cukup jelas untuk dibaca di skrin telefon, manakala saiz "medium"
 * lebih kecil tetapi baris Arab berharakat sukar dibaca. Fail tanpa gambar yang disahkan kekal dengan pautan PDF.
 */
const PAPARAN = 2;
async function gambar(url, file) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(45000) });
    if (!r.ok || !/^image\//.test(r.headers.get('content-type') || '')) return `HTTP ${r.status} ${r.headers.get('content-type') || ''}`.trim();
    const b = Buffer.from(await r.arrayBuffer());
    await writeFile(file, b);
    return b.length;
  } catch (e) { return e.message; }
}
async function paparan(c, halaman) {
  if (!c.buku) return;
  const id = c.item, awal = `https://archive.org/download/${id}/`;
  for (const x of c.fail) {
    if (x.paparan?.v === PAPARAN || !masa()) continue;
    const base = decodeURIComponent(x.url.slice(awal.length)).replace(/\.pdf$/i, '');
    const ocr = cache.ocr[x.url] || {};
    const [p, v] = Object.entries(ocr).filter(([, v]) => v).sort((a, b) => b[1][1] - a[1][1])[0] || [];
    if (!c.buku.includes(base) || !v) { console.log(`  paparan ${base}: tiada gambar muka surat di archive.org`); x.paparan = { v: PAPARAN }; continue; }
    const sub = c.buku.length > 1 ? `${id}/${base.split('/').map(encodeURIComponent).join('/')}` : id;
    const iiif = `https://iiif.archive.org/iiif/3/${c.buku.length > 1 ? `${id}%2F${encodeURIComponent(base)}` : id}$`;
    const calon = [`https://archive.org/download/${sub}/page/n{n}_w800.jpg`, `https://archive.org/download/${sub}/page/n{n}_medium.jpg`,
      `${iiif}{n}/full/800,/0/default.jpg`, `https://archive.org/download/${sub}/page/n{n}.jpg`, `${iiif}{n}/full/max/0/default.jpg`];
    let pilih = null;
    for (const off of [-1, 0]) {
      for (const t of calon) {
        if (!masa()) break;
        const url = t.replace('{n}', +p + off), file = join(TMP, 'g.jpg'), saiz = await gambar(url, file);
        if (typeof saiz !== 'number') { console.log(`    ${url}: ${saiz}`); continue; }
        const { stdout } = await run('tesseract', [file, '-', '-l', 'ara', '--psm', '6'], { maxBuffer: 1 << 24, env: { ...process.env, OMP_THREAD_LIMIT: '1' } }).catch(() => ({ stdout: '' }));
        const m = padan(stdout, halaman), lulus = m?.n === v[0];
        console.log(`    ${url}: ${(saiz / 1024).toFixed(0)} KB, OCR → Shamela ${m ? m.n : '-'} (dijangka ${v[0]})${lulus ? ' lulus' : ''}`);
        if (lulus) { pilih = { t, off }; break; }
      }
      if (pilih) break;
    }
    if (!pilih && !masa()) continue;
    x.paparan = pilih ? { v: PAPARAN, gambar: pilih.t, lihat: `https://archive.org/details/${sub}/page/n{n}/mode/1up`, off: pilih.off } : { v: PAPARAN };
    console.log(`  paparan ${base}: ${pilih ? `${pilih.t} (indeks = muka surat ${pilih.off < 0 ? '- 1' : ''})` : 'tiada gambar yang disahkan; kekal dengan pautan PDF'}`);
  }
}

/* ---------- utama ---------- */
let cache = {};
try { cache = JSON.parse(await readFile(join(CACHE, 'cetakan.json'), 'utf8')); } catch {}
if (cache.versi !== VERSI) cache = { versi: VERSI, kitab: {}, ocr: {} };
const simpan = async () => { await mkdir(CACHE, { recursive: true }); await writeFile(join(CACHE, 'cetakan.json'), JSON.stringify(cache)); };
await mkdir(TMP, { recursive: true });
await summary('### PDF cetakan kitab (padanan OCR)\n\n| Kitab | Penerbit | Edisi | PDF | Halaman Shamela dipetakan |\n|---|---|---|---|---|');

/*
 * Satu calon item archive.org: setiap fail PDF disemak dengan sampel; fail yang diterima dibaca sepenuhnya (bersambung
 * merentasi larian). rec ialah rekod naskhah dalam cache ({ item, fail, buku, judul, penerbit }); rec kosong = calon baharu.
 */
async function cubaItem(c, rec, id, halaman, seen) {
  console.log(`  calon ${id}`);
  const { meta, files, servers, buku } = await failPdf(id);
  console.log(`    "${meta.title || ''}" | ${files.length} PDF`);
  if (rec.item === id && rec.penerbit === undefined) rec.penerbit = String(meta.publisher || '');
  const diterima = rec.item === id ? rec.fail : [];
  for (const f of files) {
    if (!masa()) break;
    if (f.md5 && seen.has(f.md5)) continue;
    seen.add(f.md5);
    const nama = f.name.split('/').map(encodeURIComponent).join('/'), url = `https://archive.org/download/${id}/${nama}`, file = join(TMP, 'x.pdf');
    const lama = diterima.find(x => x.url === url);
    if (lama && lama.siap) continue;
    if (!lama && c.ditolak?.includes(url)) continue;
    try {
      console.log(`   ${f.name} (${(f.size / 1e6).toFixed(1)} MB)`);
      await muatTurun([url, ...servers.map(s => `${s}/${nama}`)], file);
      const np = +((await run('pdfinfo', [file])).stdout.match(/Pages:\s+(\d+)/) || [])[1] || 0;
      if (!lama && !(np > 1 && await semakSampel(file, np, halaman))) {
        if (!masa()) { console.log('    had masa: sampel belum lengkap'); continue; }
        console.log('    ditolak: bukan teks kitab yang sama');
        (c.ditolak ||= []).push(url);
        continue;
      }
      const x = lama || { url, np, siap: false };
      if (!lama) diterima.push(x);
      const ocr = cache.ocr[url] ||= {};
      x.siap = await bacaPenuh(file, np, halaman, ocr);
      console.log(`    ${Object.keys(ocr).length}/${np} muka surat dibaca${x.siap ? '' : ' (bersambung pada larian seterusnya)'}`);
    } catch (e) { console.log(`    gagal: ${e.message}`); }
    finally {
      await rm(file, { force: true });
      if (diterima.length && !rec.item) Object.assign(rec, { item: id, fail: diterima, judul: String(meta.title || ''), penerbit: String(meta.publisher || '') });
      await simpan();
    }
  }
  if (rec.item === id) rec.buku = buku;
}

/* Semua naskhah yang diterima bagi satu kitab: naskhah utama (c) dan naskhah tambahan (cth. jilid lain, edisi lain) */
const naskhah = c => [c.item ? c : null, ...(c.tambahan || [])].filter(r => r && r.item);
/* Peta gabungan: setiap naskhah dipetakan berasingan (tertib menaik dalam naskhah itu), naskhah terdahulu diutamakan */
function petaGabung(c, N) {
  const peta = {};
  let off = 0;
  for (const r of naskhah(c)) {
    const p = bina(r.fail.map(x => cache.ocr[x.url] || {}), N);
    for (const [n, [f, m]] of Object.entries(p)) if (!peta[n]) peta[n] = [off + f, m];
    off += r.fail.length;
  }
  return peta;
}
// Teruskan mencari naskhah tambahan sehingga liputan ini dicapai (kitab berjilid-jilid sering dimuat naik satu jilid satu item)
const LIPUTAN = 0.85, MAX_NASKHAH = 10, HAD_CARI = (+process.env.PADAN_CARI_MINIT || 3) * 60000;

// Kitab yang sudah diketahui mempunyai PDF sepadan didahulukan supaya had masa tidak dihabiskan pada calon yang ditolak
const TERTIB = ['fathqarib', 'manhaji', 'abisyuja', 'minhaj'];
// Selepas kitab yang diketahui, kitab dengan liputan paling rendah didahulukan supaya setiap larian membantu yang paling memerlukan
const lip = k => cache.kitab[k]?.liputan ?? 0;
for (const b of [...KITAB].sort((x, y) => ((TERTIB.indexOf(x.k) + 1 || 99) - (TERTIB.indexOf(y.k) + 1 || 99)) || lip(x.k) - lip(y.k))) {
  console.log(`\n=== ${b.k} (Shamela ${b.id})`);
  const c = cache.kitab[b.k] ||= { cuba: {} };
  c.cuba ||= {};
  let halaman;
  try { halaman = JSON.parse(await readFile(join(CACHE, 'shamela', `${b.id}.json`), 'utf8')).pages.map(setOf); }
  catch { console.log('  tiada teks Shamela dalam cache; langkau'); continue; }
  const N = halaman.length, seen = new Set();
  // 1. Sambung bacaan penuh naskhah yang telah diterima
  for (const r of naskhah(c)) { if (!masa()) break; await cubaItem(c, r, r.item, halaman, seen); }
  // 2. Tiada naskhah, atau liputan masih rendah: periksa calon baharu satu demi satu
  const liputan = () => Object.keys(petaGabung(c, N)).length / N;
  // Had masa mencari calon baharu bagi setiap kitab, supaya kitab yang mempunyai banyak calon ditolak (cth. Bulugh al-Maram,
  // yang dipetik dalam banyak syarah) tidak menghabiskan masa larian; calon yang telah dicuba diingati (c.cuba)
  const hadKitab = Date.now() + HAD_CARI;
  if (masa() && (!naskhah(c).length || liputan() < LIPUTAN)) {
    const ada = new Set(naskhah(c).map(r => r.item));
    const calon = [...new Set([...(CALON[b.k] || []), ...await carian(b)])].filter(id => !ada.has(id) && !(id in c.cuba));
    console.log(`  liputan ${Math.round(liputan() * 100)}%; ${calon.length} calon baharu`);
    for (const id of calon) {
      if (!masa() || Date.now() > hadKitab || naskhah(c).length >= MAX_NASKHAH) break;
      const utama = !c.item, rec = utama ? c : {};
      if (!utama) (c.tambahan ||= []).push(rec);
      const sebelum = liputan();
      await cubaItem(c, rec, id, halaman, seen);
      if (!rec.item) {
        if (!utama) c.tambahan = c.tambahan.filter(r => r !== rec);
        if (masa()) c.cuba[id] = 0;
        continue;
      }
      // Naskhah tambahan yang tidak menambah liputan (cth. salinan edisi yang sama) dibuang supaya tidak diproses lagi
      if (!utama && rec.fail.every(x => x.siap) && liputan() <= sebelum) { c.tambahan = c.tambahan.filter(r => r !== rec); c.cuba[id] = 0; console.log('    tiada halaman baharu; dibuang'); }
      if (liputan() >= LIPUTAN) break;
    }
  }
  c.peta = petaGabung(c, N);
  c.liputan = Object.keys(c.peta).length / N;
  for (const r of naskhah(c)) await paparan(r, halaman);
  await simpan();
  const items = naskhah(c).map(r => r.item);
  const pct = Math.round(Object.keys(c.peta).length / N * 100);
  console.log(`  hasil: ${items.join(', ') || 'tiada PDF sepadan'}; ${pct}% halaman Shamela dipetakan`);
  const e = EDISI[c.item] || {};
  await summary(`| ${b.name} | ${e.penerbit || '-'} | ${e.edisi || c.judul || '-'} | ${items.length ? items.map(i => 'https://archive.org/details/' + i).join('<br>') : 'tiada padanan'} | ${pct}% |`);
}

await simpan();
await mkdir(OUT, { recursive: true });
const out = Object.fromEntries(Object.entries(cache.kitab).filter(([, c]) => c.item).map(([k, c]) => {
  const ed = r => EDISI[r.item] || { penerbit: r.penerbit || '', edisi: r.judul || '' };
  const rs = naskhah(c), e = ed(c), fail = rs.flatMap(r => r.fail);
  const papar = fail.map(x => x.paparan?.gambar ? { lihat: x.paparan.lihat, gambar: x.paparan.gambar, off: x.paparan.off } : null);
  // Penerbit dan edisi bagi setiap fail (naskhah tambahan mungkin edisi lain)
  const info = rs.length > 1 ? rs.flatMap(r => r.fail.map(() => ({ ...ed(r), sumber: `https://archive.org/details/${r.item}` }))) : null;
  return [k, { penerbit: e.penerbit, edisi: e.edisi, sumber: `https://archive.org/details/${c.item}`, fail: fail.map(x => x.url), peta: c.peta || {}, ...(papar.some(Boolean) ? { paparan: papar } : {}), ...(info ? { info } : {}) }];
}));
await writeFile(join(OUT, 'cetakan.json'), JSON.stringify(out));
for (const [k, c] of Object.entries(out)) console.log(`${k}: ${Object.keys(c.peta).length} halaman dipetakan; contoh ${JSON.stringify(Object.entries(c.peta).slice(0, 10))}`);
