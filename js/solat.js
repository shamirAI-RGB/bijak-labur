/* Waktu solat Malaysia: zon JAKIM melalui api.waktusolat.app */
(function () {
  const API = 'https://api.waktusolat.app';
  const TZ = 'Asia/Kuala_Lumpur';
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
  const HIJRI = ['Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'];
  const tFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
  const dFmt = new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

  function renderZones() {
    const byState = {};
    zones.forEach(z => (byState[z.negeri] = byState[z.negeri] || []).push(z));
    $('#zoneSel').innerHTML = Object.keys(byState).sort().map(n => `<optgroup label="${esc(n)}">${byState[n].map(z => `<option value="${esc(z.jakimCode)}" ${z.jakimCode === zone ? 'selected' : ''}>${esc(z.daerah)} (${esc(z.jakimCode)})</option>`).join('')}</optgroup>`).join('');
  }
  const zoneInfo = () => zones.find(z => z.jakimCode === zone) || { daerah: zone, negeri: '' };

  async function fetchMonth(z, y, m) {
    const key = `solat_${z}_${y}_${m}`;
    const cached = store.get(key, null);
    if (cached && cached.prayers && cached.prayers.length) return cached;
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
    tick();
  }

  function tick() {
    const d = dayRow(0); if (!d) return;
    const nx = nextPrayer(), now = Date.now() / 1000;
    // Selepas Isyak, paparkan jadual esok supaya senarai tidak kelihatan "tamat"
    const show = (nx && nx.off === 1 && dayRow(1)) || d;
    const state = k => (nx && nx.k === k) ? 'next' : show[k] <= now ? 'past' : '';
    $('#todayGrid').innerHTML = PRAYERS.map(([k, n, main]) => `<li class="${main ? '' : 'minor'} ${main ? state(k) : (show[k] <= now ? 'past' : '')}"><span>${n}</span><span>${fmtT(show[k])}</span></li>`).join('');
    $('#homeRow').innerHTML = MAIN.map(([k, n]) => `<li class="${state(k)}">${n}<b>${fmtT(show[k]).replace(/ (pg|ptg|mlm)$/, '')}</b></li>`).join('');
    if (nx) {
      const s = Math.max(0, Math.round(nx.ts - now)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
      const cd = [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
      $('#nextName').textContent = `${nx.n} pada ${fmtT(nx.ts)}${nx.off ? ' esok' : ''}`;
      $('#countdown').textContent = cd;
      $('#homeNextName').textContent = nx.n;
      $('#homeNextTime').textContent = fmtT(nx.ts) + (nx.off ? ', esok' : '');
      $('#homeCount').textContent = cd;
    }
    if (notifOn && !plugin('LocalNotifications')) {
      for (const [k, n] of MAIN) {
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
        if (d[k] > now && list.length < 60) list.push({ id: d[k] % 2147483647, title: `Waktu ${n}`, body: `Telah masuk waktu ${n} (${fmtT(d[k])}) · ${zoneInfo().daerah}`, schedule: { at: new Date(d[k] * 1000), allowWhileIdle: true } });
      })));
      if (list.length) await LN.schedule({ notifications: list });
    } catch {}
  }

  function renderMonth() {
    const today = partsKL(new Date()).day;
    const cols = PRAYERS.filter(p => p[0] !== 'dhuha');
    $('#monthTitle').textContent = `Jadual ${new Intl.DateTimeFormat('ms-MY', { month: 'long', year: 'numeric', timeZone: TZ }).format(new Date())}`;
    $('#monthTable').innerHTML = `<thead><tr><th>Tarikh</th>${cols.map(p => `<th>${p[1]}</th>`).join('')}</tr></thead><tbody>` + month.prayers.map(d =>
      `<tr class="${d.day === today ? 'today' : ''}"><td>${+d.day || ''} <span class="muted small">${hijriStr(d.hijri).replace(/ \d+H$/, '')}</span></td>${cols.map(([k]) => `<td>${fmtT(d[k]).replace(/ (pg|ptg|mlm)$/, '')}</td>`).join('')}</tr>`).join('') + '</tbody>';
  }

  $('#zoneSel').addEventListener('change', e => { zone = e.target.value; store.set('zone', zone); nextMonth = null; load(); });
  $('#gpsBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Lokasi tidak disokong pada peranti ini.');
    toast('Mengesan lokasi');
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const r = await (await fetch(`${API}/zones/${pos.coords.latitude.toFixed(4)}/${pos.coords.longitude.toFixed(4)}`)).json();
        if (!r.zone) throw 0;
        zone = r.zone; store.set('zone', zone); renderZones(); nextMonth = null; load();
        toast(`Zon ditetapkan: ${zoneInfo().daerah.split(',')[0]}`);
      } catch { toast('Zon tidak dapat dikesan. Sila pilih secara manual.'); }
    }, () => toast('Kebenaran lokasi ditolak.'), { timeout: 15000, maximumAge: 600000 });
  });
  const paintSwitch = () => {
    $('#notifBtn').setAttribute('aria-checked', String(notifOn));
    $('#notifSub').textContent = notifOn ? 'Aktif untuk zon ' + zone : 'Notifikasi apabila masuk waktu';
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
    else if (p.day !== lastDay) { lastDay = p.day; renderToday(); renderMonth(); }
    else tick();
  }, 1000);
})();
