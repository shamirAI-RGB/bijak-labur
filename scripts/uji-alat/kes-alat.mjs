/* Ujian hujung ke hujung: Alat Pelajar (#alat dan tujuh alat dalam js/alat.js).
   Pelayan worker-fiqh sebenar dijalankan dalam proses (harness.mjs). Model palsu harness mengisi skema jawapan dengan ayat
   daripada bahan pengguna; bagi aliran yang memerlukan data tertentu (id kertas K1/K2, MCQ 4 pilihan, markah rubrik),
   jawapan model ditetapkan sementara dengan denganModel(), dan pelayan tetap membersihkan serta mengesahkannya. */
import { readFileSync } from 'node:fs';
import { crc32, deflateRawSync } from 'node:zlib';
import { panggilanAI } from './harness.mjs';

const K = 'Alat Pelajar';

/* ---------- Data ujian ---------- */
const NOTA = [
  'Pelaburan patuh Syariah ialah pelaburan yang mematuhi prinsip muamalat Islam.',
  'Saham patuh Syariah disaring oleh Majlis Penasihat Syariah Suruhanjaya Sekuriti.',
  'Penanda aras aktiviti bercampur ialah lima peratus dan dua puluh peratus.',
  'Nisbah hutang berasaskan faedah mestilah kurang daripada tiga puluh tiga peratus.',
  'Pelabur muda digalakkan melabur secara berkala setiap bulan.',
  'Kaedah purata kos ringgit mengurangkan risiko masa pasaran.',
  'Kepelbagaian portfolio mengurangkan risiko khusus syarikat.',
  'Dana amanah saham dikendalikan oleh pengurus dana yang berlesen.',
  'Sukuk ialah sijil pelaburan Islam yang mewakili pemilikan aset sebenar.',
  'Zakat pelaburan wajib dibayar apabila cukup haul dan nisab.',
  'Riba ialah tambahan yang disyaratkan ke atas pinjaman dan diharamkan dalam Islam.',
  'Gharar bermaksud ketidakpastian melampau dalam kontrak jual beli.',
  'Maisir merujuk kepada unsur perjudian yang dilarang dalam transaksi.',
  'Dividen yang tidak patuh Syariah perlu dibersihkan melalui sedekah.',
  'Pelajar universiti boleh bermula dengan dana indeks yang berkos rendah.',
  'Matlamat kewangan perlu khusus, boleh diukur dan mempunyai tempoh masa.'
].join(' ');
const AYAT = NOTA.split(/(?<=[.!?])\s+/);

const TRANSKRIP = `Baik semua, hari ini kita sambung topik pengurusan risiko dalam pelaburan. Risiko sistematik ialah risiko yang memberi kesan kepada seluruh pasaran.
Risiko tidak sistematik pula boleh dikurangkan melalui kepelbagaian portfolio. Ini penting dan akan keluar dalam peperiksaan akhir nanti.
Contohnya, jika anda hanya memegang saham satu syarikat, risiko anda sangat tinggi. Tugasan kumpulan perlu dihantar sebelum tujuh belas Oktober.
Minggu depan kita akan belajar tentang nisbah Sharpe dan cara mengira pulangan terlaras risiko.`;

const DRAF = 'Pengenalan. Kajian ini membincangkan kepentingan literasi kewangan dalam kalangan pelajar universiti di Malaysia. Kaedah tinjauan digunakan ke atas 50 responden di Shah Alam. Dapatan menunjukkan bahawa pelajar yang menyimpan secara berkala lebih yakin tentang masa depan kewangan mereka. Kesimpulannya, pendidikan kewangan perlu diperluas ke semua fakulti.';
const RUBRIK = 'Pengenalan dan objektif (10 markah): Cemerlang 9-10, Baik 7-8, Lemah 0-6.\nKandungan dan perbincangan (30 markah).\nRujukan (10 markah): sekurang-kurangnya 5 sumber.';

// Sembilan perenggan: model palsu memulangkan i = 8, jadi perenggan ke-9 (dengan petikan dan angka) dicadangkan diubah
const PERENGGAN = [
  'Pelajar universiti di Malaysia semakin berminat untuk melabur dalam pasaran saham sejak pandemik. Namun begitu, ramai yang melabur tanpa memahami risiko yang terlibat.',
  'Literasi kewangan ialah keupayaan untuk memahami dan menggunakan pelbagai kemahiran kewangan dengan berkesan.',
  'Kajian ini bertujuan untuk mengenal pasti tahap literasi kewangan dalam kalangan pelajar tahun akhir.',
  'Reka bentuk kajian ini ialah tinjauan keratan rentas menggunakan soal selidik dalam talian.',
  'Data dianalisis menggunakan statistik deskriptif dan ujian korelasi Pearson.',
  'Dapatan awal menunjukkan bahawa pelajar lelaki lebih cenderung mengambil risiko berbanding pelajar perempuan.',
  'Pelajar yang pernah mengikuti kursus kewangan peribadi menunjukkan skor literasi yang lebih tinggi.',
  'Faktor keluarga turut mempengaruhi tabiat menyimpan dan melabur dalam kalangan pelajar.',
  'Menurut kajian terdahulu (Ahmad, 2021), sebanyak 45% pelajar tidak mempunyai simpanan kecemasan yang mencukupi untuk tiga bulan.'
];

const KERTAS1 = `Jurnal Ujian, Jilid 5, Isu 2, 2023, halaman 10-20. DOI: 10.1000/uji.1
Kajian ujian pelaburan pelajar
Ahmad Ali, Universiti Teknologi MARA
Abstrak: Kajian ini meneliti tabiat pelaburan pelajar universiti di Malaysia melalui tinjauan ke atas 320 pelajar di tiga buah kampus. Dapatan menunjukkan bahawa literasi kewangan meramalkan penyertaan pelaburan secara signifikan. Pelajar yang menerima pendidikan kewangan lebih cenderung melabur secara berkala dan memilih dana patuh Syariah. Batasan kajian ialah sampel yang terhad kepada satu negeri sahaja.`;
const KERTAS2 = `Literasi kewangan dalam kalangan mahasiswa
Siti Nur Rahman, Wei Jie Lim dan Ravi Kumar
Jurnal Pengurusan Malaysia 12(1), 2021, 45-60
Abstrak: Kajian kualitatif ini menemu bual 24 mahasiswa untuk memahami cara mereka mengurus wang biasiswa dan pinjaman pendidikan. Hasil analisis tematik menunjukkan bahawa tekanan rakan sebaya dan media sosial mempengaruhi perbelanjaan mahasiswa. Mahasiswa yang mempunyai belanjawan bertulis kurang berhutang pada akhir semester berbanding rakan mereka.`;

const RUJUKAN_MODEL = {
  kertas: [
    { id: 'K1', jenis: 'jurnal', pengarang: [{ akhir: 'Ali', awal: 'Ahmad' }], tahun: '2023', tajuk: 'Kajian ujian pelaburan pelajar', sumber: 'Jurnal Ujian', jilid: '5', isu: '2', halaman: '10-20', penerbit: '', doi: '10.1000/uji.1', url: '',
      objektif: 'Meneliti tabiat pelaburan pelajar universiti.', metodologi: 'Tinjauan', sampel: '320 pelajar', dapatan: ['Literasi kewangan meramalkan penyertaan pelaburan.'], had: ['Sampel satu negeri.'], kata_kunci: ['literasi kewangan', 'pelaburan'],
      petikan: ['Dapatan menunjukkan bahawa literasi kewangan meramalkan penyertaan pelaburan secara signifikan.', 'Petikan rekaan yang tidak pernah wujud dalam kertas ini sama sekali.'] },
    { id: 'K2', jenis: 'jurnal', pengarang: [{ akhir: 'Rahman', awal: 'Siti Nur' }, { akhir: 'Lim', awal: 'Wei Jie' }, { akhir: 'Kumar', awal: 'Ravi' }], tahun: '2021', tajuk: 'Literasi kewangan dalam kalangan mahasiswa', sumber: 'Jurnal Pengurusan Malaysia', jilid: '12', isu: '1', halaman: '45-60', penerbit: '', doi: '10.9999/rekaan', url: '',
      objektif: 'Memahami cara mahasiswa mengurus wang.', metodologi: 'Temu bual, analisis tematik', sampel: '24 mahasiswa', dapatan: ['Tekanan rakan sebaya mempengaruhi perbelanjaan.', 'Belanjawan bertulis mengurangkan hutang.'], had: [], kata_kunci: ['belanjawan'], petikan: [] },
    { id: 'K7', jenis: 'jurnal', pengarang: [], tahun: '2020', tajuk: 'Kertas yang tidak dimuat naik', objektif: '', metodologi: '', dapatan: [], petikan: [] }
  ],
  tema: [{ nama: 'Literasi kewangan dan tingkah laku', huraian: 'Kedua-dua kajian mengaitkan literasi dengan tingkah laku kewangan.', kertas: ['K1', 'K2', 'K9'] }],
  percanggahan: [{ isu: 'Kaedah kajian', huraian: 'Satu kuantitatif, satu kualitatif.', kertas: ['K1', 'K2'] }],
  jurang: ['Tiada kajian membandingkan pelajar IPTA dan IPTS.'],
  sorotan: ['Literasi kewangan dikaitkan dengan penyertaan pelaburan (Ali, 2023) dan pengurusan perbelanjaan (Rahman et al., 2021).', 'Namun kedua-dua kajian menggunakan sampel yang terhad.'],
  soalan_kajian: ['Adakah pendidikan kewangan formal meningkatkan pelaburan berkala pelajar?']
};
const APA_K1 = 'Ali, A. (2023). Kajian ujian pelaburan pelajar. Jurnal Ujian, 5(2), 10–20. https://doi.org/10.1000/uji.1';
const APA_K2 = 'Rahman, S. N., Lim, W. J., & Kumar, R. (2021). Literasi kewangan dalam kalangan mahasiswa. Jurnal Pengurusan Malaysia, 12(1), 45–60.';

const PEK_MODEL = {
  tajuk: 'Pelaburan patuh Syariah', ringkasan: 'Perenggan pertama ringkasan.\nPerenggan kedua ringkasan.',
  konsep: [{ nama: 'Riba', huraian: 'Tambahan ke atas pinjaman.', penting: 3 }, { nama: 'Gharar', huraian: 'Ketidakpastian melampau.', penting: 1 }],
  mcq: [
    { soalan: 'Siapakah yang menyaring saham patuh Syariah?', pilihan: ['Majlis Penasihat Syariah', 'Bank Negara', 'Bursa', 'LHDN'], jawapan: 0, penerangan: 'MPS SC menyaring saham.', aras: 'ingat' },
    { soalan: 'Had nisbah hutang berasaskan faedah?', pilihan: ['5%', '33%', '20%', '50%'], jawapan: 1, penerangan: 'Had ialah 33%.', aras: 'faham' },
    { soalan: 'Apakah maksud gharar?', pilihan: ['Riba', 'Judi', 'Ketidakpastian melampau', 'Zakat'], jawapan: 2, penerangan: 'Gharar ialah ketidakpastian.', aras: 'faham' },
    { soalan: 'Bilakah zakat pelaburan wajib?', pilihan: ['Setiap minggu', 'Bila rugi', 'Bila untung', 'Cukup haul dan nisab'], jawapan: 3, penerangan: 'Syarat haul dan nisab.', aras: 'aplikasi' },
    { soalan: 'MCQ tidak sah (3 pilihan) dibuang pelayan', pilihan: ['a', 'b', 'c'], jawapan: 0, penerangan: '', aras: 'ingat' },
    { soalan: 'MCQ tidak sah (indeks 4) dibuang pelayan', pilihan: ['a', 'b', 'c', 'd'], jawapan: 4, penerangan: '', aras: 'ingat' }
  ],
  esei: [{ soalan: 'Bincangkan saringan saham patuh Syariah.', markah: 99, skema: [{ isi: 'Penanda aras aktiviti', markah: 4 }, { isi: 'Nisbah kewangan', markah: 6 }], tip: 'Beri contoh.' }],
  kad: [{ depan: 'Riba', belakang: 'Tambahan yang disyaratkan ke atas pinjaman.' }, { depan: 'Gharar', belakang: 'Ketidakpastian melampau dalam kontrak.' }],
  ramalan: [{ topik: 'Saringan Syariah', sebab: 'Ditekankan berulang kali.' }],
  mnemonik: [{ untuk: 'Larangan muamalat', mnemonik: 'RGM: Riba, Gharar, Maisir' }]
};

/* ---------- Pembantu ---------- */
const hariIni = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
const tambahHari = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const fmt = n => Number(n).toLocaleString('ms-MY');
const kata = t => (String(t).trim().match(/\S+/g) || []).length;
const pasti = (c, m) => { if (!c) throw new Error(m); };
const sama = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: dijangka ${JSON.stringify(b)}, dapat ${JSON.stringify(a)}`); };
const fail = (name, text, mimeType = 'text/plain') => ({ name, mimeType, buffer: Buffer.isBuffer(text) ? text : Buffer.from(text) });
const papan = page => page.evaluate(() => navigator.clipboard.readText());
const storan = (page, k) => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, k);
const kira = (page, sel) => page.locator(sel).count();
const teksSemua = (page, sel) => page.locator(sel).allTextContents();

// Permintaan ke pelayan AI daripada halaman (laluan dan badan)
function rekod(page) {
  const r = [];
  page.on('request', q => { const u = q.url(); if (u.startsWith('https://fiqh.bijaklabur.my/')) { let b = null; try { b = q.postDataJSON(); } catch {} r.push({ path: new URL(u).pathname, body: b }); } });
  return r;
}
async function muatTurun(page, sel) {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click(sel)]);
  return { nama: d.suggestedFilename(), isi: readFileSync(await d.path(), 'utf8') };
}
async function tiadaLimpahan(page) {
  const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  pasti(sw <= w + 1, `Limpahan mendatar: lebar kandungan ${sw}px > ${w}px`);
}

/* Tetapkan jawapan model bagi tugas tertentu buat sementara (selebihnya kekal model palsu harness).
   Nilai: objek (JSON), rentetan (teks mentah), Response, atau fungsi (badan permintaan) -> nilai. */
const API_MODEL = 'https://generativelanguage.googleapis.com/';
function tugasDari(b) {
  const p = (b.generationConfig && b.generationConfig.responseSchema && b.generationConfig.responseSchema.properties) || {};
  if (p.transkrip) return 'transkrip';
  if (p.kertas) return 'rujukan';
  if (p.mcq) return 'pek';
  if (p.kriteria) return 'rubrik';
  if (p.skor) return 'coach_nilai';
  if (p.nota) return 'kuliah';
  if (p.soalan) return p.soalan.items.properties.kenapa ? 'coach_soalan' : 'ingat_soalan';
  if (p.hasil) return p.struktur ? 'tulis' : 'ingat_semak';
  return '';
}
async function denganModel(jawapan, fn) {
  const asal = globalThis.fetch, dipanggil = [];
  globalThis.fetch = async (u, init = {}) => {
    const url = String(u && u.url || u);
    if (url.startsWith(API_MODEL)) {
      const b = JSON.parse(init.body || '{}'), tg = tugasDari(b);
      if (tg in jawapan) {
        dipanggil.push(tg);
        let v = jawapan[tg]; if (typeof v === 'function') v = v(b);
        if (v instanceof Response) return v;
        const text = typeof v === 'string' ? v : JSON.stringify(v);
        return new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10 } }), { headers: { 'content-type': 'application/json' } });
      }
    }
    return asal(u, init);
  };
  try { return await fn(dipanggil); } finally { globalThis.fetch = asal; }
}

/* Fail pejabat sebenar yang kecil untuk menguji pembaca PDF, PPTX dan DOCX dalam pelayar */
function zip(entri) {   // entri: [[nama, teks]] dimampat deflate
  const tempatan = [], pusat = [];
  let off = 0;
  for (const [nama, teks] of entri) {
    const n = Buffer.from(nama), asal = Buffer.from(teks), data = deflateRawSync(asal), crc = crc32(asal);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8); h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(data.length, 18); h.writeUInt32LE(asal.length, 22); h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10); c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(data.length, 20); c.writeUInt32LE(asal.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    tempatan.push(h, n, data); pusat.push(c, n); off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(pusat), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(entri.length, 8); e.writeUInt16LE(entri.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...tempatan, cd, e]);
}
const xmlEsc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const pptx = slaid => zip(slaid.map((baris, i) => [`ppt/slides/slide${i + 1}.xml`,
  `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody>${baris.map(b => `<a:p><a:r><a:t>${xmlEsc(b)}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`]));
const docx = perenggan => zip([
  ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
  ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
  ['word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${perenggan.map(p => `<w:p><w:r><w:t>${xmlEsc(p)}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`]]);
function pdf(baris) {   // satu halaman, fon Helvetica, satu baris setiap Tj
  const strim = 'BT /F1 11 Tf 50 780 Td 14 TL ' + baris.map(b => `(${b.replace(/[()\\]/g, '\\$&')}) Tj T*`).join(' ') + ' ET';
  const obj = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${strim.length} >>\nstream\n${strim}\nendstream`];
  let out = '%PDF-1.4\n';
  const off = obj.map((o, i) => { const x = out.length; out += `${i + 1} 0 obj\n${o}\nendobj\n`; return x; });
  const xref = out.length;
  out += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${off.map(x => String(x).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

const isiBahan = async (t, teks = NOTA) => { await t.tunggu('#alBahan'); await t.isi('#alBahan', teks); };

/* ---------- Kes ---------- */
export default [
  /* ===== Hab ===== */
  { kumpulan: K, nama: 'Hab: tujuh alat, lencana Premium, navigasi (desktop 1280)', lebar: 1280, langkah: async (t, page) => {
    await t.buka('#alat');
    await t.ada('#h-alat', /^Alat Pelajar$/);
    sama(await kira(page, '#view-alat .al-kad'), 7, 'Bilangan kad alat');
    const href = await page.$$eval('#view-alat .al-kad', a => a.map(x => x.getAttribute('href')));
    sama(href, ['#alat/rujukan', '#alat/pek', '#alat/rubrik', '#alat/coach', '#alat/ingat', '#alat/kuliah', '#alat/tulis'], 'Pautan alat');
    const pro = await page.$$eval('#view-alat .al-kad', a => a.filter(x => x.querySelector('.al-pro')).map(x => x.getAttribute('href')));
    sama(pro, ['#alat/rujukan', '#alat/kuliah', '#alat/tulis'], 'Alat berlencana Premium');
    pasti(!(await page.$('.al-ulang')), 'Kad ulang kaji tidak patut muncul tanpa dek');
    const lajur = await page.$eval('.al-grid', g => getComputedStyle(g).gridTemplateColumns.split(' ').length);
    sama(lajur, 3, 'Lajur grid pada 1280px');
    await t.klik('.al-kad[href="#alat/pek"]');
    await t.ada('#h-alat', /Pek Peperiksaan/);
    sama(await page.evaluate(() => location.hash), '#alat/pek', 'Hash selepas klik kad');
    await t.klik('.al-balik');
    await t.ada('#h-alat', /^Alat Pelajar$/);
    // Alat tidak wujud: hab dipaparkan
    await t.buka('#alat/tiada');
    sama(await kira(page, '#view-alat .al-kad'), 7, 'Hab untuk alat tidak wujud');
  } },

  /* ===== Kotak bahan dikongsi ===== */
  { kumpulan: K, nama: 'Kotak bahan: tampal, kiraan, simpan, muat naik .txt, sumber Buku Nota AI, kosongkan, dikongsi', storan: { buku_sumber: [
      { id: 'b1', tajuk: 'Bab 1 Riba', teks: AYAT.slice(10, 13).join(' '), on: true },
      { id: 'b2', tajuk: 'Bab 2 Sukuk', teks: AYAT.slice(8, 10).join(' '), on: true }] },
    langkah: async (t, page) => {
    await t.buka('#alat/pek');
    await isiBahan(t);
    await t.ada('#alBahanKira', new RegExp(`^${fmt(NOTA.length).replace(/[.,]/g, '\\$&')} aksara$`));
    sama((await storan(page, 'alat_bahan')).teks, NOTA, 'Bahan disimpan dalam alat_bahan');
    await page.reload(); await t.tunggu('#alBahan');
    sama(await page.inputValue('#alBahan'), NOTA, 'Bahan kekal selepas muat semula');
    // Muat naik fail teks: tajuk daripada nama fail
    const isiFail = AYAT.slice(0, 6).join(' ');
    await page.setInputFiles('#alBahanFail', fail('Kuliah 3 Syariah.txt', isiFail));
    await t.ada('.toast', /Bahan dimuatkan/);
    await t.ada('.al-bahan', /Bahan semasa: Kuliah 3 Syariah\./);
    sama(await page.inputValue('#alBahan'), isiFail, 'Teks fail dalam kotak bahan');
    // Dua fail: tajuk digabung, teks berkepala
    await page.setInputFiles('#alBahanFail', [fail('Bab A.txt', AYAT.slice(0, 3).join(' ')), fail('Bab B.md', AYAT.slice(3, 6).join(' '))]);
    await t.ada('.al-bahan', /Bahan semasa: Bab A, Bab B\./);
    pasti((await page.inputValue('#alBahan')).startsWith('Bab A\n' + AYAT[0]), 'Teks dua fail bermula dengan tajuk fail pertama');
    // Fail terlalu pendek ditolak
    await page.setInputFiles('#alBahanFail', fail('kosong.txt', 'Terlalu pendek.'));
    await t.ada('.toast', /kosong\.txt: tiada teks yang boleh dibaca/);
    // Sumber Buku Nota AI
    sama(await teksSemua(page, '#alBuku option'), ['Guna sumber Buku Nota AI…', 'Bab 1 Riba', 'Bab 2 Sukuk', 'Semua sumber (2)'], 'Pilihan sumber');
    await t.pilih('#alBuku', '1');
    await t.ada('.al-bahan', /Bahan semasa: Bab 2 Sukuk\./);
    sama(await page.inputValue('#alBahan'), AYAT.slice(8, 10).join(' '), 'Teks satu sumber');
    await t.pilih('#alBuku', 'semua');
    await t.ada('.al-bahan', /Bahan semasa: Bab 1 Riba, Bab 2 Sukuk\./);
    pasti((await page.inputValue('#alBahan')).startsWith('Bab 1 Riba\n' + AYAT[10]), 'Semua sumber berkepala tajuk');
    // Dikongsi dengan alat lain
    await t.buka('#alat/coach');
    pasti((await page.inputValue('#alBahan')).startsWith('Bab 1 Riba'), 'Bahan dikongsi dengan Jurulatih');
    await t.klik('[data-act="kosong-bahan"]');
    sama(await page.inputValue('#alBahan'), '', 'Bahan dikosongkan');
    await t.ada('#alBahanKira', /^0 aksara$/);
    pasti(!(await page.$('[data-act="kosong-bahan"]')), 'Butang Kosongkan hilang selepas dikosongkan');
    sama(await storan(page, 'alat_bahan'), { tajuk: '', teks: '' }, 'alat_bahan selepas dikosongkan');
  } },

  { kumpulan: K, nama: 'Kotak bahan: muat naik PDF, PPTX dan DOCX sebenar', langkah: async (t, page) => {
    await t.buka('#alat/pek');
    await page.setInputFiles('#alBahanFail', fail('Slaid Minggu 3.pptx', pptx([[AYAT[0], AYAT[1]], [AYAT[2]]]), 'application/vnd.openxmlformats-officedocument.presentationml.presentation'));
    await t.ada('.al-bahan', /Bahan semasa: Slaid Minggu 3\./);
    sama(await page.inputValue('#alBahan'), `Slaid 1\n${AYAT[0]}\n${AYAT[1]}\n\nSlaid 2\n${AYAT[2]}`, 'Teks PPTX setiap slaid');
    await page.setInputFiles('#alBahanFail', fail('Bab 2.docx', docx([AYAT[3], AYAT[4]]), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
    await t.ada('.al-bahan', /Bahan semasa: Bab 2\./);
    sama((await page.inputValue('#alBahan')).split(/\n+/), [AYAT[3], AYAT[4]], 'Teks DOCX');
    await page.setInputFiles('#alBahanFail', fail('Nota kuliah.pdf', pdf([AYAT[5], AYAT[6]]), 'application/pdf'));
    await t.ada('.al-bahan', /Bahan semasa: Nota kuliah\./, 20000);
    const teksPdf = await page.inputValue('#alBahan');
    pasti(teksPdf.includes(AYAT[5]) && teksPdf.includes(AYAT[6]), `Teks PDF dibaca: ${JSON.stringify(teksPdf.slice(0, 120))}`);
    // PDF imbasan (tiada lapisan teks) ditolak dengan mesej yang jelas
    await page.setInputFiles('#alBahanFail', fail('imbasan.pdf', pdf([]), 'application/pdf'));
    await t.ada('.toast', /imbasan\.pdf: tiada teks yang boleh dibaca \(PDF imbasan tidak disokong\)/, 20000);
    pasti((await page.inputValue('#alBahan')).includes(AYAT[5]), 'Bahan sedia ada kekal');
  } },

  /* ===== Pek Peperiksaan ===== */
  { kumpulan: K, nama: 'Pek: ralat peranti, ralat pelayan dan model gagal dipaparkan dengan mesra, tidak terbawa ke alat lain', langkah: async (t, page) => {
    const req = rekod(page);
    await t.buka('#alat/pek');
    // Bahan pendek ditolak dalam peranti tanpa panggilan pelayan
    await isiBahan(t, AYAT[0]);
    await t.klik('[data-act="jana-pek"]');
    await t.ada('.toast', /Tambah bahan dahulu \(sekurang-kurangnya 150 aksara\)/);
    sama(req.length, 0, 'Tiada permintaan ke pelayan');
    sama(await page.evaluate(() => document.activeElement && document.activeElement.id), 'alBahan', 'Fokus ke kotak bahan');
    // Lulus semakan peranti (panjang selepas trim > 150) tetapi pelayan meruntuhkan ruang dan menolak
    await isiBahan(t, 'Nota' + ' '.repeat(300) + 'akhir.');
    await t.klik('[data-act="jana-pek"]');
    await t.ada('#view-alat .error[role="alert"]', /^Tambah nota atau slaid dahulu \(sekurang-kurangnya 150 aksara\)\.$/);
    pasti(await page.isEnabled('[data-act="jana-pek"]'), 'Butang jana boleh ditekan semula');
    // Model memulangkan teks bukan JSON, kemudian jawapan disekat
    await isiBahan(t);
    await denganModel({ pek: 'ini bukan JSON' }, async () => {
      await t.klik('[data-act="jana-pek"]');
      await t.ada('#view-alat .error[role="alert"]', /^Alat Pelajar tidak tersedia buat masa ini\.$/);
    });
    const disekat = new Response(JSON.stringify({ candidates: [{ finishReason: 'SAFETY' }] }), { headers: { 'content-type': 'application/json' } });
    await denganModel({ pek: () => disekat.clone() }, async () => {
      await t.klik('[data-act="jana-pek"]');
      await t.ada('#view-alat .error[role="alert"]', /^Kandungan ini tidak dapat diproses\.$/);
    });
    pasti(!(await page.$('.al-hasil-kepala')), 'Tiada hasil selepas ralat');
    // Ralat milik Pek tidak muncul dalam alat lain, dan dibersihkan apabila kembali
    await t.buka('#alat/rubrik');
    await t.tunggu('#alRubrik');
    pasti(!(await page.$('#view-alat .error')), 'Ralat Pek tidak patut muncul dalam Penyemak Rubrik');
    await t.buka('#alat/pek');
    await t.tunggu('#alBahan');
    pasti(!(await page.$('#view-alat .error')), 'Ralat lama dibersihkan apabila kembali');
  } },

  { kumpulan: K, nama: 'Pek: jana (model palsu ikut skema), tab, ringkasan, konsep, esei, ramalan', lebar: 1280, langkah: async (t, page) => {
    const req = rekod(page), n0 = panggilanAI.length;
    await t.buka('#alat/pek');
    await isiBahan(t);
    await t.klik('[data-act="jana-pek"]');
    await t.ada('.al-hasil-kepala', /Ringkasan/, 20000);
    pasti(panggilanAI.length > n0, 'Model dipanggil oleh pelayan');
    sama(req.map(r => [r.path, r.body.tugas, r.body.teks === NOTA]), [['/alat', 'pek', true]], 'Badan permintaan pek');
    sama(await teksSemua(page, '.al-tabs .seg'), ['Ringkasan', 'MCQ (0)', 'Esei + skema', 'Kad imbas', 'Ramalan'], 'Tab pek (MCQ 3 pilihan dibuang pelayan)');
    await t.klik('[data-tab="pek:mcq"]');
    await t.ada('#view-alat .al-badan', /Tiada soalan aneka pilihan yang sah/);
    pasti(!(await page.$('[data-act="mod-masa"]')), 'Tiada mod peperiksaan 0 minit');
    await t.klik('[data-tab="pek:ringkasan"]');
    // Ringkasan: ayat daripada bahan; konsep penting dihadkan kepada 3 titik
    const ring = await t.teks('.bk-out');
    pasti(AYAT.some(a => ring.includes(a)), 'Ringkasan mengandungi ayat daripada bahan');
    sama(await teksSemua(page, '.al-titik'), ['●●●', '●●●', '●●●'], 'Titik kepentingan konsep');
    // Esei: markah = jumlah skema (3 x 7.5)
    await t.klik('[data-tab="pek:esei"]');
    await t.ada('.al-tabs .seg.active', /Esei \+ skema/);
    sama(await page.$eval('[data-tab="pek:esei"]', b => b.getAttribute('aria-selected')), 'true', 'aria-selected tab esei');
    sama(await page.$eval('[data-tab="pek:ringkasan"]', b => b.getAttribute('aria-selected')), 'false', 'aria-selected tab ringkasan');
    sama(await kira(page, '.al-esei'), 3, 'Bilangan soalan esei');
    await t.ada('.al-esei', /\(22\.5 markah\)/);
    await page.click('.al-esei summary');
    sama(await teksSemua(page, '.al-esei:first-child .al-skema td.num'), ['7.5', '7.5', '7.5'], 'Markah skema');
    await t.ada('.al-esei:first-child details', /Tip:/);
    await t.klik('[data-tab="pek:ramalan"]');
    sama(await kira(page, '.bk-out .bk-topic'), 6, 'Ramalan (3) dan mnemonik (3)');
    await t.ada('.bk-out', /Mnemonik/);
    // Hasil disimpan dan kekal selepas muat semula
    await page.reload(); await t.ada('.al-hasil-kepala', /Ringkasan/);
    await tiadaLimpahan(page);
  } },

  { kumpulan: K, nama: 'Pek: MCQ dijawab dan diskor, ulang, salin semua', langkah: async (t, page) => {
    await t.buka('#alat/pek');
    await isiBahan(t);
    await denganModel({ pek: PEK_MODEL }, async () => {
      await t.klik('[data-act="jana-pek"]');
      await t.ada('.al-hasil-kepala', /MCQ \(4\)/, 20000);
    });
    // Markah esei dikira semula daripada skema (4 + 6), bukan 99 daripada model
    await t.klik('[data-tab="pek:esei"]');
    await t.ada('.al-esei', /\(10 markah\)/);
    await t.klik('[data-tab="pek:mcq"]');
    sama(await kira(page, '.bk-mcq'), 4, 'Bilangan MCQ');
    await t.klik('[data-mcq="0:0"]');                     // betul
    await t.ada('.bk-score', /Skor: 1\/1$/);
    await t.klik('[data-mcq="1:0"]');                     // salah (jawapan B)
    await t.ada('.bk-score', /Skor: 1\/2$/);
    sama(await page.$eval('[data-mcq="1:0"]', b => b.className), 'bk-opt bad', 'Pilihan salah ditanda');
    sama(await page.$eval('[data-mcq="1:1"]', b => b.className), 'bk-opt ok', 'Jawapan betul ditunjuk');
    pasti(await page.isDisabled('[data-mcq="1:2"]'), 'Pilihan dikunci selepas menjawab');
    pasti((await page.locator('.bk-mcq').nth(1).textContent()).includes('Had ialah 33%.'), 'Penerangan dipaparkan selepas menjawab');
    await t.klik('[data-mcq="2:2"]');
    await t.klik('[data-mcq="3:1"]');
    await t.ada('.bk-score', /Skor: 2\/4 \(50%\)/);
    await tiadaLimpahan(page);
    await t.klik('[data-act="salin-pek"]');
    await t.ada('.toast', /Pek peperiksaan disalin/);
    const s = await papan(page);
    for (const x of ['Pelaburan patuh Syariah', 'KONSEP UTAMA\n- Riba: Tambahan ke atas pinjaman.', '2. Had nisbah hutang berasaskan faedah?', 'Jawapan: B. Had ialah 33%.', 'ESEI\n1. Bincangkan saringan saham patuh Syariah. (10 markah)', '   - Nisbah kewangan [6]', 'KAD IMBAS\n- Riba :: Tambahan', 'RAMALAN TOPIK\n- Saringan Syariah']) pasti(s.includes(x), `Teks disalin mengandungi "${x}"`);
    await t.klik('[data-act="ulang-mcq"]');
    pasti(!(await page.$('.bk-score')), 'Skor hilang selepas ulang');
    pasti(await page.isEnabled('[data-mcq="0:0"]'), 'Pilihan dibuka semula');
  } },

  { kumpulan: K, nama: 'Pek: mod peperiksaan bermasa (pemasa dan masa tamat)', langkah: async (t, page) => {
    await page.clock.install();
    await t.buka('#alat/pek');
    await isiBahan(t);
    await denganModel({ pek: PEK_MODEL }, async () => { await t.klik('[data-act="jana-pek"]'); await t.ada('.al-hasil-kepala', /MCQ \(4\)/, 20000); });
    await t.klik('[data-tab="pek:mcq"]');
    await t.ada('[data-act="mod-masa"]', /Mod peperiksaan \(4 min\)/);
    await t.klik('[data-act="mod-masa"]');
    await page.clock.runFor(1000);
    await t.ada('#alMasa', /^3:5\d$/);
    await t.klik('[data-mcq="0:0"]');
    await page.clock.fastForward(60000);
    await t.ada('#alMasa', /^2:5\d$/);
    // Masa tamat: soalan yang belum dijawab dikira salah
    await page.clock.fastForward(180000);
    await page.clock.runFor(600);
    await t.ada('.toast', /Masa tamat\. Lihat skor anda\./);
    await t.ada('.bk-score', /Skor: 1\/4 \(25%\)/);
    pasti(!(await page.$('#alMasa')), 'Pemasa hilang selepas masa tamat');
    sama(await page.$eval('[data-mcq="3:3"]', b => b.className), 'bk-opt ok', 'Jawapan betul ditunjuk selepas masa tamat');
    // Menjawab semua soalan menamatkan mod bermasa
    await t.klik('[data-act="ulang-mcq"]');
    await t.klik('[data-act="mod-masa"]');
    await page.clock.runFor(1000);
    await t.tunggu('#alMasa');
    for (const [i, j] of [[0, 0], [1, 1], [2, 2], [3, 3]]) await t.klik(`[data-mcq="${i}:${j}"]`);
    await t.ada('.bk-score', /Skor: 4\/4 \(100%\)/);
    pasti(!(await page.$('#alMasa')), 'Pemasa hilang selepas semua dijawab');
  } },

  { kumpulan: K, nama: 'Pek: kad imbas diterbalikkan, ke dek ulang kaji, Anki CSV', langkah: async (t, page) => {
    await t.buka('#alat/pek');
    await isiBahan(t);
    await denganModel({ pek: PEK_MODEL }, async () => { await t.klik('[data-act="jana-pek"]'); await t.ada('.al-hasil-kepala', /Kad imbas/, 20000); });
    await t.klik('[data-tab="pek:kad"]');
    sama(await teksSemua(page, '.bk-card'), ['Riba', 'Gharar'], 'Depan kad');
    await t.klik('[data-flip="0"]');
    sama(await page.$eval('[data-flip="0"]', b => [b.textContent, b.getAttribute('aria-pressed')]), ['Tambahan yang disyaratkan ke atas pinjaman.', 'true'], 'Kad diterbalikkan');
    await t.klik('[data-flip="0"]');
    sama(await page.$eval('[data-flip="0"]', b => [b.textContent, b.getAttribute('aria-pressed')]), ['Riba', 'false'], 'Kad diterbalikkan semula');
    await t.klik('[data-act="dek-pek"]');
    await t.ada('.toast', /2 kad ditambah ke dek ulang kaji\./);
    const dek = await storan(page, 'alat_dek');
    sama(dek.map(k => [k.depan, k.kotak, k.due, k.asal, k.topik]), [['Riba', 1, hariIni(), 'Pelaburan patuh Syariah', 'Pelaburan patuh Syariah'], ['Gharar', 1, hariIni(), 'Pelaburan patuh Syariah', 'Pelaburan patuh Syariah']], 'Kad dalam alat_dek');
    await t.klik('[data-act="dek-pek"]');
    await t.ada('.toast', /Kad ini sudah ada dalam dek\./);
    sama((await storan(page, 'alat_dek')).length, 2, 'Tiada kad pendua');
    const d = await muatTurun(page, '[data-act="anki"]');
    sama(d.nama, 'kad-imbas-anki.csv', 'Nama fail Anki');
    sama(d.isi, '﻿"Riba","Tambahan yang disyaratkan ke atas pinjaman."\r\n"Gharar","Ketidakpastian melampau dalam kontrak."', 'Kandungan CSV Anki');
  } },

  { kumpulan: K, nama: 'Pek: pengguna percuma, kuota harian Alat Pelajar (12)', premium: false, storan: { bl_kuota: { d: hariIni(), alat: 11 } }, langkah: async (t, page) => {
    const req = rekod(page);
    await t.buka('#alat/pek');
    await t.ada('.al-kuota', /Baki percuma hari ini: 1 permintaan\. Premium tanpa had\./);
    await isiBahan(t);
    await t.klik('[data-act="jana-pek"]');
    await t.ada('.al-hasil-kepala', /Ringkasan/, 20000);
    await t.ada('.toast', /Itu permintaan Alat Pelajar percuma terakhir hari ini\./);
    sama((await storan(page, 'bl_kuota')).alat, 12, 'Kuota dicatat');
    await t.ada('.al-kuota', /Baki percuma hari ini: 0 permintaan/);
    await t.klik('[data-act="jana-pek"]');
    await t.ada('.toast', /Had percuma 12 permintaan Alat Pelajar sehari sudah dicapai/);
    sama(req.length, 1, 'Tiada permintaan selepas kuota habis');
  } },

  /* ===== Penyemak Rubrik ===== */
  { kumpulan: K, nama: 'Rubrik: templat, semakan input, jumlah dikira semula oleh pelayan, guna pembaikan', langkah: async (t, page) => {
    page.on('dialog', d => d.accept());
    const req = rekod(page);
    await t.buka('#alat/rubrik');
    await t.pilih('#alTemplat', 'refleksi');
    pasti((await page.inputValue('#alRubrik')).startsWith('Huraian pengalaman (20 markah)'), 'Templat refleksi diisi');
    // Templat kedua menggantikan rubrik sedia ada selepas pengesahan
    await t.pilih('#alTemplat', 'laporan');
    pasti((await page.inputValue('#alRubrik')).startsWith('Pengenalan dan objektif (10 markah)'), 'Templat laporan menggantikan');
    await t.isi('#alRubrik', 'pendek');
    await t.klik('[data-act="semak-rubrik"]');
    await t.ada('.toast', /Tampal rubrik atau pilih templat\./);
    await t.isi('#alRubrik', RUBRIK);
    await t.isi('#alDraf', 'Draf terlalu pendek.');
    await t.ada('#alDrafKata', /^3$/);
    await t.klik('[data-act="semak-rubrik"]');
    await t.ada('.toast', /Tampal draf anda \(sekurang-kurangnya 200 aksara\)\./);
    sama(req.length, 0, 'Tiada permintaan untuk input tidak lengkap');
    await t.isi('#alDraf', DRAF);
    await t.ada('#alDrafKata', new RegExp(`^${kata(DRAF)}$`));
    await t.isi('#alArahan', 'Tulis laporan 1500 patah perkataan.');
    sama(await storan(page, 'alat_rubrik'), { rubrik: RUBRIK, arahan: 'Tulis laporan 1500 patah perkataan.', draf: DRAF }, 'Borang rubrik disimpan');
    const model = { ringkasan: 'Draf jelas tetapi analisis kritis masih nipis.', keyakinan: 'sederhana', jumlah: 99, kriteria: [
      { nama: 'Pengenalan dan objektif', markah_penuh: 10, markah: 12, tahap: 'Cemerlang', bukti: ['Kajian ini membincangkan kepentingan literasi kewangan', 'ayat rekaan yang tiada dalam draf pelajar'], kurang: [], naik_tahap: '', baiki: [] },
      { nama: 'Kandungan dan perbincangan', markah_penuh: 30, markah: 21.3, tahap: 'Baik', bukti: [], kurang: ['Contoh kurang'], naik_tahap: 'Tambah dua contoh kajian kes.',
        baiki: [{ asal: 'Kaedah tinjauan digunakan ke atas 50 responden di Shah Alam.', baru: 'Kajian ini menggunakan kaedah tinjauan ke atas 50 responden di Shah Alam.', sebab: 'Ayat aktif lebih jelas.' }, { asal: 'ayat asal rekaan tiada', baru: 'x', sebab: 's' }] },
      { nama: 'Rujukan', markah_penuh: 10, markah: 4, tahap: 'Lemah', bukti: [], kurang: ['Tiada sitasi'], naik_tahap: '', baiki: [] },
      { nama: '', markah_penuh: 5, markah: 5, tahap: '', bukti: [], kurang: [], naik_tahap: '', baiki: [] },
      { nama: 'Bonus', markah_penuh: 0, markah: 3, tahap: '', bukti: [], kurang: [], naik_tahap: '', baiki: [] }],
      keutamaan: [{ tindakan: 'Tambah sitasi APA', markah_tambah: 4 }, { tindakan: 'Perluas analisis', markah_tambah: 6.2 }] };
    await denganModel({ rubrik: model }, async () => {
      await t.klik('[data-act="semak-rubrik"]');
      await t.ada('.al-skor-kad', /Anggaran markah/, 20000);
    });
    sama(req[0].body, { tugas: 'rubrik', rubrik: RUBRIK, arahan: 'Tulis laporan 1500 patah perkataan.', draf: DRAF }, 'Badan permintaan rubrik');
    // 10 (12 dihadkan) + 21.5 (21.3 dibundarkan ke 0.5) + 4 = 35.5 daripada 50; kriteria tanpa nama atau markah penuh 0 dibuang
    await t.ada('.al-cincin', /^35\.5daripada 50$/);
    await t.ada('.al-skor-kad h2', /^Anggaran markah: 71%$/);
    await t.ada('.al-skor-kad', /Julat munasabah 31\.5 hingga 39\.5 · keyakinan sederhana/);
    sama(await teksSemua(page, '.al-kriteria .al-markah'), ['10/10', '21.5/30', '4/10'], 'Markah setiap kriteria');
    sama(await teksSemua(page, '.al-utama li'), ['Perluas analisis+6', 'Tambah sitasi APA+4'], 'Keutamaan disusun ikut markah');
    sama(await teksSemua(page, '.al-kriteria .bk-q p'), ['“Kajian ini membincangkan kepentingan literasi kewangan”'], 'Hanya bukti yang wujud dalam draf');
    sama(await kira(page, '.kj-fix'), 1, 'Pembaikan dengan ayat asal rekaan dibuang');
    await tiadaLimpahan(page);
    await t.klik('[data-rb-fix="1:0"]');
    await t.ada('.toast', /Draf dikemas kini\./);
    pasti((await page.inputValue('#alDraf')).includes('Kajian ini menggunakan kaedah tinjauan ke atas 50 responden di Shah Alam.'), 'Draf menggunakan ayat baharu');
    sama(await kira(page, '.kj-fix'), 0, 'Cadangan hilang selepas digunakan');
    // Ke Penulisan Akademik dengan draf sama
    await t.klik('[data-act="ke-tulis"]');
    await t.ada('#h-alat', /Penulisan Akademik/);
    pasti((await page.inputValue('#alTl')).startsWith('Pengenalan. Kajian ini membincangkan'), 'Draf dibawa ke Penulisan Akademik');
  } },

  { kumpulan: K, nama: 'Rubrik: model palsu ikut skema (desktop 1280)', lebar: 1280, storan: { alat_rubrik: { rubrik: RUBRIK, arahan: '', draf: DRAF } }, langkah: async (t, page) => {
    await t.buka('#alat/rubrik');
    await t.klik('[data-act="semak-rubrik"]');
    await t.ada('.al-skor-kad', /Anggaran markah/, 20000);
    // 3 kriteria x 7.5 (markah dihadkan kepada markah penuh 7.5)
    await t.ada('.al-cincin', /^22\.5daripada 22\.5$/);
    await t.ada('.al-skor-kad h2', /100%/);
    await t.ada('.al-skor-kad', /Julat munasabah 21\.5 hingga 22\.5 · keyakinan tinggi/);
    sama(await kira(page, '.al-kriteria'), 3, 'Bilangan kriteria');
    // Setiap bukti yang dipaparkan wujud dalam draf
    for (const b of await teksSemua(page, '.al-kriteria .bk-q p')) pasti(DRAF.includes(b.slice(1, -1)), `Bukti "${b}" wujud dalam draf`);
    await tiadaLimpahan(page);
    await t.klik('[data-act="ke-semak"]');
    await page.waitForFunction(() => location.hash === '#semak');
    sama(await page.inputValue('#paper'), DRAF, 'Draf dibawa ke Semak Kertas');
  } },

  { kumpulan: K, nama: 'Rubrik: "Guna dalam draf" berfungsi walaupun ayat draf dipecahkan oleh baris baharu (teks PDF)', langkah: async (t, page) => {
    const draf = DRAF.replace('ke atas 50 responden', 'ke atas 50\nresponden').replace('Kajian ini membincangkan', 'Kajian  ini membincangkan');
    await t.buka('#alat/rubrik');
    await page.setInputFiles('#alDrafFail', fail('draf.txt', draf));
    await t.isi('#alRubrik', RUBRIK);
    await t.ada('#alDrafKata', new RegExp(`^${kata(draf)}$`));
    const model = { ringkasan: 'r', keyakinan: 'tinggi', keutamaan: [], kriteria: [
      { nama: 'Kandungan', markah_penuh: 10, markah: 6, tahap: 'Baik', bukti: ['Kajian ini membincangkan kepentingan literasi kewangan'], kurang: [], naik_tahap: '',
        baiki: [{ asal: 'Kaedah tinjauan digunakan ke atas 50 responden di Shah Alam.', baru: 'Kajian ini menggunakan kaedah tinjauan ke atas 50 responden di Shah Alam.', sebab: 'Ayat aktif.' }] }] };
    await denganModel({ rubrik: model }, async () => {
      await t.klik('[data-act="semak-rubrik"]');
      await t.ada('.al-skor-kad', /Anggaran markah/, 20000);
    });
    sama(await kira(page, '.al-kriteria .bk-q'), 1, 'Bukti disahkan walaupun ruang berbeza');
    await t.klik('[data-rb-fix="0:0"]');
    await t.ada('.toast', /Draf dikemas kini\./);
    sama(await page.inputValue('#alDraf'), draf.replace('Kaedah tinjauan digunakan ke atas 50\nresponden di Shah Alam.', 'Kajian ini menggunakan kaedah tinjauan ke atas 50 responden di Shah Alam.'), 'Ayat diganti dalam draf');
  } },

  /* ===== Jurulatih Pembentangan ===== */
  { kumpulan: K, nama: 'Jurulatih: ramal soalan, jawab dengan teks, skor dan soalan susulan', lebar: 1280, langkah: async (t, page) => {
    const req = rekod(page);
    await t.buka('#alat/coach');
    // 120 aksara: had minimum peranti mesti sama dengan pelayan (150) supaya mesej konsisten dan tiada permintaan sia-sia
    await isiBahan(t, NOTA.slice(0, 120));
    await t.klik('[data-act="jana-coach"]');
    await t.ada('.toast', /Tambah bahan dahulu \(sekurang-kurangnya 150 aksara\)/);
    sama(req.length, 0, 'Bahan di bawah had pelayan tidak dihantar');
    await isiBahan(t);
    await t.klik('[data-act="jana-coach"]');
    await t.tunggu('.al-soalan', 20000);
    sama(await kira(page, '.al-soalan'), 3, 'Bilangan soalan');
    sama(await teksSemua(page, '.al-soalan .al-jenis'), ['Penjelasan', 'Penjelasan', 'Penjelasan'], 'Jenis soalan');
    sama(req[0].body, { tugas: 'coach_soalan', teks: NOTA, tajuk: '' }, 'Badan permintaan soalan');
    await t.isi('#alJwb0', 'Pendek');
    await t.klik('[data-nilai="0"]');
    await t.ada('.toast', /Jawab soalan dahulu\./);
    sama(req.length, 1, 'Jawapan pendek tidak dihantar');
    const jwb = 'Saham patuh Syariah disaring oleh Majlis Penasihat Syariah Suruhanjaya Sekuriti mengikut penanda aras aktiviti dan nisbah kewangan.';
    await t.isi('#alJwb0', jwb);
    await t.klik('[data-nilai="0"]');
    await t.ada('.al-soalan.dijawab .al-skor-kecil', /^8\/10$/, 20000);
    sama([req[1].body.tugas, req[1].body.jawapan], ['coach_nilai', jwb], 'Badan permintaan nilai');
    await t.ada('.al-coach-ringkas', /8\.0\/10\s*purata skor bagi 1 daripada 3 soalan dijawab/);
    sama(await kira(page, '.al-nilai li'), 6, 'Kekuatan (3) dan perkara dibaiki (3)');
    await t.ada('.al-nilai details summary', /Jawapan contoh/);
    // Jawapan kekal selepas muat semula
    await page.reload(); await t.tunggu('#alJwb0');
    sama(await page.inputValue('#alJwb0'), jwb, 'Jawapan disimpan');
    await t.klik('[data-susulan="0"]');
    sama(await kira(page, '.al-soalan'), 4, 'Soalan susulan ditambah');
    sama(await page.locator('.al-soalan .al-jenis').nth(1).textContent(), 'Kritikal', 'Soalan susulan jenis kritikal');
    pasti(!(await page.$('[data-susulan="0"]')), 'Butang latih susulan hilang');
  } },

  /* ===== Ingat Aktif dan dek ulang kaji ===== */
  { kumpulan: K, nama: 'Ingat Aktif: jawapan pendek disemak pelayan, skor, titik lemah, ke dek', langkah: async (t, page) => {
    const req = rekod(page);
    await t.buka('#alat/ingat');
    await isiBahan(t);
    await t.klik('[data-act="jana-ingat"]');
    await t.ada('.al-uji', /Soalan 1 daripada 3/, 20000);
    await t.isi('#alIgJ', 'Pelaburan yang mematuhi prinsip muamalat Islam.');
    await t.klik('#alIgForm button[type="submit"]');
    await t.ada('.al-uji', /Soalan 2 daripada 3/);
    await t.klik('#alIgForm [data-ig-pilih=""]');                    // Saya tidak tahu
    await t.ada('.al-uji', /Soalan 3 daripada 3/);
    await t.isi('#alIgJ', 'Melabur secara berkala setiap bulan.');
    await t.klik('#alIgForm button[type="submit"]');
    // Pelayan menyemak dua jawapan terbuka; hasil model palsu (i di luar julat) dibuang, jadi jawapan bertulis = separa
    await t.ada('.al-keputusan .al-skor-kecil', /^1\/3$/, 20000);
    const semak = req.find(r => r.body.tugas === 'ingat_semak');
    pasti(semak, 'Permintaan ingat_semak dihantar');
    sama(semak.body.jawapan.map(j => j.pengguna), ['Pelaburan yang mematuhi prinsip muamalat Islam.', 'Melabur secara berkala setiap bulan.'], 'Hanya jawapan terbuka dihantar');
    sama(await teksSemua(page, '.al-jwb .al-k'), ['Separa betul', 'Salah', 'Separa betul'], 'Keputusan setiap soalan');
    sama(await kira(page, '.al-topik'), 3, 'Kekuatan setiap topik');
    await tiadaLimpahan(page);
    await t.klik('[data-act="ig-dek"]');
    await t.ada('.toast', /3 kad ditambah ke dek ulang kaji\./);
    await t.ada('.al-tabs [data-tab="ingat:dek"]', /Dek ulang kaji \(3\)/);
    await t.klik('[data-act="ig-ulang"]');
    await t.ada('.al-uji', /Soalan 1 daripada 3/);
  } },

  { kumpulan: K, nama: 'Ingat Aktif: MCQ, betul/salah dan isi tempat kosong disemak dalam peranti (desktop 1280)', lebar: 1280, langkah: async (t, page) => {
    const req = rekod(page);
    await t.buka('#alat/ingat');
    await isiBahan(t);
    const soalan = [
      { jenis: 'mcq', soalan: 'Siapakah yang menyaring saham patuh Syariah?', pilihan: ['Bank Negara', 'Majlis Penasihat Syariah', 'Bursa Malaysia', 'LHDN'], jawapan: 'Majlis Penasihat Syariah', penerangan: 'MPS menyaring saham.', topik: 'Saringan Syariah' },
      { jenis: 'betul_salah', soalan: 'Riba dibenarkan jika kadarnya rendah.', pilihan: [], jawapan: 'false', penerangan: 'Riba diharamkan.', topik: 'Larangan muamalat' },
      { jenis: 'isi_tempat', soalan: 'Nisbah hutang mestilah kurang daripada ____ peratus.', pilihan: [], jawapan: 'tiga puluh tiga', penerangan: 'Had 33%.', topik: 'Saringan Syariah' },
      { jenis: 'pendek', soalan: 'Terangkan kaedah purata kos ringgit.', pilihan: [], jawapan: 'Melabur jumlah tetap secara berkala.', penerangan: 'Kurangkan risiko masa.', topik: 'Strategi pelaburan' },
      { jenis: 'mcq', soalan: 'MCQ tanpa jawapan dalam pilihan dibuang', pilihan: ['a', 'b', 'c', 'd'], jawapan: 'e', penerangan: '', topik: 'x' }];
    await denganModel({ ingat_soalan: { soalan }, ingat_semak: { hasil: [{ i: 0, keputusan: 'betul', maklum_balas: 'Tepat dan lengkap.' }] } }, async () => {
      await t.klik('[data-act="jana-ingat"]');
      await t.ada('.al-uji', /Soalan 1 daripada 4 · Saringan Syariah/, 20000);
      sama(await teksSemua(page, '.al-uji .bk-opt'), ['Bank Negara', 'Majlis Penasihat Syariah', 'Bursa Malaysia', 'LHDN'], 'Pilihan MCQ');
      await t.klik('[data-ig-pilih="Majlis Penasihat Syariah"]');
      await t.ada('.al-uji', /Soalan 2 daripada 4/);
      sama(await teksSemua(page, '.al-uji .bk-opt'), ['Betul', 'Salah'], 'Pilihan betul/salah');
      await t.klik('[data-ig-pilih="Betul"]');
      await t.ada('.al-uji', /Soalan 3 daripada 4/);
      // Ejaan sedikit salah diterima; Enter menghantar jawapan isi tempat kosong
      await page.fill('#alIgJ', 'Tiga puloh tiga');
      await page.press('#alIgJ', 'Enter');
      await t.ada('.al-uji', /Soalan 4 daripada 4/);
      await t.isi('#alIgJ', 'Melabur jumlah yang sama setiap bulan.');
      await t.klik('#alIgForm button[type="submit"]');
      await t.ada('.al-keputusan .al-skor-kecil', /^3\/4$/, 20000);
    });
    const semak = req.filter(r => r.body.tugas === 'ingat_semak');
    sama(semak.map(r => r.body.jawapan), [[{ soalan: 'Terangkan kaedah purata kos ringgit.', betul: 'Melabur jumlah tetap secara berkala.', pengguna: 'Melabur jumlah yang sama setiap bulan.' }]], 'Hanya jawapan pendek disemak pelayan');
    sama(await teksSemua(page, '.al-jwb .al-k'), ['Betul', 'Salah', 'Betul', 'Betul'], 'Keputusan setiap soalan');
    await t.ada('.al-jwb:nth-child(4)', /Tepat dan lengkap\./);
    // Topik paling lemah dahulu
    sama(await page.$$eval('.al-topik', a => a.map(x => x.textContent)), ['Larangan muamalat0%', 'Saringan Syariah100%', 'Strategi pelaburan100%'], 'Kekuatan topik');
    await t.klik('[data-act="ig-dek"]');
    await t.ada('.toast', /1 kad ditambah ke dek ulang kaji\./);
    const dek = await storan(page, 'alat_dek');
    sama(dek.map(k => [k.depan, k.belakang, k.topik, k.kotak, k.due]), [['Riba dibenarkan jika kadarnya rendah.', 'Salah · Riba diharamkan.', 'Larangan muamalat', 1, hariIni()]], 'Soalan salah dalam dek');
  } },

  { kumpulan: K, nama: 'Dek ulang kaji: kad tertunggak di hab, Leitner (ingat, lupa, ingat sedikit), tarikh ulang, kosongkan', storan: { alat_dek: [
      { id: 'k1', depan: 'Apakah riba?', belakang: 'Tambahan ke atas pinjaman.', topik: 'Larangan', asal: 'Bab 1', kotak: 1, due: tambahHari(hariIni(), -1) },
      { id: 'k2', depan: 'Apakah gharar?', belakang: 'Ketidakpastian melampau.', topik: 'Larangan', asal: 'Bab 1', kotak: 3, due: hariIni() },
      { id: 'k3', depan: 'Apakah maisir?', belakang: 'Perjudian.', topik: 'Larangan', asal: 'Bab 1', kotak: 2, due: tambahHari(hariIni(), 1) },
      { id: 'k4', depan: 'Apakah sukuk?', belakang: 'Sijil pelaburan Islam.', topik: 'Instrumen', asal: 'Bab 2', kotak: 5, due: tambahHari(hariIni(), 9) }] },
    langkah: async (t, page) => {
      page.on('dialog', d => d.accept());
      // Hab: kad tertunggak, dan pautannya membuka tab dek (bukan uji diri)
      await t.buka('#alat');
      await t.ada('.al-ulang', /2\s*kad perlu diulang kaji hari ini/);
      await t.ada('.al-ulang', /Dek ulang kaji: 4 kad, 1 sudah dikuasai/);
      await t.klik('.al-ulang');
      await t.ada('#h-alat', /Ingat Aktif/);
      await t.ada('.al-tabs .seg.active', /^Dek ulang kaji \(2\)$/);
      await t.ada('.al-dek h2', /^2 kad perlu diulang hari ini$/);
      await tiadaLimpahan(page);
      sama(await page.$$eval('.al-kotak b', a => a.map(x => x.textContent)), ['1', '1', '1', '0', '1'], 'Bilangan kad setiap kotak');
      await t.klik('[data-act="mula-ulang"]');
      // Susunan rawak: nilai mengikut kad yang dipaparkan
      const pelan = { 'Apakah riba?': 2, 'Apakah gharar?': 0 };
      for (let n = 1; n <= 2; n++) {
        await t.ada('.al-ulangkad', new RegExp(`Kad ${n} daripada 2 · Bab 1`));
        const depan = (await t.teks('.al-kad-depan')).trim();
        pasti(depan in pelan, `Kad tidak dijangka: ${depan}`);
        pasti(!(await page.$('.al-kad-belakang')), 'Jawapan tersembunyi sebelum dibuka');
        await t.klik('[data-act="buka-kad"]');
        await t.ada('.al-kad-belakang', /\S/);
        await t.klik(`[data-ingat="${pelan[depan]}"]`);
      }
      await t.ada('.toast', /Ulang kaji hari ini selesai\./);
      let dek = await storan(page, 'alat_dek');
      const by = id => dek.find(k => k.id === id);
      sama([by('k1').kotak, by('k1').due], [2, tambahHari(hariIni(), 3)], 'Ingat: kotak naik, ulang 3 hari lagi');
      sama([by('k2').kotak, by('k2').due], [1, hariIni()], 'Lupa: kembali ke kotak 1, ulang hari ini');
      sama([by('k3').kotak, by('k3').due], [2, tambahHari(hariIni(), 1)], 'Kad belum tiba tidak berubah');
      // Kad yang dilupakan diulang semula hari ini: "ingat sedikit" kekal di kotak 1, ulang esok
      await t.ada('.al-dek h2', /^1 kad perlu diulang hari ini$/);
      await t.klik('[data-act="mula-ulang"]');
      await t.ada('.al-kad-depan', /Apakah gharar\?/);
      await t.klik('[data-act="buka-kad"]');
      await t.klik('[data-ingat="1"]');
      await t.ada('.al-dek h2', /^Semua kad hari ini selesai$/);
      pasti(!(await page.$('[data-act="mula-ulang"]')), 'Tiada butang mula apabila tiada kad');
      dek = await storan(page, 'alat_dek');
      sama([by('k2').kotak, by('k2').due], [1, tambahHari(hariIni(), 1)], 'Ingat sedikit: kotak sama, ulang esok');
      await t.ada('.al-tabs [data-tab="ingat:dek"]', /^Dek ulang kaji$/);
      // Hab mencerminkan dek
      await t.buka('#alat');
      await t.ada('.al-ulang', /0\s*Tiada kad perlu diulang hari ini.*Dek ulang kaji: 4 kad, 1 sudah dikuasai/s);
      await t.buka('#alat/ingat');
      await t.klik('[data-tab="ingat:dek"]');
      await t.klik('[data-act="kosong-dek"]');
      await t.ada('#view-alat .bk-empty', /Dek ulang kaji anda masih kosong/);
      sama(await storan(page, 'alat_dek'), [], 'Dek dikosongkan');
      await t.buka('#alat');
      pasti(!(await page.$('.al-ulang')), 'Kad ulang kaji hilang dari hab selepas dek dikosongkan');
    } },

  /* ===== Nota Kuliah AI ===== */
  { kumpulan: K, nama: 'Nota Kuliah: transkrip ditampal, nota Cornell, salin, ke Buku Nota dan Pek', lebar: 1280, langkah: async (t, page) => {
    const req = rekod(page);
    await t.buka('#alat/kuliah');
    await t.isi('#alKlTeks', 'Transkrip terlalu pendek.');
    await t.ada('#alKlKata', /^3$/);
    await t.klik('[data-act="jana-kuliah"]');
    await t.ada('.toast', /Transkrip terlalu pendek \(sekurang-kurangnya 200 aksara\)\./);
    await t.isi('#alKlTeks', TRANSKRIP);
    await t.ada('#alKlKata', new RegExp(`^${kata(TRANSKRIP)}$`));
    sama(await storan(page, 'alat_transkrip'), TRANSKRIP, 'Transkrip disimpan');
    await page.reload(); await t.tunggu('#alKlTeks');
    sama(await page.inputValue('#alKlTeks'), TRANSKRIP, 'Transkrip kekal selepas muat semula');
    await t.klik('[data-act="jana-kuliah"]');
    await t.tunggu('.al-cornell', 20000);
    sama([req.length, req[0].body.tugas, req[0].body.teks], [1, 'kuliah', TRANSKRIP], 'Badan permintaan kuliah');
    sama(await kira(page, '.al-cornell aside li'), 3, 'Isyarat Cornell');
    sama(await kira(page, '.al-cornell-grid h3'), 3, 'Bahagian nota');
    await t.ada('.al-cornell-rumus', /Rumusan\S/);
    sama(await kira(page, '.bk-dl dt'), 3, 'Konsep');
    sama(await kira(page, '.al-tindakan li'), 3, 'Tugasan dan pengumuman');
    await t.klik('[data-act="salin-kuliah"]');
    await t.ada('.toast', /Nota disalin\./);
    const s = await papan(page);
    for (const x of ['\n\nISYARAT\n- ', '\nRUMUSAN\n', '\nKONSEP\n- ', '\nTUGASAN\n- ']) pasti(s.includes(x), `Nota disalin mengandungi ${JSON.stringify(x)}`);
    const tajuk = (await t.teks('.al-cornell h2')).trim();
    await t.klik('[data-act="kl-buku"]');
    await t.ada('.toast', /Disimpan ke Buku Nota AI\./);
    const bs = await storan(page, 'buku_sumber');
    sama(bs.map(x => [x.tajuk, x.teks, x.on]), [[tajuk, TRANSKRIP, true]], 'Sumber Buku Nota AI');
    await t.klik('[data-act="kl-pek"]');
    await t.ada('#h-alat', /Pek Peperiksaan/);
    sama(await page.inputValue('#alBahan'), TRANSKRIP, 'Transkrip menjadi bahan Pek');
    await t.ada('.al-bahan', new RegExp(`Bahan semasa: ${tajuk.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    await tiadaLimpahan(page);
  } },

  { kumpulan: K, nama: 'Nota Kuliah: Transkrip HD daripada fail audio, format dan saiz ditolak', langkah: async (t, page) => {
    const req = rekod(page);
    await t.buka('#alat/kuliah');
    // Fail bukan audio: pelayan menolak dengan mesej mesra
    await page.setInputFiles('#alKlAudio', fail('kuliah.flv', Buffer.alloc(3000, 7), 'video/x-flv'));
    await t.ada('#view-alat .error[role="alert"]', /Format audio tidak disokong\. Guna MP3, M4A, WAV, OGG atau WEBM\./);
    // Terlalu pendek
    await page.setInputFiles('#alKlAudio', fail('pendek.mp3', Buffer.alloc(200, 1), 'audio/mpeg'));
    await t.ada('#view-alat .error[role="alert"]', /Rakaman terlalu pendek\./);
    // Sah: transkrip dipaparkan
    await page.setInputFiles('#alKlAudio', fail('kuliah.mp3', Buffer.alloc(3000, 9), 'audio/mpeg'));
    await t.ada('.toast', /Transkrip siap/, 20000);
    sama(await page.inputValue('#alKlTeks'), 'Transkripsikan rakaman ini.', 'Transkrip daripada pelayan');
    pasti(!(await page.$('#view-alat .error')), 'Ralat lama dibersihkan');
    sama(req.map(r => [r.path, r.body.mime]), [['/transkrip', 'video/x-flv'], ['/transkrip', 'audio/mpeg'], ['/transkrip', 'audio/mpeg']], 'Permintaan transkrip');
    sama(Buffer.from(req[2].body.audio, 'base64').length, 3000, 'Audio dihantar sebagai base64 lengkap');
    // Fail melebihi 14 MB ditolak dalam peranti
    await page.setInputFiles('#alKlAudio', fail('besar.mp3', Buffer.alloc(14 * 1024 * 1024 + 10), 'audio/mpeg'));
    await t.ada('.toast', /Fail terlalu besar \(had 14 MB\)/);
    sama(req.length, 3, 'Fail besar tidak dihantar');
    // Mikrofon tanpa kebenaran
    await t.klik('[data-act="rakam-kuliah"]');
    await t.ada('.toast', /Benarkan mikrofon untuk merakam kuliah\./);
    // Buku Nota AI sudah penuh (10 sumber)
    await page.evaluate(() => localStorage.setItem('buku_sumber', JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ id: 's' + i, tajuk: 'Sumber ' + i, teks: 'x'.repeat(60), on: true })))));
    await t.klik('[data-act="kl-buku"]');
    await t.ada('.toast', /Buku Nota AI sudah ada 10 sumber\. Buang satu dahulu\./);
    sama((await storan(page, 'buku_sumber')).length, 10, 'Tiada sumber ke-11');
    await t.pilih('#alKlLang', 'en-MY');
    sama(await storan(page, 'alat_kl_lang'), 'en-MY', 'Bahasa kuliah disimpan');
    await t.klik('[data-act="kl-kosong"]');
    sama(await page.inputValue('#alKlTeks'), '', 'Transkrip dikosongkan');
    await page.reload(); await t.tunggu('#alKlLang');
    sama(await page.inputValue('#alKlLang'), 'en-MY', 'Bahasa kuliah kekal selepas muat semula');
    await tiadaLimpahan(page);
  } },

  { kumpulan: K, nama: 'Nota Kuliah: pengguna percuma, Transkrip HD 1 percubaan sehari', premium: false, langkah: async (t, page) => {
    const req = rekod(page);
    await t.buka('#alat/kuliah');
    await t.ada('.al-kuota', /Kapsyen langsung dan nota percuma \(baki 12 hari ini\)\. Transkrip HD daripada audio ialah ciri Premium: 1 percubaan percuma hari ini\./);
    await page.setInputFiles('#alKlAudio', fail('kuliah.mp3', Buffer.alloc(3000, 9), 'audio/mpeg'));
    await t.ada('.toast', /Transkrip siap|percubaan alat Premium percuma terakhir/, 20000);
    await t.ada('.al-kuota', /percubaan hari ini sudah digunakan/);
    sama((await storan(page, 'bl_kuota')).alatpro, 1, 'Kuota alatpro dicatat');
    await page.setInputFiles('#alKlAudio', fail('kuliah2.mp3', Buffer.alloc(3000, 8), 'audio/mpeg'));
    await t.ada('.toast', /Had percuma 1 percubaan alat Premium sehari sudah dicapai/);
    sama(req.length, 1, 'Percubaan kedua tidak dihantar');
    // Nota kuliah guna kuota biasa (bukan Premium)
    await t.isi('#alKlTeks', TRANSKRIP);
    await t.klik('[data-act="jana-kuliah"]');
    await t.tunggu('.al-cornell', 20000);
    await t.ada('.al-kuota', /baki 11 hari ini/);
  } },

  /* ===== Penulisan Akademik ===== */
  { kumpulan: K, nama: 'Penulisan: metrik, mod, perubahan perenggan, amaran petikan hilang, terima, salin, guna', lebar: 1280, langkah: async (t, page) => {
    const req = rekod(page);
    await t.buka('#alat/tulis');
    const teks = PERENGGAN.join('\n\n');
    await t.isi('#alTl', teks);
    const ayat = teks.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => kata(s) >= 3), w = kata(teks);
    await t.ada('#alTlMetrik', new RegExp(`^${fmt(w)} patah perkataan · ${ayat.length} ayat · purata ${(w / ayat.length).toFixed(1).replace('.', '\\.')} patah/ayat · 0 ayat terlalu panjang$`));
    await t.klik('[data-mod="ringkas"]');
    sama(await page.$eval('[data-mod="ringkas"]', b => [b.className, b.getAttribute('aria-checked')]), ['seg active', 'true'], 'Mod ringkas dipilih');
    sama(await page.$eval('[data-mod="akademik"]', b => b.getAttribute('aria-checked')), 'false', 'Mod akademik tidak dipilih');
    sama(await storan(page, 'alat_tulis'), { teks, mod: 'ringkas' }, 'alat_tulis disimpan');
    await t.klik('[data-act="jana-tulis"]');
    await t.tunggu('.al-tl-ringkas', 20000);
    sama([req[0].body.mod, req[0].body.perenggan], ['ringkas', PERENGGAN], 'Badan permintaan tulis');
    await t.ada('.al-tl-ringkas', /1 daripada 9 perenggan dicadangkan untuk diubah\./);
    sama(await kira(page, '.al-pr.sama'), 8, 'Perenggan tanpa perubahan');
    const baru = PERENGGAN[0].split(/(?<=[.!?])\s+/)[0];
    await t.ada('.al-pr:not(.sama) .al-diff', /\S/);
    pasti(await page.$('.al-pr:not(.sama) .al-diff del') && await page.$('.al-pr:not(.sama) .al-diff ins'), 'Diff memaparkan del dan ins');
    await t.ada('.al-amaran', /Petikan atau angka asal tiada dalam versi baharu: \(Ahmad, 2021\), 45%\./);
    sama(await kira(page, '.al-ubah span'), 3, 'Penerangan perubahan');
    await t.klik('[data-act="tl-terima-semua"]');
    await t.ada('.toast', /tidak diterima secara automatik/);
    pasti(!(await page.$('.al-pr.diterima')), 'Perenggan dengan petikan hilang tidak diterima automatik');
    await t.klik('[data-tl="8:1"]');
    await t.tunggu('.al-pr.diterima');
    sama(await page.$eval('[data-tl="8:1"]', b => b.getAttribute('aria-pressed')), 'true', 'Terima ditekan');
    await t.klik('[data-act="tl-salin"]');
    await t.ada('.toast', /Teks akhir disalin\./);
    sama(await papan(page), [...PERENGGAN.slice(0, 8), baru].join('\n\n'), 'Teks akhir disalin');
    await t.klik('[data-tl="8:0"]');
    pasti(!(await page.$('.al-pr.diterima')), 'Kekalkan asal');
    await t.klik('[data-tl="8:1"]');
    await t.klik('[data-act="tl-guna"]');
    await t.ada('.toast', /Teks dikemas kini\./);
    sama(await page.inputValue('#alTl'), [...PERENGGAN.slice(0, 8), baru].join('\n\n'), 'Teks baharu dalam kotak');
    pasti(!(await page.$('.al-tl-ringkas')), 'Hasil dibersihkan selepas guna');
    await tiadaLimpahan(page);
  } },

  { kumpulan: K, nama: 'Penulisan: model sandaran memulangkan JSON kosong, ralat mesra dan kuota percuma tidak dihabiskan', premium: false, langkah: async (t, page) => {
    await t.buka('#alat/tulis');
    await t.isi('#alTl', PERENGGAN.slice(0, 3).join('\n\n'));
    // Semua model utama sibuk (429): pelayan beralih ke model sandaran yang memulangkan {}
    await denganModel({ tulis: () => new Response('{"error":{"code":429}}', { status: 429 }) }, async d => {
      await t.klik('[data-act="jana-tulis"]');
      await t.ada('#view-alat .error[role="alert"]', /tidak tersedia buat masa ini/, 20000);
      pasti(d.length >= 1, 'Model utama dicuba');
    });
    pasti(!(await page.$('.al-tl-ringkas')), 'Tiada hasil "0 perenggan diubah" yang mengelirukan');
    pasti(!((await storan(page, 'bl_kuota')) || {}).alatpro, 'Percubaan Premium tidak dihabiskan');
  } },

  { kumpulan: K, nama: 'Penulisan: teks kosong, lebih 30 perenggan, muat naik .txt, tajuk dan baris pendek kekal dalam teks akhir', langkah: async (t, page) => {
    await t.buka('#alat/tulis');
    await t.klik('[data-act="jana-tulis"]');
    await t.ada('.toast', /Tampal teks anda dahulu\./);
    await t.isi('#alTl', Array.from({ length: 31 }, (_, i) => `Perenggan nombor ${i + 1} yang cukup panjang untuk dikira.`).join('\n\n'));
    await t.klik('[data-act="jana-tulis"]');
    await t.ada('.toast', /Paling banyak 30 perenggan sekali semak/);
    await page.setInputFiles('#alTlFail', fail('esei.txt', PERENGGAN.slice(0, 3).join('\n\n')));
    await t.ada('#alTlMetrik', new RegExp(`^${kata(PERENGGAN.slice(0, 3).join(' '))} patah perkataan`));
    sama(await page.inputValue('#alTl'), PERENGGAN.slice(0, 3).join('\n\n'), 'Teks fail dimuatkan');
    // Tajuk bahagian (kurang 20 aksara) tidak dihantar untuk dibaiki, tetapi mesti kekal dalam teks akhir
    const teks = 'Pengenalan\n' + PERENGGAN.slice(0, 4).join('\n\n') + '\n\nKaedah kajian\n' + PERENGGAN.slice(4).join('\n\n') + '\n\nRujukan\nAhmad (2021).';
    await t.isi('#alTl', teks);
    const req = rekod(page);
    await t.klik('[data-act="jana-tulis"]');
    await t.tunggu('.al-tl-ringkas', 20000);
    sama(req[0].body.perenggan, PERENGGAN, 'Hanya perenggan dihantar');
    await t.ada('.al-tl-ringkas', /1 daripada 9 perenggan dicadangkan untuk diubah\./);
    await t.klik('[data-tl="8:1"]');
    const baru = PERENGGAN[0].split(/(?<=[.!?])\s+/)[0];
    const akhir = teks.replace(PERENGGAN[8], baru);
    await t.klik('[data-act="tl-salin"]');
    sama(await papan(page), akhir, 'Teks akhir mengekalkan tajuk dan baris pendek');
    await t.ada('.al-banding', new RegExp(`Selepas${(kata(akhir) / akhir.split(/(?<=[.!?])\s+/).filter(x => kata(x) >= 3).length).toFixed(1).replace('.', '\\.')}`));
    await t.klik('[data-act="tl-semak"]');
    await page.waitForFunction(() => location.hash === '#semak');
    sama(await page.inputValue('#paper'), akhir, 'Teks akhir dibawa ke Semak Kertas');
    await t.buka('#alat/tulis');
    await t.klik('[data-act="tl-guna"]');
    sama(await page.inputValue('#alTl'), akhir, 'Teks baharu mengekalkan tajuk');
  } },

  { kumpulan: K, nama: 'Penulisan: teks PDF (setiap baris cetakan berakhir dengan baris baharu) dikira mengikut perenggan', langkah: async (t, page) => {
    // Seperti fileText() bagi PDF: baris kira-kira 60 aksara, tiada baris kosong antara perenggan
    const balut = p => { const baris = []; let b = ''; for (const w of p.split(' ')) { if (b && (b + ' ' + w).length > 60 && !/[.!?:;)\]"”']$/.test(b)) { baris.push(b); b = w; } else b = b ? b + ' ' + w : w; } baris.push(b); return baris.join('\n'); };
    const PDF = PERENGGAN.map(balut);
    const teks = 'Pengenalan\n' + PDF.join('\n');
    pasti(teks.split('\n').length > 20, 'Teks PDF ujian mempunyai banyak baris');
    await t.buka('#alat/tulis');
    await t.isi('#alTl', teks);
    const req = rekod(page);
    await t.klik('[data-act="jana-tulis"]');
    await t.tunggu('.al-tl-ringkas', 20000);
    sama(req[0].body.perenggan, PDF, 'Baris PDF disambung menjadi 9 perenggan');
    await t.ada('.al-tl-ringkas', /daripada 9 perenggan/);
  } },

  /* ===== Penyelidikan & Sitasi ===== */
  { kumpulan: K, nama: 'Rujukan: APA 7, Crossref, matriks, sintesis, sorotan, BibTeX, RIS, sunting (desktop 1280)', lebar: 1280, langkah: async (t, page) => {
    const req = rekod(page), cr = [];
    page.on('request', q => { if (q.url().startsWith('https://api.crossref.org/')) cr.push(decodeURIComponent(q.url())); });
    await t.buka('#alat/rujukan');
    await t.ada('.al-contoh', /Apa yang anda dapat/);
    await t.klik('[data-act="analisis-kertas"]');
    await t.ada('.toast', /Muat naik sekurang-kurangnya satu kertas\./);
    await page.setInputFiles('#alKertas', [fail('ali2023.txt', KERTAS1), fail('rahman2021.txt', KERTAS2)]);
    await t.ada('.al-muat', /2\/10 fail/);
    sama(await teksSemua(page, '.al-muat .bk-list b'), ['ali2023', 'rahman2021'], 'Senarai kertas');
    await denganModel({ rujukan: RUJUKAN_MODEL }, async () => {
      await t.klik('[data-act="analisis-kertas"]');
      await t.ada('.al-kertas', /DOI disahkan Crossref/, 20000);
    });
    sama(req[0].body, { tugas: 'rujukan', kertas: [{ tajuk: 'ali2023', teks: KERTAS1 }, { tajuk: 'rahman2021', teks: KERTAS2 }] }, 'Badan permintaan rujukan');
    sama(await teksSemua(page, '.al-kertas .al-kid'), ['K1', 'K2'], 'Kertas tidak wujud (K7) dibuang pelayan');
    sama(await teksSemua(page, '.al-kertas .al-apa'), [APA_K1, APA_K2], 'Rujukan APA 7');
    // DOI rekaan K2 dibuang pelayan, jadi carian tajuk Crossref digunakan dan tiada padanan ketat
    await t.ada('.al-kertas:nth-of-type(2) .al-lencana', /Diekstrak daripada PDF: semak butiran/);
    pasti(cr.some(u => u.includes('/works/10.1000/uji.1')) && cr.some(u => u.includes('query.bibliographic=Literasi kewangan dalam kalangan mahasiswa')), 'Crossref: DOI K1 dan carian tajuk K2');
    pasti(!cr.some(u => u.includes('10.9999')), 'DOI rekaan tidak disemak');
    await t.ada('.al-kertas:first-of-type .bk-cites summary', /^1 petikan disahkan$/);
    await page.click('.al-kertas:first-of-type [data-salin-apa="K1"]');
    await t.ada('.toast', /Rujukan APA disalin\./);
    sama(await papan(page), APA_K1, 'Rujukan disalin');
    await page.click('[data-salin-intext="K2"]');
    sama(await papan(page), '(Rahman et al., 2021)', 'Petikan dalam teks disalin');
    // Matriks dan CSV
    await t.klik('[data-tab="rujukan:matriks"]');
    sama(await teksSemua(page, '.al-matriks tbody th'), ['Ali (2023)', 'Rahman et al. (2021)'], 'Baris matriks');
    const csv = await muatTurun(page, '[data-act="matriks-csv"]');
    sama(csv.nama, 'matriks-sorotan-literatur.csv', 'Nama fail matriks');
    const baris = csv.isi.split('\r\n');
    sama(baris[0], '﻿"Kajian","Rujukan APA 7","Objektif","Metodologi","Sampel","Dapatan","Batasan","Kata kunci"', 'Kepala CSV');
    sama(baris[1], `"Ali (2023)","${APA_K1}","Meneliti tabiat pelaburan pelajar universiti.","Tinjauan","320 pelajar","Literasi kewangan meramalkan penyertaan pelaburan.","Sampel satu negeri.","literasi kewangan; pelaburan"`, 'Baris CSV K1');
    sama(baris.length, 3, 'Bilangan baris CSV');
    await tiadaLimpahan(page);
    // Sintesis: id kertas dipaparkan sebagai petikan, id tidak wujud dibuang
    await t.klik('[data-tab="rujukan:sintesis"]');
    sama(await teksSemua(page, '.bk-out .bk-topic:first-of-type .kj-tags span'), ['Ali, 2023', 'Rahman et al., 2021'], 'Kertas setiap tema');
    await t.ada('.bk-out', /Jurang kajian.*IPTA dan IPTS/s);
    await t.ada('.bk-out', /Cadangan soalan kajian/);
    await t.klik('[data-tab="rujukan:sorotan"]');
    sama(await kira(page, '.bk-out > p:not(.muted)'), 2, 'Perenggan sorotan');
    await t.klik('[data-act="salin-sorotan"]');
    sama(await papan(page), RUJUKAN_MODEL.sorotan.join('\n\n'), 'Sorotan disalin');
    // Senarai rujukan tersusun, BibTeX dan RIS
    await t.klik('[data-tab="rujukan:senarai"]');
    sama(await teksSemua(page, '.al-senarai-apa li'), [APA_K1, APA_K2], 'Senarai rujukan mengikut abjad');
    await t.klik('[data-act="salin-senarai"]');
    sama(await papan(page), APA_K1 + '\n\n' + APA_K2, 'Senarai disalin');
    const bib = await muatTurun(page, '[data-act="bibtex"]');
    sama(bib.nama, 'rujukan.bib', 'Nama fail BibTeX');
    sama(bib.isi.split('\n\n')[0], '@article{ali2023a,\n  author = {Ali, Ahmad},\n  title = {Kajian ujian pelaburan pelajar},\n  journal = {Jurnal Ujian},\n  year = {2023},\n  volume = {5},\n  number = {2},\n  pages = {10--20},\n  publisher = {Penerbit Ujian},\n  doi = {10.1000/uji.1}\n}', 'Entri BibTeX K1');
    pasti(bib.isi.includes('@article{rahman2021b,\n  author = {Rahman, Siti Nur and Lim, Wei Jie and Kumar, Ravi}'), 'Entri BibTeX K2');
    const ris = await muatTurun(page, '[data-act="ris"]');
    sama(ris.nama, 'rujukan.ris', 'Nama fail RIS');
    sama(ris.isi.split('\r\n\r\n')[0].split('\r\n'), ['TY  - JOUR', 'AU  - Ali, Ahmad', 'TI  - Kajian ujian pelaburan pelajar', 'T2  - Jurnal Ujian', 'PY  - 2023', 'VL  - 5', 'IS  - 2', 'SP  - 10', 'EP  - 20', 'PB  - Penerbit Ujian', 'DO  - 10.1000/uji.1', 'ER  - '], 'Entri RIS K1');
    // Sunting butiran: tahun dan pengarang
    await t.klik('[data-tab="rujukan:kertas"]');
    await page.click('.al-kertas:nth-of-type(2) .al-sunting summary');
    await page.fill('[data-meta="K2"] [data-f="tahun"]', '2020');
    await page.dispatchEvent('[data-meta="K2"] [data-f="tahun"]', 'change');
    await t.ada('.al-kertas:nth-of-type(2) .al-apa', /\(2020\)/);
    await page.click('.al-kertas:nth-of-type(2) .al-sunting summary');
    await page.fill('[data-meta="K2"] [data-f="pengarang"]', 'Rahman, Siti Nur\nLim, Wei Jie');
    await page.dispatchEvent('[data-meta="K2"] [data-f="pengarang"]', 'change');
    await t.ada('.al-kertas:nth-of-type(2) .al-apa', /^Rahman, S\. N\., & Lim, W\. J\. \(2020\)\./);
    await page.click('[data-salin-intext="K2"]');
    sama(await papan(page), '(Rahman & Lim, 2020)', 'Petikan dalam teks selepas sunting');
    // Hasil kekal selepas muat semula
    await page.reload();
    await t.ada('.al-kertas:nth-of-type(2) .al-apa', /^Rahman, S\. N\., & Lim, W\. J\. \(2020\)\./);
  } },

  { kumpulan: K, nama: 'Rujukan: Crossref luar talian, metadata model digunakan', langkah: async (t, page) => {
    await page.route('https://api.crossref.org/**', r => r.fulfill({ status: 503, body: 'luar talian' }));
    await t.buka('#alat/rujukan');
    await page.setInputFiles('#alKertas', [fail('ali2023.txt', KERTAS1)]);
    await denganModel({ rujukan: { ...RUJUKAN_MODEL, kertas: [RUJUKAN_MODEL.kertas[0]] } }, async () => {
      await t.klik('[data-act="analisis-kertas"]');
      await t.ada('.al-kertas .al-lencana', /Diekstrak daripada PDF: semak butiran/, 20000);
    });
    sama(await t.teks('.al-kertas .al-apa'), 'Ali, A. (2023). Kajian ujian pelaburan pelajar. Jurnal Ujian, 5(2), 10–20. https://doi.org/10.1000/uji.1', 'APA daripada metadata yang diekstrak');
  } },

  { kumpulan: K, nama: 'Rujukan: pengguna percuma, had 2 kertas, 1 percubaan sehari, ralat tidak menghabiskan kuota', premium: false, langkah: async (t, page) => {
    const req = rekod(page);
    await t.buka('#alat/rujukan');
    await t.ada('.al-kuota', /Alat Premium\. Pengguna percuma: 1 percubaan hari ini\./);
    await t.ada('.al-drop', /paling banyak 2 fail \(Premium: 10\)/);
    await page.setInputFiles('#alKertas', [fail('a.txt', KERTAS1), fail('b.txt', KERTAS2), fail('c.txt', KERTAS2)]);
    await t.ada('.toast', /Hanya 2 fail pertama ditambah\./);
    await t.ada('.al-muat', /2\/2 fail/);
    await page.setInputFiles('#alKertas', [fail('d.txt', KERTAS1)]);
    await t.ada('.toast', /Pengguna percuma: 2 kertas\. Premium: sehingga 10 kertas\./);
    await t.klik('[data-buang-kertas="1"]');
    await t.ada('.al-muat', /1\/2 fail/);
    sama(await teksSemua(page, '.al-muat .bk-list b'), ['a'], 'Kertas dibuang');
    // Model gagal: ralat mesra dan kuota tidak dicatat
    await denganModel({ rujukan: 'bukan json' }, async () => {
      await t.klik('[data-act="analisis-kertas"]');
      await t.ada('#view-alat .error[role="alert"]', /Alat Pelajar tidak tersedia buat masa ini\./);
    });
    pasti(!((await storan(page, 'bl_kuota')) || {}).alatpro, 'Kuota tidak dicatat selepas ralat');
    await t.ada('.al-kuota', /1 percubaan hari ini/);
    await denganModel({ rujukan: { ...RUJUKAN_MODEL, kertas: [RUJUKAN_MODEL.kertas[0]] } }, async () => {
      await t.klik('[data-act="analisis-kertas"]');
      await t.ada('.al-kertas .al-apa', /Ali, A\. \(2023\)/, 20000);
    });
    sama((await storan(page, 'bl_kuota')).alatpro, 1, 'Percubaan dicatat');
    await t.ada('.al-kuota', /percubaan hari ini sudah digunakan/);
    await t.klik('[data-act="analisis-kertas"]');
    await t.ada('.toast', /Had percuma 1 percubaan alat Premium sehari sudah dicapai/);
    sama(req.length, 2, 'Tiada permintaan selepas percubaan habis');
  } },

  { kumpulan: K, nama: 'Rujukan: seret dan lepas, kertas terlalu pendek, jawapan tanpa id kertas sah memaparkan ralat', langkah: async (t, page) => {
    await t.buka('#alat/rujukan');
    // Kertas pendek: dibaca dalam peranti (> 50 aksara) tetapi ditolak pelayan (< 300 aksara)
    await page.setInputFiles('#alKertas', [fail('ringkas.txt', AYAT.slice(0, 3).join(' '))]);
    await t.ada('.al-muat', /1\/10 fail/);
    await t.klik('[data-act="analisis-kertas"]');
    await t.ada('#view-alat .error[role="alert"]', /Muat naik sekurang-kurangnya satu kertas penyelidikan yang boleh dibaca\./);
    await t.ada('.al-contoh', /Apa yang anda dapat/);
    await t.klik('[data-buang-kertas="0"]');
    // Seret dan lepas
    await page.evaluate(teks => {
      const dt = new DataTransfer();
      dt.items.add(new File([teks], 'diseret.txt', { type: 'text/plain' }));
      const z = document.querySelector('#alDrop');
      z.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      z.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    }, KERTAS1);
    await t.ada('.al-muat .bk-list', /diseret/);
    await t.ada('.al-muat', /1\/10 fail/);
    pasti(!(await page.$('#alDrop.atas')), 'Gaya seret dibuang selepas lepas');
    // Model palsu harness: id kertas ialah ayat, bukan K1, jadi pelayan membuang semua kertas dan memulangkan ralat
    await t.klik('[data-act="analisis-kertas"]');
    await t.ada('#view-alat .error[role="alert"]', /^Alat Pelajar tidak tersedia buat masa ini\.$/, 20000);
    pasti(!(await page.$('.al-hasil-kepala')), 'Tiada tab hasil kosong');
  } },

  { kumpulan: K, nama: 'Rujukan: semakan Crossref yang lambat tidak menimpa analisis yang lebih baharu', langkah: async (t, page) => {
    let lepas;
    const tahan = new Promise(r => { lepas = r; });
    // Semakan DOI analisis pertama ditahan; carian tajuk analisis kedua dijawab serta-merta
    await page.route('https://api.crossref.org/**', async r => { if (/\/works\/10\./.test(r.request().url())) await tahan; await r.fulfill({ status: 404, body: '{}' }); });
    await t.buka('#alat/rujukan');
    await page.setInputFiles('#alKertas', [fail('ali2023.txt', KERTAS1)]);
    await denganModel({ rujukan: { ...RUJUKAN_MODEL, kertas: [RUJUKAN_MODEL.kertas[0]] } }, async () => {
      await t.klik('[data-act="analisis-kertas"]');
      await t.ada('.al-kertas .al-apa', /Ali, A\. \(2023\)/, 20000);
    });
    // Analisis kedua (kertas berbeza) selesai sebelum semakan Crossref pertama
    await t.klik('[data-buang-kertas="0"]');
    await page.setInputFiles('#alKertas', [fail('rahman2021.txt', KERTAS2)]);
    await denganModel({ rujukan: { ...RUJUKAN_MODEL, kertas: [{ ...RUJUKAN_MODEL.kertas[1], id: 'K1' }] } }, async () => {
      await t.klik('[data-act="analisis-kertas"]');
      await t.ada('.al-kertas .al-apa', /^Rahman, S\. N\./, 20000);
    });
    lepas();
    await t.rehat(800);
    await t.ada('.al-kertas .al-apa', /^Rahman, S\. N\./);
    sama((await storan(page, 'alat_hasil')).rujukan.kertas[0].tajuk, 'Literasi kewangan dalam kalangan mahasiswa', 'Hasil tersimpan ialah analisis terbaharu');
  } },

  { kumpulan: K, nama: 'Rujukan: tajuk Crossref bertanda HTML dan tajuk berakhir "?" dalam APA 7', langkah: async (t, page) => {
    await page.route('https://api.crossref.org/works/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: {
      DOI: '10.1000/uji.1', title: ['Kesan <i>fintech</i> terhadap pelaburan pelajar'], author: [{ given: 'Ahmad', family: 'Ali' }], issued: { 'date-parts': [[2023]] },
      'container-title': ['Jurnal Ekonomi &amp; Kewangan'], volume: '5', issue: '2', page: '10-20', type: 'journal-article' } }) }));
    await t.buka('#alat/rujukan');
    await page.setInputFiles('#alKertas', [fail('ali2023.txt', KERTAS1), fail('rahman2021.txt', KERTAS2)]);
    const k2 = { ...RUJUKAN_MODEL.kertas[1], tajuk: 'Adakah mahasiswa bersedia untuk melabur?' };
    await denganModel({ rujukan: { ...RUJUKAN_MODEL, kertas: [RUJUKAN_MODEL.kertas[0], k2] } }, async () => {
      await t.klik('[data-act="analisis-kertas"]');
      await t.ada('.al-kertas .al-lencana', /DOI disahkan Crossref/, 20000);
    });
    sama(await teksSemua(page, '.al-kertas .al-apa'), [
      'Ali, A. (2023). Kesan fintech terhadap pelaburan pelajar. Jurnal Ekonomi & Kewangan, 5(2), 10–20. https://doi.org/10.1000/uji.1',
      'Rahman, S. N., Lim, W. J., & Kumar, R. (2021). Adakah mahasiswa bersedia untuk melabur? Jurnal Pengurusan Malaysia, 12(1), 45–60.'], 'Rujukan APA');
  } }
];
