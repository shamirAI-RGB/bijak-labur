/*
 * Jana gambar JPEG bagi setiap muka surat dokumen rasmi moden (FiqhData.MODEN), supaya Tanya AI boleh memaparkan
 * muka surat yang dipetik sahaja (beberapa puluh KB) dan pengguna tidak perlu memuat turun PDF penuh (beberapa MB).
 *
 * Hasil: aset/rujukan/g/<k>/<n>.jpg dan aset/rujukan/gambar.json { k: bilangan muka surat }.
 * Gambar disimpan dalam .cache/gambar/<k>-<cap url>/ (actions/cache), jadi PDF hanya dirender sekali.
 * Memerlukan poppler-utils (pdftoppm). Dokumen yang gagal dilangkau; Tanya AI kemudian memaparkan teks muka surat.
 */
import { mkdir, writeFile, readFile, readdir, copyFile, rm, appendFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { MODEN } from '../src/rujukan.js';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), OUT = join(ROOT, 'aset', 'rujukan'), CACHE = join(ROOT, '.cache', 'gambar');
const UA = 'Mozilla/5.0 (SiswaCap rujukan; +https://bijaklabur.my)';
const summary = s => process.env.GITHUB_STEP_SUMMARY ? appendFile(process.env.GITHUB_STEP_SUMMARY, s + '\n') : null;

async function download(url, file) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(120000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = new Uint8Array(await r.arrayBuffer());
      if (String.fromCharCode(...buf.slice(0, 5)) !== '%PDF-') throw new Error('bukan PDF');
      await writeFile(file, buf);
      return;
    } catch (e) {
      console.log(`  cubaan ${i + 1}: ${e.message}`);
      if (i === 2) throw e;
      await new Promise(z => setTimeout(z, 3000 * (i + 1)));
    }
  }
}

const meta = {};
await summary('### Gambar muka surat dokumen moden\n\n| Dokumen | Muka surat |\n|---|---|');
for (const d of MODEN) {
  const dir = join(CACHE, `${d.k}-${createHash('sha1').update(d.url).digest('hex').slice(0, 10)}`);
  console.log(`${d.k}: ${d.url}`);
  try {
    let files = (await readdir(dir).catch(() => [])).filter(f => /^p-\d+\.jpg$/.test(f));
    if (!files.length) {
      const pdf = join(tmpdir(), `${d.k}.pdf`);
      await download(d.url, pdf);
      await mkdir(dir, { recursive: true });
      // Lebar 900 piksel, kualiti sederhana: cukup jelas untuk dibaca di telefon, kira-kira 60-120 KB setiap muka surat
      await run('pdftoppm', ['-jpeg', '-jpegopt', 'quality=60,progressive=y', '-scale-to-x', '900', '-scale-to-y', '-1', pdf, join(dir, 'p')], { maxBuffer: 1 << 26 });
      await rm(pdf, { force: true });
      files = (await readdir(dir)).filter(f => /^p-\d+\.jpg$/.test(f));
    } else console.log('  daripada cache');
    await mkdir(join(OUT, 'g', d.k), { recursive: true });
    let n = 0;
    for (const f of files) {
      const i = +f.match(/\d+/)[0];
      await copyFile(join(dir, f), join(OUT, 'g', d.k, `${i}.jpg`));
      n = Math.max(n, i);
    }
    meta[d.k] = n;
    console.log(`  ${files.length} gambar`);
    await summary(`| ${d.name} | ${files.length} |`);
  } catch (e) {
    console.log(`  GAGAL: ${e.message}`);
    await summary(`| ${d.name} | gagal: ${e.message} |`);
  }
}
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'gambar.json'), JSON.stringify(meta));
console.log('gambar.json', JSON.stringify(meta));
