/* Waktu Solat Malaysia: zon JAKIM melalui api.waktusolat.app */
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
  const HIJRI = ['Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir', 'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah'];
  const tFmt = new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
  const dFmt = new Intl.DateTimeFormat('ms-MY', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const partsKL = d => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(d).map(p => [p.type, +p.value]));
  const fmtT = ts => tFmt.format(new Date(ts * 1000)).replace('PG', 'pg').replace('PTG', 'ptg');
  const hijriStr = h => { if (!h) return ''; const [y, m, d] = h.split('-').map(Number); return `${d} ${HIJRI[m - 1]} ${y}H`; };

  let zones = FALLBACK_ZONES, zone = store.get('zone', 'WLY01'), month = null, nextMonth = null, notified = store.get('notified', {});
  let notifOn = store.get('azanNotif', false);

  function renderZones() {
    const byState = {};
    zones.forEach(z => (byState[z.negeri] = byState[z.negeri] || []).push(z));
    $('#zoneSel').innerHTML = Object.keys(byState).sort().map(n => `<optgroup label="${esc(n)}">${byState[n].map(z => `<option value="${z.jakimCode}" ${z.jakimCode === zone ? 'selected' : ''}>${z.jakimCode} · ${esc(z.daerah)}</option>`).join('')}</optgroup>`).join('');
  }
  const zoneInfo = () => zones.find(z => z.jakimCode === zone) || { daerah: zone, negeri: '' };

  async function fetchMonth(z, y, m) {
    const key = `solat_${z}_${y}_${m}`;
    const cached = store.get(key, null);
    if (cached) return cached;
    const r = await fetch(`${API}/v2/solat/${z}?year=${y}&month=${m}`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (!j.prayers || !j.prayers.length) throw new Error('kosong');
    store.set(key, j);
    return j;
  }

  async function load() {
    const p = partsKL(new Date());
    $('#nextName').textContent = 'Memuatkan…';
    try {
      month = await fetchMonth(zone, p.year, p.month);
      renderToday(); renderMonth();
      const nm = p.month === 12 ? [p.year + 1, 1] : [p.year, p.month + 1];
      fetchMonth(zone, nm[0], nm[1]).then(j => nextMonth = j).catch(() => {});
    } catch (e) {
      $('#nextName').textContent = 'Gagal memuat waktu solat. Semak sambungan internet.';
      $('#homeNext').textContent = '🕌 Waktu solat tidak dapat dimuatkan';
    }
  }

  function dayRow(offset = 0) {
    if (!month) return null;
    const p = partsKL(new Date(Date.now() + offset * 86400000));
    const src = p.month === month.month_number ? month : nextMonth;
    return src ? src.prayers.find(d => d.day === p.day) : null;
  }

  function nextPrayer() {
    const now = Date.now() / 1000;
    for (const off of [0, 1]) {
      const d = dayRow(off); if (!d) continue;
      for (const [k, n, main] of PRAYERS) if (main && d[k] > now) return { k, n, ts: d[k] };
    }
    return null;
  }

  function renderToday() {
    const d = dayRow(0); if (!d) return;
    const z = zoneInfo();
    $('#solatDate').textContent = `${dFmt.format(new Date())} · ${hijriStr(d.hijri)}`;
    $('#zoneName').textContent = `📍 ${z.daerah}${z.negeri ? ', ' + z.negeri : ''} (${zone})`;
    tick();
  }

  function tick() {
    const d = dayRow(0); if (!d) return;
    const nx = nextPrayer(), now = Date.now() / 1000;
    $('#todayGrid').innerHTML = PRAYERS.map(([k, n]) => {
      const cls = nx && nx.k === k && d[k] === nx.ts ? 'next' : d[k] < now ? 'past' : '';
      return `<div class="solat-cell ${cls}"><div class="n">${n}</div><div class="t">${fmtT(d[k])}</div></div>`;
    }).join('');
    if (nx) {
      const s = Math.max(0, Math.round(nx.ts - now)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
      const cd = [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
      $('#nextName').textContent = `Menjelang ${nx.n} (${fmtT(nx.ts)})`;
      $('#countdown').textContent = cd;
      $('#homeNext').textContent = `🕌 ${nx.n} ${fmtT(nx.ts)} · lagi ${h ? h + ' jam ' : ''}${m} minit · ${zone}`;
      document.title = location.hash === '#solat' ? `${cd} ke ${nx.n} · Bijak Labur` : 'Bijak Labur';
    }
    if (notifOn) {
      for (const [k, n, main] of PRAYERS) {
        if (!main) continue;
        const key = `${zone}_${d[k]}`;
        if (now >= d[k] && now - d[k] < 120 && !notified[key]) {
          notified[key] = 1; store.set('notified', notified);
          notify(`🕌 Telah masuk waktu ${n}`, `${fmtT(d[k])} · ${zoneInfo().daerah}`);
        }
      }
    }
  }

  function renderMonth() {
    const today = partsKL(new Date()).day;
    const names = ['Tarikh', 'Hijri', ...PRAYERS.filter(p => p[0] !== 'dhuha').map(p => p[1])];
    $('#monthTitle').textContent = `Jadual ${new Intl.DateTimeFormat('ms-MY', { month: 'long', year: 'numeric', timeZone: TZ }).format(new Date())}`;
    $('#monthTable').innerHTML = `<tr>${names.map(n => `<th>${n}</th>`).join('')}</tr>` + month.prayers.map(d =>
      `<tr class="${d.day === today ? 'today' : ''}"><td>${d.day}</td><td>${hijriStr(d.hijri)}</td>${PRAYERS.filter(p => p[0] !== 'dhuha').map(([k]) => `<td class="mono">${fmtT(d[k])}</td>`).join('')}</tr>`).join('');
    const tr = $('#monthTable tr.today'); if (tr && location.hash === '#solat') tr.scrollIntoView({ block: 'nearest' });
  }

  $('#zoneSel').addEventListener('change', e => { zone = e.target.value; store.set('zone', zone); nextMonth = null; load(); });
  $('#gpsBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('Lokasi tidak disokong.');
    toast('Mengesan lokasi…');
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const r = await (await fetch(`${API}/zones/${pos.coords.latitude}/${pos.coords.longitude}`)).json();
        if (!r.zone) throw 0;
        zone = r.zone; store.set('zone', zone); renderZones(); nextMonth = null; load();
        toast('Zon ditetapkan: ' + zone);
      } catch { toast('Zon tidak dapat dikesan. Sila pilih secara manual.'); }
    }, () => toast('Kebenaran lokasi ditolak.'), { timeout: 15000 });
  });
  const setNotifBtn = () => { $('#notifBtn').textContent = notifOn ? '🔔 Aktif' : 'Aktifkan'; };
  $('#notifBtn').addEventListener('click', async () => {
    if (notifOn) { notifOn = false; } else { notifOn = await askNotify(); if (notifOn) toast('Peringatan azan diaktifkan'); }
    store.set('azanNotif', notifOn); setNotifBtn();
  });

  fetch(`${API}/zones`).then(r => r.json()).then(z => { if (Array.isArray(z) && z.length > 20) { zones = z; renderZones(); renderToday(); } }).catch(() => {});
  renderZones(); setNotifBtn(); load();
  setInterval(() => {
    const p = partsKL(new Date());
    if (month && p.month !== month.month_number) load(); else tick();
  }, 1000);
  document.addEventListener('viewchange', e => { if (e.detail === 'solat' && month) renderMonth(); });
})();
