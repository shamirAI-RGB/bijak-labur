/* Setiap halaman SiswaCap: dibuka tanpa ralat pada telefon dan desktop, tema cerah dan gelap, tiada tatal mendatar,
   tiada gambar atau fail tempatan yang rosak, dan setiap pautan dalaman menuju ke halaman yang wujud. */
const VIEWS = ['utama', 'belajar', 'pasaran', 'solat', 'ibadah', 'semak', 'jadual', 'nota', 'sihat', 'studio', 'buku', 'kerja', 'jejak', 'komuniti', 'premium', 'soalan', 'halal', 'alat'];
const LAMAN = ['siswa.html', 'tentang.html', 'cara.html', 'terma.html', 'terma-guna.html', 'terma-app.html', 'privacy.html', 'penafian-ai.html', 'bayaran-balik.html', 'padam-data.html', 'peta.html', '404.html'];

// Pantau fail tempatan yang gagal dimuat (404) sepanjang kes
function pantau404(page) {
  const rosak = [];
  page.on('response', r => { const u = r.url(); if (u.startsWith('http://127.0.0.1') && r.status() >= 400) rosak.push(`${r.status()} ${new URL(u).pathname}`); });
  return rosak;
}

async function semakHalaman(t, page, v, lebar) {
  await t.ada(`#view-${v}.active`, /\S/);
  const h = await page.evaluate(([v]) => {
    const el = document.getElementById('view-' + v);
    const tajuk = el.querySelector('h1, h2');
    // Elemen yang terkeluar dari skrin (punca tatal mendatar pada telefon)
    const lebar = document.documentElement.clientWidth;
    const luar = [];
    if (document.documentElement.scrollWidth > lebar + 1) {
      for (const x of el.querySelectorAll('*')) {
        const r = x.getBoundingClientRect();
        if (r.width && r.right > lebar + 1 && getComputedStyle(x).position !== 'fixed') {
          let p = x.parentElement, dipotong = false;
          while (p && p !== document.body) { const o = getComputedStyle(p); if (/hidden|auto|scroll|clip/.test(o.overflowX)) { dipotong = true; break; } p = p.parentElement; }
          if (!dipotong) luar.push(`${x.tagName.toLowerCase()}${x.id ? '#' + x.id : ''}${x.className && typeof x.className === 'string' ? '.' + x.className.trim().split(/\s+/).join('.') : ''} (${Math.round(r.right)}px)`);
        }
        if (luar.length > 4) break;
      }
    }
    const gambar = [...el.querySelectorAll('img')].filter(i => i.complete && i.src.startsWith(location.origin) && !i.naturalWidth).map(i => i.getAttribute('src'));
    return { tajuk: tajuk ? tajuk.textContent.trim() : '', sw: document.documentElement.scrollWidth, lebar, luar, gambar };
  }, [v]);
  if (!h.tajuk) throw new Error(`#view-${v} tiada tajuk h1/h2`);
  if (h.sw > h.lebar + 1) throw new Error(`tatal mendatar pada ${lebar}px: lebar kandungan ${h.sw}px. Punca: ${h.luar.join(', ') || 'tidak dikesan dalam halaman ini'}`);
  if (h.gambar.length) throw new Error(`gambar rosak: ${h.gambar.join(', ')}`);
}

const kes = [];
for (const v of VIEWS) {
  for (const [lebar, gelap] of [[390, false], [1280, true]]) {
    kes.push({ kumpulan: 'Halaman', nama: `#${v} ${lebar}px ${gelap ? 'gelap' : 'cerah'}`, lebar,
      storan: { bl_theme: JSON.stringify(gelap ? 'dark' : 'light') },
      langkah: async (t, page) => {
        const rosak = pantau404(page);
        await t.buka('#' + v);
        await semakHalaman(t, page, v, lebar);
        const tema = await page.evaluate(() => document.documentElement.dataset.theme);
        if (tema !== (gelap ? 'dark' : 'light')) throw new Error(`tema ${tema}, sepatutnya ${gelap ? 'dark' : 'light'}`);
        if (rosak.length) throw new Error(`fail tempatan gagal dimuat: ${[...new Set(rosak)].join(', ')}`);
      } });
  }
}

kes.push({ kumpulan: 'Halaman', nama: 'Navigasi bawah dan suis tema', langkah: async (t, page) => {
  await t.buka('#utama');
  for (const v of ['belajar', 'pasaran', 'solat', 'semak']) {
    const a = await page.$(`[data-nav="${v}"]:visible`);
    if (!a) continue;
    await a.click(); await t.ada(`#view-${v}.active`, /\S/);
    if (await page.evaluate(() => location.hash.split('/')[0]) !== '#' + v) throw new Error(`hash tidak berubah ke #${v}`);
  }
  const awal = await page.evaluate(() => document.documentElement.dataset.theme || 'auto');
  await t.klik('#themeBtn');
  const lepas = await page.evaluate(() => document.documentElement.dataset.theme);
  if (lepas === awal) throw new Error('suis tema tidak menukar tema');
  await page.reload(); await t.rehat(300);
  if (await page.evaluate(() => document.documentElement.dataset.theme) !== lepas) throw new Error('tema tidak kekal selepas muat semula');
} });

for (const [kod, re] of [['en', /[A-Za-z]/], ['ar', /[؀-ۿ]/]]) {
  kes.push({ kumpulan: 'Halaman', nama: `Bahasa ${kod.toUpperCase()}: setiap halaman dibuka tanpa ralat`, storan: { bl_bahasa: JSON.stringify(kod) }, langkah: async (t, page) => {
    await t.buka('#utama');
    const lang = await page.evaluate(() => [document.documentElement.lang, document.documentElement.dir]);
    if (lang[0] !== kod) throw new Error(`lang="${lang[0]}", sepatutnya ${kod}`);
    if (kod === 'ar' && lang[1] !== 'rtl') throw new Error('bahasa Arab tidak kanan ke kiri');
    for (const v of VIEWS) {
      await page.evaluate(v => { location.hash = '#' + v; }, v);
      await t.ada(`#view-${v}.active`, /\S/);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (sw > 1) throw new Error(`#${v}: tatal mendatar ${sw}px dalam bahasa ${kod}`);
    }
    await t.ada('nav, header', re);
  } });
}

kes.push({ kumpulan: 'Halaman', nama: 'Setiap pautan dalaman menuju ke halaman yang wujud', lebar: 1280, langkah: async (t, page) => {
  await t.buka('#utama');
  const pautan = await page.evaluate(VIEWS => {
    const salah = [], fail = new Set();
    for (const a of document.querySelectorAll('a[href]')) {
      const h = a.getAttribute('href');
      if (h.startsWith('#')) {
        const v = h.slice(1).split('/')[0];
        if (v && !VIEWS.includes(v) && !document.getElementById(v) && !/^(main|kandungan)$/.test(v)) salah.push(h);
      } else if (!/^(https?:|mailto:|tel:|whatsapp:|sms:|javascript:)/.test(h)) fail.add(h.split('#')[0].split('?')[0]);
    }
    return { salah: [...new Set(salah)], fail: [...fail].filter(Boolean) };
  }, VIEWS);
  if (pautan.salah.length) throw new Error(`pautan # ke halaman yang tiada: ${pautan.salah.join(', ')}`);
  const tiada = [];
  for (const f of pautan.fail) { const r = await page.request.get(new URL(f, page.url()).href); if (r.status() >= 400) tiada.push(`${f} (${r.status()})`); }
  if (tiada.length) throw new Error(`pautan ke fail yang tiada: ${tiada.join(', ')}`);
} });

for (const f of LAMAN) {
  kes.push({ kumpulan: 'Halaman', nama: f, langkah: async (t, page) => {
    const rosak = pantau404(page);
    await t.buka(f);
    await t.ada('h1', /\S/);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (sw > 1) throw new Error(`tatal mendatar ${sw}px pada telefon`);
    const tiada = [];
    for (const h of await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => !/^(https?:|mailto:|tel:|#)/.test(h)))) {
      const r = await page.request.get(new URL(h.split('#')[0], page.url()).href); if (r.status() >= 400) tiada.push(h);
    }
    if (tiada.length) throw new Error(`pautan rosak: ${tiada.join(', ')}`);
    if (rosak.length) throw new Error(`fail tempatan gagal dimuat: ${[...new Set(rosak)].join(', ')}`);
  } });
}

export default kes;
