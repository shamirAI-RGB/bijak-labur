// Ujian pelayan pembayaran tanpa rangkaian: node worker/test.mjs
import assert from 'node:assert/strict';
import worker from './src/index.js';

const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const env = {
  TOYYIBPAY_SECRET: 'sk', TOYYIBPAY_CATEGORY: 'cat', TOYYIBPAY_BASE: 'https://dev.toyyibpay.com',
  LICENSE_PRIVATE_JWK: JSON.stringify(await crypto.subtle.exportKey('jwk', privateKey)),
  SITE_URL: 'https://shamirai-rgb.github.io/bijak-labur/', ALLOWED_ORIGINS: 'https://shamirai-rgb.github.io'
};
const W = 'https://pay.example.workers.dev';
let created = null, tx = [];
globalThis.fetch = async (u, init) => {
  const f = Object.fromEntries(init.body);
  if (u.endsWith('/createBill')) { created = f; return new Response(JSON.stringify([{ BillCode: 'abc12345' }])); }
  if (u.endsWith('/getBillTransactions')) { assert.equal(f.billCode, 'abc12345'); return new Response(JSON.stringify(tx)); }
  throw new Error('unexpected ' + u);
};
const call = (path, body, origin = 'https://shamirai-rgb.github.io') =>
  worker.fetch(new Request(W + path, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }), env);

// Checkout
let r = await call('/checkout', { plan: 'lengkap', period: 'y1', name: 'Ali Abu', email: 'Ali@Mail.com', phone: '012-345 6789' });
let d = await r.json();
assert.equal(r.status, 200); assert.equal(d.url, 'https://dev.toyyibpay.com/abc12345');
assert.equal(r.headers.get('access-control-allow-origin'), 'https://shamirai-rgb.github.io');
assert.equal(created.billAmount, '10900'); assert.equal(created.billEmail, 'ali@mail.com'); assert.equal(created.billPhone, '0123456789');
assert.ok(created.billName.length <= 30, created.billName);
assert.ok(created.billDescription.length <= 100, created.billDescription);
assert.equal(created.billReturnUrl, W + '/return');
assert.equal((await call('/checkout', { plan: 'emas', period: 'y1', name: 'A b', email: 'a@b.co', phone: '0123456789' })).status, 400);
assert.equal((await call('/checkout', { plan: 'pelajar', period: 'm1', name: 'A b', email: 'bukan-emel', phone: '0123456789' })).status, 400);

// Origin lain tidak diberi CORS
r = await call('/checkout', { plan: 'pelajar', period: 'm1', name: 'A b', email: 'a@b.co', phone: '0123456789' }, 'https://jahat.example');
assert.equal(r.headers.get('access-control-allow-origin'), null);

// Return -> redirect ke laman
r = await worker.fetch(new Request(W + '/return?status_id=1&billcode=abc12345&order_id=BL-x'), env);
assert.equal(r.status, 302); assert.equal(r.headers.get('location'), 'https://shamirai-rgb.github.io/bijak-labur/?bill=abc12345&status=1#premium');

// Belum bayar
tx = [{ billpaymentStatus: '3', billEmail: 'ali@mail.com' }];
assert.equal((await call('/claim', { billcode: 'abc12345', email: 'ali@mail.com' })).status, 402);

// Sudah bayar
const now = new Date(Date.now() + 8 * 3600e3), p2 = n => String(n).padStart(2, '0');
const tpDate = `${p2(now.getUTCDate())}-${p2(now.getUTCMonth() + 1)}-${now.getUTCFullYear()} ${p2(now.getUTCHours())}:${p2(now.getUTCMinutes())}:00`;
tx = [{ billpaymentStatus: '1', billEmail: 'ali@mail.com', billpaymentAmount: '109.00', billExternalReferenceNo: 'BL-lengkap-y1-1234abcd', billPaymentDate: tpDate }];
assert.equal((await call('/claim', { billcode: 'abc12345', email: 'lain@mail.com' })).status, 403);
assert.equal((await call('/claim', { billcode: 'abc12345' })).status, 400);
r = await call('/claim', { billcode: 'https://toyyibpay.com/abc12345', email: ' ALI@mail.com ' });
d = await r.json();
assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(d.plan, 'lengkap');
const days = (d.exp * 1000 - Date.now()) / 864e5; assert.ok(days > 364 && days <= 365.01, String(days));
const [body, sig] = d.token.split('.');
const unb = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, unb(sig), new TextEncoder().encode(body)));
assert.deepEqual(JSON.parse(new TextDecoder().decode(unb(body))), { v: 1, p: 'lengkap', x: d.exp, b: 'abc12345' });

// Jumlah kurang daripada harga ditolak
tx[0].billpaymentAmount = '15.00';
assert.equal((await call('/claim', { billcode: 'abc12345', email: 'ali@mail.com' })).status, 400);
// Langganan tamat
Object.assign(tx[0], { billpaymentAmount: '5.00', billExternalReferenceNo: 'BL-pelajar-m1-1', billPaymentDate: '01-01-2025 10:00:00' });
assert.equal((await call('/claim', { billcode: 'abc12345', email: 'ali@mail.com' })).status, 410);

// Suara HD
let ssml = null;
globalThis.fetch = async (u, init) => { assert.match(u, /^https:\/\/southeastasia\.tts\.speech\.microsoft\.com\//); ssml = init.body; return new Response(new Uint8Array([1, 2, 3])); };
const tts = (q, origin = 'https://shamirai-rgb.github.io', e = env) => worker.fetch(new Request(W + '/tts?' + q, { headers: { origin } }), e);
assert.equal((await tts('t=Hai&v=ms-f')).status, 503);
const envT = { ...env, AZURE_SPEECH_KEY: 'k' };
r = await tts('t=' + encodeURIComponent('Selamat <pagi> & "salam"') + '&v=ms-f&r=1.2', undefined, envT);
assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'audio/mpeg');
assert.equal(r.headers.get('access-control-allow-origin'), 'https://shamirai-rgb.github.io');
assert.ok(ssml.includes('ms-MY-YasminNeural') && ssml.includes('+20%') && ssml.includes('&lt;pagi&gt; &amp; &quot;salam&quot;'), ssml);
r = await tts('t=வணக்கம்&v=ta-m', undefined, envT); assert.equal(r.status, 200); assert.ok(ssml.includes('ta-MY-SuryaNeural'));
assert.equal((await tts('t=Hai&v=fr-f', undefined, envT)).status, 400);
assert.equal((await tts('t=' + 'a'.repeat(301) + '&v=ms-f', undefined, envT)).status, 400);
assert.equal((await tts('t=Hai&v=ms-f', 'https://jahat.example', envT)).status, 403);

console.log('Semua ujian pelayan pembayaran lulus');
