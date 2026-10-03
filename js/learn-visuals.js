/* Visual (SVG) untuk setiap pelajaran dalam bahagian Belajar. Semua dilukis di sini supaya
   berfungsi luar talian dan ikut tema terang/gelap melalui pemboleh ubah CSS (css/belajar-visual.css). */
(function () {
  const T = (x, y, s, c = '', a = 'start') => `<text x="${x}" y="${y}" class="${c}" text-anchor="${a}">${s}</text>`;
  const Tm = (x, y, s, c = '') => T(x, y, s, c, 'middle');
  const R = (x, y, w, h, c = 'bx', rx = 8) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${c}"/>`;
  const L = (x1, y1, x2, y2, c = 'ln') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${c}"/>`;
  const C = (cx, cy, r, c = 'f-b') => `<circle cx="${cx}" cy="${cy}" r="${r}" class="${c}"/>`;
  const P = (pts, c = 's-b') => `<polyline fill="none" points="${pts.map(p => p.map(n => +n.toFixed(1)).join(',')).join(' ')}" class="${c}"/>`;
  // Anak panah: garis + kepala segi tiga (tanpa <marker> supaya tiada id bertindih)
  const A = (x1, y1, x2, y2, col = 'mu') => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 7;
    const p = [[x2, y2], [x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45)], [x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45)]];
    return `<line x1="${x1}" y1="${y1}" x2="${x2 - 4 * Math.cos(a)}" y2="${y2 - 4 * Math.sin(a)}" class="s-${col}"/><polygon points="${p.map(q => q.map(n => n.toFixed(1)).join(',')).join(' ')}" class="f-${col}"/>`;
  };
  const pill = (cx, cy, w, s, c = 'bx', tc = '') => R(cx - w / 2, cy - 14, w, 28, c, 14) + Tm(cx, cy + 4, s, tc);
  const fig = (w, h, label, inner, cap) =>
    `<figure class="lv"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${inner}</svg><figcaption>${cap}</figcaption></figure>`;

  const V = {};

  /* ---------- Mula di Moomoo ---------- */
  V.m1 = fig(360, 235, 'Apa yang ada dalam app Moomoo', [
    [[70, 35], [290, 35], [60, 110], [300, 110], [70, 185], [290, 185]].map(([x, y]) => L(180, 110, x, y, 's-mu dash')).join(''),
    C(180, 110, 44, 'f-b'), Tm(180, 107, 'moomoo', 'inv h'), Tm(180, 122, 'satu app', 'inv mu-inv'),
    pill(70, 35, 116, 'Saham Bursa'), pill(290, 35, 120, 'Saham AS & ETF'),
    pill(60, 110, 110, 'Paper trading'), pill(300, 110, 110, 'Data & carta'),
    pill(70, 185, 116, 'Penapis saham'), pill(290, 185, 116, 'Komuniti Moo'),
    R(70, 210, 220, 22, 'f-bs', 11), Tm(180, 225, 'Dilesenkan Suruhanjaya Sekuriti (SC)', 'f-b h')
  ].join(''), 'Satu app untuk saham Malaysia, saham AS, latihan dan data pasaran.');

  V.m2 = (() => {
    const steps = [['Muat turun app', 'App Store / Play'], ['Isi maklumat', 'ikut MyKad'], ['eKYC', 'MyKad + swafoto'],
      ['Profil risiko', 'jawab dengan jujur'], ['Borang W-8BEN', 'untuk saham AS'], ['Akaun lulus', 'beberapa hari bekerja']];
    const pos = [[60, 40], [180, 40], [300, 40], [300, 140], [180, 140], [60, 140]];
    let s = L(60, 40, 300, 40, 's-b') + L(60, 140, 300, 140, 's-b') +
      `<path d="M318 40 C352 40 352 140 318 140" fill="none" class="s-b"/>`;
    steps.forEach(([a, b], i) => {
      const [x, y] = pos[i], last = i === 5;
      s += C(x, y, 17, last ? 'f-u' : 'f-b') + Tm(x, y + 5, last ? '✓' : i + 1, 'inv h') +
        Tm(x, y + 36, a, 'h') + Tm(x, y + 50, b, 'mu');
    });
    return fig(360, 200, 'Enam langkah buka akaun Moomoo', s, 'Ikut nombor: daripada muat turun app sehingga akaun diluluskan.');
  })();

  V.m3 = (() => {
    const box = (x, y, a, b, c = 'bx') => R(x, y, 80, 40, c) + Tm(x + 40, y + 17, a, 'h') + Tm(x + 40, y + 31, b, 'mu');
    let s = box(4, 10, 'Bank anda', 'nama sendiri') + A(86, 30, 98, 30) +
      box(100, 10, 'Moomoo', 'baki MYR') + A(182, 30, 194, 30) +
      box(196, 10, 'Tukar', 'MYR → USD') + A(278, 30, 290, 30) +
      box(292, 10, 'Saham AS', 'dalam USD') +
      A(140, 52, 140, 70) + R(100, 72, 80, 26, 'f-bs', 8) + Tm(140, 89, 'Saham Bursa', 'f-b h') +
      T(190, 89, 'terus guna MYR', 'mu');
    // Garis masa 24 jam waktu Malaysia
    const X = h => 24 + h * 13.5, y0 = 130;
    s += T(4, y0 - 18, 'Waktu dagangan (waktu Malaysia)', 'h');
    s += R(X(0), y0 + 4, X(24) - X(0), 20, 'f-s2', 4) + R(X(0), y0 + 30, X(24) - X(0), 20, 'f-s2', 4);
    s += R(X(9), y0 + 4, X(12.5) - X(9), 20, 'f-b', 4) + R(X(14.5), y0 + 4, X(17) - X(14.5), 20, 'f-b', 4);
    s += R(X(21.5), y0 + 30, X(24) - X(21.5), 20, 'f-i', 4) + R(X(0), y0 + 30, X(4) - X(0), 20, 'f-i', 4);
    s += T(X(0) - 20, y0 + 18, 'KL', 'mu') + T(X(0) - 20, y0 + 44, 'AS', 'mu');
    [[0, '12 mlm'], [6, '6 pg'], [12, '12 tgh'], [18, '6 ptg'], [24, '12 mlm']].forEach(([h, l]) => { s += L(X(h), y0 + 54, X(h), y0 + 59, 's-mu') + Tm(X(h), y0 + 70, l, 'mu'); });
    s += T(X(9), y0 + 1, '9:00–12:30', 'mu') + T(X(14.5), y0 + 1, '2:30–5:00', 'mu');
    s += T(X(21.5) - 4, y0 + 44, 'buka 9:30 mlm', 'mu', 'end') + T(X(4) + 4, y0 + 44, 'tutup 4:00 pg', 'mu');
    s += R(4, 215, 352, 26, 'bx', 8) + Tm(180, 232, 'Wang jualan masuk selepas: Bursa T+2 · AS T+1', 'h');
    return fig(360, 245, 'Aliran wang dan waktu dagangan', s, 'Wang mengalir dari bank anda ke Moomoo. Pasaran AS dibuka malam waktu Malaysia (waktu musim panas AS).');
  })();

  V.m4 = (() => {
    let s = R(120, 6, 120, 236, 'f-s1 s-mu', 18) + R(128, 20, 104, 200, 'f-s2', 6);
    s += R(134, 26, 92, 14, 'bx', 7) + T(140, 36, 'Cari saham', 'mu');
    [['AAPL', 'f-u', [0, 4, 2, 7, 6, 10]], ['CIMB', 'f-u', [5, 4, 6, 5, 8, 8]], ['TSLA', 'f-d', [9, 6, 7, 3, 4, 1]], ['NVDA', 'f-u', [1, 3, 2, 6, 8, 9]]].forEach(([n, c, d], i) => {
      const y = 50 + i * 30;
      s += R(132, y, 96, 26, 'bx', 5) + T(137, y + 16, n, 'h sm');
      s += P(d.map((v, j) => [182 + j * 5, y + 20 - v * 1.5]), c === 'f-u' ? 's-u' : 's-d');
      s += R(212, y + 7, 12, 12, c, 3);
    });
    s += R(132, 172, 96, 22, 'f-bs', 5) + Tm(180, 187, 'Paper Trading', 'f-b sm h');
    s += R(128, 200, 104, 20, 'bx', 0);
    ['Watchlist', 'Markets', 'Akaun'].forEach((t, i) => { s += C(146 + i * 34, 207, 3, i === 0 ? 'f-b' : 'f-mu') + Tm(146 + i * 34, 217, t, i === 0 ? 'f-b xs h' : 'mu xs'); });
    // Label penerangan
    s += T(4, 62, 'Watchlist', 'h') + T(4, 76, 'saham yang dipantau', 'mu') + L(100, 66, 130, 66, 's-b');
    s += T(4, 128, 'Halaman saham', 'h') + T(4, 142, 'carta, Level 2, Financials', 'mu') + L(112, 132, 130, 125, 's-b');
    s += T(4, 186, 'Paper Trading', 'h') + T(4, 200, 'berlatih dengan modal maya', 'mu') + L(118, 186, 132, 183, 's-b');
    s += T(254, 62, 'Markets', 'h') + T(254, 76, 'heatmap, gainers, IPO', 'mu') + `<path d="M252 66 H250 V236 H180 V222" fill="none" class="s-b dash"/>`;
    s += T(254, 150, 'Akaun', 'h') + T(254, 164, 'baki, posisi, order,', 'mu') + T(254, 177, 'deposit & keluar', 'mu') + `<path d="M252 146 H245 V229 H214 V222" fill="none" class="s-b dash"/>`;
    return fig(360, 248, 'Bahagian utama app Moomoo', s, 'Gambaran ringkas susun atur app. Nama tab sebenar mungkin sedikit berbeza mengikut versi.');
  })();

  /* ---------- Jenis order ---------- */
  V.o1 = (() => {
    const panel = (x0, y0, title, sub, pts, lvls, dot, dc) => {
      const X = t => x0 + 10 + t * 150, Y = v => y0 + 104 - v * 66;
      let s = R(x0, y0, 170, 118, 'bx', 10) + T(x0 + 10, y0 + 18, title, 'h') + T(x0 + 10, y0 + 31, sub, 'mu');
      lvls.forEach(([v, l, c]) => { s += L(X(0), Y(v), X(1), Y(v), `${c} dash`) + T(X(1), Y(v) - 3, l, `mu ${c.replace('s-', 'f-')}`, 'end'); });
      s += P(pts.map(([t, v]) => [X(t), Y(v)]), 's-t');
      s += C(X(dot[0]), Y(dot[1]), 5, dc);
      return s;
    };
    const s = panel(4, 4, 'Market', 'beli serta-merta', [[0, .5], [.2, .58], [.4, .48], [.6, .55], [.8, .5], [1, .56]], [], [1, .56], 'f-b') +
      T(70, 92, 'harga semasa', 'f-b mu') +
      panel(186, 4, 'Limit beli', 'tunggu harga turun ke had', [[0, .8], [.2, .7], [.4, .5], [.55, .2], [.7, .4], [1, .7]], [[.2, 'had $185', 's-b']], [.55, .2], 'f-b') +
      panel(4, 128, 'Stop loss', 'tembus paras → jual', [[0, .8], [.25, .7], [.45, .55], [.6, .3], [.8, .15], [1, .05]], [[.35, 'stop', 's-d']], [.55, .35], 'f-d') +
      panel(186, 128, 'Trailing stop', 'stop ikut harga naik', [[0, .3], [.2, .5], [.4, .6], [.55, .85], [.7, .75], [.85, .6], [1, .5]], [], [.86, .6], 'f-d') +
      P([[196, 228], [226, 228], [226, 215], [256, 215], [256, 208], [279, 208], [279, 191], [340, 191]].map(([x, y]) => [x, y - 0]), 's-d dash');
    return fig(360, 250, 'Empat jenis order utama', s, 'Titik menunjukkan bila order terlaksana. Garis putus-putus ialah paras yang anda tetapkan.');
  })();

  V.o2 = (() => {
    const days = ['Isn', 'Sel', 'Rab', 'Kha', 'Jum'], X = i => 70 + i * 56;
    let s = T(4, 16, 'Tempoh order', 'h');
    days.forEach((d, i) => { s += Tm(X(i) + 28, 32, d, 'mu') + L(X(i), 38, X(i), 100, 'ln'); });
    s += T(4, 58, 'Day', 'h') + R(X(0) + 2, 46, 52, 18, 'f-b', 5) + Tm(X(1) + 10, 60, '✕ batal', 'f-d h');
    s += T(4, 88, 'GTC', 'h') + R(X(0) + 2, 76, 56 * 3 + 36, 18, 'f-b', 5) + C(X(3) + 38, 85, 8, 'f-u') + Tm(X(3) + 38, 89, '✓', 'inv h') + T(X(3) + 50, 89, 'terlaksana', 'f-u mu');
    // Sesi AS (waktu New York)
    const H = h => 30 + (h - 4) * 19, base = 205;
    s += T(4, 128, 'Sesi pasaran AS (waktu New York)', 'h');
    s += R(H(4), base - 22, H(9.5) - H(4) - 2, 22, 'f-w o5', 4) + R(H(9.5), base - 62, H(16) - H(9.5) - 2, 62, 'f-b', 4) + R(H(16), base - 18, H(20) - H(16), 18, 'f-w o5', 4);
    s += Tm((H(4) + H(9.5)) / 2, base - 28, 'Pre-market', 'sm h') + Tm((H(9.5) + H(16)) / 2, base - 40, 'Sesi biasa', 'inv h') + Tm((H(16) + H(20)) / 2, base - 24, 'After-hours', 'sm h');
    [4, 9.5, 16, 20].forEach(h => { s += Tm(H(h), base + 14, String(h).replace('.5', ':30').replace(/^(\d+)$/, '$1:00'), 'mu'); });
    s += T(4, 236, 'Tinggi bar = kecairan. Luar sesi biasa: spread lebar, guna limit order sahaja.', 'mu');
    return fig(360, 242, 'Tempoh order dan sesi lanjutan', s, 'Order Day tamat hari itu juga; GTC kekal sehingga terlaksana atau dibatalkan.');
  })();

  V.o3 = (() => {
    const rows = [['1.05', 120, 'a'], ['1.04', 300, 'a'], ['1.03', 80, 'a'], ['1.01', 150, 'b'], ['1.00', 420, 'b'], ['0.99', 90, 'b']];
    let s = Tm(90, 16, 'Bid (pembeli)', 'f-u h') + Tm(270, 16, 'Ask (penjual)', 'f-d h') + Tm(180, 16, 'Harga', 'mu');
    rows.forEach(([p, q, k], i) => {
      const y = 28 + i * 28 + (k === 'b' ? 26 : 0), w = q / 420 * 140;
      s += Tm(180, y + 15, p, 'h');
      if (k === 'a') s += R(205, y + 2, w, 18, 'f-d o3', 4) + T(210, y + 15, q + ' lot', 'sm');
      else s += R(155 - w, y + 2, w, 18, 'f-u o3', 4) + T(150, y + 15, q + ' lot', 'sm', 'end');
    });
    s += R(40, 112, 280, 22, 'f-bs', 6) + Tm(180, 127, 'Spread = 1.03 − 1.01 = 0.02', 'f-b h');
    s += T(4, 236, 'Dinding beli di 1.00 boleh jadi sokongan sementara, tetapi order boleh ditarik.', 'mu');
    return fig(360, 242, 'Buku order Level 2', s, 'Ask terendah (1.03) dan bid tertinggi (1.01) ialah harga terbaik sekarang. Jaraknya ialah spread.');
  })();

  /* ---------- Fundamental saham ---------- */
  V.f1 = (() => {
    const col = (x, t, q) => R(x, 4, 114, 200, 'bx', 10) + Tm(x + 57, 22, t, 'h') + Tm(x + 57, 196, q, 'mu');
    let s = col(2, 'Pendapatan', 'Untung berkembang?') + col(123, 'Kunci kira-kira', 'Hutang terkawal?') + col(244, 'Aliran tunai', 'Tunai sebenar masuk?');
    // Pendapatan: hasil -> untung kasar -> untung bersih
    [[100, 'Hasil', 'f-b'], [45, 'Kasar', 'f-b o6'], [18, 'Bersih', 'f-u']].forEach(([v, l, c], i) => {
      const h = v * 1.2, x = 12 + i * 33; s += R(x, 170 - h, 26, h, c, 3) + Tm(x + 13, 182, l, 'mu');
    });
    // Kunci kira-kira: Aset = Liabiliti + Ekuiti
    s += R(135, 50, 40, 120, 'f-b', 3) + Tm(155, 114, 'Aset', 'inv sm h');
    s += Tm(183, 114, '=', 'h');
    s += R(192, 50, 40, 50, 'f-d o6', 3) + Tm(212, 79, 'Liabiliti', 'sm h') + R(192, 102, 40, 68, 'f-u', 3) + Tm(212, 140, 'Ekuiti', 'inv sm h');
    // Aliran tunai: operasi - capex = FCF
    s += R(256, 50, 26, 90, 'f-b', 3) + Tm(269, 182, 'Tunai', 'mu');
    s += R(287, 50, 26, 35, 'f-d o6', 3) + Tm(300, 182, 'Capex', 'mu');
    s += R(318, 85, 26, 55, 'f-u', 3) + Tm(331, 182, 'FCF', 'mu');
    s += L(250, 140, 350, 140, 's-mu') + Tm(300, 160, 'tunai − capex = FCF', 'mu');
    return fig(360, 210, 'Tiga penyata kewangan', s, 'Setiap penyata menjawab satu soalan penting tentang kesihatan syarikat.');
  })();

  V.f2 = (() => {
    let s = R(4, 6, 104, 54, 'bx') + Tm(56, 26, 'Harga saham', 'mu') + Tm(56, 48, 'RM10.00', 'big');
    s += Tm(122, 40, '÷', 'big') + R(136, 6, 104, 54, 'bx') + Tm(188, 26, 'EPS setahun', 'mu') + Tm(188, 48, 'RM0.50', 'big');
    s += Tm(254, 40, '=', 'big') + R(268, 6, 88, 54, 'f-b') + Tm(312, 26, 'P/E', 'inv mu-inv') + Tm(312, 48, '20', 'inv big');
    s += Tm(180, 80, 'Anda bayar RM20 untuk setiap RM1 untung tahunan.', 'h');
    s += T(4, 106, 'Bandingkan dengan pesaing sektor yang sama', 'mu');
    const peers = [['Pesaing A', 12], ['Pesaing B', 16], ['Syarikat anda', 20], ['Pesaing C', 28]], X = v => 96 + v * 8;
    peers.forEach(([n, v], i) => {
      const y = 116 + i * 24, me = n === 'Syarikat anda';
      s += T(4, y + 14, n, me ? 'h f-b' : 'sm') + R(96, y + 2, v * 8, 16, me ? 'f-b' : 'f-mu o4', 4) + T(X(v) + 6, y + 15, v, 'sm h');
    });
    s += L(X(19), 112, X(19), 214, 's-g dash') + T(X(19) + 4, 226, 'purata sektor 19', 'f-g mu');
    return fig(360, 232, 'Cara kira dan baca P/E', s, 'P/E tidak bermakna sendirian. Ia hanya berguna apabila dibandingkan dengan syarikat serupa.');
  })();

  V.f3 = (() => {
    let s = `<ellipse cx="180" cy="118" rx="112" ry="78" class="f-i o2"/><ellipse cx="180" cy="118" rx="74" ry="50" class="f-s1 s-mu"/>`;
    // Istana
    s += R(146, 96, 68, 46, 'f-b', 2) + R(140, 80, 18, 62, 'f-b', 2) + R(202, 80, 18, 62, 'f-b', 2);
    [140, 146, 152, 202, 208, 214].forEach(x => { s += R(x, 74, 5, 7, 'f-b', 1); });
    s += `<path d="M172 142 v-16 a8 8 0 0 1 16 0 v16 z" class="f-s1"/>` + Tm(180, 112, 'Syarikat', 'inv sm h');
    const lab = [[180, 20, 'Jenama kuat'], [42, 62, 'Kos beralih tinggi'], [42, 182, 'Kesan rangkaian'], [318, 62, 'Kelebihan kos'], [318, 182, 'Paten / lesen']];
    lab.forEach(([x, y, t]) => { s += pill(x, y, 112, t, 'f-s1 s-i', 'sm h'); });
    s += A(6, 118, 62, 118, 'd') + T(4, 108, 'Pesaing', 'f-d sm h') + A(354, 118, 298, 118, 'd') + T(356, 108, 'Pesaing', 'f-d sm h', 'end');
    return fig(360, 210, 'Economic moat', s, 'Moat ialah "parit" yang menghalang pesaing merampas pelanggan dan untung syarikat.');
  })();

  V.f4 = (() => {
    const steps = ['Semua saham', 'Faham cara syarikat buat duit', 'Hasil & untung naik 3–5 tahun', 'FCF positif, hutang terkawal', 'Harga munasabah (P/E, PEG)', 'Ada pelan: sasaran, stop, saiz'];
    let s = '';
    steps.forEach((t, i) => {
      const y = 6 + i * 32, w1 = 352 - i * 30, w2 = 352 - (i + 1) * 30, x1 = 180 - w1 / 2, x2 = 180 - w2 / 2;
      s += `<polygon points="${x1},${y} ${x1 + w1},${y} ${x2 + w2},${y + 29} ${x2},${y + 29}" class="${i === 0 ? 'f-mu o3' : 'f-b'}" style="opacity:${i === 0 ? .35 : .45 + i * .11}"/>`;
      s += Tm(180, y + 19, t, i === 0 ? 'h' : 'inv h');
    });
    s += A(180, 200, 180, 214, 'u') + pill(180, 230, 90, 'Beli', 'f-u', 'inv h');
    return fig(360, 248, 'Corong senarai semak sebelum beli', s, 'Hanya saham yang lulus setiap tapisan layak dibeli.');
  })();

  /* ---------- Analisis teknikal ---------- */
  V.t1 = (() => {
    let s = L(100, 18, 100, 196, 's-t w2') + R(80, 62, 40, 92, 'f-u', 3);
    s += L(260, 18, 260, 196, 's-t w2') + R(240, 62, 40, 92, 'f-d', 3);
    [[22, 'Tinggi'], [66, 'Tutup'], [152, 'Buka'], [196, 'Rendah']].forEach(([y, t]) => { s += T(6, y + 4, t, 'h') + L(50, y, 76, y, 's-mu dash'); });
    [[22, 'Tinggi'], [66, 'Buka'], [152, 'Tutup'], [196, 'Rendah']].forEach(([y, t]) => { s += T(354, y + 4, t, 'h', 'end') + L(284, y, 308, y, 's-mu dash'); });
    s += Tm(180, 40, 'Sumbu', 'mu') + L(160, 37, 104, 37, 's-mu') + L(200, 37, 256, 37, 's-mu');
    s += Tm(180, 112, 'Badan', 'mu') + L(160, 108, 124, 108, 's-mu') + L(200, 108, 236, 108, 's-mu');
    s += Tm(100, 218, 'Naik (bullish)', 'f-u h') + Tm(260, 218, 'Turun (bearish)', 'f-d h');
    return fig(360, 226, 'Anatomi batang lilin', s, 'Hijau: tutup di atas buka. Merah: tutup di bawah buka. Sumbu menunjukkan harga tertinggi dan terendah.');
  })();

  V.t2 = (() => {
    let s = R(4, 58, 352, 14, 'f-d o2', 3) + R(4, 152, 352, 14, 'f-u o2', 3);
    s += T(8, 54, 'Rintangan', 'f-d h') + T(8, 180, 'Sokongan', 'f-u h');
    const pts = [[8, 140], [40, 68], [70, 154], [100, 70], [130, 152], [160, 66], [190, 150], [232, 64], [256, 34], [282, 60], [350, 14]];
    s += P(pts, 's-t w2');
    s += C(282, 62, 5, 'f-b') + T(290, 84, 'Rintangan lama', 'f-b sm h') + T(290, 96, 'jadi sokongan', 'f-b sm h');
    s += T(200, 28, 'Tembus', 'h') + A(226, 30, 240, 48, 'mu');
    // Volum
    const vol = [4, 5, 4, 6, 5, 4, 5, 6, 5, 4, 5, 18, 14, 7, 6, 5];
    vol.forEach((v, i) => { s += R(8 + i * 22, 222 - v * 2.4, 16, v * 2.4, i === 11 || i === 12 ? 'f-b' : 'f-mu o3', 2); });
    s += T(4, 192, 'Volum', 'mu') + T(300, 200, 'volum melonjak', 'f-b mu');
    return fig(360, 228, 'Sokongan, rintangan dan penembusan', s, 'Harga melantun antara dua paras. Apabila rintangan ditembusi dengan volum tinggi, ia sering menjadi sokongan baharu.');
  })();

  V.t3 = (() => {
    const N = 60, p = [];
    for (let i = 0; i < N; i++) p.push((i < 24 ? 100 - i * 1.3 : 69 + (i - 24) * 1.55) + Math.sin(i * 1.7) * 2.6 + Math.cos(i * 0.9) * 1.6);
    const ma = n => p.map((_, i) => i < n - 1 ? null : p.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n);
    const s1 = ma(8), s2 = ma(22);
    const lo = Math.min(...p) - 3, hi = Math.max(...p) + 3, X = i => 30 + i * (322 / (N - 1)), Y = v => 118 - (v - lo) / (hi - lo) * 104;
    let s = T(4, 12, 'Harga', 'mu') + P(p.map((v, i) => [X(i), Y(v)]), 's-t');
    s += P(s1.map((v, i) => v == null ? null : [X(i), Y(v)]).filter(Boolean), 's-i w2');
    s += P(s2.map((v, i) => v == null ? null : [X(i), Y(v)]).filter(Boolean), 's-g w2');
    let cx = -1; for (let i = 22; i < N; i++) if (s1[i - 1] < s2[i - 1] && s1[i] >= s2[i]) { cx = i; break; }
    if (cx > 0) s += C(X(cx), Y(s1[cx]), 6, 'f-u o6') + T(X(cx) - 10, Y(s1[cx]) + 22, 'Golden cross', 'f-u sm h', 'end');
    s += T(250, 12, 'MA pendek', 'f-i sm h') + T(250, 24, 'MA panjang', 'f-g sm h');
    // RSI 14
    const rsi = p.map((_, i) => {
      if (i < 14) return null; let g = 0, l = 0;
      for (let j = i - 13; j <= i; j++) { const d = p[j] - p[j - 1]; if (d > 0) g += d; else l -= d; }
      return l === 0 ? 100 : 100 - 100 / (1 + g / l);
    });
    const RY = v => 190 - v * 0.5;
    s += T(4, 148, 'RSI', 'mu') + R(30, RY(100), 322, 50, 'f-s1', 3) + R(30, RY(100), 322, 15, 'f-d o2', 0) + R(30, RY(30), 322, 15, 'f-u o2', 0);
    s += T(26, RY(70) + 3, '70', 'mu', 'end') + T(26, RY(30) + 3, '30', 'mu', 'end');
    s += P(rsi.map((v, i) => v == null ? null : [X(i), RY(v)]).filter(Boolean), 's-p w2');
    // Volum
    s += T(4, 212, 'Volum', 'mu');
    p.forEach((v, i) => { const h = 6 + Math.abs(Math.sin(i * 2.3)) * 12 + (i > 34 && i < 40 ? 8 : 0); s += R(X(i) - 2, 232 - h, 4, h, i > 0 && v >= p[i - 1] ? 'f-u o6' : 'f-d o6', 1); });
    return fig(360, 238, 'Penunjuk MA, RSI dan volum', s, 'MA pendek merentas atas MA panjang (golden cross) menandakan trend berubah naik. RSI di atas 70 terlebih beli, di bawah 30 terlebih jual.');
  })();

  /* ---------- Fundamental kripto ---------- */
  V.c1 = (() => {
    const blk = [['#101', '7c1e', '9f2a'], ['#102', '9f2a', '3b8d'], ['#103', '3b8d', 'e04c']];
    let s = '';
    blk.forEach(([n, prev, h], i) => {
      const x = 6 + i * 120;
      s += R(x, 8, 106, 92, 'bx', 10) + T(x + 10, 26, 'Blok ' + n, 'h') + T(x + 10, 44, 'Transaksi: 3', 'mu');
      s += R(x + 8, 52, 90, 18, 'f-s2', 4) + T(x + 13, 65, 'Sebelum: ' + prev + '…', 'sm ' + (i ? 'f-b h' : ''));
      s += R(x + 8, 74, 90, 18, 'f-bs', 4) + T(x + 13, 87, 'Hash: ' + h + '…', 'sm f-b h');
    });
    [0, 1].forEach(i => { const x = 6 + i * 120; s += A(x + 98, 83, x + 132, 61, 'b'); });
    // Rangkaian nod
    const nodes = [[60, 150], [130, 128], [200, 150], [270, 128], [330, 156], [110, 190], [240, 192]];
    [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 2], [2, 6], [6, 4], [1, 3], [5, 6]].forEach(([a, b]) => { s += L(...nodes[a], ...nodes[b], 's-mu'); });
    nodes.forEach(([x, y]) => { s += R(x - 13, y - 9, 26, 18, 'f-b', 4) + L(x - 8, y - 2, x + 8, y - 2, 's-inv') + L(x - 8, y + 3, x + 8, y + 3, 's-inv'); });
    s += Tm(180, 222, 'Setiap nod simpan salinan lejar yang sama', 'h');
    return fig(360, 230, 'Rantaian blok dan rangkaian nod', s, 'Setiap blok menyimpan hash blok sebelumnya. Ubah satu blok, rantai putus dan nod lain menolaknya.');
  })();

  V.c2 = (() => {
    let s = T(4, 16, 'Contoh: harga token $1, jumlah bekalan 1 bilion', 'h');
    s += R(4, 26, 106, 26, 'f-b', 5) + Tm(57, 43, 'Beredar 300j', 'inv sm h') + R(110, 26, 246, 26, 'f-g o3', 5) + Tm(233, 43, 'Dikunci 700 juta', 'sm h');
    s += `<path d="M4 58 v6 h106 v-6" fill="none" class="s-b"/>` + T(4, 78, 'Market cap = $300 juta', 'f-b h');
    s += `<path d="M4 84 v6 h352 v-6" fill="none" class="s-g"/>` + T(356, 104, 'FDV = $1 bilion', 'f-g h', 'end');
    // Jadual unlock
    const yrs = [['Kini', 30], ['Thn 1', 45], ['Thn 2', 65], ['Thn 3', 85], ['Thn 4', 100]];
    s += T(4, 128, 'Jadual unlock: token beredar bertambah', 'mu');
    yrs.forEach(([l, v], i) => {
      const x = 20 + i * 68, h = v * 0.8;
      s += R(x, 218 - h, 46, h, i ? 'f-g o6' : 'f-b', 4) + Tm(x + 23, 212 - h, v + '%', 'sm h') + Tm(x + 23, 232, l, 'mu');
      if (i) s += A(x - 18, 218 - yrs[i - 1][1] * 0.8 - 14, x + 6, 218 - h - 14, 'd');
    });
    return fig(360, 240, 'Market cap berbanding FDV dan jadual unlock', s, 'Setiap kali token dibuka kunci, lebih banyak token boleh dijual. Jurang besar antara market cap dan FDV bermaksud tekanan jualan pada masa depan.');
  })();

  V.c3 = (() => {
    let s = pill(180, 20, 120, 'Anda (RM)', 'f-b', 'inv h');
    s += `<path d="M150 34 C120 52 96 52 92 66" fill="none" class="s-mu"/><path d="M210 34 C240 52 264 52 268 66" fill="none" class="s-mu"/>`;
    s += R(6, 68, 170, 40, 'bx') + Tm(91, 86, 'Akaun Moomoo', 'h') + Tm(91, 100, 'saham & ETF AS', 'mu');
    s += R(184, 68, 170, 40, 'bx') + Tm(269, 86, 'Bursa aset digital (DAX)', 'h') + Tm(269, 100, 'berdaftar dengan SC', 'mu');
    s += A(91, 110, 91, 126) + A(269, 110, 269, 126);
    s += R(6, 128, 170, 54, 'f-bs') + Tm(91, 146, 'ETF Bitcoin/Ether spot', 'f-b h') + Tm(91, 160, 'IBIT, FBTC, ETHA', 'mu') + Tm(91, 174, 'atau saham: COIN, MSTR', 'mu');
    s += R(184, 128, 170, 54, 'f-g o2') + Tm(269, 146, 'Kripto sebenar', 'h') + Tm(269, 160, 'BTC, ETH', 'mu') + Tm(269, 174, '→ boleh pindah ke dompet', 'mu');
    s += Tm(91, 200, 'Anda pegang unit dana,', 'sm') + Tm(91, 213, 'bukan syiling', 'sm');
    s += Tm(269, 200, 'Anda pegang syiling;', 'sm') + Tm(269, 213, 'jaga kunci sendiri', 'sm');
    return fig(360, 222, 'Dua cara mendapat pendedahan kripto', s, 'Semak ketersediaan dalam app anda dan senarai rasmi DAX berdaftar di laman SC.');
  })();

  V.c4 = (() => {
    const flags = [['"Untung dijamin"', 'pelaburan sah tiada jaminan'], ['Minta seed phrase / OTP', 'akaun boleh dikosongkan'], ['Grup "signal" berbayar', 'Telegram / WhatsApp'], ['Akaun palsu "Moomoo"', 'semak nama & laman rasmi']];
    let s = '';
    flags.forEach(([a, b], i) => {
      const x = 4 + (i % 2) * 178, y = 4 + Math.floor(i / 2) * 64;
      s += R(x, y, 174, 58, 'f-d o1 s-d', 10) + C(x + 20, y + 29, 11, 'f-d') + Tm(x + 20, y + 33, '✕', 'inv h') + T(x + 38, y + 26, a, 'h') + T(x + 38, y + 41, b, 'mu');
    });
    s += R(4, 136, 352, 50, 'f-u o1 s-u', 10) + C(24, 161, 11, 'f-u') + Tm(24, 165, '✓', 'inv h');
    s += T(42, 157, 'Semak Investor Alert List SC', 'h') + T(42, 173, 'sebelum memindahkan sebarang wang', 'mu');
    return fig(360, 192, 'Tanda amaran penipuan', s, 'Jika anda nampak salah satu tanda merah ini, berhenti dan semak dahulu.');
  })();

  /* ---------- Risiko & psikologi ---------- */
  V.r1 = (() => {
    let s = T(4, 14, '1. Modal RM10,000 → risiko 1%', 'h');
    s += R(4, 22, 352, 24, 'f-b o3', 5) + R(4, 22, 352 * 0.01 + 3, 24, 'f-d', 2) + T(14, 38, '← RM100 sahaja boleh hilang', 'f-d sm h');
    s += T(4, 70, '2. Risiko seunit = harga masuk − stop loss', 'h');
    s += L(20, 88, 200, 88, 's-b w2') + T(206, 92, 'Masuk RM2.00', 'f-b h') + L(20, 128, 200, 128, 's-d w2') + T(206, 132, 'Stop RM1.80', 'f-d h');
    s += A(110, 90, 110, 126, 'mu') + A(110, 126, 110, 90, 'mu') + T(118, 112, 'RM0.20 seunit', 'sm h');
    s += T(4, 158, '3. Saiz kedudukan', 'h');
    s += R(4, 166, 90, 40, 'bx') + Tm(49, 191, 'RM100', 'big f-d') + Tm(108, 192, '÷', 'big');
    s += R(122, 166, 90, 40, 'bx') + Tm(167, 191, 'RM0.20', 'big') + Tm(226, 192, '=', 'big');
    s += R(240, 166, 116, 40, 'f-b') + Tm(298, 185, '500 unit', 'inv big') + Tm(298, 200, '5 lot Bursa', 'inv mu-inv');
    return fig(360, 212, 'Kiraan saiz kedudukan', s, 'Kira berapa unit boleh dibeli supaya kerugian, jika stop loss kena, hanya 1% modal.');
  })();

  V.r2 = (() => {
    let s = R(10, 26, 130, 80, 'f-u o2', 4) + R(10, 106, 130, 40, 'f-d o2', 4);
    s += L(10, 106, 140, 106, 's-t w2') + T(14, 100, 'Masuk', 'sm h') + T(14, 40, 'Sasaran +2R', 'f-u sm h') + T(14, 140, 'Stop −1R', 'f-d sm h');
    s += P([[20, 110], [40, 118], [58, 100], [80, 112], [100, 80], [118, 60], [134, 32]], 's-t');
    s += Tm(75, 168, 'Nisbah 1 : 2', 'h');
    s += T(176, 16, '10 dagangan, betul 4 kali sahaja', 'h');
    for (let i = 0; i < 10; i++) {
      const w = i < 4, x = 176 + (i % 5) * 36, y = 26 + Math.floor(i / 5) * 40;
      s += R(x, y, 30, 32, w ? 'f-u' : 'f-d o6', 6) + Tm(x + 15, y + 21, w ? '+2' : '−1', 'inv h');
    }
    s += R(176, 112, 174, 50, 'bx') + Tm(263, 132, '4 × 2 − 6 × 1', 'h') + Tm(263, 152, '= +2R untung bersih', 'f-u h');
    return fig(360, 176, 'Nisbah risiko kepada ganjaran', s, 'Dengan nisbah 1:2, anda masih untung walaupun salah 6 kali daripada 10.');
  })();

  V.r3 = (() => {
    const r = 58, cx = 82, cy = 92, circ = 2 * Math.PI * r;
    const parts = [[70, 'f-b', 's-b', 'ETF indeks / saham besar'], [20, 'f-i', 's-i', 'Saham pilihan'], [10, 'f-g', 's-g', 'Aset berisiko tinggi (kripto)']];
    let s = '', off = 0;
    parts.forEach(([v, , sc]) => {
      const len = circ * v / 100;
      s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" class="${sc}" style="stroke-width:26" stroke-dasharray="${len.toFixed(1)} ${circ.toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;
      off += len;
    });
    s += Tm(cx, cy + 6, 'Contoh', 'mu');
    parts.forEach(([v, fc, , l], i) => { const y = 46 + i * 34; s += R(168, y - 12, 14, 14, fc, 3) + T(190, y, v + '%', 'h') + T(222, y, l.split(' (')[0], 'sm') + (l.includes('(') ? T(222, y + 13, '(' + l.split(' (')[1], 'mu') : ''); });
    s += R(4, 172, 352, 30, 'f-s1 s-mu', 6) + Tm(180, 192, 'Asas dahulu: dana kecemasan 3–6 bulan perbelanjaan', 'h');
    return fig(360, 208, 'Contoh peruntukan aset pemula', s, 'Bina dana kecemasan dahulu, kemudian pelbagaikan mengikut tahap risiko.');
  })();

  V.r4 = (() => {
    const Y = x => 112 - 76 * Math.sin(2 * Math.PI * (x - 55) / 300);
    const pts = []; for (let x = 6; x <= 354; x += 4) pts.push([x, Y(x)]);
    let s = P(pts, 's-b w2');
    const lab = [[40, 'Optimis', 0, -12, 'middle'], [86, 'Teruja', -8, 4, 'end'], [130, 'Euforia', 0, -14, 'middle'], [176, 'Cemas', 8, 4, 'start'],
      [222, 'Takut', 8, 4, 'start'], [258, 'Panik', -8, 4, 'end'], [290, 'Putus asa', 0, 22, 'middle'], [334, 'Harapan', -8, -6, 'end']];
    lab.forEach(([x, t, dx, dy, an]) => {
      const hot = t === 'Euforia' || t === 'Putus asa';
      s += C(x, Y(x), hot ? 6 : 4, hot ? (t === 'Euforia' ? 'f-d' : 'f-u') : 'f-b') + T(x + dx, Y(x) + dy, t, hot ? 'h' : 'sm', an);
    });
    s += R(176, 4, 124, 32, 'f-d o1', 6) + T(184, 17, 'FOMO: ramai beli', 'f-d sm h') + T(184, 30, 'di harga paling tinggi', 'f-d sm');
    s += R(110, 196, 124, 30, 'f-u o1', 6) + T(118, 209, 'Ramai jual rugi', 'f-u sm h') + T(118, 221, 'di harga paling rendah', 'f-u sm');
    return fig(360, 232, 'Kitaran emosi pelabur', s, 'Emosi paling kuat muncul pada masa paling teruk untuk membuat keputusan. Pelan dan jurnal membantu anda keluar daripada kitaran ini.');
  })();

  /* ---------- Strategi ---------- */
  V.s1 = (() => {
    let s = `<defs><linearGradient id="lvg-s1" x1="0" x2="1"><stop offset="0" stop-color="var(--down)"/><stop offset=".5" stop-color="var(--warn)"/><stop offset="1" stop-color="var(--up)"/></linearGradient></defs>`;
    s += T(4, 14, 'Masa di depan skrin & tekanan', 'mu') + T(356, 14, 'lebih tenang', 'mu', 'end');
    s += R(4, 20, 352, 10, '', 5).replace('class=""', 'fill="url(#lvg-s1)"');
    s += A(4, 140, 352, 140, 'mu') + T(4, 160, 'Minit', 'mu') + Tm(130, 160, 'Hari – minggu', 'mu') + T(352, 160, 'Tahun', 'mu', 'end');
    s += C(40, 140, 7, 'f-d') + pill(52, 108, 92, 'Day trader', 'f-d o2 s-d', 'sm h') + L(40, 122, 40, 133, 's-d');
    s += C(130, 140, 7, 'f-w') + pill(136, 78, 100, 'Swing trader', 'f-w o2 s-w', 'sm h') + L(130, 92, 130, 133, 's-w');
    s += C(300, 140, 7, 'f-u');
    [['Pelabur nilai', 50], ['Pelabur pertumbuhan', 80], ['Pelabur dividen', 110]].forEach(([t, y]) => { s += pill(270, y, 132, t, 'f-u o2 s-u', 'sm h'); });
    s += L(300, 124, 300, 133, 's-u');
    s += R(4, 172, 352, 30, 'f-s1 s-mu', 6) + Tm(180, 191, 'Pemula: mula dari kanan (jangka panjang)', 'h');
    return fig(360, 208, 'Gaya pelaburan mengikut tempoh pegangan', s, 'Semakin pendek tempoh, semakin banyak masa, kemahiran dan tekanan diperlukan.');
  })();

  V.s2 = (() => {
    const price = [2.00, 1.60, 1.25, 1.50, 1.80, 2.20], amt = 300, mon = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun'];
    const units = price.map(p => amt / p), tot = units.reduce((a, b) => a + b, 0);
    const avgCost = amt * price.length / tot, avgPrice = price.reduce((a, b) => a + b, 0) / price.length;
    const X = i => 30 + i * 54, PY = p => 84 - (p - 1.2) * 45;
    let s = T(4, 14, 'RM300 setiap bulan', 'h') + T(356, 14, 'Garis = harga · Bar = unit dibeli', 'mu', 'end');
    units.forEach((u, i) => { const h = u * 0.3; s += R(X(i), 190 - h, 36, h, 'f-b o3', 4) + Tm(X(i) + 18, 184 - h, Math.round(u) + ' unit', 'sm h') + Tm(X(i) + 18, 204, mon[i], 'mu'); });
    s += P(price.map((p, i) => [X(i) + 18, PY(p)]), 's-g w2');
    price.forEach((p, i) => { s += C(X(i) + 18, PY(p), 4, 'f-g') + Tm(X(i) + 18, PY(p) - 8, 'RM' + p.toFixed(2), 'f-g sm h'); });
    s += L(24, PY(avgCost), 356, PY(avgCost), 's-u dash');
    s += R(4, 212, 352, 34, 'f-u o1 s-u', 6) + Tm(180, 226, `Purata kos anda RM${avgCost.toFixed(2)}, lebih rendah daripada`, 'sm h') + Tm(180, 240, `purata harga RM${avgPrice.toFixed(2)}`, 'sm h');
    return fig(360, 250, 'Contoh pelaburan berkala (DCA)', s, 'Apabila harga jatuh, RM300 yang sama membeli lebih banyak unit. Garis hijau putus-putus ialah purata kos anda.');
  })();

  V.s3 = (() => {
    const cx = 180, cy = 118, rx = 122, ry = 88;
    const items = ['Pasaran & masa', 'Syarat masuk', 'Stop & sasaran', 'Saiz 1–2%', 'Semak jurnal'];
    const ang = items.map((_, i) => (-90 + i * 72) * Math.PI / 180);
    let s = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" class="s-b dash"/>`;
    ang.forEach((a, i) => {
      const m = a + 36 * Math.PI / 180, x = cx + rx * Math.cos(m), y = cy + ry * Math.sin(m);
      const tx = -rx * Math.sin(m), ty = ry * Math.cos(m), n = Math.hypot(tx, ty);
      s += A(x - tx / n * 6, y - ty / n * 6, x + tx / n * 6, y + ty / n * 6, 'b');
    });
    ang.forEach((a, i) => {
      const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      s += pill(x, y, 120, '', 'f-s1 s-b') + C(x - 46, y, 10, 'f-b') + Tm(x - 46, y + 4, i + 1, 'inv sm h') + T(x - 32, y + 4, items[i], 'sm h');
    });
    s += Tm(cx, cy - 4, 'Pelan dagangan', 'h') + Tm(cx, cy + 12, 'ulang setiap minggu', 'mu');
    return fig(360, 222, 'Kitaran pelan dagangan', s, 'Tulis pelan sebelum masuk pasaran, kemudian semak jurnal untuk memperbaiki pelan seterusnya.');
  })();

  /* ---------- Syariah & cukai ---------- */
  V.sy1 = (() => {
    const dots = (n, y, c) => Array.from({ length: n }, (_, i) => C(180 - (n - 1) * 9 + i * 18, y, 6, c)).join('');
    let s = Tm(180, 14, 'Semua syarikat tersenarai', 'mu') + dots(18, 28, 'f-mu o4');
    s += A(180, 38, 180, 52) + R(14, 54, 332, 44, 'bx') + T(24, 72, 'Tapis 1: Aktiviti perniagaan', 'h') + T(24, 88, 'Halal; sumbangan aktiviti bercampur bawah had 5% / 20%', 'mu');
    s += A(180, 100, 180, 114) + dots(12, 124, 'f-b o5');
    s += A(180, 134, 180, 148) + R(14, 150, 332, 44, 'bx') + T(24, 168, 'Tapis 2: Nisbah kewangan', 'h') + T(24, 184, 'Tunai & hutang berasaskan faedah, setiap satu < 33% aset', 'mu');
    s += A(180, 196, 180, 210) + dots(8, 220, 'f-u');
    s += Tm(180, 246, 'Senarai patuh Syariah SC (dikemas kini Mei & November)', 'f-u h');
    return fig(360, 254, 'Dua tapisan saham patuh Syariah', s, 'Penanda aras Majlis Penasihat Syariah SC. Sentiasa rujuk senarai rasmi terkini sebelum membeli.');
  })();

  V.sy2 = (() => {
    let s = T(4, 14, 'Dividen saham AS', 'h');
    s += R(4, 24, 170, 26, 'f-b', 5) + Tm(89, 41, 'Dividen $100', 'inv h');
    s += R(4, 58, 119, 26, 'f-u', 5) + Tm(63, 75, 'Anda terima $70', 'inv sm h') + R(123, 58, 51, 26, 'f-d o6', 5) + Tm(148, 75, '−$30', 'h');
    s += T(4, 100, 'Cukai pegangan AS 30% dipotong', 'mu') + T(4, 113, 'terus sebelum masuk akaun', 'mu');
    s += L(186, 6, 186, 150, 'ln');
    s += T(198, 14, 'Zakat saham (contoh)', 'h');
    s += R(198, 24, 158, 26, 'bx') + T(206, 41, 'Nilai pasaran pada haul', 'sm');
    s += Tm(277, 66, '× 2.5% (kadar lazim)', 'sm h');
    s += R(198, 74, 158, 26, 'f-u o2 s-u') + T(206, 91, 'RM10,000 → RM250', 'h');
    s += T(198, 117, 'Kaedah & kadar ikut', 'mu') + T(198, 130, 'lembaga zakat negeri anda', 'mu');
    s += R(4, 156, 352, 26, 'f-s1 s-mu', 6) + Tm(180, 173, 'Malaysia: tiada cukai untung modal saham tersenarai (semak LHDN)', 'sm h');
    return fig(360, 188, 'Cukai dividen AS dan zakat saham', s, 'Angka ialah contoh untuk faham kiraan. Peraturan cukai dan zakat boleh berubah.');
  })();

  /* ---------- Jenis dagangan & hukum ---------- */
  V.jn1 = (() => {
    const tag = (cx, cy, w, s, k) => pill(cx, cy, w, s, { ok: 'f-u o2 s-u', syarat: 'f-g o2 s-g', khilaf: 'f-p o2 s-p', no: 'f-d o2 s-d' }[k], 'h');
    let s = R(4, 4, 170, 196, 'bx') + R(186, 4, 170, 196, 'bx');
    s += Tm(89, 24, 'Anda miliki aset', 'h') + Tm(89, 38, 'aset berpindah kepada anda', 'mu');
    s += Tm(271, 24, 'Kontrak sahaja', 'h') + Tm(271, 38, 'derivatif, tiada aset', 'mu');
    s += tag(89, 70, 140, 'Spot (tunai)', 'syarat') + tag(89, 110, 140, 'Margin berfaedah', 'no');
    s += Tm(89, 150, 'Hukum ikut aset:', 'mu') + Tm(89, 164, 'saham patuh, kripto lulus,', 'mu') + Tm(89, 178, 'emas serah segera', 'mu');
    s += tag(271, 64, 140, 'Niaga hadapan', 'khilaf') + tag(271, 100, 140, 'Opsyen', 'no') + tag(271, 136, 140, 'CFD', 'no') + tag(271, 172, 140, 'Forex runcit', 'no');
    s += A(176, 102, 184, 102);
    return fig(360, 204, 'Peta jenis dagangan: milik aset atau kontrak', s, 'Kiri: anda memiliki aset. Kanan: anda hanya memegang kontrak. Warna ialah label hukum umum.');
  })();

  V.jn2 = (() => {
    let s = R(4, 30, 96, 52, 'bx') + Tm(52, 52, 'Anda', 'h') + Tm(52, 68, 'bayar 100%', 'mu');
    s += A(104, 46, 150, 46, 'b') + T(110, 40, 'RM', 'mu');
    s += R(154, 30, 96, 52, 'bx') + Tm(202, 52, 'Penjual', 'h') + Tm(202, 68, 'melalui bursa', 'mu');
    s += A(150, 70, 104, 70, 'u') + T(112, 86, 'aset', 'mu');
    s += R(262, 22, 94, 68, 'f-u o2 s-u') + Tm(309, 46, '✓ Milik anda', 'h') + Tm(309, 62, 'tiada hutang', 'mu') + Tm(309, 76, 'tiada luput', 'mu');
    s += R(4, 104, 352, 30, 'f-s1 s-mu', 6) + Tm(180, 123, 'Harga jatuh 30% → rugi 30% atas kertas, tetapi aset masih ada', 'sm h');
    return fig(360, 140, 'Dagangan spot: bayar penuh, terima aset', s, 'Dalam spot, wang bertukar dengan aset sebenar. Hukumnya bergantung pada aset itu halal atau tidak.');
  })();

  V.jn3 = (() => {
    const W = 330, x0 = 18;
    let s = T(4, 14, 'Leverage 1:10', 'h');
    s += R(x0, 24, W / 10, 26, 'f-b', 4) + T(x0 + W / 10 + 6, 42, '← Modal anda RM1,000', 'sm h');
    s += R(x0, 58, W / 10, 26, 'f-b', 4) + R(x0 + W / 10, 58, W * 0.9, 26, 'f-d o2 s-d', 4) + Tm(x0 + W * 0.55, 75, 'Pinjaman broker RM9,000 (berfaedah)', 'sm h');
    s += Tm(x0 + W / 2, 100, 'Posisi dikawal: RM10,000', 'mu');
    s += L(4, 112, 356, 112, 'ln');
    s += T(4, 132, 'Harga bergerak', 'h') + T(260, 132, 'Modal anda', 'h');
    const row = (y, mv, res, c) => T(4, y, mv, 'sm') + R(118, y - 13, 130 * Math.min(2, Math.max(0, res)) / 2, 18, c, 4) + T(260, y, (res >= 1 ? '+' : '') + Math.round((res - 1) * 100) + '%', 'sm h');
    s += row(154, 'Naik 5%', 1.5, 'f-u') + row(178, 'Turun 5%', 0.5, 'f-w') + row(202, 'Turun 10%', 0, 'f-d') + T(118, 202, 'HABIS · tutup paksa', 'f-d sm h');
    return fig(360, 212, 'Leverage menggandakan untung dan rugi', s, 'Dengan leverage 1:10, pergerakan 10% melawan anda menghabiskan seluruh modal.');
  })();

  V.jn4 = (() => {
    let s = R(4, 24, 100, 56, 'bx') + Tm(54, 48, 'Anda', 'h') + Tm(54, 64, 'deposit kecil', 'mu');
    s += R(256, 24, 100, 56, 'bx') + Tm(306, 48, 'Broker', 'h') + Tm(306, 64, 'pihak lawan', 'mu');
    s += A(108, 42, 252, 42, 'b') + Tm(180, 36, 'rugi anda → untung broker', 'sm');
    s += A(252, 64, 108, 64, 'u') + Tm(180, 78, 'beza harga sahaja', 'sm');
    s += R(116, 96, 128, 42, 'f-d o1 s-d dash') + Tm(180, 114, 'Saham / emas sebenar', 'sm h') + Tm(180, 129, '✗ tidak berpindah', 'f-d sm h');
    s += R(4, 150, 352, 28, 'f-d o1 s-d', 6) + Tm(180, 168, 'Setiap malam: caj swap (faedah) + leverage (hutang)', 'sm h');
    return fig(360, 184, 'CFD: kontrak beza harga antara anda dan broker', s, 'Dalam CFD, aset tidak pernah menjadi milik anda. Yang ditukar hanya beza harga, dengan leverage dan caj semalaman.');
  })();

  V.jn5 = (() => {
    let s = L(30, 60, 330, 60, 's-b w2');
    [[30, 'Hari ini', 'akad, harga tetap'], [180, 'Setiap hari', 'untung rugi dikira'], [330, 'Tarikh luput', 'serah / selesai']].forEach(([x, a, b], i) => {
      s += C(x, 60, 9, i === 1 ? 'f-g' : 'f-b') + Tm(x, 36, a, 'h') + Tm(x, 86, b, 'mu');
    });
    s += R(4, 104, 172, 46, 'f-p o1 s-p') + Tm(90, 122, 'Niaga hadapan', 'h') + Tm(90, 138, 'wajib beli/jual', 'mu');
    s += R(184, 104, 172, 46, 'f-d o1 s-d') + Tm(270, 122, 'Opsyen', 'h') + Tm(270, 138, 'hak sahaja, bayar premium', 'mu');
    return fig(360, 156, 'Garis masa niaga hadapan dan opsyen', s, 'Niaga hadapan mengikat kedua-dua pihak; opsyen hanya hak yang dibeli dengan premium.');
  })();

  window.LEARN_VIS = V;
})();
