/* Akademi Pelaburan: dua laluan (Moomoo dan Kripto), tiga tahap setiap satu, dan AI Coach yang menyesuaikan
   jawapan dengan tahap pelajar. Dipaparkan sebagai tab pertama dalam halaman Belajar (lihat learn.js). */
(function () {
  const API = (store.get('fiqh_api', '') || 'https://fiqh.bijaklabur.my').replace(/\/$/, '');
  const TAHAP = [['beginner', 'Pemula', 'Tahap 1'], ['intermediate', 'Pertengahan', 'Tahap 2'], ['professional', 'Profesional', 'Tahap 3']];

  // pel: pelajaran berkaitan dalam Belajar saham menggunakan Moomoo (id pelajaran dalam learn.js)
  const LALUAN = {
    moomoo: {
      nama: 'Moomoo', ikon: 'chart', tajuk: 'Belajar saham menggunakan Moomoo',
      tahap: {
        beginner: { tajuk: 'Asas Platform & Pengenalan Pelaburan', modul: [
          { c: 'Mula di Moomoo', d: 'Ketahui apa itu Moomoo dan kenapa ramai menggunakannya.', pel: ['m1'] },
          { c: 'Persediaan Akaun', d: 'Panduan buka akaun langkah demi langkah, proses deposit, tukaran mata wang, dan pengeluaran.', pel: ['m2', 'm3'] },
          { c: 'Navigasi Asas', d: 'Mengenal antaramuka aplikasi Moomoo supaya anda mudah mencari fungsi penting.', pel: ['m4'] }
        ] },
        intermediate: { tajuk: 'Analisis Pasaran & Pelaksanaan Order', modul: [
          { c: 'Analisis Teknikal & Fundamental', d: 'Membaca carta lilin (candlestick), menggunakan indikator asas (RSI, MACD), dan menilai penyata kewangan syarikat.', pel: ['t1', 't3', 'f1'] },
          { c: 'Pengurusan Risiko & Psikologi', d: 'Cara menetapkan Stop-Loss, Take-Profit, dan mengawal emosi ketika pasaran meruap.', pel: ['r1', 'r2', 'r4'] }
        ] },
        professional: { tajuk: 'Strategi Algoritma & Kuantitatif Institusi', modul: [
          { c: 'Pelaksanaan Order Lanjutan', d: 'Penggunaan algoritma TWAP/VWAP, Trailing Stop, dan Limit if Touched (LIT) untuk meminimumkan slippage.', pel: ['o1', 'o2', 'o3'] },
          { c: 'Pengimbasan (Screener) & Backtesting', d: 'Memprogram Screener khusus untuk mengesan anomali pasaran dan menguji kembali (backtest) keberkesanan strategi.', pel: ['s3'],
            syariah: 'Tambah penapis "patuh Syariah" dalam screener anda dan elakkan strategi yang bergantung pada jualan singkat atau margin berfaedah.' }
        ] }
      },
      coach: {
        persona: 'Pakar Dagangan Moomoo',
        salam: "Hai! Saya AI Coach Moomoo anda. Jika anda pemula, tanya saya cara tekan butang 'Buy'. Jika anda sudah mahir, mari bincangkan tetapan VWAP.",
        ph: 'Tanya AI Coach (Cth: Macam mana nak set Stop-Loss?)...'
      }
    },
    kripto: {
      nama: 'Kripto', ikon: 'coins', tajuk: 'Akademi Mata Wang Kripto & Rantaian Blok',
      tahap: {
        beginner: { tajuk: 'Asas Kripto & Keselamatan Dompet', modul: [
          { c: 'Pengenalan Rantaian Blok', d: 'Memahami apa itu Bitcoin, Ethereum, dan bagaimana rantaian blok berfungsi secara ringkas.', pel: ['c1'] },
          { c: 'Keselamatan Dompet (Wallet)', d: 'Beza antara dompet pertukaran (CEX) dan dompet peribadi (Self-custody), serta cara menyimpan Seed Phrase dengan selamat.', pel: ['c4'] }
        ] },
        intermediate: { tajuk: 'Kewangan Terdesentralisasi (DeFi) Asas', modul: [
          { c: 'Ekosistem DeFi & DEX', d: 'Cara menggunakan pertukaran terdesentralisasi (seperti Uniswap) dan menyeberangi rantaian (Bridging).', pel: ['c2', 'c3'] },
          { c: 'Staking & Yield Farming', d: 'Memahami cara menjana pendapatan pasif melalui penyediaan kecairan (Liquidity) dan risiko kerugian sementara (Impermanent Loss).', pel: [],
            syariah: 'Hukum staking dan yield farming bergantung pada mekanismenya. Pinjaman token dengan pulangan tetap menyerupai riba. Semak dengan penasihat Syariah sebelum menyertai.' }
        ] },
        professional: { tajuk: 'Analisis On-Chain & Pengurusan Risiko Makro', modul: [
          { c: 'Analisis On-Chain Lanjutan', d: "Menjejak pergerakan 'Whale', mentafsir metrik NVT Ratio, dan memantau rizab bursa melalui penjelajah blok (Block Explorer).", pel: ['c2'] },
          { c: 'Audit Tokenomik & Lindung Nilai (Hedging)', d: 'Menilai jadual pelepasan token (Vesting) projek Web3 dan menggunakan kontrak Futures/Options untuk melindung nilai portfolio.', pel: ['c2', 'jn5'],
            syariah: 'Kontrak niaga hadapan dan opsyen kripto secara umumnya tidak patuh Syariah (IIFA Resolusi 63). Lihat pelajaran "Niaga hadapan dan opsyen" untuk huraian.' }
        ] }
      },
      coach: {
        persona: 'Penganalisis Web3 & On-Chain',
        salam: "Selamat datang ke dunia Kripto! Tanya saya apa sahaja, dari maksud 'HODL' sehinggalah cara membaca metrik MVRV Z-Score.",
        ph: 'Tanya AI Coach (Cth: Apa beza antara Dompet Panas (Hot Wallet) dan Sejuk (Cold Wallet)?)...'
      }
    }
  };

  const S = {
    laluan: store.get('akdLaluan', 'moomoo'),
    tahap: store.get('akdTahap', { moomoo: 'beginner', kripto: 'beginner' }),
    chat: { moomoo: [], kripto: [] },
    busy: false
  };
  if (!LALUAN[S.laluan]) S.laluan = 'moomoo';
  let box = null, goLesson = null;

  // Markdown ringkas daripada AI: **tebal**, senarai "- " dan "1. ", perenggan. Teks dibalut esc() dahulu.
  function md(t) {
    const out = []; let list = null;
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
    String(t || '').split('\n').forEach(raw => {
      const l = raw.trim();
      const ul = l.match(/^[-*•]\s+(.*)/), ol = l.match(/^\d+[.)]\s+(.*)/);
      if (ul || ol) {
        const want = ul ? 'ul' : 'ol';
        if (list !== want) { close(); out.push(`<${want}>`); list = want; }
        out.push(`<li>${inline((ul || ol)[1])}</li>`);
      } else if (!l) close();
      else { close(); out.push(`<p>${inline(l.replace(/^#+\s*/, ''))}</p>`); }
    });
    close();
    return out.join('');
  }

  function chatHTML(L) {
    const msgs = S.chat[S.laluan];
    return `<div class="bk-chat akd-chat" aria-live="polite">
      <div class="bk-ai"><p>${esc(L.coach.salam)}</p></div>
      ${msgs.map(m => m.peranan === 'pelajar' ? `<div class="bk-me">${esc(m.teks)}</div>` : `<div class="bk-ai${m.ralat ? ' akd-err' : ''}">${m.ralat ? `<p>${esc(m.teks)}</p>` : md(m.teks)}</div>`).join('')}
      ${S.busy ? '<div class="bk-ai bk-wait" role="status"><div class="st-spin" aria-hidden="true"></div><span>AI Coach sedang menaip…</span></div>' : ''}
    </div>`;
  }

  function render() {
    if (!box) return;
    const L = LALUAN[S.laluan], tk = S.tahap[S.laluan] || 'beginner', T = L.tahap[tk];
    const tIdx = TAHAP.findIndex(t => t[0] === tk);
    box.innerHTML = `<div class="akd">
      <div class="akd-top">
        <div class="segmented" role="tablist" aria-label="Laluan pembelajaran">${Object.entries(LALUAN).map(([k, x]) =>
          `<button class="seg ${k === S.laluan ? 'active' : ''}" role="tab" aria-selected="${k === S.laluan}" data-laluan="${k}">${icon(x.ikon)}${esc(x.nama)}</button>`).join('')}</div>
      </div>
      <h3 class="akd-title">${esc(L.tajuk)}</h3>
      <div class="akd-steps" role="tablist" aria-label="Tahap">${TAHAP.map(([k, n, label], i) =>
        `<button class="akd-step ${k === tk ? 'active' : ''} ${i < tIdx ? 'past' : ''}" role="tab" aria-selected="${k === tk}" data-tahap="${k}"><span class="akd-n num">${i + 1}</span><span><small>${label}</small><b>${n}</b></span></button>`).join('')}</div>
      <div class="card akd-level">
        <p class="eyebrow">${esc(TAHAP[tIdx][2])} · ${esc(TAHAP[tIdx][1])}</p>
        <h3>${esc(T.tajuk)}</h3>
        <div class="akd-mods">${T.modul.map((m, i) => `<div class="akd-mod">
          <span class="akd-i num">${i + 1}</span>
          <div><b>${esc(m.c)}</b><p>${esc(m.d)}</p>
            ${m.syariah ? `<p class="akd-sy">${icon('shield')}<span><b>Nota Syariah:</b> ${esc(m.syariah)}</span></p>` : ''}
            <div class="akd-links">${m.pel.map(id => { const l = (window.LEARN_LESSONS || {})[id]; return l ? `<button type="button" class="link-btn" data-pel="${id}">${icon('book')}${esc(l.t)}</button>` : ''; }).join('')}
              <button type="button" class="link-btn" data-tanya="${esc(m.c)}">${icon('chat')}Tanya AI Coach</button></div>
          </div></div>`).join('')}</div>
      </div>
      <div class="card akd-coach" id="akdCoach">
        <div class="akd-coach-head"><span class="akd-av">${icon('chat')}</span><div><b>AI Coach: ${esc(L.coach.persona)}</b>
          <small class="muted">Jawapan disesuaikan untuk tahap ${esc(TAHAP[tIdx][1])}</small></div>
          ${S.chat[S.laluan].length ? '<button type="button" class="link-btn akd-clear" data-clear>Kosongkan</button>' : ''}</div>
        ${chatHTML(L)}
        <form class="akd-ask" id="akdAsk">
          <textarea id="akdQ" rows="2" maxlength="1000" placeholder="${esc(L.coach.ph)}" aria-label="Soalan untuk AI Coach" ${S.busy ? 'disabled' : ''}></textarea>
          <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>Tanya AI</button>
        </form>
        <p class="muted small">Jawapan AI untuk pendidikan sahaja, bukan nasihat kewangan atau isyarat beli/jual. Semak semula dengan sumber rasmi.</p>
      </div>
    </div>`;
    const c = $('.akd-chat', box); if (c) c.scrollTop = c.scrollHeight;
  }

  async function tanya(soalan) {
    soalan = String(soalan || '').trim();
    if (!soalan || S.busy) return;
    const lal = S.laluan, msgs = S.chat[lal];
    const sejarah = msgs.filter(m => !m.ralat).slice(-6).map(({ peranan, teks }) => ({ peranan, teks }));
    msgs.push({ peranan: 'pelajar', teks: soalan });
    S.busy = true; render();
    try {
      const r = await fetch(API + '/coach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ laluan: lal, tahap: S.tahap[lal], soalan, sejarah }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.jawapan) throw new Error(d.error || 'AI Coach tidak tersedia buat masa ini. Cuba lagi sebentar.');
      msgs.push({ peranan: 'coach', teks: d.jawapan });
    } catch (e) {
      msgs.push({ peranan: 'coach', ralat: true, teks: e.message && !/fetch|network|load failed/i.test(e.message) ? e.message : 'Tiada sambungan internet. Cuba lagi.' });
    }
    S.busy = false; render();
    const q = $('#akdQ', box); if (q) q.focus();
  }

  function bind(el) {
    el.addEventListener('click', e => {
      if (!box) return;
      const t = e.target.closest('[data-laluan],[data-tahap],[data-pel],[data-tanya],[data-clear]'); if (!t) return;
      if (t.dataset.laluan) { S.laluan = t.dataset.laluan; store.set('akdLaluan', S.laluan); render(); }
      else if (t.dataset.tahap) { S.tahap[S.laluan] = t.dataset.tahap; store.set('akdTahap', S.tahap); render(); }
      else if (t.dataset.pel) { if (goLesson) goLesson(t.dataset.pel); }
      else if (t.dataset.tanya) {
        const q = $('#akdQ', box);
        q.value = `Terangkan "${t.dataset.tanya}" untuk tahap saya, dengan contoh praktikal.`;
        $('#akdCoach', box).scrollIntoView({ behavior: 'smooth', block: 'start' }); q.focus();
      } else if (t.hasAttribute('data-clear')) { S.chat[S.laluan] = []; render(); }
    });
    el.addEventListener('submit', e => {
      if (!box || e.target.id !== 'akdAsk') return;
      e.preventDefault(); const q = $('#akdQ', box); tanya(q.value);
    });
    el.addEventListener('keydown', e => {
      if (box && e.target.id === 'akdQ' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); tanya(e.target.value); }
    });
  }

  let bound = null;
  window.Akademi = {
    render(el, go) {
      box = el; goLesson = go;
      if (bound !== el) { bind(el); bound = el; }
      render();
    },
    leave() { box = null; }
  };
})();
