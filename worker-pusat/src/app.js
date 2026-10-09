/*
 * Bijak Labur: Pusat Kawalan (Cloudflare Worker)
 *
 * Awam (asal laman sahaja):
 *   POST /denyut {sid, laman, peranti, rujukan}   denyut pelawat tanpa nama -> { kini }
 *   GET  /                                          { ok, telegram, agen }
 * Daripada worker-fiqh (Authorization: Bearer PUSAT_SECRET):
 *   POST /catat [{laluan, penyedia, model, masuk, keluar, cache, ms, ok}]
 * Pemilik (Authorization: Bearer <kunci pemilik>, disahkan oleh pelayan nota):
 *   GET  /papan            data penuh         POST /papan/tiket -> { tiket }   GET /papan/ws?tiket=   WebSocket langsung
 *   POST /papan/arahan {teks}                 jawapan agen (sama seperti Telegram)
 *   GET  /telegram/status  POST /telegram/pasang   daftar webhook bot
 * Telegram (X-Telegram-Bot-Api-Secret-Token):
 *   POST /telegram         webhook kemas kini
 * Cron: semak kesihatan setiap 15 minit (amaran Telegram apabila rosak/pulih), laporan harian jam 08:00 Malaysia.
 */
import { jawab, semakKesihatan, laporan, penyediaAgen, BANTUAN } from './agen.js';
import { hantar, menaip, pasangWebhook, statusBot, webhookSecret, samaRahsia } from './telegram.js';
export { AKTIF_SAAT } from './pusat.js';

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'cache-control': 'no-store', ...headers } });
const stubOf = env => env.PUSAT.get(env.PUSAT.idFromName('pusat'));
const ip = req => req.headers.get('cf-connecting-ip') || 'x';

function cors(req, env) {
  const origin = req.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return {};
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, authorization', 'access-control-max-age': '86400', vary: 'origin' };
}
async function badan(req, max = 20000) {
  if (+(req.headers.get('content-length') || 0) > max) return null;
  const t = await req.text();
  if (t.length > max) return null;
  try { return JSON.parse(t); } catch { return null; }
}

/** Kunci pemilik disahkan oleh pelayan nota (sumber tunggal), dengan had kadar bagi setiap IP */
export async function isOwner(req, env) {
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer\s+.{12,200}$/.test(auth) || !env.NOTA_SVC) return false;
  if (env.PAPAN_LIMIT) { const { success } = await env.PAPAN_LIMIT.limit({ key: ip(req) }); if (!success) return false; }
  try {
    const r = await env.NOTA_SVC.fetch('https://nota/admin/check', { headers: { Authorization: auth, 'cf-connecting-ip': ip(req) } });
    return r.status === 200;
  } catch { return false; }
}
/** Sahkan kunci pemilik yang diberi sebagai teks (untuk /mula <kunci> di Telegram) */
async function kunciOk(env, kunci) {
  if (!env.NOTA_SVC || !kunci || kunci.length < 12) return false;
  try { return (await env.NOTA_SVC.fetch('https://nota/admin/check', { headers: { Authorization: `Bearer ${kunci}` } })).status === 200; } catch { return false; }
}

/* ---------- Peranti daripada User-Agent (kategori sahaja, UA tidak disimpan) ---------- */
export function peranti(ua = '', asal = '') {
  if (/^capacitor:/.test(asal) || /BijakLaburApp/i.test(ua)) return 'app';
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|Android/i.test(ua)) return 'telefon';
  return 'komputer';
}

/* ---------- Telegram ---------- */
async function chatPemilik(env, stub) {
  if (env.TELEGRAM_CHAT_ID) return String(env.TELEGRAM_CHAT_ID);
  const t = await (await stub.fetch('https://pusat/tetapan')).json();
  return t.chat_id ? String(t.chat_id) : '';
}
export async function prosesTelegram(env, upd) {
  const msg = upd.message || upd.edited_message;
  if (!msg || !msg.chat || typeof msg.text !== 'string') return;
  const chat = String(msg.chat.id), stub = stubOf(env);
  const pemilik = await chatPemilik(env, stub);
  // Berpasangan: /mula <kunci pemilik> (sekali), dihadkan 5 cubaan sejam
  const m = msg.text.match(/^\/(?:mula|start)(?:@\w+)?\s+(\S{12,200})\s*$/);
  if (m) {
    const t = await (await stub.fetch('https://pusat/tetapan')).json();
    const c = t.mula_cubaan && t.mula_cubaan.t > Date.now() / 1000 - 3600 ? t.mula_cubaan : { n: 0, t: Math.floor(Date.now() / 1000) };
    if (c.n >= 5) { await hantar(env, chat, 'Terlalu banyak cubaan. Cuba lagi sejam kemudian.'); return; }
    await stub.fetch('https://pusat/tetapan', { method: 'POST', body: JSON.stringify({ mula_cubaan: { n: c.n + 1, t: c.t } }) });
    if (!(await kunciOk(env, m[1]))) { await hantar(env, chat, 'Kunci pemilik salah.'); return; }
    if (env.TELEGRAM_CHAT_ID && pemilik !== chat) { await hantar(env, chat, 'Pemilik bot ini sudah ditetapkan melalui rahsia TELEGRAM_CHAT_ID.'); return; }
    await stub.fetch('https://pusat/tetapan', { method: 'POST', body: JSON.stringify({ chat_id: chat, mula_cubaan: null }) });
    await stub.fetch('https://pusat/peristiwa', { method: 'POST', body: JSON.stringify({ jenis: 'telegram', teks: `Pemilik berpasangan (${msg.from && msg.from.first_name ? msg.from.first_name : 'Telegram'})` }) });
    await hantar(env, chat, `Berpasangan. Salam ${msg.from && msg.from.first_name ? msg.from.first_name : ''}, saya agen Pusat Kawalan Bijak Labur.\n\n${BANTUAN}`);
    return;
  }
  if (!pemilik || pemilik !== chat) {
    if (/^\/(start|mula)/.test(msg.text)) await hantar(env, chat, 'Bot ini khas untuk pemilik Bijak Labur. Pemilik: hantar /mula <kunci pemilik> untuk berpasangan.');
    return;
  }
  await menaip(env, chat);
  const { jawapan } = await jawab(env, stub, msg.text, 'telegram');
  await hantar(env, chat, jawapan);
}

/* ---------- Cron ---------- */
export async function kerjaBerjadual(env, bila = new Date()) {
  const stub = stubOf(env);
  const sihat = await semakKesihatan(env);
  const { peralihan } = await (await stub.fetch('https://pusat/kesihatan', { method: 'POST', body: JSON.stringify(sihat) })).json();
  const tetapan = await (await stub.fetch('https://pusat/tetapan')).json();
  const chat = env.TELEGRAM_BOT_TOKEN ? await chatPemilik(env, stub) : '';
  if (chat && tetapan.amaran !== false) for (const p of peralihan) await hantar(env, chat, p.ok ? `✅ ${p.nama} pulih (rosak ${Math.round(p.lama / 60)} minit).` : `🔴 ${p.nama} rosak: ${p.nota}\nSaya semak semula setiap 15 minit dan beritahu apabila pulih.`);
  // Laporan harian pada larian pertama selepas 00:00 UTC (08:00 Malaysia)
  if (chat && tetapan.laporan !== false && bila.getUTCHours() === 0 && bila.getUTCMinutes() < 15) {
    await hantar(env, chat, await laporan(env, stub));
    await stub.fetch('https://pusat/peristiwa', { method: 'POST', body: JSON.stringify({ jenis: 'laporan', teks: 'Laporan harian dihantar ke Telegram' }) });
  }
  return { sihat, peralihan };
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), p = url.pathname, h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    try {
      const stub = stubOf(env);
      if (p === '/' && req.method === 'GET') return json({ ok: true, service: 'bijak-labur-pusat', telegram: !!env.TELEGRAM_BOT_TOKEN, agen: penyediaAgen(env) || 'arahan pantas sahaja', catat: !!env.PUSAT_SECRET }, 200, h);

      if (p === '/denyut' && req.method === 'POST') {
        if (!h['access-control-allow-origin']) return json({ error: 'Tidak dibenarkan.' }, 403, h);
        if (env.DENYUT_LIMIT) { const { success } = await env.DENYUT_LIMIT.limit({ key: ip(req) }); if (!success) return json({ error: 'Terlalu kerap.' }, 429, h); }
        const b = await badan(req, 2000); if (!b) return json({ error: 'Permintaan tidak sah.' }, 400, h);
        const negara = (req.cf && req.cf.country) || req.headers.get('cf-ipcountry') || '??';
        const d = await (await stub.fetch('https://pusat/denyut', { method: 'POST', body: JSON.stringify({ sid: b.sid, laman: b.laman, rujukan: b.rujukan, negara, peranti: peranti(req.headers.get('user-agent') || '', req.headers.get('origin') || '') }) })).json();
        return json({ kini: d.kini }, 200, h);
      }

      if (p === '/catat' && req.method === 'POST') {
        const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
        if (!env.PUSAT_SECRET || !(await samaRahsia(auth, env.PUSAT_SECRET))) return json({ error: 'Tidak dibenarkan.' }, 401);
        const b = await badan(req, 60000); if (!b) return json({ error: 'Permintaan tidak sah.' }, 400);
        return json(await (await stub.fetch('https://pusat/catat', { method: 'POST', body: JSON.stringify(b) })).json());
      }

      if (p === '/telegram' && req.method === 'POST') {
        if (!env.TELEGRAM_BOT_TOKEN) return json({ error: 'Telegram belum diaktifkan.' }, 503);
        if (!(await samaRahsia(req.headers.get('x-telegram-bot-api-secret-token'), await webhookSecret(env)))) return json({ error: 'Tidak dibenarkan.' }, 401);
        const upd = await badan(req, 100000); if (!upd) return json({ ok: true });
        // Jawab Telegram serta-merta; agen berjalan di latar (Telegram menghantar semula jika webhook lambat)
        const kerja = prosesTelegram(env, upd).catch(e => console.log('telegram ralat', e && e.stack || e));
        if (ctx && ctx.waitUntil) ctx.waitUntil(kerja); else await kerja;
        return json({ ok: true });
      }

      if (p.startsWith('/papan') || p.startsWith('/telegram/')) {
        if (!h['access-control-allow-origin'] && req.headers.get('origin')) return json({ error: 'Tidak dibenarkan.' }, 403, h);
        if (p === '/papan/ws') {
          // Tiket 60 saat yang dikeluarkan kepada pemilik, kerana pelayar tidak boleh menghantar pengepala pada WebSocket
          return stub.fetch(new Request(`https://pusat/ws?tiket=${encodeURIComponent(url.searchParams.get('tiket') || '')}`, req));
        }
        if (!(await isOwner(req, env))) return json({ error: 'Kunci pemilik salah.' }, 401, h);
        if (p === '/papan' && req.method === 'GET') {
          const d = await (await stub.fetch('https://pusat/papan')).json();
          return json({ ...d, agen: penyediaAgen(env) || '', telegram: !!env.TELEGRAM_BOT_TOKEN, catat: !!env.PUSAT_SECRET, kadarMYR: +env.KADAR_MYR || 4.3, github: !!env.GH_TOKEN, analitik: !!(env.CF_ANALYTICS_TOKEN && env.CF_ACCOUNT_ID) }, 200, h);
        }
        if (p === '/papan/tiket' && req.method === 'POST') return json(await (await stub.fetch('https://pusat/tiket', { method: 'POST', body: '{}' })).json(), 200, h);
        if (p === '/papan/arahan' && req.method === 'POST') {
          const b = await badan(req, 5000); if (!b || typeof b.teks !== 'string') return json({ error: 'Permintaan tidak sah.' }, 400, h);
          return json(await jawab(env, stub, b.teks, 'papan'), 200, h);
        }
        if (p === '/papan/kesihatan' && req.method === 'POST') { const s = await semakKesihatan(env); await stub.fetch('https://pusat/kesihatan', { method: 'POST', body: JSON.stringify(s) }); return json(s, 200, h); }
        if (p === '/telegram/status' && req.method === 'GET') {
          if (!env.TELEGRAM_BOT_TOKEN) return json({ aktif: false }, 200, h);
          const s = await statusBot(env);
          return json({ aktif: true, ...s, berpasangan: !!(await chatPemilik(env, stub)), webhookBetul: s.webhook === `${url.origin}/telegram` }, 200, h);
        }
        if (p === '/telegram/pasang' && req.method === 'POST') {
          if (!env.TELEGRAM_BOT_TOKEN) return json({ error: 'TELEGRAM_BOT_TOKEN belum ditetapkan.' }, 503, h);
          const d = await pasangWebhook(env, url.origin);
          return json({ ok: !!d.ok, nota: d.description || '' }, d.ok ? 200 : 502, h);
        }
      }
      return json({ error: 'Tidak dijumpai' }, 404, h);
    } catch (e) {
      console.log('ralat', e && e.stack || e);
      return json({ error: 'Ralat pelayan. Cuba lagi sebentar.' }, 500, h);
    }
  },
  async scheduled(ev, env, ctx) {
    ctx.waitUntil(kerjaBerjadual(env, new Date(ev.scheduledTime || Date.now())).catch(e => console.log('cron ralat', e && e.stack || e)));
  }
};
