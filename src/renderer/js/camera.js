// Sign It — camera + hand tracking.
// * Uses Google MediaPipe Hand Landmarker, fully on-device (no network).
// * The mirrored camera picture is shown live so players can see their signing.
//   It is processed in memory only: nothing is recorded, stored or uploaded,
//   and the app blocks all internet access (see src/main/main.js).
// * stop() releases the camera hardware immediately (the light goes off).
import { extract, applyCalibration } from './recognizer.js';
import { drawSkeleton } from './handmodel.js';
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
// Live mirrored camera view with hand-tracking overlay
export class HandView {
  constructor(canvas, opts = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
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
    const s = Math.min(W / vw, H / vh), dw = vw * s, dh = vh * s; // show the whole frame

    // Full mirrored camera picture (like a mirror), so players can see their whole
    // hand, arm and signing space. Nothing leaves the device.
    ctx.save();
    ctx.translate(W / 2 + dw / 2, H / 2 - dh / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, dw, dh);
    ctx.restore();
    // soft vignette keeps the overlays readable
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(7,11,29,0)'); vg.addColorStop(1, 'rgba(7,11,29,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const toPx = (p) => ({ x: W / 2 + (p.x - 0.5) * dw, y: H / 2 + (p.y - 0.5) * dh });
    if (f && f.hands.length && this.skeleton) {
      for (const h of f.hands) drawSkeleton(ctx, h.img.map(toPx), { color: h === f.primary ? this.color : '#b69bff', width: 2.5 });
    }
    this.drawOverlay(W, H);
  }
  drawOverlay(W, H) { if (this.overlay) this.overlay(this.ctx, W, H); }
}
