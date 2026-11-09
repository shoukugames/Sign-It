// Sign It — camera panel + live sign matching (shared by lessons, quizzes,
// calibration and levels).
import * as camera from './camera.js';
import { scoreSign, stars, similarity, template, motionScore, DIFFICULTY } from './recognizer.js';
import { getShape } from './signs.js';
import { h, ring } from './ui.js';
import { t } from './i18n.js';
import { sfx } from './audio.js';
import { store } from './storage.js';

export class CameraPanel {
  constructor({ title } = {}) {
    this.canvas = h('canvas', { class: 'fill' });
    this.ringC = h('canvas', { class: 'hold-ring' });
    this.fb = h('div', { class: 'feedback' });
    this.bar = h('i');
    const bar = h('div', { class: 'bar' }, this.bar);
    this.ticks = [h('span', { class: 'tick' }), h('span', { class: 'tick' }), h('span', { class: 'tick' })];
    this.ticks.forEach((tk) => bar.append(tk));
    this.lbl = h('div', { class: 'lbl' });
    this.meter = h('div', { class: 'meter' }, bar, this.lbl);
    this.offMsg = h('div', { class: 'cam-off-msg hidden' });
    this.burst = h('div', { class: 'burst hidden' });
    this.body = h('div', { class: 'panel-body' }, this.canvas, this.fb, this.ringC, this.meter, this.offMsg, this.burst);
    this.tag = h('span', { class: 'tag' }, '✋ ' + t('signingSpace'));
    this.el = h('div', { class: 'panel' }, h('div', { class: 'panel-head' }, '📷 ', title || t('camera'), this.tag), this.body);
    this.view = new camera.HandView(this.canvas);
    this.job = null;
    this.unsubStatus = camera.onStatus(() => this.refreshStatus());
    this.unsub = camera.subscribe((f) => this.onFrame(f));
    this.refreshStatus();
    this.setMeter(0, '');
  }
  destroy() { if (this.dead) return; this.dead = true; this.cancel(); this.view.destroy(); this.unsub(); this.unsubStatus(); }

  refreshStatus() {
    const st = camera.getStatus();
    const show = (html) => { this.offMsg.innerHTML = html; this.offMsg.classList.remove('hidden'); };
    if (st === 'on') { this.offMsg.classList.add('hidden'); this.meter.classList.remove('hidden'); return; }
    this.meter.classList.add('hidden');
    if (st === 'starting') show(`<div><div class="spinner"></div>${t('loadingTracker')}</div>`);
    else if (st === 'error') show(`<div><span class="big">⚠️</span>${t('cameraError')}</div>`);
    else show(`<div><span class="big">📷</span>${store.settings.camera ? t('cameraError') : t('cameraNeeded')}</div>`);
  }

  setMeter(score, label, diff = store.settings.difficulty) {
    const d = DIFFICULTY[diff];
    this.bar.style.width = Math.round(Math.max(0, Math.min(1, score)) * 100) + '%';
    [d.star1, d.star2, d.star3].forEach((v, i) => (this.ticks[i].style.left = v * 100 + '%'));
    this.lbl.textContent = label;
  }

  showBurst(n, word) {
    this.burst.innerHTML = '';
    this.burst.append(h('div', {}, h('div', { class: 'stars-big' }, ...[0, 1, 2].map((i) => h('span', { class: 'star' + (i < n ? ' on' : '') }, '★'))), word ? h('div', { class: 'word' }, word) : null));
    this.burst.classList.remove('hidden');
    for (let i = 0; i < n; i++) setTimeout(() => sfx.star(i), 120 + i * 170);
    clearTimeout(this._bt);
    this._bt = setTimeout(() => this.burst.classList.add('hidden'), 1100);
  }

  /**
   * Wait for the player to sign `key`. Resolves:
   * { stars, score, frames, startT, endT, timedOut, cancelled }
   */
  match(lang, key, opts = {}) {
    this.cancel();
    const diff = opts.difficulty || store.settings.difficulty;
    const D = DIFFICULTY[diff];
    const shape = getShape(lang, key);
    const motion = shape && shape.motion;
    return new Promise((resolve) => {
      this.job = {
        lang, key, diff, D, motion, resolve,
        ema: 0, holdStart: null, lastGood: 0, scores: [], frames: [], trail: [],
        started: performance.now(), firstSeen: null,
        released: !opts.requireRelease, releaseFrom: opts.releaseFrom || null,
        timeLimit: opts.timeLimit ? opts.timeLimit * 1000 : null, lastTick: 0
      };
    });
  }
  cancel() {
    if (this.job) { const j = this.job; this.job = null; j.resolve({ stars: 0, score: 0, cancelled: true, frames: [] }); }
    this.ring(0);
    this.fb.innerHTML = '';
  }
  ring(p, label) { ring(this.ringC, p, p >= 1 ? '#5fe3a1' : '#6ef2ff', label); }

  onFrame(f) {
    const j = this.job;
    if (!j) {
      if (f.features && this.freeTarget) this.setMeter(scoreSign(f.features, this.freeTarget.lang, this.freeTarget.key).score, '');
      return;
    }
    const now = performance.now();
    // time limit
    if (j.timeLimit) {
      const left = j.timeLimit - (now - j.started);
      const secs = Math.ceil(left / 1000);
      if (secs <= 3 && secs !== j.lastTick && secs > 0) { j.lastTick = secs; sfx.tick(); }
      if (!j.holdStart) this.ring(1 - (now - j.started) / j.timeLimit, String(Math.max(0, secs)));
      if (left <= 0) { this.finish({ stars: 0, score: j.scores.length ? avg(j.scores) : j.ema, timedOut: true }); return; }
    }
    if (!f.primary || !f.features) {
      this.fb.innerHTML = `<div>✋ ${t('showHand')}</div>`;
      j.ema *= 0.85; j.holdStart = null; j.released = true;
      this.setMeter(j.ema, '', j.diff);
      return;
    }
    if (!j.firstSeen) j.firstSeen = now;
    const r = scoreSign(f.features, j.lang, j.key);
    j.ema = j.ema * 0.6 + r.score * 0.4;
    const s = j.ema;
    // release requirement (double letters): change shape or move first
    if (!j.released) {
      const moved = j.releaseFrom && Math.hypot(f.primary.center.x - j.releaseFrom.x, f.primary.center.y - j.releaseFrom.y) > f.primary.palmImg * 0.45;
      if (s < j.D.star1 * 0.8 || moved) j.released = true;
      else { this.fb.innerHTML = `<div>↔ ${t('holdStill').replace('…', '')} ⤴</div>`; this.setMeter(s, '', j.diff); return; }
    }
    const st = stars(s, j.diff, r.rank);
    this.setMeter(s, st ? '★'.repeat(st) : '', j.diff);
    // coaching tip
    let tip = '';
    if (st < 2) {
      if (r.confusedWith && r.raw < 0.75) tip = t('confusedWith', { x: r.confusedWith });
      else {
        const det = similarity(f.features, template(j.lang, j.key), true).parts;
        const g = (ks) => ks.reduce((a, k) => a + Math.abs(det[k] || 0), 0) / ks.length;
        const thumb = g(['tx', 'ty', 'tz', 'ti', 'tm']), fing = g(['indexM', 'indexP', 'middleM', 'middleP', 'ringM', 'ringP', 'pinkyM', 'pinkyP']), turn = g(['px', 'py', 'nz']);
        tip = turn > fing && turn > thumb ? t('tipTurn') : thumb > fing ? t('tipThumb') : t('tipFingers');
      }
    }
    this.fb.innerHTML = st >= 1 ? `<div>${t('holdStill')}</div>` : `<div>${''}</div>${tip ? `<span class="tip">💡 ${tip}</span>` : ''}`;

    // motion letters track the fingertip path
    if (j.motion) {
      const tipIdx = j.motion === 'J' ? 20 : 8;
      const p = f.primary.img[tipIdx];
      j.trail.push({ x: p.x / f.primary.palmImg, y: -p.y / f.primary.palmImg, t: now });
      while (j.trail.length && now - j.trail[0].t > 1800) j.trail.shift();
    }

    const shapeOk = s >= j.D.star1 * (j.motion ? 0.9 : 1);
    if (shapeOk) {
      if (!j.holdStart) { j.holdStart = now; j.scores = []; j.frames = []; sfx.hold(); }
      j.lastGood = now;
      j.scores.push(r.score);
      j.frames.push({ pts: f.primary.model, t: now, center: f.primary.center });
      if (j.motion) {
        const m = motionScore(j.motion, j.trail);
        this.ring(m / 0.6);
        if (m >= 0.6 && now - j.holdStart > 300) {
          const sc = avg(j.scores) * 0.7 + Math.min(1, m) * 0.3;
          this.finish({ stars: Math.max(1, stars(sc, j.diff, 1)), score: sc, center: f.primary.center, palm: f.primary.palmImg });
        }
      } else {
        const p = (now - j.holdStart) / j.D.hold;
        this.ring(p);
        if (p >= 1) {
          const sc = avg(j.scores.slice(-Math.max(4, Math.floor(j.scores.length * 0.7))));
          this.finish({ stars: Math.max(1, stars(sc, j.diff, r.rank)), score: sc, center: f.primary.center, palm: f.primary.palmImg });
        }
      }
    } else if (j.holdStart && now - j.lastGood > 180) {
      j.holdStart = null; this.ring(0);
    }
  }

  finish(res) {
    const j = this.job;
    if (!j) return;
    this.job = null;
    this.ring(res.stars ? 1 : 0);
    j.resolve({ ...res, frames: j.frames, startT: j.firstSeen || j.started, endT: performance.now(), key: j.key });
  }
}

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
