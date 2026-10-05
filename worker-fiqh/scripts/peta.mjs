/*
 * Peta halaman Shamela -> [indeks fail, muka surat PDF] daripada hasil OCR (padan-pdf.mjs).
 * failOcr[f] = { mukaSuratPdf: [halamanShamela, skor] atau 0 }.
 * Padanan yang melanggar tertib menaik dibuang (jujukan tidak menurun terpanjang); bagi setiap halaman Shamela diambil
 * muka surat PDF pertama yang mengandungi teksnya. Halaman tanpa padanan diisi hanya jika kedua-dua jirannya dalam fail
 * yang sama, jaraknya kecil dan bezanya konsisten.
 */
export function bina(failOcr, N) {
  const entri = [];
  failOcr.forEach((ocr, f) => Object.entries(ocr).filter(([, v]) => v).forEach(([p, [n]]) => entri.push({ f, p: +p, n })));
  entri.sort((a, b) => a.f - b.f || a.p - b.p);
  const tail = [], prev = new Array(entri.length), idx = [];
  entri.forEach((e, i) => {
    let lo = 0, hi = tail.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (entri[tail[mid]].n <= e.n) lo = mid + 1; else hi = mid; }
    prev[i] = lo ? tail[lo - 1] : -1; tail[lo] = i;
  });
  for (let i = tail.length ? tail[tail.length - 1] : -1; i >= 0; i = prev[i]) idx.push(i);
  const peta = {};
  for (const i of idx.reverse()) { const e = entri[i]; if (!peta[e.n]) peta[e.n] = [e.f, e.p]; }
  const ada = Object.keys(peta).map(Number).sort((a, b) => a - b);
  for (let i = 1; i < ada.length; i++) {
    const a = ada[i - 1], b = ada[i], [fa, pa] = peta[a], [fb, pb] = peta[b];
    if (b - a > 1 && b - a <= 4 && fa === fb && pb - pa === b - a) for (let n = a + 1; n < b; n++) peta[n] = [fa, pa + n - a];
  }
  return Object.fromEntries(Object.entries(peta).filter(([n]) => +n >= 1 && +n <= N));
}
