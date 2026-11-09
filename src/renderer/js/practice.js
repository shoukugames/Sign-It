// Sign It — camera panel + live sign matching (shared by lessons, quizzes,
// calibration and levels).
import * as camera from './camera.js';
import { scoreSign, stars, template, motionScore, guide, shapeSimilarity, DIFFICULTY } from './recognizer.js';
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
    this.tag = h('span', { class: 'tag private' }, '🔒 ' + t('privacyTag'));
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
        timeLimit: opts.timeLimit ? opts.timeLimit * 1000 : null, lastTick: 0,
        lastSeen: 0, seenMs: 0, giveUpAfter: opts.giveUpAfter || 0,
        custom: opts.custom || null, path: [], moved: 0
      };
    });
  }
  cancel() {
    if (this.job) { const j = this.job; this.job = null; j.resolve({ stars: 0, score: 0, cancelled: true, frames: [] }); }
    this.ring(0);
    this.fb.innerHTML = '';
    this.setMeter(0, '');
  }
  ring(p, label) { ring(this.ringC, p, p >= 1 ? '#5fe3a1' : '#6ef2ff', label); }

  onFrame(f) {
    const j = this.job;
    if (!j) {
      if (f.features && this.freeTarget) this.setMeter(scoreSign(f.features, this.freeTarget.lang, this.freeTarget.key).score, '');
      return;
    }
    const now = performance.now();
    if (window.__signitDebug) window.__signitDebug.job = { key: j.key, seenMs: Math.round(j.seenMs), giveUpAfter: j.giveUpAfter, custom: !!j.custom, needMove: !!(j.custom && j.custom.needMove), moved: +j.moved.toFixed(2), ema: +j.ema.toFixed(2), hold: !!j.holdStart, released: j.released };
    // time limit
    if (j.timeLimit) {
      const left = j.timeLimit - (now - j.started);
      const secs = Math.ceil(left / 1000);
      if (secs <= 3 && secs !== j.lastTick && secs > 0) { j.lastTick = secs; sfx.tick(); }
      if (!j.holdStart) this.ring(1 - (now - j.started) / j.timeLimit, String(Math.max(0, secs)));
      if (left <= 0) { this.finish({ stars: 0, score: j.scores.length ? avg(j.scores) : j.ema, timedOut: true }); return; }
    }
    if (!f.primary || !f.features) {
      // the tracker often drops a frame or two during fast moves: wait a moment before reacting
      if (now - j.lastSeen < 450) return;
      this.fb.innerHTML = `<div>✋ ${t('showHand')}</div>`;
      if (this.onGuide) this.onGuide({ tip: null, text: t('showHand'), noHand: true, status: null, stars: 0, tips: [] });
      j.ema *= 0.85; j.holdStart = null; j.released = true; j.path = [];
      this.setMeter(j.ema, '', j.diff);
      return;
    }
    if (!j.firstSeen) j.firstSeen = now;
    if (j.lastSeen) j.seenMs += Math.min(1000, now - j.lastSeen); // real time with the hand in view (works at any frame rate)
    j.lastSeen = now;
    // lessons never leave a player stuck: after a good long try, move on
    if (j.giveUpAfter && j.seenMs > j.giveUpAfter) { this.finish({ stars: 0, score: j.ema, gaveUp: true }); return; }
    // movement (for whole-word signs): wrist path in palm lengths over the last 2.5 s
    const w = f.primary.img[0];
    j.path.push({ x: w.x / f.primary.palmImg, y: w.y / f.primary.palmImg, t: now });
    while (j.path.length && now - j.path[0].t > 2500) j.path.shift();
    for (let i = 1, d = 0; i < j.path.length; i++) { d += Math.hypot(j.path[i].x - j.path[i - 1].x, j.path[i].y - j.path[i - 1].y); if (i === j.path.length - 1) j.moved = Math.max(j.moved, d); }
    const r = j.custom ? customScore(f.features, j.custom) : scoreSign(f.features, j.lang, j.key);
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
    const far = f.primary.palmImg < 0.07, near = f.primary.palmImg > 0.5;
    // coaching: tell the player exactly which finger / thumb / palm to fix
    const g = guide(f.features, r.used || template(j.lang, j.key));
    if (j.custom) g.tips = g.tips.filter((x) => x.cat !== 'palm'); // word signs: any angle is fine
    const top = st >= 2 ? null : g.tips[0] || null;
    let tipText = top ? t(top.key, top.f ? { f: t(top.f) } : undefined) : (st >= 1 ? t('looksRight') : '');
    if (st < 1 && (far || near)) tipText = t(far ? 'calibCloser' : 'calibFarther');
    if (j.custom && st >= 1 && j.custom.needMove && j.moved < 0.8) tipText = t('moveLikeMiko');
    this.fb.innerHTML = st >= 1 && !(j.custom && j.custom.needMove && j.moved < 0.8) ? `<div>✅ ${t('holdStill')}</div>` : (tipText ? `<span class="tip">💡 ${tipText}</span>` : '');
    if (this.onGuide) this.onGuide({ tip: (far || near) ? { key: far ? 'calibCloser' : 'calibFarther' } : top, text: tipText, status: g.status, stars: st, tips: g.tips });

    // motion letters track the fingertip path
    if (j.motion) {
      const tipIdx = j.motion === 'J' ? 20 : 8;
      const p = f.primary.img[tipIdx];
      j.trail.push({ x: p.x / f.primary.palmImg, y: -p.y / f.primary.palmImg, t: now });
      while (j.trail.length && now - j.trail[0].t > 1800) j.trail.shift();
    }

    // a hold only counts when the sign really earns a star (look-alike letters are checked too)
    const shapeOk = j.motion ? s >= j.D.star1 * 0.9 : st >= 1;
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
        const moveOk = !j.custom || !j.custom.needMove || j.moved >= 0.8;
        this.ring(moveOk ? p : Math.min(p, 0.95));
        if (p >= 1 && moveOk) {
          const sc = avg(j.scores.slice(-Math.max(4, Math.floor(j.scores.length * 0.7))));
          this.finish({ stars: Math.max(1, stars(sc, j.diff, 1)), score: sc, center: f.primary.center, palm: f.primary.palmImg });
        }
      }
    } else if (j.holdStart && now - j.lastGood > 260) {
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

/** Whole-word signs: best handshape match over the sign's key shapes, at any angle. */
function customScore(f, custom) {
  let best = 0, used = custom.templates[0];
  for (const tp of custom.templates) { const s = shapeSimilarity(f, tp); if (s > best) { best = s; used = tp; } }
  return { score: best, raw: best, rank: 1, used };
}
