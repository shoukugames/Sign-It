#!/usr/bin/env node
// Builds the browser version into build/web/ (run `npm install` first so src/renderer/vendor exists).
//
//   build/web/index.html, css/, js/, vendor/   <- src/renderer/
//   build/web/assets/                          <- assets/ (voice recordings)
//   build/web/icon.png                         <- build-resources/icon.png
//
// The desktop app loads src/renderer/index.html and reaches the recordings at ../../assets/;
// on the web the page sits next to assets/, so those paths are rewritten in the copy.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'build', 'web');
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'src', 'renderer'), OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), {
  recursive: true,
  filter: (src) => !/SCRIPT_.*\.csv$/.test(src),
});
fs.copyFileSync(path.join(ROOT, 'build-resources', 'icon.png'), path.join(OUT, 'icon.png'));
fs.copyFileSync(path.join(__dirname, 'web-fit.js'), path.join(OUT, 'js', 'web-fit.js'));

let rewrites = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'vendor' && e.name !== 'assets') walk(p); continue; }
    if (!/\.(js|html|css)$/.test(e.name)) continue;
    const before = fs.readFileSync(p, 'utf8');
    let after = before.replace(/\.\.\/\.\.\/assets\//g, 'assets/').replace(/\.\.\/\.\.\/build-resources\/icon\.png/g, 'icon.png');
    if (e.name === 'index.html') after = after.replace('<script type="module" src="js/app.js">', '<script src="js/web-fit.js"></script>\n  <script type="module" src="js/app.js">');
    if (after !== before) { fs.writeFileSync(p, after); rewrites++; }
  }
})(OUT);
console.log(`build/web ready (${rewrites} files adjusted for the web)`);
