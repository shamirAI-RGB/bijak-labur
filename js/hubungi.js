/* Butang WhatsApp terapung: pelawat memilih untuk berbual dengan Shamir atau Wabil */
(() => {
  // Nombor yang sama dipaparkan dalam video promosi dan halaman padam data
  const ORANG = [
    { id: 'shamir', nama: 'Shamir', penuh: 'Muhammad Yusshamir', no: '60102546720', papar: '010-254 6720', foto: 'images/pengasas/yusshamir' },
    { id: 'wabil', nama: 'Wabil', penuh: 'Wabil bin Adli Shidqie', no: '60176040937', papar: '017-604 0937', foto: 'images/pengasas/wabil' }
  ];
  const SALAM = 'Salam, saya ada pertanyaan tentang Bijak Labur.';
  const waUrl = (no, text) => `https://wa.me/${no}?text=${encodeURIComponent(text || SALAM)}`;
  // Logo WhatsApp (Simple Icons, CC0)
  const LOGO = '<svg class="wa-logo" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.59-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.41Z"/></svg>';

  window.Hubungi = { ORANG, waUrl, LOGO };

  const root = document.createElement('div');
  root.className = 'wa-fab';
  root.innerHTML = `
    <div class="wa-pop" id="waPop" role="dialog" aria-labelledby="waPopH" hidden>
      <p class="wa-pop-h" id="waPopH">Bual terus dengan kami</p>
      <p class="wa-pop-sub">Pilih siapa yang anda mahu hubungi di WhatsApp.</p>
      ${ORANG.map(o => `
      <a class="wa-person" href="${esc(waUrl(o.no))}" target="_blank" rel="noopener" data-wa="${o.id}">
        <picture><source srcset="${o.foto}.webp" type="image/webp"><img src="${o.foto}.jpg" alt="" width="44" height="44" loading="lazy" decoding="async"></picture>
        <span class="wa-person-t"><b>${esc(o.nama)}</b><small>${esc(o.papar)}</small></span>
        ${icon('chev', 'ic wa-go')}
      </a>`).join('')}
      <a class="wa-alt" href="#soalan">${icon('mail')}<span>Lebih suka e-mel? Tulis di Ruang soalan</span></a>
    </div>
    <button class="wa-btn" type="button" aria-expanded="false" aria-controls="waPop" aria-label="Hubungi kami di WhatsApp">
      ${LOGO}${icon('x', 'ic wa-x')}
    </button>`;
  document.body.appendChild(root);

  const btn = root.querySelector('.wa-btn'), pop = root.querySelector('.wa-pop');
  function open() {
    pop.hidden = false; root.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Tutup pilihan WhatsApp');
    pop.querySelector('.wa-person').focus({ preventScroll: true });
  }
  function close(refocus) {
    if (pop.hidden) return;
    pop.hidden = true; root.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Hubungi kami di WhatsApp');
    if (refocus) btn.focus();
  }
  btn.addEventListener('click', e => { e.stopPropagation(); pop.hidden ? open() : close(); });
  pop.addEventListener('click', e => { if (e.target.closest('a')) close(); });
  document.addEventListener('click', e => { if (!root.contains(e.target)) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); close(true); } });
  root.addEventListener('focusout', e => { if (e.relatedTarget && !root.contains(e.relatedTarget)) close(); });
  window.addEventListener('hashchange', () => close());
})();
