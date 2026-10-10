/* SiswaCap: ujian hujung ke hujung kumpulan Umum.
   Pasaran (kripto, saham, saringan Syariah, buku pesanan, amaran harga), Belajar (Akademi, pelajaran, kalkulator, kuiz),
   Jadual UiTM dan Studio Skrin Kunci, Jejak Aktiviti dan peta (peta.html), Komuniti, Ruang soalan, menu titik tiga,
   palet arahan dan halaman utama (pentas Sinema, pameran).
   Semua WebSocket dipalsukan (tiada rangkaian sebenar) dan GPS dipalsukan supaya keputusan sentiasa sama.
   Jalankan: NODE_PATH=$(npm root -g) node scripts/uji-alat/jalan.mjs umum */
import { readFile } from 'node:fs/promises';
import { crc32 } from 'node:zlib';

const K = 'Umum';

/* ---------- Pembantu ---------- */
const gagal = m => { throw new Error(m); };
const sama = (dapat, jangka, label) => { if (JSON.stringify(dapat) !== JSON.stringify(jangka)) gagal(`${label}: dijangka ${JSON.stringify(jangka)}, dapat ${JSON.stringify(dapat)}`); };
const padan = (teks, re, label) => { if (!re.test(teks)) gagal(`${label}: "${String(teks).trim().slice(0, 200)}" tidak sepadan ${re}`); };
const bil = (page, sel) => page.$$eval(sel, x => x.length);
const nilai = (page, sel) => page.$eval(sel, e => e.value);
const storan = (page, k) => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, k);
const klip = page => page.evaluate(() => navigator.clipboard.readText());
const rx = s => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const RM = n => 'RM' + n.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Semua WebSocket dipalsukan: sambungan "terbuka" tanpa data, tiada rangkaian sebenar. pada(ws) untuk menghantar mesej sendiri.
const wsPalsu = (page, pada) => page.routeWebSocket(/./, ws => { if (pada) pada(ws); });
// Luar talian sebenar: setiap WebSocket gagal disambung (error kemudian close), seperti apabila internet tiada
const wsGagal = page => page.addInitScript(() => {
  window.WebSocket = class {
    constructor(u) { this.url = u; this.readyState = 0; setTimeout(() => { if (this.readyState === 3) return; this.readyState = 3; this.onerror && this.onerror(new Event('error')); this.onclose && this.onclose(new Event('close')); }, 30); }
    send() {} close() { this.readyState = 3; }
  };
});
// GPS palsu: window.__gps({ lat, lng, acc, alt, ts }) menghantar kedudukan kepada setiap pemerhati; window.__gpsRalat(kod)
const gpsPalsu = page => page.addInitScript(() => {
  const ok = new Map(), er = new Map(); let id = 0, akhir = null;
  const pos = p => ({ coords: { latitude: p.lat, longitude: p.lng, accuracy: p.acc ?? 5, altitude: p.alt ?? null, altitudeAccuracy: p.alt == null ? null : 3, speed: p.speed ?? null, heading: null }, timestamp: p.ts ?? Date.now() });
  const geo = {
    watchPosition(a, b) { ok.set(++id, a); if (b) er.set(id, b); if (akhir) setTimeout(() => a(akhir), 0); return id; },
    clearWatch(i) { ok.delete(i); er.delete(i); },
    getCurrentPosition(a, b) { if (akhir) setTimeout(() => a(akhir), 0); else if (b) setTimeout(() => b({ code: 2 }), 0); }
  };
  Object.defineProperty(Navigator.prototype, 'geolocation', { configurable: true, get: () => geo });
  window.__gps = p => { akhir = pos(p); ok.forEach(f => f(akhir)); };
  window.__gpsRalat = kod => er.forEach(f => f({ code: kod, message: 'ujian' }));
  window.__gpsBil = () => ok.size;
});
// Gerakan dikurangkan: tatal lancar (scroll-behavior: smooth) membuatkan Playwright menunggu kira-kira 2 saat
// untuk setiap butang di bawah skrin; kes yang banyak menekan butang sedemikian memaparkan tanpa gerakan
const tanpaGerak = page => page.emulateMedia({ reducedMotion: 'reduce' });
// Muat turun: klik dan pulangkan { nama, data }
async function muatTurun(page, klik) {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), klik()]);
  return { nama: d.suggestedFilename(), data: await readFile(await d.path()) };
}
// Saiz gambar JPEG daripada penanda SOF
function saizJpeg(b) {
  if (b[0] !== 0xFF || b[1] !== 0xD8) gagal('Bukan fail JPEG');
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xC0 && m <= 0xC3) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    i += 2 + len;
  }
  gagal('Penanda SOF JPEG tidak dijumpai');
}
// Senarai fail dalam ZIP (direktori pusat) dengan semakan CRC setiap fail
function bacaZip(b) {
  const e = b.length - 22;
  sama(b.readUInt32LE(e), 0x06054b50, 'Tandatangan akhir ZIP');
  const n = b.readUInt16LE(e + 10), out = [];
  let p = b.readUInt32LE(e + 16);
  for (let k = 0; k < n; k++) {
    sama(b.readUInt32LE(p), 0x02014b50, 'Tandatangan direktori pusat ZIP');
    const crc = b.readUInt32LE(p + 16), size = b.readUInt32LE(p + 20), nl = b.readUInt16LE(p + 28), off = b.readUInt32LE(p + 42);
    const nama = b.toString('utf8', p + 46, p + 46 + nl);
    sama(b.readUInt32LE(off), 0x04034b50, 'Pengepala setempat ZIP ' + nama);
    const data = b.subarray(off + 30 + b.readUInt16LE(off + 26), off + 30 + b.readUInt16LE(off + 26) + size);
    sama(crc32(data) >>> 0, crc, 'CRC ' + nama);
    out.push({ nama, data });
    p += 46 + nl + b.readUInt16LE(p + 30) + b.readUInt16LE(p + 32);
  }
  return out;
}
// Jarak haversine (meter), sama seperti js/jejak.js
const hav = (a, b) => { const R = 6371000, r = x => x * Math.PI / 180, dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const tarikhKL = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
const jsonRes = (status, v) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization, x-kunci-pemilik', 'access-control-allow-methods': 'GET, POST, OPTIONS' } });
// Permintaan preflight CORS (jika sampai ke fixture) dijawab terus
const cors = f => (u, req) => req.method() === 'OPTIONS' ? jsonRes(200, {}) : f(u, req);
const badan = req => { try { return req.postDataJSON() || {}; } catch { return {}; } };
// Gambar PNG 8x8 biru (foto latar skrin kunci, gambar servis)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNQTX6NFTEMLQkADGRcwcht3uAAAAAASUVORK5CYII=', 'base64');

/* ---------- Data contoh: pelayan jadual UiTM (worker-jadual) ---------- */
const sl = (d, s, e, room) => ({ d, s, e, room, mode: 'F2F' });
const JD = {
  campuses: [{ id: 'A', text: 'KAMPUS ALOR GAJAH' }, { id: 'B', text: 'KAMPUS SHAH ALAM' }, { id: 'D', text: 'KAMPUS MACHANG' }],
  faculties: [{ id: 'CS', text: 'FAKULTI SAINS KOMPUTER DAN MATEMATIK' }, { id: 'BM', text: 'FAKULTI PENGURUSAN PERNIAGAAN' }],
  courses: [
    { code: 'CSC584', name: 'ENTERPRISE PROGRAMMING' }, { code: 'ITS662', name: 'DATA MINING' }, { code: 'CSC577', name: 'SOFTWARE ENGINEERING PROJECT' },
    { code: 'ISP550', name: 'INFORMATION SYSTEMS SECURITY' }, { code: 'CTU554', name: 'VALUES AND CIVILISATION II' }
  ],
  groups: {
    CSC584: [{ group: 'CS2305A', slots: [sl(1, 480, 600, 'BK 1'), sl(3, 840, 960, 'MAKMAL KOMPUTER 6')] }, { group: 'CS2305B', slots: [sl(2, 480, 600, 'BK 2')] }],
    ITS662: [{ group: 'CS2305A', slots: [sl(1, 660, 780, 'DK 3'), sl(4, 540, 660, 'MAKMAL KOMPUTER 2')] }],
    // CS2305B bertindih dengan CSC584 CS2305A pada hari Isnin (9:00 hingga 11:00)
    CSC577: [{ group: 'CS2305A', slots: [sl(2, 600, 720, 'BK 4')] }, { group: 'CS2305B', slots: [sl(1, 540, 660, 'BK 5')] }],
    ISP550: [{ group: 'CS2305A', slots: [sl(2, 840, 960, 'DK 1')] }],
    CTU554: [{ group: 'CS2305A', slots: [sl(5, 510, 630, 'DKP 2')] }]
  }
};
const JD_PELAJAR = { items: [
  { course: 'CSC584', name: 'ENTERPRISE PROGRAMMING', group: 'CS2305A', slots: JD.groups.CSC584[0].slots },
  { course: 'ISP550', name: 'INFORMATION SYSTEMS SECURITY', group: 'CS2305A', slots: JD.groups.ISP550[0].slots },
  { course: 'CTU554', name: 'VALUES AND CIVILISATION II', group: 'CS2305A', slots: JD.groups.CTU554[0].slots }
], dates: [] };
const jadualApi = u => {
  const url = new URL(u), q = url.searchParams, p = url.pathname;
  if (p === '/campuses') return JD.campuses;
  if (p === '/faculties') return JD.faculties;
  if (p === '/courses') return q.get('campus') === 'B' && q.get('faculty') === 'CS' ? JD.courses : [];
  if (p === '/groups') return JD.groups[q.get('course')] ? JD.groups[q.get('course')] : jsonRes(404, { error: `Kursus ${q.get('course')} tiada dalam jadual kampus ini.` });
  if (p === '/timetable') {
    const items = [], missing = [];
    for (const [course, group] of (q.get('pick') || '').split(',').map(x => x.split('.'))) {
      const c = JD.courses.find(x => x.code === course), g = (JD.groups[course] || []).find(x => x.group === group);
      if (c && g) items.push({ course, name: c.name, group, slots: g.slots }); else missing.push({ course, group, why: c ? 'kumpulan' : 'kursus' });
    }
    return { session: '20264', label: 'Okt 2026 hingga Feb 2027', items, missing };
  }
  if (p === '/pelajar') return q.get('id') === '2023123456' ? JD_PELAJAR : jsonRes(404, { error: 'Tiada jadual dijumpai untuk No. Pelajar ini. Semak nombornya, atau cuba lagi selepas pendaftaran kursus disahkan.' });
  return jsonRes(404, { error: 'Tidak dijumpai' });
};
// Jadual tersimpan (bl_jadual) untuk ujian paparan, eksport dan skrin kunci
const JADUAL_SIMPAN = {
  campus: 'B', campusName: 'KAMPUS SHAH ALAM', faculty: 'CS', label: 'Sesi Okt 2026 hingga Feb 2027', session: '20264', updated: 1760000000000, demo: false,
  items: [
    { course: 'CSC584', name: 'ENTERPRISE PROGRAMMING', group: 'CS2305A', slots: JD.groups.CSC584[0].slots },
    { course: 'ITS662', name: 'DATA MINING', group: 'CS2305A', slots: JD.groups.ITS662[0].slots },
    { course: 'ISP550', name: 'INFORMATION SYSTEMS SECURITY', group: 'CS2305A', slots: JD.groups.ISP550[0].slots },
    { course: 'CTU554', name: 'VALUES AND CIVILISATION II', group: 'CS2305A', slots: JD.groups.CTU554[0].slots }
  ]
};
JADUAL_SIMPAN.picks = JADUAL_SIMPAN.items.map(i => ({ course: i.course, group: i.group }));

/* ---------- Data contoh: Komuniti (worker/src/komuniti.js) ---------- */
const KM = { mesej: [], siar: [], tetapan: null, lokasi: [] };
const KM_PROFIL = { uid: 'uji-u1', nama: 'Ali Bin Abu', uni: 'UiTM', warna: '#2563EB', kod: '7KQ2MX', privasi: 'tutup', pilihan: [], notif: { rakan: true, mesej: true, minat: true, acara: false }, streak: 3 };
const kmApi = (u, req) => {
  const op = new URL(u).pathname.split('/').pop(), b = badan(req), now = Math.floor(Date.now() / 1000);
  if (req.headers().authorization !== 'Bearer token-uji') return jsonRes(401, { error: 'Sila log masuk dahulu.' });
  const oleh = (nama, warna) => ({ nama, warna });
  const ACARA = [
    { id: 11, jenis: 'acara', tajuk: 'Karnival Usahawan Siswa', tarikh: '2026-10-20T09:00', tempat: 'Dewan Agung Tuanku Canselor', teks: 'Gerai jualan pelajar dan bengkel pemasaran digital.', uni: 'UiTM', oleh: oleh('Kelab Usahawan', '#0E7C66'), t: now - 3600 },
    { id: 12, jenis: 'memo', tajuk: 'Perpustakaan tutup awal', teks: 'Perpustakaan Tun Abdul Razak tutup jam 5 petang pada hari Jumaat ini.', uni: 'UiTM', oleh: oleh('Pentadbiran', '#475569'), t: now - 7200 }
  ];
  const SERVIS = [
    { id: 21, jenis: 'tawar', kategori: 'tuisyen', tajuk: 'Tuisyen Kalkulus asas', harga: 2500, teks: 'Dua jam seminggu di perpustakaan.', uni: 'UiTM', kampus: 'Shah Alam', oleh: oleh('Siti Nurhaliza', '#DB2777'), uid: 'u2', t: now - 600, status: 'buka', minat: 2 },
    { id: 22, jenis: 'tawar', kategori: 'reka', tajuk: 'Reka poster program kelab', harga: null, teks: 'Siap dalam dua hari.', uni: 'UiTM', kampus: 'Shah Alam', oleh: oleh('Hakim', '#7C3AED'), uid: 'u4', t: now - 900, status: 'buka', minat: 0 },
    { id: 23, jenis: 'tawar', kategori: 'tulis', tajuk: 'Semak tatabahasa laporan', harga: 0, teks: 'Percuma untuk rakan sefakulti.', uni: 'UiTM', kampus: 'Shah Alam', oleh: oleh('Aina', '#0891B2'), uid: 'u5', t: now - 1200, status: 'buka', minat: 1 }
  ];
  switch (op) {
    case 'saya': KM.mesej = []; KM.siar = []; KM.tetapan = null; KM.lokasi = []; return { profil: KM_PROFIL, belum: 2 };
    case 'peta': return { rakan: [{ uid: 'u2', nama: 'Siti Nurhaliza', uni: 'UM', warna: '#DB2777', streak: 4, lokasi: { lat: 3.0731, lng: 101.4915, t: now - 300 } }], masuk: [{ uid: 'u3', nama: 'Fazli Hakim', uni: 'UKM', warna: '#EA580C' }], keluar: [], saya: null };
    case 'senarai':
      if (b.bahagian === 'acara') return { senarai: ACARA.filter(h => !b.jenis || h.jenis === b.jenis) };
      return { senarai: SERVIS.filter(h => h.jenis === b.jenis && (!b.kategori || h.kategori === b.kategori) && (!b.q || h.tajuk.toLowerCase().includes(String(b.q).toLowerCase()))) };
    case 'tambah': return b.kod === 'ABC234' ? { status: 'menunggu', nama: 'Hakim' } : jsonRes(404, { error: 'Kod rakan tidak dijumpai.' });
    case 'jawab': case 'batal': case 'lapor': case 'buang': case 'sekat': return { ok: true };
    case 'minat': return { uid: 'u2' };
    case 'sembang': return { dengan: { nama: 'Siti Nurhaliza', warna: '#DB2777' }, mesej: KM.mesej.filter(m => m.id > (b.selepas || 0)) };
    case 'hantar': KM.mesej.push({ id: KM.mesej.length + 1, teks: b.teks, saya: true, t: now }); return { ok: true };
    case 'siar': if (!b.tajuk || b.tajuk.length < 4) return jsonRes(400, { error: 'Tajuk terlalu pendek.' }); KM.siar.push(b); return { ok: true, id: 30 };
    case 'notif': return { senarai: [{ jenis: 'rakan', rujuk: 'u3', teks: 'Fazli Hakim mahu menjadi rakan anda.', t: now - 60, baca: false }] };
    case 'perbualan': return { senarai: [] };
    case 'ringkas': return { belum: 0 };
    case 'tetapan': KM.tetapan = b; return { profil: { ...KM_PROFIL, ...b } };
    case 'lokasi': KM.lokasi.push(b); return { ok: true };
    default: return jsonRes(404, { error: 'Tidak dijumpai' });
  }
};
// Firebase palsu (pengguna sudah log masuk dengan e-mel), dihidang sebagai js/vendor/firebase-*-compat.js
const FIREBASE_PALSU = `window.firebase = (() => {
  const user = { uid: 'uji-u1', displayName: 'Ali Bin Abu', email: 'ali@contoh.my', phoneNumber: '', providerData: [{ providerId: 'password' }], getIdToken: async () => 'token-uji' };
  const auth = { languageCode: '', currentUser: user, getRedirectResult: async () => null, onAuthStateChanged(cb) { setTimeout(() => cb(user), 0); return () => {}; }, signOut: async () => {} };
  return { initializeApp() {}, auth: Object.assign(() => auth, { GoogleAuthProvider: class {}, FacebookAuthProvider: class {}, EmailAuthProvider: { credential() {} } }) };
})();`;
async function logMasuk(page) {
  await page.route('**/js/vendor/firebase-app-compat.js', r => r.fulfill({ contentType: 'text/javascript', body: FIREBASE_PALSU }));
  await page.route('**/js/vendor/firebase-auth-compat.js', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
}

/* ---------- Data contoh: Peta Jalan (Nominatim, OSRM, Open-Meteo, Aladhan) ---------- */
const A = [3.0716, 101.4902], B = [3.0788, 101.4902], C = [3.0788, 101.5047];
const TEMPAT = [
  { lat: '3.0788', lon: '101.5047', name: 'Masjid Sultan Salahuddin Abdul Aziz Shah', display_name: 'Masjid Sultan Salahuddin Abdul Aziz Shah, Persiaran Masjid, Shah Alam, Selangor, Malaysia', type: 'place_of_worship', category: 'amenity', address: { road: 'Persiaran Masjid', city: 'Shah Alam', state: 'Selangor', country: 'Malaysia' } },
  { lat: '3.0690', lon: '101.4990', name: 'Surau Al-Hidayah', display_name: 'Surau Al-Hidayah, Seksyen 2, Shah Alam, Selangor, Malaysia', type: 'place_of_worship', category: 'amenity', address: { suburb: 'Seksyen 2', city: 'Shah Alam', state: 'Selangor', country: 'Malaysia' } }
];
const laluanOsrm = (dist, dur) => ({
  distance: dist, duration: dur, geometry: { type: 'LineString', coordinates: [A, B, C].map(p => [p[1], p[0]]) },
  legs: [{ steps: [
    { maneuver: { type: 'depart', bearing_after: 0, location: [A[1], A[0]] }, name: 'Jalan Ilmu', distance: 800, duration: 120 },
    { maneuver: { type: 'turn', modifier: 'right', location: [B[1], B[0]] }, name: 'Persiaran Masjid', distance: 1600, duration: dur - 120 },
    { maneuver: { type: 'arrive', modifier: 'left', location: [C[1], C[0]] }, name: '', distance: 0, duration: 0 }
  ] }]
});

/* ---------- Fixture tambahan ---------- */
export const fixture = [
  // Binance: pasangan USDT yang tidak wujud dijawab 400 seperti pelayan sebenar
  [/^https:\/\/data-api\.binance\.vision\/api\/v3\/ticker\/price\?symbol=/, u => {
    const s = new URL(u).searchParams.get('symbol');
    return /^(BTC|ETH|SOL|BNB|XRP|DOGE|ADA|LINK|AVAX|PEPE)USDT$/.test(s) ? { symbol: s, price: '1.00' } : jsonRes(400, { code: -1121, msg: 'Invalid symbol.' });
  }],
  // CoinGecko (sandaran apabila Binance tidak dapat dihubungi). Simbol "had" meniru had kadar 429 sebenar (badan JSON).
  [/^https:\/\/api\.coingecko\.com\/api\/v3\/simple\/price/, () => ({ bitcoin: { usd: 64000, usd_24h_change: -2.5 }, ethereum: { usd: 3100, usd_24h_change: 1.1 }, solana: { usd: 150, usd_24h_change: 0.5 } })],
  // Harga saham halaman utama (worker-nota /saham)
  [/^https:\/\/nota\.bijaklabur\.my\/saham/, () => ({ quotes: [
    { s: 'AAPL', price: 230.5, chg: 0.85, spark: [228, 229, 230], time: Math.floor(Date.now() / 1000) - 30 },
    { s: 'NVDA', price: 120.25, chg: -1.4, spark: [123, 121, 120], time: Math.floor(Date.now() / 1000) - 30 },
    { s: 'TSLA', price: 250, chg: 2, spark: [], time: Math.floor(Date.now() / 1000) - 30 },
    { s: 'MSFT', price: 410.1, chg: 0.1, spark: [], time: Math.floor(Date.now() / 1000) - 30 },
    { s: 'GOOGL', price: 160.3, chg: -0.3, spark: [], time: Math.floor(Date.now() / 1000) - 30 }
  ] })],
  // Ruang soalan (worker-nota /tanya): "HADUJI" meniru had 429, "PELAYANUJI" meniru e-mel gagal (502)
  [/^https:\/\/nota\.bijaklabur\.my\/tanya/, cors((u, req) => {
    const b = badan(req);
    if (/HADUJI/.test(b.teks || '')) return jsonRes(429, { error: 'Terlalu banyak soalan dalam masa singkat. Cuba lagi sebentar.' });
    if (/PELAYANUJI/.test(b.teks || '')) return jsonRes(502, { error: 'E-mel tidak dapat dihantar sekarang.' });
    globalThis.__tanyaAkhir = b;
    return { ok: true };
  })],
  [/^https:\/\/jadual\.bijaklabur\.my\//, u => jadualApi(u)],
  [/^https:\/\/bijak-labur-premium\.khanz-amir\.workers\.dev\/komuniti\//, cors(kmApi)],
  [/^https:\/\/bijak-labur-premium\.khanz-amir\.workers\.dev\/akaun\/sesi/, cors(() => ({ trialUsed: true, plan: null, exp: 0, switchesLeft: 3 }))],
  // Peta Jalan: "luartalian" meniru carian gagal
  [/^https:\/\/nominatim\.openstreetmap\.org\/search/, u => /luartalian/.test(u) ? jsonRes(503, {}) : TEMPAT],
  [/^https:\/\/nominatim\.openstreetmap\.org\/reverse/, () => ({ name: '', display_name: 'Jalan Ilmu 1/1, Shah Alam, Selangor, Malaysia', address: { road: 'Jalan Ilmu 1/1', city: 'Shah Alam', state: 'Selangor', country: 'Malaysia' } })],
  [/^https:\/\/routing\.openstreetmap\.de\/routed-car\/route\/v1\//, () => ({ code: 'Ok', routes: [laluanOsrm(2400, 420), laluanOsrm(2600, 540)] })],
  [/^https:\/\/api\.open-meteo\.com\/v1\/forecast/, () => ({ current: { temperature_2m: 31.4, weather_code: 2, wind_speed_10m: 9.2 } })],
  [/^https:\/\/api\.aladhan\.com\/v1\/timings/, () => ({ data: { timings: { Fajr: '05:41 (+08)', Dhuhr: '13:02 (+08)', Asr: '16:12 (+08)', Maghrib: '19:08 (+08)', Isha: '20:17 (+08)' } } })]
];

/* ======================================================================= */
export default [
  /* ---------------- PASARAN ---------------- */
  { kumpulan: K, nama: 'Pasaran: harga kripto REST, status Syariah dengan sebab dan sumber, tukar carta', langkah: async (t, page) => {
    await wsPalsu(page);
    const minta = [];
    page.on('request', r => minta.push(r.url()));
    await t.buka('#pasaran');
    await t.ada('#cryptoStatus', /^Masa nyata$/);
    sama(await bil(page, '#cryptoTicker .qrow'), 8, 'Bilangan kripto lalai');
    await t.ada('#c-BTC .q-price', /^\$65,000\.00$/);
    await t.ada('#c-BTC .q-chg', /^\+1\.25%$/);
    await page.waitForSelector('#c-BTC .spark polyline');
    // Lencana Syariah: SC (patuh), Sharlife (diragui)
    padan(await t.teks('#c-BTC .q-sym'), /Patuh Syariah/, 'Lencana BTC');
    padan(await t.teks('#c-DOGE .q-sym'), /Diragui/, 'Lencana DOGE');
    padan(await t.teks('#c-BNB .q-sym'), /Belum disaring/, 'Lencana BNB');
    // Senarai sebab: aset carta dahulu, dengan sebab dan pautan sumber
    padan(await t.teks('#syInfo .sy-why:first-child'), /BTC.*Patuh Syariah.*mesyuarat MPS ke-234 \(20 Julai 2020\)/s, 'Sebab BTC');
    sama(await page.$eval('#syInfo .sy-why:first-child a', a => a.href), 'https://www.sc.com.my/digital-assets', 'Sumber BTC');
    const doge = await page.$eval('#syInfo', el => [...el.querySelectorAll('.sy-why')].find(li => li.querySelector('b').textContent === 'DOGE').textContent);
    padan(doge, /Sharlife.*gharar/s, 'Sebab DOGE');
    sama(await bil(page, '#syInfo .sy-why'), 8, 'Sebab untuk setiap kripto');
    padan(await t.teks('#syInfo'), /Disemak 3 Oktober 2026/, 'Tarikh semakan');
    // Carta: lilin dimuat, tukar aset dan tempoh
    await page.waitForSelector('#cryptoChart canvas');
    await t.klik('#c-ETH');
    await t.ada('#chartTitle', /^ETH\/USDT$/);
    await t.ada('#obTitle', /^ETH\/USDT$/);
    padan(await t.teks('#syInfo .sy-why:first-child b'), /^ETH$/, 'Aset carta di atas senarai sebab');
    sama(await page.$eval('#c-ETH', e => e.classList.contains('sel')), true, 'Baris terpilih ditanda');
    await t.klik('#tfTabs [data-tf="1d"]');
    await page.waitForFunction(() => document.querySelector('#tfTabs [data-tf="1d"]').classList.contains('active'));
    await t.rehat(300);
    if (!minta.some(u => /klines\?symbol=ETHUSDT&interval=1d&limit=300/.test(u))) gagal('Carta harian ETH tidak diminta');
    // Halaman utama memaparkan 5 kripto pertama dengan harga yang sama
    sama(await bil(page, '#homeTicker .qrow'), 5, 'Kripto di halaman utama');
  } },

  { kumpulan: K, nama: 'Pasaran: aliran WebSocket mengemas kini harga dan mencetuskan amaran harga dan % (Premium)', langkah: async (t, page) => {
    await tanpaGerak(page);
    let strim = null;
    await wsPalsu(page, ws => { if (/miniTicker/.test(ws.url())) strim = ws; });
    await t.buka('#pasaran');
    await t.ada('#c-BTC .q-price', /\$65,000\.00/);
    padan(await t.teks('#alNote'), /^Premium: amaran tanpa had/, 'Nota amaran Premium');
    // Amaran naik 5% (Premium) dan amaran harga melebihi
    await t.pilih('#alSym', 'BTC'); await t.pilih('#alDir', 'up');
    sama(await page.$eval('#alPrice', e => e.placeholder), 'Peratus (%)', 'Pemegang tempat peratus');
    await t.isi('#alPrice', '5'); await t.klik('#alForm button[type=submit]');
    await t.ada('#alList', /BTC naik sekurang-kurangnya 5% dalam 24 jam/);
    await t.pilih('#alDir', 'above'); await t.isi('#alPrice', '69000'); await t.klik('#alForm button[type=submit]');
    await t.ada('#alList', /BTC melebihi \$69,000\.00/);
    // Amaran ETH di bawah 3000 tidak sepatutnya tercetus
    await t.pilih('#alSym', 'ETH'); await t.pilih('#alDir', 'below'); await t.isi('#alPrice', '3000'); await t.klik('#alForm button[type=submit]');
    await page.waitForFunction(() => document.querySelectorAll('#alList .alert-item').length === 3);
    sama((await storan(page, 'bl_alerts')).length, 3, 'Amaran disimpan');
    if (!strim) gagal('WebSocket miniTicker tidak dibuka');
    strim.send(JSON.stringify({ stream: 'btcusdt@miniTicker', data: { e: '24hrMiniTicker', s: 'BTCUSDT', c: '70000.00', o: '65000.00' } }));
    strim.send(JSON.stringify({ stream: 'ethusdt@miniTicker', data: { e: '24hrMiniTicker', s: 'ETHUSDT', c: '3200.00', o: '3100.00' } }));
    await t.ada('#c-BTC .q-price', /^\$70,000\.00$/);
    await t.ada('#c-BTC .q-chg', /^\+7\.69%$/);   // (70000 / 65000 - 1) x 100
    await t.ada('#c-ETH .q-chg', /^\+3\.23%$/);
    await t.ada('#h-BTC .q-price', /^\$70,000\.00$/);
    await t.ada('.toast', /BTC melebihi \$69,000\.00\. Harga semasa \$70,000\.00/);
    await page.waitForFunction(() => document.querySelectorAll('#alList .alert-item').length === 1);
    padan(await t.teks('#alList'), /ETH di bawah \$3,000\.00/, 'Amaran ETH kekal');
    sama((await storan(page, 'bl_alerts')).length, 1, 'Amaran tercetus dibuang daripada storan');
    // Buang amaran secara manual
    await t.klik('#alList [data-ai="0"]');
    sama(await bil(page, '#alList .alert-item'), 0, 'Senarai amaran kosong');
  } },

  { kumpulan: K, nama: 'Pasaran: amaran percuma terhad 3 dan amaran % dikunci (tanpa Premium)', premium: false, langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#pasaran');
    await t.ada('#alNote', /^Percuma: sehingga 3 amaran harga/);
    await t.klik('#alForm button[type=submit]');
    await t.ada('.toast', /^Masukkan harga sasaran\.$/);
    await t.pilih('#alDir', 'down'); await t.isi('#alPrice', '10'); await t.klik('#alForm button[type=submit]');
    await t.ada('.toast', /^Amaran naik atau turun % ialah ciri Premium\.$/);
    await t.pilih('#alDir', 'above');
    for (const p of ['70000', '71000', '72000']) { await t.isi('#alPrice', p); await t.klik('#alForm button[type=submit]'); await t.ada('.toast', /Amaran ditambah/); }
    sama(await bil(page, '#alList .alert-item'), 3, 'Tiga amaran percuma');
    await t.isi('#alPrice', '73000'); await t.klik('#alForm button[type=submit]');
    await t.ada('.toast', /^Had percuma 3 amaran\./);
    sama(await bil(page, '#alList .alert-item'), 3, 'Amaran keempat ditolak');
  } },

  { kumpulan: K, nama: 'Pasaran: amaran status Syariah berubah (Premium) dan simbol tambah/buang', storan: { bl_syLast: { BTC: 'belum', DOGE: 'patuh', ETH: 'patuh' } }, langkah: async (t, page) => {
    await tanpaGerak(page);
    await wsPalsu(page);
    const toasts = [];
    await page.exposeFunction('__catatToast', s => toasts.push(s));
    await page.addInitScript(() => new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('toast')) window.__catatToast(n.textContent); }))).observe(document, { childList: true, subtree: true }));
    await t.buka('#pasaran');
    await t.rehat(300);
    if (!toasts.some(x => /Status Syariah DOGE berubah\. Patuh Syariah kepada Diragui\./.test(x))) gagal('Amaran status Syariah DOGE tiada: ' + JSON.stringify(toasts));
    if (!toasts.some(x => /Status Syariah BTC berubah\. Belum disaring kepada Patuh Syariah\./.test(x))) gagal('Amaran status Syariah BTC tiada');
    if (toasts.some(x => /Status Syariah ETH/.test(x))) gagal('ETH tidak berubah tetapi diumumkan');
    sama((await storan(page, 'bl_syLast')).DOGE, 'ragu', 'Status terakhir dikemas kini');
    // Tambah simbol: huruf kecil dan akhiran USDT dibersihkan
    await t.isi('#addSym', 'avax/usdt'); await t.klik('#addSymForm button[type=submit]');
    await t.ada('.toast', /^AVAX ditambah$/);
    await page.waitForSelector('#c-AVAX');
    padan(await t.teks('#c-AVAX .q-sym'), /Patuh Syariah/, 'AVAX diluluskan MPS SC');
    sama((await storan(page, 'bl_cryptoSyms')).slice(-1)[0], 'AVAX', 'Simbol disimpan');
    sama(await page.$$eval('#alSym option', o => o.map(x => x.textContent).includes('AVAX')), true, 'AVAX dalam pilihan amaran');
    await t.isi('#addSym', 'btc'); await t.klik('#addSymForm button[type=submit]');
    await t.ada('.toast', /^BTC sudah ada dalam senarai\.$/);
    await t.isi('#addSym', 'zzzq'); await t.klik('#addSymForm button[type=submit]');
    await t.ada('.toast', /^ZZZQ tidak ditemui sebagai pasangan USDT\.$/);
    // Mod edit: buang DOGE; carta beralih jika aset carta dibuang
    await t.klik('#editList'); await t.ada('#editList', /^Selesai$/);
    await t.klik('#c-BTC [data-del="BTC"]');
    await page.waitForSelector('#c-BTC', { state: 'detached' });
    await t.ada('#chartTitle', /^ETH\/USDT$/);
    sama((await storan(page, 'bl_cryptoSyms')).includes('BTC'), false, 'BTC dibuang daripada storan');
    padan(await t.teks('#homeTicker'), /ETH/, 'Halaman utama dikemas kini');
  } },

  { kumpulan: K, nama: 'Pasaran: luar talian (Binance, CoinGecko dan WebSocket gagal) tanpa ralat', langkah: async (t, page) => {
    await wsGagal(page);
    await page.route(/data-api\.binance\.vision|api\.coingecko\.com/, r => r.fulfill({ status: 503, body: 'luar talian' }));
    await t.buka('#pasaran');
    await t.ada('.toast', /Gagal memuat data carta\./);
    await t.ada('#cryptoStatus', /^(Luar talian|Menyambung semula)$/);
    sama(await page.$eval('#cryptoStatus', e => e.classList.contains('on')), false, 'Status tidak ditanda langsung');
    sama(await bil(page, '#cryptoTicker .q-price .skeleton'), 8, 'Tiada harga dipaparkan');
    await page.$eval('#obCard', e => e.scrollIntoView());
    await t.ada('#obStatus', /^(Tiada data|Terputus|Menyambung)$/);
    sama(await t.teks('#obMid'), '-', 'Harga tengah kosong');
    await t.klik('[data-seg="stock"]');
    await page.waitForSelector('#seg-stock:not(.hidden)');
    await t.ada('#stockSy', /AAPL/);
  } },

  { kumpulan: K, nama: 'Pasaran: sandaran CoinGecko apabila Binance tiada; had kadar 429 tidak dianggap langsung', langkah: async (t, page) => {
    await wsGagal(page);
    let had = false;
    await page.route(/data-api\.binance\.vision/, r => r.fulfill({ status: 503, body: 'luar talian' }));
    await page.route(/api\.coingecko\.com/, r => had
      ? r.fulfill({ status: 429, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ status: { error_code: 429, error_message: "You've exceeded the Rate Limit." } }) })
      : r.fallback());
    // Rekod setiap perubahan status ("+" = ditanda langsung)
    await page.addInitScript(() => {
      window.__status = [];
      new MutationObserver(() => {
        const e = document.getElementById('cryptoStatus'); if (!e) return;
        const s = e.textContent + (e.classList.contains('on') ? '+' : '');
        if (window.__status[window.__status.length - 1] !== s) window.__status.push(s);
      }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    });
    await t.buka('#pasaran');
    await t.ada('#c-BTC .q-price', /^\$64,000\.00$/);
    await t.ada('#c-BTC .q-chg', /^-2\.50%$/);
    await t.ada('#c-SOL .q-price', /^\$150\.00$/);
    await t.ada('#c-ETH .q-chg', /^\+1\.10%$/);
    sama(await page.$eval('#c-BNB .q-price', e => !!e.querySelector('.skeleton')), true, 'BNB tiada dalam CoinGecko: kekal kosong');
    await page.waitForFunction(() => window.__status.includes('Setiap 30 saat+'));
    // Had kadar: badan JSON tanpa harga. Status tidak boleh ditanda "Setiap 30 saat" (langsung) lagi.
    had = true;
    const jawab = page.waitForResponse(r => /api\.coingecko\.com/.test(r.url()) && r.status() === 429, { timeout: 10000 });
    await page.reload(); await page.waitForLoadState('domcontentloaded');
    await jawab;
    await t.rehat(800);
    const st = await page.evaluate(() => window.__status);
    if (st.includes('Setiap 30 saat+')) gagal('Status "Setiap 30 saat" dipaparkan walaupun CoinGecko menolak (429): ' + JSON.stringify(st));
    sama(await page.$eval('#c-BTC .q-price', e => !!e.querySelector('.skeleton')), true, 'Tiada harga selepas 429');
    await t.ada('#cryptoStatus', /^(Luar talian|Menyambung semula)$/);
  } },

  { kumpulan: K, nama: 'Pasaran: buku pesanan REST dan aliran depth20', langkah: async (t, page) => {
    let depth = null;
    await wsPalsu(page, ws => { if (/depth20/.test(ws.url())) depth = ws; });
    await t.buka('#pasaran');
    await page.$eval('#obCard', e => e.scrollIntoView({ block: 'center' }));
    await t.ada('#obMid', /^65,002\.50$/);   // (65000 + 65005) / 2
    await t.ada('#obSpread', /^5\.00 \(0\.008%\)$/);   // 5 / 65002.5 = 0.0077%
    sama(await bil(page, '#obBids .ob-row'), 10, 'Sepuluh paras bida');
    sama(await bil(page, '#obAsks .ob-row'), 10, 'Sepuluh paras tawaran');
    await t.ada('#obPressTxt', /^Beli 56% · Jual 44%$/);   // 10 x 0.5 berbanding 10 x 0.4
    await t.ada('#obStatus', /^Langsung$/);
    if (!depth) gagal('Aliran depth20 tidak dibuka');
    depth.send(JSON.stringify({ lastUpdateId: 2, bids: [['100.000', '1'], ['99.900', '2']], asks: [['101.000', '3'], ['101.100', '1']] }));
    await t.ada('#obMid', /^100\.500$/);
    await t.ada('#obSpread', /^1\.000 \(0\.995%\)$/);
    await t.ada('#obPressTxt', /^Beli 43% · Jual 57%$/);   // 3 berbanding 4
    // Tukar aset carta: buku pesanan mengikut
    await page.$eval('#c-SOL', e => e.click());
    await t.ada('#obTitle', /^SOL\/USDT$/);
  } },

  { kumpulan: K, nama: 'Pasaran saham: tab, carian, label Syariah saham dan senarai Bursa', lebar: 1280, langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#pasaran');
    await t.klik('[data-seg="stock"]');
    await page.waitForSelector('#seg-stock:not(.hidden)');
    sama(await storan(page, 'bl_marketSeg'), 'stock', 'Pilihan segmen disimpan');
    sama(await bil(page, '#stockTabs .chip'), 10, 'Cip saham AS');
    sama(await page.$eval('#stockTabs .chip.active', e => e.dataset.s), 'NASDAQ:AAPL', 'AAPL lalai');
    const baris = async t2 => page.$eval('#stockSy', (el, t2) => [...el.querySelectorAll('.sy-why')].find(li => li.querySelector('b').textContent === t2)?.textContent || '', t2);
    padan(await baris('AAPL'), /Patuh Syariah.*S&P 500 Shariah/s, 'AAPL');
    padan(await baris('MAYBANK'), /Haram.*riba/s, 'MAYBANK');
    padan(await baris('SPY'), /Diragui.*SPUS/s, 'SPY');
    padan(await baris('TENAGA'), /Patuh Syariah.*33%/s, 'TENAGA');
    sama(await bil(page, '#bursaList .qrow'), 8, 'Kaunter Bursa');
    padan(await t.teks('#bursaList'), /PBBANK.*Haram.*1295/s, 'Bursa dengan kod dan label');
    await t.klik('#stockTabs [data-s="NASDAQ:TSLA"]');
    sama(await page.$eval('#stockTabs .chip.active', e => e.dataset.s), 'NASDAQ:TSLA', 'Tesla dipilih');
    sama(await storan(page, 'bl_stockSym'), 'NASDAQ:TSLA', 'Pilihan saham disimpan');
    // Carian simbol yang tiada dalam senarai: label "Belum disaring" untuk carian anda
    await t.isi('#stockSearch', 'nyse: ko'); await t.klik('#stockForm button[type=submit]');
    await t.ada('#stockSy .sy-why:first-child', /KO.*Belum disaring.*Carian anda/s);
    sama(await storan(page, 'bl_stockSym'), 'NYSE:KO', 'Simbol carian dibersihkan');
    // Widget TradingView gagal (503) tetapi bekas widget tetap dibina
    await page.waitForSelector('#tvStock .tradingview-widget-container');
  } },

  { kumpulan: K, nama: 'Saringan Syariah saham: contoh, kiraan nisbah dan penilaian kualitatif', lebar: 1280, langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#pasaran'); await t.klik('[data-seg="stock"]');
    await page.waitForSelector('#saringan [data-contoh]');
    await t.ada('#sgOut .sg-verdict', /Isi semua angka/);
    const ujian = async nama => page.$eval('#sgOut', (el, n) => [...el.querySelectorAll('.sg-test')].find(x => x.textContent.includes(n))?.textContent || '', nama);
    await t.klik('[data-contoh="ladang"]');
    await t.ada('#sgOut .sg-verdict', /^Lulus saringan kuantitatif/);
    padan(await ujian('Aktiviti 5% berbanding untung'), /2\.67%.*lulus/s, '8 / 300');
    padan(await ujian('Hutang berfaedah'), /18\.00%/, '900 / 5000');
    await t.klik('[data-contoh="hotel"]');
    await t.ada('#sgOut .sg-verdict', /^Tidak lulus saringan kuantitatif/);
    padan(await ujian('Aktiviti 5% berbanding untung'), /7\.50%.*melebihi had/s, '9 / 120');
    await t.klik('[data-contoh="konglo"]');
    padan(await ujian('Hutang berfaedah'), /42\.00%.*melebihi had/s, '4200 / 10000');
    sama((await storan(page, 'bl_saringan')).debt, 4200, 'Angka contoh disimpan');
    // Isi sendiri: lulus nombor tetapi aktiviti 20% tanpa imej baik
    await t.klik('[data-contoh=""]');
    await t.ada('#sgOut .sg-verdict', /Isi semua angka/);
    for (const [k, v] of Object.entries({ rev: 1000, pbt: 200, r5: 10, p5: 2, r20: 50, p20: 10, ta: 3000, cash: 300, debt: 600 })) await t.isi('#sg-' + k, String(v));
    await t.ada('#sgOut .sg-verdict', /^Lulus saringan kuantitatif/);
    padan(await ujian('Aktiviti 20% berbanding hasil'), /5\.00%/, '50 / 1000');
    await page.uncheck('#sgImej');
    await t.ada('#sgOut .sg-verdict', /^Lulus nombor, gagal penilaian kualitatif/);
    sama((await storan(page, 'bl_saringan')).imej, false, 'Pilihan imej disimpan');
    // Syarikat rugi: ujian untung tidak boleh dikira
    await t.isi('#sg-pbt', '-50');
    await t.ada('#sgOut .sg-verdict', /Syarikat rugi/);
  } },

  /* ---------------- BELAJAR ---------------- */
  { kumpulan: K, nama: 'Belajar: Akademi laluan dan tahap, pautan ke pelajaran berkaitan', langkah: async (t, page) => {
    await tanpaGerak(page);
    await wsPalsu(page);
    await t.buka('#belajar');
    await t.ada('#learnTabs .chip.active', /Laluan & AI Coach/);
    await t.ada('.akd-title', /^Belajar saham menggunakan Moomoo$/);
    await t.ada('#progText', /^0\/34 pelajaran$/);
    await t.klik('[data-laluan="kripto"]');
    await t.ada('.akd-title', /^Akademi Mata Wang Kripto & Rantaian Blok$/);
    await t.ada('.akd-level h3', /^Asas Kripto & Keselamatan Dompet$/);
    await t.klik('[data-tahap="professional"]');
    await t.ada('.akd-level .eyebrow', /Tahap 3 · Profesional/);
    padan(await t.teks('.akd-level'), /Nota Syariah:.*IIFA Resolusi 63/s, 'Nota Syariah tahap profesional');
    sama(await page.$$eval('.akd-step', b => b.map(x => x.className.includes('past'))), [true, true, false], 'Tahap sebelum ditanda lepas');
    sama(await storan(page, 'bl_akdTahap'), { moomoo: 'beginner', kripto: 'professional' }, 'Tahap disimpan setiap laluan');
    // "Tanya AI Coach" mengisi soalan
    await t.klik('.akd-mod [data-tanya]');
    padan(await nilai(page, '#akdQ'), /^Terangkan "Analisis On-Chain Lanjutan" untuk tahap saya/, 'Soalan diisi');
    // Pautan pelajaran berkaitan membuka modul dan pelajaran itu
    await t.klik('[data-pel="jn5"]');
    await t.ada('#learnTabs .chip.active', /Jenis dagangan & hukum/);
    sama(await page.$eval('#learnContent details[data-id="jn5"]', d => d.open), true, 'Pelajaran jn5 dibuka');
    sama(await page.$$eval('#learnContent details[open]', d => d.length), 1, 'Hanya satu pelajaran dibuka');
    sama(await storan(page, 'bl_learnTab'), 'jenis', 'Tab modul disimpan');
  } },

  { kumpulan: K, nama: 'Belajar: tanda pelajaran selesai, kemajuan, navigasi modul dan visual', langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#belajar');
    await t.klik('#learnTabs [data-id="mula"]');
    sama(await bil(page, '#learnContent details.lesson'), 4, 'Empat pelajaran modul Mula');
    sama(await bil(page, '#learnContent figure.lv svg'), 4, 'Visual setiap pelajaran');
    await t.klik('[data-mark="m1"]');
    await t.ada('.toast', /Pelajaran ditanda selesai/);
    await t.ada('#progText', /^1\/34 pelajaran$/);
    await t.ada('#learnTabs [data-id="mula"] .done-n', /^1\/4$/);
    sama(await page.$eval('details[data-id="m1"]', d => [d.open, d.classList.contains('done')]), [false, true], 'm1 ditutup dan ditanda');
    sama(await page.$eval('details[data-id="m2"]', d => d.open), true, 'Pelajaran seterusnya dibuka');
    await t.ada('#homePct', /^3%$/);   // 1/34
    await t.ada('#homeLesson', /^Buka akaun langkah demi langkah$/);
    await t.ada('[data-mark="m1"]', /^Tandakan belum selesai$/);
    // Nyahtanda
    await page.$eval('details[data-id="m1"]', d => { d.open = true; });
    await t.klik('[data-mark="m1"]');
    await t.ada('#progText', /^0\/34 pelajaran$/);
    sama(await storan(page, 'bl_learnDone'), [], 'Storan dikosongkan');
    // Navigasi antara modul (tahap)
    for (const [id, n] of [['order', 3], ['fund', 4], ['tech', 3], ['crypto', 4], ['risk', 4], ['strat', 3], ['syariah', 2], ['jenis', 7]]) {
      await t.klik(`#learnTabs [data-id="${id}"]`);
      sama(await bil(page, '#learnContent details.lesson'), n, 'Pelajaran modul ' + id);
    }
    // Ringkasan hukum: jadual matriks
    await page.$eval('details[data-id="jn7"]', d => { d.open = true; });
    padan(await t.teks('details[data-id="jn7"] .hl-matrix'), /CFD.*Tidak patuh.*FCPO: MPS SC harus/s, 'Matriks hukum');
  } },

  { kumpulan: K, nama: 'Belajar: simulator leverage dan kalkulator (saiz kedudukan, DCA, untung rugi)', lebar: 1280, langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#belajar');
    await t.klik('#learnTabs [data-id="jenis"]');
    await page.$eval('details[data-id="jn3"]', d => { d.open = true; });
    await t.ada('#lvOut', new RegExp('^−' + RM(500).replace('.', '\\.') + '$'));   // 1000 x 10 x -5%
    padan(await t.teks('#lvOutB'), new RegExp(`Posisi ${RM(10000).replace('.', '\\.')} · Baki modal ${RM(500).replace('.', '\\.')} \\(-50%\\) · Modal habis jika harga bergerak 10% melawan anda`), 'Ringkasan leverage');
    await page.$eval('#lvMove', e => { e.value = '-12'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await t.ada('#lvOutB', /^Modal habis\. Posisi .* ditutup paksa; harga hanya perlu bergerak 10% melawan anda\.$/);
    await page.$eval('#lvLev', e => { e.value = '7'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await t.ada('#lvLevT', /^1:500$/);
    await t.ada('#lvOutB', /bergerak 0\.2% melawan anda/);
    await page.$eval('#lvMove', e => { e.value = '3'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await t.ada('#lvOut', new RegExp('^\\+' + RM(15000).replace('.', '\\.') + '$'));   // 1000 x 500 x 3%
    // Kalkulator
    await t.klik('#learnTabs [data-id="calc"]');
    await t.ada('#cOut1', /^500 unit$/);   // 100 / 0.20
    padan(await t.teks('#cOut1b'), new RegExp(`≈ 5 lot Bursa · Nilai ${RM(1000).replace('.', '\\.')} · Risiko ${RM(100).replace('.', '\\.')}`), 'Saiz kedudukan');
    await t.isi('#cStop', '2.10');
    await t.ada('#cOut1b', /^Stop loss mesti di bawah harga masuk\.$/);
    await t.isi('#cStop', '1.95'); await t.isi('#cCap', '5000'); await t.isi('#cRisk', '2');
    await t.ada('#cOut1', /^2,000 unit$/);   // 100 / 0.05
    // DCA: kira sendiri dengan formula bulanan yang sama
    let bal = 1000; for (let i = 0; i < 120; i++) bal = bal * (1 + 0.07 / 12) + 300;
    await t.ada('#cOut2', new RegExp('^' + RM(bal).replace(/\./g, '\\.') + '$'));
    padan(await t.teks('#cOut2b'), new RegExp(`Modal disumbang ${RM(37000).replace('.', '\\.')} · Pulangan ${RM(bal - 37000).replace(/\./g, '\\.')}`), 'Pulangan DCA');
    sama(await bil(page, '#dChart rect'), 11, 'Bar tahunan (tahun 0 hingga 10)');
    await t.ada('#cOut3', /^\+\$300\.00$/);
    padan(await t.teks('#cOut3b'), new RegExp(`≈ ${RM(1260).replace('.', '\\.')} · 20\\.00%`), 'Untung saham AS');
    await t.isi('#pSell', '120');
    await t.ada('#cOut3', /^-\$300\.00$/);
    sama(await t.teks('#cOut3b'), `≈ -${RM(1260)} · -20.00%`, 'Rugi dalam ringgit');
  } },

  { kumpulan: K, nama: 'Belajar: kuiz dijawab, dimarkah dan markah terbaik disimpan', langkah: async (t, page) => {
    await wsPalsu(page);
    await page.clock.install();
    await t.buka('#belajar');
    await t.klik('#learnTabs [data-id="quiz"]');
    const JAWAPAN = [1, 1, 2, 1, 0, 1, 1, 1, 1, 2, 1, 2, 1];
    for (let i = 0; i < JAWAPAN.length; i++) {
      await t.ada('#learnContent .muted.num', new RegExp(`^Soalan ${i + 1} daripada 13$`));
      const pilih = i < 10 ? JAWAPAN[i] : (JAWAPAN[i] + 1) % 4;   // 10 betul, 3 salah
      await t.klik(`.quiz-opt[data-i="${pilih}"]`);
      sama(await page.$eval(`.quiz-opt[data-i="${JAWAPAN[i]}"]`, b => b.classList.contains('correct')), true, 'Jawapan betul ditanda ' + (i + 1));
      if (i >= 10) sama(await page.$eval(`.quiz-opt[data-i="${pilih}"]`, b => b.classList.contains('wrong')), true, 'Jawapan salah ditanda');
      sama(await page.$$eval('.quiz-opt', b => b.every(x => x.disabled)), true, 'Pilihan dikunci selepas menjawab');
      await page.clock.runFor(1200);
    }
    await t.ada('#learnContent .calc-out', /^10\/13$/);
    padan(await t.teks('#learnContent'), /Bagus\. Ulang kaji modul.*Markah terbaik: 10\/13/s, 'Mesej keputusan');
    sama(await storan(page, 'bl_quizBest'), 10, 'Markah terbaik disimpan');
    await t.klik('#qAgain');
    await t.ada('#learnContent .muted.num', /^Soalan 1 daripada 13$/);
  } },

  { kumpulan: K, nama: 'Belajar: AI Coach menjawab melalui pelayan (worker-fiqh /coach) dan ralat soalan pendek', lebar: 1280, langkah: async (t, page) => {
    await tanpaGerak(page);
    await wsPalsu(page);
    await t.buka('#belajar');
    await t.isi('#akdQ', 'Bagaimana cara menetapkan Stop-Loss untuk saham Bursa dalam app Moomoo?');
    await page.press('#akdQ', 'Enter');
    await t.ada('.akd-chat .bk-me', /Stop-Loss untuk saham Bursa/);
    await page.waitForSelector('.akd-chat .bk-ai:nth-child(3)', { timeout: 15000 });
    const jawapan = await t.teks('.akd-chat .bk-ai:nth-child(3)');
    if (jawapan.trim().length < 10) gagal('Jawapan AI Coach kosong');
    if (await page.$('.akd-err')) gagal('Jawapan AI Coach dipaparkan sebagai ralat: ' + jawapan);
    await page.waitForSelector('#akdQ:not([disabled])');
    // Soalan satu aksara ditolak oleh pelayan dengan mesej yang jelas
    await t.isi('#akdQ', 'a'); await t.klik('#akdAsk button[type=submit]');
    await t.ada('.akd-err', /Tulis soalan anda dahulu\./);
    // Kosongkan perbualan
    await t.klik('[data-clear]');
    sama(await bil(page, '.akd-chat .bk-me'), 0, 'Perbualan dikosongkan');
  } },

  /* ---------------- JADUAL UiTM ---------------- */
  { kumpulan: K, nama: 'Jadual: bina jadual ikut kampus, fakulti, kursus dan kumpulan (dengan kelas bertindih)', langkah: async (t, page) => {
    await tanpaGerak(page);
    await wsPalsu(page);
    await page.clock.setFixedTime(new Date('2026-10-12T09:30:00+08:00'));   // Isnin 9:30 pagi
    await t.buka('#jadual');
    await page.waitForFunction(() => document.querySelectorAll('#jdCampus option').length === 4);
    sama(await page.$eval('#jdBuild', b => b.disabled), true, 'Bina dimatikan tanpa kursus');
    await t.pilih('#jdCampus', 'B');
    await page.waitForSelector('#jdFacWrap:not(.hidden)');
    await page.waitForFunction(() => document.querySelectorAll('#jdFac option').length === 3);
    await t.pilih('#jdFac', 'CS');
    await page.waitForFunction(() => document.querySelectorAll('#jdCourseList option').length === 5);
    // Tampal teks MyStudent: kursus dan kumpulan dikesan
    await t.isi('#jdPaste', 'xyz tiada kod');
    await t.klik('#jdDetect');
    await t.ada('#jdAddErr', /Tiada kod kursus dikesan/);
    await t.isi('#jdPaste', 'CSC584 ENTERPRISE PROGRAMMING CS2305A  ITS662 DATA MINING CS2305A');
    await t.klik('#jdDetect');
    await t.ada('.toast', /^2 kursus dikesan$/);
    sama(await page.$$eval('#jdPicks .jd-pick', l => l.map(x => x.textContent.replace(/\s+/g, ' ').trim())), ['CSC584 CS2305A', 'ITS662 CS2305A'], 'Pilihan dikesan');
    // Tambah satu per satu: kod tidak sah, pendua, kemudian kumpulan dipilih daripada senarai
    await t.isi('#jdCourse', 'abc'); await t.klik('#jdAdd button[type=submit]');
    await t.ada('#jdAddErr', /Masukkan kod kursus yang sah/);
    await page.fill('#jdCourse', ''); await page.type('#jdCourse', 'csc577');
    await page.waitForFunction(() => document.querySelectorAll('#jdGroup option').length === 3);
    padan(await page.$eval('#jdGroup option[value="CS2305B"]', o => o.textContent), /CS2305B · Isn 9-11/, 'Label kumpulan dengan masa');
    await t.pilih('#jdGroup', 'CS2305B');
    await t.klik('#jdAdd button[type=submit]');
    await page.waitForFunction(() => document.querySelectorAll('#jdPicks .jd-pick').length === 3);
    // Kod kursus yang baru ditambah kekal dalam kotak; kosongkan dahulu
    await page.fill('#jdCourse', ''); await page.type('#jdCourse', 'CSC584'); await t.klik('#jdAdd button[type=submit]');
    await t.ada('#jdAddErr', /CSC584 sudah ada dalam senarai/);
    // Buang dan tambah semula ISP550 tanpa kumpulan: bina disekat sehingga kumpulan dipilih
    await page.fill('#jdCourse', ''); await page.type('#jdCourse', 'ISP550'); await t.rehat(50);
    await page.$eval('#jdGroup', s => { s.value = ''; });
    await t.klik('#jdAdd button[type=submit]');
    await page.waitForFunction(() => document.querySelectorAll('#jdPicks .jd-pick').length === 4);
    await t.klik('#jdBuild');
    await t.ada('#jdBuildErr', /^Pilih kumpulan untuk ISP550\.$/);
    await t.klik('#jdPicks [data-del="3"]');
    await page.waitForFunction(() => document.querySelectorAll('#jdPicks .jd-pick').length === 3);
    await t.klik('#jdBuild');
    await page.waitForSelector('.jd-legend');
    padan(await t.teks('#view-jadual .page-head .lead'), /KAMPUS SHAH ALAM · Sesi Okt 2026 hingga Feb 2027/, 'Kampus dan sesi');
    await t.ada('.jd-clash', /CSC584, CSC577 bertembung masa/);
    sama(await page.$$eval('.jd-stats .v', v => v.map(x => x.textContent)), ['3', '10', 'Isn'], 'Statistik: kursus, jam seminggu, hari paling padat');
    await t.ada('.jd-next', /Sedang berlangsung.*CSC584.*Enterprise Programming.*Isnin, 8:00 pg hingga 10:00 pg.*Tamat dalam 30 min/s);
    padan(await t.teks('.jd-legend'), /CSC584.*CS2305A.*Enterprise Programming.*4 jam.*ITS662.*Data Mining.*CSC577.*Software Engineering Project.*2 jam/s, 'Petunjuk kursus (nama dikemaskan)');
    const s = await storan(page, 'bl_jadual');
    sama([s.items.length, s.session, s.demo], [3, '20264', false], 'Jadual disimpan');
    // Paparan Hari: Isnin dengan rehat dan tanda bertindih
    await t.klik('[data-mode="hari"]'); await t.klik('[data-day="1"]');
    sama(await page.$$eval('.jd-list .jd-item .jd-it-top b', b => b.map(x => x.textContent)), ['CSC584', 'CSC577', 'ITS662'], 'Kelas Isnin mengikut masa');
    sama(await bil(page, '.jd-list .jd-item.clash'), 2, 'Dua kelas bertindih');
    sama(await bil(page, '.jd-list .jd-item.live'), 2, 'Kelas semasa ditanda (CSC584 dan CSC577 bertindih pada 9:30)');
    await t.klik('[data-day="5"]');
    await t.ada('.jd-free', /Tiada kelas pada hari Jumaat/);
    // Paparan Minggu: 5 blok
    await t.klik('[data-mode="minggu"]');
    sama(await bil(page, '.jd-week .jd-blk'), 5, 'Blok kelas seminggu');
    await t.klik('.jd-blk[data-slot="0:3:840"]');
    await t.ada('.toast', /CSC584 Enterprise Programming · Rabu 2:00 ptg hingga 4:00 ptg · MAKMAL KOMPUTER 6/);
    // Kad halaman utama
    await t.buka('#utama');
    await t.ada('#homeJadual', /^Sekarang: CSC584 di BK 1$/);
  } },

  { kumpulan: K, nama: 'Jadual: No. Pelajar (sah, tidak sah, tiada rekod) dan jadual contoh', lebar: 1280, langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#jadual');
    await t.isi('#jdStuId', '12345'); await t.klik('#jdStuGo');
    await t.ada('#jdStuErr', /^No\. Pelajar UiTM mempunyai 10 digit/);
    await t.isi('#jdStuId', '2023000000'); await t.klik('#jdStuGo');
    await t.ada('#jdStuErr', /^Tiada jadual dijumpai untuk No\. Pelajar ini/);
    sama(await page.$eval('#jdStuGo', b => b.disabled), false, 'Butang boleh ditekan semula');
    await t.isi('#jdStuId', '2023123456'); await t.klik('#jdStuGo');
    await t.ada('.toast', /^3 kursus dimuatkan$/);
    await t.ada('#view-jadual .page-head .lead', /Jadual peribadi · Mengikut No\. Pelajar/);
    sama(await bil(page, '.jd-legend .jd-lg'), 3, 'Tiga kursus');
    sama((await storan(page, 'bl_jadual')).student, '2023123456', 'No. Pelajar disimpan');
    // Urus kursus kemudian batal
    await t.klik('[data-act="edit"]');
    await page.waitForSelector('#jdStu');
    sama(await nilai(page, '#jdStuId'), '2023123456', 'No. Pelajar diisi semula');
    await t.klik('[data-act="cancel"]');
    await page.waitForSelector('.jd-legend');
    // Jadual contoh daripada keadaan kosong
    await page.evaluate(() => localStorage.removeItem('bl_jadual'));
    await t.buka('#jadual'); await page.reload(); await page.waitForSelector('[data-act="demo"]');
    await t.klik('[data-act="demo"]');
    await t.ada('.jd-demo', /Ini jadual contoh/);
    sama(await bil(page, '.jd-legend .jd-lg'), 6, 'Enam kursus contoh');
    await t.klik('[data-act="refresh"]');
    await t.ada('.toast', /^Jadual contoh tidak dikemas kini\.$/);
  } },

  { kumpulan: K, nama: 'Jadual: pelayan jadual tidak dapat dihubungi (503)', langkah: async (t, page) => {
    await wsPalsu(page);
    await page.route(/jadual\.bijaklabur\.my/, r => r.fulfill({ status: 503, contentType: 'text/plain', body: 'luar talian' }));
    await t.buka('#jadual');
    await t.ada('#jdCampErr', /Pelayan jadual tidak dapat dihubungi\. Anda masih boleh melihat jadual contoh di bawah\./);
    await t.ada('#jdCampus option[value=""]', /Senarai kampus tidak dapat dimuatkan/);
    await t.isi('#jdStuId', '2023123456'); await t.klik('#jdStuGo');
    await t.ada('#jdStuErr', /Pelayan jadual tidak dapat dihubungi\./);
    sama(await page.$eval('#jdBuild', b => b.disabled), true, 'Bina dimatikan tanpa kursus');
  } },

  { kumpulan: K, nama: 'Jadual: eksport kalendar ICS (tarikh betul walaupun sebelum 8 pagi), JPG dan PDF', storan: { bl_jadual: JADUAL_SIMPAN, bl_jadual_mode: '"minggu"' }, langkah: async (t, page) => {
    await wsPalsu(page);
    // Isnin 7:00 pagi waktu Malaysia = Ahad 23:00 UTC
    await page.clock.setFixedTime(new Date('2026-10-12T07:00:00+08:00'));
    await t.buka('#jadual');
    await page.waitForSelector('.jd-legend');
    await t.ada('.jd-next', /Kelas seterusnya.*CSC584.*Bermula dalam 1 jam/s);
    const ics = await muatTurun(page, () => t.klik('.jd-acts [data-act="ics"]'));
    sama(ics.nama, 'jadual-kelas-uitm.ics', 'Nama fail ICS');
    const teks = ics.data.toString('utf8');
    sama((teks.match(/BEGIN:VEVENT/g) || []).length, 6, 'Satu acara bagi setiap slot');
    padan(teks, /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/, 'Pengepala ICS dengan CRLF');
    padan(teks, /RRULE:FREQ=WEEKLY;COUNT=14/, 'Berulang 14 minggu');
    padan(teks, /TRIGGER:-PT15M/, 'Peringatan 15 minit');
    padan(teks, /SUMMARY:CTU554 Values and Civilisation II/, 'Nama kursus dikemaskan');
    // CSC584 Isnin 8:00-10:00 pagi waktu Malaysia = 00:00-02:00 UTC pada Isnin 12 Oktober
    const ev = teks.split('BEGIN:VEVENT').find(e => /SUMMARY:CSC584/.test(e) && /LOCATION:BK 1/.test(e));
    padan(ev, /DTSTART:20261012T000000Z/, 'Tarikh mula kelas Isnin (ICS)');
    padan(ev, /DTEND:20261012T020000Z/, 'Tarikh tamat kelas Isnin (ICS)');
    // CTU554 Jumaat 8:30 pagi = 00:30 UTC Jumaat 16 Oktober
    padan(teks.split('BEGIN:VEVENT').find(e => /SUMMARY:CTU554/.test(e)), /DTSTART:20261016T003000Z/, 'Tarikh kelas Jumaat (ICS)');
    // Gambar JPG
    const jpg = await muatTurun(page, () => t.klik('.jd-save [data-act="jpg"]'));
    sama(jpg.nama, 'jadual-kelas-uitm.jpg', 'Nama fail JPG');
    sama(saizJpeg(jpg.data), { w: 2480, h: 1754 }, 'Saiz gambar jadual (A4 melintang)');
    await t.ada('.toast', /Gambar jadual dimuat turun\./);
    // PDF: offset xref dan setiap objek mesti tepat supaya boleh dibuka
    const pdf = await muatTurun(page, () => t.klik('.jd-save [data-act="pdf"]'));
    sama(pdf.nama, 'jadual-kelas-uitm.pdf', 'Nama fail PDF');
    const p = pdf.data, s = p.toString('latin1');
    padan(s, /^%PDF-1\.4\n/, 'Pengepala PDF');
    padan(s, /\/Width 2480 \/Height 1754 .*\/Filter \/DCTDecode/, 'Gambar JPEG dalam PDF');
    const xref = +s.match(/startxref\n(\d+)\n%%EOF\n$/)[1];
    sama(s.slice(xref, xref + 4), 'xref', 'Offset startxref');
    const offs = [...s.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map(m => +m[1]);
    sama(offs.length, 6, 'Enam objek dalam xref');
    offs.forEach((o, i) => sama(s.slice(o, o + 8), `${i + 1} 0 obj\n`, 'Offset objek ' + (i + 1)));
    const len = +s.match(/\/DCTDecode \/Length (\d+) >>\nstream\n/)[1], mula = s.indexOf('stream\n', s.indexOf('/DCTDecode')) + 7;
    sama([p[mula], p[mula + 1], p[mula + len - 2], p[mula + len - 1]], [0xFF, 0xD8, 0xFF, 0xD9], 'Strim JPEG lengkap dalam PDF');
    // Skrin utama (pelayar): arahan pasang
    await t.klik('.jd-save [data-act="home"]');
    await t.ada('.toast', /Add to Home screen|Install app/);
  } },

  { kumpulan: K, nama: 'Studio Skrin Kunci: kanvas dilukis, pilihan reka bentuk dan muat turun satu hari serta ZIP 7 hari', lebar: 1280, storan: { bl_jadual: JADUAL_SIMPAN }, langkah: async (t, page) => {
    await wsPalsu(page);
    await page.clock.setFixedTime(new Date('2026-10-12T09:30:00+08:00'));   // Isnin 12 Oktober
    await t.buka('#jadual');
    await page.waitForSelector('.jd-legend');
    await t.klik('.jd-save [data-act="wall"]');
    await page.waitForSelector('dialog.kc-dlg[open]');
    const piksel = (x, y) => page.$eval('#kcPrev', (c, [x, y]) => [...c.getContext('2d').getImageData(x, y, 1, 1).data], [x, y]);
    await page.waitForFunction(() => document.querySelector('#kcPrev').width === 640);
    sama(await page.$eval('#kcPrev', c => c.height), 1385, 'Tinggi pratonton iPhone (640 x 2532 / 1170)');
    await page.waitForFunction(() => { const c = document.querySelector('#kcPrev'); return c.getContext('2d').getImageData(5, 5, 1, 1).data[3] === 255; });
    const asal = await piksel(5, 5);
    // Hari: 7 butang, label hari ini dan esok
    sama(await page.$$eval('#kcDays .kc-day', b => b.map(x => x.textContent)), ['Hari ini', 'Esok', 'Rab 14', 'Kha 15', 'Jum 16', 'Sab 17', 'Ahd 18'], 'Pilihan hari');
    await t.ada('#kcDl', /Muat turun hari ini/);
    // Latar Laut menukar warna latar
    await t.klik('[data-bg="laut"]');
    await page.waitForFunction(a => { const d = [...document.querySelector('#kcPrev').getContext('2d').getImageData(5, 5, 1, 1).data]; return d.join() !== a.join(); }, asal);
    sama((await storan(page, 'bl_kunci_cfg')).bg, 'laut', 'Latar disimpan');
    // Susun atur: peranti Android menukar nisbah
    await t.klik('[data-tab="lay"]');
    await t.pilih('#kcDev', 'and');
    await page.waitForFunction(() => document.querySelector('#kcPrev').height === 1422);   // 640 x 2400 / 1080
    await t.klik('[data-set="card"][data-v="cerah"]');
    sama((await storan(page, 'bl_kunci_cfg')).card, 'cerah', 'Gaya kad disimpan');
    await page.$eval('[data-rng="radius"]', e => { e.value = '10'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await t.ada('#kcv-radius', /^10$/);
    // Papar: hidupkan waktu solat (tiada data tersimpan: tiada ralat)
    await t.klik('[data-tab="show"]');
    await page.check('[data-show="solat"]');
    await t.ada('#kcPanel', /Waktu solat diambil daripada zon/);
    // Foto sendiri sebagai latar
    await t.klik('[data-tab="bg"]');
    await page.setInputFiles('#kcPhoto', { name: 'foto.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForSelector('[data-rng="blur"]');
    sama((await storan(page, 'bl_kunci_cfg')).bg, 'foto', 'Latar foto');
    // Muat turun esok
    await t.klik('#kcDays [data-day="1"]');
    await t.ada('#kcDl', /Muat turun esok/);
    const satu = await muatTurun(page, () => t.klik('#kcDl'));
    sama(satu.nama, 'jadual-kunci-sel-13-okt.jpg', 'Nama fail wallpaper esok');
    sama(saizJpeg(satu.data), { w: 1080, h: 2400 }, 'Saiz wallpaper Android');
    // Semua 7 hari dalam satu ZIP
    const zip = await muatTurun(page, () => t.klik('#kcAll'));
    sama(zip.nama, 'jadual-kunci-7-hari.zip', 'Nama fail ZIP');
    const fail = bacaZip(zip.data);
    sama(fail.map(f => f.nama), ['isn-12', 'sel-13', 'rab-14', 'kha-15', 'jum-16', 'sab-17', 'ahd-18'].map(x => `jadual-kunci-${x}-okt.jpg`), 'Fail dalam ZIP');
    fail.forEach(f => sama(saizJpeg(f.data), { w: 1080, h: 2400 }, 'Saiz ' + f.nama));
    await t.ada('.toast', /7 gambar dimuat turun dalam satu fail ZIP\./);
    await t.ada('#kcAll', /Semua 7 hari/);
    // Bantuan dan tetap semula
    await t.klik('[data-help]');
    await page.waitForSelector('dialog.kc-help[open]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('dialog.kc-help', { state: 'detached' });
    await t.klik('[data-reset]');
    await t.ada('.toast', /Reka bentuk ditetapkan semula\./);
    sama((await storan(page, 'bl_kunci_cfg')).dev, 'ip', 'Reka bentuk lalai');
    await t.klik('dialog.kc-dlg [data-close]');
    await page.waitForSelector('dialog.kc-dlg', { state: 'detached' });
    // Tanpa jadual: Skrin kunci meminta jadual dibina dahulu
    await page.evaluate(() => { window.Jadual.kunci().S.items = []; window.SkrinKunci.open(); });
    await t.ada('.toast', /^Bina jadual anda dahulu, kemudian buka Skrin kunci\.$/);
  } },

  /* ---------------- JEJAK DAN PETA ---------------- */
  { kumpulan: K, nama: 'Jejak Aktiviti: rakam jalan dengan GPS, jeda, tamat, sejarah dan eksport GPX (jubin peta 503)', langkah: async (t, page) => {
    await wsPalsu(page); await gpsPalsu(page);
    await t.buka('#jejak');
    await page.waitForFunction(() => window.__gpsBil() > 0);
    await t.ada('.jk-gps', /Mencari isyarat GPS/);
    await page.evaluate(() => window.__gps({ lat: 3.0716, lng: 101.4902, acc: 5 }));
    await t.ada('.jk-gps', /GPS: ketepatan 5 m/);
    await t.klik('[data-act="mula"]');
    await page.waitForSelector('[data-act="jeda"]');
    sama(await page.$$eval('[data-jenis]', b => b.every(x => x.disabled)), true, 'Jenis dikunci semasa aktif');
    // 46 langkah ke utara, 0.0002 darjah (kira-kira 22 m) setiap 10 saat
    const N = 46, pts = [];
    for (let k = 0; k <= N; k++) pts.push([+(3.0716 + k * 0.0002).toFixed(6), 101.4902]);
    await page.evaluate(({ pts }) => { const t0 = Date.now(); pts.forEach((p, k) => window.__gps({ lat: p[0], lng: p[1], acc: 5, ts: t0 + k * 10000 })); }, { pts });
    let jarak = 0; for (let k = 1; k <= N; k++) jarak += hav(pts[k - 1], pts[k]);
    await t.ada('.jk-stats .jk-stat:nth-child(1) b', new RegExp('^' + (jarak / 1000).toFixed(2).replace('.', '\\.') + '$'));
    const langkah = Math.round(jarak / (165 * 0.415 / 100)), kcal = Math.round(N * 5 * 60 * (10 / 3600));
    await t.ada('.jk-stats .jk-stat:nth-child(3) b', new RegExp('^' + langkah.toLocaleString('ms-MY').replace(',', ',') + '$'));
    await t.ada('.jk-stats .jk-stat:nth-child(4) b', new RegExp('^' + kcal + '$'));
    await t.ada('.jk-splits', /Km 1/);
    // Lompatan GPS terlalu laju untuk berjalan tidak dikira
    await page.evaluate(() => window.__gps({ lat: 3.2, lng: 101.4902, acc: 5, ts: Date.now() + 470 * 1000 }));
    await t.ada('.jk-stats .jk-stat:nth-child(1) b', new RegExp('^' + (jarak / 1000).toFixed(2).replace('.', '\\.') + '$'));
    // Isyarat lemah: tidak dikira, dan amaran dipaparkan
    await page.evaluate(() => window.__gps({ lat: 3.0811, lng: 101.4902, acc: 60, ts: Date.now() + 480 * 1000 }));
    await t.ada('.jk-gps', /ketepatan 60 m \(lemah, menunggu isyarat lebih baik\)/);
    await t.klik('[data-act="jeda"]');
    await t.ada('.jk-gps', /Dijeda/);
    sama((await storan(page, 'bl_jejak_aktif')).paused, true, 'Keadaan jeda disimpan untuk dipulihkan');
    await t.klik('[data-act="sambung"]');
    await page.waitForSelector('[data-act="jeda"]');
    await t.klik('[data-act="tamat"]');
    await t.ada('.toast', new RegExp(`^Disimpan: ${(Math.round(jarak) / 1000).toFixed(2).replace('.', '\\.')} km dalam .*, ${langkah.toLocaleString('ms-MY')} langkah ditambah ke Sihat\\.$`));
    await t.ada('#jkHist h2', /^Jalan · /);
    const rek = (await storan(page, 'bl_jejak_sejarah'))[0];
    sama([rek.jenis, rek.dist, rek.kcal, rek.steps, rek.splits.length, rek.pts.length], ['jalan', Math.round(jarak), kcal, langkah, 1, N + 1], 'Rekod disimpan');
    const log = (await storan(page, 'bl_sihat_log'))[tarikhKL()];
    sama([log.jarak, log.langkah], [Math.round(jarak), langkah], 'Log harian Sihat');
    sama(await storan(page, 'bl_jejak_aktif'), null, 'Aktiviti aktif dikosongkan');
    // Eksport GPX
    const gpx = await muatTurun(page, () => t.klik('[data-act="gpx"]'));
    sama(gpx.nama, `bijak-labur-jalan-${tarikhKL()}.gpx`, 'Nama fail GPX');
    const xml = gpx.data.toString('utf8');
    padan(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<gpx version="1\.1" creator="SiswaCap"/, 'Pengepala GPX');
    sama((xml.match(/<trkpt /g) || []).length, N + 1, 'Titik laluan GPX');
    padan(xml, /<trkpt lat="3\.0716" lon="101\.4902"><time>/, 'Titik pertama');
    padan(xml, /<type>walking<\/type>/, 'Jenis aktiviti GPX');
    // Peta 3D tetap dimuatkan walaupun jubin 503, dan butang main semula ada
    await page.waitForSelector('#jkMap canvas.maplibregl-canvas', { timeout: 15000 });
    await page.waitForSelector('[data-act="terbang"]');
    await t.klik('[data-act="tutup"]');
    await t.ada('#jkHist', new RegExp(`7 hari: ${(Math.round(jarak) / 1000).toFixed(2).replace('.', '\\.')} km`));
    sama(await bil(page, '.jk-hist li'), 1, 'Satu aktiviti dalam sejarah');
  } },

  { kumpulan: K, nama: 'Jejak Aktiviti: aktiviti pendek tidak disimpan, GPS ditolak, basikal dan aktiviti tergendala dipulihkan', lebar: 1280,
    storan: { bl_jejak_aktif: { on: true, paused: false, jenis: 'basikal', start: Date.now() - 600000, pausedMs: 0, pauseAt: 0, pts: [[3.07, 101.49, 0], [3.0727, 101.49, 60]], dist: 300, kcal: 4, ascent: 0, steps: 0, splits: [], lastSplit: 0, skips: 0, saved: Date.now() - 60000 },
      bl_jejak_sejarah: [{ id: '1760000000000', jenis: 'lari', start: Date.now() - 2 * 864e5, ms: 1500000, dist: 5000, kcal: 350, ascent: 12, steps: 6000, splits: [300000, 300000, 300000, 300000, 300000], pts: [[3.07, 101.49, 0], [3.08, 101.49, 600], [3.09, 101.49, 1200]] }] },
    langkah: async (t, page) => {
      await wsPalsu(page); await gpsPalsu(page);
      const dialog = [];
      page.on('dialog', d => { dialog.push(d.message()); d.accept(); });
      await t.buka('#jejak');
      // Aktiviti basikal tergendala dipulihkan dalam keadaan jeda
      await t.ada('.toast', /Aktiviti yang tergendala dipulihkan/);
      await t.ada('.jk-gps', /Dijeda/);
      sama(await page.$eval('.jk-type .seg.active', b => b.textContent), 'Basikal', 'Jenis dipulihkan');
      await t.ada('.jk-stats .jk-stat:nth-child(1) b', /^0\.30$/);
      padan(await t.teks('.jk-stats'), /purata km\/j/, 'Statistik basikal');
      // Tamat aktiviti 300 m: disimpan
      await t.klik('[data-act="tamat"]');
      await t.ada('.toast', /^Disimpan: 0\.30 km dalam /);
      sama((await storan(page, 'bl_jejak_sejarah')).length, 2, 'Dua aktiviti dalam sejarah');
      await t.klik('[data-act="tutup"]');
      // Aktiviti lama: rentak dan catatan km
      await t.klik('[data-lihat="1760000000000"]');
      await t.ada('#jkHist h2', /^Lari · /);
      padan(await t.teks('#jkHist .jk-stats'), /5\.00km.*25:00masa.*5:00rentak \/km.*6,000langkah.*350kcal.*12m naik/s, 'Statistik lari 5 km');
      sama(await bil(page, '#jkHist .jk-splits li'), 5, 'Lima catatan kilometer');
      await t.klik('[data-act="padam"]');
      padan(dialog.pop(), /^Padam aktiviti ini\?$/, 'Pengesahan padam');
      await t.ada('#jkHist', /Sejarah/);
      sama((await storan(page, 'bl_jejak_sejarah')).length, 1, 'Aktiviti dipadam');
      // Aktiviti kurang 50 m: pengguna diminta mengesahkan, tidak disimpan
      await t.klik('[data-jenis="jalan"]');
      sama(await storan(page, 'bl_jejak_jenis'), 'jalan', 'Jenis disimpan');
      await page.evaluate(() => window.__gps({ lat: 3.0716, lng: 101.4902, acc: 5 }));
      await t.klik('[data-act="mula"]');
      await page.waitForSelector('[data-act="tamat"]');
      await t.klik('[data-act="tamat"]');
      await page.waitForSelector('[data-act="mula"]');
      padan(dialog.pop(), /kurang daripada 50 m dan tidak akan disimpan/, 'Pengesahan aktiviti pendek');
      sama((await storan(page, 'bl_jejak_sejarah')).length, 1, 'Aktiviti pendek tidak disimpan');
      // GPS halaman diteruskan selepas aktiviti tamat (kedudukan semasa terus dikemas kini)
      await page.waitForFunction(() => window.__gpsBil() === 1, null, { timeout: 5000 });
      await page.evaluate(() => window.__gps({ lat: 3.0716, lng: 101.4902, acc: 9 }));
      await t.ada('.jk-gps', /GPS: ketepatan 9 m/);
      // Kebenaran lokasi ditolak
      await page.evaluate(() => window.__gpsRalat(1));
      await t.ada('.jk-gps', /Kebenaran lokasi ditolak/);
      // Suara dimatikan disimpan
      await page.uncheck('#jkSuara');
      sama(await storan(page, 'bl_jejak_suara'), false, 'Tetapan suara disimpan');
    } },

  { kumpulan: K, nama: 'Peta Dunia (peta.html): glob, butang HUD, GPS dan hab terdekat', langkah: async (t, page) => {
    await gpsPalsu(page);
    // Gerakan dikurangkan: glob tidak berputar dan garis tidak beranimasi (pemaparan WebGL perisian dalam ujian sangat perlahan)
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    // Laluan dijana secara rawak (pasangan hab unik, sehingga 20): Math.random diberi benih supaya keputusan sentiasa sama
    await page.addInitScript(() => { let a = 20261010; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
    await t.buka('peta.html');
    await t.ada('#peta-status', /^Aktif$/, 20000);
    const negara = +(await t.teks('#peta-count'));
    if (!(negara > 150)) gagal('Data negara tidak dimuat: ' + negara);
    await t.ada('#peta-arcs', /^(1[5-9]|20)$/);
    // Glob sudah dipaparkan; masa dihentikan supaya pemaparan WebGL perisian tidak melambatkan setiap langkah HUD
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 200));
    // Gerakan dikurangkan: putaran automatik mati sejak awal
    await t.ada('#toggleRotation', /^Teruskan Putaran$/);
    await t.klik('#toggleRotation'); await t.ada('#toggleRotation', /^Hentikan Putaran$/);
    await t.klik('#toggleRotation'); await t.ada('#toggleRotation', /^Teruskan Putaran$/);
    await t.klik('#generateRoutes'); await t.ada('#generateRoutes', /^Laluan Dikemas Kini!$/);
    const laluan = +(await t.teks('#peta-arcs'));
    if (!(laluan >= 15 && laluan <= 20)) gagal('Bilangan laluan baharu: ' + laluan);
    await t.klik('#focusMalaysia'); await t.ada('#selected-country', /^Malaysia$/);
    await t.ada('#country-coords', /°U, .*°T$/);
    // GPS
    await t.klik('#gpsBtn');
    await t.ada('#gpsBtn', /^Matikan GPS$/);
    await page.evaluate(() => window.__gps({ lat: 3.0716068, lng: 101.4902525, acc: 12, alt: 25, speed: 1.5 }));
    await t.ada('#gps-coords', /^3\.07161°U, 101\.49025°T$/);
    await t.ada('#gps-country', /^Malaysia$/);
    await t.ada('#gps-acc', /^± 12 m$/);
    await t.ada('#gps-speed', /^5\.4 km\/j$/);
    await t.ada('#gps-alt', /^25 m$/);
    const km = hav([3.0716068, 101.4902525], [3.139, 101.687]) / 1000;
    await t.ada('#gps-hub', new RegExp(`^Kuala Lumpur \\(${km.toLocaleString('ms-MY', { maximumFractionDigits: 1 }).replace('.', '\\.')} km\\)$`));
    await t.ada('#peta-arcs', new RegExp(`^${laluan + 4}$`));   // laluan GPS ke KL dan 3 hab terdekat (Singapura, Jakarta, Hong Kong) ditambah
    await t.klik('#gpsBtn');
    await t.ada('#gpsBtn', /^Hidupkan GPS$/);
    sama(await page.$eval('#gps-box', e => e.hidden), true, 'Kotak GPS disembunyikan');
    await t.ada('#peta-arcs', new RegExp(`^${laluan}$`));
    // Butang Peta Jalan membuka peta jalan skrin penuh; butang Glob kembali
    await t.klik('#openJalan');
    await page.waitForSelector('#jalan:not([hidden])');
    sama(await page.evaluate(() => [document.body.classList.contains('mode-jalan'), window.PetaJalan.aktif()]), [true, true], 'Mod jalan');
    await t.klik('#pjGlob');
    sama(await page.evaluate(() => [document.getElementById('jalan').hidden, document.body.classList.contains('mode-jalan')]), [true, false], 'Kembali ke glob');
  } },

  { kumpulan: K, nama: 'Peta Jalan: carian, kad tempat, simpan, kongsi, arah, navigasi hingga tiba dan carian gagal', lebar: 1280, langkah: async (t, page) => {
    await gpsPalsu(page);
    // Gerakan dikurangkan: glob tidak berputar dan garis tidak beranimasi (pemaparan WebGL perisian dalam ujian sangat perlahan)
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Pautan dalam #jalan membuka Peta Jalan terus (glob di belakangnya dihentikan)
    await t.buka('peta.html#jalan');
    await page.waitForSelector('#jalan:not([hidden])');
    sama(await page.evaluate(() => document.body.classList.contains('mode-jalan')), true, 'Mod jalan');
    // Koordinat terus: tempat dipilih kemudian nama alamat daripada Nominatim (reverse)
    await t.isi('#pjCari', '3.0716, 101.4902'); await page.press('#pjCari', 'Enter');
    await t.ada('#pjSheet h2', /^Jalan Ilmu 1\/1$/);
    padan(await t.teks('#pjSheet'), /Jalan Ilmu 1\/1, Shah Alam, Selangor, Malaysia/, 'Alamat pendek');
    // Carian nama: dua hasil dan penanda bernombor
    await t.isi('#pjCari', 'masjid shah alam'); await page.press('#pjCari', 'Enter');
    await page.waitForFunction(() => document.querySelectorAll('#pjHasil .pj-item').length === 2);
    sama(await bil(page, '.pj-hasil-titik'), 2, 'Penanda hasil');
    await t.klik('#pjHasil .pj-item[data-i="0"]');
    await t.ada('#pjSheet h2', /^Masjid Sultan Salahuddin Abdul Aziz Shah$/);
    await t.ada('#pjInfo', /Cuaca sekarang31°C, Sebahagian berawan, angin 9 km\/j/);
    await t.ada('#pjInfo', /Waktu solat di siniSubuh 05:41, Zohor 13:02, Asar 16:12, Maghrib 19:08, Isyak 20:17/);
    // Simpan dan kongsi
    await t.klik('#pjSimpan');
    await t.ada('#pjToast', /^Tempat disimpan\.$/);
    sama((await storan(page, 'peta.simpan'))[0].name, 'Masjid Sultan Salahuddin Abdul Aziz Shah', 'Tempat disimpan');
    await t.klik('#pjKongsi');
    await t.ada('#pjToast', /^Pautan disalin\.$/);
    padan(await klip(page), /\/peta\.html#tempat=3\.07880,101\.50470,Masjid%20Sultan/, 'Pautan kongsi');
    // Kotak carian kosong: tempat disimpan dan terbaru
    await t.isi('#pjCari', ''); await page.focus('#pjCari'); await page.dispatchEvent('#pjCari', 'input');
    await t.ada('#pjHasil', /Tempat disimpan.*★ Masjid Sultan.*Terbaru/s);
    await page.keyboard.press('Escape');
    // Arah: GPS dihidupkan dahulu, kemudian laluan OSRM diterjemah
    await page.evaluate(() => window.PetaGlob.startGps());
    await page.evaluate(([lat, lng]) => window.__gps({ lat, lng, acc: 8 }), A);
    await t.klik('#pjArah');
    await t.ada('#pjSheet h2', /^7 minit \(2\.4 km\)$/);
    padan(await t.teks('#pjSheet .pj-langkah'), /Bertolak ke Jalan Ilmu menghala utara.*Belok kanan ke Persiaran Masjid.*Tiba di destinasi, di sebelah kiri/s, 'Langkah arah');
    sama(await bil(page, '.pj-alt [data-alt]'), 2, 'Dua laluan alternatif');
    await t.klik('.pj-alt [data-alt="1"]');
    await t.ada('#pjSheet h2', /^9 minit \(2\.6 km\)$/);
    await t.klik('.pj-alt [data-alt="0"]');
    // Navigasi langsung
    await t.klik('#pjMulaNavi');
    await page.waitForSelector('#pjNavi:not([hidden])');
    await t.ada('#pjNavi .pj-navi-teks', /Belok kanan ke Persiaran Masjid.*dalam 800 m/s);
    await t.ada('#pjNavi .pj-navi-bawah', /2\.4 km/);
    await page.evaluate(([lat, lng]) => window.__gps({ lat, lng, acc: 8 }), B);
    await t.ada('#pjNavi .pj-navi-teks', /Tiba di destinasi/);
    await page.evaluate(([lat, lng]) => window.__gps({ lat, lng, acc: 8 }), C);
    await t.ada('#pjToast', /^Anda telah tiba di destinasi\.$/);
    sama(await page.$eval('#pjNavi', e => e.hidden), true, 'Panel navigasi ditutup');
    // Carian gagal (Nominatim 503)
    await t.isi('#pjCari', 'luartalian'); await page.press('#pjCari', 'Enter');
    await t.ada('#pjHasil', /Carian gagal\. Cuba lagi\./);
    // Kembali ke glob
    await t.klik('#pjTutup').catch(() => {});
    sama(await page.$eval('#pjGlob', b => { b.click(); return [document.getElementById('jalan').hidden, document.body.classList.contains('mode-jalan')]; }), [true, false], 'Peta jalan ditutup');
  } },

  /* ---------------- KOMUNITI ---------------- */
  { kumpulan: K, nama: 'Komuniti: tetamu melihat pintu log masuk dan kod jemputan disimpan', langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#komuniti/kod/abc234');
    await t.ada('#view-komuniti .km-hero h2', /^Sertai komuniti pelajar$/);
    await t.ada('.km-invite', /Anda dijemput sebagai rakan/);
    sama(await storan(page, 'bl_km_jemput'), 'ABC234', 'Kod jemputan disimpan');
    sama(await page.evaluate(() => location.hash), '#komuniti', 'Kod dibuang daripada alamat');
    await t.klik('[data-act="login"]');
    await page.waitForSelector('dialog[open]');
  } },

  { kumpulan: K, nama: 'Komuniti: log masuk, peta rakan, permintaan, tambah rakan, notifikasi dan tetapan privasi', langkah: async (t, page) => {
    await wsPalsu(page); await logMasuk(page);
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 3.0716, longitude: 101.4902, accuracy: 10 });
    await t.buka('#komuniti');
    await t.ada('.km-mechip', /Ali Bin Abu.*3/s);
    await t.ada('#kmBadge', /^2$/);
    await t.ada('.km-locpill', /Lokasi: Mati/);
    await t.ada('.km-note', /Lokasi anda tidak dikongsi\./);
    await t.ada('.km-friends', /Rakan \(1\).*Siti Nurhaliza.*UM/s);
    await t.ada('.km-code .num', /^7KQ2MX$/);
    await t.ada('.km-req', /Fazli Hakim.*UKM/s);
    await t.ada('.km-fchips', /Siti/);
    // Salin kod
    await t.klik('[data-act="salinkod"]');
    await t.ada('.toast', /^Kod disalin\.$/);
    sama(await klip(page), '7KQ2MX', 'Kod rakan disalin');
    // Terima permintaan
    await t.klik('[data-terima="u3"]');
    await t.ada('.toast', /^Kini anda berkawan\.$/);
    // Tambah rakan: kod pendek, kod salah, kod betul
    await t.isi('#kmKod', 'ABC'); await t.klik('#kmAdd button[type=submit]');
    await t.ada('.toast', /^Kod rakan ada 6 aksara\.$/);
    await t.isi('#kmKod', 'ZZZ999'); await t.klik('#kmAdd button[type=submit]');
    await t.ada('.toast', /^Kod rakan tidak dijumpai\.$/);
    await t.isi('#kmKod', 'ABC234'); await t.klik('#kmAdd button[type=submit]');
    await t.ada('.toast', /^Permintaan dihantar kepada Hakim\.$/);
    // Profil rakan dari senarai
    await t.klik('[data-urus="u2"]');
    await t.ada('dialog.km-dialog .km-prof', /Siti Nurhaliza.*UM.*4 hari.*Dikemas kini 5 min lalu/s);
    sama(await page.$eval('dialog.km-dialog a[href*="google.com/maps"]', a => a.href), 'https://www.google.com/maps/dir/?api=1&destination=3.0731,101.4915', 'Pautan arah');
    await t.klik('dialog.km-dialog [data-close]');
    // Notifikasi: lencana dikosongkan
    await t.klik('[data-act="notif"]');
    await t.ada('#kmNotif', /Fazli Hakim mahu menjadi rakan anda\./);
    sama(await page.$eval('#kmBadge', b => b.classList.contains('hidden')), true, 'Lencana dikosongkan');
    await t.klik('dialog.km-dialog [data-close]');
    // Tetapan privasi: hidupkan lokasi untuk semua rakan, lokasi dihantar
    await t.klik('.km-locpill');
    await page.waitForSelector('dialog.km-setd[open]');
    await page.check('dialog.km-setd input[name="privasi"][value="pilihan"]');
    sama(await page.$eval('#kmPick', e => e.classList.contains('hidden')), false, 'Pilihan rakan dipaparkan');
    await page.check('dialog.km-setd input[name="privasi"][value="rakan"]');
    await t.klik('dialog.km-setd button[type=submit]');
    await t.ada('.toast', /^Tetapan disimpan\.$/);
    await t.ada('.km-locpill', /Lokasi: Semua rakan/);
    await page.waitForFunction(() => !document.querySelector('.km-note'));
  } },

  { kumpulan: K, nama: 'Komuniti: acara dan memo, servis (kategori, harga, butiran), sembang dan siarkan servis', lebar: 1280, langkah: async (t, page) => {
    await wsPalsu(page); await logMasuk(page);
    await t.buka('#komuniti/acara');
    await t.ada('#kmList', /Karnival Usahawan Siswa/);
    sama(await bil(page, '#kmList .km-ev'), 2, 'Acara dan memo');
    padan(await t.teks('#kmList .km-ev:not(.memo) .km-date'), /^20Okt$/, 'Tarikh acara');
    padan(await t.teks('#kmList .km-ev:not(.memo) .km-meta'), /9:00.*Dewan Agung Tuanku Canselor/s, 'Masa dan tempat');
    await t.klik('[data-ajenis="memo"]');
    await page.waitForFunction(() => document.querySelectorAll('#kmList .km-ev').length === 1);
    await t.ada('#kmList .km-ev', /Memo.*Perpustakaan tutup awal/s);
    // Servis
    await t.klik('[data-tab="servis"]');
    await page.waitForFunction(() => document.querySelectorAll('#kmList .km-scard').length === 3);
    sama(await page.$$eval('#kmList .km-price', p => p.map(x => x.textContent)), ['RM25', 'Harga runding', 'Percuma'], 'Harga servis');
    await t.klik('[data-kat="tuisyen"]');
    await page.waitForFunction(() => document.querySelectorAll('#kmList .km-scard').length === 1);
    await t.isi('#kmQ', 'kimia');
    await t.ada('#kmList .km-empty', /Tiada servis dalam kategori ini\./);
    await t.isi('#kmQ', 'kalkulus');
    await page.waitForSelector('#kmList [data-servis="21"]');
    await t.klik('[data-servis="21"]');
    await t.ada('dialog.km-sdialog', /Tawaran · 📚 Tuisyen.*Tuisyen Kalkulus asas.*RM25.*Siti Nurhaliza/s);
    // Berminat membuka sembang
    await t.klik('dialog.km-sdialog [data-x="minat"]');
    await page.waitForSelector('dialog.km-chat[open]');
    await t.ada('#kmCH', /Siti Nurhaliza/);
    await t.ada('#kmMsgs', /Mulakan perbualan/);
    await t.isi('#kmTxt', 'Assalamualaikum, masih ada slot hari Rabu?');
    await page.press('#kmTxt', 'Enter');
    await t.ada('#kmMsgs .km-msg.me', /masih ada slot hari Rabu\?/);
    sama(await nilai(page, '#kmTxt'), '', 'Kotak mesej dikosongkan');
    await t.klik('dialog.km-chat [data-close]');
    // Siarkan servis baharu
    await page.waitForSelector('#kmFab:not(.hidden)');
    await t.klik('#kmFab');
    await page.waitForSelector('dialog.km-newd[open]');
    await t.klik('dialog.km-newd label.seg:has(input[value="minta"])');
    sama(await page.$eval('dialog.km-newd label.seg.active', l => l.textContent), 'Saya perlukan', 'Jenis aktif ditanda');
    await page.setInputFiles('#kmImg', { name: 'servis.png', mimeType: 'image/png', buffer: PNG });
    await t.ada('#kmPhoto span', /^Tukar gambar$/);
    await t.isi('dialog.km-newd input[name="tajuk"]', 'Cari rakan kongsi kereta ke Seksyen 7');
    await t.pilih('dialog.km-newd select[name="kategori"]', 'hantar');
    await t.isi('dialog.km-newd input[name="harga"]', '5');
    await t.isi('dialog.km-newd input[name="kampus"]', 'Shah Alam');
    await t.klik('dialog.km-newd button[type=submit]');
    await t.ada('.toast', /^Disiarkan\.$/);
    await t.ada('.km-under button.on', /^Permintaan$/);
    // Badan permintaan /komuniti/siar (fixture dalam proses Node yang sama)
    const siar = KM.siar[0] || {};
    sama([siar.jenis, siar.tajuk, siar.kategori, siar.harga, siar.kampus], ['minta', 'Cari rakan kongsi kereta ke Seksyen 7', 'hantar', '5', 'Shah Alam'], 'Servis disiarkan');
    padan(String(siar.gambar || ''), /^data:image\/(jpeg|webp|png);base64,/, 'Gambar servis dikecilkan dan dihantar');
  } },

  /* ---------------- RUANG SOALAN, MENU, WHATSAPP ---------------- */
  { kumpulan: K, nama: 'Ruang soalan: carian FAQ, draf disimpan, pengesahan borang dan hantar ke e-mel', langkah: async (t, page) => {
    await tanpaGerak(page);
    await wsPalsu(page);
    await t.buka('#soalan');
    const semua = await bil(page, '#sqFaq details');
    sama(semua, 18, 'Semua soalan lazim');
    await t.isi('#sqFind', 'azan');
    await page.waitForFunction(() => document.querySelectorAll('#sqFaq details').length === 1);
    await t.ada('#sqFaq', /Kenapa notifikasi azan tidak keluar\?/);
    sama(await page.$eval('#sqFaq details', d => d.open), true, 'Hasil carian dibuka');
    await t.isi('#sqFind', 'premium bayar');
    await t.ada('#sqFaq h3', /^Premium & bayaran$/);
    await t.isi('#sqFind', 'xyzabc');
    await t.ada('#sqFaq', /Tiada jawapan untuk "xyzabc"/);
    // Pengesahan
    await t.klik('#sqHantar');
    await t.ada('#sqErr', /^Tulis soalan anda dahulu\.$/);
    await t.isi('#sqNama', 'Ali'); await t.pilih('#sqTopik', 'Alat Pelajar');
    await t.isi('#sqTeks', 'Bagaimana cara eksport rujukan APA 7?');
    await t.ada('#sqLen', /^37$/);
    await t.klik('#sqHantar');
    await t.ada('#sqErr', /^Isi e-mel anda supaya kami boleh membalas/);
    await t.isi('#sqEmel', 'ali@contoh'); await t.klik('#sqHantar');
    await t.ada('#sqErr', /^Semak semula alamat e-mel anda\.$/);
    // Draf kekal selepas muat semula
    await page.reload(); await page.waitForSelector('#sqForm');
    sama([await nilai(page, '#sqNama'), await nilai(page, '#sqTopik'), await nilai(page, '#sqTeks')], ['Ali', 'Alat Pelajar', 'Bagaimana cara eksport rujukan APA 7?'], 'Draf dipulihkan');
    await t.isi('#sqEmel', 'ali@contoh.my');
    await t.klik('#sqHantar');
    await page.waitForSelector('#sqDone:not([hidden])');
    await t.ada('#sqDoneTeks', /^Terima kasih, Ali\. Kami akan membalas ke ali@contoh\.my\./);
    const b = globalThis.__tanyaAkhir || {};   // fixture berjalan dalam proses Node yang sama
    sama([b.nama, b.emel, b.topik, b.teks, b.sumber, b.laman], ['Ali', 'ali@contoh.my', 'Alat Pelajar', 'Bagaimana cara eksport rujukan APA 7?', 'web', ''], 'Badan permintaan /tanya');
    sama((await storan(page, 'bl_soalanDraf')).teks, '', 'Soalan dikosongkan selepas dihantar');
    await t.klik('#sqLagi');
    await page.waitForSelector('#sqForm:not([hidden])');
    sama(await nilai(page, '#sqEmel'), 'ali@contoh.my', 'E-mel dikekalkan');
    // Had 429 dan pelayan gagal (sandaran aplikasi e-mel)
    await t.isi('#sqTeks', 'Soalan ujian HADUJI'); await t.klik('#sqHantar');
    await t.ada('#sqErr', /^Terlalu banyak soalan dalam masa singkat\./);
    await t.isi('#sqTeks', 'Soalan ujian PELAYANUJI'); await t.klik('#sqHantar');
    await t.ada('#sqErr', /^Soalan tidak dapat dihantar sekarang\. Hantar melalui aplikasi e-mel ke hello@bijaklabur\.my/);
    padan(await page.$eval('#sqErr a', a => a.href), /^mailto:hello@bijaklabur\.my\?subject=%5BSiswaCap%5D%20Umum&body=Salam%20SiswaCap/, 'Pautan mailto');
    await t.ada('#sqHantar', /Hantar ke e-mel kami/);
  } },

  { kumpulan: K, nama: 'Ruang soalan: WhatsApp, salin soalan dan pautan maklum balas', lebar: 1280, langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#soalan/maklum-balas');
    await page.waitForSelector('#sqForm');
    await t.rehat(100);
    sama(await nilai(page, '#sqTopik'), 'Maklum balas', 'Topik maklum balas dipilih');
    padan(await page.$eval('#sqTeks', e => e.placeholder), /Apa yang anda suka/, 'Pemegang tempat maklum balas');
    await page.evaluate(() => { window.open = (...a) => { window.__dibuka = a; return null; }; });
    await t.klik('[data-sq-wa="60102546720"]');
    await t.ada('#sqErr', /^Tulis soalan anda dahulu\.$/);
    await t.isi('#sqNama', 'Siti'); await t.isi('#sqTeks', 'Tambah jadual peperiksaan akhir.');
    await t.klik('#sqCopy');
    await t.ada('.toast', /^Soalan disalin$/);
    sama(await klip(page), 'Salam SiswaCap, saya Siti ada soalan.\n\nTopik: Maklum balas\nSoalan: Tambah jadual peperiksaan akhir.\n\n(Dihantar dari siswacap.my)', 'Teks disalin');
    await t.klik('[data-sq-wa="60176040937"]');
    const [url, sasar, ciri] = await page.evaluate(() => window.__dibuka);
    sama([sasar, ciri], ['_blank', 'noopener'], 'Tetingkap baharu');
    sama(decodeURIComponent(url.split('?text=')[1]), 'Salam SiswaCap, saya Siti ada soalan.\n\nTopik: Maklum balas\nSoalan: Tambah jadual peperiksaan akhir.\n\n(Dihantar dari siswacap.my)', 'Mesej WhatsApp');
    padan(url, /^https:\/\/wa\.me\/60176040937\?text=/, 'Nombor Wabil');
    await t.ada('.toast', /WhatsApp dibuka/);
    sama(await nilai(page, '#sqTeks'), '', 'Soalan dikosongkan');
    // Butang WhatsApp terapung
    await t.klik('.wa-btn');
    await page.waitForSelector('#waPop:not([hidden])');
    sama(await page.$$eval('.wa-person', a => a.map(x => x.getAttribute('href'))), ['https://wa.me/60102546720?text=Salam%2C%20saya%20ada%20pertanyaan%20tentang%20SiswaCap.', 'https://wa.me/60176040937?text=Salam%2C%20saya%20ada%20pertanyaan%20tentang%20SiswaCap.'], 'Pautan WhatsApp');
    sama(await page.$eval('.wa-btn', b => b.getAttribute('aria-expanded')), 'true', 'aria-expanded');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#waPop', { state: 'hidden' });
  } },

  { kumpulan: K, nama: 'Menu titik tiga: tema, saiz tulisan, kongsi, papan kekunci dan tutup', lebar: 1280, langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#utama');
    await t.klik('#menuBtn');
    await page.waitForSelector('#mainMenu:not([hidden])');
    sama(await page.$eval('#menuBtn', b => b.getAttribute('aria-expanded')), 'true', 'aria-expanded');
    padan(await t.teks('#kmName'), /^Tetamu$/, 'Nama tetamu');
    await t.klik('[data-km-theme="dark"]');
    sama(await page.evaluate(() => document.documentElement.dataset.theme), 'dark', 'Tema gelap');
    sama(await storan(page, 'bl_theme'), 'dark', 'Tema disimpan');
    sama(await page.$eval('[data-km-theme="dark"]', b => b.classList.contains('active')), true, 'Tema aktif ditanda');
    await t.klik('[data-km-font="lg"]');
    sama(await page.evaluate(() => document.documentElement.style.fontSize), '112.5%', 'Tulisan besar');
    sama(await storan(page, 'bl_fontScale'), 'lg', 'Saiz tulisan disimpan');
    await t.klik('[data-km-theme="auto"]');
    sama(await page.evaluate(() => document.documentElement.dataset.theme), undefined, 'Tema auto');
    // Papan kekunci: anak panah bergerak, Escape menutup dan kembali ke butang
    await page.keyboard.press('ArrowDown');
    sama(await page.evaluate(() => !!document.activeElement.closest('#mainMenu')), true, 'Fokus dalam menu');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#mainMenu', { state: 'hidden' });
    sama(await page.evaluate(() => document.activeElement.id), 'menuBtn', 'Fokus kembali ke butang menu');
    // Kongsi: salin pautan (tiada Web Share)
    await t.klik('#menuBtn'); await t.klik('#kmShare');
    await t.ada('.toast', /^Pautan disalin$/);
    sama(await klip(page), 'https://siswacap.my/', 'Pautan disalin');
    // Pautan menu membawa ke halaman dan menutup menu
    await t.klik('#menuBtn'); await t.klik('#mainMenu a[href="#soalan"]');
    await page.waitForSelector('#sqForm');
    sama(await page.$eval('#mainMenu', m => m.hidden), true, 'Menu ditutup');
    // Klik di luar menutup menu
    await t.klik('#menuBtn'); await page.mouse.click(5, 400);
    await page.waitForSelector('#mainMenu', { state: 'hidden' });
    // Selepas muat semula: tulisan besar kekal
    await page.reload(); await page.waitForLoadState('domcontentloaded');
    sama(await page.evaluate(() => document.documentElement.style.fontSize), '112.5%', 'Saiz tulisan dipulihkan');
  } },

  /* ---------------- PALET ARAHAN ---------------- */
  { kumpulan: K, nama: 'Palet arahan: Ctrl+K dan "/", kiraan zakat, peratus dan matematik, salin jawapan', lebar: 1280, langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#utama');
    await page.waitForSelector('#arahanBtn');
    await page.keyboard.press('Control+k');
    await page.waitForSelector('.md-palet:not([hidden])');
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'mdCari');
    const pertama = () => t.teks('#mdHasil li:first-child .md-t');
    await page.keyboard.type('zakat 5000');
    padan(await pertama(), new RegExp(`^Zakat 2\\.5% daripada RM ${(5000).toLocaleString('ms-MY', { minimumFractionDigits: 2 }).replace('.', '\\.')} = RM 125\\.00$`), 'Zakat');
    padan(await t.teks('#mdHasil'), /Kalkulator Zakat/, 'Cadangan halaman zakat');
    await t.isi('#mdCari', '12% daripada 350');
    padan(await pertama(), /^12% daripada 350 = 42$/, 'Peratus');
    await t.isi('#mdCari', 'kira (12+8)*3 - 4/2');
    padan(await pertama(), /^= 58$/, 'Aritmetik dengan keutamaan operator');
    await t.isi('#mdCari', '3 x 4.5');
    padan(await pertama(), /^= 13\.5$/, 'Darab dengan "x"');
    await t.isi('#mdCari', '1/0');
    sama(await page.$$eval('#mdHasil li.md-kira', l => l.length), 0, 'Bahagi sifar tidak dipaparkan');
    await t.isi('#mdCari', '(2+3)*4');
    await page.keyboard.press('Enter');
    await t.ada('.toast', /^Jawapan disalin$/);
    sama(await klip(page), '20', 'Jawapan disalin');
    sama(await page.$eval('.md-palet', p => p.hidden), true, 'Palet ditutup');
    // "/" membuka palet (bukan dalam kotak teks); carian kabur dan anak panah
    await page.locator('body').click({ position: { x: 5, y: 600 } }).catch(() => {});
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('/');
    await page.waitForSelector('.md-palet:not([hidden])');
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'mdCari');   // fokus pada bingkai seterusnya
    await page.keyboard.type('jdl');
    padan(await pertama(), /^Jadual Kelas$/, 'Padanan subjujukan');
    await page.keyboard.press('Escape');
    await page.waitForSelector('.md-palet', { state: 'hidden' });
    await t.klik('#arahanBtn');
    await page.waitForSelector('.md-palet:not([hidden])');
    padan(await t.teks('#mdHasil'), /BTC \$65,000.*Naik 1\.25% dalam 24 jam/s, 'Cadangan konteks: harga kripto');
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'mdCari');
    await page.keyboard.type('pasaran saham');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp');
    padan(await page.$eval('#mdHasil li[aria-selected="true"] .md-t', e => e.textContent), /^Pasaran saham$/, 'Pilihan pertama');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash === '#pasaran');
    await page.waitForSelector('#seg-stock:not(.hidden)');
    sama((await storan(page, 'bl_arahanKerap'))['#pasaran'], 1, 'Kekerapan direkod');
  } },

  { kumpulan: K, nama: 'Palet arahan: soalan Fiqh dihantar ke Tanya AI dengan soalan diisi', langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#utama');
    await page.waitForSelector('#arahanBtn');
    await t.klik('#arahanBtn');
    await page.waitForSelector('.md-palet:not([hidden])');
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'mdCari');
    await page.keyboard.type('hukum forex runcit?');
    padan(await t.teks('#mdHasil li:first-child .md-t'), /^Tanya AI Fiqh: "hukum forex runcit\?"$/, 'Laluan ke Tanya AI');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash === '#ibadah/fiqh/tanya');
    await page.waitForFunction(() => { const a = document.querySelector('#fqAsk'); return a && a.value === 'hukum forex runcit?'; }, null, { timeout: 8000 });
    await t.ada('.toast', /^Soalan diisi\. Tekan Tanya untuk hantar\.$/);
    // Teks tanpa padanan halaman juga ditawarkan ke Tanya AI
    await page.evaluate(() => window.MasaDepan.buka('qwxzv ploo'));
    padan(await t.teks('#mdHasil li:first-child'), /Tanya AI Fiqh: "qwxzv ploo".*Tiada padanan halaman/s, 'Tiada padanan');
    // Tema melalui palet
    await t.isi('#mdCari', 'tema gelap'); await page.keyboard.press('Enter');
    sama(await page.evaluate(() => document.documentElement.dataset.theme), 'dark', 'Tema gelap melalui palet');
  } },

  /* ---------------- HALAMAN UTAMA ---------------- */
  { kumpulan: K, nama: 'Halaman utama: pentas Sinema menukar ciri, panduan bertab, kekunci, pameran dan HUD', lebar: 1280, langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#utama');
    await page.waitForSelector('.sn-stage');
    await t.klik('#snt-pasaran');
    await t.ada('.sn-body .sn-title', /^Pasaran$/);
    sama(await page.$eval('.sn-btn-main', a => a.getAttribute('href')), '#pasaran', 'Pautan Buka');
    sama(await page.$eval('.sn-stage', s => s.dataset.ciri), 'pasaran', 'Ciri pentas');
    sama(await page.$eval('#snt-pasaran', b => [b.getAttribute('aria-selected'), b.tabIndex]), ['true', 0], 'Tab terpilih');
    // Kad petikan pameran menunjukkan gambar ciri seterusnya
    padan(await page.$eval('.xb-petik-img', e => e.style.backgroundImage), /jelajah\/belajar\.svg/, 'Gambar ciri seterusnya');
    await t.klik('[data-xb-next]');
    await t.ada('.sn-body .sn-title', /^Belajar Melabur$/);
    await t.klik('[data-xb-prev]'); await t.klik('[data-xb-prev]');
    await t.ada('.sn-body .sn-title', /^Waktu Solat$/);
    await t.klik('[data-xb-prev]');
    await t.ada('.sn-body .sn-title', /^Jadual Kelas$/);   // berpusing ke hujung
    // Papan kekunci pada ikon
    await page.focus('#snt-jadual');
    await page.keyboard.press('Home');
    await t.ada('.sn-body .sn-title', /^Waktu Solat$/);
    await page.keyboard.press('ArrowRight');
    await t.ada('.sn-body .sn-title', /^Pasaran$/);
    sama(await page.evaluate(() => document.activeElement.id), 'snt-pasaran', 'Fokus mengikut');
    await page.keyboard.press('End');
    await t.ada('.sn-body .sn-title', /^Jadual Kelas$/);
    // Panduan bertab
    await t.klik('[data-sn-guide]');
    await page.waitForSelector('.sn-guide:not([hidden])');
    sama(await bil(page, '.sn-tabs .sn-tab'), 3, 'Tiga tab panduan');
    await t.ada('.sn-g-body', /Jadual kelas dibaca dari sistem UiTM/);
    await t.klik('[data-sn-tab="1"]');
    await t.ada('.sn-g-body', /^Masukkan kod kursus dan kumpulan/);
    await page.keyboard.press('Escape');
    await page.waitForSelector('.sn-guide', { state: 'hidden' });
    // Enter pada ikon membuka halaman
    await page.focus('#snt-jadual'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash === '#jadual');
    await t.buka('#utama');
    // HUD: harga kripto daripada Pasaran
    await t.ada('.md-hud .md-kripto b', /^\$65,000 ▲1\.3%$/);
    padan(await t.teks('.md-hud .md-kripto span'), /^BTC$/, 'Simbol HUD');
    // Pameran: kad dan karusel
    sama(await page.$$eval('.xb-kad', a => a.map(x => x.getAttribute('href'))), ['#belajar', '#pasaran', '#solat', '#jadual'], 'Kad pameran');
    await t.klik('[data-xb-kongsi]');
    await t.ada('.toast', /^Pautan disalin$/);
    sama(await klip(page), 'https://siswacap.my/', 'Kongsi SiswaCap');
  } },

  { kumpulan: K, nama: 'Halaman utama: senarai harga Kripto/Saham, harga saham daripada pelayan dan pautan ke Pasaran', langkah: async (t, page) => {
    await wsPalsu(page);
    await t.buka('#utama');
    await t.ada('#h-BTC .q-price', /^\$65,000\.00$/);
    await t.ada('#homeLive', /^Masa nyata$/);
    await t.klik('[data-hseg="stock"]');
    await page.waitForSelector('#homeStocks:not(.hidden)');
    await t.ada('#hs-AAPL .q-price', /^\$230\.50$/);
    await t.ada('#hs-AAPL .q-chg', /^\+0\.85%$/);
    await t.ada('#hs-NVDA .q-chg', /^-1\.40%$/);
    padan(await t.teks('#hs-AAPL .q-sym'), /Patuh Syariah/, 'Label Syariah AAPL');
    await t.ada('#homeLive', /^Masa nyata$/);   // harga kurang 20 minit
    sama(await storan(page, 'bl_homeSeg'), 'stock', 'Pilihan disimpan');
    // Kekunci anak panah menukar segmen
    await page.focus('[data-hseg="stock"]'); await page.keyboard.press('ArrowLeft');
    await page.waitForSelector('#homeTicker:not(.hidden)');
    await t.klik('[data-hseg="stock"]');
    await t.klik('#hs-NVDA');
    await page.waitForFunction(() => location.hash === '#pasaran');
    await page.waitForSelector('#seg-stock:not(.hidden)');
    sama(await page.$eval('#stockTabs .chip.active', e => e.dataset.s), 'NASDAQ:NVDA', 'Saham dipilih dari halaman utama');
    // Kripto dari halaman utama membuka carta aset itu
    await t.buka('#utama');
    await t.klik('[data-hseg="crypto"]');
    await t.klik('#h-SOL');
    await page.waitForFunction(() => location.hash === '#pasaran');
    await t.ada('#chartTitle', /^SOL\/USDT$/);
    await page.waitForSelector('#seg-crypto:not(.hidden)');
  } }
];
