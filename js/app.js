/* SiswaCap: teras app (navigasi, tema, pemasangan, notifikasi, utiliti) */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('bl_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('bl_' + k, JSON.stringify(v)); } catch {} }
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls = 'ic') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

/* Dalam app asli (Capacitor) atau pelayar biasa */
const Native = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor : null;
const plugin = name => Native && Native.Plugins ? Native.Plugins[name] : null;
if (Native) document.documentElement.classList.add('native');

let toastTimer;
function toast(msg, ms = 2600) {
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), ms);
}

const scriptCache = {};
function loadScript(src) {
  if (!scriptCache[src]) scriptCache[src] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = res; s.onerror = () => { delete scriptCache[src]; rej(new Error('Gagal memuat ' + src)); };
    document.head.appendChild(s);
  });
  return scriptCache[src];
}

/* Baca teks daripada fail .pdf, .docx, .pptx atau teks biasa (dikongsi oleh Semak Kertas, Buku Nota dan Kerjaya) */
async function fileText(f) {
  const name = f.name.toLowerCase();
  if (name.endsWith('.docx')) {
    await loadScript('js/vendor/mammoth.min.js');
    const r = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() });
    return r.value.replace(/\n{3,}/g, '\n\n').trim();
  }
  if (name.endsWith('.pdf')) {
    await loadScript('js/vendor/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer(), isEvalSupported: false }).promise; const out = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const c = await (await pdf.getPage(i)).getTextContent();
      out.push(c.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join(''));
    }
    return out.join('\n\n').replace(/[ \t]+/g, ' ').trim();
  }
  if (name.endsWith('.pptx')) return pptxText(await f.arrayBuffer());
  return (await f.text()).trim();
}

/* Teks slaid PowerPoint (.pptx) tanpa pustaka: baca direktori pusat ZIP dan nyahmampat setiap slaid
   dengan DecompressionStream('deflate-raw') pelayar */
async function pptxText(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
  let e = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('Bukan fail PPTX');
  const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
  const slaid = [];
  for (let k = 0; k < n; k++) {
    const kaedah = v.getUint16(p + 10, true), saiz = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    const nama = dec.decode(u8.subarray(p + 46, p + 46 + nl));
    const m = nama.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (m) slaid.push({ no: +m[1], kaedah, saiz, off });
    p += 46 + nl + xl + cl;
  }
  slaid.sort((a, b) => a.no - b.no);
  const out = [];
  for (const s of slaid) {
    const mula = s.off + 30 + v.getUint16(s.off + 26, true) + v.getUint16(s.off + 28, true);
    const data = u8.subarray(mula, mula + s.saiz);
    const xml = s.kaedah === 0 ? dec.decode(data) : await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const perenggan = [...doc.getElementsByTagNameNS('*', 'p')].map(pp => [...pp.getElementsByTagNameNS('*', 't')].map(t => t.textContent).join('')).filter(t => t.trim());
    if (perenggan.length) out.push(`Slaid ${s.no}\n` + perenggan.join('\n'));
  }
  return out.join('\n\n').trim();
}

/* Notifikasi: plugin asli dalam app, Notification API dalam pelayar */
const Notify = {
  async request() {
    const LN = plugin('LocalNotifications');
    if (LN) { const r = await LN.requestPermissions(); return r.display === 'granted'; }
    if (!('Notification' in window)) { toast('Pelayar ini tidak menyokong notifikasi. Di iPhone, pasang ke Home Screen dahulu.', 4000); return false; }
    const p = await Notification.requestPermission();
    if (p !== 'granted') toast('Kebenaran notifikasi ditolak.');
    return p === 'granted';
  },
  granted() {
    if (plugin('LocalNotifications')) return true;
    return 'Notification' in window && Notification.permission === 'granted';
  },
  show(title, body) {
    const LN = plugin('LocalNotifications');
    if (LN) { LN.schedule({ notifications: [{ id: Math.floor(Math.random() * 1e9), title, body }] }).catch(() => toast(title)); return; }
    if (!this.granted()) { toast(`${title}. ${body}`, 5000); return; }
    const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(title, opts));
    else { try { new Notification(title, opts); } catch { toast(`${title}. ${body}`, 5000); } }
  }
};

/* Tema */
const isDark = () => {
  const t = document.documentElement.dataset.theme;
  // Rupa sinema: Auto memaparkan tema gelap (lihat css/sinema.css)
  return t ? t === 'dark' : true;
};
function paintThemeIcon() {
  // Suis Hitam/Putih di bar atas: aria-checked = gelap
  const tb = $('#themeBtn');
  tb.setAttribute('aria-checked', String(isDark()));
  tb.setAttribute('aria-label', isDark() ? 'Tema gelap (tekan untuk putih)' : 'Tema putih (tekan untuk gelap)');
  const SB = plugin('StatusBar');
  if (SB) SB.setStyle({ style: isDark() ? 'DARK' : 'LIGHT' }).catch(() => {});
}
(function theme() {
  const saved = store.get('theme', null);
  if (saved) document.documentElement.dataset.theme = saved;
  paintThemeIcon();
  $('#themeBtn').addEventListener('click', () => {
    document.documentElement.dataset.theme = isDark() ? 'light' : 'dark';
    store.set('theme', document.documentElement.dataset.theme);
    paintThemeIcon();
    document.dispatchEvent(new CustomEvent('themechange'));
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!document.documentElement.dataset.theme) { paintThemeIcon(); document.dispatchEvent(new CustomEvent('themechange')); }
  });
})();

/* Navigasi berasaskan hash */
const VIEWS = ['utama', 'belajar', 'pasaran', 'solat', 'ibadah', 'semak', 'jadual', 'nota', 'sihat', 'studio', 'buku', 'kerja', 'jejak', 'komuniti', 'premium', 'soalan', 'halal', 'alat'];
let currentView = null, currentHash = null;
function route() {
  // Hash boleh mempunyai sub-laluan, cth. #ibadah/quran/36
  const v = (location.hash || '#utama').slice(1).split('/')[0];
  const name = VIEWS.includes(v) ? v : 'utama';
  if (location.hash === currentHash && name === currentView) return;
  const tukarHalaman = name !== currentView && currentView !== null;
  currentView = name; currentHash = location.hash;
  const pasang = () => {
    document.documentElement.dataset.view = name;
    $$('.view').forEach(el => el.classList.toggle('active', el.id === 'view-' + name));
    $$('[data-nav]').forEach(a => { const on = a.dataset.nav === name; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    window.scrollTo({ top: 0 });
    document.dispatchEvent(new CustomEvent('viewchange', { detail: name }));
  };
  // Peralihan halus antara halaman (css/sinema.css) jika pelayar menyokong View Transitions
  // Navigasi pantas melangkau peralihan yang sedang berjalan ("Transition was skipped"): janji yang ditolak itu dijangka, bukan ralat
  if (tukarHalaman && document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const vt = document.startViewTransition(pasang);
    [vt.ready, vt.finished, vt.updateCallbackDone].forEach(p => p && p.catch(() => {}));
  } else pasang();
}
window.addEventListener('hashchange', route);
// Pautan langkau: fokus ke kandungan tanpa menukar hash (hash digunakan untuk navigasi)
document.addEventListener('click', e => { const a = e.target.closest('.skip-link'); if (a) { e.preventDefault(); $('#main').focus(); } });
window.addEventListener('DOMContentLoaded', route);
window.addEventListener('scroll', () => $('.topbar').classList.toggle('scrolled', scrollY > 4), { passive: true });

/* Butang kembali Android: kembali ke Utama dahulu sebelum keluar */
const AppPlugin = plugin('App');
if (AppPlugin) AppPlugin.addListener('backButton', () => {
  if (window.ProTools && ProTools.back()) return;
  if (location.hash.includes('/')) location.hash = '#' + location.hash.slice(1).split('/').slice(0, -1).join('/');
  else if (currentView && currentView !== 'utama') location.hash = '#utama'; else AppPlugin.exitApp();
});

/* Ucapan & tarikh pada halaman utama */
function greet() {
  // Teks dikira dalam js/boot.js; tukar hanya jika berbeza supaya tajuk tidak dilukis semula tanpa sebab
  const el = $('#greet'), t = greetText();
  if (el.textContent !== t) el.textContent = t;
}
greet(); setInterval(greet, 60000);

/* Kad pasang (pelayar sahaja) */
let deferredPrompt = null;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone || Native;
if (!standalone && !store.get('installHidden', false)) {
  $('#installCard').classList.remove('hidden');
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) $('#installHow').textContent = 'Tekan butang Kongsi di Safari, kemudian Add to Home Screen.';
  else if (/android/i.test(navigator.userAgent)) $('#installHow').textContent = 'Tekan menu ⋮ di Chrome, kemudian Install app.';
}
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  $('#installBtn').classList.remove('hidden');
});
$('#installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null; $('#installCard').classList.add('hidden');
});
// Digunakan oleh halaman lain (cth. Jadual) untuk menawarkan pemasangan ke skrin utama
window.installApp = async () => {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const r = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return r.outcome === 'accepted';
};
$('#installClose').addEventListener('click', () => { $('#installCard').classList.add('hidden'); store.set('installHidden', true); });

if ('serviceWorker' in navigator && location.protocol === 'https:' && !Native) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
