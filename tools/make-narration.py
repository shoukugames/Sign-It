#!/usr/bin/env python3
"""Pre-generates English narration with the offline Piper neural voice
(en_US-ljspeech-high, trained on the public-domain LJ Speech dataset).

  node tools/narration-lines.mjs en > lines.json
  python3 tools/make-narration.py lines.json ~/.local/share/piper-voices/en_US-ljspeech-high.onnx

Writes assets/voice/en/N_<hash>.ogg (trimmed, loudness-normalised) and
assets/voice/narration.json. Letters and words remain human recordings."""
import json, os, subprocess, sys, tempfile, wave, pathlib
from piper import PiperVoice
from piper.config import SynthesisConfig

lines = json.load(open(sys.argv[1]))
model = sys.argv[2]
root = pathlib.Path(__file__).resolve().parent.parent
out = root / "assets" / "voice" / "en"
out.mkdir(parents=True, exist_ok=True)
voice = PiperVoice.load(model)
cfg = SynthesisConfig(length_scale=1.08, noise_scale=0.6, noise_w_scale=0.8)  # a little slower, clear for kids
keep = set()
with tempfile.TemporaryDirectory() as tmp:
    for i, ln in enumerate(lines):
        dst = out / (ln["key"] + ".ogg")
        keep.add(dst.name)
        if dst.exists():
            continue
        wav = os.path.join(tmp, "n.wav")
        with wave.open(wav, "wb") as w:
            voice.synthesize_wav(ln["text"], w, syn_config=cfg)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af",
                        "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
                        "-ac", "1", "-ar", "44100", "-c:a", "libvorbis", "-q:a", "5", str(dst)], check=True)
        print(f"[{i + 1}/{len(lines)}] {ln['text'][:70]}", flush=True)
# remove narration clips no longer used
for f in out.glob("N_*.ogg"):
    if f.name not in keep:
        f.unlink()
json.dump({"voice": "Piper en_US-ljspeech-high (neural, offline; trained on the public-domain LJ Speech dataset)",
           "engine": "https://github.com/rhasspy/piper", "lines": lines},
          open(root / "assets" / "voice" / "narration.json", "w"), ensure_ascii=False, indent=1)
print("narration clips:", len(keep))
