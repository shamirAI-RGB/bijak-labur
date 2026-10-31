/* Ujian hujung ke hujung: alat pelajar (Semak Kertas, Gaya tulisan AI, kedai Nota IC220).
   Jalankan: NODE_PATH=$(npm root -g) node scripts/uji-alat/jalan.mjs pelajar */
import { readFile } from 'node:fs/promises';

const K = 'Pelajar';
const FIQH = 'https://fiqh.siswacap.my';

/* ---------- Pembantu ---------- */
// Tarikh hari ini (waktu Malaysia), sama seperti kiraan kuota dalam js/premium.js
const hariIni = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
// Kiraan perkataan yang sama dengan js/checker.js dan js/gaya-ai.js
const perkataan = t => t.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
const kiraGaya = t => (t.match(/[\p{L}\p{N}'-]+/gu) || []).length;
const tunggu = (page, fn, arg, ms = 15000) => page.waitForFunction(fn, arg, { timeout: ms });
const toast = (t, re, ms = 8000) => t.ada('.toast', re, ms);
async function muatTurun(page, klik) {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), klik()]);
  return { nama: d.suggestedFilename(), isi: await readFile(await d.path(), 'utf8') };
}
function pastikan(syarat, mesej) { if (!syarat) throw new Error(mesej); }
const sama = (a, b, apa) => pastikan(a === b, `${apa}: dijangka ${JSON.stringify(b)}, dapat ${JSON.stringify(a)}`);

// Fail .docx minimum (ZIP tanpa mampatan) supaya laluan mammoth diuji tanpa fail binari dalam repo
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) { let c = (crc ^ b) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function zip(fail) {
  const bah = [], pusat = []; let off = 0;
  for (const [n, d] of fail) {
    const nama = Buffer.from(n), data = Buffer.from(d), crc = crc32(data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt32LE(crc, 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nama.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nama.length, 28); c.writeUInt32LE(off, 42);
    bah.push(h, nama, data); pusat.push(c, nama); off += 30 + nama.length + data.length;
  }
  const cd = Buffer.concat(pusat), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(fail.length, 8); e.writeUInt16LE(fail.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...bah, cd, e]);
}
const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function docx(perenggan) {
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${perenggan.map(p => `<w:p><w:r><w:t xml:space="preserve">${xml(p)}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`]
  ]);
}
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
// Fail .pdf minimum satu muka surat (fon Helvetica standard), satu baris teks bagi setiap elemen
function pdf(baris) {
  const strim = `BT /F1 12 Tf 72 720 Td 16 TL ${baris.map(b => `(${b.replace(/[\\()]/g, '\\$&')}) Tj T*`).join(' ')} ET`;
  const obj = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${strim.length} >>\nstream\n${strim}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n'; const off = [];
  obj.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${off.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

/* ---------- Teks ujian ---------- */
// Kesalahan bahasa yang dikesan dalam peranti (tanpa AI), dengan pembetulan yang dijangka
const SALAH = 'Saya mengunakan telefon pintar utk mengulang kaji setiap malam di asrama. Kadang2 ianya membantu saya memahami topik yang sukar , tetapi kadang-kadang ia juga mengganggu tumpuan. Ibu bapa perlu memantau anak-anak samada di rumah atau disekolah. Masalah ini di selesaikan jika semua pihak bekerjasama. Teknologi adalah merupakan alat yang berguna bagi para pelajar-pelajar.';
const BETUL = [['mengunakan', 'menggunakan'], ['utk', 'untuk'], ['Kadang2', 'Kadang-kadang'], ['ianya', 'ia'], [' ,', ','], ['samada', 'sama ada'], ['disekolah', 'di sekolah'], ['di selesaikan', 'diselesaikan'], ['adalah merupakan', 'merupakan'], ['para pelajar-pelajar', 'para pelajar']];

// Plagiarisme: satu ayat disalin tepat daripada sumber yang ditampal
const SALIN = 'Kaedah purata kos ringgit membolehkan pelabur membeli lebih banyak unit apabila harga pasaran jatuh dan kurang unit apabila harga naik.';
const AYAT2 = 'Saham patuh Syariah disaring oleh Majlis Penasihat Syariah Suruhanjaya Sekuriti dua kali setahun.';
const SUMBER = `${SALIN} Ini ayat lain dalam sumber yang tiada kaitan langsung.\n---\nPengenalan ringkas. ${AYAT2} Ini penutup sumber kedua.`;
const KERTAS_PLAG = `${AYAT2} ${SALIN} Saya pilih dana indeks kerana yuran pengurusannya rendah dan senang dipantau. Rakan sebilik saya lebih suka simpanan tetap di bank kerana tidak mahu risiko.`;

// Tugasan penuh: rujukan (dua sah, satu rekaan), sitasi yang hilang, untuk ulasan pakar, audit lanjutan dan semakan rujukan
const TUGASAN = `Pengenalan
Pelaburan patuh Syariah semakin popular dalam kalangan pelajar universiti di Malaysia (Ali, 2023). Kajian ini meneliti cara pelajar memilih saham dan dana unit amanah yang disaring oleh Majlis Penasihat Syariah. Ramai responden menggunakan aplikasi telefon untuk membuat pelaburan pertama mereka selepas menerima elaun bulanan. Menurut Ali (2023), kaedah pelaburan berkala membantu pelajar yang mempunyai pendapatan kecil. Data tambahan diperoleh daripada laporan tahunan bank (Tiada, 2020). Rekaan (2019) pula mendakwa semua pelajar melabur dalam kripto tanpa sebarang bukti.

Rujukan
Ali, A. (2023). Kajian ujian pelaburan pelajar. Jurnal Ujian, 5(2), 10-20.
Ahmad, B. (2023). Kajian ujian pelaburan pelajar. https://doi.org/10.1000/uji.1
Rekaan, C. (2019). Tajuk khayalan tentang kripto di bulan. Penerbit Palsu.`;

// Gaya tulisan: klise BM yang diketahui beratnya dalam js/gaya-ai.js
const KLISE = 'Dalam era globalisasi ini, teknologi kewangan berkembang dengan pesat di negara kita sejak sepuluh tahun lalu. Tidak dapat dinafikan bahawa aplikasi pelaburan memudahkan pelajar membeli saham dengan modal kecil. Platform ini memainkan peranan yang amat penting dalam pendidikan kewangan anak muda. Pendekatan holistik diperlukan untuk mendidik pelabur muda tentang risiko pasaran yang sebenar. Pelaburan berkala adalah merupakan kaedah yang sesuai bagi pelajar yang berpendapatan kecil setiap bulan. Pelajar juga perlu membaca prospektus sebelum membeli mana-mana dana unit amanah tempatan.';
const BERAT_KLISE = 3 + 3 + 2 + 1 + 2;   // era globalisasi, tidak dapat dinafikan, memainkan peranan, holistik, adalah merupakan

// Teks berbunyi AI dan teks santai untuk perbandingan peratus AI
const AI_EN = `In today's fast-paced world, technology plays a pivotal role in education. Furthermore, it is important to note that digital platforms foster holistic learning. Moreover, students leverage comprehensive resources to navigate the complexities of modern academia. Additionally, educators utilize robust tools to deliver seamless experiences. In conclusion, the landscape of education is ever-evolving and multifaceted. Furthermore, institutions must harness the power of innovation to remain relevant. Moreover, collaboration underscores the importance of shared knowledge across disciplines. Ultimately, a comprehensive approach fosters robust outcomes for every learner.`;
const SANTAI_EN = `honestly i didnt think id finish this essay lol. My laptop died twice last week and I had to borrow my roommate's one, which kinda sucked. I wrote most of it at the mamak near campus because the wifi in our hostel is terrible! Anyway, I think online classes are ok but I miss seeing my friends. My lecturer said we can submit late if we email her first, so I did that. Not sure if my points make sense but I tried my best, really.`;

const NOTA_KULIAH = 'Zakat pendapatan dikira sebanyak dua setengah peratus daripada pendapatan bersih selepas tolakan keperluan asas. Nisab zakat ditetapkan berdasarkan harga semasa lapan puluh lima gram emas. Haul ialah tempoh satu tahun hijrah yang mesti dilalui sebelum zakat harta diwajibkan. Pembayar zakat di Selangor boleh menuntut rebat cukai pendapatan bagi zakat yang dibayar. Asnaf zakat terdiri daripada lapan golongan yang disebut dalam al-Quran.';
const RESUME = `Ahmad Faiz bin Rahman
No. KP: 990101-14-5678 | E-mel: faiz.rahman@contoh.my | Telefon: 012-345 6789
Graduan Ijazah Sarjana Muda  Pengurusan Industri Halal daripada Universiti Teknologi MARA dengan PNGK 3.65.
Menjalani latihan industri selama enam bulan di bahagian jaminan kualiti sebuah kilang makanan sejuk beku.
Mengurus rekod suhu harian bilik sejuk dan menyediakan laporan audit dalaman setiap bulan.
Mahir menggunakan Microsoft Excel, sistem ERP dan memahami keperluan MS 1500:2019 serta HACCP.`;
const IKLAN = `Eksekutif Jaminan Kualiti Halal di sebuah syarikat pengeluar makanan di Shah Alam. Calon perlu memahami MS 1500:2019, HACCP dan GMP. Bertanggungjawab menyediakan dokumen pensijilan halal JAKIM, menjalankan audit dalaman dan melatih pekerja barisan pengeluaran. Pengalaman menggunakan SAP adalah satu kelebihan.`;

// Kuiz dengan jawapan diketahui: untuk menguji pemarkahan (jawapan pelayan sebenar ditiru pada aras halaman)
const KUIZ = { soalan: [
  { soalan: 'Berapakah kadar zakat pendapatan?', pilihan: ['1%', '2.5%', '5%', '10%'], jawapan: 1, penerangan: 'Sumber menyebut dua setengah peratus.' },
  { soalan: 'Apakah asas nisab zakat?', pilihan: ['Perak', 'Gandum', 'Emas 85 gram', 'Wang kertas'], jawapan: 2, penerangan: 'Nisab berdasarkan 85 gram emas.' }
] };

/* ---------- Data contoh pelayan nota (bentuk jawapan sama seperti worker-nota/src/index.js) ---------- */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNQTX6NFTEMLQkADGRcwcht3uAAAAAASUVORK5CYII=', 'base64');
const NOTA = [
  { id: 'aaaaaa01', title: 'Pengenalan Industri Halal', code: 'HIM101', desc: 'Bab 1 hingga 5 dengan rajah.', price: 15, pages: 42, size: 1258291, ext: 'pdf', preview: '/notes/aaaaaa01/preview?v=k1', created: '2026-09-01T00:00:00.000Z' },
  { id: 'aaaaaa02', title: 'Sistem Jaminan Halal', code: 'HIM202', desc: 'Nota ringkas MS 1500.', price: 12.5, pages: 30, size: 512000, ext: 'pdf', preview: '', created: '2026-09-02T00:00:00.000Z' },
  { id: 'aaaaaa03', title: 'Logistik Halal', code: 'HIM303', desc: '', price: 0, pages: 0, size: 2048, ext: 'docx', preview: '', created: '2026-09-03T00:00:00.000Z' },
  { id: 'aaaaaa04', title: 'Undang-undang Makanan', code: 'LAW210', desc: 'Akta Makanan 1983.', price: 10, pages: 25, size: 800000, ext: 'pdf', preview: '', created: '2026-09-04T00:00:00.000Z' },
  { id: 'aaaaaa05', title: 'Fiqh Muamalat', code: 'CTU151', desc: 'Jual beli dan riba.', price: 8, pages: 18, size: 300000, ext: 'pptx', preview: '', created: '2026-09-05T00:00:00.000Z' }
];
const TETAPAN = { wa: [{ no: '60102546720', label: 'WhatsApp 1' }, { no: '60176040973', label: 'WhatsApp 2' }], msg: 'Hi saya berminat nak beli nota untuk belajar', payNote: 'Imbas kod QR untuk bayar, kemudian hantar resit melalui WhatsApp.', qr: '/qr?v=q1' };
const KUNCI_PEMILIK = 'kunci-ujian-pemilik-123';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, Content-Type', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', 'content-type': 'application/json' };
const balas = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: CORS });

export const fixture = [
  [/^https:\/\/nota\.siswacap\.my\/notes\/[a-z0-9]+\/preview/, () => new Response(PNG, { headers: { 'content-type': 'image/png', 'access-control-allow-origin': '*' } })],
  [/^https:\/\/nota\.siswacap\.my\/qr/, () => new Response(PNG, { headers: { 'content-type': 'image/png', 'access-control-allow-origin': '*' } })],
  [/^https:\/\/nota\.siswacap\.my\/notes(?:\?|$)/, (u, r) => r.method() === 'OPTIONS' ? new Response(null, { status: 204, headers: CORS }) : balas({ notes: NOTA, settings: TETAPAN })],
  [/^https:\/\/nota\.siswacap\.my\/admin\//, (u, r) => {
    if (r.method() === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if ((r.headers().authorization || '') !== 'Bearer ' + KUNCI_PEMILIK) return balas({ error: 'Kunci pemilik salah.' }, 401);
    const p = new URL(u).pathname;
    if (p === '/admin/check') return balas({ ok: true });
    if (p === '/admin/notes') return balas({ notes: [...NOTA, { id: 'aaaaaa06', title: 'Draf tersembunyi', code: 'HIM999', desc: '', price: 5, pages: 3, size: 1000, ext: 'pdf', preview: '', created: '2026-09-06T00:00:00.000Z', hidden: true, name: 'draf.pdf' }].map(n => ({ hidden: false, name: n.title + '.pdf', ...n })), settings: TETAPAN });
    if (/\/link$/.test(p)) return balas({ ok: true, url: 'https://nota.siswacap.my/dl/abcdefghijkmnpqrstuvwxyz', expires: '2026-10-17T00:00:00.000Z' });
    return balas({ error: 'Laluan tidak dijumpai.' }, 404);
  }]
];

/* ---------- Pembantu Semak Kertas ---------- */
async function sediaSemak(t, page, teks, { web = false, pakar = false, rujukan = false, audit = false, lt = false, bahasa = 'auto', sumber = '' } = {}) {
  await t.buka('#semak');
  await t.isi('#paper', teks);
  await t.pilih('#lang', bahasa);
  await t.isi('#sources', sumber);
  for (const [id, v] of [['#optWeb', web], ['#optExpert', pakar], ['#optRefs', rujukan], ['#optAudit', audit], ['#optLT', lt]]) await page.setChecked(id, v);
}
async function semak(t, page) {
  await t.klik('#checkBtn');
  await t.tunggu('#results:not(.hidden)', 20000);
  await t.tunggu('#checkBtn:not([disabled])', 20000);
}
const laporan = page => page.evaluate(() => window.CheckerReport && window.CheckerReport());

export default [
  /* ================= Semak Kertas ================= */
  { kumpulan: K, nama: 'Semak: input kosong dan terlalu pendek ditolak', langkah: async (t, page) => {
    await t.buka('#semak');
    await t.klik('#checkBtn');
    await toast(t, /sekurang-kurangnya 20 patah perkataan/);
    await t.isi('#paper', 'Ayat ini terlalu pendek untuk disemak.');
    await t.ada('#wc', /^6 patah perkataan$/);
    await t.klik('#checkBtn');
    await toast(t, /sekurang-kurangnya 20 patah perkataan/);
    pastikan(await page.$eval('#results', e => e.classList.contains('hidden')), 'Keputusan dipaparkan untuk teks pendek');
    // Butang "Cuba contoh" mengisi teks contoh yang boleh terus disemak
    await t.klik('#sampleBtn');
    await t.ada('#wc', /^([2-9]\d|\d{3,}) patah perkataan$/);
    for (const id of ['#optWeb', '#optExpert', '#optRefs', '#optAudit']) await page.setChecked(id, false);
    await semak(t, page);
    await t.ada('#suggList', /mengunakan/);
    await t.ada('#suggList', /Gaya \/ bunyi AI/);
  } },

  { kumpulan: K, nama: 'Semak: cadangan bahasa bervisual, terima, abai, terima semua, salin dan muat turun', langkah: async (t, page) => {
    await sediaSemak(t, page, SALAH, { bahasa: 'ms' });
    await semak(t, page);
    // Setiap kesalahan yang diketahui disenaraikan dengan pembetulan yang tepat
    const diff = await page.$$eval('#suggList .sugg .diff', els => els.map(e => [e.querySelector('del')?.textContent, e.querySelector('ins')?.textContent]));
    const vis = s => s.replace(/^ +| +$/g, m => '␣'.repeat(m.length));
    for (const [a, b] of BETUL) pastikan(diff.some(([d, i]) => d === vis(a) && i === vis(b)), `Cadangan "${a}" -> "${b}" tiada. Dapat: ${JSON.stringify(diff)}`);
    sama(await t.teks('#suggCount'), String(BETUL.length), 'Bilangan cadangan');
    sama((await page.$$('#annotated mark.fix')).length, BETUL.length, 'Tanda dalam teks beranotasi');
    // Klik tanda dalam teks memfokus kad cadangan yang sepadan
    const id = await page.$eval('#annotated mark.fix', m => m.dataset.id);
    await page.click('#annotated mark.fix');
    await t.tunggu(`#sg-${id}.focus`, 3000);
    // Terima satu cadangan: teks beranotasi menunjukkan pembetulan
    const idTerima = await page.$$eval('#suggList .sugg', els => els.find(e => e.querySelector('del')?.textContent === 'mengunakan').id.slice(3));
    await t.klik(`[data-apply="${idTerima}"]`);
    await t.ada(`mark.fix.applied[data-id="${idTerima}"]`, /^menggunakan$/, 3000);
    await t.ada(`#sg-${idTerima}`, /Diterima/);
    sama(await t.teks('#suggCount'), String(BETUL.length - 1), 'Bilangan selepas terima');
    // Abaikan "ianya": kad ditanda diabaikan dan tanda dalam teks dibuang
    const idAbai = await page.$$eval('#suggList .sugg', els => els.find(e => e.querySelector('del')?.textContent === 'ianya').id.slice(3));
    await t.klik(`[data-dismiss="${idAbai}"]`);
    await t.ada(`#sg-${idAbai}`, /Diabaikan/);
    sama(await t.teks('#suggCount'), String(BETUL.length - 2), 'Bilangan selepas abai');
    pastikan(!(await page.$(`#annotated mark.fix[data-id="${idAbai}"]`)), 'Cadangan yang diabaikan masih ditanda dalam teks beranotasi');
    // Terima semua yang berbaki, kemudian salin: teks dibetulkan kecuali yang diabaikan
    await t.klik('#applyAll');
    await toast(t, /Semua pembetulan diterima/);
    sama(await t.teks('#suggCount'), '0', 'Baki cadangan');
    await t.klik('#copyFixed');
    await toast(t, /Teks disalin/);
    const dijangka = 'Saya menggunakan telefon pintar untuk mengulang kaji setiap malam di asrama. Kadang-kadang ianya membantu saya memahami topik yang sukar, tetapi kadang-kadang ia juga mengganggu tumpuan. Ibu bapa perlu memantau anak-anak sama ada di rumah atau di sekolah. Masalah ini diselesaikan jika semua pihak bekerjasama. Teknologi merupakan alat yang berguna bagi para pelajar.';
    sama(await page.evaluate(() => navigator.clipboard.readText()), dijangka, 'Teks disalin');
    sama(await t.teks('#annotated'), dijangka, 'Teks beranotasi selepas terima semua');
    const f = await muatTurun(page, () => t.klik('#dlFixed'));
    sama(f.nama, 'kertas-kerja-dibetulkan.txt', 'Nama fail');
    sama(f.isi, dijangka, 'Isi fail muat turun');
    // Statistik: bilangan perkataan dan ayat
    await t.ada('#stats', new RegExp(`${perkataan(SALAH).length}\\s*Patah perkataan`));
    await t.ada('#stats', /5\s*Ayat/);
    await t.ada('#stats', /Bahasa Melayu\s*Bahasa/);
  } },

  { kumpulan: K, nama: 'Semak: plagiarisme dengan sumber ditampal, peratus tepat dan tab paparan', langkah: async (t, page) => {
    await sediaSemak(t, page, KERTAS_PLAG, { sumber: SUMBER, bahasa: 'ms' });
    await semak(t, page);
    const n = perkataan(KERTAS_PLAG).length, m = perkataan(SALIN).length, m2 = perkataan(AYAT2).length, pct = Math.round((m + m2) / n * 100);
    const g = await page.$$eval('#gauges .gauge', els => els.map(e => [e.querySelector('text').textContent, e.querySelector('.lbl').textContent, e.querySelector('.sub').textContent]));
    sama(g[1][0], pct + '%', 'Gauge plagiarisme');
    sama(g[2][0], (100 - pct) + '%', 'Gauge keaslian');
    sama(g[1][2], pct < 10 ? 'Rendah' : pct < 25 ? 'Sederhana: semak petikan' : 'Tinggi: perlu rujukan/parafrasa', 'Label plagiarisme');
    const r = await laporan(page);
    sama(g[0][0], r.ai + '%', 'Gauge AI sepadan dengan laporan');
    // Sumber disusun mengikut bilangan perkataan sepadan
    const src = await page.$$eval('#sourceList details.src', els => els.map(e => [e.querySelector('.src-rank').textContent, e.querySelector('.src-name').textContent, e.querySelector('.src-pct').textContent]));
    sama(JSON.stringify(src), JSON.stringify([['1', 'Sumber anda #1', Math.round(m / n * 100) + '%'], ['2', 'Sumber anda #2', Math.round(m2 / n * 100) + '%']]), 'Senarai sumber');
    await t.ada('#sourceList .src-sum', /2 daripada 2 sumber/);
    await t.ada('#sourceList details.src', new RegExp(`1 petikan sama`));
    await page.click('#sourceList details.src summary');
    await t.ada('#sourceList .cmp', new RegExp(`${m} perkataan sama`));
    // Tab Plagiarisme: petikan yang sama diserlah dengan nombor sumber
    await t.klik('#viewTabs [data-v="plag"]');
    const sp = await page.$$eval('#annotated .s-plag', els => els.map(e => [e.dataset.rank, e.textContent]));
    sama(JSON.stringify(sp), JSON.stringify([['2', AYAT2.slice(0, -1) + '2'], ['1', SALIN.slice(0, -1) + '1']]), 'Serlahan plagiarisme');
    await t.ada('#legend', /Sama dengan sumber/);
    // Tab Peta AI
    await t.klik('#viewTabs [data-v="ai"]');
    await t.ada('#legend', /Tinggi kemungkinan AI/);
    pastikan(await page.$eval('#viewTabs [data-v="ai"]', b => b.classList.contains('active')), 'Tab Peta AI tidak aktif');
    // Kembali ke Pembetulan
    await t.klik('#viewTabs [data-v="fix"]');
    await t.ada('#legend', /Ejaan/);
  } },

  { kumpulan: K, nama: 'Semak: peratus AI teks klise lebih tinggi daripada teks santai (EN, LanguageTool luar talian)', langkah: async (t, page) => {
    await sediaSemak(t, page, AI_EN, { lt: true });
    await semak(t, page);
    // LanguageTool tidak dapat dihubungi: semakan asas diteruskan dengan amaran
    const ai = (await laporan(page)).ai;
    await t.ada('#stats', /English\s*Bahasa/);
    const sub1 = await t.teks('#gauges .gauge:first-child .sub');
    await t.isi('#paper', SANTAI_EN);
    await semak(t, page);
    const santai = (await laporan(page)).ai;
    const sub2 = await t.teks('#gauges .gauge:first-child .sub');
    pastikan(ai >= 55 && santai < 25 && ai > santai, `Peratus AI tidak masuk akal: klise ${ai}% (${sub1}), santai ${santai}% (${sub2})`);
    sama(sub1, 'Banyak ciri tulisan AI', 'Label AI teks klise');
    sama(sub2, 'Kemungkinan besar tulisan manusia', 'Label AI teks santai');
    // Frasa klise ditanda sebagai gaya AI
    await t.isi('#paper', AI_EN); await semak(t, page);
    await t.ada('#suggList', /Gaya \/ bunyi AI/);
    await t.ada('#suggList', /fast-paced world/);
  } },

  { kumpulan: K, nama: 'Semak: muat naik .txt, .docx dan .pdf', langkah: async (t, page) => {
    await t.buka('#semak');
    await page.setInputFiles('#fileIn', { name: 'tugasan.txt', mimeType: 'text/plain', buffer: Buffer.from(KERTAS_PLAG + '\r\n') });
    await toast(t, /Fail dimuatkan: tugasan\.txt/);
    sama(await page.inputValue('#paper'), KERTAS_PLAG, 'Teks daripada .txt');
    await t.ada('#wc', new RegExp(`^${perkataan(KERTAS_PLAG).length} patah perkataan$`));
    const p1 = 'Bab satu menerangkan konsep pelaburan patuh Syariah untuk pelajar universiti.', p2 = 'Bab dua membincangkan risiko & pulangan dana unit amanah <tempatan>.';
    await page.setInputFiles('#fileIn', { name: 'tugasan.docx', mimeType: MIME_DOCX, buffer: docx([p1, p2]) });
    await toast(t, /Fail dimuatkan: tugasan\.docx/);
    sama(await page.inputValue('#paper'), `${p1}\n\n${p2}`, 'Teks daripada .docx');
    // Seret dan lepas fail ke kawasan muat naik
    await page.evaluate(t => { const dt = new DataTransfer(); dt.items.add(new File([t], 'seret.txt', { type: 'text/plain' })); document.querySelector('#drop').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }, SALAH);
    await toast(t, /Fail dimuatkan: seret\.txt/);
    sama(await page.inputValue('#paper'), SALAH, 'Teks daripada fail yang diseret');
    // PDF (pdf.js dimuat apabila diperlukan)
    const b1 = 'Pelaburan patuh Syariah untuk pelajar universiti.', b2 = 'Dana indeks mempunyai yuran pengurusan yang rendah.';
    await page.setInputFiles('#fileIn', { name: 'tugasan.pdf', mimeType: 'application/pdf', buffer: pdf([b1, b2]) });
    await toast(t, /Fail dimuatkan: tugasan\.pdf/, 15000);
    const isiPdf = await page.inputValue('#paper');
    pastikan(isiPdf.includes(b1) && isiPdf.includes(b2), 'Teks daripada .pdf: ' + JSON.stringify(isiPdf));
    // Fail rosak: mesej mesra pengguna, tiada ralat halaman
    await page.setInputFiles('#fileIn', { name: 'rosak.docx', mimeType: MIME_DOCX, buffer: Buffer.from('bukan zip') });
    await toast(t, /Gagal membaca fail/);
  } },

  { kumpulan: K, nama: 'Semak: ulasan pakar, audit lanjutan, rujukan, tindakan dan laporan (desktop 1280)', lebar: 1280, langkah: async (t, page) => {
    await sediaSemak(t, page, TUGASAN, { pakar: true, rujukan: true, audit: true, bahasa: 'ms' });
    await semak(t, page);
    // Ulasan pakar (pelayan /semak): 5 kriteria x 7.5 = 75/100, gred UiTM A-
    await t.ada('#expertBox .xp-score', /^75\/100$/);
    await t.ada('#expertBox .xp-grade', /Gred anggaran A- \(skala UiTM\)/);
    sama((await page.$$('#expertBox .xp-row')).length, 5, 'Kriteria ulasan pakar');
    // Rujukan: dua disahkan (carian dan DOI), satu rekaan; sitasi "Tiada, 2020" tiada dalam senarai; Ahmad tidak disitasi
    await t.ada('#refBox .rf-sum', /2 disahkan.*0 hampir sepadan.*1 tidak dijumpai/);
    await t.ada('#refBox .rf-list', /AMARAN MERAH\s*Rekaan, C\. \(2019\)/);
    await t.ada('#refBox', /Disitasi dalam teks tetapi tiada dalam senarai rujukan\s*Tiada, 2020/);
    await t.ada('#refBox', /tidak disitasi dalam teks\s*Ahmad, B\. \(2023\)/);
    // Audit lanjutan (pelayan /audit): rubrik 5 x 7.5/20 = 38%, gred E; NC, carta alir dan pelan lantai
    pastikan(!(await page.$eval('#industriCard', e => e.classList.contains('hidden'))), 'Kad audit lanjutan tersembunyi');
    await t.ada('#industriBox .xp-score', /^38\/100$/);
    await t.ada('#industriBox .xp-grade', /Unjuran gred E/);
    await t.ada('#industriBox', /Matriks risiko pematuhan industri \(NC\).*NC-01/s);
    sama((await page.$$('#industriBox .ia-fig svg')).length, 2, 'Rajah carta alir dan pelan lantai');
    await t.ada('#industriBox', /Pelan lantai lot kedai 20 x 80 kaki/);
    // Peta konsep: salin kod Mermaid
    await t.klik('#industriBox [data-ia="mm-peta"]');
    await toast(t, /Kod Mermaid disalin/);
    pastikan((await page.evaluate(() => navigator.clipboard.readText())).startsWith('flowchart LR'), 'Kod Mermaid peta konsep tidak sah');
    const svg = await muatTurun(page, () => t.klik('#industriBox [data-ia="svg-pelan"]'));
    sama(svg.nama, 'pelan-lantai-20x80.svg', 'Nama fail SVG');
    pastikan(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(svg.isi) && /80 kaki/.test(svg.isi), 'SVG pelan lantai tidak sah');
    const py = await muatTurun(page, () => t.klik('#industriBox [data-ia="py"]'));
    sama(py.nama, 'anotasi_semakan.py', 'Nama skrip anotasi');
    // Data dalam skrip ialah base64 JSON yang sah dan mengandungi isu NC
    const b64 = [...py.isi.matchAll(/^ {4}"([A-Za-z0-9+/=]+)"$/gm)].map(x => x[1]).join('');
    const data = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    pastikan(Array.isArray(data.isu) && data.isu.some(i => /^NC-01/.test(i.tajuk)), 'Skrip anotasi tiada isu NC');
    // Tindakan seterusnya: markah utama daripada audit lanjutan; rujukan rekaan dalam lajur Kritikal
    await t.ada('#auditBox .audit-score', /38%\s*Gred E/);
    await t.ada('#auditBox .audit-col:first-child', /AMARAN MERAH.*Rekaan/);
    await t.klik('#auditCopy');
    await toast(t, /Laporan disalin/);
    pastikan((await page.evaluate(() => navigator.clipboard.readText())).startsWith('# Laporan Audit Akademik'), 'Laporan audit tidak disalin');
    const md = await muatTurun(page, () => t.klik('#auditDl'));
    sama(md.nama, 'laporan-audit-akademik.md', 'Nama laporan audit');
    pastikan(md.isi.startsWith('# Laporan Audit Akademik') && /Unjuran markah \| \*\*38% · Gred E\*\*/.test(md.isi) && /```mermaid/.test(md.isi), 'Kandungan laporan audit tidak lengkap');
    // Gaya tulisan (kad No AI Slop) juga dipaparkan selepas semakan
    await t.ada('#slopCard h3', /Gaya tulisan/);
    // Laporan PDF (Premium): window.print dipanggil dengan kandungan laporan
    await page.evaluate(() => { window.__cetak = 0; window.print = () => { window.__cetak++; }; });
    pastikan(await page.isVisible('#reportBtn'), 'Butang Laporan PDF tidak kelihatan');
    pastikan(!(await page.isVisible('#reportBtn .lock')), 'Ikon kunci kelihatan untuk pengguna Premium');
    await t.klik('#reportBtn');
    await tunggu(page, () => window.__cetak === 1, null, 5000);
    await t.ada('#printArea h1', /Laporan semakan kertas kerja/);
    await t.ada('#printArea .rp-gauges', /Anggaran AI/);
    pastikan(await page.evaluate(() => document.body.classList.contains('printing')), 'Mod cetak tidak diaktifkan');
    await page.evaluate(() => dispatchEvent(new Event('afterprint')));
    pastikan(!(await page.evaluate(() => document.body.classList.contains('printing'))), 'Mod cetak tidak ditamatkan');
  } },

  { kumpulan: K, nama: 'Semak: carian dalam talian luar talian, tiada sumber disemak', langkah: async (t, page) => {
    await sediaSemak(t, page, KERTAS_PLAG, { web: true, bahasa: 'ms' });
    await semak(t, page);
    sama(await t.teks('#gauges .gauge:nth-child(2) text'), '–', 'Gauge plagiarisme tanpa sumber');
    await t.ada('#gauges .gauge:nth-child(2) .sub', /Tiada sumber disemak/);
    await t.ada('#sourceList', /tidak dapat dihubungi/);
  } },

  { kumpulan: K, nama: 'Semak: ulasan pakar dan audit tidak dapat dihubungi, semakan asas diteruskan', langkah: async (t, page) => {
    await page.route(FIQH + '/semak', r => r.abort('internetdisconnected'));
    await page.route(FIQH + '/audit', r => r.fulfill({ status: 429, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: 'Audit lanjutan sibuk. Cuba lagi sebentar.' }) }));
    await sediaSemak(t, page, TUGASAN, { pakar: true, audit: true, bahasa: 'ms' });
    await semak(t, page);
    await t.ada('#expertBox .note', /Ulasan pakar tidak dapat dihubungi/);
    await t.ada('#industriBox .note', /Audit lanjutan sibuk/);
    // Tindakan seterusnya tetap dibina tanpa markah utama
    pastikan(!(await page.$('#auditBox .audit-score')), 'Markah utama dipaparkan tanpa ulasan');
    await t.ada('#auditBox', /Gaya AI/);
    pastikan(!(await page.$eval('#auditCard', e => e.classList.contains('hidden'))), 'Kad tindakan seterusnya tersembunyi');
    await t.ada('#gauges .gauge:nth-child(4) text', /^\d+%$/);
  } },

  { kumpulan: K, nama: 'Semak: hasil asas dipaparkan sementara ulasan pakar berjalan; gagal, kemudian Cuba semula berjaya', langkah: async (t, page) => {
    // Ulasan pakar ditahan: semakan asas mesti siap dan butang Semak aktif semula tanpa menunggu pelayan
    let lepas; const tahan = new Promise(r => { lepas = r; });
    await page.route(FIQH + '/semak', async r => { if (r.request().method() === 'OPTIONS') return r.fallback(); await tahan; return r.abort('timedout'); });
    await sediaSemak(t, page, TUGASAN, { pakar: true, bahasa: 'ms' });
    await semak(t, page);
    await t.ada('#gauges .gauge:nth-child(4) text', /^\d+%$/);
    await t.ada('#expertBox .semak-tunggu', /Ulasan pakar sedang menilai/, 5000);
    pastikan(!(await page.$eval('#checkBtn', b => b.disabled)), 'Butang Semak masih dinyahaktifkan semasa ulasan pakar berjalan');
    // Pelayan gagal: mesej sopan dan butang Cuba semula; hasil lain kekal
    lepas();
    await t.tunggu('#expertBox [data-semak-ulang="pakar"]', 10000);
    pastikan(!(await page.$('#expertBox .semak-tunggu')), 'Pemutar ulasan pakar masih dipaparkan selepas gagal');
    await t.ada('#gauges .gauge:nth-child(4) text', /^\d+%$/);
    // Cuba semula: pelayan menjawab, ulasan pakar dipaparkan
    await page.unroute(FIQH + '/semak');
    await t.klik('#expertBox [data-semak-ulang="pakar"]');
    await t.ada('#expertBox .xp-score', /^75\/100$/);
    sama((await page.$$('#expertBox .xp-row')).length, 5, 'Kriteria ulasan pakar selepas cuba semula');
  } },

  { kumpulan: K, nama: 'Semak: kuota percuma harian (tanpa Premium)', premium: false, storan: { bl_kuota: { d: hariIni(), semak: 2 } }, langkah: async (t, page) => {
    await sediaSemak(t, page, KERTAS_PLAG, { bahasa: 'ms' });
    await semak(t, page);
    await toast(t, /Itu semakan tugasan percuma terakhir hari ini/);
    sama(await page.evaluate(() => JSON.parse(localStorage.getItem('bl_kuota')).semak), 3, 'Kiraan kuota selepas semakan');
    // Laporan PDF dikunci untuk tetamu
    pastikan(await page.isVisible('#reportBtn .lock'), 'Ikon kunci tidak kelihatan tanpa Premium');
    await page.evaluate(() => { window.__cetak = 0; window.print = () => { window.__cetak++; }; });
    await t.klik('#reportBtn');
    await toast(t, /Premium/);
    await tunggu(page, () => location.hash === '#premium', null, 3000);
    sama(await page.evaluate(() => window.__cetak), 0, 'Cetak dipanggil tanpa Premium');
    // Semakan keempat ditolak
    await t.buka('#semak');
    await page.evaluate(() => document.querySelector('#results').classList.add('hidden'));
    await t.isi('#paper', KERTAS_PLAG);
    await t.klik('#checkBtn');
    await toast(t, /Had percuma 3 semakan tugasan sehari sudah dicapai/);
    pastikan(await page.$eval('#results', e => e.classList.contains('hidden')), 'Keputusan dipaparkan walaupun kuota habis');
    sama(await page.evaluate(() => JSON.parse(localStorage.getItem('bl_kuota')).semak), 3, 'Kuota bertambah walaupun ditolak');
  } },

  /* ================= Gaya tulisan AI ================= */
  { kumpulan: K, nama: 'Gaya AI: skor klise tepat, cadangan pelayan /manusia dan guna dalam teks', langkah: async (t, page) => {
    await sediaSemak(t, page, KLISE);
    await semak(t, page);
    const skor = Math.min(100, Math.round(BERAT_KLISE / kiraGaya(KLISE) * 100 * 12));
    await t.ada('#slopCard .sl-meter .num', new RegExp(`^${skor}$`));
    await t.ada('#slopCard .sl-meter', new RegExp(skor < 25 ? 'Semula jadi' : skor < 55 ? 'Ada beberapa klise' : 'Banyak klise dan corak AI'));
    const frasa = await page.$$eval('#slopCard .sl-list li > span:first-child b', els => els.map(e => e.textContent));
    sama(frasa.length, 5, 'Bilangan klise dikesan');
    sama(frasa[0], 'Dalam era globalisasi ini', 'Klise paling berat');
    for (const f of ['Tidak dapat dinafikan bahawa', 'memainkan peranan yang amat penting', 'holistik', 'adalah merupakan']) pastikan(frasa.includes(f), `Klise "${f}" tidak dikesan`);
    // Cadangan "(buang)" dalam senarai pembetulan: frasa dibuang, huruf seterusnya dibesarkan, teks beranotasi tidak berulang
    const idBuang = await page.$$eval('#suggList .sugg', els => els.find(e => e.querySelector('del')?.textContent === 'Tidak dapat dinafikan bahawa').id.slice(3));
    await t.ada(`#sg-${idBuang} ins`, /^\(buang\)$/);
    await t.klik(`[data-apply="${idBuang}"]`);
    sama(await t.teks('#annotated'), KLISE.replace('Tidak dapat dinafikan bahawa aplikasi', 'Aplikasi'), 'Teks beranotasi selepas frasa dibuang');
    // Minta cadangan AI
    await t.klik('#slGo');
    await t.tunggu('#slopCard .sl-fix', 15000);
    const [asal, baru] = await page.$eval('#slopCard .sl-fix', e => [e.querySelector('del').textContent, e.querySelector('ins').textContent]);
    pastikan(KLISE.includes(asal), 'Ayat asal cadangan tiada dalam teks');
    const n = (await page.$$('#slopCard .sl-fix')).length;
    await t.klik('#slopCard [data-guna="0"]');
    await toast(t, /Ayat dikemas kini dalam teks anda/);
    const kini = await page.inputValue('#paper');
    sama(kini, KLISE.replace(asal, baru), 'Teks selepas guna cadangan');
    sama((await page.$$('#slopCard .sl-fix')).length, n - 1, 'Cadangan yang digunakan dibuang');
    await t.ada('#wc', new RegExp(`^${perkataan(kini).length} patah perkataan$`));
  } },

  { kumpulan: K, nama: 'Gaya AI: tiada sambungan dan teks Inggeris (desktop 1280)', lebar: 1280, langkah: async (t, page) => {
    await page.route(FIQH + '/manusia', r => r.abort('internetdisconnected'));
    await sediaSemak(t, page, AI_EN);
    await semak(t, page);
    await t.ada('#slopCard .sl-list', /fast-paced world/i);
    await t.ada('#slopCard .sl-list', /it is important to note that/i);
    await t.klik('#slGo');
    await t.ada('#slopCard .error', /Tiada sambungan internet/);
    pastikan(!(await page.$eval('#slGo', b => b.disabled)), 'Butang kekal dinyahaktifkan selepas ralat');
    // Teks tanpa klise
    await t.isi('#paper', SANTAI_EN);
    await semak(t, page);
    await t.ada('#slopCard', /Tiada klise biasa ditemui/);
  } },

  /* ================= Nota IC220 ================= */
  { kumpulan: K, nama: 'Nota: senarai, harga, carian dan dialog beli WhatsApp', langkah: async (t, page) => {
    await t.buka('#nota');
    await t.tunggu('#view-nota .nt-card', 10000);
    sama((await page.$$('#view-nota .nt-card')).length, 5, 'Bilangan nota');
    await t.ada('#view-nota .nt-card[data-id="aaaaaa01"] .nt-price', /^RM 15\.00$/);
    await t.ada('#view-nota .nt-card[data-id="aaaaaa02"] .nt-price', /^RM 12\.50$/);
    await t.ada('#view-nota .nt-card[data-id="aaaaaa03"] .nt-price', /^Percuma$/);
    await t.ada('#view-nota .nt-card[data-id="aaaaaa01"] .nt-meta', /^42 muka surat · PDF · 1\.2 MB$/);
    await t.ada('#view-nota .nt-card[data-id="aaaaaa03"] .nt-meta', /^DOCX · 2 KB$/);
    sama(await page.$eval('#view-nota .nt-card[data-id="aaaaaa01"] .nt-cover img', i => i.src), 'https://nota.siswacap.my/notes/aaaaaa01/preview?v=k1', 'Gambar pratonton');
    sama(await page.$eval('#view-nota .nt-qr img', i => i.src), 'https://nota.siswacap.my/qr?v=q1', 'Kod QR');
    // Carian (lebih 4 nota)
    await page.fill('#ntSearch', 'him');
    await tunggu(page, () => document.querySelectorAll('#view-nota .nt-card').length === 3, null, 3000);
    sama(await page.$eval('#ntSearch', e => document.activeElement === e && e.value), 'him', 'Fokus carian');
    await page.fill('#ntSearch', 'tiada-sepadan');
    await t.ada('#view-nota .nt-empty', /Tiada nota sepadan dengan carian/);
    await page.fill('#ntSearch', 'riba');
    await t.ada('#view-nota .nt-card h3', /Fiqh Muamalat/);
    await page.fill('#ntSearch', '');
    // Dialog beli: harga dan mesej WhatsApp dengan butiran nota
    await t.klik('#view-nota .nt-card[data-id="aaaaaa02"] [data-act="buy"]');
    await t.tunggu('dialog.nt-dialog[open]', 3000);
    await t.ada('dialog.nt-dialog h2', /^Sistem Jaminan Halal$/);
    await t.ada('dialog.nt-dialog .nt-price.big', /^RM 12\.50$/);
    const wa = await page.$$eval('dialog.nt-dialog .nt-wa-btn', as => as.map(a => [a.href, a.textContent]));
    sama(wa.length, 2, 'Butang WhatsApp');
    const u = new URL(wa[0][0]);
    sama(u.origin + u.pathname, 'https://wa.me/60102546720', 'Nombor WhatsApp');
    sama(u.searchParams.get('text'), 'Hi saya berminat nak beli nota untuk belajar\n\nNota: HIM202 · Sistem Jaminan Halal (RM 12.50)', 'Mesej WhatsApp');
    pastikan(/010-254 6720/.test(wa[0][1]), 'Nombor telefon tidak diformat');
    await t.klik('dialog.nt-dialog [data-close]');
    await tunggu(page, () => !document.querySelector('dialog.nt-dialog'), null, 3000);
    // Nota percuma: mesej WhatsApp sepadan dengan harga yang dipaparkan
    await t.klik('#view-nota .nt-card[data-id="aaaaaa03"] [data-act="buy"]');
    await t.ada('dialog.nt-dialog .nt-price.big', /^Percuma$/);
    sama(new URL(await page.$eval('dialog.nt-dialog .nt-wa-btn', a => a.href)).searchParams.get('text'), 'Hi saya berminat nak beli nota untuk belajar\n\nNota: HIM303 · Logistik Halal (Percuma)', 'Mesej WhatsApp nota percuma');
    await page.keyboard.press('Escape');
    await tunggu(page, () => !document.querySelector('dialog.nt-dialog'), null, 3000);
    // Senarai disimpan untuk luar talian
    sama(await page.evaluate(() => JSON.parse(localStorage.getItem('bl_nota_cache')).notes.length), 5, 'Cache senarai nota');
  } },

  { kumpulan: K, nama: 'Nota: katalog subjek IC220, ringkasan, pratonton nota sepadan dan tempahan WhatsApp', langkah: async (t, page) => {
    await t.buka('#nota');
    await t.tunggu('#view-nota .nt-card', 10000);
    sama(JSON.stringify(await page.$$eval('#view-nota .nt-kat .nt-kat-kod', e => e.map(x => x.textContent))), JSON.stringify(['ISH402', 'IMU451', 'ISC452', 'ISC550', 'MPPHM 2020 / MHMS 2020']), 'Kod katalog');
    await t.ada('#view-nota .nt-kat[data-kat="ISC550"] h3', /^Qawaid Fiqhiyyah$/);
    await t.ada('#view-nota .nt-kat[data-kat="ISH402"] h3', /^Principle Food Science and Technology for Halal$/);
    // Butang tempah: WhatsApp pertama dengan kod dan nama subjek
    const u = new URL(await page.$eval('#view-nota .nt-kat[data-kat="IMU451"] .nt-wa-btn', a => a.href));
    sama(u.origin + u.pathname, 'https://wa.me/60102546720', 'Nombor WhatsApp tempahan');
    sama(u.searchParams.get('text'), 'Hi saya berminat nak beli nota untuk belajar\n\nTempah nota penuh: IMU451 Fiqh Muamalat', 'Mesej tempahan');
    // Ringkasan: topik utama dan dua butang WhatsApp
    await t.klik('#view-nota [data-kat-lihat="ISC550"]');
    await t.tunggu('dialog.nt-dialog[open]', 3000);
    await t.ada('dialog.nt-dialog h2', /^ISC550: Qawaid Fiqhiyyah$/);
    await t.ada('dialog.nt-dialog .nt-kat-topik', /al-umur bi maqasidiha/);
    sama((await page.$$('dialog.nt-dialog .nt-wa-btn')).length, 2, 'Butang WhatsApp ringkasan');
    pastikan(!(await page.$('dialog.nt-dialog .nt-kat-prev')), 'Pratonton tanpa nota sepadan');
    await page.keyboard.press('Escape');
    await tunggu(page, () => !document.querySelector('dialog.nt-dialog'), null, 3000);
    // Nota kedai yang sepadan dengan kod katalog: harga dan pratonton dipaparkan
    await page.route('https://nota.siswacap.my/notes', r => r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({ notes: [{ id: 'aaaaaa09', title: 'Nota Qawaid Fiqhiyyah', code: 'isc 550', price: 20, pages: 40, ext: 'pdf', preview: '/notes/aaaaaa09/preview?v=z' }], settings: {} }) }));
    // Navigasi hash sahaja (tanpa muat semula): Nota memuat senarai semula setiap kali halaman dibuka
    await t.buka('#utama');
    await t.buka('#nota');
    await t.ada('#view-nota .nt-kat[data-kat="ISC550"] .nt-kat-ada', /Ada dalam kedai, RM 20\.00/);
    await t.ada('#view-nota [data-kat-lihat="ISC550"]', /Lihat pratonton/);
    await t.klik('#view-nota [data-kat-lihat="ISC550"]');
    await t.tunggu('dialog.nt-dialog .nt-kat-prev', 3000);
    sama(await page.$eval('dialog.nt-dialog .nt-kat-prev', i => i.src), 'https://nota.siswacap.my/notes/aaaaaa09/preview?v=z', 'Pratonton nota sepadan');
    await t.ada('dialog.nt-dialog .nt-price.big', /^RM 20\.00$/);
  } },

  { kumpulan: K, nama: 'Nota: pelayan 503 tanpa cache dan dengan cache', langkah: async (t, page) => {
    await page.route('https://nota.siswacap.my/**', r => r.fulfill({ status: 503, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: 'Storan nota belum disediakan.' }) }));
    await t.buka('#nota');
    await t.ada('#view-nota .nt-msg', /Senarai nota belum dapat dimuatkan\. Storan nota belum disediakan\./);
    await t.ada('#view-nota .nt-empty', /lihat katalog subjek di bawah dan tempah nota penuh melalui WhatsApp/);
    // Katalog subjek tetap dipaparkan walaupun pelayan nota gagal
    sama((await page.$$('#view-nota .nt-kat')).length, 5, 'Kad katalog tanpa pelayan');
    // Butang WhatsApp lalai masih tersedia untuk bertanya
    sama((await page.$$('#view-nota .nt-buy .nt-wa-btn')).length, 2, 'Butang WhatsApp lalai');
    // Dengan cache: senarai lama dipaparkan bersama amaran
    await page.evaluate(n => localStorage.setItem('bl_nota_cache', JSON.stringify({ notes: n, settings: {} })), NOTA.slice(0, 2));
    await page.unroute('https://nota.siswacap.my/**');
    await page.route('https://nota.siswacap.my/**', r => r.abort('internetdisconnected'));
    await page.reload(); await t.buka('#nota');
    await t.ada('#view-nota .nt-msg', /Tiada sambungan ke pelayan nota/);
    sama((await page.$$('#view-nota .nt-card')).length, 2, 'Nota daripada cache');
  } },

  { kumpulan: K, nama: 'Nota: ruang pemilik, kunci salah dan betul (desktop 1280)', lebar: 1280, langkah: async (t, page) => {
    await t.buka('#nota');
    await t.tunggu('#view-nota .nt-card', 10000);
    await t.klik('#view-nota [data-act="login"]');
    await t.tunggu('dialog.nt-dialog[open] #ntLoginKey', 3000);
    await t.isi('#ntLoginKey', 'kunci-salah-sama-sekali');
    await t.klik('#ntLogin button[type=submit]');
    await t.ada('#ntLoginErr', /Kunci pemilik salah/);
    pastikan(await page.evaluate(() => !JSON.parse(localStorage.getItem('bl_nota_key') || '""')), 'Kunci salah disimpan');
    await t.isi('#ntLoginKey', KUNCI_PEMILIK);
    await t.klik('#ntLogin button[type=submit]');
    await toast(t, /Log masuk sebagai pemilik/);
    await t.ada('#view-nota .nt-badge', /Mod pemilik/);
    // Nota tersembunyi kelihatan kepada pemilik sahaja
    await t.ada('#view-nota .nt-card.is-hidden h3', /Draf tersembunyi/);
    // Pautan pembeli
    await t.klik('#view-nota .nt-card[data-id="aaaaaa01"] [data-act="link"]');
    await t.tunggu('#ntLinkUrl', 5000);
    sama(await page.inputValue('#ntLinkUrl'), 'https://nota.siswacap.my/dl/abcdefghijkmnpqrstuvwxyz', 'Pautan pembeli');
    await t.klik('dialog.nt-dialog [data-act="copy"]');
    await toast(t, /Pautan disalin/);
    await t.klik('dialog.nt-dialog [data-close]');
    // Log keluar
    await t.klik('#view-nota [data-act="logout"]');
    await toast(t, /Log keluar/);
    await tunggu(page, () => !document.querySelector('#view-nota .nt-badge'), null, 5000);
  } }
];
