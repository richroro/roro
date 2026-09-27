#!/usr/bin/env python3
"""Speak Korean phrases with MeloTTS into WAV files, loading the model once.

    python3 tools/tts_melo.py jobs.json      # [[text, out.wav, speed], ...]

Needs `pip install melotts` and access to huggingface.co, where the Korean model lives.
song/rapvox.mjs writes the job list and caches every phrase, so a re-render only speaks what
changed.
"""

import json
import sys


def main():
    jobs = json.load(open(sys.argv[1], encoding="utf-8"))
    if not jobs:
        return
    from melo.api import TTS

    model = TTS(language="KR", device="cpu")
    speaker = model.hps.data.spk2id["KR"]
    for i, (text, out, speed) in enumerate(jobs):
        model.tts_to_file(text, speaker, out, speed=speed, quiet=True)
        print(f"[{i + 1}/{len(jobs)}] {text}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
