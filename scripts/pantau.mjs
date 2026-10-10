// Pemantau SiswaCap: semak laman, pelayan dan perkhidmatan luar. Dijalankan setiap jam oleh .github/workflows/pantau.yml
// node scripts/pantau.mjs  -> laporan Markdown di stdout (dan pantau.md); kod keluar 1 jika ada kerosakan kritikal
//
// Lima jenis pemantauan:
//   1. Kesihatan (health): setiap halaman, aset dan pelayan menjawab dengan betul
//   2. Uptime: sejarah 30 hari dalam pantau-sejarah.json (disimpan antara larian oleh actions/cache), peratus 24 jam/7/30 hari
//   3. Prestasi: masa respons setiap semakan, amaran jika melebihi had, dan p95 7 hari
//   4. Keselamatan: pelayan menolak asal (origin) asing, CSP ketat, HTTPS, fail sulit tidak terdedah, pengepala keselamatan
//   5. Penggunaan: permintaan, ralat dan masa CPU setiap pelayan Workers 24 jam lalu (Cloudflare GraphQL, jika token diberi)
import { writeFileSync, readFileSync } from 'node:fs';
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
      const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), ...opt, headers: { 'user-agent': 'SiswaCap-pantau/1.0', ...(opt.headers || {}) } });
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
  if (!/SiswaCap/.test(html)) throw new Error('kandungan tidak dijangka');
  return `${Math.round(html.length / 1024)} KB`;
});
for (const p of ['tentang.html', 'peta.html', 'privacy.html', 'terma.html', 'padam-data.html', 'sitemap.xml', 'robots.txt', 'manifest.webmanifest', 'sw.js'])
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

/* ---------- Pelayan SiswaCap ---------- */
const H = { headers: { origin: ORIGIN } };
await check('kritikal', 'Pelayan Premium, akaun, suara', async () => {
  const d = await json(PREMIUM + '/', H);
  const off = ['ok', 'tts', 'akaun'].filter(k => !d[k]);
  if (off.length) throw new Error(`tidak aktif: ${off.join(', ')}`);
});
await check('amaran', 'Pusat Kawalan (pelawat, token, Telegram)', async () => {
  const d = await json('https://pusat.bijaklabur.my/', H);
  if (!d.ok) throw new Error('tidak aktif');
  return `agen: ${d.agen}${d.telegram ? ', Telegram aktif' : ', Telegram belum'}${d.catat ? '' : ', PUSAT_SECRET belum'}`;
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

/* ---------- Keselamatan ---------- */
// Pelayan mesti menolak permintaan daripada laman lain (elak orang lain menggunakan kuota AI dan data pengguna)
const ASING = { origin: 'https://contoh-jahat.example', 'content-type': 'application/json' };
for (const [nama, url, body] of [
  ['Tanya AI menolak asal asing', 'https://fiqh.bijaklabur.my/tanya', { q: 'ujian pemantau keselamatan' }],
  ['Semak Kertas menolak asal asing', 'https://fiqh.bijaklabur.my/semak', { text: 'ujian' }]
]) await check('kritikal', `Keselamatan: ${nama}`, async () => {
  const r = await get(url, { method: 'POST', headers: ASING, body: JSON.stringify(body) });
  if (r.status !== 403) throw new Error(`dijangka 403, dapat ${r.status}`);
  if (r.headers.get('access-control-allow-origin')) throw new Error('CORS membenarkan asal asing');
  return '403';
});
await check('kritikal', 'Keselamatan: CSP ketat pada laman', async () => {
  const csp = (html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/) || [])[1];
  if (!csp) throw new Error('tiada CSP');
  const script = (csp.match(/script-src([^;]*)/) || [])[1] || '';
  if (/'unsafe-inline'|'unsafe-eval'|\s\*(\s|$)/.test(script)) throw new Error(`script-src longgar: ${script.trim()}`);
  // Skrip sebaris (selain data JSON-LD untuk enjin carian) disekat oleh CSP; jika ada, ia tanda kod yang salah
  if (/<script(?![^>]*\b(src=|type="application\/ld\+json"))[^>]*>\s*\S/.test(html)) throw new Error('skrip sebaris dalam index.html');
  if (/\son(click|load|error)=/i.test(html)) throw new Error('pengendali acara sebaris dalam index.html');
  return 'script-src tanpa unsafe';
});
await check('amaran', 'Keselamatan: HTTP dilencongkan ke HTTPS', async () => {
  const r = await get(SITE.replace('https://', 'http://') + '/', { redirect: 'manual' });
  const loc = r.headers.get('location') || '';
  if (!(r.status >= 300 && r.status < 400 && loc.startsWith('https://'))) throw new Error(`HTTP ${r.status} ${loc}`);
  return `${r.status}`;
});
await check('kritikal', 'Keselamatan: fail sulit tidak terdedah', async () => {
  const bocor = [];
  for (const f of ['.env', '.git/config', 'worker/.dev.vars', 'worker-fiqh/.dev.vars', 'android/keystore.jks', 'node_modules/.package-lock.json']) {
    const r = await get(`${SITE}/${f}`).catch(() => null);
    if (r && r.ok && !/<html/i.test((await r.text()).slice(0, 300))) bocor.push(f);
  }
  if (bocor.length) throw new Error(`terdedah: ${bocor.join(', ')}`);
  return 'tiada';
});
await check('amaran', 'Keselamatan: pengepala pelayan', async () => {
  const r = await get('https://fiqh.bijaklabur.my/halaman/jakim/1.jpg');
  if (r.ok && r.headers.get('x-content-type-options') !== 'nosniff') throw new Error('gambar tanpa nosniff');
  return r.ok ? 'nosniff' : `HTTP ${r.status}`;
});

/* ---------- Prestasi ---------- */
// Had masa respons: laman statik (GitHub Pages) dan pelayan (Workers). Melebihi had = amaran (bukan kritikal).
const HAD = n => /^(Laman|\/|Aset)/.test(n) ? 3000 : /^Keselamatan/.test(n) ? 8000 : 5000;
for (const r of results.filter(r => r.ok && r.tahap === 'kritikal' && r.ms > HAD(r.nama)))
  results.push({ tahap: 'amaran', nama: `Prestasi: ${r.nama} lambat`, ok: false, nota: `${r.ms} ms (had ${HAD(r.nama)} ms)`, ms: r.ms });

/* ---------- Penggunaan dan ralat pelayan (Cloudflare) ---------- */
let guna = '';
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN, CF_ACC = process.env.CLOUDFLARE_ACCOUNT_ID;
if (CF_TOKEN && CF_ACC) await check('amaran', 'Penggunaan pelayan (Cloudflare, 24 jam)', async () => {
  const until = new Date(), since = new Date(until - 864e5);
  const query = `query($a:String!,$s:Time!,$u:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsAdaptive(limit:200,filter:{datetime_geq:$s,datetime_leq:$u}){sum{requests errors subrequests}quantiles{cpuTimeP50 cpuTimeP99}dimensions{scriptName status}}}}}`;
  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST', headers: { authorization: `Bearer ${CF_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: { a: CF_ACC, s: since.toISOString(), u: until.toISOString() } }), signal: AbortSignal.timeout(20000)
  });
  const d = await r.json();
  if (d.errors && d.errors.length) throw new Error(`GraphQL: ${String(d.errors[0].message).slice(0, 120)} (token perlu kebenaran "Account Analytics: Read")`);
  const rows = d.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];
  const by = {};
  for (const x of rows) {
    const s = by[x.dimensions.scriptName] ||= { req: 0, err: 0, sub: 0, cpu50: 0, cpu99: 0 };
    s.req += x.sum.requests; s.err += x.sum.errors; s.sub += x.sum.subrequests;
    s.cpu50 = Math.max(s.cpu50, x.quantiles?.cpuTimeP50 || 0); s.cpu99 = Math.max(s.cpu99, x.quantiles?.cpuTimeP99 || 0);
  }
  const list = Object.entries(by).sort((a, b) => b[1].req - a[1].req);
  guna = ['', '### Penggunaan pelayan (24 jam lalu)', '', '| Pelayan | Permintaan | Ralat | Kadar ralat | CPU p50 / p99 |', '|---|---|---|---|---|',
    ...list.map(([n, s]) => `| ${n} | ${s.req.toLocaleString('ms-MY')} | ${s.err} | ${s.req ? (s.err / s.req * 100).toFixed(1) : 0}% | ${(s.cpu50 / 1000).toFixed(1)} / ${(s.cpu99 / 1000).toFixed(1)} ms |`)].join('\n');
  // Kadar ralat tinggi pada pelayan yang benar-benar digunakan
  for (const [n, s] of list) if (s.req >= 50 && s.err / s.req > 0.05)
    results.push({ tahap: 'amaran', nama: `Ralat pelayan ${n}`, ok: false, nota: `${s.err}/${s.req} permintaan gagal (${(s.err / s.req * 100).toFixed(1)}%)`, ms: 0 });
  return `${list.reduce((t, [, s]) => t + s.req, 0).toLocaleString('ms-MY')} permintaan, ${list.length} pelayan`;
});

/* ---------- Uptime: sejarah 30 hari ---------- */
const SEJARAH = process.env.PANTAU_SEJARAH || 'pantau-sejarah.json';
let sejarah = [];
try { sejarah = JSON.parse(readFileSync(SEJARAH, 'utf8')); } catch {}
const kini = Date.now();
sejarah = sejarah.filter(x => kini - x.t < 30 * 864e5);
sejarah.push({ t: kini, r: Object.fromEntries(results.filter(r => r.tahap === 'kritikal' && !r.nama.startsWith('Prestasi')).map(r => [r.nama, [r.ok ? 1 : 0, r.ms]])) });
writeFileSync(SEJARAH, JSON.stringify(sejarah));
const peratus = (nama, hari) => {
  const v = sejarah.filter(x => kini - x.t < hari * 864e5 && x.r[nama]).map(x => x.r[nama][0]);
  return v.length ? `${(v.reduce((a, b) => a + b, 0) / v.length * 100).toFixed(v.length > 30 ? 2 : 1)}%` : '-';
};
const p95 = nama => {
  const v = sejarah.filter(x => kini - x.t < 7 * 864e5 && x.r[nama]?.[0]).map(x => x.r[nama][1]).sort((a, b) => a - b);
  return v.length ? `${v[Math.min(v.length - 1, Math.floor(v.length * 0.95))]} ms` : '-';
};
const UTAMA = ['Laman utama', 'Pelayan Premium, akaun, suara', 'Tanya AI / Semak / Kalori (fiqh)', 'Jadual UiTM', 'Kedai nota'];
const uptime = ['', `### Uptime dan prestasi (${sejarah.length} semakan dalam rekod, sehingga 30 hari)`, '',
  '| Perkhidmatan | 24 jam | 7 hari | 30 hari | Masa respons p95 (7 hari) |', '|---|---|---|---|---|',
  ...UTAMA.map(n => `| ${n} | ${peratus(n, 1)} | ${peratus(n, 7)} | ${peratus(n, 30)} | ${p95(n)} |`)].join('\n');

/* ---------- Laporan ---------- */
const bad = results.filter(r => !r.ok), crit = bad.filter(r => r.tahap === 'kritikal');
const row = r => `| ${r.ok ? '✅' : r.tahap === 'kritikal' ? '🔴' : '🟠'} | ${r.nama} | ${r.ok ? r.nota : `**${r.nota}**`} | ${r.ms} ms |`;
const md = [
  `## Pemantau SiswaCap: ${crit.length ? `🔴 ${crit.length} kerosakan kritikal` : bad.length ? `🟠 ${bad.length} amaran` : '✅ semua sihat'}`,
  `Disemak ${new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })} (waktu Malaysia).`,
  '', '| | Semakan | Keputusan | Masa |', '|---|---|---|---|',
  ...[...bad, ...results.filter(r => r.ok)].map(row),
  uptime, guna
].join('\n');
console.log(md);
writeFileSync('pantau.md', md + '\n');
writeFileSync('pantau.json', JSON.stringify({ kritikal: crit.map(r => r.nama), amaran: bad.filter(r => r.tahap === 'amaran').map(r => r.nama) }));
process.exitCode = crit.length ? 1 : 0;
