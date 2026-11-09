// Sign It — handshape library for ASL fingerspelling and JSL yubimoji (指文字).
// Every entry is a pose for handmodel.synthesize(). Poses are written for the
// dominant hand as seen in a mirror (palm toward the camera unless rotated).
//
// NOTE FOR REVIEWERS: The JSL set intentionally contains only the kana whose
// handshapes are static and well documented. Please have a fluent signer
// review any change here — see README "Sign accuracy review".
import { F } from './handmodel.js';

const T = { // thumb tip targets
  side: { tip: [-0.17, 0.33, 0.08] },
  out: { tip: [-0.40, 0.31, 0.03] },
  across: { tip: [0.0, 0.24, 0.08] },
  front: { tip: [-0.01, 0.31, 0.27] },
  hold: { tip: [0.05, 0.30, 0.24] },
  t: { tip: [-0.085, 0.44, 0.21] },
  n: { tip: [0.005, 0.43, 0.22] },
  m: { tip: [0.09, 0.41, 0.22] },
  e: { tip: [-0.03, 0.27, 0.15] },
  up: { tip: [-0.16, 0.56, 0.06] },
  g: { tip: [-0.24, 0.52, 0.05] }
};

const fist = { index: F.C, middle: F.C, ring: F.C, pinky: F.C };

// ---------------------------------------------------------------------------
// ASL alphabet
export const ASL = {
  A: { pose: { ...fist, thumb: T.side }, en: 'Make a fist. Rest your thumb straight up along the side of your index finger.', ja: 'こぶしを作り、親指を人差し指の横にまっすぐ添えます。' },
  B: { pose: { index: F.S, middle: F.S, ring: F.S, pinky: F.S, splay: { index: -1, middle: 0, ring: 1, pinky: 3 }, thumb: T.across }, en: 'Hold four fingers straight up and together. Fold your thumb across your palm.', ja: '4本の指をそろえてまっすぐ立て、親指を手のひらに折ります。' },
  C: { pose: { index: F.Cc, middle: F.Cc, ring: F.Cc, pinky: F.Cc, splay: { index: -1, middle: 0, ring: 1, pinky: 3 }, thumb: { tip: [-0.07, 0.30, 0.36] }, rot: { y: -70 } }, en: 'Curve your fingers and thumb into the shape of the letter C.', ja: '指と親指を丸めて「C」の形を作ります。' },
  D: { pose: { index: F.S, middle: F.O, ring: F.O, pinky: F.O, thumb: { touch: 'middle' } }, en: 'Point your index finger up. Touch your thumb to your other fingertips to make a circle.', ja: '人差し指を立て、ほかの指先と親指をくっつけて輪を作ります。' },
  E: { pose: { index: F.E, middle: F.E, ring: F.E, pinky: F.E, thumb: T.e }, en: 'Bend your fingertips down to touch your thumb, which is tucked under them.', ja: '指先を曲げて、下に折った親指に軽くのせます。' },
  F: { pose: { index: F.O, middle: F.S, ring: F.S, pinky: F.S, splay: { index: -2, middle: 2, ring: 9, pinky: 18 }, thumb: { touch: 'index' } }, en: 'Touch your index finger to your thumb to make a circle. Spread the other three fingers up.', ja: '人差し指と親指で輪を作り、残りの3本を広げて立てます。' },
  G: { pose: { index: F.S, middle: F.C, ring: F.C, pinky: F.C, thumb: T.g, rot: { z: 90, x: 180 } }, en: 'Point your index finger sideways with your thumb above it, like a little beak.', ja: '人差し指を横に向け、親指をその上に平行にそえます。' },
  H: { pose: { index: F.S, middle: F.S, ring: F.C, pinky: F.C, splay: { index: 1, middle: -1 }, thumb: T.hold, rot: { z: 90, x: 180 } }, en: 'Point your index and middle fingers sideways, held together.', ja: '人差し指と中指をそろえて横に向けます。' },
  I: { pose: { ...fist, pinky: F.S, thumb: T.front }, en: 'Make a fist and raise only your pinky finger.', ja: 'こぶしから小指だけを立てます。' },
  J: { pose: { ...fist, pinky: F.S, thumb: T.front }, motion: 'J', en: 'Make the letter I, then draw a J in the air with your pinky (down, then curve).', ja: '「I」の形から、小指で空中に「J」を描きます。' },
  K: { pose: { index: F.S, middle: [0.42, 0, 0], ring: F.C, pinky: F.C, splay: { index: -8, middle: 6 }, thumb: { touch: 'middle', at: 'pip', off: [-0.03, 0, 0.03] } }, en: 'Point index finger up and middle finger forward. Put your thumb between them.', ja: '人差し指を上、中指を前に出し、その間に親指を当てます。' },
  L: { pose: { ...fist, index: F.S, thumb: T.out }, en: 'Point your index finger up and your thumb out to the side, making an L.', ja: '人差し指を上に、親指を横に出して「L」の形を作ります。' },
  M: { pose: { index: F.M, middle: F.M, ring: F.M, pinky: F.C, thumb: T.m }, en: 'Tuck your thumb under your first three fingers.', ja: '親指を人差し指・中指・薬指の下に入れます。' },
  N: { pose: { index: F.M, middle: F.M, ring: F.C, pinky: F.C, thumb: T.n }, en: 'Tuck your thumb under your first two fingers.', ja: '親指を人差し指と中指の下に入れます。' },
  O: { pose: { index: F.O, middle: F.O, ring: F.O, pinky: F.O, splay: { index: -1, middle: 0, ring: 2, pinky: 5 }, thumb: { touch: 'middle' }, rot: { y: -60 } }, en: 'Curve all your fingers to touch your thumb, making an O.', ja: 'すべての指を丸めて親指とくっつけ、「O」の形を作ります。' },
  P: { pose: { index: F.S, middle: [0.42, 0, 0], ring: F.C, pinky: F.C, splay: { index: -8, middle: 6 }, thumb: { touch: 'middle', at: 'pip', off: [-0.03, 0, 0.03] }, rot: { x: 115 } }, en: 'Make a K and tip it so your fingers point down.', ja: '「K」の形を作り、指先を下に向けます。' },
  Q: { pose: { index: F.S, middle: F.C, ring: F.C, pinky: F.C, thumb: T.g, rot: { x: 160 } }, en: 'Make a G and point it down toward the floor.', ja: '「G」の形を作り、下に向けます。' },
  R: { pose: { index: F.S, middle: F.S, ring: F.C, pinky: F.C, splay: { index: 12, middle: -10 }, zOff: { index: 0.03 }, thumb: T.hold }, en: 'Cross your index finger over your middle finger.', ja: '人差し指と中指を交差させます。' },
  S: { pose: { ...fist, thumb: T.front }, en: 'Make a fist with your thumb wrapped across the front of your fingers.', ja: 'こぶしを作り、親指を指の前に回します。' },
  T: { pose: { ...fist, index: F.M, thumb: T.t }, en: 'Make a fist and poke your thumb up between your index and middle fingers.', ja: 'こぶしを作り、親指を人差し指と中指の間から出します。' },
  U: { pose: { index: F.S, middle: F.S, ring: F.C, pinky: F.C, splay: { index: 1, middle: -1 }, thumb: T.hold }, en: 'Hold your index and middle fingers up together.', ja: '人差し指と中指をそろえて立てます。' },
  V: { pose: { index: F.S, middle: F.S, ring: F.C, pinky: F.C, splay: { index: -13, middle: 11 }, thumb: T.hold }, en: 'Hold your index and middle fingers up and apart, like a V.', ja: '人差し指と中指を開いて立て、「V」の形にします。' },
  W: { pose: { index: F.S, middle: F.S, ring: F.S, pinky: F.O, splay: { index: -13, middle: 0, ring: 13 }, thumb: { touch: 'pinky' } }, en: 'Hold three fingers up and apart. Your thumb holds down your pinky.', ja: '3本の指を開いて立て、親指で小指を押さえます。' },
  X: { pose: { ...fist, index: F.X, thumb: T.front }, en: 'Make a fist and raise your index finger in a hook.', ja: 'こぶしから人差し指をかぎ形に曲げて出します。' },
  Y: { pose: { ...fist, pinky: F.S, splay: { pinky: 22 }, thumb: T.out }, en: 'Stretch out your thumb and pinky. Fold the other fingers down.', ja: '親指と小指を伸ばし、ほかの指は折ります。' },
  Z: { pose: { ...fist, index: F.S, thumb: T.front }, motion: 'Z', en: 'Point your index finger and draw a Z in the air.', ja: '人差し指で空中に「Z」を描きます。' }
};

// Static whole-word handshapes used in levels
export const ASL_WORDSHAPES = {
  ILY: { pose: { index: F.S, middle: F.C, ring: F.C, pinky: F.S, splay: { index: -6, pinky: 18 }, thumb: T.out }, en: '"I love you": thumb, index finger and pinky up.', ja: '「I love you」：親指・人差し指・小指を立てます。' }
};

// ---------------------------------------------------------------------------
// JSL yubimoji (指文字) — static kana only
// Japanese number shapes point sideways across the body, palm toward the signer.
const side = (pose) => ({ ...pose, rot: { z: 90, x: 180 } });
export const JSL = {
  'あ': { pose: ASL.A.pose, en: 'Fist with the thumb straight along the side.', ja: 'こぶしを作り、親指を横にそえます。' },
  'い': { pose: ASL.I.pose, en: 'Fist with only the pinky up.', ja: 'こぶしから小指だけを立てます。' },
  'う': { pose: ASL.U.pose, en: 'Index and middle fingers up, together.', ja: '人差し指と中指をそろえて立てます。' },
  'え': { pose: ASL.E.pose, en: 'Bend all four fingertips down over the thumb.', ja: '4本の指を曲げ、親指を下に折ります。' },
  'お': { pose: ASL.O.pose, en: 'Curve all fingers to meet the thumb in a ring.', ja: '指を丸めて親指とつけ、輪を作ります。' },
  'か': { pose: ASL.K.pose, en: 'Index up, middle finger forward, thumb between them.', ja: '人差し指を上、中指を前、親指をその間に。' },
  'き': { pose: { index: F.S, middle: F.O, ring: F.O, pinky: F.S, splay: { index: -6, pinky: 14 }, thumb: { touch: 'middle' } }, en: 'Fox shape: middle and ring fingers touch the thumb; index and pinky up.', ja: 'きつねの形：中指・薬指を親指につけ、人差し指と小指を立てます。' },
  'く': { pose: side({ index: F.S, middle: F.S, ring: F.S, pinky: F.S, splay: { index: -1, middle: 0, ring: 1, pinky: 2 }, thumb: { tip: [-0.30, 0.42, 0.03] } }), en: 'All fingers together pointing sideways, thumb up (the number 9).', ja: '4本の指をそろえて横に向け、親指を立てます（数字の9）。' },
  'け': { pose: ASL.B.pose, en: 'Four fingers up together, thumb folded in, palm forward.', ja: '4本の指をそろえて立て、親指を折り、手のひらを前に。' },
  'さ': { pose: ASL.S.pose, en: 'Fist with the thumb across the front.', ja: 'こぶしを作り、親指を前に回します。' },
  'し': { pose: side({ index: F.S, middle: F.S, ring: F.C, pinky: F.C, splay: { index: -3, middle: 3 }, thumb: T.out }), en: 'Thumb, index and middle fingers out, pointing sideways (the number 7).', ja: '親指・人差し指・中指を横に向けます（数字の7）。' },
  'た': { pose: { ...fist, thumb: { tip: [-0.19, 0.60, 0.10] } }, en: 'Thumbs up: fist with the thumb pointing straight up.', ja: 'こぶしから親指を上に立てます。' },
  'に': { pose: side({ index: F.S, middle: F.S, ring: F.C, pinky: F.C, splay: { index: -3, middle: 3 }, thumb: T.hold }), en: 'Index and middle fingers pointing sideways (the number 2).', ja: '人差し指と中指を横に向けます（数字の2）。' },
  'ま': { pose: { index: F.S, middle: F.S, ring: F.S, pinky: F.C, splay: { index: -3, middle: 0, ring: 3 }, thumb: { touch: 'pinky' }, rot: { z: 180, y: 180 } }, en: 'Three fingers pointing down, back of the hand forward.', ja: '3本の指を下に向け、手の甲を前に向けます。' },
  'み': { pose: side({ index: F.S, middle: F.S, ring: F.S, pinky: F.O, splay: { index: -3, middle: 0, ring: 3 }, thumb: { touch: 'pinky' } }), en: 'Three fingers pointing sideways (the number 3).', ja: '3本の指を横に向けます（数字の3）。' },
  'む': { pose: side({ ...fist, index: F.S, thumb: T.out }), en: 'Thumb and index finger pointing sideways (the number 6).', ja: '親指と人差し指を横に向けます（数字の6）。' },
  'め': { pose: ASL.F.pose, en: 'Index finger and thumb make a ring, other fingers up.', ja: '人差し指と親指で輪を作り、ほかの指を立てます。' },
  'や': { pose: ASL.Y.pose, en: 'Thumb and pinky out, other fingers folded.', ja: '親指と小指を伸ばし、ほかの指は折ります。' },
  'よ': { pose: side({ index: F.S, middle: F.S, ring: F.S, pinky: F.S, splay: { index: -3, middle: 0, ring: 3, pinky: 6 }, thumb: T.across }), en: 'Four fingers pointing sideways, thumb folded (the number 4).', ja: '4本の指を横に向け、親指を折ります（数字の4）。' },
  'ら': { pose: ASL.R.pose, en: 'Cross the index and middle fingers.', ja: '人差し指と中指を交差させます。' },
  'れ': { pose: ASL.L.pose, en: 'Index up and thumb out: an L shape.', ja: '人差し指を上、親指を横に：「L」の形。' },
  'わ': { pose: ASL.W.pose, en: 'Three fingers up and apart.', ja: '3本の指を開いて立てます。' }
};

export function signSet(lang) { return lang === 'ja' ? JSL : ASL; }
export function getShape(lang, key) {
  if (lang === 'ja') return JSL[key];
  return ASL[key] || ASL_WORDSHAPES[key];
}
