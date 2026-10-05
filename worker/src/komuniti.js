/*
 * Bijak Labur: Komuniti (peta rakan, sembang, acara dan memo kampus, servis pelajar, notifikasi dalam app)
 *
 * Semua data dalam satu Durable Object (SQLite, pelan percuma). Setiap permintaan perlu log masuk akaun
 * (token ID disahkan oleh authed() dalam akaun.js); uid diambil daripada token, bukan daripada badan permintaan.
 *
 * POST /komuniti/<op> { ... }   op: lihat OPS di bawah
 * GET  /komuniti/gambar/<id>    gambar servis (awam, seperti mana-mana hantaran awam)
 *
 * Keselamatan:
 * - Lokasi hanya dikongsi dengan rakan yang diterima (atau rakan pilihan), dimatikan secara lalai, dibundarkan
 *   kepada ~11 m dan disembunyikan selepas 24 jam. Tiada mod "awam".
 * - Sembang hanya antara rakan, atau antara pemilik servis dan orang yang menekan "Berminat".
 * - Sekat, lapor, sembunyi automatik selepas 3 laporan, dan moderasi pemilik (kunci pemilik Mod Pemilik).
 * - Had kadar per akaun dan had hantaran harian.
 */

const nowSec = () => Math.floor(Date.now() / 1000);
const day = 86400;

export const UNI = ['UiTM', 'UM', 'UKM', 'UPM', 'USM', 'UTM', 'UIAM', 'UUM', 'UNIMAS', 'UMS', 'UPSI', 'UTHM', 'UTeM', 'UMPSA', 'UniMAP', 'UMT', 'UniSZA', 'UMK', 'USIM', 'UPNM', 'Politeknik', 'Kolej', 'Lain'];
export const KATEGORI = ['tuisyen', 'reka', 'tulis', 'teknologi', 'foto', 'hantar', 'jual', 'gaya', 'makanan', 'lain'];
export const JENIS = ['acara', 'memo', 'tawar', 'minta'];
export const WARNA = ['#0E7C66', '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#CA8A04', '#0891B2', '#475569'];
const NOTIF_LALAI = { rakan: true, mesej: true, minat: true, acara: true };
export const MAX_IMG = 400 * 1024;
const HARIAN = 10;          // hantaran baharu sehari bagi setiap akaun
const LAPOR_SEMBUNYI = 3;   // laporan berbeza sebelum hantaran disembunyikan automatik
const LOKASI_TTL = day;     // lokasi lebih lama daripada ini tidak dipaparkan

/* ---------- Pembersihan input ---------- */
export const teks = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0009\u000b-\u001f\u007f‪-‮⁦-⁩]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const baris = (v, max) => teks(v, max).replace(/\s+/g, ' ');
const pilih = (v, list, def) => list.includes(v) ? v : def;
const uidOk = u => typeof u === 'string' && /^[\w-]{1,128}$/.test(u);
const pasangan = (a, b) => a < b ? [a, b] : [b, a];
// Tarikh Malaysia (UTC+8) untuk streak harian
const hariMY = (t = nowSec()) => new Date((t + 8 * 3600) * 1000).toISOString().slice(0, 10);
const KOD_ABJAD = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const kodRawak = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => KOD_ABJAD[b % KOD_ABJAD.length]).join('');

export function gambarDariBase64(s) {
  const m = String(s || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  if (bin.length > MAX_IMG) throw new Http(413, 'Gambar terlalu besar.');
  const u8 = Uint8Array.from(bin, c => c.charCodeAt(0));
  const ok = m[1] === 'image/jpeg' ? u8[0] === 0xff && u8[1] === 0xd8 : m[1] === 'image/png' ? u8[0] === 0x89 && u8[1] === 0x50 : u8[0] === 0x52 && u8[8] === 0x57;
  if (!ok) throw new Http(400, 'Fail gambar tidak sah.');
  return { buf: u8, mime: m[1] };
}

export class Http extends Error { constructor(status, msg, extra) { super(msg); this.status = status; this.extra = extra; } }

/* ---------- Durable Object ---------- */
export class Komuniti {
  constructor(state, env) {
    this.sql = state.storage.sql;
    this.env = env;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS profil (uid TEXT PRIMARY KEY, nama TEXT, kod TEXT UNIQUE, uni TEXT, warna TEXT, privasi TEXT DEFAULT 'tutup',
        pilihan TEXT DEFAULT '[]', notif TEXT DEFAULT '{}', streak INTEGER DEFAULT 0, streak_hari TEXT DEFAULT '', dibuat INTEGER, sekat INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS lokasi (uid TEXT PRIMARY KEY, lat REAL, lng REAL, t INTEGER);
      CREATE TABLE IF NOT EXISTS rakan (a TEXT, b TEXT, status TEXT, t INTEGER, PRIMARY KEY (a, b));
      CREATE TABLE IF NOT EXISTS blok (a TEXT, b TEXT, PRIMARY KEY (a, b));
      CREATE TABLE IF NOT EXISTS mesej (id INTEGER PRIMARY KEY AUTOINCREMENT, a TEXT, b TEXT, dari TEXT, teks TEXT, t INTEGER);
      CREATE INDEX IF NOT EXISTS mesej_ab ON mesej (a, b, id);
      CREATE TABLE IF NOT EXISTS hantaran (id INTEGER PRIMARY KEY AUTOINCREMENT, jenis TEXT, uid TEXT, uni TEXT, tajuk TEXT, teks TEXT,
        tarikh TEXT, tempat TEXT, kategori TEXT, harga INTEGER, kampus TEXT, gambar BLOB, mime TEXT, status TEXT DEFAULT 'buka',
        lapor INTEGER DEFAULT 0, sembunyi INTEGER DEFAULT 0, t INTEGER);
      CREATE INDEX IF NOT EXISTS hantaran_jenis ON hantaran (jenis, t);
      CREATE TABLE IF NOT EXISTS minat (hid INTEGER, uid TEXT, t INTEGER, PRIMARY KEY (hid, uid));
      CREATE TABLE IF NOT EXISTS lapor (sasaran TEXT, oleh TEXT, sebab TEXT, t INTEGER, PRIMARY KEY (sasaran, oleh));
      CREATE TABLE IF NOT EXISTS notif (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT, jenis TEXT, teks TEXT, rujuk TEXT, t INTEGER, baca INTEGER DEFAULT 0);
      CREATE INDEX IF NOT EXISTS notif_uid ON notif (uid, id);
    `);
  }

  all(q, ...b) { return this.sql.exec(q, ...b).toArray(); }
  one(q, ...b) { return this.all(q, ...b)[0] || null; }
  run(q, ...b) { this.sql.exec(q, ...b); }

  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === 'GET') {
      const m = url.pathname.match(/^\/gambar\/(\d+)$/);
      const r = m && this.one('SELECT gambar, mime FROM hantaran WHERE id = ? AND sembunyi = 0', +m[1]);
      if (!r || !r.gambar) return new Response('Tiada', { status: 404 });
      return new Response(r.gambar, { headers: { 'content-type': r.mime || 'image/jpeg', 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' } });
    }
    const b = await req.json();
    try {
      const fn = OPS[b.op];
      if (!fn) throw new Http(404, 'Tidak dijumpai');
      if (!b.admin) {
        this.profil(b.uid, b.nama);
        if (this.one('SELECT sekat FROM profil WHERE uid = ?', b.uid).sekat) throw new Http(403, 'Akaun anda telah disekat daripada Komuniti kerana melanggar garis panduan.');
      }
      return Response.json(fn.call(this, b.uid, b.data || {}) || { ok: true });
    } catch (e) {
      if (e instanceof Http) return Response.json({ error: e.message, ...(e.extra || {}) }, { status: e.status });
      throw e;
    }
  }

  // Cipta profil kali pertama dengan kod rakan unik
  profil(uid, nama) {
    if (this.one('SELECT uid FROM profil WHERE uid = ?', uid)) return;
    let kod;
    do kod = kodRawak(); while (this.one('SELECT uid FROM profil WHERE kod = ?', kod));
    const w = WARNA[[...uid].reduce((s, c) => s + c.charCodeAt(0), 0) % WARNA.length];
    this.run('INSERT INTO profil (uid, nama, kod, uni, warna, dibuat) VALUES (?, ?, ?, ?, ?, ?)', uid, baris(nama, 40) || 'Pengguna', kod, 'UiTM', w, nowSec());
  }

  saya(uid) {
    const p = this.one('SELECT * FROM profil WHERE uid = ?', uid);
    return { uid, nama: p.nama, kod: p.kod, uni: p.uni, warna: p.warna, privasi: p.privasi, pilihan: JSON.parse(p.pilihan || '[]'), notif: { ...NOTIF_LALAI, ...JSON.parse(p.notif || '{}') }, streak: p.streak, streakHari: p.streak_hari };
  }

  rakanSah(a, b) { return !!this.one("SELECT 1 AS x FROM rakan WHERE a = ? AND b = ? AND status = 'rakan'", a, b); }
  disekat(a, b) { return !!this.one('SELECT 1 AS x FROM blok WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)', a, b, b, a); }
  bolehSembang(a, b) {
    if (a === b || this.disekat(a, b)) return false;
    if (this.rakanSah(a, b)) return true;
    // Pemilik servis dan orang yang berminat
    return !!this.one('SELECT 1 AS x FROM minat m JOIN hantaran h ON h.id = m.hid WHERE (h.uid = ? AND m.uid = ?) OR (h.uid = ? AND m.uid = ?)', a, b, b, a);
  }

  beritahu(uid, jenis, teksN, rujuk) {
    const p = this.one('SELECT notif FROM profil WHERE uid = ?', uid);
    if (!p || !{ ...NOTIF_LALAI, ...JSON.parse(p.notif || '{}') }[jenis]) return;
    // Mesej berturut-turut daripada orang yang sama digabungkan menjadi satu notifikasi
    if (jenis === 'mesej') this.run("DELETE FROM notif WHERE uid = ? AND jenis = 'mesej' AND rujuk = ? AND baca = 0", uid, rujuk);
    this.run('INSERT INTO notif (uid, jenis, teks, rujuk, t) VALUES (?, ?, ?, ?, ?)', uid, jenis, teksN.slice(0, 200), String(rujuk || ''), nowSec());
    this.run('DELETE FROM notif WHERE uid = ? AND id <= (SELECT id FROM notif WHERE uid = ? ORDER BY id DESC LIMIT 1 OFFSET 100)', uid, uid);
  }

  namaOf(uid) { const r = this.one('SELECT nama FROM profil WHERE uid = ?', uid); return r ? r.nama : 'Pengguna'; }

  hadHarian(uid) {
    const n = this.one('SELECT COUNT(*) AS n FROM hantaran WHERE uid = ? AND t > ?', uid, nowSec() - day).n;
    if (n >= HARIAN) throw new Http(429, `Had ${HARIAN} hantaran sehari telah dicapai. Cuba lagi esok.`);
  }

  kad(h, uid) {
    const p = this.one('SELECT nama, warna, uni FROM profil WHERE uid = ?', h.uid) || { nama: 'Pengguna', warna: WARNA[0] };
    const minat = this.one('SELECT COUNT(*) AS n FROM minat WHERE hid = ?', h.id).n;
    return {
      id: h.id, jenis: h.jenis, uni: h.uni, tajuk: h.tajuk, teks: h.teks, tarikh: h.tarikh, tempat: h.tempat, kategori: h.kategori,
      harga: h.harga, kampus: h.kampus, gambar: !!h.ada_gambar, status: h.status, t: h.t, milik: h.uid === uid,
      oleh: { nama: p.nama, warna: p.warna }, minat, saya_minat: !!this.one('SELECT 1 AS x FROM minat WHERE hid = ? AND uid = ?', h.id, uid)
    };
  }
}

/* ---------- Operasi (this = Komuniti) ---------- */
const PILIH_H = 'id, jenis, uid, uni, tajuk, teks, tarikh, tempat, kategori, harga, kampus, status, t, (gambar IS NOT NULL) AS ada_gambar';

const OPS = {
  // Profil sendiri, kiraan notifikasi, dan streak harian (dikira apabila Komuniti dibuka)
  saya(uid) {
    const p = this.one('SELECT streak, streak_hari FROM profil WHERE uid = ?', uid), hari = hariMY();
    if (p.streak_hari !== hari) {
      const semalam = hariMY(nowSec() - day);
      this.run('UPDATE profil SET streak = ?, streak_hari = ? WHERE uid = ?', p.streak_hari === semalam ? p.streak + 1 : 1, hari, uid);
    }
    return { profil: this.saya(uid), belum: this.one('SELECT COUNT(*) AS n FROM notif WHERE uid = ? AND baca = 0', uid).n };
  },

  ringkas(uid) {
    return { belum: this.one('SELECT COUNT(*) AS n FROM notif WHERE uid = ? AND baca = 0', uid).n };
  },

  tetapan(uid, d) {
    const cur = this.saya(uid);
    const nama = d.nama != null ? baris(d.nama, 40) : cur.nama;
    if (nama.length < 2) throw new Http(400, 'Nama terlalu pendek.');
    const rakan = new Set(this.all("SELECT b FROM rakan WHERE a = ? AND status = 'rakan'", uid).map(r => r.b));
    const pilihan = Array.isArray(d.pilihan) ? [...new Set(d.pilihan.filter(u => uidOk(u) && rakan.has(u)))].slice(0, 200) : cur.pilihan;
    const notif = d.notif && typeof d.notif === 'object' ? Object.fromEntries(Object.keys(NOTIF_LALAI).map(k => [k, k in d.notif ? !!d.notif[k] : cur.notif[k]])) : cur.notif;
    const privasi = d.privasi != null ? pilih(d.privasi, ['rakan', 'pilihan', 'tutup'], cur.privasi) : cur.privasi;
    this.run('UPDATE profil SET nama = ?, uni = ?, warna = ?, privasi = ?, pilihan = ?, notif = ? WHERE uid = ?',
      nama, d.uni != null ? pilih(d.uni, UNI, cur.uni) : cur.uni, d.warna != null ? pilih(d.warna, WARNA, cur.warna) : cur.warna,
      privasi, JSON.stringify(pilihan), JSON.stringify(notif), uid);
    if (privasi === 'tutup') this.run('DELETE FROM lokasi WHERE uid = ?', uid);
    return { profil: this.saya(uid) };
  },

  lokasi(uid, d) {
    const { privasi } = this.saya(uid);
    if (privasi === 'tutup') { this.run('DELETE FROM lokasi WHERE uid = ?', uid); return { ok: true, dikongsi: false }; }
    const lat = +d.lat, lng = +d.lng;
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) throw new Http(400, 'Lokasi tidak sah.');
    this.run('INSERT OR REPLACE INTO lokasi (uid, lat, lng, t) VALUES (?, ?, ?, ?)', uid, Math.round(lat * 1e4) / 1e4, Math.round(lng * 1e4) / 1e4, nowSec());
    return { ok: true, dikongsi: true };
  },

  hentiLokasi(uid) { this.run('DELETE FROM lokasi WHERE uid = ?', uid); },

  // Rakan, permintaan masuk/keluar, dan lokasi rakan yang membenarkan saya melihatnya
  peta(uid) {
    const t = nowSec();
    const rakan = this.all(`SELECT p.uid, p.nama, p.warna, p.uni, p.streak, p.streak_hari, p.privasi, p.pilihan, l.lat, l.lng, l.t AS lt
      FROM rakan r JOIN profil p ON p.uid = r.b LEFT JOIN lokasi l ON l.uid = r.b WHERE r.a = ? AND r.status = 'rakan' ORDER BY p.nama`, uid)
      .map(r => {
        const nampak = r.lt && t - r.lt < LOKASI_TTL && (r.privasi === 'rakan' || (r.privasi === 'pilihan' && JSON.parse(r.pilihan || '[]').includes(uid)));
        const aktif = r.streak_hari === hariMY() || r.streak_hari === hariMY(t - day);
        return { uid: r.uid, nama: r.nama, warna: r.warna, uni: r.uni, streak: aktif ? r.streak : 0, lokasi: nampak ? { lat: r.lat, lng: r.lng, t: r.lt } : null };
      });
    const masuk = this.all("SELECT p.uid, p.nama, p.warna, p.uni FROM rakan r JOIN profil p ON p.uid = r.a WHERE r.b = ? AND r.status = 'minta' ORDER BY r.t DESC", uid);
    const keluar = this.all("SELECT p.uid, p.nama, p.warna FROM rakan r JOIN profil p ON p.uid = r.b WHERE r.a = ? AND r.status = 'minta' ORDER BY r.t DESC", uid);
    const sendiri = this.one('SELECT lat, lng, t FROM lokasi WHERE uid = ?', uid);
    return { rakan, masuk, keluar, saya: sendiri };
  },

  tambah(uid, d) {
    const kod = String(d.kod || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const p = kod.length === 6 && this.one('SELECT uid, nama FROM profil WHERE kod = ?', kod);
    if (!p) throw new Http(404, 'Kod rakan tidak dijumpai. Semak semula.');
    if (p.uid === uid) throw new Http(400, 'Ini kod anda sendiri.');
    if (this.disekat(uid, p.uid)) throw new Http(404, 'Kod rakan tidak dijumpai. Semak semula.');
    if (this.rakanSah(uid, p.uid)) return { ok: true, status: 'rakan', nama: p.nama };
    const bilMinta = this.one("SELECT COUNT(*) AS n FROM rakan WHERE a = ? AND status = 'minta' AND t > ?", uid, nowSec() - day).n;
    if (bilMinta >= 30) throw new Http(429, 'Terlalu banyak permintaan rakan hari ini.');
    // Jika dia sudah meminta saya, terus jadi rakan
    if (this.one("SELECT 1 AS x FROM rakan WHERE a = ? AND b = ? AND status = 'minta'", p.uid, uid)) {
      OPS.jawab.call(this, uid, { uid: p.uid, terima: true });
      return { ok: true, status: 'rakan', nama: p.nama };
    }
    this.run("INSERT OR REPLACE INTO rakan (a, b, status, t) VALUES (?, ?, 'minta', ?)", uid, p.uid, nowSec());
    this.beritahu(p.uid, 'rakan', `${this.namaOf(uid)} mahu menjadi rakan anda.`, 'rakan');
    return { ok: true, status: 'minta', nama: p.nama };
  },

  jawab(uid, d) {
    if (!uidOk(d.uid) || !this.one("SELECT 1 AS x FROM rakan WHERE a = ? AND b = ? AND status = 'minta'", d.uid, uid)) throw new Http(404, 'Permintaan tidak dijumpai.');
    if (d.terima) {
      const t = nowSec();
      this.run("INSERT OR REPLACE INTO rakan (a, b, status, t) VALUES (?, ?, 'rakan', ?), (?, ?, 'rakan', ?)", uid, d.uid, t, d.uid, uid, t);
      this.beritahu(d.uid, 'rakan', `${this.namaOf(uid)} menerima permintaan rakan anda.`, 'rakan');
    } else this.run('DELETE FROM rakan WHERE a = ? AND b = ?', d.uid, uid);
  },

  batal(uid, d) { if (uidOk(d.uid)) this.run("DELETE FROM rakan WHERE a = ? AND b = ? AND status = 'minta'", uid, d.uid); },

  buang(uid, d) {
    if (!uidOk(d.uid)) throw new Http(400, 'Tidak sah.');
    this.run('DELETE FROM rakan WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)', uid, d.uid, d.uid, uid);
  },

  sekat(uid, d) {
    if (!uidOk(d.uid) || d.uid === uid) throw new Http(400, 'Tidak sah.');
    OPS.buang.call(this, uid, d);
    this.run('INSERT OR IGNORE INTO blok (a, b) VALUES (?, ?)', uid, d.uid);
  },

  nyahsekat(uid, d) { if (uidOk(d.uid)) this.run('DELETE FROM blok WHERE a = ? AND b = ?', uid, d.uid); },

  disekat(uid) { return { senarai: this.all('SELECT p.uid, p.nama FROM blok b JOIN profil p ON p.uid = b.b WHERE b.a = ?', uid) }; },

  /* ---------- Sembang ---------- */
  sembang(uid, d) {
    if (!uidOk(d.uid) || !this.bolehSembang(uid, d.uid)) throw new Http(403, 'Anda hanya boleh bersembang dengan rakan atau pihak servis yang berkaitan.');
    const [a, b] = pasangan(uid, d.uid);
    const selepas = Math.max(0, +d.selepas || 0);
    const mesej = selepas
      ? this.all('SELECT id, dari, teks, t FROM mesej WHERE a = ? AND b = ? AND id > ? ORDER BY id LIMIT 100', a, b, selepas)
      : this.all('SELECT * FROM (SELECT id, dari, teks, t FROM mesej WHERE a = ? AND b = ? ORDER BY id DESC LIMIT 60) ORDER BY id', a, b);
    this.run("UPDATE notif SET baca = 1 WHERE uid = ? AND jenis = 'mesej' AND rujuk = ?", uid, d.uid);
    const p = this.one('SELECT nama, warna FROM profil WHERE uid = ?', d.uid);
    return { dengan: { uid: d.uid, nama: p ? p.nama : 'Pengguna', warna: p ? p.warna : WARNA[0] }, mesej: mesej.map(m => ({ id: m.id, saya: m.dari === uid, teks: m.teks, t: m.t })) };
  },

  hantar(uid, d) {
    const isi = teks(d.teks, 500);
    if (!isi) throw new Http(400, 'Mesej kosong.');
    if (!uidOk(d.uid) || !this.bolehSembang(uid, d.uid)) throw new Http(403, 'Anda hanya boleh bersembang dengan rakan atau pihak servis yang berkaitan.');
    const [a, b] = pasangan(uid, d.uid);
    this.run('INSERT INTO mesej (a, b, dari, teks, t) VALUES (?, ?, ?, ?, ?)', a, b, uid, isi, nowSec());
    // Simpan 300 mesej terakhir bagi setiap perbualan
    this.run('DELETE FROM mesej WHERE a = ? AND b = ? AND id <= (SELECT id FROM mesej WHERE a = ? AND b = ? ORDER BY id DESC LIMIT 1 OFFSET 300)', a, b, a, b);
    this.beritahu(d.uid, 'mesej', `${this.namaOf(uid)}: ${isi.slice(0, 80)}`, uid);
    return { ok: true };
  },

  // Senarai perbualan terkini
  perbualan(uid) {
    const rows = this.all(`SELECT m.a, m.b, m.dari, m.teks, m.t FROM mesej m JOIN (SELECT a, b, MAX(id) AS id FROM mesej WHERE a = ? OR b = ? GROUP BY a, b) x ON x.id = m.id ORDER BY m.id DESC LIMIT 50`, uid, uid);
    const belum = new Set(this.all("SELECT rujuk FROM notif WHERE uid = ? AND jenis = 'mesej' AND baca = 0", uid).map(r => r.rujuk));
    return {
      senarai: rows.map(r => { const lain = r.a === uid ? r.b : r.a, p = this.one('SELECT nama, warna FROM profil WHERE uid = ?', lain); return { uid: lain, nama: p ? p.nama : 'Pengguna', warna: p ? p.warna : WARNA[0], teks: r.teks, saya: r.dari === uid, t: r.t, baru: belum.has(lain) }; })
        .filter(r => !this.disekat(uid, r.uid))
    };
  },

  /* ---------- Acara, memo dan servis ---------- */
  senarai(uid, d) {
    const blok = this.all('SELECT b FROM blok WHERE a = ? UNION SELECT a FROM blok WHERE b = ?', uid, uid).map(r => r.b);
    const where = ['sembunyi = 0'], arg = [];
    if (d.bahagian === 'acara') {
      const jenis = d.jenis === 'acara' || d.jenis === 'memo' ? [d.jenis] : ['acara', 'memo'];
      where.push(`jenis IN (${jenis.map(() => '?').join(',')})`); arg.push(...jenis);
      // Acara yang belum berlalu (atau hari ini), memo 30 hari terakhir
      where.push("((jenis = 'acara' AND tarikh >= ?) OR (jenis = 'memo' AND t > ?))"); arg.push(hariMY(nowSec() - day), nowSec() - 30 * day);
    } else {
      where.push('jenis = ?'); arg.push(d.jenis === 'minta' ? 'minta' : 'tawar');
      if (KATEGORI.includes(d.kategori)) { where.push('kategori = ?'); arg.push(d.kategori); }
    }
    if (d.saya) { where.push('uid = ?'); arg.push(uid); }
    else if (d.tugasan) { where.push('(id IN (SELECT hid FROM minat WHERE uid = ?) OR (uid = ? AND id IN (SELECT hid FROM minat)))'); arg.push(uid, uid); }
    else {
      if (d.bahagian !== 'acara') where.push("status = 'buka'");
      if (UNI.includes(d.uni)) { where.push('uni = ?'); arg.push(d.uni); }
    }
    const q = baris(d.q, 60).toLowerCase();
    if (q) { where.push('(LOWER(tajuk) LIKE ? OR LOWER(teks) LIKE ? OR LOWER(kampus) LIKE ?)'); arg.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (blok.length) { where.push(`uid NOT IN (${blok.map(() => '?').join(',')})`); arg.push(...blok); }
    const order = d.bahagian === 'acara' ? "CASE WHEN jenis = 'acara' THEN tarikh ELSE '9' END, t DESC" : 't DESC';
    return { senarai: this.all(`SELECT ${PILIH_H} FROM hantaran WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 60`, ...arg).map(h => this.kad(h, uid)) };
  },

  siar(uid, d) {
    const jenis = pilih(d.jenis, JENIS, null);
    if (!jenis) throw new Http(400, 'Jenis hantaran tidak sah.');
    this.hadHarian(uid);
    const tajuk = baris(d.tajuk, 80), isi = teks(d.teks, 1000);
    if (tajuk.length < 4) throw new Http(400, 'Tajuk terlalu pendek.');
    const uni = pilih(d.uni, UNI, this.saya(uid).uni);
    let tarikh = null, tempat = null, kategori = null, harga = null, kampus = null, img = null;
    if (jenis === 'acara') {
      tarikh = String(d.tarikh || '').match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/) ? String(d.tarikh) : null;
      if (!tarikh) throw new Http(400, 'Pilih tarikh acara.');
      if (tarikh.slice(0, 10) < hariMY(nowSec() - day)) throw new Http(400, 'Tarikh acara sudah berlalu.');
      tempat = baris(d.tempat, 80);
    }
    if (jenis === 'tawar' || jenis === 'minta') {
      kategori = pilih(d.kategori, KATEGORI, 'lain');
      const h = d.harga === '' || d.harga == null ? null : Math.round(+d.harga * 100);
      if (h != null && !(h >= 0 && h <= 1000000)) throw new Http(400, 'Harga mesti antara RM0 dan RM10,000.');
      harga = h;
      kampus = baris(d.kampus, 40);
    }
    if (d.gambar) img = gambarDariBase64(d.gambar);
    this.run('INSERT INTO hantaran (jenis, uid, uni, tajuk, teks, tarikh, tempat, kategori, harga, kampus, gambar, mime, t) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      jenis, uid, uni, tajuk, isi, tarikh, tempat, kategori, harga, kampus, img ? img.buf : null, img ? img.mime : null, nowSec());
    const id = this.one('SELECT last_insert_rowid() AS id').id;
    // Beritahu pelajar universiti yang sama tentang acara baharu (had 300 orang)
    if (jenis === 'acara')
      for (const r of this.all('SELECT uid FROM profil WHERE uni = ? AND uid != ? AND sekat = 0 LIMIT 300', uni, uid))
        if (!this.disekat(uid, r.uid)) this.beritahu(r.uid, 'acara', `Acara baharu di ${uni}: ${tajuk}`, `h${id}`);
    return { id };
  },

  padam(uid, d) {
    const h = this.one('SELECT uid FROM hantaran WHERE id = ?', +d.id);
    if (!h || h.uid !== uid) throw new Http(404, 'Hantaran tidak dijumpai.');
    hapusHantaran(this, +d.id);
  },

  tutup(uid, d) {
    const h = this.one('SELECT uid, status FROM hantaran WHERE id = ?', +d.id);
    if (!h || h.uid !== uid) throw new Http(404, 'Hantaran tidak dijumpai.');
    this.run('UPDATE hantaran SET status = ? WHERE id = ?', h.status === 'buka' ? 'tutup' : 'buka', +d.id);
  },

  minat(uid, d) {
    const h = this.one("SELECT id, uid, tajuk, jenis FROM hantaran WHERE id = ? AND sembunyi = 0 AND jenis IN ('tawar', 'minta')", +d.id);
    if (!h) throw new Http(404, 'Servis tidak dijumpai.');
    if (h.uid === uid) throw new Http(400, 'Ini servis anda sendiri.');
    if (this.disekat(uid, h.uid)) throw new Http(403, 'Tidak dibenarkan.');
    if (this.one('SELECT 1 AS x FROM minat WHERE hid = ? AND uid = ?', h.id, uid)) return { ok: true, uid: h.uid };
    this.run('INSERT INTO minat (hid, uid, t) VALUES (?, ?, ?)', h.id, uid, nowSec());
    this.beritahu(h.uid, 'minat', `${this.namaOf(uid)} berminat dengan "${h.tajuk}". Buka sembang untuk berbincang.`, uid);
    return { ok: true, uid: h.uid };
  },

  // Siapa yang berminat dengan servis saya
  peminat(uid, d) {
    const h = this.one('SELECT uid FROM hantaran WHERE id = ?', +d.id);
    if (!h || h.uid !== uid) throw new Http(404, 'Hantaran tidak dijumpai.');
    return { senarai: this.all('SELECT p.uid, p.nama, p.warna, p.uni FROM minat m JOIN profil p ON p.uid = m.uid WHERE m.hid = ? ORDER BY m.t DESC', +d.id) };
  },

  lapor(uid, d) {
    const sebab = baris(d.sebab, 200) || 'Tidak dinyatakan';
    if (d.id != null) {
      const h = this.one('SELECT id, uid FROM hantaran WHERE id = ?', +d.id);
      if (!h) throw new Http(404, 'Hantaran tidak dijumpai.');
      if (h.uid === uid) throw new Http(400, 'Ini hantaran anda sendiri.');
      this.run('INSERT OR IGNORE INTO lapor (sasaran, oleh, sebab, t) VALUES (?, ?, ?, ?)', `h${h.id}`, uid, sebab, nowSec());
      const n = this.one('SELECT COUNT(*) AS n FROM lapor WHERE sasaran = ?', `h${h.id}`).n;
      this.run('UPDATE hantaran SET lapor = ?, sembunyi = CASE WHEN ? >= ? THEN 1 ELSE sembunyi END WHERE id = ?', n, n, LAPOR_SEMBUNYI, h.id);
    } else if (uidOk(d.uid) && d.uid !== uid) {
      this.run('INSERT OR IGNORE INTO lapor (sasaran, oleh, sebab, t) VALUES (?, ?, ?, ?)', `u${d.uid}`, uid, sebab, nowSec());
    } else throw new Http(400, 'Tidak sah.');
  },

  /* ---------- Notifikasi ---------- */
  notif(uid) {
    const senarai = this.all('SELECT id, jenis, teks, rujuk, t, baca FROM notif WHERE uid = ? ORDER BY id DESC LIMIT 50', uid);
    this.run('UPDATE notif SET baca = 1 WHERE uid = ?', uid);
    return { senarai };
  },

  // Padam semua data Komuniti akaun ini
  padamSaya(uid) {
    for (const r of this.all('SELECT id FROM hantaran WHERE uid = ?', uid)) hapusHantaran(this, r.id);
    for (const q of ['DELETE FROM lokasi WHERE uid = ?', 'DELETE FROM rakan WHERE a = ?1 OR b = ?1', 'DELETE FROM blok WHERE a = ?1 OR b = ?1',
      'DELETE FROM mesej WHERE a = ?1 OR b = ?1', 'DELETE FROM minat WHERE uid = ?', 'DELETE FROM notif WHERE uid = ?1 OR rujuk = ?1',
      'DELETE FROM lapor WHERE oleh = ?', 'DELETE FROM profil WHERE uid = ?']) this.run(q, uid);
    return { ok: true, padam: true };
  },

  /* ---------- Moderasi pemilik (b.admin, disahkan dengan kunci pemilik di pintu masuk) ---------- */
  adminLapor() {
    const h = this.all(`SELECT ${PILIH_H}, lapor, sembunyi FROM hantaran WHERE lapor > 0 ORDER BY sembunyi DESC, lapor DESC, t DESC LIMIT 100`)
      .map(r => ({ ...this.kad(r, ''), lapor: r.lapor, sembunyi: !!r.sembunyi, sebab: this.all('SELECT sebab FROM lapor WHERE sasaran = ? LIMIT 5', `h${r.id}`).map(x => x.sebab), pemilik: r.uid }));
    const u = this.all("SELECT SUBSTR(l.sasaran, 2) AS uid, COUNT(*) AS n, p.nama, p.sekat FROM lapor l LEFT JOIN profil p ON p.uid = SUBSTR(l.sasaran, 2) WHERE l.sasaran LIKE 'u%' GROUP BY l.sasaran ORDER BY n DESC LIMIT 50");
    const stat = { pengguna: this.one('SELECT COUNT(*) AS n FROM profil').n, hantaran: this.one('SELECT COUNT(*) AS n FROM hantaran').n };
    return { hantaran: h, pengguna: u, stat };
  },
  adminPadam(_, d) { hapusHantaran(this, +d.id); },
  adminPulih(_, d) {
    this.run('UPDATE hantaran SET sembunyi = 0, lapor = 0 WHERE id = ?', +d.id);
    this.run('DELETE FROM lapor WHERE sasaran = ?', `h${+d.id}`);
  },
  adminSekat(_, d) {
    if (!uidOk(d.uid)) throw new Http(400, 'Tidak sah.');
    this.run('UPDATE profil SET sekat = ? WHERE uid = ?', d.sekat ? 1 : 0, d.uid);
    if (d.sekat) { this.run('UPDATE hantaran SET sembunyi = 1 WHERE uid = ?', d.uid); this.run('DELETE FROM lokasi WHERE uid = ?', d.uid); }
  }
};

function hapusHantaran(k, id) {
  k.run('DELETE FROM hantaran WHERE id = ?', id);
  k.run('DELETE FROM minat WHERE hid = ?', id);
  k.run('DELETE FROM lapor WHERE sasaran = ?', `h${id}`);
}

const ADMIN = new Set(['adminLapor', 'adminPadam', 'adminPulih', 'adminSekat']);
export const OP_NAMES = Object.keys(OPS);

/* ---------- Pintu masuk HTTP (dipanggil oleh worker/src/index.js) ---------- */
const stub = env => env.KOMUNITI.get(env.KOMUNITI.idFromName('komuniti'));

// Sahkan kunci pemilik melalui pelayan nota (sumber tunggal kunci Mod Pemilik)
async function pemilik(req, env) {
  const auth = req.headers.get('x-kunci-pemilik') || '';
  if (!auth || auth.length > 200 || !env.NOTA_SVC) return false;
  try {
    const r = await env.NOTA_SVC.fetch('https://nota/admin/check', { headers: { Authorization: 'Bearer ' + auth, 'cf-connecting-ip': req.headers.get('cf-connecting-ip') || '' } });
    return r.ok;
  } catch { return false; }
}

export async function handleKomuniti(req, env, path, authed) {
  if (!env.KOMUNITI) return { status: 503, data: { error: 'Komuniti belum disediakan.' } };
  const g = path.match(/^\/komuniti\/gambar\/(\d+)$/);
  if (g && req.method === 'GET') return { response: await stub(env).fetch(`https://komuniti/gambar/${g[1]}`) };
  if (req.method !== 'POST') return { status: 405, data: { error: 'Kaedah tidak dibenarkan.' } };
  const op = path.slice('/komuniti/'.length);
  if (!OP_NAMES.includes(op)) return { status: 404, data: { error: 'Tidak dijumpai' } };
  const raw = await req.text();
  if (raw.length > 700000) return { status: 413, data: { error: 'Permintaan terlalu besar.' } };
  let data; try { data = raw ? JSON.parse(raw) : {}; } catch { return { status: 400, data: { error: 'JSON tidak sah.' } }; }

  if (ADMIN.has(op)) {
    if (!(await pemilik(req, env))) return { status: 401, data: { error: 'Kunci pemilik tidak sah.' } };
    const r = await stub(env).fetch('https://komuniti/', { method: 'POST', body: JSON.stringify({ op, admin: true, uid: '', data }) });
    return { status: r.status, data: await r.json() };
  }
  const who = await authed(req, env);
  if (who.error) return who.error;
  // Had kadar per akaun (dan sekali lagi per IP) supaya satu pihak tidak membanjiri Komuniti
  if (env.KOMUNITI_LIMIT) {
    for (const key of [`u:${who.uid}`, `ip:${req.headers.get('cf-connecting-ip') || 'x'}`])
      if (!(await env.KOMUNITI_LIMIT.limit({ key })).success) return { status: 429, data: { error: 'Terlalu banyak permintaan. Cuba lagi sebentar.' } };
  }
  const r = await stub(env).fetch('https://komuniti/', { method: 'POST', body: JSON.stringify({ op, uid: who.uid, nama: who.claims.name || (who.claims.email || '').split('@')[0], data }) });
  return { status: r.status, data: await r.json() };
}
