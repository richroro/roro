#!/usr/bin/env python3
"""Synthesize the Crowd Rush sound effects (16-bit mono WAV, 22.05 kHz) with the standard library.

Outputs into crowdrush/src/main/res/raw/:
  sfx_shot.wav   rifle shot (noise burst + low thump)
  sfx_hit.wav    bullet impact tick
  sfx_ding.wav   gate number stepped up
  sfx_buzz.wav   bad gate passed / enemy contact
  sfx_clear.wav  level clear arpeggio
  sfx_over.wav   game over descending tone

Run:  python3 android-game/tools/generate_sounds.py [out_dir]
"""
from __future__ import annotations

import math
import os
import random
import struct
import sys
import wave

RATE = 22050


def env(t, attack, decay):
    """Simple attack/exponential-decay envelope."""
    if t < attack:
        return t / attack
    return math.exp(-(t - attack) / decay)


def render(duration, fn, seed=1):
    rnd = random.Random(seed)
    n = int(duration * RATE)
    out = []
    lp = 0.0
    for i in range(n):
        t = i / RATE
        v = fn(t, rnd, i)
        out.append(v)
    peak = max(1e-6, max(abs(v) for v in out))
    return [v / peak * 0.9 for v in out]


def lowpass(samples, alpha):
    out = []
    y = 0.0
    for s in samples:
        y += alpha * (s - y)
        out.append(y)
    return out


def highpass(samples, alpha):
    out = []
    y = 0.0
    prev = 0.0
    for s in samples:
        y = alpha * (y + s - prev)
        prev = s
        out.append(y)
    return out


def save(path, samples):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s)) * 32767)) for s in samples))


def shot():
    noise = render(0.12, lambda t, r, i: (r.random() * 2 - 1) * env(t, 0.002, 0.025), seed=3)
    noise = lowpass(noise, 0.35)
    thump = render(0.12, lambda t, r, i: math.sin(2 * math.pi * (140 - 400 * t) * t) * env(t, 0.001, 0.04))
    return [n * 0.8 + th * 0.6 for n, th in zip(noise, thump)]


def hit():
    tick = render(0.06, lambda t, r, i: (r.random() * 2 - 1) * env(t, 0.001, 0.008), seed=5)
    tick = highpass(tick, 0.7)
    blip = render(0.06, lambda t, r, i: math.sin(2 * math.pi * 1400 * t) * env(t, 0.001, 0.015))
    return [a * 0.7 + b * 0.5 for a, b in zip(tick, blip)]


def ding():
    return render(0.22, lambda t, r, i: (math.sin(2 * math.pi * 880 * t) + 0.4 * math.sin(2 * math.pi * 1760 * t)) * env(t, 0.003, 0.07))


def buzz():
    def f(t, r, i):
        sq = 1.0 if math.sin(2 * math.pi * 150 * t) > 0 else -1.0
        return sq * env(t, 0.005, 0.09)
    return lowpass(render(0.25, f), 0.25)


def clear():
    notes = [523.25, 659.25, 783.99, 1046.5]
    step = 0.14

    def f(t, r, i):
        k = min(len(notes) - 1, int(t / step))
        lt = t - k * step
        freq = notes[k]
        return (math.sin(2 * math.pi * freq * t) + 0.3 * math.sin(2 * math.pi * freq * 2 * t)) * env(lt, 0.01, 0.12 if k < 3 else 0.35)
    return render(step * 4 + 0.3, f)


def over():
    def f(t, r, i):
        freq = 440 * math.pow(0.25, t / 0.7)
        phase = 2 * math.pi * freq * t
        return (math.sin(phase) + 0.3 * math.sin(2 * phase)) * env(t, 0.01, 0.5)
    return render(0.8, f)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "crowdrush", "src", "main", "res", "raw")
    os.makedirs(out, exist_ok=True)
    for name, fn in [("sfx_shot", shot), ("sfx_hit", hit), ("sfx_ding", ding), ("sfx_buzz", buzz), ("sfx_clear", clear), ("sfx_over", over)]:
        save(os.path.join(out, name + ".wav"), fn())
    print("wrote sound effects to", os.path.abspath(out))


if __name__ == "__main__":
    main()
