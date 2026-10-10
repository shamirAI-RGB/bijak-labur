// Sementara (dibuang sebelum PR sedia): lihat struktur halaman butiran irsyad Sarawak
import { pautanHtml, kandungan, tajukHtml, tajukTeks, calonTajuk } from './muat-mufti.mjs';

const UA = 'Mozilla/5.0 (compatible; SiswaCap-Fatwa/1.0; +https://siswacap.my/tentang.html)';
const ambil = async u => {
  await new Promise(z => setTimeout(z, 3000));
  try { const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) }); return { r, s: await r.text() }; }
  catch (e) { console.log(`\n=== ${u}: ${e.message}`); return null; }
};
const senarai = await ambil('https://muftinegeri.sarawak.gov.my/web/subpage/irsyad_list_ajax/');
const butiran = senarai ? pautanHtml(senarai.s, senarai.r.url).find(l => /irsyad_details/.test(l.url)) : null;
for (const u of [butiran && butiran.url, 'https://muftinegeri.sarawak.gov.my/web/subpage/irsyad_list_ajax/&sy=2016&ey=2026', 'https://muftinegeri.sarawak.gov.my/web/subpage/fatwa_list_ajax/&sy=2016&ey=2026'].filter(Boolean)) {
  const x = await ambil(u);
  if (!x) continue;
  const { r, s } = x;
  console.log(`\n=== ${u}: ${r.status} ${r.headers.get('content-type')} ${s.length} aksara`);
  for (const m of s.matchAll(/(onclick|href)=["']([^"']*(page|rec_list|halaman|p=)[^"']{0,150})/gi)) console.log('halaman:', m[2]);
  const t = kandungan(s);
  console.log('calon tajuk:', JSON.stringify(calonTajuk(s)), '| tajukHtml:', tajukHtml(s), '| tajukTeks:', tajukTeks(t));
  console.log('kandungan:', t.replace(/\n+/g, ' / ').slice(0, 1500));
}
