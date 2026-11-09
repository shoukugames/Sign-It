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
Sign It version (see **Credits**), e.g. `v0.1.3`.

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

Before reporting that a sign isn't recognised, please try:

- [ ] Run **Hand Calibration** again (title screen).
- [ ] Sit in a well-lit place, with light in front of you rather than behind.
- [ ] Keep your whole hand inside the camera view, about 40–70 cm from the camera.
- [ ] Try **Easy** difficulty.
- [ ] Make sure no other app is using the camera.
