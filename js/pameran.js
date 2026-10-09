/* Bijak Labur: pameran gaya agensi di halaman utama (rujukan video "Web Design: Before / After").
   1. Pada pentas: jenama gergasi lut sinar terpotong di tepi bawah, kad petikan dengan gambar kecil
      ciri seterusnya dan anak panah, serta ikon hubungan di kiri bawah.
   2. Jalur putih selepas pentas: bab "01" dengan tajuk besar dan butang pil, karusel kad gelap bergambar
      (Belajar, Pasaran, Solat, Jadual) dengan anak panah, kenyataan besar bercampur tebal dan kelabu,
      panel taklimat suara, dan kad testimoni pengasas.
   Tiada h2, .card atau .page-head supaya kunci teks Mod Pemilik tidak beralih. */
(function () {
  const home = $('#view-utama'), stage = window.Sinema && Sinema.stage;
  if (!home || !stage) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Pentas: jenama gergasi, ikon hubungan, kad petikan ---------- */
  const tanda = document.createElement('div');
  tanda.className = 'xb-mark'; tanda.setAttribute('aria-hidden', 'true'); tanda.textContent = 'Bijak Labur';
  stage.appendChild(tanda);

  const orang = window.Hubungi && Hubungi.ORANG && Hubungi.ORANG[0];
  const sosial = document.createElement('div');
  sosial.className = 'xb-sosial'; sosial.setAttribute('aria-label', 'Hubungi kami');
  sosial.innerHTML = `
    ${orang ? `<a href="${esc(Hubungi.waUrl(orang.no))}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(orang.nama)}" title="WhatsApp">${Hubungi.LOGO}</a>` : ''}
    <a href="mailto:hello@bijaklabur.my" aria-label="Emel hello@bijaklabur.my" title="Emel">${icon('mail')}</a>
    <button type="button" data-xb-kongsi aria-label="Kongsi Bijak Labur" title="Kongsi">${icon('share')}</button>`;
  stage.appendChild(sosial);

  const petik = document.createElement('div');
  petik.className = 'xb-petik';
  petik.innerHTML = `
    <span class="xb-petik-img" aria-hidden="true"></span>
    <p class="xb-petik-t">Kami bina alat yang kami sendiri guna setiap hari, bukan sekadar laman.</p>
    <span class="xb-petik-nav"><button type="button" data-xb-prev aria-label="Ciri sebelumnya">${icon('chev')}</button><button type="button" data-xb-next aria-label="Ciri seterusnya">${icon('chev')}</button></span>`;
  stage.appendChild(petik);
  const senarai = Sinema.ciri;
  const langkah = d => { const i = senarai.indexOf(Sinema.semasa()); Sinema.pilih(senarai[(i + d + senarai.length) % senarai.length]); };
  const gambarSeterusnya = () => {
    const i = senarai.indexOf(Sinema.semasa()), id = senarai[(i + 1) % senarai.length];
    $('.xb-petik-img', petik).style.backgroundImage = `url("images/jelajah/${id}.svg")`;
  };
  stage.addEventListener('click', e => {
    if (e.target.closest('[data-xb-prev]')) langkah(-1);
    else if (e.target.closest('[data-xb-next]')) langkah(1);
    else if (e.target.closest('[data-xb-kongsi]')) kongsi();
  });
  new MutationObserver(gambarSeterusnya).observe(stage, { attributes: true, attributeFilter: ['data-ciri'] });
  gambarSeterusnya();
  async function kongsi() {
    const data = { title: 'Bijak Labur', text: 'Belajar melabur, waktu solat dan alat pelajar dalam satu app percuma.', url: 'https://bijaklabur.my/' };
    try { if (navigator.share) { await navigator.share(data); return; } } catch { return; }
    try { await navigator.clipboard.writeText(data.url); toast('Pautan disalin'); } catch { toast('bijaklabur.my'); }
  }

  /* ---------- Jalur putih selepas pentas ---------- */
  const KAD = [
    { id: 'belajar', e: 'Belajar · 4 tahap', t: 'Belajar Melabur', s: 'Asas hingga mahir', d: 'Modul saham dan kripto dengan kuiz dan contoh sebenar dari Bursa dan pasaran AS.', h: '#belajar' },
    { id: 'pasaran', e: 'Pasaran · langsung', t: 'Pasaran', s: 'Setiap saat', d: 'Harga kripto dan saham, setiap satu dengan status Syariah dan sebabnya.', h: '#pasaran' },
    { id: 'solat', e: 'Solat · JAKIM', t: 'Waktu Solat', s: 'Seluruh Malaysia', d: 'Waktu rasmi ikut zon, azan, arah kiblat, dan boleh dibaca luar talian.', h: '#solat' },
    { id: 'jadual', e: 'Jadual · UiTM', t: 'Jadual Kelas', s: 'Skrin kunci', d: 'Jadual kuliah dalam paparan hari dan minggu, siap dijadikan wallpaper.', h: '#jadual' }
  ];
  const sec = document.createElement('section');
  sec.className = 'xb'; sec.setAttribute('aria-label', 'Tentang Bijak Labur');
  sec.innerHTML = `
    <div class="xb-bab">
      <div class="xb-kiri">
        <span class="xb-no">01</span>
        <p class="xb-kecil">Kami cipta tempat belajar melabur yang jujur: tanpa janji untung, dengan panduan syariah, dan data pasaran yang anda boleh semak sendiri.</p>
        <p class="xb-eyebrow">Mula di sini</p>
        <p class="xb-h" role="heading" aria-level="2">Melabur dengan bijak dari hari pertama</p>
        <a class="xb-pil xb-pil-gelap" href="#belajar">Mula hari ini ${icon('chev')}</a>
      </div>
      <div class="xb-kanan">
        <div class="xb-kad-track" tabindex="0" aria-label="Ciri utama">
          ${KAD.map(k => `<a class="xb-kad" href="${k.h}" data-ciri="${k.id}">
            <span class="xb-kad-e">${esc(k.e)}</span><span class="xb-kad-t">${esc(k.t)}</span>
            <span class="xb-kad-s">${esc(k.s)}</span><span class="xb-kad-d">${esc(k.d)}</span>
            <span class="xb-pil xb-pil-kaca">Ketahui lagi ${icon('chev')}</span></a>`).join('')}
        </div>
        <div class="xb-arah"><button type="button" data-xb-kad="-1" aria-label="Kad sebelumnya">${icon('chev')}</button><button type="button" data-xb-kad="1" aria-label="Kad seterusnya">${icon('chev')}</button></div>
      </div>
    </div>
    <div class="xb-kata">
      <p class="xb-besar">Dibina oleh <b>dua pelajar IC220 UiTM</b> yang pernah keliru tentang saham halal dan waktu solat, <b>untuk siswa seperti anda</b>: belajar, melabur dan beribadah dalam satu app yang jujur dan percuma.</p>
      <div class="xb-dua">
        <button type="button" class="xb-video" data-xb-taklimat>
          <span class="xb-play" aria-hidden="true">${icon('play')}</span>
          <span class="xb-video-t">Taklimat suara hari ini</span>
          <span class="xb-video-s">Tarikh Hijri, solat seterusnya, kelas dan pasaran, dibacakan.</span>
        </button>
        <figure class="xb-saksi">
          <img src="images/pengasas/yusshamir.webp" alt="" width="48" height="60" loading="lazy" decoding="async">
          <figcaption><b>Yusshamir</b><span>Pengasas bersama · IC220 UiTM</span></figcaption>
          <blockquote>"Halal bukan sekadar makanan. Ia juga cara kita mencari rezeki, mengurus wang dan menjalani hari. Jadi kami himpunkan semuanya dalam satu app percuma."</blockquote>
          <a href="tentang.html" class="xb-saksi-link">Tentang kami ${icon('chev')}</a>
        </figure>
      </div>
    </div>`;
  home.insertBefore(sec, stage.nextSibling);

  const track = $('.xb-kad-track', sec);
  sec.addEventListener('click', e => {
    const b = e.target.closest('[data-xb-kad]');
    if (b) { const k = $('.xb-kad', track); track.scrollBy({ left: +b.dataset.xbKad * (k.offsetWidth + 14), behavior: reduce.matches ? 'auto' : 'smooth' }); return; }
    if (e.target.closest('[data-xb-taklimat]')) { if (window.MasaDepan) MasaDepan.taklimat(); else toast('Suara belum sedia.'); }
  });
  // Butang taklimat menyala semasa suara dibaca
  setInterval(() => { const v = $('.xb-video', sec); if (v) v.classList.toggle('on', !!(window.Suara && Suara.active)); }, 800);

  // Masuk perlahan apabila ditatal ke dalam pandangan
  if ('IntersectionObserver' in window && !reduce.matches) {
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('nampak'); io.unobserve(x.target); } }), { threshold: .18 });
    $$('.xb-kiri, .xb-kad, .xb-besar, .xb-video, .xb-saksi', sec).forEach(el => io.observe(el));
  } else $$('.xb-kiri, .xb-kad, .xb-besar, .xb-video, .xb-saksi', sec).forEach(el => el.classList.add('nampak'));
})();
