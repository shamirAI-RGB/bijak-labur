/* SiswaCap: suis bahasa BM / EN / العربية.
   Teks laman ditulis dalam BM. Untuk EN dan Arab, kamus (data/bahasa/<kod>.json) dimuat apabila dipilih,
   kemudian setiap nod teks dan atribut (placeholder, aria-label, title, alt) yang sepadan ditukar.
   MutationObserver menukar teks yang dilukis kemudian oleh modul lain. Teks asal BM disimpan supaya
   boleh dipulihkan serta-merta. Teks yang tiada dalam kamus (cth. isi pelajaran panjang) kekal BM.
   Arab memaparkan laman dari kanan ke kiri (dir="rtl"). Mod Pemilik sentiasa dalam BM. */
(function () {
  const KOD = { ms: 'BM', en: 'EN', ar: 'ع' };
  const NAMA = { ms: 'Bahasa Melayu', en: 'English', ar: 'العربية' };
  const ATTR = ['placeholder', 'aria-label', 'title', 'alt'];
  const LANGKAU = 'script,style,noscript,textarea,code,pre,svg,[contenteditable],[translate="no"],.notranslate';
  const root = document.documentElement;
  const kamus = {};
  const rekod = new WeakMap(); // nod teks -> { src, out }
  const rekodAttr = new WeakMap(); // elemen -> { atribut: { src, out } }
  let kini = 'ms', aktif = null, obs = null;

  const norm = s => s.replace(/\s+/g, ' ').trim();
  async function muat(l) {
    if (kamus[l]) return kamus[l];
    const r = await fetch(`data/bahasa/${l}.json`, { cache: 'force-cache' });
    if (!r.ok) throw new Error('Kamus tidak dapat dimuat');
    const j = await r.json();
    const kata = new Map(Object.entries(j.kata || {}).map(([k, v]) => [k.toLowerCase(), v]));
    return (kamus[l] = { teks: new Map(Object.entries(j.teks || {})), kata });
  }

  // Teks pendek yang semua perkataannya dikenali (hari, bulan, waktu solat): cth. "Sabtu, 10 Oktober 2026"
  function ikutKata(s) {
    if (s.length > 90 || !/[A-Za-z]/.test(s)) return null;
    let ok = true;
    const out = s.replace(/[A-Za-z][A-Za-z'’]*/g, w => {
      const t = aktif.kata.get(w.toLowerCase());
      if (t == null) { ok = false; return w; }
      return t;
    });
    return ok ? out : null;
  }
  function cari(s) {
    const k = norm(s);
    if (!k || !/[A-Za-z]/.test(k)) return null;
    const t = aktif.teks.get(k);
    return t != null ? t : ikutKata(k);
  }
  const langkau = el => !el || el.closest(LANGKAU);

  function tukarTeks(n) {
    const cur = n.nodeValue;
    let r = rekod.get(n);
    if (!r || (cur !== r.out && cur !== r.src)) { r = { src: cur, out: cur }; rekod.set(n, r); }
    if (!aktif) { if (cur !== r.src) n.nodeValue = r.src; r.out = r.src; return; }
    if (cur !== r.src) return; // sudah diterjemah
    if (langkau(n.parentElement)) return;
    const t = cari(r.src);
    if (t == null) { r.out = r.src; return; }
    const m = r.src.match(/^(\s*)[\s\S]*?(\s*)$/);
    r.out = m[1] + t + m[2];
    if (r.out !== cur) n.nodeValue = r.out;
  }
  function tukarAttr(el, a) {
    const cur = el.getAttribute(a);
    if (cur == null) return;
    let semua = rekodAttr.get(el);
    if (!semua) { semua = {}; rekodAttr.set(el, semua); }
    let r = semua[a];
    if (!r || (cur !== r.out && cur !== r.src)) r = semua[a] = { src: cur, out: cur };
    if (!aktif) { if (cur !== r.src) el.setAttribute(a, r.src); r.out = r.src; return; }
    if (cur !== r.src || langkau(el)) return;
    const t = cari(r.src);
    r.out = t == null ? r.src : t;
    if (r.out !== cur) el.setAttribute(a, r.out);
  }
  function jalan(node) {
    if (node.nodeType === 3) { if (node.parentElement && node.parentElement.closest('head') && node.parentElement.tagName !== 'TITLE') return; tukarTeks(node); return; }
    if (node.nodeType !== 1 || node.matches('script,style,noscript')) return;
    ATTR.forEach(a => node.hasAttribute(a) && tukarAttr(node, a));
    const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: x => x.nodeType === 1 ? (x.matches('script,style,noscript,svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : NodeFilter.FILTER_ACCEPT
    });
    node.querySelectorAll('[placeholder],[aria-label],[title],img[alt]').forEach(el => ATTR.forEach(a => el.hasAttribute(a) && tukarAttr(el, a)));
    let n; while ((n = w.nextNode())) if (n.nodeValue.trim()) tukarTeks(n);
  }
  function semua() {
    jalan(document.body);
    const t = document.querySelector('title'); if (t && t.firstChild) tukarTeks(t.firstChild);
  }
  function perhati(on) {
    if (obs) { obs.disconnect(); obs = null; }
    if (!on) return;
    obs = new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'characterData') tukarTeks(m.target);
        else if (m.type === 'attributes') { if (ATTR.includes(m.attributeName)) tukarAttr(m.target, m.attributeName); }
        else m.addedNodes.forEach(jalan);
      }
    });
    obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR });
  }

  function cat() {
    const kod = $('#bahasaBtn .bh-kod'); if (kod) kod.textContent = KOD[kini];
    const btn = $('#bahasaBtn'); if (btn) btn.setAttribute('aria-label', `Bahasa: ${NAMA[kini]}`);
    $$('[data-bahasa]').forEach(b => {
      const on = b.dataset.bahasa === kini;
      if (b.getAttribute('role') === 'menuitemradio') b.setAttribute('aria-checked', String(on));
      else b.classList.toggle('active', on);
    });
  }

  async function tetap(l, simpan = true) {
    if (!KOD[l]) l = 'ms';
    if (l !== 'ms' && root.classList.contains('pm-editing')) { toast('Mod Pemilik menyunting teks BM. Tukar bahasa selepas selesai.'); l = 'ms'; }
    let k = null;
    if (l !== 'ms') {
      try { k = await muat(l); }
      catch { toast('Bahasa ini belum dapat dimuat. Cuba lagi apabila ada talian.'); l = 'ms'; }
    }
    perhati(false);
    if (aktif) { aktif = null; semua(); } // pulihkan BM dahulu sebelum bahasa lain
    kini = l; aktif = k;
    if (simpan) store.set('bahasa', l);
    root.lang = l;
    if (l === 'ar') root.dir = 'rtl'; else root.removeAttribute('dir');
    if (aktif) semua();
    perhati(l !== 'ms');
    cat();
    document.dispatchEvent(new CustomEvent('bahasachange', { detail: { bahasa: l } }));
  }
  window.Bahasa = { tetap, get kini() { return kini; } };

  // Butang bahasa di bar atas
  const btn = $('#bahasaBtn'), pop = $('#bahasaPop');
  const tutup = () => { if (pop && !pop.hidden) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); } };
  if (btn && pop) {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const buka = pop.hidden;
      pop.hidden = !buka; btn.setAttribute('aria-expanded', String(buka));
      if (buka) ($('[aria-checked="true"]', pop) || $('button', pop)).focus();
    });
    pop.addEventListener('keydown', e => {
      const b = $$('button', pop), i = b.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); b[(i + (e.key === 'ArrowDown' ? 1 : b.length - 1)) % b.length].focus(); }
      if (e.key === 'Escape') { tutup(); btn.focus(); }
    });
    document.addEventListener('click', e => { if (!e.target.closest('.bh-wrap')) tutup(); });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-bahasa]');
    if (!b) return;
    tutup();
    if (b.dataset.bahasa !== kini) tetap(b.dataset.bahasa);
  });
  // Masuk Mod Pemilik: kembali ke BM supaya teks yang disunting ialah teks asal
  new MutationObserver(() => { if (kini !== 'ms' && root.classList.contains('pm-editing')) tetap('ms', false); })
    .observe(root, { attributes: true, attributeFilter: ['class'] });

  const simpanan = store.get('bahasa', 'ms');
  if (simpanan !== 'ms' && KOD[simpanan]) tetap(simpanan, false); else cat();
})();
