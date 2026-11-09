# Sign It 🤟

**Learn sign language with your hands!** Sign It is a desktop game that teaches
**American Sign Language (ASL)** in English mode and **Japanese Sign Language
(JSL / 日本手話)** in Japanese mode. It uses the computer or tablet camera to check
your hand and finger shapes, with every image processed on the device.

*Recommended for all ages.*

- **Version:** 0.1.3 (released 2026-11-09)
- **Creator:** Shawn Rapaz, with Claude Code
- **Website:** <https://shoukugames.org/>
- **Email:** <info@shoukugames.org>
- **License:** [GNU GPL v3.0 or later](LICENSE)

---

## What's new in v0.1.3

- **Hands-free play.** With **Auto next** on (the default), a lesson moves to
  the next part by itself as soon as you sign correctly, so you never have to
  put your hand down to press a key.
  - Letters: hold the sign correctly, hear "Great job!", and it moves on.
  - Fingerspelled words: Miko spells the word, then you spell it letter by
    letter with the camera. Each letter is checked, then it moves on.
  - Word signs and sentences: Miko signs them twice, then it moves on.
  - A countdown ("Next in 3…") shows on the Next button. The lesson-complete
    and level-complete screens also continue on their own after 8 seconds
    (press **Stay here** to stop).
  - Toggle it with **Auto next** at the top of every lesson, or in For Parents
    → Settings.
- **Speech everywhere.** In v0.1.1 only letter and word names had audio, so most
  of the game was silent. Now instructions, the tutorial, calibration,
  coaching tips, praise, quiz feedback, level instructions, the privacy
  reminder and the parent message are all spoken. See
  [Voice](#voice-human-recordings-only) for how.
- **Hand coach.** While you practise, a Coach box tells you exactly what to
  fix, most important first. For example: "Turn your palm to face the
  camera", "Bend your ring finger more", "Touch your thumb to your index
  finger", "Cross your index finger over your middle finger". The finger to
  fix glows on the 3D hand, the tip is spoken out loud, and Palm / Fingers /
  Thumb chips turn green as each part becomes correct. The same tips appear on
  the camera panel in levels and quizzes.
- **Turn the 3D hand in any direction.** The reference hand in lessons,
  levels and quizzes can be rotated freely with the mouse (or a finger on a
  touch screen). Drag to turn, scroll or pinch to zoom, double-click to reset.
- **Calibration finish.** When calibration is done, a big green check and a
  spoken message say **"Your hand is calibrated and ready to play!"**. A
  **Finish** button returns to the title screen.

## What's new in v0.1.1

- **Easier signing: the full camera picture is back.** The hands-only filter
  and auto-zoom are gone. You now see yourself like a mirror, with the
  hand-tracking skeleton drawn on top, so it's much easier to keep your hand
  in view.
- **Privacy reminder.** Right after a parent allows the camera, the player
  sees a "Your camera is private" message: the camera is not connected to the
  internet, nothing is recorded, saved or sent, and it turns off by itself.
  Every camera panel also shows an **Offline · 100% private** tag.
- **The app is now enforced offline.** Every network request is blocked at the
  Electron level, so camera data cannot leave the computer even by accident.
- **Human voice for letters and words.** 176 recordings by real people (96
  English, 80 Japanese) from Wikimedia Commons / Lingua Libre. Letters are
  spoken in lessons, levels and quizzes. Miko says each letter as she
  fingerspells and then the whole word. Words and sentences are spoken in
  lessons and levels, and the "listen and sign" levels now really speak.
- Three Japanese practice words that had no human recording available (たき,
  かれい, さしみ) were replaced with recorded words (あした, きれい, おかし, いけ).

## Features

| Area | What it does |
|---|---|
| **Title screen** | Lessons and Levels shown side by side with progress. Toggles for language (English / 日本語), camera on/off and difficulty (Easy / Medium / Hard). Also links to the tutorial, hand calibration, For Parents and Credits. |
| **Parent permission** | The camera can't turn on until a parent answers a grown-up math question and ticks a consent box. Permission lasts for the current play session only. |
| **Camera privacy** | The camera picture is shown live like a mirror, with the hand tracking drawn on top. It is processed in memory on the device only. **The app blocks all internet access**, so nothing can be uploaded, and nothing is ever recorded or saved. A privacy reminder appears as soon as a parent turns the camera on. |
| **Auto shut-off** | The camera turns off when you leave a camera screen, go back to the title screen, minimise or hide the window, or quit. A red **Camera on** badge shows whenever it is running. |
| **Hand calibration** | You pick your signing hand, then hold an open hand and a fist so the game learns your range of motion. It checks lighting and distance, then runs a test sign. At the end it says "Your hand is calibrated and ready to play!", with a **Finish** button back to the title screen. |
| **Side-by-side view** | Every lesson, quiz and level shows the game screen on the left and the live mirrored camera view on the right, so you can compare. |
| **Tutorial** | Seven slides on how signing works: the five parts of a sign, your strong hand and mirroring, fingerspelling, **moving your hands and lips together (mouthing)**, facial grammar, and playing with the camera. |
| **20 lessons** | Each lesson goes **letters → words → a sentence**. The animated teacher, Miko, signs in mirror view and moves her lips (visemes) in time with the words. A rotatable 3D hand shows each handshape, a Coach guides your fingers, thumb and palm, and **Auto next** moves on by itself after a correct sign. |
| **Quizzes** | Quiz 1 comes after lesson 10 and the final quiz after lesson 20. Question types: which letter is this, which hand shows X, what does this sign mean, and sign it with the camera. You need 70% to pass, and passing Quiz 1 unlocks lessons 11–20. |
| **20 levels** | 1–5: match the handshape. 6–10: a word is shown, fingerspell it. 11–15: a word is spoken, sign it. 16–20: sign a whole sentence. Each sign gets **1–3 stars**. Words and sentences are judged on **accuracy** (handshape match) and **technique** (steadiness, pace, keeping the hand in place). |
| **Difficulty** | Changes star thresholds, how long you hold a sign, time limits, hints, and (on Hard) whether a look-alike sign is rejected. |
| **For Parents** | Behind a parent gate. Shows progress, successes vs. failures, time in lessons, levels, quizzes and the tutorial, quiz scores and history, the hardest and easiest signs, and settings. Data is kept separately for ASL and JSL. |
| **Sound & voice** | No background music. Game sounds (bells, chimes, star pings, a room reverb) are synthesised live. Letters and words are spoken by **real human voices**; see [Voice](#voice-human-recordings-only). |
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
- **JSL:** this version deliberately includes only the **22 yubimoji (指文字) with
  static, well-documented handshapes**: あいうえお かきくけ さし た に まみむめ や よ ら れ わ.
  Kana that need motion or dakuten are planned for later releases, after
  review. All JSL words and sentences use only these kana, plus whole-word signs.

Please report corrections with the [bug report template](BUGREPORT.md).

## Voice (human recordings only)

Sign It uses two kinds of speech:

1. **Letters and words: real human recordings.** Every letter and kana name
   and every practice word is a recording of a real person (details below).
2. **Instructions and narration: an offline neural voice.** No human
   recordings exist for full sentences such as tutorial narration, coaching
   tips or "Your hand is calibrated and ready to play!".
   - **English:** every such sentence is pre-generated **at build time** with
     [Piper](https://github.com/rhasspy/piper), using the voice
     `en_US-ljspeech-high`, which was trained on the public-domain
     [LJ Speech](https://keithito.com/LJ-Speech-Dataset/) recordings of a
     single human reader. The clips are bundled with the game, so nothing is
     generated live and the game stays fully offline. There are 105 lines,
     listed in `assets/voice/narration.json`.
   - **Japanese:** the Piper Japanese voice is trained on a dataset licensed
     for non-commercial use only (CC BY-NC-SA), which is not compatible with
     this GPL game, so it isn't bundled. Japanese instructions use the
     computer's own Japanese voice when one is installed (Windows includes
     one), and otherwise show as captions. Japanese letters and words are
     still human recordings.

Every spoken line is also shown as a caption.

| | English | Japanese |
|---|---|---|
| Letters | 26 / 26 | 22 / 22 |
| Words | 70 / 70 | 58 / 61 |
| Main speakers | Dvortygirl (US English) | Fukujinzuke |

- **Where they come from:** volunteer recordings on
  [Wikimedia Commons](https://commons.wikimedia.org/), many made through
  [Lingua Libre](https://lingualibre.org/). Licenses are CC BY-SA 3.0/4.0,
  CC BY 4.0, CC0 and public domain. Every file, recorder and license is listed
  in [`assets/voice/ATTRIBUTION.md`](assets/voice/ATTRIBUTION.md) and summarised
  on the in-game **Credits** screen.
- **Processing:** silence trimmed, converted to mono Ogg Vorbis and
  loudness-normalised (EBU R128) so different speakers play at the same volume.
- **When you hear them:**
  - Lessons: the letter name. Miko says each letter as she fingerspells and then
    the word; word signs and sentences are spoken as the signed words.
  - Levels: the target letter (levels 1–5), the word or sentence (6–10 and
    16–20), the hidden word in the "listen and sign" levels (11–15), and each
    letter as you complete it.
  - Quizzes: the letter to sign.
- **Still without a human recording:** three Japanese word signs, すき,
  ごめんなさい and よろしく. No human recording of these exists on Commons
  yet, so they show as captions.
- **Adding or replacing recordings:** save them as
  `assets/voice/<en|ja>/<filename>.ogg` (or `.mp3` / `.wav`). Run
  `npm run voice:script` to list every filename (`L_<letter>`, `W_<word>`) and
  mark which are missing in `assets/voice/SCRIPT_*.csv`, then run
  `npm run voice:manifest`.
- **Regenerating the English narration** (after changing any instruction
  text). Install Piper (`pip install piper-tts`), download
  `en_US-ljspeech-high.onnx` and `.onnx.json` from
  [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices), then run:
  ```bash
  node tools/narration-lines.mjs en > lines.json
  python3 tools/make-narration.py lines.json path/to/en_US-ljspeech-high.onnx
  npm run voice:manifest
  ```
  Narration is matched by exact text, so lines whose wording changed are
  regenerated, and unused clips are deleted.
- **Re-downloading:** `npm run voice:fetch` downloads, processes and credits
  all recordings again. It needs internet and `ffmpeg`, and is a developer
  tool only: the game itself never goes online.
- Parents can allow the computer's built-in voice for lines with no recording
  (**For Parents → Settings**). It is off by default because it may sound
  synthetic.

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
npm run dist:linux   # dist/sign-it_0.1.3_amd64.deb
npm run dist:win     # dist/Sign-It-Setup-0.1.3.exe (installer) + dist/Sign-It-0.1.3-portable.exe
npm run dist         # both
```

To build the Windows `.exe` on Linux, `wine` must be installed. The `.deb`
depends on `fonts-noto-color-emoji` so that icons display correctly.

Install on Debian/Ubuntu:

```bash
sudo apt install ./dist/sign-it_0.1.3_amd64.deb
```

## Project layout

```
src/main/            Electron main process (secure app:// origin, camera permission, window)
src/renderer/        The game (plain ES modules, no bundler)
  js/handmodel.js    Procedural 3D hand: pose → 21 landmarks → illustration
  js/signs.js        ASL alphabet + JSL yubimoji handshapes
  js/recognizer.js   Features, matching, stars, motion, technique, calibration, coaching tips
  js/camera.js       MediaPipe tracking + live mirrored view + shut-off
  js/audio.js        Sound effects + human-voice playback
  js/voicekeys.js    Maps letters / words / narration to audio files
  js/handviewer.js   Mouse-rotatable 3D reference hand
  js/avatar.js       Animated teacher with lip-sync visemes + word signs
  js/curriculum.js   Lessons, quizzes and levels for both languages
  js/screens/        Title, tutorial, lessons, quiz, levels, calibration, parents, credits
assets/voice/        Human voice recordings, attribution, recording checklist
build-resources/     App icons
tools/               Vendor script, icon renderer, voice tools, recognizer test
```

## Privacy

- **The camera is not connected to the internet.** Camera frames are processed
  in memory, on the device, by MediaPipe. They are never recorded, stored or
  sent anywhere.
- **Enforced offline:** the app blocks every network request (see
  `src/main/main.js`). The hand model, fonts, voices and runtime are all
  bundled. Website and email links in Credits open in your normal browser or
  mail app, outside the game.
- The player is reminded of this as soon as a parent allows the camera.
- Progress is stored locally in the app's own storage. Parents can reset it from
  **For Parents → Settings**.

## Credits

- **Creator:** Shawn Rapaz
- **Built with:** Claude Code
- Hand tracking: [Google MediaPipe](https://developers.google.com/mediapipe) (Apache-2.0)
- Runtime: [Electron](https://www.electronjs.org/) (MIT)
- Font: M PLUS Rounded 1c (SIL Open Font License 1.1)
- Voices: volunteer recorders on Wikimedia Commons / Lingua Libre, chiefly
  Dvortygirl (English) and Fukujinzuke (Japanese). Full list in
  [`assets/voice/ATTRIBUTION.md`](assets/voice/ATTRIBUTION.md).
- English narration: [Piper](https://github.com/rhasspy/piper) (MIT) with
  the `en_US-ljspeech-high` voice, trained on the public-domain LJ Speech
  dataset.

## License

Copyright © 2026 Shawn Rapaz

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version. See [LICENSE](LICENSE).

The voice recordings in `assets/voice/` keep their own licenses (CC BY-SA,
CC BY, CC0 or public domain), listed per file in
[`assets/voice/ATTRIBUTION.md`](assets/voice/ATTRIBUTION.md).
