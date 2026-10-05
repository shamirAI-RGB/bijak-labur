/* Bijak Labur: Semak Kertas, audit lanjutan universal (worker-fiqh /audit)
   1. Profil pemeriksa ikut fakulti dan subjek, rubrik 5 kriteria (0-20, literatur dan metodologi boleh tidak berkaitan)
      dengan unjuran gred A+ hingga F.
   2. Matriks pembaikan struktur hujah (hujah tanpa sokongan, ralat logik, fakta bercanggah, lari tajuk).
   3. Audit pematuhan industri makanan: setiap ketidakakuran dilabel NC (Non-Conformance), hanya jika tugasan berkaitan.
   4. Peta konsep, carta alir proses dan pelan lantai lot kedai 20 x 80 kaki: dilukis dalam peranti dan dieksport sebagai
      kod Mermaid (aliran bahan mentah = garisan putus-putus menegak yang lurus).
   5. Skrip Python (PyMuPDF) yang menyerlah dan menyuntik nota komen terus ke dalam PDF tugasan asal. */
(function () {
  const API = (store.get('fiqh_api', '') || 'https://fiqh.bijaklabur.my').replace(/\/$/, '');
  const RUBRIK = [['pengenalan', 'Pengenalan dan objektif'], ['literatur', 'Kajian literatur'], ['analisis', 'Analisis dan hujah kritis'], ['metodologi', 'Metodologi'], ['kesimpulan', 'Kesimpulan']];
  const HUJAH = { 'tanpa-sokongan': 'Hujah tanpa sokongan', 'ralat-logik': 'Ralat logik', bercanggah: 'Fakta bercanggah', 'lari-tajuk': 'Lari tajuk', struktur: 'Struktur lemah' };
  const GRED = [[90, 'A+'], [80, 'A'], [75, 'A-'], [70, 'B+'], [65, 'B'], [60, 'B-'], [55, 'C+'], [50, 'C'], [47, 'C-'], [44, 'D+'], [40, 'D'], [30, 'E'], [0, 'F']];
  const gred = n => GRED.find(([m]) => n >= m)[1];
  const ZON = { mentah: ['#fde2e2', '#b42318', 'Bahan mentah'], proses: ['#fff1d6', '#a15c00', 'Pemprosesan'], sejuk: ['#dbeafe', '#1d4ed8', 'Bilik sejuk'], siap: ['#dcfce7', '#15803d', 'Barang siap'], kebersihan: ['#ede9fe', '#6d28d9', 'Kebersihan'], pejabat: ['#f1f5f9', '#475569', 'Pejabat'] };
  const LANGKAH = { mula: 'Mula', proses: 'Proses', keputusan: 'Keputusan', ccp: 'CCP', simpan: 'Simpan', tamat: 'Tamat' };

  async function fetchAudit(text, lang) {
    let r;
    try { r = await fetch(API + '/audit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 60000), lang }) }); }
    catch { throw new Error(navigator.onLine === false ? 'Tiada sambungan internet.' : 'Audit lanjutan tidak dapat dihubungi.'); }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Audit lanjutan tidak tersedia buat masa ini.');
    return d;
  }

  /* ---------- Kod Mermaid ---------- */
  // Aksara khas dalam label Mermaid ditulis sebagai kod entiti supaya tidak memecahkan sintaks
  // (% dan ` juga dikodkan: %%{init}%% ialah arahan Mermaid, dan ` di awal label memulakan rentetan markdown)
  const mm = s => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').replace(/#/g, '#35;').replace(/%/g, '#37;').replace(/`/g, '#96;').replace(/"/g, '#quot;').replace(/</g, '#lt;').replace(/>/g, '#gt;').trim();
  const SHAPE = { mula: ['(["', '"])'], tamat: ['(["', '"])'], proses: ['["', '"]'], keputusan: ['{"', '"}'], ccp: ['[["', '"]]'], simpan: ['[("', '")]'] };

  function mermaidAliran(al) {
    const L = al && al.langkah || [];
    if (!L.length) return '';
    const out = ['flowchart TB', `  %% ${mm(al.tajuk || 'Carta alir proses')}`];
    L.forEach((s, i) => { const [a, b] = SHAPE[s.jenis] || SHAPE.proses; out.push(`  L${i + 1}${a}${mm((s.jenis === 'ccp' ? 'CCP: ' : '') + s.label + (s.suhu ? ' (' + s.suhu + ')' : ''))}${b}`); });
    for (let i = 1; i < L.length; i++) out.push(`  L${i} -.-> L${i + 1}`);
    const ccp = L.map((s, i) => s.jenis === 'ccp' ? `L${i + 1}` : '').filter(Boolean);
    out.push('  classDef ccp fill:#fde2e2,stroke:#b42318,stroke-width:2px,color:#7a1010');
    if (ccp.length) out.push(`  class ${ccp.join(',')} ccp`);
    return out.join('\n');
  }

  function mermaidPeta(pt) {
    if (!pt || !pt.cabang.length) return '';
    const out = ['flowchart LR', `  %% Peta konsep: ${mm(pt.akar)}`, `  R(("${mm(pt.akar)}"))`];
    pt.cabang.forEach((c, i) => {
      out.push(`  C${i + 1}["${i + 1}. ${mm(c.label)}"]`, `  R --> C${i + 1}`);
      c.anak.forEach((t, j) => out.push(`  C${i + 1}_${j + 1}("${mm(t)}")`, `  C${i + 1} --> C${i + 1}_${j + 1}`));
    });
    out.push('  classDef akar fill:#0f766e,stroke:#0f766e,color:#ffffff', '  classDef cabang fill:#ecfdf5,stroke:#0f766e,color:#064e3b', '  class R akar');
    out.push(`  class ${pt.cabang.map((c, i) => `C${i + 1}`).join(',')} cabang`);
    return out.join('\n');
  }

  function mermaidPelan(fa) {
    if (!fa || !fa.berkaitan || !fa.zon.length) return '';
    const Z = fa.zon, out = ['flowchart TB', `  %% Pelan lantai lot kedai ${fa.lebar} kaki x ${fa.panjang} kaki. Garisan putus-putus menegak = aliran bahan mentah (satu hala).`];
    out.push('  IN(["Pintu masuk bahan mentah"])');
    out.push(`  subgraph LOT["Lot kedai ${fa.lebar} kaki x ${fa.panjang} kaki"]`, '    direction TB');
    Z.forEach((z, i) => out.push(`    Z${i + 1}["${mm(z.nama)}<br/>${fa.lebar} x ${z.panjang} kaki"]`));
    out.push('  end', '  OUT(["Keluar barang siap"])');
    out.push(['  IN', ...Z.map((z, i) => `Z${i + 1}`), 'OUT'].join(' -.-> '));
    Object.entries(ZON).forEach(([k, [f, s]]) => out.push(`  classDef ${k} fill:${f},stroke:${s},color:#1f2937`));
    const by = {};
    Z.forEach((z, i) => (by[z.jenis] ||= []).push(`Z${i + 1}`));
    Object.entries(by).forEach(([k, ids]) => out.push(`  class ${ids.join(',')} ${k}`));
    return out.join('\n');
  }

  /* ---------- SVG (dilukis dalam peranti, warna tetap supaya sama apabila dimuat turun) ---------- */
  const x = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function wrap(s, n, max = 2) {
    // Perkataan yang lebih panjang daripada satu baris dipecahkan supaya tidak melimpah keluar kotak
    const words = String(s).split(/\s+/).flatMap(w => { const c = Array.from(w), out = []; for (let i = 0; i < c.length; i += n) out.push(c.slice(i, i + n).join('')); return out; }), lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    }
    if (cur) lines.push(cur);
    if (lines.length > max) { lines.length = max; lines[max - 1] = Array.from(lines[max - 1]).slice(0, n - 1).join('') + '…'; }
    return lines;
  }
  const textLines = (lines, cx, cy, size, attrs = '') => {
    const lh = size * 1.25, y0 = cy - (lines.length - 1) * lh / 2;
    return lines.map((l, i) => `<text x="${cx}" y="${(y0 + i * lh).toFixed(1)}" font-size="${size}" text-anchor="middle" dominant-baseline="middle" ${attrs}>${x(l)}</text>`).join('');
  };
  const FONT = 'font-family="Geist, system-ui, -apple-system, Segoe UI, sans-serif"';

  function svgAliran(al) {
    const L = al && al.langkah || [];
    if (!L.length) return '';
    const W = 340, BW = 264, BH = 48, GAP = 30, top = 16, cx = W / 2;
    const H = top * 2 + L.length * BH + (L.length - 1) * GAP;
    let g = '';
    L.forEach((s, i) => {
      const y = top + i * (BH + GAP), x0 = cx - BW / 2, lab = (s.jenis === 'ccp' ? 'CCP: ' : '') + s.label, dec = s.jenis === 'keputusan';
      const ccp = s.jenis === 'ccp', fill = ccp ? '#fde2e2' : s.jenis === 'keputusan' ? '#fff1d6' : s.jenis === 'simpan' ? '#dbeafe' : '#f8fafc', stroke = ccp ? '#b42318' : '#475569';
      if (s.jenis === 'keputusan') g += `<polygon points="${x0},${y + BH / 2} ${cx},${y} ${x0 + BW},${y + BH / 2} ${cx},${y + BH}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
      else g += `<rect x="${x0}" y="${y}" width="${BW}" height="${BH}" rx="${s.jenis === 'mula' || s.jenis === 'tamat' ? BH / 2 : 6}" fill="${fill}" stroke="${stroke}" stroke-width="${ccp ? 2.5 : 1.5}"/>`;
      // Parameter suhu atau masa sentiasa dipaparkan pada baris sendiri supaya tidak terpotong; label rombus lebih sempit
      const n = dec ? 18 : 38, lines = [...wrap(lab, n, s.suhu ? 1 : 2), ...(s.suhu ? wrap(s.suhu, dec ? 20 : 38, 1) : [])];
      g += textLines(lines, cx, y + BH / 2, dec ? 11 : 12, `fill="#111827" ${FONT}`);
      if (i < L.length - 1) g += `<line x1="${cx}" y1="${y + BH}" x2="${cx}" y2="${y + BH + GAP - 2}" stroke="#334155" stroke-width="1.6" stroke-dasharray="4 4" marker-end="url(#fl-ah)"/>`;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${x(al.tajuk || 'Carta alir proses')}">
      <defs><marker id="fl-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#334155"/></marker></defs>
      <rect width="${W}" height="${H}" fill="#ffffff"/>${g}</svg>`;
  }

  function svgPelan(fa) {
    if (!fa || !fa.berkaitan || !fa.zon.length) return '';
    const S = 7, PW = fa.lebar * S, PH = fa.panjang * S, left = 56, top = 52, W = left + PW + 24, H = top + PH + 58, flowX = left + 16;
    let y = top, g = '';
    fa.zon.forEach(z => {
      const h = z.panjang * S, [f, s] = ZON[z.jenis] || ZON.proses;
      g += `<rect x="${left}" y="${y}" width="${PW}" height="${h}" fill="${f}" stroke="${s}" stroke-width="1"/>`;
      const lines = [...wrap(z.nama, 15, h >= 40 ? 2 : 1), `${fa.lebar} x ${z.panjang} kaki`];
      g += textLines(lines, left + 18 + (PW - 18) / 2, y + h / 2, 10, `fill="#111827" ${FONT}`);
      y += h;
    });
    // Dinding luar dan ukuran
    g += `<rect x="${left}" y="${top}" width="${PW}" height="${PH}" fill="none" stroke="#111827" stroke-width="2.5"/>`;
    g += `<line x1="${left}" y1="${top - 14}" x2="${left + PW}" y2="${top - 14}" stroke="#475569" stroke-width="1" marker-start="url(#pl-d)" marker-end="url(#pl-d)"/>`;
    g += `<text x="${left + PW / 2}" y="${top - 20}" font-size="11" text-anchor="middle" fill="#111827" ${FONT}>${fa.lebar} kaki</text>`;
    g += `<line x1="${left - 16}" y1="${top}" x2="${left - 16}" y2="${top + PH}" stroke="#475569" stroke-width="1" marker-start="url(#pl-d)" marker-end="url(#pl-d)"/>`;
    g += `<text x="${left - 22}" y="${top + PH / 2}" font-size="11" text-anchor="middle" fill="#111827" transform="rotate(-90 ${left - 22} ${top + PH / 2})" ${FONT}>${fa.panjang} kaki</text>`;
    // Aliran bahan mentah: satu garisan putus-putus menegak yang lurus dari pintu masuk ke pintu keluar
    g += `<line x1="${flowX}" y1="${top - 30}" x2="${flowX}" y2="${top + PH + 26}" stroke="#b42318" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#pl-ah)"/>`;
    g += `<text x="${flowX + 6}" y="${top - 34}" font-size="10" fill="#b42318" ${FONT}>Masuk bahan mentah</text>`;
    g += `<text x="${flowX + 6}" y="${top + PH + 40}" font-size="10" fill="#b42318" ${FONT}>Keluar barang siap</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Pelan lantai lot kedai ${fa.lebar} kaki x ${fa.panjang} kaki">
      <defs><marker id="pl-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#b42318"/></marker>
      <marker id="pl-d" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M5,0 L5,10" stroke="#475569" stroke-width="2"/></marker></defs>
      <rect width="${W}" height="${H}" fill="#ffffff"/>${g}</svg>`;
  }

  /* ---------- Skrip Python PyMuPDF ---------- */
  function b64(s) {
    const bytes = new TextEncoder().encode(s);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  /** Isu untuk dianotasi: setiap NC dan isu hujah (yang ada petikan) serta setiap cadangan bahasa yang belum ditolak */
  function pdfIssues(r) {
    const out = [], a = r.audit;
    if (a) a.nc.filter(n => n.petikan).forEach(n => out.push({ cari: n.petikan, tajuk: `${n.kod} (${n.tahap === 'major' ? 'major' : 'minor'})`, komen: `${n.kod}: ${n.titik}. ${n.standard ? '[' + n.standard + '] ' : ''}${n.huraian} Cadangan: ${n.cadangan}` }));
    if (a) a.hujah.filter(h => h.petikan).forEach(h => out.push({ cari: h.petikan, tajuk: HUJAH[h.jenis] || 'Struktur hujah', komen: `${HUJAH[h.jenis] || 'Struktur hujah'} (${h.bahagian}): ${h.isu} Kesan: ${h.kesan}. Cadangan: ${h.cadangan}` }));
    (r.sugg || []).forEach(s => {
      const f = String(s.from || '').trim();
      if (f.length < 3 || !/\p{L}/u.test(f)) return;
      out.push({ cari: f, tajuk: s.cat, komen: `${s.cat}: "${f}" -> ${s.to}. ${s.why}` });
    });
    // Satu entri bagi setiap frasa: skrip menganotasi setiap kemunculannya pada semua muka surat
    const seen = new Set();
    return out.filter(i => { const k = i.cari.toLowerCase(); return !seen.has(k) && seen.add(k); }).slice(0, 200);
  }

  function python(r) {
    const data = b64(JSON.stringify({ isu: pdfIssues(r) }));
    const lines = data.match(/.{1,100}/g) || [''];
    return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Anotasi semakan Bijak Labur ke dalam PDF tugasan asal.

Skrip ini membaca PDF tugasan anda, mencari setiap petikan berstatus NC (Non-Conformance) dan setiap
isu struktur hujah dan kesalahan bahasa yang dikesan oleh Semak Kertas di bijaklabur.my, kemudian:
  - menyerlah petikan itu dengan warna MERAH, dan
  - menyuntik nota komen (sticky note) berisi komen dan pembetulan di sebelahnya.
Fail asal tidak diubah; hasilnya disimpan sebagai fail baharu.

Pasang (sekali sahaja):   pip install pymupdf
Jalankan:                 python anotasi_semakan.py tugasan.pdf
Pilihan:                  python anotasi_semakan.py tugasan.pdf hasil.pdf
"""
import base64
import json
import os
import sys

try:
    import pymupdf as fitz  # PyMuPDF 1.24 ke atas
except ImportError:
    try:
        import fitz  # PyMuPDF versi lama
    except ImportError:
        sys.exit("PyMuPDF belum dipasang. Jalankan: pip install pymupdf")

MERAH = (1, 0, 0)
DATA = json.loads(base64.b64decode(
${lines.map(l => `    "${l}"`).join('\n')}
).decode("utf-8"))


TANDA = ".,;:!?()[]{}\\"'“”‘’"


def cari(page, teks):
    """Cari teks pada muka surat. Satu perkataan dipadankan sebagai perkataan penuh (bukan sebahagian perkataan lain).
    Jika frasa panjang tidak dijumpai (cth. dipecah oleh sempang), cuba 6 perkataan pertama."""
    perkataan = teks.split()
    if len(perkataan) == 1:
        k = perkataan[0].strip(TANDA).lower()
        return [fitz.Rect(w[:4]).quad for w in page.get_text("words") if w[4].strip(TANDA).lower() == k] if k else []
    kuad = page.search_for(teks, quads=True)
    if not kuad and len(perkataan) > 6:
        kuad = page.search_for(" ".join(perkataan[:6]), quads=True)
    return kuad


def main():
    if len(sys.argv) < 2 or not sys.argv[1].lower().endswith(".pdf"):
        sys.exit("Guna: python anotasi_semakan.py tugasan.pdf [hasil.pdf]")
    sumber = sys.argv[1]
    hasil = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(sumber)[0] + "_disemak.pdf"
    doc = fitz.open(sumber)
    dijumpai, tiada = 0, []
    for isu in DATA["isu"]:
        jumpa = False
        for page in doc:  # setiap muka surat yang mengandungi isu ini dianotasi
            kuad = cari(page, isu["cari"])
            if not kuad:
                continue
            serlah = page.add_highlight_annot(kuad)  # satu serlahan bagi semua kemunculan pada muka surat ini
            serlah.set_colors(stroke=MERAH)
            serlah.set_info(title="Bijak Labur: " + isu["tajuk"], content=isu["komen"])
            serlah.update()
            r = kuad[0].rect
            titik = fitz.Point(min(r.x1 + 4, page.rect.width - 24), max(r.y0 - 4, 4))
            nota = page.add_text_annot(titik, isu["komen"], icon="Comment")
            nota.set_info(title="Bijak Labur: " + isu["tajuk"])
            nota.set_colors(stroke=MERAH)
            nota.update()
            jumpa = True
        if jumpa:
            dijumpai += 1
        else:
            tiada.append(isu)
    if len(doc) and tiada:
        ringkasan = "Isu yang tidak dijumpai dalam PDF (teks mungkin berbeza):\\n" + "\\n".join("- " + i["komen"] for i in tiada[:40])
        nota = doc[0].add_text_annot(fitz.Point(12, 12), ringkasan, icon="Note")
        nota.set_info(title="Bijak Labur: ringkasan")
        nota.set_colors(stroke=MERAH)
        nota.update()
    doc.save(hasil, garbage=3, deflate=True)
    print(f"Siap: {dijumpai} isu dianotasi, {len(tiada)} tidak dijumpai. Fail: {hasil}")


if __name__ == "__main__":
    main()
`;
  }

  /* ---------- Paparan ---------- */
  const card = $('#industriCard'), box = $('#industriBox');
  let cur = null;

  const btns = (mmKey, svgKey) => `<div class="row-gap">${mmKey ? `<button class="btn sm ghost" type="button" data-ia="${mmKey}">${icon('copy')}Salin kod Mermaid</button>` : ''}${svgKey ? `<button class="btn sm ghost" type="button" data-ia="${svgKey}">${icon('download')}Muat turun SVG</button>` : ''}</div>`;

  function petaHTML(pt) {
    return `<div class="ia-peta"><div class="ia-akar">${esc(pt.akar)}</div><ol class="ia-cabang">${pt.cabang.map(c => `<li><b>${esc(c.label)}</b>${c.anak.length ? `<ul>${c.anak.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ol></div>`;
  }

  function html(a) {
    if (a.error) return `<p class="note">${icon('alert')}<span>${esc(a.error)}</span></p>`;
    const total = a.jumlah;
    const hujahRows = a.hujah.map(h => `<tr>
        <td class="wrap"><b>${esc(h.bahagian)}</b>${h.petikan ? `<blockquote>${esc(h.petikan)}</blockquote>` : ''}</td>
        <td class="wrap"><span class="rf-chip ${h.tahap === 'tinggi' ? 'down' : h.tahap === 'sederhana' ? 'warn' : 'info'}">${esc(HUJAH[h.jenis] || 'Struktur')}</span> ${esc(h.isu)}</td>
        <td class="wrap">${esc(h.kesan)}</td>
        <td class="wrap">${esc(h.cadangan)}</td></tr>`).join('');
    const ncRows = a.nc.map(n => `<tr>
        <td class="wrap"><b>${esc(n.bahagian)}</b>${n.petikan ? `<blockquote>${esc(n.petikan)}</blockquote>` : '<span class="muted small ia-block">Langkah tiada dalam teks</span>'}</td>
        <td class="wrap">${esc(n.titik)}</td>
        <td><span class="rf-chip ${n.tahap === 'major' ? 'down' : 'warn'}">${esc(n.kod)}</span><span class="muted small ia-block">${n.tahap === 'major' ? 'Major' : 'Minor'}</span></td>
        <td class="wrap">${n.standard ? `<b>${esc(n.standard)}</b>. ` : ''}${esc(n.huraian)}</td>
        <td class="wrap">${esc(n.cadangan)}</td></tr>`).join('');
    const fl = svgAliran(a.aliran), pl = svgPelan(a.fasiliti);
    return `${a.profil || a.bidang ? `<p class="ia-profil">${icon('check')}<span>Disemak sebagai <b>${esc(a.profil || 'pemeriksa universiti')}</b>${a.bidang ? `, bidang ${esc(a.bidang)}` : ''}.${a.soalan ? ` Soalan utama dikesan: ${esc(a.soalan)}` : ''}</span></p>` : ''}
      <div class="xp-head"><div class="xp-score"><b class="num">${total}</b><span>/100</span></div><div><div class="xp-grade">Unjuran gred ${gred(total)} (anggaran skala A+ hingga F)</div><p class="muted small">Rubrik universiti disesuaikan dengan bidang tugasan. Markah dijana oleh AI sebagai panduan, bukan markah rasmi.</p></div></div>
      <div class="xp-crit">${RUBRIK.map(([k, n]) => { const m = a.rubrik[k] || { skor: 0, ulasan: '', ada: true }; return m.ada ? `<div class="xp-row"><div class="row-between"><b>${n}</b><span class="num">${m.skor}/20</span></div><div class="track"><div style="width:${m.skor * 5}%"></div></div>${m.ulasan ? `<p class="muted small">${esc(m.ulasan)}</p>` : ''}</div>` : `<div class="xp-row"><div class="row-between"><b>${n}</b><span class="muted small">Tidak berkaitan</span></div>${m.ulasan ? `<p class="muted small">${esc(m.ulasan)}</p>` : ''}</div>`; }).join('')}</div>

      <h4>Matriks pembaikan struktur hujah</h4>
      ${a.hujah.length ? `<div class="tbl-wrap"><table><thead><tr><th>Bahagian/Perenggan</th><th>Isu Struktur Hujah</th><th>Kesan Kepada Markah</th><th>Cadangan Penambahbaikan</th></tr></thead><tbody>${hujahRows}</tbody></table></div>`
        : '<p class="muted small">Tiada kelompongan hujah yang ketara ditemui.</p>'}

      ${a.industri ? `<h4>Matriks risiko pematuhan industri (NC)</h4>
        ${a.nc.length ? `<div class="tbl-wrap"><table><thead><tr><th>Bahagian/Perenggan</th><th>Titik Kawalan/Risiko</th><th>Kod NC</th><th>Huraian Pelanggaran Standard</th><th>Cadangan Penambahbaikan (Untuk Markah Penuh)</th></tr></thead><tbody>${ncRows}</tbody></table></div>
          <p class="muted small">${a.nc.filter(n => n.tahap === 'major').length} NC major, ${a.nc.filter(n => n.tahap === 'minor').length} NC minor. Penilaian AI sebagai panduan pembelajaran, bukan audit pensijilan rasmi. Sahkan nombor klausa dengan dokumen standard rasmi.</p>`
          : '<p class="muted small">Tiada NC ditemui dalam prosedur dan parameter yang dibincangkan.</p>'}` : ''}

      ${a.peta.cabang.length ? `<h4>Peta konsep</h4>${petaHTML(a.peta)}${btns('mm-peta')}` : ''}

      ${fl ? `<h4>Carta alir${a.aliran.tajuk ? ': ' + esc(a.aliran.tajuk) : ''}</h4><figure class="ia-fig">${fl}</figure>${btns('mm-aliran', 'svg-aliran')}` : ''}

      ${pl ? `<h4>Pelan lantai lot kedai ${a.fasiliti.lebar} x ${a.fasiliti.panjang} kaki</h4>
        <figure class="ia-fig">${pl}</figure>
        <p class="muted small">Garisan putus-putus merah menegak ialah aliran bahan mentah satu hala dari hadapan ke belakang. Ukuran zon ialah cadangan AI dan perlu disemak dengan keperluan premis sebenar.</p>${btns('mm-pelan', 'svg-pelan')}` : ''}

      <h4>Anotasi terus ke dalam PDF tugasan</h4>
      <p class="muted small">Muat turun skrip Python ini dan jalankan pada komputer anda: <code>pip install pymupdf</code>, kemudian <code>python anotasi_semakan.py tugasan.pdf</code>. Setiap isu hujah${a.industri ? ', NC' : ''} dan kesalahan bahasa akan diserlah merah dengan nota komen pembetulan dalam fail baharu. PDF anda tidak dihantar ke mana-mana.</p>
      <div class="row-gap"><button class="btn sm" type="button" data-ia="py">${icon('download')}Skrip anotasi PDF (.py)</button></div>`;
  }

  function render(state) {
    cur = state.audit;
    card.classList.toggle('hidden', !cur);
    box.innerHTML = cur ? html(cur) : '';
  }

  const save = (name, text, type) => {
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([text], { type }));
    el.download = name; el.click(); setTimeout(() => URL.revokeObjectURL(el.href), 1000);
  };
  const copy = async t => { try { await navigator.clipboard.writeText(t); toast('Kod Mermaid disalin'); } catch { toast('Tidak dapat menyalin.'); } };
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-ia]');
    if (!b || !cur || cur.error) return;
    const k = b.dataset.ia;
    if (k === 'mm-peta') copy(mermaidPeta(cur.peta));
    if (k === 'mm-aliran') copy(mermaidAliran(cur.aliran));
    if (k === 'mm-pelan') copy(mermaidPelan(cur.fasiliti));
    if (k === 'svg-aliran') save('carta-alir.svg', svgAliran(cur.aliran), 'image/svg+xml');
    if (k === 'svg-pelan') save('pelan-lantai-20x80.svg', svgPelan(cur.fasiliti), 'image/svg+xml');
    if (k === 'py') { const r = window.CheckerReport && window.CheckerReport(); if (r) save('anotasi_semakan.py', python(r), 'text/x-python;charset=utf-8'); }
  });

  window.SemakIndustri = { fetch: fetchAudit, render, gred, RUBRIK, HUJAH, mermaidPeta, mermaidAliran, mermaidPelan, svgAliran, svgPelan, python, pdfIssues };
})();
