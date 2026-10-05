// Ujian pautan agen.bijaklabur.my tanpa rangkaian: node worker-agen/test.mjs
import assert from 'node:assert/strict';
import worker, { TARGET } from './src/index.js';

const run = path => worker.fetch(new Request('https://agen.bijaklabur.my' + path));
let r = await run('/');
assert.equal(r.status, 302);
assert.equal(r.headers.get('Location'), 'https://bijaklabur.my/pejabat-agen.html');
assert.equal(TARGET, 'https://bijaklabur.my/pejabat-agen.html');
r = await run('/flows?x=1');
assert.equal(r.headers.get('Location'), 'https://bijaklabur.my/pejabat-agen.html', 'laluan tidak diteruskan');
assert.equal(r.headers.get('X-Robots-Tag'), 'noindex, nofollow');
r = await run('/robots.txt');
assert.match(await r.text(), /Disallow: \//);
console.log('worker-agen: semua ujian lulus');
