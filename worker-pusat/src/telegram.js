// Bot API Telegram: hantar mesej (dipecah 4000 aksara), tindakan "menaip", pasang webhook. Teks biasa sahaja (tiada Markdown) supaya
// jawapan yang mengandungi simbol tidak ditolak oleh Telegram.
const API = 'https://api.telegram.org/bot';
export const MAX_MESEJ = 4000;

export async function sha256hex(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
}
/** Rahsia webhook diterbitkan daripada token bot, jadi tiada rahsia tambahan perlu disimpan */
export const webhookSecret = env => sha256hex(`${env.TELEGRAM_BOT_TOKEN}:webhook`);
/** Perbandingan rentetan rahsia tanpa kebocoran masa (bandingkan cincang, bukan rentetan asal) */
export async function samaRahsia(a, b) {
  if (!a || !b) return false;
  const [x, y] = await Promise.all([sha256hex(String(a)), sha256hex(String(b))]);
  return x === y;
}

async function panggil(env, kaedah, data) {
  const r = await fetch(`${API}${env.TELEGRAM_BOT_TOKEN}/${kaedah}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(15000)
  });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) console.log('telegram', kaedah, r.status, String(d.description || '').slice(0, 160));
  return d;
}

/** Pecah teks panjang pada sempadan baris supaya setiap mesej di bawah had Telegram */
export function pecah(teks, had = MAX_MESEJ) {
  const out = [];
  let s = String(teks || '').trim() || '(tiada jawapan)';
  while (s.length > had) {
    let i = s.lastIndexOf('\n', had); if (i < had * 0.5) i = s.lastIndexOf(' ', had); if (i < had * 0.5) i = had;
    out.push(s.slice(0, i).trim()); s = s.slice(i).trim();
  }
  out.push(s);
  return out;
}

export async function hantar(env, chatId, teks, extra = {}) {
  let last;
  for (const bahagian of pecah(teks)) last = await panggil(env, 'sendMessage', { chat_id: chatId, text: bahagian, disable_web_page_preview: true, ...extra });
  return last;
}
export const menaip = (env, chatId) => panggil(env, 'sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});

/** Daftar webhook ke pelayan ini. url = asal pelayan (cth. https://pusat.bijaklabur.my) */
export async function pasangWebhook(env, asal) {
  return panggil(env, 'setWebhook', { url: `${asal}/telegram`, secret_token: await webhookSecret(env), allowed_updates: ['message'], max_connections: 10 });
}
export async function statusBot(env) {
  const [me, wh] = await Promise.all([panggil(env, 'getMe', {}), panggil(env, 'getWebhookInfo', {})]);
  return { nama: me.ok ? me.result.username : '', webhook: wh.ok ? wh.result.url : '', belum: wh.ok ? wh.result.pending_update_count : 0, ralat: wh.ok ? (wh.result.last_error_message || '') : String(me.description || '') };
}
