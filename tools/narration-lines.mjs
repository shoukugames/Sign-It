// Lists every narration sentence the game speaks (English), so it can be
// pre-generated as audio. The game looks lines up by exact text (narrationKey),
// so these strings must be built exactly like the screens build them.
import path from 'path';
import { fileURLToPath } from 'url';
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.document = { addEventListener() {}, documentElement: {} };
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => path.join(root, 'src/renderer/js', p);
const { tIn } = await import(R('i18n.js'));
const { ASL, ASL_WORDSHAPES } = await import(R('signs.js'));
const { SLIDES } = await import(R('screens/tutorial.js'));
const { narrationKey } = await import(R('voicekeys.js'));
const { GUIDE_KEYS, FINGER_KEYS } = await import(R('recognizer.js'));

export function narrationLines(lang = 'en') {
  const lines = new Set();
  const T = (k, v) => lines.add(tIn(lang, k, v));
  ['calibIntro', 'calibDominant', 'calibOpen', 'calibFist', 'calibReady', 'calibDone', 'calibCloser', 'calibFarther', 'calibLight',
    'lessonComplete', 'levelComplete', 'levelFailed', 'perfect', 'wellDone', 'passed', 'notPassed', 'correct', 'notQuiteShort',
    'greatSign', 'tryAgainSign', 'looksRight', 'showHand', 'practiceHint', 'quizIntro', 'levelDesc1', 'levelDesc2', 'levelDesc3', 'levelDesc4',
    'timeUp', 'signTheWord', 'watchMiko', 'privacyTitle', 'privacyBody1', 'privacyBody2', 'privacyBody3', 'gateText', 'tutDone',
    'qWhichLetter', 'qWhatSign', 'parentsGate', 'moveLikeMiko', 'copyMiko', 'goodEffort'].forEach((k) => T(k));
  for (const x of ['B', 'A']) T('calibCheck', { x });
  for (const k of GUIDE_KEYS) {
    if (k === 'gBend' || k === 'gStraight') for (const f of FINGER_KEYS) T(k, { f: tIn(lang, f) });
    else T(k);
  }
  for (const s of SLIDES[lang]) lines.add(s.say);
  for (const v of Object.values({ ...ASL, ...ASL_WORDSHAPES })) lines.add(v[lang]);
  return [...lines].map((text) => ({ key: narrationKey(text), text }));
}

if (process.argv[1] && process.argv[1].endsWith('narration-lines.mjs')) {
  process.stdout.write(JSON.stringify(narrationLines(process.argv[2] || 'en'), null, 1));
}
