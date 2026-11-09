// Sign It — handshape recognizer.
// Turns 21 3D landmarks into an anatomical feature vector (finger flexion,
// thumb placement, spread, crossing, orientation) and compares it with the
// template built from the same procedural hand model used for illustrations.
import { synthesize, V, F } from './handmodel.js';
import { signSet, getShape, ASL_WORDSHAPES } from './signs.js';

const { sub, dot, cross, len, norm } = V;
const DEG = 180 / Math.PI;
const FING = [['index', 5], ['middle', 9], ['ring', 13], ['pinky', 17]];

function angle(a, b) { return Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * DEG; }

/** Raw (uncalibrated) features from model-space landmarks. */
export function extract(pts) {
  const O = pts[0];
  const palmLen = len(sub(pts[9], O)) || 1;
  const Y = norm(sub(pts[9], O));
  let X = sub(pts[17], pts[5]);
  X = norm(sub(X, V.mul(Y, dot(X, Y))));
  const Z = cross(X, Y); // palm normal (out of the palm)
  const local = (p) => { const d = sub(p, O); return [dot(d, X) / palmLen, dot(d, Y) / palmLen, dot(d, Z) / palmLen]; };

  const f = {};
  const prox = {};
  for (const [name, b] of FING) {
    const mcp = pts[b], pip = pts[b + 1], dip = pts[b + 2];
    const d1 = sub(pip, mcp);
    let base = sub(mcp, O); base = norm(sub(base, V.mul(Z, dot(base, Z))));
    const mcpFlex = Math.atan2(dot(norm(d1), Z), dot(norm(d1), base)) * DEG;
    const pipFlex = angle(d1, sub(dip, pip));
    f[name + 'M'] = mcpFlex / 90;
    f[name + 'P'] = pipFlex / 105;
    prox[name] = d1;
  }
  const t = local(pts[4]);
  f.tx = t[0]; f.ty = t[1]; f.tz = t[2];
  f.ti = len(sub(pts[4], pts[8])) / palmLen;
  f.tm = len(sub(pts[4], pts[12])) / palmLen;
  const pi = V.sub(prox.index, V.mul(Z, dot(prox.index, Z)));
  const pm = V.sub(prox.middle, V.mul(Z, dot(prox.middle, Z)));
  f.spread = angle(pi, pm) / 30;
  const it = local(pts[8]), mt = local(pts[12]);
  f.cross = (it[0] - mt[0]);
  // orientation in camera/model space
  f.px = Y[0]; f.py = Y[1]; f.nz = Z[2]; f.ny = Z[1];
  return f;
}

// Feature weights and tolerances
const SPEC = {
  indexM: [1, 0.28], middleM: [1, 0.28], ringM: [0.8, 0.3], pinkyM: [0.9, 0.3],
  indexP: [1, 0.28], middleP: [1, 0.28], ringP: [0.8, 0.3], pinkyP: [0.9, 0.3],
  tx: [1.1, 0.16], ty: [1.1, 0.16], tz: [0.9, 0.18],
  ti: [0.7, 0.18], tm: [0.7, 0.18],
  spread: [0.6, 0.35], cross: [0.9, 0.11],
  px: [1.2, 0.42], py: [1.2, 0.42], nz: [0.7, 0.55], ny: [0.4, 0.6]
};

function straightness(f, name) { return Math.max(0, 1 - (f[name + 'M'] + f[name + 'P']) / 1.2); }

/** Similarity 0..1 between player features and a template. */
export function similarity(p, t, detail = false) {
  let E = 0, W = 0;
  const parts = {};
  for (const k in SPEC) {
    let [w, tol] = SPEC[k];
    if (k === 'spread' || k === 'cross') w *= Math.min(straightness(t, 'index'), straightness(t, 'middle'));
    if ((k === 'ti' && t.ti < 0.25) || (k === 'tm' && t.tm < 0.25)) w *= 2.2; // touching matters a lot
    const d = (p[k] - t[k]) / tol;
    E += w * d * d; W += w;
    if (detail) parts[k] = d;
  }
  const s = Math.exp(-0.5 * E / W);
  return detail ? { score: s, parts } : s;
}

// ---- templates ---------------------------------------------------------------
const cache = {};
export function template(lang, key) {
  const id = lang + ':' + key;
  if (!cache[id]) {
    const sh = getShape(lang, key);
    if (!sh) return null;
    cache[id] = extract(synthesize(sh.pose));
  }
  return cache[id];
}
export function allKeys(lang) {
  const keys = Object.keys(signSet(lang));
  return lang === 'ja' ? keys : keys.concat(Object.keys(ASL_WORDSHAPES));
}

// ---- calibration ----------------------------------------------------------------
const SYN_OPEN = extract(synthesize({ index: F.S, middle: F.S, ring: F.S, pinky: F.S, thumb: { tip: [-0.40, 0.31, 0.03] } }));
const SYN_FIST = extract(synthesize({ index: F.C, middle: F.C, ring: F.C, pinky: F.C, thumb: { tip: [-0.01, 0.31, 0.27] } }));

/** Map player's flexion range (from calibration) onto the model's range. */
export function applyCalibration(f, calib) {
  if (!calib || !calib.open || !calib.fist) return f;
  const g = { ...f };
  for (const [name] of FING) for (const s of ['M', 'P']) {
    const k = name + s;
    const o = calib.open[k], c = calib.fist[k];
    if (o == null || c == null || Math.abs(c - o) < 0.15) continue;
    const u = (f[k] - o) / (c - o);
    g[k] = Math.max(-0.3, Math.min(1.4, SYN_OPEN[k] + u * (SYN_FIST[k] - SYN_OPEN[k])));
  }
  return g;
}

/** Average a list of feature objects (used while calibrating). */
export function meanFeatures(list) {
  const out = {};
  for (const k of Object.keys(list[0])) out[k] = list.reduce((a, f) => a + f[k], 0) / list.length;
  return out;
}

// ---- scoring --------------------------------------------------------------------
export const DIFFICULTY = {
  easy: { star1: 0.40, star2: 0.55, star3: 0.72, hold: 450, needTop: false, time: 25 },
  medium: { star1: 0.47, star2: 0.63, star3: 0.79, hold: 650, needTop: false, time: 18 },
  hard: { star1: 0.54, star2: 0.70, star3: 0.85, hold: 850, needTop: true, time: 12 }
};

/**
 * Score player features against a target sign.
 * Returns { score, rank, best, confusedWith }
 */
export function scoreSign(f, lang, key) {
  const tgt = template(lang, key);
  if (!tgt) return { score: 0, rank: 99 };
  const s = similarity(f, tgt);
  let rank = 1, bestOther = 0, confusedWith = null;
  for (const k of allKeys(lang)) {
    if (k === key) continue;
    const t2 = template(lang, k);
    // identical handshapes (e.g. I and J differ only by motion) never compete
    if (sameShape(lang, k, key)) continue;
    const s2 = similarity(f, t2);
    if (s2 > s) rank++;
    if (s2 > bestOther) { bestOther = s2; confusedWith = k; }
  }
  // if another sign is clearly a better match, soften the score
  let adj = s;
  if (bestOther > s + 0.04) adj = s * 0.85;
  return { score: adj, raw: s, rank, confusedWith: bestOther > s ? confusedWith : null };
}
function sameShape(lang, a, b) {
  const A = getShape(lang, a), B = getShape(lang, b);
  return A && B && A.pose === B.pose;
}

export function stars(score, diff, rank = 1) {
  const d = DIFFICULTY[diff] || DIFFICULTY.medium;
  let st = score >= d.star3 ? 3 : score >= d.star2 ? 2 : score >= d.star1 ? 1 : 0;
  if (d.needTop && rank > 1) st = Math.min(st, 1);
  return st;
}

// ---- motion (J, Z) -----------------------------------------------------------------
/** trail: [{x,y,t}] fingertip positions in palm-length units (y up). */
export function motionScore(kind, trail) {
  if (trail.length < 6) return 0;
  const xs = trail.map((p) => p.x), ys = trail.map((p) => p.y);
  let path = 0;
  for (let i = 1; i < trail.length; i++) path += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
  if (kind === 'Z') {
    // need two horizontal direction changes and enough travel
    let dirs = [], acc = 0, last = 0;
    for (let i = 1; i < trail.length; i++) {
      const dx = xs[i] - xs[i - 1];
      acc += dx;
      if (Math.abs(acc) > 0.18) { const s = Math.sign(acc); if (s !== last) { dirs.push(s); last = s; } acc = 0; }
    }
    const turns = Math.max(0, dirs.length - 1);
    const drop = Math.max(...ys) - Math.min(...ys);
    return Math.min(1, (Math.min(turns, 2) / 2) * 0.7 + Math.min(1, path / 1.6) * 0.2 + (drop > 0.2 ? 0.1 : 0));
  }
  if (kind === 'J') {
    // downward stroke, then a hook sideways
    const iLow = ys.indexOf(Math.min(...ys));
    const down = ys[0] - ys[iLow];
    const hook = Math.abs(xs[xs.length - 1] - xs[iLow]) + Math.abs(xs[iLow] - xs[0]);
    return Math.min(1, Math.min(1, down / 0.45) * 0.55 + Math.min(1, hook / 0.35) * 0.45);
  }
  return 1;
}

// ---- technique -------------------------------------------------------------------
/**
 * frames: [{pts (model space), t}] captured while the sign was held.
 * prevEnd: time the previous sign was completed (ms) or null.
 * Returns 0..1 combining steadiness, pace and keeping the hand in place.
 */
export function techniqueScore(frames, startT, prevEnd, anchor) {
  if (!frames.length) return 0;
  // steadiness: jitter of fingertips relative to the wrist
  const tips = [4, 8, 12, 16, 20];
  let jitter = 0, n = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1].pts, b = frames[i].pts;
    const pl = len(sub(b[9], b[0])) || 1;
    for (const k of tips) { jitter += len(sub(sub(b[k], b[0]), sub(a[k], a[0]))) / pl; n++; }
  }
  jitter = n ? jitter / n : 0;
  const steady = Math.max(0, Math.min(1, 1 - (jitter - 0.012) / 0.05));
  // pace: a clear, unhurried transition (0.4 – 2.5 s) is ideal
  let pace = 1;
  if (prevEnd != null) {
    const dt = (startT - prevEnd) / 1000;
    pace = dt < 0.25 ? 0.6 : dt <= 2.5 ? 1 : Math.max(0.4, 1 - (dt - 2.5) / 6);
  }
  // placement: fingerspelling stays in one comfortable spot
  let place = 1;
  if (anchor && frames[0].center) {
    const c = frames[frames.length - 1].center;
    const drift = Math.hypot(c.x - anchor.x, c.y - anchor.y);
    place = Math.max(0.3, 1 - Math.max(0, drift - 0.12) / 0.35);
  }
  return steady * 0.5 + pace * 0.25 + place * 0.25;
}
