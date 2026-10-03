/* Akademi Moomoo: kandungan pembelajaran, kuiz dan kalkulator */
(function () {
  const candle = (o, h, l, c, label) => {
    const up = c >= o, top = Math.max(o, c), bot = Math.min(o, c);
    const y = v => 10 + (100 - v);
    return `<div style="text-align:center"><svg width="46" height="120" viewBox="0 0 46 120" aria-hidden="true">
      <line x1="23" x2="23" y1="${y(h)}" y2="${y(l)}" stroke="currentColor" stroke-width="2"/>
      <rect x="10" y="${y(top)}" width="26" height="${Math.max(2, top - bot)}" rx="3" fill="${up ? 'var(--up)' : 'var(--down)'}"/></svg>
      <div class="small muted">${label}</div></div>`;
  };

  const MODULES = [
    {
      id: 'mula', name: 'Mula di Moomoo', lessons: [
        { id: 'm1', t: 'Apa itu Moomoo dan kenapa ramai guna', h: `
          <p><b>Moomoo</b> ialah platform pelaburan milik Futu Holdings (tersenarai di NASDAQ: FUTU). Di Malaysia, ia dikendalikan oleh <b>Moomoo Securities Malaysia Sdn Bhd</b> yang dilesenkan oleh <b>Suruhanjaya Sekuriti Malaysia (SC)</b>.</p>
          <ul>
            <li>Boleh beli saham <b>Bursa Malaysia</b> dan <b>Amerika Syarikat</b> (serta ETF) dalam satu app.</li>
            <li>Data pasaran percuma, termasuk Level 2, aliran modal (capital flow) dan kalendar pendapatan.</li>
            <li><b>Paper trading</b> (akaun dagangan olok-olok) untuk berlatih tanpa wang sebenar.</li>
            <li>Komuniti "Moo" untuk berbincang, dan penapis saham (stock screener).</li>
          </ul>
          <div class="tip"><b>Tip:</b> Mulakan dengan paper trading sekurang-kurangnya 2 hingga 4 minggu sebelum menggunakan wang sebenar.</div>` },
        { id: 'm2', t: 'Buka akaun langkah demi langkah', h: `
          <ol>
            <li>Muat turun app <b>moomoo</b> dari App Store atau Google Play, kemudian daftar dengan nombor telefon atau e-mel.</li>
            <li>Pilih <b>Buka Akaun</b> → isi maklumat peribadi seperti dalam MyKad.</li>
            <li>Lakukan <b>eKYC</b>: imbas MyKad dan ambil swafoto (selfie).</li>
            <li>Jawab soalan profil risiko dan pengalaman pelaburan dengan jujur.</li>
            <li>Isi borang <b>W-8BEN</b> (untuk saham AS) supaya anda diiktiraf sebagai bukan pemastautin AS.</li>
            <li>Tunggu kelulusan, biasanya dalam masa beberapa hari bekerja.</li>
          </ol>
          <div class="tip"><b>Penting:</b> Aktifkan 2FA dan kata laluan dagangan (trade password). Jangan kongsi kod OTP dengan sesiapa.</div>` },
        { id: 'm3', t: 'Deposit, tukaran mata wang dan pengeluaran', h: `
          <ul>
            <li><b>Deposit</b> dalam MYR melalui perbankan dalam talian (FPX/DuitNow) dari akaun bank atas nama anda sendiri.</li>
            <li>Untuk saham AS, tukar MYR → USD dalam app (<i>Currency Exchange</i>). Bandingkan kadar dengan kadar pasaran.</li>
            <li><b>Pengeluaran</b> hanya ke akaun bank atas nama yang sama. Dana jualan saham perlu "settle" dahulu.</li>
          </ul>
          <div class="tbl-wrap"><table>
            <tr><th>Pasaran</th><th>Waktu dagangan (waktu Malaysia)</th><th>Penyelesaian</th></tr>
            <tr><td>Bursa Malaysia</td><td>9:00 pg – 12:30 tgh, 2:30 ptg – 5:00 ptg</td><td>T+2</td></tr>
            <tr><td>AS (Mac–Nov, DST)</td><td>9:30 mlm – 4:00 pg</td><td>T+1</td></tr>
            <tr><td>AS (Nov–Mac)</td><td>10:30 mlm – 5:00 pg</td><td>T+1</td></tr>
          </table></div>
          <div class="tip"><b>Ingat:</b> Bursa berdagang dalam <b>lot</b> (1 lot = 100 unit). Saham AS boleh dibeli walaupun 1 unit, malah pecahan saham (fractional) bagi sesetengah kaunter.</div>` },
        { id: 'm4', t: 'Mengenal antaramuka app', h: `
          <div class="tbl-wrap"><table>
            <tr><th>Tab</th><th class="wrap">Kegunaan</th></tr>
            <tr><td>Watchlist</td><td class="wrap">Senarai saham yang anda pantau. Susun mengikut kumpulan (cth. "Dividen", "Teknologi").</td></tr>
            <tr><td>Markets</td><td class="wrap">Heatmap, saham paling aktif, gainers/losers, IPO, sektor.</td></tr>
            <tr><td>Halaman saham</td><td class="wrap">Carta, Level 2 (bid/ask), berita, <b>Financials</b>, <b>Analysis</b> (penilaian penganalisis), capital flow.</td></tr>
            <tr><td>Accounts</td><td class="wrap">Baki, kedudukan (positions), sejarah order, deposit/keluar.</td></tr>
            <tr><td>Paper Trading</td><td class="wrap">Latih strategi dengan modal maya.</td></tr>
          </table></div>` }
      ]
    },
    {
      id: 'order', name: 'Jenis order', lessons: [
        { id: 'o1', t: 'Market, Limit, Stop dan Stop-Limit', h: `
          <div class="tbl-wrap"><table>
            <tr><th>Order</th><th class="wrap">Cara ia berfungsi</th><th class="wrap">Bila guna</th></tr>
            <tr><td><b>Market</b></td><td class="wrap">Beli/jual serta-merta pada harga terbaik semasa.</td><td class="wrap">Saham sangat cair; mahu pasti dapat. Risiko harga "slip".</td></tr>
            <tr><td><b>Limit</b></td><td class="wrap">Hanya laksana pada harga anda atau lebih baik.</td><td class="wrap">Paling disyorkan untuk pemula. Kawal harga.</td></tr>
            <tr><td><b>Stop</b></td><td class="wrap">Jadi market order apabila harga sentuh paras stop.</td><td class="wrap">Stop loss untuk hadkan kerugian.</td></tr>
            <tr><td><b>Stop-Limit</b></td><td class="wrap">Jadi limit order apabila paras stop disentuh.</td><td class="wrap">Kawal harga keluar, tetapi mungkin tidak terlaksana.</td></tr>
            <tr><td><b>Trailing Stop</b></td><td class="wrap">Paras stop bergerak mengikut harga (cth. 5% di bawah harga tertinggi).</td><td class="wrap">Kunci keuntungan semasa trend naik.</td></tr>
          </table></div>` },
        { id: 'o2', t: 'Tempoh order dan sesi lanjutan', h: `
          <ul>
            <li><b>Day</b>: order batal pada akhir hari jika tidak terlaksana.</li>
            <li><b>GTC</b> (Good-Till-Cancelled): kekal sehingga dibatalkan atau tamat tempoh yang ditetapkan broker.</li>
            <li><b>Pre-market / After-hours</b> (AS): dagangan di luar waktu biasa; kecairan rendah, spread lebar. Gunakan limit order sahaja.</li>
          </ul>
          <div class="tip"><b>Contoh:</b> AAPL berharga $190. Anda letak <i>Limit Buy $185 GTC</i>. Order hanya terlaksana jika harga turun ke $185 atau lebih rendah.</div>` },
        { id: 'o3', t: 'Membaca Level 2 (bid/ask) dan spread', h: `
          <p><b>Bid</b> ialah harga tertinggi pembeli sanggup bayar; <b>Ask</b> ialah harga terendah penjual sanggup terima. Beza antaranya ialah <b>spread</b>.</p>
          <ul><li>Spread kecil = saham cair, mudah keluar masuk.</li><li>Banyak order besar di satu paras boleh bertindak sebagai sokongan/rintangan jangka pendek, tetapi order boleh ditarik balik bila-bila masa.</li></ul>` }
      ]
    },
    {
      id: 'fund', name: 'Fundamental saham', lessons: [
        { id: 'f1', t: 'Tiga penyata kewangan utama', h: `
          <ul>
            <li><b>Penyata Pendapatan</b>: hasil (revenue), untung kasar, untung bersih. Adakah ia berkembang setiap tahun?</li>
            <li><b>Kunci Kira-kira</b>: aset, liabiliti, ekuiti. Adakah hutang terkawal?</li>
            <li><b>Penyata Aliran Tunai</b>: tunai sebenar yang masuk keluar. Syarikat sihat menjana <b>aliran tunai bebas (FCF)</b> positif.</li>
          </ul>
          <div class="tip"><b>Di Moomoo:</b> Buka halaman saham → tab <i>Financials</i> → pilih Annual/Quarterly untuk lihat trend 5 tahun.</div>` },
        { id: 'f2', t: 'Nisbah penting yang wajib faham', h: `
          <div class="tbl-wrap"><table>
            <tr><th>Nisbah</th><th>Formula</th><th class="wrap">Panduan umum</th></tr>
            <tr><td><b>EPS</b></td><td>Untung bersih ÷ bil. saham</td><td class="wrap">Naik secara konsisten = baik.</td></tr>
            <tr><td><b>P/E</b></td><td>Harga ÷ EPS</td><td class="wrap">Bandingkan dengan pesaing sektor sama, bukan secara mutlak.</td></tr>
            <tr><td><b>PEG</b></td><td>P/E ÷ kadar pertumbuhan EPS</td><td class="wrap">Sekitar 1 atau kurang dianggap munasabah.</td></tr>
            <tr><td><b>P/B</b></td><td>Harga ÷ nilai buku sesaham</td><td class="wrap">Berguna untuk bank & syarikat aset berat.</td></tr>
            <tr><td><b>ROE</b></td><td>Untung bersih ÷ ekuiti</td><td class="wrap">&gt;15% secara konsisten menunjukkan pengurusan cekap.</td></tr>
            <tr><td><b>Hutang/Ekuiti</b></td><td>Jumlah hutang ÷ ekuiti</td><td class="wrap">&lt;1 lebih selamat (berbeza ikut industri).</td></tr>
            <tr><td><b>Margin bersih</b></td><td>Untung bersih ÷ hasil</td><td class="wrap">Lebih tinggi daripada pesaing = kelebihan daya saing.</td></tr>
            <tr><td><b>Hasil dividen</b></td><td>Dividen tahunan ÷ harga</td><td class="wrap">Pastikan nisbah bayaran (payout) mampan, &lt;70%.</td></tr>
            <tr><td><b>Current ratio</b></td><td>Aset semasa ÷ liabiliti semasa</td><td class="wrap">&gt;1.5 menunjukkan kecairan baik.</td></tr>
          </table></div>` },
        { id: 'f3', t: 'Analisis kualitatif: moat, pengurusan, industri', h: `
          <ul>
            <li><b>Economic moat</b>: jenama kuat, kos beralih tinggi, kesan rangkaian, kelebihan kos, paten.</li>
            <li><b>Pengurusan</b>: rekod prestasi, pemilikan saham oleh pengarah, ketelusan laporan.</li>
            <li><b>Industri</b>: sedang berkembang atau merosot? Siapa pesaing utama?</li>
            <li><b>Risiko</b>: kebergantungan pada satu pelanggan, peraturan kerajaan, kitaran komoditi.</li>
          </ul>` },
        { id: 'f4', t: 'Senarai semak sebelum beli saham', h: `
          <ol>
            <li>Saya faham bagaimana syarikat ini buat duit.</li>
            <li>Hasil dan untung meningkat sekurang-kurangnya 3 hingga 5 tahun.</li>
            <li>FCF positif dan hutang terkawal.</li>
            <li>Penilaian (P/E, PEG) munasabah berbanding pesaing.</li>
            <li>Saya tahu sebab saya beli, dan bila saya akan jual (sasaran + stop loss).</li>
            <li>Saiz kedudukan tidak melebihi had risiko saya.</li>
          </ol>` }
      ]
    },
    {
      id: 'tech', name: 'Analisis teknikal', lessons: [
        { id: 't1', t: 'Membaca candlestick', h: `
          <p>Setiap batang lilin menunjukkan harga <b>Buka, Tinggi, Rendah, Tutup</b> (OHLC) dalam satu tempoh.</p>
          <div class="candle-demo">${candle(30, 80, 20, 70, 'Bullish')}${candle(70, 85, 25, 35, 'Bearish')}${candle(50, 75, 25, 51, 'Doji')}${candle(60, 66, 20, 64, 'Hammer')}${candle(40, 85, 36, 44, 'Shooting star')}</div>
          <ul><li><b>Hijau</b>: tutup lebih tinggi daripada buka. <b>Merah</b>: tutup lebih rendah.</li>
          <li><b>Doji</b>: pasaran ragu-ragu. <b>Hammer</b> di bawah trend turun: kemungkinan berbalik naik.</li></ul>` },
        { id: 't2', t: 'Sokongan, rintangan dan trend', h: `
          <ul>
            <li><b>Sokongan (support)</b>: paras harga di mana pembeli kerap masuk.</li>
            <li><b>Rintangan (resistance)</b>: paras harga di mana penjual kerap keluar.</li>
            <li><b>Trend naik</b>: puncak dan lembah semakin tinggi (higher highs, higher lows).</li>
            <li>Apabila rintangan ditembusi dengan volum tinggi, ia sering menjadi sokongan baharu.</li>
          </ul>` },
        { id: 't3', t: 'Penunjuk popular: MA, RSI, MACD, Volum', h: `
          <div class="tbl-wrap"><table>
            <tr><th>Penunjuk</th><th class="wrap">Cara baca</th></tr>
            <tr><td><b>MA 50 / 200</b></td><td class="wrap">Harga di atas MA200 = trend jangka panjang naik. MA50 merentas atas MA200 = "golden cross".</td></tr>
            <tr><td><b>RSI (14)</b></td><td class="wrap">&gt;70 terlebih beli, &lt;30 terlebih jual. Dalam trend kuat RSI boleh kekal tinggi lama.</td></tr>
            <tr><td><b>MACD</b></td><td class="wrap">Garis MACD merentas atas garis isyarat = momentum menaik.</td></tr>
            <tr><td><b>Volum</b></td><td class="wrap">Pergerakan harga dengan volum tinggi lebih dipercayai.</td></tr>
            <tr><td><b>Bollinger Bands</b></td><td class="wrap">Jalur menyempit = volatiliti rendah, selalunya sebelum pergerakan besar.</td></tr>
          </table></div>
          <div class="tip"><b>Di Moomoo:</b> Buka carta → ikon <i>Indicators</i> → tambah MA, RSI, MACD. Simpan susun atur sebagai templat.</div>` }
      ]
    },
    {
      id: 'crypto', name: 'Fundamental kripto', lessons: [
        { id: 'c1', t: 'Asas blockchain dan kripto', h: `
          <ul>
            <li><b>Blockchain</b>: lejar digital teragih yang mencatat transaksi dan sukar diubah.</li>
            <li><b>Bitcoin (BTC)</b>: bekalan maksimum 21 juta, sering dianggap "emas digital".</li>
            <li><b>Ethereum (ETH)</b>: platform kontrak pintar untuk DeFi, NFT, stablecoin.</li>
            <li><b>Stablecoin</b> (USDT, USDC): ditambat kepada nilai USD.</li>
          </ul>` },
        { id: 'c2', t: 'Menilai projek kripto (tokenomik)', h: `
          <div class="tbl-wrap"><table>
            <tr><th>Faktor</th><th class="wrap">Soalan untuk ditanya</th></tr>
            <tr><td><b>Market cap</b></td><td class="wrap">Harga × bekalan beredar. Lebih besar biasanya kurang volatil.</td></tr>
            <tr><td><b>FDV</b></td><td class="wrap">Nilai jika semua token dikeluarkan. FDV jauh lebih tinggi daripada market cap = risiko tekanan jualan.</td></tr>
            <tr><td><b>Bekalan & inflasi</b></td><td class="wrap">Ada had maksimum? Berapa token baharu dikeluarkan setahun?</td></tr>
            <tr><td><b>Jadual unlock</b></td><td class="wrap">Bila token pasukan/pelabur awal boleh dijual?</td></tr>
            <tr><td><b>Kegunaan</b></td><td class="wrap">Token ini digunakan untuk apa? Ada pengguna sebenar?</td></tr>
            <tr><td><b>Data on-chain</b></td><td class="wrap">Alamat aktif, TVL (DeFi), yuran rangkaian, pemegang terbesar.</td></tr>
            <tr><td><b>Pasukan & audit</b></td><td class="wrap">Pasukan dikenali? Kod diaudit?</td></tr>
          </table></div>` },
        { id: 'c3', t: 'Kripto melalui Moomoo dan di Malaysia', h: `
          <ul>
            <li>Semak dalam app Moomoo sama ada dagangan kripto terus tersedia untuk akaun Malaysia anda. Ketersediaan berbeza mengikut negara.</li>
            <li>Alternatif dalam Moomoo: <b>ETF Bitcoin/Ethereum spot AS</b> (cth. IBIT, FBTC, ETHA) atau saham berkaitan kripto (cth. COIN, MSTR).</li>
            <li>Untuk membeli kripto sebenar di Malaysia, gunakan <b>bursa aset digital (DAX) berdaftar dengan SC</b>. Semak senarai rasmi di laman web SC.</li>
          </ul>
          <div class="tip"><b>Amaran:</b> Pasaran kripto beroperasi 24/7 dan boleh jatuh 20 hingga 50% dalam masa singkat. Jangan labur wang yang anda perlukan dalam masa terdekat.</div>` },
        { id: 'c4', t: 'Keselamatan dan penipuan', h: `
          <ul>
            <li>Jangan sekali-kali beri <b>seed phrase</b> atau kata laluan kepada sesiapa.</li>
            <li>Waspada "skim pelaburan dijamin untung", kumpulan Telegram/WhatsApp "signal" berbayar, dan akaun palsu yang menyamar sebagai Moomoo.</li>
            <li>Semak senarai amaran pelabur (Investor Alert List) SC sebelum melabur.</li>
          </ul>` }
      ]
    },
    {
      id: 'risk', name: 'Risiko & psikologi', lessons: [
        { id: 'r1', t: 'Peraturan 1–2% dan saiz kedudukan', h: `
          <p>Jangan risikokan lebih daripada <b>1 hingga 2% modal</b> dalam satu dagangan.</p>
          <div class="tip"><b>Contoh:</b> Modal RM10,000, risiko 1% = RM100. Beli pada RM2.00, stop loss RM1.80 (risiko RM0.20 seunit). Saiz = 100 ÷ 0.20 = <b>500 unit</b> (5 lot). Cuba kalkulator dalam tab <i>Kalkulator</i>.</div>` },
        { id: 'r2', t: 'Nisbah risiko : ganjaran', h: `
          <p>Sasarkan sekurang-kurangnya <b>1:2</b>, iaitu potensi untung dua kali ganda potensi rugi. Dengan nisbah ini, anda masih boleh untung walaupun hanya betul 40% daripada masa.</p>` },
        { id: 'r3', t: 'Kepelbagaian dan peruntukan aset', h: `
          <ul><li>Jangan letak semua telur dalam satu bakul: pelbagaikan sektor, negara dan kelas aset.</li>
          <li>Contoh pemula: 70% ETF indeks/saham besar, 20% saham pilihan, 10% aset berisiko tinggi (kripto).</li>
          <li>Simpan dana kecemasan 3 hingga 6 bulan perbelanjaan sebelum mula melabur.</li></ul>` },
        { id: 'r4', t: 'Psikologi: FOMO, takut dan jurnal dagangan', h: `
          <ul><li><b>FOMO</b>: membeli kerana takut ketinggalan selepas harga sudah naik tinggi.</li>
          <li><b>Revenge trading</b>: berdagang secara emosi untuk "balas dendam" selepas rugi.</li>
          <li>Simpan <b>jurnal dagangan</b>: sebab masuk, sebab keluar, emosi, pengajaran.</li>
          <li>Ada pelan sebelum masuk, dan ikut pelan itu.</li></ul>` }
      ]
    },
    {
      id: 'strat', name: 'Strategi', lessons: [
        { id: 's1', t: 'Melabur jangka panjang vs trading', h: `
          <div class="tbl-wrap"><table>
            <tr><th>Gaya</th><th>Tempoh</th><th class="wrap">Ciri-ciri</th></tr>
            <tr><td><b>Pelabur nilai</b></td><td>Tahun</td><td class="wrap">Beli syarikat bagus pada harga diskaun.</td></tr>
            <tr><td><b>Pelabur pertumbuhan</b></td><td>Tahun</td><td class="wrap">Syarikat dengan hasil berkembang pesat.</td></tr>
            <tr><td><b>Pelabur dividen</b></td><td>Tahun</td><td class="wrap">Pendapatan pasif daripada dividen.</td></tr>
            <tr><td><b>Swing trader</b></td><td>Hari–minggu</td><td class="wrap">Tangkap pergerakan jangka pendek menggunakan analisis teknikal.</td></tr>
            <tr><td><b>Day trader</b></td><td>Minit–jam</td><td class="wrap">Risiko & tekanan tinggi; tidak disyorkan untuk pemula.</td></tr>
          </table></div>` },
        { id: 's2', t: 'Dollar-Cost Averaging (DCA)', h: `
          <p>Labur jumlah tetap secara berkala (cth. RM300 sebulan) tanpa mengira harga. Anda beli lebih banyak unit ketika harga rendah, dan purata kos menjadi lebih stabil.</p>
          <div class="tip"><b>Di Moomoo:</b> Cari ciri pelaburan berulang (Recurring Investment / Auto-invest) jika tersedia untuk akaun anda, atau tetapkan peringatan bulanan.</div>` },
        { id: 's3', t: 'Membina pelan dagangan', h: `
          <ol><li>Pasaran & masa dagangan</li><li>Syarat masuk (cth. tembus rintangan + volum tinggi)</li><li>Stop loss & sasaran untung</li><li>Saiz kedudukan (1–2%)</li><li>Semakan mingguan jurnal</li></ol>` }
      ]
    },
    {
      id: 'syariah', name: 'Syariah & cukai', lessons: [
        { id: 'sy1', t: 'Saham patuh Syariah', h: `
          <ul>
            <li>Untuk Bursa Malaysia, rujuk <b>Senarai Sekuriti Patuh Syariah</b> yang dikemas kini oleh Majlis Penasihat Syariah SC dua kali setahun (Mei & November).</li>
            <li>Untuk saham AS, rujuk saringan seperti indeks Syariah (cth. Dow Jones Islamic Market, S&amp;P 500 Shariah) atau app saringan Syariah.</li>
            <li>Kriteria biasa: aktiviti perniagaan halal, nisbah hutang berasaskan faedah dan tunai dalam had tertentu.</li>
            <li>Elakkan short selling dan dagangan margin berasaskan faedah jika ingin kekal patuh Syariah.</li>
            <li>Lakukan <b>penyucian (purification)</b> bagi bahagian dividen daripada sumber tidak patuh.</li>
          </ul>` },
        { id: 'sy2', t: 'Cukai & zakat (panduan umum)', h: `
          <ul>
            <li>Malaysia secara umumnya tiada cukai keuntungan modal untuk individu atas saham tersenarai, tetapi peraturan boleh berubah. Semak LHDN.</li>
            <li>Dividen AS lazimnya dikenakan <b>cukai pegangan 30%</b> di AS bagi pemastautin Malaysia, walaupun selepas W-8BEN.</li>
            <li><b>Zakat saham</b>: rujuk lembaga zakat negeri anda; kiraan biasanya berdasarkan nilai pasaran pada haul.</li>
          </ul>` }
      ]
    },
    { id: 'calc', name: 'Kalkulator', calc: true },
    { id: 'quiz', name: 'Kuiz', quiz: true }
  ];

  const QUIZ = [
    { q: 'Order jenis apa yang hanya terlaksana pada harga anda atau lebih baik?', o: ['Market order', 'Limit order', 'Stop order', 'Trailing stop'], a: 1 },
    { q: 'P/E ratio dikira sebagai…', o: ['Untung ÷ Hasil', 'Harga ÷ EPS', 'Hutang ÷ Ekuiti', 'Dividen ÷ Harga'], a: 1 },
    { q: 'Berapa unit dalam 1 lot saham Bursa Malaysia?', o: ['1', '10', '100', '1,000'], a: 2 },
    { q: 'RSI melebihi 70 biasanya menunjukkan…', o: ['Terlebih jual', 'Terlebih beli', 'Trend menurun', 'Volum rendah'], a: 1 },
    { q: 'Bekalan maksimum Bitcoin ialah…', o: ['21 juta', '100 juta', 'Tiada had', '18 juta'], a: 0 },
    { q: 'Dengan modal RM5,000 dan peraturan risiko 2%, risiko maksimum satu dagangan ialah…', o: ['RM50', 'RM100', 'RM250', 'RM500'], a: 1 },
    { q: 'FDV yang jauh lebih tinggi daripada market cap bermaksud…', o: ['Projek pasti untung', 'Banyak token belum beredar; risiko tekanan jualan', 'Token sudah habis dikeluarkan', 'Harga akan stabil'], a: 1 },
    { q: 'Borang W-8BEN digunakan untuk…', o: ['Deposit wang', 'Mengisytiharkan status bukan pemastautin AS', 'Membuka akaun Bursa', 'Memohon pinjaman margin'], a: 1 },
    { q: 'DCA bermaksud…', o: ['Membeli semua sekaligus', 'Melabur jumlah tetap secara berkala', 'Menjual ketika rugi', 'Dagangan harian'], a: 1 },
    { q: 'ROE yang tinggi secara konsisten biasanya menunjukkan…', o: ['Hutang tinggi semata-mata', 'Pengurusan yang cekap menjana untung daripada ekuiti', 'Saham murah', 'Dividen tinggi'], a: 1 }
  ];

  const allLessons = MODULES.flatMap(m => m.lessons || []);
  let done = new Set(store.get('learnDone', []));
  let current = store.get('learnTab', 'mula');

  function updateProgress() {
    const pct = Math.round(done.size / allLessons.length * 100);
    $('#progBar').style.width = pct + '%';
    $('#progText').textContent = `${done.size}/${allLessons.length} pelajaran`;
    $('#homePct').textContent = pct + '%';
    $('#homeRing').setAttribute('stroke-dashoffset', (113.1 * (1 - pct / 100)).toFixed(1));
    const next = allLessons.find(l => !done.has(l.id));
    $('#homeLesson').textContent = next ? next.t : 'Semua pelajaran selesai. Cuba kuiz!';
  }

  function renderTabs() {
    $('#learnTabs').innerHTML = MODULES.map(m => {
      const n = m.lessons ? m.lessons.filter(l => done.has(l.id)).length : 0;
      const badge = m.lessons ? `<span class="done-n">${n}/${m.lessons.length}</span>` : '';
      return `<button class="chip ${m.id === current ? 'active' : ''}" role="tab" aria-selected="${m.id === current}" data-id="${m.id}">${esc(m.name)}${badge}</button>`;
    }).join('');
  }

  function renderModule() {
    const m = MODULES.find(x => x.id === current) || MODULES[0];
    const box = $('#learnContent');
    if (m.calc) return renderCalc(box);
    if (m.quiz) return renderQuiz(box);
    box.innerHTML = m.lessons.map((l, i) => `
      <details class="lesson ${done.has(l.id) ? 'done' : ''}" data-id="${l.id}" ${i === 0 ? 'open' : ''}>
        <summary><span class="dot">${icon('check')}</span>${esc(l.t)}${icon('chev', 'ic chev')}</summary>
        <div class="lesson-body">${(window.LEARN_VIS || {})[l.id] || ''}${l.h}
          <button class="btn sm ${done.has(l.id) ? 'ghost' : ''}" data-mark="${l.id}">${done.has(l.id) ? 'Tandakan belum selesai' : 'Tandakan selesai'}</button>
        </div>
      </details>`).join('');
  }

  $('#learnTabs').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    current = b.dataset.id; store.set('learnTab', current); renderTabs(); renderModule();
  });
  $('#learnContent').addEventListener('click', e => {
    const b = e.target.closest('[data-mark]'); if (!b) return;
    const id = b.dataset.mark;
    if (done.has(id)) done.delete(id); else { done.add(id); toast('Pelajaran ditanda selesai'); }
    store.set('learnDone', [...done]); updateProgress(); renderTabs();
    const det = b.closest('details'); det.classList.toggle('done', done.has(id));
    b.textContent = done.has(id) ? 'Tandakan belum selesai' : 'Tandakan selesai';
    b.classList.toggle('ghost', done.has(id));
    if (done.has(id)) { const nx = det.nextElementSibling; det.open = false; if (nx) nx.open = true; }
  });

  const rm = n => 'RM' + n.toLocaleString('ms-MY', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  function renderCalc(box) {
    box.innerHTML = `<div class="calc-grid">
      <div class="card"><h3>Saiz kedudukan</h3>
        <div class="field"><label for="cCap">Modal (RM)</label><input type="number" inputmode="decimal" id="cCap" value="10000"></div>
        <div class="field"><label for="cRisk">Risiko per dagangan (%)</label><input type="number" inputmode="decimal" id="cRisk" value="1" step="0.1"></div>
        <div class="field"><label for="cEntry">Harga masuk</label><input type="number" inputmode="decimal" id="cEntry" value="2.00" step="0.01"></div>
        <div class="field"><label for="cStop">Stop loss</label><input type="number" inputmode="decimal" id="cStop" value="1.80" step="0.01"></div>
        <div class="calc-out" id="cOut1"></div><div class="muted small" id="cOut1b"></div></div>
      <div class="card"><h3>DCA & pulangan kompaun</h3>
        <div class="field"><label for="dInit">Modal permulaan (RM)</label><input type="number" inputmode="decimal" id="dInit" value="1000"></div>
        <div class="field"><label for="dMon">Simpanan bulanan (RM)</label><input type="number" inputmode="decimal" id="dMon" value="300"></div>
        <div class="field"><label for="dRate">Pulangan tahunan anggaran (%)</label><input type="number" inputmode="decimal" id="dRate" value="7" step="0.5"></div>
        <div class="field"><label for="dYrs">Tempoh (tahun)</label><input type="number" inputmode="decimal" id="dYrs" value="10"></div>
        <div class="calc-out" id="cOut2"></div><div class="muted small" id="cOut2b"></div>
        <svg id="dChart" viewBox="0 0 300 90" style="width:100%;height:90px;margin-top:8px"></svg></div>
      <div class="card"><h3>Untung rugi saham AS</h3>
        <div class="field"><label for="pQty">Bilangan unit</label><input type="number" inputmode="decimal" id="pQty" value="10"></div>
        <div class="field"><label for="pBuy">Harga beli (USD)</label><input type="number" inputmode="decimal" id="pBuy" value="150" step="0.01"></div>
        <div class="field"><label for="pSell">Harga jual (USD)</label><input type="number" inputmode="decimal" id="pSell" value="180" step="0.01"></div>
        <div class="field"><label for="pFx">Kadar USD/MYR</label><input type="number" inputmode="decimal" id="pFx" value="4.20" step="0.01"></div>
        <div class="calc-out" id="cOut3"></div><div class="muted small" id="cOut3b"></div></div>
    </div><p class="muted small" style="margin-top:10px">Kalkulator tidak mengambil kira yuran broker, cukai atau caj tukaran mata wang.</p>`;
    const v = id => parseFloat($('#' + id).value) || 0;
    const calc = () => {
      const riskAmt = v('cCap') * v('cRisk') / 100, per = v('cEntry') - v('cStop');
      if (per > 0) {
        const units = Math.floor(riskAmt / per);
        $('#cOut1').textContent = `${units.toLocaleString()} unit`;
        $('#cOut1b').textContent = `≈ ${Math.floor(units / 100)} lot Bursa · Nilai ${rm(units * v('cEntry'))} · Risiko ${rm(riskAmt)}`;
      } else { $('#cOut1').textContent = '–'; $('#cOut1b').textContent = 'Stop loss mesti di bawah harga masuk.'; }
      const r = v('dRate') / 100 / 12, n = Math.round(v('dYrs') * 12); let bal = v('dInit'); const pts = [bal];
      for (let i = 0; i < n; i++) { bal = bal * (1 + r) + v('dMon'); if ((i + 1) % 12 === 0) pts.push(bal); }
      const contrib = v('dInit') + v('dMon') * n;
      $('#cOut2').textContent = rm(bal);
      $('#cOut2b').textContent = `Modal disumbang ${rm(contrib)} · Pulangan ${rm(bal - contrib)}`;
      const mx = Math.max(...pts, 1);
      $('#dChart').innerHTML = pts.map((p, i) => { const w = 300 / pts.length, h = p / mx * 84; return `<rect x="${i * w + 1}" y="${88 - h}" width="${w - 2}" height="${h}" rx="2" fill="var(--brand)" opacity="${.35 + .65 * i / pts.length}"/>`; }).join('');
      const pl = (v('pSell') - v('pBuy')) * v('pQty');
      const pct = v('pBuy') ? (v('pSell') / v('pBuy') - 1) * 100 : 0;
      $('#cOut3').innerHTML = `<span class="${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '+' : ''}$${pl.toFixed(2)}</span>`;
      $('#cOut3b').textContent = `≈ ${rm(pl * v('pFx'))} · ${pct.toFixed(2)}%`;
    };
    box.querySelectorAll('input').forEach(i => i.addEventListener('input', calc)); calc();
  }

  function renderQuiz(box) {
    let idx = 0, score = 0;
    const show = () => {
      if (idx >= QUIZ.length) {
        const best = Math.max(store.get('quizBest', 0), score); store.set('quizBest', best);
        const msg = score >= 8 ? 'Cemerlang. Anda faham asasnya dengan baik.' : score >= 5 ? 'Bagus. Ulang kaji modul yang anda kurang yakin.' : 'Teruskan belajar, kemudian cuba lagi.';
        box.innerHTML = `<div class="card center" style="padding:28px 16px"><p class="eyebrow">Keputusan</p>
          <div class="calc-out" style="font-size:2.6rem">${score}/${QUIZ.length}</div><p>${msg}</p><p class="muted small">Markah terbaik: ${best}/${QUIZ.length}</p>
          <button class="btn" id="qAgain">Cuba lagi</button></div>`;
        $('#qAgain').onclick = () => renderQuiz(box); return;
      }
      const q = QUIZ[idx];
      box.innerHTML = `<div class="card"><div class="muted small num">Soalan ${idx + 1} daripada ${QUIZ.length}</div>
        <div class="progress-bar" style="margin:8px 0 16px"><div style="width:${idx / QUIZ.length * 100}%"></div></div>
        <h3>${esc(q.q)}</h3>${q.o.map((o, i) => `<button class="quiz-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>`;
      box.querySelectorAll('.quiz-opt').forEach(b => b.onclick = () => {
        const i = +b.dataset.i;
        box.querySelectorAll('.quiz-opt').forEach(x => { x.disabled = true; if (+x.dataset.i === q.a) x.classList.add('correct'); });
        if (i === q.a) score++; else b.classList.add('wrong');
        setTimeout(() => { idx++; show(); }, 1100);
      });
    };
    show();
  }

  renderTabs(); renderModule(); updateProgress();
})();
