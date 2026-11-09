# Reporting a Bug — Sign It

Thank you for helping make Sign It better! Please send bug reports to
**info@shoukugames.org**, or open an issue in the project repository, using the
template below.

> 🔒 **Privacy first:** Please do **not** attach photos or videos of children.
> If a sign isn't recognised, describe it in words. A screenshot of the game's
> *hands-only* view is fine.

---

## Bug report template

**Summary**
A one-line description of the problem.

**Version**
Sign It version (see **Credits**), e.g. `v0.1.4`.

**System**
- Operating system: (e.g. Windows 11, Ubuntu 24.04, Debian 12)
- Install type: `.deb` / Windows installer `.exe` / portable `.exe` / from source
- Camera: (built-in laptop camera, USB webcam model, tablet)

**Game settings**
- Language: English (ASL) / 日本語 (JSL)
- Difficulty: Easy / Medium / Hard
- Camera: On / Off
- Hand calibration done? Yes / No. Signing hand: Left / Right

**Where it happened**
(e.g. Lesson 7, letter "P" / Level 12, word "MILK" / Quiz 1 / For Parents → Levels)

**Steps to reproduce**
1.
2.
3.

**What you expected**

**What actually happened**

**How often**
Always / Sometimes / Once

**Screenshots or logs (optional)**
For a crash, start the game from a terminal (`sign-it` on Linux) and copy
any error text.

---

## Sign accuracy reports

If you are a fluent ASL or JSL signer and a handshape, word sign or description
looks wrong, please tell us:

- **Sign language:** ASL / JSL
- **Sign:** (letter, kana or word)
- **What's wrong:** (handshape, palm direction, location, movement, mouthing, description)
- **Correct form:** (a description, or a link to a reputable reference)

Sign data lives in `src/renderer/js/signs.js` (handshapes) and
`src/renderer/js/avatar.js` (word signs), so corrections are quick to make.

## Recognition problems checklist

Version 0.1.4 fixed the main cause of signs not being recognised and of the
game repeatedly asking to "turn your palm to face the camera" (right hands were
being processed as mirror images). If you're on an older version, please update
first.

Before reporting that a sign isn't recognised, please try:

- [ ] **Update to v0.1.4 or newer** (version is on the title screen and in Credits).
- [ ] Run **Hand Calibration** again (title screen) and choose the hand you sign with.
- [ ] Sit in a well-lit place, with light in front of you rather than behind.
- [ ] Keep your whole hand inside the camera view, about 40–70 cm from the
      camera. The camera panel says "Move your hand a little closer / farther".
- [ ] Hold the sign still until the ring fills.
- [ ] Try **Easy** difficulty (lessons always use Easy recognition).
- [ ] Make sure no other app is using the camera.

## Recognition problem report

Please copy this into your report. It helps us tune the recognizer:

- **Version:** (e.g. v0.1.4)
- **Sign language and sign:** ASL / JSL, letter, kana or word
- **Where:** lesson / level / quiz / calibration, and the difficulty
- **Calibrated?** Yes / No. **Signing hand:** Left / Right
- **What the Coach said** (e.g. "Bend your ring finger more"), or whether it
  said "Show your hand to the camera" while your hand was visible
- **Camera and light:** built-in or USB webcam; daylight or lamp; light in
  front of or behind you
- **Distance:** roughly how far your hand was from the camera
- **How often:** always / sometimes, and whether other letters work

**For developers:** `npm run test:real` measures recognition against real hand
photos. To add a failing case, save a photo named `<name>_<LETTER>.jpg`
(unmirrored, like a webcam) in `tools/testdata/`, run
`tools/real-hand-test.html` (see the README) and add its line to
`tools/testdata/real.jsonl`.
