/*
 * Had harian di pelayan (bukan dalam pelayar sahaja), supaya kredit AI tidak boleh dihabiskan oleh skrip.
 *
 * Siapa pemanggil:
 *  - Premium: pengepala x-lesen (lesen bertandatangan pelayan Premium, disahkan dengan kunci awam) -> had akaun Premium
 *  - Log masuk: Authorization: Bearer <token ID Firebase> -> had percuma bagi akaun itu
 *  - Tetamu: alamat IP (IPv6 dikira mengikut blok /64) -> had percuma bagi alamat itu
 *
 * Had Claude keseluruhan sehari (HAD_CLAUDE_HARIAN): selepas had dicapai, Tanya AI menggunakan model percuma
 * sehingga tengah malam waktu Malaysia. Kiraan disimpan dalam Durable Object SQLite KUOTA (satu objek).
 * Tanpa ikatan KUOTA (cth. ujian), had harian tidak dikuatkuasakan.
 */

// Sama seperti had percuma dalam js/premium.js (KUOTA)
export const HAD_PERCUMA = { tanya: 3, alat: 12, alatpro: 1 };
// Premium: "tanpa had" untuk kegunaan biasa, dengan siling penggunaan adil supaya lesen yang dikongsi tidak menghabiskan kredit
export const HAD_PREMIUM = { tanya: 200, alat: 500, alatpro: 500 };
export const HAD_CLAUDE_HARIAN = 100;
const NAMA = { tanya: 'soalan Tanya AI', alat: 'permintaan Alat Pelajar', alatpro: 'percubaan alat Premium' };

// Kunci awam pelayan Premium (sama seperti PUBLIC_JWK dalam js/premium.js)
const LESEN_JWK = { kty: 'EC', crv: 'P-256', x: 'PopJd-wOskBgsjXRhkdKZwZDEXnwp4JMC3CiOeZNIJs', y: 'BElaqIRYXzSQ595i_PjTkwPSwL6lMCd9Ei2WCyWWdHY' };
// Pelan lesen dan jenis kuota yang dibukanya. Pelan baharu (cth. langganan Tanya AI sahaja) ditambah di sini.
export const PELAN = { lengkap: ['tanya', 'alat', 'alatpro'], pelajar: ['tanya', 'alat', 'alatpro'], pelabur: ['tanya', 'alat', 'alatpro'], tanya: ['tanya'] };

export const hariMY = (t = Date.now()) => new Date(t + 8 * 3600e3).toISOString().slice(0, 10);
const b64urlBytes = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const b64urlJSON = s => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

/** Lesen Premium yang sah dan belum tamat -> { u, p } atau null */
export async function sahLesen(token, jwk = LESEN_JWK, now = Date.now() / 1000) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig || body.length > 2000) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64urlBytes(sig), new TextEncoder().encode(body)))) return null;
    const p = b64urlJSON(body);
    return p && Object.hasOwn(PELAN, p.p) && p.x > now && typeof p.u === 'string' && p.u ? { u: p.u, p: p.p } : null;
  } catch { return null; }
}

/* ---------- Token ID Firebase (seperti worker/src/akaun.js) ---------- */
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwks = { keys: null, until: 0 };
async function kunciGoogle(force) {
  if (!force && jwks.keys && Date.now() < jwks.until) return jwks.keys;
  const r = await fetch(JWKS_URL);
  if (!r.ok) throw new Error('Kunci Google tidak dapat dimuatkan');
  const age = +((r.headers.get('cache-control') || '').match(/max-age=(\d+)/) || [])[1] || 3600;
  jwks = { keys: (await r.json()).keys || [], until: Date.now() + age * 1000 };
  return jwks.keys;
}
export function resetKunciGoogle() { jwks = { keys: null, until: 0 }; }

/** uid jika token ID Firebase sah, atau null */
export async function sahToken(token, projectId) {
  try {
    if (!projectId || !token) return null;
    const [h, p, s] = String(token).split('.');
    if (!h || !p || !s) return null;
    const head = b64urlJSON(h), c = b64urlJSON(p), t = Math.floor(Date.now() / 1000);
    if (head.alg !== 'RS256' || !head.kid) return null;
    if (c.aud !== projectId || c.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (!c.sub || typeof c.sub !== 'string' || c.sub.length > 128) return null;
    if (!(c.exp > t) || !(c.iat <= t + 300)) return null;
    let jwk = (await kunciGoogle()).find(k => k.kid === head.kid);
    if (!jwk) jwk = (await kunciGoogle(true)).find(k => k.kid === head.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return (await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(s), new TextEncoder().encode(`${h}.${p}`))) ? c.sub : null;
  } catch { return null; }
}

/** Alamat IP sebagai kunci kuota. IPv6 dikira mengikut blok /64 (satu sambungan rumah atau telefon), supaya tidak boleh ditukar sesuka hati. */
export function kunciIp(ip) {
  const s = String(ip || '').trim();
  if (!s.includes(':')) return s || 'x';
  const [kiri, kanan = ''] = s.split('::');
  const a = kiri ? kiri.split(':') : [], b = kanan ? kanan.split(':') : [];
  const penuh = s.includes('::') ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b] : a;
  return penuh.slice(0, 4).map(x => (parseInt(x, 16) || 0).toString(16)).join(':') + '::/64';
}

/** Had harian jenis ini. Boleh diubah tanpa kod melalui env: HAD_PERCUMA_TANYA, HAD_PREMIUM_ALAT, dan lain-lain. */
export function hadFor(env, jenis, premium) {
  const v = parseInt((env || {})[`HAD_${premium ? 'PREMIUM' : 'PERCUMA'}_${jenis.toUpperCase()}`], 10);
  return Number.isFinite(v) && v >= 0 ? v : (premium ? HAD_PREMIUM : HAD_PERCUMA)[jenis];
}

/** Siapa pemanggil: { kunci, premium, akaun }. premium = lesen sah yang pelannya membuka jenis kuota ini. */
export async function siapa(req, env, jenis = 'tanya') {
  const lesen = await sahLesen(req.headers.get('x-lesen'));
  if (lesen) return { kunci: `u:${lesen.u}`, premium: PELAN[lesen.p].includes(jenis), akaun: true };
  const uid = await sahToken((req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''), env.FIREBASE_PROJECT_ID);
  if (uid) return { kunci: `u:${uid}`, premium: false, akaun: true };
  return { kunci: `ip:${kunciIp(req.headers.get('cf-connecting-ip'))}`, premium: false, akaun: false };
}

async function panggil(env, body) {
  const stub = env.KUOTA.get(env.KUOTA.idFromName('kuota'));
  return (await stub.fetch('https://kuota/', { method: 'POST', body: JSON.stringify(body) })).json();
}

/**
 * Ambil satu unit kuota harian jenis ini untuk pemanggil.
 * Pulangkan { ok: true, pulang() } atau { ok: false, error } (mesej untuk pengguna).
 * pulang() memulangkan unit itu jika permintaan gagal, supaya ralat pelayan tidak menghabiskan kuota pengguna.
 */
export async function ambilKuota(req, env, jenis) {
  const tiada = { ok: true, pulang: async () => {} };
  if (!env.KUOTA || !HAD_PERCUMA[jenis]) return tiada;
  try {
    const s = await siapa(req, env, jenis), had = hadFor(env, jenis, s.premium), hari = hariMY();
    const kunci = `${jenis}:${s.kunci}`;
    const d = await panggil(env, { op: 'ambil', hari, kunci, had });
    if (d.ok) return { ok: true, pulang: () => panggil(env, { op: 'pulang', hari, kunci }).catch(() => {}) };
    const error = s.premium
      ? `Had penggunaan adil Premium (${had} ${NAMA[jenis]} sehari) telah dicapai. Cuba lagi esok.`
      : `Had percuma ${had} ${NAMA[jenis]} sehari telah dicapai. ${s.akaun ? 'Naik taraf ke Premium untuk tanpa had, atau cuba lagi esok.' : 'Log masuk untuk kuota anda sendiri, naik taraf ke Premium, atau cuba lagi esok.'}`;
    return { ok: false, error };
  } catch (e) {
    // Storan kuota rosak: jangan sekat pengguna; had seminit (rate limit) masih berkuat kuasa
    console.log('kuota', e && e.message);
    return tiada;
  }
}

/** Satu soalan Claude daripada had keseluruhan sehari. false = had dicapai, guna model percuma. */
export async function ambilClaude(env) {
  if (!env.KUOTA) return { ok: true, pulang: async () => {} };
  const had = Math.max(0, parseInt(env.HAD_CLAUDE_HARIAN || HAD_CLAUDE_HARIAN, 10) || 0), hari = hariMY();
  try {
    const d = await panggil(env, { op: 'ambil', hari, kunci: 'claude', had });
    return { ok: !!d.ok, pulang: () => panggil(env, { op: 'pulang', hari, kunci: 'claude' }).catch(() => {}) };
  } catch (e) { console.log('kuota claude', e && e.message); return { ok: true, pulang: async () => {} }; }
}

/* ---------- Durable Object: kiraan harian ---------- */
export class Kuota {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS hitung (hari TEXT, kunci TEXT, n INTEGER, PRIMARY KEY (hari, kunci))');
  }
  async fetch(req) {
    const b = await req.json();
    const hari = String(b.hari || ''), kunci = String(b.kunci || '').slice(0, 200);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hari) || !kunci) return Response.json({ error: 'tidak sah' }, { status: 400 });
    const baris = this.sql.exec('SELECT n FROM hitung WHERE hari = ? AND kunci = ?', hari, kunci).toArray()[0];
    const n = baris ? baris.n : 0;
    if (b.op === 'ambil') {
      if (n >= (+b.had || 0)) return Response.json({ ok: false, n });
      this.sql.exec('INSERT INTO hitung (hari, kunci, n) VALUES (?, ?, 1) ON CONFLICT (hari, kunci) DO UPDATE SET n = n + 1', hari, kunci);
      // Buang kiraan lebih lama daripada semalam
      if (Math.random() < 0.02) this.sql.exec('DELETE FROM hitung WHERE hari < ?', hariMY(Date.now() - 2 * 864e5));
      return Response.json({ ok: true, n: n + 1 });
    }
    if (b.op === 'pulang') {
      if (n > 0) this.sql.exec('UPDATE hitung SET n = n - 1 WHERE hari = ? AND kunci = ?', hari, kunci);
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'op' }, { status: 400 });
  }
}
