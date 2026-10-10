/* SiswaCap: Pusat Kawalan pemilik (pusat.html). Berdiri sendiri (tanpa js/app.js).
   Data daripada pusat.bijaklabur.my (worker-pusat): kunci pemilik disahkan oleh pelayan nota, WebSocket untuk kiraan langsung,
   carta SVG ditulis sendiri (palet disahkan skrip dataviz), agen AI boleh diarahkan dari sini atau Telegram. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bl_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('bl_' + k, JSON.stringify(v)); } catch {} }
  };
  const API = (store.get('pusat_api', '') || 'https://pusat.bijaklabur.my').replace(/\/$/, '');
  const fmt = n => new Intl.NumberFormat('ms-MY').format(Math.round(+n || 0));
  const fmtK = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' J' : n >= 1e4 ? Math.round(n / 1e3) + ' K' : n >= 1000 ? (n / 1e3).toFixed(1) + ' K' : fmt(n);
  const hari = iso => new Date(iso + 'T00:00:00+08:00').toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
  const bila = t => { const m = Math.round((Date.now() / 1000 - t) / 60); return m < 1 ? 'baru' : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} jam` : `${Math.round(m / 1440)} hari`; };
  const jam = t => new Date(t * 1000).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
  const NAMA = { '/tanya': 'Tanya AI Fiqh', '/semak': 'Semak Kertas', '/kalori': 'Sihat (kalori)', '/gambar': 'Studio Gambar', '/buku': 'Buku Nota AI', '/kerja': 'Kerjaya AI', '/manusia': 'Semakan gaya AI', '/audit': 'Audit lanjutan', '/coach': 'AI Coach', '/agen': 'Agen Telegram' };
  const LAMAN = { utama: 'Utama', belajar: 'Belajar', pasaran: 'Pasaran', solat: 'Solat', ibadah: 'Ibadah', semak: 'Semak Kertas', jadual: 'Jadual', nota: 'Nota', sihat: 'Sihat', studio: 'Studio', buku: 'Buku Nota', kerja: 'Kerjaya', jejak: 'Jejak', komuniti: 'Komuniti', premium: 'Premium', soalan: 'Soalan', halal: 'Halal' };
  const namaLaman = l => LAMAN[l] || l;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let toastT;
  function toast(m) { $('.pk-toast') && $('.pk-toast').remove(); const t = document.createElement('div'); t.className = 'pk-toast'; t.textContent = m; document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2800); }

  const kunci = () => store.get('nota_key', '');
  async function api(path, init = {}) {
    const r = await fetch(API + path, { ...init, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + kunci(), ...(init.headers || {}) } });
    if (r.status === 401) { store.set('nota_key', ''); throw new Error('Kunci pemilik tidak sah.'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Ralat ${r.status}`);
    return d;
  }

  /* ---------- Pintu ---------- */
  const gate = $('#pkGate'), papan = $('#pkPapan');
  $('#pkForm').addEventListener('submit', async e => {
    e.preventDefault();
    const k = $('#pkKunci').value.trim(), err = $('#pkErr'), btn = $('#pkForm button'); err.hidden = true; btn.disabled = true;
    store.set('nota_key', k);
    try { await muat(); } catch (x) { store.set('nota_key', ''); err.textContent = x.message; err.hidden = false; }
    btn.disabled = false;
  });
  $('#pkKeluar').addEventListener('click', () => { store.set('nota_key', ''); tutupWs(); papan.hidden = true; gate.hidden = false; $('#pkKeluar').hidden = true; $('#pkLive').hidden = true; toast('Log keluar.'); });
  $('#pkRefresh').addEventListener('click', () => kunci() && muat().catch(e => toast(e.message)));

  /* ---------- Muat papan ---------- */
  let D = null, kiniLama = null;
  async function muat() {
    D = await api('/papan');
    gate.hidden = true; papan.hidden = false; $('#pkKeluar').hidden = false;
    lukis(D); bukaWs();
    muatTelegram().catch(() => {});
  }
  function pills(d) {
    $('#pkPills').innerHTML = [
      ['Kiraan token', d.catat, d.catat ? 'worker-fiqh melapor' : 'PUSAT_SECRET belum ditetapkan'],
      ['Telegram', d.telegram, d.telegram ? 'bot aktif' : 'TELEGRAM_BOT_TOKEN belum ditetapkan'],
      ['Agen AI', !!d.agen, d.agen ? `penyedia: ${d.agen}` : 'arahan pantas sahaja'],
      ['GitHub', d.github, d.github ? 'boleh buka issue' : 'baca sahaja']
    ].map(([n, on, t]) => `<span class="pk-pill ${on ? 'on' : ''}" title="${esc(t)}"><i></i>${n}</span>`).join('');
  }
  function ringkas(r) {
    const el = $('#pkKini');
    if (kiniLama !== null && r.kini > kiniLama && !reduce) { el.classList.add('naik'); setTimeout(() => el.classList.remove('naik'), 400); }
    kiniLama = r.kini; el.textContent = fmt(r.kini);
    $('#pkKiniSub').textContent = `${r.kini === 1 ? 'Seorang' : fmt(r.kini) + ' orang'} dengan denyut dalam 75 saat terakhir · hari ini ${fmt(r.pelawatHari)} pelawat, puncak ${fmt(r.puncakHari)} serentak.`;
    $('#pkLamanKini').innerHTML = r.lamanKini.length ? r.lamanKini.map(x => `<li>${esc(namaLaman(x.laman))}<b>${fmt(x.n)}</b></li>`).join('') : '<li>Tiada pelawat sekarang</li>';
    if (D) { D.kini = r.kini; D.pelawatHari = r.pelawatHari; D.tokenHari = r.tokenHari; }
  }
  function lukis(d) {
    pills(d); ringkas(d);
    const p = d.pelawat;
    $('#pkTiles').innerHTML = [
      ['Hari ini', fmt(p.hari.pelawat), `${fmt(p.hari.paparan)} paparan`],
      ['Puncak serentak hari ini', fmt(p.hari.puncak), 'pelawat pada satu masa'],
      ['7 hari', fmt(p.minggu.pelawat), `${fmt(p.minggu.paparan)} paparan`],
      ['30 hari', fmt(p.bulan.pelawat), `${fmt(p.bulan.paparan)} paparan`]
    ].map(([a, b, c]) => `<div class="pk-tile"><small>${a}</small><b>${b}</b><span>${c}</span></div>`).join('');
    $('#pkPelawatNota').textContent = d.siriHari.length ? `${d.siriHari.length} hari direkod · pelawat unik = tab berbeza sehari` : '';
    cartaBar($('#pkChartPelawat'), d.siriHari, 'tarikh', [{ k: 'pelawat', n: 'Pelawat', c: 'c1' }], $('#pkJadualPelawat'));
    barsMendatar($('#pkLamanHari'), d.lamanHari.map(x => [namaLaman(x.laman), x.n]), 'c1', 'paparan');
    barsMendatar($('#pkNegara'), d.negara.map(x => [x.negara, x.n]), 'c3', 'pelawat');
    $('#pkPeranti').textContent = d.peranti.length ? 'Peranti 24 jam: ' + d.peranti.map(x => `${x.peranti} ${fmt(x.n)}`).join(' · ') : '';

    const t = d.token, kadar = d.kadarMYR || 4.3;
    const kos = x => x.kos ? `≈ USD ${x.kos.toFixed(2)} (RM${(x.kos * kadar).toFixed(2)})` : 'kuota percuma';
    $('#pkTokenTiles').innerHTML = [['Hari ini', t.hari], ['7 hari', t.minggu], ['30 hari', t.bulan]].map(([a, x]) => `<div class="pk-tile"><small>${a}</small><b>${fmtK(x.masuk + x.keluar)}</b><span>${fmt(x.panggilan)} panggilan${x.gagal ? `, ${x.gagal} gagal` : ''} · ${kos(x)}</span></div>`).join('');
    $('#pkTokenNota').textContent = d.catat ? 'Dilaporkan oleh pelayan Tanya AI setiap panggilan model' : 'Belum menerima laporan: tetapkan rahsia PUSAT_SECRET untuk worker-pusat dan worker-fiqh';
    $('#pkTokenLegend').innerHTML = `<span><i class="c1"></i>Token masuk (soalan dan konteks)</span><span><i class="c2"></i>Token keluar (jawapan)</span>`;
    cartaBar($('#pkChartToken'), d.tokenSiri, 'tarikh', [{ k: 'masuk', n: 'Masuk', c: 'c1' }, { k: 'keluar', n: 'Keluar', c: 'c2' }], $('#pkJadualToken'));
    barsMendatar($('#pkTokenLaluan'), d.tokenLaluan.map(x => [NAMA[x.laluan] || x.laluan, x.masuk + x.keluar, `${fmt(x.panggilan)} panggilan`]), 'c1', 'token');
    barsMendatar($('#pkTokenPenyedia'), d.tokenPenyedia.map(x => [x.penyedia, x.masuk + x.keluar, x.kos ? `USD ${x.kos.toFixed(2)}` : 'percuma']), 'c2', 'token');
    $('#pkTokenTerkini tbody').innerHTML = d.tokenTerkini.length ? d.tokenTerkini.map(x => `<tr><td>${jam(x.t)}</td><td>${esc(NAMA[x.laluan] || x.laluan)}</td><td>${esc(x.penyedia)}</td><td>${esc(x.model || '')}</td><td class="num">${fmt(x.masuk)}</td><td class="num">${fmt(x.keluar)}</td><td class="num">${fmt(x.ms)}</td><td>${x.ok ? 'ok' : 'gagal'}</td></tr>`).join('') : '<tr><td colspan="8" class="pk-muted">Belum ada panggilan dicatat.</td></tr>';

    sihat(d.kesihatan);
    $('#pkAgenNota').textContent = d.agen ? `Agen menjawab dengan ${d.agen}; arahan pantas tanpa AI.` : 'Tanpa ANTHROPIC_API_KEY/GEMINI_API_KEY, agen menjawab arahan pantas sahaja.';
    $('#pkChat').innerHTML = (d.sembang || []).map(m => `<div class="pk-msg ${m.peran === 'agen' ? 'agen' : 'pemilik'}">${esc(m.teks)}</div>`).join('') || '<div class="pk-msg agen">Salam. Cuba /stat atau tanya saya apa-apa tentang laman.</div>';
    $('#pkChat').scrollTop = 1e9;
    $('#pkLog').innerHTML = (d.peristiwa || []).map(p => `<li class="${esc(p.jenis)}"><time>${bila(p.t)} lalu</time><span class="j">${esc(p.jenis)}</span><span>${esc(p.teks)}</span></li>`).join('') || '<li class="pk-muted">Belum ada peristiwa.</li>';
  }
  function sihat(s) {
    $('#pkSihat').innerHTML = s.length ? s.map(k => `<li class="${k.ok ? 'ok' : 'rosak'}"><svg class="ic"><use href="#${k.ok ? 'p-ok' : 'p-x'}"/></svg><div><b>${esc(k.nama)}</b><span>${k.ok ? 'Sihat' : 'Rosak'} · ${fmt(k.ms)} ms · ${bila(k.t)} lalu${k.nota ? ' · ' + esc(k.nota) : ''}</span></div></li>`).join('')
      : '<li class="tunggu"><svg class="ic"><use href="#p-wait"/></svg><div><b>Belum disemak</b><span>Semakan automatik setiap 15 minit, atau tekan "Semak sekarang".</span></div></li>';
  }
  $('#pkSemak').addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true;
    try { sihat((await api('/papan/kesihatan', { method: 'POST', body: '{}' })).map(x => ({ ...x, t: Date.now() / 1000 }))); } catch (x) { toast(x.message); }
    b.disabled = false;
  });

  /* ---------- Carta bar (bertindan jika >1 siri), tooltip, jadual ---------- */
  function cartaBar(wrap, rows, kx, siri, jadual) {
    wrap.innerHTML = '';
    if (!rows || !rows.length) { wrap.innerHTML = '<div class="pk-kosong">Belum ada data. Data mula dikumpul selepas pelayan pusat dipasang.</div>'; if (jadual) jadual.innerHTML = ''; return; }
    // Lebar mengikut bekas supaya teks tidak dipicit pada telefon (dilukis semula apabila saiz tetingkap berubah)
    const W = Math.max(340, Math.round(wrap.clientWidth || 900)), H = W < 600 ? 190 : 220, L = W < 600 ? 38 : 44, R = 8, T = 14, B = 26, iw = W - L - R, ih = H - T - B;
    const jumlah = r => siri.reduce((a, s) => a + (+r[s.k] || 0), 0);
    const maks = Math.max(1, ...rows.map(jumlah));
    const langkah = Math.pow(10, Math.floor(Math.log10(maks))), skala = Math.ceil(maks / langkah) * langkah;
    const bw = iw / rows.length, gap = Math.min(4, bw * 0.2), w = Math.max(2, bw - gap);
    const y = v => T + ih - (v / skala) * ih;
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = skala * i / 4, yy = y(v); g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}"/><text class="axis" x="${L - 6}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${fmtK(v)}</text>`; }
    let bars = '';
    rows.forEach((r, i) => {
      const x = L + i * bw + gap / 2;
      let akhir = 0, seg = '';
      siri.forEach((s, j) => {
        const v = +r[s.k] || 0; if (!v) return;
        const y1 = y(akhir + v), y0 = y(akhir), h = Math.max(0, y0 - y1 - (j ? 2 : 0));
        seg += `<rect class="bar ${s.c}" x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, w / 2)}"/>`;
        akhir += v;
      });
      const label = i === rows.length - 1 || (rows.length > 10 && i % Math.ceil(rows.length / 6) === 0) ? `<text class="axis" x="${(x + w / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(hari(r[kx]))}</text>` : '';
      bars += `<g data-i="${i}">${seg}<rect class="hit" x="${(L + i * bw).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${ih}"/>${label}</g>`;
    });
    // Label terus pada nilai terbesar dan terakhir sahaja
    const iMax = rows.reduce((m, r, i) => jumlah(r) > jumlah(rows[m]) ? i : m, 0);
    const lbl = [...new Set([iMax, rows.length - 1])].filter(i => jumlah(rows[i]) > 0).map(i => `<text class="lbl" x="${(L + i * bw + bw / 2).toFixed(1)}" y="${(y(jumlah(rows[i])) - 5).toFixed(1)}" text-anchor="middle">${fmtK(jumlah(rows[i]))}</text>`).join('');
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${g}${bars}${lbl}</svg>`;
    const svg = $('svg', wrap);
    const tip = document.createElement('div'); tip.className = 'pk-tip'; tip.hidden = true; wrap.appendChild(tip);
    svg.addEventListener('pointermove', e => {
      const gEl = e.target.closest('g[data-i]'); if (!gEl) { tip.hidden = true; return; }
      const r = rows[+gEl.dataset.i], bx = wrap.getBoundingClientRect(), sx = bx.width / W;
      tip.innerHTML = `<div>${esc(hari(r[kx]))}</div>` + siri.map(s => `<div><span class="sw ${s.c}"></span>${esc(s.n)} <b>${fmt(r[s.k])}</b></div>`).join('') + (siri.length > 1 ? `<div>Jumlah <b>${fmt(jumlah(r))}</b></div>` : '');
      tip.style.left = `${(L + (+gEl.dataset.i + 0.5) * bw) * sx}px`; tip.style.top = `${y(jumlah(r)) * (bx.height / H)}px`; tip.hidden = false;
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; });
    if (jadual) jadual.innerHTML = `<table class="pk-t"><thead><tr><th>Tarikh</th>${siri.map(s => `<th class="num">${esc(s.n)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r[kx])}</td>${siri.map(s => `<td class="num">${fmt(r[s.k])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function barsMendatar(wrap, items, c, unit) {
    if (!items.length) { wrap.innerHTML = '<div class="pk-kosong">Belum ada data.</div>'; return; }
    const maks = Math.max(1, ...items.map(x => x[1]));
    // Lebar ditetapkan melalui CSSOM (CSP tanpa gaya sebaris)
    wrap.innerHTML = items.map(([n, v, extra]) => `<div class="pk-bar" title="${esc(n)}: ${fmt(v)} ${unit}"><span class="n">${esc(n)}</span><span class="trk"><i class="${c}" data-w="${(v / maks * 100).toFixed(1)}"></i></span><span class="v">${fmtK(v)}${extra ? ` · ${esc(extra)}` : ''}</span></div>`).join('');
    requestAnimationFrame(() => wrap.querySelectorAll('i[data-w]').forEach(i => { i.style.width = i.dataset.w + '%'; }));
  }

  /* ---------- WebSocket langsung ---------- */
  let ws = null, wsTimer = 0, cubaan = 0;
  async function bukaWs() {
    tutupWs();
    try {
      const { tiket } = await api('/papan/tiket', { method: 'POST', body: '{}' });
      ws = new WebSocket(`${API.replace(/^http/, 'ws')}/papan/ws?tiket=${encodeURIComponent(tiket)}`);
      ws.onopen = () => { cubaan = 0; $('#pkLive').hidden = false; $('#pkLive').classList.add('on'); };
      ws.onmessage = e => { try { const m = JSON.parse(e.data); if (m.jenis === 'ringkas') ringkas(m.data); } catch {} };
      ws.onclose = () => { $('#pkLive').classList.remove('on'); if (!papan.hidden) wsTimer = setTimeout(bukaWs, Math.min(30000, 2000 * 2 ** cubaan++)); };
      ws.onerror = () => {};
    } catch { wsTimer = setTimeout(bukaWs, 15000); }
  }
  function tutupWs() { clearTimeout(wsTimer); if (ws) { ws.onclose = null; try { ws.close(); } catch {} ws = null; } }
  // Kekal segar: ping setiap 50 saat; muat semula penuh setiap 5 minit
  setInterval(() => { if (ws && ws.readyState === 1) ws.send('ping'); }, 50000);
  setInterval(() => { if (!papan.hidden && document.visibilityState === 'visible') muat().catch(() => {}); }, 300000);

  /* ---------- Telegram ---------- */
  async function muatTelegram() {
    const el = $('#pkTg');
    const s = await api('/telegram/status');
    const st = (ok, teks) => `<div class="${ok ? 'ok' : 'tunggu'}"><svg class="ic"><use href="#${ok ? 'p-ok' : 'p-wait'}"/></svg>${teks}</div>`;
    if (!s.aktif) {
      el.innerHTML = `<h3><svg class="ic"><use href="#p-plane"/></svg> Agen Telegram belum aktif</h3>
        <ol><li>Buka Telegram, cari <code>@BotFather</code>, hantar <code>/newbot</code> dan ikut arahan (nama contoh: SiswaCap Pusat).</li>
        <li>Salin token bot dan tambah sebagai rahsia GitHub <code>TELEGRAM_BOT_TOKEN</code> (repo &gt; Settings &gt; Secrets and variables &gt; Actions).</li>
        <li>Jalankan semula aliran kerja "Pusat Kawalan" (Actions &gt; Run workflow). Webhook dipasang sendiri.</li>
        <li>Buka bot anda dan hantar <code>/mula &lt;kunci pemilik&gt;</code> untuk berpasangan.</li></ol>
        <p class="pk-muted pk-small">Panduan penuh: fail PANDUAN-PUSAT-KAWALAN.md dalam folder projek.</p>`;
      return;
    }
    el.innerHTML = `<h3><svg class="ic"><use href="#p-plane"/></svg> Agen Telegram${s.nama ? ` · <a href="https://t.me/${esc(s.nama)}" target="_blank" rel="noopener">@${esc(s.nama)}</a>` : ''}</h3>
      <div class="pk-st">${st(!!s.nama, s.nama ? 'Bot dikenali oleh Telegram' : 'Token bot tidak sah: ' + esc(s.ralat))}
      ${st(s.webhookBetul, s.webhookBetul ? 'Webhook menghala ke pelayan ini' : 'Webhook belum dipasang')}
      ${st(s.berpasangan, s.berpasangan ? 'Berpasangan dengan pemilik' : 'Belum berpasangan: hantar /mula <kunci pemilik> kepada bot')}
      ${s.ralat && s.nama ? st(false, 'Ralat terakhir Telegram: ' + esc(s.ralat)) : ''}</div>
      ${s.webhookBetul ? '' : '<button type="button" class="pk-btn ghost sm" id="pkPasang">Pasang webhook sekarang</button>'}
      <p class="pk-muted pk-small">Bot menerima arahan pantas dan bahasa biasa, menghantar amaran apabila pelayan rosak, dan laporan harian jam 08:00.</p>`;
    const b = $('#pkPasang'); if (b) b.addEventListener('click', async () => { b.disabled = true; try { const d = await api('/telegram/pasang', { method: 'POST', body: '{}' }); toast(d.ok ? 'Webhook dipasang.' : 'Gagal: ' + d.nota); await muatTelegram(); } catch (x) { toast(x.message); b.disabled = false; } });
  }

  /* ---------- Arahan kepada agen ---------- */
  $('#pkArahan').addEventListener('submit', async e => {
    e.preventDefault();
    const inp = $('#pkTeks'), teks = inp.value.trim(); if (!teks) return;
    const chat = $('#pkChat'), tambah = (c, t) => { const d = document.createElement('div'); d.className = 'pk-msg ' + c; d.textContent = t; chat.appendChild(d); chat.scrollTop = 1e9; return d; };
    tambah('pemilik', teks); inp.value = ''; inp.disabled = true;
    const w = tambah('agen tunggu', 'Agen sedang berfikir...');
    try { const d = await api('/papan/arahan', { method: 'POST', body: JSON.stringify({ teks }) }); w.className = 'pk-msg agen'; w.textContent = d.jawapan; }
    catch (x) { w.className = 'pk-msg agen'; w.textContent = 'Ralat: ' + x.message; }
    inp.disabled = false; inp.focus();
  });

  let saizT; window.addEventListener('resize', () => { clearTimeout(saizT); saizT = setTimeout(() => { if (D && !papan.hidden) { cartaBar($('#pkChartPelawat'), D.siriHari, 'tarikh', [{ k: 'pelawat', n: 'Pelawat', c: 'c1' }], $('#pkJadualPelawat')); cartaBar($('#pkChartToken'), D.tokenSiri, 'tarikh', [{ k: 'masuk', n: 'Masuk', c: 'c1' }, { k: 'keluar', n: 'Keluar', c: 'c2' }], $('#pkJadualToken')); } }, 200); });

  if (kunci()) muat().catch(e => { gate.hidden = false; $('#pkErr').textContent = e.message; $('#pkErr').hidden = false; });
})();
