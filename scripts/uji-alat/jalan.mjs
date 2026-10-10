/* Jalankan ujian hujung ke hujung bagi setiap alat SiswaCap.
   node scripts/uji-alat/jalan.mjs                 # semua kumpulan
   node scripts/uji-alat/jalan.mjs pro alat        # kumpulan tertentu (nama fail kes-<nama>.mjs)
   UJI_JSON=hasil.json simpan keputusan dalam fail JSON; UJI_GAMBAR=folder simpan tangkapan skrin kes yang gagal. */
import { appendFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { jalan } from './harness.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const pilih = process.argv.slice(2);
const fail = readdirSync(DIR).filter(f => /^kes-.+\.mjs$/.test(f)).sort()
  .filter(f => !pilih.length || pilih.includes(f.slice(4, -4)));
if (!fail.length) { console.error('Tiada fail kes sepadan:', pilih.join(' ')); process.exit(2); }

if (process.env.UJI_GAMBAR) mkdirSync(process.env.UJI_GAMBAR, { recursive: true });
const t0 = Date.now();
// Setiap fail kes dijalankan dengan data contoh (fixture) dan binding worker-fiqh (env) miliknya sahaja
const hasil = [];
for (const f of fail) {
  const m = await import(pathToFileURL(join(DIR, f)));
  hasil.push(...await jalan(m.default, { fixture: m.fixture || [], env: m.env || {} }));
}
const gagal = hasil.filter(r => !r.lulus);
console.log(`\n${hasil.length - gagal.length}/${hasil.length} lulus dalam ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (gagal.length) console.log('Gagal:\n' + gagal.map(r => `  - ${r.kumpulan} / ${r.nama}: ${r.ralat || r.pageerror.join(' | ')}`).join('\n'));
if (process.env.UJI_JSON) writeFileSync(process.env.UJI_JSON, JSON.stringify(hasil, null, 2));
// Ringkasan dalam halaman larian GitHub Actions
if (process.env.GITHUB_STEP_SUMMARY) {
  const sel = x => String(x).replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 300);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Ujian alat: ${pilih.join(', ') || 'semua'} (${hasil.length - gagal.length}/${hasil.length} lulus)\n\n| | Kumpulan | Ujian | Masa | Catatan |\n|---|---|---|---|---|\n`
    + hasil.map(r => `| ${r.lulus ? '✅' : '❌'} | ${sel(r.kumpulan)} | ${sel(r.nama)} | ${(r.ms / 1000).toFixed(1)} s | ${sel(r.ralat || r.pageerror.join(' / '))} |`).join('\n') + '\n\n');
}
process.exit(gagal.length ? 1 : 0);
