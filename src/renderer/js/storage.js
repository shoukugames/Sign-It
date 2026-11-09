// Sign It — progress, statistics and settings (kept on this device only).
const KEY = 'signit.v1';

const blankLang = () => ({
  lessons: {},   // n -> { done, attempts, time, lastAt }
  levels: {},    // n -> { best, attempts, success, fail, time, lastAt }
  quizzes: {},   // 'mid'|'final' -> { best, last, attempts, history:[{score,at}] }
  signs: {},     // key -> { ok, fail }
  time: { lessons: 0, levels: 0, quizzes: 0, tutorial: 0 }
});

const DEFAULTS = {
  version: 1,
  settings: {
    lang: 'en',
    camera: false,
    difficulty: 'medium',
    sfx: 0.8,
    voice: 1,
    deviceVoice: false,  // synthetic voices are OFF unless a parent opts in
    skin: 'light',
    dominant: 'right',
    unlockAll: false
  },
  calibration: null,
  tutorialSeen: false,
  firstPlayed: null,
  sessions: 0,
  en: blankLang(),
  ja: blankLang()
};

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const s = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULTS), ...s,
      settings: { ...DEFAULTS.settings, ...(s.settings || {}) },
      en: { ...blankLang(), ...(s.en || {}) },
      ja: { ...blankLang(), ...(s.ja || {}) }
    };
  } catch (_) {
    return structuredClone(DEFAULTS);
  }
}

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* storage unavailable */ }
  }, 150);
}

export const store = {
  get s() { return state; },
  get settings() { return state.settings; },
  set(k, v) { state.settings[k] = v; save(); },
  lang() { return state[state.settings.lang]; },
  langData(l) { return state[l]; },

  lesson(n) { const L = this.lang(); return L.lessons[n] || (L.lessons[n] = { done: false, attempts: 0, time: 0 }); },
  level(n) { const L = this.lang(); return L.levels[n] || (L.levels[n] = { best: 0, attempts: 0, success: 0, fail: 0, time: 0 }); },
  quiz(id) { const L = this.lang(); return L.quizzes[id] || (L.quizzes[id] = { best: null, last: null, attempts: 0, history: [] }); },

  completeLesson(n) { const l = this.lesson(n); l.done = true; l.lastAt = Date.now(); save(); },
  recordLevel(n, starsWon) {
    const l = this.level(n);
    l.attempts++; l.lastAt = Date.now();
    if (starsWon > 0) l.success++; else l.fail++;
    l.best = Math.max(l.best, starsWon);
    save();
  },
  recordQuiz(id, pct) {
    const q = this.quiz(id);
    q.attempts++; q.last = pct; q.best = Math.max(q.best ?? 0, pct);
    q.history.push({ score: pct, at: Date.now() });
    if (q.history.length > 30) q.history.shift();
    save();
  },
  recordSign(key, ok) {
    const L = this.lang();
    const s = L.signs[key] || (L.signs[key] = { ok: 0, fail: 0 });
    ok ? s.ok++ : s.fail++;
    save();
  },
  addTime(bucket, ms, itemKind, n) {
    if (!ms || ms < 0) return;
    const L = this.lang();
    L.time[bucket] = (L.time[bucket] || 0) + ms;
    if (itemKind === 'lesson') this.lesson(n).time += ms;
    if (itemKind === 'level') this.level(n).time += ms;
    save();
  },
  setCalibration(c) { state.calibration = c; save(); },
  markTutorial() { state.tutorialSeen = true; save(); },
  startSession() { state.sessions++; if (!state.firstPlayed) state.firstPlayed = Date.now(); save(); },
  resetProgress() {
    const keep = state.settings, cal = state.calibration;
    state = structuredClone(DEFAULTS);
    state.settings = keep; state.calibration = cal;
    save();
  }
};

/** Time tracker: start() when a screen opens, stop() when it closes. */
export function timer(bucket, kind, n) {
  let t0 = performance.now(), paused = false;
  const onVis = () => {
    if (document.hidden && !paused) { store.addTime(bucket, performance.now() - t0, kind, n); paused = true; }
    else if (!document.hidden && paused) { t0 = performance.now(); paused = false; }
  };
  document.addEventListener('visibilitychange', onVis);
  return {
    stop() {
      document.removeEventListener('visibilitychange', onVis);
      if (!paused) store.addTime(bucket, performance.now() - t0, kind, n);
      paused = true;
    }
  };
}
