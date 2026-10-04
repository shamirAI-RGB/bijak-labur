// Pemantau Bijak Labur: semak laman, pelayan dan perkhidmatan luar. Dijalankan setiap jam oleh .github/workflows/pantau.yml
// node scripts/pantau.mjs  -> laporan Markdown di stdout (dan pantau.md); kod keluar 1 jika ada kerosakan kritikal
import { writeFileSync } from 'node:fs';
import tls from 'node:tls';

const SITE = process.env.SITE || 'https://bijaklabur.my';
const ORIGIN = 'https://bijaklabur.my';
const PREMIUM = 'https://bijak-labur-premium.khanz-amir.workers.dev';
const results = [];   // { tahap: 'kritikal' | 'amaran', nama, ok, nota, ms }

async function check(tahap, nama, fn) {
  const t = Date.now();
  try {
    const nota = await fn();
    results.push({ tahap, nama, ok: true, nota: nota || '', ms: Date.now() - t });
  } catch (e) {
    results.push({ tahap, nama, ok: false, nota: String(e && e.message || e).slice(0, 200), ms: Date.now() - t });
  }
}

async function get(url, opt = {}) {
  let last;
  for (let i = 0; i < 2; i++) {   // satu cubaan semula untuk gangguan rangkaian sementara
    try {
      const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), ...opt, headers: { 'user-agent': 'BijakLabur-pantau/1.0', ...(opt.headers || {}) } });
      if (r.status >= 500 && i === 0) { last = new Error(`HTTP ${r.status}`); await new Promise(z => setTimeout(z, 3000)); continue; }
      return r;
    } catch (e) { last = e; await new Promise(z => setTimeout(z, 3000)); }
  }
  throw last;
}
const ok = async (url, opt) => { const r = await get(url, opt); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r; };
const json = async (url, opt) => (await ok(url, opt)).json();

/* ---------- Laman ---------- */
let html = '';
await check('kritikal', 'Laman utama', async () => {
  html = await (await ok(SITE + '/')).text();
  if (!/Bijak Labur/.test(html)) throw new Error('kandungan tidak dijangka');
  return `${Math.round(html.length / 1024)} KB`;
});
for (const p of ['tentang.html', 'privacy.html', 'terma.html', 'padam-data.html', 'sitemap.xml', 'robots.txt', 'manifest.webmanifest', 'sw.js'])
  await check('kritikal', `/${p}`, async () => { await ok(`${SITE}/${p}`); });

// Setiap skrip, gaya dan ikon yang dirujuk oleh index.html mesti wujud (tangkap fail tertinggal semasa pasang)
await check('kritikal', 'Aset index.html', async () => {
  const refs = [...new Set([...html.matchAll(/(?:src|href)="((?:js|css|icons|images|fonts)\/[^"#?]+)/g)].map(m => m[1]))];
  if (!refs.length) throw new Error('tiada aset dijumpai');
  const bad = [];
  await Promise.all(refs.map(async f => { const r = await get(`${SITE}/${f}`).catch(() => null); if (!r || !r.ok) bad.push(`${f} (${r ? r.status : 'ralat'})`); }));
  if (bad.length) throw new Error(`hilang: ${bad.join(', ')}`);
  return `${refs.length} fail`;
});

await check('amaran', 'Sijil SSL', () => new Promise((res, rej) => {
  const s = tls.connect(443, new URL(SITE).hostname, { servername: new URL(SITE).hostname, timeout: 15000 }, () => {
    const days = Math.floor((new Date(s.getPeerCertificate().valid_to) - Date.now()) / 864e5);
    s.end();
    days < 14 ? rej(new Error(`tamat dalam ${days} hari`)) : res(`${days} hari lagi`);
  });
  s.on('error', rej); s.on('timeout', () => { s.destroy(); rej(new Error('tamat masa')); });
}));

/* ---------- Pelayan Bijak Labur ---------- */
const H = { headers: { origin: ORIGIN } };
await check('kritikal', 'Pelayan Premium, akaun, suara', async () => {
  const d = await json(PREMIUM + '/', H);
  const off = ['ok', 'tts', 'akaun'].filter(k => !d[k]);
  if (off.length) throw new Error(`tidak aktif: ${off.join(', ')}`);
});
await check('kritikal', 'Tanya AI / Semak / Kalori (fiqh)', async () => {
  const d = await json('https://fiqh.bijaklabur.my/', H);
  if (!d.ok || !d.ai) throw new Error('AI tidak aktif');
  return d.penyedia;
});
await check('kritikal', 'Jadual UiTM', async () => {
  const d = await json('https://jadual.bijaklabur.my/session', H);
  if (!d.code) throw new Error('tiada sesi');
  return d.label || d.code;
});
await check('kritikal', 'Kedai nota', async () => {
  const d = await json('https://nota.bijaklabur.my/notes', H);
  return `${(d.notes || []).length} nota`;
});

/* ---------- Perkhidmatan luar (amaran: bukan kawalan kita, tetapi ciri berkaitan terjejas) ---------- */
const today = new Date().toISOString().slice(0, 10).split('-').reverse().join('-');
const ext = [
  ['Waktu solat Malaysia (waktusolat.app)', 'https://api.waktusolat.app/v2/solat/WLY01'],
  ['Waktu solat dunia (Aladhan)', `https://api.aladhan.com/v1/timings/${today}?latitude=51.5&longitude=-0.12&method=3`],
  ['Carian bandar (Open-Meteo)', 'https://geocoding-api.open-meteo.com/v1/search?name=London&count=1'],
  ['Al-Quran (alquran.cloud)', 'https://api.alquran.cloud/v1/ayah/1:1'],
  ['Harga kripto (Binance)', 'https://data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDT'],
  ['Harga kripto (CoinGecko)', 'https://api.coingecko.com/api/v3/ping'],
  ['Kadar tukaran (open.er-api)', 'https://open.er-api.com/v6/latest/USD'],
  ['Tatabahasa (LanguageTool)', 'https://api.languagetool.org/v2/languages'],
  ['Rujukan (Crossref)', 'https://api.crossref.org/works?rows=1'],
  ['Rujukan (OpenAlex)', 'https://api.openalex.org/works?per-page=1']
];
await Promise.all(ext.map(([n, u]) => check('amaran', n, async () => { await ok(u); })));

/* ---------- Laporan ---------- */
const bad = results.filter(r => !r.ok), crit = bad.filter(r => r.tahap === 'kritikal');
const row = r => `| ${r.ok ? '✅' : r.tahap === 'kritikal' ? '🔴' : '🟠'} | ${r.nama} | ${r.ok ? r.nota : `**${r.nota}**`} | ${r.ms} ms |`;
const md = [
  `## Pemantau Bijak Labur: ${crit.length ? `🔴 ${crit.length} kerosakan kritikal` : bad.length ? `🟠 ${bad.length} amaran` : '✅ semua sihat'}`,
  `Disemak ${new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })} (waktu Malaysia).`,
  '', '| | Semakan | Keputusan | Masa |', '|---|---|---|---|',
  ...[...bad, ...results.filter(r => r.ok)].map(row)
].join('\n');
console.log(md);
writeFileSync('pantau.md', md + '\n');
writeFileSync('pantau.json', JSON.stringify({ kritikal: crit.map(r => r.nama), amaran: bad.filter(r => r.tahap === 'amaran').map(r => r.nama) }));
process.exitCode = crit.length ? 1 : 0;
