/*
 * Bijak Labur: pelayan pembayaran Premium (Cloudflare Worker, pelan percuma)
 *
 * POST /checkout  { plan, period, name, email, phone }  -> { url }   cipta bil ToyyibPay (perlu log masuk)
 * GET  /return    (ToyyibPay hantar pembeli ke sini)    -> 302 ke laman web dengan kod bil
 * POST /callback  (pemberitahuan pelayan ToyyibPay)     -> "OK"
 * POST /claim     { billcode, email, device }           -> { licence, plan, exp }  (perlu log masuk)
 * POST /akaun/... akaun dan had satu peranti, lihat akaun.js
 * GET  /tts?t=teks&v=ms-f&r=1                          -> audio/mpeg  Suara HD (Azure Speech neural, peringkat F0 percuma)
 *
 * Setiap tuntutan disahkan terus dengan ToyyibPay. Hak Premium disimpan pada akaun (Durable Object),
 * dan lesen untuk peranti aktif ditandatangani (ECDSA P-256) supaya app boleh mengesahkannya tanpa talian.
 */
import { Akaun, handleAkaun, authed, callDO, licenceFor } from './akaun.js';
export { Akaun };

export const PLANS = {
  pelajar: { name: 'Pelajar', m1: 500, y1: 3900 },
  pelabur: { name: 'Pelabur', m1: 1200, y1: 8900 },
  lengkap: { name: 'Lengkap', m1: 1500, y1: 10900 }
};
export const PERIODS = { m1: { days: 30, label: '30 Hari' }, y1: { days: 365, label: '1 Tahun' } };

const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });

function cors(req, env) {
  const origin = req.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return {};
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, GET, OPTIONS', 'access-control-allow-headers': 'content-type, authorization', 'access-control-max-age': '86400', vary: 'origin' };
}

const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const tpBase = env => (env.TOYYIBPAY_BASE || 'https://toyyibpay.com').replace(/\/$/, '');
const cleanEmail = e => String(e || '').trim().toLowerCase();
const billCodeOf = v => { const m = String(v || '').trim().match(/([a-z0-9]{6,12})\/?$/i); return m ? m[1] : null; };

async function toyyib(env, path, fields) {
  const body = new URLSearchParams(fields);
  const r = await fetch(`${tpBase(env)}/index.php/api/${path}`, { method: 'POST', body });
  const text = await r.text();
  try { return JSON.parse(text); } catch { throw new Error(`ToyyibPay ${path}: ${text.slice(0, 200)}`); }
}

async function checkout(req, env, url) {
  const who = await authed(req, env);
  if (who.error) return who.error;
  const b = await req.json().catch(() => ({}));
  const plan = PLANS[b.plan], period = PERIODS[b.period];
  const name = String(b.name || '').replace(/[^\p{L}\p{N} .'@-]/gu, '').trim().slice(0, 60);
  const email = cleanEmail(b.email);
  const phone = String(b.phone || '').replace(/\D/g, '');
  if (!plan || !period) return { status: 400, data: { error: 'Pelan tidak sah.' } };
  if (name.length < 2) return { status: 400, data: { error: 'Sila isi nama.' } };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) return { status: 400, data: { error: 'E-mel tidak sah.' } };
  if (phone.length < 9 || phone.length > 13) return { status: 400, data: { error: 'Nombor telefon tidak sah.' } };

  const ref = `BL-${b.plan}-${b.period}-${crypto.randomUUID().slice(0, 8)}`;
  const res = await toyyib(env, 'createBill', {
    userSecretKey: env.TOYYIBPAY_SECRET,
    categoryCode: env.TOYYIBPAY_CATEGORY,
    billName: `Bijak Labur ${plan.name} ${period.label}`,
    billDescription: `Akses Premium Bijak Labur pelan ${plan.name} selama ${period.days} hari [${b.plan}-${b.period}]`,
    billPriceSetting: '1',
    billPayorInfo: '1',
    billAmount: String(plan[b.period]),
    billReturnUrl: `${url.origin}/return`,
    billCallbackUrl: `${url.origin}/callback`,
    billExternalReferenceNo: ref,
    billTo: name,
    billEmail: email,
    billPhone: phone,
    billSplitPayment: '0',
    billSplitPaymentArgs: '',
    billPaymentChannel: env.PAYMENT_CHANNEL || '2',
    billContentEmail: 'Terima kasih kerana melanggan Bijak Labur Premium. Simpan e-mel ini: kod bil diperlukan untuk memulihkan Premium pada peranti lain.',
    billChargeToCustomer: '',
    billExpiryDays: '3'
  });
  const code = Array.isArray(res) && res[0] && res[0].BillCode;
  if (!code) { console.log('createBill gagal', JSON.stringify(res)); return { status: 502, data: { error: 'Gerbang pembayaran tidak dapat mencipta bil. Cuba lagi sebentar.' } }; }
  // Rekod bil di pelayan: hanya bil yang dicipta di sini boleh dituntut, dengan pelan dan harga yang direkod
  const rec = await callDO(env, `b:${code}`, { op: 'cipta', uid: who.uid, plan: b.plan, period: b.period, sen: plan[b.period] });
  if (rec.status !== 200) return rec;
  return { status: 200, data: { url: `${tpBase(env)}/${code}`, billcode: code } };
}

// "02-10-2026 14:05:33" atau "2026-10-02 14:05:33" (waktu Malaysia) -> milisaat
function parseDate(s) {
  const m = String(s || '').match(/(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  let [, a, mo, c, h, mi, se] = m;
  const [y, d] = a.length === 4 ? [a, c] : [c, a];
  const t = Date.UTC(+y, +mo - 1, +d, +h - 8, +mi, +(se || 0));
  return isNaN(t) ? null : t;
}

async function sign(env, payload) {
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.LICENSE_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(body));
  return `${body}.${b64url(sig)}`;
}

async function claim(req, env) {
  const who = await authed(req, env);
  if (who.error) return who.error;
  const b = await req.json().catch(() => ({}));
  const code = billCodeOf(b.billcode), email = cleanEmail(b.email);
  const device = String(b.device || '');
  if (!code) return { status: 400, data: { error: 'Kod bil tidak sah.' } };
  if (!email) return { status: 400, data: { error: 'Sila isi e-mel yang digunakan semasa membayar.' } };
  // Bil mesti dicipta oleh /checkout Bijak Labur, bukan bil ToyyibPay lain (termasuk bil akaun ToyyibPay orang lain)
  const rec = await callDO(env, `b:${code}`, { op: 'lihat' });
  if (rec.status !== 200) return rec;
  const { plan, period, sen } = rec.data;
  const tx = await toyyib(env, 'getBillTransactions', { billCode: code });
  const list = Array.isArray(tx) ? tx : [];
  const paid = list.find(t => String(t.billpaymentStatus) === '1');
  if (!paid) {
    const pending = list.some(t => ['2', '4'].includes(String(t.billpaymentStatus)));
    return { status: 402, data: { error: pending ? 'Pembayaran masih diproses. Cuba lagi selepas beberapa minit.' : 'Pembayaran untuk bil ini belum diterima.', pending } };
  }
  if (cleanEmail(paid.billEmail) !== email) return { status: 403, data: { error: 'E-mel tidak sepadan dengan bil ini.' } };

  const paidSen = Math.round(parseFloat(paid.billpaymentAmount) * 100);
  if (!(paidSen >= sen)) return { status: 400, data: { error: 'Jumlah bayaran tidak sepadan dengan harga pelan.' } };

  const start = parseDate(paid.billPaymentDate) || Date.now();
  const exp = Math.floor((start + PERIODS[period].days * 864e5) / 1000);
  if (exp * 1000 < Date.now()) return { status: 410, data: { error: 'Langganan untuk bil ini telah tamat.', exp } };
  // Satu bil untuk satu akaun sahaja, kemudian hak disimpan pada akaun pembeli
  const own = await callDO(env, `b:${code}`, { op: 'milik', uid: who.uid });
  if (own.status !== 200) return own;
  const r = await callDO(env, `u:${who.uid}`, { op: 'tambah', device, ent: { p: plan, x: exp, b: code } });
  if (r.status !== 200) return r;
  const licence = await licenceFor(env, sign, who.uid, device, r.data);
  return { status: 200, data: { licence, plan: r.data.plan, exp: r.data.exp } };
}

/* ---------- Suara HD: Azure Speech (neural). Peringkat F0 percuma 0.5 juta aksara sebulan dan berhenti, tidak dicaj ---------- */
export const TTS_VOICES = {
  'ms-f': ['ms-MY', 'ms-MY-YasminNeural'], 'ms-m': ['ms-MY', 'ms-MY-OsmanNeural'],
  'en-f': ['en-GB', 'en-GB-SoniaNeural'], 'en-m': ['en-GB', 'en-GB-RyanNeural'],
  'zh-f': ['zh-CN', 'zh-CN-XiaoxiaoNeural'], 'zh-m': ['zh-CN', 'zh-CN-YunxiNeural'],
  'ta-f': ['ta-MY', 'ta-MY-KaniNeural'], 'ta-m': ['ta-MY', 'ta-MY-SuryaNeural'],
  'ar-f': ['ar-SA', 'ar-SA-ZariyahNeural'], 'ar-m': ['ar-SA', 'ar-SA-HamedNeural']
};
const TTS_RATES = { '0.8': '-20%', '1': '0%', '1.2': '+20%' };
const xml = s => s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

async function tts(req, env, url, h) {
  if (!env.AZURE_SPEECH_KEY) return json({ error: 'Suara HD belum disediakan.' }, 503, h);
  // Hanya laman dan app Bijak Labur (elak orang lain menghabiskan kuota)
  if (!h['access-control-allow-origin']) return json({ error: 'Tidak dibenarkan.' }, 403, h);
  const text = String(url.searchParams.get('t') || '').replace(/\s+/g, ' ').trim();
  const v = TTS_VOICES[url.searchParams.get('v')], rate = TTS_RATES[url.searchParams.get('r') || '1'];
  if (!text || text.length > 300 || !v || !rate) return json({ error: 'Permintaan tidak sah.' }, 400, h);

  const key = new Request(`${url.origin}/tts-cache?v=${v[1]}&r=${rate}&t=${encodeURIComponent(text)}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  let hit = cache && await cache.match(key);
  if (!hit) {
    // Had per alamat IP supaya kuota Azure bulanan tidak dihabiskan oleh satu pihak (pengepala Origin boleh dipalsukan)
    if (env.TTS_LIMIT && !(await env.TTS_LIMIT.limit({ key: req.headers.get('cf-connecting-ip') || 'x' })).success)
      return json({ error: 'Terlalu banyak permintaan suara. Cuba lagi sebentar.' }, 429, h);
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${v[0]}"><voice name="${v[1]}"><prosody rate="${rate}">${xml(text)}</prosody></voice></speak>`;
    const r = await fetch(`https://${env.AZURE_SPEECH_REGION || 'southeastasia'}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'bijak-labur' },
      body: ssml
    });
    if (!r.ok) { console.log('Azure TTS', r.status, (await r.text()).slice(0, 200)); return json({ error: r.status === 429 ? 'Kuota suara HD bulan ini telah habis.' : 'Suara HD tidak tersedia.' }, r.status === 429 ? 429 : 502, h); }
    hit = new Response(await r.arrayBuffer(), { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=2592000' } });
    if (cache) await cache.put(key, hit.clone());
  }
  const out = new Response(hit.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=2592000', ...h } });
  return out;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    try {
      if (url.pathname === '/return') {
        const code = billCodeOf(url.searchParams.get('billcode'));
        const status = url.searchParams.get('status_id') || '';
        const site = (env.SITE_URL || '').replace(/[?#].*$/, '');
        return Response.redirect(`${site}?bill=${encodeURIComponent(code || '')}&status=${encodeURIComponent(status)}#premium`, 302);
      }
      if (url.pathname === '/callback') return new Response('OK');
      if (req.method === 'POST' && (url.pathname === '/checkout' || url.pathname === '/claim')) {
        const r = url.pathname === '/checkout' ? await checkout(req, env, url) : await claim(req, env);
        return json(r.data, r.status, h);
      }
      if (req.method === 'POST' && url.pathname.startsWith('/akaun/')) {
        const r = await handleAkaun(req, env, url.pathname, sign);
        return json(r.data, r.status, h);
      }
      if (req.method === 'GET' && url.pathname === '/tts') return await tts(req, env, url, h);
      if (url.pathname === '/') return json({ ok: true, service: 'bijak-labur-premium', tts: !!env.AZURE_SPEECH_KEY, akaun: !!(env.FIREBASE_PROJECT_ID && env.AKAUN) }, 200, h);
      return json({ error: 'Tidak dijumpai' }, 404, h);
    } catch (e) {
      console.log('ralat', e && e.stack || e);
      return json({ error: 'Ralat pelayan. Cuba lagi sebentar.' }, 500, h);
    }
  }
};
