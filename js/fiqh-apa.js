/* SiswaCap: rujukan gaya APA edisi ke-7 bagi setiap sumber Tanya AI Fiqh (kitab, dokumen rasmi, fatwa, laman Mufti,
   Al-Quran, hadis dan laman web lain), berserta petikan dalam teks dan senarai rujukan yang disusun mengikut abjad.
   Unsur APA ditulis dalam bentuk asal APA (n.d., p., Vol., Trans.). Tajuk karya dalam huruf condong dan huruf besar ayat.
   Tiada DOM di sini supaya modul ini boleh diuji dalam Node (worker-fiqh/test.mjs). */
const FiqhApa = (() => {
  const D = globalThis.FiqhData;
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BULAN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const BULAN_MS = ['januari', 'februari', 'mac', 'april', 'mei', 'jun', 'julai', 'ogos', 'september', 'oktober', 'november', 'disember'];
  const SHAMELA = 'Al-Maktabah al-Shamilah';

  /* Pengarang: [nama keluarga atau nisbah, inisial]; inisial kosong bagi nama tunggal (cth. Muslim ibn al-Hajjaj).
     Tajuk transliterasi dalam huruf besar ayat; nama khas dan tajuk kitab lain di dalamnya kekal berhuruf besar. */
  const KITAB = {
    abisyuja: [[['Al-Asfahani', 'A. H.']], "Matan Abi Syuja': Al-Ghayah wa al-taqrib"],
    fathqarib: [[['Al-Ghazzi', 'M. Q.']], 'Fath al-qarib al-mujib'],
    minhaj: [[['Al-Nawawi', 'Y. S.']], 'Minhaj al-talibin'],
    manhaji: [[['Al-Khin', 'M.'], ['Al-Bugha', 'M.'], ['Al-Syarbaji', 'A.']], "Al-Fiqh al-manhaji 'ala mazhab al-Imam al-Syafi'i"],
    kifayah: [[['Al-Hisni', 'A. B. M.']], 'Kifayah al-akhyar fi hall Ghayah al-ikhtisar'],
    asybah: [[['Al-Suyuti', 'A. R.']], "Al-Asybah wa al-naza'ir"],
    bulugh: [[['Al-Asqalani', 'A. A.']], 'Bulugh al-maram min adillah al-ahkam'],
    bidayah: [[['Ibn Rusyd', 'M. A.']], 'Bidayah al-mujtahid wa nihayah al-muqtasid'],
    ianah: [[['Al-Dimyati', 'A. B. S.']], "I'anah al-talibin 'ala hall alfaz Fath al-mu'in"],
    mughni: [[['Al-Syarbini', 'M. A.']], "Mughni al-muhtaj ila ma'rifah ma'ani alfaz al-Minhaj"],
    raudhah: [[['Al-Nawawi', 'Y. S.']], "Raudhah al-talibin wa 'umdah al-muftin"],
    majmu: [[['Al-Nawawi', 'Y. S.']], "Al-Majmu' syarh al-Muhazzab"],
    zuhaili: [[['Al-Zuhaili', 'W.']], 'Al-Fiqh al-Islami wa adillatuh']
  };
  // Koleksi hadis di sunnah.com: pengumpul dan tajuk koleksi
  const HADIS = {
    bukhari: [['Al-Bukhari', 'M. I.'], 'Sahih al-Bukhari'],
    muslim: [['Muslim ibn al-Hajjaj', ''], 'Sahih Muslim'],
    abudawud: [['Abu Dawud', 'S. A.'], 'Sunan Abi Dawud'],
    tirmidhi: [['Al-Tirmizi', 'M. I.'], "Jami' al-Tirmizi"],
    nasai: [["Al-Nasa'i", 'A. S.'], "Sunan al-Nasa'i"],
    ibnmajah: [['Ibn Majah', 'M. Y.'], 'Sunan Ibn Majah'],
    malik: [['Malik ibn Anas', ''], "Al-Muwatta'"],
    ahmad: [['Ibn Hanbal', 'A. M.'], 'Musnad Ahmad'],
    darimi: [['Al-Darimi', 'A. A.'], 'Sunan al-Darimi'],
    riyadussalihin: [['Al-Nawawi', 'Y. S.'], 'Riyad al-salihin'],
    nawawi40: [['Al-Nawawi', 'Y. S.'], "Al-Arba'in al-Nawawiyyah"],
    bulugh: [['Al-Asqalani', 'A. A.'], 'Bulugh al-maram min adillah al-ahkam']
  };
  // Dokumen keputusan rasmi moden (PDF): pengarang berkumpulan, tajuk, edisi
  const MODEN = {
    jakim: ['Jabatan Kemajuan Islam Malaysia', 'Kompilasi pandangan hukum Muzakarah Jawatankuasa Fatwa Majlis Kebangsaan Bagi Hal Ehwal Ugama Islam Malaysia'],
    scmps: ['Suruhanjaya Sekuriti Malaysia', 'Keputusan Majlis Penasihat Syariah Suruhanjaya Sekuriti Malaysia'],
    bnmsr: ['Bank Negara Malaysia', 'Shariah resolutions in Islamic finance', '2nd ed.'],
    iifa: ['International Islamic Fiqh Academy', 'Resolutions of the International Islamic Fiqh Academy (sessions 1–25, 1985–2023)']
  };
  /* Fatwa yang disenaraikan dalam bahagian Fiqh (FiqhData.F): [pengarang, tahun, bulan-hari, tajuk, dipetik daripada (sumber kedua), lokasi].
     Keputusan Muzakarah yang dibaca melalui laman lain dipetik sebagai sumber kedua APA ("as cited in"). */
  const FATWA = {
    scKripto: ['Majlis Penasihat Syariah Suruhanjaya Sekuriti Malaysia', '2020', '', 'Resolusi aset digital: Mesyuarat ke-233 dan ke-234'],
    scSaringan: ['Suruhanjaya Sekuriti Malaysia', '', '', 'Soalan lazim kaedah saringan Syariah sekuriti'],
    scSenarai: ['Suruhanjaya Sekuriti Malaysia', '2023', '', 'Keputusan Majlis Penasihat Syariah Suruhanjaya Sekuriti Malaysia'],
    selZakatSaham: ['Jabatan Mufti Negeri Selangor', '2023', 'October 28', 'Hukum zakat pelaburan saham'],
    mkiForex: ['Jabatan Mufti Negeri Selangor', '', '', 'Hukum forex oleh individu secara lani melalui platform elektronik', ['Muzakarah Jawatankuasa Fatwa Majlis Kebangsaan', '2012']],
    mkiEmas: ['Maybank Islamic', '', '', 'Gold investment parameters', ['Muzakarah Jawatankuasa Fatwa Majlis Kebangsaan', '2011']],
    scNiaga: ['Suruhanjaya Sekuriti Malaysia', '', '', 'Keputusan Majlis Penasihat Syariah Suruhanjaya Sekuriti', '', 'pp. 84, 89', '2nd ed.'],
    iifa63: ['International Islamic Fiqh Academy', '1992', '', 'Resolution no. 63 (1/7) on financial markets'],
    wpQasar: ['Pejabat Mufti Wilayah Persekutuan', '', '', 'Al-Kafi #1177: Hukum solat jamak qasar semasa musafir tanpa bermalam']
  };
  // Pemilik laman web lain yang dibenarkan sebagai sumber Tanya AI
  const HOS = {
    'islam.gov.my': 'Jabatan Kemajuan Islam Malaysia', 'sc.com.my': 'Suruhanjaya Sekuriti Malaysia', 'bnm.gov.my': 'Bank Negara Malaysia',
    'iifa-aifi.org': 'International Islamic Fiqh Academy', 'zakat.com.my': 'Lembaga Zakat Selangor'
  };
  const MUFTI_HOS = {};
  (D.MUFTI || []).forEach(m => [...m.laman, ...(m.tambahan || []), ...(m.fail || [])].forEach(u => { MUFTI_HOS[new URL(u).hostname.replace(/^www\./, '')] = m; }));
  // e-SMAF ialah portal JAKIM; jabatan lain ialah pengarang dan pemilik laman sendiri
  const muftiNama = m => m.k === 'esmaf' ? 'Jabatan Kemajuan Islam Malaysia' : m.by;
  const KITAB_ID = Object.fromEntries(Object.entries(D.KITAB).map(([k, b]) => [String(b.id), k]));

  /* ---------- Huruf besar ayat (sentence case) ---------- */
  // Kata nama khas yang kekal berhuruf besar; akronim (cth. ASB, KWSP), perkataan bersempang seperti Al-Kafi dan perkataan bernombor juga dikekalkan
  const KHAS = new Set(('allah nabi rasulullah muhammad islam muslim quran syariah syafie hanafi maliki hanbali tuhan '
    + 'malaysia melayu arab inggeris mekah makkah madinah kaabah baitullah masjidilharam nabawi palestin '
    + 'johor kedah kelantan melaka pahang perak perlis pinang sabah sarawak selangor terengganu sembilan wilayah persekutuan kuala lumpur putrajaya labuan '
    + 'isnin selasa rabu khamis jumaat sabtu ahad januari februari mac april mei jun julai ogos september oktober november disember '
    + 'muharam muharram safar rabiulawal rabiulakhir jamadilawal jamadilakhir rejab syaaban ramadan syawal zulkaedah zulhijah zulhijjah aidilfitri aidiladha '
    + 'muzakarah linnas kafi irsyad bayan').split(' '));
  // Nama institusi dan tempat yang terdiri daripada beberapa perkataan
  const FRASA = ['Jawatankuasa Fatwa', 'Majlis Fatwa', 'Majlis Kebangsaan', 'Majlis Agama Islam', 'Jabatan Mufti', 'Pejabat Mufti', 'Majlis Penasihat Syariah',
    'Suruhanjaya Sekuriti', 'Bank Negara', 'Lembaga Zakat', 'Tabung Haji', 'Amanah Saham', 'Hari Raya', 'Negeri Sembilan', 'Pulau Pinang', 'Kuala Lumpur', 'Wilayah Persekutuan', 'Bayan Linnas']
    .map(f => [new RegExp(`\\b${f.replace(' ', '\\s+')}\\b`, 'giu'), f]);
  const AKRONIM = new Set('ASB ASN KWSP EPF SAW SWT JAKIM MAIS MAIWP JAIS SC BNM IIFA OIC PTPTN LHDN SPM STPM COVID LGBT MLM ETF REIT KLCI FBM DAX NFT AI DNA IVF PDF MKI TH SST GST'.split(' '));
  const hurufBesar = t => { const w = t.match(/\p{L}+/gu) || []; return w.length && w.filter(x => x === x.toUpperCase()).length / w.length > 0.8; };
  const tajukBesar = t => { const w = (t.match(/\p{L}[\p{L}'’-]*/gu) || []).filter(x => x.length > 3); return w.length >= 2 && w.filter(x => /^\p{Lu}/u.test(x)).length / w.length >= 0.6; };
  function ayat(t) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    if (!t) return t;
    const besar = hurufBesar(t);
    if (!besar && !tajukBesar(t)) return t;
    let mula = true;
    const out = t.replace(/[\p{L}\p{N}][\p{L}\p{N}'’-]*|[:?!.]/gu, w => {
      if (/^[:?!.]$/.test(w)) { if (w !== '.') mula = true; return w; }
      const awal = mula; mula = false;
      const kecil = w.toLowerCase(), asas = kecil.replace(/['’]s?$/, '');
      let out;
      if (besar && AKRONIM.has(w.replace(/[^\p{L}]/gu, ''))) out = w;
      else if (!besar && w.length > 1 && w === w.toUpperCase() && /\p{Lu}.*\p{Lu}/u.test(w)) out = w; // akronim dalam tajuk biasa
      else if (/\d/.test(w)) out = kecil;
      else if (/^(al|an|ar|as|asy|at|az|ad|ash)-/i.test(w)) out = besar ? kecil.replace(/^(\p{L}+)-(\p{L})/u, (m, a, b) => a + '-' + b.toUpperCase()) : w;
      else if (KHAS.has(asas)) out = kecil.charAt(0).toUpperCase() + kecil.slice(1);
      else out = kecil;
      return awal ? out.charAt(0).toUpperCase() + out.slice(1) : out;
    });
    return FRASA.reduce((x, [re, f]) => x.replace(re, f), out);
  }

  /* ---------- Pembantu ---------- */
  const titik = s => /[.?!]$/.test(s) ? s : s + '.';
  const tarikhIso = t => { const m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m && +m[2] >= 1 && +m[2] <= 12 ? { y: m[1], md: `${BULAN[+m[2] - 1]} ${+m[3]}` } : null; };
  // "Jabatan Mufti Negeri Sabah, 1 Ogos 2019" (jawapan lama dalam cache tiada medan tarikh)
  const tarikhMs = t => { const m = String(t || '').match(/(\d{1,2}) (\p{L}+) (\d{4})\s*$/u), b = m ? BULAN_MS.indexOf(m[2].toLowerCase()) : -1; return b >= 0 ? { y: m[3], md: `${BULAN[b]} ${+m[1]}` } : null; };
  const tarikhUrl = u => { const m = String(u || '').match(/\/((?:19|20)\d{2})\/(\d{2})\/(\d{2})\//); return m ? tarikhIso(`${m[1]}-${m[2]}-${m[3]}`) : null; };
  // Buang penanda muka surat PDF dan sorotan teks; laluan # aplikasi (cth. #ibadah/fiqh/...) dikekalkan
  const tanpaKepala = u => String(u || '').replace(/#(page=\d+|:~:text=.*)$/, '');
  const hos = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  // Padanan hos termasuk subdomain (cth. efatwa.muftiwp.gov.my milik muftiwp.gov.my)
  const cariHos = (map, u) => { const x = hos(u), k = x && Object.keys(map).find(d => x === d || x.endsWith('.' + d)); return k ? map[k] : null; };
  const orang = list => list.map(([n, i]) => ({ n, i }));
  // Nama pengarang dalam senarai rujukan: "A, I., B, I., & C, I."
  function namaRujukan(p) {
    if (!p.length) return '';
    const s = p.map(a => a.i ? `${a.n}, ${a.i}` : a.n);
    return s.length === 1 ? s[0] : s.length === 2 ? `${s[0]}, & ${s[1]}` : `${s.slice(0, -1).join(', ')}, & ${s[s.length - 1]}`;
  }
  // Nama dalam teks: satu atau dua pengarang disebut; tiga atau lebih ditulis "et al."
  const namaTeks = (p, naratif) => p.length === 1 ? p[0].n : p.length === 2 ? `${p[0].n} ${naratif ? 'and' : '&'} ${p[1].n}` : `${p[0].n} et al.`;
  const lokasi = (jilid, hlm) => [jilid && `Vol. ${jilid}`, hlm && (/^pp?\. /.test(hlm) ? hlm : `p. ${hlm}`)].filter(Boolean).join(', ');

  /* ---------- Satu sumber kepada butiran APA ----------
     Pulangan: { pengarang: [{n, i}], kumpulan, tajuk, jenisTajuk ('buku'|'laman'), tambahan, tahun, md, sumber, url, lokasi, dalam (sumber kedua), pdf } */
  function butiran(s) {
    if (!s || typeof s !== 'object') return null;
    const id = String(s.id || ''), url = String(s.url || ''), [jenisId, k] = id.split(':');
    // Al-Quran: karya agama dirujuk sebagai buku; nombor surah dan ayat dalam petikan teks
    const q = s.jenis === 'quran' && String(s.ref || '').match(/^(\d{1,3}):(\d{1,3})$/) || (!s.jenis || s.jenis === 'lain') && url.match(/^https:\/\/quran\.com\/(\d{1,3})\/(\d{1,3})/);
    if (q) {
      const nama = globalThis.QuranSrc && QuranSrc.nama ? QuranSrc.nama(+q[1]) : '';
      return { pengarang: [], tajuk: 'Al-Quran al-Karim', jenisTajuk: 'buku', tambahan: 'A. M. Basmeih, Trans.', sumber: 'Quran.com', url: 'https://quran.com/',
        lokasi: `${nama ? nama + ' ' : ''}${+q[1]}:${+q[2]}` };
    }
    // Hadis: koleksi sebagai buku, nombor hadis dalam petikan teks
    const hk = jenisId === 'hadis' && D.H[k], sm = !hk && url.match(/^https:\/\/sunnah\.com\/([a-z0-9]+)(?::(\d+))?/);
    const kol = hk ? hk.c : sm && sm[1];
    if (kol && HADIS[kol]) {
      const [p, tajuk] = HADIS[kol];
      return { pengarang: orang([p]), tajuk, jenisTajuk: 'buku', sumber: 'Sunnah.com', url: `https://sunnah.com/${kol}`, lokasi: hk ? `Hadith ${hk.n.replace(/[a-z]$/, '')}` : sm[2] ? `Hadith ${sm[2]}` : '' };
    }
    // Kitab: edisi digital Al-Maktabah al-Shamilah; juz dan halaman cetakan daripada penanda halaman Shamela
    const sh = url.match(/^https:\/\/shamela\.ws\/book\/(\d+)/), kk = jenisId === 'kitab' && D.KITAB[k] ? k : sh && KITAB_ID[sh[1]];
    if (kk && KITAB[kk]) {
      const [p, tajuk] = KITAB[kk];
      return { pengarang: orang(p), tajuk, jenisTajuk: 'buku', sumber: SHAMELA, url: D.shamela(D.KITAB[kk].id), lokasi: lokasi(s.jilid, s.halaman) };
    }
    if (sh || s.jenis === 'kitab') return { pengarang: [], tajuk: ayat(s.tajuk || 'Kitab'), jenisTajuk: 'buku', sumber: SHAMELA, url: sh ? `https://shamela.ws/book/${sh[1]}` : tanpaKepala(url), lokasi: lokasi(s.jilid, s.halaman) };
    // Dokumen keputusan rasmi moden (PDF): nombor muka surat ialah muka surat PDF
    const dk = jenisId === 'pdf' && MODEN[k] ? k : s.jenis === 'dokumen' && (D.MODEN.find(m => m.name === s.tajuk) || {}).k;
    if (dk && MODEN[dk]) {
      const [kumpulan, tajuk, edisi] = MODEN[dk], m = D.MODEN.find(x => x.k === dk);
      return { pengarang: [], kumpulan, tajuk, jenisTajuk: 'buku', tambahan: edisi || '', tahun: String(m.tahun), url: m.url, lokasi: lokasi('', s.pdf ? String(s.pdf) : ''), pdf: !!s.pdf };
    }
    // Fatwa yang disenaraikan dalam bahagian Fiqh
    const fk = jenisId === 'fatwa' && FATWA[k] ? k : '';
    if (fk) {
      const [kumpulan, tahun, md, tajuk, dalam, lok, edisi] = FATWA[fk], f = D.F[fk];
      const pdf = /download\.ashx|\.pdf\b/i.test(f.url);
      return { pengarang: [], kumpulan, tajuk, jenisTajuk: pdf ? 'buku' : 'laman', tambahan: edisi || '', tahun, md, url: f.url, lokasi: lok || '', dalam: dalam ? { nama: dalam[0], tahun: dalam[1] } : null };
    }
    // Artikel laman Jabatan Mufti (fatwa, irsyad, soal jawab): halaman web dengan tarikh terbit
    const m = (s.negeri && D.MUFTI.find(x => x.negeri === s.negeri)) || cariHos(MUFTI_HOS, url);
    const pdfUrl = /\.pdf(?:$|[?#])|public_att_dl/i.test(url), muka = (url.match(/#page=(\d+)/) || [])[1];
    if (m) {
      const t = tarikhIso(s.tarikh) || tarikhMs(s.oleh) || tarikhUrl(url) || {};
      return { pengarang: [], kumpulan: muftiNama(m), tajuk: ayat(s.tajuk || m.by), jenisTajuk: pdfUrl ? 'buku' : 'laman', sumber: m.k === 'esmaf' ? 'e-SMAF' : '',
        tahun: t.y || '', md: pdfUrl ? '' : t.md || '', url: tanpaKepala(url), lokasi: muka ? `p. ${muka}` : '', pdf: !!muka };
    }
    // Rujukan SiswaCap (ringkasan bahagian Fiqh)
    if (jenisId === 'masalah' || s.jenis === 'bijaklabur') return { pengarang: [], kumpulan: 'SiswaCap', tajuk: ayat(s.tajuk), jenisTajuk: 'laman', url: tanpaKepala(url) };
    // Laman rasmi lain: pemilik laman sebagai pengarang; jika tidak dikenali, tajuk didahulukan
    if (!url) return null;
    const pemilik = cariHos(HOS, url), t = tarikhUrl(url) || {};
    return { pengarang: [], kumpulan: pemilik || '', tajuk: ayat(s.tajuk || hos(url)), jenisTajuk: pdfUrl ? 'buku' : 'laman', sumber: pemilik ? '' : hos(url),
      tahun: t.y || '', md: t.md || '', url: tanpaKepala(url), lokasi: muka ? `p. ${muka}` : lokasi(s.jilid, s.halaman), pdf: !!muka };
  }

  /* ---------- Rujukan dan petikan dalam teks ---------- */
  const kunci = b => b.url + '|' + b.tajuk;
  const kepala = b => b.pengarang.length ? namaRujukan(b.pengarang) : b.kumpulan || '';
  const tarikhTeks = (b, akhiran = '') => b.tahun ? `${b.tahun}${akhiran}${b.md ? ', ' + b.md : ''}` : `n.d.${akhiran ? '-' + akhiran : ''}`;
  // Bahagian rujukan: [{ t, i (condong) }]
  function bahagian(b, akhiran = '') {
    const out = [], a = kepala(b), tarikh = `(${tarikhTeks(b, akhiran)}). `;
    const tajuk = b.tambahan ? [{ t: b.tajuk, i: 1 }, { t: ` (${b.tambahan}). ` }] : [{ t: b.tajuk, i: 1 }, { t: /[.?!]$/.test(b.tajuk) ? ' ' : '. ' }];
    if (a) out.push({ t: titik(a) + ' ' + tarikh }, ...tajuk);
    else out.push(...tajuk, { t: tarikh });
    if (b.sumber && b.sumber !== a) out.push({ t: titik(b.sumber) + ' ' });
    if (b.url) out.push({ t: b.url });
    return out.filter(x => x.t);
  }
  const html = parts => parts.map(x => x.i ? `<i>${h(x.t)}</i>` : h(x.t)).join('').trim();
  const teks = parts => parts.map(x => x.t).join('').trim();
  // Tajuk dalam teks bagi karya tanpa pengarang: buku dicondongkan, halaman web dalam tanda petik; tajuk panjang dipendekkan
  function tajukPendek(b) {
    const w = b.tajuk.split(/[:.?]/)[0].split(' ');
    return w.length > 6 ? w.slice(0, 4).join(' ') : w.join(' ');
  }
  function dalamTeks(b, akhiran = '') {
    const tarikh = tarikhTeks({ ...b, md: '' }, akhiran), lok = b.lokasi ? ', ' + b.lokasi : '';
    const bina = kaya => {
      const e = kaya ? h : x => String(x);
      const tajuk = () => { const t = e(tajukPendek(b)); return b.jenisTajuk === 'buku' ? (kaya ? `<i>${t}</i>` : t) : `“${t}”`; };
      const nama = naratif => b.pengarang.length ? e(namaTeks(b.pengarang, naratif)) : b.kumpulan ? e(b.kumpulan) : tajuk();
      const ini = `${tarikh}${e(lok)}`;
      // Sumber kedua: keputusan asal yang dibaca melalui laman lain
      if (b.dalam) return { kurung: `(${e(b.dalam.nama)}, ${e(b.dalam.tahun)}, as cited in ${nama(false)}, ${ini})`, naratif: `${e(b.dalam.nama)} (${e(b.dalam.tahun)}, as cited in ${nama(false)}, ${ini})` };
      return { kurung: `(${nama(false)}, ${ini})`, naratif: `${nama(true)} (${ini})` };
    };
    return { teks: bina(false), html: bina(true) };
  }

  /* Rujukan satu sumber (untuk kad sumber): { html, teks, dalam: { teks, html }, pdf } atau null */
  function satu(s, akhiran = '') {
    const b = butiran(s);
    if (!b || !b.tajuk) return null;
    const p = bahagian(b, akhiran);
    return { kunci: kunci(b), html: html(p), teks: teks(p), dalam: dalamTeks(b, akhiran), pdf: !!b.pdf, b };
  }

  /* Senarai rujukan bagi semua sumber satu jawapan:
     - sumber yang merujuk karya yang sama digabung (cth. beberapa ayat Al-Quran atau beberapa halaman kitab yang sama)
     - pengarang dan tahun yang sama bagi karya berbeza diberi huruf a, b, c (n.d.-a, 2023a) mengikut tajuk
     - disusun mengikut abjad unsur pertama (awalan al- diabaikan)
     Pulangan: { senarai: [{ kunci, html, teks }], setiap: [rujukan setiap sumber mengikut susunan asal, atau null] } */
  const abjad = s => s.replace(/<[^>]+>/g, '').replace(/^(al|an|ar|as|asy|at|az|ad)-/i, '').replace(/^[“"'(]+/, '').toLowerCase();
  function senarai(sumber) {
    const bs = (sumber || []).map(butiran), karya = new Map();
    bs.forEach(b => { if (b && b.tajuk && !karya.has(kunci(b))) karya.set(kunci(b), b); });
    // Huruf akhiran tahun bagi pengarang dan tahun yang sama
    const kumpul = new Map(), akhiran = new Map();
    for (const [k, b] of karya) { const g = `${kepala(b) || b.tajuk}|${b.tahun || 'nd'}`; if (!kumpul.has(g)) kumpul.set(g, []); kumpul.get(g).push([k, b]); }
    for (const list of kumpul.values()) {
      if (list.length < 2 || !kepala(list[0][1])) continue;
      list.sort((x, y) => abjad(x[1].tajuk).localeCompare(abjad(y[1].tajuk))).forEach(([k], i) => akhiran.set(k, String.fromCharCode(97 + i)));
    }
    const setiap = (sumber || []).map((s, i) => { const b = bs[i]; return b && b.tajuk ? satu(s, akhiran.get(kunci(b)) || '') : null; });
    const susun = (k, b) => [abjad(kepala(b) || b.tajuk), b.tahun ? '1' + b.tahun : '0', akhiran.get(k) || '', abjad(b.tajuk)].join('\u0001');
    const senarai = [...karya.entries()].sort((x, y) => susun(...x).localeCompare(susun(...y)))
      .map(([k, b]) => { const p = bahagian(b, akhiran.get(k) || ''); return { kunci: k, html: html(p), teks: teks(p) }; });
    return { senarai, setiap };
  }

  return { butiran, satu, senarai, ayat, KITAB, HADIS, MODEN, FATWA };
})();
if (typeof globalThis !== 'undefined') globalThis.FiqhApa = FiqhApa;
