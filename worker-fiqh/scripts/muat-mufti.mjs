/*
 * Fatwa, irsyad dan soal jawab hukum daripada laman web rasmi Jabatan Mufti setiap negeri dan portal fatwa kebangsaan
 * (FiqhData.MUFTI), supaya Tanya AI boleh menjawab isu yang baru timbul dengan keputusan dan penjelasan terkini.
 *
 * Bagi setiap laman: robots.txt dihormati, kemudian halaman ditemui melalui peta laman (sitemap), API WordPress (jika ada)
 * dan pautan dari halaman utama serta halaman senarai. URL dan teks pautan yang berkaitan fatwa didahulukan.
 * Artikel disimpan sekali sahaja dalam .cache/mufti/<k>.json (actions/cache). Halaman utama, peta laman dan halaman senarai
 * dibuka semula pada setiap larian untuk mencari artikel baharu, dan baki giliran disambung pada larian seterusnya.
 * Laman yang tidak dapat dicapai dicatat dalam ringkasan larian dan dilangkau.
 * Hasil dibaca oleh muat-rujukan.mjs (indeks carian Tanya AI).
 */
import { mkdir, writeFile, readFile, appendFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import '../../js/fiqh-data.js';

const MUFTI = globalThis.FiqhData.MUFTI;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), CACHE = join(ROOT, '.cache', 'mufti');
const VERSI = 4;
const UA = 'Mozilla/5.0 (compatible; SiswaCap-Fatwa/1.0; +https://siswacap.my/tentang.html)';
const DEADLINE = Date.now() + (+process.env.MUFTI_MINIT || 20) * 60000;
const SEKATAN = +process.env.MUFTI_HAD || 0;          // had halaman bagi setiap laman dalam satu larian (0 = tiada had)
const PEKERJA = 1, JEDA = 1000, MAX_BAIT = 25e6, MAX_TEKS = 60000, MAX_TEKS_PDF = 400000, MAX_PDF = 300, MAX_GILIRAN = 40000;
const masa = () => Date.now() < DEADLINE;
const tidur = ms => new Promise(z => setTimeout(z, ms));
const summary = s => process.env.GITHUB_STEP_SUMMARY ? appendFile(process.env.GITHUB_STEP_SUMMARY, s + '\n') : null;

// URL, tajuk atau teks pautan yang berkaitan fatwa dan hukum didahulukan dan diikuti lebih jauh
export const KUNCI = /fatwa|irsyad|bayan|kafi|tashih|musykil|soal|jawab|tanya|hukum|keputusan|muzakarah|warta|fiq[h]?|feqah|ibadah|ibadat|muamalat|munakahat|zakat|halal|haram|faraid|akidah|aqidah|syariah|risalah|isu|soalan|penjelasan|pandangan|bayanat|ijtihad|e-?smaf|q-?a\b/i;
// Halaman korporat dan berita (bukan keputusan atau penjelasan hukum), dikenal pasti melalui URL atau tajuk
export const TOLAK = /dasar[- ]?(privasi|keselamatan|web)|penafian|hak[- ]?cipta|notis|data[- ]?terbuka|sejarah[- ](jabatan|penubuhan|bangunan|ringkas|institusi|pejabat)|visi|misi|objektif|piagam|carta|organisasi|struktur|perkhidmatan|hubungi|lokasi|profil|latar[- ]belakang|privacy|policy|disclaimer|copyright|contact[- ]us|about[- ]us|mufti[- ](negeri|kerajaan)[- ]|^\/?mufti$|pengurusan|bahagian[- ]|unit[- ]|kakitangan|direktori|navigation|soalan[- ]?lazim|\bfaq\b|tender|sebut[- ]?harga|jawatan|galeri|berita|pengumuman|aktiviti|program|lawatan|kursus|seminar|tauliah|takwim|pelan[- ]strategik|maklum[- ]?balas|aduan|peta[- ]laman|sitemap|mufti[- ](pertama|kedua|ketiga|keempat|kelima|keenam|ketujuh|kelapan)|senarai[- ]mufti|arkib[- ]berita|log[- ]?masuk/i;
// Istilah hukum: artikel mesti mengandungi beberapa istilah berbeza (halaman profil hanya menyebut "fatwa" sekali-sekala)
const ISTILAH = /\b(hukum|hukumnya|fatwa|haram|harus|wajib|sunat|sunnah|makruh|halal|sah|batal|dalil|al-?quran|hadis|hadith|ulama|mazhab|syarak|syariat|jawapan|soalan|wallahu|imam|firman|sabda|rasulullah|ijmak|qiyas|nas)\b/gi;
export const istilah = t => new Set((String(t).slice(0, 6000).match(ISTILAH) || []).map(x => x.toLowerCase())).size;
/** Artikel fatwa, irsyad atau soal jawab hukum (bukan halaman korporat, menu atau berita) */
export function artikelOk(url, tajuk, teks) {
  if (String(teks).length < 300) return false;
  let path = url;
  try { const u = new URL(url); path = decodeURIComponent(u.pathname + u.search); } catch {}
  tajuk = tanpaNamaLaman(String(tajuk));
  // Tajuk yang jelas tentang hukum (cth. "Hukum Menyertai Program ...") tidak ditolak walaupun URL di bawah "berita" atau "program"
  if ((TOLAK.test(path + ' ' + tajuk) && !/hukum|irsyad|soal[- ]jawab|bayan|kafi|musykil|keputusan|pandangan/i.test(tajuk))
    || /^(utama|laman utama|home|navigation|soalan lazim)$/i.test(tajuk.trim())) return false;
  // Halaman butiran di bawah laluan fatwa (cth. /fatwa/larangan-penggunaan-kalimah-allah): teks warta fatwa jarang memakai
  // istilah seperti "hukum" atau "dalil", jadi syaratnya lebih rendah
  const butiran = /\/(fatwa|irsyad|soal-?jawab|bayan|kafi|warta|musykil)[^/?]*\/[^/?]*\p{L}{3}[^/?]*-[^/?]*-[^/?]+\/?$/iu.test(path);
  return istilah(teks) >= (butiran ? 2 : KUNCI.test(path + ' ' + tajuk) ? 3 : 6);
}
// "Tajuk artikel | Jabatan Mufti Negeri X": buang nama laman di hujung atau di awal tajuk
const NAMA_LAMAN = /mufti|portal|laman web|jabatan|pejabat|muftins/i;
export const tanpaNamaLaman = t => {
  const b = String(t).split(/\s+[|–—-]\s+/);
  while (b.length > 1 && (NAMA_LAMAN.test(b[b.length - 1]) || tajukUmum(b[b.length - 1]))) b.pop();
  while (b.length > 1 && (NAMA_LAMAN.test(b[0]) || tajukUmum(b[0]))) b.shift();
  return b.join(' - ').trim();
};
// Tajuk umum (nama laman atau pautan "Lihat PDF") diganti dengan ayat pertama artikel atau nama fail
export const tajukUmum = (t, laman = '') => !t || t === laman || /^privacy policy$|^dasar privasi:?$/i.test(t.trim()) || !/\p{L}{3}/u.test(t) || /^(lihat|muat ?turun|download|klik|baca|papar|view|buka)\b|^pdf$|^(jabatan|pejabat) mufti|^portal|^laman web|^https?:|bank soalan|borang pertanyaan/i.test(t.trim());
// Nama fail (atau segmen URL terakhir yang bermakna, cth. .../buku-himpunan-fatwa/file), dengan huruf besar CamelCase dipisahkan
export const tajukFail = url => {
  const seg = String(url).split(/[?#]/)[0].split('/').map(x => { try { return decodeURIComponent(x); } catch { return x; } })
    // Segmen token (cth. JWT dalam pautan muat turun) bukan nama fail
    .filter(x => /\p{L}{3}/u.test(x) && !/^(file|download|view|index\.php|uploads)$/i.test(x)
      && !/^eyJ/.test(x) && !(x.length >= 24 && !/[-_ .]/.test(x.replace(/\.pdf$/i, '')) && /\d/.test(x) && /[A-Z]/.test(x) && /[a-z]/.test(x)));
  return (seg.pop() || '').replace(/\.pdf$/i, '').replace(/^\d+[-_]/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim();
};
// Baris pertama yang kelihatan seperti tajuk atau soalan (sekurang-kurangnya 4 perkataan), selain tajuk umum laman
// Soalan (baris yang berakhir dengan "?") didahulukan; label seperti "Kategori Subjek :" dilangkau
export const tajukTeks = (teks, umum = '') => {
  const baris = String(teks).split('\n').map(x => x.trim()).slice(0, 25)
    .filter(x => x.length >= 15 && x.length <= 300 && x.split(/\s+/).length >= 4 && x !== umum && !tajukUmum(x) && !/^(kategori|tarikh|oleh|sumber|penulis|dikemas ?kini|bilangan|no\.?)\b/i.test(x)
      // Salam dan pembuka jawapan (cth. "Waalaikumussalam ...", "وعليكم السلام ...") bukan tajuk
      && !/^(wa?['‘’]?\s?alaikum|waalaikum|assalamu|as-salamu|bismillah|alhamdulillah|segala puji|terima kasih)|^(وعليكم|السلام|بسم الله|الحمد لله)/i.test(x));
  let t = baris.find(x => x.endsWith('?')) || baris[0];
  // Tiada baris pendek: ayat pertama perenggan pertama (cth. soalan panjang dalam sistem soal jawab)
  if (!t) {
    const p = String(teks).split('\n').map(x => x.trim()).slice(0, 25).find(x => x.length > 300 && x !== umum && !/^(وعليكم|السلام|بسم الله)/.test(x)) || '';
    const ayat = p.match(/^.{20,200}?[?.!](?=\s|$)/);
    t = ayat ? ayat[0] : p.length ? p.slice(0, 140).replace(/\s+\S*$/, '') + '…' : '';
  }
  // "Assalamualaikum ustaz, saya ..." -> "Saya ..."
  t = t.replace(/^soalan\s*[:.-]\s*/i, '').replace(/^(as+alamu\s?['‘’]?\s?alaikum|salam sejahtera)[^,.!?]{0,40}[,.!]\s*/i, '');
  return (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 200);
};
export const ABAI = /galeri|gallery|tender|sebut-?harga|jawatan-kosong|kerjaya|career|piagam|carta|organisasi|kakitangan|direktori|staff|login|wp-admin|wp-login|\/feed\/?$|\/tag\/|\/author\/|[?&](print|tmpl|format|share|replytocom)=|mailto:|javascript:|whatsapp|facebook\.com|twitter\.com|\.(jpe?g|png|gif|webp|svg|ico|css|js|zip|rar|docx?|xlsx?|pptx?|mp3|mp4|avi|mov|apk)(\?|$)/i;

/* ---------- HTML ---------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', apos: "'", '#39': "'", rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', emsp: ' ', ensp: ' ', thinsp: ' ', raquo: '»', laquo: '«', middot: '·', bull: '•' };
export const entiti = s => s.replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m);
export const teksHtml = h => entiti(String(h || '').replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|blockquote|section|article)>/gi, '\n').replace(/<[^>]+>/g, ' '))
  .replace(/[ \t ]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n').trim();

// Elemen lengkap (termasuk elemen bersarang dengan nama yang sama) bermula pada indeks i
function elemen(html, i) {
  const nama = (html.slice(i).match(/^<([a-z0-9]+)/i) || [])[1];
  if (!nama) return '';
  const re = new RegExp(`<(/?)${nama}\\b[^>]*>`, 'gi');
  re.lastIndex = i;
  let aras = 0, m;
  while ((m = re.exec(html))) {
    if (m[1]) { if (--aras === 0) return html.slice(i, re.lastIndex); }
    else if (!m[0].endsWith('/>')) aras++;
  }
  return html.slice(i);
}

// Kandungan utama artikel: bekas yang lazim dalam WordPress, Joomla dan Drupal; jika tiada, <main> atau <body> tanpa menu
const BEKAS = [/<article\b/i, /itemprop=["']articleBody/i, /class=["'][^"']*\b(entry-content|post-content|article-content|item-page|itemFullText|com-content-article__body|field--name-body|single-content|td-post-content|elementor-widget-theme-post-content|post-body|news-content|content-area|isi-kandungan)\b/i, /<main\b/i];
export function kandungan(html) {
  const bersih = html.replace(/<(header|nav|footer|aside|form)\b[\s\S]*?<\/\1>/gi, ' ');
  for (const re of BEKAS) {
    const m = re.exec(bersih);
    if (!m) continue;
    // Padanan atribut: elemen bermula pada '<' tag yang mengandunginya
    const t = teksHtml(elemen(bersih, m[0][0] === '<' ? m.index : bersih.lastIndexOf('<', m.index)));
    if (t.length >= 300) return t;
  }
  const body = (bersih.match(/<body\b[\s\S]*<\/body>/i) || [bersih])[0];
  return teksHtml(body);
}

const meta = (html, nama) => {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${nama}["'][^>]*>`, 'i'));
  return m ? entiti((m[0].match(/content=["']([^"']*)["']/i) || [])[1] || '').trim() : '';
};
/* Calon tajuk halaman mengikut tertib: og:title, <title> tanpa nama laman, kemudian setiap <h1> */
export function calonTajuk(html) {
  const bersih = t => teksHtml(t).replace(/\s+/g, ' ').trim();
  const title = bersih((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  return [...new Set([tanpaNamaLaman(meta(html, 'og:title')), tanpaNamaLaman(title), ...[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => bersih(m[1])), title]
    .map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}
/** Tajuk halaman: calon pertama yang bukan tajuk umum (umum(t) = true bagi nama laman atau tajuk yang berulang pada banyak halaman) */
export function tajukHtml(html, umum = () => false) {
  const calon = calonTajuk(html);
  return (calon.find(t => !tajukUmum(t) && !umum(t)) || calon[0] || '').slice(0, 300);
}
const BULAN = { januari: 1, februari: 2, mac: 3, april: 4, mei: 5, jun: 6, julai: 7, ogos: 8, september: 9, oktober: 10, november: 11, disember: 12,
  january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, august: 8, october: 10, december: 12, jan: 1, feb: 2, apr: 4, jul: 7, ogo: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dis: 12, dec: 12 };
const iso = (y, m, d) => (y > 1990 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
export function tarikhHtml(html, teks = '') {
  const t = meta(html, 'article:published_time') || meta(html, 'datePublished') || (html.match(/"datePublished"\s*:\s*"([^"]+)"/) || [])[1]
    || (html.match(/<time[^>]+datetime=["']([^"']+)["']/i) || [])[1] || '';
  const m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  // Tarikh dalam teks, cth. "12 Januari 2024" atau "12/01/2024", dalam bahagian awal artikel
  const awal = teks.slice(0, 1500);
  const a = awal.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/);
  if (a && BULAN[a[2].toLowerCase()]) return iso(+a[3], BULAN[a[2].toLowerCase()], +a[1]);
  const b = awal.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
  return b ? iso(+b[3], +b[2], +b[1]) : '';
}

// Sesetengah laman meletakkan tarikh hari ini pada setiap halaman; tarikh itu bukan tarikh terbit artikel
const HARI_INI = new Date().toISOString().slice(0, 10);
const tarikhSah = t => t && t > '1990' && t < HARI_INI ? t : '';

export function pautanHtml(html, asas) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const u = new URL(entiti(m[2].trim()), asas);
      if (!/^https?:$/.test(u.protocol)) continue;
      u.hash = '';
      for (const p of [...u.searchParams.keys()]) if (/^utm_|^fbclid$/i.test(p)) u.searchParams.delete(p);
      out.push({ url: u.href, teks: teksHtml(m[3]).replace(/\s+/g, ' ').slice(0, 200) });
    } catch {}
  }
  return out;
}

/* ---------- robots.txt ---------- */
export function robots(txt) {
  const peraturan = [], sitemaps = [];
  let agen = [], dalam = false, jeda = 0;
  for (const baris of String(txt || '').split(/\r?\n/)) {
    const line = baris.replace(/#.*/, '').trim(), i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase(), v = line.slice(i + 1).trim();
    if (k === 'sitemap') sitemaps.push(v);
    else if (k === 'user-agent') { if (dalam) { agen = []; dalam = false; } agen.push(v.toLowerCase()); }
    else if (k === 'disallow' || k === 'allow') { dalam = true; if (agen.includes('*') && v) peraturan.push([k === 'allow', v]); }
    else if (k === 'crawl-delay') { dalam = true; if (agen.includes('*')) jeda = Math.max(jeda, +v || 0); }
  }
  const padan = (path, p) => new RegExp('^' + p.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\$(?!$)/g, '\\$')).test(path);
  return {
    sitemaps, jeda,
    boleh(url) {
      const u = new URL(url), path = u.pathname + u.search;
      let pilih = null;
      for (const [allow, p] of peraturan) if (padan(path, p) && (!pilih || p.length > pilih[1].length || (p.length === pilih[1].length && allow))) pilih = [allow, p];
      return !pilih || pilih[0];
    }
  };
}

/* ---------- rangkaian ---------- */
async function ambil(url) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.5', 'accept-language': 'ms,en;q=0.8' }, signal: AbortSignal.timeout(30000) });
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      if (r.status === 429 || r.status >= 500) { if (i) return { status: r.status, ct, url: r.url }; await tidur(5000); continue; }
      if (!r.ok) return { status: r.status, ct, url: r.url, server: r.headers.get('server') || '' };
      if (+r.headers.get('content-length') > MAX_BAIT) { r.body?.cancel(); return { status: 413, ct, url: r.url }; }
      const buf = Buffer.from(await r.arrayBuffer());
      return { status: 200, ct, url: r.url, buf, server: r.headers.get('server') || '' };
    } catch (e) {
      if (i) return { status: 0, error: (e.cause && (e.cause.code || e.cause.message)) || e.message };
      await tidur(3000);
    }
  }
  return { status: 0, error: 'gagal' };
}

// Teks setiap muka surat dipisahkan dengan \f, supaya Tanya AI boleh memaut ke muka surat yang dipetik (#page=N)
async function teksPdf(buf) {
  const task = getDocument({ data: new Uint8Array(buf), useSystemFonts: true, isEvalSupported: false, verbosity: 0 }), pdf = await task.promise;
  const out = [];
  for (let n = 1; n <= Math.min(pdf.numPages, MAX_PDF); n++) {
    const p = await pdf.getPage(n), tc = await p.getTextContent();
    out.push(tc.items.map(it => (it.str || '') + (it.hasEOL ? '\n' : ' ')).join('').replace(/[ \t]+/g, ' ').trim());
    p.cleanup();
  }
  await task.destroy();
  return out.map(t => t.replace(/\n{2,}/g, '\n')).join('\f');
}

/* ---------- satu laman ---------- */
async function muatCache(k) {
  try { const c = JSON.parse(await readFile(join(CACHE, `${k}.json`), 'utf8')); if (c.versi === VERSI) return c; } catch {}
  return { versi: VERSI, k, artikel: [], dilawat: {}, giliran: [], senarai: [] };
}
const simpan = c => mkdir(CACHE, { recursive: true }).then(() => writeFile(join(CACHE, `${c.k}.json`), JSON.stringify(c)));

async function laman(m) {
  const c = await muatCache(m.k), log = s => console.log(`[${m.k}] ${s}`);
  const lapor = { k: m.k, negeri: m.negeri, laman: '', status: '', baharu: 0, dibuka: 0, catatan: [] };
  // 1. Alamat yang berfungsi
  let utama = null;
  for (const u of m.laman) {
    const r = await ambil(u);
    log(`${u} -> ${r.status}${r.error ? ' ' + r.error : ''}${r.url && r.url !== u ? ' (' + r.url + ')' : ''}${r.server ? ' server ' + r.server : ''}`);
    if (r.status === 200 && /html/.test(r.ct)) { utama = { ...r, mula: u }; break; }
    lapor.catatan.push(`${new URL(u).host}: ${r.status ? 'HTTP ' + r.status : r.error}`);
  }
  if (!utama) { lapor.status = 'tidak dapat dicapai'; log('tidak dapat dicapai'); return lapor; }
  const asas = new URL(utama.url), hos = asas.hostname.replace(/^www\./, '');
  // Sistem fatwa atau soal jawab jabatan di hos lain (m.tambahan): hanya halaman di bawah folder alamat itu
  const tambahan = (m.tambahan || []).map(u => new URL(u)).map(u => ({ url: u, hos: u.hostname.replace(/^www\./, ''), folder: u.pathname.replace(/[^/]*$/, '') }));
  // e-SMAF: hanya hos e-smaf (portal JAKIM yang lain sangat besar dan bukan fatwa)
  const dalamLaman = u => {
    try {
      const x = new URL(u), h = x.hostname.replace(/^www\./, '');
      return h === hos || h.endsWith('.' + hos) || tambahan.some(t => h === t.hos && x.pathname.startsWith(t.folder));
    } catch { return false; }
  };
  lapor.laman = asas.origin;
  c.asas = asas.origin;
  const tajukLaman = tajukHtml(utama.buf.toString('utf8'));
  log(`tajuk: ${tajukLaman}`);

  // 2. robots.txt dan peta laman
  // robots.txt bagi setiap hos (laman utama dan hos tambahan)
  const aturan = new Map();
  for (const o of new Set([asas.origin, ...tambahan.map(t => t.url.origin)])) {
    const rb = await ambil(`${o}/robots.txt`);
    aturan.set(o, robots(rb.status === 200 && !/html/.test(rb.ct) ? rb.buf.toString('utf8') : ''));
    log(`robots.txt ${o}: ${rb.status}; sitemap: ${aturan.get(o).sitemaps.length}; crawl-delay ${aturan.get(o).jeda}`);
  }
  const peraturan = aturan.get(asas.origin);
  const boleh = u => { try { const a = aturan.get(new URL(u).origin); return a ? a.boleh(u) : peraturan.boleh(u); } catch { return false; } };
  const jeda = Math.min(10000, Math.max(JEDA, ...[...aturan.values()].map(a => a.jeda * 1000)));
  log(`jeda ${jeda} ms`);
  const dilawat = c.dilawat, sudah = new Set(c.artikel.map(a => a[0]));
  const giliran = [[], []];   // [keutamaan tinggi, biasa]
  const dalamGiliran = new Set();
  const tambah = (url, aras, teks = '', paksa = false) => {
    if (!dalamLaman(url) || ABAI.test(url) || dalamGiliran.has(url) || (!paksa && url in dilawat) || !boleh(url)) return;
    if (dalamGiliran.size > MAX_GILIRAN) return;
    dalamGiliran.add(url);
    giliran[KUNCI.test(url + ' ' + teks) ? 0 : 1].push([url, aras, teks]);
  };
  const sitemaps = [...new Set([...peraturan.sitemaps, `${asas.origin}/sitemap.xml`, `${asas.origin}/sitemap_index.xml`, `${asas.origin}/wp-sitemap.xml`])];
  let dariSitemap = 0;
  for (let i = 0; i < sitemaps.length && i < 60 && masa(); i++) {
    const r = await ambil(sitemaps[i]);
    await tidur(jeda);
    if (r.status !== 200) continue;
    const xml = r.buf.toString('utf8');
    if (!/<(urlset|sitemapindex)\b/i.test(xml)) continue;
    for (const [, loc] of xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/loc>/gi)) {
      const u = entiti(loc.trim());
      if (/<sitemapindex\b/i.test(xml)) { if (!sitemaps.includes(u)) sitemaps.push(u); }
      else { tambah(u, 1); dariSitemap++; }
    }
  }
  log(`peta laman: ${dariSitemap} URL`);

  // 3. API WordPress: kandungan artikel terus, tanpa membuka setiap halaman
  let dariWp = 0;
  const tambahWp = [];
  const jenis = await ambil(`${asas.origin}/wp-json/wp/v2/types`);
  if (jenis.status === 200 && /json/.test(jenis.ct)) {
    let types = {};
    try { types = JSON.parse(jenis.buf.toString('utf8')); } catch {}
    const bases = Object.values(types).map(t => t && t.rest_base).filter(b => b && !/^(attachment|media|wp_|nav_menu|menu-items|blocks|templates|template-parts|global-styles|font|navigation|e-floating|elementor|astra|staff|product|portfolio|project|direktori|senarai_mufti|gm_menu|falak)/.test(b));
    log(`WordPress: jenis kandungan ${bases.join(', ')}`);
    for (const b of bases) {
      for (let p = 1; p <= 200 && masa(); p++) {
        const r = await ambil(`${asas.origin}/wp-json/wp/v2/${b}?per_page=100&page=${p}&orderby=date&order=desc&_fields=link,title,date,content`);
        if (r.status !== 200 || !/json/.test(r.ct)) break;
        let list = [];
        try { list = JSON.parse(r.buf.toString('utf8')); } catch {}
        if (!Array.isArray(list) || !list.length) break;
        let lama = 0;
        for (const x of list) {
          const url = x.link, teks = teksHtml(x.content && x.content.rendered);
          let tajuk = teksHtml(x.title && x.title.rendered).slice(0, 300);
          if (!url || sudah.has(url) || url in dilawat) { lama++; continue; }
          dilawat[url] = 's';
          if (tajukUmum(tajuk)) tajuk = tajukTeks(teks);
          if (artikelOk(url, tajuk, teks)) {
            c.artikel.push([url, tajuk, tarikhSah(String(x.date || '').slice(0, 10)), teks.slice(0, MAX_TEKS)]); sudah.add(url); dilawat[url] = 'a'; dariWp++; lapor.baharu++;
          } else {
            // Bukan artikel, tetapi mungkin membenamkan PDF fatwa atau memaut ke artikel
            for (const l of pautanHtml(String(x.content && x.content.rendered || ''), url)) tambahWp.push([l.url, 2, l.teks]);
          }
        }
        // Senarai disusun dari yang terbaharu: berhenti apabila satu halaman penuh sudah ada dalam cache
        if (lama === list.length) break;
        await tidur(jeda);
      }
    }
    log(`WordPress: ${dariWp} artikel baharu`);
  }

  // 4. Carian luas: halaman utama, halaman senarai yang lalu, peta laman, kemudian baki giliran larian lepas
  tambah(asas.href, 0, '', true);
  for (const t of tambahan) tambah(t.url.href, 0, '', true);
  for (const [u, aras, teks] of tambahWp) tambah(u, aras, teks);
  for (const u of c.senarai.slice(-80)) tambah(u, 1, '', true);
  for (const [u, aras, teks] of c.giliran) tambah(u, aras, teks);
  const senarai = new Set(c.senarai);
  let dibuka = 0, berhenti = false;
  const ditolak = [], kerapTajuk = new Map();
  const umum = t => t === tajukLaman || (kerapTajuk.get(t) || 0) >= 3;
  let gagalBerturut = 0;
  const ambilSatu = () => giliran[0].shift() || giliran[1].shift();
  const pekerja = async () => {
    while (masa() && !berhenti && (!SEKATAN || dibuka < SEKATAN)) {
      const item = ambilSatu();
      if (!item) break;
      const [url, aras, teksPautan] = item;
      dalamGiliran.delete(url);
      if (sudah.has(url)) continue;
      dibuka++;
      const r = await ambil(url);
      await tidur(jeda);
      if (r.status !== 200) {
        dilawat[url] = r.status || 0;
        // Laman mula menyekat (403/429) atau tidak menjawab: berhenti untuk larian ini, jangan cuba mengelak sekatan
        if ([0, 403, 429, 503].includes(r.status) && ++gagalBerturut >= 5) {
          lapor.catatan.push(`dihentikan selepas ${gagalBerturut} permintaan gagal berturut-turut (${r.status ? 'HTTP ' + r.status : r.error})`);
          giliran[0].unshift([url, aras, teksPautan]); delete dilawat[url];
          berhenti = true;
        }
        continue;
      }
      gagalBerturut = 0;
      if (r.url && r.url !== url && !dalamLaman(r.url)) { dilawat[url] = 'x'; continue; }
      if (/pdf/.test(r.ct) || /\.pdf(\?|$)/i.test(url)) {
        dilawat[url] = 'x';
        if (!KUNCI.test(url + ' ' + teksPautan)) continue;
        try {
          const teks = await teksPdf(r.buf);
          // Teks pautan seperti "Popular Buku Irsyad Fatwa" (label senarai muat turun) tanpa label di hadapan
          const tajuk = (tajukUmum(teksPautan, tajukLaman) ? tajukFail(url) : teksPautan.replace(/^(popular|terkini|baharu|new|hot)\s+/i, '')).slice(0, 300);
          if (artikelOk(url, tajuk, teks)) {
            c.artikel.push([url, tajuk, tarikhSah(tarikhHtml('', teks)), teks.slice(0, MAX_TEKS_PDF)]); sudah.add(url); dilawat[url] = 'a'; lapor.baharu++;
          }
        } catch (e) { log(`PDF ${url}: ${e.message}`); }
        continue;
      }
      if (!/html/.test(r.ct)) { dilawat[url] = 'x'; continue; }
      const html = r.buf.toString('utf8'), teks = kandungan(html);
      for (const t of calonTajuk(html)) kerapTajuk.set(t, (kerapTajuk.get(t) || 0) + 1);
      let tajuk = tajukHtml(html, umum);
      if (tajukUmum(tajuk, tajukLaman) || umum(tajuk)) tajuk = tajukTeks(teks, tajuk) || tajuk;
      const links = pautanHtml(html, r.url || url).filter(l => dalamLaman(l.url));
      const teksPautanSemua = links.reduce((n, l) => n + l.teks.length, 0);
      const berkaitan = KUNCI.test(url + ' ' + tajuk + ' ' + teks.slice(0, 400));
      if (aras === 0) log(`halaman permulaan ${url}: ${links.length} pautan dalam laman${links.length < 5 ? `; contoh HTML: ${html.replace(/\s+/g, ' ').slice(0, 600)}` : ''}`);
      // Artikel: teks panjang yang bukan sekadar senarai pautan
      if (teks.length >= 600 && teksPautanSemua < teks.length * 0.5 && artikelOk(url, tajuk, teks)) {
        c.artikel.push([url, tajuk, tarikhSah(tarikhHtml(html, teks)), teks.slice(0, MAX_TEKS)]); sudah.add(url); dilawat[url] = 'a'; lapor.baharu++;
      } else {
        dilawat[url] = 's';
        if (berkaitan && ditolak.length < 40) ditolak.push(`${url} | ${tajuk.slice(0, 80)} | ${teks.length} aksara | ${istilah(teks)} istilah | ${links.length} pautan`);
        if (berkaitan && !senarai.has(url)) { senarai.add(url); c.senarai.push(url); }
      }
      // Pautan diikuti jika berkaitan fatwa, dekat dengan halaman utama, atau datang daripada halaman senarai fatwa
      // (tajuk artikel dalam senarai tidak semestinya mengandungi perkataan "fatwa" atau "hukum")
      for (const l of links) if (aras < 2 || KUNCI.test(l.url + ' ' + l.teks) || (berkaitan && aras < 4)) tambah(l.url, aras + 1, l.teks);
      if (dibuka % 100 === 0) { c.giliran = [...giliran[0], ...giliran[1]]; await simpan(c); log(`${dibuka} halaman dibuka, ${c.artikel.length} artikel, giliran ${giliran[0].length}+${giliran[1].length}`); }
    }
  };
  await Promise.all(Array.from({ length: PEKERJA }, pekerja));
  // Tajuk yang sama pada banyak artikel (cth. nama sistem soal jawab) bukan tajuk artikel: guna baris pertama teksnya
  const kira = new Map();
  for (const a of c.artikel) kira.set(a[1], (kira.get(a[1]) || 0) + 1);
  for (const a of c.artikel) if (kira.get(a[1]) >= 3) a[1] = tajukTeks(a[3].split('\f')[0], a[1]) || a[1];
  // Diagnosis: laman dengan sedikit artikel, senaraikan halaman berkaitan yang ditolak supaya penapis boleh diperbaiki
  if (c.artikel.length < 10 && ditolak.length) for (const d of ditolak.slice(0, 25)) log(`  ditolak: ${d}`);
  c.giliran = [...giliran[0], ...giliran[1]];
  c.dikemas = new Date().toISOString();
  await simpan(c);
  lapor.dibuka = dibuka;
  lapor.status = `${c.artikel.length} artikel`;
  lapor.giliran = c.giliran.length;
  log(`selesai: ${dibuka} halaman dibuka, ${lapor.baharu} artikel baharu, jumlah ${c.artikel.length}, baki giliran ${c.giliran.length}`);
  for (const a of c.artikel.slice(-3)) log(`  contoh: ${a[2] || '-'} | ${a[1].slice(0, 90)} | ${a[0]}`);
  return lapor;
}

async function utama() {
  const hasil = await Promise.all(MUFTI.map(m => laman(m).catch(e => ({ k: m.k, negeri: m.negeri, laman: '', status: 'ralat: ' + e.message, catatan: [] }))));
  await summary('### Laman Jabatan Mufti\n\n| Negeri | Laman | Status | Artikel baharu | Halaman dibuka | Baki giliran | Catatan |\n|---|---|---|---|---|---|---|');
  for (const h of hasil) await summary(`| ${h.negeri} | ${h.laman || '-'} | ${h.status} | ${h.baharu ?? '-'} | ${h.dibuka ?? '-'} | ${h.giliran ?? '-'} | ${(h.catatan || []).join('; ')} |`);
  console.log('\nRingkasan:');
  for (const h of hasil) console.log(`  ${h.negeri.padEnd(20)} ${(h.laman || '-').padEnd(40)} ${h.status} (baharu ${h.baharu ?? 0}, dibuka ${h.dibuka ?? 0}, giliran ${h.giliran ?? 0}) ${(h.catatan || []).join('; ')}`);
}

// Fungsi pembantu diimport oleh test.mjs; muat turun hanya apabila skrip dijalankan terus
if (process.argv[1] === fileURLToPath(import.meta.url)) await utama();
