/* Bijak Labur Premium: portfolio patuh Syariah (status setiap pegangan, pembersihan dividen, tarikh haul zakat)
   dan peringatan (haul, senarai Syariah SC Mei dan November). Data disimpan dalam peranti ini sahaja. */
(function () {
  const { fmtRM, field, FX, portfolio, valueOf, refreshPrices } = ProTools.kit;
  const TZ = 'Asia/Kuala_Lumpur', DAY = 864e5;
  const HIJRI_M = ['Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'];
  const SC_SAHAM = 'https://www.sc.com.my/development/icm/shariah/list-of-shariah-compliant-securities-by-the-shariah-advisory-council';
  const LABEL = { patuh: 'Patuh Syariah', tidak: 'Tidak patuh', ragu: 'Diragui', belum: 'Belum disaring' };
  const isPro = () => typeof Premium !== 'undefined' && !!Premium.plan;

  // meta[`type:SYM`] = { st, div, nisbah } ; st hanya untuk saham (kripto ikut senarai MPS SC dalam Pasaran)
  let meta = store.get('pfSyariah', {});
  let cfg = store.get('pfSyariahCfg', { haul: '', ingatHaul: true, ingatSC: true });
  const keyOf = h => `${h.type}:${h.sym}`;
  const statusOf = h => {
    if (h.type === 'crypto') return window.SyariahKripto ? window.SyariahKripto(h.sym).k : 'belum';
    return (meta[keyOf(h)] || {}).st || 'belum';
  };

  /* ---------- Tarikh Hijri ---------- */
  const hFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: TZ, day: 'numeric', month: 'numeric', year: 'numeric' });
  const hijri = d => {
    const p = Object.fromEntries(hFmt.formatToParts(new Date(d.getTime() + store.get('hijriAdj', 0) * DAY)).filter(x => x.type !== 'literal').map(x => [x.type, parseInt(x.value, 10)]));
    return { d: p.day, m: p.month, y: p.year };
  };
  const hStr = h => `${h.d} ${HIJRI_M[h.m - 1]} ${h.y}H`;
  const gFmt = new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
  const noon = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 4)); };
  // Haul seterusnya: ulang tahun Hijri tarikh mula (bulan dan hari Hijri yang sama)
  function nextHaul(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null;
    const start = noon(iso), h0 = hijri(start), today = Date.now() - DAY / 2;
    for (let k = 1; k < 200; k++) {
      const approx = start.getTime() + Math.round(k * 354.367) * DAY;
      let hit = null;
      for (const off of [0, -1, 1, -2, 2, -3, 3]) {
        const d = new Date(approx + off * DAY), h = hijri(d);
        if (h.m === h0.m && h.y === h0.y + k && (h.d === h0.d || (h0.d === 30 && h.d === 29))) { hit = d; break; }
      }
      const d = hit || new Date(approx);
      if (d.getTime() >= today) return d;
    }
    return null;
  }

  /* ---------- Paparan ---------- */
  const STOCK_OPT = ['patuh', 'tidak', 'belum'];
  function render(partial) {
    const hold = portfolio(), fx = FX.rate.v, root = $('#sySummary');
    if (!root) return;
    if (!hold.length) {
      root.innerHTML = '';
      $('#syTable').innerHTML = `<p class="muted pf-empty">Portfolio anda masih kosong. <button type="button" class="link-btn" data-sy-pf>Tambah pegangan dalam Portfolio</button> dahulu.</p>`;
      paintHaul(0); return;
    }
    let tot = 0, ok = 0, purify = 0;
    const rows = hold.map(h => {
      const k = keyOf(h), m = meta[k] || {}, st = statusOf(h), v = valueOf(h, fx).now || 0;
      tot += v; if (st === 'patuh') ok += v;
      const nisbah = m.nisbah != null && m.nisbah !== '' ? +m.nisbah : st === 'patuh' ? 0 : 100;
      const bersih = (+m.div || 0) * Math.min(Math.max(nisbah, 0), 100) / 100; purify += bersih;
      if (partial) { const o = $$('[data-sy-out]', root.parentNode).find(x => x.dataset.syOut === k); if (o) o.textContent = fmtRM(bersih); return ''; }
      const stCell = h.type === 'crypto'
        ? `<span class="sy sy-${st}">${LABEL[st]}</span><span class="muted small"> senarai MPS SC</span>`
        : `<select data-sy-st="${esc(k)}" aria-label="Status Syariah ${esc(h.sym)}">${STOCK_OPT.map(o => `<option value="${o}" ${o === st ? 'selected' : ''}>${LABEL[o]}</option>`).join('')}</select>`;
      return `<div class="pf-row sy-row">
        <div class="pf-main"><b>${esc(h.sym)}</b><span class="muted small">${h.type === 'crypto' ? 'Kripto' : 'Saham'} · ${fmtRM(v)}</span></div>
        <div class="sy-st">${stCell}</div>
        <div class="sy-div">
          <label>Dividen diterima (RM)<input type="number" min="0" step="any" inputmode="decimal" data-sy-div="${esc(k)}" value="${m.div ?? ''}"></label>
          <label>Bahagian tidak patuh (%)<input type="number" min="0" max="100" step="any" inputmode="decimal" data-sy-nisbah="${esc(k)}" value="${m.nisbah ?? ''}" placeholder="${nisbah}"></label>
          <span class="small">Bersihkan: <b class="num" data-sy-out="${esc(k)}">${fmtRM(bersih)}</b></span>
        </div>
      </div>`;
    }).join('');
    const share = tot ? ok / tot * 100 : 0, bad = hold.filter(h => statusOf(h) !== 'patuh');
    root.innerHTML = [
      [`${share.toFixed(0)}%`, 'Nilai portfolio patuh Syariah'], [fmtRM(tot - ok), 'Tidak patuh atau belum disaring'], [fmtRM(purify), 'Dividen perlu dibersihkan']
    ].map(([v, k]) => `<div class="stat"><div class="v num">${v}</div><div class="k">${k}</div></div>`).join('');
    if (partial) return;
    $('#syTable').innerHTML = rows;
    $('#syWarn').innerHTML = bad.length ? `<p class="small"><b>Perlu perhatian:</b> ${bad.map(h => `${esc(h.sym)} (${LABEL[statusOf(h)].toLowerCase()})`).join(', ')}.</p>` : '<p class="small">Semua pegangan anda berstatus patuh Syariah mengikut maklumat yang ada.</p>';
    paintHaul(tot);
  }

  function paintHaul(tot) {
    const el = $('#syHaul'); if (!el) return;
    const d = nextHaul(cfg.haul);
    if (!d) { el.innerHTML = '<p class="muted small">Pilih tarikh mula haul (tarikh harta anda mula mencapai nisab, atau tarikh zakat tahunan anda).</p>'; return; }
    const left = Math.ceil((d.getTime() - Date.now()) / DAY);
    el.innerHTML = `<div class="zk-due"><span>Haul seterusnya</span><b>${hStr(hijri(d))}</b></div>
      <p class="small">${gFmt.format(d)}, ${left <= 0 ? 'hari ini' : `${left} hari lagi`}. Anggaran zakat 2.5% atas nilai portfolio semasa: <b class="num">${fmtRM(tot * 0.025)}</b>, jika harta anda mencapai nisab.</p>
      <button type="button" class="btn sm ghost" data-sy-zakat>Kira dengan nisab dalam Zakat pelaburan</button>`;
  }

  /* ---------- Peringatan (semasa app dibuka; app Android/iOS juga menjadualkan notifikasi haul) ---------- */
  function scheduleNative(d) {
    const LN = plugin('LocalNotifications'); if (!LN) return;
    const at = new Date(d.getTime() - 7 * DAY);
    const id = 7300001;
    LN.cancel({ notifications: [{ id }] }).catch(() => {}).then(() => {
      if (!isPro() || !cfg.ingatHaul || at.getTime() < Date.now()) return;
      LN.schedule({ notifications: [{ id, title: 'Haul zakat pelaburan minggu depan', body: `Haul anda jatuh pada ${hStr(hijri(d))} (${gFmt.format(d)}). Semak nilai portfolio dan nisab dalam Bijak Labur.`, schedule: { at } }] }).catch(() => {});
    });
  }
  function remind() {
    if (!isPro()) return;
    const seen = store.get('pfSyariahIngat', {}), now = new Date();
    const d = nextHaul(cfg.haul);
    if (d) scheduleNative(d);
    if (cfg.ingatHaul && d) {
      const left = (d.getTime() - now.getTime()) / DAY, tag = d.toISOString().slice(0, 10);
      if (left <= 7 && seen.haul !== tag) { Notify.show('Haul zakat pelaburan hampir tiba', `${hStr(hijri(d))} (${gFmt.format(d)}). Kira zakat anda dalam Bijak Labur Premium.`); seen.haul = tag; }
    }
    // Senarai saham patuh Syariah SC dikemas kini pada hujung Mei dan hujung November
    if (cfg.ingatSC && portfolio().some(h => h.type === 'stock')) {
      const y = now.getFullYear(), m = now.getMonth(), day = now.getDate();
      const tag = (m === 4 && day >= 25) || (m >= 5 && m <= 10 && !(m === 10 && day >= 25)) ? `${y}-05` : `${m <= 4 ? y - 1 : y}-11`;
      if (seen.sc !== tag) {
        if (seen.sc) Notify.show('Senarai saham patuh Syariah SC dikemas kini', 'Semak status saham dalam portfolio anda dan kemas kini dalam Portfolio patuh Syariah.');
        seen.sc = tag;
      }
    }
    store.set('pfSyariahIngat', seen);
  }

  /* ---------- Alat ---------- */
  ProTools.add('syariah', {
    name: 'Portfolio patuh Syariah', plan: 'pelabur', icon: 'moon', desc: 'Status Syariah, haul zakat, pembersihan dividen',
    pitch: 'Lihat berapa peratus portfolio anda patuh Syariah, kira dividen yang perlu dibersihkan, dan dapatkan tarikh haul zakat dalam kalendar Hijri berserta peringatan.',
    html: `<div class="stat-row three" id="sySummary"></div>
      <div class="card"><h3>Setiap pegangan</h3><div class="list pf-list" id="syTable"></div><div id="syWarn"></div>
        <p class="source">Status kripto mengikut senarai Majlis Penasihat Syariah SC (sama seperti di Pasaran). Status saham Bursa anda pilih sendiri berdasarkan <a href="${SC_SAHAM}" target="_blank" rel="noopener">senarai sekuriti patuh Syariah SC</a> terkini (dikemas kini Mei dan November).</p></div>
      <div class="card"><h3>Haul zakat</h3>
        <form id="syForm" class="form-grid" autocomplete="off">
          ${field('syHaulIn', 'Tarikh mula haul', 'type="date"')}
          <label class="check"><input type="checkbox" id="syIngatHaul"><span>Ingatkan saya 7 hari sebelum haul</span></label>
          <label class="check"><input type="checkbox" id="syIngatSC"><span>Ingatkan apabila senarai Syariah SC baharu diterbitkan</span></label>
        </form>
        <div id="syHaul" aria-live="polite"></div></div>
      <details class="ob-help"><summary>Bagaimana membersihkan pelaburan?</summary>
        <p class="small">Mengikut garis panduan Majlis Penasihat Syariah SC: jika saham yang dahulunya patuh Syariah dikelaskan semula sebagai tidak patuh, pelabur boleh menyimpan dividen dan keuntungan sehingga tarikh pengumuman, dan digalakkan menjual apabila harga pasaran menyamai atau melebihi kos pelaburan. Keuntungan dan dividen selepas tarikh itu disalurkan kepada badan kebajikan. Jika saham tidak patuh dibeli sejak awal, ia perlu dijual dan sebarang keuntungan serta dividen dibersihkan.</p>
        <p class="small">Untuk saham patuh Syariah, sebahagian kecil pendapatan syarikat mungkin daripada aktiviti tidak patuh (di bawah penanda aras 5% atau 20%). Isi peratus itu daripada laporan tahunan jika anda mahu membersihkan bahagian tersebut.</p></details>
      <p class="source">Untuk pembelajaran, bukan fatwa. Rujuk pusat zakat negeri atau penasihat Syariah bertauliah sebelum membuat keputusan. Peringatan dipaparkan semasa app dibuka; dalam app Android dan iOS, peringatan haul juga dijadualkan sebagai notifikasi.</p>`,
    async init() {
      const tool = $('#tool-syariah');
      $('#syHaulIn').value = cfg.haul || ''; $('#syIngatHaul').checked = cfg.ingatHaul !== false; $('#syIngatSC').checked = cfg.ingatSC !== false;
      $('#syForm').addEventListener('submit', e => e.preventDefault());
      $('#syForm').addEventListener('change', async () => {
        cfg = { haul: $('#syHaulIn').value, ingatHaul: $('#syIngatHaul').checked, ingatSC: $('#syIngatSC').checked };
        store.set('pfSyariahCfg', cfg);
        if ((cfg.ingatHaul || cfg.ingatSC) && !Notify.granted()) await Notify.request();
        render(); remind();
      });
      const save = () => store.set('pfSyariah', meta);
      tool.addEventListener('change', e => {
        const s = e.target.closest('[data-sy-st]'); if (!s) return;
        (meta[s.dataset.sySt] = meta[s.dataset.sySt] || {}).st = s.value; save(); render();
      });
      tool.addEventListener('input', e => {
        const t = e.target, k = t.dataset.syDiv || t.dataset.syNisbah; if (!k) return;
        (meta[k] = meta[k] || {})[t.dataset.syDiv ? 'div' : 'nisbah'] = t.value; save();
        render(true);
      });
      tool.addEventListener('click', e => {
        if (e.target.closest('[data-sy-pf]')) ProTools.show('portfolio');
        if (e.target.closest('[data-sy-zakat]')) ProTools.show('zakat');
      });
      render();
      await refreshPrices();
      render();
    }
  });

  document.addEventListener('premiumchange', remind);
  document.addEventListener('viewchange', e => { if (e.detail === 'premium' && !$('#tool-syariah').classList.contains('hidden')) render(); });
})();
