// Copies MediaPipe Tasks Vision runtime into the renderer and downloads the
// hand landmark model, so the game runs fully offline once installed.
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const out = path.join(root, 'src', 'renderer', 'vendor', 'mediapipe');
const pkg = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision');
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

fs.mkdirSync(path.join(out, 'wasm'), { recursive: true });
fs.copyFileSync(path.join(pkg, 'vision_bundle.mjs'), path.join(out, 'vision_bundle.mjs'));
for (const f of fs.readdirSync(path.join(pkg, 'wasm'))) {
  fs.copyFileSync(path.join(pkg, 'wasm', f), path.join(out, 'wasm', f));
}
console.log('[vendor] MediaPipe runtime copied');

const modelPath = path.join(out, 'hand_landmarker.task');
if (fs.existsSync(modelPath) && fs.statSync(modelPath).size > 1e6) {
  console.log('[vendor] model already present');
} else {
  const get = (url, cb) => https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return get(res.headers.location, cb);
    if (res.statusCode !== 200) { console.error('[vendor] model download failed: HTTP', res.statusCode); process.exitCode = 1; return; }
    cb(res);
  }).on('error', (e) => { console.error('[vendor] model download failed:', e.message); process.exitCode = 1; });
  get(MODEL_URL, (res) => {
    const tmp = modelPath + '.part';
    const file = fs.createWriteStream(tmp);
    res.pipe(file);
    file.on('finish', () => { file.close(); fs.renameSync(tmp, modelPath); console.log('[vendor] hand model downloaded'); });
  });
}

// Bundle the M PLUS Rounded 1c font (SIL OFL 1.1) — covers English + Japanese.
const fontPkg = path.join(root, 'node_modules', '@fontsource', 'm-plus-rounded-1c');
const fontOut = path.join(root, 'src', 'renderer', 'vendor', 'fonts');
fs.mkdirSync(path.join(fontOut, 'files'), { recursive: true });
let css = '';
for (const w of ['500', '800']) {
  let c = fs.readFileSync(path.join(fontPkg, w + '.css'), 'utf8');
  c = c.replace(/, url\(\.\/files\/[^)]+\.woff\) format\('woff'\)/g, '');
  css += c + '\n';
  for (const m of c.matchAll(/url\(\.\/files\/([^)]+\.woff2)\)/g)) {
    fs.copyFileSync(path.join(fontPkg, 'files', m[1]), path.join(fontOut, 'files', m[1]));
  }
}
fs.writeFileSync(path.join(fontOut, 'fonts.css'), css);
fs.copyFileSync(path.join(fontPkg, 'LICENSE'), path.join(fontOut, 'LICENSE-OFL.txt'));
console.log('[vendor] fonts copied');
