/* Setiap halaman SiswaCap: dibuka tanpa ralat pada telefon dan desktop, tema cerah dan gelap, tiada tatal mendatar,
   tiada gambar atau fail tempatan yang rosak, dan setiap pautan dalaman menuju ke halaman yang wujud. */
const VIEWS = ['utama', 'belajar', 'pasaran', 'solat', 'ibadah', 'semak', 'jadual', 'nota', 'komuniti', 'premium', 'soalan', 'halal', 'alat', 'uitm', 'pelajar-halal'];
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

// Pasangan yang pernah dilaporkan bertindih semasa peralihan, kemudian setiap halaman secara berturut-turut
kes.push({ kumpulan: 'Halaman', nama: 'Navigasi hash: hanya satu halaman kelihatan, menu Alat ditutup, tatal ke atas, peralihan tanpa tindih', lebar: 1280, langkah: async (t, page) => {
  const kelihatan = () => page.evaluate(() => [...document.querySelectorAll('.view')].filter(el => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && el.getBoundingClientRect().height > 0; }).map(el => el.id));
  await t.buka('#utama');
  const urutan = ['jadual', 'komuniti', 'alat', 'halal', ...VIEWS];
  for (const v of urutan) {
    // Buka menu Alat dan tatal ke bawah dahulu: kedua-duanya mesti ditetapkan semula selepas bertukar halaman
    await page.evaluate(() => { const d = document.querySelector('details.nav-more'); if (d) d.open = true; scrollTo(0, 600); });
    const masa = await page.evaluate(v => new Promise(selesai => {
      const lama = [], baru = [];
      location.hash = '#' + v;
      // Animasi peralihan halaman: halaman lama mesti hilang sepenuhnya sebelum halaman baharu mula muncul
      let n = 0;
      const lihat = () => {
        for (const a of document.getAnimations()) {
          const pe = a.effect && a.effect.pseudoElement || '';
          const tm = a.effect.getComputedTiming();
          if (/view-transition-old\(root\)/.test(pe)) lama.push(tm.delay + tm.activeDuration);
          if (/view-transition-new\(root\)/.test(pe)) baru.push(tm.delay);
        }
        if (lama.length || baru.length || ++n > 30) selesai({ lama, baru }); else setTimeout(lihat, 10);
      };
      lihat();
    }), v);
    if (masa.lama.length && masa.baru.length && Math.max(...masa.lama) > Math.min(...masa.baru) + 1) throw new Error(`#${v}: halaman lama masih kelihatan (${Math.max(...masa.lama)} ms) selepas halaman baharu mula muncul (${Math.min(...masa.baru)} ms)`);
    await t.ada(`#view-${v}.active`, /\S/);
    await t.rehat(450);
    const k = await kelihatan();
    if (k.length !== 1 || k[0] !== 'view-' + v) throw new Error(`#${v}: halaman kelihatan ${JSON.stringify(k)}`);
    const st = await page.evaluate(() => ({ menu: !!document.querySelector('details.nav-more[open]'), y: scrollY, tersembunyi: [...document.querySelectorAll('.view:not(.active)')].every(el => el.hidden) }));
    if (st.menu) throw new Error(`#${v}: menu Alat masih terbuka`);
    if (st.y > 1) throw new Error(`#${v}: halaman tidak ditatal ke atas (scrollY ${st.y})`);
    if (!st.tersembunyi) throw new Error(`#${v}: halaman lain tidak disembunyikan (atribut hidden)`);
  }
  // Laluan yang tiada (cth. #agen) jatuh ke Utama, juga dengan satu halaman sahaja
  await page.evaluate(() => { location.hash = '#agen'; });
  await t.ada('#view-utama.active', /\S/); await t.rehat(450);
  const k = await kelihatan();
  if (k.length !== 1 || k[0] !== 'view-utama') throw new Error(`#agen: halaman kelihatan ${JSON.stringify(k)}`);
} });

// Menu Alat: dua kumpulan berlabel (Buku Nota AI, Kerjaya AI dan Gaya Hidup & Kreatif dibuang atas arahan pemilik, 31 Okt 2026), dan halaman Alat Pelajar memaparkan kumpulan yang sama
kes.push({ kumpulan: 'Halaman', nama: 'Menu Alat dan halaman Alat Pelajar dalam dua kumpulan berlabel', lebar: 1280, langkah: async (t, page) => {
  await t.buka('#utama');
  const kump = await page.$$eval('.nav-pop .nav-kump', gs => gs.map(g => [g.querySelector('.nav-kump-t').textContent, [...g.querySelectorAll('a')].map(a => a.getAttribute('href'))]));
  const jangka = [['Pelajar', ['#alat', '#uitm', '#pelajar-halal']], ['Ibadah & Komuniti', ['#ibadah', '#komuniti']]];
  if (JSON.stringify(kump) !== JSON.stringify(jangka)) throw new Error(`kumpulan menu Alat: ${JSON.stringify(kump)}`);
  await t.klik('details.nav-more > summary');
  await t.klik('.nav-pop a[href="#komuniti"]');
  await t.ada('#view-komuniti.active', /\S/);
  if (await page.$('details.nav-more[open]')) throw new Error('menu Alat tidak ditutup selepas memilih');
  await page.evaluate(() => { location.hash = '#alat'; });
  await t.ada('#view-alat .al-kump-t', /\S/);
  const hal = await page.$$eval('#view-alat .al-kump', gs => gs.map(g => g.querySelector('.al-kump-t').textContent));
  if (JSON.stringify(hal) !== JSON.stringify(jangka.map(x => x[0]))) throw new Error(`kumpulan halaman Alat: ${JSON.stringify(hal)}`);
} });

// Jadual, Nota IC220 dan Audit Halal dipindahkan dari halaman utama ke bahagian Pelajar UiTM dan Pelajar Halal (arahan pemilik 20 Okt 2026)
kes.push({ kumpulan: 'Halaman', nama: 'Bahagian Pelajar UiTM dan Pelajar Halal menggantikan kad Jadual, Nota dan Audit Halal di halaman utama', langkah: async (t, page) => {
  await t.buka('#utama');
  const utama = await page.$$eval('#view-utama a[href="#jadual"]:not(.md-chip), #view-utama a[href="#nota"], #view-utama a[href="#halal"], .desk-nav > a[href="#jadual"], .desk-nav > a[href="#nota"]', as => as.map(a => a.getAttribute('href')));
  if (utama.length) throw new Error(`masih ada di halaman utama atau barisan navigasi: ${utama.join(', ')}`);
  for (const [v, tajuk, jangka] of [['uitm', 'Pelajar UiTM', ['#jadual', '#semak', '#alat']], ['pelajar-halal', 'Pelajar Halal', ['#halal', '#nota', '#semak', '#ibadah/fiqh/tanya']]]) {
    await page.evaluate(v => { location.hash = '#' + v; }, v);
    await t.ada(`#view-${v}.active h1`, new RegExp('^' + tajuk + '$'));
    const kad = await page.$$eval(`#view-${v} .card.shortcut`, as => as.map(a => a.getAttribute('href')));
    if (JSON.stringify(kad) !== JSON.stringify(jangka)) throw new Error(`kad ${tajuk}: ${JSON.stringify(kad)}`);
  }
  await t.klik('#view-pelajar-halal a[href="#halal"]');
  await t.ada('#view-halal.active h1', /\S/);
  await page.evaluate(() => { location.hash = '#alat'; });
  await t.ada('#view-alat a[href="#uitm"]', /Pelajar UiTM/);
  await t.ada('#view-alat a[href="#pelajar-halal"]', /Pelajar Halal/);
} });

// Alamat lama /terms.html melencong ke Terma Perkhidmatan
kes.push({ kumpulan: 'Halaman', nama: 'terms.html melencong ke terma-guna.html', langkah: async (t, page) => {
  await t.buka('terms.html');
  await page.waitForURL(/\/terma-guna\.html$/, { timeout: 5000 });
  await t.ada('h1', /\S/);
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

// Placeholder textarea, rekod solat (nombor + ayat) dan waktu "mlm" turut diterjemah
kes.push({ kumpulan: 'Halaman', nama: 'Bahasa EN: placeholder textarea, rekod solat dan waktu malam diterjemah', storan: { bl_bahasa: '"en"' }, langkah: async (t, page) => {
  await t.buka('#soalan');
  await page.waitForFunction(() => /Write your question here/.test(document.querySelector('#view-soalan textarea')?.placeholder || ''), null, { timeout: 8000 })
    .catch(async () => { throw new Error('placeholder textarea Ruang soalan tidak diterjemah: ' + await page.evaluate(() => document.querySelector('#view-soalan textarea')?.placeholder)); });
  await t.buka('#solat');
  await t.ada('#trackerSub', /^\d+ of 5 prayers ticked/);
  const mlm = await page.evaluate(() => [...document.querySelectorAll('#view-solat')].map(e => e.textContent).join(' ').match(/\d:\d\d (pg|ptg|mlm)\b/));
  if (mlm) throw new Error('waktu masih BM: ' + mlm[0]);
} });

kes.push({ kumpulan: 'Halaman', nama: 'Pusat Kawalan: pintu kunci muat dalam skrin telefon', langkah: async (t, page) => {
  await t.buka('pusat.html');
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (sw > 1) throw new Error(`tatal mendatar ${sw}px`);
} });

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
