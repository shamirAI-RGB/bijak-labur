/*
 * Muat turun PDF rujukan rasmi moden (FiqhData.MODEN), ekstrak teks setiap muka surat,
 * dan bina indeks carian ke dalam folder aset/ untuk worker. Dijalankan dalam GitHub Actions
 * sebelum pemasangan; teks PDF tidak disimpan dalam repo.
 * Dokumen yang gagal dimuat turun dilangkau supaya pemasangan tetap berjalan.
 */
import { mkdir, writeFile, rm, appendFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { MODEN, buildIndex } from '../src/rujukan.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'aset');
const summary = s => process.env.GITHUB_STEP_SUMMARY ? appendFile(process.env.GITHUB_STEP_SUMMARY, s + '\n') : null;

async function download(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (BijakLabur rujukan; +https://bijaklabur.my)' }, signal: AbortSignal.timeout(120000) });
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

await rm(OUT, { recursive: true, force: true });
const files = buildIndex(docs);
let bytes = 0;
for (const [path, content] of files) {
  const f = join(OUT, path);
  await mkdir(dirname(f), { recursive: true });
  await writeFile(f, content);
  bytes += Buffer.byteLength(content);
}
console.log(`Aset ditulis: ${files.size} fail, ${(bytes / 1048576).toFixed(1)} MB`);
const ok = Object.keys(docs).length;
if (!ok) console.log('Tiada dokumen berjaya dimuat; Tanya AI berjalan tanpa rujukan PDF.');
