// Bina gaya peta vektor Bijak Labur daripada gaya asas OSM Liberty (OpenFreeMap).
// Jalankan: node scripts/bina-gaya-peta.mjs
// Input : scripts/peta/gaya-asas-liberty.json (salinan https://github.com/hyperknot/openfreemap-styles, styles/liberty)
// Output: data/peta/gaya-terang.json, data/peta/gaya-gelap.json, data/peta/gaya-satelit.json
// Data jubin: OpenFreeMap (percuma, tanpa kunci, penggunaan komersial dibenarkan) © OpenMapTiles © penyumbang OpenStreetMap.
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = new URL('../data/peta/', import.meta.url);
const ASAS = new URL('peta/gaya-asas-liberty.json', import.meta.url);
const asas = JSON.parse(readFileSync(ASAS, 'utf8'));
const OFM = 'tiles.openfreemap.org';
const ATRIBUSI = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

// Palet. Terang: kertas hangat seperti halaman utama (--bg #f6f5f1), jalan putih, lebuh raya kuning tanah.
// Gelap: hijau malam seperti tema gelap laman (--bg #0e1311), jalan kelabu hijau, lebuh raya emas pudar.
const PALET = {
  terang: {
    latar: '#f2f0e9', kediaman: '#ebe7dd', taman: '#d9e6cf', hutan: '#cfe0c3', rumput: '#dde9d2', ais: '#eef3f3', pasir: '#f3ead2',
    padang: '#dfe7cf', kubur: '#dde3cf', hospital: '#f5e1de', sekolah: '#efe8d3', air: '#a9d0d8', airGaris: '#93c2cc',
    bangunan: '#e3dfd4', bangunanTepi: '#d3cdbf', bayang: 'rgba(90,80,60,0.16)', aero: '#e6e3da', landasan: '#f8f6f1',
    jalanKecil: '#ffffff', jalanKecilTepi: '#d8d2c4', jalanServis: '#fbfaf6', laluan: '#ffffff',
    jalanUtama: '#fff7e2', jalanUtamaTepi: '#dcc79a', jalanSek: '#ffffff', jalanSekTepi: '#d3c8b0',
    lebuhraya: '#f3c879', lebuhrayaTepi: '#cf9d4c', lebuhrayaRendah: '#e3a95a',
    rel: '#b8b2a5', sempadan: '#a39a8a', sempadanNegara: '#7c7466',
    teks: '#26302b', teksLembut: '#5d6560', teksJalan: '#5f655f', teksAir: '#3b7281', halo: '#f7f6f1', teksTransit: '#2c5f7a', ikonLegap: 1
  },
  gelap: {
    latar: '#101714', kediaman: '#141d19', taman: '#16261d', hutan: '#18291f', rumput: '#17251c', ais: '#1b2424', pasir: '#22251d',
    padang: '#192419', kubur: '#17221b', hospital: '#2a1d1f', sekolah: '#1a201b', air: '#0c2830', airGaris: '#13404b',
    bangunan: '#1c2622', bangunanTepi: '#24302b', bayang: 'rgba(0,0,0,0.45)', aero: '#18201d', landasan: '#2a3430',
    jalanKecil: '#27322d', jalanKecilTepi: '#141c18', jalanServis: '#222c27', laluan: '#2d3833',
    jalanUtama: '#3b4237', jalanUtamaTepi: '#161d19', jalanSek: '#313c36', jalanSekTepi: '#151c18',
    lebuhraya: '#6e5a2e', lebuhrayaTepi: '#1a1f18', lebuhrayaRendah: '#7d6533',
    rel: '#3c4842', sempadan: '#4f5c55', sempadanNegara: '#6f7d76',
    teks: '#dfe6e2', teksLembut: '#9aa59f', teksJalan: '#a5afa9', teksAir: '#6fa9b8', halo: '#0e1311', teksTransit: '#7fb6d1', ikonLegap: 0.85
  }
};

// Peranan warna setiap lapisan mengikut id lapisan Liberty
function warnaLapisan(id, P) {
  const m = (re) => re.test(id);
  if (id === 'background') return { 'background-color': P.latar };
  if (id === 'park') return { 'fill-color': P.taman, 'fill-outline-color': P.taman };
  if (id === 'park_outline') return { 'line-color': P.hutan };
  if (id === 'landuse_residential') return { 'fill-color': P.kediaman };
  if (id === 'landcover_wood') return { 'fill-color': P.hutan };
  if (id === 'landcover_grass') return { 'fill-color': P.rumput };
  if (id === 'landcover_ice') return { 'fill-color': P.ais };
  if (id === 'landcover_sand') return { 'fill-color': P.pasir };
  if (m(/^landuse_(pitch|track)$/)) return { 'fill-color': P.padang };
  if (id === 'landuse_cemetery') return { 'fill-color': P.kubur };
  if (id === 'landuse_hospital') return { 'fill-color': P.hospital };
  if (id === 'landuse_school') return { 'fill-color': P.sekolah };
  if (m(/^waterway_(tunnel|river|other)$/)) return { 'line-color': P.airGaris };
  if (id === 'water') return { 'fill-color': P.air };
  if (id === 'aeroway_fill') return { 'fill-color': P.aero };
  if (m(/^aeroway_(runway|taxiway)$/)) return { 'line-color': P.landasan };
  if (id === 'building') return { 'fill-color': P.bangunan, 'fill-outline-color': P.bangunanTepi };
  if (m(/rail/)) return { 'line-color': P.rel };
  if (m(/^boundary_2$|disputed/)) return { 'line-color': P.sempadanNegara };
  if (m(/^boundary/)) return { 'line-color': P.sempadan };
  if (m(/^(tunnel|road|bridge)_/)) {
    const tepi = m(/casing/);
    if (m(/motorway/)) return { 'line-color': tepi ? P.lebuhrayaTepi : (id === 'road_motorway' ? ['interpolate', ['linear'], ['zoom'], 5, P.lebuhrayaRendah, 7, P.lebuhraya] : P.lebuhraya) };
    if (m(/trunk_primary|_link/)) return { 'line-color': tepi ? P.jalanUtamaTepi : P.jalanUtama };
    if (m(/secondary_tertiary/)) return { 'line-color': tepi ? P.jalanSekTepi : P.jalanSek };
    if (m(/service_track/)) return { 'line-color': tepi ? P.jalanKecilTepi : P.jalanServis };
    if (m(/path_pedestrian/)) return { 'line-color': tepi ? P.jalanKecilTepi : P.laluan };
    if (m(/minor|street/)) return { 'line-color': tepi ? P.jalanKecilTepi : P.jalanKecil };
  }
  return null;
}

// Label: nama Melayu dahulu (name:ms), kemudian nama Latin, kemudian nama asal
const NAMA = ['coalesce', ['get', 'name:ms'], ['get', 'name:latin'], ['get', 'name']];
// Nama negara mengikut pendirian laman ini (sama seperti js/peta-jalan.js): Palestin bagi seluruh wilayah itu
const NAMA_NEGARA = ['match', ['get', 'name'], ['Israel', 'ישראל', 'Palestinian Territories', 'Palestinian Territory', 'Palestine', 'State of Palestine', 'فلسطين'], 'Palestin', NAMA];

function warnaLabel(l, P) {
  const id = l.id;
  let teks = P.teks;
  if (/^poi_transit/.test(id)) teks = P.teksTransit;
  else if (/^poi/.test(id) || id === 'airport') teks = P.teksLembut;
  else if (/^highway-name/.test(id)) teks = P.teksJalan;
  else if (/water|waterway/.test(id)) teks = P.teksAir;
  else if (/^label_(other|state)/.test(id)) teks = P.teksLembut;
  return { 'text-color': teks, 'text-halo-color': P.halo, 'text-halo-width': /^label_country|^label_city/.test(id) ? 1.6 : 1.2, 'text-halo-blur': 0.4, ...(l.layout && l.layout['icon-image'] ? { 'icon-opacity': P.ikonLegap } : {}) };
}

function sumber(dengan) {
  const s = {
    openmaptiles: { type: 'vector', url: `https://${OFM}/planet`, attribution: ATRIBUSI }
  };
  if (dengan === 'satelit') s.esri = { type: 'raster', tileSize: 256, maxzoom: 19, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], attribution: 'Imej © Esri, Maxar, Earthstar Geographics' };
  return s;
}

function bina(tema) {
  const P = PALET[tema];
  const layers = [];
  for (const asal of asas.layers) {
    if (asal.id === 'natural_earth' || asal.id === 'building-3d') continue; // relief raster dan bangunan 3D tidak dipakai dalam paparan 2D
    if (/^(highway-shield-us|road_shield_us)/.test(asal.id)) continue; // perisai lebuh raya AS
    const l = structuredClone(asal);
    if (l.type === 'symbol' && l.layout && l.layout['text-field']) {
      const tf = JSON.stringify(l.layout['text-field']);
      if (tf.includes('name')) l.layout['text-field'] = /^label_country/.test(l.id) ? NAMA_NEGARA : NAMA;
      l.paint = Object.assign({}, l.paint, warnaLabel(l, P));
    } else {
      const w = warnaLapisan(l.id, P);
      if (w) l.paint = Object.assign({}, l.paint, w);
    }
    if (tema === 'gelap' && l.paint && 'fill-pattern' in l.paint) l.paint['fill-opacity'] = 0.25; // corak tanah lembap/pejalan kaki dilembutkan
    if (l.id === 'building') {
      // Bangunan 2D pada semua zum, dengan bayang lembut di bawahnya supaya kelihatan timbul
      delete l.maxzoom;
      layers.push({ id: 'building_bayang', type: 'fill', source: 'openmaptiles', 'source-layer': 'building', minzoom: 15,
        paint: { 'fill-color': P.bayang, 'fill-translate': ['interpolate', ['linear'], ['zoom'], 15, ['literal', [0.5, 1]], 18, ['literal', [1.5, 3]]], 'fill-antialias': true } });
    }
    layers.push(l);
  }
  return { version: 8, name: `Bijak Labur ${tema}`, sources: sumber(), sprite: `https://${OFM}/sprites/ofm_f384/ofm`, glyphs: `https://${OFM}/fonts/{fontstack}/{range}.pbf`, layers };
}

// Satelit hibrid: imej Esri di bawah, jalan utama separa lut sinar dan label berhalo gelap di atas
function binaSatelit() {
  const g = bina('gelap');
  const simpan = g.layers.filter(l => l.type === 'symbol' || /^(road|bridge)_(motorway|trunk_primary|secondary_tertiary)(_casing)?$/.test(l.id) || /^boundary/.test(l.id));
  for (const l of simpan) {
    if (l.type === 'symbol') {
      l.paint = Object.assign({}, l.paint, { 'text-color': /^poi/.test(l.id) ? '#e9eee9' : '#ffffff', 'text-halo-color': 'rgba(0,0,0,0.78)', 'text-halo-width': 1.6 });
    } else if (/^(road|bridge)_/.test(l.id)) {
      if (/casing/.test(l.id)) l.paint['line-opacity'] = 0;
      else { l.paint['line-color'] = /motorway/.test(l.id) ? '#f3c879' : '#ffffff'; l.paint['line-opacity'] = /motorway/.test(l.id) ? 0.7 : 0.45; }
    } else if (/^boundary/.test(l.id)) l.paint['line-color'] = '#e6e0d0';
  }
  return { version: 8, name: 'Bijak Labur satelit', sources: sumber('satelit'), sprite: g.sprite, glyphs: g.glyphs,
    layers: [{ id: 'latar', type: 'background', paint: { 'background-color': '#0b100e' } }, { id: 'satelit', type: 'raster', source: 'esri' }, ...simpan] };
}

const tulis = (nama, gaya) => { writeFileSync(new URL(nama, DIR), JSON.stringify(gaya)); console.log(nama, gaya.layers.length, 'lapisan'); };
tulis('gaya-terang.json', bina('terang'));
tulis('gaya-gelap.json', bina('gelap'));
tulis('gaya-satelit.json', binaSatelit());
