/*
 * Siasatan: cari maklumat edisi cetakan (penerbit, edisi) dan PDF bergambar bagi setiap kitab dalam FiqhData.KITAB.
 * Mencetak ke log sahaja.
 */
import { KITAB } from '../src/rujukan.js';

const UA = 'Mozilla/5.0 (BijakLabur rujukan; +https://bijaklabur.my)';
const get = async u => { try { const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) }); return { s: r.status, t: await r.text(), u: r.url }; } catch (e) { return { s: 0, t: '', e: e.message }; } };
const text = h => h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

for (const b of KITAB) {
  console.log(`\n=== ${b.k} ${b.name} (Shamela ${b.id})`);
  const r = await get(`https://shamela.ws/book/${b.id}`);
  console.log(`status ${r.s} ${r.e || ''}`);
  const t = text(r.t);
  const i = t.search(/الناشر|الطبعة|المؤلف/);
  console.log('kad buku:', t.slice(Math.max(0, i - 300), i + 1200));
  const links = [...new Set([...r.t.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(h => /pdf|archive\.org|waqfeya|drive\.google|mediafire|download/i.test(h)))];
  console.log('pautan:', links.slice(0, 20).join('\n  '));
  const q = encodeURIComponent(`title:(${b.ar}) AND mediatype:texts`);
  const a = await get(`https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&fl[]=publisher&fl[]=date&rows=15&output=json`);
  try { for (const d of JSON.parse(a.t).response.docs) console.log(`archive: ${d.identifier} | ${d.title} | ${d.publisher || ''} | ${d.date || ''}`); } catch { console.log('archive gagal', a.s, a.t.slice(0, 200)); }
}
