// Sign It — lesson list and lesson player.
import { h, btn, toast } from '../ui.js';
import { t } from '../i18n.js';
import { store, timer } from '../storage.js';
import { go } from '../nav.js';
import { sfx, say } from '../audio.js';
import { lessons, PASS_PCT } from '../curriculum.js';
import { Avatar, LEXICON } from '../avatar.js';
import { getShape } from '../signs.js';
import { synthesize, drawHand, SKIN, VIEW34 } from '../handmodel.js';
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
export function lessonScreen({ n }) {
  const lang = store.settings.lang;
  const J = lang === 'ja' ? 1 : 0;
  const ls = lessons(lang)[n - 1];
  const tm = timer('lessons', 'lesson', n);
  store.lesson(n).attempts++;

  // step list
  const steps = [
    ...ls.letters.map((k) => ({ kind: 'letter', key: k })),
    ...ls.words.map((w) => ({ kind: 'word', w })),
    { kind: 'sentence', s: ls.sentence }
  ];
  let idx = 0;

  const stepsBar = h('div', { class: 'steps' }, ...steps.map(() => h('i')));
  const partLbl = h('span', { class: 'sub' });
  const left = h('div', { class: 'panel' });
  const avatarCanvas = h('canvas', { class: 'fill' });
  const handCanvas = h('canvas', { class: 'fill' });
  const stage = h('div', { class: 'panel-body', style: { minHeight: '260px' } }, avatarCanvas, handCanvas);
  const info = h('div', { class: 'lesson-info' });
  const extra = h('div', {});
  const prevB = btn('◀ ' + t('prev'), () => show(idx - 1), 'ghost small');
  const againB = btn('↻ ' + t('watchAgain'), () => show(idx, true), 'ghost small');
  const nextB = btn(t('next') + ' ▶', () => next(), 'green');
  left.append(h('div', { class: 'panel-head' }, '🎓 ', t('lessonN', { n }), ' · ', ls.title[J], h('span', { class: 'tag' }, t('mirrorNote'))), stage, info, extra,
    h('div', { class: 'panel-foot' }, prevB, againB, h('div', { style: { flex: 1 } }), nextB));

  const cam = new CameraPanel({ title: t('tryWithCamera') });
  const avatar = new Avatar(avatarCanvas, { lang, skin: store.settings.skin });
  let handRaf = 0, handPts = null;
  const drawBigHand = () => {
    const c = handCanvas, W = c.clientWidth, H = c.clientHeight, dpr = window.devicePixelRatio || 1;
    if (W && H) {
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      const x = c.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
      if (handPts) {
        const sway = Math.sin(performance.now() / 1100) * 10;
        drawHand(x, handPts, { cx: W / 2, cy: H / 2, scale: Math.min(W, H) * 0.78, skin: SKIN[store.settings.skin], view: { y: VIEW34.y + sway, x: VIEW34.x } });
      }
    }
    handRaf = requestAnimationFrame(drawBigHand);
  };
  handRaf = requestAnimationFrame(drawBigHand);

  const split = h('div', { class: 'split' }, left, cam.el);
  const el = h('div', { class: 'screen' },
    h('div', { class: 'topbar' }, btn('←', () => go('lessons'), 'ghost icon-btn'), h('h2', {}, ls.title[J], partLbl), stepsBar),
    split);

  let practiceToken = 0;
  async function practice(key) {
    const my = ++practiceToken;
    while (my === practiceToken) {
      if (!camera.isOn()) { await new Promise((r) => setTimeout(r, 400)); continue; }
      const r = await cam.match(lang, key, {});
      if (my !== practiceToken || r.cancelled) return;
      store.recordSign(key, r.stars > 0);
      cam.showBurst(r.stars, key);
      if (r.stars >= 2) { sfx.correct(); nextB.classList.add('pulse'); }
      await new Promise((res) => setTimeout(res, 1600));
    }
  }

  function show(i, replay = false) {
    if (i < 0 || i >= steps.length) return;
    idx = i;
    practiceToken++; cam.cancel(); cam.freeTarget = null; nextB.classList.remove('pulse');
    [...stepsBar.children].forEach((d, k) => (d.className = k < i ? 'done' : k === i ? 'on' : ''));
    prevB.disabled = i === 0;
    const st = steps[i];
    info.innerHTML = ''; extra.innerHTML = '';
    if (st.kind === 'letter') {
      partLbl.textContent = t('partLetters');
      const sh = getShape(lang, st.key);
      handPts = synthesize(sh.pose);
      handCanvas.classList.remove('hidden'); avatarCanvas.classList.add('hidden');
      info.append(h('h3', {}, h('span', { style: { fontSize: '44px', marginRight: '12px', color: 'var(--cyan)' } }, st.key), t('letters')), h('p', {}, sh[lang === 'ja' ? 'ja' : 'en']));
      if (sh.motion) info.append(h('p', { style: { color: 'var(--yellow)' } }, '↯ ' + (lang === 'ja' ? '動きのある文字です' : 'This letter moves!')));
      say(`letter_${st.key}`, `${st.key}. ${sh[lang === 'ja' ? 'ja' : 'en']}`);
      cam.fb.innerHTML = `<div>${t('practiceHint')}</div>`;
      practice(st.key);
    } else {
      handPts = null;
      handCanvas.classList.add('hidden'); avatarCanvas.classList.remove('hidden');
      if (st.kind === 'word') {
        partLbl.textContent = t('partWords');
        const tok = st.w.tok, spelled = tok.startsWith('#');
        const word = spelled ? tok.slice(1) : (LEXICON[tok]?.mouth || tok);
        info.append(h('h3', {}, spelled ? word : (lang === 'ja' ? st.w.ja : st.w.en.toUpperCase())),
          h('p', {}, `${spelled ? '🔤 ' + t('fingerspelled') : '🤟 ' + t('sign')} · ${t('meaning')}: ${lang === 'ja' ? st.w.ja : st.w.en}`));
        extra.append(h('div', { class: 'mouth-tip' }, '👄 ' + t('mouthIt', { w: spelled ? word.toLowerCase() : word })));
        avatar.play([tok]);
        say(`word_${tok.replace('#', '')}`, spokenWord(lang === 'ja' ? st.w.ja : st.w.en));
      } else {
        partLbl.textContent = t('partSentence');
        const s = st.s;
        const gloss = h('div', { class: 'gloss' }, ...s.toks.map((tk) => h('span', {}, tk.startsWith('#') ? tk.slice(1).split('').join('-') : (LEXICON[tk] ? (lang === 'ja' ? tk : tk.replace('_', '-')) : tk))));
        info.append(h('h3', {}, lang === 'ja' ? s.ja : s.en), h('p', {}, lang === 'ja' ? s.en : s.ja));
        extra.append(gloss, h('div', { class: 'mouth-tip' }, '👄 ' + t('mouthIt', { w: lang === 'ja' ? s.ja : s.en })));
        // highlight gloss tokens as the teacher signs them
        playSentence(s.toks, gloss);
        say(`sent_${lang}_${n}`, lang === 'ja' ? s.ja : s.en);
      }
    }
    nextB.textContent = i === steps.length - 1 ? '✓ ' + t('done') : t('next') + ' ▶';
    if (!replay) sfx.click();
  }

  let sentToken = 0;
  async function playSentence(toks, gloss) {
    const my = ++sentToken;
    for (let k = 0; k < toks.length; k++) {
      if (my !== sentToken) return;
      [...gloss.children].forEach((g, j) => g.classList.toggle('on', j === k));
      const ok = await avatar.play([toks[k]]);
      if (!ok) return;
    }
    [...gloss.children].forEach((g) => g.classList.remove('on'));
  }

  function next() {
    if (idx < steps.length - 1) { show(idx + 1); return; }
    // lesson finished
    practiceToken++; cam.cancel();
    const first = !store.lang().lessons[n]?.done;
    store.completeLesson(n);
    sfx.fanfare(3);
    say('lesson_complete', t('lessonComplete'));
    split.replaceWith(h('div', { class: 'result' },
      h('div', { class: 'stars-big' }, h('span', { class: 'star on' }, '★'), h('span', { class: 'star on' }, '★'), h('span', { class: 'star on' }, '★')),
      h('h2', {}, t('lessonComplete')),
      h('p', { style: { color: 'var(--ink2)', fontSize: '20px' } }, ls.title[J]),
      h('div', { style: { display: 'flex', gap: '14px' } },
        btn('↻ ' + t('retry'), () => go('lesson', { n }), 'ghost'),
        n === 10 || n === 20 ? btn('★ ' + (n === 10 ? t('quizMid') : t('quizFinal')), () => go('quiz', { id: n === 10 ? 'mid' : 'final' }), 'yellow')
          : n < 20 && lessonUnlocked(n + 1) ? btn(t('lessonN', { n: n + 1 }) + ' ▶', () => go('lesson', { n: n + 1 }), 'green') : null,
        btn(t('lessons'), () => go('lessons'), 'cyan'))));
    if (first && (n === 10 || n === 20)) { sfx.unlock(); toast('★ ' + t('quizUnlocked')); }
  }

  setTimeout(() => show(0, true), 60);
  return {
    el, usesCamera: true,
    destroy() { practiceToken++; sentToken++; tm.stop(); cam.destroy(); avatar.destroy(); cancelAnimationFrame(handRaf); }
  };
}
