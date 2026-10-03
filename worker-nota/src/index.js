/*
 * Bijak Labur: kedai nota IC220 (Cloudflare Worker + Workers KV, pelan percuma)
 *
 * Orang awam hanya melihat tajuk, penerangan, harga dan gambar pratonton. Fail penuh tidak pernah
 * dihantar kepada orang awam: pembeli membayar melalui QR, menghantar resit melalui WhatsApp, dan
 * pemilik menghantar fail atau pautan muat turun sekali guna (tamat dalam 7 hari).
 *
 * Awam
 *   GET  /notes                      -> { notes: [...], settings: { wa, msg, payNote, qr } }
 *   GET  /notes/:id/preview          -> gambar pratonton
 *   GET  /qr                         -> gambar QR pembayaran
 *   GET  /dl/:token                  -> fail nota (pautan pembeli daripada pemilik)
 * Pemilik (Authorization: Bearer <kunci pemilik>)
 *   GET    /admin/check              -> { ok: true }
 *   GET    /admin/notes              -> senarai penuh termasuk nota tersembunyi
 *   POST   /admin/notes              (multipart: title, code, desc, price, pages, file, preview?)
 *   PATCH  /admin/notes/:id          (JSON: title, code, desc, price, hidden)
 *   DELETE /admin/notes/:id
 *   GET    /admin/notes/:id/file     -> fail penuh
 *   POST   /admin/notes/:id/link     -> { url, expires } pautan muat turun untuk pembeli
 *   PUT    /admin/settings           (JSON: wa, msg, payNote)
 *   PUT    /admin/qr                 (badan = gambar) ; DELETE /admin/qr
 *   POST   /admin/key                (JSON: key) tukar kunci pemilik
 *
 * Kunci KV: idx (senarai nota), f:<id> (fail), p:<id> (pratonton), cfg (tetapan), qr, owner (cincang kunci baru),
 *           dl:<token> (pautan pembeli, tamat sendiri)
 */

export const MAX_FILE = 24 * 1024 * 1024;   // had nilai KV ialah 25 MiB
export const MAX_IMG = 2 * 1024 * 1024;
const LINK_TTL = 7 * 24 * 3600;
const DEFAULT_MSG = 'Hi saya berminat nak beli nota untuk belajar';
export const DEFAULTS = {
  wa: [{ no: '60102546720', label: 'WhatsApp 1' }, { no: '60176040973', label: 'WhatsApp 2' }],
  msg: DEFAULT_MSG,
  payNote: 'Imbas kod QR untuk bayar, kemudian hantar resit melalui WhatsApp. Nota akan dihantar kepada anda.'
};
const IMG_TYPES = /^image\/(png|jpeg|webp|gif)$/;
const FILE_EXT = /\.(pdf|docx?|pptx?|xlsx?|zip|png|jpe?g)$/i;

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

/* ---------- Utiliti ---------- */
export async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const rid = (n = 10) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
export const price = v => { const n = Math.round(parseFloat(String(v ?? '').replace(',', '.')) * 100) / 100; return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : 0; };
/** Nombor telefon Malaysia ke format wa.me: 010-254 6720 -> 60102546720 */
export function waNumber(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '6' + d;
  return /^\d{9,15}$/.test(d) ? d : '';
}
export function sanitizeSettings(b = {}) {
  const wa = (Array.isArray(b.wa) ? b.wa : []).slice(0, 4)
    .map((w, i) => ({ no: waNumber(w && w.no), label: clean(w && w.label, 40) || `WhatsApp ${i + 1}` })).filter(w => w.no);
  return { wa, msg: clean(b.msg, 300) || DEFAULT_MSG, payNote: clean(b.payNote, 500) };
}
function sanitizeMeta(b, base = {}) {
  const out = { ...base };
  if ('title' in b) out.title = clean(b.title, 120);
  if ('code' in b) out.code = clean(b.code, 20).toUpperCase();
  if ('desc' in b) out.desc = clean(b.desc, 1000);
  if ('price' in b) out.price = price(b.price);
  if ('pages' in b) out.pages = Math.max(0, Math.min(5000, parseInt(b.pages, 10) || 0));
  if ('hidden' in b) out.hidden = b.hidden === true || b.hidden === 'true' || b.hidden === '1';
  if (!out.title) throw new HttpError(400, 'Tajuk nota diperlukan.');
  return out;
}
const pub = n => ({ id: n.id, title: n.title, code: n.code, desc: n.desc, price: n.price, pages: n.pages, size: n.size, ext: n.ext, preview: n.preview ? `/notes/${n.id}/preview?v=${n.v}` : '', created: n.created });

function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const h = { 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' };
  if (allowed.includes(origin)) Object.assign(h, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400'
  });
  return h;
}
const json = (data, status, h, cache = 'no-store') => new Response(JSON.stringify(data), { status, headers: { ...h, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache } });

/* ---------- Storan ---------- */
const getIdx = async env => (await env.NOTA.get('idx', 'json')) || [];
const putIdx = (env, idx) => env.NOTA.put('idx', JSON.stringify(idx));
const getCfg = async env => ({ ...DEFAULTS, ...((await env.NOTA.get('cfg', 'json')) || {}) });

/* ---------- Pengesahan pemilik ----------
 * Kini: satu kunci pemilik rahsia. Cincangnya ada dalam OWNER_KEY_HASH (wrangler.toml) atau dalam KV jika ditukar.
 * Apabila log masuk akaun siap, gantikan fungsi ini sahaja (cth. sahkan token akaun dan peranan "owner"). */
export async function isOwner(req, env) {
  const m = (req.headers.get('Authorization') || '').match(/^Bearer\s+(.{12,200})$/);
  if (!m) return false;
  const want = (await env.NOTA.get('owner')) || env.OWNER_KEY_HASH || '';
  return !!want && (await sha256(m[1].trim())) === want;
}

function fileResponse(got, h, disposition, cache) {
  if (!got || !got.value) throw new HttpError(404, 'Fail tidak dijumpai.');
  const meta = got.metadata || {};
  const headers = { ...h, 'Content-Type': meta.type || 'application/octet-stream', 'Cache-Control': cache };
  if (disposition) headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(meta.name || 'nota')}`;
  return new Response(got.value, { headers });
}

async function readImage(blob, what) {
  if (!blob || typeof blob === 'string' || !blob.size) return null;
  if (!IMG_TYPES.test(blob.type)) throw new HttpError(400, `${what} mesti gambar PNG, JPG atau WebP.`);
  if (blob.size > MAX_IMG) throw new HttpError(413, `${what} terlalu besar (had 2 MB).`);
  return { buf: await blob.arrayBuffer(), type: blob.type };
}

/* ---------- Laluan ---------- */
async function handle(req, env, h) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const M = req.method;
  let m;

  if (p === '/' && M === 'GET') return json({ ok: true, service: 'bijak-labur-nota', kv: !!env.NOTA }, 200, h);
  if (!env.NOTA) throw new HttpError(503, 'Storan nota belum disediakan.');

  // Awam
  if (p === '/notes' && M === 'GET') {
    const [idx, cfg, qr] = await Promise.all([getIdx(env), getCfg(env), env.NOTA.get('qrv')]);
    return json({ notes: idx.filter(n => !n.hidden).map(pub), settings: { wa: cfg.wa, msg: cfg.msg, payNote: cfg.payNote, qr: qr ? `/qr?v=${qr}` : '' } }, 200, h, 'public, max-age=30');
  }
  if ((m = p.match(/^\/notes\/([a-z0-9]{6,20})\/preview$/)) && M === 'GET')
    return fileResponse(await env.NOTA.getWithMetadata('p:' + m[1], { type: 'arrayBuffer' }), h, false, 'public, max-age=31536000, immutable');
  if (p === '/qr' && M === 'GET')
    return fileResponse(await env.NOTA.getWithMetadata('qr', { type: 'arrayBuffer' }), h, false, 'public, max-age=31536000, immutable');
  if ((m = p.match(/^\/dl\/([a-z0-9]{20,40})$/)) && M === 'GET') {
    const id = await env.NOTA.get('dl:' + m[1]);
    if (!id) throw new HttpError(404, 'Pautan ini telah tamat tempoh atau tidak sah. Hubungi penjual untuk pautan baharu.');
    return fileResponse(await env.NOTA.getWithMetadata('f:' + id, { type: 'arrayBuffer' }), h, true, 'private, no-store');
  }

  if (!p.startsWith('/admin')) throw new HttpError(404, 'Laluan tidak dijumpai.');
  if (!(await isOwner(req, env))) throw new HttpError(401, 'Kunci pemilik salah.');

  if (p === '/admin/check' && M === 'GET') return json({ ok: true }, 200, h);
  if (p === '/admin/notes' && M === 'GET') {
    const [idx, cfg, qr] = await Promise.all([getIdx(env), getCfg(env), env.NOTA.get('qrv')]);
    return json({ notes: idx.map(n => ({ ...pub(n), hidden: !!n.hidden, name: n.name })), settings: { wa: cfg.wa, msg: cfg.msg, payNote: cfg.payNote, qr: qr ? `/qr?v=${qr}` : '' } }, 200, h);
  }
  if (p === '/admin/notes' && M === 'POST') {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string' || !file.size) throw new HttpError(400, 'Pilih fail nota untuk dimuat naik.');
    if (file.size > MAX_FILE) throw new HttpError(413, 'Fail terlalu besar. Had ialah 24 MB setiap nota.');
    const name = clean(file.name, 150) || 'nota.pdf';
    if (!FILE_EXT.test(name)) throw new HttpError(400, 'Jenis fail tidak disokong. Guna PDF, Word, PowerPoint, Excel, ZIP atau gambar.');
    const meta = sanitizeMeta(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')));
    const prev = await readImage(form.get('preview'), 'Gambar pratonton');
    const id = rid(), v = Date.now().toString(36);
    const note = { ...meta, id, v, name, ext: name.split('.').pop().toLowerCase(), size: file.size, preview: !!prev, created: new Date().toISOString() };
    await env.NOTA.put('f:' + id, await file.arrayBuffer(), { metadata: { name, type: file.type || 'application/octet-stream' } });
    if (prev) await env.NOTA.put('p:' + id, prev.buf, { metadata: { type: prev.type } });
    const idx = await getIdx(env);
    idx.unshift(note);
    await putIdx(env, idx);
    return json({ ok: true, note: pub(note) }, 201, h);
  }
  if ((m = p.match(/^\/admin\/notes\/([a-z0-9]{6,20})(\/file|\/link)?$/))) {
    const idx = await getIdx(env);
    const i = idx.findIndex(n => n.id === m[1]);
    if (i < 0) throw new HttpError(404, 'Nota tidak dijumpai.');
    if (!m[2] && M === 'PATCH') {
      idx[i] = sanitizeMeta(await req.json().catch(() => ({})), idx[i]);
      await putIdx(env, idx);
      return json({ ok: true, note: pub(idx[i]) }, 200, h);
    }
    if (!m[2] && M === 'DELETE') {
      const [gone] = idx.splice(i, 1);
      await putIdx(env, idx);
      await Promise.all([env.NOTA.delete('f:' + gone.id), env.NOTA.delete('p:' + gone.id)]);
      return json({ ok: true }, 200, h);
    }
    if (m[2] === '/file' && M === 'GET')
      return fileResponse(await env.NOTA.getWithMetadata('f:' + m[1], { type: 'arrayBuffer' }), h, true, 'private, no-store');
    if (m[2] === '/link' && M === 'POST') {
      const token = rid(24);
      await env.NOTA.put('dl:' + token, m[1], { expirationTtl: LINK_TTL });
      return json({ ok: true, url: `${url.origin}/dl/${token}`, expires: new Date(Date.now() + LINK_TTL * 1000).toISOString() }, 200, h);
    }
  }
  if (p === '/admin/settings' && M === 'PUT') {
    const cfg = sanitizeSettings(await req.json().catch(() => ({})));
    await env.NOTA.put('cfg', JSON.stringify(cfg));
    return json({ ok: true, settings: cfg }, 200, h);
  }
  if (p === '/admin/qr' && M === 'PUT') {
    const type = (req.headers.get('Content-Type') || '').split(';')[0].trim();
    const img = await readImage(new Blob([await req.arrayBuffer()], { type }), 'Gambar QR');
    if (!img) throw new HttpError(400, 'Pilih gambar QR.');
    const v = Date.now().toString(36);
    await env.NOTA.put('qr', img.buf, { metadata: { type: img.type } });
    await env.NOTA.put('qrv', v);
    return json({ ok: true, qr: `/qr?v=${v}` }, 200, h);
  }
  if (p === '/admin/qr' && M === 'DELETE') {
    await Promise.all([env.NOTA.delete('qr'), env.NOTA.delete('qrv')]);
    return json({ ok: true }, 200, h);
  }
  if (p === '/admin/key' && M === 'POST') {
    const key = String((await req.json().catch(() => ({}))).key || '').trim();
    if (key.length < 12) throw new HttpError(400, 'Kunci baharu mesti sekurang-kurangnya 12 aksara.');
    await env.NOTA.put('owner', await sha256(key));
    return json({ ok: true }, 200, h);
  }
  throw new HttpError(404, 'Laluan tidak dijumpai.');
}

export default {
  async fetch(req, env) {
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    try {
      return await handle(req, env, h);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      return json({ error: status === 500 ? 'Ralat pelayan. Cuba lagi.' : err.message }, status, h);
    }
  }
};
