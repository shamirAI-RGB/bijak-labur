// Ujian pintu Activepieces tanpa rangkaian: node worker-agen/test.mjs
import assert from 'node:assert/strict';
import worker, { config, verifyAccess, readToken, proxy, isWebhook, ping } from './src/index.js';

const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);

async function jwt(body, { kid = 'k1', key = pair.privateKey } = {}) {
  const h = enc({ alg: 'RS256', kid, typ: 'JWT' }), b = enc(body);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(h + '.' + b));
  return h + '.' + b + '.' + Buffer.from(sig).toString('base64url');
}

const ENV = { SPACE_URL: 'https://pemilik-agen.hf.space/', HF_TOKEN: 'hf_ujian', ACCESS_TEAM: 'bijaklabur', ACCESS_AUD: 'aud123', ALLOWED_EMAIL: 'Pemilik@Contoh.my' };
const c = config(ENV);
assert.equal(c.ready, true);
assert.equal(c.upstream, 'https://pemilik-agen.hf.space');
assert.deepEqual(c.emails, ['pemilik@contoh.my']);
assert.equal(config({ ...ENV, HF_TOKEN: '' }).ready, false);
assert.equal(config({ ...ENV, SPACE_URL: 'https://jahat.example.com' }).ready, false);
assert.equal(config({ ...ENV, ACCESS_TEAM: 'https://bijaklabur.cloudflareaccess.com' }).team, 'bijaklabur');

let certCalls = 0;
const upstreamCalls = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url === 'https://bijaklabur.cloudflareaccess.com/cdn-cgi/access/certs') { certCalls++; return Response.json({ keys: [{ ...jwk, kid: 'k1' }] }); }
  if (url.startsWith('https://pemilik-agen.hf.space/')) {
    upstreamCalls.push({ url, init });
    if (url.endsWith('/tidur')) return new Response('sleeping', { status: 503 });
    if (url.endsWith('/lencong')) return new Response(null, { status: 302, headers: { Location: 'https://pemilik-agen.hf.space/signin?x=1' } });
    const h = new Headers({ 'Content-Type': 'text/html' });
    h.append('Set-Cookie', 'token=abc; Path=/; HttpOnly; Domain=pemilik-agen.hf.space');
    h.append('Set-Cookie', 'refreshToken=def; Path=/; HttpOnly');
    return new Response('<h1>Activepieces</h1>', { status: 200, headers: h });
  }
  throw new Error('rangkaian tidak dijangka: ' + url);
};

const now = Date.now();
const good = { aud: ['aud123'], iss: 'https://bijaklabur.cloudflareaccess.com', email: 'pemilik@contoh.my', exp: Math.floor(now / 1000) + 600, nbf: Math.floor(now / 1000) - 5 };

// Pengesahan token
assert.equal(await verifyAccess(await jwt(good), c), 'pemilik@contoh.my');
assert.equal(await verifyAccess(await jwt({ ...good, email: 'orang@lain.my' }), c), null, 'e-mel lain ditolak');
assert.equal(await verifyAccess(await jwt({ ...good, aud: ['lain'] }), c), null, 'aud salah ditolak');
assert.equal(await verifyAccess(await jwt({ ...good, iss: 'https://jahat.cloudflareaccess.com' }), c), null, 'iss salah ditolak');
assert.equal(await verifyAccess(await jwt({ ...good, exp: Math.floor(now / 1000) - 1 }), c), null, 'token tamat ditolak');
assert.equal(await verifyAccess(await jwt(good, { key: other.privateKey }), c), null, 'tandatangan palsu ditolak');
assert.equal(await verifyAccess(await jwt(good, { kid: 'tiada' }), c), null, 'kid tidak dikenali ditolak');
assert.equal(await verifyAccess('a.b', c), null);
assert.equal(await verifyAccess('', c), null);
const [h0, b0] = (await jwt(good)).split('.');
assert.equal(await verifyAccess(enc({ alg: 'none', kid: 'k1' }) + '.' + b0 + '.', c), null, 'alg none ditolak');
assert.ok(h0);

// Token daripada kuki
const tok = await jwt(good);
assert.equal(readToken(new Request('https://agen.bijaklabur.my/', { headers: { Cookie: 'a=1; CF_Authorization=' + tok } })), tok);

// Worker penuh
const run = (path, headers = {}, env = ENV) => worker.fetch(new Request('https://agen.bijaklabur.my' + path, { headers }), env);
let r = await run('/', {}, { ...ENV, ACCESS_AUD: '' });
assert.equal(r.status, 503, 'tanpa tetapan: tolak');
r = await run('/');
assert.equal(r.status, 403, 'tanpa token: tolak');
r = await run('/', { 'Cf-Access-Jwt-Assertion': await jwt({ ...good, email: 'orang@lain.my' }) });
assert.equal(r.status, 403);
assert.equal(upstreamCalls.length, 0, 'tiada permintaan ke Space sebelum lulus');

r = await run('/canvas?id=1', { 'Cf-Access-Jwt-Assertion': tok, Cookie: 'token=abc; CF_Authorization=' + tok, Authorization: 'Bearer palsu' });
assert.equal(r.status, 200);
assert.equal(await r.text(), '<h1>Activepieces</h1>');
const call = upstreamCalls.at(-1);
assert.equal(call.url, 'https://pemilik-agen.hf.space/canvas?id=1');
assert.equal(call.init.headers.get('Authorization'), 'Bearer hf_ujian');
assert.equal(call.init.headers.get('Cookie'), 'token=abc', 'kuki Access tidak dihantar ke Space');
assert.equal(call.init.headers.get('Cf-Access-Jwt-Assertion'), null);
assert.deepEqual(r.headers.getSetCookie(), ['token=abc; Path=/; HttpOnly', 'refreshToken=def; Path=/; HttpOnly']);
assert.equal(r.headers.get('X-Robots-Tag'), 'noindex, nofollow');

r = await run('/lencong', { 'Cf-Access-Jwt-Assertion': tok });
assert.equal(r.status, 302);
assert.equal(r.headers.get('Location'), 'https://agen.bijaklabur.my/signin?x=1');

r = await run('/tidur', { 'Cf-Access-Jwt-Assertion': tok, Accept: 'text/html' });
assert.equal(r.status, 503);
assert.match(await r.text(), /sedang dihidupkan/);

// POST diteruskan bersama badan
r = await proxy(new Request('https://agen.bijaklabur.my/api/v1/x', { method: 'POST', body: '{"a":1}', headers: { 'Content-Type': 'application/json' } }), c);
assert.equal(r.status, 200);
assert.equal(upstreamCalls.at(-1).init.method, 'POST');

// Webhook: dibuka tanpa Access, kuki tidak dihantar, token HF ditambah
assert.equal(isWebhook('/api/v1/webhooks/abc123'), true);
assert.equal(isWebhook('/api/v1/webhooks/abc123/sync'), true);
assert.equal(isWebhook('/api/v1/webhooks'), false);
assert.equal(isWebhook('/api/v1/webhooks/../flows'), false);
assert.equal(isWebhook('/api/v1/flows'), false);
assert.equal(isWebhook('/api/v1/webhooksx/abc'), false);
r = await worker.fetch(new Request('https://agen.bijaklabur.my/api/v1/webhooks/abc123/sync?x=1', { method: 'POST', body: '{"k":1}', headers: { Cookie: 'token=abc' } }), ENV);
assert.equal(r.status, 200);
assert.equal(upstreamCalls.at(-1).url, 'https://pemilik-agen.hf.space/api/v1/webhooks/abc123/sync?x=1');
assert.equal(upstreamCalls.at(-1).init.headers.get('Cookie'), null);
assert.equal(upstreamCalls.at(-1).init.headers.get('Authorization'), 'Bearer hf_ujian');
r = await worker.fetch(new Request('https://agen.bijaklabur.my/api/v1/webhooks/abc', { method: 'POST' }), { ...ENV, ACCESS_AUD: '' });
assert.equal(r.status, 503, 'webhook juga tertutup jika tetapan belum lengkap');
r = await run('/api/v1/flows');
assert.equal(r.status, 403, 'API lain tetap perlu Access');

// Cron ketuk Space
assert.equal(await ping(ENV), 200);
assert.equal(upstreamCalls.at(-1).url, 'https://pemilik-agen.hf.space/api/v1/health');
assert.equal(await ping({}), 0);

r = await run('/robots.txt');
assert.match(await r.text(), /Disallow: \//);
assert.ok(certCalls >= 1 && certCalls <= 3, 'sijil Access dicache');

console.log('worker-agen: semua ujian lulus');
