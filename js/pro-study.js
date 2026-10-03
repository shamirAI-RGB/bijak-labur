/* Bijak Labur Premium: alat pelajar (PNGK, muka depan tugasan, bandingkan draf, sejarah semakan) */
(function () {
  const { numIn, field, persist } = ProTools.kit;

  /* ---------- 1. Kalkulator PNGK ---------- */
  const GRADES = [['A+', 4], ['A', 4], ['A-', 3.67], ['B+', 3.33], ['B', 3], ['B-', 2.67], ['C+', 2.33], ['C', 2], ['C-', 1.67], ['D+', 1.33], ['D', 1], ['E', 0], ['F', 0]];
  const GP = Object.fromEntries(GRADES);
  let sems = store.get('cgpa', null) || [{ name: 'Semester 1', c: [{ k: '', cr: 3, g: 'A' }] }];
  const gpaOf = cs => { const cr = cs.reduce((a, c) => a + (+c.cr || 0), 0); return cr ? cs.reduce((a, c) => a + (+c.cr || 0) * GP[c.g], 0) / cr : null; };
  ProTools.add('pngk', {
    name: 'Kalkulator PNGK', plan: 'pelajar', icon: 'cap', desc: 'PNG semester, PNGK dan sasaran',
    pitch: 'Kira PNG setiap semester dan PNGK keseluruhan, kemudian ketahui PNG yang diperlukan semester depan untuk mencapai PNGK sasaran anda.',
    html: `<div class="stat-row" id="cgStats"></div><div id="cgSems"></div>
    <button class="btn ghost" type="button" id="cgAddSem">${icon('plus')}Tambah semester</button>
    <div class="card" style="margin-top:14px"><h3>PNGK sasaran</h3><form id="cgTargetForm" class="form-grid">
      ${field('cgTarget', 'PNGK sasaran', 'type="number" step="0.01" min="0" max="4" inputmode="decimal"')}${field('cgNext', 'Jam kredit semester depan', 'type="number" step="1" min="1" inputmode="numeric"')}
    </form><div id="cgNeed" aria-live="polite"></div></div>
    <p class="source">Skala 4.00 yang biasa digunakan di universiti awam Malaysia. Semak buku panduan akademik universiti anda kerana nilai gred boleh berbeza sedikit.</p>`,
    init() {
      const save = () => store.set('cgpa', sems);
      const render = () => {
        $('#cgSems').innerHTML = sems.map((s, si) => {
          const g = gpaOf(s.c);
          return `<div class="card sem" data-si="${si}"><div class="row-between"><input class="sem-name" value="${esc(s.name)}" aria-label="Nama semester" data-f="name">
            <span class="sem-gpa num">${g == null ? '–' : 'PNG ' + g.toFixed(2)}</span><button class="icon-btn plain" data-delsem="${si}" aria-label="Buang semester">${icon('x')}</button></div>
            ${s.c.map((c, ci) => `<div class="course" data-ci="${ci}"><input placeholder="Kod / nama kursus" value="${esc(c.k)}" data-f="k" aria-label="Kursus">
              <select data-f="cr" aria-label="Jam kredit">${[1, 2, 3, 4, 5, 6].map(n => `<option ${+c.cr === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
              <select data-f="g" aria-label="Gred">${GRADES.map(([gr]) => `<option ${c.g === gr ? 'selected' : ''}>${gr}</option>`).join('')}</select>
              <button class="icon-btn plain" data-delc="${ci}" aria-label="Buang kursus">${icon('x')}</button></div>`).join('')}
            <button class="link-btn" data-addc="${si}" type="button">+ Tambah kursus</button></div>`;
        }).join('');
        stats();
      };
      const stats = () => {
        const all = sems.flatMap(s => s.c), cg = gpaOf(all), cr = all.reduce((a, c) => a + (+c.cr || 0), 0);
        $$('#cgSems .sem').forEach((el, i) => { const g = gpaOf(sems[i].c); el.querySelector('.sem-gpa').textContent = g == null ? '–' : 'PNG ' + g.toFixed(2); });
        $('#cgStats').innerHTML = `<div class="stat"><div class="v num">${cg == null ? '–' : cg.toFixed(2)}</div><div class="k">PNGK</div></div><div class="stat"><div class="v num">${cr}</div><div class="k">Jumlah jam kredit</div></div><div class="stat"><div class="v num">${sems.length}</div><div class="k">Semester</div></div>`;
        const t = numIn($('#cgTarget')), nx = numIn($('#cgNext'));
        if (!(t > 0) || !(nx > 0) || cg == null) { $('#cgNeed').innerHTML = '<p class="muted small">Isi PNGK sasaran dan jam kredit semester depan.</p>'; return; }
        const need = (t * (cr + nx) - cg * cr) / nx;
        $('#cgNeed').innerHTML = need > 4 ? `<p class="down">Sasaran ${t.toFixed(2)} tidak dapat dicapai dalam satu semester (perlu PNG ${need.toFixed(2)}). Cuba sasaran dua semester.</p>`
          : need <= 0 ? `<p class="up">PNGK anda kekal di atas ${t.toFixed(2)} walaupun dengan PNG terendah.</p>`
          : `<div class="zk-due"><span>PNG diperlukan semester depan</span><b class="num">${need.toFixed(2)}</b></div><p class="small muted">Lebih kurang purata gred ${GRADES.find(([, p]) => p <= need + 0.001 && p >= need - 0.34)?.[0] || 'A'} untuk setiap kursus.</p>`;
      };
      $('#cgSems').addEventListener('input', e => {
        const el = e.target, sem = el.closest('.sem'); if (!sem) return;
        const s = sems[+sem.dataset.si], row = el.closest('.course');
        if (row) s.c[+row.dataset.ci][el.dataset.f] = el.value; else if (el.dataset.f === 'name') s.name = el.value;
        save(); stats();
      });
      $('#cgSems').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        const si = +b.closest('.sem').dataset.si;
        if (b.dataset.addc != null) sems[si].c.push({ k: '', cr: 3, g: 'A' });
        else if (b.dataset.delc != null) sems[si].c.splice(+b.dataset.delc, 1);
        else if (b.dataset.delsem != null) { if (!confirm(`Buang ${sems[si].name}?`)) return; sems.splice(si, 1); }
        else return;
        save(); render();
      });
      $('#cgAddSem').addEventListener('click', () => { sems.push({ name: `Semester ${sems.length + 1}`, c: [{ k: '', cr: 3, g: 'A' }] }); save(); render(); });
      persist($('#cgTargetForm'), 'pngk', () => $('#cgStats') && stats());
      render();
    }
  });

  /* ---------- 2. Muka depan tugasan ---------- */
  ProTools.add('mukadepan', {
    name: 'Muka depan tugasan', plan: 'pelajar', icon: 'cover', desc: 'Siap dicetak atau disimpan PDF',
    pitch: 'Isi butiran tugasan sekali, dapatkan muka depan yang kemas dengan logo universiti, sedia untuk dicetak atau disimpan sebagai PDF.',
    html: `<div class="two-col"><div class="card"><form id="cvForm">
      ${field('cvUni', 'Universiti / kolej', 'maxlength="120"', true)}${field('cvFac', 'Fakulti / jabatan', 'maxlength="120"', true)}
      <div class="form-grid">${field('cvCode', 'Kod kursus', 'maxlength="30"')}${field('cvCourse', 'Nama kursus', 'maxlength="120"')}</div>
      ${field('cvTitle', 'Tajuk tugasan', 'maxlength="200"', true)}
      <div class="field"><label for="cvStudents">Pelajar <span class="muted">(satu setiap baris: Nama, No. matrik)</span></label><textarea id="cvStudents" class="short" rows="3" placeholder="Nur Aisyah binti Ahmad, 2023123456"></textarea></div>
      <div class="form-grid">${field('cvLect', 'Pensyarah', 'maxlength="120"')}${field('cvDate', 'Tarikh hantar', 'type="date"')}</div>
      <div class="field"><label for="cvLogo">Logo (pilihan)</label><input id="cvLogo" type="file" accept="image/*" data-nosave></div>
      <button class="btn" type="button" id="cvPrint">${icon('download')}Cetak atau simpan PDF</button>
    </form></div><div class="card cover-wrap"><div class="cover-preview" id="cvPreview"></div></div></div>`,
    init() {
      let logo = store.get('coverLogo', '');
      const html = () => {
        const g = id => esc($('#' + id).value.trim());
        const studs = $('#cvStudents').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [n, ...m] = l.split(','); return `<tr><td>${esc(n.trim())}</td><td>${esc(m.join(',').trim())}</td></tr>`; }).join('');
        const d = $('#cvDate').value ? new Date($('#cvDate').value + 'T00:00:00').toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        return `<div class="cv">${logo ? `<img class="cv-logo" src="${logo}" alt="">` : ''}<div class="cv-uni">${g('cvUni') || 'NAMA UNIVERSITI'}</div><div class="cv-fac">${g('cvFac')}</div>
          <div class="cv-course">${[g('cvCode'), g('cvCourse')].filter(Boolean).join(' · ')}</div><div class="cv-title">${g('cvTitle') || 'Tajuk tugasan'}</div>
          ${studs ? `<table class="cv-students"><tr><th>Nama</th><th>No. matrik</th></tr>${studs}</table>` : ''}
          <div class="cv-meta">${g('cvLect') ? `<div><span>Pensyarah</span>${g('cvLect')}</div>` : ''}${d ? `<div><span>Tarikh hantar</span>${esc(d)}</div>` : ''}</div></div>`;
      };
      persist($('#cvForm'), 'mukadepan', () => { $('#cvPreview').innerHTML = html(); });
      $('#cvLogo').addEventListener('change', async e => {
        const f = e.target.files[0]; if (!f) return;
        if (f.size > 1.5e6) return toast('Logo terlalu besar. Guna imej bawah 1.5 MB.');
        logo = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
        try { store.set('coverLogo', logo); } catch {}
        $('#cvPreview').innerHTML = html();
      });
      $('#cvPrint').addEventListener('click', () => {
        $('#printArea').innerHTML = `<div class="print-cover">${html()}</div>`;
        document.body.classList.add('printing');
        setTimeout(() => window.print(), 60);
      });
    }
  });

  /* ---------- 3. Bandingkan dua draf ---------- */
  const tok = s => s.match(/[\p{L}\p{N}'’-]+|\s+|[^\s\p{L}\p{N}]/gu) || [];
  // Myers diff atas token perkataan; pulangkan [op, teks] dengan op = 0 sama, -1 dibuang, 1 ditambah
  function diff(a, b) {
    const n = a.length, m = b.length, max = n + m, off = max + 1, V = new Int32Array(2 * max + 3), trace = [];
    outer: for (let d = 0; d <= max; d++) {
      trace.push(V.slice());
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && V[off + k - 1] < V[off + k + 1]) ? V[off + k + 1] : V[off + k - 1] + 1, y = x - k;
        while (x < n && y < m && a[x] === b[y]) { x++; y++; }
        V[off + k] = x;
        if (x >= n && y >= m) { trace.push(V.slice()); break outer; }
      }
      if (d > 4000) return null;
    }
    const ops = []; let x = n, y = m;
    for (let d = trace.length - 2; d > 0; d--) {
      const Vp = trace[d], k = x - y, dd = d - 1;
      const pk = k === -dd || (k !== dd && Vp[off + k - 1] < Vp[off + k + 1]) ? k + 1 : k - 1;
      const px = Vp[off + pk], py = px - pk;
      while (x > px && y > py) { ops.push([0, a[--x]]); y--; }
      if (x === px) ops.push([1, b[--y]]); else ops.push([-1, a[--x]]);
    }
    while (x > 0 && y > 0) { ops.push([0, a[--x]]); y--; }
    while (x > 0) ops.push([-1, a[--x]]);
    while (y > 0) ops.push([1, b[--y]]);
    return ops.reverse();
  }
  ProTools.add('draf', {
    name: 'Bandingkan draf', plan: 'pelajar', icon: 'diff', desc: 'Lihat apa yang berubah',
    pitch: 'Tampal dua versi esei dan lihat setiap perkataan yang ditambah atau dibuang, serta peratus perubahan antara draf.',
    html: `<div class="two-col"><div class="card"><label for="dfA">Draf lama</label><textarea id="dfA" rows="9"></textarea></div>
      <div class="card"><label for="dfB">Draf baharu</label><textarea id="dfB" rows="9"></textarea></div></div>
      <button class="btn" type="button" id="dfGo">Bandingkan</button>
      <div id="dfOut" class="hidden" style="margin-top:14px"><div class="stat-row" id="dfStats"></div>
      <div class="card"><div class="legend"><span style="--c:var(--up)">Ditambah</span><span style="--c:var(--down)">Dibuang</span></div><div class="annotated diff-view" id="dfView"></div></div></div>`,
    init() {
      $('#dfGo').addEventListener('click', () => {
        const a = tok($('#dfA').value), b = tok($('#dfB').value);
        if (!a.length || !b.length) return toast('Tampal kedua-dua draf.');
        if (a.length + b.length > 40000) return toast('Teks terlalu panjang. Bandingkan bahagian demi bahagian.');
        const ops = diff(a, b);
        if (!ops) return toast('Draf terlalu berbeza untuk dibandingkan.');
        const isW = t => /[\p{L}\p{N}]/u.test(t), cnt = o => ops.filter(([op, t]) => op === o && isW(t)).length;
        const same = cnt(0), add = cnt(1), del = cnt(-1), wb = b.filter(isW).length;
        $('#dfOut').classList.remove('hidden');
        $('#dfStats').innerHTML = `<div class="stat"><div class="v num">${Math.round(same / Math.max(wb, 1) * 100)}%</div><div class="k">Draf baharu yang sama</div></div><div class="stat"><div class="v num up">+${add}</div><div class="k">Perkataan ditambah</div></div><div class="stat"><div class="v num down">−${del}</div><div class="k">Perkataan dibuang</div></div>`;
        $('#dfView').innerHTML = ops.map(([op, t]) => op === 0 ? esc(t) : !/\S/.test(t) ? (op > 0 ? esc(t) : '') : op > 0 ? `<ins>${esc(t)}</ins>` : `<del>${esc(t)}</del>`).join('').replace(/<\/ins>(\s*)<ins>/g, '$1').replace(/<\/del><del>/g, '').replace(/\n/g, '<br>');
      });
    }
  });

  /* ---------- 4. Sejarah semakan ---------- */
  let hist = store.get('history', []);
  document.addEventListener('checkdone', () => {
    if (!Premium.has('pelajar')) return;
    const r = window.CheckerReport && window.CheckerReport(); if (!r) return;
    const text = $('#paper').value.trim();
    hist = hist.filter(h => h.text !== text);
    hist.unshift({ t: Date.now(), title: text.split(/\s+/).slice(0, 9).join(' '), words: text.split(/\s+/).length, ai: r.ai, plag: r.plag, q: r.quality, text: text.slice(0, 30000) });
    hist = hist.slice(0, 30);
    try { store.set('history', hist); } catch { hist = hist.slice(0, 10); store.set('history', hist); }
  });
  ProTools.add('sejarah', {
    name: 'Sejarah semakan', plan: 'pelajar', icon: 'history', desc: '30 semakan terakhir anda',
    pitch: 'Setiap semakan kertas kerja disimpan dalam peranti anda, supaya anda boleh membuka semula draf lama dan melihat skor bertambah baik.',
    html: `<div class="list" id="hsList"></div><p class="source">Disimpan dalam peranti ini sahaja. Semakan baharu direkod secara automatik.</p>`,
    init() {
      const fmtD = t => new Date(t).toLocaleString('ms-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const render = () => {
        $('#hsList').innerHTML = hist.length ? hist.map((h, i) => `<div class="pf-row hs">
          <div class="pf-main"><b>${esc(h.title)}…</b><span class="muted small">${fmtD(h.t)} · ${h.words} patah perkataan</span></div>
          <div class="pf-val small"><span class="hs-chip" style="--c:var(--purple)">AI ${h.ai}%</span>${h.plag != null ? `<span class="hs-chip" style="--c:var(--down)">Plagiat ${h.plag}%</span>` : ''}<span class="hs-chip" style="--c:var(--brand)">Bahasa ${h.q}%</span></div>
          <div class="pf-sub"><button class="btn sm ghost" data-hopen="${i}">Buka</button><button class="btn sm ghost" data-hdiff="${i}">Banding dengan draf semasa</button></div>
          <button class="icon-btn plain pf-del" data-hdel="${i}" aria-label="Buang">${icon('x')}</button></div>`).join('')
          : '<p class="muted pf-empty">Belum ada semakan. Semak kertas kerja di tab Semak dan ia akan muncul di sini.</p>';
      };
      $('#hsList').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.hdel != null) { hist.splice(+b.dataset.hdel, 1); store.set('history', hist); render(); }
        if (b.dataset.hopen != null) { $('#paper').value = hist[+b.dataset.hopen].text; $('#paper').dispatchEvent(new Event('input')); location.hash = '#semak'; toast('Draf dibuka. Tekan Semak sekarang untuk menyemak semula.'); }
        if (b.dataset.hdiff != null) {
          ProTools.back(); $('[data-tool="draf"]').click();
          $('#dfA').value = hist[+b.dataset.hdiff].text; $('#dfB').value = $('#paper').value; $('#dfGo').click();
        }
      });
      document.addEventListener('checkdone', render);
      render();
    }
  });
})();
