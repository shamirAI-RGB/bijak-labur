/* Bijak Labur: kepala takwim di halaman utama (Takwim Siswa).
   Tarikh besar ikut waktu Malaysia, nombor edisi (hari ke-n dalam tahun), solat seterusnya
   dalam indeks "Dalam edisi ini", dan butang ke surat penuh pengasas. */
(function () {
  const hari = $('#tkHari');
  if (!hari) return;
  const TZ = 'Asia/Kuala_Lumpur';
  const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

  function paint() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' })
      .formatToParts(new Date()).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
    const y = +p.year, m = +p.month, d = +p.day;
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const ke = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5) + 1;
    hari.textContent = d;
    $('#tkBulan').textContent = HARI[dow];
    $('#tkEdisi').textContent = `Edisi ${ke} · ${y}`;
    // Hari Jumaat dicetak merah, seperti takwim dinding
    document.querySelector('.tk-date').classList.toggle('jumaat', dow === 5);
  }
  paint();
  // Kemas kini apabila tarikh bertukar semasa laman terbuka
  setInterval(paint, 60000);

  // Solat seterusnya dalam indeks (diisi oleh js/solat.js ke #homeNextName / #homeNextTime)
  const nama = $('#homeNextName'), masa = $('#homeNextTime'), out = $('#tkSolat');
  const solat = () => { const n = nama.textContent.trim(), t = masa.textContent.trim(); if (n && t && !/memuatkan|tiada/i.test(n)) out.textContent = `${n} ${t}`; };
  if (nama && masa && out) { new MutationObserver(solat).observe(nama, { childList: true, characterData: true, subtree: true }); solat(); }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-tk-scroll]');
    if (!b) return;
    const t = document.getElementById(b.dataset.tkScroll);
    if (t) { t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  });
})();
