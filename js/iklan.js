/* Bijak Labur: 4 ruang iklan di halaman utama (penaja dan rakan kerjasama).
   Iklan diurus oleh pemilik dalam Mod Pemilik (js/pemilik.js) dan disimpan di pelayan nota.
   Ruang kosong mempelawa pengiklan menghubungi pemilik melalui WhatsApp. Klik dikira oleh pelayan
   (pautan /iklan/:n/klik), tanpa penjejakan pengguna. */
(function () {
  const grid = $('#ikGrid');
  if (!grid) return;
  const API = (store.get('nota_api', '') || 'https://nota.bijaklabur.my').replace(/\/$/, '');
  const SLOTS = 4;
  let data = store.get('iklan_cache', null);

  const initials = s => String(s || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const waLink = (wa, n) => `https://wa.me/${encodeURIComponent(wa || '60102546720')}?text=${encodeURIComponent(`Salam, saya berminat untuk mengiklankan perniagaan saya di Bijak Labur (ruang iklan ${n}). Boleh kongsi pakej dan harga?`)}`;

  function card(ad, n, wa) {
    if (!ad) return `<a class="ik-card ik-empty" href="${esc(waLink(wa, n))}" target="_blank" rel="noopener">
        <span class="ik-num">Ruang ${n}</span>
        <b data-edit="utama.iklan.kosong.tajuk">Iklankan di sini</b>
        <span class="muted small" data-edit="utama.iklan.kosong.teks">Capai pelajar dan pelabur muda di seluruh Malaysia. Hubungi kami untuk pakej.</span>
        <span class="ik-cta">${icon('chat')}WhatsApp kami</span></a>`;
    const inner = `${ad.gambar ? `<img src="${esc(API + ad.gambar)}" alt="" loading="lazy" width="640" height="360">` : `<span class="ik-ph" aria-hidden="true">${esc(initials(ad.nama || ad.tajuk))}</span>`}
        <span class="ik-body"><span class="ik-tag">Iklan</span><b>${esc(ad.tajuk)}</b>${ad.teks ? `<span class="ik-teks">${esc(ad.teks)}</span>` : ''}${ad.nama ? `<small class="muted">${esc(ad.nama)}</small>` : ''}</span>`;
    return ad.url ? `<a class="ik-card" href="${esc(API + ad.url)}" target="_blank" rel="sponsored noopener" aria-label="Iklan: ${esc(ad.tajuk)}">${inner}</a>` : `<div class="ik-card">${inner}</div>`;
  }

  function render() {
    const slots = (data && data.slots) || Array(SLOTS).fill(null);
    grid.innerHTML = slots.slice(0, SLOTS).map((ad, i) => card(ad, i + 1, data && data.wa)).join('');
  }

  async function load() {
    try {
      const r = await fetch(API + '/iklan');
      if (!r.ok) throw new Error();
      data = await r.json(); store.set('iklan_cache', data); render();
    } catch {}
  }
  render(); load();
  document.addEventListener('viewchange', e => { if (e.detail === 'utama') load(); });
  window.Iklan = { reload: load };
})();
