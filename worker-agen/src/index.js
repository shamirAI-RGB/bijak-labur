/* Bijak Labur: pintu peribadi Activepieces (AI Agent pemilik) di agen.bijaklabur.my.
   Lapisan keselamatan:
   1. Cloudflare Access di hadapan domain (kod sekali guna ke e-mel pemilik).
   2. Worker ini mengesahkan sendiri token Access (RS256, aud, iss, tamat tempoh, e-mel), jadi jika Access
      tersalah tetap atau dimatikan, permintaan tetap ditolak.
   3. Space Hugging Face adalah peribadi; hanya Worker ini yang memegang token untuk membukanya.
   4. Log masuk Activepieces sendiri.
   Pengecualian: /api/v1/webhooks/... dibuka tanpa Access supaya perkhidmatan luar boleh mencetuskan flow
   (ID flow dalam alamat itu sendiri ialah rahsia, seperti reka bentuk asal Activepieces). */

const CERT_TTL = 3600 * 1000;
let certCache = { team: '', at: 0, keys: {} };

const b64url = s => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};
const jsonPart = s => JSON.parse(new TextDecoder().decode(b64url(s)));

export function config(env) {
  const c = {
    upstream: (env.SPACE_URL || '').trim().replace(/\/+$/, ''),
    hfToken: (env.HF_TOKEN || '').trim(),
    team: (env.ACCESS_TEAM || '').trim().replace(/^https?:\/\//, '').replace(/\.cloudflareaccess\.com.*$/, ''),
    aud: (env.ACCESS_AUD || '').trim(),
    emails: (env.ALLOWED_EMAIL || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  };
  c.ready = /^https:\/\/[a-z0-9-]+\.hf\.space$/.test(c.upstream) && !!c.hfToken && /^[a-z0-9-]+$/.test(c.team) && !!c.aud && c.emails.length > 0;
  return c;
}

async function accessKeys(team, fetchFn) {
  if (certCache.team === team && Date.now() - certCache.at < CERT_TTL) return certCache.keys;
  const r = await fetchFn(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error('certs ' + r.status);
  const { keys = [] } = await r.json();
  const out = {};
  for (const k of keys) {
    if (k.kty !== 'RSA' || !k.kid) continue;
    out[k.kid] = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: k.n, e: k.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  }
  certCache = { team, at: Date.now(), keys: out };
  return out;
}

export function readToken(request) {
  const h = request.headers.get('Cf-Access-Jwt-Assertion');
  if (h) return h.trim();
  const m = /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(request.headers.get('Cookie') || '');
  return m ? m[1] : '';
}

/* Pulangkan e-mel jika token sah untuk pemilik, atau null. */
export async function verifyAccess(token, c, fetchFn = fetch, now = Date.now()) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) return null;
  let head, body;
  try { head = jsonPart(parts[0]); body = jsonPart(parts[1]); } catch { return null; }
  if (head.alg !== 'RS256' || !head.kid) return null;
  let keys = await accessKeys(c.team, fetchFn);
  if (!keys[head.kid]) { certCache.at = 0; keys = await accessKeys(c.team, fetchFn); } // kunci baru diputar
  const key = keys[head.kid];
  if (!key) return null;
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(parts[2]),
    new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) return null;
  const aud = Array.isArray(body.aud) ? body.aud : [body.aud];
  if (!aud.includes(c.aud)) return null;
  if (body.iss !== `https://${c.team}.cloudflareaccess.com`) return null;
  const sec = now / 1000;
  if (typeof body.exp !== 'number' || body.exp < sec) return null;
  if (typeof body.nbf === 'number' && body.nbf > sec + 60) return null;
  const email = String(body.email || '').toLowerCase();
  return c.emails.includes(email) ? email : null;
}

const SEC_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000'
};

function page(status, title, text, refresh) {
  const html = `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${refresh ? `<meta http-equiv="refresh" content="${refresh}">` : ''}<meta name="robots" content="noindex"><title>${title}</title>
<style>body{font:16px/1.6 system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1412;color:#e8efe9}
main{max-width:30rem;padding:2rem 1.25rem}h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#a9b8ae;margin:0}</style></head>
<body><main><h1>${title}</h1><p>${text}</p></main></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'", ...SEC_HEADERS } });
}

function stripAccessCookie(cookie) {
  return (cookie || '').split(/;\s*/).filter(p => p && !/^CF_Authorization=/.test(p)).join('; ');
}

/* Webhook Activepieces: /api/v1/webhooks/<flowId>[/sync|/test...] */
export const isWebhook = path => /^\/api\/v1\/webhooks\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\/?$/.test(path);

export async function proxy(request, c, fetchFn = fetch, { webhook = false } = {}) {
  const url = new URL(request.url);
  const target = c.upstream + url.pathname + url.search;
  const headers = new Headers(request.headers);
  headers.delete('Cf-Access-Jwt-Assertion');
  headers.delete('Cf-Access-Authenticated-User-Email');
  const cookie = webhook ? '' : stripAccessCookie(headers.get('Cookie'));
  if (cookie) headers.set('Cookie', cookie); else headers.delete('Cookie');
  headers.set('Authorization', 'Bearer ' + c.hfToken); // membuka Space peribadi
  headers.set('X-Forwarded-Host', url.host);
  headers.set('X-Forwarded-Proto', 'https');

  const init = { method: request.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;
  let res;
  try { res = await fetchFn(target, init); }
  catch { return page(502, 'Pelayan agen tidak dapat dihubungi', 'Space Hugging Face mungkin sedang dihidupkan. Halaman ini akan dimuat semula sendiri.', 20); }
  if (res.status === 101) return res; // WebSocket

  const accept = request.headers.get('Accept') || '';
  if ([502, 503, 504].includes(res.status) && request.method === 'GET' && accept.includes('text/html')) {
    return page(503, 'Agen sedang dihidupkan', 'Space percuma tidur selepas lama tidak digunakan. Ia mengambil masa satu hingga tiga minit untuk hidup semula. Halaman ini akan dimuat semula sendiri.', 20);
  }

  const out = new Headers(res.headers);
  const up = new URL(c.upstream).host;
  const loc = out.get('Location');
  if (loc) { try { const l = new URL(loc, c.upstream); if (l.host === up) out.set('Location', `https://${url.host}${l.pathname}${l.search}${l.hash}`); } catch {} }
  // Kuki Activepieces mesti terikat pada agen.bijaklabur.my, bukan hf.space
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  if (cookies.length) {
    out.delete('Set-Cookie');
    for (const ck of cookies) out.append('Set-Cookie', ck.replace(/;\s*Domain=[^;]*/ig, ''));
  }
  for (const [k, v] of Object.entries(SEC_HEADERS)) out.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}

/* Space percuma tidur selepas 48 jam tanpa permintaan; jadual Activepieces berhenti semasa tidur.
   Cron Cloudflare (wrangler.toml) mengetuk Space setiap 6 jam supaya ia kekal berjaga. */
export async function ping(env, fetchFn = fetch) {
  const c = config(env);
  if (!c.upstream || !c.hfToken) return 0;
  try { const r = await fetchFn(c.upstream + '/api/v1/health', { headers: { Authorization: 'Bearer ' + c.hfToken } }); return r.status; }
  catch { return 0; }
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(ping(env)); },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain', ...SEC_HEADERS } });
    const c = config(env);
    if (!c.ready) return page(503, 'Agen belum disediakan', 'Tetapan pelayan agen belum lengkap. Ikut panduan Activepieces untuk menetapkan rahsia dalam GitHub.');
    if (isWebhook(url.pathname)) return proxy(request, c, fetch, { webhook: true });
    let email = null;
    try { email = await verifyAccess(readToken(request), c); } catch { email = null; }
    if (!email) return page(403, 'Akses ditolak', 'Halaman ini hanya untuk pemilik Bijak Labur.');
    return proxy(request, c);
  }
};
