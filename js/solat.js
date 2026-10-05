/* Waktu solat: zon JAKIM melalui api.waktusolat.app untuk Malaysia,
   dan api.aladhan.com untuk bandar lain di seluruh dunia (zon "GL") */
(function () {
  const API = 'https://api.waktusolat.app';
  const ALADHAN = 'https://api.aladhan.com/v1';
  const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
  let TZ = 'Asia/Kuala_Lumpur';
  const FALLBACK_ZONES = `JHR01|Johor|Pulau Aur dan Pulau Pemanggil
JHR02|Johor|Johor Bahru, Kota Tinggi, Mersing, Kulai
JHR03|Johor|Kluang, Pontian
JHR04|Johor|Batu Pahat, Muar, Segamat, Gemas, Tangkak
KDH01|Kedah|Kota Setar, Kubang Pasu, Pokok Sena
KDH02|Kedah|Kuala Muda, Yan, Pendang
KDH03|Kedah|Padang Terap, Sik
KDH04|Kedah|Baling
KDH05|Kedah|Bandar Baharu, Kulim
KDH06|Kedah|Langkawi
KDH07|Kedah|Puncak Gunung Jerai
KTN01|Kelantan|Kota Bharu, Bachok, Machang, Pasir Mas, Pasir Puteh, Tanah Merah, Tumpat, Kuala Krai
KTN02|Kelantan|Gua Musang, Jeli, Lojing
MLK01|Melaka|Seluruh Negeri Melaka
NGS01|Negeri Sembilan|Tampin, Jempol
NGS02|Negeri Sembilan|Jelebu, Kuala Pilah, Rembau
NGS03|Negeri Sembilan|Port Dickson, Seremban
PHG01|Pahang|Pulau Tioman
PHG02|Pahang|Kuantan, Pekan, Muadzam Shah
PHG03|Pahang|Jerantut, Temerloh, Maran, Bera, Chenor, Jengka
PHG04|Pahang|Bentong, Lipis, Raub
PHG05|Pahang|Genting Sempah, Janda Baik, Bukit Tinggi
PHG06|Pahang|Cameron Highlands, Genting Highlands, Bukit Fraser
PHG07|Pahang|Rompin
PLS01|Perlis|Kangar, Padang Besar, Arau
PNG01|Pulau Pinang|Seluruh Negeri Pulau Pinang
PRK01|Perak|Tapah, Slim River, Tanjung Malim
PRK02|Perak|Ipoh, Kuala Kangsar, Sg. Siput, Batu Gajah, Kampar
PRK03|Perak|Lenggong, Pengkalan Hulu, Grik
PRK04|Perak|Temengor, Belum
PRK05|Perak|Teluk Intan, Bagan Datuk, Seri Iskandar, Lumut, Sitiawan, Pulau Pangkor
PRK06|Perak|Taiping, Selama, Bagan Serai, Parit Buntar
PRK07|Perak|Bukit Larut
SBH01|Sabah|Sandakan (Timur), Bukit Garam, Sukau
SBH02|Sabah|Beluran, Telupid, Pinangah, Sandakan (Barat)
SBH03|Sabah|Lahad Datu, Kunak, Semporna, Tawau (Timur)
SBH04|Sabah|Bandar Tawau, Kalabakan, Tawau (Barat)
SBH05|Sabah|Kudat, Kota Marudu, Pitas, Pulau Banggi
SBH06|Sabah|Gunung Kinabalu
SBH07|Sabah|Kota Kinabalu, Ranau, Kota Belud, Tuaran, Penampang, Papar, Putatan
SBH08|Sabah|Keningau, Tambunan, Nabawan, Pensiangan
SBH09|Sabah|Beaufort, Kuala Penyu, Sipitang, Tenom, Membakut
SGR01|Selangor|Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam
SGR02|Selangor|Kuala Selangor, Sabak Bernam
SGR03|Selangor|Klang, Kuala Langat
SWK01|Sarawak|Limbang, Lawas, Sundar, Trusan
SWK02|Sarawak|Miri, Niah, Bekenu, Sibuti, Marudi
SWK03|Sarawak|Bintulu, Belaga, Tatau, Sebauh
SWK04|Sarawak|Sibu, Mukah, Dalat, Kanowit, Kapit
SWK05|Sarawak|Sarikei, Matu, Julau, Daro, Bintangor
SWK06|Sarawak|Sri Aman, Lubok Antu, Betong, Saratok
SWK07|Sarawak|Serian, Simunjan, Samarahan, Sebuyau
SWK08|Sarawak|Kuching, Bau, Lundu, Sematan
SWK09|Sarawak|Zon Khas (Kampung Patarikan)
TRG01|Terengganu|Kuala Terengganu, Marang, Kuala Nerus
TRG02|Terengganu|Besut, Setiu
TRG03|Terengganu|Hulu Terengganu
TRG04|Terengganu|Dungun, Kemaman
WLY01|Wilayah Persekutuan|Kuala Lumpur, Putrajaya
WLY02|Wilayah Persekutuan|Labuan`.split('\n').map(l => { const [jakimCode, negeri, daerah] = l.split('|'); return { jakimCode, negeri, daerah }; });

  const PRAYERS = [
    ['imsak', 'Imsak', false], ['fajr', 'Subuh', true], ['syuruk', 'Syuruk', false], ['dhuha', 'Dhuha', false],
    ['dhuhr', 'Zohor', true], ['asr', 'Asar', true], ['maghrib', 'Maghrib', true], ['isha', 'Isyak', true]
  ];
  const MAIN = PRAYERS.filter(p => p[2]);
  const ICON = { imsak: 'moon-star', fajr: 'sunrise', syuruk: 'sun-dim', dhuha: 'sun-dim', dhuhr: 'sun', asr: 'cloud-sun', maghrib: 'sunset', isha: 'moon' };
  const KAABAH = [21.4225, 39.8262];
  /* Ayat dan doa ringkas yang bertukar setiap hari */
  const INSPIRE = [
    ['رَبِّ زِدْنِي عِلْمًا', 'Ya Tuhanku, tambahkanlah ilmu kepadaku.', 'Surah Taha, 20:114'],
    ['وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا', 'Allah telah menghalalkan jual beli dan mengharamkan riba.', 'Surah Al-Baqarah, 2:275'],
    ['فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', 'Maka sesungguhnya bersama kesulitan itu ada kemudahan.', 'Surah Al-Insyirah, 94:5'],
    ['رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', 'Wahai Tuhan kami, berikanlah kami kebaikan di dunia dan kebaikan di akhirat, dan peliharalah kami daripada azab neraka.', 'Surah Al-Baqarah, 2:201'],
    ['وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ', 'Sesiapa yang bertakwa kepada Allah, nescaya Allah memberinya jalan keluar dan rezeki dari arah yang tidak disangka.', 'Surah At-Talaq, 65:2-3'],
    ['اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا', 'Ya Allah, aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang baik dan amalan yang diterima.', 'Doa selepas Subuh, riwayat Ibnu Majah']
  ];
  const HIJRI = ['Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'];
  let tFmt, dFmt, wdFmt;
  // Zon waktu ikut lokasi: Malaysia, atau zon waktu bandar luar negara
  function setTZ(tz) {
    try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch { tz = 'Asia/Kuala_Lumpur'; }
    TZ = tz;
    tFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
    dFmt = new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    wdFmt = new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, weekday: 'short' });
  }
  setTZ(TZ);
  const partsKL = d => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, +p.value]));
  // Format 12 jam gaya Malaysia: 5:53 pg / 1:06 ptg / 7:20 mlm
  const fmtT = ts => {
    const p = Object.fromEntries(tFmt.formatToParts(new Date(ts * 1000)).map(x => [x.type, x.value]));
    const h24 = +new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date(ts * 1000));
    const suf = h24 < 12 ? 'pg' : h24 < 19 ? 'ptg' : 'mlm';
    return `${p.hour}:${p.minute} ${suf}`;
  };
  const hijriStr = h => { if (!h) return ''; const [y, m, d] = h.split('-').map(Number); return `${d} ${HIJRI[m - 1]} ${y}H`; };

  let zones = FALLBACK_ZONES, zone = store.get('zone', 'WLY01'), month = null, nextMonth = null;
  let notified = store.get('notified', {}), notifOn = store.get('azanNotif', false);
  let azanOff = store.get('azanOff', []), dayOff = 0, listSig = '', homeSig = '';
  let rekod = store.get('rekod', {});

  function renderZones() {
    const byState = {};
    zones.forEach(z => (byState[z.negeri] = byState[z.negeri] || []).push(z));
    $('#zoneSel').innerHTML = Object.keys(byState).sort().map(n => `<optgroup label="${esc(n)}">${byState[n].map(z => `<option value="${esc(z.jakimCode)}" ${z.jakimCode === zone ? 'selected' : ''}>${esc(z.daerah)} (${esc(z.jakimCode)})</option>`).join('')}</optgroup>`).join('')
      + `<optgroup label="Luar Malaysia">${city ? `<option value="GL" ${zone === 'GL' ? 'selected' : ''}>${esc(city.name)}${city.country ? ', ' + esc(city.country) : ''}</option>` : ''}<option value="__dunia">Cari bandar lain di dunia…</option></optgroup>`;
  }
  // Bandar luar Malaysia: { name, country, lat, lon, tz }
  let city = store.get('solatCity', null);
  const isGL = () => zone === 'GL' && city;
  const zoneInfo = () => isGL() ? { daerah: city.name, negeri: city.country } : zones.find(z => z.jakimCode === zone) || { daerah: zone, negeri: '' };
  if (zone === 'GL' && !city) zone = 'WLY01';
  setTZ(isGL() ? city.tz : 'Asia/Kuala_Lumpur');

  /* Aladhan -> bentuk yang sama dengan waktusolat.app: { month_number, prayers: [{ day, hijri, imsak, fajr, ... }] } */
  async function fetchGlobal(c, y, m) {
    const r = await fetch(`${ALADHAN}/calendar/${y}/${m}?latitude=${c.lat}&longitude=${c.lon}&school=0&iso8601=true`);
    if (!r.ok) throw new Error('aladhan ' + r.status);
    const j = await r.json(), sec = t => Math.floor(Date.parse(String(t).replace(/\s*\(.*\)$/, '')) / 1000);
    const prayers = (j.data || []).map(d => {
      const t = d.timings, h = d.date.hijri, row = {
        day: +d.date.gregorian.day, hijri: `${h.year}-${String(h.month.number).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`,
        imsak: sec(t.Imsak), fajr: sec(t.Fajr), syuruk: sec(t.Sunrise), dhuhr: sec(t.Dhuhr), asr: sec(t.Asr), maghrib: sec(t.Maghrib), isha: sec(t.Isha)
      };
      row.dhuha = row.syuruk + 25 * 60; // ikut amalan JAKIM: kira-kira 25 minit selepas syuruk
      return row;
    }).filter(r => Object.values(r).every(v => v === r.hijri || Number.isFinite(v)));
    if (!prayers.length) throw new Error('tiada data');
    return { zone: 'GL', month_number: m, year: y, prayers, tz: j.data[0].meta.timezone };
  }

  async function fetchMonth(z, y, m) {
    const key = z === 'GL' ? `solat_GL_${city.lat.toFixed(2)}_${city.lon.toFixed(2)}_${y}_${m}` : `solat_${z}_${y}_${m}`;
    const cached = store.get(key, null);
    if (cached && cached.prayers && cached.prayers.length) return cached;
    if (z === 'GL') { const j = await fetchGlobal(city, y, m); store.set(key, j); pruneCache(); return j; }
    const urls = [`${API}/v2/solat/${z}?year=${y}&month=${m}`, `data/solat/${z}-${y}-${String(m).padStart(2, '0')}.json`];
    for (const u of urls) {
      try {
        const r = await fetch(u);
        if (!r.ok) continue;
        const j = await r.json();
        if (j.prayers && j.prayers.length) { store.set(key, j); pruneCache(); return j; }
      } catch {}
    }
    throw new Error('tiada data');
  }
  function pruneCache() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('bl_solat_'));
      if (keys.length > 8) keys.slice(0, keys.length - 8).forEach(k => localStorage.removeItem(k));
    } catch {}
  }

  async function load() {
    const p = partsKL(new Date());
    $('#nextName').textContent = 'Memuatkan';
    try {
      month = await fetchMonth(zone, p.year, p.month);
      // Zon waktu sebenar bandar (daripada Aladhan) mengatasi anggaran awal
      if (isGL() && month.tz && month.tz !== city.tz) { city = { ...city, tz: month.tz }; store.set('solatCity', city); setTZ(city.tz); }
      renderToday(); renderMonth();
      const nm = p.month === 12 ? [p.year + 1, 1] : [p.year, p.month + 1];
      fetchMonth(zone, nm[0], nm[1]).then(j => { nextMonth = j; scheduleNative(); }).catch(() => scheduleNative());
    } catch {
      $('#nextName').textContent = 'Waktu solat tidak dapat dimuatkan';
      $('#countdown').textContent = '--:--:--';
      $('#homeNextName').textContent = 'Tiada sambungan';
      $('#homeNextTime').textContent = 'Cuba lagi apabila dalam talian';
    }
  }

  function dayRow(offset = 0) {
    if (!month) return null;
    const p = partsKL(new Date(Date.now() + offset * 86400000));
    const src = p.month === month.month_number ? month : (nextMonth && nextMonth.month_number === p.month ? nextMonth : null);
    return src ? src.prayers.find(d => d.day === p.day) : null;
  }
  function nextPrayer() {
    const now = Date.now() / 1000;
    for (const off of [0, 1]) {
      const d = dayRow(off); if (!d) continue;
      for (const [k, n] of MAIN) if (d[k] > now) return { k, n, ts: d[k], off };
    }
    return null;
  }

  function renderToday() {
    const d = dayRow(0); if (!d) return;
    const z = zoneInfo(), date = dFmt.format(new Date()), hj = hijriStr(d.hijri);
    $('#solatDate').textContent = `${date} · ${hj}`;
    $('#todayLine').textContent = `${date} · ${hj}`;
    $('#zoneName').textContent = `${z.daerah}${z.negeri ? ', ' + z.negeri : ''}`;
    $('#homeZone').textContent = z.daerah.split(',')[0];
    $('#zoneShort').textContent = z.daerah.split(',')[0];
    listSig = homeSig = '';
    renderDays(); renderTracker(); renderInspire();
    tick();
  }

  function tick() {
    const d = dayRow(0); if (!d) return;
    const nx = nextPrayer(), now = Date.now() / 1000;
    // Selepas Isyak, paparkan jadual esok supaya senarai tidak kelihatan "tamat"
    const show = (nx && nx.off === 1 && dayRow(1)) || d;
    const state = k => (nx && nx.k === k) ? 'next' : show[k] <= now ? 'past' : '';
    // Hari lain yang dipilih pada jalur hari: tiada keadaan "seterusnya" atau "lepas"
    const pick = dayOff ? dayRow(dayOff) : show;
    const st = (k, main) => dayOff ? '' : main ? state(k) : (show[k] <= now ? 'past' : '');
    if (pick) {
      const sig = dayOff + PRAYERS.map(([k, , main]) => st(k, main)).join() + azanOff.join() + notifOn + pick.day;
      if (sig !== listSig) {
        listSig = sig;
        $('#todayGrid').innerHTML = PRAYERS.map(([k, n, main]) => {
          const s = st(k, main), on = notifOn && !azanOff.includes(k);
          return `<li class="${main ? '' : 'minor'} ${s}"><span class="pr-ico">${icon(ICON[k])}</span><span class="pr-name">${n}${s === 'next' ? '<small>Seterusnya</small>' : ''}</span><span class="pr-time">${fmtT(pick[k])}</span>${main ? `<button type="button" class="pr-bell" data-k="${k}" aria-pressed="${on}" aria-label="Azan ${n} ${on ? 'aktif' : 'tidak aktif'}">${icon(on ? 'bell' : 'bell-off')}</button>` : '<span></span>'}</li>`;
        }).join('');
      }
    }
    const hsig = MAIN.map(([k]) => state(k)).join() + show.day;
    if (hsig !== homeSig) {
      homeSig = hsig;
      $('#homeRow').innerHTML = MAIN.map(([k, n]) => `<li class="${state(k)}">${n}<b>${fmtT(show[k]).replace(/ (pg|ptg|mlm)$/, '')}</b></li>`).join('');
      renderTracker();
    }
    paintSky(d, now);
    if (nx) {
      const s = Math.max(0, Math.round(nx.ts - now)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
      const cd = [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
      $('#nextName').textContent = `${nx.n} pada ${fmtT(nx.ts)}${nx.off ? ' esok' : ''} · lagi`;
      $('#countdown').textContent = cd;
      // Kemajuan dari waktu sebelumnya hingga waktu seterusnya
      const prev = [...MAIN].reverse().map(([k]) => d[k]).find(t => t <= now) || (dayRow(-1) || {}).isha;
      $('#phaseBar').style.width = prev ? Math.min(100, Math.max(0, (now - prev) / (nx.ts - prev) * 100)).toFixed(1) + '%' : '0%';
      $('#homeNextName').textContent = nx.n;
      $('#homeNextTime').textContent = fmtT(nx.ts) + (nx.off ? ', esok' : '');
      $('#homeCount').textContent = cd;
    }
    if (notifOn && !plugin('LocalNotifications')) {
      for (const [k, n] of MAIN) {
        if (azanOff.includes(k)) continue;
        const key = `${zone}_${d[k]}`;
        if (now >= d[k] && now - d[k] < 120 && !notified[key]) {
          notified = { [key]: 1 }; store.set('notified', notified);
          Notify.show(`Telah masuk waktu ${n}`, `${fmtT(d[k])} · ${zoneInfo().daerah}`);
        }
      }
    }
  }

  /* Dalam app asli: jadualkan notifikasi terus dalam sistem supaya berbunyi walaupun app ditutup */
  async function scheduleNative() {
    const LN = plugin('LocalNotifications'); if (!LN) return;
    try {
      const pending = await LN.getPending();
      if (pending.notifications.length) await LN.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
      if (!notifOn) return;
      const now = Date.now() / 1000, list = [];
      [month, nextMonth].filter(Boolean).forEach(src => src.prayers.forEach(d => MAIN.forEach(([k, n]) => {
        if (!azanOff.includes(k) && d[k] > now && list.length < 60) list.push({ id: d[k] % 2147483647, title: `Waktu ${n}`, body: `Telah masuk waktu ${n} (${fmtT(d[k])}) · ${zoneInfo().daerah}`, schedule: { at: new Date(d[k] * 1000), allowWhileIdle: true } });
      })));
      if (list.length) await LN.schedule({ notifications: list });
    } catch {}
  }

  /* Warna langit mengikut fasa hari */
  function paintSky(d, now) {
    const sky = now < d.fajr ? 'night' : now < d.syuruk ? 'dawn' : now < d.dhuhr ? 'morning' : now < d.asr ? 'day'
      : now < d.maghrib ? 'afternoon' : now < d.isha ? 'dusk' : 'night';
    $$('.sky').forEach(el => { if (el.dataset.sky !== sky) el.dataset.sky = sky; });
  }

  /* Jalur 7 hari */
  function renderDays() {
    $('#dayStrip').innerHTML = [0, 1, 2, 3, 4, 5, 6].map(o => {
      const dt = new Date(Date.now() + o * 86400000), row = dayRow(o);
      return `<button type="button" role="tab" data-o="${o}" aria-selected="${o === dayOff}" ${row ? '' : 'disabled'} aria-label="${o === 0 ? 'Hari ini' : dFmt.format(dt)}">${o === 0 ? 'Hari ini' : esc(wdFmt.format(dt))}<b>${partsKL(dt).day}</b></button>`;
    }).join('');
  }
  $('#dayStrip').addEventListener('click', e => {
    const b = e.target.closest('button[data-o]'); if (!b || b.disabled) return;
    dayOff = +b.dataset.o; listSig = '';
    $$('#dayStrip button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    const row = dayRow(dayOff);
    if (row) $('#solatDate').textContent = `${dFmt.format(new Date(Date.now() + dayOff * 86400000))} · ${hijriStr(row.hijri)}`;
    tick();
  });

  /* Loceng azan setiap waktu */
  $('#todayGrid').addEventListener('click', async e => {
    const b = e.target.closest('.pr-bell'); if (!b) return;
    const k = b.dataset.k;
    if (!notifOn) {
      notifOn = await Notify.request(); store.set('azanNotif', notifOn); paintSwitch();
      if (!notifOn) return;
      azanOff = azanOff.filter(x => x !== k);
    } else azanOff = azanOff.includes(k) ? azanOff.filter(x => x !== k) : [...azanOff, k];
    store.set('azanOff', azanOff); listSig = ''; tick(); scheduleNative();
    const n = MAIN.find(p => p[0] === k)[1];
    toast(azanOff.includes(k) ? `Peringatan ${n} dimatikan` : `Peringatan ${n} diaktifkan`);
  });

  /* Rekod solat harian dan bilangan hari berturut-turut */
  const keyOf = d => { const p = partsKL(d); return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`; };
  // Hari dalam mod uzur (haid/nifas) tidak memutuskan rantaian
  function uzurDay(key) {
    const u = store.get('uzur', { on: false, log: [] });
    if (u.on && key >= u.start) return true;
    return (u.log || []).some(l => key >= l.s && key <= l.e);
  }
  function streak() {
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const key = keyOf(new Date(Date.now() - i * 86400000)), done = rekod[key] || [];
      if (done.length >= 5) n++;
      else if (uzurDay(key)) continue;
      else if (i > 0) break;
    }
    return n;
  }
  function renderTracker() {
    const d = dayRow(0); if (!d) return;
    rekod = store.get('rekod', {});
    const now = Date.now() / 1000, done = rekod[keyOf(new Date())] || [], uzur = uzurDay(keyOf(new Date()));
    $('#trackRow').innerHTML = MAIN.map(([k, n]) => {
      const on = done.includes(k), open = d[k] <= now;
      return `<button type="button" class="track-btn" data-k="${k}" aria-pressed="${on}" ${(open || on) && !uzur ? '' : 'disabled'} aria-label="${n}${open ? '' : ', belum masuk waktu'}"><span class="tb-dot">${icon('check')}</span>${n}</button>`;
    }).join('');
    const s = streak();
    $('#streak .num').textContent = s;
    $('#streak').setAttribute('aria-label', `${s} hari berturut-turut`);
    $('#trackerSub').textContent = uzur ? 'Mod uzur aktif. Rekod dijeda dan rantaian hari tidak terputus.' : done.length >= 5 ? 'Alhamdulillah, lima waktu lengkap hari ini.' : `${done.length} daripada 5 waktu ditanda. Disimpan dalam peranti ini sahaja.`;
  }
  $('#trackRow').addEventListener('click', e => {
    const b = e.target.closest('.track-btn'); if (!b || b.disabled) return;
    const key = keyOf(new Date()), done = rekod[key] || [];
    rekod[key] = done.includes(b.dataset.k) ? done.filter(x => x !== b.dataset.k) : [...done, b.dataset.k];
    const keep = Object.keys(rekod).sort().slice(-400);
    rekod = Object.fromEntries(keep.map(k => [k, rekod[k]]));
    store.set('rekod', rekod); renderTracker();
  });

  function renderInspire() {
    const p = partsKL(new Date()), doy = Math.floor((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(p.year, 0, 0)) / 86400000);
    const [ar, tr, ref] = INSPIRE[doy % INSPIRE.length];
    $('#inspire').innerHTML = `<p class="eyebrow">${icon('book')}Renungan hari ini</p><p class="ar" lang="ar">${ar}</p><p class="tr">${esc(tr)}</p><p class="ref">${esc(ref)}</p>`;
  }

  /* Arah kiblat: bearing bulatan besar ke Kaabah, kompas langsung jika peranti menyokong */
  const rad = x => x * Math.PI / 180, deg = x => x * 180 / Math.PI;
  function qiblaOf(lat, lon) {
    const [kl, ko] = KAABAH.map(rad), la = rad(lat), dl = ko - rad(lon);
    const b = (deg(Math.atan2(Math.sin(dl), Math.cos(la) * Math.tan(kl) - Math.sin(la) * Math.cos(dl))) + 360) % 360;
    const km = 6371 * Math.acos(Math.min(1, Math.sin(la) * Math.sin(kl) + Math.cos(la) * Math.cos(kl) * Math.cos(dl)));
    return { b, km };
  }
  let qibla = qiblaOf(3.139, 101.6869), heading = null;
  $('#qiblaTicks').innerHTML = Array.from({ length: 72 }, (_, i) => {
    const a = rad(i * 5), maj = i % 18 === 0, r1 = maj ? 76 : 82;
    return `<line ${maj ? 'class="maj"' : ''} x1="${(100 + Math.sin(a) * r1).toFixed(1)}" y1="${(100 - Math.cos(a) * r1).toFixed(1)}" x2="${(100 + Math.sin(a) * 88).toFixed(1)}" y2="${(100 - Math.cos(a) * 88).toFixed(1)}"/>`;
  }).join('');
  function paintQibla() {
    $('#qiblaNeedle').style.transform = `rotate(${qibla.b}deg)`;
    $('#qiblaRose').style.transform = heading == null ? '' : `rotate(${-heading}deg)`;
    $('#qiblaDeg').textContent = `${Math.round(qibla.b)}° dari utara`;
    const off = heading == null ? null : Math.abs(((qibla.b - heading + 540) % 360) - 180);
    $('.qibla').classList.toggle('aligned', off != null && off < 5);
  }
  function onOrient(e) {
    const h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null);
    if (h == null) return;
    heading = h; paintQibla();
  }
  $('#qiblaBtn').addEventListener('click', async () => {
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { await DeviceOrientationEvent.requestPermission(); } catch {}
    }
    window.addEventListener('deviceorientationabsolute', onOrient);
    window.addEventListener('deviceorientation', onOrient);
    if (!navigator.geolocation) return toast('Lokasi tidak disokong pada peranti ini.');
    toast('Mengesan lokasi');
    navigator.geolocation.getCurrentPosition(pos => {
      qibla = qiblaOf(pos.coords.latitude, pos.coords.longitude); paintQibla();
      $('#qiblaSub').textContent = `Kaabah ${Math.round(qibla.km).toLocaleString('ms-MY')} km dari lokasi anda. ${heading == null ? 'Halakan bahagian atas telefon mengikut jarum, dengan utara pada U.' : 'Pusingkan telefon sehingga dail bertukar hijau.'}`;
    }, () => toast('Kebenaran lokasi ditolak.'), { timeout: 15000, maximumAge: 600000 });
  });
  paintQibla();
  document.addEventListener('uzurchange', () => { if (month) renderTracker(); });

  function renderMonth() {
    const today = partsKL(new Date()).day;
    const cols = PRAYERS.filter(p => p[0] !== 'dhuha');
    $('#monthTitle').textContent = `Jadual ${new Intl.DateTimeFormat('ms-MY', { month: 'long', year: 'numeric', timeZone: TZ }).format(new Date())}`;
    $('#monthTable').innerHTML = `<thead><tr><th>Tarikh</th>${cols.map(p => `<th>${p[1]}</th>`).join('')}</tr></thead><tbody>` + month.prayers.map(d =>
      `<tr class="${d.day === today ? 'today' : ''}"><td>${+d.day || ''} <span class="muted small">${hijriStr(d.hijri).replace(/ \d+H$/, '')}</span></td>${cols.map(([k]) => `<td>${fmtT(d[k]).replace(/ (pg|ptg|mlm)$/, '')}</td>`).join('')}</tr>`).join('') + '</tbody>';
  }

  function useZone(z, c) {
    zone = z; store.set('zone', zone);
    if (c) { city = c; store.set('solatCity', c); }
    setTZ(isGL() ? city.tz : 'Asia/Kuala_Lumpur');
    month = nextMonth = null; renderZones(); load();
  }
  $('#zoneSel').addEventListener('change', e => {
    if (e.target.value === '__dunia') { renderZones(); openCity(); return; }
    useZone(e.target.value);
  });

  /* Carian bandar di seluruh dunia (Open-Meteo, percuma, tanpa kunci) */
  const cityDlg = document.createElement('dialog');
  cityDlg.className = 'city-dlg'; cityDlg.setAttribute('aria-labelledby', 'cityTitle');
  cityDlg.innerHTML = `<h2 id="cityTitle">Waktu solat di luar Malaysia</h2>
    <p class="muted small">Cari bandar di mana-mana negara. Waktu dikira mengikut kaedah pihak berkuasa terdekat (Asar mazhab Syafie), dalam zon waktu bandar itu.</p>
    <form id="cityForm" class="inline-form"><input id="cityQ" placeholder="Cth. London, Makkah, Tokyo" autocomplete="off" required minlength="2"><button class="btn" type="submit">${icon('search')}Cari</button></form>
    <ul class="city-list" id="cityList"></ul>
    <div class="actions end"><button type="button" class="btn ghost" id="cityClose">Tutup</button></div>`;
  document.body.appendChild(cityDlg);
  const openCity = () => { $('#cityList', cityDlg).innerHTML = ''; cityDlg.showModal(); $('#cityQ', cityDlg).focus(); };
  $('#cityClose', cityDlg).onclick = () => cityDlg.close();
  $('#cityForm', cityDlg).onsubmit = async e => {
    e.preventDefault();
    const list = $('#cityList', cityDlg), q = $('#cityQ', cityDlg).value.trim();
    list.innerHTML = '<li class="muted small"><span class="spinner"></span> Mencari</li>';
    try {
      const j = await (await fetch(`${GEO}?name=${encodeURIComponent(q)}&count=8&language=ms&format=json`)).json();
      const res = (j.results || []).filter(r => r.timezone);
      list.innerHTML = res.length ? res.map((r, i) => `<li><button type="button" data-i="${i}"><b>${esc(r.name)}</b><span class="muted small">${esc([r.admin1, r.country].filter(Boolean).join(', '))}</span></button></li>`).join('')
        : '<li class="muted small">Tiada bandar dijumpai. Cuba ejaan lain.</li>';
      list.onclick = ev => {
        const b = ev.target.closest('[data-i]'); if (!b) return;
        const r = res[+b.dataset.i];
        if (r.country_code === 'MY') { cityDlg.close(); toast('Untuk Malaysia, pilih zon rasmi atau tekan Lokasi saya.'); return; }
        cityDlg.close();
        useZone('GL', { name: r.name, country: r.country || '', lat: r.latitude, lon: r.longitude, tz: r.timezone });
        toast(`Waktu solat untuk ${r.name}`);
      };
    } catch { list.innerHTML = '<li class="muted small">Carian tidak dapat dibuat. Semak sambungan internet.</li>'; }
  };
  $('#gpsBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Lokasi tidak disokong pada peranti ini.');
    toast('Mengesan lokasi');
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        const r = await fetch(`${API}/zones/${lat.toFixed(4)}/${lon.toFixed(4)}`).then(x => x.ok ? x.json() : {}).catch(() => ({}));
        if (r.zone) { useZone(r.zone); toast(`Zon ditetapkan: ${zoneInfo().daerah.split(',')[0]}`); return; }
        // Luar Malaysia: waktu solat global ikut koordinat, nama tempat daripada BigDataCloud
        const g = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ms`).then(x => x.json()).catch(() => ({}));
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        useZone('GL', { name: g.city || g.locality || 'Lokasi saya', country: g.countryName || '', lat, lon, tz });
        toast(`Waktu solat untuk ${city.name}`);
      } catch { toast('Lokasi tidak dapat dikesan. Sila pilih zon atau cari bandar.'); }
    }, () => toast('Kebenaran lokasi ditolak.'), { timeout: 15000, maximumAge: 600000 });
  });
  const paintSwitch = () => {
    $('#notifBtn').setAttribute('aria-checked', String(notifOn));
    $('#notifSub').textContent = notifOn ? 'Aktif untuk zon ' + zone + '. Tekan loceng untuk setiap waktu.' : 'Notifikasi apabila masuk waktu';
    listSig = ''; if (month) tick();
  };
  $('#notifBtn').addEventListener('click', async () => {
    if (notifOn) notifOn = false;
    else { notifOn = await Notify.request(); if (notifOn) toast('Peringatan waktu solat diaktifkan'); }
    store.set('azanNotif', notifOn); paintSwitch(); scheduleNative();
  });

  (async () => {
    for (const u of [`${API}/zones`, 'data/solat/zones.json']) {
      try {
        const z = await (await fetch(u)).json();
        if (Array.isArray(z) && z.length > 20) { zones = z; renderZones(); if (month) renderToday(); return; }
      } catch {}
    }
  })();
  renderZones(); paintSwitch(); load();
  let lastDay = partsKL(new Date()).day;
  setInterval(() => {
    const p = partsKL(new Date());
    if (month && p.month !== month.month_number) load();
    else if (p.day !== lastDay) { lastDay = p.day; dayOff = 0; renderToday(); renderMonth(); }
    else tick();
  }, 1000);
})();
