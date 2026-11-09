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
  // Thumb measured RELATIVE TO THE FINGERS, so it works for every hand size and shape
  // (tuned on real photos — see tools/eval-real.mjs): across the knuckle line
  // (0 = index knuckle, 1 = pinky knuckle, < 0 = outside the index) and height above it.
  const k5 = local(pts[5]), k17 = local(pts[17]);
  f.tAcross = (t[0] - k5[0]) / ((k17[0] - k5[0]) || 1);
  f.tUp = t[1] - (k5[1] + k17[1]) / 2;
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
  // big-knuckle bend reads low on real fists, so it counts less than the middle joint
  indexM: [0.7, 0.36], middleM: [0.7, 0.36], ringM: [0.55, 0.38], pinkyM: [0.6, 0.38],
  indexP: [1, 0.28], middleP: [1, 0.28], ringP: [0.8, 0.3], pinkyP: [0.9, 0.3],
  tAcross: [1.1, 0.4], tUp: [1.0, 0.24], tz: [0.8, 0.24],
  ti: [0.7, 0.24], tm: [0.7, 0.24],
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

/** Handshape only, ignoring which way the hand points or faces (used for whole-word signs). */
export function shapeSimilarity(p, t) {
  const q = { ...p, px: t.px, py: t.py, nz: t.nz, ny: t.ny };
  return similarity(q, t);
}

// ---- templates ---------------------------------------------------------------
const cache = {};
/** All accepted forms of a sign (main pose + common real-world variants in signs.js `alt`). */
export function templates(lang, key) {
  const id = lang + ':' + key;
  if (!cache[id]) {
    const sh = getShape(lang, key);
    if (!sh) return null;
    cache[id] = [sh.pose, ...(sh.alt || [])].map((pose) => extract(synthesize(pose)));
  }
  return cache[id];
}
/** The main template (used for coaching and illustrations). */
export function template(lang, key) {
  const t = templates(lang, key);
  return t ? t[0] : null;
}
/** Best similarity over every accepted form; returns [score, templateUsed]. */
function bestOf(f, list) {
  let best = -1, used = list[0];
  for (const t of list) { const s = similarity(f, t); if (s > best) { best = s; used = t; } }
  return [best, used];
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
  // Thresholds tuned on real photos (tools/eval-real.mjs). maxRank = how many other letters may
  // look MORE like the player's hand than the target and it still counts.
  easy: { star1: 0.40, star2: 0.52, star3: 0.66, hold: 400, maxRank: 3, anyRankAt: 0.60, time: 25 },
  medium: { star1: 0.45, star2: 0.58, star3: 0.72, hold: 550, maxRank: 2, anyRankAt: 0.70, time: 18 },
  hard: { star1: 0.50, star2: 0.65, star3: 0.80, hold: 750, maxRank: 1, anyRankAt: 2, time: 12 }
};

/**
 * Score player features against a target sign.
 * Returns { score, rank, best, confusedWith }
 */
export function scoreSign(f, lang, key) {
  const tgts = templates(lang, key);
  if (!tgts) return { score: 0, rank: 99 };
  const [s, used] = bestOf(f, tgts);
  let rank = 1, bestOther = 0, confusedWith = null;
  for (const k of allKeys(lang)) {
    if (k === key) continue;
    // identical handshapes (e.g. I and J differ only by motion) never compete
    if (sameShape(lang, k, key)) continue;
    const s2 = bestOf(f, templates(lang, k))[0];
    if (s2 > s) rank++;
    if (s2 > bestOther) { bestOther = s2; confusedWith = k; }
  }
  // if another sign is clearly a better match, soften the score
  let adj = s;
  if (bestOther > s + 0.04) adj = s * 0.85;
  return { score: adj, raw: s, rank, confusedWith: bestOther > s ? confusedWith : null, used };
}
function sameShape(lang, a, b) {
  const A = getShape(lang, a), B = getShape(lang, b);
  return A && B && A.pose === B.pose;
}

export function stars(score, diff, rank = 1) {
  const d = DIFFICULTY[diff] || DIFFICULTY.medium;
  if (rank > d.maxRank && score < d.anyRankAt) return 0; // a very strong match counts even among look-alikes
  return score >= d.star3 ? 3 : score >= d.star2 ? 2 : score >= d.star1 ? 1 : 0;
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

// ---- coaching ------------------------------------------------------------------
export const FINGER_KEYS = ['fThumb', 'fIndex', 'fMiddle', 'fRing', 'fPinky'];
export const GUIDE_KEYS = ['gBend', 'gStraight', 'gThumbOut', 'gThumbIn', 'gThumbTouchIndex', 'gThumbTouchMiddle', 'gThumbApart',
  'gThumbFront', 'gThumbBack', 'gThumbUp', 'gThumbDown', 'gPointUp', 'gPointSide', 'gPointDown', 'gPointCam',
  'gPalmCam', 'gPalmAway', 'gPalmSide', 'gCross', 'gUncross', 'gSpread', 'gTogether'];

/**
 * Compare the player's hand (p) with the target (t) and return coaching tips,
 * most important first: [{ key, f (finger i18n key or null), finger, cat, sev }]
 * plus a status per category: { fingers, thumb, palm } (true = looks right).
 */
export function guide(p, t) {
  const tips = [];
  // 1) where the hand points and which way the palm faces
  const tl = Math.hypot(t.px, t.py), pl = Math.hypot(p.px, p.py);
  const dirKey = (x, y, l) => (l < 0.5 ? 'gPointCam' : y > 0.6 ? 'gPointUp' : y < -0.6 ? 'gPointDown' : 'gPointSide');
  const tDir = dirKey(t.px, t.py, tl), pDir = dirKey(p.px, p.py, pl);
  if (tDir !== pDir) {
    const cos = tl > 0.3 && pl > 0.3 ? (t.px * p.px + t.py * p.py) / (tl * pl) : 0;
    if (cos < 0.75) tips.push({ key: tDir, cat: 'palm', sev: 4 - cos });
  }
  if (t.nz > 0.5 && p.nz < 0.15) tips.push({ key: 'gPalmCam', cat: 'palm', sev: 3.6 + (0.5 - p.nz) });
  else if (t.nz < -0.5 && p.nz > -0.15) tips.push({ key: 'gPalmAway', cat: 'palm', sev: 3.6 + (p.nz + 0.5) });
  else if (Math.abs(t.nz) < 0.35 && Math.abs(p.nz) > 0.75) tips.push({ key: 'gPalmSide', cat: 'palm', sev: 3.3 });

  // 2) each finger: bent vs. straight
  const names = ['index', 'middle', 'ring', 'pinky'];
  names.forEach((n, i) => {
    const d = ((p[n + 'M'] - t[n + 'M']) + (p[n + 'P'] - t[n + 'P'])) / 2;
    if (Math.abs(d) > 0.28) tips.push({ key: d > 0 ? 'gStraight' : 'gBend', f: FINGER_KEYS[i + 1], finger: n, cat: 'fingers', sev: Math.abs(d) / 0.28 });
  });
  const straight = (o, n) => o[n + 'M'] + o[n + 'P'] < 0.5;
  if (straight(t, 'index') && straight(t, 'middle')) {
    if (t.cross > 0.05 && p.cross < 0) tips.push({ key: 'gCross', finger: 'index', cat: 'fingers', sev: 1.4 });
    else if (t.cross < 0.02 && p.cross > 0.06) tips.push({ key: 'gUncross', finger: 'index', cat: 'fingers', sev: 1.2 });
    else if (t.spread > 0.6 && p.spread < 0.35) tips.push({ key: 'gSpread', finger: 'middle', cat: 'fingers', sev: 1.1 });
    else if (t.spread < 0.25 && p.spread > 0.55) tips.push({ key: 'gTogether', finger: 'middle', cat: 'fingers', sev: 1.1 });
  }

  // 3) thumb (only the biggest issue)
  const th = [];
  // a 'touch' only matters when that finger is reaching for the thumb (O, F, D…), not in a fist
  const reaching = (n) => t[n + 'M'] < 0.8 && t[n + 'P'] < 0.9;
  if (t.ti < 0.28 && reaching('index') && p.ti > 0.42) th.push({ key: 'gThumbTouchIndex', sev: (p.ti - t.ti) / 0.18 });
  else if (t.tm < 0.28 && reaching('middle') && p.tm > 0.42) th.push({ key: 'gThumbTouchMiddle', sev: (p.tm - t.tm) / 0.18 });
  else if (t.ti > 0.5 && p.ti < 0.25) th.push({ key: 'gThumbApart', sev: 1.2 });
  const dx = p.tAcross - t.tAcross, dz = p.tz - t.tz, dy = p.tUp - t.tUp;
  if (Math.abs(dx) > 0.45) th.push({ key: dx > 0 ? 'gThumbOut' : 'gThumbIn', sev: Math.abs(dx) / 0.45 });
  if (Math.abs(dz) > 0.26) th.push({ key: dz < 0 ? 'gThumbFront' : 'gThumbBack', sev: Math.abs(dz) / 0.26 * 0.9 });
  if (Math.abs(dy) > 0.28) th.push({ key: dy > 0 ? 'gThumbDown' : 'gThumbUp', sev: Math.abs(dy) / 0.28 * 0.8 });
  th.sort((a, b) => b.sev - a.sev);
  if (th[0]) tips.push({ ...th[0], f: 'fThumb', finger: 'thumb', cat: 'thumb' });

  tips.sort((a, b) => b.sev - a.sev);
  const status = { fingers: !tips.some((x) => x.cat === 'fingers'), thumb: !tips.some((x) => x.cat === 'thumb'), palm: !tips.some((x) => x.cat === 'palm') };
  return { tips, status };
}
