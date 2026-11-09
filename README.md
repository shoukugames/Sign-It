# Sign It 🤟

**Learn sign language with your hands!** Sign It is a desktop game that teaches
**American Sign Language (ASL)** in English mode and **Japanese Sign Language
(JSL / 日本手話)** in Japanese mode. It uses the computer or tablet camera to check
your hand and finger shapes, with every image processed on the device.

*Recommended for all ages.*

- **Version:** 0.1.0 (released 2026-11-09)
- **Creator:** Shawn Rapaz, with Claude Code
- **Website:** <https://shoukugames.org/>
- **Email:** <info@shoukugames.org>
- **License:** [GNU GPL v3.0 or later](LICENSE)

---

## Features

| Area | What it does |
|---|---|
| **Title screen** | Lessons and Levels shown side by side with progress. Toggles for language (English / 日本語), camera on/off and difficulty (Easy / Medium / Hard). Also links to the tutorial, hand calibration, For Parents and Credits. |
| **Parent permission** | The camera can't turn on until a parent answers a grown-up math question and ticks a consent box. Permission lasts for the current play session only. |
| **Camera privacy** | The game draws **only the hands**. Pixels outside the hand outline are thrown away, and the view zooms in on the hands. Nothing is recorded, saved or uploaded. |
| **Auto shut-off** | The camera turns off when you leave a camera screen, go back to the title screen, minimise or hide the window, or quit. A red **Camera on** badge shows whenever it is running. |
| **Hand calibration** | You pick your signing hand, then hold an open hand and a fist so the game learns your range of motion. It checks lighting and distance, then runs a test sign. |
| **Side-by-side view** | Every lesson, quiz and level shows the game screen on the left and the hands-only camera view on the right, so you can compare. |
| **Tutorial** | Seven slides on how signing works: the five parts of a sign, your strong hand and mirroring, fingerspelling, **moving your hands and lips together (mouthing)**, facial grammar, and playing with the camera. |
| **20 lessons** | Each lesson goes **letters → words → a sentence**. The animated teacher, Miko, signs in mirror view and moves her lips (visemes) in time with the words. |
| **Quizzes** | Quiz 1 comes after lesson 10 and the final quiz after lesson 20. Question types: which letter is this, which hand shows X, what does this sign mean, and sign it with the camera. You need 70% to pass, and passing Quiz 1 unlocks lessons 11–20. |
| **20 levels** | 1–5: match the handshape. 6–10: a word is shown, fingerspell it. 11–15: a word is spoken, sign it. 16–20: sign a whole sentence. Each sign gets **1–3 stars**. Words and sentences are judged on **accuracy** (handshape match) and **technique** (steadiness, pace, keeping the hand in place). |
| **Difficulty** | Changes star thresholds, how long you hold a sign, time limits, hints, and (on Hard) whether a look-alike sign is rejected. |
| **For Parents** | Behind a parent gate. Shows progress, successes vs. failures, time in lessons, levels, quizzes and the tutorial, quiz scores and history, the hardest and easiest signs, and settings. Data is kept separately for ASL and JSL. |
| **Sound** | No background music. Game sounds (bells, chimes, star pings, a room reverb) are synthesised live. All speech is human-recorded; see [Voice](#voice-human-recordings-only). |
| **Bilingual** | The whole interface, the lessons and the levels come in English (ASL) and Japanese (JSL). |

## How the hand recognition works

1. **Google MediaPipe Hand Landmarker** finds 21 3D points on each hand. It runs on
   the device through WebAssembly and the GPU.
2. The game turns those points into an *anatomical feature vector*: how bent each
   finger is at each knuckle, where the thumb tip sits in the palm's own
   coordinates, whether fingertips touch, whether fingers are spread or crossed,
   and which way the hand points and faces.
3. Every sign is described once as a **procedural 3D hand pose**
   (`src/renderer/js/signs.js`). The *same* pose draws the illustration you see
   and builds the template you're judged against, so the picture and the judging
   always agree.
4. Calibration maps your own open-hand-to-fist range onto the model, so children
   and adults with different flexibility are judged fairly.
5. A sign scores when you hold it steadily. The two moving ASL letters,
   **J** and **Z**, are checked by tracing the fingertip's path. If another sign
   is clearly a better match, the score is lowered (on Hard, the sign is
   rejected).

Run the recognizer self-test with `npm test`. It checks that every template
picks itself out of the whole alphabet, including with simulated tracking noise.

## Sign accuracy review

Lessons in a sign language deserve review by **fluent Deaf signers**. All
handshapes are data in `src/renderer/js/signs.js`, and the word and phrase
animations are in `src/renderer/js/avatar.js` (`LEXICON`).

- **ASL:** the full A–Z fingerspelling alphabet, plus about 35 common signs.
- **JSL:** v0.1.0 deliberately includes only the **22 yubimoji (指文字) with
  static, well-documented handshapes**: あいうえお かきくけ さし た に まみむめ や よ ら れ わ.
  Kana that need motion or dakuten are planned for later releases, after
  review. All JSL words and sentences use only these kana, plus whole-word signs.

Please report corrections with the [bug report template](BUGREPORT.md).

## Voice (human recordings only)

All speech in Sign It is meant to be **100% human**. The game never falls back
to a robotic voice by default.

- Recordings go in `assets/voice/en/` and `assets/voice/ja/` as `<filename>.mp3`
  (or `.ogg` / `.wav`).
- `npm run voice:script` writes the complete recording script with every
  filename and line to `assets/voice/SCRIPT_en.csv` (166 lines) and
  `assets/voice/SCRIPT_ja.csv` (144 lines).
- After adding files, run `npm run voice:manifest`. Builds also run it
  automatically.
- If a line has no recording yet, the game shows it as a **caption**. In
  "listen and sign" levels, the word flashes briefly on screen instead.
- Parents can choose to allow the computer's built-in voice for missing lines
  (**For Parents → Settings**). It is off by default because it may sound
  synthetic.

> **v0.1.0 ships without voice recordings.** Recording the scripts with a human
> voice actor is the next step for full spoken audio.

## Running from source

Requirements: Node.js 20+ and npm. Python 3 with Playwright is needed only to
regenerate the icons.

```bash
npm install        # also downloads the hand model and copies runtime files (tools/vendor.js)
npm start          # run the game
npm test           # recognizer self-test
```

Press **F11** to toggle full screen.

## Building installers

```bash
npm run dist:linux   # dist/sign-it_0.1.0_amd64.deb
npm run dist:win     # dist/Sign-It-Setup-0.1.0.exe (installer) + dist/Sign-It-0.1.0-portable.exe
npm run dist         # both
```

To build the Windows `.exe` on Linux, `wine` must be installed. The `.deb`
depends on `fonts-noto-color-emoji` so that icons display correctly.

Install on Debian/Ubuntu:

```bash
sudo apt install ./dist/sign-it_0.1.0_amd64.deb
```

## Project layout

```
src/main/            Electron main process (secure app:// origin, camera permission, window)
src/renderer/        The game (plain ES modules, no bundler)
  js/handmodel.js    Procedural 3D hand: pose → 21 landmarks → illustration
  js/signs.js        ASL alphabet + JSL yubimoji handshapes
  js/recognizer.js   Features, matching, stars, motion, technique, calibration mapping
  js/camera.js       MediaPipe tracking + hands-only rendering + shut-off
  js/avatar.js       Animated teacher with lip-sync visemes + word signs
  js/curriculum.js   Lessons, quizzes and levels for both languages
  js/screens/        Title, tutorial, lessons, quiz, levels, calibration, parents, credits
assets/voice/        Human voice recordings + recording scripts
build-resources/     App icons
tools/               Vendor script, icon renderer, voice tools, recognizer test
```

## Privacy

- Camera frames are processed in memory, on the device, by MediaPipe. They are
  never stored or sent anywhere.
- The game makes no network requests. The hand model, fonts and runtime are all
  bundled.
- Progress is stored locally in the app's own storage. Parents can reset it from
  **For Parents → Settings**.

## Credits

- **Creator:** Shawn Rapaz
- **Built with:** Claude Code
- Hand tracking: [Google MediaPipe](https://developers.google.com/mediapipe) (Apache-2.0)
- Runtime: [Electron](https://www.electronjs.org/) (MIT)
- Font: M PLUS Rounded 1c (SIL Open Font License 1.1)

## License

Copyright © 2026 Shawn Rapaz

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version. See [LICENSE](LICENSE).
