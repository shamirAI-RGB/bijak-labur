// Panggilan Gemini (peringkat percuma) dengan model sandaran, dikongsi oleh Tanya AI dan Semak Kertas.
// Diagnosis: Flash penuh kerap memulangkan 503 "high demand"; Flash-Lite menjawab dalam ~2 saat.
export const GEMINI_MODEL = 'gemini-flash-lite-latest';
// Jika model pertama kehabisan kuota percuma (429), tiada (404) atau sibuk (5xx), cuba model seterusnya
export const GEMINI_FALLBACKS = ['gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
const RETRY_NEXT = new Set([404, 429, 500, 503, 504]);
export const geminiModels = env => [...new Set([env.GEMINI_MODEL || GEMINI_MODEL, ...GEMINI_FALLBACKS])];

// Penghala berbilang penyedia (gaya OmniRoute): jika semua model Gemini gagal kerana kuota atau sibuk,
// permintaan teks dialihkan ke model terbuka di Cloudflare Workers AI (peringkat percuma, binding AI).
export const ROUTER_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

// Skema Gemini (type: 'OBJECT') -> JSON Schema biasa (type: 'object')
export function toJsonSchema(s) {
  if (!s || typeof s !== 'object') return s;
  const o = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'type') o.type = String(v).toLowerCase();
    else if (k === 'properties') o.properties = Object.fromEntries(Object.entries(v).map(([n, x]) => [n, toJsonSchema(x)]));
    else if (k === 'items') o.items = toJsonSchema(v);
    else if (['required', 'enum', 'description'].includes(k)) o[k] = v;
  }
  return o;
}

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
  const out = await env.AI.run(env.ROUTER_MODEL || ROUTER_MODEL, input);
  let text = out && out.response;
  if (text && typeof text === 'object') text = JSON.stringify(text);
  text = String(text || '');
  if (json) { const a = text.indexOf('{'), z = text.lastIndexOf('}'); if (a >= 0 && z > a) text = text.slice(a, z + 1); }
  if (!text) return null;
  console.log('penghala: Workers AI', env.ROUTER_MODEL || ROUTER_MODEL);
  return { candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], penghala: 'workers-ai' };
}

/** body = rentetan JSON permintaan generateContent. Memulangkan jawapan JSON Gemini (atau penyedia sandaran). */
export async function geminiGenerate(env, body) {
  try { return await geminiOnly(env, body); }
  catch (err) {
    // Kuota habis, sibuk atau tiada kunci: cuba penyedia sandaran. Ralat lain (cth. 400) dikekalkan.
    if (![429, 529, 500, 503, 504, 404].includes(err.status)) throw err;
    let d = null;
    try { d = await routerGenerate(env, body); } catch (e) { console.log('penghala gagal', String(e && e.message || e).slice(0, 200)); }
    if (d) return d;
    throw err;
  }
}

async function geminiOnly(env, body) {
  if (!env.GEMINI_API_KEY) throw Object.assign(new Error('tiada GEMINI_API_KEY'), { status: 503 });
  let err;
  for (const model of geminiModels(env)) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY }, body
    });
    if (r.ok) return r.json();
    err = new Error(`Gemini ${model} ${r.status} ${(await r.text()).slice(0, 300)}`);
    err.status = r.status === 503 ? 529 : r.status;
    console.log(err.message);
    if (!RETRY_NEXT.has(r.status)) throw err;
  }
  throw err;
}

/** Teks jawapan (tanpa bahagian "thought") */
export const geminiText = d => ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).filter(p => !p.thought).map(p => p.text || '').join('');
