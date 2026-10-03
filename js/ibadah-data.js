/* Bijak Labur: kandungan statik untuk Ibadah (doa, Asmaul Husna, panduan). Teks Al-Quran dimuat dari api.alquran.cloud. */
const IbadahData = (function () {
  // [tajuk, arab, rumi, maksud, rujukan]
  const DOA = [
    { grp: 'Harian', key: 'tidur', name: 'Tidur', icon: 'bed', items: [
      ['Sebelum tidur', 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', 'Bismikallahumma amutu wa ahya', 'Dengan nama-Mu ya Allah, aku mati dan aku hidup.', 'Riwayat al-Bukhari'],
      ['Bangun tidur', 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', 'Alhamdulillahil-lazi ahyana ba\'da ma amatana wa ilaihin-nusyur', 'Segala puji bagi Allah yang menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dibangkitkan.', 'Riwayat al-Bukhari']
    ] },
    { grp: 'Harian', key: 'tandas', name: 'Tandas', icon: 'door', items: [
      ['Masuk tandas', 'بِسْمِ اللَّهِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ', 'Bismillah, Allahumma inni a\'uzu bika minal-khubuthi wal-khaba\'ith', 'Dengan nama Allah. Ya Allah, aku berlindung kepada-Mu daripada syaitan lelaki dan syaitan perempuan.', 'Riwayat al-Bukhari, Muslim dan at-Tirmizi'],
      ['Keluar tandas', 'غُفْرَانَكَ', 'Ghufranak', 'Aku memohon keampunan-Mu.', 'Riwayat Abu Daud dan at-Tirmizi']
    ] },
    { grp: 'Harian', key: 'wuduk', name: 'Wuduk', icon: 'drops', items: [
      ['Sebelum wuduk', 'بِسْمِ اللَّهِ', 'Bismillah', 'Dengan nama Allah.', 'Riwayat Abu Daud'],
      ['Selepas wuduk', 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ', 'Asyhadu an la ilaha illallahu wahdahu la syarika lah, wa asyhadu anna Muhammadan \'abduhu wa rasuluh', 'Aku bersaksi bahawa tiada Tuhan melainkan Allah, Yang Maha Esa dan tiada sekutu bagi-Nya, dan aku bersaksi bahawa Muhammad itu hamba-Nya dan rasul-Nya.', 'Riwayat Muslim']
    ] },
    { grp: 'Harian', key: 'masjid', name: 'Masjid', icon: 'mosque', items: [
      ['Masuk masjid', 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', 'Allahummaf-tah li abwaba rahmatik', 'Ya Allah, bukakanlah untukku pintu-pintu rahmat-Mu.', 'Riwayat Muslim'],
      ['Keluar masjid', 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ', 'Allahumma inni as\'aluka min fadlik', 'Ya Allah, aku memohon kepada-Mu sebahagian daripada kurnia-Mu.', 'Riwayat Muslim']
    ] },
    { grp: 'Harian', key: 'solat', name: 'Solat', icon: 'pray', items: [
      ['Duduk antara dua sujud', 'رَبِّ اغْفِرْ لِي وَارْحَمْنِي وَاجْبُرْنِي وَارْفَعْنِي وَارْزُقْنِي وَاهْدِنِي وَعَافِنِي وَاعْفُ عَنِّي', 'Rabbighfirli warhamni wajburni warfa\'ni warzuqni wahdini wa \'afini wa\'fu \'anni', 'Ya Tuhanku, ampunilah aku, rahmatilah aku, cukupkanlah aku, angkatlah darjatku, berilah aku rezeki, berilah aku petunjuk, sihatkanlah aku dan maafkanlah aku.', 'Riwayat at-Tirmizi dan Ibnu Majah'],
      ['Selepas salam', 'أَسْتَغْفِرُ اللَّهَ (٣×)، اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ', 'Astaghfirullah (3x). Allahumma antas-salam wa minkas-salam, tabarakta ya zal-jalali wal-ikram', 'Aku memohon ampun kepada Allah. Ya Allah, Engkaulah Yang Maha Sejahtera dan daripada-Mu kesejahteraan. Maha Berkat Engkau, wahai Tuhan yang mempunyai kebesaran dan kemuliaan.', 'Riwayat Muslim'],
      ['Tasbih selepas solat', 'سُبْحَانَ اللَّهِ (٣٣×)، الْحَمْدُ لِلَّهِ (٣٣×)، اللَّهُ أَكْبَرُ (٣٣×)', 'Subhanallah (33x), Alhamdulillah (33x), Allahu akbar (33x)', 'Maha Suci Allah, segala puji bagi Allah, Allah Maha Besar. Boleh dikira dengan Tasbih dalam app ini.', 'Riwayat Muslim'],
      ['Ayat Kursi selepas solat', '', 'Baca Surah Al-Baqarah ayat 255.', 'Sesiapa membacanya selepas setiap solat fardu, tiada yang menghalangnya masuk syurga kecuali mati.', 'Riwayat an-Nasa\'i', '2:255']
    ] },
    { grp: 'Harian', key: 'rumah', name: 'Rumah', icon: 'home', items: [
      ['Keluar rumah', 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', 'Bismillahi tawakkaltu \'alallah, wa la hawla wa la quwwata illa billah', 'Dengan nama Allah, aku bertawakal kepada Allah. Tiada daya dan kekuatan melainkan dengan Allah.', 'Riwayat Abu Daud dan at-Tirmizi'],
      ['Masuk rumah', 'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا', 'Bismillahi walajna, wa bismillahi kharajna, wa \'alallahi rabbina tawakkalna', 'Dengan nama Allah kami masuk, dengan nama Allah kami keluar, dan kepada Allah Tuhan kami, kami bertawakal.', 'Riwayat Abu Daud']
    ] },
    { grp: 'Harian', key: 'pakaian', name: 'Pakaian', icon: 'shirt', items: [
      ['Memakai pakaian', 'الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَٰذَا الثَّوْبَ وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ', 'Alhamdulillahil-lazi kasani hazas-thauba wa razaqanihi min ghairi haulin minni wa la quwwah', 'Segala puji bagi Allah yang memakaikan aku pakaian ini dan merezekikannya kepadaku tanpa daya dan kekuatan daripadaku.', 'Riwayat Abu Daud dan at-Tirmizi']
    ] },
    { grp: 'Harian', key: 'musafir', name: 'Musafir', icon: 'plane', items: [
      ['Menaiki kenderaan', 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَىٰ رَبِّنَا لَمُنْقَلِبُونَ', 'Subhanal-lazi sakhkhara lana haza wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun', 'Maha Suci Tuhan yang telah memudahkan kenderaan ini bagi kami, sedangkan kami tidak mampu menguasainya. Dan sesungguhnya kepada Tuhan kamilah kami akan kembali.', 'Surah Az-Zukhruf, 43:13-14']
    ] },
    { grp: 'Harian', key: 'makan', name: 'Makan', icon: 'food', items: [
      ['Sebelum makan', 'بِسْمِ اللَّهِ', 'Bismillah', 'Dengan nama Allah.', 'Riwayat Abu Daud dan at-Tirmizi'],
      ['Terlupa membaca di awal', 'بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ', 'Bismillahi awwalahu wa akhirah', 'Dengan nama Allah pada awal dan akhirnya.', 'Riwayat Abu Daud dan at-Tirmizi'],
      ['Doa makan yang biasa diamalkan', 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ', 'Allahumma barik lana fima razaqtana wa qina \'azaban-nar', 'Ya Allah, berkatilah rezeki yang Engkau kurniakan kepada kami dan peliharalah kami daripada azab neraka.', 'Riwayat Ibnu as-Sunni'],
      ['Selepas makan', 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَٰذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ', 'Alhamdulillahil-lazi at\'amani haza wa razaqanihi min ghairi haulin minni wa la quwwah', 'Segala puji bagi Allah yang memberiku makan ini dan merezekikannya kepadaku tanpa daya dan kekuatan daripadaku.', 'Riwayat Abu Daud dan at-Tirmizi']
    ] },
    { grp: 'Azkar', key: 'zikir', name: 'Zikir harian', icon: 'beads', items: [
      ['Tasbih dan tahmid', 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', 'Subhanallahi wa bihamdih (100x)', 'Maha Suci Allah dan segala puji bagi-Nya. Diampunkan dosa walaupun sebanyak buih di lautan.', 'Riwayat al-Bukhari dan Muslim'],
      ['Tahlil', 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', 'La ilaha illallahu wahdahu la syarika lah, lahul-mulku wa lahul-hamdu wa huwa \'ala kulli syai\'in qadir (100x)', 'Tiada Tuhan melainkan Allah, Yang Maha Esa, tiada sekutu bagi-Nya. Bagi-Nya kerajaan dan pujian, dan Dia Maha Berkuasa atas segala sesuatu.', 'Riwayat al-Bukhari dan Muslim'],
      ['Istighfar', 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', 'Astaghfirullaha wa atubu ilaih', 'Aku memohon ampun kepada Allah dan bertaubat kepada-Nya. Rasulullah beristighfar lebih 70 kali sehari.', 'Riwayat al-Bukhari']
    ] },
    { grp: 'Azkar', key: 'pagipetang', name: 'Zikir pagi dan petang', icon: 'sunmoon', items: [
      ['Pagi', 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ', 'Allahumma bika asbahna wa bika amsaina wa bika nahya wa bika namutu wa ilaikan-nusyur', 'Ya Allah, dengan-Mu kami berpagi dan berpetang, dengan-Mu kami hidup dan mati, dan kepada-Mu kami dibangkitkan.', 'Riwayat at-Tirmizi'],
      ['Perlindungan (3x pagi dan petang)', 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', 'Bismillahil-lazi la yadurru ma\'asmihi syai\'un fil-ardi wa la fis-sama\' wa huwas-sami\'ul-\'alim', 'Dengan nama Allah yang tidak memberi mudarat sesuatu pun di bumi dan di langit bersama nama-Nya, dan Dia Maha Mendengar lagi Maha Mengetahui.', 'Riwayat Abu Daud dan at-Tirmizi'],
      ['Penghulu istighfar', 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ', 'Allahumma anta rabbi la ilaha illa anta, khalaqtani wa ana \'abduka, wa ana \'ala \'ahdika wa wa\'dika mastata\'tu, a\'uzu bika min syarri ma sana\'tu, abu\'u laka bini\'matika \'alayya, wa abu\'u bizanbi faghfirli, fa innahu la yaghfiruz-zunuba illa anta', 'Ya Allah, Engkau Tuhanku, tiada Tuhan melainkan Engkau. Engkau menciptakan aku dan aku hamba-Mu. Aku berpegang pada janji-Mu sedaya upayaku. Aku berlindung kepada-Mu daripada keburukan perbuatanku. Aku mengakui nikmat-Mu kepadaku dan mengakui dosaku, maka ampunilah aku. Sesungguhnya tiada yang mengampunkan dosa melainkan Engkau.', 'Riwayat al-Bukhari']
    ] },
    { grp: 'Azkar', key: 'rezeki', name: 'Ilmu, rezeki dan hutang', icon: 'coins', items: [
      ['Tambah ilmu', 'رَبِّ زِدْنِي عِلْمًا', 'Rabbi zidni \'ilma', 'Ya Tuhanku, tambahkanlah ilmu kepadaku.', 'Surah Taha, 20:114'],
      ['Ilmu, rezeki dan amal', 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا', 'Allahumma inni as\'aluka \'ilman nafi\'an wa rizqan tayyiban wa \'amalan mutaqabbala', 'Ya Allah, aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang baik dan amalan yang diterima.', 'Riwayat Ibnu Majah'],
      ['Dicukupkan dengan yang halal', 'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ', 'Allahummakfini bihalalika \'an haramik, wa aghnini bifadlika \'amman siwak', 'Ya Allah, cukupkanlah aku dengan yang halal daripada yang haram, dan kayakanlah aku dengan kurnia-Mu daripada bergantung kepada selain-Mu.', 'Riwayat at-Tirmizi'],
      ['Dukacita dan beban hutang', 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ', 'Allahumma inni a\'uzu bika minal-hammi wal-hazan, wal-\'ajzi wal-kasal, wal-bukhli wal-jubn, wa dala\'id-daini wa ghalabatir-rijal', 'Ya Allah, aku berlindung kepada-Mu daripada kerisauan dan kesedihan, kelemahan dan kemalasan, kebakhilan dan sifat pengecut, beban hutang dan dikuasai orang lain.', 'Riwayat al-Bukhari'],
      ['Kebaikan dunia dan akhirat', 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', 'Rabbana atina fid-dunya hasanah wa fil-akhirati hasanah wa qina \'azaban-nar', 'Wahai Tuhan kami, berikanlah kami kebaikan di dunia dan kebaikan di akhirat, dan peliharalah kami daripada azab neraka.', 'Surah Al-Baqarah, 2:201']
    ] }
  ];

  // [arab, rumi, maksud]
  const ASMA = `الرحمن|Ar-Rahman|Yang Maha Pemurah
الرحيم|Ar-Rahim|Yang Maha Penyayang
الملك|Al-Malik|Yang Maha Merajai
القدوس|Al-Quddus|Yang Maha Suci
السلام|As-Salam|Yang Maha Sejahtera
المؤمن|Al-Mu'min|Yang Maha Memberi Keamanan
المهيمن|Al-Muhaimin|Yang Maha Memelihara
العزيز|Al-'Aziz|Yang Maha Perkasa
الجبار|Al-Jabbar|Yang Maha Gagah
المتكبر|Al-Mutakabbir|Yang Maha Megah
الخالق|Al-Khaliq|Yang Maha Pencipta
البارئ|Al-Bari'|Yang Maha Mengadakan
المصور|Al-Musawwir|Yang Maha Membentuk Rupa
الغفار|Al-Ghaffar|Yang Maha Pengampun
القهار|Al-Qahhar|Yang Maha Menundukkan
الوهاب|Al-Wahhab|Yang Maha Pemberi Kurnia
الرزاق|Ar-Razzaq|Yang Maha Pemberi Rezeki
الفتاح|Al-Fattah|Yang Maha Pembuka Rahmat
العليم|Al-'Alim|Yang Maha Mengetahui
القابض|Al-Qabidh|Yang Maha Menyempitkan
الباسط|Al-Basith|Yang Maha Melapangkan
الخافض|Al-Khafidh|Yang Maha Merendahkan
الرافع|Ar-Rafi'|Yang Maha Meninggikan
المعز|Al-Mu'izz|Yang Maha Memuliakan
المذل|Al-Mudzill|Yang Maha Menghinakan
السميع|As-Sami'|Yang Maha Mendengar
البصير|Al-Basir|Yang Maha Melihat
الحكم|Al-Hakam|Yang Maha Menetapkan Hukum
العدل|Al-'Adl|Yang Maha Adil
اللطيف|Al-Latif|Yang Maha Lembut
الخبير|Al-Khabir|Yang Maha Mengetahui Rahsia
الحليم|Al-Halim|Yang Maha Penyantun
العظيم|Al-'Azim|Yang Maha Agung
الغفور|Al-Ghafur|Yang Maha Pengampun
الشكور|Asy-Syakur|Yang Maha Membalas Kebaikan
العلي|Al-'Aliy|Yang Maha Tinggi
الكبير|Al-Kabir|Yang Maha Besar
الحفيظ|Al-Hafiz|Yang Maha Memelihara
المقيت|Al-Muqit|Yang Maha Pemberi Kecukupan
الحسيب|Al-Hasib|Yang Maha Membuat Perhitungan
الجليل|Al-Jalil|Yang Maha Luhur
الكريم|Al-Karim|Yang Maha Pemurah
الرقيب|Ar-Raqib|Yang Maha Mengawasi
المجيب|Al-Mujib|Yang Maha Memperkenankan Doa
الواسع|Al-Wasi'|Yang Maha Luas
الحكيم|Al-Hakim|Yang Maha Bijaksana
الودود|Al-Wadud|Yang Maha Mengasihi
المجيد|Al-Majid|Yang Maha Mulia
الباعث|Al-Ba'ith|Yang Maha Membangkitkan
الشهيد|Asy-Syahid|Yang Maha Menyaksikan
الحق|Al-Haqq|Yang Maha Benar
الوكيل|Al-Wakil|Yang Maha Memelihara Urusan
القوي|Al-Qawiy|Yang Maha Kuat
المتين|Al-Matin|Yang Maha Kukuh
الولي|Al-Waliy|Yang Maha Melindungi
الحميد|Al-Hamid|Yang Maha Terpuji
المحصي|Al-Muhshi|Yang Maha Menghitung
المبدئ|Al-Mubdi'|Yang Maha Memulakan
المعيد|Al-Mu'id|Yang Maha Mengembalikan
المحيي|Al-Muhyi|Yang Maha Menghidupkan
المميت|Al-Mumit|Yang Maha Mematikan
الحي|Al-Hayy|Yang Maha Hidup
القيوم|Al-Qayyum|Yang Maha Berdiri Sendiri
الواجد|Al-Wajid|Yang Maha Penemu
الماجد|Al-Maajid|Yang Maha Mulia
الواحد|Al-Wahid|Yang Maha Esa
الأحد|Al-Ahad|Yang Maha Tunggal
الصمد|As-Samad|Yang Maha Diperlukan
القادر|Al-Qadir|Yang Maha Berkuasa
المقتدر|Al-Muqtadir|Yang Maha Menentukan
المقدم|Al-Muqaddim|Yang Maha Mendahulukan
المؤخر|Al-Mu'akhkhir|Yang Maha Mengakhirkan
الأول|Al-Awwal|Yang Maha Awal
الآخر|Al-Akhir|Yang Maha Akhir
الظاهر|Az-Zahir|Yang Maha Nyata
الباطن|Al-Batin|Yang Maha Tersembunyi
الوالي|Al-Wali|Yang Maha Memerintah
المتعالي|Al-Muta'ali|Yang Maha Tinggi Darjat-Nya
البر|Al-Barr|Yang Maha Dermawan
التواب|At-Tawwab|Yang Maha Penerima Taubat
المنتقم|Al-Muntaqim|Yang Maha Pembalas
العفو|Al-'Afuww|Yang Maha Pemaaf
الرؤوف|Ar-Ra'uf|Yang Maha Pengasih
مالك الملك|Malikul Mulk|Yang Mempunyai Kerajaan
ذو الجلال والإكرام|Dzul Jalali wal Ikram|Yang Mempunyai Kebesaran dan Kemuliaan
المقسط|Al-Muqsit|Yang Maha Saksama
الجامع|Al-Jami'|Yang Maha Mengumpulkan
الغني|Al-Ghaniy|Yang Maha Kaya
المغني|Al-Mughni|Yang Maha Mengayakan
المانع|Al-Mani'|Yang Maha Mencegah
الضار|Adh-Dharr|Yang Maha Memberi Mudarat
النافع|An-Nafi'|Yang Maha Memberi Manfaat
النور|An-Nur|Yang Maha Bercahaya
الهادي|Al-Hadi|Yang Maha Pemberi Petunjuk
البديع|Al-Badi'|Yang Maha Pencipta Tanpa Contoh
الباقي|Al-Baqi|Yang Maha Kekal
الوارث|Al-Warith|Yang Maha Mewarisi
الرشيد|Ar-Rasyid|Yang Maha Pandai
الصبور|As-Sabur|Yang Maha Sabar`.split('\n').map(l => l.split('|'));

  // Juz: [surah, ayat permulaan]
  const JUZ = [[1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41], [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56], [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1]];

  // Peristiwa: [bulan hijri, hari, nama]
  const EVENTS = [[1, 1, 'Awal Muharram'], [1, 10, 'Hari Asyura'], [3, 12, 'Maulidur Rasul'], [7, 27, 'Israk dan Mikraj'], [8, 15, 'Nisfu Syaaban'], [9, 1, 'Awal Ramadan'], [9, 17, 'Nuzul Al-Quran'], [10, 1, 'Hari Raya Aidilfitri'], [12, 9, 'Hari Arafah'], [12, 10, 'Hari Raya Aidiladha']];

  // Panduan: { title, intro, steps: [[tajuk, isi]], notes }
  const UMRAH = {
    intro: 'Umrah boleh dilakukan sepanjang tahun. Rukun umrah menurut mazhab Syafie ialah ihram, tawaf, saie, bercukur atau bergunting, dan tertib.',
    steps: [
      ['Ihram dan niat di miqat', 'Mandi sunat, memakai pakaian ihram (lelaki: dua helai kain tidak berjahit), solat sunat ihram, kemudian berniat umrah sebelum melepasi miqat. Bagi jemaah Malaysia yang terbang terus ke Jeddah, miqat biasanya di udara (Qarnul Manazil) atau Yalamlam.'],
      ['Talbiah', 'Perbanyakkan talbiah sejak berniat hingga mula tawaf: Labbaikallahumma labbaik, labbaika la syarika laka labbaik, innal-hamda wan-ni\'mata laka wal-mulk, la syarika lak.'],
      ['Tawaf', 'Tujuh pusingan mengelilingi Kaabah, bermula dan berakhir di garisan Hajarul Aswad, dengan Kaabah di sebelah kiri. Wajib berwuduk dan menutup aurat.'],
      ['Solat sunat tawaf', 'Dua rakaat di belakang Maqam Ibrahim jika mampu, atau di mana-mana dalam Masjidil Haram. Kemudian minum air zamzam.'],
      ['Saie', 'Tujuh kali perjalanan antara Bukit Safa dan Marwah, bermula di Safa dan berakhir di Marwah. Lelaki berlari-lari anak antara dua lampu hijau.'],
      ['Bercukur atau bergunting', 'Lelaki afdal bercukur seluruh kepala. Wanita memotong sekurang-kurangnya tiga helai rambut. Dengan ini umrah selesai dan larangan ihram terangkat.']
    ],
    notes: 'Panduan ringkas. Ikuti kursus haji dan umrah Lembaga Tabung Haji atau pembimbing ibadah yang bertauliah.'
  };
  const HAJI = {
    intro: 'Haji dilaksanakan pada 8 hingga 13 Zulhijjah. Rukun haji (Syafie): ihram, wukuf di Arafah, tawaf ifadah, saie, bercukur atau bergunting, dan tertib. Wajib haji yang tertinggal perlu dibayar dam.',
    steps: [
      ['Ihram (sebelum 8 Zulhijjah)', 'Berniat haji di miqat. Jemaah haji tamattu\' melakukan umrah dahulu, kemudian berihram haji dari Makkah pada 8 Zulhijjah.'],
      ['8 Zulhijjah: Hari Tarwiyah', 'Bergerak ke Mina (sunat bermalam). Jemaah Malaysia biasanya terus ke Arafah mengikut jadual Tabung Haji.'],
      ['9 Zulhijjah: Wukuf di Arafah', 'Rukun terpenting. Berada di Arafah walaupun seketika antara gelincir matahari hingga terbit fajar 10 Zulhijjah. Perbanyakkan doa dan zikir.'],
      ['Malam 10: Mabit di Muzdalifah', 'Bermalam (sekurang-kurangnya melepasi tengah malam) dan mengutip batu untuk melontar.'],
      ['10 Zulhijjah: Hari Nahar', 'Melontar Jamrah Aqabah 7 biji, menyembelih korban atau dam, bercukur atau bergunting (tahallul awal), kemudian tawaf ifadah dan saie (tahallul thani).'],
      ['11 hingga 13 Zulhijjah: Hari Tasyrik', 'Mabit di Mina dan melontar ketiga-tiga jamrah (Ula, Wusta, Aqabah) 7 biji setiap satu selepas gelincir matahari. Boleh nafar awal pada 12 Zulhijjah sebelum maghrib.'],
      ['Tawaf wada\'', 'Tawaf selamat tinggal sebelum meninggalkan Makkah. Wajib kecuali bagi wanita yang haid.']
    ],
    notes: 'Wajib haji: ihram dari miqat, mabit di Muzdalifah, mabit di Mina, melontar jamrah, tawaf wada\', dan menjauhi larangan ihram. Rujuk Lembaga Tabung Haji untuk panduan penuh.'
  };
  const HAID = {
    intro: 'Panduan ringkas menurut mazhab Syafie. Untuk keadaan yang tidak biasa, rujuk ustazah atau pejabat agama.',
    facts: [
      ['Tempoh paling singkat', '1 hari 1 malam (24 jam).'],
      ['Tempoh kebiasaan', '6 atau 7 hari.'],
      ['Tempoh paling lama', '15 hari 15 malam. Darah selepas itu ialah istihadah.'],
      ['Suci paling singkat antara dua haid', '15 hari.'],
      ['Umur paling awal', 'Kira-kira 9 tahun qamariah.']
    ],
    forbidden: ['Solat (tidak perlu diqada)', 'Puasa (wajib diqada)', 'Tawaf', 'Menyentuh dan membawa mushaf', 'Berada di dalam masjid', 'Jimak'],
    allowed: ['Berzikir, berdoa dan berselawat', 'Mendengar bacaan Al-Quran', 'Membaca ayat Al-Quran dengan niat zikir atau doa, bukan niat membaca Al-Quran', 'Menghadiri majlis ilmu di luar ruang solat masjid'],
    end: 'Apabila darah berhenti, mandi wajib dengan niat mengangkat hadas haid, kemudian tunaikan solat yang masuk waktunya. Jika suci sebelum waktu solat tamat, solat itu wajib ditunaikan.'
  };

  const FAQ = [
    ['Dari mana waktu solat diambil?', 'Daripada data rasmi JAKIM melalui api.waktusolat.app, mengikut zon yang anda pilih. Data disimpan dalam peranti untuk kegunaan luar talian.'],
    ['Kenapa tarikh Hijri berbeza sehari?', 'Kalendar dikira mengikut Umm al-Qura. Malaysia menentukan awal bulan melalui rukyah dan hisab, jadi tarikh boleh berbeza sehari. Laraskan dalam Tetapan.'],
    ['Adakah Al-Quran boleh dibaca tanpa internet?', 'Surah yang pernah dibuka disimpan dalam peranti dan boleh dibaca semula tanpa internet. Audio memerlukan internet.'],
    ['Di mana data saya disimpan?', 'Semua rekod solat, tasbih, penanda dan profil disimpan dalam peranti anda sahaja. Tiada akaun diperlukan.'],
    ['Saya jumpa kesilapan dalam doa atau terjemahan.', 'Terjemahan Al-Quran ialah Tafsir Pimpinan Ar-Rahman (Abdullah Basmeih). Untuk doa, sila laporkan kepada kami supaya dapat disemak semula.'],
    ['Kenapa kompas kiblat tidak berpusing?', 'Kompas langsung memerlukan sensor arah dan kebenaran gerakan. Di iPhone, tekan Kesan arah kiblat dan benarkan akses. Di komputer, gunakan darjah yang dipaparkan.']
  ];

  return { DOA, ASMA, JUZ, EVENTS, UMRAH, HAJI, HAID, FAQ };
})();
