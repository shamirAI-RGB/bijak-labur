// Bina rajah Mermaid: rajah/*.mmd -> images/rajah/*.svg (dipaparkan dengan <img>, jadi tiada skrip Mermaid dalam pelayar
// dan CSP kekal ketat). Jalankan: npm pack mermaid@11 && tar xzf mermaid-*.tgz && node scripts/bina-rajah.mjs package/dist/mermaid.min.js
// Perlu Playwright (Chromium) dipasang.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const lib = process.argv[2];
if (!lib) throw new Error('Beri laluan mermaid.min.js');

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: readFileSync(lib, 'utf8') });
await page.evaluate(() => mermaid.initialize({
  startOnLoad: false, htmlLabels: false, theme: 'base', securityLevel: 'strict',
  themeVariables: { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', fontSize: '15px', primaryColor: '#f4f2ec', primaryBorderColor: '#0b5d4b', primaryTextColor: '#14201b', lineColor: '#646d68', edgeLabelBackground: '#ffffff' },
  flowchart: { htmlLabels: false, curve: 'basis' }
}));
for (const f of readdirSync('rajah').filter(f => f.endsWith('.mmd'))) {
  const src = readFileSync(`rajah/${f}`, 'utf8');
  let svg = await page.evaluate(async ([id, s]) => (await mermaid.render(id, s)).svg, [f.replace(/\W/g, ''), src]);
  // Saiz tetap daripada viewBox supaya <img> berskala dengan betul di semua pelayar
  const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  svg = svg.replace(/^<svg([^>]*?) width="100%"/, `<svg$1 width="${Math.ceil(w)}" height="${Math.ceil(h)}"`).replace(/ style="max-width: [^"]+"/, '');
  writeFileSync(`images/rajah/${f.replace(/\.mmd$/, '.svg')}`, svg + '\n');
  console.log('images/rajah/' + f.replace(/\.mmd$/, '.svg'));
}
await browser.close();
