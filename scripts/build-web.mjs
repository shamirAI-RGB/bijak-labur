// Salin fail laman web ke folder www/ untuk dibungkus oleh Capacitor (Android & iOS)
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const FILES = ['index.html', 'privacy.html', 'terma.html', 'terma-app.html', 'tentang.html', 'padam-data.html', 'manifest.webmanifest', 'css', 'fonts', 'js', 'icons', 'images', 'data', 'audio'];
rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const f of FILES) {
  try { cpSync(f, `www/${f}`, { recursive: true }); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
console.log('www/ sedia');
