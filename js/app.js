/* Bijak Labur: teras app (navigasi, tema, pemasangan PWA, utiliti) */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('bl_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('bl_' + k, JSON.stringify(v)); } catch {} }
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, ms = 2600) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
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

function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') { toast(title + ': ' + body, 5000); return; }
  const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' };
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(r => r.showNotification(title, opts)).catch(() => new Notification(title, opts));
  } else { try { new Notification(title, opts); } catch { toast(title + ': ' + body, 5000); } }
}
async function askNotify() {
  if (!('Notification' in window)) { toast('Pelayar ini tidak menyokong notifikasi. Di iPhone, pasang app ke Home Screen dahulu.'); return false; }
  const p = await Notification.requestPermission();
  if (p !== 'granted') toast('Kebenaran notifikasi ditolak.');
  return p === 'granted';
}

/* Tema */
(function theme() {
  const root = document.documentElement;
  const saved = store.get('theme', null);
  if (saved) root.dataset.theme = saved;
  $('#themeBtn').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    store.set('theme', root.dataset.theme);
    document.dispatchEvent(new CustomEvent('themechange'));
  });
})();
const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};

/* Navigasi berasaskan hash */
const VIEWS = ['utama', 'belajar', 'pasaran', 'solat', 'semak'];
function route() {
  const v = (location.hash || '#utama').slice(1);
  const name = VIEWS.includes(v) ? v : 'utama';
  $$('.view').forEach(el => el.classList.toggle('active', el.id === 'view-' + name));
  $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === name));
  document.dispatchEvent(new CustomEvent('viewchange', { detail: name }));
  window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);

/* Pemasangan PWA */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  $('#installBtn').classList.remove('hidden');
});
$('#installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null; $('#installBtn').classList.add('hidden');
});
if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) $('#installCard').classList.add('hidden');

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
