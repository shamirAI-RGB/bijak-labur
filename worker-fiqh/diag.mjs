// Diagnosis Gemini dengan permintaan sebenar Tanya AI (korpus + soalan). Digunakan oleh fiqh.yml.
// GEMINI_API_KEY=... node worker-fiqh/diag.mjs
import { geminiModels, geminiBody } from './src/index.js';

const key = process.env.GEMINI_API_KEY;
if (!key) { console.log('GEMINI_API_KEY tiada'); process.exit(0); }
const body = geminiBody('Apakah hukum forex runcit?');
console.log(`Saiz permintaan: ${body.length} aksara`);
for (const m of geminiModels({})) {
  const t = Date.now();
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body });
  const d = await r.json().catch(() => ({}));
  const u = d.usageMetadata || {}, c = (d.candidates || [])[0] || {};
  const out = (c.content && c.content.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
  console.log(`${m} -> ${r.status} ${Date.now() - t}ms`, r.ok ? `token masuk ${u.promptTokenCount}, keluar ${u.candidatesTokenCount}, ${c.finishReason}, ${out.slice(0, 120).replace(/\s+/g, ' ')}` : JSON.stringify([d.error && d.error.status, d.error && String(d.error.message).slice(0, 300)]));
}

// Semak Kertas: ulasan pakar sebenar untuk perenggan BM contoh (dengan kesilapan sengaja)
{
  const { semak } = await import('./src/semak.js');
  const teks = 'Pelaburan patuh syariah semakin mendapat perhatian di kalangan pelajar universiti di Malaysia. Kajian ini bertujuan untuk mengenalpasti faktor-faktor yang mempengaruhi minat pelajar untuk melabur. Hasil kajian menunjukan bahawa pengetahuan kewangan adalah lebih penting dari pendapatan keluarga. Selain itu, pelajar juga di pengaruhi oleh rakan-rakan. Kesimpulannya, pihak universiti perlu memperbanyakkan program literasi kewangan supaya pelajar boleh membuat keputusan yang bijak. Walau bagaimanapun, kajian ini hanya melibatkan 50 orang responden sahaja.';
  const t = Date.now();
  try {
    const r = await semak({ GEMINI_API_KEY: key }, teks, 'ms');
    console.log(`semak -> ${Date.now() - t}ms, jumlah ${r.jumlah}/100`);
    console.log('markah:', Object.entries(r.markah).map(([k, v]) => `${k} ${v.skor}`).join(', '));
    console.log('pembetulan:', r.pembetulan.map(p => `${p.asal} → ${p.baru}`).join(' | '));
    console.log('penambahbaikan:', r.penambahbaikan.map(p => p.isu).join(' | '));
  } catch (e) { console.log('semak gagal', e.status, e.message.slice(0, 200)); }
}
