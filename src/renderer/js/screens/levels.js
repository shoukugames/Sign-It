// Sign It — levels list and the level game.
//  1–5   match the handshape
//  6–10  a written word appears → fingerspell it (judged on accuracy + technique)
//  11–15 a word is spoken → sign it (same judging)
//  16–20 sign a whole sentence
import { h, btn, toast, starsEl } from '../ui.js';
import { t } from '../i18n.js';
import { store, timer } from '../storage.js';
import { go } from '../nav.js';
import { sfx, narrate, sayLetter, sayWords, canSayWords } from '../audio.js';
import { level } from '../curriculum.js';
import { getShape } from '../signs.js';
import { synthesize } from '../handmodel.js';
import { HandViewer } from '../handviewer.js';
import { autoContinue } from '../ui.js';
import { techniqueScore, DIFFICULTY } from '../recognizer.js';
import { CameraPanel } from '../practice.js';
import * as camera from '../camera.js';

export function levelUnlocked(n) {
  return store.settings.unlockAll || n === 1 || (store.lang().levels[n - 1]?.best || 0) > 0;
}

export function levelsScreen() {
  const lang = store.settings.lang;
  const wrap = h('div', { class: 'grid-wrap' });
  const sections = [[1, t('levelType1'), t('levelDesc1')], [6, t('levelType2'), t('levelDesc2')], [11, t('levelType3'), t('levelDesc3')], [16, t('levelType4'), t('levelDesc4')]];
  for (const [from, name, desc] of sections) {
    wrap.append(h('div', { class: 'section-label' }, `${from}–${from + 4} · ${name}`, h('span', { class: 'pill' }, desc)));
    const grid = h('div', { class: 'item-grid' });
    for (let n = from; n < from + 5; n++) {
      const lv = level(lang, n), rec = store.lang().levels[n], un = levelUnlocked(n);
      const preview = lv.type === 3 ? ['🔊', '?'] : lv.items.map((it) => it.text);
      grid.append(h('div', {
        class: 'item' + (un ? '' : ' locked'),
        onclick: () => { if (!un) { sfx.wrong(); toast(t('needLesson')); return; } sfx.click(); go('level', { n }); }
      },
      h('div', { class: 'num' }, t('levelN', { n })),
      starsEl(rec?.best || 0),
      h('div', { class: 'chips' }, ...preview.slice(0, 6).map((p) => h('span', { class: 'chip' }, p))),
      rec?.attempts ? h('div', { class: 'note' }, `${t('pAttempts')}: ${rec.attempts}`) : null));
    }
    wrap.append(grid);
  }
  const el = h('div', { class: 'screen' },
    h('div', { class: 'topbar' }, btn('←', () => go('title'), 'ghost icon-btn'),
      h('h2', {}, '🎮 ' + t('levels'), h('span', { class: 'sub' }, `${t('difficulty')}: ${t(store.settings.difficulty)}`))),
    wrap);
  return { el };
}

// ---------------------------------------------------------------------------
export function levelScreen({ n }) {
  const lang = store.settings.lang;
  const diff = store.settings.difficulty;
  const D = DIFFICULTY[diff];
  const lv = level(lang, n);
  const tm = timer('levels', 'level', n);
  const typeName = t('levelType' + lv.type);
  const practiceOnly = !store.settings.camera;

  // ---- left: game screen ----
  const head = h('div', { class: 'panel-head' }, '🎮 ', t('levelN', { n }), ' · ', typeName, h('span', { class: 'tag' }, t(diff)));
  const prompt = h('div', { style: { textAlign: 'center', padding: '10px 16px 0', color: 'var(--ink2)', fontSize: '18px' } });
  const big = h('div', { class: 'target-big', style: { padding: '6px 0' } });
  const row = h('div', { class: 'word-row' });
  const meaning = h('div', { style: { textAlign: 'center', color: 'var(--ink3)', fontSize: '16px', minHeight: '22px' } });
  const hintC = h('canvas', { class: 'fill' });
  const hintBox = h('div', { class: 'panel-body' }, hintC);
  const listenB = btn('🔊 ' + t('replay'), () => speakCurrent(), 'cyan small');
  const doneB = btn('✔ ' + t('iDidIt'), () => practiceNext && practiceNext(), 'green');
  const foot = h('div', { class: 'panel-foot' }, h('div', { class: 'note', style: { flex: 1 } }, practiceOnly ? '📷 ' + t('practiceMode') : t('levelDesc' + lv.type)), lv.type === 3 ? listenB : null, practiceOnly ? doneB : null);
  const progress = h('div', { class: 'steps', style: { justifyContent: 'center', padding: '8px' } }, ...lv.items.map(() => h('i')));
  const left = h('div', { class: 'panel' }, head, progress, prompt, big, row, meaning, hintBox, foot);
  const cam = new CameraPanel({});
  const split = h('div', { class: 'split' }, left, cam.el);
  const el = h('div', { class: 'screen' },
    h('div', { class: 'topbar' }, btn('←', () => go('levels'), 'ghost icon-btn'), h('h2', {}, t('levelN', { n }), h('span', { class: 'sub' }, typeName))),
    split);

  // ---- hint hand: an interactive 3D hand the player can turn with the mouse ----
  const viewer = new HandViewer(hintC);
  let hintTimer = 0;
  function setHint(key, delayMs) {
    clearTimeout(hintTimer);
    viewer.set(null);
    viewer.letter = key == null || lv.type === 1 || lv.type === 3 ? null : key === 'ILY' ? '🤟' : key;
    if (key == null) return;
    const showIt = () => { viewer.set(synthesize(getShape(lang, key).pose)); };
    if (delayMs === 0) showIt(); else if (delayMs > 0) hintTimer = setTimeout(showIt, delayMs);
  }

  let alive = true, practiceNext = null, currentItem = null, cancelAuto = null;
  async function speakCurrent() {
    if (!currentItem) return;
    // spoken by a human voice; the caption is hidden in listening levels so the player must listen
    if (await canSayWords(currentItem.text, lang)) { sayWords(currentItem.text, { lang, caption: '👂 …' }); return; }
    // No human recording installed: flash the word briefly instead of using a robotic voice.
    toast('🔊 ' + t('noVoiceYet'), 2600);
    meaning.textContent = '👀 ' + currentItem.text;
    setTimeout(() => { if (alive && lv.type === 3) meaning.textContent = ''; }, 2200);
  }

  function renderRow(item, wi, li, results) {
    row.innerHTML = '';
    item.words.forEach((w, a) => {
      if (a) row.append(h('div', { class: 'gap' }));
      w.forEach((k, b) => {
        const r = results[a]?.[b];
        const isCur = a === wi && b === li;
        const hidden = lv.type === 3 && !r && !isCur;
        const label = k === 'ILY' ? '🤟' : k;
        row.append(h('div', { class: 'ltr' + (isCur ? ' cur' : '') + (r ? (r.stars ? ' ok' : ' miss') : '') + (hidden ? ' hidden-ltr' : '') },
          lv.type === 3 && isCur && !r ? '?' : label,
          r ? h('span', { class: 'mini-stars' }, r.stars ? '★'.repeat(r.stars) : '✖') : null));
      });
    });
  }

  async function run() {
    await new Promise((r) => setTimeout(r, 300));
    await narrate(t('levelDesc' + lv.type));
    if (!alive) return;
    const itemStars = [], accAll = [], techAll = [];
    for (let ii = 0; ii < lv.items.length && alive; ii++) {
      const item = lv.items[ii];
      currentItem = item;
      [...progress.children].forEach((d, k) => (d.className = k < ii ? 'done' : k === ii ? 'on' : ''));
      meaning.textContent = '';
      if (lv.type === 1) { prompt.textContent = t('levelDesc1'); big.textContent = item.text; row.innerHTML = ''; sayLetter(item.text, { lang }); }
      else if (lv.type === 3) { prompt.textContent = '🔊 ' + t('levelDesc3'); big.textContent = '🔊'; speakCurrent(); }
      else { prompt.textContent = t('levelDesc' + lv.type); big.textContent = ''; }
      if (lv.type === 2 || lv.type === 4) sayWords(item.text, { lang });

      const results = item.words.map(() => []);
      const wordScores = [];
      let prevEnd = null, anchor = null;
      for (let wi = 0; wi < item.words.length && alive; wi++) {
        const w = item.words[wi];
        const letterRes = [];
        for (let li = 0; li < w.length && alive; li++) {
          const key = w[li];
          if (lv.type !== 1) renderRow(item, wi, li, results);
          // hints: level 1–5 always; others depend on difficulty
          const hintDelay = lv.type === 1 ? 0 : diff === 'easy' ? 0 : diff === 'medium' ? 6000 : -1;
          setHint(key, hintDelay);
          let r;
          if (practiceOnly) {
            r = await new Promise((res) => { practiceNext = () => { practiceNext = null; sfx.click(); res({ stars: 0, score: 0, frames: [], practice: true }); }; });
          } else {
            if (!camera.isOn()) await waitCamera();
            const same = li > 0 && w[li - 1] === key;
            r = await cam.match(lang, key, { timeLimit: D.time, requireRelease: same, releaseFrom: same ? letterRes[li - 1]?.center : null });
            if (r.cancelled || !alive) return;
            store.recordSign(key, r.stars > 0);
            if (r.stars) { cam.showBurst(r.stars, lv.type === 1 ? key : null); if (key !== 'ILY') sayLetter(key, { lang, captionHold: 300 }); } else { sfx.wrong(); cam.fb.innerHTML = `<div>⏱ ${t('timeUp')}</div>`; }
            if (!anchor && r.center) anchor = r.center;
            r.tech = r.frames?.length ? techniqueScore(r.frames, r.startT, prevEnd, anchor) : 0;
            prevEnd = r.endT;
          }
          letterRes.push(r);
          results[wi][li] = r;
          if (lv.type !== 1) renderRow(item, wi, li + 1, results);
          await new Promise((res) => setTimeout(res, lv.type === 1 ? 900 : 350));
        }
        if (!practiceOnly) {
          const acc = letterRes.reduce((a, r) => a + (r.stars ? r.score : 0), 0) / letterRes.length;
          const tech = letterRes.reduce((a, r) => a + (r.tech || 0), 0) / letterRes.length;
          const meanStars = letterRes.reduce((a, r) => a + r.stars, 0) / letterRes.length;
          let ws = lv.type === 1 ? letterRes[0].stars : Math.round(meanStars * (0.75 + 0.25 * tech));
          if (lv.type !== 1 && letterRes.every((r) => r.stars > 0)) ws = Math.max(1, ws);
          wordScores.push(ws); accAll.push(acc); if (lv.type !== 1) techAll.push(tech);
          if (lv.type !== 1) {
            cam.showBurst(ws, `${item.words[wi].join('')}`);
            cam.fb.innerHTML = `<div>🎯 ${t('accuracy')} ${Math.round(acc * 100)}% · ✋ ${t('technique')} ${Math.round(tech * 100)}%</div>`;
            await new Promise((res) => setTimeout(res, 1300));
          }
        }
      }
      if (lv.type === 3) { big.textContent = item.text; await new Promise((res) => setTimeout(res, 1000)); }
      itemStars.push(practiceOnly ? 0 : Math.round(wordScores.reduce((a, b) => a + b, 0) / wordScores.length));
    }
    if (!alive) return;
    finish(itemStars, accAll, techAll);
  }

  function waitCamera() {
    return new Promise((res) => { const iv = setInterval(() => { if (!alive || camera.isOn()) { clearInterval(iv); res(); } }, 300); });
  }

  function finish(itemStars, accAll, techAll) {
    const autoBox = h('div', { class: 'auto-box' });
    setHint(null);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const st = practiceOnly ? 0 : Math.round(avg(itemStars));
    if (!practiceOnly) store.recordLevel(n, st);
    sfx.fanfare(practiceOnly ? 2 : st);
    const msg = practiceOnly ? t('wellDone') : st ? (st === 3 ? t('perfect') : t('levelComplete')) : t('levelFailed');
    narrate(msg);
    split.replaceWith(h('div', { class: 'result' },
      practiceOnly ? h('div', { style: { fontSize: '80px' } }, '🙌') : h('div', { class: 'stars-big' }, ...[0, 1, 2].map((i) => h('span', { class: 'star' + (i < st ? ' on' : '') }, '★'))),
      h('h2', {}, msg),
      practiceOnly ? h('p', { class: 'note' }, t('practiceMode')) : h('div', { class: 'stats' },
        h('div', { class: 'stat-card' }, h('div', { class: 'v' }, Math.round(avg(accAll) * 100) + '%'), h('div', { class: 'k' }, t('accuracy'))),
        techAll.length ? h('div', { class: 'stat-card' }, h('div', { class: 'v' }, Math.round(avg(techAll) * 100) + '%'), h('div', { class: 'k' }, t('technique'))) : null,
        h('div', { class: 'stat-card' }, h('div', { class: 'v' }, '★'.repeat(store.lang().levels[n]?.best || 0) || '—'), h('div', { class: 'k' }, t('best')))),
      h('div', { style: { display: 'flex', gap: '14px' } },
        btn('↻ ' + t('retry'), () => go('level', { n }), 'ghost'),
        n < 20 && levelUnlocked(n + 1) ? btn(t('levelN', { n: n + 1 }) + ' ▶', () => go('level', { n: n + 1 }), 'green') : null,
        btn(t('levels'), () => go('levels'), 'pink')),
      autoBox));
    // hands-free: go on to the next level automatically after a win
    if (st && n < 20 && levelUnlocked(n + 1) && store.settings.autoAdvance !== false) cancelAuto = autoContinue(autoBox, () => go('level', { n: n + 1 }));
    if (st && n < 20 && (store.lang().levels[n]?.attempts === 1 || st)) sfx.unlock();
  }

  run();
  return {
    el, usesCamera: true,
    destroy() { alive = false; if (cancelAuto) cancelAuto(); tm.stop(); clearTimeout(hintTimer); viewer.destroy(); cam.destroy(); }
  };
}
