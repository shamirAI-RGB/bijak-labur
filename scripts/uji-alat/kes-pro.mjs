/* Ujian hujung ke hujung: 15 alat Premium dalam #premium (js/pro.js, js/pro-invest.js, js/pro-study.js, js/pro-syariah.js).
   Setiap kiraan disemak dengan nilai yang dikira sendiri (bukan disalin daripada kod alat).
   Data luar: harga BTC 65000 USD dan USD/MYR 4.2 (data contoh kerangka); kes tertentu menukar jawapan API dengan page.route. */
import { readFile } from 'node:fs/promises';

const K = 'Premium';

/* ---------- Pembantu ---------- */
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const dua = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Ringgit seperti fmtRM (Intl ms-MY): "RM 1,234.56" (ruang selepas RM tidak wajib)
const RM = n => 'RM\\s?' + rx(dua(n));
const re = (...bahagian) => new RegExp(bahagian.join('[\\s\\S]*'));
const pasti = (syarat, mesej) => { if (!syarat) throw new Error(mesej); };
const toastAda = (t, pola) => t.ada('.toast', pola, 6000);
const nilai = (page, sel) => page.$eval(sel, e => e.value);
const kelas = (page, sel, k) => page.$eval(sel, (e, k) => e.classList.contains(k), k);
const terima = page => page.once('dialog', d => d.accept());
// Klik seperti pengguna selepas elemen ditatal ke tengah skrin (tidak dilindungi bar atas atau bar tab bawah yang melekat)
const tekan = async (page, sel) => { const l = page.locator(sel).first(); await l.evaluate(e => e.scrollIntoView({ block: 'center' }), null, { timeout: 10000 }); await l.click({ timeout: 10000 }); };
// Elemen kelihatan dan boleh diklik di kedudukannya sendiri (tidak terlindung di bawah elemen lain)
const bolehKlik = (page, sel) => page.waitForFunction(s => { const e = document.querySelector(s), r = e && e.getBoundingClientRect(); if (!r || !r.width) return false;
  const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!x && (x === e || e.contains(x)); }, sel, { timeout: 3000 })
  .catch(() => { throw new Error(`${sel} terlindung oleh elemen lain atau di luar skrin`); });
async function alat(t, page, k) {
  await t.buka('#premium');
  await tekan(page, `#toolGrid [data-tool="${k}"]`);
  await t.tunggu(`#tool-${k}:not(.hidden) .tool-body:not(.hidden)`, 5000);
}
async function muatSemula(t, page, k) {
  await page.reload(); await page.waitForLoadState('domcontentloaded'); await t.rehat(400);
  if (k) { await tekan(page, `#toolGrid [data-tool="${k}"]`); await t.tunggu(`#tool-${k}:not(.hidden) .tool-body:not(.hidden)`, 5000); }
}
// Jawapan JSON untuk satu halaman sahaja (laluan halaman mengatasi laluan konteks kerangka)
const jawab = (page, pola, fn, status = 200) => page.route(pola, async r => {
  const v = typeof fn === 'function' ? await fn(r.request().url()) : fn;
  return r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: typeof v === 'string' ? v : JSON.stringify(v) });
});
const putus = (page, pola) => page.route(pola, r => r.fulfill({ status: 503, contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' }, body: 'luar talian (ujian)' }));
// Harga ticker satu simbol (API sebenar memulangkan objek apabila ?symbol= digunakan)
const HARGA = { BTCUSDT: '65000.00', ETHUSDT: '3200.00' };
const tickerSatu = page => jawab(page, /data-api\.binance\.vision\/api\/v3\/ticker\/price\?symbol=/, u => {
  const s = new URL(u).searchParams.get('symbol'); return { symbol: s, price: HARGA[s] || '1.00' };
});

const PF = [
  { type: 'crypto', sym: 'BTC', qty: 0.1, cost: 60000, cur: 'USD' },
  { type: 'stock', sym: 'MAYBANK', qty: 1000, cost: 9.5, cur: 'MYR', price: 10.2 }
];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNQTX6NFTEMLQkADGRcwcht3uAAAAAASUVORK5CYII=', 'base64');
const KERTAS = 'Pelaburan patuh Syariah semakin popular dalam kalangan pelajar universiti di Malaysia. Kebanyakan pelajar memilih untuk melabur secara berkala setiap bulan kerana kaedah ini mengurangkan risiko masa pasaran. Walau bagaimanapun, pelajar perlu memahami prinsip asas pelaburan sebelum membuat keputusan. Literasi kewangan yang baik membantu pelajar mengurus perbelanjaan, menyimpan wang dan merancang masa depan dengan lebih teratur.';

// Tarikh Gregorian (04:00 UTC = tengah hari waktu Malaysia) bagi haul seterusnya, dicari hari demi hari
function haulDijangka(iso) {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'numeric', year: 'numeric' });
  const h = d => Object.fromEntries(f.formatToParts(d).filter(x => x.type !== 'literal').map(x => [x.type, parseInt(x.value, 10)]));
  const [y, m, d] = iso.split('-').map(Number), mula = Date.UTC(y, m - 1, d, 4), h0 = h(new Date(mula));
  for (let i = 1; i < 800; i++) {
    const t = new Date(mula + i * 864e5), x = h(t);
    if (x.year > h0.year && x.month === h0.month && x.day === h0.day && t.getTime() >= Date.now() - 432e5) return { t, h: x };
  }
  return null;
}
const BULAN_H = ['Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'];

export default [
  /* ---------- Keadaan terkunci (tanpa Premium) ---------- */
  { kumpulan: K, nama: 'Terkunci: kad kunci, butang Cuba percuma, badan alat tersembunyi', premium: false, langkah: async (t, page) => {
    await t.buka('#premium');
    await t.tunggu('#toolGrid [data-tool="zakat"]');
    const kunci = await page.$$eval('#toolGrid [data-tool] .tc-name svg.lock', l => l.length);
    const semua = await page.$$eval('#toolGrid [data-tool]', l => l.map(b => b.dataset.tool));
    pasti(semua.length === 15, `Sepatutnya 15 alat dalam grid, dapat ${semua.length}: ${semua.join(', ')}`);
    pasti(kunci === 15, `Semua 15 alat patut berikon kunci, dapat ${kunci}`);
    for (const k of ['zakat', 'pngk', 'syariah']) {
      await tekan(page, `#toolGrid [data-tool="${k}"]`);
      await t.tunggu(`#tool-${k} .locked:not(.hidden)`, 5000);
      await bolehKlik(page, '#toolBack'); await bolehKlik(page, '#toolTitle');
      pasti(await kelas(page, `#tool-${k} .tool-body`, 'hidden'), `Badan alat ${k} patut tersembunyi apabila dikunci`);
      await t.ada(`#tool-${k} .locked [data-goplans]`, /Cuba percuma 1 hari atau langgan Premium/);
      await t.ada('#toolTitle', /\S/);
      await tekan(page, '#toolBack');
      await t.tunggu('#toolGrid:not(.hidden)', 3000);
    }
    // init alat tidak dijalankan semasa dikunci
    pasti(!(await t.teks('#zkOut')).trim(), 'Zakat tidak patut dikira semasa dikunci');
    await tekan(page, '#toolGrid [data-tool="zakat"]');
    await t.ada('#tool-zakat .locked', /Kira zakat atas saham, kripto dan simpanan/);
    await tekan(page, '#tool-zakat .locked [data-goplans]');
    await t.tunggu('#plansBlock:not(.hidden)', 3000);
    await page.waitForFunction(() => { const r = document.querySelector('#plansBlock').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }, null, { timeout: 5000 });
  } },

  /* ---------- 1. Portfolio ---------- */
  { kumpulan: K, nama: 'Portfolio: kripto + saham, nilai RM, peruntukan, sunting harga, buang, kekal selepas muat semula', langkah: async (t, page) => {
    await alat(t, page, 'portfolio');
    await t.ada('#pfTable', /Belum ada pegangan/);
    await t.isi('#pfSym', 'btc'); await t.isi('#pfQty', '0.1'); await t.isi('#pfCost', '60000');
    await tekan(page, '#pfForm button[type=submit]');
    // 0.1 x 65000 USD x 4.2 = RM27,300; kos 0.1 x 60000 x 4.2 = RM25,200
    await t.ada('#pfTable', re('BTC', '0.1 unit', 'kos \\$60,000.00', RM(27300), '\\+' + RM(2100), '\\+8\\.33%'));
    await t.ada('#pfFx', /USD\/MYR 4\.2000\.$/);
    await t.pilih('#pfType', 'stock');
    pasti(!(await kelas(page, '#pfPriceWrap', 'hidden')), 'Medan harga saham patut dipaparkan');
    pasti(await nilai(page, '#pfCur') === 'MYR', 'Mata wang saham patut bertukar ke RM');
    await t.isi('#pfSym', 'Maybank'); await t.isi('#pfQty', '1000'); await t.isi('#pfCost', '9.5'); await t.isi('#pfPrice', '10.2');
    await tekan(page, '#pfForm button[type=submit]');
    await t.ada('#pfTable', re('MAYBANK', '1,000 unit', 'kos RM9.50', RM(10200), '\\+' + RM(700), '\\+7\\.37%'));
    // Jumlah RM37,500, kos RM34,700, untung RM2,800 (+8.07%)
    await t.ada('#pfSummary', re(RM(37500), 'Nilai semasa', '\\+' + RM(2800), '\\+8\\.07%'));
    await t.ada('#pfAlloc', re('BTC 72\\.8%', 'MAYBANK 27\\.2%'));
    // Borang dikosongkan dan kembali ke kripto
    pasti(await nilai(page, '#pfSym') === '' && await nilai(page, '#pfType') === 'crypto', 'Borang patut dikosongkan selepas tambah');
    // Sunting harga saham terus dalam jadual: 9.00 -> nilai RM9,000, rugi RM500
    await page.fill('#pfTable .pf-price', '9');
    await page.dispatchEvent('#pfTable .pf-price', 'change');
    await t.ada('#pfTable', re('MAYBANK', RM(9000), '−' + RM(500), '-5\\.26%'));
    await t.ada('#pfSummary', re(RM(36300), '\\+' + RM(1600), '\\+4\\.61%'));
    await muatSemula(t, page, 'portfolio');
    await t.ada('#pfTable', re('BTC', RM(27300), 'MAYBANK', RM(9000)));
    terima(page);
    await tekan(page, '#pfTable [data-del="0"]');
    await t.ada('#pfSummary', re(RM(9000), 'Nilai semasa'));
    pasti(!/BTC/.test(await t.teks('#pfTable')), 'BTC patut dibuang');
    const simpan = await page.evaluate(() => JSON.parse(localStorage.getItem('bl_portfolio')));
    pasti(simpan.length === 1 && simpan[0].sym === 'MAYBANK' && simpan[0].price === 9, 'Storan portfolio tidak dikemas kini: ' + JSON.stringify(simpan));
  } },

  { kumpulan: K, nama: 'Portfolio: input tidak sah dan luar talian (harga/kadar tukaran 503)', lebar: 1280, langkah: async (t, page) => {
    await putus(page, /data-api\.binance\.vision\/api\/v3\/ticker\/price/);
    await putus(page, /open\.er-api\.com/);
    await alat(t, page, 'portfolio');
    // Tajuk alat dan butang kembali tidak terlindung di bawah bar atas selepas alat dibuka
    await bolehKlik(page, '#toolBack'); await bolehKlik(page, '#toolTitle');
    await tekan(page, '#pfForm button[type=submit]');
    await toastAda(t, /Lengkapkan simbol, kuantiti, kos dan harga/);
    await t.isi('#pfSym', 'ETH'); await t.isi('#pfQty', '-2'); await t.isi('#pfCost', '3000');
    await tekan(page, '#pfForm button[type=submit]');
    await toastAda(t, /Lengkapkan simbol/);
    await t.isi('#pfQty', '2'); await t.pilih('#pfCur', 'MYR');
    await tekan(page, '#pfForm button[type=submit]');
    await toastAda(t, /Harga kripto dalam USD/);
    await t.pilih('#pfCur', 'USD');
    await t.isi('#pfSym', '<img src=x>eth');
    await tekan(page, '#pfForm button[type=submit]');
    // Simbol dibersihkan; tanpa harga langsung, nilai menunggu (rangka) dan kadar anggaran dipaparkan
    await t.ada('#pfTable', /IMGSRCXETH/);
    pasti(!(await page.$('#pfTable img')), 'HTML dalam simbol tidak patut dipaparkan');
    await t.tunggu('#pfTable .pf-val .skeleton', 3000);
    await t.ada('#pfFx', /USD\/MYR 4\.2000 \(anggaran, tiada sambungan\)/);
    await t.ada('#pfSummary', re(RM(0), 'Nilai semasa'));
  } },

  /* ---------- 2. Simulator DCA ---------- */
  { kumpulan: K, nama: 'DCA: input kosong, tiada data, luar talian, kiraan tepat (klines contoh), carta, desktop, tetapan kekal', langkah: async (t, page) => {
    let mod = 'kosong';
    await tickerSatu(page);
    await page.route(/data-api\.binance\.vision\/api\/v3\/klines/, r => mod === 'asal' ? r.fallback()
      : mod === 'kosong' ? r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' })
      : r.fulfill({ status: 503, contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' }, body: 'luar talian (ujian)' }));
    await alat(t, page, 'dca');
    pasti(await nilai(page, '#dcaSym') === 'BTC' && await nilai(page, '#dcaAmt') === '200' && await nilai(page, '#dcaStart') === '2020-01', 'Nilai asal DCA salah');
    await t.isi('#dcaAmt', '');
    await tekan(page, '#dcaGo');
    await toastAda(t, /Isi jumlah bulanan dan bulan mula/);
    await t.isi('#dcaAmt', '200');
    await tekan(page, '#dcaGo');
    await toastAda(t, /Tiada data untuk tempoh ini/);
    mod = 'putus';
    await tekan(page, '#dcaGo');
    await toastAda(t, /Data harga tidak dapat dimuatkan/);
    pasti(await kelas(page, '#dcaOut', 'hidden'), 'Hasil DCA tidak patut dipaparkan tanpa data');
    await page.waitForFunction(() => document.querySelector('#dcaGo').textContent === 'Kira' && !document.querySelector('#dcaGo').disabled, null, { timeout: 3000 });
    // Data contoh kerangka: 120 lilin, harga buka 30000 + 120k USD; RM200 sebulan pada 4.2
    mod = 'asal';
    await tekan(page, '#dcaGo');
    await t.tunggu('#dcaOut:not(.hidden)', 10000);
    let unit = 0; for (let k = 0; k < 120; k++) unit += (200 / 4.2) / (30000 + 120 * k);
    const nilaiKini = unit * 65000 * 4.2, pulangan = (nilaiKini / 24000 - 1) * 100;
    await t.ada('#dcaStats', re(RM(24000), 'Jumlah dilabur \\(120 bulan\\)', RM(nilaiKini), 'Nilai hari ini', '\\+' + rx(pulangan.toFixed(2)) + '%', rx(unit.toPrecision(6)) + ' BTC'));
    await t.ada('#dcaNote', /^Data BTC\/USDT bermula .+RM4\.20 sedolar/);
    await t.tunggu('#dcaChart canvas', 5000);
    pasti((await t.teks('#dcaGo')) === 'Kira' && !(await page.$eval('#dcaGo', b => b.disabled)), 'Butang Kira patut dipulihkan');
    // Lebar desktop: tukar aset dan jumlah, kemudian muat semula: tetapan kekal
    await page.setViewportSize({ width: 1280, height: 800 });
    await t.pilih('#dcaSym', 'ETH'); await t.isi('#dcaAmt', '350'); await t.isi('#dcaStart', '2021-06');
    await tekan(page, '#dcaGo');
    let u2 = 0; for (let k = 0; k < 120; k++) u2 += (350 / 4.2) / (30000 + 120 * k);
    await t.ada('#dcaStats', re(RM(42000), RM(u2 * 3200 * 4.2), rx(u2.toPrecision(6)) + ' ETH'));
    await muatSemula(t, page, 'dca');
    pasti(await nilai(page, '#dcaSym') === 'ETH' && await nilai(page, '#dcaAmt') === '350' && await nilai(page, '#dcaStart') === '2021-06', 'Tetapan DCA tidak kekal selepas muat semula');
  } },

  /* ---------- 3. Zakat ---------- */
  { kumpulan: K, nama: 'Zakat: nisab 85 g, 2.5%, haul, sempadan nisab, hutang, kekal', langkah: async (t, page) => {
    await alat(t, page, 'zakat');
    await t.ada('#zkOut', /Masukkan harga emas semasa segram/);
    await tekan(page, '#zkFromPf');
    await toastAda(t, /Portfolio anda masih kosong/);
    await t.isi('#zkGold', '400'); await t.isi('#zkCash', '20000'); await t.isi('#zkStock', '15000'); await t.isi('#zkCrypto', '5000'); await t.isi('#zkDebt', '2000');
    // Harta 38,000 >= nisab 85 x 400 = 34,000 -> 2.5% = 950
    await t.ada('#zkOut', re('Zakat perlu dibayar', RM(950), 'wajib dikeluarkan', 'Harta bersih dikira', RM(38000), 'Nisab \\(85 g emas\\)', RM(34000), '2\\.5%'));
    await page.uncheck('#zkHaul');
    await t.ada('#zkOut', re(RM(0), 'belum cukup haul'));
    await page.check('#zkHaul');
    await t.isi('#zkDebt', '6000');   // tepat pada nisab: wajib
    await t.ada('#zkOut', re(RM(850), 'wajib dikeluarkan', RM(34000)));
    await t.isi('#zkDebt', '6000.01');
    await t.ada('#zkOut', re(RM(0), 'belum mencapai nisab', RM(33999.99)));
    await t.isi('#zkDebt', '90000');  // hutang melebihi harta: harta bersih tidak negatif
    await t.ada('#zkOut', re(RM(0), 'belum mencapai nisab', 'Harta bersih dikira', RM(0)));
    await muatSemula(t, page, 'zakat');
    pasti(await nilai(page, '#zkGold') === '400', 'Harga emas patut kekal selepas muat semula');
    await t.ada('#zkOut', re('Nisab', RM(34000)));
  } },

  { kumpulan: K, nama: 'Zakat: Guna nilai daripada portfolio', lebar: 1280, storan: { bl_portfolio: PF }, langkah: async (t, page) => {
    await alat(t, page, 'zakat');
    await t.isi('#zkGold', '400');
    await tekan(page, '#zkFromPf');
    await page.waitForFunction(() => document.querySelector('#zkCrypto').value === '27300.00', null, { timeout: 5000 });
    pasti(await nilai(page, '#zkStock') === '10200.00', 'Nilai saham daripada portfolio salah: ' + await nilai(page, '#zkStock'));
    // 27,300 + 10,200 = 37,500 -> zakat 937.50
    await t.ada('#zkOut', re(RM(937.5), 'wajib', RM(37500)));
  } },

  /* ---------- 4. Penjana rujukan ---------- */
  { kumpulan: K, nama: 'Rujukan: APA, MLA, Harvard (buku, jurnal, laman web), senarai abjad, salin, buang, kekal', lebar: 1280, langkah: async (t, page) => {
    await alat(t, page, 'rujukan');
    await t.ada('#rfPreview', /Isi tajuk untuk melihat rujukan/);
    await tekan(page, '#rfForm button[type=submit]');
    await toastAda(t, /Tajuk diperlukan/);
    // APA 7, buku dua pengarang
    await t.isi('#rf-authors', 'Abdullah, Siti Aminah\nTan, Wei Ming'); await t.isi('#rf-year', '2020');
    await t.isi('#rf-title', 'Pengurusan kewangan peribadi'); await t.isi('#rf-publisher', 'Dewan Bahasa dan Pustaka');
    await t.ada('#rfPreview', /^Abdullah, S\. A\., & Tan, W\. M\. \(2020\)\. Pengurusan kewangan peribadi\. Dewan Bahasa dan Pustaka\.$/);
    pasti(await t.teks('#rfPreview i') === 'Pengurusan kewangan peribadi.', 'Tajuk buku APA patut italik');
    await tekan(page, '#rfCopy');
    await toastAda(t, /Disalin/);
    const salin = await page.evaluate(() => navigator.clipboard.readText());
    pasti(salin === 'Abdullah, S. A., & Tan, W. M. (2020). Pengurusan kewangan peribadi. Dewan Bahasa dan Pustaka.', 'Teks disalin salah: ' + salin);
    await tekan(page, '#rfForm button[type=submit]');
    await toastAda(t, /Rujukan disimpan/);
    pasti(await nilai(page, '#rf-title') === '' && await nilai(page, '#rf-authors') === '', 'Borang patut dikosongkan selepas simpan');
    // MLA 9, artikel jurnal dengan DOI
    await t.pilih('#rfStyle', 'mla');
    await t.ada('#rfListTitle', /^Works Cited$/);
    await t.pilih('#rfType', 'journal');
    pasti(await kelas(page, '#rfForm [data-f="publisher"]', 'hidden') && !(await kelas(page, '#rfForm [data-f="container"]', 'hidden')), 'Medan jurnal tidak ditukar');
    await t.isi('#rf-authors', 'Lim, Mei-Ling'); await t.isi('#rf-year', '2023'); await t.isi('#rf-title', 'Literasi kewangan dalam kalangan pelajar');
    await t.isi('#rf-container', 'Jurnal Pengurusan'); await t.isi('#rf-volume', '12'); await t.isi('#rf-issue', '3'); await t.isi('#rf-pages', '45-62'); await t.isi('#rf-doi', '10.1000/xyz123');
    await t.ada('#rfPreview', /^Lim, Mei-Ling\. “Literasi kewangan dalam kalangan pelajar\.” Jurnal Pengurusan, vol\. 12, no\. 3, 2023, pp\. 45–62, doi\.org\/10\.1000\/xyz123\.$/);
    // Tukar ke buku (APA): medan jurnal yang tersembunyi (DOI, nama jurnal) tidak patut masuk ke rujukan buku
    await t.pilih('#rfStyle', 'apa'); await t.pilih('#rfType', 'book');
    await t.ada('#rfPreview', /^Lim, M\. L\. \(2023\)\. Literasi kewangan dalam kalangan pelajar\.$/);
    await t.pilih('#rfType', 'journal'); await t.pilih('#rfStyle', 'mla');
    await t.ada('#rfPreview', /Jurnal Pengurusan, vol\. 12, no\. 3, 2023, pp\. 45–62, doi\.org\/10\.1000\/xyz123\.$/);
    await tekan(page, '#rfForm button[type=submit]');
    await t.ada('#rfList', re('Abdullah, Siti Aminah, and Wei Ming Tan\\. Pengurusan kewangan peribadi\\. Dewan Bahasa dan Pustaka, 2020\\.', 'Lim, Mei-Ling\\.'));
    // Harvard: senarai disusun semula
    await t.pilih('#rfStyle', 'harvard');
    await t.ada('#rfListTitle', /^Reference list$/);
    const item = await page.$$eval('#rfList li > span', l => l.map(x => x.textContent));
    pasti(item[0] === 'Abdullah, S.A. and Tan, W.M. (2020) Pengurusan kewangan peribadi. Dewan Bahasa dan Pustaka.', 'Harvard buku salah: ' + item[0]);
    pasti(item[1] === 'Lim, M.L. (2023) ‘Literasi kewangan dalam kalangan pelajar’, Jurnal Pengurusan, 12(3), pp. 45–62. doi: 10.1000/xyz123.', 'Harvard jurnal salah: ' + item[1]);
    // Laman web oleh organisasi, dengan tarikh akses
    await t.pilih('#rfType', 'web');
    pasti(await kelas(page, '#rfForm [data-f="doi"]', 'hidden') && !(await kelas(page, '#rfForm [data-f="accessed"]', 'hidden')), 'Medan laman web tidak ditukar');
    await t.isi('#rf-site', 'Bank Negara Malaysia'); await t.isi('#rf-year', '2024'); await t.isi('#rf-title', 'Kadar pertukaran asing');
    await t.isi('#rf-url', 'https://www.bnm.gov.my/kadar'); await t.isi('#rf-accessed', '2024-03-01');
    await t.ada('#rfPreview', /^Bank Negara Malaysia \(2024\) Kadar pertukaran asing\. Available at: https:\/\/www\.bnm\.gov\.my\/kadar \(Accessed: 1 March 2024\)\.$/);
    await t.pilih('#rfStyle', 'apa');
    await t.ada('#rfPreview', /^Bank Negara Malaysia\. \(2024\)\. Kadar pertukaran asing\. https:\/\/www\.bnm\.gov\.my\/kadar$/);
    await t.pilih('#rfStyle', 'mla');
    await t.ada('#rfPreview', /^“Kadar pertukaran asing\.” Bank Negara Malaysia, 2024, www\.bnm\.gov\.my\/kadar\. Accessed 1 Mar\. 2024\.$/);
    // HTML dalam tajuk dipaparkan sebagai teks
    await t.isi('#rf-title', '<img src=x>Ujian');
    pasti(!(await page.$('#rfPreview img')), 'HTML dalam tajuk tidak patut menjadi elemen');
    await t.isi('#rf-title', 'Kadar pertukaran asing');
    await tekan(page, '#rfForm button[type=submit]');
    await t.pilih('#rfStyle', 'harvard');
    await tekan(page, '#rfCopyAll');
    await toastAda(t, /Disalin/);
    const semua = await page.evaluate(() => navigator.clipboard.readText());
    const baris = semua.split('\n').filter(Boolean);
    pasti(baris.length === 3 && /^Abdullah/.test(baris[0]) && /^Bank Negara/.test(baris[1]) && /^Lim/.test(baris[2]), 'Salin semua salah: ' + JSON.stringify(baris));
    // Buang rujukan Bank Negara (indeks simpanan 2)
    await tekan(page, '#rfList [data-rdel="2"]');
    await page.waitForFunction(() => document.querySelectorAll('#rfList [data-rdel]').length === 2, null, { timeout: 3000 });
    await muatSemula(t, page, 'rujukan');
    pasti(await nilai(page, '#rfStyle') === 'harvard', 'Gaya rujukan patut kekal');
    await t.ada('#rfListTitle', /^Reference list$/);
    const lepas = await page.$$eval('#rfList [data-rdel]', l => l.length);
    pasti(lepas === 2, 'Senarai rujukan patut kekal (2), dapat ' + lepas);
  } },

  /* ---------- 5. Saiz posisi ---------- */
  { kumpulan: K, nama: 'Saiz posisi: lot Bursa, long/short, sasaran, amaran, kekal, desktop', langkah: async (t, page) => {
    await alat(t, page, 'posisi');
    await t.ada('#psOut', /Isi modal, harga masuk dan stop loss/);
    // Modal 13,000, risiko 1% = RM130, risiko seunit 0.25 -> 520 unit -> 500 (lot)
    await t.isi('#psCap', '13000'); await t.isi('#psRisk', '1'); await t.isi('#psEntry', '2.5'); await t.isi('#psStop', '2.25'); await t.isi('#psTarget', '3.25');
    await t.ada('#psOut', re('^500', 'Unit dibeli', RM(1250), 'Nilai posisi', RM(125), 'Risiko maksimum', 'Beli \\(long\\)', RM(0.25) + ' \\(10\\.00%\\)', '9\\.6%', '1 : 3\\.00', RM(375)));
    await page.uncheck('#psLot');
    await t.ada('#psOut', re('^520', RM(1300), RM(130), '10\\.0%', RM(390)));
    await t.isi('#psStop', '2.75'); await t.isi('#psTarget', '2');
    await t.ada('#psOut', re('^520', 'Jual \\(short\\)', '1 : 2\\.00', RM(260)));
    await t.isi('#psTarget', '2.25');   // nisbah 1:1 -> nota nisbah rendah
    await t.ada('#psOut', re('1 : 1\\.00', 'Nisbah di bawah 1:1\\.5'));
    await t.isi('#psStop', '2.5');
    await t.ada('#psOut', /Stop loss mesti berbeza daripada harga masuk/);
    await t.isi('#psStop', '2.25'); await t.isi('#psCap', '20'); await page.check('#psLot');
    await t.ada('#psOut', re('^0', 'Risiko seunit terlalu besar'));
    // Posisi melebihi modal
    await t.isi('#psCap', '1000'); await t.isi('#psRisk', '10'); await t.isi('#psEntry', '10'); await t.isi('#psStop', '9.75'); await t.isi('#psTarget', '');
    await t.ada('#psOut', re('^400', RM(4000), 'melebihi modal'));
    // Borang disimpan (dipulihkan oleh persist() yang sama seperti Kos, Dividen dan Matlamat yang diuji dengan muat semula)
    const ps = await page.evaluate(() => JSON.parse(localStorage.getItem('bl_t_posisi')));
    pasti(ps.psCap === '1000' && ps.psRisk === '10' && ps.psEntry === '10' && ps.psStop === '9.75' && ps.psLot === true, 'Borang saiz posisi tidak disimpan: ' + JSON.stringify(ps));
    // Lebar desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await t.isi('#psCap', '50000'); await t.isi('#psRisk', '2'); await t.isi('#psEntry', '4'); await t.isi('#psStop', '3.5');
    // Risiko RM1,000 / 0.50 = 2,000 unit; nilai RM8,000 (16.0% modal)
    await t.ada('#psOut', re('^2,000', RM(8000), RM(1000), '16\\.0%'));
    pasti(!/Nisbah ganjaran/.test(await t.teks('#psOut')), 'Nisbah ganjaran hanya dipaparkan jika sasaran diisi');
  } },

  /* ---------- 6. Jurnal dagangan ---------- */
  { kumpulan: K, nama: 'Jurnal: tarikh asal waktu Malaysia, rekod, statistik, lengkung ekuiti, CSV selamat, buang, kekal', lebar: 1280, langkah: async (t, page) => {
    // 01:00 waktu Malaysia pada 10 Okt = 17:00 UTC 9 Okt; tarikh asal mesti 10 Okt
    await page.clock.setFixedTime(new Date('2026-10-10T01:00:00+08:00'));
    await alat(t, page, 'jurnal');
    const hariIni = await nilai(page, '#jnDate');
    pasti(hariIni === '2026-10-10', 'Tarikh asal jurnal patut 2026-10-10 (waktu Malaysia), dapat ' + hariIni);
    await t.ada('#jnList', /Belum ada dagangan direkod/);
    pasti(await page.$eval('#jnCsv', b => b.disabled), 'CSV patut dilumpuhkan tanpa dagangan');
    pasti(await kelas(page, '#jnCurveCard', 'hidden'), 'Lengkung ekuiti patut tersembunyi tanpa data');
    await t.isi('#jnSym', 'TENAGA');
    await tekan(page, '#jnForm button[type=submit]');
    await toastAda(t, /Lengkapkan tarikh, simbol, unit dan harga/);
    // Untung: (10.00 - 9.50) x 1000 - 20 = 480
    await t.isi('#jnDate', '2026-01-05'); await t.isi('#jnSym', 'maybank'); await t.pilih('#jnSide', 'long');
    await t.isi('#jnQty', '1000'); await t.isi('#jnIn', '9.5'); await t.isi('#jnOut', '10'); await t.isi('#jnFee', '20'); await t.isi('#jnNote', 'Ikut pelan');
    await tekan(page, '#jnForm button[type=submit]');
    await toastAda(t, /Dagangan direkod/);
    // Rugi jual dahulu: (13.00 - 13.50) x 200 - 10 = -110
    await t.isi('#jnDate', '2026-01-10'); await t.isi('#jnSym', 'tenaga'); await t.pilih('#jnSide', 'short');
    await t.isi('#jnQty', '200'); await t.isi('#jnIn', '13'); await t.isi('#jnOut', '13.5'); await t.isi('#jnFee', '10'); await t.isi('#jnNote', '=HYPERLINK("http://contoh")');
    await tekan(page, '#jnForm button[type=submit]');
    await t.ada('#jnStats', re('\\+' + RM(370), 'Untung bersih', '50%', 'Kadar menang \\(2 dagangan\\)', 'RM480 / RM110', '4\\.36', 'Faktor keuntungan'));
    pasti(!(await kelas(page, '#jnCurveCard', 'hidden')), 'Lengkung ekuiti patut dipaparkan dengan 2 dagangan');
    await t.tunggu('#jnCurve polyline', 3000);
    const susun = await page.$$eval('#jnList .pf-main b', l => l.map(b => b.textContent));
    pasti(susun.join() === 'TENAGA,MAYBANK', 'Senarai patut disusun ikut tarikh terbaru: ' + susun);
    await t.ada('#jnList', re('TENAGA', 'Jual dahulu 200 unit · 13 → 13.5', '−' + RM(110), 'MAYBANK', '\\+' + RM(480), 'Ikut pelan'));
    // CSV: formula hamparan dineutralkan
    const [muat] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), tekan(page, '#jnCsv')]);
    pasti(muat.suggestedFilename() === 'jurnal-dagangan.csv', 'Nama fail CSV salah');
    const csv = (await readFile(await muat.path(), 'utf8')).replace(/^﻿/, '').split('\n');
    pasti(csv[0] === 'Tarikh,Simbol,Arah,Unit,Masuk,Keluar,Caj,Untung,Nota', 'Kepala CSV salah: ' + csv[0]);
    pasti(csv[1] === '"2026-01-05","MAYBANK",long,1000,9.5,10,20,480.00,"Ikut pelan"', 'Baris CSV 1 salah: ' + csv[1]);
    pasti(csv[2] === '"2026-01-10","TENAGA",short,200,13,13.5,10,-110.00,"\'=HYPERLINK(""http://contoh"")"', 'Baris CSV 2 salah: ' + csv[2]);
    await muatSemula(t, page, 'jurnal');
    await t.ada('#jnStats', re('\\+' + RM(370), '50%'));
    // Buang MAYBANK (indeks simpanan 0)
    terima(page);
    await tekan(page, '#jnList [data-jdel="0"]');
    await t.ada('#jnStats', re('−' + RM(110), '0%', 'Kadar menang \\(1 dagangan\\)', '0\\.00'));
    pasti(await kelas(page, '#jnCurveCard', 'hidden'), 'Lengkung ekuiti patut tersembunyi dengan 1 dagangan');
    const n = await page.evaluate(() => JSON.parse(localStorage.getItem('bl_journal')).length);
    pasti(n === 1, 'Storan jurnal patut ada 1 dagangan, dapat ' + n);
  } },

  /* ---------- 7. Kos dagangan Bursa ---------- */
  { kumpulan: K, nama: 'Kos Bursa: komisen minimum, SST, penjelasan, setem (had RM1,000), pulang modal, untung/rugi, desktop', langkah: async (t, page) => {
    await alat(t, page, 'kos');
    await t.ada('#ksBuyOut', /Isi unit dan harga beli/);
    await t.isi('#ksUnits', '1000'); await t.isi('#ksBuy', '2'); await t.isi('#ksRate', '0.1'); await t.isi('#ksMin', '8');
    // Nilai 2,000: komisen min 8, SST 0.64, penjelasan 0.60, setem 2 = 11.24
    await t.ada('#ksBuyOut', re(RM(2011.24), 'Komisen', RM(8), 'SST 8%', RM(0.64), 'Fi penjelasan', RM(0.6), 'Duti setem', RM(2), 'Jumlah caj', RM(11.24), 'pulang modal: RM2\\.025 \\(\\+1\\.25%\\)'));
    await t.ada('#ksSellOut', /Isi harga jual untuk melihat untung bersih/);
    // Jual 2,200: 8 + 0.64 + 0.66 + 3 = 12.30 -> bersih 2,200 - 12.30 - 2,011.24 = 176.46
    await t.isi('#ksSell', '2.2');
    await t.ada('#ksSellOut', re('\\+' + RM(176.46), '\\(\\+8\\.77%\\)', RM(0.66), 'Duti setem', RM(3), 'Jumlah caj', RM(12.3)));
    await t.isi('#ksSell', '1.9');   // 1,900 - 11.21 - 2,011.24 = -122.45
    await t.ada('#ksSellOut', re('−' + RM(122.45), '\\(-6\\.09%\\)'));
    await page.uncheck('#ksSst');
    await t.ada('#ksBuyOut', re(RM(2010.6), 'Jumlah caj', RM(10.6)));
    pasti(!/SST/.test(await t.teks('#ksBuyOut')), 'Baris SST patut hilang');
    await t.isi('#ksUnits', '');
    await t.ada('#ksBuyOut', /Isi unit dan harga beli/);
    pasti(!(await t.teks('#ksSellOut')).trim(), 'Kad jual patut kosong');
    await t.isi('#ksUnits', '1000');
    await muatSemula(t, page, 'kos');
    pasti(!(await page.$eval('#ksSst', c => c.checked)) && await nilai(page, '#ksSell') === '1.9', 'Tetapan kos patut kekal');
    await t.ada('#ksBuyOut', re(RM(2010.6)));
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.check('#ksSst'); await t.isi('#ksSell', '');
    // Nilai 5,000,000: komisen 5,000, SST 400, penjelasan dan setem dihadkan RM1,000 -> 7,400
    await t.isi('#ksUnits', '1000000'); await t.isi('#ksBuy', '5'); await t.isi('#ksRate', '0.1'); await t.isi('#ksMin', '8');
    await t.ada('#ksBuyOut', re(RM(5007400), RM(5000), RM(400), 'Fi penjelasan', RM(1000), 'Duti setem', RM(1000), 'Jumlah caj', RM(7400), 'RM5\\.015 \\(\\+0\\.30%\\)'));
  } },

  /* ---------- 8. Dividen dan DRIP ---------- */
  { kumpulan: K, nama: 'Dividen: nilai asal, tanpa/dengan DRIP, pertumbuhan, sumbangan bulanan, had tempoh, kekal, desktop', langkah: async (t, page) => {
    await alat(t, page, 'dividen');
    const asal = await page.$$eval('#dvForm input[type=number], #dvForm input:not([type])', l => l.map(i => i.value));
    pasti(asal.join() === '10000,300,5,3,3,15', 'Nilai asal dividen salah: ' + asal);
    await page.waitForFunction(() => document.querySelectorAll('#dvChart rect').length === 15, null, { timeout: 3000 });
    // 12,000 pada 6% tanpa DRIP dan tanpa pertumbuhan: RM720 setahun, RM60 sebulan
    await t.isi('#dvStart', '12000'); await t.isi('#dvMonthly', '0'); await t.isi('#dvYield', '6'); await t.isi('#dvGrowth', '0'); await t.isi('#dvPrice', '0'); await t.isi('#dvYears', '1');
    await page.uncheck('#dvDrip');
    await t.ada('#dvStats', re(RM(12000), 'Nilai portfolio akhir', RM(12000), 'Jumlah modal disumbang', RM(720), 'Jumlah dividen diterima', RM(60), 'Pendapatan pasif sebulan \\(tahun 1\\)'));
    // DRIP: 12,000 x 1.005^12 = 12,740.13; dividen 740.13
    await page.check('#dvDrip');
    await t.ada('#dvStats', re(RM(12740.13), RM(12000), RM(740.13), RM(61.68)));
    // Dividen tumbuh 10%: tahun 2 = 12,000 x 6.6% = 792; jumlah 1,512
    await page.uncheck('#dvDrip'); await t.isi('#dvGrowth', '10'); await t.isi('#dvYears', '2');
    await t.ada('#dvStats', re(RM(12000), RM(1512), RM(66), '\\(tahun 2\\)'));
    await page.waitForFunction(() => document.querySelectorAll('#dvChart rect').length === 2, null, { timeout: 3000 });
    await t.isi('#dvYears', '80');
    await t.ada('#dvStats', /tahun 50/);
    await t.isi('#dvYears', '0');
    await t.ada('#dvStats', /tahun 1\)/);
    await t.isi('#dvYears', '2');
    await muatSemula(t, page, 'dividen');
    pasti(await nilai(page, '#dvStart') === '12000' && await nilai(page, '#dvGrowth') === '10' && !(await page.$eval('#dvDrip', c => c.checked)), 'Nilai dividen patut kekal');
    await t.ada('#dvStats', re(RM(1512), '\\(tahun 2\\)'));
    await page.setViewportSize({ width: 1280, height: 800 });
    // Tiada hasil dan tiada kenaikan: nilai = 1,000 + 100 x 24
    await t.isi('#dvStart', '1000'); await t.isi('#dvMonthly', '100'); await t.isi('#dvYield', '0'); await t.isi('#dvGrowth', '0'); await t.isi('#dvPrice', '0'); await t.isi('#dvYears', '2');
    await t.ada('#dvStats', re(RM(3400), RM(3400), RM(0), RM(0)));
  } },

  /* ---------- 9. Perancang matlamat ---------- */
  { kumpulan: K, nama: 'Matlamat: simpanan bulanan, inflasi, pulangan, sudah cukup, kekal', lebar: 1280, langkah: async (t, page) => {
    await alat(t, page, 'matlamat');
    pasti(await nilai(page, '#mtTarget') === '50000' && await nilai(page, '#mtYears') === '5', 'Nilai asal matlamat salah');
    await t.ada('#mtOut', /Simpan setiap bulan/);
    // 12,000 dalam 1 tahun tanpa pulangan/inflasi = RM1,000 sebulan; harian 1,000 x 12 / 365 = 32.88
    await t.isi('#mtTarget', '12000'); await t.isi('#mtYears', '1'); await t.isi('#mtHave', '0'); await t.isi('#mtReturn', '0'); await t.isi('#mtInfl', '0');
    await t.ada('#mtOut', re('Simpan setiap bulan', RM(1000), 'Selama 12 bulan untuk deposit rumah\\.', 'Sasaran selepas inflasi', RM(12000), 'Simpanan harian setara', RM(32.88)));
    await t.isi('#mtInfl', '5');   // 12,600 / 12
    await t.ada('#mtOut', re(RM(1050), RM(12600), RM(34.52)));
    await t.isi('#mtInfl', '0'); await t.isi('#mtReturn', '6');   // 12,000 x 0.005 / (1.005^12 - 1)
    await t.ada('#mtOut', re(RM(972.8)));
    await t.pilih('#mtName', 'Haji atau umrah');
    await t.ada('#mtOut', /untuk haji atau umrah\./);
    await t.isi('#mtHave', '20000');
    await t.ada('#mtOut', re(RM(0), 'Simpanan sedia ada sudah mencukupi'));
    await t.isi('#mtTarget', '');
    await t.ada('#mtOut', /Isi jumlah dan tempoh/);
    await t.isi('#mtTarget', '12000'); await t.isi('#mtHave', '0');
    await muatSemula(t, page, 'matlamat');
    pasti(await nilai(page, '#mtName') === 'Haji atau umrah' && await nilai(page, '#mtReturn') === '6', 'Nilai matlamat patut kekal');
    await t.ada('#mtOut', re(RM(972.8), 'haji atau umrah'));
  } },

  /* ---------- 10. Bandingkan simpanan ---------- */
  { kumpulan: K, nama: 'Banding: kadar asal, pertumbuhan bulanan dikompaun, susunan menurun, kekal, desktop', langkah: async (t, page) => {
    await alat(t, page, 'banding');
    const asal = await page.$$eval('#bdForm input', l => l.map(i => i.value));
    pasti(asal.join() === '5000,200,10,5.75,6.3,2.6,5,7', 'Nilai asal banding salah: ' + asal);
    // Kadar asal 10 tahun: modal 5,000 + 200 x 120 = 29,000; indeks saham 7% di atas
    await t.ada('#bdList', re('Modal disimpan', RM(29000), 'Indeks saham'));
    const pertama = await page.$eval('#bdList > div:nth-child(2) dt', e => e.textContent.trim());
    pasti(pertama === 'Indeks saham', 'Pulangan tertinggi patut di atas, dapat ' + pertama);
    await t.isi('#bdStart', '1000'); await t.isi('#bdMonthly', '0'); await t.isi('#bdYears', '1');
    await t.isi('#bdASB', '12'); await t.isi('#bdEPF', '6'); await t.isi('#bdFD', '0'); await t.isi('#bdGold', '3'); await t.isi('#bdEq', '24');
    await t.ada('#bdList', re('Modal disimpan', RM(1000),
      'Indeks saham', RM(1268.24), '\\+26\\.82%', 'ASB', RM(1126.83), '\\+12\\.68%', 'KWSP', RM(1061.68), '\\+6\\.17%', 'Emas', RM(1030.42), '\\+3\\.04%', 'Simpanan tetap', RM(1000), '\\+0\\.00%'));
    pasti(await page.$$eval('#bdChart rect', l => l.length) === 5, 'Carta patut ada 5 bar');
    await t.isi('#bdStart', '0'); await t.isi('#bdMonthly', '100');
    for (const id of ['bdASB', 'bdEPF', 'bdGold', 'bdEq']) await t.isi('#' + id, '0');
    await t.ada('#bdList', re('Modal disimpan', RM(1200), RM(1200)));
    await t.isi('#bdStart', '1000'); await t.isi('#bdMonthly', '0'); await t.isi('#bdASB', '12');
    const bd = await page.evaluate(() => JSON.parse(localStorage.getItem('bl_t_banding')));
    pasti(bd.bdStart === '1000' && bd.bdASB === '12' && bd.bdEq === '0', 'Borang banding tidak disimpan: ' + JSON.stringify(bd));
    await page.setViewportSize({ width: 1280, height: 800 });
    await t.isi('#bdYears', '2');   // ASB 12% dua tahun: 1,000 x 1.01^24 = 1,269.73
    await t.ada('#bdList', re('Modal disimpan', RM(1000), 'ASB', RM(1269.73), '\\+26\\.97%'));
  } },

  /* ---------- 11. PNGK ---------- */
  { kumpulan: K, nama: 'PNGK: PNG semester, PNGK, sasaran, buang, kekal, semester kosong (desktop)', langkah: async (t, page) => {
    await alat(t, page, 'pngk');
    await t.ada('#cgStats', re('4\\.00', 'PNGK', '3', 'Jumlah jam kredit', '1', 'Semester'));
    // Semester 1: B+ (4 kredit) + A (3 kredit) = (13.32 + 12) / 7 = 3.62
    await page.selectOption('#cgSems .sem[data-si="0"] .course[data-ci="0"] [data-f="cr"]', '4');
    await page.selectOption('#cgSems .sem[data-si="0"] .course[data-ci="0"] [data-f="g"]', 'B+');
    await page.fill('#cgSems .sem[data-si="0"] .course[data-ci="0"] [data-f="k"]', 'MAT101');
    await tekan(page, '#cgSems [data-addc="0"]');
    await t.ada('#cgSems .sem[data-si="0"] .sem-gpa', /^PNG 3\.62$/);
    // Semester 2: C (3 kredit) -> PNGK (25.32 + 6) / 10 = 3.13
    await tekan(page, '#cgAddSem');
    await page.selectOption('#cgSems .sem[data-si="1"] .course[data-ci="0"] [data-f="g"]', 'C');
    await t.ada('#cgSems .sem[data-si="1"] .sem-gpa', /^PNG 2\.00$/);
    await t.ada('#cgStats', re('3\\.13', 'PNGK', '10', 'Jumlah jam kredit', '2', 'Semester'));
    await page.fill('#cgSems .sem[data-si="1"] .sem-name', 'Sem 2 (2026)');
    await t.ada('#cgNeed', /Isi PNGK sasaran/);
    // Sasaran 3.30 dengan 15 kredit: (3.3 x 25 - 31.32) / 15 = 3.41 -> gred A- (3.67) diperlukan, B+ (3.33) tidak cukup
    await t.isi('#cgTarget', '3.3'); await t.isi('#cgNext', '15');
    await t.ada('#cgNeed', re('PNG diperlukan semester depan', '3\\.41', 'purata gred A- untuk setiap kursus'));
    await t.isi('#cgTarget', '3.9'); await t.isi('#cgNext', '3');
    await t.ada('#cgNeed', /Sasaran 3\.90 tidak dapat dicapai dalam satu semester \(perlu PNG 6\.46\)/);
    await t.isi('#cgTarget', '1');
    await t.ada('#cgNeed', /kekal di atas 1\.00/);
    await t.isi('#cgTarget', '3.2'); await t.isi('#cgNext', '10');   // (3.2 x 20 - 31.32) / 10 = 3.27 -> B+
    await t.ada('#cgNeed', re('3\\.27', 'purata gred B\\+ untuk'));
    await muatSemula(t, page, 'pngk');
    await t.ada('#cgStats', re('3\\.13', '10', '2'));
    pasti(await nilai(page, '#cgSems .sem[data-si="1"] .sem-name') === 'Sem 2 (2026)' && await nilai(page, '#cgSems .course [data-f="k"]') === 'MAT101', 'Nama semester/kursus patut kekal');
    pasti(await nilai(page, '#cgTarget') === '3.2', 'PNGK sasaran patut kekal');
    // Buang kursus A daripada semester 1 -> 13.32 + 6 / 7 kredit = 2.76
    await tekan(page, '#cgSems .sem[data-si="0"] [data-delc="1"]');
    await t.ada('#cgStats', re('2\\.76', '7'));
    terima(page);
    await tekan(page, '#cgSems [data-delsem="1"]');
    await t.ada('#cgStats', re('3\\.33', 'PNGK', '4', '1', 'Semester'));
    // Semester tanpa kursus (lebar desktop)
    await page.setViewportSize({ width: 1280, height: 800 });
    await tekan(page, '#cgSems [data-delc="0"]');
    await t.ada('#cgSems .sem-gpa', /^–$/);
    await t.ada('#cgStats', re('–', 'PNGK', '0', 'Jumlah jam kredit'));
    await t.isi('#cgTarget', '3.5'); await t.isi('#cgNext', '15');
    await t.ada('#cgNeed', /Isi PNGK sasaran/);
  } },

  /* ---------- 12. Muka depan ---------- */
  { kumpulan: K, nama: 'Muka depan: pratonton, logo, HTML selamat, cetak (print distub), kekal', lebar: 1280, langkah: async (t, page) => {
    await alat(t, page, 'mukadepan');
    await t.ada('#cvPreview', re('NAMA UNIVERSITI', 'Tajuk tugasan'));
    await t.isi('#cvUni', 'Universiti Teknologi MARA'); await t.isi('#cvFac', 'Fakulti Perakaunan');
    await t.isi('#cvCode', 'FIN310'); await t.isi('#cvCourse', 'Pengurusan Pelaburan');
    await t.isi('#cvTitle', '<script>x</script> Analisis Portfolio');
    await t.isi('#cvStudents', 'Nur Aisyah binti Ahmad, 2023123456\nLim Wei Jie, 2023654321, Kumpulan B\n');
    await t.isi('#cvLect', 'Dr. Rahman'); await t.isi('#cvDate', '2026-11-03');
    await t.ada('#cvPreview .cv-uni', /^Universiti Teknologi MARA$/);
    await t.ada('#cvPreview .cv-course', /^FIN310 · Pengurusan Pelaburan$/);
    await t.ada('#cvPreview .cv-title', /^<script>x<\/script> Analisis Portfolio$/);
    pasti(!(await page.$('#cvPreview script')), 'Tag skrip dalam tajuk tidak patut menjadi elemen');
    const baris = await page.$$eval('#cvPreview .cv-students tr', l => l.map(r => [...r.cells].map(c => c.textContent).join('|')));
    pasti(baris.join(';') === 'Nama|No. matrik;Nur Aisyah binti Ahmad|2023123456;Lim Wei Jie|2023654321, Kumpulan B', 'Jadual pelajar salah: ' + baris.join(';'));
    await t.ada('#cvPreview .cv-meta', re('Pensyarah', 'Dr\\. Rahman', 'Tarikh hantar', '3 November 2026'));
    // Logo besar ditolak, logo kecil dipaparkan
    await page.setInputFiles('#cvLogo', { name: 'besar.png', mimeType: 'image/png', buffer: Buffer.alloc(1.6e6, 1) });
    await toastAda(t, /Logo terlalu besar/);
    await page.setInputFiles('#cvLogo', { name: 'logo.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForFunction(() => /^data:image\/png;base64,/.test(document.querySelector('#cvPreview img.cv-logo')?.src || ''), null, { timeout: 3000 });
    // Cetak: window.print distub supaya tiada dialog sebenar
    await page.evaluate(() => { window.__cetak = 0; window.print = () => { window.__cetak++; }; });
    await tekan(page, '#cvPrint');
    await page.waitForFunction(() => window.__cetak === 1, null, { timeout: 3000 });
    pasti(await kelas(page, 'body', 'printing'), 'Badan patut dalam mod cetak');
    await t.ada('#printArea .print-cover', re('Universiti Teknologi MARA', 'Analisis Portfolio', 'Nur Aisyah'));
    pasti(!!(await page.$('#printArea .print-cover img.cv-logo')), 'Logo patut ada dalam cetakan');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    pasti(!(await kelas(page, 'body', 'printing')), 'Mod cetak patut tamat selepas afterprint');
    await muatSemula(t, page, 'mukadepan');
    await t.ada('#cvPreview .cv-uni', /^Universiti Teknologi MARA$/);
    await t.ada('#cvPreview .cv-meta', /3 November 2026/);
    pasti(!!(await page.$('#cvPreview img.cv-logo')), 'Logo patut kekal selepas muat semula');
  } },

  { kumpulan: K, nama: 'Muka depan: storan lama dengan nilai input fail tidak merosakkan alat', storan: { bl_t_mukadepan: { cvUni: 'Universiti Malaya', cvTitle: 'Tugasan 2', cvLogo: 'C:\\fakepath\\logo.png' } }, langkah: async (t, page) => {
    await alat(t, page, 'mukadepan');
    await t.ada('#cvPreview .cv-uni', /^Universiti Malaya$/);
    await t.isi('#cvTitle', 'Tugasan 3');
    await t.ada('#cvPreview .cv-title', /^Tugasan 3$/);
    const simpan = await page.evaluate(() => JSON.parse(localStorage.getItem('bl_t_mukadepan')));
    pasti(!('cvLogo' in simpan), 'Nilai input fail tidak patut disimpan: ' + JSON.stringify(simpan));
  } },

  /* ---------- 13. Bandingkan draf ---------- */
  { kumpulan: K, nama: 'Draf: perkataan ditambah/dibuang, peratus sama, HTML selamat, teks di hadapan (desktop)', langkah: async (t, page) => {
    await alat(t, page, 'draf');
    await tekan(page, '#dfGo');
    await toastAda(t, /Tampal kedua-dua draf/);
    await t.isi('#dfA', 'Saya suka makan nasi lemak setiap pagi.');
    await t.isi('#dfB', 'Saya suka makan roti canai setiap pagi bersama kawan.');
    await tekan(page, '#dfGo');
    await t.tunggu('#dfOut:not(.hidden)', 3000);
    // 5 daripada 9 perkataan sama; +roti canai bersama kawan; -nasi lemak
    await t.ada('#dfStats', re('56%', 'Draf baharu yang sama', '\\+4', 'Perkataan ditambah', '−2', 'Perkataan dibuang'));
    const kata = async sel => (await page.$$eval(sel, l => l.map(x => x.textContent))).join(' ').split(/\s+/).filter(Boolean).sort().join(' ');
    const ins = await kata('#dfView ins'), del = await kata('#dfView del');
    pasti(ins === 'bersama canai kawan roti' && del === 'lemak nasi', `Tanda diff salah: ins=${ins} del=${del}`);
    await t.isi('#dfA', 'Baris satu.\n<b>tebal</b>');
    await t.isi('#dfB', 'Baris satu.\n<b>tebal</b> baharu');
    await tekan(page, '#dfGo');
    await t.ada('#dfStats', re('\\+1', '−0'));
    pasti(!(await page.$('#dfView b')) && (await page.$$('#dfView br')).length === 1, 'HTML dalam draf patut dipaparkan sebagai teks, baris baharu sebagai <br>');
    // Teks ditambah di hadapan tidak menandakan perkataan asal sebagai berubah (lebar desktop)
    await page.setViewportSize({ width: 1280, height: 800 });
    await t.isi('#dfA', 'Pelaburan emas selamat.');
    await t.isi('#dfB', 'Selamat? Pelaburan emas selamat.');
    await tekan(page, '#dfGo');
    // Hanya "Selamat?" ditambah; 3 daripada 4 perkataan sama, tiada yang dibuang
    await t.ada('#dfStats', re('75%', '\\+1', '−0'));
    const buang = await page.$$eval('#dfView del', l => l.map(x => x.textContent));
    pasti(!buang.length, 'Tiada perkataan patut ditanda dibuang, dapat: ' + buang.join('|'));
  } },

  /* ---------- 14. Sejarah semakan ---------- */
  { kumpulan: K, nama: 'Sejarah: senarai, banding dengan draf semasa, buka, buang', lebar: 1280,
    storan: { bl_history: [
      { t: Date.UTC(2026, 9, 1, 2), title: 'Draf pertama esei kewangan pelajar', words: 120, ai: 35, plag: 10, q: 80, text: 'Saya suka makan nasi lemak setiap pagi.' },
      { t: Date.UTC(2026, 8, 20, 2), title: 'Esei lama', words: 60, ai: 12, plag: null, q: 91, text: 'Teks esei lama untuk dibuka semula dalam penyemak.' }
    ] },
    langkah: async (t, page) => {
      await alat(t, page, 'sejarah');
      await t.ada('#hsList', re('Draf pertama esei kewangan pelajar…', '120 patah perkataan', 'AI 35%', 'Plagiat 10%', 'Bahasa 80%', 'Esei lama…', 'AI 12%', 'Bahasa 91%'));
      const chip = await page.$$eval('#hsList .pf-row:nth-child(2) .hs-chip', l => l.map(c => c.textContent));
      pasti(chip.join() === 'AI 12%,Bahasa 91%', 'Semakan tanpa plagiat tidak patut ada cip Plagiat: ' + chip);
      // Banding dengan draf semasa (teks dalam penyemak)
      await page.$eval('#paper', e => { e.value = 'Saya suka makan roti canai setiap pagi bersama kawan.'; });
      await tekan(page, '#hsList [data-hdiff="0"]');
      await t.tunggu('#tool-draf:not(.hidden) #dfOut:not(.hidden)', 3000);
      await t.ada('#toolTitle', /Bandingkan draf/);
      pasti(await nilai(page, '#dfA') === 'Saya suka makan nasi lemak setiap pagi.', 'Draf lama patut daripada sejarah');
      await t.ada('#dfStats', re('56%', '\\+4', '−2'));
      // Buka semula draf lama dalam penyemak
      await tekan(page, '#toolBack');
      await tekan(page, '#toolGrid [data-tool="sejarah"]');
      await tekan(page, '#hsList [data-hopen="1"]');
      await page.waitForFunction(() => location.hash === '#semak', null, { timeout: 3000 });
      await toastAda(t, /Draf dibuka/);
      pasti(await nilai(page, '#paper') === 'Teks esei lama untuk dibuka semula dalam penyemak.', 'Teks draf tidak dibuka dalam penyemak');
      // Buang
      await page.evaluate(() => { location.hash = '#premium'; });
      await t.tunggu('#tool-sejarah:not(.hidden)', 3000);
      await tekan(page, '#hsList [data-hdel="0"]');
      await page.waitForFunction(() => document.querySelectorAll('#hsList .pf-row').length === 1, null, { timeout: 3000 });
      const n = await page.evaluate(() => JSON.parse(localStorage.getItem('bl_history')).length);
      pasti(n === 1, 'Storan sejarah patut ada 1 rekod, dapat ' + n);
      await tekan(page, '#hsList [data-hdel="0"]');
      await t.ada('#hsList', /Belum ada semakan/);
    } },

  { kumpulan: K, nama: 'Sejarah + Laporan PDF: semakan sebenar direkod, laporan dicetak (print distub)', langkah: async (t, page) => {
    await t.buka('#semak');
    for (const id of ['#optWeb', '#optExpert', '#optRefs', '#optLT', '#optAudit']) if (await page.$(id)) await page.uncheck(id);
    await t.isi('#paper', KERTAS);
    await tekan(page, '#checkBtn');
    await t.tunggu('#results:not(.hidden)', 15000);
    await t.tunggu('#reportBtn:not(.hidden)', 3000);
    pasti(await kelas(page, '#reportBtn .lock', 'hidden'), 'Ikon kunci laporan patut tersembunyi untuk Premium');
    await page.evaluate(() => { window.__cetak = 0; window.print = () => { window.__cetak++; window.__tajukCetak = document.title; }; });
    const tajuk = await page.title();
    await tekan(page, '#reportBtn');
    await page.waitForFunction(() => window.__cetak === 1, null, { timeout: 3000 });
    pasti(await page.evaluate(() => window.__tajukCetak) === 'Laporan semakan - SiswaCap', 'Tajuk semasa cetak patut menamakan laporan');
    pasti(await kelas(page, 'body', 'printing'), 'Badan patut dalam mod cetak');
    await t.ada('#printArea', re('Laporan semakan kertas kerja', 'Anggaran AI', 'Kualiti bahasa', 'Isyarat tulisan AI', 'Cadangan pembetulan', 'Semakan sumber tidak dijalankan', 'Teks yang disemak', 'Pelaburan patuh Syariah semakin popular'));
    pasti(await page.title() === tajuk, `Tajuk dokumen patut dipulihkan kepada "${tajuk}" selepas cetak, dapat "${await page.title()}"`);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    pasti(!(await kelas(page, 'body', 'printing')), 'Mod cetak patut tamat');
    // Semakan direkod dalam sejarah
    await page.evaluate(() => { location.hash = '#premium'; });
    await tekan(page, '#toolGrid [data-tool="sejarah"]');
    await t.ada('#hsList', re('Pelaburan patuh Syariah semakin popular dalam kalangan pelajar universiti…', '\\d+ patah perkataan', 'AI \\d+%', 'Bahasa \\d+%'));
    pasti(!/Plagiat/.test(await t.teks('#hsList')), 'Semakan tanpa carian sumber tidak patut ada cip Plagiat');
  } },

  { kumpulan: K, nama: 'Laporan PDF dan sejarah terkunci tanpa Premium', premium: false, langkah: async (t, page) => {
    await t.buka('#semak');
    for (const id of ['#optWeb', '#optExpert', '#optRefs', '#optLT', '#optAudit']) if (await page.$(id)) await page.uncheck(id);
    await t.isi('#paper', KERTAS);
    await tekan(page, '#checkBtn');
    await t.tunggu('#results:not(.hidden)', 15000);
    await t.tunggu('#reportBtn:not(.hidden)', 3000);
    pasti(!(await kelas(page, '#reportBtn .lock', 'hidden')), 'Ikon kunci laporan patut dipaparkan tanpa Premium');
    await page.evaluate(() => { window.__cetak = 0; window.print = () => { window.__cetak++; }; });
    await tekan(page, '#reportBtn');
    await toastAda(t, /Premium memerlukan akaun|sebahagian daripada SiswaCap Premium/);
    await page.waitForFunction(() => location.hash === '#premium', null, { timeout: 3000 });
    pasti(await page.evaluate(() => window.__cetak) === 0, 'Laporan tidak patut dicetak tanpa Premium');
    pasti(await page.evaluate(() => localStorage.getItem('bl_history')) == null, 'Sejarah tidak patut direkod tanpa Premium');
  } },

  /* ---------- 15. Portfolio patuh Syariah ---------- */
  { kumpulan: K, nama: 'Syariah: status, peratus patuh, pembersihan dividen, haul Hijri, pautan zakat, kekal', lebar: 1280,
    storan: { bl_portfolio: [...PF, { type: 'stock', sym: 'TOPGLOV', qty: 2000, cost: 1, cur: 'MYR', price: 0.9 }] },
    langkah: async (t, page) => {
      await alat(t, page, 'syariah');
      // BTC 27,300 patuh (senarai MPS SC); MAYBANK 10,200 dan TOPGLOV 1,800 belum disaring; jumlah 39,300
      await t.ada('#sySummary', re('^69%', 'Nilai portfolio patuh Syariah', RM(12000), 'Tidak patuh atau belum disaring', RM(0), 'Dividen perlu dibersihkan'));
      await t.ada('#syTable', re('BTC', 'Kripto · ' + RM(27300), 'Patuh Syariah', 'senarai MPS SC', 'MAYBANK', 'Saham · ' + RM(10200), 'TOPGLOV'));
      await t.ada('#syWarn', re('Perlu perhatian', 'MAYBANK \\(belum disaring\\)', 'TOPGLOV \\(belum disaring\\)'));
      await t.pilih('[data-sy-st="stock:MAYBANK"]', 'patuh');
      await t.ada('#sySummary', re('^95%', RM(1800)));
      await t.pilih('[data-sy-st="stock:TOPGLOV"]', 'tidak');
      await t.ada('#syWarn', /^Perlu perhatian: TOPGLOV \(tidak patuh\)\.$/);
      // Pembersihan: MAYBANK 500 x 2% = 10; TOPGLOV 100 x 100% (asal tidak patuh) = 100
      await t.isi('[data-sy-div="stock:MAYBANK"]', '500'); await t.isi('[data-sy-nisbah="stock:MAYBANK"]', '2');
      await t.isi('[data-sy-div="stock:TOPGLOV"]', '100');
      await t.ada('[data-sy-out="stock:MAYBANK"]', new RegExp('^' + RM(10) + '$'));
      await t.ada('[data-sy-out="stock:TOPGLOV"]', new RegExp('^' + RM(100) + '$'));
      await t.ada('#sySummary', re('^95%', RM(110), 'Dividen perlu dibersihkan'));
      pasti(await page.$eval('[data-sy-nisbah="stock:TOPGLOV"]', i => i.placeholder) === '100', 'Peratus asal saham tidak patuh patut 100');
      // Haul: mula 1 Ramadan 1447H (18 Feb 2026) -> 1 Ramadan seterusnya
      await t.ada('#syHaul', /Pilih tarikh mula haul/);
      await page.uncheck('#syIngatHaul'); await page.uncheck('#syIngatSC');
      await t.isi('#syHaulIn', '2026-02-18');
      await page.dispatchEvent('#syHaulIn', 'change');
      const j = haulDijangka('2026-02-18');
      pasti(j && j.h.month === 9 && j.h.day === 1 && j.h.year >= 1448, 'Jangkaan haul ujian salah: ' + JSON.stringify(j && j.h));
      const hari = Math.ceil((j.t.getTime() - Date.now()) / 864e5), hStr = `${j.h.day} ${BULAN_H[j.h.month - 1]} ${j.h.year}H`;
      const gStr = new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'long', year: 'numeric' }).format(j.t);
      const baki = hari <= 1 ? '(hari ini|1 hari lagi)' : `(${hari - 1}|${hari}|${hari + 1}) hari lagi`;
      await t.ada('#syHaul', re('Haul seterusnya', rx(hStr), rx(gStr) + ', ' + baki, 'Anggaran zakat 2\\.5%', RM(982.5)));
      await muatSemula(t, page, 'syariah');
      await t.ada('#sySummary', re('^95%', RM(110)));
      pasti(await nilai(page, '#syHaulIn') === '2026-02-18' && !(await page.$eval('#syIngatHaul', c => c.checked)), 'Tetapan haul patut kekal');
      pasti(await nilai(page, '[data-sy-st="stock:TOPGLOV"]') === 'tidak', 'Status saham patut kekal');
      await t.ada('#syHaul', re(rx(hStr)));
      await tekan(page, '#syHaul [data-sy-zakat]');
      await t.tunggu('#tool-zakat:not(.hidden) .tool-body:not(.hidden)', 3000);
      await t.ada('#toolTitle', /^Zakat pelaburan$/);
    } },

  { kumpulan: K, nama: 'Syariah: portfolio kosong dan kripto tidak patuh', langkah: async (t, page) => {
    await alat(t, page, 'syariah');
    await t.ada('#syTable', /Portfolio anda masih kosong/);
    await tekan(page, '#syTable [data-sy-pf]');
    await t.tunggu('#tool-portfolio:not(.hidden) .tool-body:not(.hidden)', 3000);
    await t.isi('#pfSym', 'PEPE'); await t.isi('#pfQty', '1000000'); await t.isi('#pfCost', '0.00001');
    await tekan(page, '#pfForm button[type=submit]');
    await t.ada('#pfTable', /PEPE/);
    await tekan(page, '#toolBack');
    await tekan(page, '#toolGrid [data-tool="syariah"]');
    await t.ada('#syTable', re('PEPE', 'Tidak patuh', 'senarai MPS SC'));
    await t.ada('#syWarn', /PEPE \(tidak patuh\)/);
    pasti(!(await page.$('[data-sy-st="crypto:PEPE"]')), 'Status kripto tidak boleh dipilih sendiri');
    await t.isi('[data-sy-div="crypto:PEPE"]', '40');
    await t.ada('[data-sy-out="crypto:PEPE"]', new RegExp('^' + RM(40) + '$'));
  } }
];
