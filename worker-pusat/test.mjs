// Ujian Pusat Kawalan tanpa rangkaian: node worker-pusat/test.mjs
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker, { peranti, kerjaBerjadual, prosesTelegram } from './src/app.js';
import { Pusat, hariMY } from './src/pusat.js';
import { pecah, webhookSecret, samaRahsia } from './src/telegram.js';
import { ALAT, alatGemini, alatClaude, arahanPantas, jawab, namaLaluan } from './src/agen.js';

/* ---------- Durable Object palsu (SQLite dalam memori) ---------- */
const db = new DatabaseSync(':memory:');
const sql = { exec: (q, ...b) => { if (!b.length && /;\s*\S/.test(q)) { db.exec(q); return { toArray: () => [] }; } const rows = /^\s*(SELECT|WITH)/i.test(q) ? db.prepare(q).all(...b) : (db.prepare(q).run(...b), []); return { toArray: () => rows.map(r => ({ ...r })) }; } };
const KEY = 'kunci-pemilik-ujian-123456';
const SECRET = 'rahsia-kongsi-ujian-abcdef';
const env = {
  ALLOWED_ORIGINS: 'https://bijaklabur.my,capacitor://localhost', SITE_URL: 'https://bijaklabur.my', REPO: 'shamirAI-RGB/bijak-labur',
  KOS_CLAUDE_MASUK: '5', KOS_CLAUDE_KELUAR: '25', KADAR_MYR: '4.3', AGEN_MODEL: 'model-ujian', AGEN_GEMINI_MODEL: 'gemini-ujian',
  PUSAT_SECRET: SECRET, TELEGRAM_BOT_TOKEN: '123:ABC',
  NOTA_SVC: { fetch: async (u, init) => new Response('{}', { status: (init.headers.Authorization || init.headers.authorization) === 'Bearer ' + KEY ? 200 : 401 }) }
};
let obj = null;
env.PUSAT = { idFromName: n => n, get: () => ({ fetch: (u, init) => (obj = obj || new Pusat({ storage: { sql }, getWebSockets: () => [] }, env)).fetch(u instanceof Request ? u : new Request(u, init)) }) };
const B = 'https://pusat.bijaklabur.my';
const ctx = { waitUntil: p => { tunggu.push(p); } };
let tunggu = [];
const call = (path, init = {}, origin = 'https://bijaklabur.my', e = env) => worker.fetch(new Request(B + path, { ...init, headers: { ...(origin ? { origin } : {}), 'content-type': 'application/json', ...(init.headers || {}) } }), e, ctx);
const post = (path, body, extra = {}, origin) => call(path, { method: 'POST', body: JSON.stringify(body), ...extra }, origin);

/* ---------- Rangkaian palsu ---------- */
const dihantar = [];   // mesej Telegram
let sihatOk = true, claudeJawab = null, geminiJawab = null, github = {};
globalThis.fetch = async (u, init = {}) => {
  u = String(u);
  if (u.includes('api.telegram.org')) { const b = JSON.parse(init.body); if (u.endsWith('/sendMessage')) dihantar.push(b.text); return new Response(JSON.stringify({ ok: true, result: u.endsWith('/getMe') ? { username: 'BijakLaburBot' } : u.endsWith('/getWebhookInfo') ? { url: B + '/telegram', pending_update_count: 0 } : true })); }
  if (u.includes('api.github.com')) { const p = new URL(u).pathname; if (init.method === 'POST' && /\/issues$/.test(p)) { github.issue = JSON.parse(init.body); return new Response(JSON.stringify({ number: 77, html_url: 'https://github.com/x/77' }), { status: 201 }); } if (/\/labels$/.test(p)) return new Response('{}', { status: 201 }); if (/\/pulls/.test(p)) return new Response(JSON.stringify([{ number: 5, title: 'Ujian PR', user: { login: 'claude' }, draft: false, updated_at: new Date().toISOString(), html_url: 'https://github.com/x/5' }])); if (/\/actions\/runs/.test(p)) return new Response(JSON.stringify({ workflow_runs: [{ name: 'Pemantau', head_branch: 'main', conclusion: 'success', updated_at: new Date().toISOString(), html_url: 'u' }] })); return new Response('[]'); }
  if (u.includes('api.anthropic.com')) { const body = JSON.parse(init.body); let out; try { out = claudeJawab(body); } catch (e) { if (e.code === 'ERR_ASSERTION') console.error('mock Claude:', e.message); throw e; } return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json' } }); }
  if (u.includes('generativelanguage.googleapis.com')) { const body = JSON.parse(init.body); return new Response(JSON.stringify(geminiJawab(body))); }
  // Perkhidmatan yang disemak kesihatannya
  if (!sihatOk) return new Response('rosak', { status: 503 });
  if (u === 'https://bijaklabur.my/') return new Response('<title>Bijak Labur</title>');
  if (u.includes('/notes')) return new Response('{"notes":[]}');
  return new Response('{"ok":true}');
};

/* ---------- Utiliti ---------- */
assert.equal(peranti('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'telefon');
assert.equal(peranti('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'komputer');
assert.equal(peranti('Mozilla/5.0 (Linux; Android 14; SM-X900)'), 'tablet');
assert.equal(peranti('x', 'capacitor://localhost'), 'app');
assert.deepEqual(pecah('a\n'.repeat(3000), 4000).every(s => s.length <= 4000), true);
assert.equal(pecah('pendek').length, 1);
assert.equal(await samaRahsia('abc', 'abc'), true);
assert.equal(await samaRahsia('abc', 'abd'), false);
assert.equal(await samaRahsia('', ''), false);
assert.match(await webhookSecret(env), /^[0-9a-f]{64}$/);
assert.equal(namaLaluan('/tanya'), 'Tanya AI Fiqh');
assert.equal(hariMY(0), '1970-01-01');
// Skema alat: Gemini tidak menerima "properties" kosong; Claude memerlukan input_schema pada setiap alat
for (const a of alatGemini().functionDeclarations) if (a.parameters) assert.ok(Object.keys(a.parameters.properties).length);
assert.equal(alatClaude().length, ALAT.length);
alatClaude().forEach(a => assert.equal(a.input_schema.type, 'object'));

/* ---------- Awam ---------- */
let r = await call('/');
let j = await r.json();
assert.equal(r.status, 200); assert.equal(j.ok, true); assert.equal(j.telegram, true); assert.equal(j.catat, true);

// Denyut: asal asing ditolak; sid tidak sah diabaikan; sesi dikira sekali sahaja
assert.equal((await post('/denyut', { sid: 'abcdefgh1234', laman: 'utama' }, {}, 'https://jahat.example')).status, 403);
r = await post('/denyut', { sid: 'abcdefgh1234', laman: 'utama' }); j = await r.json();
assert.equal(r.status, 200); assert.equal(j.kini, 1);
assert.equal((await (await post('/denyut', { sid: 'abcdefgh1234', laman: 'solat' })).json()).kini, 1);
assert.equal((await (await post('/denyut', { sid: 'sesi-kedua-5678', laman: 'pasaran<script>' })).json()).kini, 2);
assert.equal((await (await post('/denyut', { sid: 'x', laman: 'utama' })).json()).kini, 2, 'sid tidak sah diabaikan');
env.DENYUT_LIMIT = { limit: async () => ({ success: false }) };
assert.equal((await post('/denyut', { sid: 'abcdefgh1234', laman: 'utama' })).status, 429);
delete env.DENYUT_LIMIT;

/* ---------- Catat token (worker-fiqh) ---------- */
assert.equal((await post('/catat', [{ laluan: '/tanya' }], {}, null)).status, 401);
assert.equal((await post('/catat', [{ laluan: '/tanya' }], { headers: { authorization: 'Bearer salah' } }, null)).status, 401);
r = await post('/catat', [
  { laluan: '/tanya', penyedia: 'gemini', model: 'g', masuk: 1200, keluar: 300, ms: 2100, ok: true },
  { laluan: '/semak', penyedia: 'claude', model: 'c', masuk: 1_000_000, keluar: 100_000, cache: 0, ms: 9000, ok: true },
  { laluan: '/kalori', penyedia: 'groq', masuk: 10, keluar: 5, ok: false }
], { headers: { authorization: 'Bearer ' + SECRET } }, null);
j = await r.json(); assert.equal(r.status, 200); assert.equal(j.n, 3);

/* ---------- Papan pemilik ---------- */
assert.equal((await call('/papan')).status, 401);
assert.equal((await call('/papan', { headers: { authorization: 'Bearer kunci-salah-panjang-123' } })).status, 401);
r = await call('/papan', { headers: { authorization: 'Bearer ' + KEY } }); j = await r.json();
assert.equal(r.status, 200);
assert.equal(j.kini, 2); assert.equal(j.pelawatHari, 2); assert.equal(j.paparanHari, 3, 'tukar halaman dikira sebagai paparan'); assert.equal(j.puncakHari, 2);
assert.equal(j.token.hari.panggilan, 3); assert.equal(j.token.hari.gagal, 1); assert.equal(j.token.hari.masuk, 1_001_210); assert.equal(j.token.hari.keluar, 100_305);
assert.equal(+j.token.hari.kos.toFixed(2), 7.5, 'kos Claude: 1 juta masuk x USD5 + 100k keluar x USD25');
assert.equal(j.tokenPenyedia.find(x => x.penyedia === 'gemini').kos, 0, 'Gemini percuma');
assert.deepEqual(j.lamanKini.map(x => x.laman).sort(), ['pasaranscript', 'solat']);
assert.equal(j.siriHari.length, 1); assert.equal(j.tokenSiri[0].panggilan, 3);
assert.equal(j.tetapan.amaran, true); assert.equal(j.agen, ''); assert.equal(j.kadarMYR, 4.3);
// Tiket WebSocket dikeluarkan kepada pemilik; tanpa naik taraf WebSocket, tiket sah sekalipun ditolak dengan 426
r = await post('/papan/tiket', {}, { headers: { authorization: 'Bearer ' + KEY } }); j = await r.json();
assert.match(j.tiket, /^[0-9a-f]{36}$/);
assert.equal((await call('/papan/ws?tiket=' + j.tiket)).status, 426);
assert.equal((await call('/papan/ws?tiket=palsu')).status, 401);
// Had kadar pemilik: kunci betul pun ditolak buat sementara
env.PAPAN_LIMIT = { limit: async () => ({ success: false }) };
assert.equal((await call('/papan', { headers: { authorization: 'Bearer ' + KEY } })).status, 401);
delete env.PAPAN_LIMIT;

// Arahan pantas melalui papan (tanpa AI)
r = await post('/papan/arahan', { teks: '/stat' }, { headers: { authorization: 'Bearer ' + KEY } }); j = await r.json();
assert.match(j.jawapan, /Sedang melayari: 2/); assert.equal(j.penyedia, '');
j = await (await post('/papan/arahan', { teks: '/token' }, { headers: { authorization: 'Bearer ' + KEY } })).json();
assert.match(j.jawapan, /Tanya AI Fiqh: 1,500 token/); assert.match(j.jawapan, /USD 7\.50/);
j = await (await post('/papan/arahan', { teks: 'berapa pelawat?' }, { headers: { authorization: 'Bearer ' + KEY } })).json();
assert.match(j.jawapan, /belum diaktifkan/);
j = await (await post('/papan/arahan', { teks: '/pr' }, { headers: { authorization: 'Bearer ' + KEY } })).json();
assert.match(j.jawapan, /#5 Ujian PR/);
j = await (await post('/papan/arahan', { teks: '/sihat' }, { headers: { authorization: 'Bearer ' + KEY } })).json();
assert.equal((j.jawapan.match(/✅/g) || []).length, 5);
j = await (await post('/papan/arahan', { teks: '/amaran off' }, { headers: { authorization: 'Bearer ' + KEY } })).json();
assert.match(j.jawapan, /dimatikan/);
assert.equal((await (await call('/papan', { headers: { authorization: 'Bearer ' + KEY } })).json()).tetapan.amaran, false);
await post('/papan/arahan', { teks: '/amaran on' }, { headers: { authorization: 'Bearer ' + KEY } });
// Status Telegram untuk papan
j = await (await call('/telegram/status', { headers: { authorization: 'Bearer ' + KEY } })).json();
assert.equal(j.nama, 'BijakLaburBot'); assert.equal(j.berpasangan, false); assert.equal(j.webhookBetul, true);
j = await (await post('/telegram/pasang', {}, { headers: { authorization: 'Bearer ' + KEY } })).json();
assert.equal(j.ok, true);

/* ---------- Telegram webhook ---------- */
const tg = async (text, chat = 100, extra = {}) => {
  const r = await worker.fetch(new Request(B + '/telegram', { method: 'POST', headers: { 'content-type': 'application/json', ...extra }, body: JSON.stringify({ message: { chat: { id: chat }, from: { first_name: 'Shamir' }, text } }) }), env, ctx);
  await Promise.all(tunggu.splice(0));
  return r.status;
};
const S = { 'x-telegram-bot-api-secret-token': await webhookSecret(env) };
assert.equal(await tg('/stat'), 401, 'tanpa rahsia webhook');
assert.equal(await tg('/stat', 100, { 'x-telegram-bot-api-secret-token': 'salah' }), 401);
dihantar.length = 0;
assert.equal(await tg('/stat', 100, S), 200);
assert.equal(dihantar.length, 0, 'sembang tidak dikenali: senyap');
await tg('/start', 100, S);
assert.match(dihantar.pop(), /khas untuk pemilik/);
await tg('/mula kunci-salah-panjang-123', 100, S);
assert.match(dihantar.pop(), /Kunci pemilik salah/);
await tg('/mula ' + KEY, 100, S);
assert.match(dihantar.pop(), /Berpasangan/);
await tg('/stat', 100, S);
assert.match(dihantar.pop(), /Sedang melayari/);
await tg('/stat', 200, S);
assert.equal(dihantar.length, 0, 'sembang lain masih ditolak selepas berpasangan');
// Mesej panjang dipecah
await tg('/token', 100, S); dihantar.length = 0;
// Had cubaan berpasangan
for (let i = 0; i < 6; i++) await tg('/mula kunci-salah-panjang-123', 300, S);
assert.match(dihantar.pop(), /Terlalu banyak cubaan/);
dihantar.length = 0;

/* ---------- Agen Claude (alat -> jawapan) ---------- */
env.ANTHROPIC_API_KEY = 'sk-ujian';
let pusingan = 0;
claudeJawab = body => {
  assert.equal(body.model, 'model-ujian'); assert.ok(Array.isArray(body.tools) && body.tools.length === ALAT.length); assert.equal(body.thinking.type, 'adaptive');
  assert.equal(body.messages[0].role, 'user');
  const akhir = body.messages[body.messages.length - 1];
  if (akhir.role === 'user' && Array.isArray(akhir.content) && akhir.content[0].type === 'tool_result') {
    const hasil = JSON.parse(akhir.content[0].content);
    pusingan++;
    if (hasil.pelawatSedangMelayari !== undefined) return { model: 'model-ujian', stop_reason: 'tool_use', usage: { input_tokens: 50, output_tokens: 20 }, content: [{ type: 'tool_use', id: 'b', name: 'buka_issue', input: { tajuk: 'Tambah mod gelap automatik', badan: 'Ikut waktu solat' } }] };
    return { model: 'model-ujian', stop_reason: 'end_turn', usage: { input_tokens: 60, output_tokens: 30 }, content: [{ type: 'text', text: hasil.no === 77 ? 'Sedang melayari 2; issue #77 dibuka' : `Tidak dapat buka issue: ${hasil.error}` }] };
  }
  return { model: 'model-ujian', stop_reason: 'tool_use', usage: { input_tokens: 100, output_tokens: 10, cache_read_input_tokens: 400 }, content: [{ type: 'thinking', thinking: 'x', signature: 's' }, { type: 'tool_use', id: 'a', name: 'statistik', input: {} }] };
};
await tg('Berapa pelawat sekarang, dan tambah mod gelap automatik ikut waktu solat', 100, S);
assert.match(dihantar.pop(), /GH_TOKEN belum ditetapkan/);
assert.equal(pusingan, 2);
assert.equal(github.issue, undefined, 'tanpa GH_TOKEN issue tidak dibuka');
env.GH_TOKEN = 'ghp_ujian'; pusingan = 0;
await tg('Buat lagi', 100, S);
assert.match(dihantar.pop(), /issue #77 dibuka/);
assert.equal(github.issue.title, 'Tambah mod gelap automatik'); assert.deepEqual(github.issue.labels, ['arahan']); assert.match(github.issue.body, /Ikut waktu solat/);
j = await (await call('/papan', { headers: { authorization: 'Bearer ' + KEY } })).json();
const agen = j.tokenLaluan.find(x => x.laluan === '/agen');
assert.equal(agen.penyedia === undefined ? agen.panggilan : agen.panggilan, 2); assert.equal(agen.masuk, 420); assert.equal(agen.keluar, 120);
assert.ok(j.sembang.length >= 4, 'ingatan sembang disimpan'); assert.equal(j.sembang[j.sembang.length - 1].peran, 'agen');
assert.ok(j.peristiwa.some(p => p.jenis === 'issue' && /#77/.test(p.teks)));
// Ingatan dihantar sebagai sejarah; giliran berselang
claudeJawab = body => { assert.ok(body.messages.length >= 3); for (let i = 1; i < body.messages.length; i++) assert.notEqual(body.messages[i].role, body.messages[i - 1].role); return { model: 'm', stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'Baik.' }] }; };
j = await (await post('/papan/arahan', { teks: 'terima kasih' }, { headers: { authorization: 'Bearer ' + KEY } })).json();
assert.equal(j.jawapan, 'Baik.'); assert.equal(j.penyedia, 'claude');
// Ralat API: jawapan sopan, arahan pantas kekal
claudeJawab = () => { throw new Error('putus'); };
j = await (await post('/papan/arahan', { teks: 'apa khabar' }, { headers: { authorization: 'Bearer ' + KEY } })).json();
assert.match(j.jawapan, /tidak dapat menjawab sekarang/);
delete env.ANTHROPIC_API_KEY;

/* ---------- Agen Gemini (pemanggilan fungsi) ---------- */
env.GEMINI_API_KEY = 'g-ujian';
geminiJawab = body => {
  assert.ok(body.tools[0].functionDeclarations.length === ALAT.length);
  const akhir = body.contents[body.contents.length - 1];
  if (akhir.parts[0].functionResponse) { assert.equal(akhir.parts[0].functionResponse.name, 'github'); return { usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 10 }, candidates: [{ content: { parts: [{ text: `PR terbuka: ${akhir.parts[0].functionResponse.response.hasil[0].tajuk}` }] } }] }; }
  return { usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 5 }, candidates: [{ content: { parts: [{ functionCall: { name: 'github', args: { jenis: 'pr' } } }] } }] };
};
j = await (await post('/papan/arahan', { teks: 'ada PR terbuka?' }, { headers: { authorization: 'Bearer ' + KEY } })).json();
assert.equal(j.jawapan, 'PR terbuka: Ujian PR'); assert.equal(j.penyedia, 'gemini'); assert.deepEqual(j.alat, ['github']);
delete env.GEMINI_API_KEY;

/* ---------- Cron: amaran selepas 2 kegagalan berturut, pulih sekali ---------- */
dihantar.length = 0;
sihatOk = false;
let k = await kerjaBerjadual(env, new Date('2026-10-09T03:00:00Z'));
assert.equal(k.peralihan.length, 0, 'kegagalan pertama: belum amaran');
k = await kerjaBerjadual(env, new Date('2026-10-09T03:15:00Z'));
assert.equal(k.peralihan.length, 5); assert.equal(dihantar.length, 5); assert.match(dihantar[0], /🔴 .* rosak/);
k = await kerjaBerjadual(env, new Date('2026-10-09T03:30:00Z'));
assert.equal(dihantar.length, 5, 'tiada amaran berulang');
sihatOk = true;
k = await kerjaBerjadual(env, new Date('2026-10-09T03:45:00Z'));
assert.equal(k.peralihan.filter(p => p.ok).length, 5); assert.match(dihantar[dihantar.length - 1], /pulih/);
// Laporan harian pada 00:0x UTC sahaja
dihantar.length = 0;
await kerjaBerjadual(env, new Date('2026-10-09T00:05:00Z'));
assert.equal(dihantar.length, 1); assert.match(dihantar[0], /Laporan Bijak Labur 2026-10-09/); assert.match(dihantar[0], /Kesihatan/);
await kerjaBerjadual(env, new Date('2026-10-09T01:05:00Z'));
assert.equal(dihantar.length, 1);
// Amaran dimatikan: tiada mesej
await post('/papan/arahan', { teks: '/amaran off' }, { headers: { authorization: 'Bearer ' + KEY } });
sihatOk = false; dihantar.length = 0;
await kerjaBerjadual(env, new Date('2026-10-09T04:00:00Z')); await kerjaBerjadual(env, new Date('2026-10-09T04:15:00Z'));
assert.equal(dihantar.length, 0);
sihatOk = true;

// Tanpa token Telegram, webhook 503 dan cron senyap
const env2 = { ...env, TELEGRAM_BOT_TOKEN: '' };
assert.equal((await worker.fetch(new Request(B + '/telegram', { method: 'POST', body: '{}' }), env2, ctx)).status, 503);
assert.equal((await (await worker.fetch(new Request(B + '/'), env2, ctx)).json()).telegram, false);
console.log('worker-pusat: semua ujian lulus');
