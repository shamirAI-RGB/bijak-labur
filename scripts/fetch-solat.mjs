// Muat turun waktu solat JAKIM (bulan ini dan bulan depan) untuk semua zon ke data/solat/.
// Digunakan sebagai sandaran jika api.waktusolat.app tidak dapat dicapai dari pelayar atau app.
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';

const API = 'https://api.waktusolat.app';
const OUT = 'data/solat';
mkdirSync(OUT, { recursive: true });

const now = new Date(Date.now() + 8 * 3600e3); // waktu Malaysia
const months = [[now.getUTCFullYear(), now.getUTCMonth() + 1]];
months.push(months[0][1] === 12 ? [months[0][0] + 1, 1] : [months[0][0], months[0][1] + 1]);
const keep = new Set(months.map(([y, m]) => `${y}-${String(m).padStart(2, '0')}`));

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch {}
    await new Promise(res => setTimeout(res, 1500 * (i + 1)));
  }
  throw new Error('Gagal: ' + url);
}

const zones = await get(`${API}/zones`);
writeFileSync(`${OUT}/zones.json`, JSON.stringify(zones));
let ok = 0, fail = 0;
const jobs = zones.flatMap(z => months.map(([y, m]) => ({ z: z.jakimCode, y, m })));
for (let i = 0; i < jobs.length; i += 4) {
  await Promise.all(jobs.slice(i, i + 4).map(async ({ z, y, m }) => {
    try {
      const j = await get(`${API}/v2/solat/${z}?year=${y}&month=${m}`);
      if (!j.prayers || !j.prayers.length) throw new Error('kosong');
      writeFileSync(`${OUT}/${z}-${y}-${String(m).padStart(2, '0')}.json`, JSON.stringify(j));
      ok++;
    } catch (e) { fail++; console.warn(z, y, m, e.message); }
  }));
}
// Buang fail bulan lama
for (const f of readdirSync(OUT)) {
  const m = f.match(/-(\d{4}-\d{2})\.json$/);
  if (m && !keep.has(m[1])) unlinkSync(`${OUT}/${f}`);
}
console.log(`Selesai: ${ok} fail, ${fail} gagal`);
if (ok === 0) process.exit(1);
