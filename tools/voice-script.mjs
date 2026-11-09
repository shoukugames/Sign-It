// Generates the recording script for the human voice actor(s):
//   assets/voice/SCRIPT_en.csv and assets/voice/SCRIPT_ja.csv
// Each row: filename (without extension), text to read, context.
// Record each line as <filename>.mp3 (or .ogg/.wav) into assets/voice/<lang>/,
// then run `npm run voice:manifest`.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.document = { addEventListener() {}, documentElement: {} };
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(root, 'src/renderer/js', p);
const { store } = await import(R('storage.js'));
const { t } = await import(R('i18n.js'));
const { lessons, level } = await import(R('curriculum.js'));
const { ASL, JSL, ASL_WORDSHAPES } = await import(R('signs.js'));
const { SLIDES } = await import(R('screens/tutorial.js'));
const spokenWord = (s) => s.replace(/\s*[（(].*?[)）]/g, '');

for (const lang of ['en', 'ja']) {
  store.settings.lang = lang;
  const rows = new Map();
  const add = (key, text, ctx) => { if (!rows.has(key)) rows.set(key, [key, text, ctx]); };
  const set = lang === 'ja' ? JSL : { ...ASL, ...ASL_WORDSHAPES };
  for (const [k, v] of Object.entries(set)) add(`letter_${k}`, `${k}. ${v[lang]}`, 'Lesson letter instruction');
  lessons(lang).forEach((ls, i) => {
    for (const w of ls.words) add(`word_${w.tok.replace('#', '')}`, spokenWord(w[lang]), `Lesson ${i + 1} word`);
    add(`sent_${lang}_${i + 1}`, ls.sentence[lang], `Lesson ${i + 1} sentence`);
  });
  for (let n = 1; n <= 20; n++) {
    const lv = level(lang, n);
    if (lv.type === 1) continue;
    for (const it of lv.items) add(`word_${it.text.replace(/\s+/g, '_')}`, lang === 'en' ? it.text.toLowerCase() : it.text, `Level ${n} ${lv.type === 3 ? '(LISTEN level: say clearly, natural pace)' : ''}`);
  }
  for (const k of Object.keys(set)) add(`quiz_sign_${k}`, k, 'Quiz: sign this letter');
  SLIDES[lang].forEach((s, i) => add(`tut_${lang}_${i + 1}`, s.say, `Tutorial slide ${i + 1}`));
  add('calib_intro', t('calibIntro'), 'Calibration');
  add('calib_open', t('calibOpen'), 'Calibration');
  add('calib_fist', t('calibFist'), 'Calibration');
  add('calib_done', t('calibDone'), 'Calibration');
  add('lesson_complete', t('lessonComplete'), 'Lesson finished');
  add('quiz_pass', t('passed'), 'Quiz passed');
  add('quiz_fail', t('notPassed'), 'Quiz not passed');
  add('level_complete', t('levelComplete'), 'Level finished');
  add('level_failed', t('levelFailed'), 'Level failed');
  add('tut_done', t('tutDone'), 'Tutorial finished');
  const csv = ['filename,text,context', ...[...rows.values()].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const out = path.join(root, 'assets', 'voice', `SCRIPT_${lang}.csv`);
  fs.writeFileSync(out, '﻿' + csv + '\n');
  console.log(`${out}: ${rows.size} lines`);
}
