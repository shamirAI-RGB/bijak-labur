/* Bijak Labur: denyut pelawat tanpa nama untuk Pusat Kawalan pemilik (pusat.bijaklabur.my).
   Dihantar setiap 30 saat semasa tab kelihatan dan setiap kali halaman bertukar. Tiada kuki, tiada IP disimpan:
   hanya id rawak tab ini (sessionStorage), nama halaman, dan jenis peranti. Pelawat yang memasang "Do Not Track" tidak dikira. */
(function () {
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  const API = (store.get('pusat_api', '') || 'https://pusat.bijaklabur.my').replace(/\/$/, '');
  let sid = '';
  try { sid = sessionStorage.getItem('bl_sid') || ''; if (!/^[\w-]{16,}$/.test(sid)) { sid = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join(''); sessionStorage.setItem('bl_sid', sid); } } catch { return; }
  let rujukan = '';
  try { const r = document.referrer && new URL(document.referrer); if (r && r.hostname !== location.hostname) rujukan = r.hostname; } catch {}
  const laman = () => (document.documentElement.dataset.view || (location.hash || '#utama').slice(1).split('/')[0] || 'utama').slice(0, 40);
  let terakhir = 0, timer = 0;
  function denyut(paksa) {
    if (document.visibilityState === 'hidden' && !paksa) return;
    const t = Date.now(); if (!paksa && t - terakhir < 25000) return; terakhir = t;
    const body = JSON.stringify({ sid, laman: laman(), rujukan });
    try { fetch(API + '/denyut', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true, credentials: 'omit' }).catch(() => {}); } catch {}
  }
  function jadual() { clearInterval(timer); if (document.visibilityState === 'visible') { denyut(); timer = setInterval(() => denyut(), 30000); } }
  document.addEventListener('visibilitychange', jadual);
  document.addEventListener('viewchange', () => denyut(true));
  window.addEventListener('DOMContentLoaded', jadual);
  if (document.readyState !== 'loading') jadual();
})();
