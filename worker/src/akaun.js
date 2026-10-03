/*
 * Bijak Labur: akaun pengguna dan had satu peranti
 *
 * Log masuk dibuat oleh Firebase Authentication (Google, Facebook, nombor telefon, e-mel).
 * Pelayan ini mengesahkan token ID Firebase, kemudian menyimpan peranti aktif setiap akaun
 * dalam Durable Object (satu objek bagi setiap akaun, pelan percuma Cloudflare).
 *
 * POST /akaun/sesi        { device, label, takeover }  -> { licence, ... } atau 409 peranti lain
 * POST /akaun/percubaan   { device }                   -> { licence }  percubaan 3 hari, sekali bagi setiap akaun
 * POST /akaun/keluar      { device }                   -> { ok }       lepaskan peranti ini
 */

export const TRIAL_DAYS = 3;
// Lesen dalam peranti mesti diperbaharui dalam tempoh ini. Peranti lama yang luar talian
// kehilangan Premium selewat-lewatnya selepas tempoh ini.
export const LICENCE_GRACE_DAYS = 7;
const SWITCH_WINDOW_DAYS = 30;
const day = 86400;
const nowSec = () => Math.floor(Date.now() / 1000);

const b64urlBytes = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const b64urlJSON = s => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

/* ---------- Token ID Firebase ---------- */
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwksCache = { keys: null, until: 0 };

async function googleKeys(force) {
  if (!force && jwksCache.keys && Date.now() < jwksCache.until) return jwksCache.keys;
  const r = await fetch(JWKS_URL);
  if (!r.ok) throw new Error('Kunci Google tidak dapat dimuatkan');
  const age = +((r.headers.get('cache-control') || '').match(/max-age=(\d+)/) || [])[1] || 3600;
  jwksCache = { keys: (await r.json()).keys || [], until: Date.now() + age * 1000 };
  return jwksCache.keys;
}

export function resetKeyCache() { jwksCache = { keys: null, until: 0 }; }

// Pulangkan tuntutan token jika sah, atau null
export async function verifyIdToken(token, projectId) {
  try {
    if (!projectId) return null;
    const [h, p, s] = String(token || '').split('.');
    if (!h || !p || !s) return null;
    const head = b64urlJSON(h), claims = b64urlJSON(p), t = nowSec();
    if (head.alg !== 'RS256' || !head.kid) return null;
    if (claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (!claims.sub || typeof claims.sub !== 'string' || claims.sub.length > 128) return null;
    if (!(claims.exp > t) || !(claims.iat <= t + 300) || !(claims.auth_time <= t + 300)) return null;
    let jwk = (await googleKeys()).find(k => k.kid === head.kid);
    if (!jwk) jwk = (await googleKeys(true)).find(k => k.kid === head.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(s), new TextEncoder().encode(`${h}.${p}`));
    return ok ? claims : null;
  } catch { return null; }
}

// Setiap akaun wajib ada kata laluan: semak dengan Firebase sama ada penyedia "password" dipautkan
export async function hasPassword(idToken, env) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken })
  });
  if (!r.ok) return false;
  const u = ((await r.json()).users || [])[0];
  return !!u && (u.providerUserInfo || []).some(p => p.providerId === 'password');
}

/* ---------- Hak Premium ---------- */
// Pilih hak terbaik yang masih aktif: Lengkap, atau Pelajar + Pelabur = Lengkap
export function bestEntitlement(ents, t = nowSec()) {
  const live = (ents || []).filter(e => e.x > t);
  if (!live.length) return null;
  const by = p => live.filter(e => e.p === p).sort((a, b) => b.x - a.x)[0];
  const full = by('lengkap'), st = by('pelajar'), inv = by('pelabur');
  if (full) return full;
  if (st && inv) return { p: 'lengkap', x: Math.min(st.x, inv.x), b: `${st.b}+${inv.b}` };
  return live.sort((a, b) => b.x - a.x)[0];
}

/* ---------- Durable Object: satu bagi setiap akaun, dan satu bagi setiap bil ---------- */
export class Akaun {
  constructor(state, env) { this.storage = state.storage; this.env = env; }

  async fetch(req) {
    const b = await req.json();
    const op = this[`op_${b.op}`];
    if (!op) return Response.json({ error: 'op' }, { status: 400 });
    const r = await op.call(this, b);
    return Response.json(r.data, { status: r.status || 200 });
  }

  async load() {
    return (await this.storage.get('a')) || { device: null, last: null, switches: [], trial: null, ents: [], pw: false };
  }
  save(a) { return this.storage.put('a', a); }

  maxSwitches() { return Math.max(0, parseInt(this.env.MAX_DEVICE_SWITCHES || '3', 10)); }

  switchesLeft(a, t) {
    const recent = a.switches.filter(s => s > t - SWITCH_WINDOW_DAYS * day);
    return { left: Math.max(0, this.maxSwitches() - recent.length), next: recent.length ? recent[0] + SWITCH_WINDOW_DAYS * day : null, recent };
  }

  summary(a, t) {
    const ent = bestEntitlement(a.ents, t);
    return { trialUsed: !!a.trial, plan: ent ? ent.p : null, exp: ent ? ent.x : null, bill: ent ? ent.b : null, switchesLeft: this.switchesLeft(a, t).left };
  }

  // Sahkan atau ikat peranti
  async op_sesi({ device, label, takeover, pw }) {
    const t = nowSec(), a = await this.load();
    if (pw) a.pw = true;
    if (!a.pw) return { status: 403, data: { code: 'password', error: 'Sila tetapkan kata laluan untuk akaun ini.' } };
    if (a.device && a.device.id === device) {
      a.device.seen = t; await this.save(a);
      return { data: { ok: true, ...this.summary(a, t) } };
    }
    const sw = this.switchesLeft(a, t);
    // Peranti baharu dikira sebagai pertukaran, kecuali peranti pertama atau peranti terakhir yang sama
    const isSwitch = !!a.last && a.last !== device;
    if (a.device && !takeover) {
      return { status: 409, data: { code: 'device', error: 'Akaun ini sedang digunakan pada peranti lain.', other: { label: a.device.label, since: a.device.since }, switchesLeft: isSwitch ? sw.left : null } };
    }
    if (isSwitch && sw.left <= 0) {
      return { status: 429, data: { code: 'limit', error: `Had ${this.maxSwitches()} kali tukar peranti dalam ${SWITCH_WINDOW_DAYS} hari telah dicapai.`, next: sw.next } };
    }
    if (isSwitch) a.switches = [...sw.recent, t];
    a.device = { id: device, label: String(label || 'Peranti').slice(0, 60), since: t, seen: t };
    a.last = device;
    await this.save(a);
    return { data: { ok: true, bound: true, ...this.summary(a, t) } };
  }

  async op_keluar({ device }) {
    const a = await this.load();
    if (a.device && a.device.id === device) { a.device = null; await this.save(a); }
    return { data: { ok: true } };
  }

  async op_percubaan({ device }) {
    const t = nowSec(), a = await this.load();
    if (!a.device || a.device.id !== device) return { status: 409, data: { code: 'device', error: 'Peranti ini tidak aktif untuk akaun anda.' } };
    if (a.trial) return { status: 409, data: { code: 'used', error: 'Percubaan percuma untuk akaun ini telah digunakan.' } };
    a.trial = t;
    a.ents.push({ p: 'lengkap', x: t + TRIAL_DAYS * day, b: 'PERCUBAAN' });
    await this.save(a);
    return { data: { ok: true, ...this.summary(a, t) } };
  }

  async op_tambah({ device, ent }) {
    const t = nowSec(), a = await this.load();
    if (!a.device || a.device.id !== device) return { status: 409, data: { code: 'device', error: 'Peranti ini tidak aktif untuk akaun anda.' } };
    if (!a.ents.some(e => e.b === ent.b)) a.ents.push(ent);
    a.ents = a.ents.filter(e => e.x > t - 30 * day);
    await this.save(a);
    return { data: { ok: true, ...this.summary(a, t) } };
  }

  // Objek bil: satu bil hanya boleh dituntut oleh satu akaun
  async op_milik({ uid }) {
    const owner = await this.storage.get('uid');
    if (owner && owner !== uid) return { status: 403, data: { error: 'Bil ini sudah diaktifkan oleh akaun lain.' } };
    if (!owner) await this.storage.put('uid', uid);
    return { data: { ok: true } };
  }
}

/* ---------- Laluan HTTP ---------- */
const stub = (env, name) => env.AKAUN.get(env.AKAUN.idFromName(name));
export async function callDO(env, name, body) {
  const r = await stub(env, name).fetch('https://akaun/', { method: 'POST', body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
}

const cleanDevice = d => /^[a-zA-Z0-9-]{16,64}$/.test(String(d || '')) ? String(d) : null;

// Sahkan pemanggil: pulangkan { uid, claims, token } atau respons ralat
export async function authed(req, env) {
  if (!env.FIREBASE_PROJECT_ID || !env.AKAUN) return { error: { status: 503, data: { error: 'Akaun belum disediakan.' } } };
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const claims = await verifyIdToken(token, env.FIREBASE_PROJECT_ID);
  if (!claims) return { error: { status: 401, data: { code: 'auth', error: 'Sila log masuk semula.' } } };
  return { uid: claims.sub, claims, token };
}

export async function licenceFor(env, sign, uid, device, summary) {
  if (!summary.plan || !env.LICENSE_PRIVATE_JWK) return null;
  const x = Math.min(summary.exp, nowSec() + LICENCE_GRACE_DAYS * day);
  return sign(env, { v: 2, p: summary.plan, x, e: summary.exp, b: summary.bill, u: uid, d: device });
}

export async function handleAkaun(req, env, path, sign) {
  const who = await authed(req, env);
  if (who.error) return who.error;
  const b = await req.json().catch(() => ({}));
  const device = cleanDevice(b.device);
  if (!device) return { status: 400, data: { error: 'Peranti tidak sah.' } };

  if (path === '/akaun/keluar') return callDO(env, `u:${who.uid}`, { op: 'keluar', device });

  if (path === '/akaun/sesi') {
    const ask = pw => callDO(env, `u:${who.uid}`, { op: 'sesi', device, label: b.label, takeover: !!b.takeover, pw });
    let r = await ask(false);
    // Kata laluan diperiksa dengan Firebase sekali sahaja; selepas itu akaun mengingatinya
    if (r.status === 403 && r.data.code === 'password' && env.FIREBASE_API_KEY && await hasPassword(who.token, env)) r = await ask(true);
    if (r.status !== 200) return r;
    return { status: 200, data: { ...r.data, licence: await licenceFor(env, sign, who.uid, device, r.data) } };
  }

  if (path === '/akaun/percubaan') {
    const r = await callDO(env, `u:${who.uid}`, { op: 'percubaan', device });
    if (r.status !== 200) return r;
    return { status: 200, data: { ...r.data, licence: await licenceFor(env, sign, who.uid, device, r.data) } };
  }
  return { status: 404, data: { error: 'Tidak dijumpai' } };
}
