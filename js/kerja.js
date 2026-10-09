/* SiswaCap: Kerjaya AI (gaya AI Job Search). Cadangan jawatan dan carian di portal kerja Malaysia,
   skor padanan resume dengan iklan, surat permohonan dan persediaan temu duga.
   Nombor IC, telefon dan e-mel ditapis di pelayan sebelum dihantar kepada AI. */
(function () {
  const root = $('#view-kerja');
  if (!root) return;
  const API = (store.get('fiqh_api', '') || 'https://fiqh.bijaklabur.my').replace(/\/$/, '');
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const ACT = [['cadang', 'Cadang jawatan', 'search'], ['padan', 'Semak padanan', 'target'], ['surat', 'Tulis surat', 'mail'], ['temuduga', 'Soalan temu duga', 'chat']];

  let S = { resume: load('kerja_resume', ''), ingat: load('kerja_ingat', true), jawatan: '', bahasa: load('kerja_bahasa', 'ms'), busy: '', err: '', tugas: '', hasil: null };

  const portals = k => {
    const q = encodeURIComponent(k), slug = k.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return [['JobStreet', `https://my.jobstreet.com/${slug}-jobs`], ['LinkedIn', `https://www.linkedin.com/jobs/search/?keywords=${q}&location=Malaysia`], ['Indeed', `https://malaysia.indeed.com/jobs?q=${q}`], ['Hiredly', `https://my.hiredly.com/jobs?search=${q}`]];
  };
  // Tapis IC, e-mel dan telefon dalam peranti sebelum dihantar (pelayan menapis sekali lagi)
  const redact = t => String(t || '').replace(/\b\d{6}-?\d{2}-?\d{4}\b/g, '[IC]').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[E-mel]')
    .replace(/(?:\+?6?0)[\s-]?1\d[\s-]?\d{3,4}[\s-]?\d{4}\b/g, '[Telefon]').replace(/\b0\d{1,2}[\s-]?\d{3,4}[\s-]?\d{4}\b/g, '[Telefon]');
  const ext = (href, t) => /^https:\/\//i.test(href || '') ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(t)}</a>` : esc(t);

  function hasilHTML() {
    const h = S.hasil, t = S.tugas;
    if (S.busy) return `<div class="bk-wait" role="status"><div class="st-spin" aria-hidden="true"></div><p>Menganalisis resume…</p></div>`;
    if (S.err) return `<p class="error">${esc(S.err)}</p>`;
    if (!h) return `<div class="bk-empty"><p class="muted">Tampal resume anda, kemudian pilih tindakan. Untuk padanan, surat dan temu duga, tampal juga iklan jawatan daripada JobStreet, LinkedIn atau portal lain.</p></div>`;
    if (t === 'cadang') return `<p>${esc(h.ringkasan)}</p>
      ${h.kemahiran_utama.length ? `<div class="kj-tags">${h.kemahiran_utama.map(k => `<span>${esc(k)}</span>`).join('')}</div>` : ''}
      <h3>Jawatan yang sesuai</h3>${h.jawatan.map(j => `<div class="kj-job"><b>${esc(j.tajuk)}</b><span class="muted small">${esc(j.sebab)}</span>
        <div class="kj-links">Cari "${esc(j.kata_kunci)}": ${portals(j.kata_kunci).map(([n, u]) => ext(u, n)).join(' · ')}</div></div>`).join('')}
      ${h.tingkatkan.length ? `<h3>Tingkatkan peluang</h3><ul>${h.tingkatkan.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <p class="muted small">Juga cuba ${ext('https://myfuturejobs.gov.my/', 'MYFutureJobs (PERKESO)')}, portal kerja rasmi kerajaan.</p>`;
    if (t === 'padan') {
      const c = h.skor >= 75 ? 'var(--up)' : h.skor >= 50 ? 'var(--warn)' : 'var(--down)';
      return `<div class="kj-score"><span class="num" style="color:${c}">${h.skor}</span><div class="kj-bar"><i style="width:${h.skor}%;background:${c}"></i></div></div>
        <p>${esc(h.ringkasan)}</p>
        ${h.kekuatan.length ? `<h3>Kekuatan</h3><ul>${h.kekuatan.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${h.jurang.length ? `<h3>Jurang dan cara menutupnya</h3><ul>${h.jurang.map(j => `<li><b>${esc(j.kemahiran)}</b>: ${esc(j.cadangan)}</li>`).join('')}</ul>` : ''}
        ${h.kata_kunci_tiada.length ? `<h3>Kata kunci iklan yang tiada dalam resume</h3><div class="kj-tags">${h.kata_kunci_tiada.map(k => `<span>${esc(k)}</span>`).join('')}</div>` : ''}
        ${h.baiki_resume.length ? `<h3>Baiki ayat resume</h3>${h.baiki_resume.map((b, i) => `<div class="kj-fix"><del>${esc(b.asal)}</del><ins>${esc(b.baru)}</ins><span class="muted small">${esc(b.sebab)}</span>
          <button class="link-btn" type="button" data-fix="${i}">Guna dalam resume</button></div>`).join('')}` : ''}`;
    }
    if (t === 'surat') return `<div class="kj-letter" id="kjLetter">${esc(h.surat)}</div><div class="row-gap" style="margin-top:10px"><button class="btn ghost" type="button" data-act="salin">${icon('copy')}Salin surat</button></div>
      <p class="muted small">Gantikan [Nama Anda] dan [Nombor Telefon], dan semak semula sebelum dihantar.</p>`;
    if (t === 'temuduga') return h.soalan.map((q, i) => `<details class="kj-qa" ${i === 0 ? 'open' : ''}><summary>${i + 1}. ${esc(q.soalan)}</summary><p class="muted small">${esc(q.kenapa)}</p><p>${esc(q.contoh_jawapan)}</p></details>`).join('');
    return '';
  }

  function render() {
    root.innerHTML = `<div class="page-head"><p class="eyebrow">Kerjaya</p><h1 id="h-kerja">Kerjaya AI</h1>
        <p class="lead">Cari jawatan yang sesuai dengan resume anda, semak padanan dengan iklan kerja, tulis surat permohonan dan bersedia untuk temu duga.</p></div>
      <div class="kj-grid">
        <form class="card kj-form" id="kjForm">
          <div class="field"><div class="kj-file"><label for="kjResume">Resume anda</label><label class="link-btn">${icon('upload')}Muat naik PDF/DOCX<input type="file" id="kjFile" accept=".pdf,.docx,.txt" hidden></label></div>
            <textarea id="kjResume" rows="8" maxlength="15000" placeholder="Tampal resume anda di sini">${esc(S.resume)}</textarea></div>
          <label class="bk-on"><input type="checkbox" id="kjIngat" ${S.ingat ? 'checked' : ''}><span class="small">Ingat resume dalam peranti ini</span></label>
          <div class="field"><label for="kjJob">Iklan jawatan (untuk padanan, surat dan temu duga)</label>
            <textarea id="kjJob" rows="6" maxlength="10000" placeholder="Tampal keterangan jawatan daripada JobStreet, LinkedIn dan lain-lain">${esc(S.jawatan)}</textarea></div>
          <div class="row-between"><span class="muted small">Bahasa hasil</span><select id="kjLang" aria-label="Bahasa hasil"><option value="ms" ${S.bahasa === 'ms' ? 'selected' : ''}>Bahasa Melayu</option><option value="en" ${S.bahasa === 'en' ? 'selected' : ''}>English</option></select></div>
          <div class="row-gap">${ACT.map(([k, n, ic]) => `<button class="btn${k === 'cadang' || k === 'padan' ? '' : ' ghost'}" type="button" data-tugas="${k}" ${S.busy ? 'disabled' : ''}>${icon(ic)}${n}</button>`).join('')}</div>
          <p class="muted small">Nombor IC, telefon dan e-mel ditapis dalam peranti anda sebelum dihantar. Resume tidak disimpan di pelayan.</p>
        </form>
        <div class="card" aria-live="polite">${S.tugas ? `<h2>${ACT.find(a => a[0] === S.tugas)[1]}</h2>` : '<h2>Hasil</h2>'}${hasilHTML()}</div>
      </div>
      <p class="note">${icon('alert')}<span>Cadangan AI ialah panduan sahaja. Jangan tambah pengalaman atau kelayakan yang tiada pada anda. Berhati-hati dengan iklan kerja yang meminta bayaran atau maklumat bank: itu tanda penipuan.</span></p>`;
  }

  async function run(tugas) {
    if (S.busy) return;
    if (S.resume.trim().length < 100) { toast('Tampal resume anda dahulu (sekurang-kurangnya 100 aksara).'); $('#kjResume', root).focus(); return; }
    if (tugas !== 'cadang' && S.jawatan.trim().length < 80) { toast('Tampal iklan jawatan untuk tindakan ini.'); $('#kjJob', root).focus(); return; }
    if (!(typeof Premium === 'undefined' || Premium.boleh('kerja'))) return;
    Object.assign(S, { busy: tugas, err: '', tugas, hasil: null }); render();
    try {
      const r = await fetch(API + '/kerja', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tugas, resume: redact(S.resume), jawatan: redact(S.jawatan), bahasa: S.bahasa }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Kerjaya AI tidak tersedia buat masa ini.');
      S.hasil = d;
      if (typeof Premium !== 'undefined') Premium.catat('kerja');
    } catch (e) { S.err = e.message && !/fetch|network/i.test(e.message) ? e.message : 'Tiada sambungan internet. Cuba lagi.'; }
    S.busy = ''; render();
    if (innerWidth < 960) $('[aria-live]', root)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const keep = () => save('kerja_resume', S.ingat ? S.resume : '');
  root.addEventListener('input', e => {
    if (e.target.id === 'kjResume') { S.resume = e.target.value; keep(); }
    if (e.target.id === 'kjJob') S.jawatan = e.target.value;
  });
  root.addEventListener('change', async e => {
    if (e.target.id === 'kjIngat') { S.ingat = e.target.checked; save('kerja_ingat', S.ingat); keep(); }
    if (e.target.id === 'kjLang') { S.bahasa = e.target.value; save('kerja_bahasa', S.bahasa); }
    if (e.target.id === 'kjFile' && e.target.files[0]) {
      try { S.resume = (await fileText(e.target.files[0])).slice(0, 15000); keep(); render(); toast('Resume dimuatkan.'); }
      catch { toast('Gagal membaca fail. Tampal teks resume secara manual.'); }
    }
  });
  root.addEventListener('submit', e => e.preventDefault());
  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-tugas]'); if (t) { run(t.dataset.tugas); return; }
    const f = e.target.closest('[data-fix]');
    if (f && S.hasil && S.hasil.baiki_resume) {
      const b = S.hasil.baiki_resume[+f.dataset.fix];
      const i = S.resume.indexOf(b.asal);
      if (i < 0) { toast('Ayat asal tidak dijumpai lagi dalam resume.'); return; }
      S.resume = S.resume.slice(0, i) + b.baru + S.resume.slice(i + b.asal.length); keep();
      S.hasil.baiki_resume.splice(+f.dataset.fix, 1); render(); toast('Resume dikemas kini.');
      return;
    }
    const a = e.target.closest('[data-act="salin"]');
    if (a) { try { await navigator.clipboard.writeText(S.hasil.surat); toast('Surat disalin.'); } catch { toast('Tidak dapat menyalin. Pilih teks secara manual.'); } }
  });
  document.addEventListener('viewchange', e => { if (e.detail === 'kerja' && !S.busy) render(); });
  render();
})();
