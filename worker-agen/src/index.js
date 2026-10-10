/* SiswaCap: agen.bijaklabur.my membawa pemilik terus ke Pejabat AI Agent (bijaklabur.my/pejabat-agen.html).
   Halaman itu sendiri meminta kunci pemilik; Worker ini tidak menyimpan sebarang rahsia. */

export const TARGET = 'https://bijaklabur.my/pejabat-agen.html';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
    return new Response(null, { status: 302, headers: { Location: TARGET, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' } });
  }
};
