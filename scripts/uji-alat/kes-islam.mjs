/* SiswaCap: ujian hujung ke hujung kumpulan "Ibadah & Hidup".
   Waktu Solat (dan Takwim), Ibadah (Al-Quran, tasbih, kalendar, tukar tarikh, zakat, doa, Asmaul Husna, galeri, panduan,
   mod uzur, profil, tetapan), Fiqh dan Tanya AI (APA 7), Audit Halal, Studio Gambar AI dan Sihat.
   Masa pelayar ditetapkan (Sabtu, 10 Oktober 2026, 3:00 ptg waktu Malaysia) supaya kiraan detik dan tarikh Hijri tetap.
   Jalankan: NODE_PATH=$(npm root -g) node scripts/uji-alat/jalan.mjs islam   (UJI_UKUR=1 untuk masa setiap langkah) */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, panggilanAI } from './harness.mjs';
import { verify } from '../../worker-fiqh/src/app.js';

const K = 'Ibadah & Hidup';
const SEKARANG = '2026-10-10T15:00:00+08:00';

/* ---------- Pembantu masa (waktu Malaysia, UTC+8) ---------- */
const hFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'numeric', year: 'numeric' });
const hijriOf = (y, m, d) => {
  const p = Object.fromEntries(hFmt.formatToParts(new Date(Date.UTC(y, m - 1, d, 4))).filter(x => x.type !== 'literal').map(x => [x.type, parseInt(x.value, 10)]));
  return { y: p.year, m: p.month, d: p.day, iso: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` };
};
const HIJRI_M = ['Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'];
const hStr = h => `${h.d} ${HIJRI_M[h.m - 1]} ${h.y}H`;
// Format 12 jam gaya Malaysia seperti js/solat.js: 5:53 pg / 1:06 ptg / 7:20 mlm
const jam = mins => { const h = Math.floor(mins / 60) % 24, m = mins % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'pg' : h < 19 ? 'ptg' : 'mlm'}`; };
const minitKL = ts => Math.floor(((ts + 8 * 3600) % 86400) / 60);
const keMinit = s => { const m = String(s).trim().match(/^(\d+):(\d\d) (pg|ptg|mlm)$/); if (!m) throw new Error(`Masa tidak sah: "${s}"`); return (+m[1] % 12 + (m[3] === 'pg' ? 0 : 12)) * 60 + +m[2]; };
const kiraDetik = s => [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(v => String(v).padStart(2, '0')).join(':');

/* ---------- Data contoh api.waktusolat.app (bentuk v2: { zone, year, month, month_number, prayers }) ----------
   Waktu asas (minit selepas tengah malam) + ofset zon + hanyutan 30 saat sehari, seperti perubahan waktu sebenar. */
const MINIT = { imsak: 340, fajr: 350, syuruk: 425, dhuha: 450, dhuhr: 785, asr: 970, maghrib: 1145, isha: 1220 };
const OFF = { WLY01: 0, SGR01: 1, JHR02: -8 };
const BULAN_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const tsSolat = (zon, y, m, day, k) => Date.UTC(y, m - 1, day) / 1000 - 8 * 3600 + (MINIT[k] + (OFF[zon] || 0)) * 60 + (day - 1) * 30;
function bulanSolat(zon, y, m) {
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { zone: zon, year: y, month: BULAN_EN[m - 1], month_number: m, last_updated: null,
    prayers: Array.from({ length: n }, (_, i) => ({ day: i + 1, hijri: hijriOf(y, m, i + 1).iso, ...Object.fromEntries(Object.keys(MINIT).map(k => [k, tsSolat(zon, y, m, i + 1, k)])) })) };
}
const waktu = (k, zon, day) => jam(minitKL(tsSolat(zon, 2026, 10, day, k)));
const SENARAI = [['imsak', 'Imsak'], ['fajr', 'Subuh'], ['syuruk', 'Syuruk'], ['dhuha', 'Dhuha'], ['dhuhr', 'Zohor'], ['asr', 'Asar'], ['maghrib', 'Maghrib'], ['isha', 'Isyak']];

/* ---------- Aladhan (bandar luar negara): London, BST (+01:00) hingga 24 Oktober, GMT selepasnya ---------- */
function bulanAladhan(y, m) {
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate(), T = { Imsak: '05:30', Fajr: '05:40', Sunrise: '07:15', Dhuhr: '12:53', Asr: '15:40', Sunset: '18:24', Maghrib: '18:25', Isha: '19:55' };
  return { code: 200, status: 'OK', data: Array.from({ length: n }, (_, i) => {
    const day = String(i + 1).padStart(2, '0'), bst = m > 3 && m < 10 || (m === 10 && i + 1 < 25), z = bst ? '+01:00 (BST)' : '+00:00 (GMT)', h = hijriOf(y, m, i + 1);
    return { timings: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, `${y}-${String(m).padStart(2, '0')}-${day}T${v}:00${z}`])),
      date: { gregorian: { day, month: { number: m }, year: String(y) }, hijri: { day: String(h.d), month: { number: h.m }, year: String(h.y) } },
      meta: { latitude: 51.50853, longitude: -0.12574, timezone: 'Europe/London', method: { id: 3 } } };
  }) };
}

/* ---------- Al-Quran: api.alquran.cloud dan api.quran.com (sandaran) ---------- */
const AYAT = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6];
const NAMA = readFileSync(join(ROOT, 'js', 'quran-src.js'), 'utf8').match(/const NAMA = "([^"]+)"/)[1].split('|');
const MADANI = new Set([2, 3, 4, 5, 8, 9, 22, 24, 33, 47, 48, 49, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 99, 110]);
const AR_NAMA = { 1: 'سُورَةُ ٱلْفَاتِحَةِ', 2: 'سُورَةُ ٱلْبَقَرَةِ', 36: 'سُورَةُ يسٓ', 111: 'سُورَةُ ٱلْمَسَدِ', 112: 'سُورَةُ ٱلْإِخْلَاصِ', 113: 'سُورَةُ ٱلْفَلَقِ' };
const EN_TR = { 1: 'The Opening', 2: 'The Cow', 36: 'Yaseen', 112: 'Sincerity' };
const BASMALAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const TEKS = {
  1: [[BASMALAH, 'Dengan nama Allah, Yang Maha Pemurah, lagi Maha Mengasihani.'], ['ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', 'Segala puji tertentu bagi Allah, Tuhan yang memelihara dan mentadbirkan sekalian alam.'],
    ['ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', 'Yang Maha Pemurah, lagi Maha Mengasihani.'], ['مَٰلِكِ يَوْمِ ٱلدِّينِ', 'Yang Menguasai pemerintahan hari Pembalasan (hari Akhirat).'],
    ['إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', 'Engkaulah sahaja (Ya Allah) Yang Kami sembah, dan kepada Engkaulah sahaja kami memohon pertolongan.'], ['ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ', 'Tunjukilah kami jalan yang lurus.'],
    ['صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ', 'Iaitu jalan orang-orang yang Engkau telah kurniakan nikmat kepada mereka, bukan (jalan) orang-orang yang Engkau telah murkai, dan bukan pula (jalan) orang-orang yang sesat.']],
  // alquran.cloud menulis Bismillah dalam ayat 1 setiap surah (kecuali Al-Fatihah dan At-Taubah); app perlu memisahkannya
  112: [[`${BASMALAH} قُلْ هُوَ ٱللَّهُ أَحَدٌ`, 'Katakanlah (wahai Muhammad): "(Tuhanku) ialah Allah Yang Maha Esa;'], ['ٱللَّهُ ٱلصَّمَدُ', '"Allah Yang menjadi tumpuan sekalian makhluk untuk memohon sebarang hajat;'],
    ['لَمْ يَلِدْ وَلَمْ يُولَدْ', '"Ia tiada beranak, dan Ia pula tidak diperanakkan;'], ['وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ', '"Dan tidak ada sesiapapun yang serupa denganNya".']]
};
const MULA = AYAT.reduce((a, n, i) => (a.push(a[i] + n), a), [0]);   // nombor global ayat pertama setiap surah - 1
const ayatSurah = n => (TEKS[n] || Array.from({ length: AYAT[n - 1] }, (_, i) => [`آية ${i + 1}`, `Terjemahan ayat ${i + 1} surah ${n}.`]));
const metaSurah = n => ({ number: n, name: AR_NAMA[n] || `سُورَةُ ${n}`, englishName: NAMA[n - 1], englishNameTranslation: EN_TR[n] || 'Surah', numberOfAyahs: AYAT[n - 1], revelationType: MADANI.has(n) ? 'Medinan' : 'Meccan' });
const AYAT_RUJUK = { '2:275': ['ٱلَّذِينَ يَأْكُلُونَ ٱلرِّبَوٰا۟ لَا يَقُومُونَ إِلَّا كَمَا يَقُومُ ٱلَّذِى يَتَخَبَّطُهُ ٱلشَّيْطَٰنُ مِنَ ٱلْمَسِّ', 'Orang-orang yang memakan (mengambil) riba itu tidak dapat berdiri betul melainkan seperti berdirinya orang yang dirasuk Syaitan dengan terhuyung-hayang kerana sentuhan (Syaitan) itu.'] };
const CARIAN = {
  riba: [[2, 275, 'Orang-orang yang memakan (mengambil) riba itu tidak dapat berdiri betul melainkan seperti berdirinya orang yang dirasuk Syaitan.'], [2, 276, 'Allah susutkan (kebaikan harta yang dijalankan dengan mengambil) riba dan Ia pula mengembangkan (berkat harta yang dikeluarkan) sedekah-sedekah.'], [3, 130, 'Wahai orang-orang yang beriman, janganlah kamu makan atau mengambil riba dengan berlipat-lipat ganda.']],
  judi: [[2, 219, 'Mereka bertanya kepadamu (Wahai Muhammad) mengenai arak dan judi.'], [5, 90, 'Wahai orang-orang yang beriman! Bahawa sesungguhnya arak, dan judi, dan pemujaan berhala, dan mengundi nasib dengan batang-batang anak panah, adalah (semuanya) kotor (keji) dari perbuatan Syaitan.']]
};
const aq = data => ({ code: 200, status: 'OK', data });
const tiada404 = () => new Response(JSON.stringify({ code: 404, status: 'Not Found', data: 'Tiada padanan' }), { status: 404, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });

/* ---------- Hadis: hadith-api (data sunnah.com) di jsDelivr ---------- */
const HADIS = { 'ara-4093': 'حَدَّثَنَا مُحَمَّدُ بْنُ الصَّبَّاحِ، وَزُهَيْرُ بْنُ حَرْبٍ، عَنْ جَابِرٍ، قَالَ لَعَنَ رَسُولُ اللَّهِ صلى الله عليه وسلم آكِلَ الرِّبَا وَمُؤْكِلَهُ وَكَاتِبَهُ وَشَاهِدَيْهِ وَقَالَ هُمْ سَوَاءٌ',
  'eng-4093': "Jabir said that Allah's Messenger (ﷺ) cursed the accepter of interest and its payer, and one who records it, and the two witnesses, and he said: They are all equal." };

/* ---------- Gambar PNG kecil untuk ujian muat naik (Sihat) ---------- */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNQTX6NFTEMLQkADGRcwcht3uAAAAAASUVORK5CYII=', 'base64');

/* ---------- Data contoh API luar untuk kumpulan ini ---------- */
export const fixture = [
  [/^https:\/\/api\.waktusolat\.app\/v2\/solat\/([A-Z]{3}\d{2})\?year=(\d{4})&month=(\d{1,2})/, u => { const [, z, y, m] = u.match(/solat\/(\w+)\?year=(\d+)&month=(\d+)/); return bulanSolat(z, +y, +m); }],
  // Lokasi -> zon JAKIM: di Malaysia sahaja; di luar Malaysia pelayan memulangkan 404
  [/^https:\/\/api\.waktusolat\.app\/zones\/-?[\d.]+\/-?[\d.]+/, u => { const [lat, lon] = u.split('/zones/')[1].split('/').map(Number);
    return lat > 0.8 && lat < 7.5 && lon > 99 && lon < 119.5 ? { zone: lat < 2 ? 'JHR02' : 'WLY01', state: lat < 2 ? 'JHR' : 'WLY', district: lat < 2 ? 'Johor Bahru' : 'Kuala Lumpur' }
      : new Response(JSON.stringify({ error: 'Lokasi di luar Malaysia' }), { status: 404, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }); }],
  [/^https:\/\/api\.aladhan\.com\/v1\/calendar\/\d{4}\/\d{1,2}\?/, u => { const [, y, m] = u.match(/calendar\/(\d+)\/(\d+)/); return bulanAladhan(+y, +m); }],
  [/^https:\/\/geocoding-api\.open-meteo\.com\/v1\/search\?/, u => {
    const q = new URL(u).searchParams.get('name').toLowerCase();
    if (q === 'london') return { results: [{ id: 2643743, name: 'London', latitude: 51.50853, longitude: -0.12574, country_code: 'GB', country: 'United Kingdom', admin1: 'England', timezone: 'Europe/London' }] };
    if (q === 'shah alam') return { results: [{ id: 1732903, name: 'Shah Alam', latitude: 3.0851, longitude: 101.5328, country_code: 'MY', country: 'Malaysia', admin1: 'Selangor', timezone: 'Asia/Kuala_Lumpur' }] };
    return { generationtime_ms: 0.4 };
  }],
  [/^https:\/\/api\.bigdatacloud\.net\/data\/reverse-geocode-client\?/, () => ({ city: 'London', locality: 'London', countryName: 'United Kingdom' })],
  [/^https:\/\/api\.alquran\.cloud\/v1\/surah$/, () => aq(Array.from({ length: 114 }, (_, i) => metaSurah(i + 1)))],
  [/^https:\/\/api\.alquran\.cloud\/v1\/surah\/\d+\/editions\/quran-uthmani,ms\.basmeih$/, u => {
    const n = +u.match(/surah\/(\d+)/)[1], A = ayatSurah(n), ed = j => ({ ...metaSurah(n), ayahs: A.map((x, i) => ({ number: MULA[n - 1] + i + 1, text: x[j], numberInSurah: i + 1, juz: 1, page: 1 })) });
    return aq([ed(0), ed(1)]);
  }],
  [/^https:\/\/api\.alquran\.cloud\/v1\/ayah\/\d+:\d+\/editions\//, u => {
    const ref = u.match(/ayah\/(\d+:\d+)/)[1], [s, a] = ref.split(':').map(Number), [ar, ms] = AYAT_RUJUK[ref] || [`آية ${a}`, `Terjemahan ayat ${ref}.`];
    const surah = { number: s, name: AR_NAMA[s] || '', englishName: NAMA[s - 1] };
    return aq([{ number: MULA[s - 1] + a, text: ar, surah, numberInSurah: a }, { number: MULA[s - 1] + a, text: ms, surah, numberInSurah: a }]);
  }],
  [/^https:\/\/api\.alquran\.cloud\/v1\/search\/[^/]+\/all\/ms\.basmeih$/, u => {
    const w = decodeURIComponent(u.match(/search\/([^/]+)\//)[1]).toLowerCase(), m = CARIAN[w];
    return m ? aq({ count: m.length, matches: m.map(([s, a, text]) => ({ number: MULA[s - 1] + a, text, surah: { number: s, englishName: NAMA[s - 1] }, numberInSurah: a })) }) : tiada404();
  }],
  [/^https:\/\/api\.quran\.com\/api\/v4\/chapters\?/, () => ({ chapters: Array.from({ length: 114 }, (_, i) => ({ id: i + 1, revelation_place: MADANI.has(i + 1) ? 'madinah' : 'makkah', name_simple: NAMA[i].replace(/'/g, ''), name_arabic: (AR_NAMA[i + 1] || '').replace(/^سُورَةُ\s*/, ''), verses_count: AYAT[i], translated_name: { language_name: 'malay', name: EN_TR[i + 1] || 'Surah' } })) })],
  [/^https:\/\/api\.quran\.com\/api\/v4\/verses\/by_chapter\/\d+\?/, u => {
    const n = +u.match(/by_chapter\/(\d+)/)[1], A = ayatSurah(n);
    // Quran.com: teks tanpa Bismillah dalam ayat 1, terjemahan dengan nota kaki <sup>
    return { verses: A.map((x, i) => ({ id: MULA[n - 1] + i + 1, verse_number: i + 1, verse_key: `${n}:${i + 1}`, text_uthmani: x[0].replace(n === 1 ? /^$/ : BASMALAH + ' ', ''), translations: [{ resource_id: 39, text: `${x[1]}<sup foot_note=${i + 1}>${i + 1}</sup>` }] })),
      pagination: { per_page: 50, current_page: 1, next_page: null, total_pages: 1, total_records: A.length } };
  }],
  [/^https:\/\/cdn\.jsdelivr\.net\/gh\/fawazahmed0\/hadith-api@1\/editions\/(ara|eng)-\w+\/\d+\.json$/, u => {
    const [, b, i] = u.match(/editions\/(ara|eng)-\w+\/(\d+)\.json/);
    return { metadata: { name: 'Sahih Muslim' }, hadiths: [{ hadithnumber: +i, text: HADIS[`${b}-${i}`] || (b === 'ara' ? 'حَدَّثَنَا' : 'Narrated.'), grades: [], reference: { book: 22, hadith: 133 } }] };
  }]
];

/* ---------- Pembantu langkah ---------- */
// Navigasi dalam halaman yang sudah dibuka: tukar hash seperti pautan biasa
const lompat = (page, hash) => page.evaluate(h => { location.hash = h; }, hash);
const masa = (page, iso = SEKARANG) => page.clock.setFixedTime(new Date(iso));
// Audio azan/bacaan tidak dibunyikan: setiap main() dibisukan dahulu
const senyap = page => page.addInitScript(() => { const p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { this.muted = true; return p.call(this); }; });
async function tiadaLimpahan(page) {
  const [w, v] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  if (w > v + 1) throw new Error(`Limpahan mendatar: lebar kandungan ${w}px melebihi skrin ${v}px`);
}
const sama = (sebenar, jangka, apa) => { if (JSON.stringify(sebenar) !== JSON.stringify(jangka)) throw new Error(`${apa}: dijangka ${JSON.stringify(jangka)}, dapat ${JSON.stringify(sebenar)}`); };
const pastikan = (syarat, mesej) => { if (!syarat) throw new Error(mesej); };
const papan = page => page.evaluate(() => navigator.clipboard.readText());
// Klik butang salin dan pulangkan teks yang disalin (papan klip dikosongkan dahulu supaya teks lama tidak dibaca)
async function salin(page, sel) {
  await page.evaluate(() => navigator.clipboard.writeText(''));
  await page.click(sel, { timeout: 8000 });
  for (let i = 0; i < 40; i++) { const s = await papan(page); if (s) return s; await page.waitForTimeout(50); }
  throw new Error(`Tiada teks disalin oleh ${sel}`);
}
const storan = (page, k) => page.evaluate(k => { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); }, k);
const terima = page => page.on('dialog', d => d.accept());
const blok = (page, re, status = 503) => page.route(re, r => r.fulfill({ status, contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' }, body: 'luar talian (ujian)' }));
const baris = page => page.$$eval('#todayGrid li', ls => ls.map(l => ({ n: l.querySelector('.pr-name').firstChild.textContent, t: l.querySelector('.pr-time').textContent, c: l.className.replace(/\s+/g, ' ').trim() })));
const muatTurun = async (page, sel) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.click(sel)]); return d; };
const hariIniKL = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(SEKARANG));

/* ---------- Jawapan Tanya AI yang bersumber, disahkan oleh verify() pelayan sebenar ----------
   Model AI palsu harness tidak dapat memilih sumber, jadi jawapan ini dibina daripada id korpus, muka surat dokumen
   rasmi, kitab dan artikel Mufti yang sama bentuknya dengan hasil carian rujukan, lalu disemak dengan verify(). */
const TEKS_JAKIM = 'Muzakarah Jawatankuasa Fatwa Majlis Kebangsaan Bagi Hal Ehwal Ugama Islam Malaysia Kali Ke-98 yang bersidang pada 13 hingga 15 Februari 2012 telah membincangkan Hukum Forex Oleh Individu Secara Lani Melalui Platform Elektronik. Muzakarah memutuskan bahawa perdagangan pertukaran mata wang asing oleh individu secara lani melalui platform elektronik adalah haram kerana bercanggah dengan prinsip syarak.';
const TEKS_MINHAJ = 'كتاب البيع. وإنما يصح بيع الربوي بجنسه بشرط المماثلة والحلول والتقابض قبل التفرق. [الجزء: 1 ¦ الصفحة: 142]';
const TEKS_FATH = 'فصل في الربا. والربا حرام وإنما يكون في الذهب والفضة والمطعومات ولا يجوز بيع الذهب بالذهب إلا متماثلا نقدا.';
const TEKS_MUFTI = 'Jabatan Mufti Negeri Selangor menjelaskan bahawa urus niaga forex secara individu melalui platform dalam talian tidak dibenarkan kerana mengandungi unsur riba dan gharar yang jelas.';
const CETAK = { minhaj: { penerbit: 'Dar al-Minhaj', edisi: '1', fail: ['https://archive.org/download/minhaj-talibin/minhaj.pdf'], peta: { 113: [0, 120] },
  paparan: [{ gambar: 'https://archive.org/download/minhaj-talibin/page/n{n}.jpg', lihat: 'https://archive.org/details/minhaj-talibin/page/n{n}', off: 0 }] } };
function jawapanBersumber() {
  const docs = [
    { id: 'pdf:jakim:57', k: 'jakim', n: 57, skor: 9.1, teks: TEKS_JAKIM, gambar: '/halaman/jakim/57.jpg' },
    { id: 'mufti:selangor:12', k: 'selangor', n: 12, skor: 7.4, teks: TEKS_MUFTI, url: 'https://www.muftiselangor.gov.my/fatwa/hukum-forex-individu', tajuk: 'Hukum Forex Secara Individu', tarikh: '2023-05-10' },
    { id: 'kitab:minhaj:113', k: 'minhaj', n: 113, skor: 5.2, teks: TEKS_MINHAJ, cetak: { penerbit: 'Dar al-Minhaj', edisi: '1' } },
    { id: 'kitab:fathqarib:150', k: 'fathqarib', n: 150, skor: 4.8, teks: TEKS_FATH, cetak: null }
  ];
  const ans = { status: 'jawab', ringkasan: 'Trading forex secara individu melalui platform elektronik adalah haram menurut Muzakarah Fatwa Kebangsaan.',
    huraian: ['Muzakarah Jawatankuasa Fatwa Kebangsaan memutuskan perdagangan mata wang asing oleh individu secara lani adalah haram.', 'Jabatan Mufti Negeri Selangor menyatakan unsur riba dan gharar dalam urus niaga ini.'],
    khilaf: 'Sebahagian ulama kontemporari membenarkan pertukaran mata wang yang diserah terima serta-merta tanpa leverage.', nasihat: 'Rujuk Jabatan Mufti negeri anda untuk kes khusus.',
    sumber: [
      { id: 'quran:2:275', untuk: 'Pengharaman riba' },
      { id: 'hadis:m1598', petikan: 'Rasulullah SAW melaknat pemakan riba, pemberinya, penulisnya dan dua saksinya.' },
      { id: 'fatwa:mkiForex', petikan: 'riba melalui pengenaan rollover interest' },
      { id: 'pdf:jakim:57', petikan: 'perdagangan pertukaran mata wang asing oleh individu secara lani melalui platform elektronik adalah haram' },
      { id: 'kitab:minhaj:113', petikan: 'يصح بيع الربوي بجنسه بشرط المماثلة', maksud: 'Jual beli barang ribawi dengan jenisnya sah dengan syarat sama banyak.' },
      { id: 'kitab:fathqarib:150', petikan: 'والربا حرام وإنما يكون في الذهب والفضة والمطعومات', maksud: 'Riba itu haram, dan ia berlaku pada emas, perak dan makanan.' },
      { id: 'mufti:selangor:12', petikan: 'mengandungi unsur riba dan gharar yang jelas' },
      { id: 'masalah:muamalat/riba' },
      { id: 'quran:2:999' },                                            // ayat tidak wujud: mesti dibuang
      { url: 'https://contoh.com/fatwa-palsu', petikan: 'teks palsu' }  // domain tidak dibenarkan: mesti dibuang
    ] };
  return verify(ans, new Map(), docs, CETAK);
}
// Jawapan /tanya digantikan pada halaman ini sahaja; OPTIONS (preflight) diteruskan ke pelayan dalam proses
const tanyaPalsu = (page, fn) => page.route('https://fiqh.bijaklabur.my/tanya', r => r.request().method() === 'POST' ? fn(r) : r.fallback());
const json = (r, status, data) => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });

const KES = [
  /* ====================== Waktu Solat ====================== */
  { kumpulan: K, nama: 'Waktu Solat: jadual WLY01 daripada API, Asar seterusnya dan kiraan detik', langkah: async (t, page) => {
    await masa(page); await senyap(page);
    const minta = []; page.on('request', r => { if (/api\.waktusolat\.app\/v2\//.test(r.url())) minta.push(r.url()); });
    await t.buka('#solat');
    const asar = waktu('asr', 'WLY01', 10);
    await t.ada('#nextName', new RegExp(`^Asar pada ${asar} · lagi$`));
    await t.ada('#countdown', new RegExp(`^${kiraDetik(tsSolat('WLY01', 2026, 10, 10, 'asr') - Date.parse(SEKARANG) / 1000)}$`));
    await t.ada('#zoneName', /^Kuala Lumpur, Putrajaya, Wilayah Persekutuan$/);
    await t.ada('#solatDate', new RegExp(`^Sabtu, 10 Oktober 2026 · ${hStr(hijriOf(2026, 10, 10))}$`));
    // Lapan waktu: waktu lepas, Asar "seterusnya", Maghrib dan Isyak belum
    const r = await baris(page);
    sama(r.map(x => x.n), SENARAI.map(x => x[1]), 'Nama waktu');
    sama(r.map(x => x.t), SENARAI.map(([k]) => waktu(k, 'WLY01', 10)), 'Masa setiap waktu');
    sama(r.map(x => /\bnext\b/.test(x.c) ? 'next' : /\bpast\b/.test(x.c) ? 'past' : ''), ['past', 'past', 'past', 'past', 'past', 'next', '', ''], 'Keadaan setiap waktu');
    // Jadual bulanan dan jalur 7 hari (bulan depan dimuat lebih awal untuk hujung bulan)
    await t.ada('#monthTitle', /^Jadual Oktober 2026$/);
    sama(await page.$$eval('#monthTable tbody tr', rs => [rs.length, rs.findIndex(x => x.classList.contains('today'))]), [31, 9], 'Baris jadual bulanan dan hari ini');
    sama(await page.$$eval('#dayStrip button', bs => bs.map(b => b.disabled)), Array(7).fill(false), 'Jalur 7 hari');
    await t.rehat(300);
    pastikan(minta.some(u => /WLY01\?year=2026&month=10$/.test(u)) && minta.some(u => /WLY01\?year=2026&month=11$/.test(u)), `Permintaan API: ${minta.join(', ')}`);
    pastikan((await storan(page, 'bl_solat_WLY01_2026_10'))?.prayers?.length === 31, 'Jadual bulan tidak disimpan untuk luar talian');
    // Kiblat untuk Kuala Lumpur
    await t.ada('#qiblaDeg', /^293° dari utara$/);
    await tiadaLimpahan(page);
    // Kad halaman utama dan Takwim Siswa
    await lompat(page, '#utama');
    await t.ada('#homeNextName', /^Asar$/); await t.ada('#homeNextTime', new RegExp(`^${asar}$`));
    await t.ada('#homeZone', /^Kuala Lumpur$/); await t.ada('#homeCount', /^01:14:30$/);
    await t.ada('#tkSolat', new RegExp(`^Asar ${asar}$`));
    await t.ada('#tkHari', /^10$/); await t.ada('#tkBulan', /^Sabtu$/); await t.ada('#tkEdisi', /^Edisi 283 · 2026$/);
    pastikan(!(await page.$('.tk-date.jumaat')), 'Sabtu ditanda sebagai Jumaat');
  } },

  { kumpulan: K, nama: 'Waktu Solat: tukar zon ke SGR01, pilih hari esok dan cache luar talian selepas muat semula', langkah: async (t, page) => {
    await masa(page); await senyap(page);
    await t.buka('#solat');
    await t.ada('#nextName', /^Asar pada/);
    await t.pilih('#zoneSel', 'SGR01');
    await t.ada('#nextName', new RegExp(`^Asar pada ${waktu('asr', 'SGR01', 10)} · lagi$`));
    await t.ada('#zoneName', /^Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam, Selangor$/);
    await t.ada('#zoneShort', /^Gombak$/);
    sama(await storan(page, 'bl_zone'), 'SGR01', 'Zon disimpan');
    // Hari esok pada jalur hari: tarikh dan waktu esok, tanpa keadaan "seterusnya"
    await t.klik('#dayStrip [data-o="1"]');
    await t.ada('#solatDate', new RegExp(`^Ahad, 11 Oktober 2026 · ${hStr(hijriOf(2026, 10, 11))}$`));
    const r = await baris(page);
    sama(r.map(x => x.t), SENARAI.map(([k]) => waktu(k, 'SGR01', 11)), 'Waktu esok');
    pastikan(r.every(x => !/\b(next|past)\b/.test(x.c)), 'Hari lain tidak sepatutnya ada keadaan lepas/seterusnya');
    // Muat semula: zon kekal dan jadual dibaca daripada storan peranti tanpa memanggil API untuk bulan ini
    const minta = []; page.on('request', q => { if (/waktusolat\.app\/v2\/solat\/SGR01\?year=2026&month=10/.test(q.url())) minta.push(q.url()); });
    await page.reload();
    await t.ada('#nextName', new RegExp(`^Asar pada ${waktu('asr', 'SGR01', 10)}`));
    sama(minta.length, 0, 'Permintaan API selepas muat semula (sepatutnya daripada cache)');
  } },

  { kumpulan: K, nama: 'Waktu Solat: selepas Isyak memaparkan Subuh esok; rekod lima waktu dan rantaian hari', lebar: 1280,
    storan: { bl_rekod: { '2026-10-08': ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'], '2026-10-09': ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] } },
    langkah: async (t, page) => {
      await masa(page, '2026-10-10T21:00:00+08:00'); await senyap(page);
      await t.buka('#solat');
      const subuh = waktu('fajr', 'WLY01', 11);
      await t.ada('#nextName', new RegExp(`^Subuh pada ${subuh} esok · lagi$`));
      await t.ada('#countdown', new RegExp(`^${kiraDetik(tsSolat('WLY01', 2026, 10, 11, 'fajr') - Date.parse('2026-10-10T21:00:00+08:00') / 1000)}$`));
      const r = await baris(page);
      sama(r.map(x => x.t), SENARAI.map(([k]) => waktu(k, 'WLY01', 11)), 'Senarai memaparkan waktu esok');
      pastikan(/\bnext\b/.test(r[1].c), 'Subuh esok sepatutnya ditanda seterusnya');
      // Rekod: dua hari lepas lengkap, tandakan lima waktu hari ini
      await t.ada('#streak .num', /^2$/);
      for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) await t.klik(`.track-btn[data-k="${k}"]`);
      await t.ada('#trackerSub', /^Alhamdulillah, lima waktu lengkap hari ini\.$/);
      await t.ada('#streak .num', /^3$/);
      // Batal satu tanda
      await t.klik('.track-btn[data-k="isha"]');
      await t.ada('#trackerSub', /^4 daripada 5 waktu ditanda/);
      await t.ada('#streak .num', /^2$/);
      sama((await storan(page, 'bl_rekod'))['2026-10-10'], ['fajr', 'dhuhr', 'asr', 'maghrib'], 'Rekod hari ini disimpan');
      await lompat(page, '#utama');
      await t.ada('#homeNextTime', new RegExp(`^${subuh}, esok$`));
    } },

  { kumpulan: K, nama: 'Waktu Solat: API 503 menggunakan data rasmi terbina dalam laman', langkah: async (t, page) => {
    await masa(page); await senyap(page);
    await blok(page, /api\.waktusolat\.app/);
    await t.buka('#solat');
    await t.ada('#nextName', /^Asar pada/);
    const d = JSON.parse(readFileSync(join(ROOT, 'data', 'solat', 'WLY01-2026-10.json'), 'utf8')).prayers[9];
    sama((await baris(page)).map(x => x.t), SENARAI.map(([k]) => jam(minitKL(d[k]))), 'Waktu daripada data terbina');
    await t.ada('#zoneName', /^Kuala Lumpur, Putrajaya, Wilayah Persekutuan$/);
  } },

  { kumpulan: K, nama: 'Waktu Solat: tiada API dan tiada data terbina, waktu anggaran adhan-js (beza 3 minit atau kurang)', langkah: async (t, page) => {
    await masa(page); await senyap(page);
    await blok(page, /api\.waktusolat\.app/);
    await blok(page, /\/data\/solat\/WLY01-2026-1\d\.json$/, 404);
    await t.buka('#solat');
    await t.ada('#zoneName', /waktu anggaran luar talian$/);
    await t.ada('#nextName', /^Asar pada .* · lagi$/);
    const rasmi = JSON.parse(readFileSync(join(ROOT, 'data', 'solat', 'WLY01-2026-10.json'), 'utf8')).prayers[9];
    const r = await baris(page), beza = SENARAI.map(([k], i) => [k, keMinit(r[i].t) - minitKL(rasmi[k])]);
    pastikan(beza.every(([, b]) => Math.abs(b) <= 3), `Anggaran berbeza lebih 3 minit daripada JAKIM: ${JSON.stringify(beza)}`);
    // Anggaran tidak disimpan supaya data rasmi menggantikannya kemudian
    sama(await storan(page, 'bl_solat_WLY01_2026_10'), null, 'Anggaran disimpan dalam storan');
    sama(await page.$$eval('#monthTable tbody tr', x => x.length), 31, 'Jadual bulanan anggaran');
  } },

  { kumpulan: K, nama: 'Waktu Solat: bandar luar negara tanpa sambungan memaparkan mesej, bukan ralat',
    storan: { bl_zone: '"GL"', bl_solatCity: { name: 'London', country: 'United Kingdom', lat: 51.50853, lon: -0.12574, tz: 'Europe/London' } },
    langkah: async (t, page) => {
      await masa(page); await senyap(page);
      await blok(page, /api\.aladhan\.com/);
      await t.buka('#solat');
      await t.ada('#nextName', /^Waktu solat tidak dapat dimuatkan$/);
      await t.ada('#countdown', /^--:--:--$/);
      await t.ada('#homeNextName', /^Tiada sambungan$/);
    } },

  { kumpulan: K, nama: 'Waktu Solat: cari bandar London (Open-Meteo + Aladhan) dalam zon waktu Eropah', lebar: 1280, langkah: async (t, page) => {
    await masa(page); await senyap(page);
    await t.buka('#solat');
    await t.ada('#nextName', /^Asar pada/);
    // Bandar Malaysia ditolak dan dirujuk kepada zon rasmi
    await t.pilih('#zoneSel', '__dunia');
    await t.tunggu('.city-dlg[open]');
    await t.isi('#cityQ', 'Shah Alam'); await t.klik('#cityForm button[type=submit]');
    await t.klik('#cityList [data-i="0"]');
    await t.ada('.toast', /^Untuk Malaysia, pilih zon rasmi/);
    sama(await page.$eval('#zoneSel', s => s.value), 'WLY01', 'Zon kekal selepas bandar Malaysia ditolak');
    // Carian tanpa hasil
    await t.pilih('#zoneSel', '__dunia');
    await t.isi('#cityQ', 'Xyzzyq'); await t.klik('#cityForm button[type=submit]');
    await t.ada('#cityList', /Tiada bandar dijumpai/);
    // London
    await t.isi('#cityQ', 'London'); await t.klik('#cityForm button[type=submit]');
    await t.ada('#cityList', /London.*England, United Kingdom/);
    await t.klik('#cityList [data-i="0"]');
    await t.ada('.toast', /^Waktu solat untuk London$/);
    await t.ada('#zoneName', /^London, United Kingdom$/);
    // 3:00 ptg di Malaysia = 8:00 pagi di London (BST); Zohor 12:53 tengah hari
    await t.ada('#nextName', /^Zohor pada 12:53 ptg · lagi$/);
    await t.ada('#countdown', /^04:53:00$/);
    sama((await baris(page)).map(x => x.t), ['5:30 pg', '5:40 pg', '7:15 pg', '7:40 pg', '12:53 ptg', '3:40 ptg', '6:25 ptg', '7:55 mlm'], 'Waktu London');
    sama(await page.$eval('#zoneSel', s => s.value), 'GL', 'Zon GL dipilih');
    await t.ada('#solatDate', /^Sabtu, 10 Oktober 2026/);
  } },

  { kumpulan: K, nama: 'Waktu Solat: Lokasi saya menetapkan zon JHR02 dan kiblat ikut lokasi', langkah: async (t, page) => {
    await masa(page); await senyap(page);
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 1.4927, longitude: 103.7414 });
    await t.buka('#solat');
    await t.ada('#nextName', /^Asar pada/);
    await t.klik('#gpsBtn');
    await t.ada('.toast', /^Zon ditetapkan: Johor Bahru$/);
    await t.ada('#zoneName', /^Johor Bahru, Kota Tinggi, Mersing, Kulai, Johor$/);
    await t.ada('#nextName', new RegExp(`^Asar pada ${waktu('asr', 'JHR02', 10)} · lagi$`));
    await t.klik('#qiblaBtn');
    await t.ada('#qiblaSub', /^Kaabah 7,255 km dari lokasi anda\./);
    await t.ada('#qiblaDeg', /^293° dari utara$/);
  } },

  { kumpulan: K, nama: 'Waktu Solat: Lokasi saya di luar Malaysia (London) dengan zon waktu daripada Aladhan', langkah: async (t, page) => {
    await masa(page); await senyap(page);
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 51.50853, longitude: -0.12574 });
    await t.buka('#solat');
    await t.ada('#nextName', /^Asar pada/);
    await t.klik('#gpsBtn');
    await t.ada('#zoneName', /^London, United Kingdom$/);
    await t.ada('.toast', /^Waktu solat untuk London$/);
    await t.ada('#nextName', /^Zohor pada 12:53 ptg · lagi$/);
    // Zon waktu peranti (Asia/Kuala_Lumpur) dibetulkan kepada zon waktu bandar daripada Aladhan
    sama((await storan(page, 'bl_solatCity')).tz, 'Europe/London', 'Zon waktu bandar');
  } },

  { kumpulan: K, nama: 'Waktu Solat: azan apabila masuk Asar, loceng setiap waktu, suis azan dan peringatan', langkah: async (t, page) => {
    // 20 saat selepas masuk waktu Asar
    await masa(page, new Date((tsSolat('WLY01', 2026, 10, 10, 'asr') + 20) * 1000).toISOString()); await senyap(page);
    await page.context().grantPermissions(['notifications']);
    await t.buka('#solat');
    await t.ada('#azanBarText', /^Azan Asar · Kuala Lumpur/);
    pastikan(await page.$eval('#azanBar', e => !e.classList.contains('hidden')), 'Bar azan tidak dipaparkan');
    pastikan(Object.keys(await storan(page, 'bl_notified')).includes(`WLY01_${tsSolat('WLY01', 2026, 10, 10, 'asr')}`), 'Azan tidak direkod sebagai sudah dimainkan');
    await t.ada('#azanStop', /^Hentikan$/);
    await t.klik('#azanStop');
    await page.waitForFunction(() => document.querySelector('#azanBar').classList.contains('hidden'));
    // Loceng Maghrib dimatikan
    await t.klik('.pr-bell[data-k="maghrib"]');
    await t.ada('.toast', /^Azan Maghrib dimatikan$/);
    sama(await page.$eval('.pr-bell[data-k="maghrib"]', b => b.getAttribute('aria-pressed')), 'false', 'Loceng Maghrib');
    sama(await storan(page, 'bl_azanOff'), ['maghrib'], 'Senarai azan dimatikan');
    // Suis bunyi azan
    await t.klik('#azanBtn');
    await t.ada('.toast', /^Bunyi azan dimatikan$/);
    await t.ada('#azanSub', /^Azan tidak dimainkan$/);
    sama(await page.$$eval('.pr-bell', bs => bs.map(b => b.getAttribute('aria-pressed'))), Array(5).fill('false'), 'Semua loceng mati');
    // Dengar contoh azan dan hentikan (audio dibisukan)
    await t.klik('#azanUji');
    await t.ada('#azanUji', /^Hentikan azan$/);
    await t.ada('#azanBarText', /^Contoh azan$/);
    sama(await page.$eval('#azanUji', b => b.getAttribute('aria-pressed')), 'true', 'Butang dengar azan ditekan');
    await t.klik('#azanUji');
    await t.ada('#azanUji', /^Dengar azan$/);
    pastikan(await page.$eval('#azanBar', e => e.classList.contains('hidden')), 'Bar azan tidak disembunyikan selepas dihentikan');
    // Peringatan waktu solat (kebenaran notifikasi diberi)
    await t.klik('#notifBtn');
    await t.ada('#notifSub', /^Aktif untuk zon WLY01\./);
    sama(await page.$eval('#notifBtn', b => b.getAttribute('aria-checked')), 'true', 'Suis peringatan');
    sama(await page.$$eval('.pr-bell', bs => bs.map(b => b.getAttribute('aria-pressed'))), ['true', 'true', 'true', 'false', 'true'], 'Loceng ikut peringatan (Maghrib kekal mati)');
  } },

  { kumpulan: K, nama: 'Takwim Siswa: hari Jumaat dicetak merah', langkah: async (t, page) => {
    await masa(page, '2026-10-09T09:00:00+08:00');
    await t.buka('#utama');
    await t.ada('#tkBulan', /^Jumaat$/); await t.ada('#tkHari', /^9$/); await t.ada('#tkEdisi', /^Edisi 282 · 2026$/);
    pastikan(await page.$('.tk-date.jumaat'), 'Jumaat tidak ditanda');
  } },

  /* ====================== Ibadah ====================== */
  { kumpulan: K, nama: 'Ibadah: hab 16 jubin dengan tarikh Hijri, jubin Kiblat dan laluan tidak sah', lebar: 1280, langkah: async (t, page) => {
    await masa(page);
    await t.buka('#ibadah');
    const h = hijriOf(2026, 10, 10);
    await t.ada('#ibHub .eyebrow', new RegExp(`^Sabtu, 10 Oktober 2026 · ${hStr(h)}$`));
    sama(await page.$$eval('.ib-tile', x => x.length), 16, 'Bilangan jubin');
    await t.ada('.ib-tile[href="#ibadah/kalendar"] .cal', new RegExp(`^${h.d}RAk$`));
    await t.klik('.ib-tile[href="#ibadah/kiblat"]');
    await page.waitForFunction(() => location.hash === '#solat');
    await lompat(page, '#ibadah/tiada-panel');
    await page.waitForFunction(() => location.hash === '#ibadah');
    pastikan(await page.$eval('#ibPanel', p => p.classList.contains('hidden')), 'Panel tidak disembunyikan');
    await tiadaLimpahan(page);
  } },

  { kumpulan: K, nama: 'Al-Quran: 114 surah, carian, juz, bacaan Al-Ikhlas, penanda dan salin ayat', langkah: async (t, page) => {
    await masa(page); await senyap(page);
    await t.buka('#ibadah/quran');
    await page.waitForFunction(() => document.querySelectorAll('#qListBox .q-row').length === 114);
    await t.ada('#qListBox .q-row:first-child', /^\s*1Al-FatihahMakkiyah · 7 ayatٱلْفَاتِحَةِ\s*$/);
    for (const [q, n] of [['yasin', ['Yasin']], ['36', ['Yasin']], ['taubat', ['At-Taubah']], ['ikhlas', ['Al-Ikhlas']]]) {
      await t.isi('#qFind', q);
      sama(await page.$$eval('#qListBox .q-row b', x => x.map(b => b.textContent)), n, `Carian "${q}"`);
    }
    await t.isi('#qFind', 'zzzz');
    await t.ada('#qListBox', /^Tiada surah sepadan\.$/);
    // Juz: 30 baris, Juz 30 bermula An-Naba' ayat 1
    await t.klik('[data-qtab="juz"]');
    sama(await page.$$eval('#qListBox .q-row', x => x.length), 30, 'Bilangan juz');
    await t.ada('#qListBox .q-row:last-child', /Juz 30Bermula An-Naba' ayat 1/);
    // Bacaan Al-Ikhlas: Bismillah sebagai kepala surah, bukan dalam ayat 1
    await lompat(page, '#ibadah/quran/112');
    await t.ada('#qReader .q-hero h2', /^Al-Ikhlas$/);
    await t.ada('#qReader .q-hero p:not(.q-ar-big)', /^Sincerity · Makkiyah · 4 ayat$/);
    sama(await page.$$eval('.ayah', x => x.length), 4, 'Bilangan ayat');
    pastikan(await page.$('.q-basm'), 'Bismillah kepala surah tiada');
    await t.ada('#ay-1 .ay-ar', /^قُلْ هُوَ/);
    await t.ada('#ay-1 .ay-ms', /^Katakanlah \(wahai Muhammad\)/);
    await t.ada('.q-nav', /Al-Masad.*Al-Falaq/);
    // Audio bacaan tidak dapat dimuat (cdn.islamic.network 503): cuba 64 kbps, kemudian mesej dan pemain ditutup
    const audio = []; page.on('request', r => { if (/cdn\.islamic\.network/.test(r.url())) audio.push(r.url().split('/audio/')[1]); });
    await t.klik('#qReader [data-play="112"]');
    await t.ada('.toast', /^Audio tidak dapat dimainkan\.$/);
    sama(audio, ['128/ar.alafasy/6222.mp3', '64/ar.alafasy/6222.mp3'], 'Audio ayat 1 (nombor global 6222)');
    pastikan(await page.$eval('#qMini', m => m.classList.contains('hidden')), 'Pemain mini tidak ditutup');
    // Penanda dan salin
    await t.klik('[data-bm="2"]');
    await t.ada('.toast', /^Penanda disimpan$/);
    sama((await storan(page, 'bl_qBm')).map(b => [b.s, b.a]), [[112, 2]], 'Penanda disimpan');
    const s = await salin(page, '[data-copy="1"]');
    await t.ada('.toast', /^Disalin$/);
    pastikan(s.includes('قُلْ هُوَ') && s.includes('Katakanlah') && s.endsWith('(Al-Ikhlas 112:1)'), `Teks disalin: ${s}`);
    // Al-Fatihah: Bismillah ialah ayat 1, tiada kepala surah
    await lompat(page, '#ibadah/quran/1');
    await t.ada('#qReader .q-hero h2', /^Al-Fatihah$/);
    sama(await page.$$eval('.ayah', x => x.length), 7, 'Ayat Al-Fatihah');
    pastikan(!(await page.$('.q-basm')), 'Al-Fatihah tidak sepatutnya ada kepala Bismillah');
    await t.ada('#ay-1 .ay-ar', /^بِسْمِ/);
    // Senarai penanda
    await lompat(page, '#ibadah/quran');
    await t.klik('[data-qtab="bm"]');
    await t.ada('#qListBox', /^Al-IkhlasAyat 2$/);
    await t.klik('[data-qtab="surah"]');
    await tiadaLimpahan(page);
  } },

  { kumpulan: K, nama: 'Al-Quran: luar talian, Cuba lagi melalui sandaran Quran.com, dan surah tersimpan tanpa internet', langkah: async (t, page) => {
    await masa(page);
    await blok(page, /api\.alquran\.cloud/);
    await blok(page, /api\.quran\.com/);
    await t.buka('#ibadah/quran');
    await t.ada('#qListBox', /Senarai surah perlukan sambungan internet kali pertama\./);
    await lompat(page, '#ibadah/quran/112');
    await t.ada('#qReader', /Surah ini belum disimpan dalam peranti\./);
    // Quran.com kembali: Cuba lagi memuatkan surah melalui sumber sandaran
    await page.unroute(/api\.quran\.com/);
    await t.klik('[data-retry]');
    await t.ada('#qReader .q-hero h2', /^Al-Ikhlas$/);
    sama(await page.$$eval('.ayah', x => x.length), 4, 'Ayat daripada Quran.com');
    await t.ada('#ay-1 .ay-ms', /^Katakanlah \(wahai Muhammad\): "\(Tuhanku\) ialah Allah Yang Maha Esa;$/);   // nota kaki <sup> dibuang
    await lompat(page, '#ibadah/quran');
    await page.waitForFunction(() => document.querySelectorAll('#qListBox .q-row').length === 114);
    // Semua sumber terputus semula: surah yang pernah dibuka masih boleh dibaca daripada storan peranti
    await blok(page, /api\.quran\.com/);
    await page.reload();
    await lompat(page, '#ibadah/quran/112');
    sama(await page.$$eval('.ayah', x => x.length), 4, 'Surah tersimpan dibaca tanpa internet');
  } },

  { kumpulan: K, nama: 'Tasbih: kira hingga 33, sasaran, tukar zikir, set semula dan simpanan', langkah: async (t, page) => {
    await masa(page);
    await t.buka('#ibadah/tasbih');
    await t.ada('#tsOf', /^daripada 33$/);
    // 33 ketukan pantas berturut-turut
    await page.click('#tsBtn', { clickCount: 33, delay: 5 });
    await t.ada('#tsCount', /^33$/);
    await t.ada('.toast', /^33 kali\. Alhamdulillah\.$/);
    await t.ada('#tsToday', /^33$/); await t.ada('#tsTotal', /^33$/);
    await t.klik('[data-t="99"]'); await t.ada('#tsOf', /^daripada 99$/);
    await t.klik('[data-t="0"]'); await t.ada('#tsOf', /^tekan untuk mengira$/);
    await t.klik('[data-z="1"]');
    await t.ada('#tsAr', /^الْحَمْدُ لِلَّهِ$/); await t.ada('#tsCount', /^0$/); await t.ada('#tsTotal', /^33$/);
    await t.klik('#tsBtn'); await t.klik('#tsBtn');
    await t.ada('#tsCount', /^2$/);
    await t.klik('#tsReset'); await t.ada('#tsCount', /^0$/);
    await page.reload();
    await t.ada('#tsTotal', /^35$/); await t.ada('#tsToday', /^35$/); await t.ada('#tsAr', /^الْحَمْدُ لِلَّهِ$/);
  } },

  { kumpulan: K, nama: 'Kalendar Islam, tarikh penting dan Tukar Tarikh (termasuk tarikh Hijri tidak wujud)', langkah: async (t, page) => {
    await masa(page);
    await t.buka('#ibadah/kalendar');
    await t.ada('.cal-hero h2', new RegExp(`^${hStr(hijriOf(2026, 10, 10))}$`));
    const h1 = hijriOf(2026, 10, 1), h2 = hijriOf(2026, 10, 31);
    await t.ada('#calTitle', new RegExp(`^Oktober 2026${HIJRI_M[h1.m - 1]} – ${HIJRI_M[h2.m - 1]} ${h2.y}H$`));
    sama(await page.$$eval('#calGrid .cal-d', x => [x.length, x.findIndex(d => d.classList.contains('today')) + 1, x.filter(d => d.classList.contains('fri')).map(d => +d.querySelector('b').textContent)]), [31, 10, [2, 9, 16, 23, 30]], 'Grid Oktober');
    await t.klik('[data-cal="1"]');
    await t.ada('#calTitle', /^November 2026/);
    // Tarikh penting seterusnya: dikira dengan kalendar Umm al-Qura yang sama
    const ev = [[7, 27, 'Israk dan Mikraj'], [8, 15, 'Nisfu Syaaban'], [9, 1, 'Awal Ramadan']], jangka = [];
    for (let i = 0; jangka.length < 3; i++) { const d = new Date(Date.UTC(2026, 9, 10 + i)), h = hijriOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()), e = ev.find(([m, dd]) => m === h.m && dd === h.d); if (e) jangka.push(`${e[2]}|${i} hari lagi`); }
    sama(await page.$$eval('#calEvents .ev-row', rs => [rs.length, ...rs.slice(0, 3).map(r => `${r.querySelector('.q-main b').textContent}|${r.querySelector('.ev-left').textContent}`)]), [10, ...jangka], 'Tarikh penting');
    // Tukar tarikh
    await lompat(page, '#ibadah/tukar');
    await t.isi('#tkG', '2026-03-20');
    await t.ada('#tkGOut b', /^1 Syawal 1447H$/);
    await t.isi('#tkHd', '1'); await t.pilih('#tkHm', '9'); await t.isi('#tkHy', '1447');
    await t.ada('#tkHOut b', /^Rabu, 18 Februari 2026$/);
    // 30 Syawal 1447 tiada (Syawal 1447 hanya 29 hari dalam Umm al-Qura)
    await t.isi('#tkHd', '30'); await t.pilih('#tkHm', '10');
    await t.ada('#tkHOut', /^Tarikh ini tiada dalam bulan tersebut\.$/);
    // Pelarasan +1 hari dalam Tetapan
    await lompat(page, '#ibadah/tetapan');
    await t.klik('[data-adj="1"]');
    await t.ada('.toast', /^Tarikh Hijri dilaraskan$/);
    await lompat(page, '#ibadah');
    await t.ada('#ibHub .eyebrow', new RegExp(`· ${hStr(hijriOf(2026, 10, 11))}$`));
  } },

  { kumpulan: K, nama: 'Kalkulator Zakat: fitrah, nisab simpanan dan saham, haul, input negatif dan simpanan', lebar: 1280, langkah: async (t, page) => {
    await masa(page);
    await t.buka('#ibadah/zakat');
    await t.isi('#zfN', '4'); await t.isi('#zfR', '7');
    await t.ada('#zfOut', /^RM28\.00$/);
    await t.isi('#zsS', '20000');
    await t.ada('#zsNote', /^Masukkan harga emas untuk mengira nisab \(85 gram\)\.$/);
    // Nisab = 85 g x RM400 = RM34,000
    await t.isi('#zsG', '400');
    await t.ada('#zsOut', /^RM0\.00$/);
    await t.ada('#zsNote', /^Belum cukup nisab RM34,000\.00\. Tiada zakat simpanan\.$/);
    await t.ada('#zvNote', /^Masukkan nilai saham untuk mengira\.$/);
    // Simpanan + saham + dividen = RM35,500 melebihi nisab
    await t.isi('#zsV', '15000'); await t.isi('#zsD', '500');
    await t.ada('#zsOut', /^RM500\.00$/);
    await t.ada('#zvOut', /^RM387\.50$/);
    await t.ada('#zsNote', /^Simpanan sahaja belum cukup nisab, tetapi bersama saham jumlahnya melebihi nisab RM34,000\.00\./);
    await t.ada('#zvNote', /^Jumlah simpanan dan saham RM35,500\.00 melebihi nisab RM34,000\.00\./);
    // Haul: mula 10 Okt 2025 (18 Rabiulakhir 1447) cukup haul 18 Rabiulakhir 1448
    await t.isi('#zhS', '2025-10-10');
    await t.ada('#zhOut', /Mula10 Okt 2025 · 18 Rabiulakhir 1447H/);
    await t.ada('#zhOut', /Cukup haul29 Sep 2026 · 18 Rabiulakhir 1448H/);
    await t.ada('#zhOut', /Sudah cukup haul 11 hari lalu\. Kira dan bayar zakat/);
    await t.isi('#zhS', '2026-01-15');
    await t.ada('#zhOut', /\d+ hari lagi$/);
    // Nombor negatif tidak menghasilkan jumlah negatif
    await t.isi('#zfN', '-2');
    await t.ada('#zfOut', /^RM0\.00$/);
    await t.isi('#zfN', '4');
    await page.reload();
    await lompat(page, '#ibadah/zakat');
    sama(await page.$eval('#zsG', e => e.value), '400', 'Harga emas disimpan');
    await t.ada('#zfOut', /^RM28\.00$/); await t.ada('#zvOut', /^RM387\.50$/);
  } },

  { kumpulan: K, nama: 'Doa & Zikir, Asmaul Husna, Galeri kad, Panduan Haji/Umrah dan Bantuan', langkah: async (t, page) => {
    await masa(page);
    await t.buka('#ibadah/doa');
    sama(await page.$$eval('.doa-cat', x => x.length), 12, 'Kategori doa');
    await t.isi('#doaFind', 'makan');
    sama(await page.$$eval('.doa-cat:not(.hidden)', x => x.map(c => [c.dataset.cat, c.open])), [['makan', true]], 'Carian "makan"');
    await t.isi('#doaFind', 'zzzz');
    sama(await page.$$eval('.doa-cat:not(.hidden)', x => x.length), 0, 'Carian tanpa hasil');
    await t.isi('#doaFind', '');
    sama(await page.$eval('.doa a.link-btn', a => a.getAttribute('href')), '#ibadah/quran/2/255', 'Pautan Ayat Kursi');
    await page.$eval('.doa-cat[data-cat="tidur"]', d => { d.open = true; });
    pastikan((await salin(page, '.doa-cat[data-cat="tidur"] [data-copytext]')).split('\n').length >= 3, 'Doa disalin tanpa rumi/maksud');
    await t.ada('.toast', /^Disalin$/);
    await lompat(page, '#ibadah/asma');
    sama(await page.$$eval('.asma', x => x.length), 99, 'Bilangan Asmaul Husna');
    await t.isi('#asmaFind', 'razzaq');
    sama(await page.$$eval('.asma:not(.hidden) b', x => x.map(b => b.textContent)), ['Ar-Razzaq'], 'Carian Ar-Razzaq');
    await lompat(page, '#ibadah/haji'); sama(await page.$$eval('.steps li', x => x.length), 7, 'Langkah haji');
    await lompat(page, '#ibadah/umrah'); sama(await page.$$eval('.steps li', x => x.length), 6, 'Langkah umrah');
    await lompat(page, '#ibadah/bantuan'); sama(await page.$$eval('.faq details', x => x.length), 6, 'Soalan lazim');
    await lompat(page, '#ibadah/galeri');
    await page.waitForFunction(() => { const i = [...document.querySelectorAll('#galGrid img')]; return i.length > 10 && i.every(x => x.src.startsWith('data:image/jpeg')); });
    const d = await muatTurun(page, '[data-gal="0"]');
    sama(d.suggestedFilename(), 'bijak-labur-1.png', 'Nama fail kad');
    await t.ada('.toast', /^Kad dimuat turun$/);
  } },

  { kumpulan: K, nama: 'Panduan Haid: mod uzur menjeda rekod solat; Profil dan Tetapan (tema, padam data)',
    storan: { bl_rekod: { '2026-10-09': ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] }, bl_tasbih: { z: 0, c: 3, target: 33, total: 120, day: '2026-10-10', today: 3 } },
    langkah: async (t, page) => {
      await masa(page); await senyap(page); terima(page);
      await t.buka('#ibadah/haid');
      await t.klik('#uzurBtn');
      await t.ada('.toast', /^Mod uzur diaktifkan$/);
      await t.ada('.uzur .sc-sub', /^Aktif sejak 10 Okt 2026 \(hari ke-1\)\./);
      sama(await page.$eval('#uzurBtn', b => b.getAttribute('aria-checked')), 'true', 'Suis uzur');
      await lompat(page, '#solat');
      await t.ada('#trackerSub', /^Mod uzur aktif\./);
      sama(await page.$$eval('.track-btn', bs => bs.every(b => b.disabled)), true, 'Butang rekod dijeda');
      await t.ada('#streak .num', /^1$/);
      await lompat(page, '#ibadah/haid');
      await t.klik('#uzurBtn');
      await t.ada('.toast', /^Mod uzur dimatikan\. Rekod solat disambung\.$/);
      await t.ada('#ibPanel .list .ev-row', /^10 Okt 2026 hingga 10 Okt 20261 hari$/);
      // Profil
      await lompat(page, '#ibadah/profil');
      sama(await page.$$eval('#ibPanel .stat .v', x => x.map(v => v.textContent)), ['5', '1', '120', '0'], 'Statistik profil');
      await t.isi('#pfName', 'Aminah');
      sama(await storan(page, 'bl_nama'), 'Aminah', 'Nama panggilan');
      // Tetapan: tema gelap dan padam data ibadah
      await lompat(page, '#ibadah/tetapan');
      await t.klik('[data-theme-set="dark"]');
      sama(await page.evaluate(() => document.documentElement.dataset.theme), 'dark', 'Tema gelap');
      await t.klik('[data-theme-set="auto"]');
      sama(await page.evaluate(() => document.documentElement.dataset.theme || ''), '', 'Tema auto');
      await t.klik('#setWipe');
      await t.ada('.toast', /^Data ibadah dipadam$/);
      sama([await storan(page, 'bl_rekod'), await storan(page, 'bl_tasbih'), await storan(page, 'bl_nama'), await storan(page, 'bl_uzur')], [null, null, null, null], 'Data dipadam');
    } },

  /* ====================== Fiqh dan Tanya AI ====================== */
  { kumpulan: K, nama: 'Fiqh: utama, carian masalah, Riba dengan ayat dan hadis dari sumber, salin rujukan dan cari dalil', langkah: async (t, page) => {
    await masa(page);
    await t.buka('#ibadah/fiqh');
    const bab = await page.evaluate(() => FiqhData.BAB.length);
    sama(await page.$$eval('.fq-bab', x => x.length), bab, 'Kad bab');
    await t.isi('#fqFind', 'riba');
    await t.ada('#fqHits', /Riba/);
    await t.isi('#fqFind', 'qqqqq');
    await t.ada('#fqHits', /^Tiada masalah sepadan/);
    await lompat(page, '#ibadah/fiqh/muamalat/riba');
    await t.ada('.fq-title h2', /^Riba$/);
    await t.ada('.fq-src[data-ayah="2:275"]', /^Surah Al-Baqarah \(2:275\).*Orang-orang yang memakan \(mengambil\) riba/);
    await t.ada('.fq-src[data-hadith="m1598"] .fq-live', /لَعَنَ رَسُولُ اللَّهِ.*cursed the accepter of interest.*Sahih Muslim: Sahih/);
    const s = await salin(page, '[data-fq-copy="riba"]');
    await t.ada('.toast', /^Rujukan disalin$/);
    for (const x of ['Riba', 'Al-Quran 2:275 (https://quran.com/2/275)', 'Sahih Muslim 1598, riwayat Jabir bin Abdullah (https://sunnah.com/muslim:1598)'])
      pastikan(s.includes(x), `Senarai rujukan disalin tiada "${x}"`);
    // Cari dalil terus dari sumber
    await lompat(page, '#ibadah/fiqh');
    await t.isi('#fqDalil', 'a'); await t.klik('[data-fq-ayat]');
    await t.ada('#fqAyat', /^Masukkan sekurang-kurangnya 2 huruf\.$/);
    await t.isi('#fqDalil', 'riba'); await page.press('#fqDalil', 'Enter');
    await t.ada('#fqAyat', /3 ayat mengandungi "riba"/);
    sama(await page.$$eval('.fq-ayat-list .fq-row', x => x.map(a => a.getAttribute('href'))), ['#ibadah/quran/2/275', '#ibadah/quran/2/276', '#ibadah/quran/3/130'], 'Ayat riba');
    await t.isi('#fqDalil', 'forex'); await t.klik('[data-fq-ayat]');
    await t.ada('#fqAyat', /Perkataan "forex" tiada dalam Al-Quran kerana ia istilah moden\. Hukumnya diambil daripada ayat tentang "riba" dan "judi":/);
    pastikan(await page.$('#fqAyat .fq-w'), 'Ayat istilah setara tidak ditanda');
    await tiadaLimpahan(page);
  } },

  { kumpulan: K, nama: 'Fiqh: luar talian, ayat dan hadis gagal dimuat tetapi pautan rujukan kekal', langkah: async (t, page) => {
    await masa(page);
    await blok(page, /api\.alquran\.cloud|api\.quran\.com|cdn\.jsdelivr\.net/);
    await t.buka('#ibadah/fiqh/muamalat/riba');
    await t.ada('.fq-src[data-ayah="2:275"]', /Teks tidak dapat dimuat tanpa internet\. Rujukan di atas tetap boleh dibuka\./);
    sama(await page.$eval('.fq-src[data-ayah="2:275"] a.link-btn', a => a.getAttribute('href')), '#ibadah/quran/2/275', 'Pautan ayat');
    await t.ada('.fq-src[data-hadith="m1598"] .fq-live', /Buka pautan sunnah\.com untuk teks penuh/);
    await lompat(page, '#ibadah/fiqh');
    await t.isi('#fqDalil', 'riba'); await t.klik('[data-fq-ayat]');
    await t.ada('#fqAyat', /Carian ayat perlukan sambungan internet\./);
  } },

  { kumpulan: K, nama: 'Tanya AI: pelayan sebenar tanpa binding RUJUKAN menjawab "Tidak pasti" tanpa huraian', langkah: async (t, page) => {
    await masa(page);
    await t.buka('#ibadah/fiqh/tanya');
    await t.isi('#fqAsk', 'abc'); await t.klik('[data-fq-ask]');
    await t.ada('#fqAns', /^Tulis soalan sekurang-kurangnya 5 huruf\.$/);
    const n0 = panggilanAI.length;
    await t.isi('#fqAsk', 'Apakah hukum trading forex secara individu?');
    await page.press('#fqAsk', 'Enter');
    await t.ada('.fq-ai-st', /^Tidak pasti$/, 20000);
    await t.ada('.fq-ai-q', /^Apakah hukum trading forex secara individu\?$/);
    await t.ada('.fq-ai-ans .fq-sum', /^Tiada rujukan muktabar yang dapat disahkan untuk soalan ini\. Sila rujuk Jabatan Mufti negeri anda/);
    pastikan(panggilanAI.length > n0, 'Model AI tidak dipanggil oleh pelayan');
    sama(await page.$$eval('.fq-ai-src, .fq-apa-list, .fq-ai-khilaf', x => x.length), 0, 'Tiada sumber, APA atau khilaf tanpa rujukan sah');
    pastikan(!(await page.$eval('[data-fq-ask]', b => b.disabled)), 'Butang Tanya kekal dinyahaktif');
    const s = await salin(page, '[data-fq-copyai]');
    await t.ada('.toast', /^Jawapan disalin$/);
    pastikan(s.startsWith('Soalan: Apakah hukum trading forex secara individu?') && s.trim().endsWith('Dijana oleh Tanya AI SiswaCap. Bukan fatwa; semak sumber asal.'), `Jawapan disalin: ${s}`);
    // Contoh soalan pada cip terus bertanya
    await t.klik('[data-fq-eg]');
    await t.ada('.fq-ai-q', /^Apakah hukum trading forex secara individu\?$/);
  } },

  { kumpulan: K, nama: 'Tanya AI: jawapan bersumber dengan kad rujukan, gambar muka surat, APA 7 dan butang salin', lebar: 1280, langkah: async (t, page) => {
    await masa(page);
    const jaw = jawapanBersumber();
    sama(jaw.sumber.length, 8, 'verify() pelayan: bilangan sumber sah');
    await tanyaPalsu(page, r => json(r, 200, jaw));
    await t.buka('#ibadah/fiqh/tanya');
    await t.isi('#fqAsk', 'Apakah hukum trading forex secara individu?');
    await t.klik('[data-fq-ask]');
    await t.ada('.fq-ai-st', /^8 rujukan, 6 petikan disemak$/);
    await t.ada('.fq-ai-khilaf', /^Perbezaan pendapat/);
    sama(await page.$$eval('.fq-ai-src', x => x.length), 8, 'Kad sumber');
    // Ayat dan hadis dimuat terus daripada sumber
    await t.ada('.fq-ai-src [data-ayah="2:275"]', /Surah Al-Baqarah \(2:275\)/);
    await t.ada('.fq-ai-src[data-hadith="m1598"] .fq-live', /cursed the accepter of interest/);
    // Kitab dengan gambar cetakan archive.org (gagal dimuat di sini) dan kitab tanpa gambar (teks Shamela)
    const kad = async re => page.evaluateHandle(src => [...document.querySelectorAll('.fq-ai-src')].find(x => new RegExp(src).test(x.textContent)), re.source);
    const minhaj = await kad(/Minhaj al-Talibin/);
    pastikan(/Muka surat 120 dalam cetakan/.test(await minhaj.evaluate(x => x.textContent)), 'Label muka surat cetakan Minhaj');
    pastikan(/Shamela, muka surat 113 · juz 1, hlm\. 142/.test(await minhaj.evaluate(x => x.textContent)), 'Halaman Shamela dan cetakan Minhaj');
    await page.waitForFunction(() => /Gambar muka surat tidak dapat dimuat/.test(document.querySelector('#fqAns').textContent));
    const fath = await kad(/Teks digital Shamela, halaman 150/);
    pastikan(await fath.evaluate(x => !!x && /والربا حرام/.test(x.querySelector('.fq-page-teks.ar').textContent)), 'Teks halaman Shamela Fath al-Qarib');
    await t.ada('#fqAns', /Sesetengah halaman kitab di atas belum mempunyai gambar muka surat cetakan yang disahkan/);
    // Artikel Mufti Selangor dan dokumen JAKIM
    const mufti = await kad(/Fatwa · Selangor/);
    pastikan(await mufti.evaluate(x => !!x && /Buka laman Mufti/.test(x.textContent) && /Petikan sepadan dengan teks sumber/.test(x.textContent)), 'Kad artikel Mufti');
    sama(await page.$$eval('.fq-ai-src .link-btn[href*="/halaman/jakim/57.jpg"]', x => x.length), 1, 'Pautan gambar muka surat JAKIM');
    // APA 7: satu blok setiap kad dan senarai rujukan mengikut abjad
    sama(await page.$$eval('.fq-ai-src .fq-apa', x => x.length), 8, 'Blok APA setiap sumber');
    await t.ada('#fqApaH', /^Senarai rujukan \(APA 7\)$/);
    const senarai = await page.$$eval('.fq-apa-list .fq-apa-ref', x => x.map(p => p.textContent));
    sama(senarai.map(s => s.split(/[.(]/)[0].trim()), ['Al-Ghazzi, M', 'Jabatan Kemajuan Islam Malaysia', 'Jabatan Mufti Negeri Selangor', 'Jabatan Mufti Negeri Selangor', 'Muslim ibn al-Hajjaj', 'Al-Nawawi, Y', 'Al-Quran al-Karim', 'SiswaCap'], 'Susunan senarai rujukan');
    pastikan(senarai.includes('Al-Nawawi, Y. S. (n.d.). Minhaj al-talibin. Al-Maktabah al-Shamilah. https://shamela.ws/book/12096'), `Rujukan Minhaj: ${senarai.join(' | ')}`);
    pastikan(senarai.includes('Jabatan Mufti Negeri Selangor. (2023, May 10). Hukum forex secara individu. https://www.muftiselangor.gov.my/fatwa/hukum-forex-individu'), 'Rujukan laman Mufti');
    pastikan(await page.$$eval('.fq-apa-list i', x => x.length) === 8, 'Tajuk karya tidak dicondongkan');
    // Salin rujukan dan petikan dalam teks (Minhaj ialah sumber ke-5)
    sama(await salin(page, '[data-fq-apa="4"]'), 'Al-Nawawi, Y. S. (n.d.). Minhaj al-talibin. Al-Maktabah al-Shamilah. https://shamela.ws/book/12096', 'Rujukan disalin');
    await t.ada('.toast', /^Rujukan APA 7 disalin$/);
    sama(await salin(page, '[data-fq-apa-teks="4"]'), '(Al-Nawawi, n.d., Vol. 1, p. 142)', 'Petikan dalam teks');
    await t.ada('.toast', /^Petikan dalam teks disalin$/);
    sama(await salin(page, '[data-fq-apa-teks="2"]'), '(Muzakarah Jawatankuasa Fatwa Majlis Kebangsaan, 2012, as cited in Jabatan Mufti Negeri Selangor, n.d.)', 'Petikan sumber kedua');
    sama((await salin(page, '[data-fq-apa-semua]')).split('\n'), senarai, 'Senarai penuh disalin');
    await t.ada('.toast', /^Senarai rujukan APA 7 disalin$/);
    const s = await salin(page, '[data-fq-copyai]');
    pastikan(s.includes('Rujukan:') && s.includes('Senarai rujukan (APA 7):') && s.includes('"perdagangan pertukaran mata wang asing'), 'Jawapan penuh disalin');
    await tiadaLimpahan(page);
  } },

  { kumpulan: K, nama: 'Tanya AI: ralat pelayan, tiada sambungan dan butang aktif semula', langkah: async (t, page) => {
    await masa(page);
    let mod = 'ralat';
    await tanyaPalsu(page, r => mod === 'ralat' ? json(r, 502, { error: 'Tanya AI tidak tersedia buat masa ini.' }) : r.abort('internetdisconnected'));
    await t.buka('#ibadah/fiqh/tanya');
    await t.isi('#fqAsk', 'Bolehkah solat jamak dan qasar jika pulang hari?');
    await t.klik('[data-fq-ask]');
    await t.ada('#fqAns .note', /^Tanya AI tidak tersedia buat masa ini\.$/);
    pastikan(!(await page.$eval('[data-fq-ask]', b => b.disabled)), 'Butang Tanya tidak aktif semula');
    mod = 'putus';
    await t.klik('[data-fq-ask]');
    await t.ada('#fqAns .note', /^Tidak dapat menghubungi Tanya AI\. Semak sambungan internet anda\.$/);
  } },

  { kumpulan: K, nama: 'Tanya AI: had percuma 5 soalan sehari (tanpa Premium) tidak menghantar soalan', premium: false,
    storan: { bl_kuota: { d: hariIniKL(), tanya: 5 } },
    langkah: async (t, page) => {
      await masa(page);
      const minta = []; page.on('request', r => { if (r.url().includes('/tanya')) minta.push(r.method()); });
      await t.buka('#ibadah/fiqh/tanya');
      await t.isi('#fqAsk', 'Adakah saham perlu dizakatkan?');
      await t.klik('[data-fq-ask]');
      await t.ada('.toast', /^Had percuma 5 soalan Tanya AI sehari sudah dicapai/);
      await t.rehat(300);
      sama(minta, [], 'Permintaan ke /tanya');
      sama(await t.teks('#fqAns'), '', 'Kotak jawapan');
    } },

  /* ====================== Audit Halal ====================== */
  { kumpulan: K, nama: 'Audit Halal: senarai ringkas, skor patuh, NCR daripada item tidak patuh, cetak dan set semula', langkah: async (t, page) => {
    await masa(page); terima(page);
    await t.buka('#halal');
    sama(await page.$eval('#hlSkim', s => s.value), 'ringkas', 'Skim lalai');
    sama(await page.$$eval('.ah-grp[data-grp]', g => [g.length, g.map(x => x.open)]), [5, [true, false, false, false, false]], 'Kumpulan senarai semak');
    await t.ada('.stat-row .stat:nth-child(2) .v', /^0\/27$/);
    for (const [i, s] of [[0, 'y'], [1, 'y'], [2, 'y'], [3, 'na']]) await t.klik(`[data-hl="urus${i}"][data-st="${s}"]`);
    await t.klik('[data-hl="urus4"][data-st="n"]');
    // Item tidak patuh terus membuka borang NCR dengan teks item
    await t.tunggu('#hlNcrForm:not(.hidden)');
    sama(await page.$eval('#ncTemuan', e => e.value), 'Pekerja menerima latihan kesedaran halal dan rekod latihan disimpan: ', 'Teks penemuan');
    await page.type('#ncTemuan', 'rekod latihan 2025 tiada');
    await t.pilih('#ncKat', 'major'); await t.isi('#ncPic', 'Eksekutif Halal'); await t.isi('#ncDue', '2026-10-01');
    await t.isi('#ncPunca', 'Tiada jadual latihan tahunan'); await t.isi('#ncTindakan', 'Adakan latihan kesedaran halal');
    await t.klik('#hlNcrForm button[type=submit]');
    await t.ada('.toast', /^NCR disimpan$/);
    sama(await page.$$eval('.stat-row .stat .v', x => x.map(v => v.textContent)), ['75%', '5/27', '1', '1'], 'Statistik selepas NCR');
    await t.ada('.ah-ncr-row', /NCR 01Major/);
    await t.ada('.ah-ncr-row', /Tarikh akhir 2026-10-01 · Lewat/);
    await t.ada('.ah-grp[data-grp="urus"] summary', /5\/7$/);
    // NCR ditutup
    await t.pilih('[data-ncr-st="0"]', 'tutup');
    sama(await page.$$eval('.stat-row .stat .v', x => x.map(v => v.textContent)), ['75%', '5/27', '0', '0'], 'Statistik selepas NCR ditutup');
    pastikan(!/Lewat/.test(await t.teks('.ah-ncr-row')), 'NCR ditutup masih ditanda lewat');
    // Tekan semula status yang sama membatalkan jawapan
    await t.klik('[data-hl="urus0"][data-st="y"]');
    await t.ada('.stat-row .stat:nth-child(2) .v', /^4\/27$/);
    await t.ada('.stat-row .stat:first-child .v', /^67%$/);
    // Maklumat syarikat kekal selepas muat semula
    await t.isi('#hlCo', 'Kilang Roti Contoh Sdn Bhd'); await t.isi('#hlDate', '2026-10-10');
    await page.reload();
    sama(await page.$eval('#hlCo', e => e.value), 'Kilang Roti Contoh Sdn Bhd', 'Nama syarikat');
    await t.ada('.stat-row .stat:nth-child(2) .v', /^4\/27$/);
    // Cetak (dialog cetak digantikan)
    await page.evaluate(() => { window.__cetak = 0; window.print = () => { window.__cetak++; }; });
    await t.klik('#hlPrint');
    sama(await page.evaluate(() => window.__cetak), 1, 'Cetak dipanggil');
    pastikan(!(await page.$('a[href$=".xlsx"]')), 'Senarai ringkas tidak sepatutnya ada pautan Excel');
    await t.klik('#hlReset');
    sama(await page.$$eval('.stat-row .stat .v', x => x.map(v => v.textContent)), ['0%', '0/27', '0', '0'], 'Selepas set semula');
    sama(await page.$eval('#hlCo', e => e.value), '', 'Nama syarikat dipadam');
    await t.ada('.ah-ncr', /Belum ada NCR/);
    // NCR manual melalui "Tambah NCR", kemudian dipadam
    await t.klik('#hlAddNcr');
    sama(await page.$eval('#ncTemuan', e => e.value), '', 'Borang NCR kosong');
    await t.isi('#ncTemuan', 'Label bahan mentah tidak lengkap');
    await t.klik('#hlNcrForm button[type=submit]');
    await t.ada('.ah-ncr-row', /NCR 01Minor\s+Terbuka/);
    await tiadaLimpahan(page);
    await t.klik('[data-ncr-del="0"]');
    await t.ada('.ah-ncr', /Belum ada NCR/);
  } },

  { kumpulan: K, nama: 'Audit Halal: skim Kosmetik (231 item), muat turun Excel, PDF kosong dan pautan setiap skim', lebar: 1280, langkah: async (t, page) => {
    await masa(page);
    await t.buka('#halal');
    await t.pilih('#hlSkim', 'kosmetik');
    await page.waitForFunction(() => document.querySelectorAll('.ah-grp[data-grp]').length === 14);
    await t.ada('.stat-row .stat:nth-child(2) .v', /^0\/231$/);
    await t.ada('.ah-grp[data-grp="kosmetik:A"] .ah-item:first-of-type p', /^A1\. /);
    // Jawapan setiap skim disimpan berasingan
    await t.klik('[data-hl="kosmetik:A0"][data-st="y"]');
    await t.ada('.stat-row .stat:first-child .v', /^100%$/);
    await t.pilih('#hlSkim', 'ringkas');
    await t.ada('.stat-row .stat:nth-child(2) .v', /^0\/27$/);
    await t.pilih('#hlSkim', 'kosmetik');
    await t.ada('.stat-row .stat:nth-child(2) .v', /^1\/231$/);
    const d = await muatTurun(page, 'a[href="data/audit-halal/senarai-semak-kosmetik.xlsx"]');
    sama(d.suggestedFilename(), 'senarai-semak-kosmetik.xlsx', 'Nama fail Excel');
    pastikan(statSync(await d.path()).size > 5000, 'Fail Excel kosong');
    sama(await page.$eval('a[href="data/audit-halal/senarai-semak-kosmetik.pdf"]', a => a.target), '_blank', 'PDF kosong dibuka dalam tab baharu');
    // Setiap skim: kiraan item pada pemilih sepadan dengan data, dan fail Excel/PDF wujud
    const skim = await page.$$eval('#hlSkim option', o => o.map(x => [x.value, x.textContent]).filter(([v]) => v !== 'ringkas'));
    for (const [k, label] of skim) {
      const j = JSON.parse(readFileSync(join(ROOT, 'data', 'audit-halal', `${k}.json`), 'utf8')), n = j.bahagian.reduce((a, b) => a + b.item.length, 0);
      pastikan(label.includes(`(${n} item)`), `Label skim ${k} "${label}" tetapi data ada ${n} item`);
      const fail = await page.evaluate(async k => Promise.all(['xlsx', 'pdf'].map(async x => { const r = await fetch(`data/audit-halal/senarai-semak-${k}.${x}`); const b = new Uint8Array(await r.arrayBuffer()); return [r.status, String.fromCharCode(...b.slice(0, 4))]; })), k);
      sama(fail, [[200, 'PK\u0003\u0004'], [200, '%PDF']], `Fail muat turun skim ${k}`);
    }
  } },

  { kumpulan: K, nama: 'Audit Halal: skim tersimpan gagal dimuat (luar talian) masih memaparkan halaman; NCR lewat ikut tarikh Malaysia',
    storan: { bl_halalAudit: { syarikat: 'Kilang Ujian', tarikh: '', jawab: {}, skim: 'kosmetik', ncr: [{ temuan: 'Sijil halal pembekal tamat', kat: 'major', pic: '', due: '2026-10-09', punca: '', tindakan: '', st: 'buka', item: '' }] } },
    langkah: async (t, page) => {
      // 7:00 pagi waktu Malaysia (masih 9 Oktober dalam UTC): tarikh akhir 9 Oktober sudah lepas
      await masa(page, '2026-10-10T07:00:00+08:00');
      await blok(page, /\/data\/audit-halal\/kosmetik\.json$/);
      await t.buka('#halal');
      await t.ada('#hlList', /^Senarai semak tidak dapat dimuatkan\. Semak sambungan internet dan cuba lagi\.$/);
      sama(await page.$eval('#hlSkim', s => s.value), 'kosmetik', 'Skim tersimpan');
      sama(await page.$eval('#hlCo', e => e.value), 'Kilang Ujian', 'Nama syarikat');
      await t.ada('.ah-ncr-row', /Tarikh akhir 2026-10-09 · Lewat\s*$/);
      await t.pilih('#hlSkim', 'ringkas');
      await t.ada('.stat-row .stat:nth-child(2) .v', /^0\/27$/);
      sama(await page.$$eval('.ah-grp[data-grp]', g => g[0].open), true, 'Kumpulan pertama dibuka');
    } },

  /* ====================== Studio Gambar AI ====================== */
  { kumpulan: K, nama: 'Studio Gambar: jana gambar (FLUX), paparan, muat turun, variasi dan galeri peranti', langkah: async (t, page) => {
    terima(page);
    const badan = []; page.on('request', r => { if (r.url() === 'https://fiqh.bijaklabur.my/gambar' && r.method() === 'POST') badan.push(JSON.parse(r.postData())); });
    await t.buka('#studio');
    await t.ada('.st-empty', /Gambar anda akan dipaparkan di sini\./);
    const idea = await page.$eval('[data-idea]', b => b.dataset.idea);
    await t.klik('[data-idea]');
    sama(await page.$eval('#stPrompt', e => e.value), idea, 'Idea mengisi penerangan');
    await t.ada('#stCount', new RegExp(`^${idea.length}/400$`));
    await t.klik('[data-gaya="anime"]');
    sama(await page.$eval('[data-gaya="anime"]', b => b.getAttribute('aria-checked')), 'true', 'Gaya anime dipilih');
    await t.klik('#stForm button[type=submit]');
    await t.tunggu('.st-out img', 20000);
    sama(badan[0], { prompt: idea, gaya: 'anime' }, 'Badan permintaan /gambar');
    const img = await page.$eval('.st-out img', i => [i.src.slice(0, 31), i.naturalWidth, i.alt]);
    sama(img, ['data:image/jpeg;base64,iVBORw0K', 8, idea], 'Gambar dipaparkan');
    await t.ada('.st-prompt summary', /^Prompt yang digunakan \(Anime · seed \d+\)$/);
    const seed = (await t.teks('.st-prompt summary')).match(/seed (\d+)/)[1];
    const d = await muatTurun(page, '.st-out a[download]');
    sama(d.suggestedFilename(), `bijak-labur-${seed}.jpg`, 'Nama fail muat turun');
    sama(await page.$$eval('.st-thumb', x => x.length), 1, 'Galeri');
    // Variasi lain: permintaan kedua dengan penerangan dan gaya yang sama
    await t.klik('[data-act="variasi"]');
    await page.waitForFunction(() => document.querySelectorAll('.st-thumb').length === 2, null, { timeout: 20000 });
    sama(badan[1], { prompt: idea, gaya: 'anime' }, 'Badan permintaan variasi');
    sama((await storan(page, 'studio_galeri')).length, 2, 'Galeri dalam storan');
    // Galeri kekal selepas muat semula dan gambar boleh dibuka semula
    await page.reload();
    await t.klik('.st-thumb');
    await t.tunggu('.st-out img');
    await t.klik('[data-act="padam"]');
    sama(await page.$$eval('.st-thumb', x => x.length), 0, 'Galeri dipadam');
    sama(await storan(page, 'studio_galeri'), null, 'Storan galeri dipadam');
    await tiadaLimpahan(page);
  } },

  { kumpulan: K, nama: 'Studio Gambar: penerangan terlalu pendek, permintaan disekat dan tiada sambungan', lebar: 1280, langkah: async (t, page) => {
    await t.buka('#studio');
    await t.isi('#stPrompt', 'ab');
    await t.klik('#stForm button[type=submit]');
    await t.ada('.toast', /^Terangkan gambar yang anda mahu dahulu\.$/);
    await t.isi('#stPrompt', 'gambar bogel di tepi pantai');
    await t.klik('#stForm button[type=submit]');
    await t.ada('.st-empty .error', /^Permintaan ini tidak sesuai untuk SiswaCap\.$/);
    pastikan(!(await page.$eval('.st-go', b => b.disabled)), 'Butang jana kekal dinyahaktif');
    await page.route('https://fiqh.bijaklabur.my/gambar', r => r.request().method() === 'POST' ? r.abort('internetdisconnected') : r.fallback());
    await t.isi('#stPrompt', 'Rumah kampung tradisional Melayu waktu pagi');
    await t.klik('#stForm button[type=submit]');
    await t.ada('.st-empty .error', /^Tiada sambungan internet\. Cuba lagi\.$/);
    sama(await page.$$eval('.st-thumb', x => x.length), 0, 'Galeri kosong');
  } },

  /* ====================== Sihat ====================== */
  { kumpulan: K, nama: 'Sihat: kalori daripada penerangan, laras hidangan, simpan ke log dan padam', langkah: async (t, page) => {
    await masa(page);
    await t.buka('#sihat');
    await t.isi('#shDesc', '2 keping roti canai dan teh tarik');
    await t.klik('#shText button[type=submit]');
    // Model palsu: 3 item, setiap satu 7.5 (dibundarkan pelayan kepada 8 kcal)
    await page.waitForFunction(() => document.querySelectorAll('.sh-items li').length === 3, null, { timeout: 20000 });
    await t.ada('.sh-tot', /^Jumlah24 kcal$/);
    await t.ada('.sh-pend', /Keyakinan: tinggi\./);
    await t.klik('[data-q="0"][data-d="0.5"]');
    await t.ada('.sh-items li:first-child .sh-qty', /^−×1\.5\+$/);
    await t.ada('.sh-tot', /^Jumlah28 kcal$/);
    await t.klik('[data-q="1"][data-d="-0.5"]'); await t.klik('[data-q="1"][data-d="-0.5"]');
    await t.ada('.sh-items li:nth-child(2) .sh-qty', /×0\.5/);   // had minimum 0.5
    await t.klik('[data-q="1"][data-d="0.5"]');
    await t.pilih('#shMeal', 'malam');
    await t.klik('#shSave');
    await t.ada('.toast', /^Disimpan ke log hari ini$/);
    await t.ada('.sh-mh', /^Makan malam$/);
    sama(await page.$$eval('.sh-log li b', x => x.map(b => b.textContent)), ['12', '8', '8'], 'Kalori dalam log');
    pastikan(/×1\.5$/.test(await t.teks('.sh-log li:first-child span')), 'Nama item tidak menunjukkan hidangan ×1.5');
    await t.ada('.sh-today .sh-ring:first-child b', /^28$/);
    sama(await page.$$eval('.sh-macro b', x => x.map(b => b.textContent)), ['26 g', '26 g', '26 g'], 'Makronutrien');
    await t.klik('.sh-log li:last-child [data-del]');
    sama(await page.$$eval('.sh-log li', x => x.length), 2, 'Item selepas padam');
    await page.reload();
    await t.ada('.sh-today .sh-ring:first-child b', /^20$/);
    sama(Object.keys(await storan(page, 'bl_sihat_log')), ['2026-10-10'], 'Log mengikut tarikh');
    await tiadaLimpahan(page);
  } },

  { kumpulan: K, nama: 'Sihat: kalori daripada gambar, batal, dan ralat pelayan', langkah: async (t, page) => {
    await masa(page);
    const badan = []; page.on('request', r => { if (r.url() === 'https://fiqh.bijaklabur.my/kalori' && r.method() === 'POST') badan.push(JSON.parse(r.postData())); });
    await t.buka('#sihat');
    await page.setInputFiles('#shPick', { name: 'makan.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForFunction(() => document.querySelectorAll('.sh-items li').length === 3, null, { timeout: 20000 });
    pastikan(await page.$eval('.sh-pend img', i => i.src.startsWith('data:image/jpeg')), 'Pratonton gambar');
    sama([badan[0].mime, /^\/9j\//.test(badan[0].image)], ['image/jpeg', true], 'Gambar dikecilkan ke JPEG sebelum dihantar');
    await t.klik('#shCancel');
    sama(await t.teks('#shPending'), '', 'Pratonton dibatalkan');
    // Teks terlalu pendek tidak dihantar
    await t.isi('#shDesc', 'ab'); await t.klik('#shText button[type=submit]');
    await t.rehat(200); sama(badan.length, 1, 'Permintaan untuk teks pendek');
    await page.route('https://fiqh.bijaklabur.my/kalori', r => r.request().method() === 'POST' ? json(r, 502, { error: 'Analisis kalori tidak tersedia buat masa ini.' }) : r.fallback());
    await t.isi('#shDesc', 'nasi lemak ayam goreng');
    await t.klik('#shText button[type=submit]');
    await t.ada('#shErr', /^Analisis kalori tidak tersedia buat masa ini\.$/);
    sama(await t.teks('#shPending'), '', 'Tiada hasil selepas ralat');
  } },

  { kumpulan: K, nama: 'Sihat: profil (Mifflin-St Jeor, BMI), langkah manual dan sesi berjalan', lebar: 1280, langkah: async (t, page) => {
    await masa(page);
    await t.buka('#sihat');
    // Lalai: lelaki 21 tahun, 165 cm, 60 kg, aktiviti ringan => BMR 1,531, TDEE 2,105
    await t.ada('#shProf .field:last-child span', /^Kalori asas \(BMR\) 1,531 kcal · keperluan harian 2,105 kcal/);
    await t.pilih('#pJ', 'p'); await t.isi('#pU', '25'); await t.isi('#pT', '160'); await t.isi('#pB', '55');
    await t.pilih('#pA', '1.55'); await t.pilih('#pM', 'turun');
    await t.klik('#shProf button[type=submit]');
    await t.ada('.toast', /^Profil disimpan$/);
    // BMR = 10(55) + 6.25(160) - 5(25) - 161 = 1,264; TDEE = 1,264 x 1.55 = 1,959; sasaran turun berat = 1,459; BMI = 21.5
    await t.ada('#shProf .field:last-child span', /^Kalori asas \(BMR\) 1,264 kcal · keperluan harian 1,959 kcal/);
    await t.ada('.sh-prof summary span', /^BMI 21\.5 · Normal \(piawaian Asia\)$/);
    await t.ada('.sh-today .sh-ring:first-child p', /^Sasaran 1,459 · baki 1,459 \(termasuk 0 dibakar\)$/);
    // Langkah manual: 5,000 langkah x 0.664 m = 3.3 km; dibakar 5,000 x 0.04 x 55/70 = 157 kcal
    await t.isi('#shMan', '5000');
    await t.klik('#shManual button[type=submit]');
    await t.ada('.toast', /^Langkah disimpan$/);
    await t.ada('.sh-today .sh-ring:nth-child(2) b', /^5,000$/);
    await t.ada('.sh-today .sh-ring:nth-child(2) p', /^Sasaran 8,000 · 3\.3 km$/);
    await t.ada('.sh-today .sh-ring:first-child p', /^Sasaran 1,459 · baki 1,616 \(termasuk 157 dibakar\)$/);
    sama(await page.$$eval('.sh-week .sh-col', x => x.length), 7, 'Carta 7 hari');
    // Nilai negatif ditolak oleh borang
    await t.isi('#shMan', '-50');
    await t.klik('#shManual button[type=submit]');
    await t.ada('.sh-today .sh-ring:nth-child(2) b', /^5,000$/);
    // Sesi berjalan tanpa kebenaran lokasi
    await t.klik('#shStart');
    await t.ada('#shWalk', /langkah sesi ini · 0\.00 km/);
    await t.ada('#shWalk', /GPS: (tiada kebenaran lokasi|mencari isyarat)/);
    await t.klik('#shStop');
    await t.ada('.toast', /^Tiada langkah dikesan$/);
    await page.reload();
    await t.ada('.sh-prof summary span', /^BMI 21\.5/);
  } }
];

/* Klik dan pilih dengan had masa pendek dan nama pemilih dalam mesej ralat, supaya kegagalan cepat dikesan */
const sedia = (t, page) => ({ ...t,
  // Elemen dibawa ke tengah skrin dahulu: bar tab bawah boleh menutup butang di hujung skrin dan melambatkan klik
  klik: async sel => {
    try { const el = await page.waitForSelector(sel, { timeout: 8000 }); await el.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' })); await el.click({ timeout: 8000 }); }
    catch (e) { throw new Error(`klik ${sel}: ${e.message.split('\n')[0]}`); }
  },
  pilih: (sel, v) => page.selectOption(sel, v, { timeout: 8000 }).catch(e => { throw new Error(`pilih ${sel}: ${e.message.split('\n')[0]}`); }) });
// UJI_UKUR=1: cetak langkah yang mengambil masa lebih 250 ms (untuk mencari kes yang perlahan)
const ukur = (t, page) => { if (!process.env.UJI_UKUR) return sedia(t, page); const x = sedia(t, page), t0 = Date.now(); let l = t0;
  return Object.fromEntries(Object.entries(x).map(([n, f]) => [n, async (...a) => { const r = await f(...a); const now = Date.now(); if (now - l > 250) console.log(`   ${now - l}ms ${n} ${String(a[0]).slice(0, 60)}`); l = now; return r; }])); };
export default KES.map(k => ({ ...k, langkah: (t, page) => k.langkah(ukur(t, page), page) }));
