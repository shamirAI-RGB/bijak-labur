/*
 * Agen AI pemilik Bijak Labur. Dipanggil daripada Telegram (webhook) dan papan kawalan (/papan/arahan).
 *
 * Tiga lapisan, supaya agen sentiasa berfungsi:
 *  1. Arahan pantas (/stat, /sihat, /pr, ...): dijawab terus daripada data, tanpa token AI.
 *  2. Claude (ANTHROPIC_API_KEY) dengan alat: statistik, kesihatan, GitHub, buka issue "arahan", log, tetapan, penggunaan Workers, baca laman.
 *  3. Gemini percuma (GEMINI_API_KEY) dengan alat yang sama (pemanggilan fungsi).
 * Ingatan sembang (40 giliran terakhir) disimpan dalam Durable Object. Penggunaan token agen sendiri turut dicatat (laluan /agen).
 */
import Anthropic from '@anthropic-ai/sdk';

const nowSec = () => Math.floor(Date.now() / 1000);
const fmt = n => new Intl.NumberFormat('ms-MY').format(Math.round(+n || 0));
const rm = usd => `RM${(usd * 4.3).toFixed(2)}`;
const NAMA_LALUAN = { '/tanya': 'Tanya AI Fiqh', '/semak': 'Semak Kertas', '/kalori': 'Sihat (kalori)', '/gambar': 'Studio Gambar', '/buku': 'Buku Nota AI', '/kerja': 'Kerjaya AI', '/manusia': 'Semakan gaya AI', '/audit': 'Audit lanjutan', '/coach': 'AI Coach', '/agen': 'Agen Telegram', '/kata': 'Kata kunci carian' };
export const namaLaluan = l => NAMA_LALUAN[l] || l;

/* ---------- Perkhidmatan yang disemak ---------- */
export const PERKHIDMATAN = [
  { nama: 'Laman bijaklabur.my', url: 'https://bijaklabur.my/', semak: t => /Bijak Labur/.test(t) },
  { nama: 'Pelayan nota', url: 'https://nota.bijaklabur.my/notes', semak: t => /"notes"/.test(t) },
  { nama: 'Pelayan Tanya AI (fiqh)', url: 'https://fiqh.bijaklabur.my/', semak: t => /"ok":true/.test(t) },
  { nama: 'Pelayan jadual UiTM', url: 'https://jadual.bijaklabur.my/', semak: t => t.length > 0 },
  { nama: 'Pelayan Premium dan akaun', url: 'https://bijak-labur-premium.khanz-amir.workers.dev/', semak: t => /"ok":true/.test(t) }
];
export async function semakKesihatan(env, senarai = PERKHIDMATAN) {
  return Promise.all(senarai.map(async s => {
    const t0 = Date.now();
    try {
      const r = await fetch(s.url, { headers: { origin: env.SITE_URL || 'https://bijaklabur.my', 'user-agent': 'BijakLabur-pusat/1.0' }, signal: AbortSignal.timeout(15000) });
      const teks = (await r.text()).slice(0, 20000);
      if (!r.ok) return { nama: s.nama, ok: false, ms: Date.now() - t0, nota: `HTTP ${r.status}` };
      if (!s.semak(teks)) return { nama: s.nama, ok: false, ms: Date.now() - t0, nota: 'kandungan tidak dijangka' };
      return { nama: s.nama, ok: true, ms: Date.now() - t0, nota: '' };
    } catch (e) { return { nama: s.nama, ok: false, ms: Date.now() - t0, nota: String(e && e.message || e).slice(0, 120) }; }
  }));
}

/* ---------- GitHub (API awam; GH_TOKEN pilihan) ---------- */
const GH = 'https://api.github.com';
const ghHeaders = env => ({ accept: 'application/vnd.github+json', 'user-agent': 'BijakLabur-pusat/1.0', ...(env.GH_TOKEN ? { authorization: `Bearer ${env.GH_TOKEN}` } : {}) });
async function gh(env, path, init = {}) {
  const r = await fetch(`${GH}/repos/${env.REPO || 'shamirAI-RGB/bijak-labur'}${path}`, { ...init, headers: { ...ghHeaders(env), ...(init.headers || {}) }, signal: AbortSignal.timeout(15000) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${String(d.message || '').slice(0, 120)}`);
  return d;
}
const bila = iso => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 60 ? `${m} min lalu` : m < 1440 ? `${Math.round(m / 60)} jam lalu` : `${Math.round(m / 1440)} hari lalu`; };
export async function github(env, jenis) {
  if (jenis === 'pr') return (await gh(env, '/pulls?state=open&per_page=10')).map(p => ({ no: p.number, tajuk: p.title, oleh: p.user && p.user.login, draf: p.draft, dikemaskini: bila(p.updated_at), url: p.html_url }));
  if (jenis === 'actions') return (await gh(env, '/actions/runs?per_page=10')).workflow_runs.map(w => ({ nama: w.name, cawangan: w.head_branch, status: w.conclusion || w.status, bila: bila(w.updated_at), url: w.html_url }));
  if (jenis === 'issues') return (await gh(env, '/issues?state=open&per_page=15')).filter(i => !i.pull_request).map(i => ({ no: i.number, tajuk: i.title, label: i.labels.map(l => l.name), bila: bila(i.updated_at), url: i.html_url }));
  if (jenis === 'commits') return (await gh(env, '/commits?per_page=8')).map(c => ({ sha: c.sha.slice(0, 7), mesej: c.commit.message.split('\n')[0].slice(0, 100), bila: bila(c.commit.author.date) }));
  throw new Error('jenis tidak dikenali');
}
export async function bukaIssue(env, tajuk, badan) {
  if (!env.GH_TOKEN) return { error: 'GH_TOKEN belum ditetapkan dalam GitHub Secrets, jadi agen tidak boleh membuka issue. Beritahu pemilik.' };
  await fetch(`${GH}/repos/${env.REPO}/labels`, { method: 'POST', headers: { ...ghHeaders(env), 'content-type': 'application/json' }, body: JSON.stringify({ name: 'arahan', color: '0E7C66', description: 'Arahan pemilik melalui agen Telegram Pusat Kawalan' }), signal: AbortSignal.timeout(15000) }).catch(() => {});
  const d = await gh(env, '/issues', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: String(tajuk).slice(0, 200), body: `${String(badan).slice(0, 6000)}\n\n---\nDibuka oleh pemilik melalui agen Telegram Pusat Kawalan Bijak Labur. AI Agent harian: sila laksanakan melalui PR ke main.`, labels: ['arahan'] }) });
  return { no: d.number, url: d.html_url };
}

/* ---------- Penggunaan Workers (Cloudflare GraphQL, pilihan) ---------- */
export async function penggunaanWorkers(env) {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) return { error: 'CF_ANALYTICS_TOKEN / CF_ACCOUNT_ID belum ditetapkan.' };
  const until = new Date(), since = new Date(until - 864e5);
  const query = `query($a:String!,$s:Time!,$u:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsAdaptive(limit:200,filter:{datetime_geq:$s,datetime_leq:$u}){sum{requests errors}dimensions{scriptName}}}}}`;
  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ query, variables: { a: env.CF_ACCOUNT_ID, s: since.toISOString(), u: until.toISOString() } }), signal: AbortSignal.timeout(20000) });
  const d = await r.json();
  if (d.errors && d.errors.length) return { error: String(d.errors[0].message).slice(0, 160) };
  const by = {};
  for (const x of ((((d.data || {}).viewer || {}).accounts || [])[0] || {}).workersInvocationsAdaptive || []) { const s = by[x.dimensions.scriptName] ||= { permintaan: 0, ralat: 0 }; s.permintaan += x.sum.requests; s.ralat += x.sum.errors; }
  return { tempoh: '24 jam', pelayan: by };
}

/* ---------- Baca laman sendiri ---------- */
const HOS_OK = h => h === 'bijaklabur.my' || h.endsWith('.bijaklabur.my') || h === 'shamirai-rgb.github.io' || /^bijak-labur-[a-z-]+\.khanz-amir\.workers\.dev$/.test(h);
export async function bacaLaman(env, url) {
  let u; try { u = new URL(url); } catch { return { error: 'URL tidak sah' }; }
  if (u.protocol !== 'https:' || !HOS_OK(u.hostname)) return { error: 'Hanya laman dan pelayan Bijak Labur boleh dibaca.' };
  const r = await fetch(u, { headers: { origin: env.SITE_URL || 'https://bijaklabur.my', 'user-agent': 'BijakLabur-pusat/1.0' }, signal: AbortSignal.timeout(15000) });
  const t = (await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { status: r.status, teks: t.slice(0, 3000) };
}

/* ---------- Alat (satu takrifan, ditukar ke bentuk Claude dan Gemini) ---------- */
export const ALAT = [
  { name: 'statistik', description: 'Data pusat: pelawat sedang melayari, pelawat hari ini / 7 hari / 30 hari, halaman popular, negara, token AI setiap ciri dan penyedia, anggaran kos, kesihatan terakhir.', input: {} },
  { name: 'kesihatan', description: 'Semak SEKARANG sama ada laman dan setiap pelayan Bijak Labur hidup, dengan masa respons.', input: {} },
  { name: 'github', description: 'Baca repo GitHub Bijak Labur: pull request terbuka, larian GitHub Actions terkini, issue terbuka, atau commit terkini.', input: { jenis: { type: 'string', enum: ['pr', 'actions', 'issues', 'commits'], description: 'Apa yang hendak dibaca' } }, perlu: ['jenis'] },
  { name: 'buka_issue', description: 'Buka issue GitHub berlabel "arahan" supaya AI Agent harian membina atau membaiki sesuatu melalui PR. Gunakan apabila pemilik mengarahkan perubahan kod, ciri atau kandungan laman. Tulis tajuk dan badan yang jelas dalam Bahasa Melayu dengan kriteria siap.', input: { tajuk: { type: 'string' }, badan: { type: 'string' } }, perlu: ['tajuk', 'badan'] },
  { name: 'peristiwa', description: 'Log peristiwa terkini pusat: amaran rosak/pulih, arahan lepas, laporan.', input: {} },
  { name: 'tetapan', description: 'Hidupkan atau matikan amaran kesihatan Telegram dan laporan harian 08:00.', input: { amaran: { type: 'boolean' }, laporan: { type: 'boolean' } } },
  { name: 'penggunaan_workers', description: 'Permintaan dan ralat setiap pelayan Cloudflare Workers dalam 24 jam lalu (jika token analitik ditetapkan).', input: {} },
  { name: 'baca_laman', description: 'Buka satu URL bijaklabur.my atau pelayannya dan pulangkan teksnya (sehingga 3000 aksara) untuk semakan kandungan.', input: { url: { type: 'string' } }, perlu: ['url'] }
];
const skema = a => ({ type: 'object', properties: a.input, ...(a.perlu ? { required: a.perlu } : {}) });
export const alatClaude = () => ALAT.map(a => ({ name: a.name, description: a.description, input_schema: skema(a) }));
// Gemini menolak objek "properties" kosong, jadi alat tanpa parameter tidak membawa "parameters"
export const alatGemini = () => ({ functionDeclarations: ALAT.map(a => ({ name: a.name, description: a.description, ...(Object.keys(a.input).length ? { parameters: skema(a) } : {}) })) });

async function ringkasPapan(stub) {
  const p = await (await stub.fetch('https://pusat/papan')).json();
  return {
    pelawatSedangMelayari: p.kini, halamanKini: p.lamanKini, pelawat: p.pelawat, halamanPopular7Hari: p.lamanHari, negara30Hari: p.negara, peranti24Jam: p.peranti,
    tokenAI: { hariIni: p.token.hari, minggu: p.token.minggu, bulan: p.token.bulan, nota: 'kos dalam USD; Gemini, penghala percuma dan Workers AI dikira 0 (kuota percuma)' },
    tokenMengikutPenyedia30Hari: p.tokenPenyedia, tokenMengikutCiri30Hari: p.tokenLaluan.map(x => ({ ...x, ciri: namaLaluan(x.laluan) })),
    kesihatanTerakhir: p.kesihatan.map(k => ({ nama: k.nama, ok: !!k.ok, ms: k.ms, nota: k.nota, disemak: bila(k.t * 1000) })), tetapan: p.tetapan
  };
}
export async function jalankanAlat(env, stub, nama, input = {}) {
  try {
    switch (nama) {
      case 'statistik': return await ringkasPapan(stub);
      case 'kesihatan': { const s = await semakKesihatan(env); await stub.fetch('https://pusat/kesihatan', { method: 'POST', body: JSON.stringify(s) }); return s; }
      case 'github': return await github(env, input.jenis);
      case 'buka_issue': { const d = await bukaIssue(env, input.tajuk, input.badan); if (d.url) await stub.fetch('https://pusat/peristiwa', { method: 'POST', body: JSON.stringify({ jenis: 'issue', teks: `Issue #${d.no} dibuka: ${input.tajuk}` }) }); return d; }
      case 'peristiwa': return (await (await stub.fetch('https://pusat/peristiwa')).json()).map(p => ({ bila: bila(p.t * 1000), jenis: p.jenis, teks: p.teks }));
      case 'tetapan': { const t = {}; if (typeof input.amaran === 'boolean') t.amaran = input.amaran; if (typeof input.laporan === 'boolean') t.laporan = input.laporan; return await (await stub.fetch('https://pusat/tetapan', { method: 'POST', body: JSON.stringify(t) })).json(); }
      case 'penggunaan_workers': return await penggunaanWorkers(env);
      case 'baca_laman': return await bacaLaman(env, input.url);
      default: return { error: `alat ${nama} tidak wujud` };
    }
  } catch (e) { return { error: String(e && e.message || e).slice(0, 300) }; }
}

/* ---------- Arahan pantas (tanpa AI) ---------- */
export const BANTUAN = `Arahan pantas (tanpa token AI):
/stat - pelawat langsung, hari ini, 7 dan 30 hari
/token - penggunaan token AI setiap ciri dan anggaran kos
/sihat - semak laman dan semua pelayan sekarang
/pr - pull request terbuka   /actions - larian GitHub Actions
/issue - issue terbuka   /commit - commit terkini
/laporan - laporan harian penuh
/amaran on|off - amaran Telegram apabila pelayan rosak
/harian on|off - laporan harian jam 08:00
/lupa - padam ingatan sembang agen
Selain itu, tulis apa sahaja dalam bahasa biasa: agen AI akan memilih alat yang sesuai, termasuk membuka issue "arahan" supaya AI Agent harian membina ciri yang anda minta.`;

const senaraiKesihatan = s => s.map(k => `${k.ok ? '✅' : '🔴'} ${k.nama} · ${k.ms} ms${k.nota ? ' · ' + k.nota : ''}`).join('\n');
export async function teksStat(stub) {
  const p = await (await stub.fetch('https://pusat/papan')).json();
  const l = p.lamanKini.map(x => `${x.laman} ${x.n}`).join(', ');
  return `👥 Sedang melayari: ${p.kini}${l ? ` (${l})` : ''}\n` +
    `Hari ini: ${fmt(p.pelawat.hari.pelawat)} pelawat, ${fmt(p.pelawat.hari.paparan)} paparan, puncak ${p.pelawat.hari.puncak} serentak\n` +
    `7 hari: ${fmt(p.pelawat.minggu.pelawat)} pelawat · 30 hari: ${fmt(p.pelawat.bulan.pelawat)} pelawat\n` +
    (p.lamanHari.length ? `Popular 7 hari: ${p.lamanHari.slice(0, 5).map(x => `${x.laman} ${fmt(x.n)}`).join(', ')}\n` : '') +
    (p.negara.length ? `Negara 30 hari: ${p.negara.slice(0, 5).map(x => `${x.negara} ${fmt(x.n)}`).join(', ')}` : '');
}
export async function teksToken(stub) {
  const p = await (await stub.fetch('https://pusat/papan')).json();
  const t = p.token;
  const baris = x => `${fmt(x.masuk + x.keluar)} token (${fmt(x.masuk)} masuk, ${fmt(x.keluar)} keluar), ${fmt(x.panggilan)} panggilan${x.kos ? `, ~USD ${x.kos.toFixed(2)} (${rm(x.kos)})` : ''}`;
  return `🤖 Token AI\nHari ini: ${baris(t.hari)}\n7 hari: ${baris(t.minggu)}\n30 hari: ${baris(t.bulan)}\n` +
    (p.tokenPenyedia.length ? `\nPenyedia (30 hari):\n${p.tokenPenyedia.map(x => `• ${x.penyedia}: ${fmt(x.masuk + x.keluar)} token, ${fmt(x.panggilan)} panggilan${x.kos ? `, ~USD ${x.kos.toFixed(2)}` : ' (percuma)'}`).join('\n')}\n` : '') +
    (p.tokenLaluan.length ? `\nCiri (30 hari):\n${p.tokenLaluan.map(x => `• ${namaLaluan(x.laluan)}: ${fmt(x.masuk + x.keluar)} token, ${fmt(x.panggilan)} panggilan${x.gagal ? `, ${x.gagal} gagal` : ''}`).join('\n')}` : '\nBelum ada panggilan AI dicatat.');
}
export async function laporan(env, stub) {
  const [stat, token, sihat] = await Promise.all([teksStat(stub), teksToken(stub), semakKesihatan(env)]);
  await stub.fetch('https://pusat/kesihatan', { method: 'POST', body: JSON.stringify(sihat) });
  let pr = '';
  try { const s = await github(env, 'pr'); pr = `\n\n🔧 PR terbuka: ${s.length}${s.slice(0, 5).map(p => `\n• #${p.no} ${p.tajuk}`).join('')}`; } catch {}
  return `📊 Laporan Bijak Labur ${new Date(Date.now() + 8 * 36e5).toISOString().slice(0, 10)}\n\n${stat}\n\n${token}\n\n🩺 Kesihatan:\n${senaraiKesihatan(sihat)}${pr}`;
}
export async function arahanPantas(env, stub, teks) {
  const m = String(teks || '').trim().match(/^\/(\w+)(?:@\w+)?\s*(.*)$/s);
  if (!m) return null;
  const [, cmd, arg] = m;
  const onoff = arg => /^(on|hidup|buka)$/i.test(arg) ? true : /^(off|mati|tutup)$/i.test(arg) ? false : null;
  switch (cmd.toLowerCase()) {
    case 'start': case 'mula': case 'bantuan': case 'help': return `Salam, saya agen Pusat Kawalan Bijak Labur.\n\n${BANTUAN}`;
    case 'stat': case 'pelawat': return teksStat(stub);
    case 'token': return teksToken(stub);
    case 'sihat': { const s = await semakKesihatan(env); await stub.fetch('https://pusat/kesihatan', { method: 'POST', body: JSON.stringify(s) }); return `🩺 Kesihatan sekarang:\n${senaraiKesihatan(s)}`; }
    case 'pr': { const s = await github(env, 'pr'); return s.length ? `🔧 PR terbuka (${s.length}):\n${s.map(p => `• #${p.no} ${p.tajuk}${p.draf ? ' (draf)' : ''} · ${p.oleh} · ${p.dikemaskini}\n  ${p.url}`).join('\n')}` : 'Tiada PR terbuka.'; }
    case 'actions': { const s = await github(env, 'actions'); return `⚙️ GitHub Actions terkini:\n${s.map(w => `${w.status === 'success' ? '✅' : w.status === 'failure' ? '🔴' : '⏳'} ${w.nama} (${w.cawangan}) · ${w.bila}`).join('\n')}`; }
    case 'issue': case 'issues': { const s = await github(env, 'issues'); return s.length ? `📌 Issue terbuka (${s.length}):\n${s.map(i => `• #${i.no} ${i.tajuk}${i.label.length ? ` [${i.label.join(', ')}]` : ''} · ${i.bila}`).join('\n')}` : 'Tiada issue terbuka.'; }
    case 'commit': case 'commits': { const s = await github(env, 'commits'); return `📝 Commit terkini:\n${s.map(c => `• ${c.sha} ${c.mesej} · ${c.bila}`).join('\n')}`; }
    case 'laporan': return laporan(env, stub);
    case 'amaran': case 'harian': { const v = onoff(arg); if (v === null) return `Guna: /${cmd} on atau /${cmd} off`; const k = cmd === 'amaran' ? 'amaran' : 'laporan'; await stub.fetch('https://pusat/tetapan', { method: 'POST', body: JSON.stringify({ [k]: v }) }); return `${k === 'amaran' ? 'Amaran kesihatan' : 'Laporan harian 08:00'} ${v ? 'dihidupkan' : 'dimatikan'}.`; }
    case 'lupa': await stub.fetch('https://pusat/sembang', { method: 'DELETE' }); return 'Ingatan sembang dipadam.';
    default: return null;
  }
}

/* ---------- Agen AI ---------- */
export const penyediaAgen = env => env.ANTHROPIC_API_KEY ? 'claude' : env.GEMINI_API_KEY ? 'gemini' : '';
const SISTEM = () => `Anda ialah agen Pusat Kawalan Bijak Labur (bijaklabur.my), pembantu peribadi pemilik laman dan app itu (pelajar UiTM). Anda berbual melalui Telegram atau papan kawalan pemilik, dan hanya pemilik yang boleh bercakap dengan anda.
Tugas: menjawab soalan tentang pelawat langsung, penggunaan token AI dan kosnya, kesihatan pelayan, kerja di GitHub (PR, Actions, issue), dan melaksanakan arahan pemilik.
Peraturan:
- Gunakan alat untuk mendapatkan data sebenar; jangan reka angka. Jika alat memulangkan ralat, nyatakan ralat itu dan apa yang pemilik perlu lakukan (cth. tetapkan rahsia GitHub).
- Apabila pemilik mengarahkan perubahan kod, ciri, reka bentuk atau kandungan laman, gunakan alat buka_issue dengan tajuk ringkas dan badan yang menerangkan apa, di mana, dan kriteria siap, kemudian beritahu nombor dan pautan issue. AI Agent harian akan membinanya melalui PR dan pemilik merge.
- Jawab dalam Bahasa Melayu baku Malaysia (bukan Bahasa Indonesia), ringkas dan jelas, teks biasa tanpa Markdown (tiada *, #, atau \`), dengan baris baharu untuk senarai. Angka dengan pemisah ribu.
- Nilai kos dalam USD boleh dinyatakan juga dalam RM (anggaran kadar 4.3). Gemini, penghala percuma dan Workers AI berada dalam kuota percuma (RM0).
- Jangan dedahkan rahsia, token atau kunci. Jangan ubah tetapan selain melalui alat tetapan.
Tarikh dan waktu Malaysia sekarang: ${new Date(Date.now() + 8 * 36e5).toISOString().replace('T', ' ').slice(0, 16)}.`;

async function sejarah(stub) {
  const s = await (await stub.fetch('https://pusat/sembang')).json();
  return s.map(x => ({ role: x.peran === 'agen' ? 'assistant' : 'user', text: x.teks }));
}

async function denganClaude(env, stub, teks, lalu) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1 });
  const messages = [...lalu.map(m => ({ role: m.role, content: m.text })), { role: 'user', content: teks }];
  // Giliran mesti berselang pengguna/pembantu; cantumkan yang berturut
  const bersih = [];
  for (const m of messages) { const akhir = bersih[bersih.length - 1]; if (akhir && akhir.role === m.role) akhir.content += '\n' + m.content; else bersih.push({ ...m }); }
  if (bersih[0].role !== 'user') bersih.shift();
  const guna = { masuk: 0, keluar: 0, cache: 0 };
  let res, alatDiguna = [];
  for (let i = 0; i < 8; i++) {
    res = await client.beta.messages.create({
      model: env.AGEN_MODEL, max_tokens: 4000, system: SISTEM(), tools: alatClaude(), messages: bersih,
      thinking: { type: 'adaptive' }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default'
    });
    const u = res.usage || {};
    guna.masuk += u.input_tokens || 0; guna.keluar += u.output_tokens || 0; guna.cache += (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    bersih.push({ role: 'assistant', content: res.content });
    if (res.stop_reason !== 'tool_use') break;
    const hasil = [];
    for (const b of res.content.filter(b => b.type === 'tool_use')) {
      alatDiguna.push(b.name);
      hasil.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(await jalankanAlat(env, stub, b.name, b.input || {})).slice(0, 30000) });
    }
    bersih.push({ role: 'user', content: hasil });
  }
  const jawapan = (res.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  return { jawapan: jawapan || 'Selesai.', guna, model: res.model || env.AGEN_MODEL, alat: alatDiguna };
}

async function denganGemini(env, stub, teks, lalu) {
  const model = env.AGEN_GEMINI_MODEL || 'gemini-flash-latest';
  const contents = [...lalu.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })), { role: 'user', parts: [{ text: teks }] }];
  const guna = { masuk: 0, keluar: 0, cache: 0 };
  let alatDiguna = [], d;
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SISTEM() }] }, contents, tools: [alatGemini()], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } }),
      signal: AbortSignal.timeout(45000)
    });
    if (!r.ok) throw Object.assign(new Error(`Gemini ${r.status} ${(await r.text()).slice(0, 200)}`), { status: r.status });
    d = await r.json();
    const u = d.usageMetadata || {};
    guna.masuk += u.promptTokenCount || 0; guna.keluar += u.candidatesTokenCount || 0;
    const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    const panggilan = parts.filter(p => p.functionCall);
    if (!panggilan.length) break;
    contents.push({ role: 'model', parts });
    const balas = [];
    for (const p of panggilan) { alatDiguna.push(p.functionCall.name); balas.push({ functionResponse: { name: p.functionCall.name, response: { hasil: await jalankanAlat(env, stub, p.functionCall.name, p.functionCall.args || {}) } } }); }
    contents.push({ role: 'user', parts: balas });
  }
  const parts = (d && d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
  return { jawapan: parts.map(p => p.text || '').join('').trim() || 'Selesai.', guna, model, alat: alatDiguna };
}

/**
 * Jawab satu mesej pemilik. sumber = 'telegram' | 'papan'. Memulangkan { jawapan, penyedia, alat }.
 * Arahan pantas dijawab tanpa AI; teks bebas dihantar kepada Claude atau Gemini; tanpa kunci, bantuan dipaparkan.
 */
export async function jawab(env, stub, teks, sumber = 'telegram') {
  teks = String(teks || '').trim().slice(0, 4000);
  if (!teks) return { jawapan: BANTUAN, penyedia: '' };
  const pantas = await arahanPantas(env, stub, teks);
  if (pantas !== null) return { jawapan: pantas, penyedia: '' };
  const penyedia = penyediaAgen(env);
  if (!penyedia) return { jawapan: `Agen AI belum diaktifkan: tetapkan rahsia GitHub ANTHROPIC_API_KEY atau GEMINI_API_KEY untuk pelayan pusat.\n\n${BANTUAN}`, penyedia: '' };
  const lalu = await sejarah(stub);
  const t0 = Date.now();
  let hasil, ok = true;
  try { hasil = penyedia === 'claude' ? await denganClaude(env, stub, teks, lalu) : await denganGemini(env, stub, teks, lalu); }
  catch (e) {
    ok = false; console.log('agen gagal', String(e && e.message || e).slice(0, 300));
    hasil = { jawapan: `Maaf, agen AI tidak dapat menjawab sekarang (${e && e.status ? 'ralat ' + e.status : 'ralat rangkaian'}). Arahan pantas seperti /stat dan /sihat masih berfungsi.`, guna: { masuk: 0, keluar: 0, cache: 0 }, model: '', alat: [] };
  }
  await stub.fetch('https://pusat/sembang', { method: 'POST', body: JSON.stringify({ peran: 'pemilik', teks }) });
  await stub.fetch('https://pusat/sembang', { method: 'POST', body: JSON.stringify({ peran: 'agen', teks: hasil.jawapan }) });
  await stub.fetch('https://pusat/catat', { method: 'POST', body: JSON.stringify([{ laluan: '/agen', penyedia, model: hasil.model, masuk: hasil.guna.masuk, keluar: hasil.guna.keluar, cache: hasil.guna.cache, ms: Date.now() - t0, ok }]) });
  await stub.fetch('https://pusat/peristiwa', { method: 'POST', body: JSON.stringify({ jenis: sumber, teks: `${teks.slice(0, 120)}${hasil.alat && hasil.alat.length ? ` → alat: ${hasil.alat.join(', ')}` : ''}` }) });
  return { jawapan: hasil.jawapan, penyedia, alat: hasil.alat };
}
