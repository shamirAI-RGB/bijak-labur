// Sementara (dibuang sebelum PR sedia): lihat struktur beberapa halaman fatwa yang belum memberi artikel
import { pautanHtml, kandungan, KUNCI } from './muat-mufti.mjs';

const UA = 'Mozilla/5.0 (compatible; SiswaCap-Fatwa/1.0; +https://siswacap.my/tentang.html)';
const ambil = async u => {
  await new Promise(z => setTimeout(z, 3000));
  try { const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) }); return { r, s: await r.text() }; }
  catch (e) { console.log(`\n=== ${u}: ${e.message}`); return null; }
};
// Sarawak: senarai fatwa dimuat dengan AJAX; cari URL yang dipanggil oleh search_rec() dan makeGETRequest()
const sw = await ambil('https://muftinegeri.sarawak.gov.my/web/subpage/fatwa_list/');
if (sw) {
  console.log(`\n=== Sarawak fatwa_list ${sw.r.status}`);
  for (const m of sw.s.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) if (/search_rec|rec_list|makeGETRequest/.test(m[1])) console.log('skrip sebaris:', m[1].replace(/\s+/g, ' ').slice(0, 9000));
  for (const m of sw.s.matchAll(/<[^>]+(search_start_year|div_listing_area|searchall)[^>]*>/gi)) console.log('elemen:', m[0].slice(0, 300));
}
const mj = await ambil('https://muftinegeri.sarawak.gov.my/web/web/js/module.js');
if (mj) for (const m of mj.s.matchAll(/function\s+(makeGETRequest|search_rec|rec_list)\b[\s\S]{0,1500}/g)) console.log(`\n--- module.js ${m[1]}:`, m[0].replace(/\s+/g, ' '));
for (const u of ['https://ifatwa.kedah.gov.my/', 'https://said.johor.gov.my/perkhidmatan/paparan_fatwa.php', 'https://said.johor.gov.my/perkhidmatan/paparan_kemusykilan.php']) {
  const x = await ambil(u);
  if (!x) continue;
  const { r, s } = x;
  console.log(`\n=== ${u}: ${r.status} ${r.headers.get('content-type')} ${s.length} aksara (${r.url})`);
  const links = [...new Map(pautanHtml(s, r.url || u).map(l => [l.url, l])).values()];
  console.log(`${links.length} pautan; contoh:`);
  for (const l of links.slice(0, 50)) console.log(`  ${l.url} | ${l.teks.slice(0, 80)}`);
  for (const m of s.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) if (/ajax|url\s*:|fetch\(|\.load\(|datatable|api\//i.test(m[1])) console.log('skrip sebaris:', m[1].replace(/\s+/g, ' ').slice(0, 1500));
  for (const m of s.matchAll(/<form\b[^>]*>/gi)) console.log('borang:', m[0].slice(0, 200));
  console.log('kandungan:', kandungan(s).replace(/\s+/g, ' ').slice(0, 1000));
}
