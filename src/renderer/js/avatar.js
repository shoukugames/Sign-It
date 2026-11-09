// Sign It — animated signing teacher ("Miko").
// Draws an upper-body character whose two hands are the procedural 3D hand
// model, and whose lips move (visemes) in sync with the words being signed —
// so children learn to mouth words while they sign.
//
// Mirror view: the teacher's dominant hand is on the SCREEN RIGHT, exactly
// where the player's own dominant hand appears in the mirrored camera view.
import { synthesize, drawHand, blendPts, F, SKIN } from './handmodel.js';
import { ASL, JSL, ASL_WORDSHAPES } from './signs.js';
import { extract } from './recognizer.js';

const strip = (p) => { const { rot, ...rest } = p; return rest; };
const thumbAlong = { tip: [-0.2, 0.30, 0.05] };
export const POSES = {
  flat: { index: F.S, middle: F.S, ring: F.S, pinky: F.S, splay: { index: -1, middle: 0, ring: 1, pinky: 3 }, thumb: thumbAlong },
  five: { index: F.S, middle: F.S, ring: F.S, pinky: F.S, splay: { index: -12, middle: 0, ring: 10, pinky: 22 }, thumb: { tip: [-0.40, 0.31, 0.03] } },
  bentB: { index: F.K, middle: F.K, ring: F.K, pinky: F.K, thumb: thumbAlong },
  point: strip(ASL.Z.pose),
  flatO: { index: F.O, middle: F.O, ring: F.O, pinky: F.O, thumb: { touch: 'middle' } },
  pinch: { index: F.O, middle: F.C, ring: F.C, pinky: F.C, thumb: { touch: 'index' } },
  claw: { index: F.H, middle: F.H, ring: F.H, pinky: F.H, splay: { index: -12, middle: 0, ring: 10, pinky: 20 }, thumb: { tip: [-0.34, 0.33, 0.12] } },
  noOpen: { index: F.S, middle: F.S, ring: F.C, pinky: F.C, splay: { index: 1, middle: -1 }, thumb: { tip: [-0.36, 0.34, 0.06] } },
  noClosed: { index: [0.45, 0.25, 0.1], middle: [0.45, 0.25, 0.1], ring: F.C, pinky: F.C, thumb: { touch: 'index', off: [0.02, -0.01, 0.03] } },
  likeOpen: { index: F.S, middle: [0.5, 0.2, 0], ring: F.S, pinky: F.S, splay: { index: -12, ring: 10, pinky: 22 }, thumb: { tip: [-0.36, 0.33, 0.05] } },
  likeClosed: { index: F.S, middle: F.O, ring: F.S, pinky: F.S, splay: { index: -12, ring: 10, pinky: 22 }, thumb: { touch: 'middle' } },
  thumbUp: strip(JSL['た'].pose),
  L: strip(ASL.L.pose), S: strip(ASL.S.pose), A: strip(ASL.A.pose), Y: strip(ASL.Y.pose), V: strip(ASL.V.pose),
  W: strip(ASL.W.pose), X: strip(ASL.X.pose), C: strip(ASL.C.pose), H: strip(ASL.H.pose), U: strip(ASL.U.pose), F: strip(ASL.F.pose),
  I: strip(ASL.I.pose), ILY: strip(ASL_WORDSHAPES.ILY.pose)
};

// rotation presets
const IN = { y: 180 }, SIDE = { y: -90 }, DOWN_X = { z: 90, x: 90 }, UP_X = { z: 90, x: -90 }, FWD = { x: 80 }, BACK = { x: -90 };
const REST_R = { at: [0.6, 1.6], s: 'flat', rot: IN }, REST_L = { at: [-0.6, 1.6], s: 'flat', rot: IN };

// helper to build repeated taps
const taps = (a, b, n = 2, d = 200) => { const out = []; for (let i = 0; i < n; i++) out.push({ ...a, d }, { ...b, d }); return out; };

// Lexical signs. Each frame: { d: ms to reach, r: hand, l: hand|undefined, brow }
export const LEXICON = {
  // ---------- ASL ----------
  HELLO: { en: 'hello', ja: 'こんにちは（ASL）', mouth: 'hello', frames: [{ d: 300, r: { at: [0.32, -1.32], s: 'flat', rot: { z: -8 } } }, { d: 700, r: { at: [0.9, -1.12], s: 'flat', rot: { z: -25 } } }] },
  GOODBYE: { en: 'goodbye', ja: 'さようなら（ASL）', mouth: 'bye', frames: [{ d: 300, r: { at: [0.7, -0.8], s: 'five' } }, ...taps({ r: { at: [0.7, -0.8], s: 'bentB' } }, { r: { at: [0.7, -0.8], s: 'five' } }, 2, 220)] },
  YOU: { en: 'you', ja: 'あなた（ASL）', mouth: 'you', frames: [{ d: 300, r: { at: [0.4, -0.45], s: 'point', rot: FWD } }, { d: 400, r: { at: [0.34, -0.4], s: 'point', rot: FWD } }] },
  ME: { en: 'I / me', ja: 'わたし（ASL）', mouth: 'me', frames: [{ d: 300, r: { at: [0.2, -0.2], s: 'point', rot: BACK } }, { d: 400, r: { at: [0.08, -0.16], s: 'point', rot: BACK } }] },
  MY: { en: 'my', ja: 'わたしの（ASL）', mouth: 'my', frames: [{ d: 300, r: { at: [0.25, -0.15], s: 'flat', rot: IN } }, { d: 400, r: { at: [0.1, -0.12], s: 'flat', rot: IN } }] },
  YOUR: { en: 'your', ja: 'あなたの（ASL）', mouth: 'your', frames: [{ d: 300, r: { at: [0.35, -0.45], s: 'flat' } }, { d: 400, r: { at: [0.42, -0.42], s: 'flat' } }] },
  NAME: { en: 'name', ja: 'なまえ（ASL）', mouth: 'name', frames: [{ d: 350, l: { at: [-0.1, -0.15], s: 'H', rot: { z: 90 } }, r: { at: [0.12, -0.3], s: 'H', rot: { z: 90 } } }, ...taps({ l: { at: [-0.1, -0.15], s: 'H', rot: { z: 90 } }, r: { at: [0.06, -0.21], s: 'H', rot: { z: 90 } } }, { l: { at: [-0.1, -0.15], s: 'H', rot: { z: 90 } }, r: { at: [0.08, -0.3], s: 'H', rot: { z: 90 } } })] },
  THANK_YOU: { en: 'thank you', ja: 'ありがとう（ASL）', mouth: 'thank you', frames: [{ d: 350, r: { at: [0.1, -0.64], s: 'flat', rot: IN } }, { d: 250, r: { at: [0.1, -0.64], s: 'flat', rot: IN } }, { d: 600, r: { at: [0.42, -0.25], s: 'flat', rot: { x: -70 } } }] },
  PLEASE: { en: 'please', ja: 'おねがい（ASL）', mouth: 'please', frames: [[0.12, -0.12], [0.24, -0.02], [0.12, 0.08], [0.0, -0.02], [0.12, -0.12], [0.24, -0.02], [0.12, 0.08]].map((at, i) => ({ d: i ? 200 : 350, r: { at, s: 'flat', rot: IN } })) },
  SORRY: { en: 'sorry', ja: 'ごめんなさい（ASL）', mouth: 'sorry', brow: 'sad', frames: [[0.12, -0.12], [0.24, -0.02], [0.12, 0.08], [0.0, -0.02], [0.12, -0.12], [0.24, -0.02], [0.12, 0.08]].map((at, i) => ({ d: i ? 200 : 350, r: { at, s: 'A', rot: IN } })) },
  YES: { en: 'yes', ja: 'はい（ASL）', mouth: 'yes', frames: [{ d: 300, r: { at: [0.42, -0.45], s: 'S' } }, ...taps({ r: { at: [0.42, -0.36], s: 'S', rot: { x: 50 } } }, { r: { at: [0.42, -0.45], s: 'S' } }, 2, 200)] },
  NO: { en: 'no', ja: 'いいえ（ASL）', mouth: 'no', frames: [{ d: 300, r: { at: [0.42, -0.5], s: 'noOpen' } }, ...taps({ r: { at: [0.42, -0.5], s: 'noClosed' } }, { r: { at: [0.42, -0.5], s: 'noOpen' } }, 2, 180)] },
  MOTHER: { en: 'mother / mom', ja: 'おかあさん（ASL）', mouth: 'mom', frames: [{ d: 350, r: { at: [0.22, -0.82], s: 'five', rot: SIDE } }, ...taps({ r: { at: [0.17, -0.8], s: 'five', rot: SIDE } }, { r: { at: [0.26, -0.82], s: 'five', rot: SIDE } })] },
  FATHER: { en: 'father / dad', ja: 'おとうさん（ASL）', mouth: 'dad', frames: [{ d: 350, r: { at: [0.22, -1.38], s: 'five', rot: SIDE } }, ...taps({ r: { at: [0.17, -1.36], s: 'five', rot: SIDE } }, { r: { at: [0.26, -1.38], s: 'five', rot: SIDE } })] },
  LOVE: { en: 'love', ja: 'あい（ASL）', mouth: 'love', brow: 'happy', frames: [{ d: 300, r: { at: [0.3, -0.1], s: 'S', rot: IN }, l: { at: [-0.3, -0.1], s: 'S', rot: IN } }, { d: 500, r: { at: [-0.14, -0.14], s: 'S', rot: IN }, l: { at: [0.14, -0.14], s: 'S', rot: IN } }, { d: 500, r: { at: [-0.14, -0.14], s: 'S', rot: IN }, l: { at: [0.14, -0.14], s: 'S', rot: IN } }] },
  FRIEND: { en: 'friend', ja: 'ともだち（ASL）', mouth: 'friend', frames: [{ d: 350, l: { at: [-0.06, -0.2], s: 'X', rot: { z: 90 } }, r: { at: [0.06, -0.3], s: 'X', rot: { z: 90, x: 180 } } }, { d: 500, l: { at: [-0.06, -0.3], s: 'X', rot: { z: 90, x: 180 } }, r: { at: [0.06, -0.2], s: 'X', rot: { z: 90 } } }] },
  EAT: { en: 'eat', ja: 'たべる（ASL）', mouth: 'eat', frames: [{ d: 300, r: { at: [0.22, -0.66], s: 'flatO', rot: SIDE } }, ...taps({ r: { at: [0.12, -0.8], s: 'flatO', rot: SIDE } }, { r: { at: [0.22, -0.66], s: 'flatO', rot: SIDE } })] },
  DRINK: { en: 'drink', ja: 'のむ（ASL）', mouth: 'drink', frames: [{ d: 300, r: { at: [0.3, -0.5], s: 'C', rot: SIDE } }, { d: 500, r: { at: [0.14, -0.8], s: 'C', rot: { y: -90, z: 35 } } }] },
  MORE: { en: 'more', ja: 'もっと（ASL）', mouth: 'more', frames: [{ d: 300, r: { at: [0.2, -0.25], s: 'flatO', rot: SIDE }, l: { at: [-0.2, -0.25], s: 'flatO', rot: SIDE } }, ...taps({ r: { at: [0.07, -0.25], s: 'flatO', rot: SIDE }, l: { at: [-0.07, -0.25], s: 'flatO', rot: SIDE } }, { r: { at: [0.2, -0.25], s: 'flatO', rot: SIDE }, l: { at: [-0.2, -0.25], s: 'flatO', rot: SIDE } })] },
  GOOD: { en: 'good', ja: 'いい（ASL）', mouth: 'good', brow: 'happy', frames: [{ d: 300, r: { at: [0.1, -0.64], s: 'flat', rot: IN }, l: { at: [-0.1, 0.1], s: 'flat', rot: UP_X } }, { d: 600, r: { at: [0.08, 0.0], s: 'flat', rot: { x: -80 } }, l: { at: [-0.1, 0.1], s: 'flat', rot: UP_X } }] },
  HAPPY: { en: 'happy', ja: 'うれしい（ASL）', mouth: 'happy', brow: 'happy', frames: [{ d: 300, r: { at: [0.12, 0.08], s: 'flat', rot: IN } }, ...taps({ r: { at: [0.12, -0.22], s: 'flat', rot: IN } }, { r: { at: [0.12, 0.08], s: 'flat', rot: IN } }, 2, 230)] },
  HELP: { en: 'help', ja: 'たすける（ASL）', mouth: 'help', frames: [{ d: 350, r: { at: [0.02, -0.08], s: 'A', rot: SIDE }, l: { at: [-0.05, 0.08], s: 'flat', rot: UP_X } }, { d: 600, r: { at: [0.02, -0.36], s: 'A', rot: SIDE }, l: { at: [-0.05, -0.2], s: 'flat', rot: UP_X } }] },
  WATER: { en: 'water', ja: 'みず（ASL）', mouth: 'water', frames: [{ d: 350, r: { at: [0.2, -0.78], s: 'W', rot: SIDE } }, ...taps({ r: { at: [0.14, -0.76], s: 'W', rot: SIDE } }, { r: { at: [0.22, -0.74], s: 'W', rot: SIDE } })] },
  PLAY: { en: 'play', ja: 'あそぶ（ASL）', mouth: 'play', brow: 'happy', frames: [{ d: 300, r: { at: [0.48, -0.25], s: 'Y' }, l: { at: [-0.48, -0.25], s: 'Y' } }, ...taps({ r: { at: [0.48, -0.25], s: 'Y', rot: { z: 30 } }, l: { at: [-0.48, -0.25], s: 'Y', rot: { z: 30 } } }, { r: { at: [0.48, -0.25], s: 'Y', rot: { z: -20 } }, l: { at: [-0.48, -0.25], s: 'Y', rot: { z: -20 } } }, 2, 180)] },
  LIKE: { en: 'like', ja: 'すき（ASL）', mouth: 'like', frames: [{ d: 300, r: { at: [0.14, -0.14], s: 'likeOpen', rot: IN } }, { d: 600, r: { at: [0.42, -0.3], s: 'likeClosed', rot: IN } }] },
  SEE: { en: 'see', ja: 'みる（ASL）', mouth: 'see', frames: [{ d: 300, r: { at: [0.2, -1.1], s: 'V', rot: IN } }, { d: 600, r: { at: [0.42, -0.82], s: 'V', rot: { y: 180, x: -40 } } }] },
  BOOK: { en: 'book', ja: 'ほん（ASL）', mouth: 'book', frames: [{ d: 350, r: { at: [0.07, -0.2], s: 'flat', rot: SIDE }, l: { at: [-0.07, -0.2], s: 'flat', rot: SIDE } }, { d: 600, r: { at: [0.28, -0.12], s: 'flat', rot: UP_X }, l: { at: [-0.28, -0.12], s: 'flat', rot: UP_X } }] },
  SCHOOL: { en: 'school', ja: 'がっこう（ASL）', mouth: 'school', frames: [{ d: 350, r: { at: [0.04, -0.28], s: 'flat', rot: DOWN_X }, l: { at: [-0.04, 0.02], s: 'flat', rot: UP_X } }, ...taps({ r: { at: [0.04, -0.05], s: 'flat', rot: DOWN_X }, l: { at: [-0.04, 0.02], s: 'flat', rot: UP_X } }, { r: { at: [0.04, -0.28], s: 'flat', rot: DOWN_X }, l: { at: [-0.04, 0.02], s: 'flat', rot: UP_X } })] },
  WHAT: { en: 'what', ja: 'なに（ASL）', mouth: 'what', brow: 'question', frames: [{ d: 350, r: { at: [0.45, -0.15], s: 'five', rot: { x: -80 } }, l: { at: [-0.45, -0.15], s: 'five', rot: { x: -80 } } }, ...taps({ r: { at: [0.52, -0.15], s: 'five', rot: { x: -80 } }, l: { at: [-0.52, -0.15], s: 'five', rot: { x: -80 } } }, { r: { at: [0.42, -0.15], s: 'five', rot: { x: -80 } }, l: { at: [-0.42, -0.15], s: 'five', rot: { x: -80 } } }, 2, 180)] },
  WHERE: { en: 'where', ja: 'どこ（ASL）', mouth: 'where', brow: 'question', frames: [{ d: 300, r: { at: [0.48, -0.55], s: 'point', rot: { y: -90 } } }, ...taps({ r: { at: [0.44, -0.55], s: 'point', rot: { y: -90, z: 18 } } }, { r: { at: [0.52, -0.55], s: 'point', rot: { y: -90, z: -18 } } }, 2, 200)] },
  FINE: { en: 'fine', ja: 'げんき（ASL）', mouth: 'fine', frames: [{ d: 350, r: { at: [0.26, -0.15], s: 'five', rot: SIDE } }, ...taps({ r: { at: [0.17, -0.13], s: 'five', rot: SIDE } }, { r: { at: [0.26, -0.15], s: 'five', rot: SIDE } })] },
  HOME: { en: 'home', ja: 'いえ（ASL）', mouth: 'home', frames: [{ d: 350, r: { at: [0.12, -0.82], s: 'flatO', rot: SIDE } }, { d: 500, r: { at: [0.34, -0.96], s: 'flatO', rot: SIDE } }] },
  WANT: { en: 'want', ja: 'ほしい（ASL）', mouth: 'want', frames: [{ d: 350, r: { at: [0.5, -0.12], s: 'five', rot: { x: -80 } }, l: { at: [-0.5, -0.12], s: 'five', rot: { x: -80 } } }, { d: 550, r: { at: [0.36, -0.04], s: 'claw', rot: { x: -80 } }, l: { at: [-0.36, -0.04], s: 'claw', rot: { x: -80 } } }] },
  FAMILY: { en: 'family', ja: 'かぞく（ASL）', mouth: 'family', frames: [{ d: 350, r: { at: [0.13, -0.35], s: 'F' }, l: { at: [-0.13, -0.35], s: 'F' } }, { d: 350, r: { at: [0.38, -0.2], s: 'F', rot: { y: 90 } }, l: { at: [-0.38, -0.2], s: 'F', rot: { y: 90 } } }, { d: 350, r: { at: [0.13, -0.05], s: 'F', rot: IN }, l: { at: [-0.13, -0.05], s: 'F', rot: IN } }] },
  BABY: { en: 'baby', ja: 'あかちゃん（ASL）', mouth: 'baby', brow: 'happy', frames: [{ d: 350, r: { at: [0.1, 0.0], s: 'flat', rot: UP_X }, l: { at: [-0.1, 0.12], s: 'flat', rot: UP_X } }, ...taps({ r: { at: [0.2, -0.06], s: 'flat', rot: UP_X }, l: { at: [-0.02, 0.06], s: 'flat', rot: UP_X } }, { r: { at: [0.02, 0.06], s: 'flat', rot: UP_X }, l: { at: [-0.2, -0.06], s: 'flat', rot: UP_X } }, 2, 260)] },
  ILY: { en: 'I love you', ja: 'あいしてる（ASL）', mouth: 'I love you', brow: 'happy', frames: [{ d: 350, r: { at: [0.5, -0.45], s: 'ILY' } }, { d: 700, r: { at: [0.52, -0.5], s: 'ILY' } }] },

  // ---------- JSL ----------
  'こんにちは': { en: 'hello', ja: 'こんにちは', mouth: 'こんにちは', frames: [{ d: 350, r: { at: [0.06, -1.36], s: 'U', rot: IN } }, { d: 350, r: { at: [0.06, -1.36], s: 'U', rot: IN } }, { d: 350, r: { at: [0.22, -0.35], s: 'point', rot: SIDE }, l: { at: [-0.22, -0.35], s: 'point', rot: SIDE } }, { d: 400, r: { at: [0.2, -0.3], s: 'X', rot: SIDE }, l: { at: [-0.2, -0.3], s: 'X', rot: SIDE } }] },
  'おはよう': { en: 'good morning', ja: 'おはよう', mouth: 'おはよう', frames: [{ d: 350, r: { at: [0.46, -1.0], s: 'S', rot: SIDE } }, { d: 450, r: { at: [0.5, -0.55], s: 'S', rot: SIDE } }, { d: 350, r: { at: [0.22, -0.35], s: 'point', rot: SIDE }, l: { at: [-0.22, -0.35], s: 'point', rot: SIDE } }, { d: 400, r: { at: [0.2, -0.3], s: 'X', rot: SIDE }, l: { at: [-0.2, -0.3], s: 'X', rot: SIDE } }] },
  'ありがとう': { en: 'thank you', ja: 'ありがとう', mouth: 'ありがとう', frames: [{ d: 350, l: { at: [-0.1, 0.02], s: 'flat', rot: DOWN_X }, r: { at: [0.02, -0.08], s: 'flat', rot: SIDE } }, { d: 300, l: { at: [-0.1, 0.02], s: 'flat', rot: DOWN_X }, r: { at: [0.02, -0.08], s: 'flat', rot: SIDE } }, { d: 600, l: { at: [-0.1, 0.02], s: 'flat', rot: DOWN_X }, r: { at: [0.06, -0.5], s: 'flat', rot: SIDE } }] },
  'ごめんなさい': { en: 'I\'m sorry', ja: 'ごめんなさい', mouth: 'ごめんなさい', brow: 'sad', frames: [{ d: 350, r: { at: [0.08, -1.2], s: 'pinch', rot: SIDE } }, { d: 300, r: { at: [0.08, -1.2], s: 'pinch', rot: SIDE } }, { d: 600, r: { at: [0.34, -0.45], s: 'flat', rot: SIDE } }] },
  'いいえ': { en: 'no', ja: 'いいえ', mouth: 'いいえ', frames: [{ d: 300, r: { at: [0.3, -0.95], s: 'flat', rot: SIDE } }, ...taps({ r: { at: [0.18, -0.95], s: 'flat', rot: { y: -90, z: 10 } } }, { r: { at: [0.38, -0.95], s: 'flat', rot: { y: -90, z: -10 } } }, 2, 180)] },
  'すき': { en: 'like', ja: 'すき', mouth: 'すき', brow: 'happy', frames: [{ d: 350, r: { at: [0.1, -0.6], s: 'L', rot: { x: 90 } } }, { d: 600, r: { at: [0.1, -0.35], s: 'pinch', rot: { x: 90 } } }] },
  'わたし': { en: 'I / me', ja: 'わたし', mouth: 'わたし', frames: [{ d: 300, r: { at: [0.2, -0.22], s: 'point', rot: BACK } }, { d: 400, r: { at: [0.08, -0.18], s: 'point', rot: BACK } }] },
  'あなた': { en: 'you', ja: 'あなた', mouth: 'あなた', frames: [{ d: 300, r: { at: [0.4, -0.45], s: 'point', rot: FWD } }, { d: 400, r: { at: [0.34, -0.4], s: 'point', rot: FWD } }] },
  'なまえ': { en: 'name', ja: 'なまえ', mouth: 'なまえ', frames: [{ d: 350, l: { at: [-0.2, -0.38], s: 'flat' }, r: { at: [0.1, -0.38], s: 'A', rot: IN } }, { d: 300, l: { at: [-0.2, -0.38], s: 'flat' }, r: { at: [-0.06, -0.38], s: 'A', rot: IN } }, { d: 400, l: { at: [-0.2, -0.38], s: 'flat' }, r: { at: [-0.06, -0.38], s: 'A', rot: IN } }] },
  'ともだち': { en: 'friend', ja: 'ともだち', mouth: 'ともだち', frames: [{ d: 350, r: { at: [0.04, -0.28], s: 'flat', rot: DOWN_X }, l: { at: [-0.04, -0.22], s: 'flat', rot: UP_X } }, ...taps({ r: { at: [0.1, -0.28], s: 'flat', rot: DOWN_X }, l: { at: [0.02, -0.22], s: 'flat', rot: UP_X } }, { r: { at: [-0.02, -0.28], s: 'flat', rot: DOWN_X }, l: { at: [-0.1, -0.22], s: 'flat', rot: UP_X } }, 2, 200)] },
  'たべる': { en: 'eat', ja: 'たべる', mouth: 'たべる', frames: [{ d: 350, l: { at: [-0.06, 0.0], s: 'flat', rot: UP_X }, r: { at: [0.02, -0.14], s: 'V', rot: SIDE } }, ...taps({ l: { at: [-0.06, 0.0], s: 'flat', rot: UP_X }, r: { at: [0.1, -0.76], s: 'V', rot: SIDE } }, { l: { at: [-0.06, 0.0], s: 'flat', rot: UP_X }, r: { at: [0.02, -0.14], s: 'V', rot: SIDE } }, 2, 260)] },
  'のむ': { en: 'drink', ja: 'のむ', mouth: 'のむ', frames: [{ d: 300, r: { at: [0.3, -0.5], s: 'C', rot: SIDE } }, { d: 500, r: { at: [0.14, -0.8], s: 'C', rot: { y: -90, z: 35 } } }] },
  'おかあさん': { en: 'mother', ja: 'おかあさん', mouth: 'おかあさん', frames: [{ d: 350, r: { at: [0.36, -0.92], s: 'point', rot: SIDE } }, { d: 300, r: { at: [0.32, -0.9], s: 'point', rot: SIDE } }, { d: 500, r: { at: [0.45, -0.5], s: 'I' } }] },
  'おとうさん': { en: 'father', ja: 'おとうさん', mouth: 'おとうさん', frames: [{ d: 350, r: { at: [0.36, -0.92], s: 'point', rot: SIDE } }, { d: 300, r: { at: [0.32, -0.9], s: 'point', rot: SIDE } }, { d: 500, r: { at: [0.45, -0.5], s: 'thumbUp' } }] },
  'おいしい': { en: 'delicious', ja: 'おいしい', mouth: 'おいしい', brow: 'happy', frames: [{ d: 350, r: { at: [0.42, -0.9], s: 'flat', rot: SIDE } }, ...taps({ r: { at: [0.36, -0.9], s: 'flat', rot: SIDE } }, { r: { at: [0.44, -0.9], s: 'flat', rot: SIDE } })] },
  'あそぶ': { en: 'play', ja: 'あそぶ', mouth: 'あそぶ', brow: 'happy', frames: [{ d: 300, r: { at: [0.42, -0.95], s: 'point' }, l: { at: [-0.42, -0.95], s: 'point' } }, ...taps({ r: { at: [0.42, -0.95], s: 'point', rot: { x: 30 } }, l: { at: [-0.42, -0.95], s: 'point', rot: { x: -30 } } }, { r: { at: [0.42, -0.95], s: 'point', rot: { x: -30 } }, l: { at: [-0.42, -0.95], s: 'point', rot: { x: 30 } } }, 2, 220)] },
  'だいじょうぶ': { en: 'OK / all right', ja: 'だいじょうぶ', mouth: 'だいじょうぶ', frames: [{ d: 350, r: { at: [-0.14, -0.18], s: 'bentB', rot: IN } }, { d: 600, r: { at: [0.24, -0.18], s: 'bentB', rot: IN } }] },
  'よろしく': { en: 'nice to meet you', ja: 'よろしく', mouth: 'よろしく', frames: [{ d: 350, r: { at: [0.06, -1.0], s: 'S', rot: SIDE } }, { d: 300, r: { at: [0.06, -1.0], s: 'S', rot: SIDE } }, { d: 600, r: { at: [0.34, -0.4], s: 'flat', rot: DOWN_X } }] },
  'なに': { en: 'what', ja: 'なに', mouth: 'なに', brow: 'question', frames: [{ d: 300, r: { at: [0.44, -0.5], s: 'point' } }, ...taps({ r: { at: [0.44, -0.5], s: 'point', rot: { z: 18 } } }, { r: { at: [0.44, -0.5], s: 'point', rot: { z: -18 } } }, 2, 180)] }
};

// ---------------------------------------------------------------------------
// Visemes (mouth shapes): w = width, h = opening, r = rounded, t = teeth, g = tongue
const VIS = {
  rest: { w: 0.16, h: 0.012 }, a: { w: 0.19, h: 0.13 }, i: { w: 0.24, h: 0.045, t: 1 }, u: { w: 0.09, h: 0.06, r: 1 },
  e: { w: 0.22, h: 0.075, t: 1 }, o: { w: 0.13, h: 0.11, r: 1 }, m: { w: 0.17, h: 0 }, f: { w: 0.2, h: 0.03, t: 1 },
  th: { w: 0.2, h: 0.05, g: 1 }, l: { w: 0.18, h: 0.085, g: 1 }, s: { w: 0.21, h: 0.03, t: 1 }
};
const KANA_V = {};
'あかさたなはまやらわがざだばぱ'.split('').forEach((k) => (KANA_V[k] = 'a'));
'いきしちにひみりぎじぢびぴ'.split('').forEach((k) => (KANA_V[k] = 'i'));
'うくすつぬふむゆるぐずづぶぷ'.split('').forEach((k) => (KANA_V[k] = 'u'));
'えけせてねへめれげぜでべぺ'.split('').forEach((k) => (KANA_V[k] = 'e'));
'おこそとのほもよろをごぞどぼぽ'.split('').forEach((k) => (KANA_V[k] = 'o'));
KANA_V['ん'] = 'm'; KANA_V['っ'] = 'rest'; KANA_V['ー'] = null;

export function visemes(text) {
  const out = [];
  const s = String(text).toLowerCase();
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (KANA_V[c] !== undefined) { if (KANA_V[c]) out.push(KANA_V[c]); else if (out.length) out.push(out[out.length - 1]); continue; }
    if ('ゃャ'.includes(c)) { out[out.length - 1] = 'a'; continue; }
    if ('ゅュ'.includes(c)) { out[out.length - 1] = 'u'; continue; }
    if ('ょョ'.includes(c)) { out[out.length - 1] = 'o'; continue; }
    if (c === 't' && n === 'h') { out.push('th'); i++; continue; }
    if ('a'.includes(c)) out.push('a');
    else if ('e'.includes(c)) out.push(n === undefined ? 'rest' : 'e');
    else if ('iy'.includes(c)) out.push('i');
    else if ('o'.includes(c)) out.push('o');
    else if ('uwq'.includes(c)) out.push('u');
    else if ('mbp'.includes(c)) out.push('m');
    else if ('fv'.includes(c)) out.push('f');
    else if ('ln'.includes(c)) out.push('l');
    else if ('sczjx'.includes(c)) out.push('s');
    else if ('tdkgrh'.includes(c)) out.push('e');
    else if (c === ' ' || c === ',') out.push('rest');
  }
  // collapse repeats
  return out.filter((v, i) => v !== out[i - 1]);
}

// ---------------------------------------------------------------------------
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const ptsCache = new Map();
function handPts(lang, h) {
  const key = lang + '|' + h.s + '|' + JSON.stringify(h.rot || {});
  if (!ptsCache.has(key)) {
    let pose = POSES[h.s];
    if (!pose) {
      const set = lang === 'ja' ? JSL : ASL;
      const sh = set[h.s] || ASL_WORDSHAPES[h.s];
      pose = sh ? sh.pose : POSES.flat;
      if (h.rot) pose = strip(pose);
    }
    const p = h.rot ? { ...pose, rot: h.rot } : pose;
    ptsCache.set(key, synthesize(p));
  }
  return ptsCache.get(key);
}

function poseFor(lang, h) {
  let pose = POSES[h.s];
  if (!pose) {
    const set = lang === 'ja' ? JSL : ASL;
    const sh = set[h.s] || ASL_WORDSHAPES[h.s];
    pose = sh ? strip(sh.pose) : POSES.flat;
  }
  return h.rot ? { ...pose, rot: h.rot } : pose;
}

/**
 * What the camera checks for a whole-word sign: the key handshapes of Miko's
 * dominant hand (any of them, at any angle) and whether the sign moves.
 */
export function signTemplates(tok, lang) {
  const lex = LEXICON[tok];
  if (!lex) return null;
  const shapes = new Map(), places = [];
  for (const fr of lex.frames) {
    if (!fr.r) continue;
    shapes.set(fr.r.s + JSON.stringify(fr.r.rot || {}), fr.r);
    places.push(fr.r.at);
  }
  const list = [...shapes.values()].slice(0, 4);
  let travel = 0;
  for (const a of places) for (const b of places) travel = Math.max(travel, Math.hypot(a[0] - b[0], a[1] - b[1]));
  return { templates: list.map((hd) => extract(synthesize(poseFor(lang, hd)))), needMove: travel > 0.12 || list.length > 1 };
}

/** Build a frame list from tokens: lexicon keys or '#WORD' (fingerspelling). */
export function buildTimeline(tokens, lang) {
  const frames = [];
  const mouths = [];
  let t = 0;
  const push = (f) => { frames.push({ ...f, t0: t }); t += f.d; };
  push({ d: 250, r: REST_R, l: REST_L });
  for (const tok of tokens) {
    const start = t;
    if (tok.startsWith('#')) {
      const word = tok.slice(1);
      const chars = Array.from(word);
      chars.forEach((ch, i) => {
        const prev = chars[i - 1];
        if (prev === ch) push({ d: 160, r: { at: [0.58, -0.48], s: ch } }); // small bounce for double letters
        push({ d: i === 0 ? 380 : 240, r: { at: [0.55, -0.55], s: ch }, letter: ch });
        push({ d: 420, r: { at: [0.55, -0.55], s: ch }, letter: ch, sayIt: true }); // hold frame: announce once
      });
      mouths.push({ t0: start, t1: t, text: lang === 'ja' ? word : word.toLowerCase() });
    } else {
      const lex = LEXICON[tok];
      if (!lex) continue;
      lex.frames.forEach((f) => push({ ...f, r: f.r || REST_R, l: f.l || REST_L, brow: lex.brow }));
      mouths.push({ t0: start + 150, t1: t, text: lex.mouth });
    }
    push({ d: 220, r: frames[frames.length - 1].r, l: frames[frames.length - 1].l });
  }
  push({ d: 450, r: REST_R, l: REST_L });
  return { frames, mouths, total: t };
}

export class Avatar {
  constructor(canvas, opts = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.lang = opts.lang || 'en';
    this.skin = opts.skin || 'light';
    this.timeline = null;
    this.t0 = 0;
    this.onDone = null;
    this.blinkAt = performance.now() + 2000;
    this.running = true;
    this.caption = null;
    this.onLetter = null;
    const loop = (now) => { if (!this.running) return; this.draw(now); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  destroy() { this.running = false; cancelAnimationFrame(this.raf); if (this.onDone) this.onDone(false); }
  play(tokens) {
    if (this.onDone) this.onDone(false);
    this.timeline = buildTimeline(tokens, this.lang);
    this.t0 = performance.now();
    return new Promise((res) => { this.onDone = (ok) => { this.onDone = null; res(ok); }; });
  }
  /** Show a single static handshape (for letters). */
  hold(shapeKey, at = [0.5, -0.5]) {
    this.timeline = { frames: [{ d: 250, r: REST_R, l: REST_L, t0: 0 }, { d: 450, r: { at, s: shapeKey }, t0: 250, letter: shapeKey }], mouths: [], total: 1e12 };
    this.t0 = performance.now();
  }

  state(now) {
    const tl = this.timeline;
    if (!tl) return { r: REST_R, l: REST_L, rP: handPts(this.lang, REST_R), lP: handPts(this.lang, REST_L), mouth: VIS.rest };
    let t = now - this.t0;
    if (t >= tl.total && tl.total < 1e11) {
      this.timeline = null;
      if (this.onDone) this.onDone(true);
      return this.state(now);
    }
    const fr = tl.frames;
    let i = fr.findIndex((f) => t < f.t0 + f.d);
    if (i < 0) i = fr.length - 1;
    const cur = fr[i], prev = fr[i - 1] || cur;
    const u = ease(Math.min(1, (t - cur.t0) / Math.max(1, cur.d)));
    const mix = (a, b) => ({ at: [a.at[0] + (b.at[0] - a.at[0]) * u, a.at[1] + (b.at[1] - a.at[1]) * u] });
    const rA = prev.r || REST_R, rB = cur.r || REST_R, lA = prev.l || REST_L, lB = cur.l || REST_L;
    const st = {
      r: mix(rA, rB), l: mix(lA, lB),
      rP: blendPts(handPts(this.lang, rA), handPts(this.lang, rB), u),
      lP: blendPts(handPts(this.lang, lA), handPts(this.lang, lB), u),
      brow: cur.brow, letter: cur.letter
    };
    if (cur.sayIt && this.onLetter && this._lastLetterFrame !== i) { this._lastLetterFrame = i; this.onLetter(cur.letter); }
    // mouth
    let m = VIS.rest;
    for (const mo of tl.mouths) {
      if (t >= mo.t0 && t <= mo.t1) {
        if (!mo.v) mo.v = visemes(mo.text);
        const k = Math.min(mo.v.length - 1, Math.floor(((t - mo.t0) / (mo.t1 - mo.t0)) * mo.v.length));
        const kk = Math.min(mo.v.length - 1, k + 1);
        const fpos = ((t - mo.t0) / (mo.t1 - mo.t0)) * mo.v.length - k;
        m = lerpVis(VIS[mo.v[k]] || VIS.rest, VIS[mo.v[kk]] || VIS.rest, Math.max(0, fpos - 0.6) / 0.4);
        st.speaking = mo.text;
      }
    }
    st.mouth = m;
    return st;
  }

  draw(now) {
    const { c, ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth, H = c.clientHeight;
    if (!W || !H) return;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const z = this.zoom || 1;
    this._z = (this._z || 1) + (z - (this._z || 1)) * 0.06; // smooth zoom toward the face
    const u = Math.min(H / 2.85, W / 2.7) * this._z;
    const ox = W / 2, oy = H * 0.66 + (this._z - 1) * u * 1.15;
    const P = (x, y) => [ox + x * u, oy + y * u];
    if (this.timeline !== this._tl) { this._tl = this.timeline; this._lastLetterFrame = -1; }
    const st = this.state(now);
    const skin = SKIN[this.skin] || SKIN.light;
    const breathe = Math.sin(now / 900) * 0.008;

    // backdrop glow
    const g = ctx.createRadialGradient(ox, oy - u * 0.8, u * 0.2, ox, oy - u * 0.6, u * 1.9);
    g.addColorStop(0, 'rgba(120,170,255,0.22)'); g.addColorStop(1, 'rgba(120,170,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // torso
    ctx.save();
    const [tx, ty] = P(0, -0.45 + breathe);
    ctx.fillStyle = '#5b6cff';
    ctx.beginPath();
    ctx.moveTo(tx - u * 0.55, ty + u * 0.02);
    ctx.quadraticCurveTo(tx - u * 0.75, ty + u * 0.1, tx - u * 0.8, ty + u * 0.6);
    ctx.lineTo(tx - u * 0.85, ty + u * 2);
    ctx.lineTo(tx + u * 0.85, ty + u * 2);
    ctx.lineTo(tx + u * 0.8, ty + u * 0.6);
    ctx.quadraticCurveTo(tx + u * 0.75, ty + u * 0.1, tx + u * 0.55, ty + u * 0.02);
    ctx.closePath();
    const tg = ctx.createLinearGradient(tx, ty, tx, ty + u * 1.5);
    tg.addColorStop(0, '#6f7dff'); tg.addColorStop(1, '#3f49c9');
    ctx.fillStyle = tg; ctx.fill();
    // collar
    ctx.fillStyle = '#ffffff22';
    ctx.beginPath(); ctx.ellipse(tx, ty + u * 0.02, u * 0.22, u * 0.09, 0, 0, Math.PI); ctx.fill();
    // star badge
    drawStar(ctx, tx + u * 0.35, ty + u * 0.35, u * 0.07, '#ffd166');
    ctx.restore();

    // neck
    const [nx, ny] = P(0, -0.62 + breathe);
    ctx.fillStyle = skin.shade;
    ctx.fillRect(nx - u * 0.1, ny - u * 0.1, u * 0.2, u * 0.25);

    // head
    this.drawHead(ctx, P, u, skin, st, now);

    // arms + hands (draw the hand further from the viewer first)
    const hs = u * 0.84;
    const items = [
      { side: 'l', at: st.l.at, pts: st.lP, mirror: true },
      { side: 'r', at: st.r.at, pts: st.rP, mirror: false }
    ];
    for (const it of items) {
      const [hx, hy] = P(it.at[0], it.at[1]);
      const sh = P(it.side === 'r' ? 0.56 : -0.56, -0.38 + breathe);
      // wrist position in screen space = landmark 0 of the fitted hand
      const wrist = fittedWrist(it.pts, hx, hy, hs, it.mirror);
      drawArm(ctx, sh, wrist, u, it.side === 'r' ? 1 : -1, skin);
      drawHand(ctx, it.pts, { cx: hx, cy: hy, scale: hs, mirror: it.mirror, skin });
    }
  }

  drawHead(ctx, P, u, skin, st, now) {
    const [hx, hy] = P(0, -1.08);
    const rx = u * 0.36, ry = u * 0.41;
    // hair back
    ctx.fillStyle = '#2b2350';
    ctx.beginPath(); ctx.ellipse(hx, hy - u * 0.04, rx * 1.12, ry * 1.08, 0, 0, Math.PI * 2); ctx.fill();
    // ears
    ctx.fillStyle = skin.shade;
    ctx.beginPath(); ctx.ellipse(hx - rx * 0.98, hy + u * 0.03, u * 0.06, u * 0.085, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + rx * 0.98, hy + u * 0.03, u * 0.06, u * 0.085, 0, 0, Math.PI * 2); ctx.fill();
    // face
    const fg = ctx.createRadialGradient(hx - rx * 0.3, hy - ry * 0.3, rx * 0.2, hx, hy, ry * 1.1);
    fg.addColorStop(0, skin.base); fg.addColorStop(1, skin.shade);
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.ellipse(hx, hy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    // fringe
    ctx.fillStyle = '#2b2350';
    ctx.beginPath();
    ctx.moveTo(hx - rx * 1.05, hy - ry * 0.1);
    ctx.quadraticCurveTo(hx - rx * 0.9, hy - ry * 1.15, hx, hy - ry * 1.02);
    ctx.quadraticCurveTo(hx + rx * 0.9, hy - ry * 1.15, hx + rx * 1.05, hy - ry * 0.1);
    ctx.quadraticCurveTo(hx + rx * 0.7, hy - ry * 0.75, hx + rx * 0.1, hy - ry * 0.62);
    ctx.quadraticCurveTo(hx - rx * 0.2, hy - ry * 0.9, hx - rx * 0.5, hy - ry * 0.55);
    ctx.quadraticCurveTo(hx - rx * 0.85, hy - ry * 0.6, hx - rx * 1.05, hy - ry * 0.1);
    ctx.fill();
    // hair clip
    drawStar(ctx, hx + rx * 0.62, hy - ry * 0.62, u * 0.05, '#ff7eb6');

    // eyebrows
    const browLift = st.brow === 'question' ? -0.03 : st.brow === 'happy' ? -0.015 : 0;
    const browTilt = st.brow === 'sad' ? 0.25 : st.brow === 'question' ? -0.1 : 0;
    ctx.strokeStyle = '#2b2350'; ctx.lineWidth = u * 0.025; ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      const bx = hx + s * rx * 0.42, by = hy - ry * 0.28 + browLift * u;
      ctx.moveTo(bx - u * 0.07, by + s * browTilt * u * 0.05 * -1 + (st.brow === 'sad' ? u * 0.01 : 0));
      ctx.quadraticCurveTo(bx, by - u * 0.025, bx + u * 0.07, by + s * browTilt * u * 0.05);
      ctx.stroke();
    }
    // eyes
    if (now > this.blinkAt + 140) this.blinkAt = now + 2200 + Math.random() * 2600;
    const blink = now > this.blinkAt && now < this.blinkAt + 140;
    for (const s of [-1, 1]) {
      const ex = hx + s * rx * 0.42, ey = hy - ry * 0.08;
      if (blink || st.brow === 'happy') {
        ctx.strokeStyle = '#2b2350'; ctx.lineWidth = u * 0.022;
        ctx.beginPath(); ctx.arc(ex, ey + (blink ? 0 : u * 0.01), u * 0.045, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(ex, ey, u * 0.055, u * 0.065, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a2a6b';
        ctx.beginPath(); ctx.arc(ex + u * 0.006, ey + u * 0.008, u * 0.038, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ex + u * 0.018, ey - u * 0.012, u * 0.012, 0, Math.PI * 2); ctx.fill();
      }
    }
    // cheeks
    ctx.fillStyle = 'rgba(255,120,140,0.28)';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + s * rx * 0.62, hy + ry * 0.22, u * 0.07, u * 0.04, 0, 0, Math.PI * 2); ctx.fill(); }
    // nose
    ctx.strokeStyle = skin.line; ctx.lineWidth = u * 0.014;
    ctx.beginPath(); ctx.moveTo(hx, hy + ry * 0.05); ctx.quadraticCurveTo(hx + u * 0.025, hy + ry * 0.2, hx - u * 0.01, hy + ry * 0.24); ctx.stroke();
    // mouth
    drawMouth(ctx, hx, hy + ry * 0.5, u, st.mouth, st.brow === 'happy' && !st.speaking);
  }
}

function lerpVis(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  return { w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t, r: t < 0.5 ? a.r : b.r, t: t < 0.5 ? a.t : b.t, g: t < 0.5 ? a.g : b.g };
}

function drawMouth(ctx, x, y, u, m, smile) {
  const w = m.w * u, h = m.h * u;
  ctx.save();
  if (h < 0.004 * u) {
    ctx.strokeStyle = '#a2405a'; ctx.lineWidth = u * 0.02; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x, y + (smile ? u * 0.05 : u * 0.018), x + w / 2, y); ctx.stroke();
    ctx.restore(); return;
  }
  ctx.beginPath();
  if (m.r) ctx.ellipse(x, y + h * 0.1, w / 2, h / 2 + u * 0.01, 0, 0, Math.PI * 2);
  else { ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x, y - h * 0.35, x + w / 2, y); ctx.quadraticCurveTo(x, y + h * 1.25, x - w / 2, y); }
  ctx.fillStyle = '#5a1530'; ctx.fill();
  ctx.save(); ctx.clip();
  if (m.t) { ctx.fillStyle = '#fff'; ctx.fillRect(x - w / 2, y - h * 0.4, w, Math.max(u * 0.02, h * 0.35)); }
  if (m.g || h > 0.08 * u) { ctx.fillStyle = '#ff7a95'; ctx.beginPath(); ctx.ellipse(x, y + h * (m.g ? 0.25 : 0.7), w * 0.32, h * 0.35, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = '#a2405a'; ctx.lineWidth = u * 0.014; ctx.stroke();
  ctx.restore();
}

function drawStar(ctx, x, y, r, color) {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function fittedWrist(pts, cx, cy, scale, mirror) {
  const P = pts.map((p) => { const k = 1 / (1 - p[2] * 0.35); return [(mirror ? -p[0] : p[0]) * scale * k, -p[1] * scale * k]; });
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of P) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
  return [P[0][0] + cx - (x0 + x1) / 2, P[0][1] + cy - (y0 + y1) / 2];
}

function drawArm(ctx, S, Wr, u, side, skin) {
  const L1 = u * 0.66, L2 = u * 0.62;
  const dx = Wr[0] - S[0], dy = Wr[1] - S[1];
  let d = Math.hypot(dx, dy);
  const dd = Math.min(d, L1 + L2 - 1);
  const a = Math.atan2(dy, dx);
  const cosB = (L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd);
  const b = Math.acos(Math.max(-1, Math.min(1, cosB)));
  // choose the elbow that hangs outward and down
  const e1 = [S[0] + Math.cos(a + b) * L1, S[1] + Math.sin(a + b) * L1];
  const e2 = [S[0] + Math.cos(a - b) * L1, S[1] + Math.sin(a - b) * L1];
  const score = (e) => e[1] + side * e[0] * 0.6;
  const E = score(e1) > score(e2) ? e1 : e2;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // forearm (skin)
  ctx.strokeStyle = skin.line; ctx.lineWidth = u * 0.15;
  ctx.beginPath(); ctx.moveTo(E[0], E[1]); ctx.lineTo(Wr[0], Wr[1]); ctx.stroke();
  ctx.strokeStyle = skin.shade; ctx.lineWidth = u * 0.13;
  ctx.beginPath(); ctx.moveTo(E[0], E[1]); ctx.lineTo(Wr[0], Wr[1]); ctx.stroke();
  // sleeve (upper arm + part of forearm)
  ctx.strokeStyle = '#4b57e0'; ctx.lineWidth = u * 0.19;
  const mid = [E[0] + (Wr[0] - E[0]) * 0.35, E[1] + (Wr[1] - E[1]) * 0.35];
  ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(E[0], E[1]); ctx.lineTo(mid[0], mid[1]); ctx.stroke();
  ctx.strokeStyle = '#6f7dff'; ctx.lineWidth = u * 0.145;
  ctx.beginPath(); ctx.moveTo(S[0], S[1]); ctx.lineTo(E[0], E[1]); ctx.lineTo(mid[0], mid[1]); ctx.stroke();
  ctx.restore();
}
