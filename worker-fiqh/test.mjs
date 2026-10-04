// Ujian pelayan Tanya AI Fiqh tanpa rangkaian: node worker-fiqh/test.mjs
import assert from 'node:assert/strict';
import worker, { verify, collectRetrieved, norm, normUrl, parseAnswer, MODEL, GEMINI_MODEL, GEMINI_FALLBACKS, DOMAINS } from './src/index.js';
import { BY_ID, CORPUS_TEXT } from './src/corpus.js';
import { clean, semakBody, systemFor } from './src/semak.js';
import { clean as cleanK, kaloriBody, check as checkK } from './src/kalori.js';

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
assert.deepEqual(d, { ok: true, service: 'bijak-labur-fiqh', ai: true, penyedia: 'claude' });

// Gemini (percuma) apabila hanya GEMINI_API_KEY ditetapkan: korpus dan ayat Al-Quran sahaja
const genv = { GEMINI_API_KEY: 'g-test', ALLOWED_ORIGINS: env.ALLOWED_ORIGINS };
let gurl = null, gkey = null, gsent = null, greply = null;
globalThis.fetch = async (u, init) => {
  gurl = String(u); gkey = init.headers['x-goog-api-key']; gsent = JSON.parse(init.body);
  return greply();
};
const gem = (obj, extra = {}) => new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: 'fikir', thought: true }, { text: JSON.stringify(obj) }] }, finishReason: 'STOP', ...extra }] }), { headers: { 'content-type': 'application/json' } });
greply = () => gem({ status: 'jawab', ringkasan: 'Forex runcit haram.', huraian: ['Muzakarah memutuskan haram.'], sumber: [
  { id: 'fatwa:mkiForex', petikan: 'riba melalui pengenaan rollover interest' },
  { id: 'quran:2:275' },
  { url: 'https://muftiwp.gov.my/ms/artikel/x', petikan: 'rekaan' } // tiada halaman dibuka: dibuang
] });
r = await call({ q: 'Apakah hukum forex runcit?' }, 'https://bijaklabur.my', genv);
d = await r.json();
assert.equal(r.status, 200, JSON.stringify(d));
assert.equal(gurl, `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`);
assert.equal(gkey, 'g-test');
assert.equal(gsent.generationConfig.responseMimeType, 'application/json');
assert.match(gsent.systemInstruction.parts[0].text, /Mod korpus/);
assert.ok(gsent.contents[0].parts[0].text.includes('fatwa:mkiForex'));
assert.equal(d.status, 'jawab'); assert.equal(d.sumber.length, 2); assert.equal(d.sumber[0].disahkan, true);

// Model boleh ditukar; jawapan tanpa sumber sah menjadi tidak pasti
greply = () => gem({ status: 'jawab', ringkasan: 'Harus.', sumber: [{ url: 'https://shamela.ws/book/1/1' }] });
d = await (await call({ q: 'Hukum saham patuh syariah?' }, 'https://bijaklabur.my', { ...genv, GEMINI_MODEL: 'gemini-x' })).json();
assert.ok(gurl.includes('/models/gemini-x:generateContent'));
assert.equal(d.status, 'tidak_pasti');

// Disekat oleh Gemini: luar skop
greply = () => gem({}, { finishReason: 'SAFETY' });
d = await (await call({ q: 'Soalan yang disekat' }, 'https://bijaklabur.my', genv)).json();
assert.equal(d.status, 'luar_skop');

// Kuota percuma habis atau pelayan sibuk: 429
for (const st of [429, 503]) {
  greply = () => new Response('{"error":{"code":' + st + '}}', { status: st });
  assert.equal((await call({ q: 'Hukum emas digital?' }, 'https://bijaklabur.my', genv)).status, 429);
}
// Model pertama kehabisan kuota: model sandaran digunakan
const tried = [];
globalThis.fetch = async (u, init) => {
  tried.push(String(u).match(/models\/([^:]+):/)[1]);
  return tried.length === 1 ? new Response('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}', { status: 429 })
    : gem({ status: 'jawab', ringkasan: 'Ok.', sumber: [{ id: 'quran:2:275' }] });
};
d = await (await call({ q: 'Hukum emas digital fizikal?' }, 'https://bijaklabur.my', genv)).json();
assert.deepEqual(tried, [GEMINI_MODEL, GEMINI_FALLBACKS[0]]);
assert.equal(d.status, 'jawab');
globalThis.fetch = async (u, init) => { gurl = String(u); return greply(); };
greply = () => new Response('{"error":{"code":400}}', { status: 400 });
assert.equal((await call({ q: 'Hukum emas digital?' }, 'https://bijaklabur.my', genv)).status, 502);

// Claude diutamakan jika kedua-dua kunci ada
d = await (await worker.fetch(new Request(W + '/'), genv)).json();
assert.deepEqual(d, { ok: true, service: 'bijak-labur-fiqh', ai: true, penyedia: 'gemini' });
d = await (await worker.fetch(new Request(W + '/'), { ...genv, ...env })).json();
assert.equal(d.penyedia, 'claude');


// Semak Kertas: ulasan pakar
{
  const TEKS = 'Kajian ini bertujuan untuk mengenal pasti faktor yang mempengaruhi pelaburan pelajar. Hasil kajian menunjukan bahawa pengetahuan kewangan adalah lebih penting dari pendapatan, dan data dari soal selidik menyokongnya. Pelajar daripada pelbagai fakulti terlibat dalam kajian ini secara sukarela.';
  const raw = {
    ringkasan: 'Baik.', kekuatan: ['Jelas'],
    markah: { struktur: { skor: 7.3, ulasan: 'ok' }, hujah: { skor: 12, ulasan: 'x' }, bukti: { skor: -1, ulasan: '' }, bahasa: { skor: 6, ulasan: '' }, rujukan: { skor: 'a', ulasan: '' } },
    penambahbaikan: [{ isu: 'Hujah nipis', petikan: 'pengetahuan kewangan adalah lebih penting', cadangan: 'Tambah data.' }, { isu: 'Rekaan', petikan: 'ayat yang tiada', cadangan: 'x' }],
    pembetulan: [
      { asal: 'menunjukan', baru: 'menunjukkan', jenis: 'ejaan', sebab: 'Ejaan baku.' },
      { asal: 'lebih penting dari', baru: 'lebih penting daripada', jenis: 'tatabahasa', sebab: 'Perbandingan.' },
      { asal: 'teks yang tidak wujud', baru: 'x', jenis: 'ejaan', sebab: 'rekaan' },
      { asal: 'menunjukan', baru: 'menunjukkan', jenis: 'ejaan', sebab: 'pendua' },
      { asal: 'Kajian', baru: 'Kajian', jenis: 'gaya', sebab: 'sama' },
      { asal: 'faktor yang', baru: 'faktor-faktor yang', jenis: 'pelik', sebab: 'jenis tidak sah' },
      { asal: 'dari', baru: 'daripada', jenis: 'tatabahasa', sebab: 'kabur: muncul banyak kali' },
      { asal: 'kajian', baru: 'penyelidikan', jenis: 'gaya', sebab: 'kabur' }
    ]
  };
  const c = clean(raw, TEKS);
  assert.deepEqual(c.pembetulan.map(p => p.asal), ['menunjukan', 'lebih penting dari', 'faktor yang']);
  assert.equal(c.pembetulan[2].jenis, 'tatabahasa');
  assert.equal(c.markah.struktur.skor, 7.5); assert.equal(c.markah.hujah.skor, 10); assert.equal(c.markah.bukti.skor, 0); assert.equal(c.markah.rujukan.skor, 0);
  assert.equal(c.jumlah, 47);
  assert.equal(c.penambahbaikan[1].petikan, '');
  assert.match(systemFor('ms'), /BUKAN Bahasa Indonesia/);
  assert.ok(JSON.parse(semakBody(TEKS, 'ms')).generationConfig.responseSchema);

  const senv = { GEMINI_API_KEY: 'g', ALLOWED_ORIGINS: env.ALLOWED_ORIGINS };
  const post = (body, e = senv, origin = 'https://bijaklabur.my') => worker.fetch(new Request(W + '/semak', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }), e);
  let sent = null;
  globalThis.fetch = async (u, init) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(raw) }] }, finishReason: 'STOP' }] })); };
  let r = await post({ text: TEKS, lang: 'ms' }), d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(d.pembetulan.length, 3); assert.equal(d.jumlah, 47);
  assert.ok(sent.contents[0].parts[0].text.includes('menunjukan'));
  assert.equal((await post({ text: 'pendek' })).status, 400);
  assert.equal((await post({ text: 'x'.repeat(60001) })).status, 413);
  assert.equal((await post({ text: TEKS }, senv, 'https://jahat.example')).status, 403);
  assert.equal((await post({ text: TEKS }, { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS })).status, 503);
  assert.equal((await post({ text: TEKS }, { ...senv, SEMAK_LIMIT: { limit: async () => ({ success: false }) } })).status, 429);
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  assert.equal((await post({ text: TEKS })).status, 429);
}

// Sihat: kalori daripada gambar atau teks
{
  const raw = { yakin: 'tinggi', nota: 'Anggaran.', items: [
    { nama: 'Nasi santan', hidangan: '1 pinggan', berat_g: 200, kalori: 330.6, protein_g: 6, karbohidrat_g: 60, lemak_g: 8 },
    { nama: 'Ayam goreng', berat_g: 120, kalori: 290, protein_g: 25, karbohidrat_g: 8, lemak_g: 18 },
    { nama: '', kalori: 99 }, { nama: 'Mustahil', berat_g: 99999, kalori: 99999, protein_g: -5, karbohidrat_g: 'x', lemak_g: 1 }
  ] };
  const k = cleanK(raw);
  assert.equal(k.items.length, 3); assert.equal(k.items[0].kalori, 331); assert.equal(k.items[2].kalori, 4000); assert.equal(k.items[2].berat_g, 3000); assert.equal(k.items[2].protein_g, 0);
  assert.equal(k.jumlah.kalori, 331 + 290 + 4000); assert.equal(k.yakin, 'tinggi');
  assert.equal(cleanK({ items: 'x', yakin: 'pelik' }).yakin, 'sederhana');
  assert.match(checkK({}), /gambar atau penerangan/);
  assert.match(checkK({ image: 'AAAA', mime: 'image/gif' }), /Format/);
  assert.match(checkK({ image: 'A'.repeat(1_600_001), mime: 'image/jpeg' }), /besar/);
  assert.equal(checkK({ image: 'QUJD', mime: 'image/jpeg' }), null);
  assert.equal(checkK({ text: 'nasi lemak' }), null);
  const b = JSON.parse(kaloriBody({ image: 'QUJD', mime: 'image/jpeg', text: '' }));
  assert.equal(b.contents[0].parts[0].inline_data.mime_type, 'image/jpeg');
  assert.ok(b.generationConfig.responseSchema);

  const kenv = { GEMINI_API_KEY: 'g', ALLOWED_ORIGINS: env.ALLOWED_ORIGINS };
  const post = (body, e = kenv, origin = 'https://bijaklabur.my') => worker.fetch(new Request(W + '/kalori', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }), e);
  globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(raw) }] }, finishReason: 'STOP' }] }));
  let r = await post({ image: 'QUJD', mime: 'image/jpeg' }), d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(d.items.length, 3);
  assert.equal((await post({ text: 'roti canai 2 keping' })).status, 200);
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ text: 'x' }, kenv, 'https://jahat.example')).status, 403);
  assert.equal((await post({ text: 'x' }, { ...kenv, KALORI_LIMIT: { limit: async () => ({ success: false }) } })).status, 429);
  globalThis.fetch = async () => new Response('{}', { status: 400 });
  assert.equal((await post({ text: 'nasi' })).status, 502);
}
console.log('Semua ujian Tanya AI lulus');
