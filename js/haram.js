/* SiswaCap: bahagian "Pelaburan dan dagangan yang haram" di halaman utama.
   Setiap jenis disertakan dalil al-Quran, hadis, fatwa atau keputusan rasmi, dan akibatnya.
   Rujukan hadis dan fatwa diambil daripada FiqhData (sudah disemak). Teks ayat dan hadis TIDAK disimpan:
   ia dimuat terus daripada sumber apabila satu jenis dibuka, sama seperti halaman Fiqh.
   "isi" ayat di bawah ialah ringkasan maksud, bukan terjemahan; terjemahan Basmeih dimuat bersama teks Arab. */
(function () {
  const el = $('#hrSenarai');
  if (!el || !window.FiqhData) return;
  const D = FiqhData;
  const HAPI = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

  /* Ringkasan maksud ayat (rujuk teks dan terjemahan penuh yang dimuat) */
  const AYAT = {
    '2:275': 'Allah menghalalkan jual beli dan mengharamkan riba. Pemakan riba bangkit seperti orang yang dirasuk syaitan.',
    '2:276': 'Allah menghapuskan (keberkatan) riba dan menyuburkan sedekah.',
    '2:278': 'Bertakwalah kepada Allah dan tinggalkan baki riba jika kamu benar-benar beriman.',
    '2:279': 'Jika tidak meninggalkannya, terimalah perisytiharan perang daripada Allah dan Rasul-Nya. Jika bertaubat, modal asal tetap milik kamu.',
    '2:188': 'Jangan makan harta sesama kamu secara batil, dan jangan membawanya kepada hakim untuk memakan sebahagian harta orang lain secara dosa.',
    '4:29': 'Jangan makan harta sesama kamu secara batil, kecuali melalui perniagaan yang berlaku dengan saling reda.',
    '4:30': 'Sesiapa berbuat demikian secara melampaui batas dan zalim, Allah akan memasukkannya ke dalam neraka.',
    '5:2': 'Bertolong-tolonglah dalam kebaikan dan takwa, dan jangan bertolong-tolong dalam dosa dan permusuhan.',
    '5:90': 'Arak, judi, berhala dan menilik nasib adalah kotor daripada perbuatan syaitan. Jauhilah ia supaya kamu berjaya.',
    '5:91': 'Syaitan mahu menimbulkan permusuhan dan kebencian melalui arak dan judi, serta menghalang kamu daripada mengingati Allah dan solat.'
  };
  // Gred tetap bagi hadis sunan (Sahih al-Bukhari dan Sahih Muslim sahih dengan sendirinya)
  const GRED = { d3503: 'Sahih (al-Albani)', d3674: 'Sahih (al-Albani)' };

  /* Amaran dan undang-undang rasmi (bukan fatwa) */
  const RASMI = {
    scAmaran: { by: 'Suruhanjaya Sekuriti Malaysia', t: 'Senarai Amaran Pelabur (Investor Alert List)', petik: 'Senarai laman web, produk pelaburan, syarikat dan individu yang tidak dibenarkan. Pelabur yang melabur melalui pihak tidak dibenarkan tidak dilindungi oleh undang-undang sekuriti Malaysia.', url: 'https://www.sc.com.my/investor-empowerment/investor-alert-list' },
    bnmAmaran: { by: 'Bank Negara Malaysia', t: 'Senarai Amaran Pengguna Kewangan (Financial Consumer Alert List)', petik: 'Senarai syarikat dan skim yang tidak dilesenkan atau diluluskan di bawah undang-undang yang ditadbir oleh BNM, termasuk skim pelaburan haram.', url: 'https://www.bnm.gov.my/consumer-alert2' },
    cmsa: { by: 'Undang-undang Malaysia', t: 'Akta Pasaran Modal dan Perkhidmatan 2007', petik: 'Dagangan palsu, manipulasi harga pasaran dan dagangan orang dalam (insider trading) ialah kesalahan jenayah yang dikuatkuasakan oleh Suruhanjaya Sekuriti.' }
  };

  /* Senarai jenis pelaburan dan dagangan yang haram.
     d = disimpulkan: tiada fatwa Malaysia yang menyebutnya secara khusus, hukum diambil daripada dalil dan fatwa yang berkaitan. */
  const JENIS = [
    { k: 'riba', t: 'Simpanan dan pinjaman berfaedah (riba)', ar: 'الربا', eg: 'Faedah simpanan tetap konvensional, bon konvensional, pinjaman peribadi berfaedah',
      why: 'Riba ialah tambahan yang disyaratkan ke atas pinjaman atau tukaran barang ribawi. Pengharamannya qat\'i dalam al-Quran dan disepakati ulama. Ia bukan sahaja ke atas pemakan riba, malah pemberi, penulis dan saksinya.',
      q: ['2:275', '2:278', '2:279'], h: ['m1598', 'b2766'], f: [],
      akibat: [['Perang daripada Allah dan Rasul-Nya bagi yang tidak berhenti', '2:279'], ['Keberkatan harta dihapuskan', '2:276'], ['Dilaknat, bersama pemberi, penulis dan saksinya', 'Muslim 1598'], ['Salah satu daripada tujuh dosa yang membinasakan', 'Bukhari 2766']],
      fiqh: 'riba' },
    { k: 'leverage', t: 'Leverage dan akaun margin berfaedah', ar: 'القرض بفائدة', eg: 'Margin konvensional broker, leverage 1:100, pinjaman untuk membeli saham dengan faedah',
      why: 'Leverage dan margin konvensional ialah pinjaman berfaedah daripada broker supaya anda boleh membeli lebih banyak aset. Faedah itu riba. Muzakarah Fatwa Kebangsaan kali ke-98 juga menyebut hutang yang disyaratkan bersama jual beli melalui leverage sebagai salah satu sebab forex runcit haram.',
      q: ['2:275', '2:278'], h: ['m1598'], f: ['mkiForex'],
      akibat: [['Dosa riba yang sama seperti di atas', '2:279'], ['Margin call boleh menghapuskan seluruh modal dalam sekelip mata', 'Risiko dunia']],
      fiqh: 'leverage' },
    { k: 'forex', t: 'Forex runcit secara individu', ar: 'الفوركس', eg: 'Dagangan EUR/USD, XAU/USD di MetaTrader dengan broker dalam talian',
      why: 'Muzakarah Fatwa Kebangsaan kali ke-98 (2012) memutuskan forex oleh individu secara lani melalui platform elektronik adalah haram. Sebabnya: riba melalui rollover interest, hutang bersyarat jual beli melalui leverage, qabd yang tidak jelas, menjual mata wang yang tiada dalam pegangan dan spekulasi yang melibatkan perjudian. Tukar wang sebenar secara tunai untuk keperluan kekal harus.',
      q: ['2:275', '5:90'], h: ['m1587', 'd3503'], f: ['mkiForex', 'scAmaran'],
      akibat: [['Terlibat dengan riba dan judi sekali gus', '2:275, 5:90'], ['Broker luar negara yang tidak berlesen tiada perlindungan undang-undang sekuriti Malaysia', 'SC']],
      fiqh: 'forex' },
    { k: 'cfd', t: 'CFD (Contract for Difference)', ar: 'عقود الفروقات', eg: 'CFD saham AS, NAS100, US500, CFD emas dan minyak', d: true,
      why: 'Dalam CFD, aset tidak pernah dimiliki. Yang didagang hanya beza harga dengan broker, menggunakan leverage dan caj swap semalaman. Unsur ini sama dengan sebab forex runcit diharamkan: riba, hutang bersyarat jual beli, tiada qabd, menjual yang tiada dalam milik dan spekulasi.',
      q: ['2:275', '5:90'], h: ['d3503', 'm1513'], f: ['mkiForex'],
      akibat: [['Riba melalui caj swap dan pembiayaan leverage', '2:279'], ['Akad batal kerana menjual sesuatu yang tidak dimiliki', 'Abu Dawud 3503']],
      fiqh: 'cfd' },
    { k: 'opsyen', t: 'Opsyen dan opsyen binari', ar: 'الخيارات', eg: 'Opsyen call dan put, opsyen binari "naik atau turun dalam 60 saat"',
      why: 'Akademi Fiqh Islam Antarabangsa (Resolusi 63) memutuskan kontrak opsyen tidak harus kerana yang dijual bukan harta, manfaat atau hak kewangan yang sah, maka dagangannya juga tidak harus. Opsyen binari pula hanyalah meneka arah harga untuk menang atau hilang wang pertaruhan, iaitu judi.',
      nota: 'Tiada fatwa Malaysia yang menyebut opsyen binari secara khusus ditemui. Hukumnya disimpulkan daripada larangan judi dan Resolusi IIFA di atas.',
      q: ['5:90', '5:91'], h: ['m1513'], f: ['iifa63'],
      akibat: [['Perbuatan kotor daripada syaitan', '5:90'], ['Menimbulkan permusuhan dan melalaikan daripada solat', '5:91']],
      fiqh: 'opsyen' },
    { k: 'jual-kosong', t: 'Jual kosong (short selling) konvensional', ar: 'البيع على المكشوف', eg: 'Menjual saham pinjaman dengan harapan harga jatuh, lalu membelinya semula',
      why: 'Nabi SAW melarang menjual sesuatu yang tiada dalam milik penjual. Akademi Fiqh Islam Antarabangsa (Resolusi 63) juga memutuskan tidak harus menjual saham yang tidak dimiliki penjual. Jual kosong konvensional lazimnya melibatkan pinjaman saham dengan bayaran dan faedah margin.',
      q: ['4:29'], h: ['d3503'], f: ['iifa63'],
      akibat: [['Akad tidak sah kerana menjual yang bukan milik', 'Abu Dawud 3503'], ['Kerugian tanpa had jika harga naik', 'Risiko dunia']],
      fiqh: 'milik' },
    { k: 'emas', t: 'Emas tanpa serah terima segera', ar: 'الذهب بلا تقابض', eg: 'Beli emas secara ansuran atau hutang, akaun emas tanpa emas sebenar, XAU/USD',
      why: 'Emas ialah barang ribawi. Muzakarah Fatwa Kebangsaan kali ke-96 menetapkan jual beli emas mesti serta-merta tanpa tangguh, tidak secara hutang atau ansuran, emas wujud dan dimiliki penjual, dan serah terima berlaku sebelum berpisah. Emas fizikal yang memenuhi syarat ini kekal harus.',
      q: ['2:275'], h: ['m1587'], f: ['mkiEmas'],
      akibat: [['Jatuh ke dalam riba al-nasi\'ah (riba kerana tangguh)', 'Muslim 1587'], ['Dosa riba', '2:279']],
      fiqh: 'emas' },
    { k: 'judi', t: 'Judi dan pertaruhan berwajah pelaburan', ar: 'الميسر', eg: 'Loteri, taruhan sukan, cabutan bertuah berbayar, platform meneka harga untuk hadiah',
      why: 'Judi berlaku apabila wang dipertaruhkan atas sesuatu yang bergantung kepada nasib, dan satu pihak untung atas kerugian pihak lain. Ia tetap judi walaupun dinamakan "pelaburan", "trading" atau "game".',
      q: ['5:90', '5:91'], h: [], f: [],
      akibat: [['Kotor, daripada perbuatan syaitan', '5:90'], ['Permusuhan, kebencian dan lalai daripada solat', '5:91']],
      fiqh: 'judi' },
    { k: 'saham', t: 'Saham syarikat tidak patuh Syariah', ar: 'أسهم غير متوافقة', eg: 'Saham bank konvensional, syarikat arak, judi, babi, tembakau dan hiburan tidak patuh',
      why: 'Membeli saham bermakna memiliki sebahagian syarikat dan perniagaannya. Majlis Penasihat Syariah SC menyaring saham Bursa dua kali setahun: aktiviti tidak patuh mesti di bawah 5% atau 20%, dan tunai konvensional serta hutang berfaedah masing-masing bawah 33% jumlah aset.',
      q: ['5:2'], h: ['d3674'], f: ['scSaringan', 'scSenarai'],
      akibat: [['Bersekongkol dalam dosa dan permusuhan', '5:2'], ['Laknat turut meliputi penjual dan pembawa arak, bukan peminum sahaja', 'Abu Dawud 3674']],
      fiqh: 'saham-syariah', baik: 'Pilih saham dalam senarai patuh Syariah SC' },
    { k: 'ponzi', t: 'Skim cepat kaya, Ponzi dan piramid', ar: 'أكل المال بالباطل', eg: 'Pulangan tetap 10% sebulan, "jemput 3 orang dapat bonus", robot trading dijamin untung', d: true,
      why: 'Skim ini membayar "keuntungan" pelabur lama menggunakan wang pelabur baharu, bukan hasil perniagaan sebenar. Ia memakan harta orang lain secara batil dan penipuan, dan akhirnya runtuh apabila ahli baharu berkurang.',
      nota: 'Tiada fatwa Malaysia yang menyebut skim Ponzi secara khusus ditemui. Hukumnya jelas daripada larangan memakan harta secara batil; amaran rasmi SC dan BNM disenaraikan di bawah.',
      q: ['4:29', '4:30', '2:188'], h: [], f: ['scAmaran', 'bnmAmaran'],
      akibat: [['Ancaman neraka bagi yang memakan harta secara zalim', '4:30'], ['Skim tidak berlesen menyalahi undang-undang dan wang pelabur sukar dituntut semula', 'SC, BNM']],
      fiqh: '' },
    { k: 'manipulasi', t: 'Manipulasi pasaran dan maklumat dalaman', ar: 'النجش والتلاعب', eg: 'Goreng saham, pump and dump kripto, tawaran palsu, dagangan orang dalam',
      why: 'Menaikkan harga secara palsu supaya orang lain membeli, atau berdagang menggunakan maklumat dalaman yang belum diumumkan, ialah penipuan. Nabi SAW melarang najasy, iaitu menaikkan tawaran tanpa niat membeli untuk memperdaya pembeli lain.',
      q: ['2:188', '4:29'], h: ['b2142'], f: ['cmsa'],
      akibat: [['Memakan harta orang lain secara batil', '2:188'], ['Kesalahan jenayah di bawah Akta Pasaran Modal dan Perkhidmatan 2007', 'Undang-undang']],
      fiqh: '' }
  ];

  const ASAS = [
    ['Riba', 'الربا', 'Tambahan ke atas pinjaman'],
    ['Maisir', 'الميسر', 'Judi dan pertaruhan'],
    ['Gharar', 'الغرر', 'Ketidakpastian yang ketara'],
    ['Batil', 'الباطل', 'Penipuan dan aniaya']
  ];
  const HALAL = [
    ['Saham patuh Syariah', 'Harus', '#ibadah/fiqh/muamalat/saham-syariah'],
    ['Kripto di bursa aset digital berdaftar SC', 'Harus', '#ibadah/fiqh/muamalat/kripto'],
    ['Emas fizikal secara tunai', 'Harus bersyarat', '#ibadah/fiqh/muamalat/emas'],
    ['Niaga hadapan FCPO dan FKLI', 'Khilaf', '#ibadah/fiqh/muamalat/niaga-hadapan']
  ];

  const ext = (href, label) => /^https:\/\//.test(href || '') ? `<a class="link-btn" href="${esc(href)}" target="_blank" rel="noopener">${label}${icon('link')}</a>` : '';
  const hRef = h => `${D.KOLEKSI[h.c]} ${h.n.replace(/[a-z]$/, '')}`;
  const fatwa = k => D.F[k] || RASMI[k];

  function item(j, i) {
    const n = String(i + 1).padStart(2, '0');
    const q = j.q.map(r => `<div class="hr-src" data-hr-ayah="${r}"><div class="hr-src-top"><b>Surah ${esc(QuranSrc.nama(+r.split(':')[0]))} (${r})</b><span class="hr-links"><a class="link-btn" href="#ibadah/quran/${r.replace(':', '/')}">Buka</a></span></div><p class="hr-isi"><span>Maksud ringkas</span>${esc(AYAT[r] || '')}</p><div class="hr-live"></div></div>`).join('');
    const h = j.h.map(k => { const x = D.H[k]; return `<div class="hr-src" data-hr-hadis="${k}"><div class="hr-src-top"><b>${hRef(x)}</b>${ext(`https://sunnah.com/${x.c}:${x.n}`, 'sunnah.com')}</div><p class="small muted">Riwayat ${esc(x.by)}${GRED[k] ? ` · ${esc(GRED[k])}` : (x.c === 'bukhari' || x.c === 'muslim') ? ' · Sahih' : ''}</p><p class="hr-isi"><span>Isi ringkas</span>${esc(x.isi)}</p><div class="hr-live"></div></div>`; }).join('');
    const f = j.f.map(k => { const x = fatwa(k); return `<div class="hr-src"><b>${esc(x.t)}</b><p class="small muted">${esc(x.by)}</p><p class="hr-isi"><span>${RASMI[k] ? 'Kenyataan rasmi' : 'Ringkasan keputusan'}</span>${esc(x.petik)}</p>${ext(x.url, 'Baca dokumen asal')}</div>`; }).join('');
    const tag = j.d ? '<span class="hr-tag hr-tag-d">Haram (disimpulkan)</span>' : '<span class="hr-tag">Haram</span>';
    return `<li><details class="hr-item" data-hr="${j.k}">
      <summary><span class="hr-n num">${n}</span><span class="hr-tt"><b>${esc(j.t)}</b><small>${esc(j.eg)}</small></span><span class="hr-ar" lang="ar" dir="rtl">${j.ar}</span>${tag}${icon('chev-down', 'ic hr-chev')}</summary>
      <div class="hr-badan">
        <p class="hr-why">${esc(j.why)}</p>
        ${j.nota ? `<p class="note">${icon('alert')}<span>${esc(j.nota)}</span></p>` : ''}
        <div class="hr-dalil">
          ${q ? `<section class="hr-col" style="--c:#1f9d63"><h4>Al-Quran</h4>${q}</section>` : ''}
          ${h ? `<section class="hr-col" style="--c:#7b5cf0"><h4>Hadis</h4>${h}</section>` : ''}
          ${f ? `<section class="hr-col" style="--c:#1192d6"><h4>Fatwa dan keputusan rasmi</h4>${f}</section>` : ''}
        </div>
        <div class="hr-akibat"><h4>${icon('alert')}Akibat</h4><ul>${j.akibat.map(([t, r]) => `<li><span>${esc(t)}</span><small>${esc(r)}</small></li>`).join('')}</ul></div>
        ${j.fiqh ? `<a class="hr-lanjut" href="#ibadah/fiqh/muamalat/${j.fiqh}">Huraian penuh dengan kitab muktabar ${icon('chev')}</a>` : ''}
      </div></details></li>`;
  }

  el.innerHTML = JENIS.map(item).join('');
  const asas = $('#hrAsas');
  if (asas) asas.innerHTML = ASAS.map(([t, ar, s]) => `<li><span class="hr-asas-ar" lang="ar" dir="rtl">${ar}</span><b>${t}</b><small>${s}</small></li>`).join('');
  const halal = $('#hrHalal');
  if (halal) halal.innerHTML = HALAL.map(([t, s, href]) => `<li><a href="${href}"><span>${t}</span><small>${s}</small></a></li>`).join('');

  /* Muat teks ayat dan hadis apabila jenis dibuka */
  const cache = {};
  const getJSON = u => cache[u] || (cache[u] = fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(e => { delete cache[u]; throw e; }));
  const LUAR = '<p class="muted small">Teks tidak dapat dimuat tanpa internet. Buka pautan untuk teks penuh.</p>';
  function isi(d) {
    if (d.dataset.dimuat) return;
    d.dataset.dimuat = '1';
    $$('[data-hr-ayah]', d).forEach(async n => {
      const ref = n.dataset.hrAyah, box = $('.hr-live', n);
      try {
        const a = await QuranSrc.ayah(ref);
        $('.hr-src-top b', n).textContent = `Surah ${a.surah} (${a.s}:${a.a})`;
        box.innerHTML = `<p class="ar hr-arab" lang="ar" dir="rtl">${esc(a.ar)}</p><p class="hr-tr">${esc(a.ms)}</p><p class="hr-sumber">Tafsir Pimpinan Ar-Rahman</p>`;
      } catch { box.innerHTML = LUAR; }
    });
    $$('[data-hr-hadis]', d).forEach(async n => {
      const h = D.H[n.dataset.hrHadis], box = $('.hr-live', n);
      try {
        const [ar, en] = await Promise.all([`ara-${h.c}`, `eng-${h.c}`].map(ed => getJSON(`${HAPI}/${ed}/${h.i}.json`)));
        box.innerHTML = `<p class="ar hr-arab hr-hadis" lang="ar" dir="rtl">${esc(ar.hadiths[0].text)}</p><p class="hr-tr" lang="en">${esc(en.hadiths[0].text)}</p>`;
      } catch { box.innerHTML = LUAR; }
    });
  }
  $$('.hr-item', el).forEach(d => d.addEventListener('toggle', () => { if (d.open) isi(d); }));
})();
