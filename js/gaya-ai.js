/* Bijak Labur: Semak Kertas, kad "Gaya tulisan" (diilhamkan oleh No AI Slop / stop-slop).
   Mengesan klise dan corak tulisan AI dalam BM dan Inggeris di peranti ini, kemudian (pilihan) meminta AI
   mencadangkan ayat yang lebih ringkas, khusus dan semula jadi. Tujuannya penulisan yang lebih baik. */
(function () {
  const card = $('#slopCard');
  if (!card) return;
  const API = (store.get('fiqh_api', '') || 'https://fiqh.bijaklabur.my').replace(/\/$/, '');

  // [corak, nota, berat]
  const MS = [
    [/dalam era (?:globalisasi|digital|moden|teknologi)(?: ini)?/gi, 'Pembuka klise. Mulakan dengan fakta atau isu khusus.', 3],
    [/(?:dalam|di) dunia (?:yang )?serba (?:moden|canggih)/gi, 'Pembuka klise.', 3],
    [/tidak dapat (?:dinafikan|disangkal)(?: lagi)?(?: bahawa)?/gi, 'Frasa pengisi. Terus nyatakan dakwaan dengan bukti.', 3],
    [/memainkan peranan yang (?:amat |sangat |cukup )?(?:penting|besar|signifikan)/gi, 'Klise. Terangkan peranan sebenar secara khusus.', 2],
    [/(?:kesimpulannya|tuntasnya|secara keseluruhannya),? (?:dapatlah|bolehlah) (?:dirumuskan|disimpulkan)(?: di sini)?(?: bahawa)?/gi, 'Penutup berjela. "Kesimpulannya" sudah memadai.', 3],
    [/dapatlah (?:dirumuskan|disimpulkan) bahawa/gi, 'Penutup berjela.', 2],
    [/secara keseluruhannya/gi, 'Kata pengisi.', 1],
    [/\b(?:holistik|komprehensif|pemangkin|landskap|signifikan)\b/gi, 'Kata besar yang kosong jika tidak dihuraikan.', 1],
    [/adalah merupakan/gi, 'Lewah: pilih "ialah" atau "merupakan" sahaja.', 2],
    [/arus (?:kemodenan|globalisasi|perdana)/gi, 'Klise.', 2],
    [/seiring dengan (?:peredaran|perkembangan) (?:zaman|masa)/gi, 'Klise.', 2],
    [/(?:perlu|harus|wajar) diingat(?:kan)? bahawa/gi, 'Frasa pengisi.', 2],
    [/bukan sahaja\b[^.!?]{3,120}?\b(?:malah|bahkan|tetapi juga)/gi, 'Struktur "bukan sahaja ... malah" berulang ialah ciri tulisan AI.', 1],
    [/(?:^|[.!?]\s+)(?:Selain itu|Tambahan pula|Justeru|Oleh itu|Di samping itu),/gm, 'Kata hubung di awal ayat. Jika terlalu kerap, tulisan terasa mekanikal.', 0.5],
    [/pelbagai (?:aspek|faktor|cabaran) yang/gi, 'Umum. Namakan aspek itu.', 1]
  ];
  const EN = [
    [/\b(?:delve|delves|delving) into\b/gi, 'Classic AI word. Try "look at" or "examine".', 3],
    [/\b(?:tapestry|testament to|ever-evolving|game[- ]changer|treasure trove|a myriad of)\b/gi, 'AI cliché.', 3],
    [/in today'?s (?:fast-paced|digital|modern|ever-changing) (?:world|landscape|era)/gi, 'Cliché opener. Start with a specific point.', 3],
    [/it(?: is|'s) (?:important|worth|crucial) (?:to note|noting|to remember) that/gi, 'Filler. State the point directly.', 3],
    [/plays? an? (?:crucial|pivotal|vital|key|significant) role/gi, 'Cliché. Say what it actually does.', 2],
    [/navigat(?:e|ing) the (?:complexities|challenges|landscape)/gi, 'AI cliché.', 3],
    [/\b(?:unlock|harness|unleash) the (?:power|potential)\b/gi, 'Marketing tone.', 2],
    [/\b(?:seamless(?:ly)?|robust|leverage|multifaceted|meticulous(?:ly)?|intricate|pivotal|underscore[sd]?|showcase[sd]?|elevate[sd]?|foster(?:s|ing)?|realm|landscape|embark(?:s|ed)? on)\b/gi, 'Inflated word often overused by AI.', 1],
    [/\bnot only\b[^.!?]{3,120}?\bbut also\b/gi, 'Overused "not only ... but also" structure.', 1],
    [/(?:^|[.!?]\s+)(?:Moreover|Furthermore|Additionally|In addition),/gm, 'Stacked transition words feel mechanical.', 0.5],
    [/\bin (?:conclusion|summary)\b/gi, 'Formulaic closer.', 1],
    [/\s—\s|—/g, 'Em dash: heavy use is a common AI tell.', 0.5]
  ];

  const words = t => (t.match(/[\p{L}\p{N}'-]+/gu) || []).length;
  const guessLang = t => { const w = (t.toLowerCase().match(/\b(?:the|and|of|to|is|in|that|with)\b/g) || []).length; return w / Math.max(1, words(t)) > 0.06 ? 'en' : 'ms'; };

  function analyse(text, lang) {
    const found = [];
    for (const [re, nota, berat] of (lang === 'en' ? EN : MS)) {
      const hits = [...text.matchAll(re)].map(m => { const lead = m[0].length - m[0].replace(/^[.!?\s]+/, '').length; return { i: m.index + lead, s: m[0].slice(lead).trim() }; });
      if (!hits.length) continue;
      const first = hits[0], a = Math.max(0, first.i - 40), b = Math.min(text.length, first.i + first.s.length + 40);
      found.push({ frasa: first.s, n: hits.length, nota, berat, konteks: [(a > 0 ? '…' : '') + text.slice(a, first.i), text.substr(first.i, first.s.length), text.slice(first.i + first.s.length, b) + (b < text.length ? '…' : '')] });
    }
    const raw = found.reduce((t, f) => t + f.berat * f.n, 0) / Math.max(1, words(text)) * 100;
    return { found: found.sort((x, y) => y.berat * y.n - x.berat * x.n), skor: Math.min(100, Math.round(raw * 12)) };
  }

  let S = { text: '', lang: 'ms', res: null, busy: false, cad: null, err: '' };

  function render() {
    const r = S.res;
    if (!r) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden');
    const c = r.skor < 25 ? 'var(--up)' : r.skor < 55 ? 'var(--warn)' : 'var(--down)';
    const lbl = r.skor < 25 ? 'Semula jadi' : r.skor < 55 ? 'Ada beberapa klise' : 'Banyak klise dan corak AI';
    card.innerHTML = `<h3>Gaya tulisan: klise dan corak AI</h3>
      <div class="sl-meter"><b class="num" style="color:${c}">${r.skor}</b><div class="kj-bar"><i style="width:${Math.max(3, r.skor)}%;background:${c}"></i></div><span class="muted small">${lbl}</span></div>
      ${r.found.length ? `<ul class="sl-list">${r.found.slice(0, 12).map(f => `<li><span><b>${esc(f.frasa)}</b>${f.n > 1 ? ` <span class="muted small">×${f.n}</span>` : ''}</span><span class="muted small">${esc(f.nota)}</span><span class="small">${esc(f.konteks[0])}<mark>${esc(f.konteks[1])}</mark>${esc(f.konteks[2])}</span></li>`).join('')}</ul>`
        : '<p class="muted">Tiada klise biasa ditemui. Bagus!</p>'}
      <div class="row-gap" style="margin-top:12px"><button class="btn sm" type="button" id="slGo" ${S.busy ? 'disabled' : ''}>${icon('star')}${S.busy ? 'Menulis semula…' : 'Cadangkan ayat lebih semula jadi'}</button>
        <span class="muted small">Teks dihantar kepada penyedia AI melalui pelayan Bijak Labur, tidak disimpan.</span></div>
      ${S.err ? `<p class="error">${esc(S.err)}</p>` : ''}
      ${S.cad ? (S.cad.length ? `<div style="margin-top:10px">${S.cad.map((p, i) => `<div class="sl-fix"><del>${esc(p.asal)}</del><ins>${esc(p.baru)}</ins><span class="muted small">${esc(p.sebab)}</span>
          <div class="row-gap"><button class="link-btn" type="button" data-guna="${i}">${icon('check')}Guna</button></div></div>`).join('')}
          <p class="muted small">Selepas menggunakan cadangan, tekan "Semak sekarang" sekali lagi untuk menyemak semula.</p></div>` : '<p class="muted">Tiada cadangan tambahan.</p>') : ''}
      <p class="muted small">Penanda ini membantu anda menulis dengan suara sendiri. Ia bukan pengesan AI yang muktamad.</p>`;
  }

  document.addEventListener('checkdone', () => {
    S.text = $('#paper').value.replace(/\r\n/g, '\n').trim();
    S.lang = $('#lang').value === 'auto' ? guessLang(S.text) : $('#lang').value;
    Object.assign(S, { res: analyse(S.text, S.lang), cad: null, err: '' });
    render();
  });

  card.addEventListener('click', async e => {
    if (e.target.closest('#slGo')) {
      if (S.busy) return;
      Object.assign(S, { busy: true, err: '' }); render();
      try {
        const r = await fetch(API + '/manusia', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: S.text, lang: S.lang, tanda: S.res.found.map(f => f.frasa) }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Semakan gaya tidak tersedia buat masa ini.');
        S.cad = d.cadangan || [];
      } catch (err) { S.err = err.message && !/fetch|network/i.test(err.message) ? err.message : 'Tiada sambungan internet. Cuba lagi.'; }
      S.busy = false; render();
      return;
    }
    const g = e.target.closest('[data-guna]');
    if (g) {
      const p = S.cad[+g.dataset.guna], ta = $('#paper'), i = ta.value.indexOf(p.asal);
      if (i < 0) { toast('Ayat ini sudah berubah dalam teks anda.'); return; }
      ta.value = ta.value.slice(0, i) + p.baru + ta.value.slice(i + p.asal.length);
      ta.dispatchEvent(new Event('input'));
      S.cad.splice(+g.dataset.guna, 1); render(); toast('Ayat dikemas kini dalam teks anda.');
    }
  });
  window.GayaAI = { analyse };
})();
