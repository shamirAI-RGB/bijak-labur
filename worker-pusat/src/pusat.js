/*
 * Durable Object "Pusat": satu objek (SQLite) menyimpan
 *  - sesi pelawat tanpa nama (id rawak setiap tab, halaman semasa, negara, jenis peranti; tiada IP, tiada kuki)
 *  - penggunaan token AI setiap ciri dan penyedia (dilaporkan oleh worker-fiqh melalui /catat)
 *  - kesihatan perkhidmatan, log peristiwa, ingatan sembang agen dan tetapan
 *  - WebSocket papan pemilik (API hibernasi) yang menerima ringkasan langsung
 *
 * Laluan dalaman (dipanggil oleh app.js melalui stub, bukan dari internet):
 *  POST /denyut {sid, laman, negara, peranti, rujukan}  -> { kini }
 *  POST /catat  [{laluan, penyedia, model, masuk, keluar, cache, ms, ok}]
 *  GET  /papan      data penuh papan      GET /ringkas   ringkasan kecil (siaran WebSocket dan agen)
 *  POST /tiket      tiket WebSocket 60 saat     GET /ws?tiket=   naik taraf WebSocket
 *  POST /peristiwa {jenis, teks}    GET /peristiwa
 *  POST /sembang {peran, teks}      GET /sembang       DELETE /sembang
 *  POST /kesihatan [{nama, ok, ms, nota}] -> { peralihan: [...] }
 *  GET  /tetapan    POST /tetapan {k: v}
 */
const nowSec = () => Math.floor(Date.now() / 1000);
const DAY = 86400;
export const AKTIF_SAAT = 75;        // sesi dikira "sedang melayari" jika denyut terakhir dalam 75 saat
export const SIMPAN_HARI = 90;       // sejarah harian disimpan 90 hari
const SIMPAN_SESI = 2 * DAY;         // baris sesi mentah dibuang selepas 2 hari
const SIMPAN_TOKEN = 7 * DAY;        // baris token mentah dibuang selepas 7 hari (agregat harian kekal)
const MAX_SEMBANG = 40;
const MAX_PERISTIWA = 400;

// Tarikh Malaysia (UTC+8)
export const hariMY = (t = nowSec()) => new Date((t + 8 * 3600) * 1000).toISOString().slice(0, 10);
const teks = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const nombor = (v, max = 1e9) => { const n = Math.floor(+v); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; };
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json' } });

export class Pusat {
  constructor(state, env) {
    this.state = state; this.env = env; this.sql = state.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS sesi (sid TEXT PRIMARY KEY, mula INTEGER, akhir INTEGER, laman TEXT, negara TEXT, peranti TEXT, rujukan TEXT, denyut INTEGER DEFAULT 0);
      CREATE INDEX IF NOT EXISTS sesi_akhir ON sesi (akhir);
      CREATE TABLE IF NOT EXISTS hari (tarikh TEXT PRIMARY KEY, pelawat INTEGER DEFAULT 0, paparan INTEGER DEFAULT 0, puncak INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS laman_hari (tarikh TEXT, laman TEXT, kiraan INTEGER DEFAULT 0, PRIMARY KEY (tarikh, laman));
      CREATE TABLE IF NOT EXISTS negara_hari (tarikh TEXT, negara TEXT, kiraan INTEGER DEFAULT 0, PRIMARY KEY (tarikh, negara));
      CREATE TABLE IF NOT EXISTS token (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, laluan TEXT, penyedia TEXT, model TEXT, masuk INTEGER, keluar INTEGER, cache INTEGER, ms INTEGER, ok INTEGER, kos REAL);
      CREATE INDEX IF NOT EXISTS token_t ON token (t);
      CREATE TABLE IF NOT EXISTS token_hari (tarikh TEXT, penyedia TEXT, laluan TEXT, panggilan INTEGER DEFAULT 0, gagal INTEGER DEFAULT 0, masuk INTEGER DEFAULT 0, keluar INTEGER DEFAULT 0, cache INTEGER DEFAULT 0, kos REAL DEFAULT 0, PRIMARY KEY (tarikh, penyedia, laluan));
      CREATE TABLE IF NOT EXISTS peristiwa (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, jenis TEXT, teks TEXT);
      CREATE TABLE IF NOT EXISTS sembang (id INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, peran TEXT, teks TEXT);
      CREATE TABLE IF NOT EXISTS kesihatan (nama TEXT PRIMARY KEY, ok INTEGER, ms INTEGER, nota TEXT, t INTEGER, gagal INTEGER DEFAULT 0, sejak INTEGER);
      CREATE TABLE IF NOT EXISTS tetapan (k TEXT PRIMARY KEY, v TEXT);
      CREATE TABLE IF NOT EXISTS tiket (id TEXT PRIMARY KEY, t INTEGER);
    `);
    this.siarMasa = 0;
  }

  all(q, ...b) { return this.sql.exec(q, ...b).toArray(); }
  one(q, ...b) { return this.all(q, ...b)[0] || null; }
  run(q, ...b) { this.sql.exec(q, ...b); }

  async fetch(req) {
    const url = new URL(req.url), p = url.pathname, M = req.method;
    const body = M === 'POST' ? await req.json().catch(() => ({})) : null;
    try {
      if (p === '/denyut' && M === 'POST') return json(this.denyut(body));
      if (p === '/catat' && M === 'POST') return json(this.catat(Array.isArray(body) ? body : [body]));
      if (p === '/papan') return json(this.papan());
      if (p === '/ringkas') return json(this.ringkas());
      if (p === '/tiket' && M === 'POST') return json({ tiket: this.tiket() });
      if (p === '/ws') return this.ws(req, url.searchParams.get('tiket') || '');
      if (p === '/peristiwa' && M === 'POST') { this.peristiwa(body.jenis, body.teks); return json({ ok: true }); }
      if (p === '/peristiwa') return json(this.all('SELECT t, jenis, teks FROM peristiwa ORDER BY id DESC LIMIT 60'));
      if (p === '/sembang' && M === 'POST') { this.sembang(body.peran, body.teks); return json({ ok: true }); }
      if (p === '/sembang' && M === 'DELETE') { this.run('DELETE FROM sembang'); return json({ ok: true }); }
      if (p === '/sembang') return json(this.all(`SELECT peran, teks, t FROM sembang ORDER BY id DESC LIMIT ${MAX_SEMBANG}`).reverse());
      if (p === '/kesihatan' && M === 'POST') return json(this.kesihatan(Array.isArray(body) ? body : []));
      if (p === '/kesihatan') return json(this.all('SELECT * FROM kesihatan ORDER BY nama'));
      if (p === '/tetapan' && M === 'POST') { for (const [k, v] of Object.entries(body || {})) this.setTetapan(k, v); return json(this.tetapan()); }
      if (p === '/tetapan') return json(this.tetapan());
      return json({ error: 'Tidak dijumpai' }, 404);
    } catch (e) {
      console.log('Pusat ralat', e && e.stack || e);
      return json({ error: 'Ralat storan' }, 500);
    }
  }

  /* ---------- Pelawat ---------- */
  denyut(b) {
    const sid = teks(b.sid, 48), t = nowSec(), hari = hariMY(t);
    if (!/^[\w-]{8,48}$/.test(sid)) return { kini: this.kini(), error: 'sid' };
    const laman = teks(b.laman, 40).toLowerCase().replace(/[^a-z0-9/_-]/g, '') || 'utama';
    const negara = teks(b.negara, 2).toUpperCase() || '??';
    const peranti = ['telefon', 'tablet', 'komputer', 'app'].includes(b.peranti) ? b.peranti : 'lain';
    const rujukan = teks(b.rujukan, 80);
    const ada = this.one('SELECT sid, laman FROM sesi WHERE sid = ?', sid);
    this.run('INSERT OR IGNORE INTO hari (tarikh) VALUES (?)', hari);
    if (!ada) {
      this.run('INSERT INTO sesi (sid, mula, akhir, laman, negara, peranti, rujukan, denyut) VALUES (?, ?, ?, ?, ?, ?, ?, 1)', sid, t, t, laman, negara, peranti, rujukan);
      this.run('UPDATE hari SET pelawat = pelawat + 1, paparan = paparan + 1 WHERE tarikh = ?', hari);
      this.run('INSERT INTO negara_hari (tarikh, negara, kiraan) VALUES (?, ?, 1) ON CONFLICT (tarikh, negara) DO UPDATE SET kiraan = kiraan + 1', hari, negara);
      this.run('INSERT INTO laman_hari (tarikh, laman, kiraan) VALUES (?, ?, 1) ON CONFLICT (tarikh, laman) DO UPDATE SET kiraan = kiraan + 1', hari, laman);
    } else {
      this.run('UPDATE sesi SET akhir = ?, laman = ?, denyut = denyut + 1 WHERE sid = ?', t, laman, sid);
      if (ada.laman !== laman) {
        this.run('UPDATE hari SET paparan = paparan + 1 WHERE tarikh = ?', hari);
        this.run('INSERT INTO laman_hari (tarikh, laman, kiraan) VALUES (?, ?, 1) ON CONFLICT (tarikh, laman) DO UPDATE SET kiraan = kiraan + 1', hari, laman);
      }
    }
    const kini = this.kini();
    this.run('UPDATE hari SET puncak = MAX(puncak, ?) WHERE tarikh = ?', kini, hari);
    if (Math.random() < 0.02) this.bersih(t);
    this.siar();
    return { kini };
  }

  kini() { return this.one('SELECT COUNT(*) AS n FROM sesi WHERE akhir >= ?', nowSec() - AKTIF_SAAT).n; }

  bersih(t) {
    this.run('DELETE FROM sesi WHERE akhir < ?', t - SIMPAN_SESI);
    this.run('DELETE FROM token WHERE t < ?', t - SIMPAN_TOKEN);
    const had = hariMY(t - SIMPAN_HARI * DAY);
    this.run('DELETE FROM hari WHERE tarikh < ?', had);
    this.run('DELETE FROM laman_hari WHERE tarikh < ?', had);
    this.run('DELETE FROM negara_hari WHERE tarikh < ?', had);
    this.run('DELETE FROM token_hari WHERE tarikh < ?', had);
    this.run(`DELETE FROM peristiwa WHERE id NOT IN (SELECT id FROM peristiwa ORDER BY id DESC LIMIT ${MAX_PERISTIWA})`);
    this.run('DELETE FROM tiket WHERE t < ?', t - 120);
  }

  /* ---------- Token AI ---------- */
  kos(penyedia, masuk, keluar, cache) {
    if (penyedia !== 'claude') return 0;
    const m = +this.env.KOS_CLAUDE_MASUK || 0, k = +this.env.KOS_CLAUDE_KELUAR || 0;
    return (masuk * m + cache * m * 0.1 + keluar * k) / 1e6;
  }
  catat(rekod) {
    const t = nowSec(), hari = hariMY(t);
    let n = 0;
    for (const r of rekod.slice(0, 50)) {
      if (!r || typeof r !== 'object') continue;
      const laluan = teks(r.laluan, 32).replace(/[^a-z0-9/_-]/gi, '') || '/lain';
      const penyedia = teks(r.penyedia, 24).toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'lain';
      const model = teks(r.model, 60), masuk = nombor(r.masuk), keluar = nombor(r.keluar), cache = nombor(r.cache), ms = nombor(r.ms, 6e5), ok = r.ok === false ? 0 : 1;
      const kos = this.kos(penyedia, masuk, keluar, cache);
      this.run('INSERT INTO token (t, laluan, penyedia, model, masuk, keluar, cache, ms, ok, kos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', t, laluan, penyedia, model, masuk, keluar, cache, ms, ok, kos);
      this.run(`INSERT INTO token_hari (tarikh, penyedia, laluan, panggilan, gagal, masuk, keluar, cache, kos) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)
        ON CONFLICT (tarikh, penyedia, laluan) DO UPDATE SET panggilan = panggilan + 1, gagal = gagal + excluded.gagal, masuk = masuk + excluded.masuk, keluar = keluar + excluded.keluar, cache = cache + excluded.cache, kos = kos + excluded.kos`,
        hari, penyedia, laluan, ok ? 0 : 1, masuk, keluar, cache, kos);
      n++;
    }
    if (n) this.siar();
    return { ok: true, n };
  }

  /* ---------- Papan ---------- */
  ringkas() {
    const t = nowSec(), hari = hariMY(t);
    const h = this.one('SELECT pelawat, paparan, puncak FROM hari WHERE tarikh = ?', hari) || { pelawat: 0, paparan: 0, puncak: 0 };
    const tok = this.one('SELECT COALESCE(SUM(panggilan),0) AS panggilan, COALESCE(SUM(masuk),0) AS masuk, COALESCE(SUM(keluar),0) AS keluar, COALESCE(SUM(kos),0) AS kos FROM token_hari WHERE tarikh = ?', hari);
    return {
      t, hari, kini: this.kini(), pelawatHari: h.pelawat, paparanHari: h.paparan, puncakHari: h.puncak,
      lamanKini: this.all('SELECT laman, COUNT(*) AS n FROM sesi WHERE akhir >= ? GROUP BY laman ORDER BY n DESC LIMIT 12', t - AKTIF_SAAT),
      tokenHari: { panggilan: tok.panggilan, masuk: tok.masuk, keluar: tok.keluar, jumlah: tok.masuk + tok.keluar, kos: +tok.kos.toFixed(4) }
    };
  }

  papan() {
    const t = nowSec(), hari = hariMY(t), h30 = hariMY(t - 29 * DAY), h7 = hariMY(t - 6 * DAY);
    const jumlah = (sejak) => this.one('SELECT COALESCE(SUM(panggilan),0) AS panggilan, COALESCE(SUM(gagal),0) AS gagal, COALESCE(SUM(masuk),0) AS masuk, COALESCE(SUM(keluar),0) AS keluar, COALESCE(SUM(cache),0) AS cache, COALESCE(SUM(kos),0) AS kos FROM token_hari WHERE tarikh >= ?', sejak);
    const pelawat = (sejak) => this.one('SELECT COALESCE(SUM(pelawat),0) AS pelawat, COALESCE(SUM(paparan),0) AS paparan, COALESCE(MAX(puncak),0) AS puncak FROM hari WHERE tarikh >= ?', sejak);
    return {
      ...this.ringkas(),
      pelawat: { hari: pelawat(hari), minggu: pelawat(h7), bulan: pelawat(h30) },
      siriHari: this.all('SELECT tarikh, pelawat, paparan, puncak FROM hari WHERE tarikh >= ? ORDER BY tarikh', h30),
      lamanHari: this.all('SELECT laman, SUM(kiraan) AS n FROM laman_hari WHERE tarikh >= ? GROUP BY laman ORDER BY n DESC LIMIT 12', h7),
      negara: this.all('SELECT negara, SUM(kiraan) AS n FROM negara_hari WHERE tarikh >= ? GROUP BY negara ORDER BY n DESC LIMIT 8', h30),
      peranti: this.all('SELECT peranti, COUNT(*) AS n FROM sesi WHERE akhir >= ? GROUP BY peranti', t - DAY),
      token: { hari: jumlah(hari), minggu: jumlah(h7), bulan: jumlah(h30) },
      tokenPenyedia: this.all('SELECT penyedia, SUM(panggilan) AS panggilan, SUM(masuk) AS masuk, SUM(keluar) AS keluar, SUM(kos) AS kos FROM token_hari WHERE tarikh >= ? GROUP BY penyedia ORDER BY masuk + keluar DESC', h30),
      tokenLaluan: this.all('SELECT laluan, SUM(panggilan) AS panggilan, SUM(gagal) AS gagal, SUM(masuk) AS masuk, SUM(keluar) AS keluar, SUM(kos) AS kos FROM token_hari WHERE tarikh >= ? GROUP BY laluan ORDER BY masuk + keluar DESC', h30),
      tokenSiri: this.all('SELECT tarikh, SUM(masuk) AS masuk, SUM(keluar) AS keluar, SUM(panggilan) AS panggilan, SUM(kos) AS kos FROM token_hari WHERE tarikh >= ? GROUP BY tarikh ORDER BY tarikh', h30),
      tokenTerkini: this.all('SELECT t, laluan, penyedia, model, masuk, keluar, ms, ok FROM token ORDER BY id DESC LIMIT 20'),
      kesihatan: this.all('SELECT nama, ok, ms, nota, t, gagal, sejak FROM kesihatan ORDER BY nama'),
      peristiwa: this.all('SELECT t, jenis, teks FROM peristiwa ORDER BY id DESC LIMIT 40'),
      sembang: this.all('SELECT peran, teks, t FROM sembang ORDER BY id DESC LIMIT 20').reverse(),
      tetapan: this.tetapan(),
      papanTersambung: this.state.getWebSockets ? this.state.getWebSockets().length : 0
    };
  }

  /* ---------- Log, sembang, kesihatan, tetapan ---------- */
  peristiwa(jenis, t) { this.run('INSERT INTO peristiwa (t, jenis, teks) VALUES (?, ?, ?)', nowSec(), teks(jenis, 24) || 'nota', teks(t, 600)); this.siar(); }
  sembang(peran, t) {
    this.run('INSERT INTO sembang (t, peran, teks) VALUES (?, ?, ?)', nowSec(), peran === 'agen' ? 'agen' : 'pemilik', teks(t, 4000));
    this.run(`DELETE FROM sembang WHERE id NOT IN (SELECT id FROM sembang ORDER BY id DESC LIMIT ${MAX_SEMBANG})`);
  }
  kesihatan(senarai) {
    const t = nowSec(), peralihan = [];
    for (const s of senarai.slice(0, 20)) {
      const nama = teks(s.nama, 40); if (!nama) continue;
      const ok = s.ok ? 1 : 0, lama = this.one('SELECT ok, gagal, sejak FROM kesihatan WHERE nama = ?', nama);
      const gagal = ok ? 0 : (lama ? lama.gagal : 0) + 1;
      const sejak = lama && lama.ok === ok ? lama.sejak : t;
      this.run('INSERT INTO kesihatan (nama, ok, ms, nota, t, gagal, sejak) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (nama) DO UPDATE SET ok = excluded.ok, ms = excluded.ms, nota = excluded.nota, t = excluded.t, gagal = excluded.gagal, sejak = excluded.sejak',
        nama, ok, nombor(s.ms, 6e5), teks(s.nota, 200), t, gagal, sejak);
      // Amaran hanya selepas 2 kegagalan berturut (elak amaran palsu), dan sekali sahaja; pulih dilaporkan sekali
      if (!ok && gagal === 2) peralihan.push({ nama, ok: false, nota: teks(s.nota, 200) });
      if (ok && lama && !lama.ok && lama.gagal >= 2) peralihan.push({ nama, ok: true, lama: t - lama.sejak });
    }
    for (const p of peralihan) this.peristiwa(p.ok ? 'pulih' : 'rosak', p.ok ? `${p.nama} pulih selepas ${Math.round(p.lama / 60)} minit` : `${p.nama} rosak: ${p.nota}`);
    this.siar();
    return { peralihan };
  }
  tetapan() { const o = { amaran: true, laporan: true }; for (const r of this.all('SELECT k, v FROM tetapan')) { try { o[r.k] = JSON.parse(r.v); } catch { o[r.k] = r.v; } } return o; }
  setTetapan(k, v) {
    k = teks(k, 32); if (!/^[a-z_]{1,32}$/.test(k)) return;
    if (v === null || v === undefined) this.run('DELETE FROM tetapan WHERE k = ?', k);
    else this.run('INSERT INTO tetapan (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v', k, JSON.stringify(v).slice(0, 2000));
  }

  /* ---------- WebSocket papan (API hibernasi) ---------- */
  tiket() {
    const id = Array.from(crypto.getRandomValues(new Uint8Array(18)), b => b.toString(16).padStart(2, '0')).join('');
    this.run('INSERT INTO tiket (id, t) VALUES (?, ?)', id, nowSec());
    return id;
  }
  ws(req, tiket) {
    const t = this.one('SELECT t FROM tiket WHERE id = ?', tiket);
    this.run('DELETE FROM tiket WHERE id = ? OR t < ?', tiket, nowSec() - 60);
    if (!t || t.t < nowSec() - 60) return json({ error: 'Tiket tidak sah' }, 401);
    if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'WebSocket sahaja' }, 426);
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    pair[1].send(JSON.stringify({ jenis: 'ringkas', data: this.ringkas() }));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  webSocketMessage(ws, msg) { if (msg === 'ping') ws.send(JSON.stringify({ jenis: 'ringkas', data: this.ringkas() })); }
  webSocketClose(ws) { try { ws.close(); } catch {} }
  webSocketError(ws) { try { ws.close(); } catch {} }
  siar() {
    if (!this.state.getWebSockets) return;
    const soket = this.state.getWebSockets(); if (!soket.length) return;
    const t = Date.now();
    if (t - this.siarMasa < 1500) { if (!this.siarTimer) this.siarTimer = setTimeout(() => { this.siarTimer = null; this.siar(); }, 1500 - (t - this.siarMasa)); return; }
    this.siarMasa = t;
    const data = JSON.stringify({ jenis: 'ringkas', data: this.ringkas() });
    for (const ws of soket) { try { ws.send(data); } catch {} }
  }
}
