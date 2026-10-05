// Bina Pejabat AI Agent: pejabat-agen/App.jsx -> js/pejabat-agen.js, Tailwind -> css/pejabat-agen.css,
// dan salin React, ReactDOM serta framer-motion (UMD) ke js/vendor.
// Jalankan: npm i --no-save react@18.3.1 react-dom@18.3.1 framer-motion@11.11.17 @babel/standalone@7.26.2 tailwindcss@3.4.16
//           node scripts/bina-pejabat-agen.mjs
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Babel = require('@babel/standalone');

let src = readFileSync('pejabat-agen/App.jsx', 'utf8');
src = src
  .replace(/^import React, \{([^}]+)\} from "react";$/m, 'const {$1} = React;')
  .replace(/^import \{([^}]+)\} from "framer-motion";$/m, 'const {$1} = Motion;')
  .replace(/^export default function /m, 'function ')
  .replace(/^export (async )?function /m, '$1function ');
if (/^\s*(import|export) /m.test(src)) throw new Error('import/export masih ada dalam App.jsx');
const { code } = Babel.transform(src + '\nReactDOM.createRoot(document.getElementById("pejabat")).render(<PejabatAgen />);\n',
  { presets: [['react', { runtime: 'classic' }]], comments: false, minified: false });
writeFileSync('js/pejabat-agen.js', `/* Dijana oleh scripts/bina-pejabat-agen.mjs daripada pejabat-agen/App.jsx. Jangan sunting terus. */\n(function () {\n"use strict";\n${code}\n})();\n`);

execFileSync('npx', ['tailwindcss', '-c', 'pejabat-agen/tailwind.config.cjs', '-i', 'pejabat-agen/input.css', '-o', 'css/pejabat-agen.css', '--minify'], { stdio: 'inherit' });

const V = [
  ['react/umd/react.production.min.js', 'react.production.min.js'],
  ['react-dom/umd/react-dom.production.min.js', 'react-dom.production.min.js'],
  ['framer-motion/dist/framer-motion.js', 'framer-motion.js'],
];
for (const [from, to] of V) copyFileSync(`node_modules/${from}`, `js/vendor/${to}`);
console.log('Pejabat AI Agent dibina.');
