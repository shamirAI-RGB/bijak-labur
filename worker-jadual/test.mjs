// Ujian pelayan jadual tanpa rangkaian: node worker-jadual/test.mjs
import assert from 'node:assert/strict';
import worker, { BASE, clock, dayTime, parseGroups, byGroup, parseCourses, sessionLabel } from './src/index.js';

// Penghurai masa
assert.equal(clock('09:00 AM'), 540);
assert.equal(clock('14:00 PM'), 840);
assert.equal(clock('12:00 PM'), 720);
assert.equal(clock('12:30 AM'), 30);
assert.equal(clock('0800'), 480);
assert.deepEqual(dayTime('TUESDAY<BR>( <em>09:00 AM-13:00 PM</em> )'), { d: 2, s: 540, e: 780 });
assert.deepEqual(dayTime('Khamis 0800-1000'), { d: 4, s: 480, e: 600 });
assert.equal(dayTime('TBA'), null);
assert.equal(sessionLabel('20264'), 'Okt 2026 hingga Feb 2027');
assert.equal(sessionLabel('20262'), 'Mac hingga Ogos 2026');

// Contoh halaman sintetik yang meniru struktur iCress
const INDEX = `<form id="form_submit">
  <input type="hidden" name="token1" id="token1" value="awal">
  <input   type="hidden"
     name ="lIIl" id ="lIIl" value="x" >
</form>
<script>
function check_form_before_submit(){
  document.getElementById('token1').value = 'akhir';
  document.getElementById('lIIl').value = 'y';
  $.ajax({ url: 'index_20264_result.cfm?id1=1&id2=2', type: 'post' });
}
</script>
<script>$('.find_cam_icress_student').select2({ ajax: { url: 'cfc/select.cfc?method=CAM_x', dataType: 'json' } });</script>`;
const RESULT = `<table><thead><tr><th>NO</th><th>COURSE</th><th>NAME</th><th>VIEW</th></tr></thead><tbody>
<tr class="gradeU"><td>1</td><td> CSC584 </td><td>ENTERPRISE PROGRAMMING</td><td><a href="index_20264_group.cfm?id=CSC584&amp;c=B">View</a></td></tr>
<tr class="gradeU"><td>2</td><td>ITS662</td><td>DATA MINING</td><td><a href="index_20264_group.cfm?id=ITS662&amp;c=B">View</a></td></tr>
</tbody></table>`;
const row = (dt, g, room) => `<tr><td>1.</td><td><strong>${dt}</strong></td><td><strong> ${g} </strong></td><td>BOTH - Fulltime<br>and Part-time</td><td>First Timer</td><td>${room}</td></tr>`;
const HEADROW = '<thead><tr><th>NO</th><th>DAY TIME</th><th>GROUP</th><th>MODE</th><th>STATUS</th><th>ROOM</th></tr></thead>';
const GROUPS = {
  CSC584: `<table>${HEADROW}<tbody>${row('MONDAY<BR>( <em>08:00 AM-10:00 AM</em> )', 'CS2305A', 'BK1')}${row('MONDAY<BR>( <em>09:00 AM-10:00 AM</em> )', 'CS2305A', 'BK1')}${row('WEDNESDAY<BR>( <em>14:00 PM-16:00 PM</em> )', 'CS2305A', 'MK6')}${row('TUESDAY<BR>( <em>10:00 AM-12:00 PM</em> )', 'CS2305B', 'BK2')}</tbody></table>`,
  // Kampus lain tiada lajur MODE dan tajuk berada dalam tbody
  ITS662: `<table><tbody><tr><td>NO</td><td>DAY TIME</td><td>GROUP</td><td>ROOM</td></tr><tr><td>1</td><td>MONDAY( 09:00 AM-11:00 AM )</td><td>CS2305A</td><td>DK3</td></tr></tbody></table>`
};

assert.deepEqual(parseCourses(RESULT).map(c => c.code), ['CSC584', 'ITS662']);
assert.equal(parseCourses(RESULT)[0].name, 'ENTERPRISE PROGRAMMING');
const g = byGroup(parseGroups(GROUPS.CSC584));
assert.deepEqual(g.map(x => x.group), ['CS2305A', 'CS2305B']);
assert.deepEqual(g[0].slots.map(s => [s.d, s.s, s.e]), [[1, 480, 600], [3, 840, 960]], 'slot bertindih digabungkan');
assert.equal(parseGroups(GROUPS.ITS662)[0].room, 'DK3');

// Pelayan penuh dengan fetch tiruan
let posted = null, calls = 0;
const fake = async (u, init) => {
  calls++;
  const url = new URL(u);
  assert.equal(url.origin + '/', new URL(BASE).origin + '/');
  const p = url.pathname.replace('/estudent/class_timetable/', '');
  if (p === 'index.cfm') return new Response('', { status: 302, headers: { location: 'index_20264.cfm', 'set-cookie': 'CFID=42; path=/' } });
  assert.match(init.headers.cookie || '', /CFID=42/);
  if (p === 'index_20264.cfm') return new Response(INDEX);
  if (p === 'cfc/select.cfc') return new Response(JSON.stringify({ results: [{ id: 'B', text: 'SHAH ALAM' }, { id: 'X', text: 'X' }, { id: 'J', text: 'SEGAMAT' }] }));
  if (p === 'index_20264_result.cfm') { assert.equal(init.method, 'POST'); posted = new URLSearchParams(init.body); return new Response(RESULT); }
  if (p === 'index_20264_group.cfm') return new Response(GROUPS[url.searchParams.get('id')]);
  throw new Error('tidak dijangka ' + u);
};
const env = { ALLOWED_ORIGINS: 'https://bijaklabur.my' };
const call = async path => {
  const r = await worker.fetch(new Request('https://jadual.bijaklabur.my' + path, { headers: { origin: 'https://bijaklabur.my' } }), env, null, { fetch: fake, cache: null });
  return [r.status, await r.json(), r];
};

let [s, d, r] = await call('/campuses');
assert.equal(s, 200); assert.deepEqual(d.map(c => c.id), ['B', 'J']);
assert.equal(r.headers.get('access-control-allow-origin'), 'https://bijaklabur.my');

[s, d] = await call('/session');
assert.deepEqual(d, { code: '20264', label: 'Okt 2026 hingga Feb 2027' });

[s, d] = await call('/courses?campus=b&faculty=cd');
assert.equal(s, 200); assert.equal(d.length, 2);
assert.equal(posted.get('token1'), 'akhir'); assert.equal(posted.get('lIIl'), 'y');
assert.equal(posted.get('search_campus'), 'B'); assert.equal(posted.get('search_faculty'), 'CD');

[s, d] = await call('/groups?campus=B&course=CSC584');
assert.equal(s, 200); assert.equal(d[1].group, 'CS2305B');

[s, d] = await call('/timetable?campus=B&pick=ITS662.CS2305A,CSC584.CS2305A,CSC584.CS9999Z,ABC123.CS2305A');
assert.equal(s, 200);
assert.deepEqual(d.items.map(i => i.course), ['ITS662', 'CSC584'], 'susunan ikut pilihan');
assert.equal(d.items[1].name, 'ENTERPRISE PROGRAMMING');
assert.deepEqual(d.missing.map(m => m.why).sort(), ['kumpulan', 'kursus']);

// Input tidak sah ditolak tanpa menghubungi UiTM
calls = 0;
[s] = await call('/courses?campus=B%27--'); assert.equal(s, 400);
[s] = await call('/timetable?campus=B&pick=' + Array(16).fill('CSC584.A1').join(',')); assert.equal(s, 400);
assert.equal(calls, 0);

// Asal tidak dibenarkan tidak mendapat pengepala CORS
r = await worker.fetch(new Request('https://jadual.bijaklabur.my/', { headers: { origin: 'https://jahat.example' } }), env, null, { fetch: fake, cache: null });
assert.equal(r.headers.get('access-control-allow-origin'), null);

// iCress tidak menjawab -> 502 dengan mesej BM
r = await worker.fetch(new Request('https://jadual.bijaklabur.my/campuses'), env, null, { fetch: async () => new Response('', { status: 503 }), cache: null });
assert.equal(r.status, 502); assert.match((await r.json()).error, /iCress/);

console.log('Semua ujian pelayan jadual lulus');
