// Sign It — lesson list and lesson player.
import { h, btn, toast, autoContinue } from '../ui.js';
import { t } from '../i18n.js';
import { store, timer } from '../storage.js';
import { go } from '../nav.js';
import { sfx, narrate, sayLetter, sayWords, sayLetterHowTo, isSpeaking } from '../audio.js';
import { lessons, PASS_PCT } from '../curriculum.js';
import { Avatar, LEXICON, signTemplates } from '../avatar.js';
import { getShape } from '../signs.js';
import { synthesize } from '../handmodel.js';
import { HandViewer } from '../handviewer.js';
import { CameraPanel } from '../practice.js';
import * as camera from '../camera.js';

export const spokenWord = (s) => s.replace(/\s*[（(].*?[)）]/g, '');

export function lessonUnlocked(n) {
  if (store.settings.unlockAll || n === 1) return true;
  const L = store.lang();
  if (!L.lessons[n - 1]?.done) return false;
  if (n >= 11 && (store.quiz('mid').best ?? 0) < PASS_PCT) return false;
  return true;
}
export function quizUnlocked(id) {
  if (store.settings.unlockAll) return true;
  return !!store.lang().lessons[id === 'mid' ? 10 : 20]?.done;
}

export function lessonsScreen() {
  const lang = store.settings.lang;
  const list = lessons(lang);
  const grid = h('div', { class: 'item-grid' });
  const quizItem = (id) => {
    const q = store.quiz(id), un = quizUnlocked(id);
    return h('div', { class: 'item quiz-item' + (un ? '' : ' locked'), onclick: () => { if (!un) { sfx.wrong(); toast(t('needLesson')); return; } sfx.click(); go('quiz', { id }); } },
      h('div', { class: 'num' }, '★ ' + (id === 'mid' ? t('quizMid') : t('quizFinal'))),
      h('div', { class: 'name' }, id === 'mid' ? `${t('lessonN', { n: 1 })}–10` : `${t('lessonN', { n: 1 })}–20`),
      h('div', { class: 'chips' }, q.best == null ? h('span', { class: 'badge na' }, t('pNotTaken')) : h('span', { class: 'badge ' + (q.best >= PASS_PCT ? 'ok' : 'no') }, `${t('best')} ${q.best}%`)));
  };
  list.forEach((ls, i) => {
    const n = i + 1, un = lessonUnlocked(n), done = store.lang().lessons[n]?.done;
    grid.append(h('div', {
      class: 'item' + (un ? '' : ' locked') + (done ? ' done' : ''),
      onclick: () => {
        if (!un) { sfx.wrong(); toast(n === 11 ? t('needQuiz') : t('needLesson')); return; }
        sfx.click(); go('lesson', { n });
      }
    },
    h('div', { class: 'num' }, t('lessonN', { n })),
    h('div', { class: 'name' }, ls.title[lang === 'ja' ? 1 : 0]),
    h('div', { class: 'chips' }, ...ls.letters.map((l) => h('span', { class: 'chip' }, l)))));
    if (n === 10) grid.append(quizItem('mid'));
  });
  grid.append(quizItem('final'));
  const el = h('div', { class: 'screen' },
    h('div', { class: 'topbar' }, btn('←', () => go('title'), 'ghost icon-btn'), h('h2', {}, '📘 ' + t('lessons'), h('span', { class: 'sub' }, t('signLangName')))),
    h('div', { class: 'grid-wrap' }, grid));
  return { el };
}

// ---------------------------------------------------------------------------
// Lesson player. Hands-free: with "Auto next" on, a correct sign (or the end of
// a demo) moves to the next part automatically, so the player never has to
// reach for the keyboard while signing. A coach tells the player exactly which
// finger, thumb or palm direction to fix, highlights it on the 3D hand and
// says it out loud.
export function lessonScreen({ n }) {
  const lang = store.settings.lang;
  const J = lang === 'ja' ? 1 : 0;
  const ls = lessons(lang)[n - 1];
  const tm = timer('lessons', 'lesson', n);
  store.lesson(n).attempts++;

  const steps = [
    ...ls.letters.map((k) => ({ kind: 'letter', key: k })),
    ...ls.words.map((w) => ({ kind: 'word', w })),
    { kind: 'sentence', s: ls.sentence }
  ];
  let idx = 0;
  let stepTok = 0;          // bumps whenever the step changes → cancels running flows
  let cancelAuto = null;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const auto = () => store.settings.autoAdvance !== false;

  // ---- layout ----
  const stepsBar = h('div', { class: 'steps' }, ...steps.map(() => h('i')));
  const partLbl = h('span', { class: 'sub' });
  const avatarCanvas = h('canvas', { class: 'fill' });
  const handCanvas = h('canvas', { class: 'fill' });
  const stage = h('div', { class: 'panel-body', style: { minHeight: '240px' } }, avatarCanvas, handCanvas);
  const info = h('div', { class: 'lesson-info' });
  const extra = h('div', {});
  const coachTip = h('div', { class: 'coach-tip' });
  const chip = (label) => h('span', { class: 'cchip' }, label);
  const chips = { fingers: chip(t('fingersOk')), thumb: chip(t('thumbOk')), palm: chip(t('palmOk')) };
  const coach = h('div', { class: 'coach hidden' }, h('div', { class: 'coach-title' }, '🧑‍🏫 ' + t('guideTitle')), coachTip, h('div', { class: 'chips' }, chips.palm, chips.fingers, chips.thumb));
  const prevB = btn('◀ ' + t('prev'), () => show(idx - 1), 'ghost small');
  const againB = btn('↻ ' + t('watchAgain'), () => show(idx, true), 'ghost small');
  const nextB = btn(t('next') + ' ▶', () => next(), 'green');
  const left = h('div', { class: 'panel' },
    h('div', { class: 'panel-head' }, '🎓 ', t('lessonN', { n }), ' · ', ls.title[J], h('span', { class: 'tag' }, t('mirrorNote'))),
    stage, info, coach, extra,
    h('div', { class: 'panel-foot' }, prevB, againB, h('div', { style: { flex: 1 } }), h('span', { class: 'kbd-hint' }, t('pressSpace')), nextB));
  const cam = new CameraPanel({ title: t('tryWithCamera') });
  const avatar = new Avatar(avatarCanvas, { lang, skin: store.settings.skin });
  const viewer = new HandViewer(handCanvas, { scale: 0.74 });

  const autoSw = h('div', { class: 'switch' + (auto() ? ' on' : ''), role: 'switch' });
  autoSw.addEventListener('click', () => {
    store.set('autoAdvance', !auto());
    autoSw.classList.toggle('on', auto());
    sfx.toggle(auto());
    if (!auto()) clearCountdown();
  });
  const split = h('div', { class: 'split' }, left, cam.el);
  const el = h('div', { class: 'screen' },
    h('div', { class: 'topbar' }, btn('←', () => go('lessons'), 'ghost icon-btn'), h('h2', {}, ls.title[J], partLbl),
      h('label', { class: 'auto-toggle' }, autoSw, t('autoAdvance')), stepsBar),
    split);

  // ---- countdown to the next step (hands-free) ----
  let cdTimer = 0;
  function clearCountdown() { clearTimeout(cdTimer); nextB.textContent = idx === steps.length - 1 ? '✓ ' + t('done') : t('next') + ' ▶'; }
  function scheduleNext(secs) {
    if (!auto()) { nextB.classList.add('pulse'); return; }
    const my = stepTok;
    let left = secs;
    const tick = () => {
      if (my !== stepTok || !auto()) return;
      if (left <= 0) { next(); return; }
      nextB.textContent = t('nextIn', { s: left });
      left--;
      cdTimer = setTimeout(tick, 1000);
    };
    tick();
  }

  // ---- coach ----
  let coachOn = false, lastTipId = '', tipSince = 0, lastSpoken = 0, lastNoHand = 0;
  cam.onGuide = (g) => {
    if (!coachOn) return;
    coachTip.textContent = g.text || '';
    coach.querySelector('.chips').classList.remove('hidden');
    coachTip.classList.toggle('ok', !g.tip && !g.noHand);
    for (const k of ['fingers', 'thumb', 'palm']) chips[k].classList.toggle('ok', !!(g.status && g.status[k]));
    viewer.highlight = g.tip && g.tip.finger ? [g.tip.finger] : [];
    // say the tip out loud when it stays the same for a moment (not every frame)
    const now = performance.now();
    const id = g.noHand ? 'nohand' : g.tip ? g.tip.key + (g.tip.f || '') : '';
    if (id !== lastTipId) { lastTipId = id; tipSince = now; }
    if (isSpeaking() || !id) return;
    if (g.noHand) { if (now - tipSince > 2500 && now - lastNoHand > 9000) { lastNoHand = now; narrate(g.text); } return; }
    if (now - tipSince > 1300 && now - lastSpoken > 5000) { lastSpoken = now; narrate(g.text); }
  };
  function setCoach(on) {
    coachOn = on;
    coach.classList.toggle('hidden', !on);
    const camWanted = camera.isOn() || store.settings.camera;
    coachTip.textContent = camWanted ? t('practiceHint') : t('cameraNeeded');
    coach.querySelector('.chips').classList.toggle('hidden', !camera.isOn());
    viewer.highlight = [];
    lastTipId = ''; lastSpoken = performance.now();
  }

  // ---- step flows ----
  // Lessons are for learning: they use Easy recognition, and if a player keeps
  // trying for a long while the lesson still moves on, so nobody gets stuck.
  const LEARN = { difficulty: 'easy', giveUpAfter: 30000 };

  async function praise(r, label) {
    if (r.gaveUp) { coachTip.textContent = '👍 ' + t('goodEffort'); narrate(t('goodEffort')); return; }
    cam.showBurst(Math.max(1, r.stars), label);
    sfx.correct();
    viewer.highlight = [];
    coachTip.textContent = '🎉 ' + t('greatSign');
    coachTip.classList.add('ok');
    narrate(t('greatSign'));
  }

  async function letterFlow(my, key) {
    const sh = getShape(lang, key);
    const speech = sayLetterHowTo(key, sh[lang === 'ja' ? 'ja' : 'en']);
    if (!store.settings.camera) { await speech; if (my === stepTok) scheduleNext(10); return; }
    // start watching the hand right away: a player who already knows the sign can go straight on
    const r = await matchWhenReady(my, () => cam.match(lang, key, LEARN));
    if (!r) return;
    for (let k = 0; k < 30 && isSpeaking(); k++) await sleep(100); // let the instruction finish (max 3 s)
    store.recordSign(key, r.stars > 0);
    await praise(r, key);
    scheduleNext(2);
  }

  /** Waits for the camera, then runs one match; null if the step changed. */
  async function matchWhenReady(my, run) {
    while (my === stepTok && !camera.isOn()) await sleep(400);
    if (my !== stepTok) return null;
    const r = await run();
    return my !== stepTok || r.cancelled ? null : r;
  }

  async function spellFlow(my, word, rowEl) {
    const chars = Array.from(word);
    const boxes = chars.map((c) => h('div', { class: 'ltr' }, c));
    rowEl.innerHTML = ''; boxes.forEach((b) => rowEl.append(b));
    let prev = null;
    for (let i = 0; i < chars.length; i++) {
      if (my !== stepTok) return false;
      boxes.forEach((b, k) => b.classList.toggle('cur', k === i));
      viewer.set(synthesize(getShape(lang, chars[i]).pose));
      const same = i > 0 && chars[i - 1] === chars[i];
      const r = await matchWhenReady(my, () => cam.match(lang, chars[i], { ...LEARN, giveUpAfter: 25000, requireRelease: same, releaseFrom: same ? prev?.center : null }));
      if (!r) return false;
      store.recordSign(chars[i], r.stars > 0);
      prev = r;
      boxes[i].classList.remove('cur'); boxes[i].classList.add(r.stars > 0 ? 'ok' : 'miss');
      sayLetter(chars[i], { captionHold: 300 });
      if (r.stars > 0) sfx.star(Math.min(2, r.stars - 1));
    }
    return true;
  }

  /** The player copies a whole-word sign: Miko's key handshape (any angle) plus movement. */
  async function copySign(my, tok) {
    const custom = signTemplates(tok, lang);
    if (!custom) return { stars: 1 };
    viewer.set(null);
    return matchWhenReady(my, () => cam.match(lang, tok, { ...LEARN, giveUpAfter: 25000, custom }));
  }

  async function wordFlow(my, w) {
    const tok = w.tok, spelled = tok.startsWith('#');
    const word = spelled ? tok.slice(1) : (LEXICON[tok]?.mouth || tok);
    if (spelled) {
      avatar.onLetter = (ch) => sayLetter(ch, { captionHold: 300 });
      const ok = await avatar.play([tok]);
      avatar.onLetter = null;
      if (!ok || my !== stepTok) return;
      await sayWords(word);
      if (my !== stepTok) return;
      if (!camera.isOn()) { await avatar.play([tok]); if (my === stepTok) scheduleNext(4); return; }
      // the player now fingerspells the word with the camera, letter by letter
      const rowEl = h('div', { class: 'word-row' });
      extra.prepend(rowEl);
      handCanvas.classList.remove('hidden'); avatarCanvas.classList.add('hidden');
      setCoach(true);
      await narrate(t('signTheWord'));
      if (my !== stepTok) return;
      const done = await spellFlow(my, word, rowEl);
      if (!done || my !== stepTok) return;
      cam.showBurst(3, word);
      sfx.correct();
      await sayWords(word);
      if (my === stepTok) scheduleNext(2);
    } else {
      sayWords(word, { caption: `${word} — ${lang === 'ja' ? w.ja : w.en}` });
      const ok = await avatar.play([tok]);
      if (!ok || my !== stepTok) return;
      if (!camera.isOn()) { await avatar.play([tok]); if (my === stepTok) scheduleNext(4); return; }
      // now the player copies the sign; Miko keeps showing it
      setCoach(true);
      await narrate(t('copyMiko'));
      if (my !== stepTok) return;
      let looping = true;
      (async () => { while (looping && my === stepTok) { if (!(await avatar.play([tok]))) break; await sleep(600); } })();
      const r = await copySign(my, tok);
      looping = false;
      if (!r) return;
      store.recordSign(tok, r.stars > 0);
      await praise(r, lang === 'ja' ? w.ja : w.en);
      if (my === stepTok) scheduleNext(2);
    }
  }

  async function sentenceFlow(my, s, gloss) {
    const spoken = s.toks.map((tk) => (tk.startsWith('#') ? tk.slice(1) : (LEXICON[tk]?.mouth || tk))).join(' ');
    sayWords(spoken, { caption: lang === 'ja' ? s.ja : s.en, captionHold: 2500 });
    const demo = async () => {
      for (let k = 0; k < s.toks.length; k++) {
        if (my !== stepTok) return false;
        [...gloss.children].forEach((g, j) => g.classList.toggle('on', j === k));
        if (!(await avatar.play([s.toks[k]]))) return false;
      }
      [...gloss.children].forEach((g) => g.classList.remove('on'));
      return true;
    };
    if (!(await demo()) || my !== stepTok) return;
    if (!camera.isOn()) { await sleep(700); if (await demo()) scheduleNext(5); return; }
    // now the player signs the sentence, one word at a time
    setCoach(true);
    await narrate(t('copyMiko'));
    for (let k = 0; k < s.toks.length; k++) {
      if (my !== stepTok) return;
      const tk = s.toks[k];
      [...gloss.children].forEach((g, j) => { g.classList.toggle('on', j === k); });
      let ok = true;
      if (tk.startsWith('#')) {
        const rowEl = h('div', { class: 'word-row' });
        extra.prepend(rowEl);
        handCanvas.classList.remove('hidden'); avatarCanvas.classList.add('hidden');
        ok = await spellFlow(my, tk.slice(1), rowEl);
        rowEl.remove();
        handCanvas.classList.add('hidden'); avatarCanvas.classList.remove('hidden');
      } else {
        avatar.play([tk]);
        const r = await copySign(my, tk);
        ok = !!r;
        if (r) { store.recordSign(tk, r.stars > 0); if (r.stars > 0) sfx.star(Math.min(2, r.stars - 1)); }
      }
      if (!ok || my !== stepTok) return;
      gloss.children[k].classList.add('done-tok');
    }
    [...gloss.children].forEach((g) => g.classList.remove('on'));
    cam.showBurst(3, lang === 'ja' ? s.ja : s.en);
    sfx.correct();
    narrate(t('greatSign'));
    if (my === stepTok) scheduleNext(3);
  }

  function show(i, replay = false) {
    if (i < 0 || i >= steps.length) return;
    idx = i;
    const my = ++stepTok;
    clearCountdown();
    cam.cancel(); avatar.onLetter = null; nextB.classList.remove('pulse');
    setCoach(false);
    [...stepsBar.children].forEach((d, k) => (d.className = k < i ? 'done' : k === i ? 'on' : ''));
    prevB.disabled = i === 0;
    const st = steps[i];
    info.innerHTML = ''; extra.innerHTML = '';
    if (st.kind === 'letter') {
      partLbl.textContent = t('partLetters');
      const sh = getShape(lang, st.key);
      viewer.set(synthesize(sh.pose));
      handCanvas.classList.remove('hidden'); avatarCanvas.classList.add('hidden');
      info.append(h('h3', {}, h('span', { style: { fontSize: '44px', marginRight: '12px', color: 'var(--cyan)' } }, st.key), t('letters')), h('p', {}, sh[lang === 'ja' ? 'ja' : 'en']));
      if (sh.motion) info.append(h('p', { style: { color: 'var(--yellow)' } }, '↯ ' + (lang === 'ja' ? '動きのある文字です' : 'This letter moves!')));
      setCoach(true);
      letterFlow(my, st.key);
    } else {
      viewer.set(null);
      handCanvas.classList.add('hidden'); avatarCanvas.classList.remove('hidden');
      if (st.kind === 'word') {
        partLbl.textContent = t('partWords');
        const tok = st.w.tok, spelled = tok.startsWith('#');
        const word = spelled ? tok.slice(1) : (LEXICON[tok]?.mouth || tok);
        info.append(h('h3', {}, spelled ? word : (lang === 'ja' ? st.w.ja : st.w.en.toUpperCase())),
          h('p', {}, `${spelled ? '🔤 ' + t('fingerspelled') : '🤟 ' + t('sign')} · ${t('meaning')}: ${lang === 'ja' ? st.w.ja : st.w.en}`));
        extra.append(h('div', { class: 'mouth-tip' }, '👄 ' + t('mouthIt', { w: spelled ? word.toLowerCase() : word })));
        wordFlow(my, st.w);
      } else {
        partLbl.textContent = t('partSentence');
        const s = st.s;
        const gloss = h('div', { class: 'gloss' }, ...s.toks.map((tk) => h('span', {}, tk.startsWith('#') ? tk.slice(1).split('').join('-') : (LEXICON[tk] ? (lang === 'ja' ? tk : tk.replace('_', '-')) : tk))));
        info.append(h('h3', {}, lang === 'ja' ? s.ja : s.en), h('p', {}, lang === 'ja' ? s.en : s.ja));
        extra.append(gloss, h('div', { class: 'mouth-tip' }, '👄 ' + t('mouthIt', { w: lang === 'ja' ? s.ja : s.en })));
        sentenceFlow(my, s, gloss);
      }
    }
    clearCountdown();
    if (!replay) sfx.click();
  }

  function next() {
    if (idx < steps.length - 1) { show(idx + 1); return; }
    // lesson finished
    stepTok++; clearCountdown(); cam.cancel();
    const first = !store.lang().lessons[n]?.done;
    store.completeLesson(n);
    sfx.fanfare(3);
    narrate(t('lessonComplete'));
    const autoBox = h('div', { class: 'auto-box' });
    const quizNext = n === 10 || n === 20;
    const nextLesson = !quizNext && n < 20 && lessonUnlocked(n + 1);
    split.replaceWith(h('div', { class: 'result' },
      h('div', { class: 'stars-big' }, h('span', { class: 'star on' }, '★'), h('span', { class: 'star on' }, '★'), h('span', { class: 'star on' }, '★')),
      h('h2', {}, t('lessonComplete')),
      h('p', { style: { color: 'var(--ink2)', fontSize: '20px' } }, ls.title[J]),
      h('div', { style: { display: 'flex', gap: '14px' } },
        btn('↻ ' + t('retry'), () => go('lesson', { n }), 'ghost'),
        quizNext ? btn('★ ' + (n === 10 ? t('quizMid') : t('quizFinal')), () => go('quiz', { id: n === 10 ? 'mid' : 'final' }), 'yellow')
          : nextLesson ? btn(t('lessonN', { n: n + 1 }) + ' ▶', () => go('lesson', { n: n + 1 }), 'green') : null,
        btn(t('lessons'), () => go('lessons'), 'cyan')),
      autoBox));
    if (first && quizNext) { sfx.unlock(); toast('★ ' + t('quizUnlocked')); }
    if (auto() && (quizNext || nextLesson)) {
      cancelAuto = autoContinue(autoBox, () => (quizNext ? go('quiz', { id: n === 10 ? 'mid' : 'final' }) : go('lesson', { n: n + 1 })), 8);
    }
  }

  // Space bar presses Next (handy when the other hand is busy signing)
  const onKey = (e) => {
    if (e.code !== 'Space' && e.key !== ' ') return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (document.querySelector('.modal-back')) return;
    e.preventDefault();
    if (e.repeat) return;
    const resultNext = el.querySelector('.result .btn.green, .result .btn.yellow');
    if (resultNext) resultNext.click(); else next();
  };
  document.addEventListener('keydown', onKey);
  setTimeout(() => show(0, true), 60);
  return {
    el, usesCamera: true,
    destroy() { stepTok++; document.removeEventListener('keydown', onKey); clearTimeout(cdTimer); if (cancelAuto) cancelAuto(); tm.stop(); cam.destroy(); avatar.destroy(); viewer.destroy(); }
  };
}
