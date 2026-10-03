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
