// Scans assets/voice/<lang>/ for human recordings and writes manifest.json,
// so the game knows which lines have a real voice.
'use strict';
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'assets', 'voice');
const out = { en: {}, ja: {} };
for (const lang of ['en', 'ja']) {
  const d = path.join(dir, lang);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    const m = f.match(/^(.+)\.(mp3|ogg|wav)$/i);
    if (m) out[lang][m[1].normalize('NFC')] = m[2].toLowerCase();
  }
}
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`[voice] ${Object.keys(out.en).length} English, ${Object.keys(out.ja).length} Japanese recordings`);
