/* SiswaCap: Jadual kelas UiTM. Data awam iCress (kampus, kursus, kumpulan) melalui pelayan jadual SiswaCap.
   Jadual disimpan dalam peranti supaya boleh dibuka tanpa talian. Tiada log masuk dan tiada data peribadi dihantar. */
(function () {
  const root = $('#view-jadual');
  if (!root) return;
  const API = (store.get('jadual_api', '') || 'https://jadual.bijaklabur.my').replace(/\/$/, '');
  const DAY = ['', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'];
  const DAY3 = ['', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Ahd'];
  const HUES = 8;
  const RE_COURSE = /^[A-Z]{2,4}\d{3}[A-Z]?$/;
  const RE_GROUP = /^[A-Z0-9]*[A-Z]{1,4}\d{3,4}[A-Z]\d?$/;

  const blank = () => ({ campus: '', campusName: '', faculty: '', picks: [], items: [], session: '', label: '', updated: 0, demo: false });
  let S = Object.assign(blank(), store.get('jadual', {}));
  let ui = { mode: store.get('jadual_mode', innerWidth < 760 ? 'hari' : 'minggu'), day: 0, editing: !S.items.length, campuses: null, faculties: null, courses: {}, groups: {} };
  const save = () => store.set('jadual', S);

  /* ---------- Masa ---------- */
  const fmt = m => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'pg' : h < 14 ? 'tgh' : h < 19 ? 'ptg' : 'mlm'}`; };
  const fmtShort = m => { const h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''}`; };
  const until = m => m >= 1440 ? `${Math.floor(m / 1440)} hari${m % 1440 ? ' ' + dur(m % 1440) : ''}` : dur(m);
  const dur = m => { const h = Math.floor(m / 60), r = m % 60; return h && r ? `${h} j ${r} min` : h ? `${h} jam` : `${r} min`; };
  function nowMY() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return { d: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1, m: (+p.hour % 24) * 60 + +p.minute };
  }

  /* ---------- Data ---------- */
  const slotsAll = () => S.items.flatMap((it, i) => it.slots.map(s => ({ ...s, it, hue: i % HUES, key: `${i}:${s.d}:${s.s}` })));
  /** Set kunci slot yang bertindih dengan kursus lain; .has(slot) membandingkan mengikut kunci */
  function clashes() {
    const all = slotsAll(), keys = new Set(), courses = new Set();
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (a.d === b.d && a.s < b.e && b.s < a.e && a.it !== b.it) { keys.add(a.key); keys.add(b.key); courses.add(a.it.course); courses.add(b.it.course); }
    }
    return { size: keys.size, has: s => keys.has(s.key), courses: [...courses] };
  }
  // Nama kursus iCress dalam huruf besar: "DATA MINING" -> "Data Mining"
  const SMALL = new Set(['and', 'of', 'for', 'in', 'the', 'to', 'dan', 'untuk', 'dalam', 'di', 'ke']);
  const nice = t => /[a-z]/.test(t || '') ? t : String(t || '').toLowerCase().replace(/[^\s]+/g, (w, i) => (i && SMALL.has(w)) ? w : /^(i|ii|iii|iv|v|vi)$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1));
  function nextClass() {
    const n = nowMY(), all = slotsAll();
    if (!all.length) return null;
    const now = all.find(s => s.d === n.d && s.s <= n.m && n.m < s.e);
    if (now) return { s: now, live: true, left: now.e - n.m };
    let best = null, bestIn = Infinity;
    for (const s of all) {
      let delta = ((s.d - n.d + 7) % 7) * 1440 + s.s - n.m;
      if (delta <= 0) delta += 7 * 1440;
      if (delta < bestIn) { best = s; bestIn = delta; }
    }
    return { s: best, live: false, in: bestIn };
  }
  const days = () => {
    const used = new Set(slotsAll().map(s => s.d));
    // Kampus Kelantan dan Terengganu: minggu Ahad hingga Khamis
    const kel = used.has(7) && !used.has(5);
    const order = kel ? [7, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
    const base = kel ? [7, 1, 2, 3, 4] : [1, 2, 3, 4, 5];
    return order.filter(d => base.includes(d) || used.has(d));
  };

  async function api(path) {
    let r;
    try { r = await fetch(API + path, { headers: { accept: 'application/json' } }); }
    catch { throw new Error(navigator.onLine === false ? 'Tiada sambungan internet.' : 'Pelayan jadual belum dapat dihubungi. Cuba lagi sebentar.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Pelayan jadual tidak dapat dihubungi.');
    return j;
  }
  const q = o => '?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v)).toString();

  /** Teks slip pendaftaran / halaman MyStudent -> [{ course, group }] */
  function parsePaste(t) {
    const tok = String(t).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
    const out = [];
    for (let i = 0; i < tok.length; i++) {
      if (!RE_COURSE.test(tok[i]) || /^\d/.test(tok[i])) continue;
      let group = '';
      for (let j = i + 1; j < Math.min(tok.length, i + 12); j++) {
        if (RE_COURSE.test(tok[j]) && !RE_GROUP.test(tok[j])) break;
        if (RE_GROUP.test(tok[j])) { group = tok[j]; break; }
      }
      if (!out.some(p => p.course === tok[i])) out.push({ course: tok[i], group });
    }
    return out;
  }

  /* ---------- Paparan ---------- */
  function render() {
    root.innerHTML = `
      <div class="page-head with-aside">
        <div>
          <p class="eyebrow">Untuk pelajar UiTM</p>
          <h1 id="h-jadual">Jadual kelas</h1>
          <p class="lead">${S.items.length ? esc(`${S.campusName || 'Kampus ' + S.campus}${S.label ? ' · ' + S.label : ''}`) : 'Pilih kampus, masukkan kod kursus dan kumpulan anda, dan jadual mingguan anda tersusun sendiri daripada data jadual rasmi UiTM.'}</p>
        </div>
        ${S.items.length && !ui.editing ? `<div class="jd-head-acts">
          <button class="btn sm ghost" data-act="edit">${icon('sliders')}Urus kursus</button>
        </div>` : ''}
      </div>
      ${S.demo && S.items.length ? `<p class="jd-demo">${icon('alert')}<span>Ini jadual contoh. Tekan <b>Urus kursus</b> untuk membina jadual anda sendiri.</span></p>` : ''}
      ${ui.editing ? setupHTML() : ''}
      ${S.items.length && !ui.editing ? viewHTML() : ''}
      <p class="note">${icon('alert')}<span>Data jadual dibaca daripada sumber jadual awam UiTM dan boleh berubah. Sahkan dengan jadual rasmi di MyStudent. SiswaCap tidak bergabung dengan UiTM.</span></p>`;
    if (ui.editing) bindSetup(); else bindView();
  }

  function setupHTML() {
    const picks = S.picks;
    return `<div class="jd-setup">
      <form class="card jd-stu" id="jdStu" novalidate>
        <h3>Cara paling cepat: No. Pelajar</h3>
        <p class="muted small">Masukkan No. Pelajar UiTM anda (10 digit). Jadual kelas anda dimuatkan terus daripada data jadual pelajar UiTM. Tiada kata laluan diperlukan.</p>
        <div class="inline-form">
          <input id="jdStuId" inputmode="numeric" autocomplete="off" maxlength="10" pattern="\\d{10}" placeholder="Cth. 2023123456" aria-label="No. Pelajar" value="${esc(S.student || '')}">
          <button class="btn" type="submit" id="jdStuGo">${icon('search')}Dapatkan jadual</button>
        </div>
        <p class="err" id="jdStuErr"></p>
      </form>
      <div class="jd-or"><span>atau bina sendiri ikut kampus, kursus dan kumpulan</span></div>
      <div class="card jd-step">
        <div class="jd-step-n">1</div>
        <div class="jd-step-b">
          <h3>Kampus anda</h3>
          <div class="form-grid jd-cf">
            <div class="field"><label for="jdCampus">Kampus</label><select id="jdCampus"><option value="">${ui.campuses ? 'Pilih kampus' : 'Memuatkan senarai kampus'}</option>${(ui.campuses || []).map(c => `<option value="${esc(c.id)}"${c.id === S.campus ? ' selected' : ''}>${esc(c.text)}</option>`).join('')}</select></div>
            <div class="field${S.campus === 'B' ? '' : ' hidden'}" id="jdFacWrap"><label for="jdFac">Fakulti (Shah Alam)</label><select id="jdFac"><option value="">Pilih fakulti</option>${(ui.faculties || []).map(f => `<option value="${esc(f.id)}"${f.id === S.faculty ? ' selected' : ''}>${esc(f.id + ' · ' + f.text)}</option>`).join('')}</select></div>
          </div>
          <p class="err" id="jdCampErr"></p>
        </div>
      </div>

      <div class="card jd-step">
        <div class="jd-step-n">2</div>
        <div class="jd-step-b">
          <h3>Kursus dan kumpulan</h3>
          <p class="muted small">Salin teks jadual atau senarai kursus anda dari MyStudent, kemudian tampal di bawah. Kod kursus dan kumpulan dikesan sendiri.</p>
          <textarea id="jdPaste" rows="3" placeholder="Contoh: CSC584 ENTERPRISE PROGRAMMING CS2305A  ITS662 DATA MINING CS2305A"></textarea>
          <button class="btn sm ghost jd-mt" id="jdDetect">${icon('search')}Kesan kursus</button>
          <div class="jd-or"><span>atau tambah satu per satu</span></div>
          <form class="inline-form jd-add" id="jdAdd">
            <input id="jdCourse" list="jdCourseList" placeholder="Kod kursus" autocomplete="off" autocapitalize="characters" maxlength="8" aria-label="Kod kursus">
            <datalist id="jdCourseList"></datalist>
            <select id="jdGroup" aria-label="Kumpulan"><option value="">Kumpulan</option></select>
            <button class="btn ghost" type="submit">${icon('plus')}Tambah</button>
          </form>
          <p class="err" id="jdAddErr"></p>
          <ul class="jd-picks" id="jdPicks">${picks.map((p, i) => pickHTML(p, i)).join('')}</ul>
        </div>
      </div>

      <div class="jd-build">
        <button class="btn" id="jdBuild"${picks.length ? '' : ' disabled'}>${icon('calendar')}Bina jadual saya</button>
        ${S.items.length ? `<button class="btn ghost" data-act="cancel">Batal</button>` : `<button class="link-btn" data-act="demo">Lihat contoh jadual dahulu</button>`}
      </div>
      <p class="err" id="jdBuildErr"></p>

    </div>`;
  }
  const pickHTML = (p, i) => `<li class="jd-pick" style="--h:var(--jd${i % HUES})">
      <span class="jd-dot"></span><b>${esc(p.course)}</b>
      ${p.group ? `<span class="jd-grp">${esc(p.group)}</span>` : `<select class="jd-pick-g" data-i="${i}" aria-label="Pilih kumpulan ${esc(p.course)}"><option value="">Pilih kumpulan</option></select>`}
      <button class="icon-btn plain" data-del="${i}" aria-label="Buang ${esc(p.course)}">${icon('x')}</button>
    </li>`;

  function viewHTML() {
    const nx = nextClass(), cl = clashes(), all = slotsAll();
    const mins = all.reduce((a, s) => a + s.e - s.s, 0);
    const perDay = days().map(d => all.filter(s => s.d === d).reduce((a, s) => a + s.e - s.s, 0));
    const busiest = days()[perDay.indexOf(Math.max(...perDay))];
    return `
      <div class="jd-top">
        ${nx ? `<div class="jd-next" style="--h:var(--jd${nx.s.hue})">
          <div class="jd-next-k">${nx.live ? '<span class="jd-live"></span>Sedang berlangsung' : 'Kelas seterusnya'}</div>
          <div class="jd-next-c">${esc(nx.s.it.course)}</div>
          <div class="jd-next-n">${esc(nice(nx.s.it.name) || nx.s.it.group)}</div>
          <div class="jd-next-row">
            <span>${icon('clock')}${DAY[nx.s.d]}, ${fmt(nx.s.s)} hingga ${fmt(nx.s.e)}</span>
            ${nx.s.room ? `<span>${icon('pin')}${esc(nx.s.room)}</span>` : ''}
          </div>
          <div class="jd-next-t num">${nx.live ? `Tamat dalam ${dur(nx.left)}` : `Bermula dalam ${until(nx.in)}`}</div>
        </div>` : ''}
        <div class="stat-row jd-stats">
          <div class="stat"><div class="v">${S.items.length}</div><div class="k">kursus</div></div>
          <div class="stat"><div class="v">${Math.round(mins / 6) / 10}</div><div class="k">jam kelas seminggu</div></div>
          <div class="stat"><div class="v">${busiest ? DAY3[busiest] : '-'}</div><div class="k">hari paling padat</div></div>
        </div>
      </div>
      ${cl.size ? `<div class="jd-clash">${icon('alert')}<span><b>Kelas bertindih.</b> ${cl.courses.map(esc).join(', ')} bertembung masa. Tukar kumpulan dalam Urus kursus.</span></div>` : ''}
      <div class="row-between jd-bar">
        <div class="segmented" role="tablist" aria-label="Paparan jadual">
          <button class="seg${ui.mode === 'minggu' ? ' active' : ''}" data-mode="minggu" role="tab" aria-selected="${ui.mode === 'minggu'}">Minggu</button>
          <button class="seg${ui.mode === 'hari' ? ' active' : ''}" data-mode="hari" role="tab" aria-selected="${ui.mode === 'hari'}">Hari</button>
        </div>
        <div class="jd-acts">
          <button class="icon-btn" data-act="refresh" aria-label="Kemas kini jadual" title="Kemas kini jadual">${icon('refresh')}</button>
          <button class="icon-btn" data-act="ics" aria-label="Simpan ke kalendar telefon" title="Simpan ke kalendar">${icon('calendar')}</button>
        </div>
      </div>
      ${ui.mode === 'minggu' ? weekHTML(cl) : dayHTML(cl)}
      <div class="jd-legend">${S.items.map((it, i) => `<div class="jd-lg" style="--h:var(--jd${i % HUES})">
        <span class="jd-dot"></span>
        <div><b>${esc(it.course)}</b> <span class="muted">${esc(it.group)}</span><div class="small muted">${esc(nice(it.name))}</div></div>
        <span class="small muted num">${dur(it.slots.reduce((a, s) => a + s.e - s.s, 0))}</span>
      </div>`).join('')}</div>
      ${S.updated && !S.demo ? `<p class="source">Dikemas kini ${new Date(S.updated).toLocaleString('ms-MY', { dateStyle: 'medium', timeStyle: 'short' })}</p>` : ''}
      <div class="card jd-save">
        <h3>Simpan dan kongsi jadual</h3>
        <div class="jd-save-g">
          <button data-act="jpg"><span class="sc-ico">${icon('download')}</span><b>Gambar JPG</b><small>Simpan ke galeri</small></button>
          <button data-act="pdf"><span class="sc-ico">${icon('file')}</span><b>PDF</b><small>Untuk cetak atau hantar</small></button>
          <button data-act="wall"><span class="sc-ico">${icon('phone')}</span><b>Skrin kunci</b><small>Wallpaper jadual mingguan</small></button>
          <button data-act="home"><span class="sc-ico">${icon('home')}</span><b>Skrin utama</b><small>Ikon terus ke jadual</small></button>
          <button data-act="ics"><span class="sc-ico">${icon('calendar')}</span><b>Kalendar</b><small>Dengan peringatan kelas</small></button>
          <button data-act="print"><span class="sc-ico">${icon('printer')}</span><b>Cetak</b><small>Grid minggu</small></button>
        </div>
      </div>`;
  }

  function weekHTML(cl) {
    const ds = days(), all = slotsAll(), n = nowMY();
    const lo = Math.min(8 * 60, ...all.map(s => Math.floor(s.s / 60) * 60));
    const hi = Math.max(17 * 60, ...all.map(s => Math.ceil(s.e / 60) * 60));
    const H = 56, px = m => (m - lo) / 60 * H;
    const hours = []; for (let m = lo; m < hi; m += 60) hours.push(m);
    const col = d => {
      const ss = all.filter(s => s.d === d).sort((a, b) => a.s - b.s);
      // Lorong untuk kelas bertindih supaya kedua-duanya kelihatan; lebar dikira bagi setiap kelompok bertindih sahaja
      let cluster = [], lanes = [], end = -1;
      const close = () => { for (const c of cluster) c.n = lanes.length; cluster = []; lanes = []; };
      for (const s of ss) {
        if (s.s >= end) close();
        let l = lanes.findIndex(e => e <= s.s); if (l < 0) { l = lanes.length; lanes.push(0); }
        lanes[l] = s.e; s.lane = l; cluster.push(s); end = Math.max(end, s.e);
      }
      close();
      return ss.map(s => { const w = 100 / s.n; return `<button class="jd-blk${cl.has(s) ? ' clash' : ''}${s.e - s.s < 75 ? ' short' : ''}" style="--h:var(--jd${s.hue});top:${px(s.s)}px;height:${px(s.e) - px(s.s) - 3}px;left:calc(${s.lane * w}% + 3px);width:calc(${w}% - 6px)" data-slot="${S.items.indexOf(s.it)}:${s.d}:${s.s}">
        <b>${esc(s.it.course)}</b><span class="num">${fmtShort(s.s)} - ${fmtShort(s.e)}</span>${s.room ? `<span class="rm">${esc(s.room)}</span>` : ''}
      </button>`; }).join('');
    };
    return `<div class="jd-week card flush" style="--cols:${ds.length}">
      <div class="jd-wh"><span></span>${ds.map(d => `<span class="${d === n.d ? 'today' : ''}">${DAY3[d]}<i>${DAY[d]}</i></span>`).join('')}</div>
      <div class="jd-wb" style="height:${px(hi)}px">
        <div class="jd-hours">${hours.map(m => `<span style="top:${px(m)}px">${fmtShort(m)} ${m < 720 ? 'pg' : m < 840 ? 'tgh' : m < 1140 ? 'ptg' : 'mlm'}</span>`).join('')}</div>
        ${ds.map(d => `<div class="jd-col${d === n.d ? ' today' : ''}">${hours.map(m => `<i style="top:${px(m)}px"></i>`).join('')}${d === n.d && n.m > lo && n.m < hi ? `<div class="jd-now" style="top:${px(n.m)}px"></div>` : ''}${col(d)}</div>`).join('')}
      </div>
    </div>`;
  }

  function dayHTML(cl) {
    const ds = days(), all = slotsAll(), n = nowMY();
    if (!ds.includes(ui.day)) ui.day = ds.includes(n.d) ? n.d : ds[0];
    const ss = all.filter(s => s.d === ui.day).sort((a, b) => a.s - b.s);
    let html = '', prev = null;
    for (const s of ss) {
      if (prev && s.s - prev.e >= 30) html += `<li class="jd-gap"><span>Rehat ${dur(s.s - prev.e)}</span></li>`;
      const live = ui.day === n.d && s.s <= n.m && n.m < s.e, done = ui.day === n.d && n.m >= s.e;
      html += `<li class="jd-item${cl.has(s) ? ' clash' : ''}${live ? ' live' : ''}${done ? ' done' : ''}" style="--h:var(--jd${s.hue})">
        <div class="jd-it-t num"><b>${fmtShort(s.s)}</b><span>${fmtShort(s.e)}</span></div>
        <div class="jd-it-c">
          <div class="jd-it-top"><b>${esc(s.it.course)}</b><span class="jd-grp">${esc(s.it.group)}</span>${live ? '<span class="jd-tag">Sekarang</span>' : ''}${cl.has(s) ? '<span class="jd-tag bad">Bertindih</span>' : ''}</div>
          ${s.it.name ? `<div class="jd-it-n">${esc(nice(s.it.name))}</div>` : ''}
          <div class="jd-it-m">${icon('clock')}${fmt(s.s)} hingga ${fmt(s.e)} · ${dur(s.e - s.s)}${s.room ? `<span>${icon('pin')}${esc(s.room)}</span>` : ''}</div>
        </div>
      </li>`;
      prev = s;
    }
    return `<div class="chips jd-days" role="tablist" aria-label="Hari">${ds.map(d => {
      const c = all.filter(s => s.d === d).length;
      return `<button class="chip${d === ui.day ? ' active' : ''}${d === n.d ? ' today' : ''}" data-day="${d}" role="tab" aria-selected="${d === ui.day}">${DAY[d]}<span class="done-n">${c || ''}</span></button>`;
    }).join('')}</div>
    ${ss.length ? `<ol class="jd-list">${html}</ol>` : `<div class="card jd-free">${icon('sun')}<div><b>Tiada kelas pada hari ${DAY[ui.day]}</b><div class="muted small">Masa untuk ulang kaji atau rehat.</div></div></div>`}`;
  }

  /* ---------- Tindakan ---------- */
  function bindView() {
    root.onclick = e => {
      const b = e.target.closest('[data-mode],[data-day],[data-act],[data-slot]');
      if (!b) return;
      if (b.dataset.mode) { ui.mode = b.dataset.mode; store.set('jadual_mode', ui.mode); render(); }
      else if (b.dataset.day) { ui.day = +b.dataset.day; render(); }
      else if (b.dataset.slot) {
        const [i, d, st] = b.dataset.slot.split(':').map(Number), it = S.items[i], sl = it.slots.find(x => x.d === d && x.s === st);
        toast(`${it.course}${it.name ? ' ' + nice(it.name) : ''} · ${DAY[d]} ${fmt(sl.s)} hingga ${fmt(sl.e)}${sl.room ? ' · ' + sl.room : ''}`, 4000);
      }
      else act(b.dataset.act, b);
    };
  }
  async function act(a, b) {
    if (a === 'edit') { ui.editing = true; render(); loadCampuses(); }
    else if (a === 'refresh') {
      if (S.demo) { toast('Jadual contoh tidak dikemas kini.'); return; }
      b.disabled = true; b.innerHTML = '<span class="spinner"></span>';
      try { await build(); toast('Jadual dikemas kini'); } catch (err) { toast(err.message, 4000); render(); }
    }
    else if (a === 'ics') ics();
    else if (a === 'print') printTable();
    else if (a === 'jpg' || a === 'pdf') exportImage(a, b);
    else if (a === 'wall') { if (window.SkrinKunci) SkrinKunci.open(); }
    else if (a === 'home') addHome();
  }

  async function loadCampuses() {
    try {
      if (!ui.campuses) { ui.campuses = await api('/campuses'); refreshSelects(); }
      if (S.campus === 'B' && !ui.faculties) { ui.faculties = await api('/faculties'); refreshSelects(); }
      if (S.campus) loadCourses();
    } catch (err) {
      const el = $('#jdCampErr'); if (el) el.textContent = err.message + ' Anda masih boleh melihat jadual contoh di bawah.';
      const o = $('#jdCampus option[value=""]'); if (o && !ui.campuses) o.textContent = 'Senarai kampus tidak dapat dimuatkan';
    }
  }
  function refreshSelects() {
    if (!ui.editing) return;
    const keep = { paste: $('#jdPaste')?.value || '', course: $('#jdCourse')?.value || '' };
    render();
    $('#jdPaste').value = keep.paste; $('#jdCourse').value = keep.course;
  }
  const ckey = () => S.campus + ':' + (S.faculty || '');
  async function loadCourses() {
    if (!S.campus || (S.campus === 'B' && !S.faculty)) return;
    const k = ckey();
    try {
      if (!ui.courses[k]) ui.courses[k] = await api('/courses' + q({ campus: S.campus, faculty: S.faculty }));
      const dl = $('#jdCourseList');
      if (dl && k === ckey()) dl.innerHTML = ui.courses[k].map(c => `<option value="${esc(c.code)}">${esc(c.name)}</option>`).join('');
      S.picks.forEach((p, i) => { if (!p.group) fillGroupSelect($(`.jd-pick-g[data-i="${i}"]`), p.course); });
    } catch (err) { const el = $('#jdAddErr'); if (el) el.textContent = err.message; }
  }
  async function groupsOf(course) {
    const k = ckey() + ':' + course;
    if (!ui.groups[k]) ui.groups[k] = await api('/groups' + q({ campus: S.campus, faculty: S.faculty, course }));
    return ui.groups[k];
  }
  const groupLabel = g => `${g.group} · ${g.slots.map(s => `${DAY3[s.d]} ${fmtShort(s.s)}-${fmtShort(s.e)}`).join(', ') || 'tiada masa'}`;
  async function fillGroupSelect(sel, course) {
    if (!sel) return;
    sel.innerHTML = '<option value="">Memuatkan kumpulan</option>';
    try {
      const gs = await groupsOf(course);
      sel.innerHTML = `<option value="">${gs.length ? 'Pilih kumpulan' : 'Tiada kumpulan dijumpai'}</option>` + gs.map(g => `<option value="${esc(g.group)}">${esc(groupLabel(g))}</option>`).join('');
    } catch (err) { sel.innerHTML = `<option value="">${esc(err.message)}</option>`; }
  }

  function bindSetup() {
    $('#jdStu').onsubmit = async e => {
      e.preventDefault();
      const id = $('#jdStuId').value.replace(/\D/g, ''), err = $('#jdStuErr'), go = $('#jdStuGo');
      err.textContent = '';
      if (!/^\d{10}$/.test(id)) { err.textContent = 'No. Pelajar UiTM mempunyai 10 digit, cth. 2023123456.'; return; }
      go.disabled = true; go.innerHTML = '<span class="spinner"></span> Memuatkan';
      try {
        const d = await api('/pelajar' + q({ id }));
        Object.assign(S, { student: id, items: d.items, picks: d.items.map(i => ({ course: i.course, group: i.group })), campusName: 'Jadual peribadi', label: 'Mengikut No. Pelajar', session: '', updated: Date.now(), demo: false });
        save(); ui.editing = false; render();
        toast(`${d.items.length} kursus dimuatkan`);
      } catch (x) { err.textContent = x.message; go.disabled = false; go.innerHTML = `${icon('search')}Dapatkan jadual`; }
    };
    root.onclick = e => {
      const del = e.target.closest('[data-del]');
      if (del) { S.picks.splice(+del.dataset.del, 1); save(); refreshSelects(); return; }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'cancel') { ui.editing = false; render(); }
      if (b.dataset.act === 'demo') demo();
    };
    $('#jdCampus').onchange = e => {
      S.campus = e.target.value; S.campusName = e.target.selectedOptions[0]?.textContent || ''; S.faculty = '';
      save(); $('#jdFacWrap').classList.toggle('hidden', S.campus !== 'B');
      if (S.campus === 'B' && !ui.faculties) loadCampuses(); else loadCourses();
    };
    $('#jdFac').onchange = e => { S.faculty = e.target.value; save(); loadCourses(); };
    $('#jdDetect').onclick = () => {
      const found = parsePaste($('#jdPaste').value);
      if (!found.length) { $('#jdAddErr').textContent = 'Tiada kod kursus dikesan. Kod kursus UiTM berbentuk tiga huruf dan tiga nombor, cth. CSC584.'; return; }
      for (const f of found) { const i = S.picks.findIndex(p => p.course === f.course); if (i < 0) S.picks.push(f); else if (f.group) S.picks[i].group = f.group; }
      save(); $('#jdPaste').value = ''; refreshSelects(); loadCourses();
      toast(`${found.length} kursus dikesan`);
    };
    const courseIn = $('#jdCourse'), groupSel = $('#jdGroup');
    let t;
    courseIn.oninput = () => {
      courseIn.value = courseIn.value.toUpperCase().replace(/\s/g, '');
      clearTimeout(t);
      if (RE_COURSE.test(courseIn.value) && S.campus) t = setTimeout(() => fillGroupSelect(groupSel, courseIn.value), 250);
    };
    $('#jdAdd').onsubmit = e => {
      e.preventDefault();
      const course = courseIn.value.trim().toUpperCase(), group = groupSel.value;
      const err = $('#jdAddErr');
      if (!RE_COURSE.test(course)) { err.textContent = 'Masukkan kod kursus yang sah, cth. CSC584.'; return; }
      if (S.picks.some(p => p.course === course)) { err.textContent = `${course} sudah ada dalam senarai.`; return; }
      S.picks.push({ course, group }); save(); refreshSelects(); loadCourses();
    };
    root.onchange = e => {
      const sel = e.target.closest('.jd-pick-g');
      if (sel && sel.value) { S.picks[+sel.dataset.i].group = sel.value; save(); refreshSelects(); }
    };
    $('#jdBuild').onclick = async () => {
      const err = $('#jdBuildErr'), btn = $('#jdBuild');
      if (!S.campus) { err.textContent = 'Pilih kampus dahulu.'; return; }
      if (S.campus === 'B' && !S.faculty) { err.textContent = 'Pilih fakulti untuk kampus Shah Alam.'; return; }
      const noGroup = S.picks.filter(p => !p.group).map(p => p.course);
      if (noGroup.length) { err.textContent = `Pilih kumpulan untuk ${noGroup.join(', ')}.`; return; }
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Membina jadual';
      try { await build(); ui.editing = false; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      catch (e2) { err.textContent = e2.message; btn.disabled = false; btn.innerHTML = icon('calendar') + 'Bina jadual saya'; }
    };
  }

  async function build() {
    const d = await api('/timetable' + q({ campus: S.campus, faculty: S.faculty, pick: S.picks.map(p => p.course + '.' + p.group).join(',') }));
    if (!d.items.length) throw new Error('Tiada kelas dijumpai untuk kursus dan kumpulan ini. Semak semula kod kumpulan.');
    Object.assign(S, { items: d.items, session: d.session || '', label: d.label ? 'Sesi ' + d.label : '', updated: Date.now(), demo: false });
    save(); render();
    if (d.missing && d.missing.length) toast(`Tidak dijumpai: ${d.missing.map(m => m.course + ' ' + m.group).join(', ')}`, 5000);
  }

  function demo() {
    const sl = (d, s, e, room) => ({ d, s: s * 60, e: e * 60, room });
    S = Object.assign(blank(), {
      campus: 'B', campusName: 'Contoh: UiTM Shah Alam', label: 'Sesi Okt 2026 hingga Feb 2027', demo: true,
      items: [
        { course: 'CSC584', name: 'Enterprise Programming', group: 'CS2305A', slots: [sl(1, 8, 10, 'BK 1'), sl(3, 14, 16, 'Makmal Komputer 6')] },
        { course: 'ITS662', name: 'Data Mining', group: 'CS2305A', slots: [sl(1, 11, 13, 'DK 3'), sl(4, 9, 11, 'Makmal Komputer 2')] },
        { course: 'CSC577', name: 'Software Engineering Project', group: 'CS2305A', slots: [sl(2, 10, 12, 'BK 4'), sl(5, 8.5, 10.5, 'BK 4')] },
        { course: 'ISP550', name: 'Information Systems Security', group: 'CS2305A', slots: [sl(2, 14, 16, 'DK 1')] },
        { course: 'CTU554', name: 'Values and Civilisation', group: 'CS2305A', slots: [sl(3, 8, 10, 'DKP 2')] },
        { course: 'ELC650', name: 'English for Professional Interaction', group: 'CS2305A', slots: [sl(4, 14, 16, 'BK 7')] }
      ]
    });
    S.picks = S.items.map(i => ({ course: i.course, group: i.group }));
    ui.editing = false; render();
  }

  /* Fail kalendar .ics: setiap kelas berulang mingguan selama 14 minggu */
  function ics() {
    const pad = n => String(n).padStart(2, '0');
    // Tarikh hari ini mengikut waktu Malaysia (UTC+8); tarikh UTC masih semalam antara 12:00 tengah malam dan 8:00 pagi
    const n = nowMY(), today = new Date(Date.now() + 8 * 3600e3);
    const stamp = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    const escI = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SiswaCap//Jadual UiTM//MS', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Jadual kelas UiTM'];
    slotsAll().forEach((s, i) => {
      // Tarikh kejadian pertama: minggu ini (atau minggu depan jika sudah lepas), waktu Malaysia UTC+8
      let add = (s.d - n.d + 7) % 7; if (add === 0 && s.e <= n.m) add = 7;
      const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + add));
      const start = new Date(base.getTime() + (s.s - 480) * 60000), end = new Date(base.getTime() + (s.e - 480) * 60000);
      lines.push('BEGIN:VEVENT', `UID:bl-${S.session || 'jadual'}-${i}-${s.it.course}@bijaklabur.my`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
        'RRULE:FREQ=WEEKLY;COUNT=14', `SUMMARY:${escI(s.it.course + (s.it.name ? ' ' + nice(s.it.name) : ''))}`, `LOCATION:${escI(s.room || '')}`,
        `DESCRIPTION:${escI('Kumpulan ' + s.it.group + '. Daripada SiswaCap.')}`, 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', `DESCRIPTION:${escI(s.it.course)}`, 'END:VALARM', 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const file = new File([blob], 'jadual-kelas-uitm.ics', { type: 'text/calendar' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'Jadual kelas' }).catch(() => {}); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Fail kalendar dimuat turun. Buka untuk menambah ke kalendar telefon.', 4000);
  }

  function printTable() {
    const prevMode = ui.mode; ui.mode = 'minggu'; render();
    document.body.classList.add('jd-printing');
    const done = () => { document.body.classList.remove('jd-printing'); ui.mode = prevMode; render(); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done);
    setTimeout(() => print(), 60);
  }

  /* ---------- Eksport gambar, PDF dan wallpaper (lukisan kanvas sendiri, tanpa pustaka luar) ---------- */
  const PAL = {
    light: ['#0b7a5c', '#2f62d1', '#b4581f', '#7a4bd0', '#b8326a', '#0d7fa0', '#8a6a00', '#4f6b2a'],
    dark: ['#4fcfa4', '#7ea6ff', '#f0a066', '#b597ff', '#f586b4', '#5ccbea', '#e3c45a', '#a7cf72']
  };
  const FONT = (w, px) => `${w} ${px}px Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  function mix(hex, other, t) {
    const a = hex.match(/\w\w/g).map(x => parseInt(x, 16)), b = other.match(/\w\w/g).map(x => parseInt(x, 16));
    return '#' + a.map((v, i) => Math.round(v * t + b[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
  }
  function rr(x, c, X, Y, W, H, R) { x.beginPath(); x.roundRect ? x.roundRect(X, Y, W, H, R) : x.rect(X, Y, W, H); if (c) { x.fillStyle = c; x.fill(); } }
  function fitText(x, t, w) { if (x.measureText(t).width <= w) return t; while (t.length > 1 && x.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; }

  /** Lukis grid minggu dalam segi empat (gx, gy, gw, gh) */
  function drawGrid(x, gx, gy, gw, gh, dark, k) {
    const ds = days(), all = slotsAll(), cl = clashes(), pal = PAL[dark ? 'dark' : 'light'];
    const bg = dark ? '#161c19' : '#ffffff', line = dark ? '#2a332f' : '#e6e3da', muted = dark ? '#9aa49f' : '#646d68', text = dark ? '#e8ece9' : '#14201b';
    const lo = Math.min(8 * 60, ...all.map(s => Math.floor(s.s / 60) * 60)), hi = Math.max(17 * 60, ...all.map(s => Math.ceil(s.e / 60) * 60));
    const tc = 64 * k, head = 52 * k, cw = (gw - tc) / ds.length, ph = (gh - head) / ((hi - lo) / 60);
    const Y = m => gy + head + (m - lo) / 60 * ph;
    rr(x, bg, gx, gy, gw, gh, 22 * k);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    ds.forEach((d, i) => { x.font = FONT(700, 17 * k); x.fillStyle = muted; x.fillText(cw > 150 * k ? DAY[d] : DAY3[d], gx + tc + cw * (i + .5), gy + head / 2); });
    x.strokeStyle = line; x.lineWidth = 1.5 * k;
    for (let m = lo; m < hi; m += 60) {
      x.beginPath(); x.moveTo(gx + tc, Y(m)); x.lineTo(gx + gw - 14 * k, Y(m)); x.setLineDash(m === lo ? [] : [4 * k, 5 * k]); x.stroke();
      { x.font = FONT(500, 13 * k); x.fillStyle = muted; x.textAlign = 'right'; x.fillText(`${fmtShort(m)} ${m < 720 ? 'pg' : m < 840 ? 'tgh' : m < 1140 ? 'ptg' : 'mlm'}`, gx + tc - 10 * k, Y(m) + 12 * k); }
    }
    x.setLineDash([]);
    ds.forEach((d, i) => {
      const ss = all.filter(s => s.d === d).sort((a, b) => a.s - b.s);
      let lanes = [], end = -1, cluster = [];
      const close = () => { cluster.forEach(c => c.n = lanes.length); cluster = []; lanes = []; };
      for (const s of ss) { if (s.s >= end) close(); let l = lanes.findIndex(e => e <= s.s); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = s.e; s.lane = l; cluster.push(s); end = Math.max(end, s.e); }
      close();
      for (const s of ss) {
        const h = pal[s.hue], w = (cw - 10 * k) / s.n, bx = gx + tc + cw * i + 5 * k + s.lane * w, by = Y(s.s) + 3 * k, bh = Y(s.e) - Y(s.s) - 6 * k, bw = w - 4 * k;
        rr(x, mix(h, bg, dark ? .22 : .14), bx, by, bw, bh, 12 * k);
        rr(x, cl.has(s) ? (dark ? '#f0715f' : '#c8402f') : h, bx, by, 5 * k, bh, 3 * k);
        x.textAlign = 'left'; x.textBaseline = 'top';
        const tx = bx + 14 * k, tw = bw - 20 * k;
        x.font = FONT(750, 17 * k); x.fillStyle = h; x.fillText(fitText(x, s.it.course, tw), tx, by + 10 * k);
        x.font = FONT(500, 13.5 * k); x.fillStyle = muted;
        if (bh > 52 * k) x.fillText(fitText(x, `${fmtShort(s.s)} - ${fmtShort(s.e)}`, tw), tx, by + 34 * k);
        x.fillStyle = text;
        if (bh > 78 * k && s.room) x.fillText(fitText(x, s.room, tw), tx, by + 54 * k);
        if (bh > 104 * k && s.it.name) { x.fillStyle = muted; x.fillText(fitText(x, nice(s.it.name), tw), tx, by + 74 * k); }
      }
    });
  }

  function drawExport() {
    const W = 2480, H = 1754;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#f6f5f1'; x.fillRect(0, 0, W, H);
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = '#14201b';
    x.font = FONT(750, 64); x.fillText('Jadual kelas', 110, 150);
    x.font = FONT(500, 30); x.fillStyle = '#646d68'; x.fillText(`${S.campusName || 'UiTM'}${S.label ? ' · ' + S.label : ''}`, 110, 200);
    x.textAlign = 'right'; x.font = FONT(600, 26); x.fillStyle = '#0b5d4b'; x.fillText('siswacap.my', W - 110, 150);
    const legH = 70 * Math.ceil(S.items.length / 3);
    drawGrid(x, 90, 250, W - 180, H - 250 - legH - 110, false, 1.7);
    S.items.forEach((it, i) => {
      const col = i % 3, row = Math.floor(i / 3), lx = 110 + col * ((W - 220) / 3), ly = H - legH - 50 + row * 70;
      x.fillStyle = PAL.light[i % HUES]; x.beginPath(); x.arc(lx + 10, ly + 22, 10, 0, 7); x.fill();
      x.textAlign = 'left'; x.font = FONT(750, 28); x.fillText(it.course, lx + 34, ly + 32);
      const cw = x.measureText(it.course).width;
      x.font = FONT(500, 24); x.fillStyle = '#646d68'; x.fillText(fitText(x, `${it.group} · ${nice(it.name || '')}`, (W - 220) / 3 - cw - 60), lx + 46 + cw, ly + 32);
    });
    return c;
  }

  /** PDF satu halaman A4 melintang yang membungkus gambar JPEG (DCTDecode) */
  function jpegToPdf(bytes, iw, ih) {
    const enc = new TextEncoder(), parts = [], offs = [];
    let len = 0;
    const put = p => { const b = typeof p === 'string' ? enc.encode(p) : p; parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n`); body(); put('\nendobj\n'); };
    const PW = 842, PH = 595, sc = Math.min(PW / iw, PH / ih), dw = iw * sc, dh = ih * sc;
    const content = `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${((PW - dw) / 2).toFixed(2)} ${((PH - dh) / 2).toFixed(2)} cm /Im0 Do Q`;
    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, () => put('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => put('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
    obj(3, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
    obj(4, () => { put(`<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`); put(bytes); put('\nendstream'); });
    obj(5, () => put(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(6, () => put(`<< /Title (Jadual kelas UiTM) /Producer (SiswaCap) >>`));
    const xref = len;
    put(`xref\n0 7\n0000000000 65535 f \n${offs.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  async function saveBlob(blob, name, msg) {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Jadual kelas' }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(msg, 4000);
  }

  async function exportImage(kind, btn) {
    btn.disabled = true;
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const c = drawExport();
      const jpg = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
      if (kind === 'pdf') await saveBlob(jpegToPdf(new Uint8Array(await jpg.arrayBuffer()), c.width, c.height), 'jadual-kelas-uitm.pdf', 'PDF dimuat turun.');
      else await saveBlob(jpg, 'jadual-kelas-uitm.jpg', 'Gambar jadual dimuat turun.');
    } catch (e) { toast('Gagal menyimpan: ' + e.message, 4000); }
    btn.disabled = false;
  }

  async function addHome() {
    if (Native) { toast('Dalam app, tekan lama ikon SiswaCap di skrin utama dan pilih Jadual kelas.', 5000); return; }
    if (window.installApp && await window.installApp()) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    toast(matchMedia('(display-mode: standalone)').matches || navigator.standalone
      ? 'SiswaCap sudah ada di skrin utama. Tekan lama ikonnya dan pilih Jadual kelas untuk terus ke jadual.'
      : ios ? 'Di Safari, tekan butang Kongsi, kemudian Add to Home Screen. Jadual anda terbuka tanpa talian.'
        : 'Di Chrome, tekan menu ⋮, kemudian Add to Home screen atau Install app.', 6000);
  }

  /* Kad di halaman utama */
  function homeCard() {
    const el = $('#homeJadual');
    if (!el) return;
    const nx = S.items.length ? nextClass() : null;
    el.textContent = nx ? `${nx.live ? 'Sekarang' : DAY3[nx.s.d] + ' ' + fmt(nx.s.s)}: ${nx.s.it.course}${nx.s.room ? ' di ' + nx.s.room : ''}` : 'Susun jadual kuliah UiTM anda dengan cantik';
  }

  let tick;
  document.addEventListener('viewchange', e => {
    clearInterval(tick);
    if (e.detail === 'jadual') {
      render(); if (ui.editing) loadCampuses();
      tick = setInterval(() => { if (!ui.editing && !document.hidden) render(); }, 60000);
    } else homeCard();
  });
  homeCard();
  // Data jadual untuk Studio Skrin Kunci (js/skrin-kunci.js)
  window.Jadual = {
    parsePaste, render,
    kunci: () => ({ S, slots: slotsAll(), days: days(), clash: clashes(), nice, fmt, fmtShort, DAY, DAY3, PAL, saveBlob })
  };
})();
