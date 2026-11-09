// Sign It — hand calibration.
// Learns: which hand signs, how the camera sees it (mirroring), and the
// player's own open-hand / fist range so finger bending is judged fairly.
import { h, btn, toast } from '../ui.js';
import { t } from '../i18n.js';
import { store } from '../storage.js';
import { go } from '../nav.js';
import { sfx, narrate } from '../audio.js';
import { synthesize, drawHand, SKIN, VIEW34, F } from '../handmodel.js';
import { extract, meanFeatures } from '../recognizer.js';
import { CameraPanel } from '../practice.js';
import * as camera from '../camera.js';

const OPEN = { index: F.S, middle: F.S, ring: F.S, pinky: F.S, splay: { index: -12, middle: 0, ring: 10, pinky: 22 }, thumb: { tip: [-0.40, 0.31, 0.03] } };
const FIST = { index: F.C, middle: F.C, ring: F.C, pinky: F.C, thumb: { tip: [-0.01, 0.31, 0.27] } };

export function calibrationScreen() {
  const lang = store.settings.lang;
  const previous = store.s.calibration;
  let saved = false;
  const info = h('div', { class: 'lesson-info' });
  const ill = h('canvas', { class: 'fill' });
  const status = h('div', { style: { padding: '0 20px 10px', fontWeight: 800, color: 'var(--yellow)', minHeight: '30px' } });
  const actions = h('div', { class: 'panel-foot' });
  const left = h('div', { class: 'panel' }, h('div', { class: 'panel-head' }, '✋ ', t('calibTitle'), h('span', { class: 'tag' }, previous ? '✔ ' + t('calibSaved') : t('calibNeeded'))),
    info, h('div', { class: 'panel-body' }, ill), status, actions);
  const cam = new CameraPanel({});
  const el = h('div', { class: 'screen' }, h('div', { class: 'topbar' }, btn('←', () => go('title'), 'ghost icon-btn'), h('h2', {}, t('calibTitle'))), h('div', { class: 'split' }, left, cam.el));

  let illPose = OPEN, raf = 0;
  const draw = () => {
    const W = ill.clientWidth, H = ill.clientHeight, dpr = window.devicePixelRatio || 1;
    if (W && H) {
      if (ill.width !== Math.round(W * dpr) || ill.height !== Math.round(H * dpr)) { ill.width = Math.round(W * dpr); ill.height = Math.round(H * dpr); }
      const x = ill.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
      if (illPose) drawHand(x, synthesize(illPose), { cx: W / 2, cy: H / 2, scale: Math.min(W, H) * 0.7, skin: SKIN[store.settings.skin], view: { y: VIEW34.y * 0.4, x: 4 }, mirror: store.settings.dominant === 'left' });
    }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  let unsub = null, alive = true;
  const setInfo = (title, text) => { info.innerHTML = ''; info.append(h('h3', {}, title), h('p', {}, text)); };

  function stepIntro() {
    illPose = OPEN;
    setInfo(t('calibTitle'), t('calibIntro'));
    actions.innerHTML = '';
    if (!store.settings.camera) {
      status.textContent = '📷 ' + t('cameraNeeded');
      actions.append(btn(t('back'), () => go('title'), 'ghost'));
      return;
    }
    status.textContent = t('calibDominant');
    actions.append(
      btn('🫲 ' + t('left'), () => { store.set('dominant', 'left'); stepCapture('open'); }, 'cyan'),
      btn('🫱 ' + t('right'), () => { store.set('dominant', 'right'); stepCapture('open'); }, 'green'));
    narrate(t('calibIntro'));
  }

  function stepCapture(which) {
    store.s.calibration = null; // measure raw values
    illPose = which === 'open' ? OPEN : FIST;
    const text = which === 'open' ? t('calibOpen') : t('calibFist');
    setInfo(which === 'open' ? '① ' + t('calibOpen').split(/[,、]/)[0] : '② ' + t('calibFist').split(/[,、]/)[0], text);
    narrate(text);
    actions.innerHTML = '';
    actions.append(btn(t('back'), () => stepIntro(), 'ghost small'));
    const frames = [];
    let goodMs = 0, lastT = 0;
    const NEED_MS = 1500, NEED_N = 6; // time-based, so slow computers calibrate just as easily
    let lastSfx = 0;
    if (unsub) unsub();
    unsub = camera.subscribe((f) => {
      if (!alive) return;
      const p = f.primary;
      if (!p) { status.textContent = '✋ ' + t('showHand'); return; }
      if (p.palmImg < 0.09) { status.textContent = '🔍 ' + t('calibCloser'); return; }
      if (p.palmImg > 0.42) { status.textContent = '↔ ' + t('calibFarther'); return; }
      if (p.conf < 0.5) { status.textContent = '💡 ' + t('calibLight'); return; }
      const raw = extract(p.model);
      const flex = ['index', 'middle', 'ring', 'pinky'].reduce((a, k) => a + raw[k + 'M'] + raw[k + 'P'], 0) / 8;
      const okPose = which === 'open' ? flex < 0.35 : flex > 0.45;
      const now = performance.now(), dt = lastT ? Math.min(1000, now - lastT) : 0;
      lastT = now;
      if (!okPose) { status.textContent = '✋ ' + text; goodMs = Math.max(0, goodMs - dt * 0.5); cam.ring(goodMs / NEED_MS); return; }
      goodMs += dt;
      frames.push({ model: p.model, label: p.label, flipX: p.flipX });
      cam.ring(goodMs / NEED_MS);
      status.textContent = t('holdStill');
      if (performance.now() - lastSfx > 250) { sfx.hold(); lastSfx = performance.now(); }
      if (goodMs >= NEED_MS && frames.length >= NEED_N) {
        unsub(); unsub = null;
        sfx.correct();
        if (which === 'open') { openFrames = frames.slice(); stepCapture('fist'); } else { fistFrames = frames.slice(); computeAndTest(); }
      }
    });
  }

  let openFrames = [], fistFrames = [];
  function computeAndTest() {
    // majority label of the signing hand
    const cnt = {};
    openFrames.forEach((f) => (cnt[f.label] = (cnt[f.label] || 0) + 1));
    const label = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    // palm faced the camera during the open-hand step, so the thumb must be on the LEFT in model space
    const wrong = openFrames.filter((f) => f.model[4][0] > f.model[17][0]).length > openFrames.length / 2;
    const baseFlip = openFrames[0].flipX;
    const flipX = wrong ? !baseFlip : baseFlip;
    const fix = (m, fl) => (fl === flipX ? m : m.map((p) => [-p[0], p[1], p[2]]));
    const open = meanFeatures(openFrames.map((f) => extract(fix(f.model, f.flipX))));
    const fist = meanFeatures(fistFrames.map((f) => extract(fix(f.model, f.flipX))));
    const handSize = openFrames.reduce((a, f) => a + Math.hypot(f.model[9][0] - f.model[0][0], f.model[9][1] - f.model[0][1], f.model[9][2] - f.model[0][2]), 0) / openFrames.length;
    store.setCalibration({ label, flipX, open, fist, handSize, dominant: store.settings.dominant, at: Date.now() });
    saved = true;
    stepTest(lang === 'ja' ? ['け', 'あ'] : ['B', 'A'], 0);
  }

  async function stepTest(keys, k) {
    if (k >= keys.length) return stepDone();
    illPose = null;
    const key = keys[k];
    setInfo('③ ' + t('calibCheck', { x: key }), t('calibCheck', { x: key }));
    status.textContent = '';
    actions.innerHTML = '';
    actions.append(btn(t('skip'), () => { cam.cancel(); stepDone(); }, 'ghost small'));
    const r = await cam.match(lang, key, { difficulty: 'easy', timeLimit: 25 });
    if (!alive || r.cancelled) return;
    cam.showBurst(r.stars, key);
    await new Promise((res) => setTimeout(res, 1200));
    stepTest(keys, k + 1);
  }

  function stepDone() {
    illPose = OPEN;
    info.innerHTML = '';
    info.append(h('div', { class: 'calib-ready' },
      h('div', { class: 'calib-check' }, '✓'),
      h('h3', {}, t('calibReady')),
      h('p', {}, t('calibSaved'))));
    status.textContent = '';
    sfx.fanfare(3);
    narrate(t('calibReady'));
    actions.innerHTML = '';
    actions.append(
      btn('↻ ' + t('recalibrate'), () => stepIntro(), 'ghost small'),
      h('div', { style: { flex: 1 } }),
      btn(t('levels') + ' ▶', () => go('levels'), 'pink'),
      btn('🏁 ' + t('finish'), () => go('title'), 'green', { 'data-finish': '1' }));
    toast('✔ ' + t('calibReady'));
  }

  const onKey = (e) => {
    if ((e.code !== 'Space' && e.key !== ' ') || (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) || document.querySelector('.modal-back')) return;
    const fin = el.querySelector('[data-finish]');
    if (fin) { e.preventDefault(); fin.click(); }
  };
  document.addEventListener('keydown', onKey);
  setTimeout(stepIntro, 60);
  return {
    el, usesCamera: true,
    destroy() {
      alive = false;
      document.removeEventListener('keydown', onKey);
      if (unsub) unsub();
      if (!saved && !store.s.calibration && previous) store.setCalibration(previous); // cancelled: keep the old one
      cancelAnimationFrame(raf); cam.destroy();
    }
  };
}
