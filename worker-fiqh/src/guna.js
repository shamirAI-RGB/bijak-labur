/*
 * Catatan penggunaan token AI untuk Pusat Kawalan (worker-pusat, pusat.bijaklabur.my).
 * Setiap permintaan mendapat salinan env sendiri (Object.create) yang membawa GUNA = { laluan, rekod[] }, supaya
 * panggilan model di mana-mana modul boleh mencatat token tanpa keadaan kongsi antara permintaan.
 * Pada akhir permintaan, rekod dihantar sekali ke PUSAT_URL/catat (ctx.waitUntil) dengan Authorization: Bearer PUSAT_SECRET.
 * Jika PUSAT_URL atau PUSAT_SECRET tiada, tiada apa yang dihantar.
 */
export function mulaGuna(env, laluan) {
  const e = Object.create(env);
  e.GUNA = { laluan: String(laluan || '/').slice(0, 32), rekod: [], t: Date.now() };
  return e;
}

/** Catat satu panggilan model. usage boleh berbentuk Gemini (usageMetadata), OpenAI (usage) atau Claude (usage). */
export function catatGuna(env, { penyedia, model, usage, ok = true, ms }) {
  const g = env && env.GUNA;
  if (!g || g.rekod.length >= 20) return;
  const u = usage || {};
  const masuk = u.promptTokenCount ?? u.prompt_tokens ?? u.input_tokens ?? 0;
  const keluar = u.candidatesTokenCount ?? u.completion_tokens ?? u.output_tokens ?? 0;
  const cache = (u.cachedContentTokenCount ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
  g.rekod.push({ laluan: g.laluan, penyedia: String(penyedia || 'lain').slice(0, 24), model: String(model || '').slice(0, 60), masuk: +masuk || 0, keluar: +keluar || 0, cache: +cache || 0, ms: Math.max(0, Math.round(ms ?? (Date.now() - g.t))), ok: ok !== false });
}

/** Hantar rekod permintaan ini ke Pusat Kawalan (dipanggil melalui ctx.waitUntil). Memulangkan true jika dihantar. */
export async function hantarGuna(env) {
  const g = env && env.GUNA;
  if (!g || !g.rekod.length || !env.PUSAT_URL || !env.PUSAT_SECRET) return false;
  try {
    const r = await fetch(`${String(env.PUSAT_URL).replace(/\/$/, '')}/catat`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${env.PUSAT_SECRET}` },
      body: JSON.stringify(g.rekod), signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) console.log('pusat/catat', r.status);
    return r.ok;
  } catch (e) { console.log('pusat/catat gagal', String(e && e.message || e).slice(0, 120)); return false; }
}
