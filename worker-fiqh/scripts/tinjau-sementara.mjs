// Sementara (dibuang sebelum PR sedia): lihat struktur beberapa halaman fatwa yang belum memberi artikel
import { pautanHtml, kandungan, KUNCI } from './muat-mufti.mjs';

const UA = 'Mozilla/5.0 (compatible; SiswaCap-Fatwa/1.0; +https://siswacap.my/tentang.html)';
const HALAMAN = [
  'https://mufti.kedah.gov.my/bahagian-fatwa/',
  'https://mufti.kedah.gov.my/bahagian-rujukan-fatwa/',
  'https://mufti.kedah.gov.my/soal-jawab-agama/',
  'https://mufti.kedah.gov.my/wp-json/wp/v2/pdfposter?per_page=3&_fields=link,title,content,meta',
  'https://muftinegeri.sarawak.gov.my/web/subpage/fatwa_list/',
  'https://muftinegeri.sarawak.gov.my/web/subpage/irsyad_list/',
  'https://mufti.johor.gov.my/',
];
for (const u of HALAMAN) {
  await new Promise(z => setTimeout(z, 3000));
  let r;
  try { r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) }); } catch (e) { console.log(`\n=== ${u}: ${e.message}`); continue; }
  const ct = r.headers.get('content-type') || '', s = await r.text();
  console.log(`\n=== ${u}: ${r.status} ${ct} ${s.length} aksara`);
  if (/json/.test(ct)) { console.log(s.slice(0, 3000)); continue; }
  const asal = new URL(u).hostname.replace(/^www\./, '').split('.').slice(-3).join('.');
  const links = pautanHtml(s, r.url || u);
  console.log('pautan berkaitan / PDF / hos lain:');
  for (const l of [...new Map(links.map(l => [l.url, l])).values()].filter(l => KUNCI.test(l.url + ' ' + l.teks) || /\.pdf/i.test(l.url) || !l.url.includes(asal)).slice(0, 60)) console.log(`  ${l.url} | ${l.teks.slice(0, 80)}`);
  console.log('skrip:', [...s.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)/gi)].map(m => m[1]).filter(x => !/jquery|bootstrap|google|gtag|font/i.test(x)).slice(0, 15).join(' '));
  for (const m of s.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) if (/ajax|url\s*:|fetch\(|\.load\(|datatable|api\//i.test(m[1])) console.log('skrip sebaris:', m[1].replace(/\s+/g, ' ').slice(0, 1200));
  for (const m of s.matchAll(/<(iframe|embed|object)\b[^>]*>/gi)) console.log('benam:', m[0].slice(0, 300));
  for (const m of s.matchAll(/data-[\w-]*(?:file|src|url|pdf)[\w-]*=["']([^"']+)/gi)) console.log('data-*:', m[1].slice(0, 300));
  for (const m of s.matchAll(/<form\b[^>]*>/gi)) console.log('borang:', m[0].slice(0, 200));
  console.log('kandungan:', kandungan(s).replace(/\s+/g, ' ').slice(0, 800));
}
