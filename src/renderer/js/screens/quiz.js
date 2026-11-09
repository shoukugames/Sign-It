// Sign It — quizzes (after lesson 10 and lesson 20).
import { h, btn } from '../ui.js';
import { t } from '../i18n.js';
import { store, timer } from '../storage.js';
import { go } from '../nav.js';
import { sfx, say, sayLetter } from '../audio.js';
import { lessons, QUIZZES, PASS_PCT } from '../curriculum.js';
import { Avatar, LEXICON } from '../avatar.js';
import { getShape } from '../signs.js';
import { synthesize, drawHand, SKIN, VIEW34 } from '../handmodel.js';
import { CameraPanel } from '../practice.js';
import * as camera from '../camera.js';

const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n, not) => shuffle(a.filter((x) => x !== not)).slice(0, n);

function handCanvas(lang, key, size = 150) {
  const c = h('canvas', { style: { width: size + 'px', height: size + 'px' } });
  requestAnimationFrame(() => {
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr; c.height = size * dpr;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    drawHand(x, synthesize(getShape(lang, key).pose), { cx: size / 2, cy: size / 2, scale: size * 0.62, skin: SKIN[store.settings.skin], view: VIEW34 });
  });
  return c;
}

function buildQuestions(lang, id) {
  const cfg = QUIZZES[id];
  const ls = lessons(lang).slice(cfg.lessonsFrom - 1, cfg.lessonsTo);
  const letters = [...new Set(ls.flatMap((l) => l.letters))];
  const signs = [...new Set(ls.flatMap((l) => l.words.map((w) => w.tok)).filter((tk) => !tk.startsWith('#') && LEXICON[tk]))];
  const wordInfo = Object.fromEntries(ls.flatMap((l) => l.words).map((w) => [w.tok, w]));
  const camOn = store.settings.camera && camera.getStatus() !== 'error';
  const qs = [];
  const types = [];
  for (let i = 0; i < cfg.count; i++) types.push(camOn && i % 3 === 2 ? 'signThis' : ['whichLetter', 'whichHand', 'whatSign'][i % 3]);
  for (const type of shuffle(types)) {
    if (type === 'whatSign' && signs.length >= 4) {
      const a = pick(signs, 1)[0];
      const m = (tk) => (lang === 'ja' ? wordInfo[tk].ja : wordInfo[tk].en);
      qs.push({ type, answer: a, choices: shuffle([a, ...pick(signs, 3, a)]), label: m });
    } else if (type === 'whichHand') {
      const a = pick(letters, 1)[0];
      qs.push({ type, answer: a, choices: shuffle([a, ...pick(letters, 3, a)]) });
    } else if (type === 'signThis') {
      qs.push({ type, answer: pick(letters.filter((k) => !getShape(lang, k).motion), 1)[0] });
    } else {
      const a = pick(letters, 1)[0];
      qs.push({ type: 'whichLetter', answer: a, choices: shuffle([a, ...pick(letters, 3, a)]) });
    }
  }
  return qs;
}

export function quizScreen({ id }) {
  const lang = store.settings.lang;
  const tm = timer('quizzes');
  const qs = buildQuestions(lang, id);
  let i = 0, correct = 0, locked = false;

  const qTitle = h('div', { class: 'quiz-q' });
  const stage = h('div', { class: 'panel-body', style: { minHeight: '200px' } });
  const choices = h('div', { class: 'choices' });
  const counter = h('span', { class: 'sub' });
  const left = h('div', { class: 'panel' }, h('div', { class: 'panel-head' }, '★ ', id === 'mid' ? t('quizMid') : t('quizFinal'), h('span', { class: 'tag' }, t('quizIntro'))), qTitle, stage, choices);
  const cam = new CameraPanel({});
  const split = h('div', { class: 'split' }, left, cam.el);
  const el = h('div', { class: 'screen' },
    h('div', { class: 'topbar' }, btn('←', () => go('lessons'), 'ghost icon-btn'), h('h2', {}, id === 'mid' ? t('quizMid') : t('quizFinal'), counter)),
    split);
  let avatar = null;

  function answer(ok, correctLabel, elChoice) {
    if (locked) return;
    locked = true;
    if (ok) { correct++; sfx.correct(); } else sfx.wrong();
    store.recordSign(qs[i].answer, ok);
    if (elChoice) elChoice.classList.add(ok ? 'right' : 'wrong');
    [...choices.children].forEach((c) => { if (c.dataset.k === qs[i].answer) c.classList.add('right'); });
    qTitle.textContent = ok ? '✔ ' + t('correct') : '✖ ' + t('notQuite', { x: correctLabel });
    setTimeout(() => { i++; render(); }, ok ? 1100 : 1900);
  }

  async function render() {
    locked = false;
    if (avatar) { avatar.destroy(); avatar = null; }
    cam.cancel();
    stage.innerHTML = ''; choices.innerHTML = '';
    if (i >= qs.length) return finish();
    counter.textContent = t('question', { n: i + 1, t: qs.length });
    const q = qs[i];
    if (q.type === 'whichLetter') {
      qTitle.textContent = lang === 'ja' ? t('qWhichKana') : t('qWhichLetter');
      stage.append(h('div', { style: { display: 'grid', placeItems: 'center', flex: 1 } }, handCanvas(lang, q.answer, 230)));
      q.choices.forEach((k) => { const c = h('div', { class: 'choice', 'data-k': k, onclick: () => answer(k === q.answer, q.answer, c) }, k); choices.append(c); });
    } else if (q.type === 'whichHand') {
      qTitle.textContent = t('qWhichHand', { x: q.answer });
      stage.style.minHeight = '0';
      q.choices.forEach((k) => { const c = h('div', { class: 'choice', 'data-k': k, onclick: () => answer(k === q.answer, q.answer, c) }, handCanvas(lang, k, 130)); choices.append(c); });
    } else if (q.type === 'whatSign') {
      qTitle.textContent = t('qWhatSign');
      const cv = h('canvas', { class: 'fill' });
      stage.style.minHeight = '260px';
      stage.append(cv, h('div', { style: { position: 'absolute', bottom: '8px', right: '10px' } }, btn('↻', () => avatar && avatar.play([q.answer]), 'ghost small')));
      avatar = new Avatar(cv, { lang, skin: store.settings.skin });
      avatar.play([q.answer]);
      q.choices.forEach((k) => { const c = h('div', { class: 'choice', 'data-k': k, style: { fontSize: '22px' }, onclick: () => answer(k === q.answer, q.label(q.answer), c) }, q.label(k)); choices.append(c); });
    } else {
      qTitle.textContent = t('qSignThis', { x: q.answer });
      stage.append(h('div', { style: { display: 'grid', placeItems: 'center', flex: 1 } }, h('div', { class: 'target-big' }, q.answer)));
      choices.append(btn(t('skip'), () => answer(false, q.answer), 'ghost small'));
      sayLetter(q.answer);
      const r = await cam.match(lang, q.answer, { timeLimit: 20 });
      if (r.cancelled) return;
      if (r.stars) cam.showBurst(r.stars, q.answer);
      answer(r.stars >= 1, q.answer);
    }
  }

  function finish() {
    const pct = Math.round((correct / qs.length) * 100);
    store.recordQuiz(id, pct);
    const pass = pct >= PASS_PCT;
    sfx.fanfare(pass ? 3 : 0);
    say(pass ? 'quiz_pass' : 'quiz_fail', pass ? t('passed') : t('notPassed'));
    if (avatar) avatar.destroy();
    cam.destroy();
    split.replaceWith(h('div', { class: 'result' },
      h('h2', {}, pass ? '🎉 ' + t('passed') : '💪 ' + t('notPassed')),
      h('div', { class: 'stats' },
        h('div', { class: 'stat-card' }, h('div', { class: 'v' }, pct + '%'), h('div', { class: 'k' }, t('score'))),
        h('div', { class: 'stat-card' }, h('div', { class: 'v' }, `${correct}/${qs.length}`), h('div', { class: 'k' }, t('correct'))),
        h('div', { class: 'stat-card' }, h('div', { class: 'v' }, (store.quiz(id).best ?? 0) + '%'), h('div', { class: 'k' }, t('best')))),
      h('p', { style: { color: 'var(--ink2)' } }, t('quizIntro')),
      h('div', { style: { display: 'flex', gap: '14px' } }, btn('↻ ' + t('retry'), () => go('quiz', { id }), 'ghost'), btn(t('lessons'), () => go('lessons'), 'cyan'))));
  }

  setTimeout(render, 60);
  return { el, usesCamera: true, destroy() { tm.stop(); if (avatar) avatar.destroy(); cam.destroy(); } };
}
