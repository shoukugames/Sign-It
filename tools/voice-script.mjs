// Writes the recording checklist for human voice recordings:
//   assets/voice/SCRIPT_en.csv and assets/voice/SCRIPT_ja.csv
// Columns: filename (without extension), text to say, status (have / MISSING).
// To add or replace a recording, save it as assets/voice/<lang>/<filename>.ogg
// (or .mp3/.wav) and run `npm run voice:manifest`.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.document = { addEventListener() {}, documentElement: {} };
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(root, 'src/renderer/js', p);
const { lessons, level } = await import(R('curriculum.js'));
const { ASL, JSL } = await import(R('signs.js'));
const { LEXICON } = await import(R('avatar.js'));
const { voiceWords } = await import(R('voicekeys.js'));

for (const lang of ['en', 'ja']) {
  const rows = new Map();
  const dir = path.join(root, 'assets', 'voice', lang);
  const have = new Set(fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => f.replace(/\.(ogg|mp3|wav)$/i, '').normalize('NFC')) : []);
  const add = (key, text) => { if (!rows.has(key)) rows.set(key, [key, text, have.has(key.normalize('NFC')) ? 'have' : 'MISSING']); };
  for (const k of Object.keys(lang === 'ja' ? JSL : ASL)) add(`L_${k}`, k);
  const addText = (t) => voiceWords(t, lang).forEach((w) => add(`W_${w}`, w));
  for (const ls of lessons(lang)) {
    for (const w of ls.words) addText(w.tok.startsWith('#') ? w.tok.slice(1) : (LEXICON[w.tok]?.mouth || w.tok));
    for (const tk of ls.sentence.toks) addText(tk.startsWith('#') ? tk.slice(1) : (LEXICON[tk]?.mouth || tk));
  }
  for (let n = 6; n <= 20; n++) for (const it of level(lang, n).items) addText(it.text);
  const csv = ['filename,text,status', ...[...rows.values()].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  fs.writeFileSync(path.join(root, 'assets', 'voice', `SCRIPT_${lang}.csv`), '﻿' + csv + '\n');
  const miss = [...rows.values()].filter((r) => r[2] === 'MISSING').map((r) => r[1]);
  console.log(`[${lang}] ${rows.size} lines, ${rows.size - miss.length} recorded. Missing: ${miss.join(', ') || 'none'}`);
}
