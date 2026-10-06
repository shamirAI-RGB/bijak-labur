// Ujian pelayan Tanya AI Fiqh tanpa rangkaian: node worker-fiqh/test.mjs
import assert from 'node:assert/strict';
import worker, { readJson, NOTA_PDF, kataKunci, verify, collectRetrieved, norm, normUrl, parseAnswer, MODEL, GEMINI_MODEL, GEMINI_FALLBACKS, DOMAINS } from './src/app.js';
import { BY_ID, CORPUS_TEXT } from './src/corpus.js';
import { MODEN, KITAB, buildIndex, search, expand, pageUrl, tokens, cetakan, cetakPdf, assetTag } from './src/rujukan.js';
import { clean, semakBody, systemFor } from './src/semak.js';
import { clean as cleanK, kaloriBody, check as checkK } from './src/kalori.js';
import { blocked, check as checkG, promptBody, GAYA, FLUX } from './src/gambar.js';
import { geminiGenerate, toJsonSchema, ROUTER_MODEL, aiSedia } from './src/gemini.js';
import { PENYEDIA, combo, cooldownFor, keOpenAI, penghalaGenerate, gambarSandaran, resetPenghala } from './src/penghala.js';
import { check as checkB, clean as cleanB, verifyQuotes, bukuBody, SCHEMAS as SB } from './src/buku.js';
import { check as checkJ, clean as cleanJ, redact } from './src/kerja.js';
import { check as checkM, clean as cleanM } from './src/manusia.js';
import { check as checkC, coachBody, systemFor as sysC } from './src/coach.js';
import { check as checkA, clean as cleanA, normalZon, auditBody, systemFor as sysA } from './src/audit.js';

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
  : msg([{ type: 'text', text: JSON.stringify({ status: 'jawab', ringkasan: 'Riba haram secara qat\'i.', huraian: ['Kitab Fath al-Qarib menyebut riba haram.'], sumber: [{ id: 'kitab:fathqarib:142', url: 'https://shamela.ws/book/35120/143', petikan: 'والربا حرام في الذهب والفضة', maksud: 'Riba haram pada emas dan perak.' }, { id: 'quran:2:275' }] }) }]);
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
assert.deepEqual(d, { ok: true, service: 'bijak-labur-fiqh', ai: true, penyedia: 'claude', gambar: false, sandaran: [], sandaran_gambar: [] });

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
assert.deepEqual(d, { ok: true, service: 'bijak-labur-fiqh', ai: true, penyedia: 'gemini', gambar: false, sandaran: [], sandaran_gambar: [] });
d = await (await worker.fetch(new Request(W + '/'), { ...genv, ...env })).json();
assert.equal(d.penyedia, 'claude');


// Rujukan rasmi moden (PDF): carian muka surat, petikan disemak, pautan ke muka surat PDF yang sama
assert.equal(MODEN.length, 4);
for (const m of MODEN) assert.match(m.url, /^https:\/\//);
const PDF = {
  jakim: ['Kandungan', 'Hukum Melabur Dalam Mata Wang Kripto. Muzakarah memutuskan bahawa urus niaga mata wang kripto adalah tidak dibenarkan kerana mengandungi unsur gharar.', 'Hukum Vaksin Covid-19. Penggunaan vaksin adalah harus dan wajib bagi golongan yang ditetapkan oleh kerajaan.'],
  bnmsr: ['Credit card based on ujrah. The SAC resolved that a credit card structured on ujrah is permissible.', 'Late payment charges ta`widh and gharamah may be imposed on defaulting customers.']
};
const files = buildIndex(PDF);
assert.ok(files.has('rujukan/p/jakim/0.json') && files.has('rujukan/meta.json') && files.has('rujukan/i/0.json'));
assert.deepEqual(JSON.parse(files.get('rujukan/p/jakim/0.json')).length, 3);
const renv = { RUJUKAN: { fetch: async req => { const p = new URL(req.url).pathname.slice(1); return files.has(p) ? new Response(files.get(p)) : new Response('', { status: 404 }); } } };
let hits = await search(renv, expand('Apakah hukum melabur kripto?'));
assert.equal(hits[0].id, 'pdf:jakim:2');
assert.ok(hits[0].teks.includes('mata wang kripto'));
hits = await search(renv, expand('Bolehkah bank kenakan denda bayaran lewat kad kredit?'));
assert.ok(hits.some(h => h.id === 'pdf:bnmsr:2') && hits.some(h => h.id === 'pdf:bnmsr:1'), JSON.stringify(hits.map(h => h.id)));
assert.deepEqual(await search({}, 'kripto'), []);
assert.deepEqual(await search(renv, 'dan yang'), []);
assert.ok(!tokens('dan yang the').length);
assert.equal(pageUrl('jakim', 2), MODEN.find(m => m.k === 'jakim').url + '#page=2');

globalThis.fetch = async (u, init) => { gurl = String(u); gsent = JSON.parse(init.body); return greply(); };
greply = () => gem({ status: 'jawab', ringkasan: 'Tidak dibenarkan menurut Muzakarah.', huraian: ['Ada unsur gharar.'], sumber: [
  { id: 'pdf:jakim:2', petikan: 'urus niaga mata wang kripto adalah tidak dibenarkan', maksud: 'x' },
  { id: 'pdf:jakim:3', petikan: 'Penggunaan vaksin adalah harus' }, // muka surat ini tidak diberi kepada model: dibuang
  { id: 'pdf:jakim:2', petikan: 'rekaan yang tiada dalam muka surat' }
] });
d = await (await call({ q: 'Apakah hukum melabur kripto?' }, 'https://bijaklabur.my', { ...genv, ...renv })).json();
const parts = gsent.contents[0].parts.map(p => p.text);
assert.ok(parts.some(t => t.startsWith('Dokumen rujukan rasmi moden') && t.includes('[pdf:jakim:2]') && t.includes('Muka surat PDF 2')));
assert.ok(!parts.some(t => t.includes('[pdf:jakim:3]')));
assert.match(gsent.systemInstruction.parts[0].text, /pdf:KOD:MUKASURAT/);
assert.equal(d.status, 'jawab');
assert.equal(d.sumber.length, 2, JSON.stringify(d.sumber));
assert.deepEqual([d.sumber[0].jenis, d.sumber[0].pdf, d.sumber[0].disahkan, d.sumber[0].url], ['dokumen', 2, true, pageUrl('jakim', 2)]);
assert.match(d.sumber[0].oleh, /JAKIM/);
assert.equal(d.sumber[1].disahkan, false); assert.equal(d.sumber[1].petikan, '');

// Kitab muktabar (teks Shamela): carian Arab daripada soalan Bahasa Melayu, pautan ke halaman Shamela yang sama
assert.ok(KITAB.some(k => k.k === 'fathqarib' && k.id === 35120));
assert.deepEqual(tokens('والرِّبَا بالذهب'), ['ربا', 'ذهب']);
assert.deepEqual(cetakan('نص [الجزء: ١ ¦ الصفحة: ٢٥٥]'), { jilid: '1', halaman: '255' });
const KT = 'فصل في الربا. والرِّبَا حرامٌ في الذهب والفضة، ولا يجوز بيع الذهب بالذهب إلا متماثلا نقدا. [الجزء: ١ ¦ الصفحة: ١٨١]';
const kfiles = buildIndex({ ...PDF, fathqarib: [...Array(141).fill(''), 'كتاب الطهارة: المياه التي يجوز التطهير بها سبع مياه', KT] });
const kenv = { RUJUKAN: { fetch: async req => { const p = new URL(req.url).pathname.slice(1); return kfiles.has(p) ? new Response(kfiles.get(p)) : new Response('', { status: 404 }); } } };
hits = await search(kenv, expand('Hukum jual beli emas dengan emas'));
// Halaman kitab tetap diberi walaupun skor teks Melayu lebih tinggi
assert.deepEqual(hits.filter(h => h.k === 'fathqarib').map(h => h.id), ['kitab:fathqarib:143'], JSON.stringify(hits.map(h => h.id)));
greply = () => gem({ status: 'jawab', ringkasan: 'Mesti sama timbangan dan tunai.', huraian: ['Syarat tukaran emas.'], sumber: [
  { id: 'kitab:fathqarib:143', petikan: 'ولا يجوز بيع الذهب بالذهب إلا متماثلا نقدا', maksud: 'Tidak harus menjual emas dengan emas kecuali sama dan tunai.' }
] });
d = await (await call({ q: 'Hukum jual beli emas dengan emas' }, 'https://bijaklabur.my', { ...genv, ...kenv })).json();
assert.ok(gsent.contents[0].parts.some(p => p.text.includes('[kitab:fathqarib:143] (kitab, mazhab Syafie) Fath al-Qarib') && p.text.includes('Halaman Shamela 143')));
assert.deepEqual([d.sumber[0].jenis, d.sumber[0].url, d.sumber[0].shamela, d.sumber[0].jilid, d.sumber[0].halaman, d.sumber[0].disahkan],
  ['kitab', 'https://shamela.ws/book/35120/143', '143', '1', '181', true]);

// Belum ada PDF cetakan yang dipadankan: ayat amaran dipaparkan
assert.equal(d.nota_pdf, NOTA_PDF);
// Petikan Arab tanpa terjemahan Bahasa Melayu tidak dipaparkan
greply = () => gem({ status: 'jawab', ringkasan: 'x', huraian: ['y'], sumber: [{ id: 'kitab:fathqarib:143', petikan: 'ولا يجوز بيع الذهب بالذهب إلا متماثلا نقدا' }] });
d = await (await call({ q: 'Hukum jual beli emas dengan emas?' }, 'https://bijaklabur.my', { ...genv, ...kenv })).json();
assert.deepEqual([d.sumber[0].petikan, d.sumber[0].disahkan], ['', false]);

// Istilah carian daripada model untuk soalan yang tiada dalam glosari (semua bab fiqh)
greply = () => gem({ ar: ['طهارة', 'مياه'], en: ['purification'], ms: ['bersuci'] });
assert.equal(await kataKunci({ ...genv, ...kenv }, 'Air apa yang boleh digunakan untuk mengangkat hadas?'), 'طهارة مياه purification bersuci');
assert.equal(await kataKunci(genv, 'x'), '');
greply = () => new Response('{}', { status: 500 });
assert.equal(await kataKunci({ ...genv, ...kenv }, 'x'), '');
greply = () => gem({ ar: ['طهارة', 'مياه'] });
hits = await search(kenv, expand('Air apa yang boleh digunakan untuk mengangkat hadas?') + ' ' + await kataKunci({ ...genv, ...kenv }, 'q'));
assert.ok(hits.some(h => h.id === 'kitab:fathqarib:142'), JSON.stringify(hits.map(h => h.id)));

// Edisi cetakan: halaman Shamela dipetakan ke [fail, muka surat PDF] dengan OCR
const CET = { penerbit: 'Dar Ibn Hazm', edisi: 'Pertama, 1425H', fail: ['https://archive.org/download/x/x.pdf', 'https://a/j2.pdf'], peta: { 143: [0, 147], 900: [1, 13] } };
assert.deepEqual(cetakPdf(CET, 143), { penerbit: 'Dar Ibn Hazm', edisi: 'Pertama, 1425H', pdf: 147, pdf_url: 'https://archive.org/download/x/x.pdf#page=147' });
assert.equal(cetakPdf(CET, 900).pdf_url, 'https://a/j2.pdf#page=13');
assert.deepEqual(cetakPdf(CET, 400), { penerbit: 'Dar Ibn Hazm', edisi: 'Pertama, 1425H' });
assert.equal(cetakPdf(null, 1), null);
// Paparan ringan: gambar satu muka surat dan BookReader archive.org (indeks n = muka surat PDF + off), hanya bagi fail yang disahkan
{
  const P = { ...CET, paparan: [{ gambar: 'https://archive.org/download/x/page/n{n}_w800.jpg', lihat: 'https://archive.org/details/x/page/n{n}/mode/1up', off: -1 }, null] };
  assert.deepEqual(cetakPdf(P, 143), { ...cetakPdf(CET, 143), gambar_url: 'https://archive.org/download/x/page/n146_w800.jpg', lihat_url: 'https://archive.org/details/x/page/n146/mode/1up' });
  assert.deepEqual(cetakPdf(P, 900), cetakPdf(CET, 900));
}
// Peta OCR: padanan yang melanggar tertib dibuang, muka surat pertama diambil, jurang kecil yang konsisten diisi
{
  const { bina } = await import('./scripts/peta.mjs');
  const o = { 19: [1, .5], 20: [2, .5], 22: [4, .5], 23: [5, .5], 24: [6, .5], 25: [7, .5], 26: [7, .4], 29: [8, .5], 30: [200, .3], 31: 0 };
  assert.deepEqual(bina([o, { 1: [9, .5] }], 300), { 1: [0, 19], 2: [0, 20], 3: [0, 21], 4: [0, 22], 5: [0, 23], 6: [0, 24], 7: [0, 25], 8: [0, 29], 9: [1, 1] });
  // Halaman pertama yang jauh terpisah (mukadimah pentahqiq memetik teks kitab) dibuang
  assert.deepEqual(bina([{ 15: [1, .4], 65: [2, .5], 67: [3, .5], 69: [4, .5] }], 406), { 2: [0, 65], 3: [0, 67], 4: [0, 69] });
}
kfiles.set('rujukan/cetakan.json', JSON.stringify({ fathqarib: CET }));
greply = () => gem({ status: 'jawab', ringkasan: 'x', huraian: ['y'], sumber: [{ id: 'kitab:fathqarib:143', petikan: 'ولا يجوز بيع الذهب بالذهب إلا متماثلا نقدا', maksud: 'Tidak harus menjual emas dengan emas kecuali sama dan tunai.' }] });
d = await (await call({ q: 'Hukum jual beli emas dengan emas!' }, 'https://bijaklabur.my', { ...genv, ...kenv })).json();
assert.deepEqual([d.sumber[0].pdf, d.sumber[0].pdf_url, d.sumber[0].penerbit, d.sumber[0].disahkan], [147, 'https://archive.org/download/x/x.pdf#page=147', 'Dar Ibn Hazm', true]);
assert.equal(d.nota_pdf, undefined);

// Cache jawapan: kunci mengandungi cap (ETag) peta PDF kitab, jadi pemasangan baharu dengan peta berbeza tidak memaparkan jawapan lama
{
  const puts = [];
  globalThis.caches = { default: { match: async () => undefined, put: async req => { puts.push(req.url); } } };
  const bertanda = tag => ({ ...genv, RUJUKAN: { fetch: async req => { const r = await kenv.RUJUKAN.fetch(req); return new Response(req.method === 'HEAD' ? null : r.body, { status: r.status, headers: { etag: `"${tag}"` } }); } } });
  await call({ q: 'Hukum jual beli emas dengan emas!' }, 'https://bijaklabur.my', bertanda('peta1'));
  await call({ q: 'Hukum jual beli emas dengan emas!' }, 'https://bijaklabur.my', bertanda('peta2'));
  delete globalThis.caches;
  assert.equal(puts.length, 2, 'jawapan disimpan dalam cache');
  assert.ok(puts[0].includes('/tanya-cache-3?') && puts[0].endsWith('&r=peta1') && puts[1].endsWith('&r=peta2'), puts.join(' '));
  assert.equal(await assetTag(genv), '');
  assert.equal(await assetTag(kenv), '');
}

// Tanpa aset rujukan (muat turun gagal), Tanya AI tetap berjalan seperti biasa
d = await (await call({ q: 'Apakah hukum melabur kripto lagi?' }, 'https://bijaklabur.my', genv)).json();
assert.ok(!gsent.contents[0].parts.some(p => p.text.startsWith('Dokumen rujukan')));
assert.equal(d.status, 'tidak_pasti');

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
// Studio Gambar AI
{
  assert.ok(blocked('gadis bogel')); assert.ok(blocked('NSFW art')); assert.ok(blocked('kanak-kanak memakai bikini'));
  assert.ok(!blocked('kanak-kanak bermain di taman')); assert.ok(!blocked('kucing comel makan nasi lemak'));
  assert.equal(checkG({ prompt: 'ab' }).error.length > 0, true);
  assert.ok(checkG({ prompt: 'x'.repeat(401) }).error);
  let c = checkG({ prompt: '  kucing   comel ', gaya: 'batik', seed: 42 });
  assert.deepEqual(c, { prompt: 'kucing comel', gaya: 'batik', seed: 42 });
  c = checkG({ prompt: 'kucing', gaya: '__proto__', seed: -1 });
  assert.equal(c.gaya, 'realistik'); assert.ok(c.seed > 0);
  assert.ok(JSON.parse(promptBody('kucing', 'anime')).contents[0].parts[0].text.includes(GAYA.anime));

  let fluxArgs = null;
  const AI = { run: async (m, a) => { if (m !== FLUX) throw new Error('LLM sandaran tiada dalam ujian ini'); fluxArgs = a; return { image: 'SU1H' }; } };
  const genv = { GEMINI_API_KEY: 'g', AI, ALLOWED_ORIGINS: env.ALLOWED_ORIGINS };
  const post = (body, e = genv, origin = 'https://bijaklabur.my') => worker.fetch(new Request(W + '/gambar', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }), e);
  const gem = ans => { globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(ans) }] }, finishReason: 'STOP' }] })); };

  gem({ selamat: true, sebab: '', prompt_en: 'A cute cat eating nasi lemak on a banana leaf' });
  let r = await post({ prompt: 'kucing comel makan nasi lemak', gaya: 'catair', seed: 7 }), d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(d.image, 'SU1H'); assert.equal(d.seed, 7); assert.equal(d.ai, true);
  assert.ok(fluxArgs.prompt.startsWith('A cute cat') && fluxArgs.prompt.includes('watercolour')); assert.equal(fluxArgs.steps, 4); assert.equal('seed' in fluxArgs, false);
  // Gemini menolak
  gem({ selamat: false, sebab: 'Gambar orang sebenar tidak dibenarkan.', prompt_en: '' }); fluxArgs = null;
  r = await post({ prompt: 'gambar perdana menteri' }); d = await r.json();
  assert.equal(r.status, 422); assert.equal(d.error, 'Gambar orang sebenar tidak dibenarkan.'); assert.equal(fluxArgs, null);
  // Penapis tempatan menolak tanpa memanggil sesiapa
  globalThis.fetch = async () => { throw new Error('tidak patut dipanggil'); };
  assert.equal((await post({ prompt: 'wanita bogel' })).status, 422); assert.equal(fluxArgs, null);
  // Gemini gagal: guna penerangan asal + gaya
  globalThis.fetch = async () => new Response('{}', { status: 500 });
  r = await post({ prompt: 'menara berkembar waktu malam', gaya: 'poster' }); d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.ai, false); assert.ok(fluxArgs.prompt.startsWith('menara berkembar waktu malam. minimalist poster'));
  // Kuota Workers AI habis, ralat lain, tanpa binding, asal lain, had kadar
  r = await post({ prompt: 'kucing' }, { ...genv, AI: { run: async () => { throw new Error('3036: Account limited to 10000 daily neurons'); } } });
  assert.equal(r.status, 429); assert.match((await r.json()).error, /esok/);
  r = await post({ prompt: 'kucing' }, { ...genv, AI: { run: async () => { throw new Error('AiError: 5007: No such model <x>'); } } });
  assert.equal(r.status, 502); assert.equal((await r.json()).kod, 'AiError: 5007: No such model x');
  assert.equal((await post({ prompt: 'kucing' }, { ...genv, AI: { run: async () => ({}) } })).status, 502);
  // Binari (stream PNG) ditukar kepada base64
  r = await post({ prompt: 'kucing' }, { ...genv, AI: { run: async m => { if (m !== FLUX) throw new Error('x'); return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47])).body; } } }); d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.image, 'iVBORw=='); assert.equal(d.mime, 'image/png');
  assert.equal((await post({ prompt: 'kucing' }, { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS })).status, 503);
  assert.equal((await post({ prompt: 'kucing' }, genv, 'https://jahat.example')).status, 403);
  assert.equal((await post({ prompt: 'k' })).status, 400);
  assert.equal((await post({ prompt: 'kucing' }, { ...genv, GAMBAR_LIMIT: { limit: async () => ({ success: false }) } })).status, 429);
}
// Penghala berbilang penyedia (OmniRoute): Gemini habis kuota -> Workers AI
{
  assert.deepEqual(toJsonSchema({ type: 'OBJECT', properties: { a: { type: 'ARRAY', items: { type: 'STRING', enum: ['x'] } } }, required: ['a'] }),
    { type: 'object', properties: { a: { type: 'array', items: { type: 'string', enum: ['x'] } } }, required: ['a'] });
  let calls = 0, got = null;
  globalThis.fetch = async () => { calls++; return new Response('{"error":"quota"}', { status: 429 }); };
  const AI = { run: async (m, a) => { got = { m, a }; return { response: { status: 'ok' } }; } };
  const body = JSON.stringify({ systemInstruction: { parts: [{ text: 'SYS' }] }, contents: [{ role: 'user', parts: [{ text: 'soalan' }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { status: { type: 'STRING' } } }, maxOutputTokens: 9000, temperature: 0.2 } });
  const d = await geminiGenerate({ GEMINI_API_KEY: 'g', AI }, body);
  assert.equal(calls, 4); assert.equal(got.m, ROUTER_MODEL); assert.equal(d.penghala, 'workers-ai');
  assert.equal(d.candidates[0].content.parts[0].text, '{"status":"ok"}');
  assert.ok(got.a.messages[0].content.startsWith('SYS') && got.a.messages[1].content === 'soalan');
  assert.equal(got.a.max_tokens, 4096); assert.equal(got.a.response_format.json_schema.type, 'object');
  // Jawapan teks dengan JSON di dalamnya
  const AI2 = { run: async () => ({ response: 'Berikut: {"status":"ok"} sekian' }) };
  assert.equal((await geminiGenerate({ GEMINI_API_KEY: 'g', AI: AI2 }, body)).candidates[0].content.parts[0].text, '{"status":"ok"}');
  // Gambar: tiada sandaran, ralat asal dikekalkan
  const img = JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: 'QQ==' } }, { text: 'x' }] }], generationConfig: {} });
  await assert.rejects(geminiGenerate({ GEMINI_API_KEY: 'g', AI }, img), e => e.status === 429);
  // Ralat bukan kuota (400) tidak dialihkan
  globalThis.fetch = async () => new Response('{}', { status: 400 }); got = null;
  await assert.rejects(geminiGenerate({ GEMINI_API_KEY: 'g', AI }, body), e => e.status === 400); assert.equal(got, null);
  // Tanpa binding AI: ralat asal
  globalThis.fetch = async () => new Response('{}', { status: 429 });
  await assert.rejects(geminiGenerate({ GEMINI_API_KEY: 'g' }, body), e => e.status === 429);
  // Semak Kertas berfungsi melalui penghala apabila Gemini habis kuota
  const semakAns = { ringkasan: 'R', markah: { struktur: { skor: 7, ulasan: 'u' }, hujah: { skor: 6, ulasan: 'u' }, bukti: { skor: 5, ulasan: 'u' }, bahasa: { skor: 6, ulasan: 'u' }, rujukan: { skor: 4, ulasan: 'u' } }, kekuatan: ['k'], penambahbaikan: [], pembetulan: [] };
  const r = await worker.fetch(new Request(W + '/semak', { method: 'POST', headers: { origin: 'https://bijaklabur.my', 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Teks pelajar. '.repeat(30), lang: 'ms' }) }),
    { GEMINI_API_KEY: 'g', ALLOWED_ORIGINS: env.ALLOWED_ORIGINS, AI: { run: async () => ({ response: semakAns }) } });
  assert.equal(r.status, 200); assert.equal((await r.json()).jumlah, 56);
}
// Buku Nota AI, Kerjaya AI dan No AI Slop
{
  const teks = 'Fotosintesis ialah proses tumbuhan hijau menghasilkan makanan menggunakan cahaya matahari, air dan karbon dioksida. Proses ini berlaku dalam kloroplas dan membebaskan oksigen.';
  let c = checkB({ tugas: 'tanya', soalan: 'Apa itu fotosintesis?', sumber: [{ tajuk: 'Bab 1', teks }, { teks: 'pendek' }] });
  assert.equal(c.sumber.length, 1); assert.equal(c.sumber[0].id, 'S1'); assert.equal(c.bahasa, 'ms');
  assert.ok(checkB({ tugas: 'tanya', sumber: [{ teks }] }).error);
  assert.ok(checkB({ tugas: 'hack', sumber: [{ teks }] }).error);
  assert.equal(checkB({ tugas: 'ringkasan', sumber: [{ teks: 'x'.repeat(130000) }] }).status, 413);
  assert.ok(checkB({ tugas: 'ringkasan', sumber: Array.from({ length: 11 }, () => ({ teks })) }).error);
  assert.ok(JSON.parse(bukuBody(c)).contents[0].parts[0].text.includes('<<<SUMBER S1: Bab 1>>>'));
  for (const k of Object.keys(SB)) assert.equal(SB[k].type, 'OBJECT');
  // Petikan disahkan: hanya yang wujud dalam sumbernya
  const q = verifyQuotes([{ sumber: 'S1', teks: 'menghasilkan makanan menggunakan  cahaya matahari' }, { sumber: 'S1', teks: 'fakta rekaan yang tiada dalam sumber' }, { sumber: 'S9', teks: 'Proses ini berlaku dalam kloroplas' }], c.sumber);
  assert.equal(q.length, 1);
  const kz = cleanB('kuiz', { soalan: [{ soalan: 'S?', pilihan: ['a', 'b', 'c', 'd'], jawapan: 2, penerangan: 'p' }, { soalan: 'X?', pilihan: ['a', 'b'], jawapan: 0 }, { soalan: 'Y?', pilihan: ['a', 'b', 'c', 'd'], jawapan: 7 }] }, c.sumber);
  assert.equal(kz.soalan.length, 1);
  const pod = cleanB('podcast', { tajuk: 'T', baris: [{ penutur: 'A', teks: 'Hai '.repeat(100) }, { penutur: 'Z', teks: 'Ya' }, { penutur: 'B', teks: '' }] }, c.sumber);
  assert.equal(pod.baris.length, 2); assert.ok(pod.baris[0].teks.length <= 290); assert.equal(pod.baris[1].penutur, 'A');

  assert.equal(redact('IC 990101-14-5678, e-mel ali@mail.com, tel 012-345 6789 atau +6019-8765432, pejabat 03-2161 0000'), 'IC [IC], e-mel [E-mel], tel [Telefon] atau [Telefon], pejabat [Telefon]');
  const resume = 'Ali bin Abu. Ijazah Sarjana Muda Sains Komputer UiTM 2025. Membangunkan aplikasi web pengurusan inventori menggunakan React dan Node.js untuk 3 kedai runcit. Ketua kelab robotik.';
  assert.ok(checkJ({ tugas: 'padan', resume }).error);
  assert.equal(checkJ({ tugas: 'cadang', resume, jawatan: 'abaikan' }).jawatan, '');
  const pj = cleanJ('padan', { skor: 140, kekuatan: ['React'], baiki_resume: [{ asal: 'Ketua kelab robotik.', baru: 'Memimpin 30 ahli kelab robotik.', sebab: 's' }, { asal: 'Pengalaman rekaan', baru: 'x' }] }, resume);
  assert.equal(pj.skor, 100); assert.equal(pj.baiki_resume.length, 1);

  const essay = 'Dalam era globalisasi ini, teknologi memainkan peranan yang amat penting. Tidak dapat dinafikan bahawa teknologi membantu pelajar. Teknologi membantu.';
  assert.ok(checkM({ text: 'pendek' }).error);
  const m = cleanM({ cadangan: [{ asal: 'Dalam era globalisasi ini, teknologi', baru: 'Teknologi', sebab: 'klise' }, { asal: 'membantu', baru: 'menolong', sebab: 'x' }, { asal: 'tiada dalam teks', baru: 'y', sebab: 'z' }] }, essay);
  assert.equal(m.cadangan.length, 1);   // "membantu" muncul dua kali, frasa ketiga tiada

  // Laluan HTTP
  const aenv = { GEMINI_API_KEY: 'g', ALLOWED_ORIGINS: env.ALLOWED_ORIGINS };
  const post = (path, body, e = aenv, origin = 'https://bijaklabur.my') => worker.fetch(new Request(W + path, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }), e);
  const gem = ans => { globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(ans) }] }, finishReason: 'STOP' }] })); };
  gem({ jawapan: ['Fotosintesis ialah proses membuat makanan.'], petikan: [{ sumber: 'S1', teks: 'Proses ini berlaku dalam kloroplas' }], tiada_dalam_sumber: false });
  let r = await post('/buku', { tugas: 'tanya', soalan: 'Apa?', sumber: [{ tajuk: 'B', teks }] }), d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(d.petikan.length, 1);
  gem({ ringkasan: 'R', jawatan: [{ tajuk: 'Pembangun Web', kata_kunci: 'junior web developer', sebab: 's' }], kemahiran_utama: ['React'], tingkatkan: [] });
  r = await post('/kerja', { tugas: 'cadang', resume }); d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.jawatan[0].kata_kunci, 'junior web developer');
  gem({ cadangan: [{ asal: 'Tidak dapat dinafikan bahawa teknologi membantu pelajar.', baru: 'Teknologi membantu pelajar mencari maklumat dengan cepat.', sebab: 'Buang klise.' }] });
  r = await post('/manusia', { text: essay, lang: 'ms', tanda: ['Dalam era globalisasi ini'] }); d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.cadangan.length, 1);
  assert.equal((await post('/buku', { tugas: 'tanya', soalan: 'A?', sumber: [{ teks }] }, aenv, 'https://jahat.example')).status, 403);
  assert.equal((await post('/kerja', { tugas: 'cadang', resume }, { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS })).status, 503);
  assert.equal((await post('/manusia', { text: essay }, { ...aenv, MANUSIA_LIMIT: { limit: async () => ({ success: false }) } })).status, 429);
  assert.equal((await post('/buku', { tugas: 'ringkasan', sumber: [{ teks: 'x'.repeat(130000) }] })).status, 413);
  globalThis.fetch = async () => new Response('{}', { status: 429 });
  r = await post('/kerja', { tugas: 'cadang', resume }); assert.equal(r.status, 429); assert.match((await r.json()).error, /sibuk/);
  // Melalui penghala Workers AI apabila Gemini habis kuota
  r = await post('/buku', { tugas: 'kad', sumber: [{ teks }] }, { ...aenv, AI: { run: async () => ({ response: { kad: [{ depan: 'Apa itu fotosintesis?', belakang: 'Proses membuat makanan.' }] } }) } });
  d = await r.json(); assert.equal(r.status, 200); assert.equal(d.kad.length, 1); assert.equal(d.penghala, 'workers-ai');

  // AI Coach Akademi Pelaburan
  assert.ok(checkC({ laluan: 'forex', soalan: 'Apa?' }).error);
  assert.ok(checkC({ laluan: 'moomoo', soalan: ' ' }).error);
  assert.equal(checkC({ laluan: 'moomoo', soalan: 'x'.repeat(1001) }).status, 413);
  const cc = checkC({ laluan: 'kripto', tahap: 'dewa', soalan: 'Apa itu HODL?', sejarah: [{ peranan: 'coach', teks: 'Hai' }, ...Array(8).fill({ peranan: 'pelajar', teks: 'y' }), { peranan: 'x', teks: '' }] });
  assert.equal(cc.tahap, 'beginner'); assert.equal(cc.sejarah.length, 5);
  const cb = JSON.parse(coachBody({ ...cc, sejarah: [{ peranan: 'coach', teks: 'Hai' }, { peranan: 'pelajar', teks: 'A' }, { peranan: 'coach', teks: 'B' }] }));
  assert.deepEqual(cb.contents.map(c => c.role), ['user', 'model', 'user']);
  assert.match(sysC('moomoo', 'professional'), /Pakar Dagangan Moomoo/); assert.match(sysC('kripto', 'beginner'), /seed phrase/);
  globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '**HODL** bermaksud simpan jangka panjang.\n\n\n\nSelesai.' }] }, finishReason: 'STOP' }] }));
  r = await post('/coach', { laluan: 'kripto', tahap: 'beginner', soalan: 'Apa itu HODL?' }); d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(d.jawapan, '**HODL** bermaksud simpan jangka panjang.\n\nSelesai.');
  assert.equal((await post('/coach', { laluan: 'kripto', soalan: 'A?' }, aenv, 'https://jahat.example')).status, 403);
  assert.equal((await post('/coach', { laluan: 'moomoo', soalan: 'A?' }, { ...aenv, COACH_LIMIT: { limit: async () => ({ success: false }) } })).status, 429);
}
// Audit lanjutan Semak Kertas: rubrik tesis, NC industri, laras akademik, carta alir dan pelan lantai 20 x 80 kaki
{
  const T = 'Pengenalan. Kajian ini menilai pemprosesan ayam beku di sebuah kilang PKS. Ayam diterima dan disimpan dalam bilik sejuk pada suhu 10°C sebelum dipotong. ' +
    'Pekerja tak perlu cuci tangan kerana mereka pakai sarung tangan. Ayam yang dah siap dibungkus terus dihantar dengan lori biasa. Kesimpulannya kilang ini bagus. '.repeat(2);
  assert.equal(checkA({ text: 'pendek' }).error, 'Teks terlalu pendek untuk audit lanjutan.');
  assert.equal(checkA({ text: 'x'.repeat(60001) }).status, 413);
  assert.equal(checkA({ text: T, lang: 'en' }).lang, 'en');
  assert.match(sysA('ms'), /NC \(Non-Conformance\)/);
  assert.match(sysA('ms'), /bukan Bahasa Indonesia/);
  assert.ok(JSON.parse(auditBody(T, 'ms')).generationConfig.responseSchema.properties.nc);
  const ans = {
    bidang: 'Sains Makanan: Keselamatan Makanan', profil: 'Pemeriksa Sains Makanan', soalan: 'Nilai pemprosesan ayam beku.',
    rubrik: { pengenalan: { skor: 30, ulasan: 'Objektif kabur.', ada: true }, literatur: { skor: 4.3, ulasan: 'Tiada.', ada: true }, analisis: { skor: 10, ulasan: 'u', ada: true }, metodologi: { skor: 12, ulasan: 'u', ada: false }, kesimpulan: { skor: -2, ulasan: 'u', ada: false } },
    hujah: [
      { bahagian: 'Kesimpulan', petikan: 'Kesimpulannya kilang ini bagus', jenis: 'tanpa-sokongan', isu: 'Dakwaan tanpa bukti.', kesan: 'Analisis: hilang 3 markah', tahap: 'rendah', cadangan: 'Sokong dengan data.' },
      { bahagian: 'P2', petikan: 'ayat rekaan yang tiada', jenis: 'pelik', isu: 'Generalisasi melulu.', kesan: 'k', tahap: 'tinggi', cadangan: 'c' },
      { bahagian: 'P5', jenis: 'lari-tajuk', isu: '', kesan: 'k', tahap: 'tinggi', cadangan: 'c' }
    ],
    peta: { akar: 'Pemprosesan ayam', cabang: [{ label: 'Penerimaan', anak: ['Suhu', '', 'a', 'b', 'c', 'd'] }, { label: 'Penyimpanan', anak: [] }, { label: '' }] },
    industri: true,
    nc: [
      { bahagian: 'P3', petikan: 'Pekerja tak perlu cuci tangan', titik: 'Kebersihan diri', standard: 'MS 1514', huraian: 'h', cadangan: 'c', tahap: 'minor' },
      { bahagian: 'P2', petikan: 'disimpan dalam bilik sejuk pada suhu 10°C', titik: 'CCP simpanan dingin', standard: 'MS 1480', huraian: 'Suhu terlalu tinggi.', cadangan: 'Simpan pada 0 hingga 4°C.', tahap: 'major' },
      { bahagian: 'P4', petikan: 'petikan yang tiada dalam teks langsung', titik: 'Pengangkutan', standard: 'MS 2400-1', huraian: 'Lori biasa.', cadangan: 'Lori bertebat.', tahap: 'major' },
      { bahagian: 'x', titik: '', huraian: 'h', cadangan: 'c', tahap: 'major' }
    ],
    laras: [
      { asal: 'Pekerja tak perlu cuci tangan', baru: 'Pekerja tidak perlu mencuci tangan', sebab: 'Bahasa basahan.' },   // muncul dua kali: dibuang
      { asal: 'Ayam diterima dan disimpan', baru: 'Pekerja menerima dan menyimpan ayam', sebab: 'Ayat pasif mengaburkan pelaku.' },
      { asal: 'tiada dalam teks', baru: 'x', sebab: 's' }
    ],
    aliran: { tajuk: 'Pemprosesan ayam', langkah: [{ label: 'Terima ayam', jenis: 'mula', suhu: '' }, { label: 'Simpan dingin', jenis: 'ccp', suhu: '10°C' }, { label: 'Potong', jenis: 'pelik' }, { label: '' }] },
    fasiliti: { berkaitan: true, zon: [{ nama: 'Penerimaan', panjang: 10, jenis: 'mentah' }, { nama: 'Bilik sejuk', panjang: 25, jenis: 'sejuk' }, { nama: 'Pemotongan', panjang: 30, jenis: 'proses' }, { nama: 'Tandas', panjang: 1, jenis: 'kebersihan' }, { nama: 'Penghantaran', panjang: 20, jenis: 'siap' }] }
  };
  const c = cleanA(ans, T);
  assert.deepEqual(RUBRIK_SKOR(c), [20, 4.5, 10, 12, 0]);
  assert.equal(c.rubrik.metodologi.ada, false); assert.equal(c.rubrik.kesimpulan.ada, true);   // hanya literatur dan metodologi boleh tidak berkaitan
  assert.equal(c.jumlah, Math.round((20 + 4.5 + 10 + 0) / 80 * 100));                          // metodologi dikecualikan
  assert.equal(c.bidang, 'Sains Makanan: Keselamatan Makanan');
  assert.equal(c.hujah.length, 2); assert.equal(c.hujah[0].tahap, 'tinggi'); assert.equal(c.hujah[0].jenis, 'struktur'); assert.equal(c.hujah[0].petikan, '');
  assert.equal(c.hujah[1].petikan, 'Kesimpulannya kilang ini bagus');
  assert.equal(c.peta.cabang.length, 2); assert.deepEqual(c.peta.cabang[0].anak, ['Suhu', 'a', 'b', 'c']);
  assert.equal(c.nc.length, 3);
  assert.deepEqual(c.nc.map(n => n.kod), ['NC-01', 'NC-02', 'NC-03']);
  assert.equal(c.nc[0].tahap, 'major');                       // major didahulukan
  assert.equal(c.nc.find(n => n.titik === 'Pengangkutan').petikan, '');   // petikan rekaan dikosongkan
  assert.equal(c.laras.length, 1); assert.equal(c.laras[0].asal, 'Ayam diterima dan disimpan');
  assert.equal(c.aliran.langkah.length, 3); assert.equal(c.aliran.langkah[2].jenis, 'proses');
  assert.equal(c.fasiliti.berkaitan, true); assert.equal(c.fasiliti.lebar, 20); assert.equal(c.fasiliti.panjang, 80);
  assert.equal(c.fasiliti.zon.reduce((t, z) => t + z.panjang, 0), 80);
  assert.ok(c.fasiliti.zon.every(z => z.panjang >= 4 && Number.isInteger(z.panjang)));
  // Bukan tugasan industri: tiada NC; bukan fasiliti: tiada zon
  const c2 = cleanA({ ...ans, industri: false, fasiliti: { berkaitan: false, zon: ans.fasiliti.zon } }, T);
  assert.equal(c2.nc.length, 0); assert.equal(c2.fasiliti.berkaitan, false); assert.equal(c2.fasiliti.zon.length, 0);
  const c0 = cleanA(null, T);
  assert.deepEqual(c0.nc, []); assert.deepEqual(c0.hujah, []); assert.equal(c0.jumlah, 0); assert.deepEqual(c0.aliran.langkah, []); assert.deepEqual(c0.peta.cabang, []);
  assert.match(sysA('ms'), /ralat logik/); assert.match(sysA('en'), /academic British English/);
  for (const zs of [[{ panjang: 1 }, { panjang: 1 }], [{ panjang: 300 }, { panjang: 2 }, { panjang: 2 }, { panjang: 2 }, { panjang: 2 }, { panjang: 2 }, { panjang: 2 }, { panjang: 2 }, { panjang: 2 }], [{ panjang: 0 }, { panjang: 'x' }, { panjang: 50 }]]) {
    const n = normalZon(zs); assert.equal(n.reduce((t, z) => t + z.panjang, 0), 80, JSON.stringify(n)); assert.ok(n.every(z => z.panjang >= 4));
  }
  // Laluan /audit
  const aenv = { GEMINI_API_KEY: 'g', ALLOWED_ORIGINS: env.ALLOWED_ORIGINS };
  const post = (body, e = aenv, origin = 'https://bijaklabur.my') => worker.fetch(new Request(W + '/audit', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }), e);
  globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(ans) }] }, finishReason: 'STOP' }] }));
  let r = await post({ text: T, lang: 'ms' }), d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(d.nc.length, 3); assert.equal(d.fasiliti.zon.length, 5);
  assert.equal((await post({ text: T }, aenv, 'https://jahat.example')).status, 403);
  assert.equal((await post({ text: T }, { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS })).status, 503);
  assert.equal((await post({ text: 'pendek' })).status, 400);
  assert.equal((await post({ text: T }, { ...aenv, AUDIT_LIMIT: { limit: async () => ({ success: false }) } })).status, 429);
  // Penyedia sandaran menerima permintaan yang lebih kecil (had 4096 token) dengan had item yang lebih rendah
  globalThis.fetch = async () => new Response('{}', { status: 429 });
  let seen = null;
  r = await post({ text: T }, { ...aenv, AI: { run: async (m, input) => { seen = input; return { response: ans }; } } }); d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(d.penghala, undefined); assert.equal(d.nc.length, 3);
  assert.equal(seen.max_tokens, 4096); assert.match(seen.messages[0].content, /sehingga 6 isu/); assert.doesNotMatch(seen.messages[0].content, /sehingga 12 isu/);
  assert.match(sysA('ms'), /sehingga 12 isu/);
  // Jawapan sandaran yang terpotong: 429 (cuba lagi), bukan 502
  r = await post({ text: T }, { ...aenv, AI: { run: async () => ({ response: '{"rubrik": {"pengenalan"' }) } });
  assert.equal(r.status, 429);
  // Nilai panjang zon tidak terhingga dan petikan yang terlalu pendek atau sebahagian perkataan
  const nz = normalZon([{ panjang: Infinity }, { panjang: 10 }, { panjang: -Infinity }]);
  assert.equal(nz.reduce((t, z) => t + z.panjang, 0), 80); assert.ok(nz.every(z => Number.isFinite(z.panjang) && z.panjang >= 4));
  const c3 = cleanA({ ...ans, hujah: [{ bahagian: 'x', petikan: 'yam', jenis: 'struktur', isu: 'i', kesan: 'k', tahap: 'tinggi', cadangan: 'c' }, { bahagian: 'x', petikan: 'iterima dan disimpan dalam', jenis: 'struktur', isu: 'i', kesan: 'k', tahap: 'tinggi', cadangan: 'c' }], nc: [{ ...ans.nc[1], petikan: 'a' }] }, T);
  assert.deepEqual(c3.hujah.map(h => h.petikan), ['', '']); assert.equal(c3.nc[0].petikan, '');
}
// Had saiz badan sebenar: permintaan tanpa Content-Length (chunked) juga dihadkan
{
  const strim = n => new Request('https://f.example/x', { method: 'POST', duplex: 'half', body: new ReadableStream({ start(c) { for (let i = 0; i < n; i++) c.enqueue(new TextEncoder().encode('"' + 'x'.repeat(998) + '"'.slice(0, 1))); c.close(); } }) });
  await assert.rejects(readJson(strim(20), 10_000));
  assert.deepEqual(await readJson(new Request('https://f.example/x', { method: 'POST', body: JSON.stringify({ q: 'abc' }) }), 100), { q: 'abc' });
  const r = await worker.fetch(new Request('https://f.example/coach', { method: 'POST', duplex: 'half', headers: { origin: 'https://bijaklabur.my', 'content-type': 'application/json' }, body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"soalan":"' + 'x'.repeat(40_000) + '"}')); c.close(); } }) }), { GEMINI_API_KEY: 'k', ALLOWED_ORIGINS: 'https://bijaklabur.my' }, {});
  assert.equal(r.status, 413);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
}
function RUBRIK_SKOR(c) { return ['pengenalan', 'literatur', 'analisis', 'metodologi', 'kesimpulan'].map(k => c.rubrik[k].skor); }
console.log('Semua ujian Tanya AI lulus');

// Penghala berbilang penyedia (9Router): combo, penyejukan, format OpenAI, gambar sandaran
{
  const realFetch = globalThis.fetch;
  resetPenghala();
  // Hanya penyedia berkunci aktif; AI_COMBO mengubah susunan
  assert.deepEqual(combo({}).map(p => p.id), []);
  assert.deepEqual(combo({ GROQ_API_KEY: 'a', MISTRAL_API_KEY: 'b' }).map(p => p.id), ['groq', 'mistral']);
  assert.deepEqual(combo({ GROQ_API_KEY: 'a', MISTRAL_API_KEY: 'b', AI_COMBO: 'mistral' }).map(p => p.id), ['mistral', 'groq']);
  // Penyedia tanpa model lalai perlu <ID>_MODEL
  assert.deepEqual(combo({ CHUTES_API_KEY: 'c' }).map(p => p.id), []);
  assert.deepEqual(combo({ CHUTES_API_KEY: 'c', CHUTES_MODEL: 'm' }).map(p => p.id), ['chutes']);
  assert.ok(aiSedia({ GROQ_API_KEY: 'a' })); assert.ok(!aiSedia({}));
  assert.equal(new Set(PENYEDIA.map(p => p.id)).size, PENYEDIA.length);
  assert.ok(PENYEDIA.every(p => p.url.startsWith('https://') && /^[A-Z_]+$/.test(p.key)));
  // Penyejukan: 429 undur eksponen, 401 lama, 400 tiada
  assert.deepEqual(cooldownFor(429, '', 0), { fallback: true, ms: 2000, level: 1 });
  assert.equal(cooldownFor(429, '', 3).ms, 16000);
  assert.equal(cooldownFor(429, '', 15).ms, 300000);
  assert.equal(cooldownFor(401).ms, 600000);
  assert.equal(cooldownFor(400, 'bad').ms, 0);
  assert.equal(cooldownFor(500).ms, 30000);
  // Format OpenAI: sistem + JSON + skema; gambar hanya untuk model penglihatan
  const body = { systemInstruction: { parts: [{ text: 'SYS' }] }, contents: [{ role: 'user', parts: [{ text: 'soalan' }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { status: { type: 'STRING' } } }, maxOutputTokens: 20000, temperature: 0.2 } };
  let o = keOpenAI(body);
  assert.ok(o.messages[0].content.startsWith('SYS') && o.messages[0].content.includes('"type":"object"'));
  assert.equal(o.messages[1].content, 'soalan'); assert.equal(o.max_tokens, 8192); assert.deepEqual(o.response_format, { type: 'json_object' });
  const img = { contents: [{ parts: [{ inline_data: { mime_type: 'image/png', data: 'QQ==' } }, { text: 'x' }] }], generationConfig: {} };
  assert.equal(keOpenAI(img), null);
  assert.equal(keOpenAI(img, { vision: true }).messages[1].content[0].image_url.url, 'data:image/png;base64,QQ==');

  // Gemini 429 -> Groq 429 (disejukkan) -> Mistral berjaya
  const seen = [];
  globalThis.fetch = async (url, init) => {
    url = String(url);
    if (url.includes('generativelanguage')) return new Response('{"error":"quota"}', { status: 429 });
    const b = JSON.parse(init.body); seen.push([url.split('/')[2], b.model, init.headers.authorization]);
    if (url.includes('groq')) return new Response('{"error":{"message":"Rate limit reached"}}', { status: 429 });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Jawapan: {"status":"ok"} tamat' } }] }), { status: 200 });
  };
  const e2 = { GEMINI_API_KEY: 'g', GROQ_API_KEY: 'kg', MISTRAL_API_KEY: 'km' };
  let d = await geminiGenerate(e2, JSON.stringify(body));
  assert.equal(d.penghala, 'mistral'); assert.equal(d.candidates[0].content.parts[0].text, '{"status":"ok"}');
  assert.deepEqual(seen, [['api.groq.com', 'llama-3.3-70b-versatile', 'Bearer kg'], ['api.mistral.ai', 'mistral-small-latest', 'Bearer km']]);
  // Groq masih disejukkan: terus ke Mistral
  seen.length = 0; d = await geminiGenerate(e2, JSON.stringify(body));
  assert.deepEqual(seen.map(x => x[0]), ['api.mistral.ai']);
  // Gambar: model penglihatan; Cerebras (tiada penglihatan) dilangkau
  resetPenghala(); seen.length = 0;
  d = await penghalaGenerate({ CEREBRAS_API_KEY: 'c', GROQ_API_KEY: 'g', AI_COMBO: 'cerebras,groq' }, JSON.stringify(img));
  assert.equal(d, null);   // groq 429
  assert.deepEqual(seen.map(x => x[1]), ['meta-llama/llama-4-maverick-17b-128e-instruct']);
  // response_format tidak disokong: cuba sekali lagi tanpanya
  resetPenghala(); seen.length = 0; let n = 0;
  globalThis.fetch = async (url, init) => { const b = JSON.parse(init.body); n++; if (b.response_format) return new Response('response_format json_object not supported', { status: 400 });
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"a":1}' } }] })); };
  d = await penghalaGenerate({ CEREBRAS_API_KEY: 'c' }, JSON.stringify(body));
  assert.equal(n, 2); assert.equal(d.penghala, 'cerebras');
  // Semua gagal -> Workers AI (binding) seperti dahulu
  resetPenghala();
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  d = await geminiGenerate({ GEMINI_API_KEY: 'g', GROQ_API_KEY: 'k', AI: { run: async () => ({ response: '{"status":"ok"}' }) } }, JSON.stringify(body));
  assert.equal(d.penghala, 'workers-ai');
  // Tanpa Gemini, hanya penyedia lain: masih berfungsi
  resetPenghala();
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"status":"ok"}' } }] }));
  d = await geminiGenerate({ GROQ_API_KEY: 'k' }, JSON.stringify(body));
  assert.equal(d.penghala, 'groq');
  // Ralat rangkaian: disejukkan, cuba seterusnya
  resetPenghala();
  globalThis.fetch = async url => { if (String(url).includes('groq')) throw new Error('network'); return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] })); };
  d = await penghalaGenerate({ GROQ_API_KEY: 'k', MISTRAL_API_KEY: 'm' }, JSON.stringify({ contents: [{ parts: [{ text: 'hai' }] }] }));
  assert.equal(d.penghala, 'mistral'); assert.equal(d.candidates[0].content.parts[0].text, 'ok');

  // Gambar sandaran: Together (b64) kemudian Hugging Face (bait)
  resetPenghala();
  globalThis.fetch = async (url, init) => { url = String(url);
    if (url.includes('together')) { assert.equal(JSON.parse(init.body).model, 'black-forest-labs/FLUX.1-schnell-Free'); return new Response(JSON.stringify({ data: [{ b64_json: 'QUJD' }] })); }
    return new Response(new Uint8Array(200).fill(0x89)); };
  assert.deepEqual(await gambarSandaran({ TOGETHER_API_KEY: 't', HF_TOKEN: 'h' }, 'cat'), { image: 'QUJD', mime: 'image/jpeg', penyedia: 'together' });
  resetPenghala();
  globalThis.fetch = async url => String(url).includes('together') ? new Response('limit', { status: 429 }) : new Response(new Uint8Array(200).fill(0x89));
  let g = await gambarSandaran({ TOGETHER_API_KEY: 't', HF_TOKEN: 'h' }, 'cat');
  assert.equal(g.penyedia, 'huggingface'); assert.equal(g.mime, 'image/png');
  assert.equal(await gambarSandaran({}, 'cat'), null);
  // Studio Gambar: kuota Workers AI habis -> sandaran
  resetPenghala();
  globalThis.fetch = async url => String(url).includes('together') ? new Response(JSON.stringify({ data: [{ b64_json: 'QUJD' }] })) : new Response('{}', { status: 503 });
  const r = await worker.fetch(new Request(W + '/gambar', { method: 'POST', headers: { origin: 'https://bijaklabur.my', 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'kucing comel' }) }),
    { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS, TOGETHER_API_KEY: 't', AI: { run: async () => { throw new Error('3036: Account limited to 10000 daily neurons'); } } });
  d = await r.json(); assert.equal(r.status, 200, JSON.stringify(d)); assert.equal(d.image, 'QUJD'); assert.equal(d.penghala, 'together');
  // Tanpa binding AI tetapi ada kunci gambar sandaran
  const r2 = await worker.fetch(new Request(W + '/gambar', { method: 'POST', headers: { origin: 'https://bijaklabur.my', 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'kucing comel' }) }),
    { ALLOWED_ORIGINS: env.ALLOWED_ORIGINS, TOGETHER_API_KEY: 't' });
  assert.equal(r2.status, 200);
  globalThis.fetch = realFetch; resetPenghala();
  console.log('penghala 9Router OK');
}

// Rujukan berskala besar: muka surat dikumpul 50 sehalaman fail, berat BM25 dalam indeks, kitab pelbagai didahulukan
{
  const { buildIndex: bi, search: cari, page: hal, PAGES } = await import('./src/rujukan.js');
  assert.equal(PAGES, 50);
  const ids = KITAB.map(b => b.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const k of ['kifayah', 'asybah', 'bulugh', 'bidayah', 'ianah', 'mughni', 'raudhah', 'majmu', 'zuhaili']) assert.ok(KITAB.some(b => b.k === k), k);
  const banyak = Array.from({ length: 120 }, (_, i) => i === 0 ? 'باب الربا في البيع' : `صفحة ${i + 1} ` + 'كلام '.repeat(20));
  banyak[99] = 'باب الربا والصرف في الذهب';
  const f2 = bi({ zuhaili: banyak, mughni: ['باب الربا في الذهب والفضة'], kifayah: ['فصل في الربا والذهب'] });
  assert.ok(f2.has('rujukan/p/zuhaili/0.json') && f2.has('rujukan/p/zuhaili/1.json') && f2.has('rujukan/p/zuhaili/2.json') && !f2.has('rujukan/p/zuhaili/3.json'));
  assert.ok(![...f2.keys()].some(p => p.endsWith('.txt')));
  const m = JSON.parse(f2.get('rujukan/meta.json'));
  assert.equal(m.N, 122); assert.equal(m.dl, undefined);
  const e2 = { RUJUKAN: { fetch: async req => { const p = new URL(req.url).pathname.slice(1); return f2.has(p) ? new Response(f2.get(p)) : new Response('', { status: 404 }); } } };
  assert.equal(await hal(e2, 'zuhaili', 100), 'باب الربا والصرف في الذهب');
  assert.equal(await hal(e2, 'zuhaili', 51), 'صفحة 51 ' + 'كلام '.repeat(20));
  assert.equal(await hal(e2, 'zuhaili', 500), null);
  const h2 = await cari(e2, 'الربا الذهب', 8);
  // Tiga kitab berbeza didahulukan sebelum halaman kedua Zuhaili
  assert.deepEqual(new Set(h2.slice(0, 3).map(h => h.k)), new Set(['zuhaili', 'mughni', 'kifayah']), JSON.stringify(h2.map(h => h.id)));
  assert.ok(h2.find(h => h.id === 'kitab:zuhaili:100').teks.includes('الصرف'));
  console.log('rujukan berskala besar OK');
}
