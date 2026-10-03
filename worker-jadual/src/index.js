/*
 * Bijak Labur: pelayan jadual kelas UiTM (Cloudflare Worker, pelan percuma)
 *
 * Membaca halaman awam iCress UiTM (jadual kelas mengikut kampus, kod kursus dan kumpulan)
 * dan memulangkannya sebagai JSON. Tiada log masuk, tiada kata laluan, tiada data peribadi:
 * iCress hanya menyenaraikan kursus, kumpulan, masa dan bilik.
 *
 * GET /session                                   -> { code, label }      sesi semasa, cth. 20264
 * GET /campuses                                  -> [{ id, text }]
 * GET /faculties                                 -> [{ id, text }]       untuk kampus B (Shah Alam)
 * GET /courses?campus=B&faculty=CD               -> [{ code, name }]
 * GET /groups?campus=B&faculty=CD&course=CSC584  -> [{ group, slots, mode, status, room, program }]
 * GET /timetable?campus=B&faculty=CD&pick=CSC584.CS2305A,ITS662.CS2305A
 *                                                -> { session, items: [{ course, group, slots }], missing }
 *
 * slot = { d: 1-7 (Isnin = 1), s: minit dari tengah malam, e: minit, room, mode }
 */

export const BASE = 'https://simsweb4.uitm.edu.my/estudent/class_timetable/';
const UA = 'Mozilla/5.0 (compatible; BijakLabur/1.0; +https://bijaklabur.my)';
const TTL = { session: 3600, campuses: 21600, faculties: 21600, courses: 3600, groups: 1200, timetable: 1200 };
const MAX_PICKS = 15;

const RE = {
  campus: /^[A-Z0-9]{1,6}$/,
  faculty: /^[A-Z]{2,4}$/,
  course: /^[A-Z]{2,4}\d{3}[A-Z]?$/,
  group: /^[A-Z0-9]{2,14}$/
};

export class IcressError extends Error {}
class BadRequest extends Error {}

/* ---------- Penghurai HTML (tanpa DOM; Workers tiada DOMParser) ---------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export const decode = s => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] ?? m));
export const text = html => decode(String(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i')); return m ? m[1] : null; };
const cells = tr => [...tr.matchAll(/<t([dh])[^>]*>([\s\S]*?)<\/t\1>/gi)].map(c => ({ th: c[1].toLowerCase() === 'h', html: c[2], text: text(c[2]) }));

/** Halaman utama iCress: medan tersembunyi, nilai yang ditetapkan oleh JS sebelum hantar, URL hasil dan URL senarai kampus. */
export function parseIndex(html, finalUrl = BASE) {
  const fields = {}, idToName = {};
  for (const m of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = m[0].replace(/\s+/g, ' ');
    if ((attr(tag, 'type') || '').toLowerCase() !== 'hidden') continue;
    const name = attr(tag, 'name'), id = attr(tag, 'id');
    if (!name) continue;
    fields[name] = attr(tag, 'value') ?? '';
    if (id) idToName[id] = name;
  }
  let resultUrl = '', campusUrl = '';
  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
    const js = m[1];
    if (js.includes('check_form_before_submit') && js.includes('$.ajax')) {
      const u = js.match(/url\s*:\s*['"]([^'"]+)['"]/);
      if (u) resultUrl = u[1];
      for (const a of js.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)\.value\s*=\s*['"]([^'"]*)['"]/g)) fields[idToName[a[1]] || a[1]] = a[2];
    }
    if (js.includes('find_cam_icress_student') && !campusUrl) {
      const u = js.match(/url\s*:\s*['"]([^'"]+)['"]/);
      if (u) campusUrl = u[1];
    }
  }
  const session = (resultUrl.match(/index_(\d{5})_result/i) || finalUrl.match(/index_(\d{5})\.cfm/i) || [])[1] || null;
  return { fields, resultUrl, campusUrl, indexUrl: finalUrl, session };
}

/** 20264 -> "Sesi 2026/2027 Semester 1" mengikut pengekodan UiTM (tahun + 4 = Okt-Feb, + 2 = Mac-Ogos). */
export function sessionLabel(code) {
  const m = String(code || '').match(/^(\d{4})(\d)$/);
  if (!m) return '';
  const y = +m[1], n = +m[2];
  return n >= 4 ? `Okt ${y} hingga Feb ${y + 1}` : `Mac hingga Ogos ${y}`;
}

/** Senarai select2 JSON atau "ID - NAMA<br>" */
export function parseIdText(body) {
  try {
    const j = JSON.parse(body);
    const list = Array.isArray(j) ? j : (j.results || []);
    return list.filter(e => e && e.id != null).map(e => ({ id: String(e.id).trim(), text: String(e.text ?? '').trim() }));
  } catch {
    return String(body).split(/<br\s*\/?>/i).map(l => text(l)).map(l => l.match(/^([A-Z0-9]{1,6})\s*-\s*(.+)$/i)).filter(Boolean)
      .map(m => ({ id: m[1].toUpperCase(), text: m[2].trim() }));
  }
}

/** Jadual hasil carian kursus: baris class="gradeU", sel kedua = kod, pautan pertama = halaman kumpulan. */
export function parseCourses(html) {
  const out = [], seen = new Set();
  for (const m of html.matchAll(/<tr\b[^>]*class\s*=\s*["'][^"']*gradeU[^"']*["'][^>]*>[\s\S]*?<\/tr>/gi)) {
    const row = m[0], c = cells(row).filter(x => !x.th);
    const code = (c[1]?.text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const href = (row.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!RE.course.test(code) || !href || seen.has(code)) continue;
    seen.add(code);
    const name = c.slice(2).map(x => x.text).find(t => t && !/^(view|lihat|papar)/i.test(t) && /[a-z]{3}/i.test(t)) || '';
    out.push({ code, name, path: decode(href) });
  }
  return out;
}

const DAYS = { MON: 1, MONDAY: 1, ISNIN: 1, TUE: 2, TUESDAY: 2, SELASA: 2, WED: 3, WEDNESDAY: 3, RABU: 3, THU: 4, THURSDAY: 4, KHAMIS: 4,
  FRI: 5, FRIDAY: 5, JUMAAT: 5, SAT: 6, SATURDAY: 6, SABTU: 6, SUN: 7, SUNDAY: 7, AHAD: 7 };

/** "9:30 PM", "14:00 PM", "08:00" -> minit. PM hanya ditambah 12 jika jam < 12 (iCress menulis "14:00 PM"). */
export function clock(s) {
  const m = String(s).trim().match(/^(\d{1,2})[:.]?(\d{2})\s*([AP])?\.?M?\.?$/i);
  if (!m) return null;
  let h = +m[1]; const min = +m[2], ap = (m[3] || '').toUpperCase();
  if (min > 59) return null;
  if (ap === 'A' && h === 12) h = 0; else if (ap === 'P' && h < 12) h += 12;
  return h > 23 ? null : h * 60 + min;
}

/** "TUESDAY( 09:00 AM-10:00 AM )", "Isnin 0800-1000" -> { d, s, e } */
export function dayTime(raw) {
  const t = text(raw).toUpperCase();
  const dm = t.match(/\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY|ISNIN|SELASA|RABU|KHAMIS|JUMAAT|SABTU|AHAD|MON|TUE|WED|THU|FRI|SAT|SUN)\b/);
  const tm = t.match(/(\d{1,2}[:.]?\d{2}\s*(?:[AP]\.?M\.?)?)\s*(?:-|–|HINGGA|TO)\s*(\d{1,2}[:.]?\d{2}\s*(?:[AP]\.?M\.?)?)/);
  if (!dm || !tm) return null;
  const s = clock(tm[1]), e = clock(tm[2]);
  if (s == null || e == null || e <= s) return null;
  return { d: DAYS[dm[1]], s, e };
}

const HEAD = { 'NO': 'no', 'DAY TIME': 'time', 'DAY/TIME': 'time', 'GROUP': 'group', 'MODE': 'mode', 'STATUS': 'status', 'ROOM': 'room',
  'ONLY FOR PROGRAM': 'program', 'PROGRAM': 'program', 'ONLY FOR FACULTY': 'faculty', 'FACULTY': 'faculty' };

/** Halaman kumpulan satu kursus. Lajur dibaca daripada baris tajuk kerana susunan berbeza antara kampus. */
export function parseGroups(html) {
  const rows = [];
  for (const table of html.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    let map = null;
    for (const tr of table[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)) {
      const c = cells(tr[0]);
      const names = c.map(x => HEAD[x.text.toUpperCase().replace(/\.+$/, '')]);
      if (names.includes('time') && names.includes('group')) { map = {}; names.forEach((n, i) => { if (n && !(n in map)) map[n] = i; }); continue; }
      if (!map) continue;
      const tds = c.filter(x => !x.th);
      if (tds.length <= Math.max(map.time, map.group)) continue;
      const slot = dayTime(tds[map.time].html);
      const group = tds[map.group].text.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!slot || !group) continue;
      const pick = k => map[k] != null ? (tds[map[k]]?.text || '') : '';
      rows.push({ group, ...slot, room: pick('room'), mode: pick('mode'), status: pick('status'), program: pick('program') });
    }
  }
  return rows;
}

/** Himpun baris mengikut kumpulan: [{ group, slots: [{d,s,e,room,mode}], status, program }] */
export function byGroup(rows) {
  const g = new Map();
  for (const r of rows) {
    if (!g.has(r.group)) g.set(r.group, { group: r.group, slots: [], status: r.status, program: r.program });
    const k = g.get(r.group);
    if (!k.slots.some(s => s.d === r.d && s.s === r.s && s.e === r.e)) k.slots.push({ d: r.d, s: r.s, e: r.e, room: r.room, mode: r.mode });
  }
  // iCress kadang-kadang menyenaraikan slot bertindih untuk kumpulan yang sama (cth. 9-10, 9-12, 10-12): gabungkan
  for (const k of g.values()) {
    k.slots.sort((a, b) => a.d - b.d || a.s - b.s);
    const merged = [];
    for (const s of k.slots) {
      const last = merged[merged.length - 1];
      if (last && last.d === s.d && s.s < last.e) {
        last.e = Math.max(last.e, s.e);
        if (s.room && !last.room.split(', ').includes(s.room)) last.room = last.room ? `${last.room}, ${s.room}` : s.room;
      } else merged.push({ ...s });
    }
    k.slots = merged;
  }
  return [...g.values()].sort((a, b) => a.group.localeCompare(b.group));
}

/* ---------- Pengambil iCress dengan kuki sesi ---------- */
export function client(fetchImpl = fetch) {
  const jar = new Map();
  async function get(path, opts = {}) {
    let url = new URL(path, BASE).toString(), method = opts.method || 'GET', body = opts.body;
    for (let hop = 0; hop < 6; hop++) {
      const headers = { 'user-agent': UA, referer: opts.referer || BASE + 'index.cfm', ...(opts.headers || {}) };
      if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
      const r = await fetchImpl(url, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(15000) });
      const set = r.headers.getSetCookie ? r.headers.getSetCookie() : (r.headers.get('set-cookie') ? [r.headers.get('set-cookie')] : []);
      for (const c of set) { const p = c.split(';')[0], i = p.indexOf('='); if (i > 0) jar.set(p.slice(0, i).trim(), p.slice(i + 1).trim()); }
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get('location');
        if (!loc) throw new IcressError('iCress redirect tanpa lokasi');
        url = new URL(loc, url).toString();
        if (r.status !== 307 && r.status !== 308) { method = 'GET'; body = undefined; }
        continue;
      }
      if (!r.ok) throw new IcressError(`iCress menjawab ${r.status}`);
      return { body: await r.text(), url };
    }
    throw new IcressError('Terlalu banyak redirect iCress');
  }

  let idx = null;
  const index = async () => idx || (idx = get('index.cfm').then(r => parseIndex(r.body, r.url)));

  return {
    index,
    async campuses() {
      const i = await index();
      const u = i.campusUrl || 'combo_select_campus.txt';
      let list = [];
      try { list = parseIdText((await get(`${u}${u.includes('?') ? '&' : '?'}key=All&page=1&page_limit=100`)).body); } catch {}
      if (!list.length) list = parseIdText((await get('combo_select_campus.txt')).body);
      list = list.filter(c => c.id && c.id !== 'X');
      if (!list.length) throw new IcressError('Tiada senarai kampus');
      return list;
    },
    async faculties() {
      const list = parseIdText((await get('combo_select_faculty.txt')).body).filter(f => RE.faculty.test(f.id));
      if (!list.length) throw new IcressError('Tiada senarai fakulti');
      return list;
    },
    async courses(campus, faculty) {
      const i = await index();
      if (!i.resultUrl) throw new IcressError('Borang iCress berubah');
      const form = new URLSearchParams({ ...i.fields, search_campus: campus, search_faculty: faculty || '', search_course: '' });
      const r = await get(i.resultUrl, { method: 'POST', referer: i.indexUrl, body: form.toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' } });
      return parseCourses(r.body);
    },
    async groups(path) {
      const i = await index();
      return byGroup(parseGroups((await get(path, { referer: i.indexUrl })).body));
    }
  };
}

/* ---------- HTTP ---------- */
function cors(req, env) {
  const origin = req.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return {};
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-max-age': '86400', vary: 'origin' };
}
const json = (data, status, headers, ttl = 0) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': ttl ? `public, max-age=${ttl}` : 'no-store', ...headers }
});
function param(url, name, re, required = true) {
  const v = (url.searchParams.get(name) || '').trim().toUpperCase();
  if (!v) { if (required) throw new BadRequest(`Parameter ${name} diperlukan`); return ''; }
  if (!re.test(v)) throw new BadRequest(`Parameter ${name} tidak sah`);
  return v;
}

export async function handle(url, ic) {
  switch (url.pathname) {
    case '/session': {
      const i = await ic.index();
      return [{ code: i.session, label: sessionLabel(i.session) }, TTL.session];
    }
    case '/campuses': return [await ic.campuses(), TTL.campuses];
    case '/faculties': return [await ic.faculties(), TTL.faculties];
    case '/courses': {
      const list = await ic.courses(param(url, 'campus', RE.campus), param(url, 'faculty', RE.faculty, false));
      return [list.map(({ code, name }) => ({ code, name })), TTL.courses];
    }
    case '/groups': {
      const campus = param(url, 'campus', RE.campus), faculty = param(url, 'faculty', RE.faculty, false), course = param(url, 'course', RE.course);
      const ref = (await ic.courses(campus, faculty)).find(c => c.code === course);
      if (!ref) return [{ error: `Kursus ${course} tiada dalam jadual kampus ini.` }, 0, 404];
      return [await ic.groups(ref.path), TTL.groups];
    }
    case '/timetable': {
      const campus = param(url, 'campus', RE.campus), faculty = param(url, 'faculty', RE.faculty, false);
      const picks = (url.searchParams.get('pick') || '').toUpperCase().split(',').map(p => p.trim()).filter(Boolean).map(p => p.split('.'));
      if (!picks.length) throw new BadRequest('Parameter pick diperlukan');
      if (picks.length > MAX_PICKS) throw new BadRequest(`Maksimum ${MAX_PICKS} kursus`);
      for (const [c, g] of picks) if (!RE.course.test(c || '') || !RE.group.test(g || '')) throw new BadRequest('Parameter pick tidak sah');
      const [i, courses] = await Promise.all([ic.index(), ic.courses(campus, faculty)]);
      const items = [], missing = [];
      await Promise.all(picks.map(async ([course, group]) => {
        const ref = courses.find(c => c.code === course);
        if (!ref) { missing.push({ course, group, why: 'kursus' }); return; }
        const found = (await ic.groups(ref.path)).find(x => x.group === group);
        if (!found) { missing.push({ course, group, why: 'kumpulan' }); return; }
        items.push({ course, name: ref.name, group, slots: found.slots });
      }));
      const order = picks.map(p => p.join('.'));
      items.sort((a, b) => order.indexOf(`${a.course}.${a.group}`) - order.indexOf(`${b.course}.${b.group}`));
      return [{ session: i.session, label: sessionLabel(i.session), items, missing }, TTL.timetable];
    }
    case '/': return [{ ok: true, service: 'bijak-labur-jadual', source: BASE }, 0];
    default: return [{ error: 'Tidak dijumpai' }, 0, 404];
  }
}

export default {
  async fetch(req, env, ctx, deps = {}) {
    const url = new URL(req.url), h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method !== 'GET') return json({ error: 'GET sahaja' }, 405, h);

    // Simpan jawapan dalam cache Cloudflare supaya pelayan UiTM tidak dibebankan
    const cache = deps.cache ?? (typeof caches !== 'undefined' ? caches.default : null);
    const key = new Request(url.origin + url.pathname + url.search);
    if (cache) {
      const hit = await cache.match(key);
      if (hit) { const r = new Response(hit.body, hit); for (const [k, v] of Object.entries(h)) r.headers.set(k, v); return r; }
    }
    try {
      const [data, ttl, status = 200] = await handle(url, client(deps.fetch));
      if (cache && ttl && status === 200) {
        const store = json(data, 200, {}, ttl);
        const p = cache.put(key, store);
        if (ctx && ctx.waitUntil) ctx.waitUntil(p); else await p;
      }
      return json(data, status, h, status === 200 ? ttl : 0);
    } catch (e) {
      if (e instanceof BadRequest) return json({ error: e.message }, 400, h);
      console.log('ralat', e && e.stack || e);
      const timeout = e && e.name === 'TimeoutError';
      return json({ error: timeout ? 'Laman jadual UiTM lambat menjawab. Cuba lagi sebentar.' : 'Laman jadual UiTM (iCress) tidak dapat dibaca sekarang. Cuba lagi sebentar.' }, timeout ? 504 : 502, h);
    }
  }
};
