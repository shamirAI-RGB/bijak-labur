/* SiswaCap: data Fiqh. Setiap rujukan di sini telah disemak dengan sumber asal (3 Oktober 2026; kitab tambahan 6 Oktober 2026).
   Teks ayat dan hadis TIDAK disimpan di sini: ia dimuat terus daripada sumber semasa dibuka supaya tidak berlaku salah petik.
   Jangan tambah rujukan yang belum dibuka dan disemak sendiri. */
const FiqhData = (() => {
  /* Kitab muktabar mazhab Syafie di Al-Maktabah al-Shamela */
  const KITAB = {
    abisyuja: { name: 'Matan Abi Syuja\' (al-Ghayah wa al-Taqrib)', ar: 'متن أبي شجاع', by: 'Abu Syuja\' al-Asfahani (w. 593H)', id: 11370, lvl: 'Asas' },
    fathqarib: { name: 'Fath al-Qarib al-Mujib', ar: 'فتح القريب المجيب', by: 'Ibn Qasim al-Ghazzi (w. 918H)', id: 35120, lvl: 'Pertengahan' },
    minhaj: { name: 'Minhaj al-Talibin', ar: 'منهاج الطالبين', by: 'Imam al-Nawawi (w. 676H)', id: 12096, lvl: 'Lanjutan' },
    manhaji: { name: 'Al-Fiqh al-Manhaji', ar: 'الفقه المنهجي', by: 'Dr. Mustafa al-Khin, Dr. Mustafa al-Bugha, Ali al-Syarbaji', id: 6369, lvl: 'Moden' },
    // Tambahan 6 Oktober 2026: ID Shamela disemak dengan tajuk halaman kitab; muat-rujukan.mjs juga menolak ID yang tajuknya tidak sepadan
    kifayah: { name: 'Kifayah al-Akhyar fi Hall Ghayah al-Ikhtisar', ar: 'كفاية الأخيار في حل غاية الاختصار', by: 'Taqiyuddin al-Hisni (w. 829H)', id: 6140, lvl: 'Pertengahan' },
    asybah: { name: 'Al-Asybah wa al-Naza\'ir', ar: 'الأشباه والنظائر', by: 'Jalaluddin al-Suyuti (w. 911H)', id: 21719, lvl: 'Kaedah fiqh' },
    bulugh: { name: 'Bulugh al-Maram min Adillah al-Ahkam', ar: 'بلوغ المرام من أدلة الأحكام', by: 'Ibn Hajar al-Asqalani (w. 852H)', id: 9111, lvl: 'Hadis hukum' },
    bidayah: { name: 'Bidayah al-Mujtahid wa Nihayah al-Muqtasid', ar: 'بداية المجتهد ونهاية المقتصد', by: 'Ibn Rusyd al-Hafid (w. 595H)', id: 21739, lvl: 'Perbandingan', banding: true },
    ianah: { name: 'I\'anah al-Talibin', ar: 'إعانة الطالبين على حل ألفاظ فتح المعين', by: 'Abu Bakr Syatta al-Dimyati (w. 1310H)', id: 963, lvl: 'Lanjutan' },
    mughni: { name: 'Mughni al-Muhtaj', ar: 'مغني المحتاج إلى معرفة معاني ألفاظ المنهاج', by: 'Al-Khatib al-Syarbini (w. 977H)', id: 11444, lvl: 'Lanjutan' },
    raudhah: { name: 'Raudhah al-Talibin wa Umdah al-Muftin', ar: 'روضة الطالبين وعمدة المفتين', by: 'Imam al-Nawawi (w. 676H)', id: 499, lvl: 'Lanjutan' },
    majmu: { name: 'Al-Majmu\' Syarh al-Muhazzab', ar: 'المجموع شرح المهذب', by: 'Imam al-Nawawi (w. 676H)', id: 2186, lvl: 'Rujukan induk' },
    zuhaili: { name: 'Al-Fiqh al-Islami wa Adillatuh', ar: 'الفقه الإسلامي وأدلته', by: 'Dr. Wahbah al-Zuhaili (w. 1436H)', id: 384, lvl: 'Perbandingan', banding: true }
  };
  const shamela = (id, p) => `https://shamela.ws/book/${id}${p ? '/' + p : ''}`;

  /* Hadis: c = koleksi, n = nombor di sunnah.com, i = indeks fail dalam hadith-api (fawazahmed0) */
  const H = {
    b1: { c: 'bukhari', n: '1', i: 1, by: 'Umar bin al-Khattab', isi: 'Setiap amalan dinilai berdasarkan niat.' },
    b8: { c: 'bukhari', n: '8', i: 8, by: 'Ibn Umar', isi: 'Islam dibina atas lima perkara: syahadah, solat, zakat, haji dan puasa Ramadan.' },
    b135: { c: 'bukhari', n: '135', i: 135, by: 'Abu Hurairah', isi: 'Solat orang yang berhadas tidak diterima sehingga dia berwuduk.' },
    b335: { c: 'bukhari', n: '335', i: 335, by: 'Jabir bin Abdullah', isi: 'Bumi dijadikan tempat solat dan alat bersuci (tayammum) bagi umat ini.' },
    b645: { c: 'bukhari', n: '645', i: 645, by: 'Ibn Umar', isi: 'Solat berjemaah 27 darjat lebih utama daripada solat bersendirian.' },
    b756: { c: 'bukhari', n: '756', i: 756, by: 'Ubadah bin al-Samit', isi: 'Tiada solat bagi sesiapa yang tidak membaca al-Fatihah.' },
    b1090: { c: 'bukhari', n: '1090', i: 1090, by: 'Aisyah', isi: 'Solat mula difardukan dua rakaat; solat musafir dikekalkan begitu.' },
    b1503: { c: 'bukhari', n: '1503', i: 1503, by: 'Ibn Umar', isi: 'Zakat fitrah satu gantang (sa\') diwajibkan ke atas setiap Muslim dan dibayar sebelum solat hari raya.' },
    b1923: { c: 'bukhari', n: '1923', i: 1923, by: 'Anas bin Malik', isi: 'Bersahurlah kerana pada sahur ada keberkatan.' },
    b1933: { c: 'bukhari', n: '1933', i: 1933, by: 'Abu Hurairah', isi: 'Orang yang makan atau minum kerana terlupa hendaklah meneruskan puasanya.' },
    m1513: { c: 'muslim', n: '1513', i: 3808, by: 'Abu Hurairah', isi: 'Nabi SAW melarang jual beli hasah dan jual beli gharar (tidak pasti).' },
    m1587: { c: 'muslim', n: '1587a', i: 4061, by: 'Ubadah bin al-Samit', isi: 'Emas dengan emas, perak dengan perak dan seterusnya mesti sama banyak dan secara tunai.' },
    m1598: { c: 'muslim', n: '1598', i: 4093, by: 'Jabir bin Abdullah', isi: 'Rasulullah SAW melaknat pemakan riba, pemberinya, penulisnya dan dua saksinya.' },
    d83: { c: 'abudawud', n: '83', i: 83, by: 'Abu Hurairah', isi: 'Air laut suci lagi menyucikan dan bangkainya halal.' },
    d3503: { c: 'abudawud', n: '3503', i: 3503, by: 'Hakim bin Hizam', isi: 'Jangan jual apa yang tiada dalam milikmu.' },
    t730: { c: 'tirmidhi', n: '730', i: 730, by: 'Hafsah', isi: 'Sesiapa yang tidak berniat puasa sebelum fajar, tiada puasa baginya.' }
  };
  const KOLEKSI = { bukhari: 'Sahih al-Bukhari', muslim: 'Sahih Muslim', abudawud: 'Sunan Abi Dawud', tirmidhi: 'Jami\' al-Tirmizi' };

  /* Fatwa dan resolusi rasmi Malaysia */
  const F = {
    scKripto: { by: 'Majlis Penasihat Syariah, Suruhanjaya Sekuriti Malaysia', t: 'Resolusi aset digital, mesyuarat ke-233 (29 Jun 2020) dan ke-234 (20 Julai 2020)', petik: 'Pelaburan dan dagangan aset digital yang memenuhi syarat dan didagangkan di Bursa Aset Digital (DAX) yang berdaftar dengan SC adalah dibenarkan. Mata wang digital diiktiraf sebagai mal dan dikategorikan sebagai \'urudh, bukan mata wang dari sudut Syariah.', url: 'https://www.sc.com.my/development/icm/shariah/resolutions-of-the-shariah-advisory-council-of-the-sc' },
    scSaringan: { by: 'Suruhanjaya Sekuriti Malaysia', t: 'Soalan lazim kaedah saringan Syariah sekuriti', petik: 'Penanda aras aktiviti perniagaan 5% (cth. perbankan konvensional, judi, arak, babi, tembakau, faedah) dan 20% (cth. operasi hotel, broker saham, sewa daripada aktiviti tidak patuh). Nisbah kewangan: tunai konvensional dan hutang berfaedah masing-masing mesti kurang daripada 33% jumlah aset.', url: 'https://www.sc.com.my/regulation/regulatory-faqs/frequently-asked-questions-on-revised-shariah-screening-methodology' },
    scSenarai: { by: 'Suruhanjaya Sekuriti Malaysia', t: 'Keputusan Majlis Penasihat Syariah SC (edisi Bahasa Malaysia, 31 Disember 2023)', petik: 'Himpunan keputusan rasmi MPS SC untuk pasaran modal Islam.', url: 'https://www.sc.com.my/api/documentms/download.ashx?id=7c96654e-e943-4123-9a4a-9be4ac1da3e3' },
    selZakatSaham: { by: 'Jabatan Mufti Negeri Selangor', t: 'Hukum Zakat Pelaburan Saham (28 Oktober 2023)', petik: 'Hukum zakat ke atas saham yang dilaburkan di pasaran modal adalah sama seperti zakat barang perniagaan (\'urudh al-tijarah).', url: 'https://www.muftiselangor.gov.my/2023/10/28/hukum-zakat-perlaburan-saham/' },
    mkiForex: { by: 'Muzakarah Jawatankuasa Fatwa Majlis Kebangsaan kali ke-98 (13–15 Februari 2012), dipetik Jabatan Mufti Negeri Selangor', t: 'Hukum forex oleh individu secara lani melalui platform elektronik', petik: 'Haram. Antara sebabnya: riba melalui pengenaan rollover interest, pensyaratan jual beli dalam pemberian hutang melalui leverage, qabd (penerimaan) yang tidak jelas ketika transaksi pertukaran, penjualan mata wang yang tiada dalam pegangan dan spekulasi yang melibatkan perjudian.', url: 'https://emusykil.muftiselangor.gov.my/index.php/site/jawapan?id=3420' },
    mkiEmas: { by: 'Muzakarah Jawatankuasa Fatwa Majlis Kebangsaan kali ke-96 (13–15 Oktober 2011), dipetik Maybank Islamic', t: 'Parameter Pelaburan Emas', petik: 'Jual beli emas mesti berlaku serta-merta tanpa penangguhan; beli secara hutang penuh atau ansuran tidak dibenarkan; emas mesti wujud dan dimiliki sepenuhnya oleh penjual; serah terima (taqabudh) harga dan emas berlaku sebelum kedua-dua pihak berpisah.', url: 'https://www.maybank.com/islamic/en/coe/fatwa/others/gold_investment_parameters.page' },
    scNiaga: { by: 'Majlis Penasihat Syariah, Suruhanjaya Sekuriti Malaysia', t: 'Keputusan MPS SC Edisi Kedua: niaga hadapan minyak sawit mentah (hlm. 84) dan indeks komposit KLCI (hlm. 89)', petik: 'Kontrak niaga hadapan minyak sawit mentah (mesyuarat ke-10 dan ke-11, 1997) dan niaga hadapan indeks komposit KLCI (mesyuarat ke-13, 1998) "diharuskan menurut perspektif perundangan Islam".', url: 'https://www.sc.com.my/api/documentms/download.ashx?id=b26a16f1-241d-4831-a433-ed2a62d4cadd' },
    iifa63: { by: 'Akademi Fiqh Islam Antarabangsa (IIFA), Resolusi 63 (1/7), Jeddah 1992', t: 'Pasaran kewangan: saham, opsyen, komoditi', petik: 'Kontrak opsyen tidak harus, dan kerana ia pada asalnya tidak harus, dagangannya juga tidak harus. Kontrak niaga hadapan komoditi pada asasnya tidak harus. Mata wang tidak boleh dijual beli secara niaga hadapan. Tidak harus menjual saham yang tidak dimiliki penjual.', url: 'https://iifa-aifi.org/en/32438.html' },
    wpQasar: { by: 'Pejabat Mufti Wilayah Persekutuan', t: 'Al-Kafi #1177: Hukum solat jamak qasar semasa musafir tanpa bermalam', petik: 'Musafir melebihi 2 marhalah (kira-kira 81 km) boleh jamak dan qasar walaupun pulang hari dan tidak bermalam, jika destinasi jelas dan perjalanan bukan untuk maksiat.', url: 'https://muftiwp.gov.my/ms/artikel/al-kafi-li-al-fatawi/3241-al-kafi-1177-hukum-solat-jamak-qasar-semasa-musafir-tanpa-bermalam' }
  };

  /* Skala hukum taklifi */
  const HUKUM = {
    wajib: ['Wajib', 'Diberi pahala jika dibuat, berdosa jika ditinggalkan.'],
    fk: ['Fardu kifayah', 'Wajib ke atas masyarakat; gugur dosa semua jika sebahagian telah melaksanakannya.'],
    sunat: ['Sunat', 'Diberi pahala jika dibuat, tidak berdosa jika ditinggalkan.'],
    harus: ['Harus', 'Tiada pahala atau dosa pada perbuatan itu sendiri.'],
    makruh: ['Makruh', 'Diberi pahala jika ditinggalkan, tidak berdosa jika dibuat.'],
    haram: ['Haram', 'Berdosa jika dibuat, diberi pahala jika ditinggalkan kerana Allah.'],
    info: ['Penjelasan', 'Penerangan syarat, rukun atau kaedah.']
  };

  /* Bab: kitab = [kunci kitab, halaman Shamela, tajuk bab dalam kitab] */
  const BAB = [
    { k: 'taharah', name: 'Taharah', ar: 'الطهارة', desc: 'Air, wuduk, mandi wajib dan tayammum', color: '#2bb8f0',
      kitab: [['abisyuja', 2, 'كتاب الطهارة'], ['fathqarib', 6, 'كتاب أحكام الطهارة'], ['minhaj', 3, 'كتاب الطهارة'], ['manhaji', 2, 'الجزء الأول: الطهارة والصلاة']] },
    { k: 'solat', name: 'Solat', ar: 'الصلاة', desc: 'Kewajipan, rukun, berjemaah, Jumaat dan musafir', color: '#1f9d63',
      kitab: [['abisyuja', 7, 'كتاب الصلاة'], ['fathqarib', 48, 'كتاب أحكام الصلاة'], ['minhaj', 21, 'كتاب الصلاة'], ['minhaj', 41, 'كتاب صلاة الجماعة'], ['manhaji', 2, 'الجزء الأول: الطهارة والصلاة']] },
    { k: 'puasa', name: 'Puasa', ar: 'الصيام', desc: 'Ramadan, niat, sahur, qada dan fidyah', color: '#7b5cf0',
      kitab: [['abisyuja', 19, 'كتاب الصوم'], ['fathqarib', 118, 'كتاب بيان أحكام الصيام'], ['minhaj', 87, 'كتاب الصيام'], ['manhaji', 265, 'الجزء الثاني: الزكاة والصيام والحج']] },
    { k: 'zakat', name: 'Zakat', ar: 'الزكاة', desc: 'Kewajipan, asnaf, fitrah dan zakat saham', color: '#f2b51f',
      kitab: [['abisyuja', 16, 'كتاب الزكاة'], ['fathqarib', 101, 'كتاب أحكام الزكاة'], ['minhaj', 73, 'كتاب الزكاة'], ['manhaji', 265, 'الجزء الثاني: الزكاة والصيام والحج']] },
    { k: 'muamalat', name: 'Muamalat & Pelaburan', ar: 'المعاملات', desc: 'Jual beli, riba, gharar, saham, kripto, forex dan CFD', color: '#f2704d',
      kitab: [['abisyuja', 23, 'كتاب البيوع وغيرها من المعاملات'], ['fathqarib', 142, 'كتاب أحكام البيوع'], ['minhaj', 113, 'كتاب البيع'], ['manhaji', 1041, 'الجزء السادس: البيع والربا والصرف']] }
  ];

  /* Masalah. q = ayat (surah:ayat), h = kunci hadis, f = kunci fatwa, app = pautan dalam app */
  const MASALAH = [
    /* Taharah */
    { bab: 'taharah', k: 'wuduk', t: 'Rukun wuduk', hukum: 'wajib',
      ringkas: 'Wuduk ialah syarat sah solat. Dalam mazhab Syafie rukunnya enam: niat, membasuh muka, membasuh kedua-dua tangan hingga siku, menyapu sebahagian kepala, membasuh kedua-dua kaki hingga buku lali, dan tertib.',
      langkah: ['Niat', 'Basuh muka', 'Tangan hingga siku', 'Sapu sebahagian kepala', 'Kaki hingga buku lali', 'Tertib'],
      q: ['5:6'], h: ['b135', 'b1'] },
    { bab: 'taharah', k: 'batal-wuduk', t: 'Perkara yang membatalkan wuduk', hukum: 'info',
      ringkas: 'Menurut Matan Abi Syuja\', wuduk batal dengan enam perkara: keluar sesuatu dari qubul atau dubur, tidur yang tidak tetap punggungnya, hilang akal kerana mabuk atau sakit, bersentuh kulit lelaki dan perempuan ajnabi tanpa lapik, menyentuh kemaluan dengan tapak tangan, dan menyentuh lingkaran dubur.',
      q: ['4:43'], h: ['b135'] },
    { bab: 'taharah', k: 'mandi-wajib', t: 'Sebab dan fardu mandi wajib', hukum: 'wajib',
      ringkas: 'Sebab mandi wajib ialah bersetubuh, keluar mani, mati, haid, nifas dan melahirkan anak. Fardunya ialah niat, menghilangkan najis jika ada pada badan, dan meratakan air ke seluruh rambut dan kulit.',
      langkah: ['Niat', 'Hilangkan najis', 'Ratakan air ke seluruh badan'],
      q: ['5:6', '4:43'], h: ['b1'] },
    { bab: 'taharah', k: 'tayammum', t: 'Tayammum apabila tiada air', hukum: 'info',
      ringkas: 'Tayammum dengan debu tanah yang suci menggantikan wuduk atau mandi apabila tiada air atau tidak boleh menggunakan air kerana sakit. Ia rukhsah (keringanan) yang disebut dalam Al-Quran.',
      q: ['4:43', '5:6'], h: ['b335'] },
    { bab: 'taharah', k: 'air', t: 'Air yang boleh digunakan untuk bersuci', hukum: 'info',
      ringkas: 'Matan Abi Syuja\' menyebut tujuh jenis air yang sah untuk bersuci: air hujan, air laut, air sungai, air perigi, air mata air, air salji dan air embun beku. Air laut sah walaupun masin.',
      q: ['25:48'], h: ['d83'] },

    /* Solat */
    { bab: 'solat', k: 'fardu-solat', t: 'Kewajipan solat lima waktu', hukum: 'wajib',
      ringkas: 'Solat fardu lima waktu wajib ke atas setiap Muslim yang baligh dan berakal. Ia rukun Islam yang kedua dan mesti ditunaikan dalam waktunya.',
      q: ['2:43', '4:103'], h: ['b8'], app: ['#solat', 'Lihat waktu solat zon anda'] },
    { bab: 'solat', k: 'waktu', t: 'Waktu solat', hukum: 'wajib',
      ringkas: 'Solat ialah kewajipan yang ditentukan waktunya. Menunaikan solat sebelum masuk waktu tidak sah, dan melewatkannya hingga keluar waktu tanpa uzur adalah berdosa.',
      q: ['4:103', '17:78'], app: ['#solat', 'Waktu solat rasmi untuk zon anda'] },
    { bab: 'solat', k: 'fatihah', t: 'Membaca al-Fatihah dalam setiap rakaat', hukum: 'wajib',
      ringkas: 'Dalam mazhab Syafie, membaca al-Fatihah ialah rukun solat dalam setiap rakaat, bagi imam, makmum dan orang yang solat bersendirian.',
      h: ['b756'], app: ['#ibadah/quran/1', 'Buka Surah al-Fatihah'] },
    { bab: 'solat', k: 'jemaah', t: 'Solat berjemaah', hukum: 'fk',
      ringkas: 'Imam al-Nawawi dalam Minhaj al-Talibin menyatakan pendapat yang lebih sahih (al-asah) ialah solat berjemaah bagi fardu lima waktu adalah fardu kifayah bagi lelaki; ada ulama Syafie yang menganggapnya sunat muakkad. Pahalanya 27 darjat lebih tinggi.',
      h: ['b645'] },
    { bab: 'solat', k: 'jumaat', t: 'Solat Jumaat', hukum: 'wajib',
      ringkas: 'Solat Jumaat wajib ke atas lelaki Muslim yang baligh, berakal, merdeka, sihat dan bermukim. Apabila azan Jumaat dilaungkan, urusan jual beli hendaklah ditinggalkan.',
      q: ['62:9'] },
    { bab: 'solat', k: 'jamak-qasar', t: 'Jamak dan qasar ketika musafir', hukum: 'harus',
      ringkas: 'Musafir yang memenuhi syarat boleh memendekkan (qasar) solat empat rakaat menjadi dua dan menghimpunkan (jamak) dua solat dalam satu waktu. Di Malaysia jarak yang diguna pakai ialah 2 marhalah, kira-kira 81 km.',
      q: ['4:101'], h: ['b1090'], f: ['wpQasar'] },

    /* Puasa */
    { bab: 'puasa', k: 'ramadan', t: 'Kewajipan puasa Ramadan', hukum: 'wajib',
      ringkas: 'Puasa Ramadan wajib ke atas setiap Muslim yang baligh, berakal dan mampu. Ia rukun Islam yang kelima dalam hadis Ibn Umar.',
      q: ['2:183', '2:185'], h: ['b8'] },
    { bab: 'puasa', k: 'niat', t: 'Niat puasa pada waktu malam', hukum: 'wajib',
      ringkas: 'Bagi puasa wajib seperti Ramadan, qada dan nazar, mazhab Syafie mensyaratkan niat dibuat pada waktu malam sebelum fajar, dan diperbaharui setiap hari. Puasa sunat boleh diniatkan sebelum gelincir matahari jika belum makan.',
      h: ['t730'], nota: 'Perhatikan gred hadis yang dipaparkan: sebahagian ahli hadis menilainya sahih dan sebahagian menilainya daif.' },
    { bab: 'puasa', k: 'terlupa', t: 'Makan atau minum kerana terlupa', hukum: 'info',
      ringkas: 'Puasa tidak batal jika seseorang makan atau minum kerana benar-benar terlupa. Dia hendaklah meneruskan puasanya sebaik sahaja teringat.',
      h: ['b1933'] },
    { bab: 'puasa', k: 'sahur', t: 'Bersahur', hukum: 'sunat',
      ringkas: 'Bersahur adalah sunat dan padanya ada keberkatan. Waktu makan dan minum berterusan hingga terbit fajar sadiq.',
      q: ['2:187'], h: ['b1923'] },
    { bab: 'puasa', k: 'qada-fidyah', t: 'Musafir, sakit, qada dan fidyah', hukum: 'harus',
      ringkas: 'Orang sakit dan musafir diharuskan berbuka, dan wajib menggantikan (qada) pada hari lain. Bagi yang tidak mampu berpuasa, Al-Quran menyebut fidyah memberi makan orang miskin.',
      q: ['2:184', '2:185'] },

    /* Zakat */
    { bab: 'zakat', k: 'wajib-zakat', t: 'Kewajipan zakat', hukum: 'wajib',
      ringkas: 'Zakat wajib ke atas harta yang cukup nisab dan haul (genap setahun) bagi jenis harta tertentu. Ia rukun Islam yang ketiga dan membersihkan harta.',
      q: ['2:43', '9:103'], h: ['b8'], app: ['#ibadah/zakat', 'Kira zakat simpanan dan fitrah'] },
    { bab: 'zakat', k: 'asnaf', t: 'Lapan golongan penerima zakat (asnaf)', hukum: 'info',
      ringkas: 'Zakat hanya diagihkan kepada lapan asnaf: fakir, miskin, amil, muallaf, hamba (riqab), orang berhutang (gharimin), fisabilillah dan musafir (ibnu sabil).',
      langkah: ['Fakir', 'Miskin', 'Amil', 'Muallaf', 'Riqab', 'Gharimin', 'Fisabilillah', 'Ibnu sabil'],
      q: ['9:60'] },
    { bab: 'zakat', k: 'fitrah', t: 'Zakat fitrah', hukum: 'wajib',
      ringkas: 'Zakat fitrah wajib ke atas setiap Muslim yang hidup pada akhir Ramadan dan mempunyai lebihan makanan pada hari raya. Kadarnya satu gantang makanan asasi; di Malaysia kadar dalam ringgit ditetapkan oleh majlis agama negeri.',
      h: ['b1503'], app: ['#ibadah/zakat', 'Kira zakat fitrah keluarga'] },
    { bab: 'zakat', k: 'zakat-saham', t: 'Zakat saham', hukum: 'wajib',
      ringkas: 'Jabatan Mufti Negeri Selangor memutuskan saham yang dilaburkan di pasaran modal dizakatkan seperti barang perniagaan, sama ada dibeli untuk dagangan atau pegangan. Kaedah kiraan terperinci ikut pusat zakat negeri masing-masing.',
      q: ['9:103'], f: ['selZakatSaham'] },

    /* Muamalat & pelaburan */
    { bab: 'muamalat', k: 'jual-beli', t: 'Jual beli dan saling reda', hukum: 'harus',
      ringkas: 'Asal jual beli adalah harus. Ia sah apabila cukup rukun (penjual, pembeli, barang, harga dan sighah) dan dilakukan dengan saling reda tanpa penipuan.',
      q: ['2:275', '4:29'] },
    { bab: 'muamalat', k: 'riba', t: 'Riba', hukum: 'haram',
      ringkas: 'Riba haram secara qat\'i. Ia termasuk faedah ke atas pinjaman dan lebihan dalam tukaran barang ribawi. Larangan merangkumi pemakan, pemberi, penulis dan saksi riba.',
      q: ['2:275', '2:278', '2:279'], h: ['m1598'] },
    { bab: 'muamalat', k: 'sarf', t: 'Tukaran barang ribawi dan mata wang (sarf)', hukum: 'info',
      ringkas: 'Hadis Ubadah menetapkan emas, perak, gandum, barli, tamar dan garam yang ditukar dengan jenis yang sama mesti sama kadar dan secara tunai (yadan bi yadin). Ini asas hukum sarf yang dibincangkan dalam bab riba.',
      h: ['m1587'] },
    { bab: 'muamalat', k: 'gharar', t: 'Gharar (ketidakpastian)', hukum: 'haram',
      ringkas: 'Jual beli yang mengandungi gharar, iaitu ketidakpastian yang ketara pada barang, harga atau penyerahan, dilarang. Gharar yang sedikit dan tidak dapat dielakkan dimaafkan.',
      h: ['m1513'] },
    { bab: 'muamalat', k: 'judi', t: 'Judi (maisir)', hukum: 'haram',
      ringkas: 'Judi haram secara jelas dalam Al-Quran. Ia berlaku apabila wang dipertaruhkan atas sesuatu yang bergantung kepada nasib, dan satu pihak untung atas kerugian pihak lain.',
      q: ['5:90'] },
    { bab: 'muamalat', k: 'milik', t: 'Menjual barang yang belum dimiliki', hukum: 'haram',
      ringkas: 'Nabi SAW melarang menjual sesuatu yang bukan dalam milik penjual. Prinsip ini penting apabila menilai produk dagangan yang menjual aset sebelum memilikinya.',
      h: ['d3503'] },
    { bab: 'muamalat', k: 'saham-syariah', t: 'Melabur dalam saham patuh Syariah', hukum: 'harus',
      ringkas: 'Melabur dalam saham syarikat yang aktivitinya halal adalah harus. Di Malaysia, Majlis Penasihat Syariah SC menyaring saham Bursa dua kali setahun menggunakan penanda aras aktiviti (5% dan 20%) dan nisbah kewangan (33%). Semak status saham sebelum membeli di Moomoo.',
      langkah: ['Aktiviti teras halal', 'Aktiviti bercampur bawah 5% / 20%', 'Tunai konvensional bawah 33%', 'Hutang berfaedah bawah 33%'],
      q: ['2:275', '4:29'], f: ['scSaringan', 'scSenarai'], app: ['#belajar', 'Belajar asas saham di SiswaCap'] },
    { bab: 'muamalat', k: 'kripto', t: 'Melabur dalam kripto', hukum: 'harus',
      ringkas: 'MPS SC memutuskan pelaburan dan dagangan aset digital yang memenuhi syarat Syariah dan didagangkan di DAX berdaftar dengan SC adalah dibenarkan. Mata wang digital dianggap harta (mal) dan \'urudh, bukan mata wang. Unsur judi, gharar dan riba tetap perlu dielakkan.',
      q: ['4:29'], h: ['m1513'], f: ['scKripto'], app: ['#pasaran', 'Lihat harga kripto masa nyata'] },
    { bab: 'muamalat', k: 'forex', t: 'Dagangan forex (pertukaran mata wang asing) secara individu', hukum: 'haram', alias: 'forex fx metatrader mt4 mt5 eurusd xauusd trading mata wang tukaran asing',
      ringkas: 'Muzakarah Fatwa Kebangsaan kali ke-98 (2012) memutuskan dagangan forex oleh individu secara lani melalui platform elektronik adalah haram, kerana mengandungi riba (rollover interest), hutang bersyarat jual beli melalui leverage, qabd yang tidak jelas, menjual mata wang yang tiada dalam pegangan dan spekulasi menyerupai judi. Tukaran mata wang sebenar untuk keperluan, secara tunai dan serta-merta, kekal harus.',
      q: ['2:275', '2:278', '5:90'], h: ['m1587', 'm1598', 'd3503'], f: ['mkiForex'], app: ['#belajar', 'Pelajaran forex dan emas di Belajar'] },
    { bab: 'muamalat', k: 'cfd', t: 'CFD (Contract for Difference)', hukum: 'haram', alias: 'cfd contract for difference beza harga us500 nas100 gold cfd derivatif',
      ringkas: 'Dalam CFD, aset tidak pernah dimiliki; yang didagang hanya beza harga dengan broker, dengan leverage dan caj swap semalaman. Unsur-unsur ini sama dengan sebab forex runcit diharamkan oleh Muzakarah kali ke-98: riba, hutang bersyarat jual beli, tiada qabd, menjual yang tiada dalam milik dan spekulasi.',
      nota: 'Tiada fatwa rasmi Malaysia yang menyebut CFD secara khusus ditemui. Hukum ini disimpulkan daripada sebab-sebab yang dinyatakan dalam fatwa forex di bawah.',
      q: ['2:275', '5:90'], h: ['d3503', 'm1513'], f: ['mkiForex'], app: ['#belajar', 'Pelajaran CFD di Belajar'] },
    { bab: 'muamalat', k: 'leverage', t: 'Leverage dan akaun margin berfaedah', hukum: 'haram', alias: 'leverage margin margin call liquidation pinjaman broker gearing',
      ringkas: 'Leverage dan margin konvensional ialah pinjaman berfaedah daripada broker untuk membeli lebih banyak aset, dan faedah itu riba. Muzakarah kali ke-98 juga menyebut "pensyaratan jual beli dalam pemberian hutang melalui leverage" sebagai sebab pengharaman forex runcit. Pembiayaan margin Islam yang menggunakan akad Syariah ialah alternatif yang perlu disemak akadnya.',
      q: ['2:275', '2:278', '2:279'], h: ['m1598'], f: ['mkiForex'], app: ['#belajar', 'Cuba simulator leverage di Belajar'] },
    { bab: 'muamalat', k: 'opsyen', t: 'Opsyen (options) call dan put', hukum: 'haram', alias: 'opsyen options option call put premium waran',
      ringkas: 'Opsyen ialah hak untuk membeli atau menjual pada harga tetap yang dijual dengan premium. Akademi Fiqh Islam Antarabangsa (Resolusi 63) memutuskan kontrak opsyen tidak harus kerana yang dijual bukan harta, manfaat atau hak kewangan yang sah, dan dagangannya juga tidak harus.',
      h: ['m1513'], f: ['iifa63'], app: ['#belajar', 'Pelajaran niaga hadapan dan opsyen'] },
    { bab: 'muamalat', k: 'niaga-hadapan', t: 'Niaga hadapan (futures): FCPO dan FKLI', hukum: 'info', alias: 'niaga hadapan futures fcpo fkli sawit kontrak hadapan perpetual',
      ringkas: 'Ulama berbeza pendapat (khilaf). Majlis Penasihat Syariah SC memutuskan niaga hadapan minyak sawit mentah (FCPO) dan indeks komposit KLCI di Bursa Malaysia Derivatives adalah harus. Akademi Fiqh Islam Antarabangsa pula berpandangan kontrak niaga hadapan komoditi pada asasnya tidak harus, dan mata wang tidak boleh didagang secara niaga hadapan. Keputusan MPS SC tidak meliputi futures luar negara, futures emas, futures mata wang atau perpetual kripto.',
      f: ['scNiaga', 'iifa63'], app: ['#belajar', 'Pelajaran niaga hadapan dan opsyen'] },
    { bab: 'muamalat', k: 'emas', t: 'Jual beli dan pelaburan emas', hukum: 'harus', alias: 'emas gold jongkong dinar akaun emas xau ansuran',
      ringkas: 'Emas ialah barang ribawi. Jual belinya harus jika serta-merta dan berlaku serah terima (taqabudh) sebelum berpisah, emas wujud dan dimiliki penjual, dan tidak dibeli secara hutang atau ansuran, menurut Parameter Pelaburan Emas Muzakarah kali ke-96. Dagangan emas melalui CFD atau XAU/USD di platform forex tidak memenuhi syarat ini.',
      langkah: ['Serta-merta, tiada tangguh', 'Tiada ansuran atau hutang', 'Emas wujud dan dimiliki penjual', 'Taqabudh sebelum berpisah'],
      h: ['m1587'], f: ['mkiEmas'] }
  ];

  /* Istilah moden yang tiada dalam teks Al-Quran: dipetakan kepada perkataan dalil asas untuk carian ayat */
  const ISTILAH = [
    [/forex|\bfx\b|metatrader|mt[45]|mata wang|currency/i, ['riba', 'judi']],
    [/cfd|contract for diff|derivatif|derivative/i, ['riba', 'judi']],
    [/leverage|margin|gearing|pinjam|hutang|interest|faedah|bunga/i, ['riba', 'hutang']],
    [/opsyen|option|futures|niaga hadapan|perpetual|spekulasi|trading|dagang/i, ['judi', 'perniagaan']],
    [/kripto|crypto|bitcoin|btc|coin|token/i, ['harta', 'perniagaan']],
    [/emas|gold|perak|silver/i, ['emas', 'riba']],
    [/saham|stock|share|pelaburan|labur|invest/i, ['perniagaan', 'harta']],
    [/judi|maisir|loteri|lottery|bet|taruh/i, ['judi']],
    [/insurans|insurance|takaful/i, ['judi']]
  ];

  /* Pautan carian ke sumber asal */
  /* Rujukan rasmi moden (PDF percuma daripada penerbit asal). Teks setiap muka surat diindeks oleh pelayan Tanya AI
     (worker-fiqh/scripts/muat-rujukan.mjs) supaya AI boleh memetik muka surat yang tepat. url#page=N membuka muka surat itu. */
  const MODEN = [
    { k: 'jakim', name: 'Kompilasi Pandangan Hukum Muzakarah Jawatankuasa Fatwa Majlis Kebangsaan', by: 'Jabatan Kemajuan Islam Malaysia (JAKIM)', tahun: 2016, bahasa: 'ms',
      skop: 'Ibadah, akidah, perubatan, halal, kewangan dan isu sosial semasa', url: 'https://www.islam.gov.my/images/ePenerbitan/KOMPILASI_MUZAKARAH_MKI_2016.pdf' },
    { k: 'scmps', name: 'Keputusan Majlis Penasihat Syariah Suruhanjaya Sekuriti Malaysia', by: 'Suruhanjaya Sekuriti Malaysia', tahun: 2023, bahasa: 'ms',
      skop: 'Saham, sukuk, unit amanah, derivatif, aset digital dan pasaran modal Islam', url: 'https://www.sc.com.my/api/documentms/download.ashx?id=7c96654e-e943-4123-9a4a-9be4ac1da3e3' },
    { k: 'bnmsr', name: 'Shariah Resolutions in Islamic Finance (Second Edition)', by: 'Majlis Penasihat Syariah, Bank Negara Malaysia', tahun: 2010, bahasa: 'en',
      skop: 'Perbankan Islam, takaful, pembiayaan, deposit dan instrumen pasaran wang', url: 'https://financialmarkets.bnm.gov.my/uploads/files/Shariah_Resolutions_BNM_2nd_Edition.pdf' },
    { k: 'iifa', name: 'Resolutions of the International Islamic Fiqh Academy (sesi 1-25, 1985-2023)', by: 'Akademi Fiqh Islam Antarabangsa (IIFA), Pertubuhan Kerjasama Islam (OIC)', tahun: 2024, bahasa: 'en',
      skop: 'Isu antarabangsa: mata wang, saham, insurans, perubatan, pemindahan organ, keluarga dan teknologi', url: 'https://iifa-aifi.org/wp-content/uploads/2024/07/IIFA-Resolutions-Ebook-2024.pdf' }
  ];

  /* Laman web rasmi Jabatan Mufti setiap negeri dan portal fatwa kebangsaan. Fatwa, irsyad dan soal jawab hukum diambil
     setiap hari oleh pelayan Tanya AI (worker-fiqh/scripts/muat-mufti.mjs) supaya isu yang baru timbul dijawab dengan
     keputusan terkini. laman: alamat yang dicuba mengikut tertib; yang pertama berjaya digunakan. tambahan: sistem fatwa
     atau soal jawab jabatan yang sama di hos lain (hanya halaman di bawah folder alamat itu diambil), atau senarai yang
     dimuat dengan AJAX (cth. Sarawak). */
  const MUFTI = [
    { k: 'esmaf', negeri: 'Kebangsaan', by: 'Portal Rasmi Fatwa Malaysia (e-SMAF), JAKIM', laman: ['https://e-smaf.islam.gov.my/e-smaf/', 'http://e-smaf.islam.gov.my/e-smaf/', 'https://www.e-fatwa.gov.my/', 'http://www.e-fatwa.gov.my/'] },
    { k: 'wp', negeri: 'Wilayah Persekutuan', by: 'Pejabat Mufti Wilayah Persekutuan', laman: ['https://www.muftiwp.gov.my/', 'https://muftiwp.gov.my/'] },
    { k: 'selangor', negeri: 'Selangor', by: 'Jabatan Mufti Negeri Selangor', laman: ['https://www.muftiselangor.gov.my/', 'https://muftiselangor.gov.my/'] },
    { k: 'johor', negeri: 'Johor', by: 'Jabatan Mufti Johor', laman: ['https://mufti.johor.gov.my/'],
      tambahan: ['https://said.johor.gov.my/perkhidmatan/paparan_fatwa.php', 'https://said.johor.gov.my/perkhidmatan/paparan_kemusykilan.php'] },
    { k: 'kedah', negeri: 'Kedah', by: 'Jabatan Mufti Negeri Kedah', laman: ['https://mufti.kedah.gov.my/'], tambahan: ['https://ifatwa.kedah.gov.my/'] },
    { k: 'kelantan', negeri: 'Kelantan', by: 'Jabatan Mufti Negeri Kelantan', laman: ['https://mufti.kelantan.gov.my/'] },
    { k: 'melaka', negeri: 'Melaka', by: 'Jabatan Mufti Negeri Melaka', laman: ['https://www.muftimelaka.gov.my/', 'https://muftimelaka.gov.my/'] },
    { k: 'nsembilan', negeri: 'Negeri Sembilan', by: 'Jabatan Mufti Kerajaan Negeri Sembilan', laman: ['https://muftins.gov.my/', 'https://www.muftins.gov.my/'] },
    { k: 'pahang', negeri: 'Pahang', by: 'Jabatan Mufti Negeri Pahang', laman: ['https://mufti.pahang.gov.my/'] },
    { k: 'perak', negeri: 'Perak', by: 'Jabatan Mufti Negeri Perak', laman: ['https://mufti.perak.gov.my/'] },
    { k: 'perlis', negeri: 'Perlis', by: 'Jabatan Mufti Negeri Perlis', laman: ['https://muftiperlis.gov.my/', 'https://www.muftiperlis.gov.my/'] },
    { k: 'ppinang', negeri: 'Pulau Pinang', by: 'Jabatan Mufti Negeri Pulau Pinang', laman: ['https://mufti.penang.gov.my/'] },
    { k: 'sabah', negeri: 'Sabah', by: 'Jabatan Mufti Negeri Sabah', laman: ['https://mufti.sabah.gov.my/'] },
    { k: 'sarawak', negeri: 'Sarawak', by: 'Jabatan Mufti Negeri Sarawak', laman: ['https://muftinegeri.sarawak.gov.my/', 'http://muftinegeri.sarawak.gov.my/', 'https://jmns.sarawak.gov.my/'],
      tambahan: ['https://muftinegeri.sarawak.gov.my/web/subpage/fatwa_list_ajax/', 'https://muftinegeri.sarawak.gov.my/web/subpage/irsyad_list_ajax/'] },
    { k: 'terengganu', negeri: 'Terengganu', by: 'Jabatan Mufti Negeri Terengganu', laman: ['https://mufti.terengganu.gov.my/', 'https://www.mufti.terengganu.gov.my/'] }
  ];

  const CARI = [
    ['sunnah.com', 'Hadis (6 kitab utama)', q => `https://sunnah.com/search?q=${encodeURIComponent(q)}`],
    ['Al-Maktabah al-Shamela', 'Kitab turath (teks Arab)', q => `https://shamela.ws/search?q=${encodeURIComponent(q)}`],
    ['e-Fatwa Mufti WP', 'Fatwa rasmi Malaysia', () => 'https://efatwa.muftiwp.gov.my/'],
    ['Keputusan MPS SC', 'Pasaran modal Islam', () => F.scSenarai.url]
  ];

  return { KITAB, shamela, H, KOLEKSI, F, HUKUM, BAB, MASALAH, CARI, ISTILAH, MODEN, MUFTI };
})();
// Pelayan Tanya AI (worker-fiqh) memuat fail yang sama sebagai korpus rujukan yang telah disemak
if (typeof globalThis !== 'undefined') globalThis.FiqhData = FiqhData;
