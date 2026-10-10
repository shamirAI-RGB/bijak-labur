import { toJsonSchema, potongJson, penghalaGenerate, combo } from './penghala.js';
import { catatGuna } from './guna.js';

// Panggilan Gemini (peringkat percuma) dengan model sandaran, dikongsi oleh Tanya AI dan Semak Kertas.
// Diagnosis: Flash penuh kerap memulangkan 503 "high demand"; Flash-Lite menjawab dalam ~2 saat.
export const GEMINI_MODEL = 'gemini-flash-lite-latest';
// Jika model pertama kehabisan kuota percuma (429), tiada (404) atau sibuk (5xx), cuba model seterusnya
export const GEMINI_FALLBACKS = ['gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
const RETRY_NEXT = new Set([404, 429, 500, 503, 504]);
export const geminiModels = env => [...new Set([env.GEMINI_MODEL || GEMINI_MODEL, ...GEMINI_FALLBACKS])];

// Penghala berbilang penyedia (gaya 9Router, lihat penghala.js): jika semua model Gemini gagal kerana kuota atau sibuk,
// permintaan dialihkan ke penyedia berkunci yang aktif, kemudian ke model terbuka di Cloudflare Workers AI (binding AI).
export const ROUTER_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export { toJsonSchema };

/** Ada sekurang-kurangnya satu penyedia teks berkunci (Gemini atau penyedia lain) */
export const aiSedia = env => !!(env.GEMINI_API_KEY || combo(env).length);

/** Tukar permintaan Gemini kepada Workers AI dan pulangkan jawapan dalam bentuk Gemini. null jika tidak sesuai (cth. ada gambar). */
export async function routerGenerate(env, body) {
  if (!env.AI) return null;
  const b = JSON.parse(body);
  const parts = (b.contents || []).flatMap(c => c.parts || []);
  if (parts.some(p => p.inline_data || p.inlineData)) return null;   // gambar: tiada model penglihatan sandaran
  const g = b.generationConfig || {};
  const sys = ((b.systemInstruction && b.systemInstruction.parts) || []).map(p => p.text || '').join('\n');
  const json = g.responseMimeType === 'application/json';
  const messages = [
    { role: 'system', content: sys + (json ? '\n\nJawab dengan satu objek JSON yang sah sahaja, tanpa teks lain. Gunakan Bahasa Melayu baku Malaysia (bukan Bahasa Indonesia) untuk teks Bahasa Melayu.' : '') },
    { role: 'user', content: parts.map(p => p.text || '').join('\n\n') }
  ];
  const input = { messages, max_tokens: Math.min(g.maxOutputTokens || 2048, 4096), temperature: g.temperature ?? 0.3 };
  if (g.responseSchema) input.response_format = { type: 'json_schema', json_schema: toJsonSchema(g.responseSchema) };
  const t0 = Date.now();
  const out = await env.AI.run(env.ROUTER_MODEL || ROUTER_MODEL, input);
  catatGuna(env, { penyedia: 'workers-ai', model: env.ROUTER_MODEL || ROUTER_MODEL, usage: out && out.usage, ms: Date.now() - t0 });
  let text = out && out.response;
  if (text && typeof text === 'object') text = JSON.stringify(text);
  text = String(text || '');
  if (json) text = potongJson(text);
  if (!text) return null;
  console.log('penghala: Workers AI', env.ROUTER_MODEL || ROUTER_MODEL);
  return { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], penghala: 'workers-ai' };
}

/**
 * body = rentetan JSON permintaan generateContent. Memulangkan jawapan JSON Gemini (atau penyedia sandaran).
 * routerBody (pilihan) = permintaan yang lebih kecil untuk penyedia sandaran, yang mengehadkan jawapan kepada 4096 token.
 */
export async function geminiGenerate(env, body, routerBody = body) {
  try { return await geminiOnly(env, body); }
  catch (err) {
    // Kuota habis, sibuk atau tiada kunci: cuba penyedia sandaran. Ralat lain (cth. 400) dikekalkan.
    if (![429, 529, 500, 503, 504, 404].includes(err.status)) throw err;
    let d = null;
    try { d = await penghalaGenerate(env, body); } catch (e) { console.log('penghala gagal', String(e && e.message || e).slice(0, 200)); }
    if (d) return d;
    try { d = await routerGenerate(env, routerBody); } catch (e) { console.log('penghala gagal', String(e && e.message || e).slice(0, 200)); }
    if (d) return d;
    throw err;
  }
}

async function geminiOnly(env, body) {
  if (!env.GEMINI_API_KEY) throw Object.assign(new Error('tiada GEMINI_API_KEY'), { status: 503 });
  let err;
  for (const model of geminiModels(env)) {
    const t0 = Date.now();
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body
    });
    if (r.ok) { const d = await r.json(); catatGuna(env, { penyedia: 'gemini', model, usage: d.usageMetadata, ms: Date.now() - t0 }); return d; }
    err = new Error(`Gemini ${model} ${r.status} ${(await r.text()).slice(0, 300)}`);
    err.status = r.status === 503 ? 529 : r.status;
    console.log(err.message);
    if (!RETRY_NEXT.has(r.status)) throw err;
  }
  throw err;
}

/** Teks jawapan (tanpa bahagian "thought") */
export const geminiText = d => ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).filter(p => !p.thought).map(p => p.text || '').join('');
