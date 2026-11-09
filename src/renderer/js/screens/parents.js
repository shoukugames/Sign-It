// Sign It — "For Parents": progress, success vs. failures, time, quiz scores, settings.
import { h, btn, parentGate, fmtTime, starsEl, confirmDialog, toast } from '../ui.js';
import { t } from '../i18n.js';
import { store } from '../storage.js';
import { go, refresh } from '../nav.js';
import { sfx, voiceCount } from '../audio.js';
import { lessons, level, PASS_PCT } from '../curriculum.js';

let unlockedThisSession = false;

export function parentsScreen() {
  const el = h('div', { class: 'screen' });
  const top = h('div', { class: 'topbar' }, btn('←', () => go('title'), 'ghost icon-btn'), h('h2', {}, '👪 ' + t('parentsTitle')));
  el.append(top);
  if (!unlockedThisSession) {
    el.append(h('div', { class: 'result' }, h('div', { style: { fontSize: '80px' } }, '🔐'), h('h2', { style: { fontSize: '30px' } }, t('parentsGate'))));
    setTimeout(async () => {
      const ok = await parentGate({ title: t('parentsTitle'), text: t('parentsGate') });
      if (ok) { unlockedThisSession = true; refresh(); } else go('title');
    }, 80);
    return { el };
  }

  let viewLang = store.settings.lang;
  let tab = 'overview';
  const langSeg = h('div', { class: 'seg' });
  const tabs = h('div', { class: 'tabs' });
  const body = h('div', { class: 'grid-wrap' });
  top.append(h('span', { class: 'note' }, t('pLangData')), langSeg);
  el.append(tabs, body);

  const renderLangSeg = () => {
    langSeg.innerHTML = '';
    [['en', 'ASL'], ['ja', 'JSL']].forEach(([v, l]) => langSeg.append(h('button', { class: v === viewLang ? 'on' : '', onclick: () => { viewLang = v; sfx.toggle(true); renderLangSeg(); render(); } }, l)));
  };
  const TABS = [['overview', t('pOverview')], ['lessons', t('pLessons')], ['levels', t('pLevels')], ['quizzes', t('pQuizzes')], ['signs', t('pSigns')], ['settings', t('pSettings')]];
  const renderTabs = () => {
    tabs.innerHTML = '';
    TABS.forEach(([k, l]) => tabs.append(h('button', { class: k === tab ? 'on' : '', onclick: () => { tab = k; sfx.click(); renderTabs(); render(); } }, l)));
  };

  const card = (v, k, color) => h('div', { class: 'stat-card' }, h('div', { class: 'v', style: { color } }, v), h('div', { class: 'k' }, k));
  const ratio = (s, f) => { const tot = s + f || 1; return h('div', { class: 'ratio', title: `${s} / ${f}` }, h('div', { class: 's', style: { width: (s / tot) * 100 + '%' } }), h('div', { class: 'f', style: { width: (f / tot) * 100 + '%' } })); };
  const pct = (s, f) => (s + f ? Math.round((s / (s + f)) * 100) + '%' : '—');

  function render() {
    const D = store.langData(viewLang);
    body.innerHTML = '';
    const lv = Object.values(D.levels), sg = Object.values(D.signs);
    const lvS = lv.reduce((a, x) => a + x.success, 0), lvF = lv.reduce((a, x) => a + x.fail, 0);
    const sgS = sg.reduce((a, x) => a + x.ok, 0), sgF = sg.reduce((a, x) => a + x.fail, 0);
    const T = D.time;
    const total = (T.lessons || 0) + (T.levels || 0) + (T.quizzes || 0) + (T.tutorial || 0);

    if (tab === 'overview') {
      const lessonsDone = Object.values(D.lessons).filter((x) => x.done).length;
      const stars = lv.reduce((a, x) => a + (x.best || 0), 0);
      const qm = D.quizzes.mid, qf = D.quizzes.final;
      body.append(
        h('div', { class: 'section-label' }, '📈 ' + t('pOverview')),
        h('div', { class: 'p-grid' },
          card(`${lessonsDone}/20`, t('lessons'), 'var(--cyan)'),
          card(`${stars}/60 ★`, t('levels'), 'var(--yellow)'),
          card(qm?.best != null ? qm.best + '%' : t('pNotTaken'), t('quizMid'), qm?.best >= PASS_PCT ? 'var(--green)' : 'var(--ink)'),
          card(qf?.best != null ? qf.best + '%' : t('pNotTaken'), t('quizFinal'), qf?.best >= PASS_PCT ? 'var(--green)' : 'var(--ink)')),
        h('div', { class: 'section-label' }, '✅ ' + t('pSuccess') + ' / ' + t('pFail')),
        h('div', { class: 'p-grid' },
          h('div', { class: 'stat-card' }, h('div', { class: 'k' }, t('levels')), h('div', { class: 'v' }, `${lvS} / ${lvF}`), ratio(lvS, lvF), h('div', { class: 'k' }, `${t('pRate')}: ${pct(lvS, lvF)}`)),
          h('div', { class: 'stat-card' }, h('div', { class: 'k' }, t('pSigns')), h('div', { class: 'v' }, `${sgS} / ${sgF}`), ratio(sgS, sgF), h('div', { class: 'k' }, `${t('pRate')}: ${pct(sgS, sgF)}`))),
        h('div', { class: 'section-label' }, '⏱ ' + t('pTotal') + ': ' + fmtTime(total)),
        h('div', { class: 'p-grid' },
          card(fmtTime(T.lessons), t('pTimeLessons')), card(fmtTime(T.levels), t('pTimeLevels')), card(fmtTime(T.quizzes), t('pTimeQuizzes')), card(fmtTime(T.tutorial), t('pTimeTutorial')),
          card(String(store.s.sessions), t('pSessions')), card(store.s.firstPlayed ? new Date(store.s.firstPlayed).toLocaleDateString(viewLang === 'ja' ? 'ja-JP' : 'en-US') : '—', t('pSince')),
          card(store.s.calibration ? '✔' : '—', t('calibrate'), store.s.calibration ? 'var(--green)' : 'var(--ink3)')),
        h('p', { class: 'note', style: { marginTop: '16px' } }, '🔒 ' + t('pPrivacy')));
    } else if (tab === 'lessons') {
      const tbl = h('table', { class: 'p-table' }, h('tr', {}, h('th', {}, '#'), h('th', {}, t('lessons')), h('th', {}, t('pStatus')), h('th', {}, t('pAttempts')), h('th', {}, t('pTimeLessons'))));
      lessons(viewLang).forEach((ls, i) => {
        const r = D.lessons[i + 1];
        tbl.append(h('tr', {}, h('td', {}, i + 1), h('td', {}, ls.title[viewLang === 'ja' ? 1 : 0], ' ', h('span', { class: 'note' }, ls.letters.join(' '))),
          h('td', {}, r?.done ? h('span', { class: 'badge ok' }, t('completed')) : h('span', { class: 'badge na' }, r?.attempts ? '…' : '—')),
          h('td', {}, r?.attempts || 0), h('td', {}, fmtTime(r?.time))));
      });
      body.append(tbl);
    } else if (tab === 'levels') {
      const tbl = h('table', { class: 'p-table' }, h('tr', {}, h('th', {}, '#'), h('th', {}, t('levels')), h('th', {}, t('pBestStars')), h('th', {}, t('pAttempts')), h('th', {}, t('pSuccess')), h('th', {}, t('pFail')), h('th', {}, t('pRate')), h('th', {}, t('pTimeLevels'))));
      for (let n = 1; n <= 20; n++) {
        const r = D.levels[n] || { best: 0, attempts: 0, success: 0, fail: 0, time: 0 };
        tbl.append(h('tr', {}, h('td', {}, n), h('td', {}, t('levelType' + level(viewLang, n).type)), h('td', {}, starsEl(r.best)), h('td', {}, r.attempts), h('td', { style: { color: 'var(--green)' } }, r.success), h('td', { style: { color: 'var(--red)' } }, r.fail), h('td', {}, ratio(r.success, r.fail)), h('td', {}, fmtTime(r.time))));
      }
      body.append(tbl);
    } else if (tab === 'quizzes') {
      for (const id of ['mid', 'final']) {
        const q = D.quizzes[id];
        body.append(h('div', { class: 'section-label' }, '★ ' + (id === 'mid' ? t('quizMid') : t('quizFinal')),
          q?.best == null ? h('span', { class: 'badge na' }, t('pNotTaken')) : h('span', { class: 'badge ' + (q.best >= PASS_PCT ? 'ok' : 'no') }, q.best >= PASS_PCT ? t('passed') : t('notPassed'))));
        body.append(h('div', { class: 'p-grid' }, card(q?.best != null ? q.best + '%' : '—', t('best')), card(q?.last != null ? q.last + '%' : '—', t('score')), card(String(q?.attempts || 0), t('pAttempts'))));
        if (q?.history?.length) {
          const tbl = h('table', { class: 'p-table' });
          q.history.slice().reverse().forEach((x) => tbl.append(h('tr', {}, h('td', {}, new Date(x.at).toLocaleString(viewLang === 'ja' ? 'ja-JP' : 'en-US')), h('td', {}, x.score + '%'), h('td', {}, h('span', { class: 'badge ' + (x.score >= PASS_PCT ? 'ok' : 'no') }, x.score >= PASS_PCT ? '✔' : '✖')))));
          body.append(tbl);
        }
      }
    } else if (tab === 'signs') {
      const entries = Object.entries(D.signs).map(([k, v]) => ({ k, ...v, rate: v.ok / Math.max(1, v.ok + v.fail) }));
      if (!entries.length) { body.append(h('p', { class: 'note' }, t('pNone'))); return; }
      const trouble = entries.filter((e) => e.fail > 0).sort((a, b) => a.rate - b.rate).slice(0, 8);
      const strong = entries.filter((e) => e.ok >= 2).sort((a, b) => b.rate - a.rate || b.ok - a.ok).slice(0, 8);
      body.append(h('div', { class: 'section-label' }, '🧩 ' + t('pTrouble')), h('div', { class: 'p-grid' }, ...(trouble.length ? trouble.map((e) => card(e.k, `${t('pRate')} ${Math.round(e.rate * 100)}% · ${e.ok}/${e.ok + e.fail}`, 'var(--orange)')) : [h('p', { class: 'note' }, t('pNone'))])));
      body.append(h('div', { class: 'section-label' }, '💪 ' + t('pStrong')), h('div', { class: 'p-grid' }, ...(strong.length ? strong.map((e) => card(e.k, `${t('pRate')} ${Math.round(e.rate * 100)}% · ${e.ok}/${e.ok + e.fail}`, 'var(--green)')) : [h('p', { class: 'note' }, t('pNone'))])));
      const tbl = h('table', { class: 'p-table' }, h('tr', {}, h('th', {}, t('sign')), h('th', {}, t('pSuccess')), h('th', {}, t('pFail')), h('th', {}, t('pRate'))));
      entries.sort((a, b) => a.k.localeCompare(b.k)).forEach((e) => tbl.append(h('tr', {}, h('td', {}, e.k), h('td', {}, e.ok), h('td', {}, e.fail), h('td', {}, ratio(e.ok, e.fail)))));
      body.append(h('div', { class: 'section-label' }, '📋 ' + t('pSigns')), tbl);
    } else if (tab === 'settings') {
      const S = store.settings;
      const range = (key, onInput) => h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: S[key], oninput: (e) => { store.set(key, Number(e.target.value)); onInput && onInput(Number(e.target.value)); }, onchange: () => sfx.click() });
      const sw = (key, onChange) => { const s = h('div', { class: 'switch' + (S[key] ? ' on' : '') }); s.addEventListener('click', () => { const v = !store.settings[key]; store.set(key, v); s.classList.toggle('on', v); sfx.toggle(v); onChange && onChange(v); }); return s; };
      const voiceInfo = h('div', { class: 'note' }, t('pVoiceInfo', { n: '…' }));
      voiceCount().then((n) => (voiceInfo.textContent = t('pVoiceInfo', { n })));
      const skinSeg = h('div', { class: 'seg' }, ...[['light', '🏻'], ['medium', '🏽'], ['deep', '🏾'], ['glove', '🧤']].map(([v, l]) => h('button', { class: S.skin === v ? 'on' : '', onclick: (e) => { store.set('skin', v); [...e.target.parentNode.children].forEach((b) => b.classList.remove('on')); e.target.classList.add('on'); sfx.toggle(true); } }, l)));
      body.append(
        h('div', { class: 'setting-row' }, h('div', { class: 't' }, '🔔 ' + t('pSfx')), range('sfx', (v) => sfx.setVolume(v))),
        h('div', { class: 'setting-row' }, h('div', { class: 't' }, '🗣 ' + t('pVoiceVol'), voiceInfo), range('voice')),
        h('div', { class: 'setting-row' }, h('div', { class: 't' }, '🤖 ' + t('pDeviceVoice')), sw('deviceVoice')),
        h('div', { class: 'setting-row' }, h('div', { class: 't' }, '✋ ' + t('pSkin')), skinSeg),
        h('div', { class: 'setting-row' }, h('div', { class: 't' }, '⏭ ' + t('autoAdvance')), sw('autoAdvance')),
        h('div', { class: 'setting-row' }, h('div', { class: 't' }, '🔓 ' + t('pUnlockAll')), sw('unlockAll')),
        h('div', { class: 'setting-row' }, h('div', { class: 't' }, '🗑 ' + t('pResetProgress')), btn(t('pResetProgress'), async () => {
          if (await confirmDialog(t('pResetConfirm'), t('pResetProgress'))) { store.resetProgress(); toast('✔'); render(); }
        }, 'red small')),
        h('p', { class: 'note' }, '🔒 ' + t('pPrivacy')));
    }
  }
  renderLangSeg(); renderTabs(); render();
  return { el };
}
