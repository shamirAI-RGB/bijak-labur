// Bandingkan model percuma untuk Tanya AI dengan soalan sebenar, indeks rujukan sebenar dan semakan sumber pelayan.
// Digunakan oleh .github/workflows/banding-tanya.yml (PR yang mengubah skrip ini, dan larian manual sahaja): setiap model
// menggunakan satu permintaan bagi setiap soalan daripada had harian model percuma OpenRouter.
// OPENROUTER_API_KEY=... node worker-fiqh/diag-tanya.mjs [model ...]
import { readFile } from 'node:fs/promises';
import { askKorpus, TANYA } from './src/app.js';
import { search, expand } from './src/rujukan.js';
import { mulaGuna } from './src/guna.js';

const key = process.env.OPENROUTER_API_KEY;
if (!key) { console.log('OPENROUTER_API_KEY tiada'); process.exit(0); }
// Indeks rujukan yang dibina oleh scripts/muat-rujukan.mjs dalam worker-fiqh/aset (sama seperti binding RUJUKAN pelayan)
const ASET = new URL('./aset/', import.meta.url);
const RUJUKAN = { fetch: async req => {
  try { const f = await readFile(new URL(new URL(req.url).pathname.slice(1), ASET)); return new Response(req.method === 'HEAD' ? null : f); }
  catch { return new Response('', { status: 404 }); }
} };
const SOALAN = ['Apakah hukum melabur dalam mata wang kripto seperti Bitcoin?', 'Air apa yang boleh digunakan untuk mengangkat hadas?'];
// Model Tanya AI semasa dan calon lain. Ujian 13 Oktober 2026: Inkling dan Inkling Small ditolak (403, hanya untuk
// "agentic harness"); Gemma 4 31B dan 26B sentiasa dihadkan oleh penyedia hulu (429); Dots3-Note dan Nemotron 3.5
// Lightning menjawab dengan satu sumber sahaja. Ling 3.1 Flash diuji semula selepas cuba semula tanpa response_format.
const CALON = ['inclusionai/ling-3.1-flash'];
const MODEL = process.argv.length > 2 ? process.argv.slice(2) : [...new Set([...TANYA.openrouter.model, ...CALON])];
const AR = /[؀-ۿ]/;
const satu = s => String(s || '').replace(/\s+/g, ' ').slice(0, 300);

for (const q of SOALAN) {
  const docs = await search({ RUJUKAN }, expand(q), 8, q).catch(() => []);
  console.log(`\nSoalan: ${q}\nMuka surat rujukan: ${docs.map(d => d.id).join(', ') || 'tiada (indeks belum dibina)'}`);
  for (const m of MODEL) {
    const env = mulaGuna({ OPENROUTER_API_KEY: key, TANYA_AI: 'openrouter', TANYA_OPENROUTER_MODEL: m, RUJUKAN }, '/tanya');
    const t = Date.now();
    try {
      const r = await askKorpus(env, q, docs);
      const g = env.GUNA.rekod[0] || {}, sah = r.sumber.filter(s => s.disahkan), arab = sah.filter(s => AR.test(s.petikan));
      console.log(`- ${m}: ${((Date.now() - t) / 1000).toFixed(1)} s, token masuk ${g.masuk} keluar ${g.keluar}, status ${r.status}, sumber ${r.sumber.length} (petikan disahkan ${sah.length}, petikan Arab dengan maksud ${arab.length})`);
      console.log(`  ringkasan: ${satu(r.ringkasan)}`);
      if (r.huraian[0]) console.log(`  huraian: ${satu(r.huraian[0])}`);
      if (arab[0]) console.log(`  petikan: ${satu(arab[0].petikan)}\n  maksud: ${satu(arab[0].maksud)}`);
    } catch (e) { console.log(`- ${m}: GAGAL ${e.status} ${satu(e.message)}`); }
  }
}
