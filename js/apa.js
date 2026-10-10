/* SiswaCap: pemformat rujukan APA edisi ke-7 (dikongsi oleh Alat Pelajar dan pelayan worker-fiqh untuk ujian).
   Input metadata: { jenis, pengarang: [{ akhir, awal } | { org }], tahun, bulan?, hari?, tajuk, sumber (jurnal/buku/laman),
   jilid, isu, halaman, penerbit, editor: [..], edisi, institusi, peringkat, doi, url }.
   Hasil: { teks, html, intext, intextNaratif }. Tajuk tidak diubah huruf besarnya kerana tajuk asal mungkin nama khas. */
const APA = (function () {
  const BULAN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const bersih = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const tanpaTitik = s => bersih(s).replace(/[.\s]+$/, '');
  const escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // "Ahmad Faiz bin Ali" atau "Siti Nur" -> A. F.; nama sudah berinisial dikekalkan
  function inisial(awal) {
    awal = bersih(awal);
    if (!awal) return '';
    return awal.split(/[\s.]+/).filter(Boolean).map(w => w.split('-').map(p => p[0].toUpperCase() + '.').join('-')).join(' ');
  }
  const nama = p => p && p.org ? bersih(p.org) : [bersih(p && p.akhir), inisial(p && p.awal)].filter(Boolean).join(', ');
  const ada = p => p && (bersih(p.org) || bersih(p.akhir));

  function senaraiPengarang(list) {
    const n = (list || []).filter(ada).map(nama);
    if (!n.length) return '';
    if (n.length === 1) return n[0];
    if (n.length <= 20) return n.slice(0, -1).join(', ') + ', & ' + n[n.length - 1];
    return n.slice(0, 19).join(', ') + ', . . . ' + n[n.length - 1];
  }
  // Editor dalam bab buku: "A. B. Akhir (Ed.)"
  function senaraiEditor(list) {
    const n = (list || []).filter(ada).map(p => p.org ? bersih(p.org) : [inisial(p.awal), bersih(p.akhir)].filter(Boolean).join(' '));
    if (!n.length) return '';
    const s = n.length === 1 ? n[0] : n.length === 2 ? n.join(' & ') : n.slice(0, -1).join(', ') + ', & ' + n[n.length - 1];
    return s + (n.length > 1 ? ' (Eds.)' : ' (Ed.)');
  }

  function tarikh(m) {
    const y = bersih(m.tahun).match(/\d{4}/);
    if (!y) return 'n.d.';
    const b = +m.bulan, h = +m.hari;
    if (m.jenis === 'web' && b >= 1 && b <= 12) return `${y[0]}, ${BULAN[b - 1]}${h ? ' ' + h : ''}`;
    return y[0];
  }
  const doiUrl = d => {
    d = bersih(d).replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
    return /^10\.\d{4,9}\/\S+$/.test(d) ? 'https://doi.org/' + d : '';
  };
  // "3" atau "edisi 3" -> "3rd"; teks lain (cth. "Rev.") dikekalkan
  const ordinal = e => {
    const n = bersih(e).replace(/^edisi\s*/i, '').replace(/\s*(ed\.?|edisi)$/i, '');
    if (!/^\d+$/.test(n)) return n;
    const k = +n % 100, a = +n % 10;
    return n + (k >= 11 && k <= 13 ? 'th' : a === 1 ? 'st' : a === 2 ? 'nd' : a === 3 ? 'rd' : 'th');
  };
  const halaman = p => bersih(p).replace(/\s*[-–—]+\s*/g, '–');

  /** Bina rujukan sebagai segmen [teks, italik] */
  function segmen(m) {
    m = m || {};
    const out = [], t = (s, i = false) => { if (s) out.push([s, i]); };
    const pengarang = senaraiPengarang(m.pengarang);
    const tajuk = tanpaTitik(m.tajuk), sumber = tanpaTitik(m.sumber), penerbit = tanpaTitik(m.penerbit);
    const pautan = doiUrl(m.doi) || (/^https?:\/\//i.test(bersih(m.url)) ? bersih(m.url) : '');
    const jenis = ['jurnal', 'buku', 'bab', 'laporan', 'tesis', 'web', 'prosiding'].includes(m.jenis) ? m.jenis : 'jurnal';
    // Tanpa pengarang: tajuk mengambil tempat pengarang (APA 9.12)
    const tajukDulu = !pengarang;
    const italikTajuk = ['buku', 'laporan', 'tesis', 'web'].includes(jenis);
    const tulisTajuk = () => {
      if (!tajuk) return;
      t(tajuk, italikTajuk);
      if (jenis === 'buku' && bersih(m.edisi) && !/^(1|1st|pertama)$/i.test(bersih(m.edisi))) t(` (${ordinal(m.edisi)} ed.)`);
      if (jenis === 'tesis') t(` [${bersih(m.peringkat) || 'Master’s thesis'}${bersih(m.institusi) ? ', ' + tanpaTitik(m.institusi) : ''}]`);
      t('. ');
    };
    if (tajukDulu) { tulisTajuk(); t(`(${tarikh(m)}). `); }
    else { t(pengarang.endsWith('.') ? pengarang + ' ' : pengarang + '. '); t(`(${tarikh(m)}). `); tulisTajuk(); }

    if (jenis === 'jurnal') {
      if (sumber) {
        t(sumber, true);
        if (bersih(m.jilid)) { t(', '); t(bersih(m.jilid), true); }
        if (bersih(m.isu)) t(`(${bersih(m.isu)})`);
        if (bersih(m.halaman)) t(`, ${halaman(m.halaman)}`);
        t('. ');
      }
    } else if (jenis === 'bab' || jenis === 'prosiding') {
      if (sumber) {
        t('In ');
        const ed = senaraiEditor(m.editor);
        if (ed) t(ed + ', ');
        t(sumber, true);
        if (bersih(m.halaman)) t(` (pp. ${halaman(m.halaman)})`);
        t('. ');
      }
      if (penerbit) t(penerbit + '. ');
    } else if (jenis === 'web') {
      if (sumber && sumber !== pengarang) t(sumber + '. ');
    } else if (penerbit && penerbit !== pengarang) t(penerbit + '. ');
    if (pautan) t(pautan);
    // Buang ruang di hujung
    if (out.length) out[out.length - 1][0] = out[out.length - 1][0].replace(/\s+$/, '');
    return out;
  }

  function petikDalamTeks(m) {
    const list = ((m && m.pengarang) || []).filter(ada);
    const nm = p => p.org ? bersih(p.org) : bersih(p.akhir);
    const y = tarikh({ ...m, jenis: 'jurnal' });
    let siapa;
    if (!list.length) siapa = `“${tanpaTitik(m && m.tajuk).split(' ').slice(0, 4).join(' ')}”`;
    else if (list.length === 1) siapa = nm(list[0]);
    else if (list.length === 2) siapa = `${nm(list[0])} & ${nm(list[1])}`;
    else siapa = `${nm(list[0])} et al.`;
    return { intext: `(${siapa}, ${y})`, intextNaratif: `${siapa.replace(' & ', ' and ')} (${y})` };
  }

  function format(m) {
    const s = segmen(m);
    return {
      teks: s.map(x => x[0]).join(''),
      html: s.map(([x, i]) => i ? `<i>${escH(x)}</i>` : escH(x)).join(''),
      ...petikDalamTeks(m)
    };
  }

  // Susunan senarai rujukan APA: abjad mengikut pengarang pertama (atau tajuk), kemudian tahun
  const kunciSusun = m => (senaraiPengarang(m.pengarang) || tanpaTitik(m.tajuk)).toLowerCase() + ' ' + tarikh(m);
  const susun = list => [...list].sort((a, b) => kunciSusun(a).localeCompare(kunciSusun(b)));

  return { format, susun, doiUrl, inisial, senaraiPengarang };
})();
globalThis.APA = APA;
