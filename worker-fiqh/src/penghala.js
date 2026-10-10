/*
 * SiswaCap: penghala AI berbilang penyedia (diadaptasi daripada 9Router, lesen MIT dalam worker-fiqh/LICENSE-9router).
 *
 * Susunan sandaran (combo): Gemini -> penyedia berkunci di bawah -> Cloudflare Workers AI (binding AI).
 * Setiap penyedia hanya aktif jika kuncinya ditetapkan sebagai rahsia pelayan (GitHub Secret -> wrangler secret).
 * Model boleh ditukar tanpa ubah kod melalui pemboleh ubah <ID>_MODEL, dan susunan melalui AI_COMBO
 * (cth. "groq,cerebras,openrouter").
 *
 * Seperti 9Router, penyedia yang gagal "disejukkan" seketika supaya permintaan seterusnya terus ke penyedia lain:
 *   429 / kuota: undur eksponen (2 s, 4 s, 8 s ... maksimum 5 minit)
 *   401 / 402 / 403: kunci salah atau kredit habis, 10 minit
 *   5xx / tamat masa / rangkaian: 30 saat
 *   400 lain: punca ialah permintaan itu sendiri, jadi tiada penyejukan (cuba penyedia seterusnya sahaja)
 *
 * Tidak dimasukkan daripada 9Router (dengan sebab):
 *   - Langganan melalui OAuth atau log masuk web (Kiro, Cursor, Codex, Copilot, Windsurf, Trae, Qoder, CodeBuddy,
 *     Gemini CLI, Antigravity, Grok Web, Perplexity Web, pelan "coding" Kimi/GLM/Alibaba/Volcengine/Cline):
 *     berkongsi langganan peribadi untuk laman awam melanggar terma penyedia.
 *   - Pelayan tempatan (Ollama, ComfyUI, SD WebUI, self-hosted): tidak boleh dicapai dari Cloudflare.
 *   - Penjual semula tanpa terma yang jelas (api.airforce, LLM7, Blackbox, TokenHarbor, BazaarLink dan lain-lain).
 *   - Carian web (Perplexity): Tanya AI mesti menjawab daripada korpus sahaja.
 *   - RTK (penjimat token): direka untuk output alat pengekodan, bukan permintaan laman ini.
 */

// key: rahsia kunci; model: model lalai (kosong = mesti ditetapkan melalui <ID>_MODEL); vision: model gambar (pilihan)
import { catatGuna } from './guna.js';
export const PENYEDIA = [
  // Peringkat percuma (didahulukan)
  { id: 'groq', nama: 'Groq', key: 'GROQ_API_KEY', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', vision: 'meta-llama/llama-4-maverick-17b-128e-instruct', percuma: true },
  { id: 'cerebras', nama: 'Cerebras', key: 'CEREBRAS_API_KEY', url: 'https://api.cerebras.ai/v1/chat/completions', model: 'gpt-oss-120b', percuma: true },
  { id: 'openrouter', nama: 'OpenRouter', key: 'OPENROUTER_API_KEY', url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.3-70b-instruct:free', vision: 'google/gemma-3-27b-it:free', percuma: true },
  { id: 'nvidia', nama: 'NVIDIA NIM', key: 'NVIDIA_API_KEY', url: 'https://integrate.api.nvidia.com/v1/chat/completions', model: 'deepseek-ai/deepseek-v4-flash', percuma: true },
  { id: 'mistral', nama: 'Mistral', key: 'MISTRAL_API_KEY', url: 'https://api.mistral.ai/v1/chat/completions', model: 'mistral-small-latest', vision: 'mistral-small-latest', percuma: true },
  { id: 'zai', nama: 'Z.ai', key: 'ZAI_API_KEY', url: 'https://api.z.ai/api/paas/v4/chat/completions', model: 'glm-5.3-flash', percuma: true },
  { id: 'sambanova', nama: 'SambaNova', key: 'SAMBANOVA_API_KEY', url: 'https://api.sambanova.ai/v1/chat/completions', model: 'MiniMax-M2.7', percuma: true },
  { id: 'kilo', nama: 'Kilo Gateway', key: 'KILO_API_KEY', url: 'https://api.kilo.ai/api/gateway/chat/completions', model: 'kilo-auto/free', percuma: true },
  { id: 'huggingface', nama: 'Hugging Face', key: 'HF_TOKEN', url: 'https://router.huggingface.co/v1/chat/completions', model: 'meta-llama/Llama-3.3-70B-Instruct', percuma: true },
  // Kredit atau berbayar
  { id: 'deepseek', nama: 'DeepSeek', key: 'DEEPSEEK_API_KEY', url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-flash' },
  { id: 'together', nama: 'Together AI', key: 'TOGETHER_API_KEY', url: 'https://api.together.xyz/v1/chat/completions', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  { id: 'fireworks', nama: 'Fireworks', key: 'FIREWORKS_API_KEY', url: 'https://api.fireworks.ai/inference/v1/chat/completions', model: 'accounts/fireworks/models/llama-v3p3-70b-instruct' },
  { id: 'nebius', nama: 'Nebius', key: 'NEBIUS_API_KEY', url: 'https://api.studio.nebius.ai/v1/chat/completions', model: 'meta-llama/Llama-3.3-70B-Instruct' },
  { id: 'siliconflow', nama: 'SiliconFlow', key: 'SILICONFLOW_API_KEY', url: 'https://api.siliconflow.com/v1/chat/completions', model: 'deepseek-ai/DeepSeek-V4-Flash' },
  { id: 'featherless', nama: 'Featherless', key: 'FEATHERLESS_API_KEY', url: 'https://api.featherless.ai/v1/chat/completions', model: 'deepseek-ai/DeepSeek-V4-Flash' },
  { id: 'hyperbolic', nama: 'Hyperbolic', key: 'HYPERBOLIC_API_KEY', url: 'https://api.hyperbolic.xyz/v1/chat/completions', model: 'deepseek-ai/DeepSeek-V3' },
  { id: 'chutes', nama: 'Chutes', key: 'CHUTES_API_KEY', url: 'https://llm.chutes.ai/v1/chat/completions', model: '' },
  { id: 'cohere', nama: 'Cohere', key: 'COHERE_API_KEY', url: 'https://api.cohere.ai/compatibility/v1/chat/completions', model: 'command-r-plus-08-2024' },
  { id: 'dashscope', nama: 'Alibaba Qwen', key: 'DASHSCOPE_API_KEY', url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen3.5-plus' },
  { id: 'minimax', nama: 'MiniMax', key: 'MINIMAX_API_KEY', url: 'https://api.minimax.io/v1/chat/completions', model: 'MiniMax-M3' },
  { id: 'hunyuan', nama: 'Tencent Hunyuan', key: 'HUNYUAN_API_KEY', url: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions', model: 'hunyuan-turbos-latest' },
  { id: 'qianfan', nama: 'Baidu Qianfan', key: 'QIANFAN_API_KEY', url: 'https://qianfan.baidubce.com/v2/chat/completions', model: 'deepseek-v4-flash' },
  { id: 'xai', nama: 'xAI', key: 'XAI_API_KEY', url: 'https://api.x.ai/v1/chat/completions', model: 'grok-4-fast-reasoning', vision: 'grok-4-fast-reasoning' },
  { id: 'openai', nama: 'OpenAI', key: 'OPENAI_API_KEY', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-5.4-mini', vision: 'gpt-5.4-mini' },
  { id: 'vercel', nama: 'Vercel AI Gateway', key: 'AI_GATEWAY_API_KEY', url: 'https://ai-gateway.vercel.sh/v1/chat/completions', model: '' },
  { id: 'opencode', nama: 'OpenCode Zen', key: 'OPENCODE_API_KEY', url: 'https://opencode.ai/zen/v1/chat/completions', model: '' }
];

// Penjana gambar sandaran untuk Studio Gambar apabila kuota harian Workers AI habis
export const PENYEDIA_GAMBAR = [
  { id: 'together', nama: 'Together AI', key: 'TOGETHER_API_KEY', model: 'black-forest-labs/FLUX.1-schnell-Free' },
  { id: 'huggingface', nama: 'Hugging Face', key: 'HF_TOKEN', model: 'fal-ai/fal-ai/flux/schnell' }
];

/* ---------- Penyejukan (seperti accountFallback 9Router), disimpan dalam memori isolate ---------- */
const BACKOFF = { base: 2000, max: 5 * 60 * 1000, maxLevel: 15 };
const COOLDOWN = { auth: 10 * 60 * 1000, transient: 30 * 1000 };
const state = new Map();   // id -> { until, level }

export function cooldownFor(status, text = '', level = 0) {
  const t = String(text).toLowerCase();
  if (status === 429 || /rate.?limit|quota|exhausted|too many requests|capacity/.test(t)) {
    const n = Math.min(level + 1, BACKOFF.maxLevel);
    return { fallback: true, ms: Math.min(BACKOFF.base * 2 ** (n - 1), BACKOFF.max), level: n };
  }
  if ([401, 402, 403].includes(status)) return { fallback: true, ms: COOLDOWN.auth, level };
  if (status >= 400 && status < 500) return { fallback: true, ms: 0, level };
  return { fallback: true, ms: COOLDOWN.transient, level };
}

const sejuk = id => { const s = state.get(id); return !!(s && s.until > Date.now()); };
function gagal(id, status, text) {
  const s = state.get(id) || { until: 0, level: 0 };
  const c = cooldownFor(status, text, s.level);
  state.set(id, { until: c.ms ? Date.now() + c.ms : 0, level: c.level });
}
const berjaya = id => state.delete(id);
export const resetPenghala = () => state.clear();

/** Penyedia yang aktif (ada kunci dan model), ikut susunan AI_COMBO jika ditetapkan */
export function combo(env, senarai = PENYEDIA) {
  const ada = senarai.filter(p => env[p.key] && (env[`${p.id.toUpperCase()}_MODEL`] || p.model));
  const urut = String(env.AI_COMBO || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!urut.length) return ada;
  const pilih = urut.map(id => ada.find(p => p.id === id)).filter(Boolean);
  return [...pilih, ...ada.filter(p => !pilih.includes(p))];
}

/** Nama penyedia aktif sahaja (tanpa kunci), untuk status pelayan */
export const senaraiAktif = env => combo(env).map(p => p.id);

/* ---------- Penukaran permintaan Gemini -> format OpenAI ---------- */
const BM = 'Gunakan Bahasa Melayu baku Malaysia (bukan Bahasa Indonesia) untuk teks Bahasa Melayu.';

export function keOpenAI(b, { vision = false } = {}) {
  const g = b.generationConfig || {};
  const json = g.responseMimeType === 'application/json';
  const sys = ((b.systemInstruction && b.systemInstruction.parts) || []).map(p => p.text || '').join('\n');
  const parts = (b.contents || []).flatMap(c => c.parts || []);
  const imej = parts.filter(p => p.inline_data || p.inlineData);
  if (imej.length && !vision) return null;
  const content = imej.length
    ? parts.map(p => {
      const d = p.inline_data || p.inlineData;
      return d ? { type: 'image_url', image_url: { url: `data:${d.mime_type || d.mimeType};base64,${d.data}` } } : { type: 'text', text: p.text || '' };
    })
    : parts.map(p => p.text || '').join('\n\n');
  const skema = json && g.responseSchema ? `\n\nIkut skema JSON ini: ${JSON.stringify(toJsonSchema(g.responseSchema))}` : '';
  return {
    messages: [
      { role: 'system', content: `${sys}${json ? `\n\nJawab dengan satu objek JSON yang sah sahaja, tanpa teks lain. ${BM}${skema}` : `\n\n${BM}`}` },
      { role: 'user', content }
    ],
    max_tokens: Math.min(g.maxOutputTokens || 2048, 8192),
    temperature: g.temperature ?? 0.3,
    ...(json ? { response_format: { type: 'json_object' } } : {})
  };
}

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

export function potongJson(text) {
  const a = text.indexOf('{'), z = text.lastIndexOf('}');
  return a >= 0 && z > a ? text.slice(a, z + 1) : text;
}

const bentukGemini = (text, id) => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], penghala: id });

async function panggil(p, env, input) {
  const r = await fetch(p.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env[p.key]}` },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(Number(env.AI_TIMEOUT_MS) || 45000)
  });
  return { status: r.status, ok: r.ok, text: await r.text() };
}

/**
 * Cuba setiap penyedia aktif mengikut combo. Pulangkan jawapan dalam bentuk Gemini, atau null jika semua gagal.
 * body = rentetan JSON permintaan Gemini.
 */
export async function penghalaGenerate(env, body) {
  const b = JSON.parse(body);
  const json = (b.generationConfig || {}).responseMimeType === 'application/json';
  const ada = (b.contents || []).some(c => (c.parts || []).some(x => x.inline_data || x.inlineData));
  for (const p of combo(env)) {
    if (sejuk(p.id)) continue;
    const model = ada ? (env[`${p.id.toUpperCase()}_VISION_MODEL`] || p.vision) : (env[`${p.id.toUpperCase()}_MODEL`] || p.model);
    if (!model) continue;
    const input = keOpenAI(b, { vision: ada });
    if (!input) continue;
    input.model = model;
    try {
      let r = await panggil(p, env, input);
      // Sesetengah model tidak menyokong response_format: cuba sekali lagi tanpanya
      if (r.status === 400 && input.response_format && /response_format|json_object|json mode/i.test(r.text)) {
        delete input.response_format;
        r = await panggil(p, env, input);
      }
      if (!r.ok) { console.log(`penghala ${p.id} ${r.status} ${r.text.slice(0, 200)}`); gagal(p.id, r.status, r.text); continue; }
      const d = JSON.parse(r.text);
      catatGuna(env, { penyedia: p.id, model, usage: d.usage });
      const m = d.choices && d.choices[0] && d.choices[0].message;
      let text = String((m && m.content) || '');
      if (json) text = potongJson(text);
      if (!text.trim()) { gagal(p.id, 502, 'kosong'); continue; }
      berjaya(p.id);
      console.log('penghala:', p.id, model);
      return bentukGemini(text, p.id);
    } catch (e) {
      console.log(`penghala ${p.id} ralat ${String(e && e.message || e).slice(0, 160)}`);
      gagal(p.id, 503, String(e && e.message || e));
    }
  }
  return null;
}

/** Gambar sandaran (FLUX schnell) apabila Workers AI tidak tersedia. Pulangkan { image, mime, penyedia } atau null. */
export async function gambarSandaran(env, prompt) {
  for (const p of combo(env, PENYEDIA_GAMBAR)) {
    if (sejuk('img:' + p.id)) continue;
    const model = env[`${p.id.toUpperCase()}_IMAGE_MODEL`] || p.model;
    try {
      let r;
      if (p.id === 'together') {
        r = await fetch('https://api.together.xyz/v1/images/generations', {
          method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env[p.key]}` },
          body: JSON.stringify({ model, prompt, steps: 4, n: 1, width: 1024, height: 1024, response_format: 'b64_json' }),
          signal: AbortSignal.timeout(60000)
        });
        if (!r.ok) throw Object.assign(new Error(`${r.status} ${(await r.text()).slice(0, 200)}`), { status: r.status });
        const d = await r.json(), image = d.data && d.data[0] && d.data[0].b64_json;
        if (!image) throw Object.assign(new Error('tiada gambar'), { status: 502 });
        berjaya('img:' + p.id);
        return { image, mime: 'image/jpeg', penyedia: p.id };
      }
      // Hugging Face Inference Providers: memulangkan bait gambar
      r = await fetch(`https://router.huggingface.co/${model}`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env[p.key]}` },
        body: JSON.stringify({ inputs: prompt }), signal: AbortSignal.timeout(60000)
      });
      if (!r.ok) throw Object.assign(new Error(`${r.status} ${(await r.text()).slice(0, 200)}`), { status: r.status });
      const bytes = new Uint8Array(await r.arrayBuffer());
      if (bytes.length < 100) throw Object.assign(new Error('gambar kosong'), { status: 502 });
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      berjaya('img:' + p.id);
      return { image: btoa(bin), mime: bytes[0] === 0x89 ? 'image/png' : 'image/jpeg', penyedia: p.id };
    } catch (e) {
      console.log(`gambar ${p.id} ${String(e && e.message || e).slice(0, 200)}`);
      gagal('img:' + p.id, e && e.status || 503, String(e && e.message || e));
    }
  }
  return null;
}
