// Sign It — camera + hand tracking.
// * Uses Google MediaPipe Hand Landmarker, fully on-device (no network).
// * The raw camera picture is NEVER shown: only the pixels inside the hand
//   outline are drawn, on a clean background, and the view auto-zooms onto
//   the hands. Nothing is recorded, stored or uploaded.
// * stop() releases the camera hardware immediately (the light goes off).
import { extract, applyCalibration } from './recognizer.js';
import { drawSkeleton, CHAINS } from './handmodel.js';
import { store } from './storage.js';

let video = null, stream = null, landmarker = null, raf = 0, running = false;
let latest = null;
const subs = new Set();
const stateSubs = new Set();
let status = 'off'; // off | starting | on | error

function setStatus(s, err) { status = s; stateSubs.forEach((fn) => fn(s, err)); }
export function onStatus(fn) { stateSubs.add(fn); return () => stateSubs.delete(fn); }
export function getStatus() { return status; }
export function isOn() { return status === 'on'; }

async function loadLandmarker() {
  if (landmarker) return landmarker;
  const { FilesetResolver, HandLandmarker } = await import('../vendor/mediapipe/vision_bundle.mjs');
  const fileset = await FilesetResolver.forVisionTasks(new URL('../vendor/mediapipe/wasm', import.meta.url).href);
  const opts = (delegate) => ({
    baseOptions: { modelAssetPath: new URL('../vendor/mediapipe/hand_landmarker.task', import.meta.url).href, delegate },
    runningMode: 'VIDEO', numHands: 2,
    minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5
  });
  try { landmarker = await HandLandmarker.createFromOptions(fileset, opts('GPU')); }
  catch (_) { landmarker = await HandLandmarker.createFromOptions(fileset, opts('CPU')); }
  return landmarker;
}

/** Start the camera. Caller must have obtained parent consent first. */
export async function start() {
  if (running) return true;
  setStatus('starting');
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user', frameRate: { ideal: 30 } } });
    video = document.createElement('video');
    video.muted = true; video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await loadLandmarker();
    if (!stream) return false; // stopped while loading
    running = true;
    setStatus('on');
    loop();
    return true;
  } catch (e) {
    console.error('[camera]', e);
    stop();
    setStatus('error', e);
    return false;
  }
}

/** Turn the camera fully off and release the device. */
export function stop() {
  running = false;
  cancelAnimationFrame(raf);
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  if (video) { video.pause(); video.srcObject = null; video = null; }
  latest = null;
  if (status !== 'off') setStatus('off');
}

export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function latestFrame() { return latest; }

let lastTs = -1;
function loop() {
  if (!running) return;
  raf = requestAnimationFrame(loop);
  if (!video || video.readyState < 2) return;
  const ts = performance.now();
  if (ts <= lastTs) return;
  lastTs = ts;
  let res;
  try { res = landmarker.detectForVideo(video, ts); } catch (_) { return; }
  latest = process(res, ts);
  subs.forEach((fn) => fn(latest));
}

function process(res, ts) {
  const calib = store.s.calibration;
  const hands = (res.landmarks || []).map((lm, i) => {
    const label = res.handedness?.[i]?.[0]?.categoryName || 'Right';
    const conf = res.handedness?.[i]?.[0]?.score || 0;
    const world = res.worldLandmarks?.[i] || lm;
    const flipX = calib ? (label === calib.label ? calib.flipX : !calib.flipX) : label === 'Right';
    const model = world.map((p) => [flipX ? p.x : -p.x, -p.y, -p.z]);
    const img = lm.map((p) => ({ x: 1 - p.x, y: p.y })); // mirrored, normalised
    const xs = img.map((p) => p.x), ys = img.map((p) => p.y);
    const palmImg = Math.hypot(img[9].x - img[0].x, img[9].y - img[0].y) || 0.01;
    const center = { x: (img[0].x + img[5].x + img[17].x) / 3, y: (img[0].y + img[5].y + img[17].y) / 3 };
    return {
      label, conf, flipX, model, img, center, palmImg,
      bbox: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) },
      isDominant: calib ? label === calib.label : true
    };
  });
  // primary = dominant hand if visible, otherwise the largest
  let primary = hands.find((h) => h.isDominant) || null;
  if (!primary && hands.length) primary = hands.slice().sort((a, b) => b.palmImg - a.palmImg)[0];
  let features = null;
  if (primary) features = applyCalibration(extract(primary.model), calib);
  return { ts, hands, primary, features };
}

// ---------------------------------------------------------------------------
// Hands-only view
export class HandView {
  constructor(canvas, opts = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.mask = document.createElement('canvas');
    this.mctx = this.mask.getContext('2d');
    this.zoom = 1; this.cx = 0.5; this.cy = 0.5;
    this.skeleton = opts.skeleton !== false;
    this.color = opts.color || '#6ef2ff';
    this.running = true;
    this.overlay = null; // optional fn(ctx, W, H)
    const tick = () => { if (!this.running) return; this.draw(); this.raf = requestAnimationFrame(tick); };
    this.raf = requestAnimationFrame(tick);
  }
  destroy() { this.running = false; cancelAnimationFrame(this.raf); }

  draw() {
    const { c, ctx } = this;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = c.clientWidth, H = c.clientHeight;
    if (!W || !H) return;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      this.mask.width = c.width; this.mask.height = c.height;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // background
    const bg = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.75);
    bg.addColorStop(0, '#16224d'); bg.addColorStop(1, '#070b1d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(110,242,255,0.06)'; ctx.lineWidth = 1;
    const step = 32;
    ctx.beginPath();
    for (let x = (W / 2) % step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = (H / 2) % step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    const f = latest;
    if (!video || status !== 'on') { this.drawOverlay(W, H); return; }
    const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
    const s = Math.max(W / vw, H / vh), dw = vw * s, dh = vh * s;

    // auto-zoom toward the hands
    let tz = 1, tcx = 0.5, tcy = 0.5;
    if (f && f.hands.length) {
      let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
      for (const h of f.hands) { x0 = Math.min(x0, h.bbox.x0); x1 = Math.max(x1, h.bbox.x1); y0 = Math.min(y0, h.bbox.y0); y1 = Math.max(y1, h.bbox.y1); }
      tcx = (x0 + x1) / 2; tcy = (y0 + y1) / 2;
      tz = Math.max(1, Math.min(2.6, 0.62 * Math.min(W / ((x1 - x0) * dw), H / ((y1 - y0) * dh))));
    }
    const k = 0.12;
    this.zoom += (tz - this.zoom) * k; this.cx += (tcx - this.cx) * k; this.cy += (tcy - this.cy) * k;
    const Z = this.zoom;
    const toPx = (p) => ({ x: W / 2 + (p.x - this.cx) * dw * Z, y: H / 2 + (p.y - this.cy) * dh * Z });

    if (f && f.hands.length) {
      const m = this.mctx;
      m.setTransform(dpr, 0, 0, dpr, 0, 0);
      m.globalCompositeOperation = 'source-over';
      m.clearRect(0, 0, W, H);
      m.fillStyle = '#fff'; m.strokeStyle = '#fff'; m.lineCap = 'round'; m.lineJoin = 'round';
      m.shadowColor = '#fff'; m.shadowBlur = 14;
      for (const h of f.hands) {
        const P = h.img.map(toPx);
        const size = Math.hypot(P[9].x - P[0].x, P[9].y - P[0].y);
        m.lineWidth = size * 0.42;
        for (const ch of CHAINS) { m.beginPath(); m.moveTo(P[ch[1]].x, P[ch[1]].y); for (let i = 2; i < ch.length; i++) m.lineTo(P[ch[i]].x, P[ch[i]].y); m.stroke(); }
        m.beginPath();
        [0, 1, 2, 5, 9, 13, 17].forEach((i, j) => (j ? m.lineTo(P[i].x, P[i].y) : m.moveTo(P[i].x, P[i].y)));
        m.closePath(); m.fill(); m.lineWidth = size * 0.5; m.stroke();
        // a little of the wrist
        m.lineWidth = size * 0.55;
        const wx = P[0].x + (P[0].x - P[9].x) * 0.25, wy = P[0].y + (P[0].y - P[9].y) * 0.25;
        m.beginPath(); m.moveTo(P[0].x, P[0].y); m.lineTo(wx, wy); m.stroke();
      }
      m.shadowBlur = 0;
      m.globalCompositeOperation = 'source-in';
      m.save();
      m.translate(W / 2 - this.cx * dw * Z + dw * Z, H / 2 - this.cy * dh * Z);
      m.scale(-1, 1);
      m.drawImage(video, 0, 0, dw * Z, dh * Z);
      m.restore();
      // glow behind the hands
      ctx.save();
      ctx.shadowColor = this.color; ctx.shadowBlur = 30;
      ctx.drawImage(this.mask, 0, 0, W, H);
      ctx.restore();
      ctx.drawImage(this.mask, 0, 0, W, H);
      if (this.skeleton) for (const h of f.hands) drawSkeleton(ctx, h.img.map(toPx), { color: h === f.primary ? this.color : '#b69bff', width: 2.5 });
    }
    this.drawOverlay(W, H);
  }
  drawOverlay(W, H) { if (this.overlay) this.overlay(this.ctx, W, H); }
}
