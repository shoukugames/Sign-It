// Sign It — entry point.
// Copyright (C) 2026 Shawn Rapaz & Claude Code. GPL-3.0-or-later.
import { store } from './storage.js';
import { onCaption, sfx } from './audio.js';
import * as camera from './camera.js';
import { register, go, resumeIfNeeded, endCameraSession } from './nav.js';
import { t } from './i18n.js';
import { titleScreen } from './screens/title.js';
import { lessonsScreen, lessonScreen } from './screens/lessons.js';
import { quizScreen } from './screens/quiz.js';
import { levelsScreen, levelScreen } from './screens/levels.js';
import { tutorialScreen } from './screens/tutorial.js';
import { calibrationScreen } from './screens/calibration.js';
import { parentsScreen } from './screens/parents.js';
import { creditsScreen } from './screens/credits.js';

// Camera permission never carries over from a previous session.
store.set('camera', false);
store.startSession();
document.documentElement.lang = store.settings.lang;

register('title', titleScreen);
register('lessons', lessonsScreen);
register('lesson', lessonScreen);
register('quiz', quizScreen);
register('levels', levelsScreen);
register('level', levelScreen);
register('tutorial', tutorialScreen);
register('calibrate', calibrationScreen);
register('parents', parentsScreen);
register('credits', creditsScreen);

// ---- captions for every spoken line ----
const cap = document.getElementById('caption');
onCaption((text, show) => {
  if (show) { cap.textContent = text; cap.classList.add('show'); } else cap.classList.remove('show');
});

// ---- camera indicator ----
const ind = document.getElementById('cam-indicator');
camera.onStatus((s) => {
  ind.classList.toggle('hidden', s !== 'on');
  ind.querySelector('.txt').textContent = t('cameraLive');
});

// ---- auto shut-off: hidden window, minimise, close ----
document.addEventListener('visibilitychange', () => {
  if (document.hidden) endCameraSession();
  else resumeIfNeeded();
});
window.addEventListener('pagehide', endCameraSession);
window.addEventListener('beforeunload', endCameraSession);
if (window.signItHost) {
  window.signItHost.onClosing(() => endCameraSession());
  window.signItHost.onHidden(() => endCameraSession());
}

// unlock audio on first interaction
window.addEventListener('pointerdown', () => sfx.setVolume(store.settings.sfx), { once: true });
window.addEventListener('keydown', (e) => {
  if (e.key === 'F11' && window.signItHost) window.signItHost.toggleFullscreen();
});

// ---- animated background ----
(function background() {
  const c = document.getElementById('bg');
  const ctx = c.getContext('2d');
  const glyphsEn = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const glyphsJa = 'あいうえおかきくけさしたにまみむめやよられわ'.split('');
  let W, H, parts = [], blobs = [];
  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize(); addEventListener('resize', resize);
  const colors = ['#6ef2ff', '#ff7eb6', '#ffd166', '#8b7bff', '#5fe3a1'];
  for (let i = 0; i < 26; i++) parts.push(spawn(true));
  for (let i = 0; i < 4; i++) blobs.push({ x: Math.random(), y: Math.random(), r: 0.35 + Math.random() * 0.25, c: colors[i % colors.length], p: Math.random() * 6 });
  function spawn(any) {
    const set = store.settings.lang === 'ja' ? glyphsJa : glyphsEn;
    return { x: Math.random() * W, y: any ? Math.random() * H : H + 40, s: 16 + Math.random() * 34, v: 0.15 + Math.random() * 0.4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.004,
      g: Math.random() < 0.7 ? set[Math.floor(Math.random() * set.length)] : '✦', c: colors[Math.floor(Math.random() * colors.length)], a: 0.05 + Math.random() * 0.12 };
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#060917');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const b of blobs) {
      const x = (b.x + Math.sin(now / 9000 + b.p) * 0.06) * W, y = (b.y + Math.cos(now / 11000 + b.p) * 0.06) * H;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, b.r * Math.max(W, H));
      rg.addColorStop(0, b.c + '2a'); rg.addColorStop(1, b.c + '00');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.y -= p.v; p.r += p.vr;
      if (p.y < -50) parts[i] = spawn(false);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
      ctx.font = `800 ${p.s}px 'M PLUS Rounded 1c', sans-serif`;
      ctx.fillText(p.g, 0, 0);
      ctx.restore();
    }
  }
  requestAnimationFrame(frame);
})();

go('title');
