// Ujian pelayan pembayaran tanpa rangkaian: node worker/test.mjs
import assert from 'node:assert/strict';
import worker, { Akaun } from './src/index.js';
import { verifyIdToken, bestEntitlement, resetKeyCache } from './src/akaun.js';

const { privateKey, publicKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const env = {
  TOYYIBPAY_SECRET: 'sk', TOYYIBPAY_CATEGORY: 'cat', TOYYIBPAY_BASE: 'https://dev.toyyibpay.com',
  LICENSE_PRIVATE_JWK: JSON.stringify(await crypto.subtle.exportKey('jwk', privateKey)),
  SITE_URL: 'https://shamirai-rgb.github.io/bijak-labur/', ALLOWED_ORIGINS: 'https://shamirai-rgb.github.io',
  FIREBASE_PROJECT_ID: 'bijak-labur-test', FIREBASE_API_KEY: 'web-key', MAX_DEVICE_SWITCHES: '2'
};
// Durable Object palsu dalam memori
const objects = {};
env.AKAUN = {
  idFromName: n => n,
  get: n => ({ fetch: (u, init) => (objects[n] = objects[n] || new Akaun({ storage: memStore() }, env)).fetch(new Request(u, init)) })
};
function memStore() { const m = new Map(); return { get: async k => m.has(k) ? structuredClone(m.get(k)) : undefined, put: async (k, v) => { m.set(k, structuredClone(v)); } }; }

// Token ID Firebase palsu yang ditandatangani dengan kunci RSA ujian
const rsa = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const rsaPub = { ...(await crypto.subtle.exportKey('jwk', rsa.publicKey)), kid: 'k1' };
const enc = o => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function idToken(uid, over = {}, kid = 'k1') {
  const t = Math.floor(Date.now() / 1000);
  const body = `${enc({ alg: 'RS256', kid, typ: 'JWT' })}.${enc({ iss: 'https://securetoken.google.com/bijak-labur-test', aud: 'bijak-labur-test', sub: uid, iat: t - 10, auth_time: t - 10, exp: t + 3600, ...over })}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', rsa.privateKey, new TextEncoder().encode(body));
  return `${body}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}
const pwUsers = new Set(['ali', 'abu']), verified = new Set();
const W = 'https://pay.example.workers.dev';
let created = null, tx = [];
globalThis.fetch = async (u, init) => {
  if (u.startsWith('https://www.googleapis.com/service_accounts/')) return new Response(JSON.stringify({ keys: [rsaPub] }), { headers: { 'cache-control': 'max-age=600' } });
  if (u.startsWith('https://identitytoolkit.googleapis.com/v1/accounts:lookup')) {
    const uid = JSON.parse(atob(JSON.parse(init.body).idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
    return new Response(JSON.stringify({ users: [{ localId: uid, emailVerified: verified.has(uid), providerUserInfo: [{ providerId: 'google.com' }, ...(pwUsers.has(uid) ? [{ providerId: 'password' }] : [])] }] }));
  }
  const f = Object.fromEntries(init.body);
  if (u.endsWith('/createBill')) { created = f; return new Response(JSON.stringify([{ BillCode: 'abc12345' }])); }
  if (u.endsWith('/getBillTransactions')) { assert.equal(f.billCode, 'abc12345'); return new Response(JSON.stringify(tx)); }
  throw new Error('unexpected ' + u);
};
const ALI = await idToken('ali');
const call = (path, body, origin = 'https://shamirai-rgb.github.io', tok = ALI) =>
  worker.fetch(new Request(W + path, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify(body) }), env);
const unb = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const licBody = t => JSON.parse(new TextDecoder().decode(unb(t.split('.')[0])));
const DEV_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', DEV_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', DEV_C = 'cccccccc-3333-4333-8333-cccccccccccc', DEV_D = 'dddddddd-4444-4444-8444-dddddddddddd';

/* ---------- Token ID ---------- */
assert.equal((await verifyIdToken(ALI, 'bijak-labur-test')).sub, 'ali');
assert.equal(await verifyIdToken(ALI, 'projek-lain'), null);
assert.equal(await verifyIdToken(await idToken('ali', { exp: Math.floor(Date.now() / 1000) - 5 }), 'bijak-labur-test'), null);
assert.equal(await verifyIdToken(await idToken('ali', {}, 'k-tiada'), 'bijak-labur-test'), null);
assert.equal(await verifyIdToken(ALI.slice(0, -4) + 'AAAA', 'bijak-labur-test'), null);
assert.equal(await verifyIdToken('bukan.token', 'bijak-labur-test'), null);
resetKeyCache();

/* ---------- Akaun dan satu peranti ---------- */
assert.equal((await call('/akaun/sesi', { device: DEV_A }, undefined, null)).status, 401);
assert.equal((await call('/akaun/sesi', { device: 'x' })).status, 400);
// Akaun tanpa kata laluan ditolak
{
  const r = await call('/akaun/sesi', { device: DEV_A }, undefined, await idToken('tanpa-pw'));
  assert.equal(r.status, 403); assert.equal((await r.json()).code, 'password');
}
let r = await call('/akaun/sesi', { device: DEV_A, label: 'Chrome, Android' });
let d = await r.json();
assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(d.bound, true); assert.equal(d.licence, null); assert.equal(d.trialUsed, false);
assert.equal(r.headers.get('access-control-allow-origin'), 'https://shamirai-rgb.github.io');
// Peranti yang sama: ok
assert.equal((await call('/akaun/sesi', { device: DEV_A })).status, 200);
// Peranti kedua ditolak tanpa pengesahan
r = await call('/akaun/sesi', { device: DEV_B, label: 'Safari, iPhone' }); d = await r.json();
assert.equal(r.status, 409); assert.equal(d.code, 'device'); assert.equal(d.other.label, 'Chrome, Android'); assert.equal(d.switchesLeft, 2);
// Percubaan perlukan e-mel disahkan (Ali belum; Firebase kata belum)
{
  const r = await call('/akaun/percubaan', { device: DEV_A }); assert.equal(r.status, 403); assert.equal((await r.json()).code, 'verify');
}
verified.add('ali');
// Percubaan hanya pada peranti aktif, dan sekali sahaja
assert.equal((await call('/akaun/percubaan', { device: DEV_B })).status, 409);
r = await call('/akaun/percubaan', { device: DEV_A }); d = await r.json();
assert.equal(r.status, 200); assert.equal(d.plan, 'lengkap');
let lb = licBody(d.licence);
assert.equal(lb.u, 'ali'); assert.equal(lb.d, DEV_A); assert.equal(lb.p, 'lengkap');
assert.ok(lb.x - Date.now() / 1000 > 2.9 * 86400 && lb.x - Date.now() / 1000 <= 3 * 86400 + 5);
assert.equal((await (await call('/akaun/percubaan', { device: DEV_A })).json()).code, 'used');
// Ambil alih: peranti B aktif, A dilog keluar
r = await call('/akaun/sesi', { device: DEV_B, takeover: true }); d = await r.json();
assert.equal(r.status, 200); assert.equal(licBody(d.licence).d, DEV_B); assert.equal(d.switchesLeft, 1);
assert.equal((await call('/akaun/sesi', { device: DEV_A })).status, 409);
// Log keluar melepaskan peranti; kembali ke peranti terakhir tidak dikira
assert.equal((await call('/akaun/keluar', { device: DEV_B })).status, 200);
d = await (await call('/akaun/sesi', { device: DEV_B })).json(); assert.equal(d.switchesLeft, 1);
// Had pertukaran
assert.equal((await call('/akaun/sesi', { device: DEV_C, takeover: true })).status, 200);
r = await call('/akaun/sesi', { device: DEV_D, takeover: true }); d = await r.json();
assert.equal(r.status, 429); assert.equal(d.code, 'limit'); assert.ok(d.next > Date.now() / 1000);
await call('/akaun/keluar', { device: DEV_C });

// Hak terbaik
const T = 1e9;
assert.equal(bestEntitlement([{ p: 'pelajar', x: T + 10, b: 'a' }, { p: 'pelabur', x: T + 5, b: 'b' }], T).p, 'lengkap');
assert.equal(bestEntitlement([{ p: 'pelajar', x: T - 1, b: 'a' }], T), null);

// Pembayaran perlukan log masuk; Ali kembali ke peranti A
assert.equal((await call('/checkout', { plan: 'lengkap', period: 'y1', name: 'Ali Abu', email: 'a@b.co', phone: '0123456789' }, undefined, null)).status, 401);

// Checkout
r = await call('/checkout', { plan: 'lengkap', period: 'y1', name: 'Ali Abu', email: 'Ali@Mail.com', phone: '012-345 6789' });
d = await r.json();
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

// Bil yang tidak dicipta oleh /checkout (cth. bil daripada akaun ToyyibPay lain) ditolak tanpa menghubungi ToyyibPay
r = await call('/claim', { billcode: 'zzz99999', email: 'ali@mail.com', device: DEV_C });
assert.equal(r.status, 404); assert.match((await r.json()).error, /bukan daripada Bijak Labur/);
// Pelan dan harga diambil daripada rekod pelayan, bukan daripada teks bil
assert.deepEqual((({ plan, period, sen }) => ({ plan, period, sen }))(await (await env.AKAUN.get('b:abc12345').fetch('https://akaun/', { method: 'POST', body: JSON.stringify({ op: 'lihat' }) })).json()), { plan: 'lengkap', period: 'y1', sen: 10900 });

// Belum bayar
tx = [{ billpaymentStatus: '3', billEmail: 'ali@mail.com' }];
assert.equal((await call('/claim', { billcode: 'abc12345', email: 'ali@mail.com', device: DEV_C })).status, 402);

// Sudah bayar
const now = new Date(Date.now() + 8 * 3600e3), p2 = n => String(n).padStart(2, '0');
const tpDate = `${p2(now.getUTCDate())}-${p2(now.getUTCMonth() + 1)}-${now.getUTCFullYear()} ${p2(now.getUTCHours())}:${p2(now.getUTCMinutes())}:00`;
tx = [{ billpaymentStatus: '1', billEmail: 'ali@mail.com', billpaymentAmount: '109.00', billExternalReferenceNo: 'BL-lengkap-y1-1234abcd', billPaymentDate: tpDate }];
assert.equal((await call('/claim', { billcode: 'abc12345', email: 'lain@mail.com' })).status, 403);
assert.equal((await call('/claim', { billcode: 'abc12345' })).status, 400);
// Peranti tidak aktif (C sudah log keluar) ditolak
assert.equal((await call('/claim', { billcode: 'abc12345', email: 'ali@mail.com', device: DEV_C })).status, 409);
assert.equal((await call('/akaun/sesi', { device: DEV_C })).status, 200);
r = await call('/claim', { billcode: 'https://toyyibpay.com/abc12345', email: ' ALI@mail.com ', device: DEV_C });
d = await r.json();
assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(d.plan, 'lengkap');
const days = (d.exp * 1000 - Date.now()) / 864e5; assert.ok(days > 364 && days <= 365.01, String(days));
const [body, sig] = d.licence.split('.');
assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, unb(sig), new TextEncoder().encode(body)));
lb = licBody(d.licence);
assert.equal(lb.v, 2); assert.equal(lb.p, 'lengkap'); assert.equal(lb.e, d.exp); assert.equal(lb.u, 'ali'); assert.equal(lb.d, DEV_C);
// Lesen peranti tamat dalam 7 hari dan diperbaharui oleh /akaun/sesi
assert.ok(lb.x <= Date.now() / 1000 + 7 * 86400 + 5);
assert.equal(licBody((await (await call('/akaun/sesi', { device: DEV_C })).json()).licence).e, d.exp);
// Bil yang sama tidak boleh dituntut oleh akaun lain
const ABU = await idToken('abu');
assert.equal((await call('/akaun/sesi', { device: DEV_D }, undefined, ABU)).status, 200);
assert.equal((await call('/claim', { billcode: 'abc12345', email: 'ali@mail.com', device: DEV_D }, undefined, ABU)).status, 403);

// Jumlah kurang daripada harga ditolak
tx[0].billpaymentAmount = '15.00';
assert.equal((await call('/claim', { billcode: 'abc12345', email: 'ali@mail.com', device: DEV_C })).status, 400);
// Langganan tamat
Object.assign(tx[0], { billpaymentAmount: '109.00', billPaymentDate: '01-01-2024 10:00:00' });
assert.equal((await call('/claim', { billcode: 'abc12345', email: 'ali@mail.com', device: DEV_C })).status, 410);

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

console.log('Semua ujian pelayan pembayaran dan akaun lulus');

// Had suara HD per IP (permintaan baharu sahaja)
assert.equal((await tts('t=Teks+baharu&v=ms-f', undefined, { ...envT, TTS_LIMIT: { limit: async () => ({ success: false }) } })).status, 429);
console.log('Had suara HD lulus');
