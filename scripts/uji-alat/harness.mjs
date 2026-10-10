/* SiswaCap: kerangka ujian hujung ke hujung bagi setiap alat di laman (Playwright, tanpa rangkaian luar).
   - Laman dihidangkan secara tempatan; setiap permintaan ke luar dipintas.
   - Pelayan AI (fiqh.bijaklabur.my) dijalankan dalam proses ini menggunakan kod worker-fiqh sebenar; hanya model AI
     digantikan dengan penjana JSON yang mengikut skema jawapan, supaya kontrak app <-> pelayan turut diuji.
   - API luar lain dijawab dengan data contoh (FIXTURE) atau 503, supaya alat diuji ketika luar talian juga.
   Jalankan: node scripts/uji-alat/jalan.mjs [nama-kumpulan ...] */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);

/* ---------- Pelayar ---------- */
function playwright() {
  for (const p of ['playwright', 'playwright-core']) { try { return require(p); } catch {} }
  throw new Error('Playwright tidak dijumpai. Pasang dengan: npm i --no-save playwright-core (atau tetapkan NODE_PATH ke folder global).');
}
function chromePath() {
  if (process.env.CHROME) return process.env.CHROME;
  const pw = '/opt/pw-browsers';
  if (existsSync(pw)) {
    const d = readdirSync(pw).find(x => /^chromium-\d+$/.test(x));
    if (d && existsSync(join(pw, d, 'chrome-linux', 'chrome'))) return join(pw, d, 'chrome-linux', 'chrome');
  }
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) if (existsSync(p)) return p;
  return undefined;
}

/* ---------- Pelayan fail statik ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };
export function pelayanStatik() {
  const srv = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = normalize(join(ROOT, p));
      if (!f.startsWith(ROOT) || /node_modules|\.git\//.test(f)) throw new Error('luar');
      const s = await stat(f);
      if (!s.isFile()) throw new Error('bukan fail');
      res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(await readFile(f));
    } catch { res.writeHead(404); res.end('Tidak dijumpai'); }
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${srv.address().port}`, tutup: () => srv.close() })));
}

/* ---------- Model AI palsu: JSON yang mengikut skema jawapan ----------
   Teks diambil daripada ayat dalam bahan pengguna supaya semakan petikan pelayan (petikan mesti wujud dalam teks) lulus. */
function penjana(body) {
  const parts = (body.contents || []).flatMap(c => c.parts || []).map(p => p.text || '').join('\n');
  const ayat = parts.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 25 && s.length < 400);
  let i = 0;
  const teks = () => ayat.length ? ayat[i++ % ayat.length] : 'Contoh jawapan ujian yang cukup panjang untuk dipaparkan.';
  const buat = (s, kunci = '') => {
    if (!s) return null;
    const t = String(s.type || '').toUpperCase();
    if (s.enum) return s.enum[0];
    if (t === 'OBJECT') return Object.fromEntries(Object.entries(s.properties || {}).map(([k, v]) => [k, buat(v, k)]));
    if (t === 'ARRAY') { const n = Math.max(s.minItems || 0, Math.min(s.maxItems || 3, 3)); return Array.from({ length: n }, () => buat(s.items, kunci)); }
    if (t === 'INTEGER') return Math.max(s.minimum ?? 0, Math.min(s.maximum ?? 7, 7));
    if (t === 'NUMBER') return Math.max(s.minimum ?? 0, Math.min(s.maximum ?? 7.5, 7.5));
    if (t === 'BOOLEAN') return true;
    if (/url|pautan|doi/i.test(kunci)) return '';
    return teks();
  };
  const g = body.generationConfig || {};
  return g.responseSchema ? buat(g.responseSchema) : { teks: teks() };
}
export const panggilanAI = [];
// Gambar PNG 8x8 (biru) untuk Studio Gambar: pengganti FLUX Workers AI
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNQTX6NFTEMLQkADGRcwcht3uAAAAAASUVORK5CYII=';
async function workerFiqh(origin, tambahan = {}) {
  const { default: worker } = await import(join(ROOT, 'worker-fiqh', 'src', 'app.js'));
  const asal = globalThis.fetch;
  // Hanya panggilan ke model AI dipintas; selebihnya (jika ada) ditolak supaya tiada rangkaian sebenar digunakan
  globalThis.fetch = async (u, init = {}) => {
    const url = String(u && u.url || u);
    if (url.startsWith('https://generativelanguage.googleapis.com/')) {
      const b = JSON.parse(init.body || '{}');
      panggilanAI.push(url);
      return new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(penjana(b)) }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10 } }), { headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 503 });
  };
  const AI = { run: async model => /flux/i.test(model) ? { image: PNG } : { response: '{}' } };
  const env = { GEMINI_API_KEY: 'uji', ALLOWED_ORIGINS: origin, AI, ...tambahan };
  return { fetch: req => worker.fetch(req, env, { waitUntil() {} }), pulih: () => { globalThis.fetch = asal; } };
}

/* ---------- Data contoh API luar ---------- */
const hari = n => { const d = new Date(Date.now() - n * 864e5); return d; };
const klines = n => Array.from({ length: n }, (_, k) => { const t = hari(n - k).getTime(), p = 30000 + k * 120; return [t, String(p), String(p * 1.02), String(p * 0.98), String(p * 1.01), '100', t + 864e5 - 1, '1', 1, '1', '1', '0']; });
export const FIXTURE = [
  [/^https:\/\/open\.er-api\.com\//, () => ({ result: 'success', rates: { MYR: 4.2, USD: 1 } })],
  [/^https:\/\/data-api\.binance\.vision\/api\/v3\/klines/, () => klines(120)],
  [/^https:\/\/data-api\.binance\.vision\/api\/v3\/ticker\/24hr/, u => {
    const syms = (new URL(u).searchParams.get('symbols') || '["BTCUSDT"]').match(/[A-Z]+/g) || ['BTCUSDT'];
    const one = s => ({ symbol: s, lastPrice: '65000.00', priceChangePercent: '1.25', highPrice: '66000', lowPrice: '64000', volume: '1000', quoteVolume: '65000000', openPrice: '64200' });
    return new URL(u).searchParams.has('symbol') ? one(new URL(u).searchParams.get('symbol')) : syms.map(one);
  }],
  [/^https:\/\/data-api\.binance\.vision\/api\/v3\/ticker\/price/, () => [{ symbol: 'BTCUSDT', price: '65000.00' }, { symbol: 'ETHUSDT', price: '3200.00' }]],
  [/^https:\/\/data-api\.binance\.vision\/api\/v3\/depth/, () => ({ lastUpdateId: 1, bids: Array.from({ length: 20 }, (_, i) => [String(65000 - i * 5), '0.5']), asks: Array.from({ length: 20 }, (_, i) => [String(65005 + i * 5), '0.4']) })],
  [/^https:\/\/api\.crossref\.org\/works\/10\./, () => ({ message: { DOI: '10.1000/uji.1', title: ['Kajian ujian pelaburan pelajar'], author: [{ given: 'Ahmad', family: 'Ali' }], issued: { 'date-parts': [[2023]] }, 'container-title': ['Jurnal Ujian'], volume: '5', issue: '2', page: '10-20', type: 'journal-article', publisher: 'Penerbit Ujian' } })],
  [/^https:\/\/api\.crossref\.org\/works\?/, () => ({ message: { items: [{ DOI: '10.1000/uji.1', title: ['Kajian ujian pelaburan pelajar'], author: [{ given: 'Ahmad', family: 'Ali' }], issued: { 'date-parts': [[2023]] }, 'container-title': ['Jurnal Ujian'], type: 'journal-article' }] } })]
];

/* ---------- Halaman dengan pemintasan rangkaian dan pengumpulan ralat ---------- */
export async function mula({ fixture = [], env = {} } = {}) {
  const web = await pelayanStatik();
  const ai = await workerFiqh(web.url, env);
  const { chromium } = playwright();
  const browser = await chromium.launch({ executablePath: chromePath() });
  const semua = [...fixture, ...FIXTURE];
  async function halaman({ lebar = 390, tinggi = 844, premium = true, gelap = false, storan = {} } = {}) {
    const ctx = await browser.newContext({ viewport: { width: lebar, height: tinggi }, colorScheme: gelap ? 'dark' : 'light', serviceWorkers: 'block',
      permissions: ['clipboard-read', 'clipboard-write'], locale: 'ms-MY', timezoneId: 'Asia/Kuala_Lumpur' });
    const page = await ctx.newPage();
    page.ralat = []; page.tindanan = []; page.konsol = []; page.luar = [];
    page.on('pageerror', e => {
      const st = String(e.stack || '');
      // Kesan sampingan cangkuk Premium ujian (pelan tanpa lesen), bukan ralat sebenar
      if (premium && /statusHTML/.test(st)) return;
      // Ralat tanpa tindanan (cth. DOMException daripada janji yang ditolak) dilaporkan dengan nama dan mesejnya
      page.ralat.push(e.message || e.name || String(e)); page.tindanan.push(st.trim() ? st.split('\n').slice(0, 4).map(x => x.trim()).join(' <- ') : `${e.name || 'Error'}: ${e.message}`);
    });
    page.on('console', m => { if (m.type() === 'error') page.konsol.push(m.text()); });
    await ctx.addInitScript(([st, prem]) => {
      try { for (const [k, v] of Object.entries(st)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch {}
      // Rekod setiap toast (hanya kelihatan beberapa saat) supaya semakan toast tidak bergantung pada kelajuan mesin
      window.__toast = []; window.__toastSesi = Math.random();
      new MutationObserver(ms => ms.forEach(m => m.target === document.body && m.addedNodes.forEach(n => {
        if (n.classList && n.classList.contains('toast')) window.__toast.push(n.textContent || '');
      }))).observe(document, { childList: true, subtree: true });
      // Premium dibuka untuk ujian alat Premium (lesen sebenar ditandatangani pelayan dan tidak boleh dijana di sini)
      if (prem) {
        // Premium diisytihar dengan const (bukan window.Premium), jadi dicapai melalui nama global
        const buka = () => { const P = typeof Premium !== 'undefined' ? Premium : null; if (P && Object.getOwnPropertyDescriptor(P, 'plan')?.configurable) Object.defineProperty(P, 'plan', { get: () => 'lengkap', configurable: true }); };
        document.addEventListener('DOMContentLoaded', () => { buka(); document.dispatchEvent(new Event('premiumchange')); });
      }
    }, [storan, premium]);
    // WebSocket (harga langsung Binance) tidak melalui route: ditutup supaya tiada rangkaian sebenar, seperti luar talian
    if (ctx.routeWebSocket) await ctx.routeWebSocket(/.*/, ws => { page.luar.push(ws.url()); ws.close(); });
    await ctx.route('**/*', async route => {
      const u = route.request().url();
      if (u.startsWith(web.url)) return route.continue();
      if (u.startsWith('https://fiqh.bijaklabur.my/')) {
        const r = route.request();
        const req = new Request(u, { method: r.method(), headers: r.headers(), body: ['GET', 'HEAD'].includes(r.method()) ? undefined : r.postDataBuffer() });
        const res = await ai.fetch(req);
        return route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
      }
      const f = semua.find(([re]) => re.test(u));
      if (f) {
        const v = await f[1](u, route.request());
        if (v instanceof Response) return route.fulfill({ status: v.status, headers: Object.fromEntries(v.headers), body: Buffer.from(await v.arrayBuffer()) });
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(v) });
      }
      page.luar.push(u);
      return route.fulfill({ status: 503, contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' }, body: 'luar talian (ujian)' });
    });
    return page;
  }
  return { url: web.url, halaman, tutup: async () => { await browser.close(); web.tutup(); ai.pulih(); } };
}

/* ---------- Pembantu langkah ---------- */
export function alat(page, base) {
  // Toast yang muncul selepas toast terakhir yang disemak (atau semasa paparan) mesti sepadan
  const adaToast = async (padan, ms) => {
    const k = page.__toast || {};
    const h = await page.waitForFunction(([src, fl, sesi, dari]) => {
      const T = window.__toast || [], mula = window.__toastSesi === sesi ? dari : 0, re = new RegExp(src, fl);
      const i = T.findIndex((x, j) => j >= mula && re.test(x));
      return i >= 0 ? { sesi: window.__toastSesi, dari: i + 1 } : null;
    }, [padan.source, padan.flags, k.sesi, k.dari || 0], { timeout: ms })
      .catch(async () => { const T = await page.evaluate(() => window.__toast || []).catch(() => []); throw new Error(`.toast tidak sepadan ${padan}: ${T.length ? JSON.stringify(T.slice(-4)) : 'tiada toast'}`); });
    page.__toast = await h.jsonValue();
  };
  const t = {
    buka: async hash => { await page.goto(base + '/' + hash); await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(400); },
    isi: (sel, v) => page.fill(sel, v),
    klik: sel => page.click(sel),
    pilih: (sel, v) => page.selectOption(sel, v),
    tunggu: (sel, ms = 15000) => page.waitForSelector(sel, { timeout: ms }),
    teks: async sel => (await page.textContent(sel)) || '',
    // Pastikan elemen wujud dan teksnya sepadan (regex atau panjang minimum)
    ada: async (sel, padan = /\S/, ms = 15000) => {
      if (sel === '.toast') return adaToast(padan, ms);
      await page.waitForFunction(([s, src, fl]) => { const e = document.querySelector(s); return e && new RegExp(src, fl).test(e.textContent || ''); }, [sel, padan.source, padan.flags], { timeout: ms })
        .catch(async () => { const x = await page.$(sel); throw new Error(`${sel} ${x ? `tidak sepadan ${padan}: "${((await x.textContent()) || '').trim().slice(0, 160)}"` : 'tidak dijumpai'}`); });
    },
    rehat: ms => page.waitForTimeout(ms)
  };
  return t;
}

/* Jalankan senarai kes: { kumpulan, nama, langkah(t, page), premium?, lebar? }. Pulangkan keputusan setiap kes. */
export async function jalan(kes, { fixture = [], env = {}, log = console.log } = {}) {
  const h = await mula({ fixture, env });
  const hasil = [];
  try {
    for (const k of kes) {
      const page = await h.halaman({ premium: k.premium !== false, lebar: k.lebar || 390, storan: k.storan || {} });
      const t = alat(page, h.url), t0 = Date.now();
      let ralat = null;
      try { await k.langkah(t, page); await page.waitForTimeout(300); } catch (e) { ralat = e.message.split('\n')[0]; }
      // Tangkapan skrin kes yang gagal (CI memuat naiknya sebagai artifak)
      if ((ralat || page.ralat.length) && process.env.UJI_GAMBAR) {
        const nama = `${k.kumpulan}-${k.nama}`.replace(/[^\w.-]+/g, '-').slice(0, 90);
        await page.screenshot({ path: join(process.env.UJI_GAMBAR, nama + '.png'), fullPage: true }).catch(() => {});
      }
      const r = { kumpulan: k.kumpulan, nama: k.nama, lulus: !ralat && !page.ralat.length, ralat, pageerror: page.ralat, tindanan: page.tindanan, konsol: page.konsol.filter(x => !/503|luar talian|Failed to load resource/i.test(x)).slice(0, 5), luar: [...new Set(page.luar.map(u => new URL(u).host))], ms: Date.now() - t0 };
      hasil.push(r);
      log(`${r.lulus ? 'LULUS' : 'GAGAL'}  ${k.kumpulan} / ${k.nama}${r.ralat ? `\n        ${r.ralat}` : ''}${r.pageerror.length ? `\n        pageerror: ${r.tindanan.join('\n                   ')}` : ''}`);
      await page.context().close();
    }
  } finally { await h.tutup(); }
  return hasil;
}
