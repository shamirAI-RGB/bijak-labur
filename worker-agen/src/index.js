/* Bijak Labur: agen.bijaklabur.my membawa pemilik terus ke Activepieces Cloud, tempat AI Agent pemilik berjalan.
   Akses dikawal oleh log masuk akaun Activepieces pemilik sendiri; Worker ini tidak menyimpan sebarang rahsia. */

export const TARGET = 'https://cloud.activepieces.com';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
    return new Response(null, { status: 302, headers: { Location: TARGET + '/', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' } });
  }
};
