// Sign It — sound effects and voice.
// * No background music, by design.
// * Sound effects are synthesised live with the Web Audio API (bell/marimba
//   timbres + a small generated room reverb), so there are no audio files to ship.
// * Speech uses HUMAN RECORDINGS from assets/voice/<lang>/<key>.(mp3|ogg|wav).
//   If a recording is missing, the line is shown as a caption. A synthetic
//   device voice is used only if a parent explicitly enables it in For Parents.
import { store } from './storage.js';
import { letterKey, wordKeys } from './voicekeys.js';

let ctx = null, master = null, verb = null, dry = null;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = store.settings.sfx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    dry = ctx.createGain(); dry.gain.value = 0.85; dry.connect(master);
    verb = ctx.createConvolver(); verb.buffer = impulse(1.6, 2.6);
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    verb.connect(wet).connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function impulse(seconds, decay) {
  const rate = ctx.sampleRate, n = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, n, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return buf;
}

function out(node) { node.connect(dry); node.connect(verb); }

/** FM bell / marimba voice */
function bell(freq, t, dur = 0.9, gain = 0.25, ratio = 3.5, index = 2.2, type = 'sine') {
  const c = ac();
  const car = c.createOscillator(), mod = c.createOscillator();
  const mg = c.createGain(), g = c.createGain();
  car.type = type; car.frequency.value = freq;
  mod.frequency.value = freq * ratio;
  mg.gain.setValueAtTime(freq * index, t);
  mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur * 0.6);
  mod.connect(mg).connect(car.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  car.connect(g); out(g);
  car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
}

function tone(freq, t, dur, gain, type = 'triangle', slideTo = null) {
  const c = ac();
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); out(g);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(t, dur, gain, from = 800, to = 4000) {
  const c = ac();
  const n = Math.floor(c.sampleRate * dur);
  const b = c.createBuffer(1, n, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g); out(g);
  s.start(t);
}

const N = (semi) => 523.25 * Math.pow(2, semi / 12); // C5-relative

export const sfx = {
  setVolume(v) { if (master) master.gain.value = v; },
  click() { const t = ac().currentTime; bell(N(7), t, 0.18, 0.12, 2, 0.8); },
  hover() { const t = ac().currentTime; tone(N(12), t, 0.06, 0.03, 'sine'); },
  back() { const t = ac().currentTime; bell(N(4), t, 0.2, 0.12, 2, 0.8); bell(N(0), t + 0.06, 0.25, 0.1, 2, 0.8); },
  whoosh() { const t = ac().currentTime; noise(t, 0.35, 0.08, 300, 2500); },
  toggle(on) { const t = ac().currentTime; bell(on ? N(9) : N(2), t, 0.25, 0.14, 1.5, 1); },
  cameraOn() { const t = ac().currentTime; [0, 4, 7, 12].forEach((s, i) => bell(N(s), t + i * 0.06, 0.5, 0.11)); },
  cameraOff() { const t = ac().currentTime; [12, 7, 4, 0].forEach((s, i) => bell(N(s), t + i * 0.06, 0.4, 0.09)); },
  tick() { const t = ac().currentTime; bell(N(19), t, 0.08, 0.06, 5, 0.5); },
  correct() { const t = ac().currentTime; bell(N(0), t, 0.6, 0.16); bell(N(4), t + 0.08, 0.6, 0.16); bell(N(7), t + 0.16, 0.9, 0.18); },
  wrong() { const t = ac().currentTime; tone(N(-5), t, 0.22, 0.12, 'sine', N(-9)); tone(N(-9), t + 0.16, 0.3, 0.1, 'sine', N(-12)); },
  star(i) { const t = ac().currentTime; const s = [0, 4, 7][i] ?? 7; bell(N(12 + s), t, 1.1, 0.2, 3.5, 2.6); noise(t, 0.4, 0.03, 4000, 9000); },
  hold() { const t = ac().currentTime; tone(N(12), t, 0.05, 0.02, 'sine'); },
  unlock() { const t = ac().currentTime; [0, 7, 12, 16, 19, 24].forEach((s, i) => bell(N(s), t + i * 0.05, 0.6, 0.08)); },
  fanfare(stars = 3) {
    const t = ac().currentTime;
    const seq = stars >= 3 ? [0, 4, 7, 12, 16, 19, 24] : stars === 2 ? [0, 4, 7, 12, 16] : stars === 1 ? [0, 4, 7] : [0, -1, -5];
    seq.forEach((s, i) => bell(N(s), t + i * 0.09, 1.2, 0.13, 3.5, stars ? 2 : 1));
    if (stars >= 2) bell(N(24), t + seq.length * 0.09 + 0.1, 1.8, 0.1, 7, 1.5);
  },
  countdown(n) { const t = ac().currentTime; bell(n === 0 ? N(12) : N(7), t, 0.4, 0.14, 2, 1.2); }
};

// ---------------------------------------------------------------------------
// Voice
const missing = new Set();
// assets/voice/manifest.json lists installed recordings (built by tools/voice-manifest.js)
let manifest = null;
const manifestReady = fetch('../../assets/voice/manifest.json')
  .then((r) => (r.ok ? r.json() : null))
  .then((m) => { if (m) manifest = { en: new Map(Object.entries(m.en || {})), ja: new Map(Object.entries(m.ja || {})) }; })
  .catch(() => {});
export async function voiceCount() { await manifestReady; return manifest ? manifest.en.size + manifest.ja.size : 0; }
let current = null;
let captionCb = () => {};
export function onCaption(fn) { captionCb = fn; }

export function voiceKey(kind, text) {
  const slug = String(text).trim().toLowerCase().replace(/[\s　]+/g, '_').replace(/[^\p{L}\p{N}_]/gu, '');
  return `${kind}_${slug}`;
}

const clipCache = new Map();
async function tryFile(lang, key) {
  if (clipCache.has(lang + key)) return clipCache.get(lang + key);
  const a = await probeFile(lang, key);
  if (a) clipCache.set(lang + key, a);
  return a;
}
async function probeFile(lang, key) {
  await manifestReady;
  let exts = ['mp3', 'ogg', 'wav'];
  if (manifest) {
    const ext = manifest[lang]?.get(key);
    if (!ext) return null;
    exts = [ext];
  }
  return new Promise((resolve) => {
    if (missing.has(lang + key)) return resolve(null);
    let i = 0;
    const next = () => {
      if (i >= exts.length) { missing.add(lang + key); return resolve(null); }
      const a = new Audio(`../../assets/voice/${lang}/${encodeURIComponent(key)}.${exts[i++]}`);
      a.preload = 'auto';
      const ok = () => { cleanup(); resolve(a); };
      const bad = () => { cleanup(); next(); };
      const cleanup = () => { a.removeEventListener('canplaythrough', ok); a.removeEventListener('error', bad); };
      a.addEventListener('canplaythrough', ok, { once: true });
      a.addEventListener('error', bad, { once: true });
      a.load();
    };
    next();
  });
}

function bestDeviceVoice(lang) {
  const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  const want = lang === 'ja' ? /^ja/i : /^en/i;
  const cand = vs.filter((v) => want.test(v.lang));
  const rank = (v) => (/natural|neural|online|premium|enhanced/i.test(v.name) ? 3 : 0) + (/google|microsoft/i.test(v.name) ? 1 : 0);
  return cand.sort((a, b) => rank(b) - rank(a))[0] || null;
}

/**
 * Speak a line. Returns a promise resolving to true if audio played,
 * false if only a caption was shown.
 */
let seq = 0; // bumps on stopVoice() to cancel a playing sequence

function playClip(a, my) {
  return new Promise((res) => {
    if (my !== seq) return res(false);
    current = a;
    a.currentTime = 0;
    a.volume = store.settings.voice;
    a.onended = () => res(true);
    a.onerror = () => res(false);
    a.play().catch(() => res(false));
  });
}

/**
 * Speak a line. `keys` is one recording key or a list played back-to-back
 * (e.g. the words of a sentence). Human recordings are always preferred; the
 * caption is always shown. Returns true if audio was heard.
 */
export async function say(keys, text, opts = {}) {
  stopVoice();
  const my = seq;
  const lang = opts.lang || store.settings.lang;
  const list = Array.isArray(keys) ? keys : [keys];
  const caption = opts.caption || text;
  captionCb(caption, true);
  const clips = await Promise.all(list.map((k) => tryFile(lang, k)));
  if (my !== seq) return false;
  if (clips.length && clips.every(Boolean)) {
    for (let i = 0; i < clips.length; i++) {
      if (!(await playClip(clips[i], my))) break;
      if (i < clips.length - 1) await new Promise((r) => setTimeout(r, 140));
    }
    if (my === seq) setTimeout(() => { if (my === seq) captionCb(caption, false); }, opts.captionHold || 900);
    return true;
  }
  if (store.settings.deviceVoice && window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(text);
    const v = bestDeviceVoice(lang);
    if (v) u.voice = v;
    u.lang = lang === 'ja' ? 'ja-JP' : 'en-US';
    u.rate = 0.92; u.pitch = 1.05; u.volume = store.settings.voice;
    return new Promise((res) => {
      u.onend = () => { captionCb(caption, false); res(true); };
      u.onerror = () => res(false);
      speechSynthesis.speak(u);
    });
  }
  setTimeout(() => { if (my === seq) captionCb(caption, false); }, Math.max(1800, caption.length * 90));
  return false;
}

/** Speak a letter / kana name with a human voice. */
export function sayLetter(letter, opts = {}) {
  return say(letterKey(letter), letter, opts);
}
/** Speak a word or phrase with a human voice (one recording per word). */
export function sayWords(text, opts = {}) {
  const lang = opts.lang || store.settings.lang;
  return say(wordKeys(text, lang), text, { ...opts, lang });
}
/** True if every word of `text` has a human recording (or the opted-in device voice). */
export async function canSayWords(text, lang) {
  lang = lang || store.settings.lang;
  const ks = wordKeys(text, lang);
  if (ks.length && (await Promise.all(ks.map((k) => tryFile(lang, k)))).every(Boolean)) return true;
  return !!(store.settings.deviceVoice && window.speechSynthesis && bestDeviceVoice(lang));
}

/** True if a spoken line can actually be heard (recording or opted-in device voice). */
export async function canSpeak(key, lang) {
  if (await tryFile(lang || store.settings.lang, key)) return true;
  return !!(store.settings.deviceVoice && window.speechSynthesis && bestDeviceVoice(lang || store.settings.lang));
}

export function stopVoice() {
  seq++;
  if (current) { try { current.pause(); } catch (_) { /* ignore */ } current = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
}
