// Sign It — interactive 3D reference hand.
// Drag with the mouse (or a finger on a touch screen) to turn the hand in any
// direction, scroll / pinch to zoom, double-click to reset. When nobody is
// touching it, it gently sways so the 3D shape is easy to read.
import { drawHand, SKIN } from './handmodel.js';
import { store } from './storage.js';
import { t } from './i18n.js';

const HOME = { yaw: -22, pitch: 8 };

export class HandViewer {
  constructor(canvas, opts = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.pts = null;
    this.letter = null;          // optional big letter shown when no hand is set
    this.highlight = [];
    this.scaleK = opts.scale || 0.72;
    this.yaw = HOME.yaw; this.pitch = HOME.pitch; this.zoom = 1;
    this.lastTouch = -1e9;
    this.showHint = opts.hint !== false;
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';
    let drag = null;
    const pointers = new Map();
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      drag = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      this.lastTouch = performance.now();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) { // pinch zoom
        const [a, b] = [...pointers.values()];
        const others = [...pointers.entries()].find(([id]) => id !== e.pointerId)[1];
        const before = Math.hypot(prev.x - others.x, prev.y - others.y), after = Math.hypot(a.x - b.x, a.y - b.y);
        if (before > 0) this.zoom = Math.max(0.6, Math.min(1.9, this.zoom * (after / before)));
      } else if (drag) {
        this.yaw += (e.clientX - drag.x) * 0.6;
        this.pitch += (e.clientY - drag.y) * 0.6;
        drag = { x: e.clientX, y: e.clientY };
      }
      this.lastTouch = performance.now();
    });
    const up = (e) => { pointers.delete(e.pointerId); if (!pointers.size) { drag = null; canvas.style.cursor = 'grab'; } };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom = Math.max(0.6, Math.min(1.9, this.zoom * (e.deltaY < 0 ? 1.08 : 0.93))); this.lastTouch = performance.now(); }, { passive: false });
    canvas.addEventListener('dblclick', () => this.reset());
    this.running = true;
    const loop = () => { if (!this.running) return; this.draw(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  destroy() { this.running = false; cancelAnimationFrame(this.raf); }
  reset() { this.yaw = HOME.yaw; this.pitch = HOME.pitch; this.zoom = 1; this.lastTouch = -1e9; }
  set(pts) { this.pts = pts; this.letter = null; }

  draw() {
    const c = this.c, W = c.clientWidth, H = c.clientHeight, dpr = window.devicePixelRatio || 1;
    if (!W || !H) return;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const x = this.ctx;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    const now = performance.now();
    if (this.pts) {
      const idle = now - this.lastTouch > 3500;
      const sway = idle ? Math.sin(now / 1100) * 10 : 0;
      drawHand(x, this.pts, {
        cx: W / 2, cy: H / 2 - 8, scale: Math.min(W, H) * this.scaleK * this.zoom,
        skin: SKIN[store.settings.skin] || SKIN.light,
        orbit: { yaw: this.yaw + sway, pitch: this.pitch },
        highlight: this.highlight
      });
      if (this.showHint && H > 160) {
        x.font = `600 12px 'M PLUS Rounded 1c', sans-serif`;
        x.textAlign = 'center'; x.textBaseline = 'bottom';
        x.fillStyle = 'rgba(184,193,236,0.75)';
        x.fillText('🖱 ' + t('rotateHint'), W / 2, H - 6);
      }
    } else if (this.letter) {
      const k = 1 + Math.sin(now / 500) * 0.03;
      x.font = `800 ${Math.round(Math.min(W, H) * 0.5 * k)}px 'M PLUS Rounded 1c', sans-serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(110,242,255,0.18)'; x.fillText(this.letter, W / 2, H / 2 + 6);
      x.fillStyle = 'rgba(255,255,255,0.85)'; x.fillText(this.letter, W / 2, H / 2);
    }
  }
}
