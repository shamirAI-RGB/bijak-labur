/*
 * Bijak Labur: pelayan pembayaran Premium (Cloudflare Worker, pelan percuma)
 *
 * POST /checkout  { plan, period, name, email, phone }  -> { url }   cipta bil ToyyibPay
 * GET  /return    (ToyyibPay hantar pembeli ke sini)    -> 302 ke laman web dengan kod bil
 * POST /callback  (pemberitahuan pelayan ToyyibPay)     -> "OK"
 * POST /claim     { billcode, email }                   -> { token, plan, exp }  lesen bertandatangan
 *
 * Tiada pangkalan data: setiap tuntutan disahkan terus dengan ToyyibPay, kemudian
 * lesen ditandatangani (ECDSA P-256) supaya app boleh mengesahkannya tanpa talian.
 */

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
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, GET, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'origin' };
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
  const b = await req.json().catch(() => ({}));
  const code = billCodeOf(b.billcode), email = cleanEmail(b.email);
  if (!code) return { status: 400, data: { error: 'Kod bil tidak sah.' } };
  if (!email) return { status: 400, data: { error: 'Sila isi e-mel yang digunakan semasa membayar.' } };
  const tx = await toyyib(env, 'getBillTransactions', { billCode: code });
  const list = Array.isArray(tx) ? tx : [];
  const paid = list.find(t => String(t.billpaymentStatus) === '1');
  if (!paid) {
    const pending = list.some(t => ['2', '4'].includes(String(t.billpaymentStatus)));
    return { status: 402, data: { error: pending ? 'Pembayaran masih diproses. Cuba lagi selepas beberapa minit.' : 'Pembayaran untuk bil ini belum diterima.', pending } };
  }
  if (cleanEmail(paid.billEmail) !== email) return { status: 403, data: { error: 'E-mel tidak sepadan dengan bil ini.' } };

  const tag = `${paid.billExternalReferenceNo || ''} ${paid.billDescription || ''}`.match(/(pelajar|pelabur|lengkap)-(m1|y1)/);
  if (!tag) return { status: 400, data: { error: 'Bil ini bukan langganan Bijak Labur.' } };
  const [, plan, period] = tag;
  const paidSen = Math.round(parseFloat(paid.billpaymentAmount) * 100);
  if (!(paidSen >= PLANS[plan][period])) return { status: 400, data: { error: 'Jumlah bayaran tidak sepadan dengan harga pelan.' } };

  const start = parseDate(paid.billPaymentDate) || Date.now();
  const exp = Math.floor((start + PERIODS[period].days * 864e5) / 1000);
  if (exp * 1000 < Date.now()) return { status: 410, data: { error: 'Langganan untuk bil ini telah tamat.', exp } };
  const token = await sign(env, { v: 1, p: plan, x: exp, b: code });
  return { status: 200, data: { token, plan, exp } };
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
      if (url.pathname === '/') return json({ ok: true, service: 'bijak-labur-premium' }, 200, h);
      return json({ error: 'Tidak dijumpai' }, 404, h);
    } catch (e) {
      console.log('ralat', e && e.stack || e);
      return json({ error: 'Ralat pelayan. Cuba lagi sebentar.' }, 500, h);
    }
  }
};
