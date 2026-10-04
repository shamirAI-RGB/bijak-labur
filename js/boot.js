/* Bijak Labur: kerja awal sebelum skrip utama dimuatkan, supaya kandungan dilukis serta-merta
   (bukan selepas semua skrip selesai). Senarai halaman sama dengan VIEWS dalam app.js. */
(function () {
  var V = ['utama', 'belajar', 'pustaka', 'pasaran', 'solat', 'ibadah', 'semak', 'jadual', 'nota', 'sihat', 'studio', 'buku', 'kerja', 'jejak', 'premium', 'soalan'];
  var v = (location.hash || '#utama').slice(1).split('/')[0];
  document.documentElement.setAttribute('data-view', V.indexOf(v) >= 0 ? v : 'utama');

  // Ucapan ikut waktu Malaysia (juga digunakan oleh greet() dalam app.js)
  window.greetText = function () {
    var h = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: 'numeric', hour12: false }).format(new Date());
    var nama = '';
    try { nama = JSON.parse(localStorage.getItem('bl_nama') || '""') || ''; } catch (e) {}
    return (h < 12 ? 'Selamat pagi' : h < 14 ? 'Selamat tengah hari' : h < 19 ? 'Selamat petang' : 'Selamat malam') + (nama ? ', ' + nama : '');
  };
  // Sebaik HTML selesai dibaca dan sebelum skrip "defer" berjalan
  document.addEventListener('readystatechange', function () {
    var el = document.getElementById('greet');
    if (document.readyState === 'interactive' && el) el.textContent = window.greetText();
  });
})();
