// Ujian pelayan nota tanpa rangkaian: node worker-nota/test.mjs
import assert from 'node:assert/strict';
import worker, { sha256, waNumber, price, sanitizeSettings } from './src/index.js';

assert.equal(waNumber('010-254 6720'), '60102546720');
assert.equal(waNumber('0176040973'), '60176040973');
assert.equal(waNumber('+60 17-604 0973'), '60176040973');
assert.equal(waNumber('abc'), '');
assert.equal(price('15.50'), 15.5);
assert.equal(price('12,9'), 12.9);
assert.equal(price('-3'), 0);
assert.deepEqual(sanitizeSettings({ wa: [{ no: '0102546720' }, { no: 'x' }] }).wa, [{ no: '60102546720', label: 'WhatsApp 1' }]);

// KV palsu dalam memori
class KV {
  constructor() { this.m = new Map(); }
  async get(k, type) { const e = this.m.get(k); if (!e) return null; if (type === 'json') return JSON.parse(e.v); return e.v; }
  async getWithMetadata(k) { const e = this.m.get(k); return e ? { value: e.v, metadata: e.meta } : { value: null, metadata: null }; }
  async put(k, v, o = {}) { this.m.set(k, { v, meta: o.metadata, ttl: o.expirationTtl }); }
  async delete(k) { this.m.delete(k); }
}
const KEY = 'kunci-ujian-panjang-123';
const env = { NOTA: new KV(), OWNER_KEY_HASH: await sha256(KEY), ALLOWED_ORIGINS: 'https://bijaklabur.my' };
const B = 'https://nota.bijaklabur.my';
const call = (path, init = {}, key) => worker.fetch(new Request(B + path, { ...init, headers: { Origin: 'https://bijaklabur.my', ...(key ? { Authorization: 'Bearer ' + key } : {}), ...(init.headers || {}) } }), env);

// Awam: kosong dengan tetapan lalai
let r = await call('/notes');
assert.equal(r.status, 200);
assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://bijaklabur.my');
let j = await r.json();
assert.deepEqual(j.notes, []);
assert.equal(j.settings.wa[0].no, '60102546720');
assert.equal(j.settings.wa[1].no, '60176040973');
assert.equal(j.settings.msg, 'Hi saya berminat nak beli nota untuk belajar');

// Pemilik: kunci salah ditolak
assert.equal((await call('/admin/check')).status, 401);
assert.equal((await call('/admin/check', {}, 'kunci-salah-sekali-123')).status, 401);
assert.equal((await call('/admin/check', {}, KEY)).status, 200);
// Had cubaan: apabila had habis, kunci yang betul pun ditolak buat sementara
env.ADMIN_LIMIT = { limit: async () => ({ success: false }) };
assert.equal((await call('/admin/check', {}, KEY)).status, 429);
delete env.ADMIN_LIMIT;

// Muat naik
const pdf = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
const form = () => {
  const f = new FormData();
  f.set('title', 'Nota HIM101 Pengenalan Halal'); f.set('code', 'him101'); f.set('price', '15'); f.set('pages', '42'); f.set('desc', 'Bab 1 hingga 5');
  f.set('file', new File([pdf], 'him101.pdf', { type: 'application/pdf' }));
  f.set('preview', new File([new Uint8Array([255, 216, 255])], 'p.jpg', { type: 'image/jpeg' }));
  return f;
};
assert.equal((await call('/admin/notes', { method: 'POST', body: form() })).status, 401);
r = await call('/admin/notes', { method: 'POST', body: form() }, KEY);
assert.equal(r.status, 201);
const note = (await r.json()).note;
assert.equal(note.code, 'HIM101');
assert.equal(note.price, 15);
assert.ok(note.preview.startsWith(`/notes/${note.id}/preview`));

// Jenis fail ditolak
const bad = form(); bad.set('file', new File([pdf], 'virus.exe'));
assert.equal((await call('/admin/notes', { method: 'POST', body: bad }, KEY)).status, 400);

// Awam melihat nota tetapi tiada fail penuh
j = await (await call('/notes')).json();
assert.equal(j.notes.length, 1);
assert.equal(j.notes[0].name, undefined);
r = await call(note.preview);
assert.equal(r.headers.get('Content-Type'), 'image/jpeg');
assert.equal((await call(`/admin/notes/${note.id}/file`)).status, 401);
r = await call(`/admin/notes/${note.id}/file`, {}, KEY);
assert.deepEqual(new Uint8Array(await r.arrayBuffer()), pdf);
assert.match(r.headers.get('Content-Disposition'), /him101\.pdf/);

// Pautan pembeli
j = await (await call(`/admin/notes/${note.id}/link`, { method: 'POST' }, KEY)).json();
const path = new URL(j.url).pathname;
r = await call(path);
assert.equal(r.status, 200);
assert.deepEqual(new Uint8Array(await r.arrayBuffer()), pdf);
assert.equal((await call('/dl/abcdefghijkmnpqrstuvwxyz23')).status, 404);

// Sunting dan sembunyi
r = await call(`/admin/notes/${note.id}`, { method: 'PATCH', body: JSON.stringify({ price: '20', hidden: true }), headers: { 'Content-Type': 'application/json' } }, KEY);
assert.equal((await r.json()).note.price, 20);
assert.equal((await (await call('/notes')).json()).notes.length, 0);
assert.equal((await (await call('/admin/notes', {}, KEY)).json()).notes.length, 1);

// Tetapan dan QR
r = await call('/admin/settings', { method: 'PUT', body: JSON.stringify({ wa: [{ no: '0102546720', label: 'Shamir' }], msg: 'Hai', payNote: 'Bayar' }) }, KEY);
assert.equal((await r.json()).settings.wa[0].label, 'Shamir');
assert.equal((await call('/admin/qr', { method: 'PUT', body: 'x', headers: { 'Content-Type': 'text/html' } }, KEY)).status, 400);
r = await call('/admin/qr', { method: 'PUT', body: new Uint8Array([137, 80, 78, 71]), headers: { 'Content-Type': 'image/png' } }, KEY);
assert.equal(r.status, 200);
j = await (await call('/notes')).json();
assert.ok(j.settings.qr.startsWith('/qr?v='));
assert.equal((await call('/qr')).headers.get('Content-Type'), 'image/png');

// Padam
assert.equal((await call(`/admin/notes/${note.id}`, { method: 'DELETE' }, KEY)).status, 200);
assert.equal(env.NOTA.m.has('f:' + note.id), false);
assert.equal(env.NOTA.m.has('p:' + note.id), false);
assert.equal((await call(note.preview)).status, 404);

// Tukar kunci
assert.equal((await call('/admin/key', { method: 'POST', body: JSON.stringify({ key: 'pendek' }) }, KEY)).status, 400);
assert.equal((await call('/admin/key', { method: 'POST', body: JSON.stringify({ key: 'kunci-baharu-yang-panjang' }) }, KEY)).status, 200);
assert.equal((await call('/admin/check', {}, KEY)).status, 401);
assert.equal((await call('/admin/check', {}, 'kunci-baharu-yang-panjang')).status, 200);

// Tanpa KV
assert.equal((await worker.fetch(new Request(B + '/notes'), {})).status, 503);

console.log('Semua ujian pelayan nota lulus.');
