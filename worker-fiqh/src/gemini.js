// Panggilan Gemini (peringkat percuma) dengan model sandaran, dikongsi oleh Tanya AI dan Semak Kertas.
// Diagnosis: Flash penuh kerap memulangkan 503 "high demand"; Flash-Lite menjawab dalam ~2 saat.
export const GEMINI_MODEL = 'gemini-flash-lite-latest';
// Jika model pertama kehabisan kuota percuma (429), tiada (404) atau sibuk (5xx), cuba model seterusnya
export const GEMINI_FALLBACKS = ['gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
const RETRY_NEXT = new Set([404, 429, 500, 503, 504]);
export const geminiModels = env => [...new Set([env.GEMINI_MODEL || GEMINI_MODEL, ...GEMINI_FALLBACKS])];

/** body = rentetan JSON permintaan generateContent. Memulangkan jawapan JSON Gemini. */
export async function geminiGenerate(env, body) {
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
