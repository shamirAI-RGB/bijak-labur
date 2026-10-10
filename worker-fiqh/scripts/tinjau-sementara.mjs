// Sementara (dibuang sebelum PR sedia): lihat struktur beberapa halaman fatwa yang belum memberi artikel
import { pautanHtml, kandungan, tajukHtml, tajukTeks } from './muat-mufti.mjs';

const UA = 'Mozilla/5.0 (compatible; SiswaCap-Fatwa/1.0; +https://siswacap.my/tentang.html)';
const ambil = async u => {
  await new Promise(z => setTimeout(z, 3000));
  try { const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) }); return { r, s: await r.text() }; }
  catch (e) { console.log(`\n=== ${u}: ${e.message}`); return null; }
};
for (const u of ['https://muftinegeri.sarawak.gov.my/web/subpage/fatwa_list_ajax/', 'https://muftinegeri.sarawak.gov.my/web/subpage/irsyad_list_ajax/', 'https://said.johor.gov.my/perkhidmatan/paparan_detail_kemusykilan.php?id=115']) {
  const x = await ambil(u);
  if (!x) continue;
  const { r, s } = x;
  console.log(`\n=== ${u}: ${r.status} ${r.headers.get('content-type')} ${s.length} aksara`);
  const links = [...new Map(pautanHtml(s, r.url || u).map(l => [l.url, l])).values()];
  console.log(`${links.length} pautan; contoh:`);
  for (const l of links.slice(0, 30)) console.log(`  ${l.url} | ${l.teks.slice(0, 80)}`);
  for (const m of s.matchAll(/onclick=["']([^"']{0,200})/gi)) console.log('onclick:', m[1]);
  console.log('HTML awal:', s.replace(/\s+/g, ' ').slice(0, 1500));
  const t = kandungan(s);
  console.log('tajuk:', tajukHtml(s), '| tajukTeks:', tajukTeks(t));
  console.log('kandungan:', t.slice(0, 1200));
}
