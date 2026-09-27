// An original trot (뽕짝) instrumental for the Zena Short: its own tune, not any of the songs in the
// medley. 132 BPM, A minor, 32 bars (59.7 s with the ring-out):
//
//   intro 0-3   the hook on a nasal lead (a 전주, like a karaoke intro), a drum fill into the verse
//   verse 4-11  the tune low, band light
//   build 12-19 higher, a snare roll into the chorus
//   chorus 20-27 the full band: lead doubled an octave down, strings, tambourine
//   outro 28-31 the hook again and the classic ending: 빠밤 — 밤!
//
// The band: the 2-beat 쿵짝 (bass root/fifth on 1 and 3, a short organ chord and a snare on 2 and
// 4), hats on the eighths, a tambourine, a nasal lead that bends into its long notes (꺾기) and
// sings with vibrato. Everything else comes from song/dsp.mjs.
//
//   node zena/song/trot.mjs   -> zena/out/song.wav, zena/assets/song.m4a, zena/src/song.js

import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ffmpegPath } from '../../tools/ffmpeg.mjs';
import {
  SR, TAU, N, init, rnd, noise, hz, clamp, blep, SVF, Bus, idx,
  freeverb, pingpong, master, wav, bowed,
} from '../../song/dsp.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BPM = 132, BEAT = 60 / BPM, BAR = BEAT * 4, BARS = 32, TAIL = 1.5;
export const LENGTH = BARS * BAR + TAIL;
init(LENGTH);
const T = (bar, beat = 0) => (bar * 4 + beat) * BEAT;

export const SECTIONS = [
  { id: 'intro', name: '전주', bar: 0, bars: 4 },
  { id: 'verse', name: '1절', bar: 4, bars: 8 },
  { id: 'build', name: '오르막', bar: 12, bars: 8 },
  { id: 'chorus', name: '후렴', bar: 20, bars: 8 },
  { id: 'outro', name: '후주', bar: 28, bars: 4 },
];
const secAt = bar => [...SECTIONS].reverse().find(s => bar >= s.bar).id;

// One chord per bar.
const CHORDS = [
  'Am', 'Dm', 'E7', 'Am',
  'Am', 'Am', 'Dm', 'Am', 'F', 'E7', 'Am', 'E7',
  'Dm', 'G', 'C', 'Am', 'Dm', 'E7', 'Am', 'E7',
  'Am', 'Dm', 'G', 'C', 'F', 'Dm', 'E7', 'Am',
  'Dm', 'E7', 'Am', 'Am',
];
const CH = {
  Am: [57, 60, 64], Dm: [62, 65, 69], E7: [64, 68, 71, 74], F: [65, 69, 72], G: [67, 71, 74], C: [60, 64, 67],
};
const ROOTS = { Am: 45, Dm: 38, E7: 40, F: 41, G: 43, C: 36 };

// The tune: one string per bar, "note:beats", "_" a rest. Each bar adds up to 4.
const TUNE = [
  'E5:.5 A5:.5 C6:1 B5:.5 A5:.5 E5:1', 'F5:1.5 E5:.5 D5:1 F5:1', 'E5:.5 F5:.5 E5:.5 D5:.5 C5:.5 B4:.5 G#4:1', 'A4:2 _:2',
  'A4:1 C5:1 E5:1.5 D5:.5', 'C5:1 B4:.5 A4:.5 A4:2', 'D5:1 F5:1 A5:1.5 G5:.5', 'E5:3 _:1',
  'F5:1 E5:.5 D5:.5 C5:1 A4:1', 'B4:1 C5:.5 B4:.5 G#4:2', 'A4:.5 B4:.5 C5:1 E5:1 D5:1', 'E5:3 _:1',
  'F5:1 F5:.5 E5:.5 D5:1 F5:1', 'G5:1.5 F5:.5 E5:1 D5:1', 'E5:1 G5:1 C6:1.5 B5:.5', 'A5:3 _:1',
  'A5:1 G5:.5 F5:.5 E5:1 D5:1', 'E5:1 F5:.5 E5:.5 D5:1 B4:1', 'C5:1 B4:.5 A4:.5 C5:1 E5:1', 'G#4:1 B4:1 E5:1 _:1',
  'A5:1.5 G5:.5 E5:1 A5:1', 'F5:1.5 E5:.5 D5:1 A5:1', 'G5:1 B5:1 D6:1 B5:1', 'C6:3 _:1',
  'C6:1 A5:1 F5:1 A5:1', 'D6:1.5 C6:.5 A5:1 F5:1', 'E5:1 G#5:1 B5:1 D6:1', 'C6:.5 B5:.5 A5:3',
  'F5:.5 E5:.5 D5:1 F5:1 A5:1', 'G#5:1 B5:1 E5:1 D5:1', 'C5:1 E5:1 A5:2', 'A5:.5 _:1.5 A5:2',
];
const NAMES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const midiOf = s => { const m = s.match(/^([A-G]#?)(\d)$/); return 12 * (+m[2] + 1) + NAMES[m[1]]; };
function tuneNotes() {
  const out = [];
  TUNE.forEach((bar, b) => {
    let beat = 0;
    for (const tok of bar.split(' ')) {
      const [n, d] = tok.split(':'); const dur = parseFloat(d);
      if (n !== '_') out.push({ bar: b, beat, t: T(b, beat), dur: dur * BEAT, midi: midiOf(n), beats: dur });
      beat += dur;
    }
    if (Math.abs(beat - 4) > 1e-6) throw new Error(`bar ${b}: ${beat} beats`);
  });
  return out;
}

// ---- instruments -------------------------------------------------------------------------------

const drums = new Bus(), bass = new Bus(), keys = new Bus(), lead = new Bus(), strings = new Bus(), fx = new Bus();

function kick(t, g = 1) {
  const i0 = idx(t); let ph = 0;
  for (let n = 0; n < SR * 0.35; n++) {
    const s = n / SR; ph += (52 + 90 * Math.exp(-s * 35)) / SR;
    drums.add(i0 + n, Math.sin(TAU * ph) * Math.exp(-s * 9) * 0.8 * g);
  }
}
function snare(t, g = 1) {
  const i0 = idx(t), f = new SVF();
  for (let n = 0; n < SR * 0.25; n++) {
    const s = n / SR; f.run(noise(), 3200, 0.6);
    drums.add(i0 + n, (Math.sin(TAU * 200 * s) * Math.exp(-s * 30) * 0.4 + f.bp * Math.exp(-s * 16) * 0.8) * 0.4 * g, 0.05);
  }
}
function hat(t, g = 1, open = false) {
  const i0 = idx(t), f = new SVF();
  for (let n = 0; n < SR * (open ? 0.25 : 0.05); n++) {
    f.run(noise(), 9500, 0.8);
    drums.add(i0 + n, f.hp * Math.exp(-(n / SR) * (open ? 12 : 75)) * 0.1 * g, 0.35);
  }
}
function tambourine(t, g = 1) {
  const i0 = idx(t), f = new SVF();
  for (let n = 0; n < SR * 0.12; n++) {
    const s = n / SR; f.run(noise(), 7200, 2.5);
    const jingle = Math.sin(TAU * 5200 * s) * 0.3 + Math.sin(TAU * 7900 * s) * 0.2;
    drums.add(i0 + n, (f.bp + jingle * 0.2) * Math.exp(-s * 30) * 0.12 * g, -0.4);
  }
}
function tom(t, midi, g = 1) {
  const i0 = idx(t), f0 = hz(midi); let ph = 0;
  for (let n = 0; n < SR * 0.35; n++) {
    const s = n / SR; ph += f0 * (1 + 0.5 * Math.exp(-s * 25)) / SR;
    drums.add(i0 + n, Math.sin(TAU * ph) * Math.exp(-s * 9) * 0.5 * g, (midi - 48) / 20);
  }
}
function crash(t, g = 1) {
  const i0 = idx(t), fl = new SVF(), fr = new SVF();
  for (let n = 0; n < SR * 2.2; n++) {
    const s = n / SR, e = Math.exp(-s * 1.6) * Math.min(1, s / 0.005) * 0.16 * g;
    fl.run(noise(), 6500, 0.7); fr.run(noise(), 6500, 0.7);
    drums.L[i0 + n] += fl.hp * e; drums.R[i0 + n] += fr.hp * e;
  }
}

/** A plucky round bass. */
function bassNote(t, dur, midi, g = 1) {
  const i0 = idx(t), f = new SVF(), dt = hz(midi) / SR, len = Math.floor((dur + 0.05) * SR);
  let ph = rnd();
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    const saw = 2 * ph - 1 - blep(ph, dt);
    const sine = Math.sin(TAU * ph);
    ph += dt; if (ph >= 1) ph -= 1;
    f.run(saw, 300 + 1400 * Math.exp(-s * 18), 1.1);
    const env = Math.min(1, s / 0.004) * Math.exp(-s * 3.2) * (s > dur ? Math.exp(-(s - dur) * 60) : 1);
    bass.add(i0 + n, (sine * 0.75 + f.lp * 0.45) * env * 0.55 * g);
  }
}

/** The 짝: a short combo-organ chord (drawbar sines with a click). */
function organStab(t, notes, len, g = 1, pan = 0) {
  const i0 = idx(t), L = Math.floor((len + 0.06) * SR);
  for (const m of notes) {
    const f = hz(m);
    const ph0 = rnd();
    for (let n = 0; n < L; n++) {
      const s = n / SR;
      const env = Math.min(1, s / 0.003) * (s > len ? Math.exp(-(s - len) * 70) : 1) * (0.75 + 0.25 * Math.exp(-s * 12));
      const x = TAU * (f * s + ph0);
      const y = Math.sin(x) * 0.6 + Math.sin(2 * x) * 0.35 + Math.sin(3 * x) * 0.2 + Math.sin(4 * x) * 0.12 + Math.sin(6 * x) * 0.05;
      const click = n < 90 ? noise() * 0.15 * (1 - n / 90) : 0;
      keys.add(i0 + n, (y + click) * env * 0.075 * g, pan);
    }
  }
}

/**
 * The lead: a nasal, reedy voice (a pulse and a saw through a vowel-ish band-pass), with the
 * trot 꺾기 — long notes start a semitone low and bend up, and a wide vibrato blooms late.
 */
function reed(bus, t, midi, dur, g = 1, o = {}) {
  const i0 = idx(t), rel = 0.12, len = Math.floor((dur + rel) * SR);
  const f1 = new SVF(), f2 = new SVF();
  let ph = rnd(), ph2 = rnd();
  const bend = o.bend ?? (dur > BEAT * 0.9 ? -1 : 0);
  for (let n = 0; n < len; n++) {
    const s = n / SR;
    const slide = bend * Math.exp(-s / 0.07);
    const vibAmt = dur > BEAT * 0.9 ? 0.32 * clamp((s - 0.25) / 0.3, 0, 1) : 0.05;
    const m = midi + slide + vibAmt * Math.sin(TAU * 6 * s);
    const dt = hz(m) / SR;
    const saw = 2 * ph - 1 - blep(ph, dt);
    const pulse = (ph < 0.3 ? 1 : -1) - blep(ph, dt) + blep((ph + 0.7) % 1, dt);
    ph += dt; if (ph >= 1) ph -= 1;
    ph2 += dt * 1.004; if (ph2 >= 1) ph2 -= 1;
    const src = saw * 0.5 + pulse * 0.5 + (2 * ph2 - 1) * 0.25;
    f1.run(src, 1250, 3.5); f2.run(src, 2600, 4);
    const y = f1.bp * 0.9 + f2.bp * 0.55 + src * 0.08;
    const env = Math.min(1, s / 0.015) * (s > dur ? Math.exp(-(s - dur) / rel * 4) : 1) * (0.85 + 0.15 * Math.exp(-s * 6));
    bus.add(i0 + n, y * env * 0.23 * g, o.pan ?? 0);
  }
}

// ---- the arrangement ----------------------------------------------------------------------------

for (let bar = 0; bar < BARS; bar++) {
  const sec = secAt(bar), c = CHORDS[bar], root = ROOTS[c];
  const full = sec === 'chorus' || sec === 'outro' || sec === 'intro';
  const last = bar === BARS - 1;
  if (last) {
    // the ending: 빠밤 (1, and-of-1) — 밤! (3), then ring
    for (const b of [0, 0.5, 2]) {
      kick(T(bar, b), 1.1); snare(T(bar, b), 0.9); organStab(T(bar, b), CH.Am.map(m => m + 12), b === 2 ? BEAT * 2.2 : BEAT * 0.25, 1.3);
      bassNote(T(bar, b), b === 2 ? BEAT * 2.5 : BEAT * 0.3, 45, 1.1);
    }
    crash(T(bar, 2), 1.3);
    continue;
  }
  // 쿵 on 1 and 3: bass root then fifth, kick
  bassNote(T(bar, 0), BEAT * 0.9, root);
  bassNote(T(bar, 2), BEAT * 0.9, root + 7);
  if (full || sec === 'build') { bassNote(T(bar, 1.5), BEAT * 0.35, root + 12, 0.5); bassNote(T(bar, 3.5), BEAT * 0.4, CHORDS[bar + 1] ? ROOTS[CHORDS[bar + 1]] - 1 : root, 0.55); }
  kick(T(bar, 0)); kick(T(bar, 2));
  // 짝 on 2 and 4: organ chord + snare
  const vo = CH[c].map(m => m + (m < 60 ? 12 : 0));
  for (const b of [1, 3]) {
    organStab(T(bar, b), vo, BEAT * 0.28, sec === 'verse' ? 0.8 : 1.05, 0.15);
    snare(T(bar, b), sec === 'verse' ? 0.6 : 0.9);
  }
  if (full) organStab(T(bar, 1.5), vo, BEAT * 0.12, 0.45, -0.2);
  // hats on the eighths, a tambourine on the sixteenths in the chorus
  for (let e = 0; e < 8; e++) hat(T(bar, e / 2), e % 2 ? 0.7 : 1, e === 7 && full);
  if (sec === 'chorus' || sec === 'outro') for (let s = 0; s < 16; s++) tambourine(T(bar, s / 4), s % 4 === 2 ? 1 : 0.45);
  // strings under the chorus and outro
  if (sec === 'chorus' || sec === 'outro') for (const m of CH[c].slice(0, 3)) bowed(strings, T(bar), m, BAR * 0.98, 0.3, 2200, 0.2, (m % 3 - 1) * 0.4);
  // fills: toms into the verse, a snare roll into the chorus
  if (bar === 3) [[2, 50], [2.5, 50], [3, 45], [3.25, 45], [3.5, 41], [3.75, 41]].forEach(([b, m]) => tom(T(bar, b), m));
  if (bar === 19) for (let s = 0; s < 8; s++) snare(T(bar, 2 + s / 4), 0.35 + s * 0.08);
  if (bar === 27) [[3, 50], [3.25, 47], [3.5, 45], [3.75, 41]].forEach(([b, m]) => tom(T(bar, b), m));
  if ([0, 4, 20, 28].includes(bar)) crash(T(bar), bar === 20 ? 1.2 : 0.8);
}

for (const n of tuneNotes()) {
  const sec = secAt(n.bar);
  reed(lead, n.t, n.midi, n.dur * 0.94, sec === 'verse' ? 0.85 : 1);
  if (sec === 'chorus' || sec === 'outro' || sec === 'intro') reed(lead, n.t + 0.006, n.midi - 12, n.dur * 0.94, 0.45, { pan: 0.25, bend: 0 });
}

// ---- mix ----------------------------------------------------------------------------------------

const GAIN = { drums: 0.6, bass: 0.8, keys: 2.4, lead: 3.4, strings: 0.28, fx: 0.5 };
const parts = { drums, bass, keys, lead, strings, fx };
const sendL = new Float32Array(N), sendR = new Float32Array(N);
for (const [name, amt] of [['lead', 0.28], ['keys', 0.15], ['strings', 0.4], ['drums', 0.08]]) {
  const b = parts[name];
  for (let n = 0; n < N; n++) { sendL[n] += b.L[n] * amt; sendR[n] += b.R[n] * amt; }
}
const [vL, vR] = freeverb(sendL, sendR, 0.8, 0.3);
const dl = new Float32Array(N), dr = new Float32Array(N);
for (let n = 0; n < N; n++) { dl[n] = lead.L[n] * 0.22; dr[n] = lead.R[n] * 0.22; }
const [eL, eR] = pingpong(dl, dr, BEAT * 0.75, 0.28, 0.4);

if (process.env.LEVELS) {
  const a = idx(T(20)), z = idx(T(28));
  for (const [name, b] of Object.entries(parts)) {
    let e = 0; for (let n = a; n < z; n++) e += (b.L[n] * GAIN[name]) ** 2 + (b.R[n] * GAIN[name]) ** 2;
    console.log(name.padEnd(8), (10 * Math.log10(e / (2 * (z - a)) + 1e-12)).toFixed(1), 'dB');
  }
}

const [L, R] = master([...Object.entries(parts).map(([k, b]) => [b, GAIN[k]]), [{ L: vL, R: vR }, 0.7], [{ L: eL, R: eR }, 0.6]]);

// ---- out ----------------------------------------------------------------------------------------

mkdirSync(join(ROOT, 'out'), { recursive: true });
mkdirSync(join(ROOT, 'assets'), { recursive: true });
mkdirSync(join(ROOT, 'src'), { recursive: true });
const wavPath = join(ROOT, 'out', 'song.wav');
wav(wavPath, L, R);
let sum = 0; for (let n = 0; n < N; n++) sum += L[n] * L[n] + R[n] * R[n];
console.log(`length ${LENGTH.toFixed(2)}s, rms ${(10 * Math.log10(sum / (2 * N))).toFixed(1)} dBFS`);
execFileSync(ffmpegPath(), ['-y', '-loglevel', 'error', '-i', wavPath, '-c:a', 'aac', '-b:a', '192k', join(ROOT, 'assets', 'song.m4a')]);
const CUES = [
  { bar: 3.5, kind: 'fill' }, { bar: 4, kind: 'crash' }, { bar: 19.5, kind: 'roll' }, { bar: 20, kind: 'crash' },
  { bar: 27.75, kind: 'fill' }, { bar: 28, kind: 'crash' }, { bar: 31, kind: 'ppabam' }, { bar: 31.125, kind: 'ppabam' }, { bar: 31.5, kind: 'bam' },
];
const page = {
  bpm: BPM, beat: BEAT, bar: BAR, length: +LENGTH.toFixed(4), endBar: BARS,
  sections: SECTIONS.map(s => ({ ...s, t: +T(s.bar).toFixed(4), end: +T(s.bar + s.bars).toFixed(4) })),
  chords: CHORDS.map((c, i) => ({ bar: i, t: +T(i).toFixed(4), name: c })),
  lines: [],
  tune: tuneNotes().map(n => ({ t: +n.t.toFixed(4), dur: +n.dur.toFixed(4), midi: n.midi })),
  cues: CUES.map(c => ({ ...c, t: +T(c.bar).toFixed(4) })),
};
writeFileSync(join(ROOT, 'src', 'song.js'), `// Generated by song/trot.mjs. Do not edit by hand.\nwindow.SONG = ${JSON.stringify(page)};\n`);
console.log('wrote out/song.wav, assets/song.m4a, src/song.js');
