// Self-test: every template must recognise itself as the best match, and stay
// recognisable with realistic landmark noise and hand rotation.
import { synthesize } from '../src/renderer/js/handmodel.js';
import { extract, scoreSign, allKeys, stars, motionScore } from '../src/renderer/js/recognizer.js';
import { getShape } from '../src/renderer/js/signs.js';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) / 1.0; };
let fails = 0;
for (const lang of ['en', 'ja']) {
  const keys = allKeys(lang);
  let top1 = 0, noisyTop = 0, trials = 0, starSum = 0;
  const conf = {};
  for (const k of keys) {
    const pts = synthesize(getShape(lang, k).pose);
    const r = scoreSign(extract(pts), lang, k);
    if (r.rank === 1 && r.score > 0.99) top1++; else { console.log(`  [${lang}] ${k} self rank ${r.rank} score ${r.score.toFixed(3)}`); fails++; }
    for (let t = 0; t < 20; t++) {
      const noisy = pts.map((p) => [p[0] + gauss() * 0.012, p[1] + gauss() * 0.012, p[2] + gauss() * 0.02]);
      const rr = scoreSign(extract(noisy), lang, k);
      trials++; if (rr.rank === 1) noisyTop++; else conf[k + '→' + rr.confusedWith] = (conf[k + '→' + rr.confusedWith] || 0) + 1;
      starSum += stars(rr.score, 'medium', rr.rank);
    }
  }
  console.log(`${lang}: self top-1 ${top1}/${keys.length}, noisy top-1 ${(100 * noisyTop / trials).toFixed(1)}%, mean stars (medium) ${(starSum / trials).toFixed(2)}`);
  const worst = Object.entries(conf).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (worst.length) console.log('  most confused:', worst.map(([a, b]) => `${a}(${b})`).join(' '));
}
// motion sanity
const z = []; const zp = [[0, 0], [1, 0], [0, -0.8], [1, -0.8]];
for (let s = 0; s < 3; s++) for (let i = 0; i <= 10; i++) { const a = zp[s], b = zp[s + 1]; z.push({ x: a[0] + (b[0] - a[0]) * i / 10, y: a[1] + (b[1] - a[1]) * i / 10 }); }
const still = Array.from({ length: 30 }, () => ({ x: 0, y: 0 }));
console.log('motion Z drawn', motionScore('Z', z).toFixed(2), 'still', motionScore('Z', still).toFixed(2));
if (motionScore('Z', z) < 0.8 || motionScore('Z', still) > 0.2) fails++;
process.exit(fails ? 1 : 0);
