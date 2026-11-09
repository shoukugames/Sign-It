// Scores the recognizer against REAL hand landmarks (from tools/real-hand-test.html,
// saved to tools/testdata/real.jsonl). For every photo it reports whether the
// intended letter is the best match, its stars, and how often a WRONG letter
// would also earn a star (false accepts).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extract, scoreSign, stars, allKeys } from '../src/renderer/js/recognizer.js';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'testdata', 'real.jsonl');
if (!fs.existsSync(file)) { console.log('no real-photo data (see tools/real-hand-test.html) — skipped'); process.exit(0); }
const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse).filter((r) => r.found && r.model);
const keys = allKeys('en');
for (const diff of ['easy', 'medium', 'hard']) {
  let r1 = 0, pass = 0, fa = 0, neg = 0;
  const fails = [];
  for (const r of rows) {
    const f = extract(r.model);
    const s = scoreSign(f, 'en', r.want);
    if (s.rank === 1) r1++;
    if (stars(s.score, diff, s.rank) >= 1) pass++; else fails.push(`${r.want}(${s.score.toFixed(2)}#${s.rank})`);
    for (const k of keys) {
      if (k === r.want || 'JZ'.includes(k)) continue;
      const w = scoreSign(f, 'en', k);
      neg++; if (stars(w.score, diff, w.rank) >= 1) fa++;
    }
  }
  console.log(`${diff.padEnd(6)} best-match ${r1}/${rows.length}  earns ≥1★ ${pass}/${rows.length}  false accepts ${(100 * fa / neg).toFixed(1)}%  misses: ${fails.join(' ')}`);
}
