/* Bijak Labur: teras app (navigasi, tema, pemasangan, notifikasi, utiliti) */
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
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};
function paintThemeIcon() {
  $('#themeBtn use').setAttribute('href', isDark() ? '#i-sun' : '#i-moon');
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
const VIEWS = ['utama', 'belajar', 'pasaran', 'solat', 'semak', 'premium'];
let currentView = null;
function route() {
  const v = (location.hash || '#utama').slice(1);
  const name = VIEWS.includes(v) ? v : 'utama';
  if (name === currentView) return;
  currentView = name;
  $$('.view').forEach(el => el.classList.toggle('active', el.id === 'view-' + name));
  $$('[data-nav]').forEach(a => { const on = a.dataset.nav === name; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  window.scrollTo({ top: 0 });
  document.dispatchEvent(new CustomEvent('viewchange', { detail: name }));
}
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
window.addEventListener('scroll', () => $('.topbar').classList.toggle('scrolled', scrollY > 4), { passive: true });

/* Butang kembali Android: kembali ke Utama dahulu sebelum keluar */
const AppPlugin = plugin('App');
if (AppPlugin) AppPlugin.addListener('backButton', () => {
  if (window.ProTools && ProTools.back()) return;
  if (currentView && currentView !== 'utama') location.hash = '#utama'; else AppPlugin.exitApp();
});

/* Ucapan & tarikh pada halaman utama */
function greet() {
  const h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: 'numeric', hour12: false }).format(new Date());
  $('#greet').textContent = h < 12 ? 'Selamat pagi' : h < 14 ? 'Selamat tengah hari' : h < 19 ? 'Selamat petang' : 'Selamat malam';
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
$('#installClose').addEventListener('click', () => { $('#installCard').classList.add('hidden'); store.set('installHidden', true); });

if ('serviceWorker' in navigator && location.protocol === 'https:' && !Native) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
