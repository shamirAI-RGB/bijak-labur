/* Ujian hujung ke hujung: alat pelajar (kedai Nota IC220).
   Jalankan: NODE_PATH=$(npm root -g) node scripts/uji-alat/jalan.mjs pelajar */
import { readFile } from 'node:fs/promises';

const K = 'Pelajar';
const FIQH = 'https://fiqh.siswacap.my';

/* ---------- Pembantu ---------- */
// Tarikh hari ini (waktu Malaysia), sama seperti kiraan kuota dalam js/premium.js
const hariIni = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
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

export default [
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
