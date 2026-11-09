// Sign It — procedural 3D hand model.
// A handshape ("pose") is turned into the same 21 landmarks MediaPipe produces.
// The SAME landmarks are used to (1) draw the reference hand and (2) build the
// feature template the camera recognizer compares against, so what the player
// sees is exactly what they are judged on.
//
// Model space = what the player sees in the mirrored camera view of their
// dominant hand: x → right, y → up, z → toward the viewer. With the palm facing
// the camera the thumb is on the left. Units: wrist→middle-knuckle ≈ 0.43.

export const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
// Landmark indices per finger (MediaPipe order)
export const CHAINS = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12], [0, 13, 14, 15, 16], [0, 17, 18, 19, 20]];

const MCP = { index: [-0.13, 0.40, 0], middle: [-0.04, 0.43, 0], ring: [0.05, 0.41, 0], pinky: [0.13, 0.36, 0] };
const LEN = { index: [0.22, 0.13, 0.10], middle: [0.25, 0.15, 0.11], ring: [0.23, 0.14, 0.10], pinky: [0.18, 0.10, 0.09] };
const SPLAY = { index: -4, middle: 0, ring: 4, pinky: 9 };
const MAXANG = [90, 105, 80]; // degrees at MCP, PIP, DIP for flex=1
const THUMB_CMC = [-0.11, 0.09, 0.03];
const THUMB_LEN = [0.15, 0.12, 0.10];

// Named finger flex presets [mcp, pip, dip] (0 = straight, 1 = fully bent)
export const F = {
  S: [0, 0, 0],            // straight
  C: [0.95, 1, 0.75],      // curled into the palm (fist)
  H: [0.15, 1, 0.85],      // hooked / claw (knuckle straight)
  K: [0.95, 0, 0],         // bent only at the big knuckle
  Cc: [0.35, 0.45, 0.35],  // C-curve
  O: [0.5, 0.75, 0.5],     // rounded to meet the thumb
  E: [0.4, 1, 0.95],       // E: tips down to the thumb
  X: [0.25, 0.95, 0.85],   // X: hooked index
  M: [0.75, 1, 0.6]        // draped over the thumb (M / N)
};

// ---- small vector helpers -------------------------------------------------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const V = { add, sub, mul, dot, cross, len, norm, lerp };

function rotAxis(v, axis, deg) { // Rodrigues
  const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  const k = norm(axis);
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
}
function rotXYZ(p, r) {
  let q = p;
  if (r.z) q = rotAxis(q, [0, 0, 1], r.z);
  if (r.x) q = rotAxis(q, [1, 0, 0], r.x);
  if (r.y) q = rotAxis(q, [0, 1, 0], r.y);
  return q;
}

// ---- pose → landmarks -----------------------------------------------------
// pose = { index:[m,p,d], middle, ring, pinky, splay:{index:deg,...},
//          thumb: { tip:[x,y,z] } | { touch:'index'|'middle'|..., at:'tip'|'pip' },
//          rot:{x,y,z}, zOff:{index:dz} }
export function synthesize(pose) {
  const pts = new Array(21);
  pts[0] = [0, 0, 0];
  const tips = {};
  const fingerIdx = { index: 5, middle: 9, ring: 13, pinky: 17 };
  for (const f of ['index', 'middle', 'ring', 'pinky']) {
    const flex = pose[f] || F.S;
    const splay = (pose.splay && pose.splay[f] != null) ? pose.splay[f] : SPLAY[f];
    let p = [...MCP[f]];
    if (pose.zOff && pose.zOff[f]) p[2] += pose.zOff[f];
    const base = fingerIdx[f];
    pts[base] = p;
    let d = rotAxis([0, 1, 0], [0, 0, 1], -splay); // positive splay leans toward the pinky (+x)
    const axis = norm(cross(d, [0, 0, 1]));
    let ang = 0;
    for (let j = 0; j < 3; j++) {
      ang += flex[j] * MAXANG[j];
      const dir = rotAxis(d, axis, ang);
      p = add(p, mul(dir, LEN[f][j]));
      pts[base + j + 1] = p;
    }
    tips[f] = { tip: pts[base + 3], dip: pts[base + 2], pip: pts[base + 1] };
  }
  // Thumb: place the tip, then bow the chain naturally between CMC and tip.
  const th = pose.thumb || { tip: [-0.40, 0.28, 0.02] };
  let tip;
  if (th.touch) {
    const tgt = tips[th.touch][th.at || 'tip'];
    tip = add(tgt, th.off || [-0.012, -0.012, 0.028]);
  } else tip = [...th.tip];
  const cmc = [...THUMB_CMC];
  pts[1] = cmc;
  const total = THUMB_LEN[0] + THUMB_LEN[1] + THUMB_LEN[2];
  const chord = sub(tip, cmc);
  const cl = len(chord);
  // bow direction: away from the palm centre and toward the viewer
  const palmC = [0, 0.22, -0.02];
  let bow = sub(lerp(cmc, tip, 0.5), palmC);
  bow = norm(add(sub(bow, mul(norm(chord), dot(bow, norm(chord)))), [0, 0, 0.6]));
  const slack = Math.max(0, total - cl);
  const h = Math.sqrt(Math.max(0, (total * total - cl * cl) / 4)) * 0.55 + slack * 0.05;
  const ctrl = add(lerp(cmc, tip, 0.45), mul(bow, h));
  const bez = (t) => add(add(mul(cmc, (1 - t) * (1 - t)), mul(ctrl, 2 * t * (1 - t))), mul(tip, t * t));
  pts[2] = bez(0.42); pts[3] = bez(0.74); pts[4] = tip;

  const r = pose.rot || {};
  return pts.map((p) => rotXYZ(p, r));
}

// ---- rendering --------------------------------------------------------------
const BONES = [];
for (const ch of CHAINS) for (let i = 0; i < ch.length - 1; i++) BONES.push([ch[i], ch[i + 1]]);
const WIDTH = { 0: 0.105, 1: 0.095, 2: 0.085, 3: 0.075, 5: 0.082, 6: 0.072, 7: 0.065, 9: 0.086, 10: 0.075, 11: 0.068, 13: 0.08, 14: 0.07, 15: 0.064, 17: 0.072, 18: 0.062, 19: 0.056 };

export const VIEW34 = { y: -22, x: 8 };

export const SKIN = {
  light: { base: '#f6c9a6', shade: '#d99a76', line: '#b8775a', nail: '#fbe3d4' },
  medium: { base: '#d7a07a', shade: '#ad7652', line: '#8a5a3c', nail: '#f0d2bd' },
  deep: { base: '#9a6646', shade: '#734628', line: '#55331d', nail: '#d8b39a' },
  glove: { base: '#7fd7ff', shade: '#3a9fd9', line: '#1d6fa3', nail: '#d8f4ff' }
};

/**
 * Draw a hand from 21 model-space landmarks.
 * opts: { cx, cy, scale, mirror, skin, glow, highlight:[finger names], alpha, label }
 */
export function drawHand(ctx, pts, opts = {}) {
  const { cx = 0, cy = 0, scale = 300, mirror = false, skin = SKIN.light, alpha = 1 } = opts;
  if (opts.view) { // display-only 3/4 view, rotated around the palm centre
    const c = lerp(pts[0], pts[9], 0.5);
    pts = pts.map((p) => add(rotXYZ(sub(p, c), opts.view), c));
  }
  if (opts.orbit) { // free 3D orbit (mouse): turn around the vertical axis, then tilt
    const c = lerp(pts[0], pts[9], 0.5);
    pts = pts.map((p) => add(rotAxis(rotAxis(sub(p, c), [0, 1, 0], opts.orbit.yaw), [1, 0, 0], opts.orbit.pitch), c));
  }
  let P = pts.map((p) => {
    const persp = 1 / (1 - p[2] * 0.35);
    return { x: (mirror ? -p[0] : p[0]) * scale * persp, y: -p[1] * scale * persp, z: p[2] };
  });
  let ox = cx, oy = cy;
  if (opts.fit !== false) { // centre the hand's bounding box on (cx, cy)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const q of P) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    ox = cx - (x0 + x1) / 2; oy = cy - (y0 + y1) / 2;
  }
  P = P.map((q) => ({ x: q.x + ox, y: q.y + oy, z: q.z }));
  const s = scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // palm normal (z of the palm plane) decides palm vs back shading
  const nrm = cross(sub(pts[17], pts[5]), sub(pts[0], pts[5]));
  const palmFacing = (mirror ? -nrm[2] : nrm[2]) < 0;

  if (opts.glow) { ctx.shadowColor = opts.glow; ctx.shadowBlur = s * 0.12; }

  // soft drop shadow
  ctx.save();
  ctx.globalAlpha = alpha * 0.18;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  const by = Math.max(...P.map((q) => q.y));
  ctx.ellipse(cx, by + s * 0.06, s * 0.28, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // palm polygon
  const palmIdx = [0, 1, 2, 5, 9, 13, 17];
  const palmZ = palmIdx.reduce((a, i) => a + P[i].z, 0) / palmIdx.length;
  const items = [];
  items.push({ z: palmZ - 0.001, draw: () => drawPalm(ctx, P, s, skin, palmFacing) });
  for (const [a, b] of BONES) {
    if (a === 0 && b !== 1) continue; // wrist→knuckle bones are inside the palm
    const z = (P[a].z + P[b].z) / 2;
    items.push({ z, draw: () => drawBone(ctx, P[a], P[b], (WIDTH[a] || 0.06) * s, skin, opts.highlight && isHighlighted(a, opts.highlight)) });
  }
  // nails on the back side of the fingertips
  for (const [tipI, dipI] of [[4, 3], [8, 7], [12, 11], [16, 15], [20, 19]]) {
    items.push({ z: P[tipI].z + 0.0005, draw: () => drawNail(ctx, P[dipI], P[tipI], s, skin, pts, tipI, mirror) });
  }
  items.sort((a, b) => a.z - b.z);
  ctx.shadowBlur = 0;
  for (const it of items) it.draw();
  ctx.restore();
}

function isHighlighted(i, list) {
  const map = { thumb: [1, 2, 3], index: [5, 6, 7], middle: [9, 10, 11], ring: [13, 14, 15], pinky: [17, 18, 19] };
  return list.some((f) => (map[f] || []).includes(i));
}

function drawPalm(ctx, P, s, skin, palmFacing) {
  const order = [0, 1, 2, 5, 9, 13, 17];
  ctx.beginPath();
  // rounded hull via quadratic curves through midpoints
  const pts = order.map((i) => P[i]);
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  let m0 = mid(pts[pts.length - 1], pts[0]);
  ctx.moveTo(m0.x, m0.y);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], n = pts[(i + 1) % pts.length];
    const m = mid(p, n);
    ctx.quadraticCurveTo(p.x, p.y, m.x, m.y);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(P[0].x, P[0].y, P[9].x, P[9].y);
  g.addColorStop(0, skin.shade);
  g.addColorStop(1, skin.base);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = s * 0.16;
  ctx.strokeStyle = skin.base;
  ctx.stroke();
  ctx.lineWidth = s * 0.012;
  ctx.strokeStyle = skin.line;
  ctx.globalAlpha *= 0.55;
  // re-stroke outline slightly outside for definition
  ctx.stroke();
  ctx.globalAlpha /= 0.55;
  if (palmFacing) {
    // palm crease lines
    ctx.strokeStyle = skin.line;
    ctx.globalAlpha *= 0.35;
    ctx.lineWidth = s * 0.008;
    const a = P[5], b = P[17], w = P[0];
    ctx.beginPath();
    ctx.moveTo(a.x * 0.8 + w.x * 0.2, a.y * 0.8 + w.y * 0.2);
    ctx.quadraticCurveTo((a.x + b.x) / 2 * 0.75 + w.x * 0.25, (a.y + b.y) / 2 * 0.75 + w.y * 0.25, b.x * 0.75 + w.x * 0.25, b.y * 0.75 + w.y * 0.25);
    ctx.moveTo(P[2].x * 0.6 + w.x * 0.4, P[2].y * 0.6 + w.y * 0.4);
    ctx.quadraticCurveTo(P[9].x * 0.4 + w.x * 0.6, P[9].y * 0.4 + w.y * 0.6, w.x * 0.9 + P[13].x * 0.1, w.y * 0.9 + P[13].y * 0.1);
    ctx.stroke();
    ctx.globalAlpha /= 0.35;
  }
}

function drawBone(ctx, a, b, w, skin, hi) {
  ctx.lineWidth = w + Math.max(1.5, w * 0.12);
  if (hi) { ctx.save(); ctx.shadowColor = '#ffd166'; ctx.shadowBlur = w * 0.9; ctx.lineWidth = w * 1.45; ctx.strokeStyle = 'rgba(255,209,102,0.85)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore(); }
  ctx.strokeStyle = hi ? '#ffb020' : skin.line;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  g.addColorStop(0, skin.shade);
  g.addColorStop(0.5, skin.base);
  g.addColorStop(1, skin.base);
  ctx.lineWidth = w;
  ctx.strokeStyle = g;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  // highlight
  ctx.lineWidth = w * 0.28;
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  const nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1;
  const off = w * 0.18;
  ctx.beginPath();
  ctx.moveTo(a.x + (nx / nl) * off, a.y + (ny / nl) * off);
  ctx.lineTo(b.x + (nx / nl) * off, b.y + (ny / nl) * off);
  ctx.stroke();
}

function drawNail(ctx, dip, tip, s, skin, pts, tipI, mirror) {
  // Nails are visible when the back of the finger faces the viewer.
  const chain = CHAINS.find((c) => c[4] === tipI);
  const seg = sub(pts[chain[4]], pts[chain[3]]);
  const palmN = norm(cross(sub(pts[17], pts[5]), sub(pts[0], pts[5])));
  // finger "back" normal approximated from palm normal
  let backZ = -palmN[2];
  if (mirror) backZ = -backZ;
  const segLen2D = Math.hypot(tip.x - dip.x, tip.y - dip.y);
  if (backZ < 0.15 && Math.abs(seg[2]) < 0.5 * len(seg)) return;
  const ang = Math.atan2(tip.y - dip.y, tip.x - dip.x);
  ctx.save();
  ctx.translate(dip.x + (tip.x - dip.x) * 0.62, dip.y + (tip.y - dip.y) * 0.62);
  ctx.rotate(ang);
  ctx.fillStyle = skin.nail;
  ctx.globalAlpha *= 0.85;
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(2, segLen2D * 0.33), s * 0.022, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw MediaPipe-style landmarks (already in canvas pixels) as a neon skeleton. */
export function drawSkeleton(ctx, P, opts = {}) {
  const color = opts.color || '#6ef2ff';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = opts.width || 4;
  for (const [a, b] of BONES) {
    ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(P[5].x, P[5].y); ctx.lineTo(P[9].x, P[9].y); ctx.lineTo(P[13].x, P[13].y); ctx.lineTo(P[17].x, P[17].y); ctx.stroke();
  ctx.shadowBlur = 0;
  for (let i = 0; i < 21; i++) {
    ctx.fillStyle = [4, 8, 12, 16, 20].includes(i) ? '#ffffff' : color;
    ctx.beginPath(); ctx.arc(P[i].x, P[i].y, (opts.width || 4) * ([4, 8, 12, 16, 20].includes(i) ? 1.4 : 1), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Linear blend between two landmark sets (used for animating transitions). */
export function blendPts(a, b, t) {
  return a.map((p, i) => lerp(p, b[i], t));
}
