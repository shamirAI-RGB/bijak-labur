// Ujian pelayan Tanya AI Fiqh tanpa rangkaian: node worker-fiqh/test.mjs
import assert from 'node:assert/strict';
import worker, { verify, collectRetrieved, norm, normUrl, parseAnswer, MODEL, DOMAINS } from './src/index.js';
import { BY_ID, CORPUS_TEXT } from './src/corpus.js';

const env = { ANTHROPIC_API_KEY: 'sk-test', ALLOWED_ORIGINS: 'https://bijaklabur.my' };
const W = 'https://fiqh.example.workers.dev';
const call = (body, origin = 'https://bijaklabur.my', e = env) =>
  worker.fetch(new Request(W + '/tanya', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }), e);

// Korpus dibina daripada js/fiqh-data.js
assert.ok(BY_ID.has('fatwa:mkiForex'));
assert.ok(BY_ID.has('kitab:fathqarib:142'));
assert.ok(BY_ID.has('masalah:muamalat/riba'));
assert.ok(CORPUS_TEXT.includes('https://shamela.ws/book/35120/142'));

// Penormalan Arab: harakat dan bentuk alif tidak menjejaskan padanan
assert.equal(norm('الرِّبَا حَرَامٌ'), norm('الربا حرام'));
assert.equal(norm('إِنَّمَا'), norm('انما'));
assert.equal(normUrl('http://www.shamela.ws/book/35120/142/#x'), 'https://shamela.ws/book/35120/142');
assert.deepEqual(parseAnswer('ok {"status":"jawab"} '), { status: 'jawab' });
assert.equal(parseAnswer('tiada json'), null);

// Halaman yang dibuka dan ditemui
const PAGE = 'فصل في الربا. والربا حرامٌ في الذهب والفضة والمطعومات، ولا يجوز بيع الذهب بالذهب إلا متماثلا نقدا.';
const blocks = [
  { type: 'server_tool_use', id: 'a', name: 'web_fetch', input: { url: 'https://shamela.ws/book/35120/143' } },
  { type: 'web_fetch_tool_result', tool_use_id: 'a', content: { type: 'web_fetch_result', url: 'https://shamela.ws/book/35120/143', retrieved_at: null, content: { type: 'document', title: 'فتح القريب', citations: null, source: { type: 'text', media_type: 'text/plain', data: PAGE } } } },
  { type: 'web_search_tool_result', tool_use_id: 'b', content: [{ type: 'web_search_result', url: 'https://muftiwp.gov.my/ms/artikel/x', title: 'Al-Kafi', encrypted_content: 'z', page_age: null }] },
  { type: 'web_fetch_tool_result', tool_use_id: 'c', content: { type: 'web_fetch_tool_result_error', error_code: 'url_not_accessible' } }
];
const pages = collectRetrieved(blocks);
assert.equal(pages.get('https://shamela.ws/book/35120/143'), PAGE);
assert.equal(pages.get('https://muftiwp.gov.my/ms/artikel/x'), '');

let v = verify({
  status: 'jawab', ringkasan: 'Riba haram.', huraian: ['a'],
  sumber: [
    { id: 'kitab:fathqarib:142', url: 'https://shamela.ws/book/35120/143', petikan: 'وَالرِّبَا حَرَامٌ فِي الذَّهَبِ وَالْفِضَّةِ', maksud: 'Riba haram pada emas dan perak' }, // disahkan, muka surat dikemas kini
    { url: 'https://shamela.ws/book/35120/143', jenis: 'kitab', tajuk: 'Fath al-Qarib', petikan: 'والربا حلال في الذهب' }, // petikan rekaan: dibuang
    { url: 'https://shamela.ws/book/9999/1', petikan: 'apa-apa' }, // tidak dibuka: dibuang
    { url: 'https://example.com/fatwa', petikan: 'x' }, // domain tidak dibenarkan: dibuang
    { url: 'https://muftiwp.gov.my/ms/artikel/x', jenis: 'fatwa', tajuk: 'Al-Kafi', petikan: 'teks yang tidak dibuka' }, // ditemui dalam carian: pautan kekal, petikan dibuang
    { id: 'quran:2:275' }, { id: 'quran:2:999' }, { id: 'quran:115:1' }, // ayat tidak wujud dibuang
    { id: 'fatwa:mkiForex', petikan: 'riba melalui pengenaan rollover interest' }, // petikan daripada korpus
    { id: 'fatwa:rekaan' }
  ]
}, pages);
assert.equal(v.status, 'jawab');
assert.equal(v.sumber.length, 5, JSON.stringify(v.sumber, null, 1));
const [k1, k2, mf, qr, fx] = v.sumber;
assert.equal(k1.disahkan, true); assert.equal(k1.url, 'https://shamela.ws/book/35120/143'); assert.equal(k1.shamela, '143'); assert.ok(k1.maksud);
assert.equal(k2.disahkan, false); assert.equal(k2.petikan, ''); assert.equal(k2.shamela, '143'); assert.equal(k2.maksud, '');
assert.equal(mf.petikan, ''); assert.equal(mf.jenis, 'fatwa');
assert.equal(qr.ref, '2:275'); assert.equal(qr.url, 'https://quran.com/2/275');
assert.equal(fx.disahkan, true); assert.ok(fx.url.startsWith('https://emusykil.muftiselangor.gov.my'));

// Jawapan "jawab" tanpa sumber sah ditukar kepada tidak pasti, huraian model tidak dipaparkan
v = verify({ status: 'jawab', ringkasan: 'Halal.', huraian: ['ikut pendapat saya'], sumber: [{ url: 'https://contoh.com' }] }, new Map());
assert.equal(v.status, 'tidak_pasti'); assert.deepEqual(v.huraian, []); assert.match(v.ringkasan, /Jabatan Mufti/);

// Petikan kitab dari buku lain tidak boleh disandarkan pada id kitab korpus
v = verify({ status: 'jawab', sumber: [{ id: 'kitab:minhaj:113', url: 'https://shamela.ws/book/35120/143', petikan: 'والربا حرام في الذهب والفضة' }] }, pages);
assert.equal(v.sumber[0].disahkan, false); assert.equal(v.sumber[0].url, 'https://shamela.ws/book/12096/113');

// Titik akhir: permintaan ke Claude dan jawapan disahkan
let sent = null, reply = null;
globalThis.fetch = async (u, init) => {
  assert.equal(String(u), 'https://api.anthropic.com/v1/messages?beta=true');
  sent = JSON.parse(init.body);
  return new Response(JSON.stringify(reply()), { headers: { 'content-type': 'application/json' } });
};
const msg = (content, stop = 'end_turn') => ({ id: 'm', type: 'message', role: 'assistant', model: MODEL, content, stop_reason: stop, usage: { input_tokens: 1, output_tokens: 1 } });
let turn = 0;
reply = () => ++turn === 1
  ? msg(blocks, 'pause_turn')
  : msg([{ type: 'text', text: JSON.stringify({ status: 'jawab', ringkasan: 'Riba haram secara qat\'i.', huraian: ['Kitab Fath al-Qarib menyebut riba haram.'], sumber: [{ id: 'kitab:fathqarib:142', url: 'https://shamela.ws/book/35120/143', petikan: 'والربا حرام في الذهب والفضة' }, { id: 'quran:2:275' }] }) }]);
let r = await call({ q: 'Apakah hukum riba dalam jual beli emas?' });
let d = await r.json();
assert.equal(r.status, 200, JSON.stringify(d));
assert.equal(r.headers.get('access-control-allow-origin'), 'https://bijaklabur.my');
assert.equal(d.status, 'jawab'); assert.equal(d.sumber.length, 2); assert.equal(d.sumber[0].disahkan, true);
assert.equal(turn, 2, 'pause_turn diteruskan');
assert.equal(sent.model, MODEL);
assert.deepEqual(sent.tools.map(t => t.type), ['web_search_20260209', 'web_fetch_20260209']);
assert.deepEqual(sent.tools[1].allowed_domains, DOMAINS);
assert.equal(sent.messages.at(-1).role, 'assistant', 'kandungan pause_turn dihantar semula');
assert.ok(sent.messages[0].content[0].text.includes('fatwa:mkiForex'));
assert.equal(sent.fallbacks, 'default');

// Model tidak memulangkan JSON: tidak pasti
turn = 1; reply = () => msg([{ type: 'text', text: 'Saya rasa harus.' }]);
d = await (await call({ q: 'Soalan lain tentang zakat' })).json();
assert.equal(d.status, 'tidak_pasti'); assert.deepEqual(d.sumber, []);

// Ralat API
reply = () => { throw new Error('x'); };
globalThis.fetch = async () => new Response(JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'x' } }), { status: 529, headers: { 'content-type': 'application/json' } });
r = await call({ q: 'Hukum kripto?' }, 'https://bijaklabur.my', { ...env, FIQH_LIMIT: { limit: async () => ({ success: true }) } });
assert.equal(r.status, 429);

// Had kadar
r = await call({ q: 'Hukum kripto?' }, 'https://bijaklabur.my', { ...env, FIQH_LIMIT: { limit: async () => ({ success: false }) } });
assert.equal(r.status, 429);

// Pengesahan permintaan
assert.equal((await call({ q: 'abc' })).status, 400);
assert.equal((await call({ q: 'x'.repeat(501) })).status, 400);
assert.equal((await call({ q: 'Hukum kripto?' }, 'https://jahat.example')).status, 403);
assert.equal((await call({ q: 'Hukum kripto?' }, 'https://bijaklabur.my', { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS })).status, 503);
d = await (await worker.fetch(new Request(W + '/'), env)).json();
assert.deepEqual(d, { ok: true, service: 'bijak-labur-fiqh', ai: true });

console.log('Semua ujian Tanya AI lulus');
