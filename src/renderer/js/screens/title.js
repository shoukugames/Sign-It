// Sign It — title screen
import { h, btn, starsEl } from '../ui.js';
import { t } from '../i18n.js';
import { store } from '../storage.js';
import { go, refresh, setCameraEnabled } from '../nav.js';
import { sfx } from '../audio.js';
import { LOGO_SVG } from '../logo.js';
import { lessons } from '../curriculum.js';

export const VERSION = '0.1.3';

export function titleScreen() {
  const S = store.settings;
  const L = store.lang();
  const lessonDone = (n) => L.lessons[n]?.done;
  const doneCount = Array.from({ length: 20 }, (_, i) => lessonDone(i + 1)).filter(Boolean).length;
  const starTotal = Array.from({ length: 20 }, (_, i) => L.levels[i + 1]?.best || 0).reduce((a, b) => a + b, 0);

  const seg = (opts, val, onPick, color) => h('div', { class: 'seg', style: { '--c': color } },
    ...opts.map(([v, label]) => h('button', { class: v === val ? 'on' : '', onclick: () => { sfx.toggle(true); onPick(v); } }, label)));

  const camSwitch = h('div', { class: 'switch' + (S.camera ? ' on' : ''), role: 'switch', 'aria-checked': String(S.camera), tabindex: 0 });
  const camLbl = h('span', { class: 'lbl', style: { minWidth: '32px' } }, S.camera ? t('cameraOn') : t('cameraOff'));
  camSwitch.addEventListener('click', async () => {
    const on = await setCameraEnabled(!store.settings.camera);
    camSwitch.classList.toggle('on', on);
    camSwitch.setAttribute('aria-checked', String(on));
    camLbl.textContent = on ? t('cameraOn') : t('cameraOff');
  });

  const lessonCard = h('div', { class: 'mode-card', style: { '--glow': '#6ef2ff' }, onclick: () => { sfx.click(); go('lessons'); } },
    h('h3', {}, '📘 ' + t('lessons')),
    h('p', {}, t('letters') + ' → ' + t('words') + ' → ' + t('sentences')),
    h('div', { class: 'mini-grid' }, ...lessons(S.lang).map((_, i) => h('div', { class: 'mini-dot' + (lessonDone(i + 1) ? ' done' : '') + (i === 9 || i === 19 ? ' quiz' : ''), style: { '--c': '#6ef2ff' }, title: t('lessonN', { n: i + 1 }) }, i + 1))),
    h('div', { class: 'progress' }, t('lessonsProgress', { d: doneCount }), '  ·  ', t('quizMid'), ' ', quizBadge(store.quiz('mid')), '  ', t('quizFinal'), ' ', quizBadge(store.quiz('final'))));

  const levelCard = h('div', { class: 'mode-card', style: { '--glow': '#ff7eb6' }, onclick: () => { sfx.click(); go('levels'); } },
    h('h3', {}, '🎮 ' + t('levels')),
    h('p', {}, `1–5 ${t('levelType1')} · 6–10 ${t('levelType2')} · 11–15 ${t('levelType3')} · 16–20 ${t('levelType4')}`),
    h('div', { class: 'mini-grid' }, ...Array.from({ length: 20 }, (_, i) => {
      const b = L.levels[i + 1]?.best || 0;
      return h('div', { class: 'mini-dot' + (b ? ' done' : ''), style: { '--c': ['', '#ff9f5a', '#ffd166', '#5fe3a1'][b] }, title: t('levelN', { n: i + 1 }) }, b ? '★'.repeat(b) : i + 1);
    })),
    h('div', { class: 'progress' }, '⭐ ', t('levelsProgress', { s: starTotal })));

  const el = h('div', { class: 'screen title-screen' },
    h('div', { class: 'logo' }, h('div', { class: 'logo-mark', html: LOGO_SVG }), h('h1', {}, t('appName'))),
    h('div', { class: 'tagline' }, t('tagline'), ' — ', t('signLangName')),
    h('div', { class: 'all-ages' }, '✔ ', t('allAges')),
    h('div', { class: 'title-main' }, lessonCard, levelCard),
    h('div', { class: 'title-toggles' },
      h('div', { class: 'toggle-group' }, h('span', { class: 'lbl' }, '🌐 ' + t('language')),
        seg([['en', 'English'], ['ja', '日本語']], S.lang, (v) => { store.set('lang', v); document.documentElement.lang = v; refresh(); }, '#8b7bff')),
      h('div', { class: 'toggle-group' }, h('span', { class: 'lbl' }, '📷 ' + t('camera')), camSwitch, camLbl),
      h('div', { class: 'toggle-group' }, h('span', { class: 'lbl' }, '🎚 ' + t('difficulty')),
        seg([['easy', t('easy')], ['medium', t('medium')], ['hard', t('hard')]], S.difficulty, (v) => { store.set('difficulty', v); refresh(); }, '#ef4f97'))),
    h('div', { class: 'title-menu' },
      btn('🧭 ' + t('tutorial'), () => go('tutorial'), 'cyan'),
      btn('✋ ' + t('calibrate'), () => go('calibrate'), 'green'),
      btn('👪 ' + t('parents'), () => go('parents'), 'yellow'),
      btn('🏅 ' + t('credits'), () => go('credits'), 'ghost'),
      window.signItHost ? btn('⏻ ' + t('quit'), () => window.signItHost.quit(), 'ghost') : null),
    h('div', { class: 'title-foot' }, `v${VERSION} · © 2026 Shawn Rapaz & Claude Code · GPL-3.0 · shoukugames.org`)
  );
  return { el };
}

function quizBadge(q) {
  if (q.best == null) return h('span', { class: 'badge na' }, '—');
  return h('span', { class: 'badge ' + (q.best >= 70 ? 'ok' : 'no') }, q.best + '%');
}
export { starsEl };
